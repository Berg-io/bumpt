import { z } from "zod";

export const createItemSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum([
    "software", "system", "docker", "service",
    "firmware", "plugin", "library", "database", "network",
    "mobile_app", "desktop_app", "web_app", "os", "driver", "iot",
  ]),
  currentVersion: z.string().optional().nullable(),
  latestVersion: z.string().optional().nullable(),
  checkMethod: z.enum(["manual", "api", "scraping"]).default("manual"),
  checkConfig: z.string().optional().nullable(),
  sourceId: z.string().optional().nullable().transform(v => v === "" ? null : v),
  sourceParams: z.string().optional().nullable(),
  status: z.enum(["up_to_date", "outdated", "critical"]).default("up_to_date"),
  monitoringEnabled: z.boolean().optional(),
  tags: z.array(z.string().min(1).max(30)).max(10).optional(),
});

export const updateItemSchema = createItemSchema.partial();

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["SUPER_ADMIN", "ADMIN"]).default("ADMIN"),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  role: z.enum(["SUPER_ADMIN", "ADMIN"]).optional(),
});

export const createSourceSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum([
    "dockerhub", "github", "gitlab", "appstore", "playstore", "msstore",
    "json_api", "html", "chrome", "endoflife", "npm", "pypi",
    "repology", "homebrew", "wordpress", "winget", "csv_data",
    "maven", "nuget", "packagist", "crates", "rubygems", "goproxy",
    "helm", "snap", "flathub", "terraform", "chocolatey",
    "pub", "hex", "conda", "cocoapods", "cpan", "fdroid",
    "firefox_addon", "vscode", "jetbrains", "openvsx",
    "aur", "ansible", "quay", "bitbucket",
  ]),
  config: z.string().default("{}"),
  description: z.string().optional().nullable(),
});

export const updateSourceSchema = createSourceSchema.partial();
