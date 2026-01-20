// Browser-compatible analyzer - orchestrates analysis client-side
// Adapts CLI logic to work with File System Access API

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';
import type { Root, Link, Heading, Text } from 'mdast';
import { BrowserFile, readFileContent } from './file-reader';
import { parseCodeFiles } from './code-parser';
import { analyzeDocumentationCoverage, coverageToInconsistencies } from './coverage-analyzer';
import {
  extractNumericalValues,
  clusterByKeyword,
  detectNumericalInconsistencies,
  numericalToInconsistencies
} from './numerical-analyzer';
import type { Inconsistency } from '@/types';

export interface AnalysisProgress {
  step: string;
  current: number;
  total: number;
  percentage: number;
}

export interface AnalysisResult {
  inconsistencies: Inconsistency[];
  metadata: {
    totalFiles: number;
    totalMarkdownFiles: number;
    totalLinks: number;
    analyzedAt: string;
    // Coverage analysis fields
    totalCodeFiles?: number;
    totalExports?: number;
    documentedExports?: number;
    coveragePercentage?: number;
  };
}

interface ParsedMarkdown {
  filePath: string;
  links: MarkdownLink[];
  headings: MarkdownHeading[];
  rawContent: string;
}

interface MarkdownLink {
  text: string;
  url: string;
  lineNumber?: number;
  isInternal: boolean;
}

interface MarkdownHeading {
  level: number;
  text: string;
  lineNumber?: number;
}

/**
 * Extract text content from a node
 */
function extractText(node: any): string {
  let text = '';
  visit(node, 'text', (textNode: Text) => {
    text += textNode.value;
  });
  return text;
}

/**
 * Parse Markdown content (browser-compatible version)
 */
async function parseMarkdown(
  filePath: string,
  content: string
): Promise<ParsedMarkdown> {
  const links: MarkdownLink[] = [];
  const headings: MarkdownHeading[] = [];

  // Parse Markdown into AST
  const tree = unified()
    .use(remarkParse)
    .parse(content);

  // Extract links
  visit(tree as Root, 'link', (node) => {
    const linkNode = node as Link & { position?: { start: { line: number } } };
    const linkText = extractText(node);
    const url = linkNode.url;

    links.push({
      text: linkText,
      url: url,
      lineNumber: linkNode.position?.start.line,
      isInternal: !url.startsWith('http://') && !url.startsWith('https://'),
    });
  });

  // Extract headings
  visit(tree as Root, 'heading', (node) => {
    const headingNode = node as Heading & { position?: { start: { line: number } } };
    const headingText = extractText(node);

    headings.push({
      level: headingNode.depth,
      text: headingText,
      lineNumber: headingNode.position?.start.line,
    });
  });

  return {
    filePath,
    links,
    headings,
    rawContent: content,
  };
}

/**
 * Convert heading text to URL slug (GitHub-style)
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `inc-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Check for malformed/empty links
 */
function detectMalformedLinks(parsedMarkdown: ParsedMarkdown[]): Inconsistency[] {
  const inconsistencies: Inconsistency[] = [];

  for (const md of parsedMarkdown) {
    for (const link of md.links) {
      // Empty URL: [text]()
      if (!link.url || link.url.trim() === '') {
        inconsistencies.push({
          id: generateId(),
          type: 'malformed-link',
          severity: 'high',
          confidence: 'medium',
          message: 'Empty link URL',
          location: {
            filePath: md.filePath,
            lineNumber: link.lineNumber,
          },
          context: `Link text: "${link.text}"`,
          suggestion: 'Add a valid URL or remove the link',
        });
      }
      // Empty text: [](url)
      else if (!link.text || link.text.trim() === '') {
        inconsistencies.push({
          id: generateId(),
          type: 'malformed-link',
          severity: 'low',
          confidence: 'medium',
          message: 'Link has no text',
          location: {
            filePath: md.filePath,
            lineNumber: link.lineNumber,
          },
          context: `URL: ${link.url}`,
          suggestion: 'Add descriptive link text for accessibility',
        });
      }
    }
  }

  return inconsistencies;
}

