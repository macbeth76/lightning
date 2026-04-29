/**
 * Documentation Analyzer: Analyzes README.md and docs/ for structure violations
 * 
 * Treats README.md as a single document with sections as graph nodes.
 * Each section has a 24-block maximum (~300 words).
 * Detects orphaned sections, circular references, broken links, and TOC issues.
 */

import * as fs from 'fs';
import * as path from 'path';
import { Violation } from '../types/violations';

export interface DocumentationViolation extends Violation {
  sectionName?: string;
  graph?: string; // ASCII graph visualization
  rule: 'section-length' | 'orphaned-section' | 'circular-reference' | 'broken-link' | 'missing-toc';
}

export interface Section {
  name: string;
  level: number;
  startLine: number;
  endLine: number;
  content: string;
  blocks: number;
  internalLinks: Link[];
  externalLinks: Link[];
}

export interface Link {
  text: string;
  target: string;
  line: number;
  isInternal: boolean; // true for #section, false for ../docs/file.md
}

export interface DocumentationGraph {
  sections: Map<string, Section>;
  adjacency: Map<string, Set<string>>; // section -> linked sections
  reverseAdjacency: Map<string, Set<string>>; // section -> sections linking to it
  cycles: string[][]; // list of cycles found
  orphanedSections: Set<string>;
}

