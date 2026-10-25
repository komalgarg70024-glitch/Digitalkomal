import { runWebsiteCrawl } from './crawler.ts';
import { runPageSpeedAudit } from './pagespeed.ts';
import type {
  AuditConfig,
  CompetitorComparisonResult,
  CompetitorSiteSummary,
} from '../src/types/seo.ts';

async function inspectCompetitorUrl(
  rawUrl: string,
  runPsi: boolean
): Promise<CompetitorSiteSummary> {
  const minimalConfig: AuditConfig = {
    url: rawUrl,
    mode: 'homepage',
    maxPages: 1,
    maxDepth: 0,
    respectRobotsTxt: true,
    includeSubdomains: false,
    crawlDelayMs: 0,
    runPageSpeed: runPsi,
    runAiAnalysis: false,
    weights: {
      technical: 25,
      onPage: 20,
      content: 20,
      performance: 15,
      links: 10,
      schema: 10,
    },
  };

  try {
    const crawl = await runWebsiteCrawl(minimalConfig);
    const page = crawl.pages[0];
    if (!page || page.statusCode === 0) {
      return {
        url: rawUrl,
        reachable: false,
        statusCode: page?.statusCode || 0,
        responseTimeMs: page?.responseTimeMs || 0,
        title: '',
        titleLength: 0,
        metaDescription: '',
        metaDescriptionLength: 0,
        h1Count: 0,
        h1s: [],
        h2Count: 0,
        h2Sample: [],
        wordCount: 0,
        readabilityScore: 0,
        internalLinksCount: 0,
        externalLinksCount: 0,
        imagesCount: 0,
        imagesWithAltPercent: 0,
        schemaTypes: [],
        httpsEnabled: rawUrl.startsWith('https://'),
        hasCanonical: false,
        hasViewport: false,
        hasRobotsTxt: crawl.robotsTxt.exists,
        hasSitemapXml: crawl.sitemap.exists,
        mobilePerformanceScore: null,
        topTerms: [],
      };
    }

    let mobilePerformanceScore: number | null = null;
    if (runPsi) {
      const psi = await runPageSpeedAudit(page.finalUrl, true);
      if (psi.mobile.available && psi.mobile.lighthouseScores) {
        mobilePerformanceScore = psi.mobile.lighthouseScores.performance;
      }
    }

    const withAlt = page.images.filter((i) => i.hasAlt && !i.isEmptyAlt).length;
    const imagesWithAltPercent =
      page.images.length > 0 ? Math.round((withAlt / page.images.length) * 100) : 100;

    return {
      url: page.finalUrl,
      reachable: page.statusCode >= 200 && page.statusCode < 400,
      statusCode: page.statusCode,
      responseTimeMs: page.responseTimeMs,
      title: page.title,
      titleLength: page.titleLength,
      metaDescription: page.metaDescription,
      metaDescriptionLength: page.metaDescriptionLength,
      h1Count: page.h1s.length,
      h1s: page.h1s.slice(0, 3),
      h2Count: page.h2s.length,
      h2Sample: page.h2s.slice(0, 6),
      wordCount: page.wordCount,
      readabilityScore: page.readabilityScore,
      internalLinksCount: page.internalLinks.length,
      externalLinksCount: page.externalLinks.length,
      imagesCount: page.images.length,
      imagesWithAltPercent,
      schemaTypes: Array.from(new Set(page.schemaEntities.map((s) => s.type))),
      httpsEnabled: page.finalUrl.startsWith('https://'),
      hasCanonical: Boolean(page.canonicalUrl),
      hasViewport: Boolean(page.viewport),
      hasRobotsTxt: crawl.robotsTxt.exists,
      hasSitemapXml: crawl.sitemap.exists,
      mobilePerformanceScore,
      topTerms: page.topTerms.slice(0, 8).map((t) => t.term),
    };
  } catch {
    return {
      url: rawUrl,
      reachable: false,
      statusCode: 0,
      responseTimeMs: 0,
      title: '',
      titleLength: 0,
      metaDescription: '',
      metaDescriptionLength: 0,
      h1Count: 0,
      h1s: [],
      h2Count: 0,
      h2Sample: [],
      wordCount: 0,
      readabilityScore: 0,
      internalLinksCount: 0,
      externalLinksCount: 0,
      imagesCount: 0,
      imagesWithAltPercent: 0,
      schemaTypes: [],
      httpsEnabled: false,
      hasCanonical: false,
      hasViewport: false,
      hasRobotsTxt: false,
      hasSitemapXml: false,
      mobilePerformanceScore: null,
      topTerms: [],
    };
  }
}

