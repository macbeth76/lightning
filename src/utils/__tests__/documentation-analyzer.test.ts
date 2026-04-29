/**
 * Tests for DocumentationAnalyzer
 */

import * as fs from 'fs';
import * as path from 'path';
import { DocumentationAnalyzer, analyzeDocumentation } from '../documentation-analyzer';

describe('DocumentationAnalyzer', () => {
  const testDir = path.join(__dirname, '..', '__tests__', 'docs-test');

  beforeAll(() => {
    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Cleanup is handled by jest
  });

  describe('parseSections', () => {
    it('should parse markdown sections correctly', () => {
      const content = `# Main Title

## Section 1
Some content here.

## Section 2
More content here.

### Subsection 2.1
Nested content.
`;

      const testFile = path.join(testDir, 'test-parse.md');
      fs.writeFileSync(testFile, content);

      const analyzer = new DocumentationAnalyzer(testFile);
      const sections = analyzer.parseSections();

      expect(sections).toHaveLength(4); // Main Title, Section 1, Section 2, Subsection 2.1
      expect(sections[0].name).toBe('Main Title');
      expect(sections[0].level).toBe(1);
      expect(sections[1].name).toBe('Section 1');
      expect(sections[2].name).toBe('Section 2');
    });

    it('should count blocks correctly (~10-15 words = 1 block)', () => {
      const content = `## Section

${'word '.repeat(50)}
`;

      const testFile = path.join(testDir, 'test-blocks.md');
      fs.writeFileSync(testFile, content);

      const analyzer = new DocumentationAnalyzer(testFile);
      const sections = analyzer.parseSections();

      expect(sections).toHaveLength(1);
      // 50 words / 12.5 avg = ~4 blocks
      expect(sections[0].blocks).toBeGreaterThan(3);
      expect(sections[0].blocks).toBeLessThan(6);
    });

    it('should track section line ranges', () => {
      const content = `## Section 1
Line 2 of content

## Section 2
Line 5 of content
`;

      const testFile = path.join(testDir, 'test-lines.md');
      fs.writeFileSync(testFile, content);

      const analyzer = new DocumentationAnalyzer(testFile);
      const sections = analyzer.parseSections();

      expect(sections[0].startLine).toBe(0);
      expect(sections[0].endLine).toBeGreaterThanOrEqual(1);
      expect(sections[1].startLine).toBeGreaterThan(sections[0].startLine);
    });
  });

  describe('extractInternalLinks', () => {
    it('should extract internal links [text](#section)', () => {
      const content = `## Overview

See [Getting Started](#getting-started) and [Installation](#installation).

## Getting Started

Content here.
`;

      const testFile = path.join(testDir, 'test-internal-links.md');
      fs.writeFileSync(testFile, content);

      const analyzer = new DocumentationAnalyzer(testFile);
      const sections = analyzer.parseSections();

      const overviewSection = sections.find(s => s.name === 'Overview');
      expect(overviewSection).toBeDefined();
      expect(overviewSection!.internalLinks).toHaveLength(2);
      expect(overviewSection!.internalLinks[0].text).toBe('Getting Started');
      expect(overviewSection!.internalLinks[0].target).toBe('getting-started');
    });

    it('should handle links with spaces in section names', () => {
      const content = `## Overview

See [Feature List](#feature-list).

## Feature List
Content.
`;

      const testFile = path.join(testDir, 'test-link-spaces.md');
      fs.writeFileSync(testFile, content);

      const analyzer = new DocumentationAnalyzer(testFile);
      const sections = analyzer.parseSections();

      const overviewSection = sections.find(s => s.name === 'Overview');
      expect(overviewSection!.internalLinks[0].target).toBe('feature-list');
    });
  });

  describe('buildGraph', () => {
    it('should build adjacency lists correctly', () => {
      const content = `## Overview
Check [Installation](#installation).

## Installation
See [Getting Started](#getting-started).

## Getting Started
Content.
`;

      const testFile = path.join(testDir, 'test-graph.md');
      fs.writeFileSync(testFile, content);

      const analyzer = new DocumentationAnalyzer(testFile);
      analyzer.parseSections();
      const graph = analyzer.buildGraph();

      expect(graph.adjacency.get('Overview')).toContain('Installation');
      expect(graph.adjacency.get('Installation')).toContain('Getting Started');
      expect(graph.reverseAdjacency.get('Installation')).toContain('Overview');
    });

    it('should detect cycles', () => {
      const content = `## A
Check [B](#b).

## B
Check [C](#c).

## C
Check [A](#a).
`;

      const testFile = path.join(testDir, 'test-cycles.md');
      fs.writeFileSync(testFile, content);

      const analyzer = new DocumentationAnalyzer(testFile);
      analyzer.parseSections();
      const graph = analyzer.buildGraph();

      expect(graph.cycles.length).toBeGreaterThan(0);
    });

    it('should detect orphaned sections', () => {
      const content = `## Overview
Check [Installation](#installation).

## Installation
Content.

## Orphaned Section
Isolated content with no links.
`;

      const testFile = path.join(testDir, 'test-orphaned.md');
      fs.writeFileSync(testFile, content);

      const analyzer = new DocumentationAnalyzer(testFile);
      analyzer.parseSections();
      const graph = analyzer.buildGraph();

      expect(graph.orphanedSections).toContain('Orphaned Section');
    });

    it('should not mark Overview as orphaned', () => {
      const content = `## Overview
Introductory content. See [Other Section](#other-section).

## Other Section
More content. See [Overview](#overview).
`;

      const testFile = path.join(testDir, 'test-overview-not-orphaned.md');
      fs.writeFileSync(testFile, content);

      const analyzer = new DocumentationAnalyzer(testFile);
      analyzer.parseSections();
      const graph = analyzer.buildGraph();

      expect(graph.orphanedSections).not.toContain('Overview');
    });
  });

  describe('section length violations', () => {
    it('should detect sections exceeding 24 blocks', () => {
      const longContent = `## Long Section
${'word '.repeat(400)}
`;

      const testFile = path.join(testDir, 'test-section-length.md');
      fs.writeFileSync(testFile, longContent);

      const analyzer = new DocumentationAnalyzer(testFile);
      const violations = analyzer.analyze();

      const lengthViolations = violations.filter(v => v.rule === 'section-length');
      expect(lengthViolations.length).toBeGreaterThan(0);
    });

    it('should not flag sections under 24 blocks', () => {
      const content = `## Short Section
${'word '.repeat(100)}
`;

      const testFile = path.join(testDir, 'test-short-section.md');
      fs.writeFileSync(testFile, content);

      const analyzer = new DocumentationAnalyzer(testFile);
      const violations = analyzer.analyze();

      const lengthViolations = violations.filter(v => v.rule === 'section-length');
      expect(lengthViolations).toHaveLength(0);
    });
  });

  describe('broken links', () => {
    it('should detect broken external links', () => {
      const content = `## Overview
See [Documentation](../docs/nonexistent.md).
`;

      const testFile = path.join(testDir, 'test-broken-links.md');
      fs.writeFileSync(testFile, content);

      const analyzer = new DocumentationAnalyzer(testFile);
      const violations = analyzer.analyze();

      const brokenLinks = violations.filter(v => v.rule === 'broken-link');
      expect(brokenLinks.length).toBeGreaterThan(0);
    });

    it('should not flag existing external links', () => {
      // Create a test docs file
      const docsDir = path.join(testDir, 'docs');
      if (!fs.existsSync(docsDir)) {
        fs.mkdirSync(docsDir, { recursive: true });
      }

      fs.writeFileSync(path.join(docsDir, 'test.md'), '# Test');

      const content = `## Overview
See [Documentation](./docs/test.md).
`;

      const testFile = path.join(testDir, 'test-valid-links.md');
      fs.writeFileSync(testFile, content);

      const analyzer = new DocumentationAnalyzer(testFile);
      const violations = analyzer.analyze();

      const brokenLinks = violations.filter(v => v.rule === 'broken-link');
      expect(brokenLinks).toHaveLength(0);
    });
  });

  describe('table of contents', () => {
    it('should detect missing TOC for large documents', () => {
      const content = `## Section 1
Content.

## Section 2
Content.

## Section 3
Content.

## Section 4
Content.

## Section 5
Content.

## Section 6
Content.
`;

      const testFile = path.join(testDir, 'test-no-toc.md');
      fs.writeFileSync(testFile, content);

      const analyzer = new DocumentationAnalyzer(testFile);
      const violations = analyzer.analyze();

      const tocViolations = violations.filter(v => v.rule === 'missing-toc');
      expect(tocViolations.length).toBeGreaterThan(0);
    });

    it('should not flag missing TOC for small documents', () => {
      const content = `## Section 1
Content.

## Section 2
Content.
`;

      const testFile = path.join(testDir, 'test-small-doc.md');
      fs.writeFileSync(testFile, content);

      const analyzer = new DocumentationAnalyzer(testFile);
      const violations = analyzer.analyze();

      const tocViolations = violations.filter(v => v.rule === 'missing-toc');
      expect(tocViolations).toHaveLength(0);
    });

    it('should recognize various TOC headers', () => {
      const testCases = [
        '## Table of Contents\nContent.',
        '## Contents\nContent.',
        '## TOC\nContent.',
        '## contents\nContent.', // case insensitive
      ];

      for (const content of testCases) {
        const testFile = path.join(testDir, `test-toc-${Math.random()}.md`);
        fs.writeFileSync(testFile, content);

        const analyzer = new DocumentationAnalyzer(testFile);
        expect(analyzer.hasTableOfContents()).toBe(true);
      }
    });
  });

  describe('analyze', () => {
    it('should return violations in correct format', () => {
      const content = `## Section 1
${'word '.repeat(400)}

## Orphaned
No links here.
`;

      const testFile = path.join(testDir, 'test-violations.md');
      fs.writeFileSync(testFile, content);

      const analyzer = new DocumentationAnalyzer(testFile);
      const violations = analyzer.analyze();

      expect(violations).toHaveLength(3); // section-length, orphaned, missing-toc
      expect(violations[0]).toHaveProperty('rule');
      expect(violations[0]).toHaveProperty('message');
      expect(violations[0]).toHaveProperty('file');
      expect(violations[0]).toHaveProperty('line');
    });
  });

  describe('getSummary', () => {
    it('should provide accurate summary statistics', () => {
      const content = `## Overview
Content.

## Section 2
Content.

## Section 3
Content.
`;

      const testFile = path.join(testDir, 'test-summary.md');
      fs.writeFileSync(testFile, content);

      const analyzer = new DocumentationAnalyzer(testFile);
      analyzer.parseSections();

      const summary = analyzer.getSummary();

      expect(summary.totalSections).toBe(3);
      expect(summary.totalBlocks).toBeGreaterThan(0);
      expect(summary.orphanedSections).toBeGreaterThanOrEqual(0);
      expect(summary.cycles).toBe(0);
    });
  });

  describe('exportGraph', () => {
    it('should generate ASCII graph visualization', () => {
      const content = `## Overview
Check [Installation](#installation).

## Installation
Content.
`;

      const testFile = path.join(testDir, 'test-export.md');
      fs.writeFileSync(testFile, content);

      const analyzer = new DocumentationAnalyzer(testFile);
      analyzer.parseSections();
      analyzer.buildGraph();

      const graph = analyzer.exportGraph();

      expect(graph).toContain('# Documentation Graph');
      expect(graph).toContain('## Overview');
      expect(graph).toContain('## Installation');
      expect(graph).toContain('links to');
    });
  });

  describe('analyzeDocumentation function', () => {
    it('should analyze README.md', async () => {
      const content = `## Section 1
Content.`;

      const testFile = path.join(testDir, 'README.md');
      fs.writeFileSync(testFile, content);

      const violations = await analyzeDocumentation(testFile);

      expect(Array.isArray(violations)).toBe(true);
    });

    it('should analyze docs directory', async () => {
      const docsDir = path.join(testDir, 'docs-analyze');
      if (!fs.existsSync(docsDir)) {
        fs.mkdirSync(docsDir, { recursive: true });
      }

      fs.writeFileSync(path.join(docsDir, 'guide.md'), '## Guide\nContent.');

      const violations = await analyzeDocumentation(
        path.join(testDir, 'README.md'),
        docsDir
      );

      expect(Array.isArray(violations)).toBe(true);
    });
  });

  describe('CRUD scenario', () => {
    it('should analyze CRUD documentation properly', () => {
      const crudContent = `# CRUD Operations Guide

## Overview
This guide covers Create, Read, Update, and Delete operations.

## Create Operations
To create a new resource, use the POST endpoint. See [API Details](#api-details).

${'Implementation details with lots of content: '.repeat(100)}

## Read Operations
Read operations use GET endpoints. See [Query Syntax](#query-syntax).

## Update Operations
Update operations use PUT or PATCH endpoints.

## Delete Operations
Delete operations use DELETE endpoints.

## API Details
Complete API reference for all endpoints. See [Create Operations](#create-operations).

## Query Syntax
Query syntax for filtering and pagination.

## Performance Considerations
Optimization tips for CRUD operations.
`;

      const testFile = path.join(testDir, 'scenario-crud.md');
      fs.writeFileSync(testFile, crudContent);

      const analyzer = new DocumentationAnalyzer(testFile);
      const violations = analyzer.analyze();

      // Should have section-length violation for Create Operations
      const lengthViolations = violations.filter(v => v.rule === 'section-length');
      expect(lengthViolations.length).toBeGreaterThan(0);
    });
  });

  describe('clean scenario', () => {
    it('should validate perfect doc structure', () => {
      const cleanContent = `# Project Documentation

## Table of Contents
- [Overview](#overview)
- [Installation](#installation)
- [Usage](#usage)

## Overview
This is a well-structured project. See [Installation](#installation).

## Installation
Follow these steps. See [Usage](#usage).

## Usage
See [Installation](#installation) for setup.
`;

      const testFile = path.join(testDir, 'scenario-clean.md');
      fs.writeFileSync(testFile, cleanContent);

      const analyzer = new DocumentationAnalyzer(testFile);
      const violations = analyzer.analyze();

      // Should have TOC and no orphaned sections
      const tocViolations = violations.filter(v => v.rule === 'missing-toc');
      expect(tocViolations).toHaveLength(0);

      const orphanedViolations = violations.filter(v => v.rule === 'orphaned-section');
      expect(orphanedViolations).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty document', () => {
      const testFile = path.join(testDir, 'test-empty.md');
      fs.writeFileSync(testFile, '');

      const analyzer = new DocumentationAnalyzer(testFile);
      const sections = analyzer.parseSections();

      expect(sections).toHaveLength(0);
    });

    it('should handle document with no sections', () => {
      const content = 'Just some plain text without any markdown headers.';

      const testFile = path.join(testDir, 'test-no-sections.md');
      fs.writeFileSync(testFile, content);

      const analyzer = new DocumentationAnalyzer(testFile);
      const sections = analyzer.parseSections();

      expect(sections).toHaveLength(0);
    });

    it('should handle special characters in section names', () => {
      const content = `## Section & Special (Characters)
Content with links to [API Reference](#api-reference).

## API Reference
API details.
`;

      const testFile = path.join(testDir, 'test-special-chars.md');
      fs.writeFileSync(testFile, content);

      const analyzer = new DocumentationAnalyzer(testFile);
      const sections = analyzer.parseSections();

      expect(sections).toHaveLength(2);
      expect(sections[0].name).toContain('Special');
    });

    it('should handle very long section names', () => {
      const longName = 'A'.repeat(100);
      const content = `## ${longName}
Content.`;

      const testFile = path.join(testDir, 'test-long-name.md');
      fs.writeFileSync(testFile, content);

      const analyzer = new DocumentationAnalyzer(testFile);
      const sections = analyzer.parseSections();

      expect(sections).toHaveLength(1);
      expect(sections[0].name.length).toBe(100);
    });
  });
});
