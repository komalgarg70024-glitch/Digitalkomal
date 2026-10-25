import dotenv from 'dotenv';
import express from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { runComprehensiveSeoAudit } from './server/auditor.ts';
import { runCompetitorComparison } from './server/competitor.ts';
import { runWebsiteCrawl } from './server/crawler.ts';
import {
  chatAboutAudit,
  generateAiAuditAnalysis,
  generateKeywordResearch,
  isGeminiConfigured,
} from './server/gemini.ts';
import { runPageSpeedAudit } from './server/pagespeed.ts';
import { validatePublicUrl } from './server/security.ts';
import {
  deleteAuditById,
  loadAudits,
  loadTasks,
  saveAudit,
  saveTasks,
} from './server/storage.ts';
import type { AuditConfig, AuditReport, SeoTask } from './src/types/seo.ts';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '15mb' }));

// Health Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
  });
});

// Integration & API credentials status
app.get('/api/status', (_req, res) => {
  const geminiActive = isGeminiConfigured();
  const pageSpeedKey = process.env.PAGESPEED_API_KEY?.trim();
  const pageSpeedActive = Boolean(pageSpeedKey && pageSpeedKey !== 'MY_PAGESPEED_API_KEY');

  res.json({
    gemini: {
      connected: geminiActive,
      model: 'gemini-3.8-flash',
      mode: geminiActive ? 'Live Google Gemini AI' : 'Deterministic Evidence Fallback',
    },
    pageSpeed: {
      connected: true, // Google PageSpeed API works with or without key (with quota limits without key)
      hasCustomKey: pageSpeedActive,
      endpoint: 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed',
    },
    crawler: {
      active: true,
      engine: 'Server-side Safe Stream Fetcher & Cheerio HTML AST parser',
      ssrfProtection: 'Active (RFC 1918, RFC 3927, Loopback, Cloud Metadata blocked)',
    },
    googleSearchConsole: {
      connected: false,
      note: 'Optional: Connect via OAuth or Service Account for verified CTR and Impression telemetry',
    },
    keywordProvider: {
      connected: false,
      note: 'Optional: Connect DataForSEO / Semrush API for verified monthly search volume and CPC',
    },
  });
});

// SSRF URL validation preflight
app.post('/api/validate-url', async (req, res) => {
  try {
    const { url } = req.body;
    const result = await validatePublicUrl(url);
    if (!result.valid) {
      return res.status(400).json({ valid: false, error: result.error });
    }
    return res.json({
      valid: true,
      url: result.parsedUrl?.toString(),
      origin: result.parsedUrl?.origin,
      hostname: result.parsedUrl?.hostname,
    });
  } catch (err: any) {
    return res.status(500).json({ valid: false, error: err.message || 'Validation error' });
  }
});