export class DocumentationAnalyzer {
  private content: string;
  private filePath: string;
  private sections: Section[] = [];
  private graph: DocumentationGraph;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.content = fs.readFileSync(filePath, 'utf-8');
    this.graph = {
      sections: new Map(),
      adjacency: new Map(),
      reverseAdjacency: new Map(),
      cycles: [],
      orphanedSections: new Set(),
    };
  }

  /**
   * Count approximate blocks in text (~10-15 words = 1 block)
   */
  private countBlocks(text: string): number {
    const words = text.split(/\s+/).filter(w => w.length > 0).length;
    const avgWordsPerBlock = 12.5;
    return Math.ceil(words / avgWordsPerBlock);
  }

  /**
   * Parse README.md into sections
   */
  parseSections(): Section[] {
    const lines = this.content.split('\n');
    const sections: Section[] = [];
    let currentSection: Partial<Section> | null = null;
    let currentContent: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

      if (headingMatch) {
        // Save previous section
        if (currentSection) {
          currentSection.endLine = i - 1;
          currentSection.content = currentContent.join('\n');
          currentSection.blocks = this.countBlocks(currentSection.content);
          currentSection.internalLinks = this.extractInternalLinks(currentSection.content, i);
          currentSection.externalLinks = this.extractExternalLinks(currentSection.content, i);
          sections.push(currentSection as Section);
        }

        // Start new section
        const level = headingMatch[1].length;
        const name = headingMatch[2].trim();
        currentSection = {
          name,
          level,
          startLine: i,
          endLine: -1,
        };
        currentContent = [];
      } else if (currentSection) {
        currentContent.push(line);
      }
    }

    // Save last section
    if (currentSection) {
      currentSection.endLine = lines.length - 1;
      currentSection.content = currentContent.join('\n');
      currentSection.blocks = this.countBlocks(currentSection.content);
      currentSection.internalLinks = this.extractInternalLinks(currentSection.content, lines.length);
      currentSection.externalLinks = this.extractExternalLinks(currentSection.content, lines.length);
      sections.push(currentSection as Section);
    }

    this.sections = sections;
    return sections;
  }

  /**
   * Extract internal links [text](#section-name)
   */
  private extractInternalLinks(content: string, baseLine: number): Link[] {
    const links: Link[] = [];
    const pattern = /\[([^\]]+)\]\(#([^)]+)\)/g;
    let match;

    while ((match = pattern.exec(content)) !== null) {
      links.push({
        text: match[1],
        target: match[2],
        line: baseLine + (content.substring(0, match.index).match(/\n/g) || []).length,
        isInternal: true,
      });
    }

    return links;
  }

  /**
   * Extract external links [text](../docs/file.md)
   */
  private extractExternalLinks(content: string, baseLine: number): Link[] {
    const links: Link[] = [];
    const pattern = /\[([^\]]+)\]\((\.\.[^)]+)\)/g;
    let match;

    while ((match = pattern.exec(content)) !== null) {
      links.push({
        text: match[1],
        target: match[2],
        line: baseLine + (content.substring(0, match.index).match(/\n/g) || []).length,
        isInternal: false,
      });
    }

    return links;
  }

  /**
   * Build the documentation graph
   */
  buildGraph(): DocumentationGraph {
    this.graph.sections.clear();
    this.graph.adjacency.clear();
    this.graph.reverseAdjacency.clear();

    // Add all sections to graph
    for (const section of this.sections) {
      this.graph.sections.set(section.name, section);
      this.graph.adjacency.set(section.name, new Set());
      this.graph.reverseAdjacency.set(section.name, new Set());
    }

    // Build adjacency lists from links
    for (const section of this.sections) {
      for (const link of section.internalLinks) {
        const targetKey = this.normalizeAnchor(link.target);
        const sectionKey = this.findSectionByName(targetKey);

        if (sectionKey) {
          this.graph.adjacency.get(section.name)?.add(sectionKey);
          this.graph.reverseAdjacency.get(sectionKey)?.add(section.name);
        }
      }
    }

    // Detect cycles
    this.detectCycles();

    // Detect orphaned sections
    this.detectOrphanedSections();

    return this.graph;
  }

  /**
   * Normalize anchor: "My Section" -> "my-section"
   */
  private normalizeAnchor(anchor: string): string {
    return anchor
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Find section name matching normalized anchor
   */
  private findSectionByName(normalizedAnchor: string): string | null {
    for (const section of this.sections) {
      if (this.normalizeAnchor(section.name) === normalizedAnchor) {
        return section.name;
      }
    }
    return null;
  }

  /**
   * Detect cycles using DFS
   */
  private detectCycles(): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    for (const section of this.sections) {
      if (!visited.has(section.name)) {
        this.dfsCycle(section.name, visited, recursionStack, []);
      }
    }
  }

  private dfsCycle(
    node: string,
    visited: Set<string>,
    recursionStack: Set<string>,
    path: string[]
  ): void {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    const neighbors = this.graph.adjacency.get(node) || new Set();

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        this.dfsCycle(neighbor, visited, recursionStack, path);
      } else if (recursionStack.has(neighbor)) {
        // Cycle found
        const cycleStart = path.indexOf(neighbor);
        const cycle = path.slice(cycleStart);
        cycle.push(neighbor);
        this.graph.cycles.push(cycle);
      }
    }

    path.pop();
    recursionStack.delete(node);
  }

  /**
   * Detect orphaned sections (no incoming or outgoing links)
   */
  private detectOrphanedSections(): void {
    for (const sectionName of this.graph.sections.keys()) {
      const section = this.graph.sections.get(sectionName);
      const outgoing = this.graph.adjacency.get(sectionName) || new Set();
      const incoming = this.graph.reverseAdjacency.get(sectionName) || new Set();

      // Skip level 1 headings (document title) and sections with links
      if (outgoing.size === 0 && incoming.size === 0 && section && section.level > 1) {
        this.graph.orphanedSections.add(sectionName);
      }
    }
  }

  /**
   * Check for table of contents
   */
  hasTableOfContents(): boolean {
    const tocPatterns = [
      /##\s*table\s*of\s*contents/i,
      /##\s*contents/i,
      /##\s*toc/i,
    ];

    return tocPatterns.some(pattern => pattern.test(this.content));
  }

  /**
   * Check for broken external links
   */
  checkBrokenLinks(): Link[] {
    const broken: Link[] = [];

    for (const section of this.sections) {
      for (const link of section.externalLinks) {
        const resolvedPath = path.resolve(
          path.dirname(this.filePath),
          link.target
        );

        if (!fs.existsSync(resolvedPath)) {
          broken.push(link);
        }
      }
    }

    return broken;
  }

  /**
   * Analyze and return all violations
   */
  analyze(): DocumentationViolation[] {
    const violations: DocumentationViolation[] = [];

    // Parse sections
    this.parseSections();

    // Build graph
    this.buildGraph();

    // Check section length violations
    for (const section of this.sections) {
      if (section.blocks > 24) {
        violations.push({
          id: `doc-section-length-${section.name}`,
          type: 'other',
          severity: 'warning',
          file: this.filePath,
          line: section.startLine,
          column: 0,
          message: `Section "${section.name}" exceeds 24 blocks (${section.blocks} blocks)`,
          sectionName: section.name,
          rule: 'section-length',
          graph: this.visualizeSectionGraph(section),
        });
      }
    }

    // Check for orphaned sections
    for (const orphaned of this.graph.orphanedSections) {
      const section = this.graph.sections.get(orphaned);
      if (section) {
        violations.push({
          id: `doc-orphaned-${orphaned}`,
          type: 'other',
          severity: 'info',
          file: this.filePath,
          line: section.startLine,
          column: 0,
          message: `Section "${orphaned}" has no links to or from other sections`,
          sectionName: orphaned,
          rule: 'orphaned-section',
          graph: this.visualizeOrphanedSection(section),
        });
      }
    }

    // Check for circular references
    for (const cycle of this.graph.cycles) {
      const cycleStr = cycle.join(' → ');
      const firstSection = this.graph.sections.get(cycle[0]);
      if (firstSection) {
        violations.push({
          id: `doc-cycle-${cycle.join('-')}`,
          type: 'other',
          severity: 'warning',
          file: this.filePath,
          line: firstSection.startLine,
          column: 0,
          message: `Circular reference detected: ${cycleStr}`,
          sectionName: cycle[0],
          rule: 'circular-reference',
          graph: this.visualizeCycle(cycle),
        });
      }
    }

    // Check for broken links
    const brokenLinks = this.checkBrokenLinks();
    for (const link of brokenLinks) {
      violations.push({
        id: `doc-broken-link-${link.target}`,
        type: 'other',
        severity: 'error',
        file: this.filePath,
        line: link.line,
        column: 0,
        message: `Broken link: [${link.text}](${link.target}) - file not found`,
        rule: 'broken-link',
      });
    }

    // Check for missing TOC
    if (!this.hasTableOfContents() && this.sections.length > 5) {
      violations.push({
        id: 'doc-missing-toc',
        type: 'other',
        severity: 'info',
        file: this.filePath,
        line: 1,
        column: 0,
        message: 'Missing Table of Contents for document with multiple sections',
        rule: 'missing-toc',
      });
    }

    return violations;
  }

  /**
   * Visualize section graph in ASCII
   */
  private visualizeSectionGraph(section: Section): string {
    const outgoing = this.graph.adjacency.get(section.name) || new Set();
    const incoming = this.graph.reverseAdjacency.get(section.name) || new Set();

    let graph = `## ${section.name} [${section.blocks}/24 blocks]\n`;

    if (outgoing.size > 0) {
      graph += `└─→ links to: ${Array.from(outgoing).join(', ')}\n`;
    }

    if (incoming.size > 0) {
      graph += `└─→ linked from: ${Array.from(incoming).join(', ')}\n`;
    }

    return graph;
  }

  /**
   * Visualize orphaned section
   */
  private visualizeOrphanedSection(section: Section): string {
    return `## ${section.name} [orphaned]\n└─→ No links to/from other sections\n`;
  }

  /**
   * Visualize cycle
   */
  private visualizeCycle(cycle: string[]): string {
    let graph = 'Circular reference:\n';

    for (let i = 0; i < cycle.length; i++) {
      graph += `  ${cycle[i]}`;

      if (i < cycle.length - 1) {
        graph += ` → `;
      }

      if ((i + 1) % 3 === 0 && i < cycle.length - 1) {
        graph += `\n`;
      }
    }

    return graph;
  }

  /**
   * Get summary statistics
   */
  getSummary() {
    return {
      totalSections: this.sections.length,
      totalBlocks: this.sections.reduce((sum, s) => sum + s.blocks, 0),
      orphanedSections: this.graph.orphanedSections.size,
      cycles: this.graph.cycles.length,
      hasTableOfContents: this.hasTableOfContents(),
    };
  }

  /**
   * Export ASCII visualization of entire documentation graph
   */
  exportGraph(): string {
    let output = '# Documentation Graph\n\n';

    for (const section of this.sections) {
      output += this.visualizeSectionGraph(section);
    }

    if (this.graph.cycles.length > 0) {
      output += '\n# Circular References\n';
      for (const cycle of this.graph.cycles) {
        output += `- ${cycle.join(' → ')}\n`;
      }
    }

    if (this.graph.orphanedSections.size > 0) {
      output += '\n# Orphaned Sections\n';
      for (const orphaned of this.graph.orphanedSections) {
        output += `- ${orphaned}\n`;
      }
    }

    return output;
  }
}

/**
 * Analyze multiple documentation files
 */
export async function analyzeDocumentation(
  readmePath: string,
  docsDir?: string
): Promise<DocumentationViolation[]> {
  const violations: DocumentationViolation[] = [];

  // Analyze README.md
  if (fs.existsSync(readmePath)) {
    const analyzer = new DocumentationAnalyzer(readmePath);
    violations.push(...analyzer.analyze());
  }

  // Analyze docs/ directory
  if (docsDir && fs.existsSync(docsDir)) {
    const files = fs.readdirSync(docsDir);

    for (const file of files) {
      if (file.endsWith('.md')) {
        const filePath = path.join(docsDir, file);
        const analyzer = new DocumentationAnalyzer(filePath);
        violations.push(...analyzer.analyze());
      }
    }
  }

  return violations;
}
