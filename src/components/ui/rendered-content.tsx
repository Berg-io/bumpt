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

// CI / shields badges from READMEs carry no information here and often render as broken images.
const LINKED_BADGE_RE = /\[!\[[^\]]*]\([^)]*\)](\([^)]*\)|\[[^\]]*])/g;
const BADGE_IMAGE_RE = /!\[[^\]]*]\([^)]*(shields\.io|badge|badgen\.net|\/workflows\/)[^)]*\)/gi;
const HTML_BADGE_RE = /<img[^>]*src="[^"]*(shields\.io|badge|badgen\.net|\/workflows\/)[^"]*"[^>]*>/gi;
const REFERENCE_DEFINITION_RE = /^\s*\[[^\]]+]:\s*\S+.*$/gm;

function stripBadges(raw: string): string {
  return raw.replace(LINKED_BADGE_RE, "").replace(BADGE_IMAGE_RE, "").replace(HTML_BADGE_RE, "");
}

// Some sources (Microsoft Store, NuGet/Chocolatey XML feeds…) return HTML escaped as entities.
const ESCAPED_HTML_RE = /&lt;\/?[a-z][\s\S]*?&gt;/i;

function decodeEscapedHtml(raw: string): string {
  if (HTML_TAG_RE.test(raw) || !ESCAPED_HTML_RE.test(raw)) return raw;
  return raw
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

const ALLOWED_TAGS = [
  "h1","h2","h3","h4","h5","h6","p","br","hr","ul","ol","li",
  "a","strong","em","b","i","code","pre","blockquote",
  "table","thead","tbody","tr","th","td","img","del","s","sup","sub","span","div",
];
// No "class": source HTML must not pick up the app's styles; formatting comes from the prose wrapper.
const ALLOWED_ATTR = ["href","target","rel","src","alt","title"];

let hooksInstalled = false;
function installHooks() {
  if (hooksInstalled) return;
  hooksInstalled = true;
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A" && node.getAttribute("href")) {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer nofollow");
    }
  });
}

/**
 * Turns release notes / descriptions coming from any source (Markdown, HTML, escaped HTML,
 * plain text) into one sanitized HTML flavour, so every field renders the same way.
 */
export function renderRichContent(raw: string): string {
  // DOMPurify needs a DOM: never emit unsanitized HTML during server rendering.
  if (!DOMPurify.isSupported) return "";
  installHooks();
  const cleaned = stripBadges(decodeEscapedHtml(raw.replace(/\r\n/g, "\n")));
  const normalized = looksLikeFlattenedMarkdown(cleaned) ? normalizeFlattenedMarkdown(cleaned) : cleaned;
  const isHtml = HTML_TAG_RE.test(cleaned);
  const hasMarkdown = MARKDOWN_SIGNALS.some((re) => re.test(cleaned));
  let html: string;
  if (isHtml && !hasMarkdown) {
    // Pure HTML: keep it, but turn bare line breaks into <br> when the HTML has no block structure.
    html = /<(p|div|ul|ol|li|br|h[1-6]|table|pre)\b/i.test(normalized)
      ? normalized
      : normalized.replace(/\n/g, "<br>");
  } else {
    // Markdown, plain text, or READMEs mixing HTML and Markdown: marked keeps the HTML and renders the rest.
    // Plain text keeps its single line breaks.
    html = marked.parse(normalized.replace(REFERENCE_DEFINITION_RE, ""), {
      async: false,
      gfm: true,
      breaks: !hasMarkdown,
    }) as string;
  }
  return DOMPurify.sanitize(html.replace(HTML_BADGE_RE, ""), { ALLOWED_TAGS, ALLOWED_ATTR });
}

export function RenderedContent({ content, className }: { content: string; className?: string }) {
  const html = useMemo(() => renderRichContent(content), [content]);
  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none break-words [overflow-wrap:anywhere]",
        "prose-headings:text-sm prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1",
        "prose-p:text-xs prose-p:leading-relaxed prose-p:my-1",
        "prose-li:text-xs prose-li:my-0",
        "prose-code:text-xs prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded",
        "prose-pre:text-xs prose-pre:bg-muted prose-pre:p-2 prose-pre:rounded-md prose-pre:overflow-x-auto",
        "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
        "prose-img:max-w-full prose-img:rounded",
        className
      )}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/** One-line plain-text version of rich content, for truncated previews. */
export function RichContentText({ content, className }: { content: string; className?: string }) {
  const text = useMemo(() => {
    const html = renderRichContent(content);
    if (!html || typeof DOMParser === "undefined") return "";
    // DOMParser builds an inert document: images are not fetched.
    const doc = new DOMParser().parseFromString(html, "text/html");
    return (doc.body.textContent ?? "").replace(/\s+/g, " ").trim();
  }, [content]);
  return (
    <span className={className} title={text} suppressHydrationWarning>
      {text}
    </span>
  );
}
