import { prisma } from "@/lib/prisma";

export async function getAppSetting(key: string): Promise<string | null> {
  const setting = await prisma.appSetting.findUnique({ where: { key } });
  return setting?.value || null;
}

export async function setAppSetting(key: string, value: string): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const settings = await prisma.appSetting.findMany();
  const result: Record<string, string> = {};
  for (const s of settings) {
    result[s.key] = s.value;
  }
  return result;
}

export async function setMultipleSettings(
  entries: Record<string, string>
): Promise<void> {
  const ops = Object.entries(entries).map(([key, value]) =>
    prisma.appSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    })
  );
  await prisma.$transaction(ops);
}

export const SETTING_KEYS = {
  GITHUB_TOKEN: "github_token",
  GITLAB_TOKEN: "gitlab_token",
  BITBUCKET_TOKEN: "bitbucket_token",
  WINGET_API_KEY: "winget_api_key",
  NVD_API_KEY: "nvd_api_key",
  LIBRARIES_IO_API_KEY: "libraries_io_api_key",
  VULNDB_CLIENT_ID: "vulndb_client_id",
  VULNDB_CLIENT_SECRET: "vulndb_client_secret",
  CVE_ENRICHMENT_ENABLED: "cve_enrichment_enabled",
  AI_PROVIDER: "ai_provider",
  AI_ENRICHMENT_ENABLED: "ai_enrichment_enabled",
  AI_OPENAI_KEY: "ai_openai_key",
  AI_OPENAI_MODEL: "ai_openai_model",
  AI_ANTHROPIC_KEY: "ai_anthropic_key",
  AI_ANTHROPIC_MODEL: "ai_anthropic_model",
  AI_MISTRAL_KEY: "ai_mistral_key",
  AI_MISTRAL_MODEL: "ai_mistral_model",
  AI_SELF_HOSTED_URL: "ai_self_hosted_url",
  AI_SELF_HOSTED_KEY: "ai_self_hosted_key",
  AI_SELF_HOSTED_MODEL: "ai_self_hosted_model",
  APP_LANGUAGE: "app_language",
  APP_TIMEZONE: "app_timezone",
  APP_DATE_FORMAT: "app_date_format",
  APP_TIME_FORMAT: "app_time_format",
  SAML_ENABLED: "saml_enabled",
  SAML_ENTITY_ID: "saml_entity_id",
  SAML_SSO_URL: "saml_sso_url",
  SAML_CERTIFICATE: "saml_certificate",
  SAML_CALLBACK_URL: "saml_callback_url",
  SAML_BUTTON_LABEL: "saml_button_label",
  SAML_IMAGE_URL: "saml_image_url",
  OIDC_ENABLED: "oidc_enabled",
  OIDC_CLIENT_ID: "oidc_client_id",
  OIDC_CLIENT_SECRET: "oidc_client_secret",
  OIDC_ISSUER: "oidc_issuer",
  OIDC_CALLBACK_URL: "oidc_callback_url",
  OIDC_SCOPE: "oidc_scope",
  OIDC_BUTTON_LABEL: "oidc_button_label",
  OIDC_IMAGE_URL: "oidc_image_url",
  DB_TYPE: "db_type",
  DB_HOST: "db_host",
  DB_PORT: "db_port",
  DB_NAME: "db_name",
  DB_USER: "db_user",
  DB_PASSWORD: "db_password",
  DB_SSL: "db_ssl",
  SMTP_CONFIGURED: "smtp_configured",
  SMTP_HOST: "smtp_host",
  SMTP_PORT: "smtp_port",
  SMTP_SECURE: "smtp_secure",
  SMTP_USER: "smtp_user",
  SMTP_PASSWORD: "smtp_password",
  SMTP_FROM: "smtp_from",
} as const;
