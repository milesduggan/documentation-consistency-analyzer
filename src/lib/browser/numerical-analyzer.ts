// Numerical value extraction and consistency checking
// OPTIMIZED: Single-pass, O(n) clustering, comprehensive edge cases

import type { Inconsistency } from '@/types';

// ============ Types ============
export interface ExtractedValue {
  value: number;
  rawValue: string;           // "5,000", "-10.5", "1e6"
  normalizedValue: number;    // After unit conversion
  keyword: string;
  normalizedKeyword: string;
  unit?: string;
  baseUnit: string;           // Normalized unit category
  lineNumber: number;
  filePath: string;
  contextQualifiers: string[];
}

export interface NumericalInconsistency {
  keyword: string;
  values: { value: number; rawValue: string; unit?: string; filePath: string; lineNumber: number }[];
  severity: 'low' | 'medium';
}

// ============ Constants ============

// Single combined pattern - handles most formats in one pass
// Matches: "timeout: 5000ms", "buffer_size = 1024", "timeout is 5000"
const COMBINED_PATTERN = /(?<keyword>[\w][\w_-]{1,30})\s*(?:[:=]|(?:\s+(?:is|are|equals?|set\s+to|defaults?\s+to|of|at)))\s*(?<value>-?\d+(?:,\d{3})*(?:\.\d+)?(?:e[+-]?\d+)?)\s*(?<unit>%|ms|milliseconds?|s|seconds?|min(?:utes?)?|h(?:ours?)?|days?|bytes?|[kmgtKMGT]i?[bB]|px|em|rem)?/gi;

// Skip patterns - avoid false positives
const SKIP_PATTERNS = [
  /version\s*[\d.]+/i,
  /v\d+\.\d+/i,
  /\d{4}[-/]\d{2}[-/]\d{2}/,  // dates
  /copyright.*\d{4}/i,
  /line\s*\d+/i,
  /port\s*\d+/i,
  /id[:=]\s*\d+/i,
];

// Context qualifiers - intentionally different values
const CONTEXT_QUALIFIERS = [
  'small', 'medium', 'large', 'tiny', 'huge',
  'minimum', 'min', 'maximum', 'max', 'default',
  'development', 'dev', 'production', 'prod', 'test', 'staging',
  'local', 'remote', 'cloud',
  'best', 'worst', 'average', 'typical',
];

// Unit normalization (time → ms, size → bytes)
const UNIT_NORMALIZATIONS: { pattern: RegExp; base: string; factor: number }[] = [
  { pattern: /^ms$|^milliseconds?$/i, base: 'ms', factor: 1 },
  { pattern: /^s$|^seconds?$/i, base: 'ms', factor: 1000 },
  { pattern: /^min(?:utes?)?$/i, base: 'ms', factor: 60000 },
  { pattern: /^h(?:ours?)?$/i, base: 'ms', factor: 3600000 },
  { pattern: /^days?$/i, base: 'ms', factor: 86400000 },
  { pattern: /^bytes?$/i, base: 'bytes', factor: 1 },
  { pattern: /^[kK]i?[bB]?$/i, base: 'bytes', factor: 1024 },
  { pattern: /^[mM]i?[bB]?$/i, base: 'bytes', factor: 1048576 },
  { pattern: /^[gG]i?[bB]?$/i, base: 'bytes', factor: 1073741824 },
  { pattern: /^%$/, base: '%', factor: 1 },
];

// ============ Helper Functions ============

/**
 * Remove code blocks to avoid false positives from code examples
 */
