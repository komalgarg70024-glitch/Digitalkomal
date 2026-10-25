import * as cheerio from 'cheerio';
import { safeFetch, validatePublicUrl } from './security.ts';
import type {
  AuditConfig,
  CrawledPage,
  ImageInfo,
  LinkInfo,
  RobotsTxtData,
  SchemaEntity,
  SitemapData,
} from '../src/types/seo.ts';

const GENERIC_ANCHORS = new Set([
  'click here',
  'read more',
  'learn more',
  'more',
  'here',
  'link',
  'website',
  'page',
  'this',
  'go',
  'view',
  'details',
  'continue',
]);

const STOPWORDS = new Set([
  'the', 'and', 'for', 'that', 'this', 'with', 'from', 'your', 'have', 'are',
  'was', 'were', 'will', 'would', 'could', 'should', 'about', 'into', 'more',
  'other', 'some', 'such', 'than', 'then', 'them', 'these', 'they', 'their',
  'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'whose', 'why',
  'how', 'all', 'any', 'both', 'each', 'few', 'most', 'many', 'much', 'own',
  'same', 'so', 'too', 'very', 'can', 'just', 'now', 'also', 'our', 'you',
  'not', 'but', 'out', 'use', 'one', 'two', 'new', 'get', 'has', 'had', 'been',
]);

const RECOMMENDED_SCHEMA_PROPS: Record<string, string[]> = {
  Organization: ['name', 'url', 'logo'],
  LocalBusiness: ['name', 'address', 'telephone', 'url'],
  Article: ['headline', 'author', 'datePublished', 'image'],
  BlogPosting: ['headline', 'author', 'datePublished', 'image'],
  NewsArticle: ['headline', 'author', 'datePublished', 'image'],
  Product: ['name', 'description', 'offers', 'image'],
  BreadcrumbList: ['itemListElement'],
  WebSite: ['name', 'url'],
  WebPage: ['name', 'description'],
  FAQPage: ['mainEntity'],
  Person: ['name'],
};

function normalizeCrawlUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    u.hash = '';
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'];
    for (const p of trackingParams) {
      u.searchParams.delete(p);
    }
    if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.toString();
  } catch {
    return rawUrl;
  }
}

function countSyllables(word: string): number {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  if (clean.length <= 3) return 1;
  const vowelAdjusted = clean
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')
    .replace(/^y/, '');
  const matches = vowelAdjusted.match(/[aeiouy]{1,2}/g);
  return matches ? Math.max(1, matches.length) : 1;
}

function computeReadability(text: string): {
  score: number;
  grade: string;
  wordCount: number;
  sentencesCount: number;
} {
  const words = text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
  const wordCount = words.length;
  if (wordCount === 0) {
    return { score: 0, grade: 'No readable body text', wordCount: 0, sentencesCount: 0 };
  }

  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);
  const sentencesCount = Math.max(1, sentences.length);

  let totalSyllables = 0;
  for (const w of words.slice(0, 1500)) {
    totalSyllables += countSyllables(w);
  }
  if (words.length > 1500) {
    totalSyllables = Math.round(totalSyllables * (words.length / 1500));
  }

  const wordsPerSentence = wordCount / sentencesCount;
  const syllablesPerWord = totalSyllables / wordCount;
  const rawScore = 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord;
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  let grade = 'Standard (8th-9th Grade)';
  if (score >= 80) grade = 'Easy to Read (6th-7th Grade)';
  else if (score >= 60) grade = 'Standard Conversational (8th-9th Grade)';
  else if (score >= 45) grade = 'Moderately Complex (High School / B2B)';
  else grade = 'Complex / Academic (Difficult to Scan)';

  return { score, grade, wordCount, sentencesCount };
}

export async function fetchRobotsTxt(origin: string): Promise<RobotsTxtData> {
  const robotsUrl = `${origin}/robots.txt`;
  const res = await safeFetch(robotsUrl, { timeoutMs: 6000, maxBytes: 256 * 1024 });

  if (!res.ok || res.statusCode >= 400 || !res.bodyText) {
    return {
      url: robotsUrl,
      exists: false,
      statusCode: res.statusCode,
      rawContent: '',
      disallowRules: [],
      allowRules: [],
      sitemapUrls: [],
      blocksRoot: false,
    };
  }

  const lines = res.bodyText.split(/\r?\n/);
  const disallowRules: string[] = [];
  const allowRules: string[] = [];
  const sitemapUrls: string[] = [];
  let currentAgentApplies = false;

  for (const rawLine of lines) {
    const line = rawLine.split('#')[0].trim();
    if (!line) continue;
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const directive = line.slice(0, colonIdx).trim().toLowerCase();
    const value = line.slice(colonIdx + 1).trim();

    if (directive === 'user-agent') {
      const ua = value.toLowerCase();
      currentAgentApplies = ua === '*' || ua.includes('seoauditpro');
    } else if (directive === 'disallow' && currentAgentApplies && value) {
      disallowRules.push(value);
    } else if (directive === 'allow' && currentAgentApplies && value) {
      allowRules.push(value);
    } else if (directive === 'sitemap' && value) {
      sitemapUrls.push(value);
    }
  }

  const blocksRoot = disallowRules.includes('/') && !allowRules.includes('/');

  return {
    url: robotsUrl,
    exists: true,
    statusCode: res.statusCode,
    rawContent: res.bodyText.slice(0, 5000),
    disallowRules,
    allowRules,
    sitemapUrls,
    blocksRoot,
  };
}

