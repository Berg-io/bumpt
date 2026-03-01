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
  status: z.enum(["up_to_date", "outdated", "end_of_life"]).default("up_to_date"),
  securityState: z.enum(["vulnerable", "no_known_vuln"]).optional(),
  monitoringEnabled: z.boolean().optional(),
  assetCriticality: z.number().int().min(0).max(5).optional().nullable(),
  environment: z.enum(["prod", "preprod", "dev", "test"]).optional().nullable(),
  networkExposure: z.enum(["internet", "intranet", "isolated"]).optional().nullable(),
  hostsSensitiveData: z.boolean().optional().nullable(),
  hasPrivilegedAccess: z.boolean().optional().nullable(),
  hasCompensatingControls: z.boolean().optional().nullable(),
  userNote: z.string().max(30).optional().nullable(),
  tags: z.array(z.string().min(1).max(30)).max(10).optional(),
});

export const updateItemSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  type: z.enum([
    "software", "system", "docker", "service",
    "firmware", "plugin", "library", "database", "network",
    "mobile_app", "desktop_app", "web_app", "os", "driver", "iot",
  ]).optional(),
  currentVersion: z.string().optional().nullable(),
  latestVersion: z.string().optional().nullable(),
  checkMethod: z.enum(["manual", "api", "scraping"]).optional(),
  checkConfig: z.string().optional().nullable(),
  sourceId: z.string().optional().nullable().transform(v => v === "" ? null : v),
  sourceParams: z.string().optional().nullable(),
  status: z.enum(["up_to_date", "outdated", "end_of_life"]).optional(),
  securityState: z.enum(["vulnerable", "no_known_vuln"]).optional(),
  monitoringEnabled: z.boolean().optional(),
  assetCriticality: z.number().int().min(0).max(5).optional().nullable(),
  environment: z.enum(["prod", "preprod", "dev", "test"]).optional().nullable(),
  networkExposure: z.enum(["internet", "intranet", "isolated"]).optional().nullable(),
  hostsSensitiveData: z.boolean().optional().nullable(),
  hasPrivilegedAccess: z.boolean().optional().nullable(),
  hasCompensatingControls: z.boolean().optional().nullable(),
  userNote: z.string().max(30).optional().nullable(),
  tags: z.array(z.string().min(1).max(30)).max(10).optional(),
});

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
