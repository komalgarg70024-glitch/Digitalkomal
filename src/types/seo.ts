export type AuditMode = 'homepage' | 'full' | 'custom';

export type IssueSeverity = 'critical' | 'error' | 'warning' | 'passed';

export type IssueCategory =
  | 'Technical SEO'
  | 'On-Page SEO'
  | 'Content Quality'
  | 'Performance'
  | 'Links & Media'
  | 'Structured Data'
  | 'Local SEO'
  | 'Security';

export interface AuditConfig {
  url: string;
  mode: AuditMode;
  maxPages: number;
  maxDepth: number;
  respectRobotsTxt: boolean;
  includeSubdomains: boolean;
  crawlDelayMs: number;
  targetKeyword?: string;
  secondaryKeywords?: string[];
  targetCountry?: string;
  targetLanguage?: string;
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
  runPageSpeed: boolean;
  runAiAnalysis: boolean;
  weights: {
    technical: number;
    onPage: number;
    content: number;
    performance: number;
    links: number;
    schema: number;
  };
}

export interface RedirectHop {
  from: string;
  to: string;
  statusCode: number;
}

export interface ImageInfo {
  src: string;
  resolvedUrl: string;
  alt: string | null;
  hasAlt: boolean;
  isEmptyAlt: boolean;
  width: string | null;
  height: string | null;
  loading: string | null;
  filename: string;
  hasDescriptiveFilename: boolean;
  format: string;
  statusCode?: number;
  isBroken?: boolean;
  fileSizeBytes?: number;
  suggestedAltText?: string;
}

export interface LinkInfo {
  href: string;
  resolvedUrl: string;
  anchorText: string;
  isGenericAnchor: boolean;
  isInternal: boolean;
  isNavigation: boolean;
  rel: string | null;
  statusCode?: number;
  redirectsTo?: string;
  isBroken?: boolean;
}

export interface SchemaEntity {
  format: 'JSON-LD' | 'Microdata' | 'RDFa';
  type: string;
  raw: string;
  isValid: boolean;
  syntaxError?: string;
  missingRecommendedProps: string[];
  warnings: string[];
  suggestedFixJson?: string;
}

export interface CrawledPage {
  url: string;
  finalUrl: string;
  statusCode: number;
  redirectChain: RedirectHop[];
  responseTimeMs: number;
  contentType: string;
  contentSizeBytes: number;
  crawlDepth: number;
  timestamp: string;
  errorMessage?: string;

  // Headers
  headers: {
    xRobotsTag: string | null;
    strictTransportSecurity: string | null;
    contentSecurityPolicy: string | null;
    xFrameOptions: string | null;
    xContentTypeOptions: string | null;
    cacheControl: string | null;
    contentEncoding: string | null;
    server: string | null;
  };

  // On-Page Metadata
  title: string;
  titleLength: number;
  metaDescription: string;
  metaDescriptionLength: number;
  metaRobots: string;
  canonicalUrl: string;
  htmlLang: string;
  viewport: string;
  charset: string;
  openGraph: Record<string, string>;
  twitterCard: Record<string, string>;
  hreflangTags: Array<{ lang: string; href: string }>;

  // Headings
  h1s: string[];
  h2s: string[];
  h3s: string[];
  h4s: string[];
  headingHierarchySkips: string[];

  // Content & Readability
  wordCount: number;
  paragraphsCount: number;
  sentencesCount: number;
  readabilityScore: number;
  readabilityGrade: string;
  textSnippet: string;
  topTerms: Array<{ term: string; count: number; density: number }>;
  outdatedYearMentions: string[];
  faqCount: number;
  hasJsFrameworkWarning: boolean;
  jsFrameworkDetected?: string;

  // Keyword placement
  keywordAnalysis?: {
    targetKeyword: string;
    inTitle: boolean;
    inMetaDescription: boolean;
    inH1: boolean;
    inH2: boolean;
    inUrl: boolean;
    inFirst100Words: boolean;
    occurrences: number;
    densityPercent: number;
    isStuffed: boolean;
  };

  // Suggested Metadata
  suggestedTitle?: string;
  suggestedMetaDescription?: string;
  suggestedH1?: string;

  // Media & Links
  images: ImageInfo[];
  internalLinks: LinkInfo[];
  externalLinks: LinkInfo[];
  mixedContentUrls: string[];
  renderBlockingResources: Array<{ type: 'script' | 'stylesheet'; url: string }>;

  // Structured Data
  schemaEntities: SchemaEntity[];

