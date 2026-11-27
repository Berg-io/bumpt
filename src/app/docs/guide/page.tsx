"use client";

import {
  BookOpen,
  Rocket,
  LayoutDashboard,
  Package,
  ShieldAlert,
  History,
  Users,
  MousePointerClick,
  Cpu,
  FileBarChart,
  Settings,
} from "lucide-react";
import { ReleaseBadge } from "@/components/layout/release-badge";
import {
  C,
  DocsCallout,
  DocsHeader,
  DocsSection,
  DocsToc,
  IS_PRO_EDITION,
  ProBadge,
  Snippet,
} from "@/components/docs/docs-shell";

const TOC = [
  { id: "install", label: "Install and upgrade" },
  { id: "dashboard", label: "Dashboard and statuses" },
  { id: "items", label: "Items and check sources" },
  { id: "cve", label: "Vulnerabilities (CVE, EPSS, KEV)" },
  { id: "timeline", label: "Timeline" },
  { id: "users", label: "Users, roles and your account" },
  { id: "settings", label: "Settings" },
  { id: "reports", label: "Scheduled reports" },
  { id: "ui", label: "Buttons and controls" },
  ...(IS_PRO_EDITION ? [{ id: "agent", label: "Collection agent" }] : []),
];

const STATUSES: Array<[string, string, string]> = [
  ["End of life", "Red outline, hollow dot", "The installed release is no longer supported by its vendor."],
  ["Vulnerable", "Filled red", "At least one known CVE affects the installed version."],
  ["Check failed", "Grey, warning icon", "The last version check got no answer. Hover the badge to read the error; the data may be stale."],
  ["Outdated", "Amber", "A newer version exists on the check source."],
  ["Up to date", "Green", "The installed version is the latest one (of the tracked branch, when set)."],
];

const SOURCE_GROUPS: Array<[string, string]> = [
  ["Code repositories", "GitHub Releases, GitLab Releases, Bitbucket"],
  ["Container images", "Docker Hub, Quay.io, OCI Registry (ghcr.io, registry.k8s.io, mcr.microsoft.com, ECR, Harbor…), Helm Charts"],
  ["Lifecycle", "endoflife.date (latest version and support dates for OS, runtimes, databases, servers)"],
  ["Libraries", "npm, PyPI, Maven Central, NuGet, Crates.io, RubyGems, Go Proxy, Packagist, Pub.dev, Hex.pm, Anaconda, CocoaPods, MetaCPAN, Libraries.io (paid API key)"],
  ["Windows and macOS", "WinGet, Chocolatey, Microsoft Store, Homebrew, Google Chrome"],
  ["Linux", "Repology (distribution packages), AUR, Snap Store, Flathub"],
  ["Mobile", "Apple App Store, Google Play Store, F-Droid"],
  ["Extensions and plugins", "VS Code Marketplace, Open VSX, JetBrains Marketplace, Firefox Add-ons, WordPress plugins"],
  ["Infrastructure", "Terraform Registry, Ansible Galaxy"],
  ["Your own data", "CSV Data, custom JSON API and HTML scraper sources"],
];

const REPORT_SECTIONS: Array<[string, string]> = [
  ["Summary", "Up to date, outdated, vulnerable, end of life and check failed counts, adding up to the total."],
  ["Critical items", "Why each item is critical (end of life, or number of CVEs, highest severity and KEV), KEV first then by BPT score."],
  ["Detected CVEs", "Open CVEs with severity, CVSS and KEV, most severe first, marked new when detected in the period."],
  ["End of life", "Items already past end of life or within the next 180 days, sorted by date."],
  ["Failed checks", "Items whose last check failed, with the error and the date."],
  ["Version changes", "Versions that changed during the period."],
];

