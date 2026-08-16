import { visit } from 'unist-util-visit';
import type { Element, ElementContent, Root, RootContent } from 'hast';
import { codeBlockClasses as c } from './code-block-classes';
import { COPY_LABEL } from './copy-button';

/**
 * Restructures Shiki's markdown output into the CodeBlock anatomy (§7.9):
 * a header strip (language label + copy control) over a body where every
 * source line is its own block element.
 *
 * Astro's markdown pipeline runs Shiki before the plugins in
 * `markdown.rehypePlugins`, so by the time this runs, each fenced code
 * block is already `<pre class="astro-code" data-language="…"><code>` with
 * one `<span class="line">` per line, holding Shiki's own colour spans.
 * Shiki's own hast output stores classes on `properties.class` (a string),
 * not the usual hast `properties.className` (an array) — `classesOf` below
 * reads both so this still works if that ever changes.
 *
 * This plugin does not touch tokenising or colour — it only regroups the
 * inline line spans into block-level `<div>`s and adds the chrome around
 * them. Token colour is remapped from Shiki's inline `--astro-code-*`
 * variables to CONSOLE's ink/accent tokens in `src/styles/code-vars.css`.
 */
export function rehypeCodeBlock() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element, index, parent) => {
      if (!isShikiPre(node) || parent === undefined || index === undefined) return;

      const code = node.children.find(
        (child): child is Element => child.type === 'element' && child.tagName === 'code'
      );
      if (!code) return;

      const lineSpans = code.children.filter(isLineSpan);
      if (lineSpans.length === 0) return;

      const lang = typeof node.properties?.dataLanguage === 'string' ? node.properties.dataLanguage : '';
      const rawSource = lineSpans.map(lineText).join('\n');

      code.children = lineSpans.map((line, i): Element => ({
        type: 'element',
        tagName: 'div',
        properties: { className: [...classNameTokens(c.line)] },
        children: [
          {
            type: 'element',
            tagName: 'span',
            properties: { className: [...classNameTokens(c.lineNumber)] },
            children: [{ type: 'text', value: String(i + 1) }],
          },
          {
            type: 'element',
            tagName: 'span',
            properties: {},
            // An empty line still needs a text node — a non-breaking space —
            // or the block collapses to zero height and the baseline count
            // (the test this plugin exists for) goes dishonest.
            children: line.children.length > 0 ? line.children : [{ type: 'text', value: '\u00A0' }],
          },
        ],
      }));

      node.properties = {
        ...node.properties,
        className: [...classesOf(node), ...classNameTokens(c.pre)],
      };
      delete node.properties.class;

      const figure: Element = {
        type: 'element',
        tagName: 'figure',
        properties: { className: [...classNameTokens(c.figure)] },
        children: [
          {
            type: 'element',
            tagName: 'figcaption',
            properties: { className: [...classNameTokens(c.header)] },
            children: [
              {
                type: 'element',
                tagName: 'span',
                properties: { className: [...classNameTokens(c.label)] },
                children: [{ type: 'text', value: lang.toUpperCase() }],
              },
              {
                type: 'element',
                tagName: 'button',
                properties: {
                  type: 'button',
                  className: [...classNameTokens(c.copyButton)],
                  dataCopy: '',
                  dataCopySource: '',
                  dataCode: rawSource,
                },
                children: [{ type: 'text', value: COPY_LABEL }],
              },
            ],
          },
          node,
        ],
      };

      (parent as Root).children[index] = figure as RootContent;
    });
  };
}

function isShikiPre(node: Element): boolean {
  return node.tagName === 'pre' && classesOf(node).includes('astro-code');
}

function isLineSpan(node: ElementContent): node is Element {
  return node.type === 'element' && node.tagName === 'span' && classesOf(node).includes('line');
}

/** Reads an element's classes whether Shiki stored them as `class` (string) or hast's own `className` (array). */
function classesOf(node: Element): string[] {
  const className = node.properties?.className;
  if (Array.isArray(className)) return className.map(String);
  const klass = node.properties?.class;
  if (typeof klass === 'string') return klass.split(/\s+/).filter(Boolean);
  return [];
}

function classNameTokens(value: string): string[] {
  return value.split(/\s+/).filter(Boolean);
}

function lineText(node: Element): string {
  return node.children.map(textOf).join('');
}

function textOf(node: ElementContent): string {
  if (node.type === 'text') return node.value;
  if (node.type === 'element') return node.children.map(textOf).join('');
  return '';
}
