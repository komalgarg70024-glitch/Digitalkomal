import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Code2,
  Copy,
  ExternalLink,
  FileCheck,
  FileCode,
  FileQuestion,
  FileText,
  Filter,
  Gauge,
  Globe,
  Info,
  Layers,
  Link2,
  Lock,
  Play,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Sliders,
  Sparkles,
  Zap,
} from 'lucide-react';
import type {
  AuditConfig,
  AuditReport,
  CrawledPage,
  IssueCategory,
  IssueSeverity,
  SeoIssue,
} from '../types/seo';

// Helper for severity badges
export function SeverityBadge({ severity }: { severity: IssueSeverity }) {
  switch (severity) {
    case 'critical':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
          <AlertCircle className="w-3 h-3 text-rose-600" /> Critical
        </span>
      );
    case 'error':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
          <AlertCircle className="w-3 h-3 text-red-600" /> Error
        </span>
      );
    case 'warning':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
          <AlertTriangle className="w-3 h-3 text-amber-600" /> Warning
        </span>
      );
    case 'passed':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Passed
        </span>
      );
  }
}

// Score Ring Card
export function ScoreCard({
  title,
  score,
  category,
  onClick,
}: {
  title: string;
  score: number;
  category?: string;
  onClick?: () => void;
}) {
  const getColor = (s: number) => {
    if (s >= 85) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (s >= 70) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (s >= 50) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-rose-600 bg-rose-50 border-rose-200';
  };

  const getBorderColor = (s: number) => {
    if (s >= 85) return 'border-emerald-500';
    if (s >= 70) return 'border-blue-500';
    if (s >= 50) return 'border-amber-500';
    return 'border-rose-500';
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition-all ${
        onClick ? 'cursor-pointer hover:border-blue-400' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-500">{title}</span>
        {category && (
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded font-mono">
            {category}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-3xl font-extrabold tracking-tight ${getColor(score).split(' ')[0]}`}>
          {score}
        </span>
        <span className="text-sm font-medium text-slate-400">/ 100</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
        <div
          className={`h-1.5 rounded-full ${
            score >= 85
              ? 'bg-emerald-500'
              : score >= 70
              ? 'bg-blue-500'
              : score >= 50
              ? 'bg-amber-500'
              : 'bg-rose-500'
          }`}
          style={{ width: `${Math.max(4, Math.min(100, score))}%` }}
        />
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 1. OVERVIEW DASHBOARD
// -------------------------------------------------------------
export function OverviewDashboard({
  report,
  onNavigate,
  onStartNewAudit,
}: {
  report: AuditReport;
  onNavigate: (view: string) => void;
  onStartNewAudit: () => void;
}) {
  const issuesNonPassed = report.issues.filter((i) => i.severity !== 'passed');
  const criticalIssues = report.issues.filter((i) => i.severity === 'critical');
  const errorIssues = report.issues.filter((i) => i.severity === 'error');
  const warningIssues = report.issues.filter((i) => i.severity === 'warning');
  const passedIssues = report.issues.filter((i) => i.severity === 'passed');

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:p-8 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <Globe className="w-3.5 h-3.5" /> Crawled Target
            </span>
            {report.isDemoData && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-300">
                <Info className="w-3 h-3" /> Preloaded Demo Audit
              </span>
            )}
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {new Date(report.completedAt).toLocaleString()}
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight break-all">
            {report.url}
          </h1>
          <p className="text-sm text-slate-600 line-clamp-2">
            {report.aiAnalysis?.executiveSummary ||
              `Comprehensive technical SEO audit crawled ${report.counts.urlsCrawled} accessible pages and verified ${report.counts.totalChecks} SEO ranking signals.`}
          </p>
        </div>

        <div className="flex items-center gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200 w-full lg:w-auto justify-between lg:justify-start">
          <div className="text-center px-4">
            <div className="text-4xl font-extrabold text-slate-900 tracking-tight">
              {report.overallScore}
              <span className="text-lg text-slate-400 font-medium">/100</span>
            </div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">
              SEO Health Score
            </div>
          </div>
          <div className="h-10 w-px bg-slate-200" />
          <div className="space-y-1 text-xs">
            <div className="text-slate-600">
              <strong className="text-slate-900 font-semibold">{report.counts.urlsCrawled}</strong> pages crawled
            </div>
            <div className="text-rose-600 font-semibold">
              {criticalIssues.length + errorIssues.length} errors &amp; critical
            </div>
            <div className="text-amber-600 font-semibold">
              {warningIssues.length} warnings
            </div>
          </div>
        </div>
      </div>

      {/* Category Score Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <ScoreCard
          title="Technical"
          score={report.categoryScores.technical.score}
          onClick={() => onNavigate('technical')}
        />
        <ScoreCard
          title="On-Page"
          score={report.categoryScores.onPage.score}
          onClick={() => onNavigate('on-page')}
        />
        <ScoreCard
          title="Content"
          score={report.categoryScores.content.score}
          onClick={() => onNavigate('content')}
        />
        <ScoreCard
          title="Performance"
          score={report.categoryScores.performance.score}
          onClick={() => onNavigate('performance')}
        />
        <ScoreCard
          title="Links"
          score={report.categoryScores.links.score}
          onClick={() => onNavigate('links')}
        />
        <ScoreCard
          title="Schema"
          score={report.categoryScores.schema.score}
          onClick={() => onNavigate('schema')}
        />
      </div>

      {/* Issue Distribution & Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigate('results')}
          className="bg-rose-50/70 border border-rose-200 rounded-xl p-4 cursor-pointer hover:bg-rose-100/60 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">Critical Blockers</span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-900 mt-2">{criticalIssues.length}</div>
          <p className="text-xs text-rose-700 mt-1">Requires immediate remediation</p>
        </div>

        <div
          onClick={() => onNavigate('results')}
          className="bg-red-50/70 border border-red-200 rounded-xl p-4 cursor-pointer hover:bg-red-100/60 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-800 uppercase tracking-wider">Errors</span>
            <AlertCircle className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-black text-red-900 mt-2">{errorIssues.length}</div>
          <p className="text-xs text-red-700 mt-1">High-impact SEO deficiencies</p>
        </div>

        <div
          onClick={() => onNavigate('results')}
          className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 cursor-pointer hover:bg-amber-100/60 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Warnings</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-900 mt-2">{warningIssues.length}</div>
          <p className="text-xs text-amber-700 mt-1">Optimization opportunities</p>
        </div>

        <div
          onClick={() => onNavigate('results')}
          className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 cursor-pointer hover:bg-emerald-100/60 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Passed Checks</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-900 mt-2">{passedIssues.length}</div>
          <p className="text-xs text-emerald-700 mt-1">Signals verified compliant</p>
        </div>
      </div>

      {/* Main Grid: AI Priority Actions & Top Critical Issues */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: AI Recommendations & Top Issues */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Executive Recommendations */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-slate-900">AI-Prioritized Strategic Actions</h2>
              </div>
              <button
                onClick={() => onNavigate('ai-recommendations')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                View Full Strategy <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {(report.aiAnalysis?.recommendations || []).slice(0, 4).map((rec, i) => (
                <div
                  key={rec.id || i}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded ${
                            rec.priority === 'Critical'
                              ? 'bg-rose-100 text-rose-800'
                              : rec.priority === 'High'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {rec.priority}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">{rec.issue}</h4>
                      </div>
                      <p className="text-xs text-slate-600 mb-2">{rec.whyItMatters}</p>
                      <div className="text-xs text-slate-700 bg-white p-2.5 rounded border border-slate-200">
                        <strong className="text-slate-900 font-semibold">Action: </strong>
                        {rec.recommendedFix}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Issues List */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Highest-Priority Issues to Fix</h2>
              <button
                onClick={() => onNavigate('results')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                Explore All ({issuesNonPassed.length}) <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {issuesNonPassed.slice(0, 5).map((iss) => (
                <div key={iss.id} className="py-3.5 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={iss.severity} />
                      <span className="text-xs font-medium text-slate-500">{iss.category}</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-900">{iss.title}</div>
                    <div className="text-xs text-slate-500 font-mono break-all">{iss.affectedUrl}</div>
                  </div>
                  <button
                    onClick={() => onNavigate('results')}
                    className="shrink-0 text-xs text-slate-600 hover:text-blue-600 font-medium px-2 py-1 rounded hover:bg-slate-100"
                  >
                    Details
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Crawl Summary & Quick Actions */}
        <div className="space-y-6">
          {/* Crawl Meta Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Crawl Coverage</h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Crawl Scope:</span>
                <span className="font-semibold text-slate-900 capitalize">{report.config.mode} mode</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Pages Crawled:</span>
                <span className="font-semibold text-slate-900">{report.pages.length} URLs</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">URLs Discovered:</span>
                <span className="font-semibold text-slate-900">{report.counts.urlsDiscovered} links</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Robots.txt Status:</span>
                <span className="font-semibold text-slate-900">
                  {report.robotsTxt.exists ? 'Found & Valid' : 'Missing / 404'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">XML Sitemap:</span>
                <span className="font-semibold text-slate-900">
                  {report.sitemap.exists
                    ? `${report.sitemap.urlCount} URLs indexed`
                    : 'Not Detected'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">PageSpeed Analysis:</span>
                <span className="font-semibold text-slate-900">
                  {report.pageSpeed.mobile.available ? 'Lighthouse v5 Telemetry' : 'Disabled / Skipped'}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Crawl Duration:</span>
                <span className="font-semibold text-slate-900">
                  {(report.durationMs / 1000).toFixed(1)}s
                </span>
              </div>
            </div>

            <button
              onClick={onStartNewAudit}
              className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Run Fresh Audit
            </button>
          </div>

          {/* Quick Tools Jump */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Quick Jump Tools</h3>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => onNavigate('competitor')}
                className="w-full text-left px-3 py-2.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center justify-between"
              >
                <span>Competitor Head-to-Head Comparison</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
              <button
                onClick={() => onNavigate('keywords')}
                className="w-full text-left px-3 py-2.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center justify-between"
              >
                <span>Keyword &amp; Search Intent Analysis</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
              <button
                onClick={() => onNavigate('reports')}
                className="w-full text-left px-3 py-2.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center justify-between"
              >
                <span>Download Executive PDF Report</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 2. NEW SEO AUDIT VIEW
// -------------------------------------------------------------
export function NewAuditView({
  onRunAudit,
  isLoading,
  initialUrl = '',
}: {
  onRunAudit: (config: AuditConfig) => void;
  isLoading: boolean;
  initialUrl?: string;
}) {
  const [url, setUrl] = useState(initialUrl || 'https://example.com');
  const [mode, setMode] = useState<'homepage' | 'full' | 'custom'>('full');
  const [maxPages, setMaxPages] = useState<number>(10);
  const [maxDepth, setMaxDepth] = useState<number>(2);
  const [respectRobotsTxt, setRespectRobotsTxt] = useState(true);
  const [includeSubdomains, setIncludeSubdomains] = useState(false);
  const [runPageSpeed, setRunPageSpeed] = useState(true);
  const [runAiAnalysis, setRunAiAnalysis] = useState(true);
  const [targetKeyword, setTargetKeyword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    onRunAudit({
      url: url.trim(),
      mode,
      maxPages: mode === 'homepage' ? 1 : maxPages,
      maxDepth: mode === 'homepage' ? 0 : maxDepth,
      respectRobotsTxt,
      includeSubdomains,
      crawlDelayMs: 50,
      runPageSpeed,
      runAiAnalysis,
      targetKeyword: targetKeyword.trim() || undefined,
      businessName: businessName.trim() || undefined,
      businessAddress: businessAddress.trim() || undefined,
      businessPhone: businessPhone.trim() || undefined,
      weights: {
        technical: 25,
        onPage: 20,
        content: 20,
        performance: 15,
        links: 10,
        schema: 10,
      },
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Launch New SEO Audit
        </h1>
        <p className="text-sm text-slate-600 max-w-xl mx-auto">
          Enter any public website URL to run real-time crawler analysis, Core Web Vitals checks,
          and Gemini AI strategic recommendations.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-2xl p-6 lg:p-8 shadow-sm space-y-6"
      >
        {/* URL Input */}
        <div>
          <label className="block text-sm font-bold text-slate-900 mb-1.5">
            Website URL to Audit <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Globe className="w-5 h-5" />
            </div>
            <input
              type="text"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium text-base focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
          <p className="text-xs text-slate-500 mt-1.5">
            Protected by SSRF security policy: internal networks, localhost, and cloud metadata
            addresses are blocked.
          </p>
        </div>

        {/* Audit Mode Selector */}
        <div>
          <label className="block text-sm font-bold text-slate-900 mb-2">Audit Crawl Scope</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                id: 'homepage',
                title: 'Homepage Audit',
                desc: '1 page. Fast analysis of homepage on-page signals, schema, and PageSpeed.',
              },
              {
                id: 'full',
                title: 'Standard Site Audit',
                desc: 'Up to 10 pages, 2 levels deep. Full internal linking & duplicate checks.',
              },
              {
                id: 'custom',
                title: 'Custom Deep Crawl',
                desc: 'Configurable page limits, depth, and custom crawler behavior.',
              },
            ].map((m) => (
              <div
                key={m.id}
                onClick={() => setMode(m.id as any)}
                className={`p-4 rounded-xl border cursor-pointer transition ${
                  mode === m.id
                    ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="font-bold text-sm text-slate-900 mb-1">{m.title}</div>
                <div className="text-xs text-slate-500">{m.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Custom Crawl Settings */}
        {mode === 'custom' && (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Max Crawl Pages (1–30)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={maxPages}
                onChange={(e) => setMaxPages(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Max Crawl Depth (0–4)
              </label>
              <input
                type="number"
                min="0"
                max="4"
                value={maxDepth}
                onChange={(e) => setMaxDepth(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>
        )}

        {/* Feature Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer">
            <input
              type="checkbox"
              checked={runPageSpeed}
              onChange={(e) => setRunPageSpeed(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <div>
              <div className="text-xs font-bold text-slate-900">Run Google PageSpeed Insights</div>
              <div className="text-[11px] text-slate-500">Live Mobile &amp; Desktop Core Web Vitals telemetry</div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer">
            <input
              type="checkbox"
              checked={runAiAnalysis}
              onChange={(e) => setRunAiAnalysis(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <div>
              <div className="text-xs font-bold text-slate-900">Gemini AI Strategic Recommendations</div>
              <div className="text-[11px] text-slate-500">Generates executive summary and prioritized action plan</div>
            </div>
          </label>
        </div>

        {/* Advanced Target Keyword & Local SEO Config Toggle */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <Sliders className="w-3.5 h-3.5" />
            {showAdvanced ? 'Hide Optional SEO Target Configuration' : 'Configure Target Keywords & Local SEO NAP (Optional)'}
          </button>
        </div>

        {showAdvanced && (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Primary Target Keyword
              </label>
              <input
                type="text"
                placeholder="e.g. enterprise data pipeline"
                value={targetKeyword}
                onChange={(e) => setTargetKeyword(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Used to evaluate keyword density and placement across title tags, headings, and body copy.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Business Name</label>
                <input
                  type="text"
                  placeholder="e.g. Acme Inc."
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Business Phone</label>
                <input
                  type="text"
                  placeholder="e.g. (555) 019-2834"
                  value={businessPhone}
                  onChange={(e) => setBusinessPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Physical Address</label>
                <input
                  type="text"
                  placeholder="e.g. 100 Main St, Austin, TX"
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading || !url.trim()}
            className="w-full py-3.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-base shadow-sm hover:shadow transition flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Crawling Website &amp; Generating SEO Audit...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                Start Comprehensive SEO Audit
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// -------------------------------------------------------------
// 3. AUDIT RESULTS & ISSUES EXPLORER VIEW
// -------------------------------------------------------------
export function AuditResultsView({ report }: { report: AuditReport }) {
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories: IssueCategory[] = [
    'Technical SEO',
    'On-Page SEO',
    'Content Quality',
    'Performance',
    'Links & Media',
    'Structured Data',
    'Local SEO',
    'Security',
  ];

  const filteredIssues = report.issues.filter((iss) => {
    if (severityFilter !== 'all' && iss.severity !== severityFilter) return false;
    if (categoryFilter !== 'all' && iss.category !== categoryFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = iss.title.toLowerCase().includes(q);
      const matchEvidence = iss.evidence.toLowerCase().includes(q);
      const matchUrl = iss.affectedUrl.toLowerCase().includes(q);
      const matchFix = iss.recommendedFix.toLowerCase().includes(q);
      if (!matchTitle && !matchEvidence && !matchUrl && !matchFix) return false;
    }
    return true;
  });

  const handleCopyCode = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Audit Issues &amp; Signals Explorer
          </h1>
          <p className="text-sm text-slate-600">
            Explore all {report.issues.length} evaluated SEO checks with real evidence and recommended code fixes.
          </p>
        </div>
        <div className="text-xs text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-lg">
          Showing <strong>{filteredIssues.length}</strong> of <strong>{report.issues.length}</strong> checks
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search issues, URLs, explanations, or code fixes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical Only</option>
              <option value="error">Errors Only</option>
              <option value="warning">Warnings Only</option>
              <option value="passed">Passed Checks Only</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Issues Table / Cards */}
      <div className="space-y-3">
        {filteredIssues.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
            <FileQuestion className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-base font-bold text-slate-800">No issues matching criteria</h4>
            <p className="text-xs text-slate-500 mt-1">Try clearing filters or search terms.</p>
          </div>
        ) : (
          filteredIssues.map((iss) => {
            const isExpanded = expandedIssueId === iss.id;
            return (
              <div
                key={iss.id}
                className="bg-white border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 transition overflow-hidden"
              >
                {/* Header Row */}
                <div
                  onClick={() => setExpandedIssueId(isExpanded ? null : iss.id)}
                  className="p-4 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/50"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="pt-0.5">
                      <SeverityBadge severity={iss.severity} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {iss.category}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {iss.checkId}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 truncate">{iss.title}</h3>
                      <p className="text-xs text-slate-500 truncate mt-0.5 font-mono">{iss.affectedUrl}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
                    <span className="text-xs text-slate-400">
                      {isExpanded ? 'Hide Details' : 'View Details'}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Detail Panel */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-slate-100 bg-slate-50/40 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Evidence */}
                      <div className="bg-white p-3.5 rounded-lg border border-slate-200">
                        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5 text-blue-600" /> Real Crawl Evidence
                        </div>
                        <div className="text-xs text-slate-800 font-mono bg-slate-50 p-2.5 rounded border border-slate-200 break-all whitespace-pre-wrap">
                          {iss.evidence}
                        </div>
                      </div>

                      {/* Explanation */}
                      <div className="bg-white p-3.5 rounded-lg border border-slate-200">
                        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Why This Matters
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed">{iss.explanation}</p>
                      </div>
                    </div>

                    {/* Recommended Fix */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Recommended Remediation
                        </span>
                        {iss.suggestedValue && (
                          <button
                            onClick={() => handleCopyCode(iss.id, iss.suggestedValue!)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" />
                            {copiedId === iss.id ? 'Copied to Clipboard!' : 'Copy Snippet'}
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">{iss.recommendedFix}</p>

                      {iss.suggestedValue && (
                        <div className="mt-2">
                          <div className="text-[11px] font-semibold text-slate-500 mb-1">
                            Ready-to-Deploy Code Snippet:
                          </div>
                          <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg text-xs font-mono overflow-x-auto">
                            <code>{iss.suggestedValue}</code>
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 4. TECHNICAL SEO VIEW
// -------------------------------------------------------------
export function TechnicalSeoView({ report }: { report: AuditReport }) {
  const techIssues = report.issues.filter((i) => i.category === 'Technical SEO' || i.category === 'Security');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Technical SEO Audit</h1>
        <p className="text-sm text-slate-600">
          Verify server headers, status codes, robots.txt directives, XML sitemaps, canonical links,
          and SSL/HTTPS security.
        </p>
      </div>

      {/* Summary Scorecard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ScoreCard
          title="Technical SEO Score"
          score={report.categoryScores.technical.score}
          category="Technical"
        />

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Robots.txt</div>
          <div className="text-xl font-extrabold text-slate-900 mt-2 flex items-center gap-2">
            {report.robotsTxt.exists ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Accessible
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5 text-amber-500" /> Missing / 404
              </>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {report.robotsTxt.disallowRules.length} disallowed paths declared
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">XML Sitemap</div>
          <div className="text-xl font-extrabold text-slate-900 mt-2 flex items-center gap-2">
            {report.sitemap.exists ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Indexed
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-rose-500" /> Not Detected
              </>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {report.sitemap.urlCount} URLs indexed in sitemap
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">HTTPS Encryption</div>
          <div className="text-xl font-extrabold text-slate-900 mt-2 flex items-center gap-2">
            {report.url.startsWith('https://') ? (
              <>
                <Lock className="w-5 h-5 text-emerald-600" /> Secure (HTTPS)
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-rose-500" /> Insecure (HTTP)
              </>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">Transport Layer Security</p>
        </div>
      </div>

      {/* Robots.txt Raw Inspection */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">Robots.txt Directive Telemetry</h3>
          </div>
          <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded">
            {report.normalizedOrigin}/robots.txt
          </span>
        </div>

        {report.robotsTxt.rawContent ? (
          <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-48">
            <code>{report.robotsTxt.rawContent}</code>
          </pre>
        ) : (
          <div className="p-4 bg-amber-50 text-amber-800 text-xs rounded-xl border border-amber-200">
            No robots.txt was found at the root origin. Search engines assume all paths are permitted for crawling.
          </div>
        )}
      </div>

      {/* Pages Crawl Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900">Crawled Pages &amp; HTTP Status Codes</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Page URL</th>
                <th className="py-3 px-4">Response Time</th>
                <th className="py-3 px-4">Canonical Tag</th>
                <th className="py-3 px-4">Meta Robots</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.pages.map((p, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono font-bold">
                    <span
                      className={`px-2 py-0.5 rounded ${
                        p.statusCode >= 200 && p.statusCode < 300
                          ? 'bg-emerald-100 text-emerald-800'
                          : p.statusCode >= 300 && p.statusCode < 400
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {p.statusCode}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-900 break-all max-w-xs">{p.url}</td>
                  <td className="py-3 px-4 text-slate-600 font-mono">{p.responseTimeMs} ms</td>
                  <td className="py-3 px-4 font-mono text-slate-600 break-all max-w-xs">
                    {p.canonicalUrl || <span className="text-rose-500 italic">Missing</span>}
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-mono">
                    {p.metaRobots || <span className="text-slate-400">index, follow</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Technical Issues List */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-slate-900">Technical Issues &amp; Fixes</h3>
        {techIssues.map((iss) => (
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
// 5. ON-PAGE SEO VIEW
// -------------------------------------------------------------
export function OnPageSeoView({ report }: { report: AuditReport }) {
  const onPageIssues = report.issues.filter((i) => i.category === 'On-Page SEO');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">On-Page SEO Audit</h1>
        <p className="text-sm text-slate-600">
          Analyze Title tags, Meta descriptions, Heading hierarchies (H1–H6), Open Graph cards, and
          viewport configurations across crawled pages.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ScoreCard
          title="On-Page SEO Score"
          score={report.categoryScores.onPage.score}
          category="On-Page"
        />
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pages with Single H1</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">
            {report.pages.filter((p) => p.h1s.length === 1).length} / {report.pages.length}
          </div>
          <p className="text-xs text-slate-500 mt-1">Pages adhering to strict H1 hierarchy</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Social Open Graph Tags</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">
            {report.pages.filter((p) => Object.keys(p.openGraph).length >= 3).length} / {report.pages.length}
          </div>
          <p className="text-xs text-slate-500 mt-1">Pages with rich OG cards</p>
        </div>
      </div>

      {/* Pages Metadata Inspection Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900">Page-by-Page Metadata Breakdown</h3>
        <div className="space-y-4">
          {report.pages.map((p, idx) => (
            <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <span className="font-mono text-xs font-bold text-slate-900 break-all">{p.url}</span>
                <span className="text-xs text-slate-500 font-mono">Status: {p.statusCode}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="font-bold text-slate-700 flex items-center justify-between mb-1">
                    <span>Title Tag ({p.title.length} chars)</span>
                    <span
                      className={
                        p.title.length >= 30 && p.title.length <= 60
                          ? 'text-emerald-600 font-bold'
                          : 'text-amber-600 font-bold'
                      }
                    >
                      {p.title.length >= 30 && p.title.length <= 60 ? 'Optimal' : 'Needs Tuning'}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded border border-slate-200 text-slate-900 font-medium">
                    {p.title || <span className="text-rose-500 italic">Missing &lt;title&gt; tag</span>}
                  </div>
                </div>

                <div>
                  <div className="font-bold text-slate-700 flex items-center justify-between mb-1">
                    <span>Meta Description ({p.metaDescription.length} chars)</span>
                    <span
                      className={
                        p.metaDescription.length >= 110 && p.metaDescription.length <= 160
                          ? 'text-emerald-600 font-bold'
                          : 'text-amber-600 font-bold'
                      }
                    >
                      {p.metaDescription.length >= 110 && p.metaDescription.length <= 160
                        ? 'Optimal'
                        : 'Needs Tuning'}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded border border-slate-200 text-slate-800">
                    {p.metaDescription || (
                      <span className="text-rose-500 italic">Missing meta description</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Headings */}
              <div className="text-xs pt-1">
                <span className="font-bold text-slate-700">H1 Headings ({p.h1s.length}): </span>
                {p.h1s.length > 0 ? (
                  <span className="text-slate-800 font-semibold">{p.h1s.join(' | ')}</span>
                ) : (
                  <span className="text-rose-500 italic">No H1 heading detected</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* On-Page Issues List */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-slate-900">On-Page Issues &amp; Fixes</h3>
        {onPageIssues.map((iss) => (
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
// 6. CONTENT ANALYSIS VIEW
// -------------------------------------------------------------
export function ContentAnalysisView({ report }: { report: AuditReport }) {
  const contentIssues = report.issues.filter((i) => i.category === 'Content Quality');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Content Quality &amp; Depth</h1>
        <p className="text-sm text-slate-600">
          Audit body word count, readability scores, duplicate content similarity pairs, and topical depth.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ScoreCard
          title="Content Score"
          score={report.categoryScores.content.score}
          category="Content"
        />

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Average Word Count</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">
            {report.pages.length > 0
              ? Math.round(
                  report.pages.reduce((acc, p) => acc + p.wordCount, 0) / report.pages.length
                )
              : 0}
            <span className="text-xs font-normal text-slate-400 ml-1">words/page</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Thin content threshold: &lt; 300 words</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Duplicate Content Pairs</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">
            {report.contentSimilarityPairs.length}
          </div>
          <p className="text-xs text-slate-500 mt-1">High Jaccard body text similarity (&gt; 70%)</p>
        </div>
      </div>

      {/* Duplicate Content Pairs Card */}
      {report.contentSimilarityPairs.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-slate-900">
              Near-Duplicate Content Detected ({report.contentSimilarityPairs.length})
            </h3>
          </div>
          <div className="space-y-3">
            {report.contentSimilarityPairs.map((pair, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 text-xs space-y-2">
                <div className="flex items-center justify-between font-bold text-amber-900">
                  <span>Jaccard Similarity: {pair.similarityPercent}%</span>
                  <span className="font-mono text-[11px]">Shared key terms: {pair.sharedTopicTerms.join(', ')}</span>
                </div>
                <div className="font-mono text-slate-700 space-y-1">
                  <div>Page A: {pair.urlA}</div>
                  <div>Page B: {pair.urlB}</div>
                </div>
                <p className="text-amber-800">
                  <strong>Recommendation: </strong> Consolidate overlapping pages via 301 redirect or set a
                  self-referential rel=&quot;canonical&quot; tag to indicate the preferred version.
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pages Content Depth Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900">Content Depth &amp; Readability per Page</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Page URL</th>
                <th className="py-3 px-4">Word Count</th>
                <th className="py-3 px-4">Readability</th>
                <th className="py-3 px-4">Frequent Topics</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.pages.map((p, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono font-medium text-slate-900 break-all max-w-sm">
                    {p.url}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold">
                    <span
                      className={`px-2 py-0.5 rounded ${
                        p.wordCount >= 600
                          ? 'bg-emerald-100 text-emerald-800'
                          : p.wordCount >= 300
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {p.wordCount} words
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-700">
                    Score: <strong>{p.readabilityScore}</strong>/100
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {p.topTerms.slice(0, 4).map((t) => t.term).join(', ') || 'None detected'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Content Issues List */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-slate-900">Content Issues &amp; Fixes</h3>
        {contentIssues.map((iss) => (
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