export async function runCompetitorComparison(params: {
  primaryUrl: string;
  competitorUrls: string[];
  runPageSpeed?: boolean;
}): Promise<CompetitorComparisonResult> {
  const cleanCompetitors = params.competitorUrls
    .map((u) => u.trim())
    .filter(Boolean)
    .slice(0, 3);

  const [primarySite, ...competitors] = await Promise.all([
    inspectCompetitorUrl(params.primaryUrl, Boolean(params.runPageSpeed)),
    ...cleanCompetitors.map((u) => inspectCompetitorUrl(u, Boolean(params.runPageSpeed))),
  ]);

  const primaryTermsSet = new Set(primarySite.topTerms);
  const competitorTerms = new Set<string>();
  const competitorSchemas = new Set<string>();

  for (const comp of competitors) {
    for (const term of comp.topTerms) {
      if (!primaryTermsSet.has(term)) competitorTerms.add(term);
    }
    for (const st of comp.schemaTypes) {
      if (!primarySite.schemaTypes.includes(st)) competitorSchemas.add(st);
    }
  }

  const contentGapAnalysis: CompetitorComparisonResult['contentGapAnalysis'] = [];
  const avgCompWords =
    competitors.length > 0
      ? Math.round(competitors.reduce((acc, c) => acc + c.wordCount, 0) / competitors.length)
      : 0;

  if (avgCompWords > primarySite.wordCount + 150) {
    contentGapAnalysis.push({
      topicOrFeature: 'Body Content Depth & Topical Coverage',
      observedInCompetitors: `Competitors average ${avgCompWords} words on their landing page vs. ${primarySite.wordCount} words on your page.`,
      recommendationForUser:
        'Expand your landing page with deeper section coverage, feature breakdowns, and FAQ modules to match competitor topical depth.',
      priority: 'High',
    });
  }

  if (competitorSchemas.size > 0) {
    contentGapAnalysis.push({
      topicOrFeature: 'Structured Data / Schema.org Entities',
      observedInCompetitors: `Competitors implement schema types not found on your page: ${Array.from(competitorSchemas).join(', ')}.`,
      recommendationForUser: `Add validated JSON-LD markup for ${Array.from(competitorSchemas).join(', ')} where applicable to your content.`,
      priority: 'High',
    });
  }

  const compHeadingsSample = competitors.flatMap((c) => c.h2Sample).slice(0, 5);
  if (compHeadingsSample.length > 0) {
    contentGapAnalysis.push({
      topicOrFeature: 'Subheading (H2) Structure & Section Themes',
      observedInCompetitors: `Competitor H2 sections include: ${compHeadingsSample.map((h) => `"${h}"`).join(', ')}`,
      recommendationForUser:
        'Review competitor H2 themes to identify user questions or comparison angles missing from your page outline.',
      priority: 'Medium',
    });
  }

  const structuralStrengths: string[] = [];
  const structuralWeaknesses: string[] = [];

  if (primarySite.responseTimeMs > 0 && competitors.some((c) => c.responseTimeMs > primarySite.responseTimeMs)) {
    structuralStrengths.push(
      `Faster initial HTML response time (${primarySite.responseTimeMs}ms) than one or more competitors.`
    );
  }
  if (primarySite.hasCanonical && primarySite.hasRobotsTxt && primarySite.hasSitemapXml) {
    structuralStrengths.push('Complete baseline indexability signals (Canonical, robots.txt, and XML Sitemap).');
  }
  if (!primarySite.hasSitemapXml && competitors.some((c) => c.hasSitemapXml)) {
    structuralWeaknesses.push('Missing XML Sitemap compared to competing domains.');
  }
  if (primarySite.schemaTypes.length === 0 && competitors.some((c) => c.schemaTypes.length > 0)) {
    structuralWeaknesses.push('No Schema.org structured data detected while competitors utilize structured markup.');
  }

  return {
    primarySite,
    competitors,
    topicOpportunities: Array.from(competitorTerms).slice(0, 12),
    contentGapAnalysis,
    structuralStrengths,
    structuralWeaknesses,
    disclaimer:
      'Competitor comparison is based strictly on publicly accessible HTML, HTTP headers, structured data, and PageSpeed telemetry. Private analytics, organic traffic, and keyword rankings require an authorized third-party SEO data provider.',
  };
}
