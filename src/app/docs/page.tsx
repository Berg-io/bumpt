"use client";

import { Zap, ArrowRight, BookOpen, ShieldAlert, Cpu, Compass } from "lucide-react";
import { ReleaseBadge } from "@/components/layout/release-badge";
import { DocsHeader, IS_PRO_EDITION, ProBadge } from "@/components/docs/docs-shell";

function McpIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="10 16 165 182" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M25 97.8528L92.8822 29.9706C102.255 20.598 117.451 20.598 126.823 29.9706C136.196 39.3431 136.196 54.5391 126.823 63.9117L75.5581 115.177" stroke="currentColor" strokeWidth="12" strokeLinecap="round"/>
      <path d="M76.2652 114.47L126.823 63.9117C136.196 54.5391 151.392 54.5391 160.765 63.9117L161.118 64.2652C170.491 73.6378 170.491 88.8338 161.118 98.2063L99.7248 159.6C96.6006 162.724 96.6006 167.789 99.7248 170.913L112.331 183.52" stroke="currentColor" strokeWidth="12" strokeLinecap="round"/>
      <path d="M109.853 46.9411L59.6482 97.1457C50.2756 106.518 50.2756 121.714 59.6482 131.087C69.0208 140.459 84.2167 140.459 93.5893 131.087L143.794 80.8822" stroke="currentColor" strokeWidth="12" strokeLinecap="round"/>
    </svg>
  );
}

interface DocCard {
  href: string;
  title: string;
  description: string;
  cta: string;
  icon: React.ReactNode;
  pro?: boolean;
}

const CARDS: DocCard[] = [
  {
    href: "/docs/guide",
    title: "User guide",
    description:
      "Install and upgrade, dashboard statuses, items and check sources, CVE with EPSS and KEV, the Timeline, roles and two-factor authentication.",
    cta: "Read the guide",
    icon: <Compass className="h-5 w-5 text-primary" />,
  },
  {
    href: "/docs/scoring",
    title: "Risk Scoring",
    description:
      "Complete guide for CVE external scoring and BPT internal prioritization: formulas, confidence, required context fields, and source methodology.",
    cta: "Read scoring docs",
    icon: <ShieldAlert className="h-5 w-5 text-primary" />,
  },
  {
    href: "/docs/agent",
    title: "Collection agent",
    description:
      "Install bumpt-agent on Linux and Windows, write agent.toml, and choose what to monitor with modes and automatic rules.",
    cta: "Set up the agent",
    icon: <Cpu className="h-5 w-5 text-primary" />,
    pro: true,
  },
  {
    href: "/docs/api",
    title: "REST API",
    description:
      "Full OpenAPI 3.1 documentation with interactive endpoint explorer, request/response schemas, and curl examples.",
    cta: "Explore API",
    icon: <Zap className="h-5 w-5 text-primary" />,
    pro: true,
  },
  {
    href: "/docs/mcp",
    title: "MCP Server",
    description:
      "Connect AI assistants from Slack, Teams, Cursor, or any MCP client to query and control your monitoring dashboard.",
    cta: "View MCP docs",
    icon: <McpIcon className="h-6 w-6 text-primary" />,
    pro: true,
  },
];

export default function DocsLandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <DocsHeader title="bum.pt Documentation" icon={BookOpen} />

      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Documentation</h2>
          <p className="text-lg text-muted-foreground">
            Guides to install and use bum.pt, understand its risk scores
            {IS_PRO_EDITION ? ", deploy the collection agent and integrate with the REST API and MCP." : "."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {CARDS.map((card) => {
            // The Community build has no Pro doc pages: their cards point to the website.
            const locked = card.pro && !IS_PRO_EDITION;
            return (
              <a
                key={card.href}
                href={locked ? "https://bum.pt" : card.href}
                {...(locked ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="group rounded-xl border bg-card p-6 space-y-4 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">{card.icon}</div>
                  <h3 className="text-xl font-semibold">{card.title}</h3>
                  {card.pro && <ProBadge />}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{card.description}</p>
                <div className="flex items-center gap-1 text-sm text-primary font-medium group-hover:gap-2 transition-all">
                  {locked ? "Available in Professional" : card.cta} <ArrowRight className="h-4 w-4" />
                </div>
              </a>
            );
          })}
        </div>
      </main>
      <ReleaseBadge />
    </div>
  );
}