// Run Live Comprehensive SEO Audit
app.post('/api/audit/run', async (req, res) => {
  const startTime = Date.now();
  try {
    const rawConfig = req.body as AuditConfig;
    if (!rawConfig?.url) {
      return res.status(400).json({ error: 'Website URL is required to start audit.' });
    }

    const validation = await validatePublicUrl(rawConfig.url);
    if (!validation.valid || !validation.parsedUrl) {
      return res.status(400).json({ error: validation.error || 'Invalid or prohibited website URL.' });
    }

    const targetUrl = validation.parsedUrl.toString();
    const origin = validation.parsedUrl.origin;

    const config: AuditConfig = {
      url: targetUrl,
      mode: rawConfig.mode || 'homepage',
      maxPages: rawConfig.mode === 'homepage' ? 1 : Math.max(1, Math.min(30, rawConfig.maxPages || 8)),
      maxDepth: rawConfig.mode === 'homepage' ? 0 : Math.max(0, Math.min(4, rawConfig.maxDepth || 2)),
      respectRobotsTxt: rawConfig.respectRobotsTxt !== false,
      includeSubdomains: Boolean(rawConfig.includeSubdomains),
      crawlDelayMs: Math.max(0, Math.min(1000, rawConfig.crawlDelayMs || 50)),
      targetKeyword: rawConfig.targetKeyword?.trim() || undefined,
      secondaryKeywords: rawConfig.secondaryKeywords?.filter(Boolean) || [],
      targetCountry: rawConfig.targetCountry || 'United States',
      targetLanguage: rawConfig.targetLanguage || 'en',
      businessName: rawConfig.businessName?.trim() || undefined,
      businessAddress: rawConfig.businessAddress?.trim() || undefined,
      businessPhone: rawConfig.businessPhone?.trim() || undefined,
      runPageSpeed: Boolean(rawConfig.runPageSpeed),
      runAiAnalysis: rawConfig.runAiAnalysis !== false,
      weights: rawConfig.weights || {
        technical: 25,
        onPage: 20,
        content: 20,
        performance: 15,
        links: 10,
        schema: 10,
      },
    };

    // 1. Run Crawler & Data Extractor
    const crawlResult = await runWebsiteCrawl(config);

    // 2. Run Google PageSpeed Insights (Mobile & Desktop)
    const pageSpeedResult = await runPageSpeedAudit(targetUrl, config.runPageSpeed);

    // 3. Run Rule-Based SEO Auditor Engine
    const auditEngineResult = runComprehensiveSeoAudit({
      origin,
      config,
      pages: crawlResult.pages,
      robotsTxt: crawlResult.robotsTxt,
      sitemap: crawlResult.sitemap,
      pageSpeed: pageSpeedResult,
    });

    // 4. Run Gemini AI / Deterministic Strategy Synthesis
    const aiAnalysis = await generateAiAuditAnalysis({
      url: targetUrl,
      overallScore: auditEngineResult.overallScore,
      pages: crawlResult.pages,
      issues: auditEngineResult.issues,
      enabled: config.runAiAnalysis,
    });

    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - startTime;

    const auditReport: AuditReport = {
      id: `audit-${Date.now()}`,
      url: targetUrl,
      normalizedOrigin: origin,
      createdAt: new Date(startTime).toISOString(),
      completedAt,
      durationMs,
      isDemoData: false,
      config,
      overallScore: auditEngineResult.overallScore,
      categoryScores: auditEngineResult.categoryScores,
      counts: {
        totalChecks: auditEngineResult.counts.totalChecks,
        passed: auditEngineResult.counts.passed,
        warnings: auditEngineResult.counts.warnings,
        errors: auditEngineResult.counts.errors,
        critical: auditEngineResult.counts.critical,
        urlsCrawled: crawlResult.pages.length,
        urlsDiscovered: crawlResult.urlsDiscovered,
        crawlCoveragePercent: Math.round(
          (crawlResult.pages.length / Math.max(1, crawlResult.urlsDiscovered)) * 100
        ),
      },
      pages: crawlResult.pages,
      robotsTxt: crawlResult.robotsTxt,
      sitemap: crawlResult.sitemap,
      pageSpeed: pageSpeedResult,
      issues: auditEngineResult.issues,
      contentSimilarityPairs: auditEngineResult.contentSimilarityPairs,
      contextualLinkOpportunities: auditEngineResult.contextualLinkOpportunities,
      orphanCandidateUrls: auditEngineResult.orphanCandidateUrls,
      aiAnalysis,
      limitations: crawlResult.limitations,
      dataSources: [
        'Server-side Safe Fetcher & Cheerio HTML parser',
        'Google PageSpeed Insights API v5',
        'Deterministic & Gemini AI SEO Reasoning Engine',
      ],
    };

    saveAudit(auditReport);
    return res.json(auditReport);
  } catch (err: any) {
    console.error('Audit execution failure:', err);
    return res.status(500).json({
      error: err.message || 'An unexpected error occurred during website crawling and auditing.',
    });
  }
});

// Retrieve Audits
app.get('/api/audits', (_req, res) => {
  try {
    const audits = loadAudits();
    res.json(audits);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Retrieve Single Audit
app.get('/api/audits/:id', (req, res) => {
  try {
    const audits = loadAudits();
    const found = audits.find((a) => a.id === req.params.id);
    if (!found) {
      return res.status(404).json({ error: 'Audit report not found.' });
    }
    return res.json(found);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Delete Audit
app.delete('/api/audits/:id', (req, res) => {
  try {
    const ok = deleteAuditById(req.params.id);
    return res.json({ success: ok });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Task Management
app.get('/api/tasks', (_req, res) => {
  try {
    const tasks = loadTasks();
    res.json(tasks);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks', (req, res) => {
  try {
    const tasks = req.body as SeoTask[];
    if (Array.isArray(tasks)) {
      saveTasks(tasks);
      return res.json({ success: true, count: tasks.length });
    }
    return res.status(400).json({ error: 'Invalid tasks array.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Competitor Comparison
app.post('/api/competitor/compare', async (req, res) => {
  try {
    const { primaryUrl, competitorUrls, runPageSpeed } = req.body;
    if (!primaryUrl) {
      return res.status(400).json({ error: 'Primary URL is required.' });
    }
    const result = await runCompetitorComparison({
      primaryUrl,
      competitorUrls: Array.isArray(competitorUrls) ? competitorUrls : [],
      runPageSpeed: Boolean(runPageSpeed),
    });
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Competitor comparison failed.' });
  }
});

// Gemini AI Keyword Research
app.post('/api/ai/keywords', async (req, res) => {
  try {
    const { request, auditReport } = req.body;
    if (!request?.primaryKeyword) {
      return res.status(400).json({ error: 'Primary target keyword is required.' });
    }
    const result = await generateKeywordResearch({
      req: request,
      auditReport,
    });
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Keyword research generation failed.' });
  }
});

// Gemini AI Follow-up Q&A Assistant
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { question, auditReport } = req.body;
    if (!question || !auditReport) {
      return res.status(400).json({ error: 'Question and auditReport context are required.' });
    }
    const result = await chatAboutAudit({
      question,
      auditReport,
    });
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'AI Assistant response failed.' });
  }
});

// Configure Vite middleware or production static build
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SEO Audit Pro AI running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
