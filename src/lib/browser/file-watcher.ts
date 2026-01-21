/**
 * Directory Watcher for File System Access API
 * Uses polling to detect changes since the API doesn't support native watching
 */

import { sha256 } from './crypto';
import { readDirectory } from './file-reader';

export interface WatcherConfig {
  pollInterval: number;  // Milliseconds between polls (default 5000)
  enabled: boolean;
}

export interface FileChange {
  type: 'added' | 'modified' | 'deleted';
  path: string;
}

export interface WatcherCallbacks {
  onChanges: (changes: FileChange[]) => void;
  onError?: (error: Error) => void;
}

const DEFAULT_CONFIG: WatcherConfig = {
  pollInterval: 5000,
  enabled: true,
};

/**
 * Watches a directory for file changes using polling
 */
export class DirectoryWatcher {
  private dirHandle: FileSystemDirectoryHandle;
  private callbacks: WatcherCallbacks;
  private config: WatcherConfig;
  private fileHashes: Map<string, string>;
  private intervalId: ReturnType<typeof setInterval> | null;
  private isScanning: boolean;

  constructor(
    dirHandle: FileSystemDirectoryHandle,
    callbacks: WatcherCallbacks,
    config: Partial<WatcherConfig> = {}
  ) {
    this.dirHandle = dirHandle;
    this.callbacks = callbacks;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.fileHashes = new Map();
    this.intervalId = null;
    this.isScanning = false;
  }

  /**
   * Start watching for changes
   */
  async start(): Promise<void> {
    if (this.intervalId !== null) {
      return; // Already running
    }

    // Initial scan to establish baseline
    try {
      this.fileHashes = await this.scanDirectory();
    } catch (error) {
      this.callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
      return;
    }

    // Start polling
    this.intervalId = setInterval(async () => {
      if (!this.config.enabled || this.isScanning) {
        return;
      }

      this.isScanning = true;
      try {
        const newHashes = await this.scanDirectory();
        const changes = this.detectChanges(newHashes);

        if (changes.length > 0) {
          this.fileHashes = newHashes;
          this.callbacks.onChanges(changes);
        }
      } catch (error) {
        this.callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
      } finally {
        this.isScanning = false;
      }
    }, this.config.pollInterval);
  }

  /**
   * Stop watching
   */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isScanning = false;
  }

  /**
   * Check if watcher is running
   */
  isRunning(): boolean {
    return this.intervalId !== null;
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<WatcherConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Scan directory and compute file hashes
   */
  private async scanDirectory(): Promise<Map<string, string>> {
    const hashes = new Map<string, string>();
    const files = await readDirectory(this.dirHandle);

    // Only hash relevant files (md, js, ts, jsx, tsx)
    const relevantFiles = files.filter(f =>
      f.name.endsWith('.md') ||
      f.name.endsWith('.js') ||
      f.name.endsWith('.jsx') ||
      f.name.endsWith('.ts') ||
      f.name.endsWith('.tsx')
    );

    for (const file of relevantFiles) {
      // Get file metadata for change detection
      const fileHandle = file.handle;
      const fileObj = await fileHandle.getFile();
      // Use size + lastModified as a quick fingerprint
      const fingerprint = `${file.path}:${fileObj.size}:${fileObj.lastModified}`;
      const hash = await sha256(fingerprint);
      hashes.set(file.path, hash.substring(0, 16));
    }

    return hashes;
  }

  /**
   * Detect changes between old and new hashes
   */
  private detectChanges(newHashes: Map<string, string>): FileChange[] {
    const changes: FileChange[] = [];

    // Check for added or modified files
    for (const [path, hash] of newHashes) {
      const oldHash = this.fileHashes.get(path);
      if (oldHash === undefined) {
        changes.push({ type: 'added', path });
      } else if (oldHash !== hash) {
        changes.push({ type: 'modified', path });
      }
    }

    // Check for deleted files
    for (const [path] of this.fileHashes) {
      if (!newHashes.has(path)) {
        changes.push({ type: 'deleted', path });
      }
    }

    return changes;
  }
}

/**
 * Format changes for display
 */
export function formatChanges(changes: FileChange[]): string {
  if (changes.length === 0) return 'No changes';

  const added = changes.filter(c => c.type === 'added').length;
  const modified = changes.filter(c => c.type === 'modified').length;
  const deleted = changes.filter(c => c.type === 'deleted').length;

  const parts: string[] = [];
  if (added > 0) parts.push(`${added} added`);
  if (modified > 0) parts.push(`${modified} modified`);
  if (deleted > 0) parts.push(`${deleted} deleted`);

  return parts.join(', ');
}
