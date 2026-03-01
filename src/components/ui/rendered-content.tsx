"use client";

import { useMemo } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { cn } from "@/utils/cn";

const HTML_TAG_RE = /<\/?[a-z][\s\S]*?>/i;
const MARKDOWN_SIGNALS: RegExp[] = [
  /!\[[^\]]*]\([^)]+\)/, // image or badge
  /\[[^\]]+]\([^)]+\)/, // link
  /(^|\s)#{2,6}\s/, // heading
  /(^|\s)>\s/, // quote
  /(^|\s)-\s/, // list
];

function looksLikeFlattenedMarkdown(raw: string): boolean {
  if (HTML_TAG_RE.test(raw)) return false;
  const score = MARKDOWN_SIGNALS.reduce((acc, re) => (re.test(raw) ? acc + 1 : acc), 0);
  const hasFewLineBreaks = raw.split(/\r?\n/).length <= 3;
  return score >= 2 && hasFewLineBreaks;
}

function normalizeFlattenedMarkdown(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+(?=#{2,6}\s)/g, "\n\n")
    .replace(/[ \t]+(?=\[[^\]]+]\([^)]+\):)/g, "\n\n")
    .replace(/\)\s+(?=!\[)/g, ")\n")
    .replace(/\)\s+(?=\[[^\]]+]\([^)]+\)\s*:)/g, ")\n\n")
    .replace(/\s+>\s+/g, "\n> ")
    .replace(/>\s+>/g, ">\n>")
    .replace(/>\s+-\s+/g, ">\n- ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function renderRichContent(raw: string): string {
  const normalized = looksLikeFlattenedMarkdown(raw) ? normalizeFlattenedMarkdown(raw) : raw;
  const isHtml = HTML_TAG_RE.test(raw);
  const html = isHtml ? normalized : (marked.parse(normalized, { async: false }) as string);
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "h1","h2","h3","h4","h5","h6","p","br","hr","ul","ol","li",
      "a","strong","em","b","i","code","pre","blockquote",
      "table","thead","tbody","tr","th","td","img","del","s","sup","sub","span","div",
    ],
    ALLOWED_ATTR: ["href","target","rel","src","alt","title","class"],
  });
}

export function RenderedContent({ content, className }: { content: string; className?: string }) {
  const html = useMemo(() => renderRichContent(content), [content]);
  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none",
        "prose-headings:text-sm prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1",
        "prose-p:text-xs prose-p:leading-relaxed prose-p:my-1",
        "prose-li:text-xs prose-li:my-0",
        "prose-code:text-xs prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded",
        "prose-pre:text-xs prose-pre:bg-muted prose-pre:p-2 prose-pre:rounded-md",
        "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
        "prose-img:max-w-full prose-img:rounded",
        className
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
