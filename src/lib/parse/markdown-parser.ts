// Markdown Parser - Extract links, headings, and content structure

import fs from 'fs/promises';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';
import type { Root, Link, Heading, Text } from 'mdast';
import { FileMetadata } from '@/types';

export interface ParsedMarkdown {
  filePath: string;
  links: MarkdownLink[];
  headings: MarkdownHeading[];
  rawContent: string;
}

export interface MarkdownLink {
  text: string;
  url: string;
  lineNumber?: number;
  isInternal: boolean; // true if relative link, false if external (http/https)
}

export interface MarkdownHeading {
  level: number; // 1-6 (h1-h6)
  text: string;
  lineNumber?: number;
}

/**
 * Parse a Markdown file and extract links and structure
 */
export async function parseMarkdown(
  filePath: string
): Promise<ParsedMarkdown> {
  const content = await fs.readFile(filePath, 'utf-8');

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
 * Parse multiple Markdown files in parallel
 */
export async function parseMarkdownFiles(
  files: FileMetadata[]
): Promise<ParsedMarkdown[]> {
  const markdownFiles = files.filter(f => f.fileType === 'markdown');

  const results = await Promise.all(
    markdownFiles.map(file => parseMarkdown(file.filePath))
  );

  return results;
}
