import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import bcrypt from "bcrypt";

async function createClient() {
  const dbType = process.env.DB_TYPE || "sqlite";

  switch (dbType) {
    case "mariadb":
    case "mysql": {
      const { PrismaMariaDb } = await import("@prisma/adapter-mariadb");
      const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
      return new (PrismaClient as any)({ adapter }) as PrismaClient;
    }
    case "postgresql": {
      const { PrismaPg } = await import("@prisma/adapter-pg");
      const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
      return new (PrismaClient as any)({ adapter }) as PrismaClient;
    }
    default: {
      const { PrismaBetterSqlite3 } = await import("@prisma/adapter-better-sqlite3");
      const adapter = new PrismaBetterSqlite3({
        url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
      });
      return new PrismaClient({ adapter });
    }
  }
}

const prisma = await createClient();

async function initSettingIfMissing(key: string, value: string) {
  const existing = await prisma.appSetting.findUnique({ where: { key } });
  if (!existing && value) {
    await prisma.appSetting.create({ data: { key, value } });
    console.log(`  Setting "${key}" initialized to "${key.includes("password") || key.includes("certificate") || key.includes("secret") ? "***" : value}"`);
  }
}

async function main() {
  // --- Seed built-in CheckSources ---
  const dockerHubSource = await prisma.checkSource.upsert({
    where: { id: "builtin-dockerhub" },
    update: {},
    create: {
      id: "builtin-dockerhub",
      name: "Docker Hub",
      type: "dockerhub",
      config: "{}",
      isBuiltIn: true,
      description: "Docker Hub Registry — automatische Tag-Erkennung",
    },
  });

  const githubSource = await prisma.checkSource.upsert({
    where: { id: "builtin-github" },
    update: {},
    create: {
      id: "builtin-github",
      name: "GitHub Releases",
      type: "github",
      config: "{}",
      isBuiltIn: true,
      description: "GitHub Releases API — letzte stabile Version",
    },
  });

  const appStoreSource = await prisma.checkSource.upsert({
    where: { id: "builtin-appstore" },
    update: {},
    create: {
      id: "builtin-appstore",
      name: "Apple App Store",
      type: "appstore",
      config: "{}",
      isBuiltIn: true,
      description: "Apple App Store — Version über iTunes Lookup API",
    },
  });

  const playStoreSource = await prisma.checkSource.upsert({
    where: { id: "builtin-playstore" },
    update: {},
    create: {
      id: "builtin-playstore",
      name: "Google Play Store",
      type: "playstore",
      config: "{}",
      isBuiltIn: true,
      description: "Google Play Store — Version über Play Store Seite",
    },
  });

  const msStoreSource = await prisma.checkSource.upsert({
    where: { id: "builtin-msstore" },
    update: {},
    create: {
      id: "builtin-msstore",
      name: "Microsoft Store",
      type: "msstore",
      config: "{}",
      isBuiltIn: true,
      description: "Microsoft Store — Version über die Store-Webseite",
    },
  });

  const chromeSource = await prisma.checkSource.upsert({
    where: { id: "builtin-chrome" },
    update: {},
    create: {
      id: "builtin-chrome",
      name: "Google Chrome",
      type: "chrome",
      config: "{}",
      isBuiltIn: true,
      description: "Google Chrome Version History API",
    },
  });

  const endoflifeSource = await prisma.checkSource.upsert({
    where: { id: "builtin-endoflife" },
    update: {},
    create: {
      id: "builtin-endoflife",
      name: "EndOfLife.date",
      type: "endoflife",
      config: "{}",
      isBuiltIn: true,
      description: "EndOfLife.date — Versionen und Support-Daten für 400+ Produkte",
    },
  });

  const npmSource = await prisma.checkSource.upsert({
    where: { id: "builtin-npm" },
    update: {},
    create: {
      id: "builtin-npm",
      name: "NPM Registry",
      type: "npm",
      config: "{}",
      isBuiltIn: true,
      description: "NPM Registry — neueste Paketversion",
    },
  });

  const pypiSource = await prisma.checkSource.upsert({
    where: { id: "builtin-pypi" },
    update: {},
    create: {
      id: "builtin-pypi",
      name: "PyPI",
      type: "pypi",
      config: "{}",
      isBuiltIn: true,
      description: "Python Package Index — neueste Paketversion",
    },
  });

  const repologySource = await prisma.checkSource.upsert({
    where: { id: "builtin-repology" },
    update: {},
    create: {
      id: "builtin-repology",
      name: "Repology",
      type: "repology",
      config: "{}",
      isBuiltIn: true,
      description: "Repology — Softwareversionen über mehrere Repositories",
    },
  });

  const homebrewSource = await prisma.checkSource.upsert({
    where: { id: "builtin-homebrew" },
    update: {},
    create: {
      id: "builtin-homebrew",
      name: "Homebrew",
      type: "homebrew",
      config: "{}",
      isBuiltIn: true,
      description: "Homebrew Formulae — macOS-Paketversionen",
    },
  });

  const wordpressSource = await prisma.checkSource.upsert({
    where: { id: "builtin-wordpress" },
    update: {},
    create: {
      id: "builtin-wordpress",
      name: "WordPress Plugin",
      type: "wordpress",
      config: "{}",
      isBuiltIn: true,
      description: "WordPress.org Plugin API — Plugin-Versionen",
    },
  });

  await prisma.checkSource.upsert({
    where: { id: "builtin-winget" },
    update: {},
    create: {
      id: "builtin-winget",
      name: "Winget",
      type: "winget",
      config: "{}",
      isBuiltIn: true,
      description: "winget.run — Windows-Paketversionen (API-Schlüssel erforderlich)",
    },
  });

  await prisma.checkSource.upsert({
    where: { id: "builtin-csv-data" },
    update: {},
    create: {
      id: "builtin-csv-data",
      name: "CSV Data",
      type: "csv_data",
      config: "{}",
      isBuiltIn: true,
      description: "CSV-Datenquelle — Versionen aus hochgeladenen CSV-Dateien",
    },
  });

  await prisma.checkSource.upsert({
    where: { id: "builtin-maven" },
    update: {},
    create: {
      id: "builtin-maven",
      name: "Maven Central",
      type: "maven",
      config: "{}",
      isBuiltIn: true,
      description: "Maven Central Repository — Java/Kotlin artifact versions",
    },
  });

  await prisma.checkSource.upsert({
    where: { id: "builtin-nuget" },
    update: {},
    create: {
      id: "builtin-nuget",
      name: "NuGet",
      type: "nuget",
      config: "{}",
      isBuiltIn: true,
      description: "NuGet Gallery — .NET package versions",
    },
  });

  await prisma.checkSource.upsert({
    where: { id: "builtin-gitlab" },
    update: {},
    create: {
      id: "builtin-gitlab",
      name: "GitLab Releases",
      type: "gitlab",
      config: "{}",
      isBuiltIn: true,
      description: "GitLab Releases API — latest stable release",
    },
  });

  await prisma.checkSource.upsert({
    where: { id: "builtin-packagist" },
    update: {},
    create: {
      id: "builtin-packagist",
      name: "Packagist",
      type: "packagist",
      config: "{}",
      isBuiltIn: true,
      description: "Packagist — PHP/Composer package versions",
    },
  });

  await prisma.checkSource.upsert({
    where: { id: "builtin-crates" },
    update: {},
    create: {
      id: "builtin-crates",
      name: "Crates.io",
      type: "crates",
      config: "{}",
      isBuiltIn: true,
      description: "Crates.io — Rust crate versions",
    },
  });

  await prisma.checkSource.upsert({
    where: { id: "builtin-rubygems" },
    update: {},
    create: {
      id: "builtin-rubygems",
      name: "RubyGems",
      type: "rubygems",
      config: "{}",
      isBuiltIn: true,
      description: "RubyGems.org — Ruby gem versions",
    },
  });

  await prisma.checkSource.upsert({
    where: { id: "builtin-goproxy" },
    update: {},
    create: {
      id: "builtin-goproxy",
      name: "Go Proxy",
      type: "goproxy",
      config: "{}",
      isBuiltIn: true,
      description: "Go Module Proxy — Go module versions",
    },
  });

  await prisma.checkSource.upsert({
    where: { id: "builtin-helm" },
    update: {},
    create: {
      id: "builtin-helm",
      name: "Helm Charts",
      type: "helm",
      config: "{}",
      isBuiltIn: true,
      description: "Artifact Hub — Helm chart versions",
    },
  });

  await prisma.checkSource.upsert({
    where: { id: "builtin-snap" },
    update: {},
    create: {
      id: "builtin-snap",
      name: "Snap Store",
      type: "snap",
      config: "{}",
      isBuiltIn: true,
      description: "Snap Store — Linux snap package versions",
    },
  });

  await prisma.checkSource.upsert({
    where: { id: "builtin-flathub" },
    update: {},
    create: {
      id: "builtin-flathub",
      name: "Flathub",
      type: "flathub",
      config: "{}",
      isBuiltIn: true,
      description: "Flathub — Linux Flatpak application versions",
    },
  });

  await prisma.checkSource.upsert({
    where: { id: "builtin-terraform" },
    update: {},
    create: {
      id: "builtin-terraform",
      name: "Terraform Registry",
      type: "terraform",
      config: "{}",
      isBuiltIn: true,
      description: "Terraform Registry — module and provider versions",
    },
  });

  await prisma.checkSource.upsert({
    where: { id: "builtin-chocolatey" },
    update: {},
    create: {
      id: "builtin-chocolatey",
      name: "Chocolatey",
      type: "chocolatey",
      config: "{}",
      isBuiltIn: true,
      description: "Chocolatey — Windows package versions",
    },
  });

  await prisma.checkSource.upsert({
    where: { id: "builtin-pub" },
    update: {},
    create: {
      id: "builtin-pub",
      name: "Pub.dev",
      type: "pub",
      config: "{}",
      isBuiltIn: true,
      description: "Pub.dev — Dart and Flutter package versions",
    },
  });

  await prisma.checkSource.upsert({
    where: { id: "builtin-hex" },
    update: {},
    create: {
      id: "builtin-hex",
      name: "Hex.pm",
      type: "hex",
      config: "{}",
      isBuiltIn: true,
      description: "Hex.pm — Elixir and Erlang package versions",
    },
  });

  await prisma.checkSource.upsert({
    where: { id: "builtin-conda" },
    update: {},
    create: {
      id: "builtin-conda",
      name: "Anaconda",
      type: "conda",
      config: "{}",
      isBuiltIn: true,
      description: "Anaconda — Conda package versions",
    },
  });

  await prisma.checkSource.upsert({
    where: { id: "builtin-cocoapods" },
    update: {},
    create: {
      id: "builtin-cocoapods",
      name: "CocoaPods",
      type: "cocoapods",
      config: "{}",
      isBuiltIn: true,
      description: "CocoaPods — iOS and macOS library versions",
    },
  });

  await prisma.checkSource.upsert({
    where: { id: "builtin-cpan" },
    update: {},
    create: {
      id: "builtin-cpan",
      name: "MetaCPAN",
      type: "cpan",
      config: "{}",
      isBuiltIn: true,
      description: "MetaCPAN — Perl distribution versions",
    },
  });

  await prisma.checkSource.upsert({
    where: { id: "builtin-fdroid" },
    update: {},
    create: {
      id: "builtin-fdroid",
      name: "F-Droid",
      type: "fdroid",
      config: "{}",
      isBuiltIn: true,
      description: "F-Droid — free Android app versions",
    },
  });

  await prisma.checkSource.upsert({
    where: { id: "builtin-firefox-addon" },
    update: {},
    create: {
      id: "builtin-firefox-addon",
      name: "Firefox Add-ons",
      type: "firefox_addon",
      config: "{}",
      isBuiltIn: true,
      description: "Firefox Add-ons (AMO) — browser extension versions",
    },
  });

  await prisma.checkSource.upsert({
    where: { id: "builtin-vscode" },
    update: {},
    create: {
      id: "builtin-vscode",
      name: "VS Code Marketplace",
      type: "vscode",
      config: "{}",
      isBuiltIn: true,
      description: "VS Code Marketplace — extension versions",
    },
  });

  await prisma.checkSource.upsert({
    where: { id: "builtin-jetbrains" },
    update: {},
    create: {
      id: "builtin-jetbrains",
      name: "JetBrains Marketplace",
      type: "jetbrains",
      config: "{}",
      isBuiltIn: true,
      description: "JetBrains Marketplace — IDE plugin versions",
    },
  });

  await prisma.checkSource.upsert({
    where: { id: "builtin-openvsx" },
    update: {},
    create: {
      id: "builtin-openvsx",
      name: "Open VSX",
      type: "openvsx",
      config: "{}",
      isBuiltIn: true,
      description: "Open VSX Registry — open-source VS Code extension versions",
    },
  });

  await prisma.checkSource.upsert({
    where: { id: "builtin-aur" },
    update: {},
    create: {
      id: "builtin-aur",
      name: "AUR",
      type: "aur",
      config: "{}",
      isBuiltIn: true,
      description: "Arch User Repository — Arch Linux package versions",
    },
  });

  await prisma.checkSource.upsert({
    where: { id: "builtin-ansible" },
    update: {},
    create: {
      id: "builtin-ansible",
      name: "Ansible Galaxy",
      type: "ansible",
      config: "{}",
      isBuiltIn: true,
      description: "Ansible Galaxy — collection versions",
    },
  });

  await prisma.checkSource.upsert({
    where: { id: "builtin-quay" },
    update: {},
    create: {
      id: "builtin-quay",
      name: "Quay.io",
      type: "quay",
      config: "{}",
      isBuiltIn: true,
      description: "Quay.io — container image tag versions",
    },
  });

  await prisma.checkSource.upsert({
    where: { id: "builtin-bitbucket" },
    update: {},
    create: {
      id: "builtin-bitbucket",
      name: "Bitbucket",
      type: "bitbucket",
      config: "{}",
      isBuiltIn: true,
      description: "Bitbucket — repository tag versions",
    },
  });

  await prisma.checkSource.upsert({
    where: { id: "builtin-libraries-io" },
    update: {},
    create: {
      id: "builtin-libraries-io",
      name: "Libraries.io",
      type: "libraries_io",
      config: "{}",
      isBuiltIn: true,
      description: "Libraries.io — cross-platform package version tracking (API key required)",
    },
  });

  console.log("Built-in check sources ensured.");

  // --- Seed SUPER_ADMIN from environment variables ---
  const adminEmail = process.env.ADMIN_EMAIL || "admin@bumpt.local";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  const bcryptRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10);

  const existingAdmin = await prisma.user.findFirst({
    where: { role: "SUPER_ADMIN" },
  });

  if (existingAdmin) {
    console.log(`SUPER_ADMIN already exists (${existingAdmin.email}), skipping user seed.`);
  } else {
    const passwordHash = await bcrypt.hash(adminPassword, bcryptRounds);
    const superAdmin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        role: "SUPER_ADMIN",
      },
    });
    console.log(`Created SUPER_ADMIN: ${superAdmin.email}`);
  }

  // --- Initialize app settings from environment variables ---
  console.log("Initializing app settings from environment...");

  await initSettingIfMissing("app_language", process.env.APP_LANGUAGE || "");
  await initSettingIfMissing("github_token", process.env.GITHUB_TOKEN || "");
  await initSettingIfMissing("winget_api_key", process.env.WINGET_API_KEY || "");
  await initSettingIfMissing("gitlab_token", process.env.GITLAB_TOKEN || "");
  await initSettingIfMissing("bitbucket_token", process.env.BITBUCKET_TOKEN || "");
  await initSettingIfMissing("nvd_api_key", process.env.NVD_API_KEY || "");
  await initSettingIfMissing("libraries_io_api_key", process.env.LIBRARIES_IO_API_KEY || "");
  await initSettingIfMissing("vulndb_client_id", process.env.VULNDB_CLIENT_ID || "");
  await initSettingIfMissing("vulndb_client_secret", process.env.VULNDB_CLIENT_SECRET || "");

  // AI enrichment settings
  await initSettingIfMissing("ai_provider", process.env.AI_PROVIDER || "");
  await initSettingIfMissing("ai_openai_key", process.env.AI_OPENAI_KEY || "");
  await initSettingIfMissing("ai_openai_model", process.env.AI_OPENAI_MODEL || "");
  await initSettingIfMissing("ai_anthropic_key", process.env.AI_ANTHROPIC_KEY || "");
  await initSettingIfMissing("ai_anthropic_model", process.env.AI_ANTHROPIC_MODEL || "");
  await initSettingIfMissing("ai_mistral_key", process.env.AI_MISTRAL_KEY || "");
  await initSettingIfMissing("ai_mistral_model", process.env.AI_MISTRAL_MODEL || "");
  await initSettingIfMissing("ai_self_hosted_url", process.env.AI_SELF_HOSTED_URL || "");
  await initSettingIfMissing("ai_self_hosted_key", process.env.AI_SELF_HOSTED_KEY || "");
  await initSettingIfMissing("ai_self_hosted_model", process.env.AI_SELF_HOSTED_MODEL || "");

  // Database connection settings
  await initSettingIfMissing("db_type", process.env.DB_TYPE || "");
  await initSettingIfMissing("db_host", process.env.DB_HOST || "");
  await initSettingIfMissing("db_port", process.env.DB_PORT || "");
  await initSettingIfMissing("db_name", process.env.DB_NAME || "");
  await initSettingIfMissing("db_user", process.env.DB_USER || "");
  await initSettingIfMissing("db_password", process.env.DB_PASSWORD || "");
  await initSettingIfMissing("db_ssl", process.env.DB_SSL || "");

  // SAML / SSO settings
  await initSettingIfMissing("saml_enabled", process.env.SAML_ENABLED || "");
  await initSettingIfMissing("saml_entity_id", process.env.SAML_ENTITY_ID || "");
  await initSettingIfMissing("saml_sso_url", process.env.SAML_SSO_URL || "");
  await initSettingIfMissing("saml_certificate", process.env.SAML_CERTIFICATE || "");
  await initSettingIfMissing("saml_callback_url", process.env.SAML_CALLBACK_URL || "");

  // --- Migrate existing items without sourceId ---
  const unmigrated = await prisma.monitoredItem.findMany({
    where: { sourceId: null, checkConfig: { not: null } },
  });

  let migratedCount = 0;
  for (const item of unmigrated) {
    if (!item.checkConfig) continue;
    try {
      const cfg = JSON.parse(item.checkConfig) as Record<string, string>;
      if (cfg.source === "dockerhub" && cfg.image) {
        await prisma.monitoredItem.update({
          where: { id: item.id },
          data: {
            sourceId: dockerHubSource.id,
            sourceParams: JSON.stringify({ image: cfg.image }),
          },
        });
        migratedCount++;
      } else if (cfg.source === "github" && cfg.repo) {
        await prisma.monitoredItem.update({
          where: { id: item.id },
          data: {
            sourceId: githubSource.id,
            sourceParams: JSON.stringify({ repo: cfg.repo }),
          },
        });
        migratedCount++;
      }
    } catch {
      // skip unparseable configs
    }
  }

  if (migratedCount > 0) {
    console.log(`Migrated ${migratedCount} existing items to CheckSource references.`);
  }

  // --- Seed demo items (only if enabled and none exist) ---
  const seedDemo = process.env.SEED_DEMO_DATA === "true";
  const itemCount = await prisma.monitoredItem.count();

  if (!seedDemo && itemCount === 0) {
    console.log("No demo data requested (set SEED_DEMO_DATA=true to seed demo items).");
    return;
  }

  if (itemCount > 0) {
    console.log(`${itemCount} items already exist, skipping item seed.`);
    return;
  }

  const items = [
    {
      name: "Google Chrome",
      type: "software",
      currentVersion: "120.0.6099.130",
      latestVersion: "121.0.6167.85",
      checkMethod: "api",
      checkConfig: JSON.stringify({ source: "github", repo: "AChromium/AChromium-browser" }),
      sourceId: githubSource.id,
      sourceParams: JSON.stringify({ repo: "AChromium/AChromium-browser" }),
      status: "outdated",
    },
    {
      name: "nginx",
      type: "docker",
      currentVersion: "1.24.0",
      latestVersion: "1.25.3",
      checkMethod: "api",
      checkConfig: JSON.stringify({ source: "dockerhub", image: "library/nginx" }),
      sourceId: dockerHubSource.id,
      sourceParams: JSON.stringify({ image: "library/nginx" }),
      status: "outdated",
    },
    {
      name: "PostgreSQL",
      type: "docker",
      currentVersion: "16.1",
      latestVersion: "16.1",
      checkMethod: "api",
      checkConfig: JSON.stringify({ source: "dockerhub", image: "library/postgres" }),
      sourceId: dockerHubSource.id,
      sourceParams: JSON.stringify({ image: "library/postgres" }),
      status: "up_to_date",
    },
    {
      name: "Ubuntu Server",
      type: "system",
      currentVersion: "22.04.3 LTS",
      latestVersion: "24.04 LTS",
      checkMethod: "manual",
      status: "critical",
    },
    {
      name: "Node.js",
      type: "software",
      currentVersion: "20.11.0",
      latestVersion: "20.11.0",
      checkMethod: "api",
      checkConfig: JSON.stringify({ source: "github", repo: "nodejs/node" }),
      sourceId: githubSource.id,
      sourceParams: JSON.stringify({ repo: "nodejs/node" }),
      status: "up_to_date",
    },
    {
      name: "Grafana",
      type: "service",
      currentVersion: "10.2.0",
      latestVersion: "10.3.1",
      checkMethod: "api",
      checkConfig: JSON.stringify({ source: "github", repo: "grafana/grafana" }),
      sourceId: githubSource.id,
      sourceParams: JSON.stringify({ repo: "grafana/grafana" }),
      status: "outdated",
    },
  ];

  for (const item of items) {
    await prisma.monitoredItem.create({ data: item });
  }

  console.log(`Created ${items.length} demo monitored items.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
