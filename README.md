# bum.pt

Self-hosted software version monitoring dashboard for IT teams. Track software, Docker images, and services from one place, with CVE enrichment and optional AI analysis.

**[Website](https://bum.pt)** · **[Documentation](https://bum.pt/docs)** · **[Get Professional](https://bum.pt)**

## Quick Start

```bash
git clone https://github.com/Berg-io/bumpt.git
cd bumpt
cp .env.example .env
docker compose up -d
```

Open `https://localhost` and sign in:

- Email: `admin@bumpt.local`
- Password: `admin123`
- Role: `SUPER_ADMIN`

Change the default password immediately after first login.

## Editions

| Feature | Community | Professional |
|---|---|---|
| Monitored items | Up to 25 (disabled items included) | Unlimited |
| Check sources | 43 (41 built-in + JSON API + HTML scraper) | 43 |
| Dashboard + TV/NOC mode | Yes | Yes |
| Audit logs | Yes | Yes |
| Release metadata + CVE enrichment | Yes | Yes |
| CSV export / print | Yes | Yes |
| Languages | 13 | 13 |
| Databases | SQLite, PostgreSQL, MariaDB | + MSSQL |
| AI enrichment | No | Yes |
| Webhooks + notifications | No | Yes |
| Scheduled reports | No | Yes |
| SSO (SAML + OIDC) | No | Yes |
| REST API + API keys | No | Yes |
| MCP server | No | Yes |

### Upgrading to Professional

The Community image does not contain the Professional features. After purchasing
on [bum.pt](https://bum.pt) you receive:

1. a license key by e-mail;
2. access to the private `bergstudioapp/bumpt-pro-dist` repository on your GitHub account, with the
   Docker Compose file and installation steps for the Professional image.

Your data stays in the same volume: point `BUMPT_IMAGE` to the Professional image, set
`LICENSE_KEY`, then run `docker compose up -d`.

## What bum.pt does

- Global dashboard with status cards and filters
- Fullscreen TV/NOC view (`/overview`)
- Item-level history, release notes, and acknowledgement workflow
- CVE enrichment after checks (OSV, NVD, GitHub Advisory, optional VulnDB)
- Role-based access control (`ADMIN`, `SUPER_ADMIN`)
- i18n (13 languages), dark mode, responsive UI
- Audit logs for admin operations

## Built-in check sources

bum.pt includes 43 connectors across ecosystems and registries, including:

- Container registries: Docker Hub, Quay
- Git platforms: GitHub, GitLab, Bitbucket
- Package ecosystems: npm, PyPI, Maven, NuGet, Packagist, Crates, RubyGems, Go, Helm, Terraform, Chocolatey, Conda, CocoaPods, CPAN, and more
- App stores and marketplaces: App Store, Play Store, Microsoft Store, VS Code Marketplace, JetBrains Marketplace, Open VSX, Firefox Add-ons
- Generic integrations: JSON API, HTML scraper, CSV import

Connector details are available in the running app and docs.

## Professional capabilities

- AI enrichment as a complementary post-processing layer after source checks and CVE APIs (OpenAI, Anthropic, Mistral, OpenAI-compatible self-hosted endpoints)
- Webhooks and notifications (Slack, Discord, Teams, SMTP, custom HTTP)
- Scheduled reports
- SSO (SAML 2.0 and OIDC)
- API keys and external API integrations
- MCP server transports:
  - HTTP endpoint: `/api/mcp`
  - stdio transport for local IDE tooling

## Core environment variables

Copy `.env.example` to `.env`, then configure as needed.

### Minimum setup

```env
DB_TYPE=sqlite
DATABASE_URL=file:/app/data/production.db
ADMIN_EMAIL=admin@bumpt.local
ADMIN_PASSWORD=change_me
```

### Common options

- App:
  - `NEXT_PUBLIC_APP_NAME`
  - `APP_LANGUAGE`
  - `APP_URL` (public URL, used for SSO redirects)
  - `APP_PORT`, `APP_BIND` (direct HTTP port, bound to `127.0.0.1` by default; use Caddy)
  - `SEED_DEMO_DATA`
- Database:
  - `DB_TYPE` (`sqlite`, `postgresql`, `mariadb`, `mssql`)
  - `DATABASE_URL`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL`
- Security and auth:
  - `JWT_SECRET` (generated and stored in the data volume when left empty), `JWT_EXPIRY`, `BCRYPT_SALT_ROUNDS`, `STRICT_ENV_VALIDATION`
  - `CORS_ALLOWED_ORIGINS` (empty = same origin only), `OUTBOUND_ALLOW_LOCAL`
- Scheduled checks (built into the app, no separate cron container):
  - `CRON_SCHEDULE`, `REPORTS_SCHEDULE`, `SCHEDULER_ENABLED`
  - `CRON_SECRET` (only to call `/api/cron/*` from outside; generated when empty)
  - `RATE_LIMIT_MAX`
- Reverse proxy:
  - `CADDY_DOMAIN`, `CADDY_HTTP_PORT`, `CADDY_HTTPS_PORT`, `CADDY_TLS_EMAIL`
- Optional provider keys:
  - `GITHUB_TOKEN`, `GITLAB_TOKEN`, `WINGET_API_KEY`, `NVD_API_KEY`
  - `LIBRARIES_IO_API_KEY` (required by the Libraries.io source, paid service)

### Professional-only options

- License:
  - `LICENSE_KEY`
- AI:
  - `AI_ENRICHMENT_ENABLED`, `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`
  - `AI_TIMEOUT`, `AI_MAX_RETRIES`, `AI_QUOTA_PER_RUN`, `AI_PROMPT_TEMPLATE`
  - `AI_PROVIDER`, `AI_OPENAI_KEY`, `AI_ANTHROPIC_KEY`, `AI_MISTRAL_KEY`
  - `AI_SELF_HOSTED_URL`, `AI_SELF_HOSTED_KEY`, `AI_SELF_HOSTED_MODEL`
- SSO:
  - `SAML_*`, `OIDC_*`
- MCP stdio client:
  - `MCP_API_URL`, `MCP_API_KEY`

For full variable descriptions, use `.env.example` as the source of truth.

## Docker deployment notes

- Caddy is included as reverse proxy.
- Default mode uses local/self-signed certs for internal usage.
- For public HTTPS, set a real domain and `CADDY_TLS_EMAIL`.
- Startup sequence:
  1. Apply migrations
  2. Seed built-in check sources
  3. Create super admin on first launch
  4. Initialize app settings from env
  5. Optionally seed demo data (`SEED_DEMO_DATA=true`)

### Database profiles

- SQLite: no DB container (default)
- PostgreSQL: set `COMPOSE_PROFILES=postgresql`
- MariaDB: set `COMPOSE_PROFILES=mariadb`
- MSSQL: external DB endpoint

## API and docs

- OpenAPI spec: `/api/openapi`
- Interactive docs: `/docs`
- Health check: `/api/health`
- MCP docs (Professional): `/docs/mcp`

Authentication methods:

1. Cookie `auth-token`
2. `Authorization: Bearer <JWT>`
3. `x-api-key: <API_KEY>` (Professional)

## Useful commands

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run Prisma migrations (dev) |
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed database |
| `npm run db:studio` | Open Prisma Studio |

## Backup examples

SQLite:

```bash
docker compose exec app sh -c "cp /app/data/production.db /app/data/backup-$(date +%Y%m%d).db"
```

PostgreSQL:

```bash
docker compose exec postgresql pg_dump -U bumpt bumpt > backup-$(date +%Y%m%d).sql
```

MariaDB:

```bash
docker compose exec mariadb mariadb-dump -u bumpt -p bumpt > backup-$(date +%Y%m%d).sql
```

## Update flow

```bash
docker compose pull
docker compose up -d --remove-orphans
```

`--remove-orphans` removes the former `cron` (Ofelia) container: scheduled checks now run inside the app.

Migrations are applied automatically during startup. Back up your data first (see above). With PostgreSQL or MariaDB, the container refuses to start when a schema change would delete data; set `PRISMA_ACCEPT_DATA_LOSS=true` once if the change is expected.

`latest` only moves on releases. Pushes to `main` publish the `edge` tag, for testing only.

## Release flow (SemVer)

Use `package.json` version as the single source of truth. See [docs/RELEASING.md](docs/RELEASING.md) for the full checklist.

1. Bump version in `package.json` (e.g. `0.1.0` -> `0.2.0`)
2. Add `release-notes/vX.Y.Z.md` and run `npm run release:prepare`
3. Create and push release tag:

```bash
git tag pro/vX.Y.Z
git push origin pro/vX.Y.Z
```

CI validates that `package.json` version matches tag `X.Y.Z`, then publishes Pro and Community releases and Docker images.

## License

bum.pt is source-available under a [proprietary license](LICENSE).

You may use, self-host, and study the code. You may not remove or bypass license verification, feature gating, or item limits. Offering bum.pt as a hosted service (SaaS) or creating a competing product requires a separate commercial agreement.

Professional features require a [paid license](https://bum.pt).

A product by [Berg Studio](https://bergstudio.app).
