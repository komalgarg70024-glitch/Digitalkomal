import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  Clock,
  Compass,
  FileCode,
  FileSpreadsheet,
  FileText,
  Gauge,
  Globe,
  History,
  Image as ImageIcon,
  Layers,
  LayoutDashboard,
  Link2,
  Lock,
  MapPin,
  Menu,
  MessageSquare,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Smartphone,
  Sparkles,
  Users,
  X,
  Zap,
} from 'lucide-react';
import {
  AuditResultsView,
  ContentAnalysisView,
  NewAuditView,
  OnPageSeoView,
  OverviewDashboard,
  TechnicalSeoView,
} from './components/AuditViewsPart1';
import {
  ImagesMediaView,
  KeywordAnalysisView,
  LinksAuditView,
  PerformanceView,
  SchemaMarkupView,
} from './components/AuditViewsPart2';
import {
  AiRecommendationsView,
  AuditHistoryView,
  CompetitorComparisonView,
  LocalSeoView,
  ReportsView,
  SettingsIntegrationsView,
} from './components/AuditViewsPart3';
import type {
  AuditConfig,
  AuditReport,
  CompetitorComparisonResult,
  KeywordResearchResult,
  SeoTask,
} from './types/seo';

export default function App() {
  const [currentView, setCurrentView] = useState<string>('overview');
  const [audits, setAudits] = useState<AuditReport[]>([]);
  const [currentAudit, setCurrentAudit] = useState<AuditReport | null>(null);
  const [tasks, setTasks] = useState<SeoTask[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStage, setLoadingStage] = useState<string>('');
  const [quickUrl, setQuickUrl] = useState<string>('');
  const [competitorData, setCompetitorData] = useState<CompetitorComparisonResult | null>(null);
  const [aiKeywords, setAiKeywords] = useState<KeywordResearchResult | null>(null);
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: 'user' | 'assistant'; text: string; source?: string }>
  >([]);
  const [isLoadingChat, setIsLoadingChat] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch initial audits and tasks
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [auditsRes, tasksRes] = await Promise.all([
          fetch('/api/audits'),
          fetch('/api/tasks'),
        ]);

        if (auditsRes.ok) {
          const loadedAudits = await auditsRes.json();
          if (Array.isArray(loadedAudits) && loadedAudits.length > 0) {
            setAudits(loadedAudits);
            setCurrentAudit(loadedAudits[0]);
          }
        }

        if (tasksRes.ok) {
          const loadedTasks = await tasksRes.json();
          if (Array.isArray(loadedTasks)) {
            setTasks(loadedTasks);
          }
        }
      } catch (err) {
        console.error('Failed to load initial audits/tasks:', err);
      }
    }
    loadInitialData();
  }, []);

  // Run full audit handler
  const handleRunAudit = async (config: AuditConfig) => {
    setIsLoading(true);
    setErrorMessage(null);
    setLoadingStage('Validating target domain & SSRF policy...');

    try {
      const stepTimer1 = setTimeout(() => {
        setLoadingStage('Crawling pages, headers & discovering internal links...');
      }, 1200);

      const stepTimer2 = setTimeout(() => {
        setLoadingStage('Querying Google PageSpeed Insights & Core Web Vitals...');
      }, 2500);

      const stepTimer3 = setTimeout(() => {
        setLoadingStage('Synthesizing SEO findings & Gemini AI recommendations...');
      }, 4000);

      const res = await fetch('/api/audit/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Server returned HTTP ${res.status}`);
      }

      const report: AuditReport = await res.json();
      setAudits((prev) => [report, ...prev.filter((a) => a.id !== report.id)]);
      setCurrentAudit(report);
      setCurrentView('overview');
    } catch (err: any) {
      console.error('Audit run failed:', err);
      setErrorMessage(err.message || 'An error occurred during audit.');
    } finally {
      setIsLoading(false);
      setLoadingStage('');
    }
  };

  // Quick audit launcher
  const handleQuickAudit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickUrl.trim()) return;

    handleRunAudit({
      url: quickUrl.trim(),
      mode: 'homepage',
      maxPages: 1,
      maxDepth: 0,
      respectRobotsTxt: true,
      includeSubdomains: false,
      crawlDelayMs: 50,
      runPageSpeed: true,
      runAiAnalysis: true,
      weights: {
        technical: 25,
        onPage: 20,
        content: 20,
        performance: 15,
        links: 10,
        schema: 10,
      },
    });
    setQuickUrl('');
  };

  // Run competitor comparison
  const handleRunCompetitorComparison = async (competitorUrls: string[]) => {
    if (!currentAudit) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/competitor/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryUrl: currentAudit.url,
          competitorUrls,
          runPageSpeed: false,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to compare competitors');
      }

      const data = await res.json();
      setCompetitorData(data);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate keyword strategy
  const handleGenerateKeywords = async (keyword: string) => {
    if (!currentAudit) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/ai/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request: {
            primaryKeyword: keyword,
            secondaryKeywords: currentAudit.config.secondaryKeywords || [],
            country: currentAudit.config.targetCountry || 'United States',
            language: currentAudit.config.targetLanguage || 'en',
            searchIntent: 'Commercial',
            targetPageUrl: currentAudit.url,
          },
          auditReport: currentAudit,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to generate keyword research');
      }

      const data = await res.json();
      setAiKeywords(data);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // AI Chat Assistant
  const handleAskChat = async (question: string) => {
    if (!currentAudit) return;
    const userMsg = { role: 'user' as const, text: question };
    setChatMessages((prev) => [...prev, userMsg]);
    setIsLoadingChat(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          auditReport: currentAudit,
        }),
      });

      if (!res.ok) throw new Error('AI Assistant request failed');
      const data = await res.json();

      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', text: data.answer, source: data.source },
      ]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'Unable to reach Gemini AI engine. Please ensure GEMINI_API_KEY is configured in your project settings.',
          source: 'System Error',
        },
      ]);
    } finally {
      setIsLoadingChat(false);
    }
  };

  // Task Handlers
  const handleToggleTask = (taskId: string) => {
    const updated = tasks.map((t) =>
      t.id === taskId
        ? {
            ...t,
            status: (t.status === 'Completed' ? ('To Do' as const) : ('Completed' as const)),
          }
        : t
    );
    setTasks(updated);
    fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(console.error);
  };

  const handleAddTask = (title: string, priority: 'High' | 'Medium' | 'Low') => {
    const newTask: SeoTask = {
      id: `task-${Date.now()}`,
      auditId: currentAudit?.id || 'manual',
      title,
      relatedIssue: 'Manual SEO Task',
      affectedUrl: currentAudit?.url || '',
      category: 'Technical SEO',
      priority,
      expectedBenefit: 'Optimization of search ranking factor',
      estimatedEffort: '1-2 hours',
      status: 'To Do',
      notes: '',
      verificationInstructions: 'Verify via fresh website crawl',
      createdAt: new Date().toISOString(),
    };
    const updated = [newTask, ...tasks];
    setTasks(updated);
    fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(console.error);
  };

  const handleDeleteAudit = async (auditId: string) => {
    try {
      await fetch(`/api/audits/${auditId}`, { method: 'DELETE' });
      const nextAudits = audits.filter((a) => a.id !== auditId);
      setAudits(nextAudits);
      if (currentAudit?.id === auditId) {
        setCurrentAudit(nextAudits[0] || null);
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  // Navigation Links configuration
  const navSections = [
    {
      label: 'Core Audit',
      items: [
        { id: 'overview', label: 'Overview Dashboard', icon: LayoutDashboard },
        { id: 'new-audit', label: 'New SEO Audit', icon: Play },
        { id: 'results', label: 'Audit Results', icon: CheckSquare },
      ],
    },
    {
      label: 'On-Site Factors',
      items: [
        { id: 'technical', label: 'Technical SEO', icon: Shield },
        { id: 'on-page', label: 'On-Page SEO', icon: FileText },
        { id: 'content', label: 'Content Analysis', icon: BarChart3 },
        { id: 'performance', label: 'Performance Audit', icon: Gauge },
        { id: 'images', label: 'Images & Media', icon: ImageIcon },
        { id: 'links', label: 'Links Audit', icon: Link2 },
        { id: 'schema', label: 'Schema Markup', icon: Layers },
      ],
    },
    {
      label: 'Strategy & Market',
      items: [
        { id: 'keywords', label: 'Keyword Analysis', icon: Compass },
        { id: 'competitor', label: 'Competitor Comparison', icon: Users },
        { id: 'local', label: 'Local SEO', icon: MapPin },
        { id: 'ai-recommendations', label: 'AI Strategy & Tasks', icon: Sparkles },
      ],
    },
    {
      label: 'Management',
      items: [
        { id: 'history', label: 'Audit History', icon: History },
        { id: 'reports', label: 'Export Reports', icon: FileSpreadsheet },
        { id: 'settings', label: 'Settings & Integrations', icon: Settings },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Top Application Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="px-4 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Mobile Menu & Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div
              onClick={() => setCurrentView('overview')}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-lg shadow-sm">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight text-slate-900">
                  SEO Audit <span className="text-blue-600">Pro AI</span>
                </span>
                <span className="hidden sm:inline-block ml-2 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-wider">
                  Enterprise
                </span>
              </div>
            </div>
          </div>

          {/* Quick URL Input Bar in Top Header */}
          <form
            onSubmit={handleQuickAudit}
            className="hidden md:flex items-center flex-1 max-w-md mx-4"
          >
            <div className="relative w-full flex">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Globe className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={quickUrl}
                onChange={(e) => setQuickUrl(e.target.value)}
                placeholder="Audit any URL (e.g. https://example.com)..."
                className="w-full pl-9 pr-24 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={isLoading || !quickUrl.trim()}
                className="absolute right-1 top-1 bottom-1 px-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-[11px] font-bold rounded-lg transition"
              >
                Audit
              </button>
            </div>
          </form>

          {/* Current Target Switcher & Score Badge */}
          <div className="flex items-center gap-3">
            {currentAudit && (
              <div className="flex items-center gap-2">
                <select
                  value={currentAudit.id}
                  onChange={(e) => {
                    const sel = audits.find((a) => a.id === e.target.value);
                    if (sel) setCurrentAudit(sel);
                  }}
                  className="hidden sm:block text-xs font-mono font-medium bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 max-w-[200px] truncate"
                >
                  {audits.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.url} {a.isDemoData ? '(Demo)' : ''}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Score:</span>
                  <span
                    className={`text-sm font-extrabold ${
                      currentAudit.overallScore >= 80
                        ? 'text-emerald-600'
                        : currentAudit.overallScore >= 60
                        ? 'text-amber-600'
                        : 'text-rose-600'
                    }`}
                  >
                    {currentAudit.overallScore}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Loading Modal / Toast */}
      {isLoading && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl text-center space-y-4 border border-slate-200">
            <RefreshCw className="w-10 h-10 text-blue-600 animate-spin mx-auto" />
            <h3 className="text-lg font-bold text-slate-900">Live SEO Audit in Progress</h3>
            <p className="text-xs text-slate-600 font-medium">{loadingStage || 'Processing audit data...'}</p>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div className="bg-blue-600 h-1.5 rounded-full animate-pulse w-3/4" />
            </div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-3 text-xs text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs font-bold text-rose-600 hover:text-rose-900"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar Navigation */}
        <aside
          className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 transform lg:static lg:translate-x-0 transition-transform duration-200 ease-in-out flex flex-col pt-16 lg:pt-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {navSections.map((sec, idx) => (
              <div key={idx} className="space-y-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-1">
                  {sec.label}
                </div>
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setCurrentView(item.id);
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition text-left ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 font-extrabold'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-blue-600' : 'text-slate-400'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Quick Footer Links */}
          <div className="p-4 border-t border-slate-200 bg-slate-50/50 text-[11px] text-slate-500 space-y-1">
            <div className="font-semibold text-slate-700">SEO Audit Pro AI v1.0</div>
            <div>Server Crawler &amp; Gemini 3.8</div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {!currentAudit && currentView !== 'new-audit' ? (
            <div className="text-center py-24 space-y-4">
              <Globe className="w-12 h-12 text-slate-300 mx-auto" />
              <h2 className="text-xl font-bold text-slate-800">No Active SEO Audit</h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Launch your first website audit to inspect technical SEO, on-page factors, Core Web Vitals, and AI recommendations.
              </p>
              <button
                onClick={() => setCurrentView('new-audit')}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold"
              >
                Start New Audit
              </button>
            </div>
          ) : (
            <>
              {currentView === 'overview' && currentAudit && (
                <OverviewDashboard
                  report={currentAudit}
                  onNavigate={(v) => setCurrentView(v)}
                  onStartNewAudit={() => setCurrentView('new-audit')}
                />
              )}

              {currentView === 'new-audit' && (
                <NewAuditView
                  onRunAudit={handleRunAudit}
                  isLoading={isLoading}
                  initialUrl={quickUrl}
                />
              )}

              {currentView === 'results' && currentAudit && (
                <AuditResultsView report={currentAudit} />
              )}

              {currentView === 'technical' && currentAudit && (
                <TechnicalSeoView report={currentAudit} />
              )}

              {currentView === 'on-page' && currentAudit && (
                <OnPageSeoView report={currentAudit} />
              )}

              {currentView === 'content' && currentAudit && (
                <ContentAnalysisView report={currentAudit} />
              )}

              {currentView === 'performance' && currentAudit && (
                <PerformanceView report={currentAudit} />
              )}

              {currentView === 'images' && currentAudit && (
                <ImagesMediaView report={currentAudit} />
              )}

              {currentView === 'links' && currentAudit && (
                <LinksAuditView report={currentAudit} />
              )}

              {currentView === 'schema' && currentAudit && (
                <SchemaMarkupView report={currentAudit} />
              )}

              {currentView === 'keywords' && currentAudit && (
                <KeywordAnalysisView
                  report={currentAudit}
                  onGenerateKeywords={handleGenerateKeywords}
                  aiKeywords={aiKeywords}
                  isLoading={isLoading}
                />
              )}

              {currentView === 'competitor' && currentAudit && (
                <CompetitorComparisonView
                  report={currentAudit}
                  competitorData={competitorData}
                  onRunComparison={handleRunCompetitorComparison}
                  isLoading={isLoading}
                />
              )}

              {currentView === 'local' && currentAudit && (
                <LocalSeoView report={currentAudit} />
              )}

              {currentView === 'ai-recommendations' && currentAudit && (
                <AiRecommendationsView
                  report={currentAudit}
                  tasks={tasks}
                  onToggleTask={handleToggleTask}
                  onAddTask={handleAddTask}
                  onAskChat={handleAskChat}
                  chatMessages={chatMessages}
                  isLoadingChat={isLoadingChat}
                />
              )}

              {currentView === 'history' && (
                <AuditHistoryView
                  audits={audits}
                  currentAuditId={currentAudit?.id || ''}
                  onSelectAudit={(id) => {
                    const found = audits.find((a) => a.id === id);
                    if (found) {
                      setCurrentAudit(found);
                      setCurrentView('overview');
                    }
                  }}
                  onDeleteAudit={handleDeleteAudit}
                />
              )}

              {currentView === 'reports' && currentAudit && (
                <ReportsView report={currentAudit} />
              )}

              {currentView === 'settings' && <SettingsIntegrationsView />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
