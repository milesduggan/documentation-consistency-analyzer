// Worker-compatible markdown parser
// Extracts links and headings from markdown content without file system dependencies

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';
import type { Root, Link, Heading, Text, RootContent } from 'mdast';

export interface MarkdownLink {
  text: string;
  url: string;
  lineNumber?: number;
  isInternal: boolean;
}

export interface MarkdownHeading {
  level: number;
  text: string;
  lineNumber?: number;
}

export interface ParsedMarkdown {
  filePath: string;
  links: MarkdownLink[];
  headings: MarkdownHeading[];
  rawContent: string;
}

/**
 * Extract text content from a node
 */
function extractText(node: Link | Heading | RootContent): string {
  let text = '';
  visit(node, 'text', (textNode: Text) => {
    text += textNode.value;
  });
  return text;
}

/**
 * Parse markdown content and extract links/headings
 * This function is worker-compatible (no file system access)
 */
export function parseMarkdownContent(
  content: string,
  filePath: string
): ParsedMarkdown {
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
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Extract image references from markdown content
 */
export function extractImages(
  content: string,
  _filePath: string
): Array<{ altText: string; path: string; lineNumber: number }> {
  const images: Array<{ altText: string; path: string; lineNumber: number }> = [];
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    let match;
    while ((match = imageRegex.exec(line)) !== null) {
      images.push({
        altText: match[1],
        path: match[2],
        lineNumber: index + 1,
      });
    }
  });

  return images;
}

/**
 * Extract TODO/FIXME markers from markdown content
 */
export function extractTodoMarkers(
  content: string,
  _filePath: string
): Array<{ marker: string; text: string; lineNumber: number }> {
  const markers: Array<{ marker: string; text: string; lineNumber: number }> = [];
  const todoPatterns = /\b(TODO|FIXME|XXX|HACK|NOTE|OPTIMIZE)\b:?\s*(.+)?/gi;
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    let match;
    while ((match = todoPatterns.exec(line)) !== null) {
      markers.push({
        marker: match[1].toUpperCase(),
        text: match[2] || '',
        lineNumber: index + 1,
      });
    }
  });

  return markers;
}

/**
 * Batch parse multiple markdown files
 * Useful for worker batch processing
 */
export function parseMarkdownBatch(
  files: Array<{ filePath: string; content: string }>
): ParsedMarkdown[] {
  return files.map(({ filePath, content }) => parseMarkdownContent(content, filePath));
}