  // Local Signals
  localSignals: {
    phonesDetected: string[];
    addressesDetected: string[];
    hasMapEmbedOrLink: boolean;
    hasContactLink: boolean;
    hasReviewMentions: boolean;
    hasLocalBusinessSchema: boolean;
    napConsistencyStatus?: 'matched' | 'partial' | 'mismatch' | 'not_provided';
  };

  incomingInternalLinksCount: number;
}

export interface RobotsTxtData {
  url: string;
  exists: boolean;
  statusCode: number;
  rawContent: string;
  disallowRules: string[];
  allowRules: string[];
  sitemapUrls: string[];
  blocksRoot: boolean;
}

export interface SitemapData {
  url: string;
  exists: boolean;
  statusCode: number;
  isValidXml: boolean;
  urlCount: number;
  sampleUrls: Array<{
    url: string;
    statusCode?: number;
    inCrawl: boolean;
    canonicalMatches?: boolean;
  }>;
  errors: string[];
}

export interface PageSpeedStrategyResult {
  strategy: 'mobile' | 'desktop';
  available: boolean;
  errorReason?: string;
  fetchedAt: string;
  dataSource: 'Google PageSpeed Insights API v5' | 'Unavailable';
  lighthouseScores?: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
  labMetrics?: {
    firstContentfulPaint: string;
    largestContentfulPaint: string;
    totalBlockingTime: string;
    cumulativeLayoutShift: string;
    speedIndex: string;
    interactive: string;
  };
  fieldData?: {
    available: boolean;
    overallCategory?: string;
    lcpMs?: number;
    lcpCategory?: string;
    inpMs?: number;
    inpCategory?: string;
    clsScore?: number;
    clsCategory?: string;
    fcpMs?: number;
    fcpCategory?: string;
  };
  opportunities: Array<{
    id: string;
    title: string;
    description: string;
    displayValue?: string;
    score: number | null;
    savingsMs?: number;
    savingsBytes?: number;
  }>;
}

export interface SeoIssue {
  id: string;
  checkId: string;
  title: string;
  category: IssueCategory;
  subcategory: string;
  severity: IssueSeverity;
  affectedUrl: string;
  evidence: string;
  explanation: string;
  recommendedFix: string;
  suggestedValue?: string;
  status: 'open' | 'resolved' | 'ignored';
}

export interface AiPrioritizedRecommendation {
  id: string;
  issue: string;
  evidence: string;
  whyItMatters: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  recommendedFix: string;
  implementationSteps: string[];
  exampleOrCode: string;
  estimatedEffort: string;
  verificationMethod: string;
}

export interface ActionPlanPhase {
  timeframe: '7-Day Quick Wins & Critical Fixes' | '30-Day Technical & On-Page Optimization' | '90-Day Authority, Content & Semantic Growth';
  focus: string;
  milestones: Array<{
    title: string;
    category: string;
    action: string;
    expectedOutcome: string;
    effort: string;
  }>;
}

export interface CategoryScoreDetail {
  category: string;
  score: number;
  weightPercent: number;
  passedCount: number;
  warningCount: number;
  errorCount: number;
  criticalCount: number;
  applicableChecks: number;
  unavailableChecks: number;
}

export interface SeoTask {
  id: string;
  auditId: string;
  title: string;
  relatedIssue: string;
  affectedUrl: string;
  category: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  expectedBenefit: string;
  estimatedEffort: string;
  status: 'To Do' | 'In Progress' | 'Completed';
  notes: string;
  verificationInstructions: string;
  createdAt: string;
}

export interface ContentSimilarityPair {
  urlA: string;
  urlB: string;
  similarityPercent: number;
  sharedTopicTerms: string[];
}

export interface ContextualLinkOpportunity {
  sourceUrl: string;
  targetUrl: string;
  suggestedAnchorText: string;
  reason: string;
}

export interface AuditReport {
  id: string;
  url: string;
  normalizedOrigin: string;
  createdAt: string;
  completedAt: string;
  durationMs: number;
  isDemoData: boolean;
  config: AuditConfig;

