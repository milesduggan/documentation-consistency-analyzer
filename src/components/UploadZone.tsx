'use client'

import { useState, useEffect } from 'react';
import { getBrowserCompatibility } from '@/lib/browser/file-reader';

interface UploadZoneProps {
  onFolderSelected: (dirHandle: FileSystemDirectoryHandle) => void;
}

interface BrowserCompatibility {
  supported: boolean;
  browserName: string;
  message: string;
}

export default function UploadZone({ onFolderSelected }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string>('');
  const [compatibility, setCompatibility] = useState<BrowserCompatibility | null>(null);

  // Check browser compatibility on client side only
  useEffect(() => {
    setCompatibility(getBrowserCompatibility());
  }, []);

  // Show loading state during SSR/hydration
  if (compatibility === null) {
    return (
      <div className="upload-zone-loading">
        <p>Loading...</p>
      </div>
    );
  }

  // Check browser compatibility
  if (!compatibility.supported) {
    return (
      <div className="upload-zone-unsupported">
        <h3>Browser Not Supported</h3>
        <p>{compatibility.message}</p>
        <p className="browser-info">
          You&apos;re using: <strong>{compatibility.browserName}</strong>
        </p>
      </div>
    );
  }

  const handleFilePicker = async () => {
    try {
      setError('');
      // @ts-expect-error - File System Access API types not yet in lib.dom.d.ts
      const dirHandle = await window.showDirectoryPicker();
      onFolderSelected(dirHandle);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(`Error selecting folder: ${err.message}`);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError('');

    try {
      // Get dropped items
      const items = Array.from(e.dataTransfer.items);

      for (const item of items) {
        // @ts-expect-error - getAsFileSystemHandle not yet in lib.dom.d.ts
        if (item.kind === 'file' && typeof item.getAsFileSystemHandle === 'function') {
          // @ts-expect-error - getAsFileSystemHandle not yet in lib.dom.d.ts
          const handle = await item.getAsFileSystemHandle();

          if (handle.kind === 'directory') {
            onFolderSelected(handle as FileSystemDirectoryHandle);
            return;
          }
        }
      }

      setError('Please drop a folder, not individual files');
    } catch (err) {
      setError(`Error processing dropped folder: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="upload-zone-container">
      {/* Drag and drop zone */}
      <div
        className={`upload-zone-dropzone${isDragging ? ' active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <h2>Select Project Folder</h2>
        <p>Drag and drop a folder here, or use one of the options below</p>

        {/* Browse button */}
        <button onClick={handleFilePicker}>
          Browse for Folder
        </button>

        <div className="upload-zone-divider">— OR —</div>

        {/* Manual path input (Note: Will also use showDirectoryPicker) */}
        <div className="upload-zone-path-section">
          <p>Click below to select a folder by path:</p>
          <button
            className="upload-zone-path-btn"
            onClick={handleFilePicker}
          >
            Select Folder by Path
          </button>
          <p className="path-hint">(Browser will show a folder picker dialog)</p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="upload-zone-error">
          {error}
        </div>
      )}

      {/* Instructions */}
      <div className="upload-zone-instructions">
        <p><strong>What happens next:</strong></p>
        <ul>
          <li>Select a project folder containing documentation files</li>
          <li>The tool will analyze all .md, .js, .ts, and .py files</li>
          <li>It will check for broken internal links and inconsistencies</li>
          <li>Analysis happens entirely in your browser - files never leave your computer</li>
        </ul>
      </div>
    </div>
  );
}
