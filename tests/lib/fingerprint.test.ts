import { normalizeMessage, calculateHealthScore } from '@/lib/browser/fingerprint';

describe('normalizeMessage', () => {
  it('should replace line numbers', () => {
    expect(normalizeMessage('Error on line 42')).toBe('error on line n');
    expect(normalizeMessage('See L150 for details')).toBe('see ln for details');
  });

  it('should replace column references', () => {
    expect(normalizeMessage('at :10:25')).toBe('at :n:n');
    expect(normalizeMessage('col 5 is wrong')).toBe('col n is wrong');
    expect(normalizeMessage('column 12 mismatch')).toBe('col n mismatch');
  });

  it('should replace quoted paths', () => {
    expect(normalizeMessage('File "src/lib/foo.ts" not found')).toBe('file "path" not found');
    expect(normalizeMessage("Missing 'bar/baz.md'")).toBe("missing 'path'");
  });

  it('should replace counts before file/link/issue words', () => {
    expect(normalizeMessage('Found 5 files with errors')).toBe('found n files with errors');
    expect(normalizeMessage('12 links broken')).toBe('n links broken');
    expect(normalizeMessage('3 issues detected')).toBe('n issues detected');
  });

  it('should normalize whitespace', () => {
    expect(normalizeMessage('  too   much   space  ')).toBe('too much space');
  });

  it('should lowercase the result', () => {
    expect(normalizeMessage('HELLO World')).toBe('hello world');
  });
});

describe('calculateHealthScore', () => {
  const makeResult = (
    issues: Array<{ severity: 'high' | 'medium' | 'low' }>,
    totalFiles = 10,
    coveragePercentage?: number
  ) => ({
    inconsistencies: issues.map((i, idx) => ({
      id: `inc-${idx}`,
      type: 'broken-link' as const,
      severity: i.severity,
      confidence: 'medium' as const,
      message: 'test',
      location: { filePath: 'test.md' },
    })),
    metadata: {
      totalFiles,
      totalMarkdownFiles: totalFiles,
      totalLinks: 0,
      analyzedAt: new Date().toISOString(),
      coveragePercentage,
    },
  });

  it('should return 100 for zero issues', () => {
    expect(calculateHealthScore(makeResult([]))).toBe(100);
  });

  it('should return 100 for zero files', () => {
    expect(calculateHealthScore(makeResult([], 0))).toBe(100);
  });

  it('should penalize high severity issues by 10 points each', () => {
    const score = calculateHealthScore(makeResult([{ severity: 'high' }]));
    expect(score).toBe(90);
  });

  it('should penalize medium severity issues by 5 points each', () => {
    const score = calculateHealthScore(makeResult([{ severity: 'medium' }]));
    expect(score).toBe(95);
  });

  it('should penalize low severity issues by 2 points each', () => {
    const score = calculateHealthScore(makeResult([{ severity: 'low' }]));
    expect(score).toBe(98);
  });

  it('should add bonus for good coverage', () => {
    const score = calculateHealthScore(makeResult([], 10, 90));
    expect(score).toBe(100); // 100 + 5 = 105, clamped to 100
  });

  it('should penalize poor coverage', () => {
    const score = calculateHealthScore(makeResult([], 10, 30));
    expect(score).toBe(90); // 100 - 10 = 90
  });

  it('should never go below 0', () => {
    const manyHighIssues = Array(20).fill({ severity: 'high' as const });
    const score = calculateHealthScore(makeResult(manyHighIssues, 1));
    expect(score).toBe(0);
  });

  it('should never exceed 100', () => {
    const score = calculateHealthScore(makeResult([], 100, 95));
    expect(score).toBe(100);
  });
});
