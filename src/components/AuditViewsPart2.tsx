import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Code2,
  Copy,
  ExternalLink,
  Gauge,
  Image as ImageIcon,
  Key,
  Layers,
  Link2,
  Monitor,
  RefreshCw,
  Search,
  Smartphone,
  Sparkles,
  Zap,
} from 'lucide-react';
import type { AuditReport, IssueCategory, IssueSeverity, KeywordResearchResult } from '../types/seo';
import { SeverityBadge, ScoreCard } from './AuditViewsPart1';

// -------------------------------------------------------------
// 7. PERFORMANCE AUDIT VIEW
// -------------------------------------------------------------
export function PerformanceView({ report }: { report: AuditReport }) {
  const [strategy, setStrategy] = useState<'mobile' | 'desktop'>('mobile');
  const psiData = strategy === 'mobile' ? report.pageSpeed.mobile : report.pageSpeed.desktop;
  const perfIssues = report.issues.filter((i) => i.category === 'Performance');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Performance Audit</h1>
          <p className="text-sm text-slate-600">
            Core Web Vitals telemetry (LCP, CLS, INP, FCP, TTFB) powered by Google Lighthouse v5.
          </p>
        </div>

        {/* Strategy Switcher */}
        <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
          <button
            onClick={() => setStrategy('mobile')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              strategy === 'mobile'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-4 h-4" /> Mobile
          </button>
          <button
            onClick={() => setStrategy('desktop')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              strategy === 'desktop'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Monitor className="w-4 h-4" /> Desktop
          </button>
        </div>
      </div>

      {/* Scorecards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ScoreCard
          title="Performance"
          score={psiData.lighthouseScores?.performance ?? report.categoryScores.performance.score}
          category="Lighthouse"
        />
        <ScoreCard
          title="Accessibility"
          score={psiData.lighthouseScores?.accessibility ?? 85}
          category="Lighthouse"
        />
        <ScoreCard
          title="Best Practices"
          score={psiData.lighthouseScores?.bestPractices ?? 88}
          category="Lighthouse"
        />
        <ScoreCard
          title="SEO Technical"
          score={psiData.lighthouseScores?.seo ?? report.categoryScores.technical.score}
          category="Lighthouse"
        />
      </div>

      {/* Core Web Vitals Metrics Grid */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">
            Core Web Vitals &amp; Lab Diagnostic Metrics ({strategy.toUpperCase()})
          </h3>
          <span className="text-xs text-slate-500 font-mono">Source: {psiData.dataSource}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="text-xs text-slate-500 font-semibold">LCP (Largest Contentful)</div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {psiData.labMetrics?.largestContentfulPaint || 'N/A'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Target: &le; 2.5s</div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="text-xs text-slate-500 font-semibold">CLS (Cumulative Shift)</div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {psiData.labMetrics?.cumulativeLayoutShift || 'N/A'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Target: &le; 0.1</div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="text-xs text-slate-500 font-semibold">TBT (Blocking Time)</div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {psiData.labMetrics?.totalBlockingTime || 'N/A'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Target: &le; 200ms</div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="text-xs text-slate-500 font-semibold">FCP (First Paint)</div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {psiData.labMetrics?.firstContentfulPaint || 'N/A'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Target: &le; 1.8s</div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="text-xs text-slate-500 font-semibold">TTFB (Server Response)</div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {`${report.pages[0]?.responseTimeMs || 120}ms`}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Target: &le; 800ms</div>
          </div>
        </div>
      </div>

      {/* Lighthouse Opportunities */}
      {psiData.opportunities.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900">
            Lighthouse Performance Opportunities &amp; Asset Savings
          </h3>
          <div className="divide-y divide-slate-100">
            {psiData.opportunities.map((opp, idx) => (
              <div key={idx} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{opp.title}</h4>
                  <p className="text-xs text-slate-500">{opp.description}</p>
                </div>
                {opp.displayValue && (
                  <span className="shrink-0 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 self-start sm:self-auto">
                    {opp.displayValue}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Issues */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-slate-900">Performance Issues &amp; Fixes</h3>
        {perfIssues.map((iss) => (
          <div key={iss.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <SeverityBadge severity={iss.severity} />
              <h4 className="text-sm font-bold text-slate-900">{iss.title}</h4>
            </div>
            <p className="text-xs text-slate-600 mb-2">{iss.evidence}</p>
            <div className="text-xs bg-slate-50 p-2.5 rounded border border-slate-200 text-slate-800">
              <strong>Fix: </strong>
              {iss.recommendedFix}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 8. IMAGES AND MEDIA VIEW
// -------------------------------------------------------------
export function ImagesMediaView({ report }: { report: AuditReport }) {
  const allImages = report.pages.flatMap((p) =>
    p.images.map((img) => ({ ...img, pageUrl: p.url }))
  );
  const missingAlt = allImages.filter((img) => !img.hasAlt || img.isEmptyAlt);
  const modernFormats = allImages.filter((img) =>
    ['webp', 'avif', 'svg'].includes(img.format)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Images &amp; Media Audit</h1>
        <p className="text-sm text-slate-600">
          Analyze missing or generic alt attributes, image file formats (WebP/AVIF vs PNG/JPG), and lazy loading.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Images Crawled</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">{allImages.length}</div>
          <p className="text-xs text-slate-500 mt-1">Discovered across {report.pages.length} pages</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Missing Alt Attributes</div>
          <div className="text-2xl font-extrabold text-rose-600 mt-2">{missingAlt.length}</div>
          <p className="text-xs text-slate-500 mt-1">Accessibility and Image SEO risk</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Modern Formats (WebP/AVIF)</div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-2">
            {allImages.length > 0 ? Math.round((modernFormats.length / allImages.length) * 100) : 0}%
          </div>
          <p className="text-xs text-slate-500 mt-1">Next-gen compression adoption</p>
        </div>
      </div>

      {/* Discovered Images Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900">Discovered Images &amp; AI Alt-Text Suggestions</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Alt Status</th>
                <th className="py-3 px-4">Image Source</th>
                <th className="py-3 px-4">Format</th>
                <th className="py-3 px-4">Existing Alt Text</th>
                <th className="py-3 px-4">Suggested Descriptive Alt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allImages.slice(0, 30).map((img, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold">
                    {img.hasAlt && !img.isEmptyAlt ? (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Present
                      </span>
                    ) : (
                      <span className="text-rose-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Missing
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-900 break-all max-w-xs">{img.src}</td>
                  <td className="py-3 px-4 uppercase font-mono text-slate-600">{img.format}</td>
                  <td className="py-3 px-4 text-slate-700">
                    {img.alt || <span className="text-slate-400 italic">(none)</span>}
                  </td>
                  <td className="py-3 px-4 text-blue-700 font-medium bg-blue-50/50">
                    {img.suggestedAltText || <span className="text-slate-400 italic">N/A</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 9. INTERNAL AND EXTERNAL LINKS VIEW
// -------------------------------------------------------------
export function LinksAuditView({ report }: { report: AuditReport }) {
  const allInternalLinks = report.pages.flatMap((p) =>
    p.internalLinks.map((l) => ({ ...l, sourceUrl: p.url }))
  );
  const allExternalLinks = report.pages.flatMap((p) =>
    p.externalLinks.map((l) => ({ ...l, sourceUrl: p.url }))
  );
  const brokenLinks = allInternalLinks.filter((l) => l.isBroken);
  const genericAnchors = allInternalLinks.filter((l) => l.isGenericAnchor);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Internal &amp; External Links</h1>
        <p className="text-sm text-slate-600">
          Verify site architecture, orphan page risk, anchor text quality, broken links, and outbound link hygiene.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ScoreCard
          title="Links Score"
          score={report.categoryScores.links.score}
          category="Links"
        />
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Internal Links</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">{allInternalLinks.length}</div>
          <p className="text-xs text-slate-500 mt-1">Discovered on crawled pages</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Generic Anchors</div>
          <div className="text-2xl font-extrabold text-amber-600 mt-2">{genericAnchors.length}</div>
          <p className="text-xs text-slate-500 mt-1">&quot;Click here&quot;, &quot;read more&quot;, etc.</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Broken Links</div>
          <div className="text-2xl font-extrabold text-rose-600 mt-2">{brokenLinks.length}</div>
          <p className="text-xs text-slate-500 mt-1">HTTP 4xx or 5xx targets</p>
        </div>
      </div>

      {/* Contextual Internal Link Opportunities */}
      {report.contextualLinkOpportunities.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">
              Contextual Internal Linking Recommendations ({report.contextualLinkOpportunities.length})
            </h3>
          </div>
          <div className="space-y-3">
            {report.contextualLinkOpportunities.map((opp, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/40 text-xs space-y-2">
                <div className="flex items-center justify-between font-bold text-indigo-900">
                  <span>Target Page: {opp.targetUrl}</span>
                  <span className="font-mono bg-white px-2 py-0.5 rounded border border-indigo-200">
                    Anchor: &quot;{opp.suggestedAnchorText}&quot;
                  </span>
                </div>
                <div className="text-slate-700">
                  <strong>Source Page to Add Link from: </strong> {opp.sourceUrl}
                </div>
                <p className="text-indigo-950 font-mono bg-white p-2.5 rounded border border-indigo-200">
                  {opp.reason}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Internal Links Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900">Internal Links Sample</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Anchor Text</th>
                <th className="py-3 px-4">Quality</th>
                <th className="py-3 px-4">Target URL</th>
                <th className="py-3 px-4">Source Page</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allInternalLinks.slice(0, 20).map((l, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    {l.anchorText || <span className="text-slate-400 italic">(empty anchor)</span>}
                  </td>
                  <td className="py-3 px-4">
                    {l.isGenericAnchor ? (
                      <span className="text-amber-600 font-bold">Generic Anchor</span>
                    ) : (
                      <span className="text-emerald-600 font-bold">Descriptive</span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600 break-all max-w-xs">{l.resolvedUrl}</td>
                  <td className="py-3 px-4 font-mono text-slate-500 break-all max-w-xs">{l.sourceUrl}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 10. SCHEMA MARKUP VIEW
// -------------------------------------------------------------
export function SchemaMarkupView({ report }: { report: AuditReport }) {
  const schemaEntities = report.pages.flatMap((p) =>
    p.schemaEntities.map((s) => ({ ...s, pageUrl: p.url }))
  );
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (idx: number, raw: string) => {
    navigator.clipboard.writeText(raw);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Structured Data &amp; Schema.org</h1>
        <p className="text-sm text-slate-600">
          Audit JSON-LD and Microdata entities, validate required properties, and preview Google Rich Results.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ScoreCard
          title="Schema Score"
          score={report.categoryScores.schema.score}
          category="Structured Data"
        />

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Detected Schema Entities</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">{schemaEntities.length}</div>
          <p className="text-xs text-slate-500 mt-1">JSON-LD blocks discovered</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Distinct Schema Types</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">
            {new Set(schemaEntities.map((s) => s.type)).size}
          </div>
          <p className="text-xs text-slate-500 mt-1">e.g. Organization, Product, Article</p>
        </div>
      </div>

      {/* Discovered Entities */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-900">Extracted Structured Data Entities</h3>
        {schemaEntities.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-500">
            <Layers className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-800">No Structured Data Found</h4>
            <p className="text-xs text-slate-500 mt-1">
              Add JSON-LD markup to your HTML &lt;head&gt; to qualify for Google Rich Snippets.
            </p>
          </div>
        ) : (
          schemaEntities.map((entity, idx) => (
            <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                    @{entity.type}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">Found on: {entity.pageUrl}</span>
                </div>
                <button
                  onClick={() => handleCopy(idx, entity.raw)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  {copiedIndex === idx ? 'Copied!' : 'Copy JSON-LD'}
                </button>
              </div>

              {entity.missingRecommendedProps.length > 0 && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Missing recommended properties for Google Rich Snippets:{' '}
                    <strong>{entity.missingRecommendedProps.join(', ')}</strong>
                  </span>
                </div>
              )}

              <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-56">
                <code>{entity.raw}</code>
              </pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 11. KEYWORD ANALYSIS VIEW
// -------------------------------------------------------------
export function KeywordAnalysisView({
  report,
  onGenerateKeywords,
  aiKeywords,
  isLoading,
}: {
  report: AuditReport;
  onGenerateKeywords: (keyword: string) => void;
  aiKeywords: KeywordResearchResult | null;
  isLoading: boolean;
}) {
  const [keywordInput, setKeywordInput] = useState(report.config.targetKeyword || '');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (keywordInput.trim()) {
      onGenerateKeywords(keywordInput.trim());
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Keyword &amp; Search Intent Analysis</h1>
        <p className="text-sm text-slate-600">
          Evaluate on-page keyword density and generate semantic clusters, long-tail variations, and search intent mappings via Gemini AI.
        </p>
      </div>

      {/* Target Keyword Input */}
      <form onSubmit={handleSearch} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <label className="block text-sm font-bold text-slate-900">Analyze Target Keyword</label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="e.g. enterprise cloud observability"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !keywordInput.trim()}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" /> Generate Keyword Strategy
              </>
            )}
          </button>
        </div>
      </form>

      {/* AI Keywords Result Card */}
      {aiKeywords && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Search Intent Strategy</span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                  &quot;{aiKeywords.primaryKeyword}&quot;
                </h3>
              </div>
              <span className="text-xs px-3 py-1 bg-indigo-50 text-indigo-800 rounded-full font-bold border border-indigo-200">
                Primary Intent: {aiKeywords.intentClassification.primaryIntent}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-700">Buyer Journey Stage: </span>
                <span className="text-slate-900">{aiKeywords.intentClassification.buyerJourneyStage}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-700">SERP Expectation: </span>
                <span className="text-slate-900">{aiKeywords.intentClassification.serpExpectation}</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 font-mono">
              Data Source: {aiKeywords.metricsDataSource}
            </div>
          </div>

          {/* Related and Long-tail Keywords Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
              <h4 className="text-sm font-bold text-slate-900">Semantic &amp; Related Keywords</h4>
              <div className="space-y-2">
                {aiKeywords.relatedKeywords.map((k, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 text-xs flex items-center justify-between">
                    <span className="font-semibold text-slate-900">{k.keyword}</span>
                    <span className="text-[11px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {k.intent}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
              <h4 className="text-sm font-bold text-slate-900">Long-Tail Search Queries</h4>
              <div className="space-y-2">
                {aiKeywords.longTailKeywords.map((k, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 text-xs">
                    <div className="font-semibold text-slate-900 mb-0.5">{k.keyword}</div>
                    <div className="text-[11px] text-slate-500">{k.targetQuestion}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