/**
 * Check for broken image links
 */
function detectBrokenImages(
  parsedMarkdown: ParsedMarkdown[],
  allFiles: BrowserFile[]
): Inconsistency[] {
  const inconsistencies: Inconsistency[] = [];

  // Extract image references from markdown
  for (const md of parsedMarkdown) {
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const lines = md.rawContent.split('\n');

    lines.forEach((line, index) => {
      let match;
      while ((match = imageRegex.exec(line)) !== null) {
        const altText = match[1];
        const imagePath = match[2];

        // Skip external URLs
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
          continue;
        }

        // Resolve relative image path
        const sourceDir = md.filePath.substring(0, md.filePath.lastIndexOf('/'));
        const resolvedPath = sourceDir ? `${sourceDir}/${imagePath}` : imagePath;
        const normalizedPath = resolvedPath.toLowerCase();

        // Check if image file exists
        const imageExists = allFiles.some(f => f.path.toLowerCase() === normalizedPath);

        if (!imageExists) {
          inconsistencies.push({
            id: generateId(),
            type: 'broken-image',
            severity: 'high',
            confidence: 'medium',
            message: 'Broken image link: file does not exist',
            location: {
              filePath: md.filePath,
              lineNumber: index + 1,
            },
            context: `Image: ![${altText}](${imagePath})`,
            suggestion: `Check if the image path is correct: ${imagePath}`,
          });
        }
      }
    });
  }

  return inconsistencies;
}

/**
 * Detect TODO/FIXME markers in documentation
 */
function detectTodoMarkers(parsedMarkdown: ParsedMarkdown[]): Inconsistency[] {
  const inconsistencies: Inconsistency[] = [];
  const todoPatterns = /\b(TODO|FIXME|XXX|HACK|NOTE|OPTIMIZE)\b:?\s*(.+)?/gi;

  for (const md of parsedMarkdown) {
    const lines = md.rawContent.split('\n');

    lines.forEach((line, index) => {
      let match;
      while ((match = todoPatterns.exec(line)) !== null) {
        const marker = match[1].toUpperCase();
        const description = match[2] || '';

        inconsistencies.push({
          id: generateId(),
          type: 'todo-marker',
          severity: marker === 'FIXME' ? 'medium' : 'low',
          confidence: 'medium',
          message: `${marker} comment found in documentation`,
          location: {
            filePath: md.filePath,
            lineNumber: index + 1,
          },
          context: line.trim(),
          suggestion: `Complete or remove this ${marker} item`,
        });
      }
    });
  }

  return inconsistencies;
}

/**
 * Find orphaned files (markdown files with no incoming links)
 */
function detectOrphanedFiles(
  parsedMarkdown: ParsedMarkdown[],
  allFiles: BrowserFile[]
): Inconsistency[] {
  const inconsistencies: Inconsistency[] = [];

  // Build set of all linked files
  const linkedFiles = new Set<string>();

  for (const md of parsedMarkdown) {
    const sourceDir = md.filePath.substring(0, md.filePath.lastIndexOf('/'));

    for (const link of md.links) {
      if (!link.isInternal) continue;

      const [linkPath] = link.url.split('#');
      if (!linkPath) continue;

      const targetPath = sourceDir ? `${sourceDir}/${linkPath}` : linkPath;
      linkedFiles.add(targetPath.toLowerCase());
    }
  }

  // Find markdown files that are never linked to
  const markdownFiles = allFiles.filter(f => f.name.endsWith('.md'));

  for (const file of markdownFiles) {
    const filePath = file.path.toLowerCase();

    // Skip README files and index files (these are expected entry points)
    if (
      file.name.toLowerCase() === 'readme.md' ||
      file.name.toLowerCase() === 'index.md'
    ) {
      continue;
    }

    if (!linkedFiles.has(filePath)) {
      inconsistencies.push({
        id: generateId(),
        type: 'orphaned-file',
        severity: 'low',
        confidence: 'medium',
        message: 'Orphaned file: not linked from any other documentation',
        location: {
          filePath: file.path,
          lineNumber: 1,
        },
        context: `File: ${file.name}`,
        suggestion: 'Consider linking this file from relevant documentation or removing it if unused',
      });
    }
  }

  return inconsistencies;
}

