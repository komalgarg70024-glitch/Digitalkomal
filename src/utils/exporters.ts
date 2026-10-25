import { jsPDF } from 'jspdf';
import type { AuditReport } from '../types/seo';

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}

function downloadCsvFile(filename: string, headers: string[], rows: unknown[][]): void {
  const csvLines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(',')),
  ];
  const blob = new Blob([csvLines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportIssuesCsv(report: AuditReport): void {
  const headers = [
    'Issue ID',
    'Check ID',
    'Severity',
    'Category',
    'Subcategory',
    'Issue Title',
    'Affected URL',
    'Evidence',
    'Explanation',
    'Recommended Fix',
    'Suggested Value',
    'Status',
  ];
  const rows = report.issues.map((i) => [
    i.id,
    i.checkId,
    i.severity.toUpperCase(),
    i.category,
    i.subcategory,
    i.title,
    i.affectedUrl,
    i.evidence,
    i.explanation,
    i.recommendedFix,
    i.suggestedValue || '',
    i.status,
  ]);
  downloadCsvFile(`seo-audit-issues-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
}

export function exportCrawledPagesCsv(report: AuditReport): void {
  const headers = [
    'URL',
    'Final URL',
    'HTTP Status',
    'Response Time (ms)',
    'Content Size (Bytes)',
    'Crawl Depth',
    'Redirect Hops',
    'Word Count',
    'Readability Score',
    'Incoming Internal Links',
    'Outgoing Internal Links',
    'Outgoing External Links',
    'Images Count',
    'Schema Types',
  ];
  const rows = report.pages.map((p) => [
    p.url,
    p.finalUrl,
    p.statusCode,
    p.responseTimeMs,
    p.contentSizeBytes,
    p.crawlDepth,
    p.redirectChain.length,
    p.wordCount,
    p.readabilityScore,
    p.incomingInternalLinksCount,
    p.internalLinks.length,
    p.externalLinks.length,
    p.images.length,
    p.schemaEntities.map((s) => s.type).join('; '),
  ]);
  downloadCsvFile(`seo-crawled-pages-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
}

export function exportMetadataCsv(report: AuditReport): void {
  const headers = [
    'URL',
    'Status Code',
    'Title Tag',
    'Title Length',
    'Suggested Title',
    'Meta Description',
    'Meta Description Length',
    'Suggested Meta Description',
    'H1 Heading(s)',
    'H2 Count',
    'Canonical URL',
    'Meta Robots',
    'HTML Lang',
    'Viewport',
  ];
  const rows = report.pages.map((p) => [
    p.finalUrl,
    p.statusCode,
    p.title,
    p.titleLength,
    p.suggestedTitle || '',
    p.metaDescription,
    p.metaDescriptionLength,
    p.suggestedMetaDescription || '',
    p.h1s.join(' | '),
    p.h2s.length,
    p.canonicalUrl,
    p.metaRobots,
    p.htmlLang,
    p.viewport,
  ]);
  downloadCsvFile(`seo-page-metadata-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
}

export function exportInternalLinksCsv(report: AuditReport): void {
  const headers = [
    'Source Page URL',
    'Target Resolved URL',
    'Raw Href',
    'Anchor Text',
    'Generic Anchor Warning',
    'In Navigation',
    'Rel Attribute',
    'Target Status Code',
    'Redirects To',
    'Broken Link',
  ];
  const rows: unknown[][] = [];
  for (const p of report.pages) {
    for (const l of p.internalLinks) {
      rows.push([
        p.finalUrl,
        l.resolvedUrl,
        l.href,
        l.anchorText,
        l.isGenericAnchor ? 'Yes' : 'No',
        l.isNavigation ? 'Yes' : 'No',
        l.rel || '',
        l.statusCode ?? '',
        l.redirectsTo || '',
        l.isBroken ? 'Yes' : 'No',
      ]);
    }
  }
  downloadCsvFile(`seo-internal-links-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
}

export function exportRecommendationsCsv(report: AuditReport): void {
  const headers = [
    'ID',
    'Priority',
    'Issue',
    'Evidence',
    'Why It Matters',
    'Recommended Fix',
    'Implementation Steps',
    'Estimated Effort',
    'Verification Method',
  ];
  const rows = report.aiAnalysis.recommendations.map((r) => [
    r.id,
    r.priority,
    r.issue,
    r.evidence,
    r.whyItMatters,
    r.recommendedFix,
    r.implementationSteps.join(' -> '),
    r.estimatedEffort,
    r.verificationMethod,
  ]);
  downloadCsvFile(
    `seo-ai-recommendations-${new Date().toISOString().slice(0, 10)}.csv`,
    headers,
    rows
  );
}

export function exportAuditPdf(report: AuditReport): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  let y = 45;

  const ensureSpace = (neededPts: number) => {
    if (y + neededPts > pageHeight - 45) {
      doc.addPage();
      y = 45;
    }
  };

  const addSectionTitle = (title: string) => {
    ensureSpace(40);
    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(title, margin, y);
    y += 6;
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, y, pageWidth - margin, y);
    y += 16;
  };

  const addWrappedParagraph = (
    text: string,
    fontSize = 9.5,
    bold = false,
    color: [number, number, number] = [51, 65, 85]
  ) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(fontSize);
    doc.setTextColor(color[0], color[1], color[2]);
    const lines = doc.splitTextToSize(text, contentWidth);
    ensureSpace(lines.length * (fontSize + 4) + 6);
    doc.text(lines, margin, y);
    y += lines.length * (fontSize + 3.5) + 4;
  };

  // Header Banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 82, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('SEO Audit Pro AI — Comprehensive Audit Report', margin, 34);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(203, 213, 225);
  doc.text(
    `Target URL: ${report.url}   |   Generated: ${new Date(report.completedAt).toLocaleString()}${report.isDemoData ? '   |   [DEMONSTRATION DATA]' : ''}`,
    margin,
    54
  );
  doc.text(
    `Overall Health Score: ${report.overallScore}/100 (Application SEO Health Score)   |   Pages Crawled: ${report.counts.urlsCrawled} (${report.counts.crawlCoveragePercent}% Coverage)`,
    margin,
    70
  );

  y = 105;

  // 1. Executive Summary
  addSectionTitle('1. Executive Summary & Audit Scope');
  addWrappedParagraph(report.aiAnalysis.executiveSummary, 10);
  addWrappedParagraph(
    `Audit Mode: ${report.config.mode.toUpperCase()} | Pages Crawled: ${report.counts.urlsCrawled} of ${report.counts.urlsDiscovered} discovered | Passed Checks: ${report.counts.passed} | Warnings: ${report.counts.warnings} | Errors: ${report.counts.errors} | Critical: ${report.counts.critical}`,
    9,
    true,
    [30, 64, 175]
  );

  // 2. Category Scores
  addSectionTitle('2. SEO Health Category Scores');
  const cats = Object.values(report.categoryScores);
  for (const c of cats) {
    addWrappedParagraph(
      `• ${c.category} (Weight ${c.weightPercent}%): ${c.score}/100 — Passed: ${c.passedCount}, Warnings: ${c.warningCount}, Errors: ${c.errorCount}, Critical: ${c.criticalCount}`,
      9.5,
      false
    );
  }

  // 3. Performance & Core Web Vitals
  addSectionTitle('3. Performance & Core Web Vitals (Mobile & Desktop)');
  if (report.pageSpeed.mobile.available && report.pageSpeed.mobile.lighthouseScores) {
    const m = report.pageSpeed.mobile;
    addWrappedParagraph(
      `Mobile Lighthouse Scores — Performance: ${m.lighthouseScores?.performance}/100, Accessibility: ${m.lighthouseScores?.accessibility}/100, Best Practices: ${m.lighthouseScores?.bestPractices}/100, SEO: ${m.lighthouseScores?.seo}/100`,
      9.5,
      true
    );
    addWrappedParagraph(
      `Mobile Lab Metrics — LCP: ${m.labMetrics?.largestContentfulPaint}, TBT: ${m.labMetrics?.totalBlockingTime}, CLS: ${m.labMetrics?.cumulativeLayoutShift}, FCP: ${m.labMetrics?.firstContentfulPaint}, Speed Index: ${m.labMetrics?.speedIndex}`,
      9
    );
  } else {
    addWrappedParagraph(
      `Mobile PageSpeed Insights Status: Unavailable (${report.pageSpeed.mobile.errorReason || 'Not fetched'})`,
      9
    );
  }

  if (report.pageSpeed.desktop.available && report.pageSpeed.desktop.lighthouseScores) {
    const d = report.pageSpeed.desktop;
    addWrappedParagraph(
      `Desktop Lighthouse Scores — Performance: ${d.lighthouseScores?.performance}/100, Accessibility: ${d.lighthouseScores?.accessibility}/100, Best Practices: ${d.lighthouseScores?.bestPractices}/100, SEO: ${d.lighthouseScores?.seo}/100`,
      9.5,
      true
    );
    addWrappedParagraph(
      `Desktop Lab Metrics — LCP: ${d.labMetrics?.largestContentfulPaint}, TBT: ${d.labMetrics?.totalBlockingTime}, CLS: ${d.labMetrics?.cumulativeLayoutShift}, FCP: ${d.labMetrics?.firstContentfulPaint}`,
      9
    );
  }

  // 4. Detected SEO Issues
  addSectionTitle('4. Detected SEO Issues (Critical, Errors & Warnings)');
  const actionableIssues = report.issues.filter((i) => i.severity !== 'passed');
  for (const iss of actionableIssues.slice(0, 25)) {
    addWrappedParagraph(
      `[${iss.severity.toUpperCase()}] [${iss.category}] ${iss.title}`,
      9.5,
      true,
      iss.severity === 'critical' || iss.severity === 'error' ? [185, 28, 28] : [180, 83, 9]
    );
    addWrappedParagraph(`URL: ${iss.affectedUrl} | Evidence: ${iss.evidence}`, 8.5);
    addWrappedParagraph(`Recommended Fix: ${iss.recommendedFix}`, 8.5);
    y += 3;
  }

  // 5. Priority AI Recommendations
  addSectionTitle('5. Prioritized Recommendations & Implementation Steps');
  for (const rec of report.aiAnalysis.recommendations) {
    addWrappedParagraph(
      `[${rec.priority} Priority] ${rec.issue} (Effort: ${rec.estimatedEffort})`,
      9.5,
      true
    );
    addWrappedParagraph(`Evidence: ${rec.evidence}`, 8.5);
    addWrappedParagraph(`Why It Matters: ${rec.whyItMatters}`, 8.5);
    addWrappedParagraph(`Fix: ${rec.recommendedFix}`, 8.5);
    addWrappedParagraph(`Verification: ${rec.verificationMethod}`, 8.5);
    y += 4;
  }

  // 6. 7-Day, 30-Day & 90-Day SEO Action Plan
  addSectionTitle('6. 7-Day, 30-Day & 90-Day SEO Action Plan');
  for (const phase of report.aiAnalysis.actionPlan) {
    addWrappedParagraph(`${phase.timeframe} — ${phase.focus}`, 10, true, [30, 64, 175]);
    for (const ms of phase.milestones) {
      addWrappedParagraph(
        `• [${ms.category}] ${ms.title} (${ms.effort}): ${ms.action} -> Outcome: ${ms.expectedOutcome}`,
        8.5
      );
    }
    y += 4;
  }

  // 7. Data Sources & Limitations
  addSectionTitle('7. Audit Data Sources & Disclosed Limitations');
  addWrappedParagraph(`Data Sources: ${report.dataSources.join(' | ')}`, 8.5);
  for (const lim of report.limitations) {
    addWrappedParagraph(`• Limitation: ${lim}`, 8.5);
  }

  doc.save(`seo-audit-pro-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export const exportPagesCsv = exportCrawledPagesCsv;
export const exportLinksCsv = exportInternalLinksCsv;
