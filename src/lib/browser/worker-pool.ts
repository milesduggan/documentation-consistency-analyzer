// Worker pool for managing parallel analysis workers
// Distributes work across multiple workers for efficient processing

import type { ParsedMarkdown } from './markdown-parser';
import type { ParsedCodeFile } from './code-parser';

export interface FileContent {
  filePath: string;
  content: string;
  type: 'markdown' | 'code';
}

export interface ParsedFile {
  filePath: string;
  type: 'markdown' | 'code';
  result: ParsedMarkdown | ParsedCodeFile;
}

export interface WorkerTask {
  id: string;
  type: 'PARSE_MARKDOWN' | 'PARSE_CODE' | 'PARSE_BATCH';
  payload: unknown;
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
}

export interface WorkerMessage {
  id: string;
  type: string;
  payload?: unknown;
  error?: string;
}

/**
 * Generate unique task ID
 */
function generateTaskId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Worker pool for parallel file processing
 */
export class WorkerPool {
  private workers: Worker[] = [];
  private taskQueue: WorkerTask[] = [];
  private activeTasks: Map<string, WorkerTask> = new Map();
  private workerAvailable: boolean[] = [];
  private poolSize: number;
  private workerUrl: string | null = null;
  private isInitialized = false;

  constructor(poolSize?: number) {
    // Default to number of CPU cores, capped at 4
    this.poolSize = Math.min(poolSize || (typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : 4) || 4, 4);
  }

  /**
   * Initialize the worker pool
   */
  async initialize(workerScript: string): Promise<void> {
    if (this.isInitialized) return;

    // Create blob URL for worker script
    const blob = new Blob([workerScript], { type: 'application/javascript' });
    this.workerUrl = URL.createObjectURL(blob);

    // Create workers
    for (let i = 0; i < this.poolSize; i++) {
      const worker = new Worker(this.workerUrl);
      worker.onmessage = (e: MessageEvent<WorkerMessage>) => this.handleWorkerMessage(i, e.data);
      worker.onerror = (e) => this.handleWorkerError(i, e);
      this.workers.push(worker);
      this.workerAvailable[i] = true;
    }

    this.isInitialized = true;
  }

  /**
   * Handle message from worker
   */
  private handleWorkerMessage(workerIndex: number, message: WorkerMessage): void {
    const task = this.activeTasks.get(message.id);
    if (!task) return;

    this.activeTasks.delete(message.id);
    this.workerAvailable[workerIndex] = true;

    if (message.error) {
      task.reject(new Error(message.error));
    } else {
      task.resolve(message.payload);
    }

    // Process next task in queue
    this.processQueue();
  }

  /**
   * Handle worker error
   */
  private handleWorkerError(workerIndex: number, error: ErrorEvent): void {
    console.error(`Worker ${workerIndex} error:`, error);
    this.workerAvailable[workerIndex] = true;
    this.processQueue();
  }

  /**
   * Process queued tasks
   */
  private processQueue(): void {
    if (this.taskQueue.length === 0) return;

    // Find available worker
    const availableIndex = this.workerAvailable.findIndex((available) => available);
    if (availableIndex === -1) return;

    const task = this.taskQueue.shift();
    if (!task) return;

    this.workerAvailable[availableIndex] = false;
    this.activeTasks.set(task.id, task);

    this.workers[availableIndex].postMessage({
      id: task.id,
      type: task.type,
      payload: task.payload,
    });
  }

  /**
   * Submit a task to the pool
   */
  private submitTask<T>(type: WorkerTask['type'], payload: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      const task: WorkerTask = {
        id: generateTaskId(),
        type,
        payload,
        resolve: resolve as (result: unknown) => void,
        reject,
      };

      this.taskQueue.push(task);
      this.processQueue();
    });
  }

  /**
   * Parse a markdown file
   */
  async parseMarkdown(filePath: string, content: string): Promise<ParsedMarkdown> {
    return this.submitTask('PARSE_MARKDOWN', { filePath, content });
  }

  /**
   * Parse a code file
   */
  async parseCode(filePath: string, content: string): Promise<ParsedCodeFile> {
    return this.submitTask('PARSE_CODE', { filePath, content });
  }

  /**
   * Parse multiple files in batch
   */
  async parseBatch(files: FileContent[]): Promise<ParsedFile[]> {
    return this.submitTask('PARSE_BATCH', { files });
  }

  /**
   * Process all files with progress reporting
   */
  async processFiles(
    files: FileContent[],
    onProgress?: (current: number, total: number) => void
  ): Promise<ParsedFile[]> {
    const results: ParsedFile[] = [];
    let completed = 0;

    // Create promises for all files
    const promises = files.map(async (file) => {
      let result: ParsedFile;

      if (file.type === 'markdown') {
        const parsed = await this.parseMarkdown(file.filePath, file.content);
        result = { filePath: file.filePath, type: 'markdown', result: parsed };
      } else {
        const parsed = await this.parseCode(file.filePath, file.content);
        result = { filePath: file.filePath, type: 'code', result: parsed };
      }

      completed++;
      onProgress?.(completed, files.length);

      return result;
    });

    // Wait for all to complete
    const resolvedResults = await Promise.all(promises);
    results.push(...resolvedResults);

    return results;
  }

  /**
   * Get pool statistics
   */
  getStats(): { poolSize: number; activeWorkers: number; queuedTasks: number } {
    return {
      poolSize: this.poolSize,
      activeWorkers: this.workerAvailable.filter((a) => !a).length,
      queuedTasks: this.taskQueue.length,
    };
  }

  /**
   * Terminate all workers and cleanup
   */
  terminate(): void {
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers = [];
    this.workerAvailable = [];
    this.taskQueue = [];
    this.activeTasks.clear();

    if (this.workerUrl) {
      URL.revokeObjectURL(this.workerUrl);
      this.workerUrl = null;
    }

    this.isInitialized = false;
  }
}

/**
 * Check if Web Workers are supported
 */
export function isWorkerSupported(): boolean {
  return typeof Worker !== 'undefined';
}

/**
 * Create a simple worker pool with default settings
 */
export function createWorkerPool(): WorkerPool {
  return new WorkerPool();
}