export function isBlockedByRobots(pathname: string, robots: RobotsTxtData): boolean {
  if (!robots.exists) return false;
  let matchedAllowLen = -1;
  let matchedDisallowLen = -1;

  for (const rule of robots.allowRules) {
    const cleanRule = rule.split('*')[0];
    if (cleanRule && pathname.startsWith(cleanRule)) {
      matchedAllowLen = Math.max(matchedAllowLen, cleanRule.length);
    }
  }

  for (const rule of robots.disallowRules) {
    const cleanRule = rule.split('*')[0];
    if (cleanRule && pathname.startsWith(cleanRule)) {
      matchedDisallowLen = Math.max(matchedDisallowLen, cleanRule.length);
    }
  }

  if (matchedDisallowLen === -1) return false;
  return matchedDisallowLen > matchedAllowLen;
}

export async function fetchSitemapXml(
  origin: string,
  robotsSitemaps: string[],
  crawledUrlsSet: Set<string>
): Promise<SitemapData> {
  const candidateUrls = [
    ...robotsSitemaps,
    `${origin}/sitemap.xml`,
    `${origin}/sitemap_index.xml`,
  ];
  const uniqueCandidates = Array.from(new Set(candidateUrls));

  for (const candidate of uniqueCandidates) {
    const res = await safeFetch(candidate, {
      timeoutMs: 7000,
      maxBytes: 2 * 1024 * 1024,
      acceptHeader: 'application/xml,text/xml,*/*;q=0.8',
    });

    if (res.ok && res.bodyText && (res.bodyText.includes('<urlset') || res.bodyText.includes('<sitemapindex'))) {
      const errors: string[] = [];
      const $ = cheerio.load(res.bodyText, { xmlMode: true });
      const locElements = $('url > loc, sitemap > loc')
        .map((_, el) => $(el).text().trim())
        .get()
        .filter(Boolean);

      const isValidXml = locElements.length > 0;
      if (!isValidXml) {
        errors.push('Sitemap XML found but contained no valid <loc> elements.');
      }

      const sampleUrls: SitemapData['sampleUrls'] = [];
      for (const locUrl of locElements.slice(0, 8)) {
        const normalized = normalizeCrawlUrl(locUrl);
        const inCrawl = crawledUrlsSet.has(normalized);
        sampleUrls.push({
          url: locUrl,
          inCrawl,
        });
      }

      let probed = 0;
      for (const item of sampleUrls) {
        if (probed >= 3) break;
        const checkRes = await safeFetch(item.url, { method: 'HEAD', timeoutMs: 4000 });
        item.statusCode = checkRes.statusCode;
        if (checkRes.statusCode >= 400 || checkRes.statusCode === 0) {
          errors.push(`Sitemap URL ${item.url} returned status ${checkRes.statusCode || 'Unreachable'}.`);
        }
        probed++;
      }

      return {
        url: candidate,
        exists: true,
        statusCode: res.statusCode,
        isValidXml,
        urlCount: locElements.length,
        sampleUrls,
        errors,
      };
    }
  }

  return {
    url: `${origin}/sitemap.xml`,
    exists: false,
    statusCode: 404,
    isValidXml: false,
    urlCount: 0,
    sampleUrls: [],
    errors: ['No accessible XML sitemap found at /sitemap.xml or declared in robots.txt.'],
  };
}

