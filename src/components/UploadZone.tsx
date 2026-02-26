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
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  // Check browser compatibility
  if (!compatibility.supported) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px' }}>
        <h3>Browser Not Supported</h3>
        <p>{compatibility.message}</p>
        <p style={{ marginTop: '1rem', fontSize: '0.875rem' }}>
          You're using: <strong>{compatibility.browserName}</strong>
        </p>
      </div>
    );
  }

  const handleFilePicker = async () => {
    try {
      setError('');
      // @ts-ignore - TypeScript doesn't have types for this yet
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
        // @ts-ignore - getAsFileSystemHandle is not in types yet
        if (item.kind === 'file' && typeof item.getAsFileSystemHandle === 'function') {
          // @ts-ignore
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
    <div style={{ maxWidth: '800px', margin: '2rem auto' }}>
      {/* Drag and drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          padding: '3rem 2rem',
          border: isDragging ? '3px dashed #0070f3' : '2px dashed #ccc',
          borderRadius: '8px',
          textAlign: 'center',
          background: isDragging ? '#f0f8ff' : 'white',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        <h2 style={{ marginBottom: '1rem' }}>Select Project Folder</h2>
        <p style={{ color: '#666', marginBottom: '2rem' }}>
          Drag and drop a folder here, or use one of the options below
        </p>

        {/* Browse button */}
        <button onClick={handleFilePicker} style={{ marginBottom: '1.5rem' }}>
          Browse for Folder
        </button>

        <div style={{ margin: '1.5rem 0', color: '#999' }}>
          — OR —
        </div>

        {/* Manual path input (Note: Will also use showDirectoryPicker) */}
        <div style={{ maxWidth: '400px', margin: '0 auto' }}>
          <p style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
            Click below to select a folder by path:
          </p>
          <button
            onClick={handleFilePicker}
            style={{ width: '100%', background: '#6c757d' }}
          >
            Select Folder by Path
          </button>
          <p style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.5rem' }}>
            (Browser will show a folder picker dialog)
          </p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          background: '#fee',
          border: '1px solid #fcc',
          borderRadius: '4px',
          color: '#c00',
        }}>
          {error}
        </div>
      )}

      {/* Instructions */}
      <div style={{ marginTop: '2rem', padding: '1rem', background: '#f9f9f9', borderRadius: '4px', fontSize: '0.875rem' }}>
        <p><strong>What happens next:</strong></p>
        <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
          <li>Select a project folder containing documentation files</li>
          <li>The tool will analyze all .md, .js, .ts, and .py files</li>
          <li>It will check for broken internal links and inconsistencies</li>
          <li>Analysis happens entirely in your browser - files never leave your computer</li>
        </ul>
      </div>
    </div>
  );
}
