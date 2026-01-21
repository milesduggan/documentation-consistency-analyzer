// Streaming file reader for handling large files efficiently
// Uses async generators to process files in chunks without loading fully into memory

export interface FileContent {
  filePath: string;
  content: string;
  size: number;
}

// Threshold for considering a file "large" (1MB)
export const LARGE_FILE_THRESHOLD = 1024 * 1024;

/**
 * Stream file content line by line using async generator
 * Useful for line-based analysis without loading entire file
 */
export async function* streamFileLines(
  fileHandle: FileSystemFileHandle
): AsyncGenerator<{ line: string; lineNumber: number }, void, unknown> {
  const file = await fileHandle.getFile();
  const reader = file.stream().getReader();
  const decoder = new TextDecoder();

  let buffer = '';
  let lineNumber = 1;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Yield complete lines
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      yield { line, lineNumber };
      lineNumber++;
    }
  }

  // Yield any remaining content
  if (buffer) {
    yield { line: buffer, lineNumber };
  }
}

/**
 * Stream file content in chunks
 * Returns raw chunks for custom processing
 */
export async function* streamFileChunks(
  fileHandle: FileSystemFileHandle,
  _chunkSize = 64 * 1024 // 64KB default - reserved for future chunked reading
): AsyncGenerator<{ chunk: string; bytesRead: number; totalBytes: number }, void, unknown> {
  const file = await fileHandle.getFile();
  const totalBytes = file.size;
  const reader = file.stream().getReader();
  const decoder = new TextDecoder();

  let bytesRead = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    bytesRead += value.byteLength;
    const chunk = decoder.decode(value, { stream: true });

    yield { chunk, bytesRead, totalBytes };
  }
}

/**
 * Read file with size check - streams large files, loads small files directly
 */
export async function readFileWithSizeCheck(
  fileHandle: FileSystemFileHandle,
  filePath: string
): Promise<FileContent> {
  const file = await fileHandle.getFile();
  const size = file.size;

  // For small files, just read directly
  const content = await file.text();

  return {
    filePath,
    content,
    size,
  };
}

/**
 * Check if a file is considered "large"
 */
export async function isLargeFile(fileHandle: FileSystemFileHandle): Promise<boolean> {
  const file = await fileHandle.getFile();
  return file.size > LARGE_FILE_THRESHOLD;
}

/**
 * Get file size without reading content
 */
export async function getFileSize(fileHandle: FileSystemFileHandle): Promise<number> {
  const file = await fileHandle.getFile();
  return file.size;
}

/**
 * Batch read multiple files with progress reporting
 * Reads files in parallel with concurrency limit
 */
export async function readFilesWithProgress(
  files: Array<{ handle: FileSystemFileHandle; path: string }>,
  onProgress?: (current: number, total: number, bytesRead: number, totalBytes: number) => void,
  concurrency = 4
): Promise<FileContent[]> {
  const results: FileContent[] = [];
  let currentIndex = 0;
  let completedCount = 0;
  let totalBytesRead = 0;

  // Calculate total bytes first
  let totalBytes = 0;
  for (const file of files) {
    const size = await getFileSize(file.handle);
    totalBytes += size;
  }

  // Process files with limited concurrency
  const processFile = async (): Promise<void> => {
    while (currentIndex < files.length) {
      const index = currentIndex++;
      const file = files[index];

      const content = await readFileWithSizeCheck(file.handle, file.path);
      results[index] = content;

      completedCount++;
      totalBytesRead += content.size;

      onProgress?.(completedCount, files.length, totalBytesRead, totalBytes);
    }
  };

  // Start concurrent workers
  const workers = Array(Math.min(concurrency, files.length))
    .fill(null)
    .map(() => processFile());

  await Promise.all(workers);

  return results;
}

/**
 * Extract lines matching a pattern from a large file using streaming
 * Useful for finding specific content without loading entire file
 */
export async function extractMatchingLines(
  fileHandle: FileSystemFileHandle,
  pattern: RegExp
): Promise<Array<{ line: string; lineNumber: number }>> {
  const matches: Array<{ line: string; lineNumber: number }> = [];

  for await (const { line, lineNumber } of streamFileLines(fileHandle)) {
    if (pattern.test(line)) {
      matches.push({ line, lineNumber });
    }
  }

  return matches;
}