/**
 * Validate links in browser environment
 */
async function validateLinks(
  parsedMarkdown: ParsedMarkdown[],
  allFiles: BrowserFile[]
): Promise<Inconsistency[]> {
  const inconsistencies: Inconsistency[] = [];

  // Build a map of all files and their headings
  const fileMap = new Map<string, Set<string>>();

  for (const md of parsedMarkdown) {
    const normalizedPath = md.filePath.toLowerCase();
    const headings = new Set(md.headings.map(h => slugify(h.text)));
    fileMap.set(normalizedPath, headings);
  }

  // Validate each link
  for (const md of parsedMarkdown) {
    const sourceDir = md.filePath.substring(0, md.filePath.lastIndexOf('/'));

    for (const link of md.links) {
      // Skip external links for MVP
      if (!link.isInternal) {
        continue;
      }

      // Parse link URL (may contain anchor: file.md#heading)
      const [linkPath, anchor] = link.url.split('#');

      // Handle empty path (anchor-only link like #introduction)
      if (!linkPath && anchor) {
        const currentFileHeadings = fileMap.get(md.filePath.toLowerCase());
        if (currentFileHeadings && !currentFileHeadings.has(slugify(anchor))) {
          inconsistencies.push({
            id: generateId(),
            type: 'broken-link',
            severity: 'medium',
            confidence: 'medium',
            message: `Broken anchor link: #${anchor} does not exist in this file`,
            location: {
              filePath: md.filePath,
              lineNumber: link.lineNumber,
            },
            context: `Link text: "${link.text}"`,
            suggestion: `Available headings: ${Array.from(currentFileHeadings).join(', ')}`,
          });
        }
        continue;
      }

      // Resolve relative link path
      const targetPath = sourceDir ? `${sourceDir}/${linkPath}` : linkPath;
      const normalizedTarget = targetPath.toLowerCase();

      // Check if target file exists in our file list
      const fileExists = allFiles.some(f => f.path.toLowerCase() === normalizedTarget);

      if (!fileExists) {
        inconsistencies.push({
          id: generateId(),
          type: 'broken-link',
          severity: 'high',
          confidence: 'medium',
          message: `Broken link: target file does not exist`,
          location: {
            filePath: md.filePath,
            lineNumber: link.lineNumber,
          },
          context: `Link: [${link.text}](${link.url})`,
          suggestion: `Check if the file path is correct: ${linkPath}`,
        });
        continue;
      }

      // If there's an anchor, check if it exists in the target file
      if (anchor) {
        const targetHeadings = fileMap.get(normalizedTarget);
        if (targetHeadings && !targetHeadings.has(slugify(anchor))) {
          inconsistencies.push({
            id: generateId(),
            type: 'broken-link',
            severity: 'medium',
            confidence: 'medium',
            message: `Broken anchor: heading #${anchor} does not exist in target file`,
            location: {
              filePath: md.filePath,
              lineNumber: link.lineNumber,
            },
            context: `Link: [${link.text}](${link.url})`,
            suggestion: targetHeadings.size > 0
              ? `Available headings in target: ${Array.from(targetHeadings).slice(0, 5).join(', ')}`
              : 'Target file has no headings',
          });
        }
      }
    }
  }

  return inconsistencies;
}

/**
 * Main analysis function - browser-compatible
 */
