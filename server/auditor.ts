import type {
  AuditConfig,
  CategoryScoreDetail,
  ContentSimilarityPair,
  ContextualLinkOpportunity,
  CrawledPage,
  IssueCategory,
  IssueSeverity,
  PageSpeedStrategyResult,
  RobotsTxtData,
  SeoIssue,
  SitemapData,
} from '../src/types/seo.ts';

function computeJaccardSimilarity(textA: string, textB: string): {
  similarityPercent: number;
  sharedTerms: string[];
} {
  const tokenize = (t: string) =>
    new Set(
      t
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 4)
    );

  const setA = tokenize(textA);
  const setB = tokenize(textB);
  if (setA.size === 0 || setB.size === 0) {
    return { similarityPercent: 0, sharedTerms: [] };
  }

  const shared: string[] = [];
  for (const w of setA) {
    if (setB.has(w)) shared.push(w);
  }

  const unionSize = setA.size + setB.size - shared.length;
  const similarityPercent = unionSize > 0 ? Math.round((shared.length / unionSize) * 100) : 0;
  return { similarityPercent, sharedTerms: shared.slice(0, 8) };
}

export function runComprehensiveSeoAudit(params: {
  origin: string;
  config: AuditConfig;
  pages: CrawledPage[];
  robotsTxt: RobotsTxtData;
  sitemap: SitemapData;
  pageSpeed: { mobile: PageSpeedStrategyResult; desktop: PageSpeedStrategyResult };
}): {
  issues: SeoIssue[];
  contentSimilarityPairs: ContentSimilarityPair[];
  contextualLinkOpportunities: ContextualLinkOpportunity[];
  orphanCandidateUrls: string[];
  overallScore: number;
  categoryScores: {
    technical: CategoryScoreDetail;
    onPage: CategoryScoreDetail;
    content: CategoryScoreDetail;
    performance: CategoryScoreDetail;
    links: CategoryScoreDetail;
    schema: CategoryScoreDetail;
  };
  counts: {
    totalChecks: number;
    passed: number;
    warnings: number;
    errors: number;
    critical: number;
  };
} {
  const { origin, config, pages, robotsTxt, sitemap, pageSpeed } = params;
  const issues: SeoIssue[] = [];
  let seq = 1;

  const addIssue = (
    checkId: string,
    title: string,
    category: IssueCategory,
    subcategory: string,
    severity: IssueSeverity,
    affectedUrl: string,
    evidence: string,
    explanation: string,
    recommendedFix: string,
    suggestedValue?: string
  ) => {
    issues.push({
      id: `issue-${seq++}`,
      checkId,
      title,
      category,
      subcategory,
      severity,
      affectedUrl,
      evidence,
      explanation,
      recommendedFix,
      suggestedValue,
      status: 'open',
    });
  };

  // 1. Robots.txt checks
  if (!robotsTxt.exists) {
    addIssue(
      'tech-robots-missing',
      'Missing or unreachable robots.txt file',
      'Technical SEO',
      'Indexability',
      'warning',
      robotsTxt.url,
      `HTTP ${robotsTxt.statusCode || 'Unreachable'} at ${robotsTxt.url}`,
      'A robots.txt file guides search engine crawlers on which paths should or should not be crawled and declares your XML sitemap location.',
      'Create a valid /robots.txt file at the root domain with "User-agent: *" and a "Sitemap:" directive.',
      `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml`
    );
  } else if (robotsTxt.blocksRoot) {
    addIssue(
      'tech-robots-blocks-all',
      'robots.txt blocks entire website (Disallow: /)',
      'Technical SEO',
      'Indexability',
      'critical',
      robotsTxt.url,
      'Directive "Disallow: /" detected for User-agent: *',
      'Blocking the root path in robots.txt prevents search engines from crawling any page on your site.',
      'Remove "Disallow: /" from robots.txt immediately unless this is a staging environment.'
    );
  } else {
    addIssue(
      'tech-robots-valid',
      'Accessible robots.txt file with valid crawl rules',
      'Technical SEO',
      'Indexability',
      'passed',
      robotsTxt.url,
      `HTTP ${robotsTxt.statusCode}, ${robotsTxt.disallowRules.length} Disallow rule(s), ${robotsTxt.sitemapUrls.length} Sitemap declaration(s).`,
      'Your robots.txt file is accessible and does not globally block search engine bots.',
      'Continue monitoring robots.txt whenever site sections change.'
    );
  }

  // XML Sitemap checks
  if (!sitemap.exists) {
    addIssue(
      'tech-sitemap-missing',
      'XML Sitemap not found',
      'Technical SEO',
      'Indexability',
      'error',
      sitemap.url,
      sitemap.errors.join(' ') || 'No XML sitemap found at /sitemap.xml or in robots.txt.',
      'XML sitemaps help search engines discover important indexable URLs and monitor last-modified dates.',
      'Generate an XML sitemap listing all canonical 200 OK indexable pages and reference it in robots.txt.'
    );
  } else if (!sitemap.isValidXml) {
    addIssue(
      'tech-sitemap-invalid',
      'XML Sitemap contains invalid syntax or zero URLs',
      'Technical SEO',
      'Indexability',
      'error',
      sitemap.url,
      sitemap.errors.join(' '),
      'An empty or malformed XML sitemap cannot be processed by Google Search Console or search engine crawlers.',
      'Ensure the sitemap follows the sitemaps.org 0.9 XML protocol and includes valid <loc> tags.'
    );
  } else {
    addIssue(
      'tech-sitemap-valid',
      'Valid XML Sitemap discovered',
      'Technical SEO',
      'Indexability',
      'passed',
      sitemap.url,
      `Found ${sitemap.urlCount} URLs in ${sitemap.url}`,
      'A valid XML sitemap accelerates URL discovery and crawl scheduling.',
      'Submit this sitemap URL in Google Search Console.'
    );

    for (const err of sitemap.errors) {
      addIssue(
        'tech-sitemap-url-error',
        'Sitemap contains URL returning non-200 error',
        'Technical SEO',
        'Indexability',
        'error',
        sitemap.url,
        err,
        'Including broken or redirecting URLs in an XML sitemap wastes crawl budget and sends conflicting signals.',
        'Remove 4xx/5xx and redirecting URLs from the XML sitemap so only canonical 200 OK URLs remain.'
      );
    }
  }

  // HTTPS check
  if (!origin.startsWith('https://')) {
    addIssue(
      'sec-https-missing',
      'Website is not served over HTTPS',
      'Security',
      'Security Signals',
      'critical',
      origin,
      `Audited origin uses unencrypted protocol: ${origin}`,
      'HTTPS is a confirmed lightweight Google ranking signal and essential for user trust and browser security.',
      'Install a valid TLS/SSL certificate and enforce 301 permanent redirects from HTTP to HTTPS.'
    );
  } else {
    addIssue(
      'sec-https-enabled',
      'HTTPS encryption enabled on primary domain',
      'Security',
      'Security Signals',
      'passed',
      origin,
      `Origin served via ${origin}`,
      'Pages are served over encrypted HTTPS connections.',
      'Ensure all subdomains and assets also enforce HTTPS.'
    );
  }

  const titleMap = new Map<string, string[]>();
  const descMap = new Map<string, string[]>();

  for (const page of pages) {
    if (page.title) {
      const key = page.title.toLowerCase();
      titleMap.set(key, [...(titleMap.get(key) || []), page.url]);
    }
    if (page.metaDescription) {
      const key = page.metaDescription.toLowerCase();
      descMap.set(key, [...(descMap.get(key) || []), page.url]);
    }

    if (page.statusCode === 0 || page.statusCode >= 500) {
      addIssue(
        'tech-status-5xx',
        'Server error or unreachable page (5xx / Timeout)',
        'Technical SEO',
        'HTTP Status & Crawling',
        'critical',
        page.url,
        `Status: ${page.statusCode || 'Connection Failed'} (${page.errorMessage || 'Server error'})`,
        '5xx server errors and timeouts prevent search engines from indexing the page and cause immediate ranking drops if persistent.',
        'Inspect server logs, upstream timeouts, and firewall rules to ensure reliable 200 OK responses.'
      );
    } else if (page.statusCode >= 400) {
      addIssue(
        'tech-status-4xx',
        `Client error response (HTTP ${page.statusCode})`,
        'Technical SEO',
        'HTTP Status & Crawling',
        'error',
        page.url,
        `Page returned HTTP ${page.statusCode}`,
        '4xx pages cannot be indexed and waste link equity when linked internally.',
        'Restore the missing content, redirect the URL via a 301 redirect to a relevant live page, or remove internal links pointing to it.'
      );
    } else if (page.statusCode >= 200 && page.statusCode < 300) {
      addIssue(
        'tech-status-200',
        'Page returned HTTP 200 OK',
        'Technical SEO',
        'HTTP Status & Crawling',
        'passed',
        page.url,
        `HTTP ${page.statusCode} in ${page.responseTimeMs}ms`,
        'The URL responded with a clean 200 OK status code.',
        'Maintain fast, stable 200 OK responses.'
      );
    }

    if (page.redirectChain.length > 1) {
      addIssue(
        'tech-redirect-chain',
        `Redirect chain detected (${page.redirectChain.length} hops)`,
        'Technical SEO',
        'HTTP Status & Crawling',
        'warning',
        page.url,
        page.redirectChain.map((r) => `${r.from} [${r.statusCode}] -> ${r.to}`).join(' | '),
        'Multi-hop redirect chains add latency for users and risk crawl budget loss or diluted link signals.',
        `Update the initial redirect at ${page.url} to point directly to the final destination ${page.finalUrl} in a single 301 hop.`
      );
    } else if (page.redirectChain.length === 1) {
      const hop = page.redirectChain[0];
      if (hop.statusCode === 302 || hop.statusCode === 307) {
        addIssue(
          'tech-temporary-redirect',
          `Temporary redirect (${hop.statusCode}) used instead of permanent 301/308`,
          'Technical SEO',
          'HTTP Status & Crawling',
          'warning',
          page.url,
          `${hop.from} redirected via HTTP ${hop.statusCode} to ${hop.to}`,
          'Temporary redirects (302/307) signal that the move is not permanent, which can delay canonical consolidation.',
          'If this URL change is permanent, replace the 302/307 redirect with a 301 or 308 permanent redirect.'
        );
      }
    }

    try {
      const parsedPageUrl = new URL(page.finalUrl);
      if (/[A-Z]/.test(parsedPageUrl.pathname)) {
        addIssue(
          'tech-url-uppercase',
          'URL path contains uppercase characters',
          'Technical SEO',
          'URL Normalization',
          'warning',
          page.finalUrl,
          `Pathname "${parsedPageUrl.pathname}" contains mixed/uppercase letters`,
          'Uppercase characters in URLs often cause duplicate content issues if both /Page and /page resolve separately.',
          'Enforce lowercase URL paths across all internal links and redirect uppercase variants via 301.'
        );
      }
      if (parsedPageUrl.pathname.includes('_')) {
        addIssue(
          'tech-url-underscores',
          'URL path uses underscores instead of hyphens',
          'Technical SEO',
          'URL Normalization',
          'warning',
          page.finalUrl,
          `Pathname "${parsedPageUrl.pathname}" uses underscores (_)`,
          'Google recommends using hyphens (-) rather than underscores (_) as word separators in URLs.',
          'Use hyphens (-) for new URL slugs.'
        );
      }
    } catch {
      // ignore
    }

    const combinedRobots = `${page.metaRobots} ${page.headers.xRobotsTag || ''}`.toLowerCase();
    if (combinedRobots.includes('noindex')) {
      addIssue(
        'tech-noindex-detected',
        'Page is marked with "noindex" directive',
        'Technical SEO',
        'Indexability',
        'error',
        page.finalUrl,
        `meta robots="${page.metaRobots}", X-Robots-Tag="${page.headers.xRobotsTag || 'none'}"`,
        'A noindex directive instructs search engines to exclude this page from search results entirely.',
        'Verify if this page is intentionally excluded. If it should rank in search results, remove "noindex" from the meta robots tag or HTTP header.'
      );
    } else {
      addIssue(
        'tech-indexable',
        'Page allows search engine indexing',
        'Technical SEO',
        'Indexability',
        'passed',
        page.finalUrl,
        `No blocking noindex directive found (meta robots="${page.metaRobots || 'index, follow'}")`,
        'The page does not contain crawl-level noindex restrictions.',
        'Monitor index coverage in Google Search Console.'
      );
    }

    if (!page.canonicalUrl) {
      addIssue(
        'tech-canonical-missing',
        'Missing canonical link tag (<link rel="canonical">)',
        'Technical SEO',
        'Indexability',
        'warning',
        page.finalUrl,
        'No <link rel="canonical" href="..."> found in <head>',
        'Self-referencing canonical tags prevent duplicate content dilution caused by tracking parameters, trailing slashes, or protocol variants.',
        'Add a self-referencing <link rel="canonical"> tag inside the <head> section.',
        `<link rel="canonical" href="${page.finalUrl}" />`
      );
    } else {
      if (combinedRobots.includes('noindex')) {
        addIssue(
          'tech-canonical-noindex-conflict',
          'Conflicting signals: Page has both "noindex" and a canonical tag',
          'Technical SEO',
          'Indexability',
          'error',
          page.finalUrl,
          `Canonical="${page.canonicalUrl}" combined with noindex directive`,
          'Combining noindex with a canonical tag pointing elsewhere sends conflicting instructions to search engines.',
          'Use either a 301 redirect or a canonical tag without noindex if consolidating duplicate pages.'
        );
      } else {
        addIssue(
          'tech-canonical-present',
          'Canonical tag properly configured',
          'Technical SEO',
          'Indexability',
          'passed',
          page.finalUrl,
          `canonical="${page.canonicalUrl}"`,
          'Canonical URL is explicitly declared.',
          'Ensure canonical target always returns HTTP 200 OK.'
        );
      }
    }

    if (!page.htmlLang) {
      addIssue(
        'tech-html-lang-missing',
        'Missing HTML lang attribute (<html lang="...">)',
        'Technical SEO',
        'Website Architecture',
        'warning',
        page.finalUrl,
        '<html> tag lacks a lang attribute',
        'Declaring the document language helps screen readers and international search engines interpret page language accurately.',
        'Add a valid BCP 47 language code to the root HTML element, such as <html lang="en">.'
      );
    } else {
      addIssue(
        'tech-html-lang-present',
        'HTML language attribute declared',
        'Technical SEO',
        'Website Architecture',
        'passed',
        page.finalUrl,
        `<html lang="${page.htmlLang}">`,
        'Document language is explicitly declared.',
        'Keep language declaration consistent with visible content.'
      );
    }

    if (!page.viewport) {
      addIssue(
        'tech-viewport-missing',
        'Missing mobile viewport meta tag',
        'Technical SEO',
        'Website Architecture',
        'error',
        page.finalUrl,
        'No <meta name="viewport"> tag found in <head>',
        'Google uses mobile-first indexing. Without a viewport declaration, mobile devices render pages at desktop width, hurting mobile usability.',
        'Add <meta name="viewport" content="width=device-width, initial-scale=1.0"> to <head>.'
      );
    } else {
      addIssue(
        'tech-viewport-present',
        'Mobile viewport meta tag configured',
        'Technical SEO',
        'Website Architecture',
        'passed',
        page.finalUrl,
        `viewport="${page.viewport}"`,
        'Responsive viewport configuration is present for mobile-first indexing.',
        'Verify touch targets and responsive layout across mobile viewports.'
      );
    }

    if (page.crawlDepth > 3) {
      addIssue(
        'tech-deep-click-depth',
        `High click depth (${page.crawlDepth} clicks from start URL)`,
        'Technical SEO',
        'Website Architecture',
        'warning',
        page.finalUrl,
        `Crawl depth = ${page.crawlDepth} hops from homepage`,
        'Pages buried more than 3 clicks deep from the homepage receive less crawl frequency and internal PageRank.',
        'Link to important deep pages from category hubs or navigation menus.'
      );
    }

    if (pages.length > 2 && page.crawlDepth > 0 && page.incomingInternalLinksCount <= 1) {
      addIssue(
        'links-low-internal-inlinks',
        'Page has very few incoming internal links',
        'Links & Media',
        'Internal Linking',
        'warning',
        page.finalUrl,
        `Only ${page.incomingInternalLinksCount} incoming internal link(s) discovered during crawl`,
        'Pages with only a single internal link are weakly integrated into site architecture and harder for users and bots to discover.',
        'Add contextual internal links from related high-authority articles or hub pages.'
      );
    }

    if (page.mixedContentUrls.length > 0) {
      addIssue(
        'sec-mixed-content',
        `Mixed content detected (${page.mixedContentUrls.length} insecure HTTP resource(s))`,
        'Security',
        'Security Signals',
        'error',
        page.finalUrl,
        `Insecure resources on HTTPS page: ${page.mixedContentUrls.slice(0, 3).join(', ')}`,
        'Loading HTTP scripts, styles, or images on an HTTPS page triggers browser security warnings and may block resource rendering.',
        'Update all embedded asset URLs to use https://.'
      );
    }

    if (page.crawlDepth === 0 && !page.headers.strictTransportSecurity && page.finalUrl.startsWith('https://')) {
      addIssue(
        'sec-hsts-missing',
        'Missing Strict-Transport-Security (HSTS) response header',
        'Security',
        'Security Signals',
        'warning',
        page.finalUrl,
        'Strict-Transport-Security header not present on HTTPS response',
        'HSTS instructs browsers to always connect via HTTPS, preventing protocol downgrade attacks and stripping.',
        'Configure your web server or CDN to send "Strict-Transport-Security: max-age=31536000; includeSubDomains".'
      );
    }

    // 2. ON-PAGE SEO CHECKS
    if (!page.title) {
      addIssue(
        'onpage-title-missing',
        'Missing or empty <title> tag',
        'On-Page SEO',
        'Title Tag',
        'critical',
        page.finalUrl,
        'No text found inside <head><title>',
        'The title tag is one of the strongest on-page topical signals and serves as the clickable headline in search results.',
        'Add a unique, descriptive <title> tag between 50 and 60 characters.',
        page.suggestedTitle
      );
    } else if (page.titleLength < 30) {
      addIssue(
        'onpage-title-short',
        `Title tag is too short (${page.titleLength} characters)`,
        'On-Page SEO',
        'Title Tag',
        'warning',
        page.finalUrl,
        `Current title (${page.titleLength} chars): "${page.title}"`,
        'Short titles underutilize valuable SERP real estate and miss opportunities to include secondary modifiers or brand context.',
        'Expand the title to 50–60 characters with clear topical keywords and value proposition.',
        page.suggestedTitle
      );
    } else if (page.titleLength > 60) {
      addIssue(
        'onpage-title-long',
        `Title tag exceeds 60 characters (${page.titleLength} chars) — truncation risk`,
        'On-Page SEO',
        'Title Tag',
        'warning',
        page.finalUrl,
        `Current title (${page.titleLength} chars): "${page.title}"`,
        'Titles wider than ~600px (~60 characters) are often truncated or rewritten by Google in search results.',
        'Tighten the title tag to 50–60 characters while keeping the primary keyword near the front.',
        page.suggestedTitle
      );
    } else {
      addIssue(
        'onpage-title-optimal',
        'Title tag length is within optimal range (30–60 chars)',
        'On-Page SEO',
        'Title Tag',
        'passed',
        page.finalUrl,
        `"${page.title}" (${page.titleLength} chars)`,
        'Title tag is present and sized appropriately for desktop and mobile SERPs.',
        'Monitor CTR in Google Search Console.'
      );
    }

    if (!page.metaDescription) {
      addIssue(
        'onpage-desc-missing',
        'Missing or empty meta description',
        'On-Page SEO',
        'Meta Description',
        'error',
        page.finalUrl,
        'No <meta name="description"> content found',
        'While not a direct ranking factor, a compelling meta description improves organic click-through rate (CTR) when used as the SERP snippet.',
        'Write a unique, action-oriented meta description between 120 and 158 characters.',
        page.suggestedMetaDescription
      );
    } else if (page.metaDescriptionLength < 70) {
      addIssue(
        'onpage-desc-short',
        `Meta description is too brief (${page.metaDescriptionLength} characters)`,
        'On-Page SEO',
        'Meta Description',
        'warning',
        page.finalUrl,
        `"${page.metaDescription}" (${page.metaDescriptionLength} chars)`,
        'Very short meta descriptions fail to summarize page value and are frequently ignored by search engines in favor of body text fragments.',
        'Expand the meta description to 120–158 characters summarizing key benefits.',
        page.suggestedMetaDescription
      );
    } else if (page.metaDescriptionLength > 160) {
      addIssue(
        'onpage-desc-long',
        `Meta description exceeds 160 characters (${page.metaDescriptionLength} chars)`,
        'On-Page SEO',
        'Meta Description',
        'warning',
        page.finalUrl,
        `"${page.metaDescription.slice(0, 120)}..." (${page.metaDescriptionLength} chars)`,
        'Descriptions longer than ~155–160 characters are truncated with ellipses in search results.',
        'Condense the meta description to 120–158 characters.',
        page.suggestedMetaDescription
      );
    } else {
      addIssue(
        'onpage-desc-optimal',
        'Meta description length is well-optimized (70–160 chars)',
        'On-Page SEO',
        'Meta Description',
        'passed',
        page.finalUrl,
        `"${page.metaDescription}" (${page.metaDescriptionLength} chars)`,
        'Meta description is present and appropriately sized.',
        'Ensure each page maintains a distinct description.'
      );
    }

    if (page.h1s.length === 0) {
      addIssue(
        'onpage-h1-missing',
        'Missing H1 heading on page',
        'On-Page SEO',
        'Headings',
        'error',
        page.finalUrl,
        '0 <h1> elements found in document',
        'The H1 heading communicates the primary topic of the page to both users and search engines.',
        'Add a single, descriptive <h1> heading near the top of the main content.',
        page.suggestedH1
      );
    } else if (page.h1s.length > 1) {
      addIssue(
        'onpage-h1-multiple',
        `Multiple H1 headings detected (${page.h1s.length} H1 tags)`,
        'On-Page SEO',
        'Headings',
        'warning',
        page.finalUrl,
        `H1 tags: ${page.h1s.map((h) => `"${h}"`).join(', ')}`,
        'While HTML5 permits multiple H1s, using a single primary H1 with supporting H2/H3 subheadings creates a clearer semantic outline.',
        'Keep one primary <h1> and convert secondary headings to <h2>.',
        page.suggestedH1
      );
    } else {
      addIssue(
        'onpage-h1-optimal',
        'Single descriptive H1 heading present',
        'On-Page SEO',
        'Headings',
        'passed',
        page.finalUrl,
        `<h1>: "${page.h1s[0]}"`,
        'The page has a clear, single H1 heading.',
        'Ensure subtopics are organized under H2 and H3 tags.'
      );
    }

    if (page.headingHierarchySkips.length > 0) {
      addIssue(
        'onpage-heading-skip',
        'Non-sequential heading hierarchy (skipped heading levels)',
        'On-Page SEO',
        'Headings',
        'warning',
        page.finalUrl,
        page.headingHierarchySkips.slice(0, 3).join('; '),
        'Jumping heading levels (e.g., H1 directly to H3) weakens document outline semantics and screen reader navigation.',
        'Structure headings sequentially (H1 -> H2 -> H3) without skipping levels.'
      );
    }

    if (!page.openGraph['og:title'] || !page.openGraph['og:description'] || !page.openGraph['og:image']) {
      const missingOg = ['og:title', 'og:description', 'og:image'].filter((k) => !page.openGraph[k]);
      addIssue(
        'onpage-og-incomplete',
        `Incomplete Open Graph social metadata (missing ${missingOg.join(', ')})`,
        'On-Page SEO',
        'Social Metadata',
        'warning',
        page.finalUrl,
        `Missing properties: ${missingOg.join(', ')}`,
        'Open Graph tags control how URLs render when shared on LinkedIn, Facebook, Slack, and messaging apps.',
        'Add og:title, og:description, og:image, and og:url meta tags to <head>.'
      );
    } else {
      addIssue(
        'onpage-og-complete',
        'Open Graph social tags configured',
        'On-Page SEO',
        'Social Metadata',
        'passed',
        page.finalUrl,
        `og:title="${page.openGraph['og:title']}"`,
        'Core Open Graph metadata is present.',
        'Verify social preview card appearance when updating imagery.'
      );
    }

    if (page.keywordAnalysis && page.crawlDepth === 0) {
      const ka = page.keywordAnalysis;
      const missingLocations: string[] = [];
      if (!ka.inTitle) missingLocations.push('Title tag');
      if (!ka.inMetaDescription) missingLocations.push('Meta description');
      if (!ka.inH1) missingLocations.push('H1 heading');
      if (!ka.inFirst100Words) missingLocations.push('First 100 words');

      if (missingLocations.length > 0) {
        addIssue(
          'onpage-keyword-placement',
          `Target keyword "${ka.targetKeyword}" missing from key on-page elements`,
          'On-Page SEO',
          'Keyword Optimization',
          'warning',
          page.finalUrl,
          `Missing from: ${missingLocations.join(', ')} (Total occurrences: ${ka.occurrences}, Density: ${ka.densityPercent}%)`,
          'Including the primary topic keyword naturally in the title, H1, and opening paragraph clarifies topical relevance for users and search engines (practical optimization guidance).',
          `Incorporate "${ka.targetKeyword}" naturally into ${missingLocations.join(', ')} without forcing repetition.`,
          page.suggestedTitle
        );
      } else {
        addIssue(
          'onpage-keyword-optimal',
          `Target keyword "${ka.targetKeyword}" well-placed in core elements`,
          'On-Page SEO',
          'Keyword Optimization',
          'passed',
          page.finalUrl,
          `Found in Title, Meta Description, H1, and opening text (${ka.occurrences} occurrences, ${ka.densityPercent}% density)`,
          'Primary keyword placement aligns with on-page best practices.',
          'Supplement with natural semantic terms and subtopics.'
        );
      }

      if (ka.isStuffed) {
        addIssue(
          'onpage-keyword-stuffing',
          `Potential unnatural keyword repetition ("${ka.targetKeyword}" at ${ka.densityPercent}% density)`,
          'On-Page SEO',
          'Keyword Optimization',
          'warning',
          page.finalUrl,
          `${ka.occurrences} occurrences across ${page.wordCount} words (${ka.densityPercent}%)`,
          'Excessive repetition of the exact same phrase reads unnaturally to users and can trigger spam filters.',
          'Replace repetitive exact-match instances with natural synonyms and related entities.'
        );
      }
    }

    // 3. CONTENT QUALITY CHECKS
    if (page.wordCount < 250 && page.statusCode === 200) {
      addIssue(
        'content-thin',
        `Thin body content (${page.wordCount} words)`,
        'Content Quality',
        'Content Depth',
        page.wordCount < 80 ? 'error' : 'warning',
        page.finalUrl,
        `Extracted ${page.wordCount} visible body words across ${page.paragraphsCount} paragraph(s)`,
        'Pages with very little substantive text often fail to satisfy informational or commercial search intent fully.',
        'Expand the page with comprehensive answers, specifications, examples, or FAQs addressing user intent.'
      );
    } else if (page.wordCount >= 250) {
      addIssue(
        'content-depth-ok',
        `Substantive body content (${page.wordCount} words)`,
        'Content Quality',
        'Content Depth',
        'passed',
        page.finalUrl,
        `${page.wordCount} words, ${page.h2s.length} H2 subheadings, readability ${page.readabilityScore}/100`,
        'Page contains substantive visible body text.',
        'Keep content updated and aligned with user search intent.'
      );
    }

    if (page.wordCount > 300 && page.h2s.length === 0) {
      addIssue(
        'content-no-subheadings',
        'Long-form content lacks H2 subheadings for scannability',
        'Content Quality',
        'Content Organization',
        'warning',
        page.finalUrl,
        `${page.wordCount} words with 0 <h2> tags`,
        'Unbroken walls of text increase bounce rates and prevent search engines from understanding section subtopics.',
        'Break body copy into logical sections with descriptive H2 and H3 subheadings every 150–250 words.'
      );
    }

    if (page.wordCount > 150 && page.readabilityScore < 40) {
      addIssue(
        'content-readability-complex',
        `Low readability score (${page.readabilityScore}/100 — ${page.readabilityGrade})`,
        'Content Quality',
        'Readability',
        'warning',
        page.finalUrl,
        `Flesch Reading Ease: ${page.readabilityScore}/100 across ${page.sentencesCount} sentences`,
        'Dense, overly complex sentences reduce comprehension on mobile devices.',
        'Shorten sentences (aim for 15–20 words on average), use active voice, and add bulleted lists.'
      );
    }

    if (page.outdatedYearMentions.length > 0) {
      addIssue(
        'content-outdated-year',
        `Potentially outdated year reference in headings/title (${page.outdatedYearMentions.join(', ')})`,
        'Content Quality',
        'Content Freshness',
        'warning',
        page.finalUrl,
        `Detected year(s) ${page.outdatedYearMentions.join(', ')} in page title or headings`,
        'Users scanning search results strongly favor up-to-date guides and current data.',
        'Review and update statistics, examples, and title/heading year references where appropriate.'
      );
    }

    // 4. LINKS & IMAGE CHECKS
    const missingAltImages = page.images.filter((img) => !img.hasAlt || img.isEmptyAlt);
    if (missingAltImages.length > 0) {
      addIssue(
        'media-missing-alt',
        `${missingAltImages.length} image(s) missing descriptive alt text`,
        'Links & Media',
        'Image SEO',
        'error',
        page.finalUrl,
        `Examples: ${missingAltImages
          .slice(0, 3)
          .map((i) => i.filename || i.src)
          .join(', ')}`,
        'Alt attributes are essential for screen reader accessibility (WCAG) and Google Images indexing.',
        'Add concise, contextually accurate alt attributes to all informative images.',
        missingAltImages[0]?.suggestedAltText
      );
    } else if (page.images.length > 0) {
      addIssue(
        'media-alt-complete',
        `All ${page.images.length} image(s) contain alt attributes`,
        'Links & Media',
        'Image SEO',
        'passed',
        page.finalUrl,
        `${page.images.length}/${page.images.length} images have alt text`,
        'Images on this page include alt attributes.',
        'Continue writing descriptive alt text for new media.'
      );
    }

    const missingDimImages = page.images.filter((img) => !img.width || !img.height);
    if (missingDimImages.length > 0) {
      addIssue(
        'media-missing-dimensions',
        `${missingDimImages.length} image(s) missing explicit width and height attributes`,
        'Links & Media',
        'Image SEO',
        'warning',
        page.finalUrl,
        `Examples: ${missingDimImages
          .slice(0, 3)
          .map((i) => i.filename || i.src)
          .join(', ')}`,
        'Omitting explicit width and height attributes causes Cumulative Layout Shift (CLS) as images load.',
        'Add width and height attributes to every <img> element.'
      );
    }

    const legacyFormatImages = page.images.filter((img) =>
      ['jpg', 'jpeg', 'png', 'bmp'].includes(img.format)
    );
    if (legacyFormatImages.length > 2) {
      addIssue(
        'media-legacy-formats',
        `${legacyFormatImages.length} image(s) served in legacy formats (JPG/PNG) instead of WebP/AVIF`,
        'Links & Media',
        'Image Optimization',
        'warning',
        page.finalUrl,
        `Legacy format files: ${legacyFormatImages
          .slice(0, 3)
          .map((i) => i.filename)
          .join(', ')}`,
        'Next-gen formats like WebP and AVIF reduce image payload size by 25–50% compared to JPEG/PNG, improving LCP.',
        'Convert images to WebP or AVIF or serve them via a `<picture>` element.'
      );
    }

    const brokenImages = page.images.filter((img) => img.isBroken);
    if (brokenImages.length > 0) {
      addIssue(
        'media-broken-images',
        `${brokenImages.length} broken image URL(s) detected`,
        'Links & Media',
        'Image SEO',
        'error',
        page.finalUrl,
        brokenImages.map((i) => `${i.resolvedUrl} (HTTP ${i.statusCode || 'Failed'})`).join(', '),
        'Broken images degrade user experience and signal poor page maintenance.',
        'Fix or replace broken image src URLs.'
      );
    }

    const brokenInternal = page.internalLinks.filter((l) => l.isBroken);
    if (brokenInternal.length > 0) {
      addIssue(
        'links-broken-internal',
        `${brokenInternal.length} broken internal link(s) on page`,
        'Links & Media',
        'Internal Linking',
        'critical',
        page.finalUrl,
        brokenInternal.map((l) => `${l.resolvedUrl} (HTTP ${l.statusCode})`).join(', '),
        'Broken internal links hit dead ends for both users and search engine crawlers, wasting link equity.',
        'Update the href attribute on these internal links to point to live 200 OK destination URLs.'
      );
    }

    const redirectingInternal = page.internalLinks.filter((l) => Boolean(l.redirectsTo));
    if (redirectingInternal.length > 0) {
      addIssue(
        'links-redirecting-internal',
        `${redirectingInternal.length} internal link(s) point to redirecting URLs`,
        'Links & Media',
        'Internal Linking',
        'warning',
        page.finalUrl,
        redirectingInternal
          .slice(0, 3)
          .map((l) => `${l.resolvedUrl} -> ${l.redirectsTo}`)
          .join(' | '),
        'Linking internally to URLs that redirect adds unnecessary HTTP round-trips and slightly dilutes crawl efficiency.',
        'Update internal href values to link directly to the final canonical destination URL.'
      );
    }

    const genericAnchors = page.internalLinks.filter((l) => l.isGenericAnchor);
    if (genericAnchors.length > 0) {
      addIssue(
        'links-generic-anchors',
        `${genericAnchors.length} internal link(s) use generic or empty anchor text`,
        'Links & Media',
        'Anchor Text Quality',
        'warning',
        page.finalUrl,
        `Examples: ${genericAnchors
          .slice(0, 3)
          .map((l) => `"${l.anchorText || '[Empty]'}" -> ${l.href}`)
          .join(', ')}`,
        'Descriptive anchor text provides strong contextual clues to search engines about the topic of the target page.',
        'Replace generic phrases like "click here" or "read more" with specific topic-rich anchor text.'
      );
    }

    const brokenExternal = page.externalLinks.filter((l) => l.isBroken);
    if (brokenExternal.length > 0) {
      addIssue(
        'links-broken-external',
        `${brokenExternal.length} broken outgoing external link(s) detected`,
        'Links & Media',
        'External Links',
        'error',
        page.finalUrl,
        brokenExternal.map((l) => `${l.resolvedUrl} (HTTP ${l.statusCode})`).join(', '),
        'Linking out to dead external resources harms user trust and editorial quality.',
        'Remove or replace dead external links with live authoritative sources.'
      );
    }

    // 5. STRUCTURED DATA CHECKS
    if (page.schemaEntities.length === 0) {
      addIssue(
        'schema-missing',
        'No structured data (Schema.org JSON-LD / Microdata) detected',
        'Structured Data',
        'Schema Discovery',
        'warning',
        page.finalUrl,
        '0 JSON-LD, Microdata, or RDFa entities found',
        'Structured data helps search engines disambiguate entities and qualify for rich result enhancements.',
        'Add appropriate Schema.org JSON-LD markup in <head>.',
        JSON.stringify(
          {
            '@context': 'https://schema.org',
            '@type': page.crawlDepth === 0 ? 'Organization' : 'WebPage',
            name: page.title || new URL(page.finalUrl).hostname,
            url: page.finalUrl,
          },
          null,
          2
        )
      );
    } else {
      const invalidSchemas = page.schemaEntities.filter((s) => !s.isValid);
      const incompleteSchemas = page.schemaEntities.filter(
        (s) => s.isValid && s.missingRecommendedProps.length > 0
      );

      if (invalidSchemas.length > 0) {
        for (const inv of invalidSchemas) {
          addIssue(
            'schema-syntax-error',
            'Malformed JSON-LD structured data syntax error',
            'Structured Data',
            'Schema Validation',
            'error',
            page.finalUrl,
            inv.syntaxError || 'JSON parse error in application/ld+json script',
            'Search engines completely ignore JSON-LD blocks containing syntax errors such as trailing commas or unescaped quotes.',
            'Validate and fix the JSON-LD syntax using the corrected snippet.',
            inv.suggestedFixJson
          );
        }
      }

      if (incompleteSchemas.length > 0) {
        for (const inc of incompleteSchemas) {
          addIssue(
            'schema-missing-props',
            `${inc.type} schema missing recommended properties (${inc.missingRecommendedProps.join(', ')})`,
            'Structured Data',
            'Schema Completeness',
            'warning',
            page.finalUrl,
            `Entity @type="${inc.type}" is missing: ${inc.missingRecommendedProps.join(', ')}`,
            'Completing recommended properties strengthens entity disambiguation and rich result eligibility.',
            `Add the missing properties (${inc.missingRecommendedProps.join(', ')}) to your ${inc.type} JSON-LD block.`,
            inc.suggestedFixJson
          );
        }
      }

      if (invalidSchemas.length === 0 && incompleteSchemas.length === 0) {
        addIssue(
          'schema-valid',
          `Valid structured data detected (${page.schemaEntities.map((s) => s.type).join(', ')})`,
          'Structured Data',
          'Schema Validation',
          'passed',
          page.finalUrl,
          `Detected ${page.schemaEntities.length} entity block(s): ${page.schemaEntities
            .map((s) => `${s.type} (${s.format})`)
            .join(', ')}`,
          'Structured data syntax is valid and includes core recommended fields.',
          'Validate periodically with Google Rich Results Test.'
        );
      }
    }
  }

  // Duplicate Titles & Descriptions
  for (const [, urls] of titleMap.entries()) {
    if (urls.length > 1) {
      addIssue(
        'onpage-title-duplicate',
        `Duplicate <title> tag shared across ${urls.length} pages`,
        'On-Page SEO',
        'Title Tag',
        'error',
        urls[0],
        `Shared across: ${urls.join(', ')}`,
        'Duplicate title tags make it difficult for search engines to determine which page is most relevant for a query.',
        'Write a distinct <title> tag for each URL reflecting its unique content.'
      );
    }
  }

  for (const [, urls] of descMap.entries()) {
    if (urls.length > 1) {
      addIssue(
        'onpage-desc-duplicate',
        `Duplicate meta description shared across ${urls.length} pages`,
        'On-Page SEO',
        'Meta Description',
        'warning',
        urls[0],
        `Shared across: ${urls.join(', ')}`,
        'Identical meta descriptions across multiple URLs reduce snippet differentiation in search results.',
        'Craft a unique summary for each page.'
      );
    }
  }

  // Content similarity & Contextual Internal Link opportunities
  const contentSimilarityPairs: ContentSimilarityPair[] = [];
  const contextualLinkOpportunities: ContextualLinkOpportunity[] = [];

  for (let i = 0; i < pages.length; i++) {
    for (let j = i + 1; j < pages.length; j++) {
      const pA = pages[i];
      const pB = pages[j];
      if (pA.wordCount < 50 || pB.wordCount < 50) continue;

      const { similarityPercent, sharedTerms } = computeJaccardSimilarity(
        pA.textSnippet,
        pB.textSnippet
      );

      if (similarityPercent >= 60) {
        contentSimilarityPairs.push({
          urlA: pA.finalUrl,
          urlB: pB.finalUrl,
          similarityPercent,
          sharedTopicTerms: sharedTerms,
        });
        addIssue(
          'content-duplicate-overlap',
          `High content overlap (${similarityPercent}%) between two pages`,
          'Content Quality',
          'Duplicate Content',
          similarityPercent >= 80 ? 'error' : 'warning',
          pA.finalUrl,
          `${similarityPercent}% lexical overlap with ${pB.finalUrl} (shared terms: ${sharedTerms.slice(0, 5).join(', ')})`,
          'Substantial content overlap between pages can cause keyword cannibalization and split ranking signals.',
          'Consolidate overlapping pages via a 301 redirect or canonical tag.'
        );
      } else if (sharedTerms.length >= 2) {
        const alreadyLinks = pA.internalLinks.some((l) => l.resolvedUrl === pB.finalUrl);
        if (!alreadyLinks && contextualLinkOpportunities.length < 10) {
          contextualLinkOpportunities.push({
            sourceUrl: pA.finalUrl,
            targetUrl: pB.finalUrl,
            suggestedAnchorText: pB.h1s[0] || pB.title.split(/[|\-]/)[0]?.trim() || sharedTerms[0],
            reason: `Both pages cover related concepts (${sharedTerms.slice(0, 4).join(', ')}), but ${pA.finalUrl} does not currently link to ${pB.finalUrl}.`,
          });
        }
      }
    }
  }

  const orphanCandidateUrls: string[] = [];
  if (pages.length > 1 && sitemap.exists) {
    for (const sUrl of sitemap.sampleUrls) {
      if (!sUrl.inCrawl) {
        orphanCandidateUrls.push(sUrl.url);
      }
    }
  }

  // 6. PERFORMANCE & CORE WEB VITALS CHECKS
  const home = pages[0];
  if (home) {
    if (home.responseTimeMs > 1200) {
      addIssue(
        'perf-slow-ttfb',
        `Slow initial server response time (${home.responseTimeMs}ms)`,
        'Performance',
        'Server Response',
        home.responseTimeMs > 2500 ? 'error' : 'warning',
        home.finalUrl,
        `HTML fetch took ${home.responseTimeMs}ms`,
        'Slow server response time (TTFB) delays First Contentful Paint and Largest Contentful Paint.',
        'Enable CDN edge caching, optimize database queries, and enable HTTP/2 or HTTP/3.'
      );
    } else {
      addIssue(
        'perf-fast-ttfb',
        `Fast initial HTML response (${home.responseTimeMs}ms)`,
        'Performance',
        'Server Response',
        'passed',
        home.finalUrl,
        `HTML delivered in ${home.responseTimeMs}ms`,
        'Server responded quickly to the initial HTML request.',
        'Maintain server caching and CDN delivery.'
      );
    }

    if (home.renderBlockingResources.length > 3) {
      addIssue(
        'perf-render-blocking',
        `${home.renderBlockingResources.length} synchronous render-blocking scripts/stylesheets in <head>`,
        'Performance',
        'Resource Loading',
        'warning',
        home.finalUrl,
        `Examples: ${home.renderBlockingResources
          .slice(0, 3)
          .map((r) => `${r.type}: ${r.url}`)
          .join(', ')}`,
        'Synchronous <script> and <link rel="stylesheet"> tags in <head> pause browser HTML parsing.',
        'Add defer or async attributes to non-critical <script> tags.'
      );
    }
  }

  if (pageSpeed.mobile.available && pageSpeed.mobile.lighthouseScores) {
    const mScore = pageSpeed.mobile.lighthouseScores.performance;
    if (mScore < 50) {
      addIssue(
        'perf-psi-mobile-low',
        `Low Mobile Lighthouse Performance score (${mScore}/100)`,
        'Performance',
        'Core Web Vitals (Lab)',
        'error',
        origin,
        `Mobile Performance: ${mScore}/100, LCP: ${pageSpeed.mobile.labMetrics?.largestContentfulPaint}, TBT: ${pageSpeed.mobile.labMetrics?.totalBlockingTime}`,
        'Poor mobile performance increases user abandonment and negatively impacts Google Page Experience signals.',
        'Prioritize Largest Contentful Paint (LCP) image preloading and reduce unused JavaScript.'
      );
    } else if (mScore < 90) {
      addIssue(
        'perf-psi-mobile-moderate',
        `Mobile Lighthouse Performance score needs improvement (${mScore}/100)`,
        'Performance',
        'Core Web Vitals (Lab)',
        'warning',
        origin,
        `Mobile Performance: ${mScore}/100, LCP: ${pageSpeed.mobile.labMetrics?.largestContentfulPaint}`,
        'Mobile performance is moderate; optimizing asset delivery can move Core Web Vitals into the "Good" threshold.',
        'Review Lighthouse opportunity diagnostics for unused JS/CSS.'
      );
    } else {
      addIssue(
        'perf-psi-mobile-good',
        `Strong Mobile Lighthouse Performance score (${mScore}/100)`,
        'Performance',
        'Core Web Vitals (Lab)',
        'passed',
        origin,
        `Mobile Performance: ${mScore}/100, LCP: ${pageSpeed.mobile.labMetrics?.largestContentfulPaint}`,
        'Mobile Lighthouse performance is in the top tier (90–100).',
        'Continue monitoring real-user CrUX field metrics.'
      );
    }
  }

  // 7. SCORING ENGINE
  const computeCategoryScore = (
    catLabel: string,
    matchedCategories: IssueCategory[],
    weightPercent: number,
    unavailableChecksCount = 0
  ): CategoryScoreDetail => {
    const catIssues = issues.filter((i) => matchedCategories.includes(i.category));

    const byCheck = new Map<string, SeoIssue[]>();
    for (const iss of catIssues) {
      byCheck.set(iss.checkId, [...(byCheck.get(iss.checkId) || []), iss]);
    }

    let passedCount = 0;
    let warningCount = 0;
    let errorCount = 0;
    let criticalCount = 0;

    for (const iss of catIssues) {
      if (iss.severity === 'passed') passedCount++;
      else if (iss.severity === 'warning') warningCount++;
      else if (iss.severity === 'error') errorCount++;
      else if (iss.severity === 'critical') criticalCount++;
    }

    let earnedPoints = 0;
    let maxPossiblePoints = 0;

    for (const [, checkGroup] of byCheck.entries()) {
      const worst = checkGroup[0].severity;
      const occurrences = checkGroup.length;
      const repeatMultiplier = 1 + Math.min(1.5, (occurrences - 1) * 0.25);

      if (worst === 'passed') {
        maxPossiblePoints += 10;
        earnedPoints += 10;
      } else if (worst === 'warning') {
        const weight = 8 * repeatMultiplier;
        maxPossiblePoints += weight;
        earnedPoints += weight * 0.55;
      } else if (worst === 'error') {
        const weight = 14 * repeatMultiplier;
        maxPossiblePoints += weight;
        earnedPoints += weight * 0.2;
      } else if (worst === 'critical') {
        const weight = 22 * repeatMultiplier;
        maxPossiblePoints += weight;
        earnedPoints += 0;
      }
    }

    let score =
      maxPossiblePoints > 0 ? Math.round((earnedPoints / maxPossiblePoints) * 100) : 85;

    if (
      catLabel === 'Performance' &&
      pageSpeed.mobile.available &&
      pageSpeed.mobile.lighthouseScores
    ) {
      const mobilePerf = pageSpeed.mobile.lighthouseScores.performance;
      const desktopPerf = pageSpeed.desktop.lighthouseScores?.performance ?? mobilePerf;
      const psiAvg = Math.round(mobilePerf * 0.65 + desktopPerf * 0.35);
      score = Math.round(score * 0.4 + psiAvg * 0.6);
    }

    score = Math.max(5, Math.min(100, score));

    return {
      category: catLabel,
      score,
      weightPercent,
      passedCount,
      warningCount,
      errorCount,
      criticalCount,
      applicableChecks: byCheck.size,
      unavailableChecks: unavailableChecksCount,
    };
  };

  const w = config.weights || {
    technical: 25,
    onPage: 20,
    content: 20,
    performance: 15,
    links: 10,
    schema: 10,
  };

  const technical = computeCategoryScore(
    'Technical SEO',
    ['Technical SEO', 'Security', 'Local SEO'],
    w.technical
  );
  const onPage = computeCategoryScore('On-Page SEO', ['On-Page SEO'], w.onPage);
  const content = computeCategoryScore('Content Quality', ['Content Quality'], w.content);
  const performance = computeCategoryScore(
    'Performance',
    ['Performance'],
    w.performance,
    pageSpeed.mobile.available ? 0 : 2
  );
  const links = computeCategoryScore('Links & Media', ['Links & Media'], w.links);
  const schema = computeCategoryScore('Structured Data', ['Structured Data'], w.schema);

  const totalWeight =
    technical.weightPercent +
    onPage.weightPercent +
    content.weightPercent +
    performance.weightPercent +
    links.weightPercent +
    schema.weightPercent;

  const overallScore =
    totalWeight > 0
      ? Math.round(
          (technical.score * technical.weightPercent +
            onPage.score * onPage.weightPercent +
            content.score * content.weightPercent +
            performance.score * performance.weightPercent +
            links.score * links.weightPercent +
            schema.score * schema.weightPercent) /
            totalWeight
        )
      : 0;

  const passed = issues.filter((i) => i.severity === 'passed').length;
  const warnings = issues.filter((i) => i.severity === 'warning').length;
  const errors = issues.filter((i) => i.severity === 'error').length;
  const critical = issues.filter((i) => i.severity === 'critical').length;

  return {
    issues,
    contentSimilarityPairs,
    contextualLinkOpportunities,
    orphanCandidateUrls,
    overallScore,
    categoryScores: {
      technical,
      onPage,
      content,
      performance,
      links,
      schema,
    },
    counts: {
      totalChecks: issues.length,
      passed,
      warnings,
      errors,
      critical,
    },
  };
}
