"use client";

import { useState, useMemo } from "react";
import { Copy, Check } from "lucide-react";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="p-1.5 rounded-md hover:bg-accent transition-colors" title="Copy">
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
    </button>
  );
}

function highlightJson(code: string): React.ReactNode[] {
  return code.split("\n").map((line, i) => {
    const parts: React.ReactNode[] = [];
    let rest = line;
    let key = 0;

    const keyMatch = rest.match(/^(\s*)"([^"]+)"(\s*:\s*)/);
    if (keyMatch) {
      parts.push(<span key={key++}>{keyMatch[1]}</span>);
      parts.push(<span key={key++} className="text-sky-600 dark:text-sky-400">&quot;{keyMatch[2]}&quot;</span>);
      parts.push(<span key={key++}>{keyMatch[3]}</span>);
      rest = rest.slice(keyMatch[0].length);
    }

    const strMatch = rest.match(/^"([^"]*)"(.*)/);
    if (strMatch) {
      parts.push(<span key={key++} className="text-emerald-600 dark:text-emerald-400">&quot;{strMatch[1]}&quot;</span>);
      rest = strMatch[2];
    }

    const numMatch = rest.match(/^(\d+\.?\d*)(.*)/);
    if (numMatch && parts.length > 0) {
      parts.push(<span key={key++} className="text-amber-600 dark:text-amber-400">{numMatch[1]}</span>);
      rest = numMatch[2];
    }

    const boolMatch = rest.match(/^(true|false|null)(.*)/);
    if (boolMatch && parts.length > 0) {
      parts.push(<span key={key++} className="text-violet-600 dark:text-violet-400">{boolMatch[1]}</span>);
      rest = boolMatch[2];
    }

    if (rest) parts.push(<span key={key++}>{rest}</span>);
    if (parts.length === 0) parts.push(<span key={0}>{line}</span>);

    return <span key={i}>{parts}{"\n"}</span>;
  });
}

function highlightBash(code: string): React.ReactNode[] {
  return code.split("\n").map((line, i) => {
    const trimmed = line.trimStart();
    if (trimmed.startsWith("#")) {
      return <span key={i}><span className="text-emerald-600 dark:text-emerald-500">{line}</span>{"\n"}</span>;
    }

    const parts: React.ReactNode[] = [];
    let rest = line;
    let key = 0;

    const cmdMatch = rest.match(/^(\s*)(curl|wget|npx|npm|node)\b/);
    if (cmdMatch) {
      parts.push(<span key={key++}>{cmdMatch[1]}</span>);
      parts.push(<span key={key++} className="text-sky-600 dark:text-sky-400 font-semibold">{cmdMatch[2]}</span>);
      rest = rest.slice(cmdMatch[0].length);
    }

    const tokens = rest.split(/((?:-[A-Za-z]|--[a-z-]+)\b|"[^"]*"|'[^']*'|\\\n)/g);
    for (const tok of tokens) {
      if (!tok) continue;
      if (/^(-[A-Za-z]|--[a-z-]+)/.test(tok)) {
        parts.push(<span key={key++} className="text-violet-600 dark:text-violet-400">{tok}</span>);
      } else if (/^["']/.test(tok)) {
        parts.push(<span key={key++} className="text-amber-600 dark:text-amber-400">{tok}</span>);
      } else {
        parts.push(<span key={key++}>{tok}</span>);
      }
    }

    return <span key={i}>{parts.length > 0 ? parts : line}{"\n"}</span>;
  });
}

function highlightText(code: string): React.ReactNode[] {
  return code.split("\n").map((line, i) => {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0 && colonIdx < 30 && !line.startsWith(" ")) {
      return (
        <span key={i}>
          <span className="text-sky-600 dark:text-sky-400 font-semibold">{line.slice(0, colonIdx)}</span>
          <span>:{line.slice(colonIdx + 1)}</span>
          {"\n"}
        </span>
      );
    }
    return <span key={i}>{line}{"\n"}</span>;
  });
}

type Language = "json" | "bash" | "text" | string;

export function CodeBlock({ code, language = "json" }: { code: string; language?: Language }) {
  const highlighted = useMemo(() => {
    switch (language) {
      case "json": return highlightJson(code);
      case "bash": return highlightBash(code);
      case "text": return highlightText(code);
      default: return [code];
    }
  }, [code, language]);

  return (
    <div className="relative group rounded-lg bg-[hsl(var(--code-bg))] border border-border/60 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/60 bg-[hsl(var(--code-header))]">
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{language}</span>
        <CopyButton text={code} />
      </div>
      <pre className="p-4 overflow-x-auto text-xs leading-relaxed">
        <code className="text-[hsl(var(--code-foreground))] font-mono">{highlighted}</code>
      </pre>
    </div>
  );
}
