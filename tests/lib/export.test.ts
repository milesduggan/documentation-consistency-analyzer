import { evaluateCICDThresholds, generateSummaryText, DEFAULT_CICD_THRESHOLDS } from '@/lib/browser/export';
import type { AnalysisResult } from '@/lib/browser/analyzer';
import type { DeltaSummary } from '@/lib/browser/delta';

function makeResults(issues: Array<{ severity: 'high' | 'medium' | 'low' }> = []): AnalysisResult {
  return {
    inconsistencies: issues.map((i, idx) => ({
      id: `inc-${idx}`,
      type: 'broken-link',
      severity: i.severity,
      confidence: 'medium' as const,
      message: `Test issue ${idx}`,
      location: { filePath: 'test.md', lineNumber: idx + 1 },
      context: 'test context',
      suggestion: 'fix it',
    })),
    metadata: {
      totalFiles: 10,
      totalMarkdownFiles: 5,
      totalLinks: 20,
      analyzedAt: '2026-01-21T00:00:00.000Z',
    },
  };
}

function makeDelta(overrides: Partial<DeltaSummary> = {}): DeltaSummary {
  return {
    isFirstRun: false,
    previousHealthScore: 80,
    currentHealthScore: 75,
    healthDelta: -5,
    newCount: 2,
    persistingCount: 3,
    resolvedCount: 1,
    reintroducedCount: 0,
    ignoredCount: 0,
    hasRegressions: false,
    newBySeverity: { high: 0, medium: 1, low: 1 },
    reintroducedBySeverity: { high: 0, medium: 0, low: 0 },
    healthAttribution: { fromNewIssues: -5, fromResolvedIssues: 2, fromSeverityMix: -2 },
    issues: [],
    ...overrides,
  };
}

describe('evaluateCICDThresholds', () => {
  it('should pass when no issues', () => {
    const result = evaluateCICDThresholds(makeResults(), null);
    expect(result.passed).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.failureReasons).toHaveLength(0);
  });

  it('should fail when high severity exceeds threshold', () => {
    const results = makeResults([{ severity: 'high' }, { severity: 'high' }]);
    const result = evaluateCICDThresholds(results, null, { maxHighSeverity: 1 });
    expect(result.passed).toBe(false);
    expect(result.failureReasons.some(r => r.includes('HIGH'))).toBe(true);
  });

  it('should fail when medium severity exceeds threshold', () => {
    const issues = Array(15).fill({ severity: 'medium' as const });
    const results = makeResults(issues);
    const result = evaluateCICDThresholds(results, null, { maxMediumSeverity: 10 });
    expect(result.passed).toBe(false);
    expect(result.failureReasons.some(r => r.includes('MEDIUM'))).toBe(true);
  });

  it('should fail when total issues exceed threshold', () => {
    const issues = Array(55).fill({ severity: 'low' as const });
    const results = makeResults(issues);
    const result = evaluateCICDThresholds(results, null, { maxTotalIssues: 50 });
    expect(result.passed).toBe(false);
    expect(result.failureReasons.some(r => r.includes('Total issues'))).toBe(true);
  });

  it('should count severity correctly', () => {
    const results = makeResults([
      { severity: 'high' },
      { severity: 'medium' },
      { severity: 'medium' },
      { severity: 'low' },
    ]);
    const result = evaluateCICDThresholds(results, null);
    expect(result.summary.highSeverity).toBe(1);
    expect(result.summary.mediumSeverity).toBe(2);
    expect(result.summary.lowSeverity).toBe(1);
    expect(result.summary.totalIssues).toBe(4);
  });

  it('should detect regressions from delta', () => {
    const results = makeResults([{ severity: 'high' }]);
    const delta = makeDelta({
      hasRegressions: true,
      newBySeverity: { high: 1, medium: 0, low: 0 },
      reintroducedCount: 0,
    });
    const result = evaluateCICDThresholds(results, delta, { failOnRegression: true });
    expect(result.passed).toBe(false);
    expect(result.failureReasons.some(r => r.includes('new HIGH'))).toBe(true);
  });

  it('should detect reintroduced issues as regressions', () => {
    const results = makeResults([{ severity: 'medium' }]);
    const delta = makeDelta({
      hasRegressions: true,
      newBySeverity: { high: 0, medium: 0, low: 0 },
      reintroducedCount: 2,
    });
    const result = evaluateCICDThresholds(results, delta, { failOnRegression: true });
    expect(result.passed).toBe(false);
    expect(result.failureReasons.some(r => r.includes('reintroduced'))).toBe(true);
  });

  it('should use custom thresholds', () => {
    const results = makeResults([
      { severity: 'high' },
      { severity: 'high' },
      { severity: 'high' },
    ]);
    // Allow up to 5 high severity
    const result = evaluateCICDThresholds(results, null, { maxHighSeverity: 5 });
    // Should not fail on high severity (3 <= 5)
    expect(result.failureReasons.filter(r => r.includes('HIGH'))).toHaveLength(0);
  });

  it('should include delta info when provided', () => {
    const result = evaluateCICDThresholds(makeResults(), makeDelta());
    expect(result.delta).toBeDefined();
    expect(result.delta?.newIssues).toBe(2);
    expect(result.delta?.resolvedIssues).toBe(1);
  });

  it('should not include delta info when null', () => {
    const result = evaluateCICDThresholds(makeResults(), null);
    expect(result.delta).toBeUndefined();
  });
});

describe('generateSummaryText', () => {
  it('should include metadata', () => {
    const text = generateSummaryText(makeResults());
    expect(text).toContain('Total files: 10');
    expect(text).toContain('Markdown files: 5');
    expect(text).toContain('Links checked: 20');
  });

  it('should include severity breakdown', () => {
    const results = makeResults([
      { severity: 'high' },
      { severity: 'medium' },
      { severity: 'low' },
    ]);
    const text = generateSummaryText(results);
    expect(text).toContain('High severity: 1');
    expect(text).toContain('Medium severity: 1');
    expect(text).toContain('Low severity: 1');
    expect(text).toContain('Issues Found: 3');
  });

  it('should include issue details', () => {
    const results = makeResults([{ severity: 'high' }]);
    const text = generateSummaryText(results);
    expect(text).toContain('[HIGH]');
    expect(text).toContain('Test issue 0');
    expect(text).toContain('test.md');
  });

  it('should handle empty results', () => {
    const text = generateSummaryText(makeResults());
    expect(text).toContain('Issues Found: 0');
    expect(text).toContain('High severity: 0');
  });
});
