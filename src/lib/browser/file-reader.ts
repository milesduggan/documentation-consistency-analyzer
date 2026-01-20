// Browser-compatible file reading using File System Access API
// Replaces Node.js fs module for client-side operation

export interface BrowserFile {
  name: string;
  path: string; // Relative path from root
  handle: FileSystemFileHandle;
}

const SUPPORTED_EXTENSIONS = ['.md', '.js', '.ts', '.py'];
const EXCLUDED_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'];

/**
 * Check if directory should be excluded
 */
function shouldExcludeDirectory(dirName: string): boolean {
  return EXCLUDED_DIRS.includes(dirName);
}

/**
 * Recursively read directory and return all matching files
 * @param dirHandle - FileSystemDirectoryHandle from showDirectoryPicker()
 * @param basePath - Base path for building relative paths
 * @returns Array of files with their handles
 */
export async function readDirectory(
  dirHandle: FileSystemDirectoryHandle,
  basePath: string = ''
): Promise<BrowserFile[]> {
  const files: BrowserFile[] = [];

  try {
    // Iterate through directory entries
    // @ts-expect-error - File System Access API types may not be complete
    for await (const entry of dirHandle.values()) {
      const currentPath = basePath ? `${basePath}/${entry.name}` : entry.name;

      if (entry.kind === 'directory') {
        // Skip excluded directories
        if (shouldExcludeDirectory(entry.name)) {
          continue;
        }

        // Recursively read subdirectory
        const subFiles = await readDirectory(entry as FileSystemDirectoryHandle, currentPath);
        files.push(...subFiles);
      } else if (entry.kind === 'file') {
        // Check if file extension is supported
        const ext = entry.name.substring(entry.name.lastIndexOf('.')).toLowerCase();
        if (SUPPORTED_EXTENSIONS.includes(ext)) {
          files.push({
            name: entry.name,
            path: currentPath,
            handle: entry as FileSystemFileHandle,
          });
        }
      }
    }
  } catch (error) {
    console.error('Error reading directory:', error);
    throw new Error(`Failed to read directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return files;
}

/**
 * Read file content as text
 * @param fileHandle - FileSystemFileHandle
 * @returns File content as string
 */
export async function readFileContent(fileHandle: FileSystemFileHandle): Promise<string> {
  try {
    const file = await fileHandle.getFile();
    const content = await file.text();
    return content;
  } catch (error) {
    console.error('Error reading file:', error);
    throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if File System Access API is supported
 */
export function isFileSystemAccessSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'showDirectoryPicker' in window;
}

/**
 * Get browser compatibility info
 */
export function getBrowserCompatibility(): {
  supported: boolean;
  browserName: string;
  message: string;
} {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { supported: false, browserName: 'Unknown', message: 'Server-side rendering' };
  }
  const userAgent = navigator.userAgent.toLowerCase();
  const isChrome = userAgent.includes('chrome') && !userAgent.includes('edg');
  const isEdge = userAgent.includes('edg');
  const isOpera = userAgent.includes('opr') || userAgent.includes('opera');
  const isFirefox = userAgent.includes('firefox');
  const isSafari = userAgent.includes('safari') && !userAgent.includes('chrome');

  let browserName = 'Unknown';
  if (isChrome) browserName = 'Chrome';
  else if (isEdge) browserName = 'Edge';
  else if (isOpera) browserName = 'Opera';
  else if (isFirefox) browserName = 'Firefox';
  else if (isSafari) browserName = 'Safari';

  const supported = isFileSystemAccessSupported();

  let message = '';
  if (!supported) {
    if (isFirefox || isSafari) {
      message = `${browserName} does not support the File System Access API yet. Please use Chrome, Edge, or Opera.`;
    } else {
      message = 'Your browser does not support the File System Access API. Please update your browser or use Chrome, Edge, or Opera.';
    }
  }

  return { supported, browserName, message };
}
