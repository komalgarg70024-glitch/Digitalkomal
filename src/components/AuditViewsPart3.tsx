import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CheckSquare,
  Clock,
  Code2,
  Copy,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  History,
  Info,
  MapPin,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  Settings,
  Sparkles,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react';
import type {
  AuditReport,
  CompetitorComparisonResult,
  SeoTask,
} from '../types/seo';
import { exportAuditPdf, exportIssuesCsv, exportPagesCsv, exportLinksCsv } from '../utils/exporters';
import { SeverityBadge, ScoreCard } from './AuditViewsPart1';

// -------------------------------------------------------------
// 12. COMPETITOR COMPARISON VIEW
// -------------------------------------------------------------
export function CompetitorComparisonView({
  report,
  competitorData,
  onRunComparison,
  isLoading,
}: {
  report: AuditReport;
  competitorData: CompetitorComparisonResult | null;
  onRunComparison: (urls: string[]) => void;
  isLoading: boolean;
}) {
  const [compUrls, setCompUrls] = useState(['https://example.org', 'https://example.net']);

  const handleUpdateUrl = (idx: number, val: string) => {
    const next = [...compUrls];
    next[idx] = val;
    setCompUrls(next);
  };

  const handleAddUrl = () => {
    if (compUrls.length < 3) {
      setCompUrls([...compUrls, '']);
    }
  };

  const handleRemoveUrl = (idx: number) => {
    setCompUrls(compUrls.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const valid = compUrls.map((u) => u.trim()).filter(Boolean);
    if (valid.length > 0) {
      onRunComparison(valid);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Competitor Comparison</h1>
        <p className="text-sm text-slate-600">
          Benchmark your website against up to 3 competitors on response speed, content depth, structured markup, and section architecture.
        </p>
      </div>

      {/* Competitor URLs Form */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <label className="block text-sm font-bold text-slate-900">Enter Competitor URLs (Max 3)</label>
        <div className="space-y-3">
          {compUrls.map((u, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                type="text"
                placeholder="https://competitor.com"
                value={u}
                onChange={(e) => handleUpdateUrl(idx, e.target.value)}
                className="flex-1 px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {compUrls.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveUrl(idx)}
                  className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {compUrls.length < 3 && (
            <button
              type="button"
              onClick={handleAddUrl}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Competitor URL
            </button>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 ml-auto"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Crawling Competitors...
              </>
            ) : (
              <>
                <Users className="w-3.5 h-3.5" /> Run Comparison
              </>
            )}
          </button>
        </div>
      </form>

      {/* Comparison Results Table */}
      {competitorData && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">Head-to-Head Technical Benchmark</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Metric</th>
                    <th className="py-3 px-4 text-blue-600">Your Site ({competitorData.primarySite.url})</th>
                    {competitorData.competitors.map((c, i) => (
                      <th key={i} className="py-3 px-4">{c.url}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-700">HTTP Status</td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-600">
                      {competitorData.primarySite.statusCode}
                    </td>
                    {competitorData.competitors.map((c, i) => (
                      <td key={i} className="py-3 px-4 font-mono">{c.statusCode}</td>
                    ))}
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-700">Response Time</td>
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">
                      {competitorData.primarySite.responseTimeMs} ms
                    </td>
                    {competitorData.competitors.map((c, i) => (
                      <td key={i} className="py-3 px-4 font-mono">{c.responseTimeMs} ms</td>
                    ))}
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-700">Word Count</td>
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">
                      {competitorData.primarySite.wordCount} words
                    </td>
                    {competitorData.competitors.map((c, i) => (
                      <td key={i} className="py-3 px-4 font-mono">{c.wordCount} words</td>
                    ))}
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-700">H1 Headings</td>
                    <td className="py-3 px-4 font-mono font-bold">
                      {competitorData.primarySite.h1Count}
                    </td>
                    {competitorData.competitors.map((c, i) => (
                      <td key={i} className="py-3 px-4 font-mono">{c.h1Count}</td>
                    ))}
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-700">Schema Types</td>
                    <td className="py-3 px-4 font-mono">
                      {competitorData.primarySite.schemaTypes.join(', ') || 'None'}
                    </td>
                    {competitorData.competitors.map((c, i) => (
                      <td key={i} className="py-3 px-4 font-mono">{c.schemaTypes.join(', ') || 'None'}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-400 italic mt-2">{competitorData.disclaimer}</p>
          </div>

          {/* Content Gap Analysis */}
          {competitorData.contentGapAnalysis.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900">Content Gaps &amp; Strategic Opportunities</h3>
              <div className="space-y-3">
                {competitorData.contentGapAnalysis.map((gap, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{gap.topicOrFeature}</span>
                      <span className="font-bold px-2 py-0.5 rounded text-amber-800 bg-amber-100">
                        {gap.priority} Priority
                      </span>
                    </div>
                    <div className="text-slate-600">
                      <strong>Competitor Data: </strong> {gap.observedInCompetitors}
                    </div>
                    <div className="text-blue-700 bg-blue-50/60 p-2 rounded border border-blue-100">
                      <strong>Recommended Action: </strong> {gap.recommendationForUser}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// 13. LOCAL SEO VIEW
// -------------------------------------------------------------
export function LocalSeoView({ report }: { report: AuditReport }) {
  const home = report.pages[0];
  const napStatus = home?.localSignals?.napConsistencyStatus || 'not_provided';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Local SEO &amp; NAP Consistency</h1>
        <p className="text-sm text-slate-600">
          Verify Name, Address, and Phone Number (NAP) consistency across body text, LocalBusiness schema markup, and customer reviews.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">NAP Consistency</div>
          <div className="text-xl font-extrabold text-slate-900 mt-2 flex items-center gap-2">
            {napStatus === 'matched' ? (
              <span className="text-emerald-600 flex items-center gap-1.5">
                <CheckCircle2 className="w-5 h-5" /> Consistent
              </span>
            ) : napStatus === 'partial' ? (
              <span className="text-amber-600 flex items-center gap-1.5">
                <AlertTriangle className="w-5 h-5" /> Partial Match
              </span>
            ) : (
              <span className="text-slate-500">Not Configured</span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">Evaluated against business profile</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">LocalBusiness Schema</div>
          <div className="text-xl font-extrabold text-slate-900 mt-2 flex items-center gap-2">
            {home?.localSignals?.hasLocalBusinessSchema ? (
              <span className="text-emerald-600 flex items-center gap-1.5">
                <CheckCircle2 className="w-5 h-5" /> Implemented
              </span>
            ) : (
              <span className="text-amber-600 flex items-center gap-1.5">
                <AlertTriangle className="w-5 h-5" /> Missing
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">Google Maps entity linking</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Review &amp; Rating Signals</div>
          <div className="text-xl font-extrabold text-slate-900 mt-2 flex items-center gap-2">
            {home?.localSignals?.hasReviewMentions ? (
              <span className="text-emerald-600 flex items-center gap-1.5">
                <CheckCircle2 className="w-5 h-5" /> Detected
              </span>
            ) : (
              <span className="text-slate-500">None Detected</span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">Social proof &amp; testimonial presence</p>
        </div>
      </div>

      {/* Crawled Local Telemetry */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900">Extracted Local Signals from Homepage</h3>
        <div className="space-y-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <strong>Detected Phone Numbers: </strong>
            {home?.localSignals?.phonesDetected.length ? (
              home.localSignals.phonesDetected.join(', ')
            ) : (
              <span className="text-slate-400 italic">None found in body text</span>
            )}
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <strong>Detected Physical Addresses: </strong>
            {home?.localSignals?.addressesDetected.length ? (
              home.localSignals.addressesDetected.join(' | ')
            ) : (
              <span className="text-slate-400 italic">None found in body text</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 14. AI RECOMMENDATIONS & TASK MANAGEMENT VIEW
// -------------------------------------------------------------
export function AiRecommendationsView({
  report,
  tasks,
  onToggleTask,
  onAddTask,
  onAskChat,
  chatMessages,
  isLoadingChat,
}: {
  report: AuditReport;
  tasks: SeoTask[];
  onToggleTask: (taskId: string) => void;
  onAddTask: (title: string, priority: 'High' | 'Medium' | 'Low') => void;
  onAskChat: (question: string) => void;
  chatMessages: Array<{ role: 'user' | 'assistant'; text: string; source?: string }>;
  isLoadingChat: boolean;
}) {
  const [activeTab, setActiveTab] = useState<'recs' | 'tasks' | 'chat'>('recs');
  const [chatInput, setChatInput] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      onAskChat(chatInput.trim());
      setChatInput('');
    }
  };

  const handleAddTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskTitle.trim()) {
      onAddTask(newTaskTitle.trim(), 'High');
      setNewTaskTitle('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            AI Strategy &amp; Task Execution
          </h1>
          <p className="text-sm text-slate-600">
            Gemini AI prioritized action roadmap, sprint task manager, and real-time audit Q&amp;A assistant.
          </p>
        </div>

        {/* Tab Pills */}
        <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
          <button
            onClick={() => setActiveTab('recs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'recs'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            AI Roadmap
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'tasks'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tasks ({tasks.length})
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'chat'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            AI Assistant
          </button>
        </div>
      </div>

      {/* Tab 1: AI Recommendations & Phased Roadmap */}
      {activeTab === 'recs' && (
        <div className="space-y-6">
          {/* Executive Summary */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">Executive Strategic Brief</h3>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              {report.aiAnalysis?.executiveSummary}
            </p>
            <div className="text-xs text-slate-400 font-mono">
              Generated by: {report.aiAnalysis?.generatedBy}
            </div>
          </div>

          {/* Phased Action Plan */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900">Phased SEO Action Plan</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(report.aiAnalysis?.actionPlan || []).map((phase, idx) => (
                <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                      {phase.timeframe}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{phase.focus}</h4>
                  <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
                    {phase.milestones.map((m, i) => (
                      <li key={i}>
                        <strong className="text-slate-800">{m.title}</strong>: {m.action}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Prioritized Recommendation Cards */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900">Prioritized Recommendations</h3>
            <div className="space-y-3">
              {(report.aiAnalysis?.recommendations || []).map((rec) => (
                <div key={rec.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          rec.priority === 'Critical'
                            ? 'bg-rose-100 text-rose-800'
                            : rec.priority === 'High'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {rec.priority} Priority
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">{rec.issue}</h4>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">Effort: {rec.estimatedEffort}</span>
                  </div>

                  <p className="text-xs text-slate-600">
                    <strong>Why It Matters: </strong> {rec.whyItMatters}
                  </p>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800">
                    <strong>Recommended Fix: </strong> {rec.recommendedFix}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: SEO Tasks Manager */}
      {activeTab === 'tasks' && (
        <div className="space-y-6">
          {/* Add Task Bar */}
          <form onSubmit={handleAddTaskSubmit} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex gap-3">
            <input
              type="text"
              placeholder="Add a new custom SEO task..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="flex-1 px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!newTaskTitle.trim()}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Task
            </button>
          </form>

          {/* Tasks List */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
            <h3 className="text-base font-bold text-slate-900">Sprint Backlog ({tasks.length})</h3>
            <div className="divide-y divide-slate-100">
              {tasks.map((task) => (
                <div key={task.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={task.status === 'Completed'}
                      onChange={() => onToggleTask(task.id)}
                      className="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <div>
                      <div
                        className={`text-sm font-semibold ${
                          task.status === 'Completed' ? 'line-through text-slate-400' : 'text-slate-900'
                        }`}
                      >
                        {task.title}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {task.priority} Priority
                        </span>
                        <span className="text-[11px] text-slate-400">{task.category}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Interactive Q&A Assistant */}
      {activeTab === 'chat' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[550px]">
          {/* Chat Messages */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            {chatMessages.length === 0 ? (
              <div className="text-center py-16 text-slate-400 space-y-2">
                <MessageSquare className="w-10 h-10 mx-auto text-slate-300" />
                <h4 className="text-sm font-bold text-slate-700">Ask the SEO Audit Pro Assistant</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Ask follow-up questions grounded in your website&apos;s real audit findings. e.g. &quot;How do I fix the canonical issue on the homepage?&quot;
                </p>
              </div>
            ) : (
              chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xl rounded-2xl p-4 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    {msg.source && (
                      <div className="text-[10px] text-slate-400 mt-2 font-mono border-t border-slate-200 pt-1">
                        Answered via: {msg.source}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Chat Input */}
          <form onSubmit={handleChatSubmit} className="p-4 border-t border-slate-200 bg-slate-50 flex gap-2">
            <input
              type="text"
              placeholder="Ask a question about this audit..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={isLoadingChat || !chatInput.trim()}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              {isLoadingChat ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// 15. AUDIT HISTORY & COMPARISON VIEW
// -------------------------------------------------------------
export function AuditHistoryView({
  audits,
  currentAuditId,
  onSelectAudit,
  onDeleteAudit,
}: {
  audits: AuditReport[];
  currentAuditId: string;
  onSelectAudit: (id: string) => void;
  onDeleteAudit: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Audit History &amp; Log</h1>
        <p className="text-sm text-slate-600">
          Review previous crawl runs, switch active inspection contexts, and compare health scores over time.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Website URL</th>
                <th className="py-3 px-4">Date &amp; Time</th>
                <th className="py-3 px-4">Health Score</th>
                <th className="py-3 px-4">Pages Crawled</th>
                <th className="py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {audits.map((a) => {
                const isSelected = a.id === currentAuditId;
                return (
                  <tr key={a.id} className={isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50'}>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 break-all max-w-sm">
                      {a.url}
                      {a.isDemoData && (
                        <span className="ml-2 text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-sans">
                          Demo
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono">
                      {new Date(a.completedAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-sm">
                      <span
                        className={
                          a.overallScore >= 80
                            ? 'text-emerald-600'
                            : a.overallScore >= 60
                            ? 'text-amber-600'
                            : 'text-rose-600'
                        }
                      >
                        {a.overallScore}/100
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-mono">
                      {a.counts.urlsCrawled} pages
                    </td>
                    <td className="py-3 px-4 space-x-2">
                      <button
                        onClick={() => onSelectAudit(a.id)}
                        className={`px-3 py-1 rounded-md text-xs font-semibold ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {isSelected ? 'Active' : 'Switch'}
                      </button>
                      <button
                        onClick={() => onDeleteAudit(a.id)}
                        className="px-2 py-1 text-rose-600 hover:bg-rose-50 rounded text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5 inline" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 16. REPORTS VIEW
// -------------------------------------------------------------
export function ReportsView({ report }: { report: AuditReport }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Export Audit Reports</h1>
        <p className="text-sm text-slate-600">
          Download client-ready PDF presentations and CSV data files for Semrush, Ahrefs, and spreadsheet analysis.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PDF Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Executive PDF Presentation</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Includes brand logo, health scorecard, category score breakdowns, top critical issues,
            and the Gemini AI strategic roadmap.
          </p>
          <button
            onClick={() => exportAuditPdf(report)}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" /> Download PDF Report
          </button>
        </div>

        {/* CSV Exports */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Raw Data CSV Exports</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Export granular tabular datasets containing all crawled URLs, issue lines, and internal/external links.
          </p>
          <div className="space-y-2">
            <button
              onClick={() => exportIssuesCsv(report)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
            >
              <Download className="w-3.5 h-3.5" /> Export All Issues ({report.issues.length} rows)
            </button>
            <button
              onClick={() => exportPagesCsv(report)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
            >
              <Download className="w-3.5 h-3.5" /> Export Crawled Pages ({report.pages.length} rows)
            </button>
            <button
              onClick={() => exportLinksCsv(report)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
            >
              <Download className="w-3.5 h-3.5" /> Export Discovered Links
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 17. SETTINGS AND INTEGRATIONS VIEW
// -------------------------------------------------------------
export function SettingsIntegrationsView() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Settings &amp; Integrations</h1>
        <p className="text-sm text-slate-600">
          Manage API connections, crawler policies, SSRF security defenses, and scoring models.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900">Active Integrations</h3>
        <div className="divide-y divide-slate-100 text-xs">
          <div className="py-3 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-900">Google Gemini AI Engine</div>
              <div className="text-slate-500">Model: gemini-3.8-flash for recommendations &amp; search intent analysis</div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-emerald-800 bg-emerald-100 font-bold">
              Connected
            </span>
          </div>

          <div className="py-3 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-900">Google PageSpeed Insights v5</div>
              <div className="text-slate-500">Core Web Vitals &amp; Lighthouse performance telemetry</div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-emerald-800 bg-emerald-100 font-bold">
              Connected
            </span>
          </div>

          <div className="py-3 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-900">Server-Side Website Crawler</div>
              <div className="text-slate-500">SSRF-protected stream fetcher &amp; Cheerio HTML parser</div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-emerald-800 bg-emerald-100 font-bold">
              Active &amp; Secure
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
        <h3 className="text-base font-bold text-slate-900">SSRF Security Policy</h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          The crawler strictly denies access to RFC 1918 private IPv4 addresses (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16),
          link-local addresses (169.254.0.0/16), loopbacks (127.0.0.1, ::1), and cloud metadata endpoints
          (169.254.169.254, metadata.google.internal). Only public HTTP and HTTPS destinations are permitted.
        </p>
      </div>
    </div>
  );
}