export default function GuideDocsPage() {
  return (
    <div className="min-h-screen bg-background">
      <DocsHeader title="User guide" icon={BookOpen} current="/docs/guide" />

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-12">
        <section className="space-y-4">
          <h1 className="text-3xl font-bold">User guide</h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            bum.pt tracks the versions of your software, Docker images and services, tells you when an update is
            available, and shows the vulnerabilities (CVE) that affect the version you actually run.
          </p>
          <DocsToc entries={TOC} />
        </section>

        <DocsSection id="install" title="Install and upgrade" icon={Rocket}>
          <p className="text-sm text-muted-foreground">
            bum.pt runs with Docker Compose. Caddy is included as reverse proxy and SQLite is the default database
            (PostgreSQL and MariaDB are available as Compose profiles, MSSQL in Professional).
          </p>
          <Snippet label="Community edition">{`git clone https://github.com/Berg-io/bumpt.git
cd bumpt
cp .env.example .env      # set ADMIN_EMAIL / ADMIN_PASSWORD, CADDY_DOMAIN
docker compose up -d`}</Snippet>
          <p className="text-sm text-muted-foreground">
            Open <C>https://&lt;CADDY_DOMAIN&gt;</C> (or <C>https://localhost</C>) and sign in with the administrator
            account from <C>.env</C>. Change the password right away: click your e-mail address at the bottom of the
            sidebar to open <strong>My account</strong>.
          </p>

          <h3 className="font-semibold flex items-center gap-2 pt-2">
            Professional image <ProBadge />
          </h3>
          <p className="text-sm text-muted-foreground">
            After purchase you receive a license key by e-mail and access to the private distribution repository{" "}
            <C>bergstudioapp/bumpt-pro-dist</C> on your GitHub account. It contains the Compose file, the{" "}
            <C>.env.example</C> and the agent releases. The image is private on GitHub Container Registry: log in once
            per server with a personal access token (classic) that only has the <C>read:packages</C> scope.
          </p>
          <Snippet label="Professional edition">{`echo "<YOUR_TOKEN>" | docker login ghcr.io -u <your-github-username> --password-stdin
git clone https://github.com/bergstudioapp/bumpt-pro-dist.git bumpt
cd bumpt
cp .env.example .env      # LICENSE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD, CADDY_DOMAIN, APP_URL
docker compose up -d`}</Snippet>
          <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
            <li>
              <C>BUMPT_IMAGE=&quot;ghcr.io/bergstudioapp/bumpt-pro:pro&quot;</C> follows the latest Professional
              release. Pin a version with a tag such as <C>ghcr.io/bergstudioapp/bumpt-pro:0.3.0-pro</C>.
            </li>
            <li>
              <strong>From Community to Professional</strong>: your data stays in the same volume. Log in to the
              registry, set <C>BUMPT_IMAGE</C> to the Professional image and <C>LICENSE_KEY</C> in your existing{" "}
              <C>.env</C>, then run <C>docker compose up -d</C>.
            </li>
            <li>The license can also be checked and replaced in Settings &gt; License.</li>
          </ul>

          <h3 className="font-semibold pt-2">Update</h3>
          <Snippet>{`# back up /app/data (SQLite) or your database first
git pull
docker compose pull
docker compose up -d --remove-orphans`}</Snippet>
          <p className="text-sm text-muted-foreground">
            Migrations run automatically at startup. Scheduled checks and reports run inside the app (
            <C>CRON_SCHEDULE</C>, <C>REPORTS_SCHEDULE</C>); no separate cron container is needed. Optional provider
            keys (<C>GITHUB_TOKEN</C>, <C>NVD_API_KEY</C>, …) raise rate limits; see <C>.env.example</C> for every
            variable.
          </p>
        </DocsSection>

        <DocsSection id="dashboard" title="Dashboard and statuses" icon={LayoutDashboard}>
          <p className="text-sm text-muted-foreground">
            Each monitored item has exactly one status, so the counters at the top always add up to the total:
            <strong> at risk + outdated + check failed + up to date = monitored items</strong>. The counters cover all
            monitored items, not only the current page or filter. When several statuses apply, the first one in this
            table wins.
          </p>
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-left">
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Badge</th>
                  <th className="px-4 py-2.5 font-medium">Meaning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {STATUSES.map(([status, badge, meaning]) => (
                  <tr key={status}>
                    <td className="px-4 py-2.5 font-medium whitespace-nowrap">{status}</td>
                    <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{badge}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
            <li>
              <strong>At risk</strong> (red card and status filter) groups the vulnerable and end-of-life items. Its
              colours follow the BPT risk score, explained in{" "}
              <a href="/docs/scoring" className="text-primary hover:underline">Risk scoring</a>.
            </li>
            <li>
              The <strong>BPT / Ext</strong> column shows the internal priority score and the external CVE score; hover
              it for the explanation.
            </li>
            <li>
              Filters: search, type and status (including &quot;At risk&quot; and &quot;Check failed&quot;).{" "}
              {IS_PRO_EDITION ? (
                <>
                  The <strong>Origin</strong> filter (Manual / Agent) separates items you entered from items reported by
                  the collection agent.
                </>
              ) : (
                <>Professional adds an Origin filter (manual or agent items).</>
              )}
            </li>
            <li>On phones and tablets (up to 1280 px) the table becomes a list of cards.</li>
            <li>
              <C>/overview</C> is a fullscreen TV / NOC view of the same data.
            </li>
            <li>
              The refresh action on a row checks the item immediately and shows a tick, or the error, when it is done.
              Acknowledge an update once you have installed it: the current version becomes the latest one and the
              CVEs fixed in that version are closed.
            </li>
          </ul>
        </DocsSection>

        <DocsSection id="items" title="Items and check sources" icon={Package}>
          <p className="text-sm text-muted-foreground">
            An item is one product you run: a software, a Docker image, a service or an operating system. Create it in{" "}
            <strong>Items</strong>, choose its <strong>check source</strong> first, then enter the installed version.
            The status is computed as soon as a source is set.
          </p>
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-left">
                  <th className="px-4 py-2.5 font-medium">Kind of product</th>
                  <th className="px-4 py-2.5 font-medium">Built-in sources</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-muted-foreground">
                {SOURCE_GROUPS.map(([kind, list]) => (
                  <tr key={kind}>
                    <td className="px-4 py-2.5 font-medium text-foreground whitespace-nowrap align-top">{kind}</td>
                    <td className="px-4 py-2.5">{list}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
            <li>
              <strong>Container images</strong>: Docker Hub for <C>library/nginx</C>-style images, Quay.io for{" "}
              <C>quay.io/…</C>, and <strong>OCI Registry</strong> for any other registry, with the full image name (
              <C>ghcr.io/home-assistant/home-assistant</C>, <C>registry.k8s.io/kube-apiserver</C>,{" "}
              <C>mcr.microsoft.com/…</C>, <C>public.ecr.aws/…</C>, GitLab or a self-hosted Harbor). Public images need
              no credentials. Quay.io and OCI Registry take the highest stable tag and skip tags such as{" "}
              <C>main-distroless</C>.
            </li>
            <li>
              <strong>WinGet</strong> reads the official manifests of <C>microsoft/winget-pkgs</C>: use the package
              identifier, e.g. <C>Microsoft.PowerToys</C>. A <C>GITHUB_TOKEN</C> avoids GitHub rate limits.
            </li>
            <li>
              <strong>endoflife.date</strong> also gives the support dates. A version older than every cycle the
              product still lists (Node.js 0.0.1, for instance) is shown as end of life.
            </li>
            <li>
              <strong>Tracked branch</strong> (optional): only versions of that branch count as &quot;latest&quot;. Use{" "}
              <C>16</C> for PostgreSQL 16.x or <C>3.11</C> for Python 3.11.x, so an item on 16.1 is told to move to
              16.16 and not to 19.0. Available for Docker Hub, OCI Registry, GitHub releases, npm and PyPI.
            </li>
            <li>
              <strong>Risk context</strong> (folded in the form): criticality, environment, exposure and the other BPT
              inputs. Filling them makes the BPT score more precise.
            </li>
            <li>
              <strong>Check Sources</strong> lists every built-in source with its parameters. Sources that need
              credentials say so and link to the matching settings tab. You can add your own JSON API or HTML scraper
              sources.
            </li>
            <li>
              Checks run on the schedule set in Settings, or on demand from the dashboard. Every change is recorded in
              the audit <strong>Logs</strong>.
            </li>
          </ul>
        </DocsSection>

        <DocsSection id="cve" title="Vulnerabilities (CVE, EPSS, KEV)" icon={ShieldAlert}>
          <p className="text-sm text-muted-foreground">
            After each version check, bum.pt looks up the CVEs that affect the <strong>installed</strong> version of the
            item, whatever its lifecycle state, and records each CVE on the item with its detection date.
          </p>
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-left">
                  <th className="px-4 py-2.5 font-medium">Provider</th>
                  <th className="px-4 py-2.5 font-medium">What it brings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-muted-foreground">
                <tr>
                  <td className="px-4 py-2.5 font-medium text-foreground">NVD</td>
                  <td className="px-4 py-2.5">
                    Finds the product&apos;s CPE, first in the endoflife.date catalogue (about 290 products with their
                    exact CPE and package URLs), then in the NVD dictionary, and keeps only the CVEs whose version ranges
                    include the installed version. Set the <C>cpe</C> source parameter (<C>vendor:product</C>, e.g.{" "}
                    <C>nodejs:node.js</C>) when the automatic match picks the wrong product. <C>NVD_API_KEY</C> raises
                    the rate limit.
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium text-foreground">OSV.dev</td>
                  <td className="px-4 py-2.5">
                    Ecosystem-aware lookup on package and version (npm, PyPI, Go, Maven, NuGet, crates, RubyGems,
                    Packagist, Hex, Pub, VS Code / Open VSX extensions…).
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium text-foreground">GitHub Advisory</td>
                  <td className="px-4 py-2.5">Package advisories with the patched version (pub included).</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium text-foreground">VulnDB</td>
                  <td className="px-4 py-2.5">Optional, with your own Flashpoint VulnDB credentials.</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium text-foreground">FIRST EPSS</td>
                  <td className="px-4 py-2.5">
                    Probability (0–100 %) that the CVE is exploited in the next 30 days, stored per CVE.
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium text-foreground">CISA KEV</td>
                  <td className="px-4 py-2.5">
                    Marks CVEs known to be exploited, with the date added to the catalogue, the CISA remediation
                    deadline and whether ransomware campaigns use it.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
            <li>
              Each CVE keeps its summary, CVSS score and severity, publication date and the version that fixes it.
              The external score uses the highest CVSS from every provider; KEV and EPSS raise the urgency.
            </li>
            <li>
              A CVE is marked <strong>resolved</strong> when it is no longer reported for the installed version, but
              only if every provider answered (an outage never closes CVEs) or the installed version changed.
              Acknowledging an update closes at once the CVEs whose known fix it includes.
            </li>
            <li>
              CVEs quoted in the release notes of the latest version are fixed by that version: they do not mark an item
              that is already up to date as vulnerable.
            </li>
            <li>
              No CVE on an item? Check that its installed version is filled in, that the name matches the vendor&apos;s
              product name, and, for NVD, set the <C>cpe</C> parameter. CVE data is refreshed at each check.
            </li>
          </ul>
        </DocsSection>

        <DocsSection id="timeline" title="Timeline" icon={History}>
          <p className="text-sm text-muted-foreground">
            The <strong>Timeline</strong> page (sidebar, every role) is the CVE history of your monitored products,
            newest first. Items whose monitoring is switched off are left out.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {[
              ["Published", "The CVE was published by its source."],
              ["Detected", "bum.pt found it on the installed version."],
              ["Exploited (KEV)", "CISA added it to the catalogue of exploited vulnerabilities."],
              ["Resolved", "It no longer affects the installed version (with the version that resolved it)."],
            ].map(([label, text]) => (
              <div key={label} className="rounded-xl border bg-card p-4">
                <p className="font-medium">{label}</p>
                <p className="text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
          <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
            <li>
              Counters: open CVEs, actively exploited (KEV), critical open, affected products and resolved in the period.
            </li>
            <li>
              Filters: period (7 days to all time), event type, severity, product, &quot;Exploited only (KEV)&quot;,
              &quot;Open only&quot; and a search on the CVE id or product.
            </li>
            <li>Each event shows CVSS, EPSS, the CISA deadline, the installed and fixed versions.</li>
            <li>
              The 500 most recent events are shown; narrow the filters to see older ones. The same data is available
              from <C>GET /api/timeline</C>.
            </li>
          </ul>
        </DocsSection>

        <DocsSection id="users" title="Users, roles and your account" icon={Users}>
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-left">
                  <th className="px-4 py-2.5 font-medium">Role</th>
                  <th className="px-4 py-2.5 font-medium">Can</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-muted-foreground">
                <tr>
                  <td className="px-4 py-2.5 font-medium text-foreground">Viewer</td>
                  <td className="px-4 py-2.5">Read the dashboard, item details and the Timeline. Default for new users.</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium text-foreground">Admin</td>
                  <td className="px-4 py-2.5">Everything a viewer can, plus items, sources, checks and logs.</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium text-foreground">Super admin</td>
                  <td className="px-4 py-2.5">Everything, plus users, settings and the license.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
            <li>
              A page your role cannot open sends you back to the dashboard with an &quot;access denied&quot; message.
            </li>
            <li>
              <strong>My account</strong> opens from your e-mail address at the bottom of the sidebar (the avatar when
              the sidebar is collapsed), for every role. It shows your profile (e-mail, role and what it allows,
              sign-in method: local, SAML or OpenID Connect), lets you change your password (local accounts) and set up
              two-factor authentication with any TOTP app. A super admin can reset 2FA for a user who lost their
              device.
            </li>
            <li>
              SSO (SAML, OIDC) is available in Professional; <C>SSO_DEFAULT_ROLE=VIEWER</C> makes new SSO users
              read-only.
            </li>
          </ul>
        </DocsSection>

        <DocsSection id="settings" title="Settings" icon={Settings}>
          <p className="text-sm text-muted-foreground">
            <strong>Settings</strong> (super admins) holds what applies to the whole application. Personal settings
            (password, two-factor authentication) are in My account, not here.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
            <li>
              <strong>General</strong>: language, time zone (used by schedules and reports), date and time format.
            </li>
            <li>
              <strong>Authentication</strong>: SAML and OpenID Connect single sign-on.
            </li>
            <li>
              <strong>Database</strong>: the database in use (SQLite, PostgreSQL, MariaDB, or MSSQL in Professional).
            </li>
            <li>
              <strong>Data Source</strong>: the CSV data used by the CSV Data check source.
            </li>
            <li>
              <strong>Notifications</strong>: SMTP server and webhooks (e-mail, Slack, Discord, Teams…), used by
              alerts and scheduled reports.
            </li>
            <li>
              <strong>API Keys</strong>, <strong>AI Analysis</strong> and <strong>License</strong>.
            </li>
          </ul>
          <p className="text-sm text-muted-foreground">
            Tabs that need Professional show a lock badge. The active tab is kept in the address (<C>#sso</C>,{" "}
            <C>#license</C>…), so a link can open it directly.
          </p>
        </DocsSection>

        <DocsSection id="reports" title="Scheduled reports" icon={FileBarChart}>
          <p className="text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <ProBadge />
            </span>{" "}
            <strong>Reports</strong> (super admins) builds a summary of your fleet on a schedule (daily, weekly or
            monthly, in the application time zone) and delivers it in the app (view and download as PDF), by e-mail,
            or to Slack, Discord and Teams through the webhooks set in Settings.
          </p>
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-left">
                  <th className="px-4 py-2.5 font-medium">Section</th>
                  <th className="px-4 py-2.5 font-medium">Content</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-muted-foreground">
                {REPORT_SECTIONS.map(([section, content]) => (
                  <tr key={section}>
                    <td className="px-4 py-2.5 font-medium text-foreground whitespace-nowrap align-top">{section}</td>
                    <td className="px-4 py-2.5">{content}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
            <li>
              The numbers match the dashboard: each item has one status, paused items are left out, and the status
              filter offers the same choices (including Vulnerable and Check failed).
            </li>
            <li>
              A section you asked for stays in the report with &quot;Nothing to report for this period&quot; when it is
              empty. The most urgent sections come first.
            </li>
            <li>
              A report that was never sent covers a full period (1, 7 or 30 days), so its first preview is not empty.
              Use <strong>Preview</strong> to see it, <strong>Send now</strong> to deliver it at once, and{" "}
              <strong>History</strong> for what was sent, per channel.
            </li>
          </ul>
          <h3 className="font-semibold pt-2">Example reports</h3>
          <p className="text-sm text-muted-foreground">
            A fresh Professional installation starts with three example reports, named in the application language and
            delivered in the app only (nothing is e-mailed or posted):
          </p>
          <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
            <li>
              <strong>Weekly summary</strong>: Mondays at 8:00, every section.
            </li>
            <li>
              <strong>Daily security alerts</strong>: every day at 7:00, summary, critical items and CVEs.
            </li>
            <li>
              <strong>Monthly lifecycle review</strong>: the 1st of the month at 9:00, summary, end of life, failed
              checks and version changes.
            </li>
          </ul>
          <p className="text-sm text-muted-foreground">
            Edit them, add channels or delete them: they are created only once, so a deleted example does not come
            back, and an installation that already has reports is left alone. Set <C>SEED_EXAMPLE_REPORTS=false</C>{" "}
            to start without them.
          </p>
        </DocsSection>

        <DocsSection id="ui" title="Buttons and controls" icon={MousePointerClick}>
          <p className="text-sm text-muted-foreground">The same controls behave the same way on every page:</p>
          <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
            <li>
              <strong>Primary</strong> (filled) is the main action of a page or dialog; <strong>secondary</strong> and{" "}
              <strong>ghost</strong> buttons are the other actions. A button that is working shows a spinner and cannot
              be clicked twice.
            </li>
            <li>
              <strong>Icon buttons</strong> (refresh, edit, acknowledge…) always have a tooltip with their name. A
              delete icon stays neutral and turns red only on hover.
            </li>
            <li>
              <strong>Destructive actions</strong> ask for confirmation in a dialog with a red button; bulk actions such
              as &quot;Delete all&quot; are placed below the list and repeat the number of items affected.
            </li>
            <li>
              <strong>Switches</strong> are coloured when on and grey when off. <strong>Badges</strong> show a state
              (status, severity), <strong>tags</strong> show metadata, and the BPT score has its own coloured chip.
            </li>
          </ul>
        </DocsSection>

        {IS_PRO_EDITION && (
          <DocsSection id="agent" title="Collection agent" icon={Cpu}>
            <DocsCallout tone="pro">
              The Rust agent reports the software installed on Linux and Windows machines and turns it into items.
              Installation, <C>agent.toml</C>, monitoring modes and rules are described in the{" "}
              <a href="/docs/agent" className="text-primary hover:underline">agent guide</a>.
            </DocsCallout>
          </DocsSection>
        )}
      </main>
      <ReleaseBadge />
    </div>
  );
}
