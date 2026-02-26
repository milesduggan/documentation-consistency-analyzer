import { validateUrl, extractExternalLinks } from '@/lib/browser/external-link-checker';

describe('validateUrl', () => {
  it('should allow valid http URLs', () => {
    expect(validateUrl('http://example.com')).toBeNull();
  });

  it('should allow valid https URLs', () => {
    expect(validateUrl('https://example.com/page')).toBeNull();
  });

  it('should block non-http schemes', () => {
    expect(validateUrl('ftp://example.com')).toContain('Blocked scheme');
    expect(validateUrl('file:///etc/passwd')).toContain('Blocked scheme');
    expect(validateUrl('javascript:alert(1)')).toContain('Blocked scheme');
  });

  it('should block localhost', () => {
    expect(validateUrl('http://localhost')).toContain('Blocked host');
    expect(validateUrl('http://localhost:3000')).toContain('Blocked host');
  });

  it('should block 127.0.0.1', () => {
    expect(validateUrl('http://127.0.0.1')).toContain('Blocked host');
    expect(validateUrl('http://127.0.0.1:8080')).toContain('Blocked host');
  });

  it('should block 0.0.0.0', () => {
    expect(validateUrl('http://0.0.0.0')).toContain('Blocked host');
  });

  it('should block IPv6 loopback', () => {
    expect(validateUrl('http://[::1]')).toContain('Blocked host');
  });

  it('should block 10.x.x.x private range', () => {
    expect(validateUrl('http://10.0.0.1')).toContain('Blocked private IP');
    expect(validateUrl('http://10.255.255.255')).toContain('Blocked private IP');
  });

  it('should block 172.16-31.x.x private range', () => {
    expect(validateUrl('http://172.16.0.1')).toContain('Blocked private IP');
    expect(validateUrl('http://172.31.255.255')).toContain('Blocked private IP');
  });

  it('should not block 172.32.x.x (outside private range)', () => {
    expect(validateUrl('http://172.32.0.1')).toBeNull();
  });

  it('should block 192.168.x.x private range', () => {
    expect(validateUrl('http://192.168.0.1')).toContain('Blocked private IP');
    expect(validateUrl('http://192.168.1.100')).toContain('Blocked private IP');
  });

  it('should block 169.254.x.x link-local / metadata endpoint', () => {
    expect(validateUrl('http://169.254.169.254')).toContain('Blocked private IP');
  });

  it('should return error for invalid URLs', () => {
    expect(validateUrl('not-a-url')).toBe('Invalid URL');
    expect(validateUrl('')).toBe('Invalid URL');
  });
});

describe('extractExternalLinks', () => {
  it('should extract http and https links', () => {
    const parsed = [
      {
        filePath: 'README.md',
        links: [
          { url: 'https://example.com', text: 'Example', isInternal: false },
          { url: 'http://test.org', text: 'Test', isInternal: false },
        ],
      },
    ];
    const result = extractExternalLinks(parsed);
    expect(result).toHaveLength(2);
    expect(result[0].url).toBe('https://example.com');
    expect(result[1].url).toBe('http://test.org');
  });

  it('should skip internal links', () => {
    const parsed = [
      {
        filePath: 'README.md',
        links: [
          { url: './other.md', text: 'Other', isInternal: true },
          { url: '#heading', text: 'Heading', isInternal: true },
        ],
      },
    ];
    const result = extractExternalLinks(parsed);
    expect(result).toHaveLength(0);
  });

  it('should deduplicate by URL', () => {
    const parsed = [
      {
        filePath: 'a.md',
        links: [
          { url: 'https://example.com', text: 'First', isInternal: false },
        ],
      },
      {
        filePath: 'b.md',
        links: [
          { url: 'https://example.com', text: 'Second', isInternal: false },
        ],
      },
    ];
    const result = extractExternalLinks(parsed);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('First'); // keeps first occurrence
  });

  it('should handle empty input', () => {
    expect(extractExternalLinks([])).toHaveLength(0);
  });

  it('should skip non-http external links', () => {
    const parsed = [
      {
        filePath: 'README.md',
        links: [
          { url: 'mailto:test@example.com', text: 'Email', isInternal: false },
          { url: 'ftp://files.example.com', text: 'FTP', isInternal: false },
        ],
      },
    ];
    const result = extractExternalLinks(parsed);
    expect(result).toHaveLength(0);
  });
});