function parseStructuredData($: cheerio.CheerioAPI, pageTitle: string, pageUrl: string): SchemaEntity[] {
  const entities: SchemaEntity[] = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).html()?.trim() || '';
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed)
        ? parsed
        : parsed['@graph'] && Array.isArray(parsed['@graph'])
          ? parsed['@graph']
          : [parsed];

      for (const item of items) {
        if (!item || typeof item !== 'object') continue;
        const rawType = item['@type'];
        const typeStr = Array.isArray(rawType) ? rawType[0] : rawType || 'Unknown';
        const missingRecommendedProps: string[] = [];
        const warnings: string[] = [];

        const recommended = RECOMMENDED_SCHEMA_PROPS[typeStr] || [];
        for (const prop of recommended) {
          if (item[prop] === undefined || item[prop] === null || item[prop] === '') {
            missingRecommendedProps.push(prop);
          }
        }

        if (!item['@context'] && !parsed['@context']) {
          warnings.push('Missing "@context": "https://schema.org" property.');
        }

        let suggestedFixJson: string | undefined;
        if (missingRecommendedProps.length > 0 || warnings.length > 0) {
          const improved = {
            '@context': 'https://schema.org',
            ...item,
          };
          for (const prop of missingRecommendedProps) {
            if (prop === 'name' || prop === 'headline') improved[prop] = pageTitle || 'Page Headline';
            else if (prop === 'url') improved[prop] = pageUrl;
            else if (prop === 'description') improved[prop] = 'Add concise page summary here.';
            else if (prop === 'image' || prop === 'logo') improved[prop] = `${new URL(pageUrl).origin}/logo.png`;
            else if (prop === 'author') improved[prop] = { '@type': 'Organization', name: new URL(pageUrl).hostname };
            else if (prop === 'datePublished') improved[prop] = new Date().toISOString().split('T')[0];
            else improved[prop] = `[Provide ${prop}]`;
          }
          suggestedFixJson = JSON.stringify(improved, null, 2);
        }

        entities.push({
          format: 'JSON-LD',
          type: String(typeStr),
          raw: raw.slice(0, 1200),
          isValid: true,
          missingRecommendedProps,
          warnings,
          suggestedFixJson,
        });
      }
    } catch (err: any) {
      entities.push({
        format: 'JSON-LD',
        type: 'Invalid JSON-LD',
        raw: raw.slice(0, 800),
        isValid: false,
        syntaxError: err?.message || 'Malformed JSON syntax in application/ld+json block.',
        missingRecommendedProps: [],
        warnings: ['Invalid JSON syntax prevents search engines from parsing this block.'],
        suggestedFixJson: JSON.stringify(
          {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: pageTitle || 'Page Title',
            url: pageUrl,
          },
          null,
          2
        ),
      });
    }
  });

  $('[itemscope]').each((_, el) => {
    const itemtype = $(el).attr('itemtype') || 'MicrodataItem';
    const shortType = itemtype.split('/').pop() || itemtype;
    entities.push({
      format: 'Microdata',
      type: shortType,
      raw: `itemscope itemtype="${itemtype}"`,
      isValid: true,
      missingRecommendedProps: [],
      warnings: [],
    });
  });

  $('[typeof]').each((_, el) => {
    const rdfType = $(el).attr('typeof') || 'RDFaEntity';
    entities.push({
      format: 'RDFa',
      type: rdfType,
      raw: `typeof="${rdfType}"`,
      isValid: true,
      missingRecommendedProps: [],
      warnings: [],
    });
  });

  return entities;
}

function generateSuggestedMetadata(
  url: string,
  title: string,
  metaDescription: string,
  h1s: string[],
  targetKeyword?: string
): { suggestedTitle?: string; suggestedMetaDescription?: string; suggestedH1?: string } {
  const parsed = new URL(url);
  const brand = parsed.hostname
    .replace(/^www\./, '')
    .split('.')[0]
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());

  const pathSlug =
    parsed.pathname === '/' || !parsed.pathname
      ? 'Official Site & Solutions'
      : parsed.pathname
          .split('/')
          .filter(Boolean)
          .pop()
          ?.replace(/[-_]/g, ' ')
          .replace(/\.\w+$/, '')
          .replace(/\b\w/g, (l) => l.toUpperCase()) || 'Overview';

  const baseTopic = targetKeyword || h1s[0] || title.split(/[|\-–—]/)[0]?.trim() || pathSlug;

  let suggestedTitle: string | undefined;
  if (!title || title.length < 30 || title.length > 60) {
    const candidate = `${baseTopic} — ${ pathSlug !== baseTopic ? `${pathSlug} | ` : '' }${brand}`;
    suggestedTitle =
      candidate.length > 60
        ? `${baseTopic.slice(0, 42).trim()} | ${brand}`.slice(0, 60)
        : candidate.length < 30
          ? `${baseTopic} — Comprehensive Guide & Services | ${brand}`.slice(0, 60)
          : candidate;
  }

  let suggestedMetaDescription: string | undefined;
  if (!metaDescription || metaDescription.length < 70 || metaDescription.length > 160) {
    const kwPhrase = targetKeyword ? ` focused on ${targetKeyword}` : '';
    const draft = `Explore ${baseTopic} at ${brand}${kwPhrase}. Get actionable insights, trusted resources, and complete details tailored to your needs today.`;
    suggestedMetaDescription = draft.slice(0, 156);
  }

  let suggestedH1: string | undefined;
  if (h1s.length === 0 || h1s.length > 1) {
    suggestedH1 = targetKeyword
      ? `${targetKeyword.replace(/\b\w/g, (l) => l.toUpperCase())}: ${pathSlug}`
      : h1s[0] || `${baseTopic}`;
  }

  return { suggestedTitle, suggestedMetaDescription, suggestedH1 };
}

