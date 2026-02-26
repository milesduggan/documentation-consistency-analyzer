// File Discovery Layer - Find all relevant files to analyze

import fs from 'fs/promises';
import path from 'path';
import { FileMetadata } from '@/types';

const SUPPORTED_EXTENSIONS = ['.md', '.js', '.ts', '.py'];

/**
 * Quick check: exclude common directories by name
 */
function shouldExcludeDirectory(dirName: string): boolean {
  const excludedDirs = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'];
  return excludedDirs.includes(dirName);
}

function shouldExclude(relativePath: string, patterns: string[]): boolean {
  // Normalize path separators for consistent matching
  const normalizedPath = relativePath.split(path.sep).join('/');

  return patterns.some(pattern => {
    const cleanPattern = pattern.replace(/\*\*/g, '').replace(/\*/g, '').replace(/\//g, '');

    // Check if the path contains the excluded pattern
    // Works for both "node_modules" in path and file-level exclusions
    return normalizedPath.includes(cleanPattern) ||
           relativePath.split(path.sep).includes(cleanPattern);
  });
}

/**
 * Discovers all analyzable files in a directory
 * @param rootPath - Root directory to search
 * @param excludePatterns - Glob patterns to exclude (from config.json)
 * @returns Array of file metadata objects
 */
export async function discoverFiles(
  rootPath: string,
  excludePatterns: string[] = []
): Promise<FileMetadata[]> {
  const files: FileMetadata[] = [];

  async function walk(currentPath: string) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      // Skip excluded directories by name (fast check before building full path)
      if (entry.isDirectory() && shouldExcludeDirectory(entry.name)) {
        continue;
      }

      const fullPath = path.join(currentPath, entry.name);
      const relativePath = path.relative(rootPath, fullPath);

      // Check exclusion patterns for files and remaining directories
      if (shouldExclude(relativePath, excludePatterns)) {
        continue;
      }

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (SUPPORTED_EXTENSIONS.includes(ext)) {
          const stats = await fs.stat(fullPath);
          files.push({
            filePath: fullPath,
            fileName: entry.name,
            fileType: getFileType(ext),
            sizeBytes: stats.size,
            modifiedTime: stats.mtime,
          });
        }
      }
    }
  }

  await walk(rootPath);
  return files;
}

function getFileType(ext: string): FileMetadata['fileType'] {
  switch (ext) {
    case '.md':
      return 'markdown';
    case '.js':
      return 'javascript';
    case '.ts':
      return 'typescript';
    case '.py':
      return 'python';
    default:
      return 'unknown';
  }
}
