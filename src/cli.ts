#!/usr/bin/env node
// CLI Entry Point for Documentation Consistency Analyzer

import { discoverFiles } from './lib/input/file-discovery';
import { parseMarkdownFiles } from './lib/parse/markdown-parser';
import { validateLinks } from './lib/analyze/link-validator';
import { exportToJSON, exportGroupedByFile } from './lib/output/json-formatter';
import configData from '../config.json';

async function main() {
  const args = process.argv.slice(2);
  const targetPath = args[0] || process.cwd();

  console.log('Documentation Consistency Analyzer - MVP v0.1.0');
  console.log('='.repeat(50));
  console.log(`\nAnalyzing: ${targetPath}\n`);

  try {
    // Step 1: Discover files
    console.log('Step 1: Discovering files...');
    let startTime = Date.now();

    const files = await discoverFiles(targetPath, configData.excluded.patterns);

    let duration = Date.now() - startTime;
    console.log(`✓ Found ${files.length} files in ${duration}ms\n`);

    // Display file summary
    const byType = files.reduce((acc, file) => {
      acc[file.fileType] = (acc[file.fileType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('File Summary:');
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} files`);
    });

    // Step 2: Parse Markdown files
    console.log('\nStep 2: Parsing Markdown files...');
    startTime = Date.now();

    const parsedMarkdown = await parseMarkdownFiles(files);

    duration = Date.now() - startTime;
    console.log(`✓ Parsed ${parsedMarkdown.length} Markdown files in ${duration}ms\n`);

    // Display parsing summary
    const totalLinks = parsedMarkdown.reduce((sum, md) => sum + md.links.length, 0);
    const totalHeadings = parsedMarkdown.reduce((sum, md) => sum + md.headings.length, 0);
    const internalLinks = parsedMarkdown.reduce(
      (sum, md) => sum + md.links.filter(l => l.isInternal).length,
      0
    );
    const externalLinks = totalLinks - internalLinks;

    console.log('Parsing Summary:');
    console.log(`  Total links found: ${totalLinks}`);
    console.log(`    - Internal links: ${internalLinks}`);
    console.log(`    - External links: ${externalLinks}`);
    console.log(`  Total headings: ${totalHeadings}`);

    // Show detailed results for each file
    console.log('\nParsed Markdown files:');
    parsedMarkdown.forEach(md => {
      console.log(`\n  ${md.filePath}`);
      console.log(`    Links: ${md.links.length} (${md.links.filter(l => l.isInternal).length} internal)`);
      console.log(`    Headings: ${md.headings.length}`);

      if (md.links.length > 0) {
        console.log(`    Sample links:`);
        md.links.slice(0, 3).forEach(link => {
          const type = link.isInternal ? 'internal' : 'external';
          console.log(`      - [${link.text}](${link.url}) [${type}]`);
        });
      }
    });

    // Step 3: Validate links
    console.log('\nStep 3: Validating links...');
    startTime = Date.now();

    const inconsistencies = await validateLinks(parsedMarkdown, targetPath);

    duration = Date.now() - startTime;
    console.log(`✓ Validated ${totalLinks} links in ${duration}ms\n`);

    // Display validation results
    console.log('Validation Results:');
    console.log(`  Total inconsistencies found: ${inconsistencies.length}`);

    const bySeverity = inconsistencies.reduce((acc, inc) => {
      acc[inc.severity] = (acc[inc.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    if (Object.keys(bySeverity).length > 0) {
      console.log('  By severity:');
      Object.entries(bySeverity).forEach(([severity, count]) => {
        console.log(`    - ${severity}: ${count}`);
      });
    }

    // Show detailed inconsistencies
    if (inconsistencies.length > 0) {
      console.log('\nDetailed Issues:');
      inconsistencies.forEach((inc, index) => {
        console.log(`\n  ${index + 1}. [${inc.severity.toUpperCase()}] ${inc.message}`);
        console.log(`     File: ${inc.location.filePath}:${inc.location.lineNumber || '?'}`);
        if (inc.context) {
          console.log(`     Context: ${inc.context}`);
        }
        if (inc.suggestion) {
          console.log(`     Suggestion: ${inc.suggestion}`);
        }
      });
    } else {
      console.log('\n  ✓ No broken links found! All links are valid.');
    }

    // Step 4: Export results to JSON
    console.log('\nStep 4: Exporting results...');
    startTime = Date.now();

    const jsonPath = await exportToJSON(
      inconsistencies,
      {
        projectPath: targetPath,
        totalFiles: files.length,
        totalMarkdownFiles: parsedMarkdown.length,
        totalLinks: totalLinks,
      }
    );

    const groupedPath = await exportGroupedByFile(inconsistencies);

    duration = Date.now() - startTime;
    console.log(`✓ Exported results in ${duration}ms`);
    console.log(`  Full report: ${jsonPath}`);
    console.log(`  Grouped by file: ${groupedPath}`);

    console.log('\n' + '='.repeat(50));
    console.log('Analysis complete!');
    console.log(`\nSummary:`);
    console.log(`  Files analyzed: ${files.length}`);
    console.log(`  Markdown files: ${parsedMarkdown.length}`);
    console.log(`  Links checked: ${totalLinks}`);
    console.log(`  Issues found: ${inconsistencies.length}`);

    if (inconsistencies.length > 0) {
      console.log(`\nNext steps:`);
      console.log(`  1. Review the exported JSON files above`);
      console.log(`  2. The "grouped by file" report is sorted by files with most issues`);
      console.log(`  3. Fix issues starting with the highest severity`);
      console.log(`  4. Run the analyzer again to verify fixes`);
    }

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();