export async function runWebsiteCrawl(config: AuditConfig): Promise<{
  pages: CrawledPage[];
  robotsTxt: RobotsTxtData;
  sitemap: SitemapData;
  urlsDiscovered: number;
  limitations: string[];
}> {
  const validation = await validatePublicUrl(config.url);
  if (!validation.valid || !validation.parsedUrl) {
    throw new Error(validation.error || 'Invalid URL');
  }

  const startUrl = validation.parsedUrl.toString();
  const origin = validation.parsedUrl.origin;
  const baseHostname = validation.parsedUrl.hostname.toLowerCase().replace(/^www\./, '');

  const maxPages =
    config.mode === 'homepage'
      ? 1
      : Math.max(1, Math.min(40, config.maxPages || 10));
  const maxDepth =
    config.mode === 'homepage'
      ? 0
      : Math.max(0, Math.min(5, config.maxDepth || 2));

  const limitations: string[] = [
    'Crawler parses server-returned HTML safely without executing client-side JavaScript.',
  ];

  const robotsTxt = await fetchRobotsTxt(origin);
  if (robotsTxt.blocksRoot && config.respectRobotsTxt) {
    limitations.push(
      'robots.txt contains a global "Disallow: /" directive. Because "Respect robots.txt" is enabled, crawling was restricted.'
    );
  }

  const queue: Array<{ url: string; depth: number }> = [{ url: startUrl, depth: 0 }];
  const visitedNormalized = new Set<string>();
  const discoveredNormalized = new Set<string>([normalizeCrawlUrl(startUrl)]);
  const pages: CrawledPage[] = [];

  while (queue.length > 0 && pages.length < maxPages) {
    const current = queue.shift()!;
    const normUrl = normalizeCrawlUrl(current.url);
    if (visitedNormalized.has(normUrl)) continue;

    let parsedCurrent: URL;
    try {
      parsedCurrent = new URL(current.url);
    } catch {
      continue;
    }

    if (config.respectRobotsTxt && isBlockedByRobots(parsedCurrent.pathname, robotsTxt)) {
      limitations.push(`Skipped ${parsedCurrent.pathname} due to robots.txt Disallow directive.`);
      continue;
    }

    visitedNormalized.add(normUrl);

    if (pages.length > 0 && config.crawlDelayMs > 0) {
      await new Promise((r) => setTimeout(r, Math.min(1000, config.crawlDelayMs)));
    }

    const fetchRes = await safeFetch(current.url, {
      timeoutMs: 10000,
      maxBytes: 3 * 1024 * 1024,
    });

    const contentType = fetchRes.headers['content-type'] || '';
    if (
      fetchRes.statusCode !== 0 &&
      contentType &&
      !contentType.includes('text/html') &&
      !contentType.includes('application/xhtml+xml') &&
      pages.length > 0
    ) {
      continue;
    }

    const $ = cheerio.load(fetchRes.bodyText || '');

    const title = $('head > title').first().text().replace(/\s+/g, ' ').trim();
    const metaDescription = (
      $('meta[name="description"]').attr('content') ||
      $('meta[property="description"]').attr('content') ||
      ''
    )
      .replace(/\s+/g, ' ')
      .trim();
    const metaRobots = (
      $('meta[name="robots"]').attr('content') ||
      $('meta[name="googlebot"]').attr('content') ||
      ''
    ).trim();
    const canonicalRaw = $('link[rel="canonical"]').attr('href')?.trim() || '';
    let canonicalUrl = '';
    if (canonicalRaw) {
      try {
        canonicalUrl = new URL(canonicalRaw, fetchRes.finalUrl || current.url).toString();
      } catch {
        canonicalUrl = canonicalRaw;
      }
    }

    const htmlLang = ($('html').attr('lang') || '').trim();
    const viewport = ($('meta[name="viewport"]').attr('content') || '').trim();
    const charset =
      $('meta[charset]').attr('charset') ||
      $('meta[http-equiv="Content-Type"]').attr('content') ||
      '';

    const openGraph: Record<string, string> = {};
    $('meta[property^="og:"]').each((_, el) => {
      const prop = $(el).attr('property');
      const content = $(el).attr('content');
      if (prop && content) openGraph[prop] = content.trim();
    });

    const twitterCard: Record<string, string> = {};
    $('meta[name^="twitter:"], meta[property^="twitter:"]').each((_, el) => {
      const name = $(el).attr('name') || $(el).attr('property');
      const content = $(el).attr('content');
      if (name && content) twitterCard[name] = content.trim();
    });

    const hreflangTags: Array<{ lang: string; href: string }> = [];
    $('link[rel="alternate"][hreflang]').each((_, el) => {
      const lang = $(el).attr('hreflang')?.trim();
      const href = $(el).attr('href')?.trim();
      if (lang && href) hreflangTags.push({ lang, href });
    });

    const schemaEntities = parseStructuredData($, title, fetchRes.finalUrl || current.url);

    const hasReactRoot = $('#root, #__next, #app, [ng-version], [data-reactroot]').length > 0;
    const scriptTagsCount = $('script[src]').length;

    const renderBlockingResources: Array<{ type: 'script' | 'stylesheet'; url: string }> = [];
    $('head script[src]').each((_, el) => {
      const isAsync = $(el).attr('async') !== undefined;
      const isDefer = $(el).attr('defer') !== undefined;
      const typeAttr = $(el).attr('type') || '';
      if (!isAsync && !isDefer && typeAttr !== 'module') {
        const src = $(el).attr('src');
        if (src) renderBlockingResources.push({ type: 'script', url: src });
      }
    });
    $('head link[rel="stylesheet"][href]').each((_, el) => {
      const media = $(el).attr('media');
      if (!media || media === 'all' || media === 'screen') {
        const href = $(el).attr('href');
        if (href) renderBlockingResources.push({ type: 'stylesheet', url: href });
      }
    });

    const isHttpsPage = (fetchRes.finalUrl || current.url).startsWith('https://');
    const mixedContentUrls: string[] = [];
    if (isHttpsPage) {
      $('script[src], link[rel="stylesheet"][href], img[src], iframe[src], video[src], audio[src]').each(
        (_, el) => {
          const rawAttr = $(el).attr('src') || $(el).attr('href') || '';
          if (rawAttr.trim().startsWith('http://')) {
            mixedContentUrls.push(rawAttr.trim());
          }
        }
      );
    }

    const h1s = $('h1')
      .map((_, el) => $(el).text().replace(/\s+/g, ' ').trim())
      .get()
      .filter(Boolean);
    const h2s = $('h2')
      .map((_, el) => $(el).text().replace(/\s+/g, ' ').trim())
      .get()
      .filter(Boolean);
    const h3s = $('h3')
      .map((_, el) => $(el).text().replace(/\s+/g, ' ').trim())
      .get()
      .filter(Boolean);
    const h4s = $('h4')
      .map((_, el) => $(el).text().replace(/\s+/g, ' ').trim())
      .get()
      .filter(Boolean);

    const headingHierarchySkips: string[] = [];
    let prevLevel = 0;
    $('h1, h2, h3, h4, h5, h6').each((_, el) => {
      const tagName = (el as any).tagName?.toLowerCase() || '';
      const level = parseInt(tagName.replace('h', ''), 10);
      if (!Number.isNaN(level)) {
        if (prevLevel > 0 && level > prevLevel + 1) {
          headingHierarchySkips.push(`H${prevLevel} jumped directly to H${level}`);
        }
        prevLevel = level;
      }
    });

    const images: ImageInfo[] = [];
    $('img').each((_, el) => {
      const src = ($(el).attr('src') || $(el).attr('data-src') || '').trim();
      if (!src || src.startsWith('data:')) return;

      let resolvedUrl = src;
      try {
        resolvedUrl = new URL(src, fetchRes.finalUrl || current.url).toString();
      } catch {
        // keep raw
      }

      const altAttr = $(el).attr('alt');
      const hasAlt = altAttr !== undefined;
      const isEmptyAlt = hasAlt && altAttr.trim() === '';
      const width = $(el).attr('width') || null;
      const height = $(el).attr('height') || null;
      const loading = $(el).attr('loading') || null;

      let filename = '';
      let format = 'unknown';
      try {
        const u = new URL(resolvedUrl);
        filename = u.pathname.split('/').pop() || '';
        const extMatch = filename.match(/\.([a-zA-Z0-9]+)$/);
        if (extMatch) format = extMatch[1].toLowerCase();
      } catch {
        filename = src.split('/').pop() || '';
      }

      const cleanName = filename.replace(/\.[a-zA-Z0-9]+$/, '');
      const hasDescriptiveFilename =
        cleanName.length >= 4 &&
        !/^(img|image|photo|pic|screenshot|untitled|dsc|asset|banner|file)[-_]?\d*$/i.test(cleanName) &&
        !/^\d+$/.test(cleanName) &&
        !/^[a-f0-9]{16,}$/i.test(cleanName);

      let suggestedAltText: string | undefined;
      if (!hasAlt || isEmptyAlt) {
        const readableFile = cleanName.replace(/[-_]+/g, ' ').trim();
        if (hasDescriptiveFilename && readableFile) {
          suggestedAltText = `${readableFile.charAt(0).toUpperCase() + readableFile.slice(1)} (${title.split(/[|\-]/)[0]?.trim() || 'illustration'})`;
        } else {
          suggestedAltText = `${h1s[0] || title || 'Page'} visual illustration`;
        }
      }

      images.push({
        src,
        resolvedUrl,
        alt: altAttr ?? null,
        hasAlt,
        isEmptyAlt,
        width,
        height,
        loading,
        filename,
        hasDescriptiveFilename,
        format,
        suggestedAltText,
      });
    });

    if (pages.length === 0) {
      for (const img of images.slice(0, 4)) {
        if (img.resolvedUrl.startsWith('http')) {
          const imgRes = await safeFetch(img.resolvedUrl, { method: 'HEAD', timeoutMs: 3500 });
          img.statusCode = imgRes.statusCode;
          img.isBroken = imgRes.statusCode >= 400 || imgRes.statusCode === 0;
          if (imgRes.contentSizeBytes > 0) {
            img.fileSizeBytes = imgRes.contentSizeBytes;
          }
        }
      }
    }

    const internalLinks: LinkInfo[] = [];
    const externalLinks: LinkInfo[] = [];

    $('a[href]').each((_, el) => {
      const rawHref = ($(el).attr('href') || '').trim();
      if (
        !rawHref ||
        rawHref.startsWith('#') ||
        rawHref.startsWith('javascript:') ||
        rawHref.startsWith('mailto:') ||
        rawHref.startsWith('tel:')
      ) {
        return;
      }

      let resolvedUrl: string;
      let linkParsed: URL;
      try {
        linkParsed = new URL(rawHref, fetchRes.finalUrl || current.url);
        if (linkParsed.protocol !== 'http:' && linkParsed.protocol !== 'https:') return;
        resolvedUrl = linkParsed.toString();
      } catch {
        return;
      }

      const anchorText = $(el).text().replace(/\s+/g, ' ').trim() || $(el).attr('aria-label')?.trim() || '';
      const isGenericAnchor = !anchorText || GENERIC_ANCHORS.has(anchorText.toLowerCase());
      const rel = $(el).attr('rel') || null;
      const isNavigation = $(el).closest('nav, header, footer').length > 0;

      const linkHost = linkParsed.hostname.toLowerCase().replace(/^www\./, '');
      const isInternal = config.includeSubdomains
        ? linkHost === baseHostname || linkHost.endsWith(`.${baseHostname}`)
        : linkParsed.origin === origin || linkHost === baseHostname;

      if (isInternal) {
        internalLinks.push({
          href: rawHref,
          resolvedUrl,
          anchorText,
          isGenericAnchor,
          isInternal: true,
          isNavigation,
          rel,
        });

        const normTarget = normalizeCrawlUrl(resolvedUrl);
        discoveredNormalized.add(normTarget);

        if (
          current.depth + 1 <= maxDepth &&
          !visitedNormalized.has(normTarget) &&
          queue.length + pages.length < maxPages * 3
        ) {
          if (!/\.(pdf|jpg|jpeg|png|gif|webp|svg|zip|mp4|mp3|css|js|xml|json)$/i.test(linkParsed.pathname)) {
            queue.push({ url: resolvedUrl, depth: current.depth + 1 });
          }
        }
      } else {
        externalLinks.push({
          href: rawHref,
          resolvedUrl,
          anchorText,
          isGenericAnchor,
          isInternal: false,
          isNavigation,
          rel,
        });
      }
    });

    if (pages.length === 0) {
      for (const ext of externalLinks.slice(0, 3)) {
        const extRes = await safeFetch(ext.resolvedUrl, { method: 'HEAD', timeoutMs: 3500 });
        ext.statusCode = extRes.statusCode;
        ext.isBroken = extRes.statusCode >= 400;
      }
    }

    const hasMapEmbedOrLink =
      $('iframe[src*="google.com/maps"], iframe[src*="maps.google"], a[href*="maps.google"], a[href*="goo.gl/maps"]').length > 0;
    const hasContactLink =
      internalLinks.some((l) => /contact|location|about|find-us|store/i.test(l.resolvedUrl + ' ' + l.anchorText));

    const faqCount =
      schemaEntities.filter((s) => s.type === 'FAQPage').length +
      $('details, [class*="faq" i], [id*="faq" i]').length;

    $('script, style, noscript, svg, template').remove();
    const paragraphsCount = $('p').length;
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    const readability = computeReadability(bodyText);

    const hasJsFrameworkWarning =
      hasReactRoot && readability.wordCount < 60 && scriptTagsCount >= 2;
    if (hasJsFrameworkWarning && !limitations.some((l) => l.includes('client-side JavaScript'))) {
      limitations.push(
        `Detected probable client-side rendered SPA markers on ${current.url} with low initial HTML word count (${readability.wordCount} words). Dynamic DOM content rendered exclusively via browser JavaScript may not be visible to static HTML crawlers.`
      );
    }

    const termCounts = new Map<string, number>();
    const cleanWords = bodyText
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !STOPWORDS.has(w) && !/^\d+$/.test(w));

    for (const w of cleanWords) {
      termCounts.set(w, (termCounts.get(w) || 0) + 1);
    }
    const topTerms = Array.from(termCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([term, count]) => ({
        term,
        count,
        density: readability.wordCount > 0 ? Number(((count / readability.wordCount) * 100).toFixed(2)) : 0,
      }));

    const outdatedYearMentions: string[] = [];
    const headerText = `${title} ${h1s.join(' ')} ${h2s.join(' ')}`;
    const yearMatches = headerText.match(/\b(201[89]|202[0-4])\b/g);
    if (yearMatches) {
      outdatedYearMentions.push(...Array.from(new Set(yearMatches)));
    }

    const phoneRegex = /(?:\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/g;
    const phonesDetected = Array.from(new Set(bodyText.match(phoneRegex) || [])).slice(0, 5);
    const addressRegex = /\b\d{1,5}\s+[A-Z][a-zA-Z0-9\s.,]{4,35},\s*[A-Z]{2}\s+\d{5}\b/g;
    const addressesDetected = Array.from(new Set(bodyText.match(addressRegex) || [])).slice(0, 3);
    const hasReviewMentions = /testimonial|customer review|rated\s+\d|trustpilot|google review|\b4\.[5-9]\s*\/?\s*5/i.test(
      bodyText
    );
    const hasLocalBusinessSchema = schemaEntities.some((s) =>
      /LocalBusiness|Store|Restaurant|MedicalBusiness|LegalService|RealEstateAgent/i.test(s.type)
    );

    let napConsistencyStatus: CrawledPage['localSignals']['napConsistencyStatus'] = 'not_provided';
    if (config.businessName || config.businessPhone || config.businessAddress) {
      const lowerBody = bodyText.toLowerCase();
      const nameMatch = config.businessName
        ? lowerBody.includes(config.businessName.toLowerCase())
        : true;
      const phoneClean = config.businessPhone ? config.businessPhone.replace(/\D/g, '') : '';
      const phoneMatch = phoneClean
        ? bodyText.replace(/\D/g, '').includes(phoneClean)
        : true;
      if (nameMatch && phoneMatch) napConsistencyStatus = 'matched';
      else if (nameMatch || phoneMatch) napConsistencyStatus = 'partial';
      else napConsistencyStatus = 'mismatch';
    }

    let keywordAnalysis: CrawledPage['keywordAnalysis'] | undefined;
    if (config.targetKeyword && config.targetKeyword.trim()) {
      const kw = config.targetKeyword.trim().toLowerCase();
      const lowerTitle = title.toLowerCase();
      const lowerDesc = metaDescription.toLowerCase();
      const lowerH1 = h1s.join(' ').toLowerCase();
      const lowerH2 = h2s.join(' ').toLowerCase();
      const lowerUrl = (fetchRes.finalUrl || current.url).toLowerCase();
      const first100Words = bodyText.split(/\s+/).slice(0, 100).join(' ').toLowerCase();

      const escapedKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const matches = bodyText.toLowerCase().match(new RegExp(escapedKw, 'g'));
      const occurrences = matches ? matches.length : 0;
      const kwWordLen = kw.split(/\s+/).length;
      const densityPercent =
        readability.wordCount > 0
          ? Number((((occurrences * kwWordLen) / readability.wordCount) * 100).toFixed(2))
          : 0;

      keywordAnalysis = {
        targetKeyword: config.targetKeyword.trim(),
        inTitle: lowerTitle.includes(kw),
        inMetaDescription: lowerDesc.includes(kw),
        inH1: lowerH1.includes(kw),
        inH2: lowerH2.includes(kw),
        inUrl: lowerUrl.includes(kw.replace(/\s+/g, '-')) || lowerUrl.includes(kw.replace(/\s+/g, '')),
        inFirst100Words: first100Words.includes(kw),
        occurrences,
        densityPercent,
        isStuffed: densityPercent > 3.5 && occurrences > 6,
      };
    }

    const suggestions = generateSuggestedMetadata(
      fetchRes.finalUrl || current.url,
      title,
      metaDescription,
      h1s,
      config.targetKeyword
    );

    pages.push({
      url: current.url,
      finalUrl: fetchRes.finalUrl || current.url,
      statusCode: fetchRes.statusCode,
      redirectChain: fetchRes.redirectChain,
      responseTimeMs: fetchRes.responseTimeMs,
      contentType,
      contentSizeBytes: fetchRes.contentSizeBytes,
      crawlDepth: current.depth,
      timestamp: new Date().toISOString(),
      errorMessage: fetchRes.error,
      headers: {
        xRobotsTag: fetchRes.headers['x-robots-tag'] || null,
        strictTransportSecurity: fetchRes.headers['strict-transport-security'] || null,
        contentSecurityPolicy: fetchRes.headers['content-security-policy'] || null,
        xFrameOptions: fetchRes.headers['x-frame-options'] || null,
        xContentTypeOptions: fetchRes.headers['x-content-type-options'] || null,
        cacheControl: fetchRes.headers['cache-control'] || null,
        contentEncoding: fetchRes.headers['content-encoding'] || null,
        server: fetchRes.headers['server'] || null,
      },
      title,
      titleLength: title.length,
      metaDescription,
      metaDescriptionLength: metaDescription.length,
      metaRobots,
      canonicalUrl,
      htmlLang,
      viewport,
      charset,
      openGraph,
      twitterCard,
      hreflangTags,
      h1s,
      h2s,
      h3s,
      h4s,
      headingHierarchySkips,
      wordCount: readability.wordCount,
      paragraphsCount,
      sentencesCount: readability.sentencesCount,
      readabilityScore: readability.score,
      readabilityGrade: readability.grade,
      textSnippet: bodyText.slice(0, 600),
      topTerms,
      outdatedYearMentions,
      faqCount,
      hasJsFrameworkWarning,
      jsFrameworkDetected: hasReactRoot ? 'Client-Side SPA Container Detected' : undefined,
      keywordAnalysis,
      suggestedTitle: suggestions.suggestedTitle,
      suggestedMetaDescription: suggestions.suggestedMetaDescription,
      suggestedH1: suggestions.suggestedH1,
      images,
      internalLinks,
      externalLinks,
      mixedContentUrls,
      renderBlockingResources,
      schemaEntities,
      localSignals: {
        phonesDetected,
        addressesDetected,
        hasMapEmbedOrLink,
        hasContactLink,
        hasReviewMentions,
        hasLocalBusinessSchema,
        napConsistencyStatus,
      },
      incomingInternalLinksCount: 0,
    });
  }

  const pageByNormUrl = new Map<string, CrawledPage>();
  for (const p of pages) {
    pageByNormUrl.set(normalizeCrawlUrl(p.url), p);
    pageByNormUrl.set(normalizeCrawlUrl(p.finalUrl), p);
  }

  for (const p of pages) {
    for (const link of p.internalLinks) {
      const targetNorm = normalizeCrawlUrl(link.resolvedUrl);
      const targetPage = pageByNormUrl.get(targetNorm);
      if (targetPage) {
        if (normalizeCrawlUrl(p.finalUrl) !== targetNorm) {
          targetPage.incomingInternalLinksCount += 1;
        }
        link.statusCode = targetPage.statusCode;
        link.isBroken = targetPage.statusCode >= 400 || targetPage.statusCode === 0;
        if (targetPage.redirectChain.length > 0) {
          link.redirectsTo = targetPage.finalUrl;
        }
      }
    }
  }

  const sitemap = await fetchSitemapXml(origin, robotsTxt.sitemapUrls, visitedNormalized);

  for (const sItem of sitemap.sampleUrls) {
    const matchedPage = pageByNormUrl.get(normalizeCrawlUrl(sItem.url));
    if (matchedPage && matchedPage.canonicalUrl) {
      sItem.canonicalMatches =
        normalizeCrawlUrl(matchedPage.canonicalUrl) === normalizeCrawlUrl(sItem.url);
    }
  }

  return {
    pages,
    robotsTxt,
    sitemap,
    urlsDiscovered: discoveredNormalized.size,
    limitations,
  };
}