  // Scores
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
    urlsCrawled: number;
    urlsDiscovered: number;
    crawlCoveragePercent: number;
  };

  // Collected Data
  pages: CrawledPage[];
  robotsTxt: RobotsTxtData;
  sitemap: SitemapData;
  issues: SeoIssue[];
  contentSimilarityPairs: ContentSimilarityPair[];
  contextualLinkOpportunities: ContextualLinkOpportunity[];
  orphanCandidateUrls: string[];

  // Performance
  pageSpeed: {
    mobile: PageSpeedStrategyResult;
    desktop: PageSpeedStrategyResult;
  };

  // AI Recommendations & Action Plan
  aiAnalysis: {
    available: boolean;
    generatedBy: string;
    executiveSummary: string;
    recommendations: AiPrioritizedRecommendation[];
    actionPlan: ActionPlanPhase[];
    contentOpportunities: {
      missingTopics: string[];
      blogIdeas: Array<{ title: string; targetIntent: string; outline: string }>;
      faqSuggestions: Array<{ question: string; answerDraft: string }>;
    };
  };

  // Limitations & Data Sources
  limitations: string[];
  dataSources: string[];
}

export interface KeywordResearchRequest {
  primaryKeyword: string;
  secondaryKeywords: string[];
  country: string;
  language: string;
  targetAudience: string;
  searchIntent: 'Informational' | 'Commercial' | 'Transactional' | 'Navigational' | 'Local';
  targetPageUrl?: string;
  auditId?: string;
}

export interface KeywordResearchResult {
  primaryKeyword: string;
  metricsDataSource: string;
  hasVerifiedVolumeMetrics: boolean;
  intentClassification: {
    primaryIntent: string;
    buyerJourneyStage: string;
    serpExpectation: string;
  };
  targetPageAudit?: {
    url: string;
    inTitle: boolean;
    inMetaDescription: boolean;
    inH1: boolean;
    inH2: boolean;
    inUrl: boolean;
    inFirst100Words: boolean;
    densityPercent: number;
    recommendedTitle: string;
    recommendedMetaDescription: string;
    recommendedH1: string;
  };
  cannibalizationWarnings: Array<{
    keyword: string;
    competingUrls: string[];
    resolutionAdvice: string;
  }>;
  relatedKeywords: Array<{
    keyword: string;
    intent: string;
    relevanceNote: string;
    suggestedPageType: string;
  }>;
  semanticKeywords: string[];
  longTailKeywords: Array<{
    keyword: string;
    intent: string;
    targetQuestion: string;
  }>;
  topicClusters: Array<{
    pillarTopic: string;
    supportingSubtopics: string[];
    recommendedUrlSlug: string;
  }>;
  keywordToPageMapping: Array<{
    keywordCluster: string;
    recommendedUrl: string;
    pageRole: string;
    recommendedTitle: string;
  }>;
  contentGaps: string[];
  blogTopicIdeas: Array<{
    title: string;
    intent: string;
    targetKeywords: string[];
  }>;
  faqIdeas: Array<{
    question: string;
    conciseAnswer: string;
  }>;
}

export interface CompetitorSiteSummary {
  url: string;
  reachable: boolean;
  statusCode: number;
  responseTimeMs: number;
  title: string;
  titleLength: number;
  metaDescription: string;
  metaDescriptionLength: number;
  h1Count: number;
  h1s: string[];
  h2Count: number;
  h2Sample: string[];
  wordCount: number;
  readabilityScore: number;
  internalLinksCount: number;
  externalLinksCount: number;
  imagesCount: number;
  imagesWithAltPercent: number;
  schemaTypes: string[];
  httpsEnabled: boolean;
  hasCanonical: boolean;
  hasViewport: boolean;
  hasRobotsTxt: boolean;
  hasSitemapXml: boolean;
  mobilePerformanceScore: number | null;
  topTerms: string[];
}

export interface CompetitorComparisonResult {
  primarySite: CompetitorSiteSummary;
  competitors: CompetitorSiteSummary[];
  topicOpportunities: string[];
  contentGapAnalysis: Array<{
    topicOrFeature: string;
    observedInCompetitors: string;
    recommendationForUser: string;
    priority: 'High' | 'Medium' | 'Low';
  }>;
  structuralStrengths: string[];
  structuralWeaknesses: string[];
  disclaimer: string;
}

export interface IntegrationStatusResponse {
  geminiApi: {
    configured: boolean;
    model: string;
    details: string;
  };
  pageSpeedApi: {
    configured: boolean;
    hasCustomKey: boolean;
    details: string;
  };
  searchConsole: {
    connected: boolean;
    details: string;
  };
  analyticsGa4: {
    connected: boolean;
    details: string;
  };
  keywordProvider: {
    connected: boolean;
    details: string;
  };
  backlinkProvider: {
    connected: boolean;
    details: string;
  };
  database: {
    configured: boolean;
    engine: string;
    details: string;
  };
}
