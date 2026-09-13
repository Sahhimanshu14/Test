'use client';

import React, { useMemo } from 'react';
import katex from 'katex';

export interface MathRendererProps {
  content: string;
  className?: string;
}

export function MathRenderer({ content, className = '' }: MathRendererProps) {
  const renderedHtml = useMemo(() => {
    if (!content) return '';

    // Fast-path bailout: If no math delimiters exist, bypass regex tokenization and KaTeX
    if (!content.includes('$') && !content.includes('\\')) {
      return content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br/>');
    }

    // Tokenize text into math blocks and non-math blocks
    // Supports $$...$$, \[...\], $...$, \(...\)
    const regex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[^\$\n]+?\$|\\\([\s\S]*?\\\))/g;
    const parts = content.split(regex);

    return parts
      .map((part) => {
        if (!part) return '';

        // Display math ($$...$$ or \[...\])
        if (
          (part.startsWith('$$') && part.endsWith('$$')) ||
          (part.startsWith('\\[') && part.endsWith('\\]'))
        ) {
          const math = part.startsWith('$$')
            ? part.slice(2, -2)
            : part.slice(2, -2);
          try {
            return `<div class="katex-display-wrapper my-2 overflow-x-auto text-center">${katex.renderToString(
              math.trim(),
              {
                displayMode: true,
                throwOnError: false,
              }
            )}</div>`;
          } catch {
            return `<code>${part}</code>`;
          }
        }

        // Inline math ($...$ or \(...\))
        if (
          (part.startsWith('$') && part.endsWith('$')) ||
          (part.startsWith('\\(') && part.endsWith('\\)'))
        ) {
          const math = part.startsWith('$')
            ? part.slice(1, -1)
            : part.slice(2, -2);
          try {
            return `<span class="katex-inline-wrapper">${katex.renderToString(
              math.trim(),
              {
                displayMode: false,
                throwOnError: false,
              }
            )}</span>`;
          } catch {
            return `<code>${part}</code>`;
          }
        }

        // Plain text: escape angle brackets and convert linebreaks to <br/>
        const escaped = part
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        return escaped.replace(/\n/g, '<br />');
      })
      .join('');
  }, [content]);

  return (
    <div
      className={`math-content font-sans leading-relaxed text-slate-200 ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
}
