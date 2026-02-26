// Link Validator - Detect broken internal links

import fs from 'fs/promises';
import path from 'path';
import { ParsedMarkdown } from '../parse/markdown-parser';
import { Inconsistency } from '@/types';

/**
 * Validate all internal links and detect broken ones
 */
export async function validateLinks(
  parsedMarkdown: ParsedMarkdown[],
  projectRoot: string
): Promise<Inconsistency[]> {
  const inconsistencies: Inconsistency[] = [];

  // Build a map of all files and their headings for quick lookup
  const fileMap = new Map<string, Set<string>>();

  for (const md of parsedMarkdown) {
    const normalizedPath = path.normalize(md.filePath);
    const headings = new Set(
      md.headings.map(h => slugify(h.text))
    );
    fileMap.set(normalizedPath, headings);
  }

  // Validate each link
  for (const md of parsedMarkdown) {
    const sourceDir = path.dirname(md.filePath);

    for (const link of md.links) {
      // Skip external links for MVP (can add HTTP checking later)
      if (!link.isInternal) {
        continue;
      }

      // Parse link URL (may contain anchor: file.md#heading)
      const [linkPath, anchor] = link.url.split('#');

      // Handle empty path (anchor-only link like #introduction)
      if (!linkPath && anchor) {
        // Check if anchor exists in current file
        const currentFileHeadings = fileMap.get(path.normalize(md.filePath));
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

      // Resolve relative link to absolute path
      const targetPath = path.resolve(sourceDir, linkPath);
      const normalizedTarget = path.normalize(targetPath);

      // Check if target file exists
      let fileExists = false;
      try {
        await fs.access(normalizedTarget);
        fileExists = true;
      } catch {
        // File doesn't exist - check if it's in our parsed files
        fileExists = fileMap.has(normalizedTarget);
      }

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
 * Convert heading text to URL slug (GitHub-style)
 * Example: "Getting Started" -> "getting-started"
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')      // Replace spaces with hyphens
    .replace(/-+/g, '-');      // Replace multiple hyphens with single
}

/**
 * Generate a unique ID for an inconsistency
 */
function generateId(): string {
  return `inc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