export async function analyzeProject(
  files: BrowserFile[],
  onProgress?: (progress: AnalysisProgress) => void
): Promise<AnalysisResult> {
  const markdownFiles = files.filter(f => f.name.endsWith('.md'));
  const codeFiles = files.filter(f =>
    f.name.endsWith('.ts') ||
    f.name.endsWith('.tsx') ||
    f.name.endsWith('.js') ||
    f.name.endsWith('.jsx')
  );

  const totalSteps = markdownFiles.length + codeFiles.length + 3; // Parse MD + Parse Code + Validate + Coverage + Numerical
  let currentStep = 0;

  // Step 1: Parse all Markdown files
  onProgress?.({
    step: 'Parsing Markdown files',
    current: 0,
    total: markdownFiles.length,
    percentage: 0,
  });

  const parsedMarkdown: ParsedMarkdown[] = [];

  for (const file of markdownFiles) {
    const content = await readFileContent(file.handle);
    const parsed = await parseMarkdown(file.path, content);
    parsedMarkdown.push(parsed);

    currentStep++;
    onProgress?.({
      step: 'Parsing Markdown files',
      current: currentStep,
      total: markdownFiles.length,
      percentage: Math.round((currentStep / totalSteps) * 100),
    });
  }

  // Step 2: Parse all code files for coverage analysis
  onProgress?.({
    step: 'Parsing code files',
    current: 0,
    total: codeFiles.length,
    percentage: Math.round((currentStep / totalSteps) * 100),
  });

  const parsedCodeFiles = await parseCodeFiles(files, (current, total) => {
    onProgress?.({
      step: 'Parsing code files',
      current,
      total,
      percentage: Math.round(((currentStep + current) / totalSteps) * 100),
    });
  });

  currentStep += codeFiles.length;

  // Step 3: Run all validations
  onProgress?.({
    step: 'Running analysis checks',
    current: 0,
    total: 1,
    percentage: Math.round((currentStep / totalSteps) * 100),
  });

  const inconsistencies: Inconsistency[] = [];

  // Collect all markdown issues
  inconsistencies.push(...await validateLinks(parsedMarkdown, files));
  inconsistencies.push(...detectMalformedLinks(parsedMarkdown));
  inconsistencies.push(...detectBrokenImages(parsedMarkdown, files));
  inconsistencies.push(...detectTodoMarkers(parsedMarkdown));
  inconsistencies.push(...detectOrphanedFiles(parsedMarkdown, files));

  currentStep++;

  // Step 4: Analyze documentation coverage
  onProgress?.({
    step: 'Analyzing documentation coverage',
    current: 0,
    total: 1,
    percentage: Math.round((currentStep / totalSteps) * 100),
  });

  const coverageResult = analyzeDocumentationCoverage(
    parsedCodeFiles,
    parsedMarkdown.map(md => ({ filePath: md.filePath, rawContent: md.rawContent }))
  );

  // Add coverage issues to inconsistencies
  inconsistencies.push(...coverageToInconsistencies(coverageResult));

  currentStep++;

  // Step 5: Numerical consistency check
  onProgress?.({
    step: 'Checking numerical consistency',
    current: 0,
    total: 1,
    percentage: Math.round((currentStep / totalSteps) * 100),
  });

  const extractedValues = extractNumericalValues(
    parsedMarkdown.map(md => ({ filePath: md.filePath, rawContent: md.rawContent }))
  );
  const valueClusters = clusterByKeyword(extractedValues);
  const numInconsistencies = detectNumericalInconsistencies(valueClusters);
  inconsistencies.push(...numericalToInconsistencies(numInconsistencies, generateId));

  currentStep++;
  onProgress?.({
    step: 'Analysis complete',
    current: totalSteps,
    total: totalSteps,
    percentage: 100,
  });

  // Calculate total links
  const totalLinks = parsedMarkdown.reduce((sum, md) => sum + md.links.length, 0);

  return {
    inconsistencies,
    metadata: {
      totalFiles: files.length,
      totalMarkdownFiles: markdownFiles.length,
      totalLinks,
      analyzedAt: new Date().toISOString(),
      // Coverage metadata
      totalCodeFiles: codeFiles.length,
      totalExports: coverageResult.totalExports,
      documentedExports: coverageResult.documentedExports,
      coveragePercentage: coverageResult.coveragePercentage,
    },
  };
}
