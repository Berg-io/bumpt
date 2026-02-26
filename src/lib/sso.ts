export const SSO_STATE_COOKIE = "sso-state";

export interface SsoUserProfile {
  email: string;
  name?: string;
  username?: string;
}

export async function getSsoSettings() {
  return {
    saml: {
      enabled: false,
      entityId: "",
      ssoUrl: "",
      certificate: "",
      callbackUrl: "",
      buttonLabel: "",
      imageUrl: "",
    },
    oidc: {
      enabled: false,
      clientId: "",
      clientSecret: "",
      issuer: "",
      callbackUrl: "",
      scope: "",
      buttonLabel: "",
      imageUrl: "",
    },
  };
}

export async function getBaseUrl(): Promise<string> {
  return "http://localhost:3000";
}

export function generateState(): string {
  return "";
}

export function generateNonce(): string {
  return "";
}

export async function findOrCreateSsoUser(
  _profile: SsoUserProfile,
  _authType: "saml" | "oidc"
) {
  return null;
}

export function buildSsoSuccessResponse(
  _user: { id: string; email: string; role: string },
  _redirectTo: string,
  _baseUrl: string,
  _authType: "saml" | "oidc"
) {
  throw new Error("SSO requires a Professional license");
}

export function buildSsoErrorResponse(_baseUrl: string, _errorKey: string) {
  throw new Error("SSO requires a Professional license");
}
