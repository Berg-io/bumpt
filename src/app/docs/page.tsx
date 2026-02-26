"use client";

import { useState, useEffect } from "react";
import { Zap, ArrowRight, Moon, Sun, Crown, BookOpen } from "lucide-react";

function McpIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="10 16 165 182" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M25 97.8528L92.8822 29.9706C102.255 20.598 117.451 20.598 126.823 29.9706C136.196 39.3431 136.196 54.5391 126.823 63.9117L75.5581 115.177" stroke="currentColor" strokeWidth="12" strokeLinecap="round"/>
      <path d="M76.2652 114.47L126.823 63.9117C136.196 54.5391 151.392 54.5391 160.765 63.9117L161.118 64.2652C170.491 73.6378 170.491 88.8338 161.118 98.2063L99.7248 159.6C96.6006 162.724 96.6006 167.789 99.7248 170.913L112.331 183.52" stroke="currentColor" strokeWidth="12" strokeLinecap="round"/>
      <path d="M109.853 46.9411L59.6482 97.1457C50.2756 106.518 50.2756 121.714 59.6482 131.087C69.0208 140.459 84.2167 140.459 93.5893 131.087L143.794 80.8822" stroke="currentColor" strokeWidth="12" strokeLinecap="round"/>
    </svg>
  );
}

function usePersistedTheme() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = stored === "dark" || (stored === "system" && prefersDark) || (!stored && prefersDark);
    document.documentElement.classList.toggle("dark", dark);
    setIsDark(dark);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    setIsDark(next);
  };

  return { isDark, toggleTheme };
}

export default function DocsLandingPage() {
  const { isDark, toggleTheme } = usePersistedTheme();

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between px-6 py-4 border-b bg-background">
        <div className="flex items-center gap-3">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-bold">bum.pt Documentation</h1>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/"
            className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            Dashboard
          </a>
          <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-muted transition-colors">
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Developer Documentation</h2>
          <p className="text-lg text-muted-foreground">
            Integrate with bum.pt using the REST API or Model Context Protocol.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <a
            href="/docs/api"
            className="group rounded-xl border bg-card p-6 space-y-4 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">REST API</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                <Crown className="h-3 w-3" /> Professional
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Full OpenAPI 3.1 documentation with interactive endpoint explorer, request/response schemas, and curl examples.
            </p>
            <div className="flex items-center gap-1 text-sm text-primary font-medium group-hover:gap-2 transition-all">
              Explore API <ArrowRight className="h-4 w-4" />
            </div>
          </a>

          <a
            href="/docs/mcp"
            className="group rounded-xl border bg-card p-6 space-y-4 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <McpIcon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">MCP Server</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                <Crown className="h-3 w-3" /> Professional
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Connect AI assistants from Slack, Teams, Cursor, or any MCP client to query and control your monitoring dashboard.
            </p>
            <div className="flex items-center gap-1 text-sm text-primary font-medium group-hover:gap-2 transition-all">
              View MCP docs <ArrowRight className="h-4 w-4" />
            </div>
          </a>
        </div>
      </main>
    </div>
  );
}
