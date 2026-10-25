import type { PageSpeedStrategyResult } from '../src/types/seo.ts';

async function fetchStrategyPageSpeed(
  targetUrl: string,
  strategy: 'mobile' | 'desktop'
): Promise<PageSpeedStrategyResult> {
  const fetchedAt = new Date().toISOString();
  const apiKey = process.env.PAGESPEED_API_KEY?.trim();

  const endpoint = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
  endpoint.searchParams.set('url', targetUrl);
  endpoint.searchParams.set('strategy', strategy);
  endpoint.searchParams.append('category', 'PERFORMANCE');
  endpoint.searchParams.append('category', 'ACCESSIBILITY');
  endpoint.searchParams.append('category', 'BEST_PRACTICES');
  endpoint.searchParams.append('category', 'SEO');
  if (apiKey) {
    endpoint.searchParams.set('key', apiKey);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 16000);

  try {
    const res = await fetch(endpoint.toString(), {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });
    clearTimeout(timer);

    if (!res.ok) {
      let errMsg = `PageSpeed API HTTP ${res.status}`;
      try {
        const errJson = await res.json();
        if (errJson?.error?.message) {
          errMsg = errJson.error.message;
        }
      } catch {
        // ignore
      }
      return {
        strategy,
        available: false,
        errorReason: errMsg,
        fetchedAt,
        dataSource: 'Unavailable',
        opportunities: [],
      };
    }

    const data: any = await res.json();
    const lh = data?.lighthouseResult;
    if (!lh) {
      return {
        strategy,
        available: false,
        errorReason: 'No Lighthouse result returned by PageSpeed Insights API.',
        fetchedAt,
        dataSource: 'Unavailable',
        opportunities: [],
      };
    }

    const cats = lh.categories || {};
    const audits = lh.audits || {};

    const toScore = (val: any) =>
      typeof val === 'number' ? Math.round(val * 100) : 0;

    const lighthouseScores = {
      performance: toScore(cats.performance?.score),
      accessibility: toScore(cats.accessibility?.score),
      bestPractices: toScore(cats['best-practices']?.score),
      seo: toScore(cats.seo?.score),
    };

    const labMetrics = {
      firstContentfulPaint: audits['first-contentful-paint']?.displayValue || 'N/A',
      largestContentfulPaint: audits['largest-contentful-paint']?.displayValue || 'N/A',
      totalBlockingTime: audits['total-blocking-time']?.displayValue || 'N/A',
      cumulativeLayoutShift: audits['cumulative-layout-shift']?.displayValue || 'N/A',
      speedIndex: audits['speed-index']?.displayValue || 'N/A',
      interactive: audits['interactive']?.displayValue || 'N/A',
    };

    const crux = data?.loadingExperience;
    const cruxMetrics = crux?.metrics || {};
    const hasFieldData = Boolean(
      cruxMetrics.LARGEST_CONTENTFUL_PAINT_MS ||
        cruxMetrics.INTERACTION_TO_NEXT_PAINT ||
        cruxMetrics.CUMULATIVE_LAYOUT_SHIFT_SCORE
    );

    const fieldData: PageSpeedStrategyResult['fieldData'] = {
      available: hasFieldData,
      overallCategory: crux?.overall_category,
      lcpMs: cruxMetrics.LARGEST_CONTENTFUL_PAINT_MS?.percentile,
      lcpCategory: cruxMetrics.LARGEST_CONTENTFUL_PAINT_MS?.category,
      inpMs: cruxMetrics.INTERACTION_TO_NEXT_PAINT?.percentile,
      inpCategory: cruxMetrics.INTERACTION_TO_NEXT_PAINT?.category,
      clsScore:
        typeof cruxMetrics.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile === 'number'
          ? cruxMetrics.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile / 100
          : undefined,
      clsCategory: cruxMetrics.CUMULATIVE_LAYOUT_SHIFT_SCORE?.category,
      fcpMs: cruxMetrics.FIRST_CONTENTFUL_PAINT_MS?.percentile,
      fcpCategory: cruxMetrics.FIRST_CONTENTFUL_PAINT_MS?.category,
    };

    const opportunityIds = [
      'render-blocking-resources',
      'unused-javascript',
      'unused-css-rules',
      'modern-image-formats',
      'offscreen-images',
      'unminified-javascript',
      'unminified-css',
      'uses-text-compression',
      'uses-long-cache-ttl',
      'uses-optimized-images',
      'uses-responsive-images',
      'server-response-time',
      'dom-size',
    ];

    const opportunities: PageSpeedStrategyResult['opportunities'] = [];
    for (const id of opportunityIds) {
      const a = audits[id];
      if (!a) continue;
      if (typeof a.score === 'number' && a.score < 0.9) {
        opportunities.push({
          id,
          title: a.title || id,
          description: (a.description || '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'),
          displayValue: a.displayValue,
          score: Math.round(a.score * 100),
          savingsMs: a.details?.overallSavingsMs ? Math.round(a.details.overallSavingsMs) : undefined,
          savingsBytes: a.details?.overallSavingsBytes
            ? Math.round(a.details.overallSavingsBytes)
            : undefined,
        });
      }
    }

    return {
      strategy,
      available: true,
      fetchedAt,
      dataSource: 'Google PageSpeed Insights API v5',
      lighthouseScores,
      labMetrics,
      fieldData,
      opportunities,
    };
  } catch (err: any) {
    clearTimeout(timer);
    return {
      strategy,
      available: false,
      errorReason:
        err?.name === 'AbortError'
          ? 'PageSpeed Insights API request timed out (16s limit).'
          : err?.message || 'PageSpeed API request failed.',
      fetchedAt,
      dataSource: 'Unavailable',
      opportunities: [],
    };
  }
}

export async function runPageSpeedAudit(
  targetUrl: string,
  enabled: boolean
): Promise<{
  mobile: PageSpeedStrategyResult;
  desktop: PageSpeedStrategyResult;
}> {
  if (!enabled) {
    const now = new Date().toISOString();
    return {
      mobile: {
        strategy: 'mobile',
        available: false,
        errorReason: 'PageSpeed Insights check was disabled in audit configuration.',
        fetchedAt: now,
        dataSource: 'Unavailable',
        opportunities: [],
      },
      desktop: {
        strategy: 'desktop',
        available: false,
        errorReason: 'PageSpeed Insights check was disabled in audit configuration.',
        fetchedAt: now,
        dataSource: 'Unavailable',
        opportunities: [],
      },
    };
  }

  const [mobile, desktop] = await Promise.all([
    fetchStrategyPageSpeed(targetUrl, 'mobile'),
    fetchStrategyPageSpeed(targetUrl, 'desktop'),
  ]);

  return { mobile, desktop };
}