function stripCodeBlocks(content: string): string {
  return content
    .replace(/```[\s\S]*?```/g, '')  // Fenced code blocks
    .replace(/`[^`]+`/g, '');         // Inline code
}

/**
 * Parse number handling commas and scientific notation
 */
function parseNumber(raw: string): number {
  return parseFloat(raw.replace(/,/g, ''));
}

/**
 * Normalize keyword for clustering (lowercase, no separators, singular)
 */
function normalizeKeyword(keyword: string): string {
  return keyword
    .toLowerCase()
    .replace(/[-_\s]+/g, '')  // buffer_size → buffersize
    .replace(/s$/, '');        // plurals → singular
}

/**
 * Normalize value with unit conversion
 */
function normalizeUnit(value: number, unit?: string): { normalized: number; baseUnit: string } {
  if (!unit) return { normalized: value, baseUnit: 'none' };

  for (const norm of UNIT_NORMALIZATIONS) {
    if (norm.pattern.test(unit)) {
      return { normalized: value * norm.factor, baseUnit: norm.base };
    }
  }

  return { normalized: value, baseUnit: unit.toLowerCase() };
}

/**
 * Extract context qualifiers from surrounding text
 */
function extractQualifiers(line: string): string[] {
  const lower = line.toLowerCase();
  return CONTEXT_QUALIFIERS.filter(q => lower.includes(q));
}

/**
 * Check if line should be skipped (versions, dates, etc.)
 */
function shouldSkip(line: string): boolean {
  return SKIP_PATTERNS.some(p => p.test(line));
}

// ============ Main Functions ============

/**
 * Extract all numerical values with context from markdown files
 * Single-pass extraction with combined regex
 */
export function extractNumericalValues(
  files: { filePath: string; rawContent: string }[]
): ExtractedValue[] {
  const values: ExtractedValue[] = [];

  for (const file of files) {
    const clean = stripCodeBlocks(file.rawContent);
    const lines = clean.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (shouldSkip(line)) continue;

      // Reset regex for each line
      COMBINED_PATTERN.lastIndex = 0;
      let match;

      while ((match = COMBINED_PATTERN.exec(line)) !== null) {
        const keyword = match.groups!.keyword;
        const rawValue = match.groups!.value;
        const unit = match.groups!.unit;
        const numValue = parseNumber(rawValue);
        const { normalized, baseUnit } = normalizeUnit(numValue, unit);

        values.push({
          value: numValue,
          rawValue,
          normalizedValue: normalized,
          keyword,
          normalizedKeyword: normalizeKeyword(keyword),
          unit: unit || undefined,
          baseUnit,
          lineNumber: i + 1,
          filePath: file.filePath,
          contextQualifiers: extractQualifiers(line),
        });
      }
    }
  }

  return values;
}

/**
 * Cluster values by normalized keyword - O(n) hash-based grouping
 */
export function clusterByKeyword(values: ExtractedValue[]): Map<string, ExtractedValue[]> {
  const clusters = new Map<string, ExtractedValue[]>();

  for (const v of values) {
    if (!clusters.has(v.normalizedKeyword)) {
      clusters.set(v.normalizedKeyword, []);
    }
    clusters.get(v.normalizedKeyword)!.push(v);
  }

  return clusters;
}

/**
 * Detect inconsistencies within clusters
 * Returns only clusters with different normalized values
 */
export function detectNumericalInconsistencies(
  clusters: Map<string, ExtractedValue[]>
): NumericalInconsistency[] {
  const results: NumericalInconsistency[] = [];

  for (const [, values] of clusters) {
    // Skip single occurrences - need 2+ to compare
    if (values.length < 2) continue;

    // Group by normalized value + base unit
    const byValue = new Map<string, ExtractedValue[]>();
    for (const v of values) {
      const key = `${v.normalizedValue}:${v.baseUnit}`;
      if (!byValue.has(key)) byValue.set(key, []);
      byValue.get(key)!.push(v);
    }

    // If all same value, no inconsistency
    if (byValue.size <= 1) continue;

    // Check if differences are due to context qualifiers (dev/prod, min/max)
    const allValues = Array.from(byValue.values()).flat();
    const hasQualifiers = allValues.some(v => v.contextQualifiers.length > 0);

    results.push({
      keyword: values[0].keyword, // Use original keyword for display
      values: allValues.map(v => ({
        value: v.value,
        rawValue: v.rawValue,
        unit: v.unit,
        filePath: v.filePath,
        lineNumber: v.lineNumber,
      })),
      // Lower severity if context qualifiers suggest intentional difference
      severity: hasQualifiers ? 'low' : 'medium',
    });
  }

  return results;
}

/**
 * Convert numerical inconsistencies to standard Inconsistency format
 */
export function numericalToInconsistencies(
  inconsistencies: NumericalInconsistency[],
  generateId: () => string
): Inconsistency[] {
  return inconsistencies.map(ni => {
    const valuesList = ni.values
      .map(v => `${v.rawValue}${v.unit || ''} (${v.filePath}:${v.lineNumber})`)
      .join(', ');

    return {
      id: generateId(),
      type: 'numerical-inconsistency' as const,
      severity: ni.severity,
      confidence: 'medium',
      message: `Inconsistent values for "${ni.keyword}"`,
      location: {
        filePath: ni.values[0].filePath,
        lineNumber: ni.values[0].lineNumber,
      },
      context: `Found: ${valuesList}`,
      suggestion: 'Verify all occurrences use the same value, or add context (e.g., "default", "maximum") if intentionally different',
    };
  });
}
