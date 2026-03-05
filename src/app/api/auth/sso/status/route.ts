import { NextResponse } from "next/server";
import { getSsoSettings } from "@/lib/sso";

export async function GET() {
  try {
    const settings = await getSsoSettings();

    return NextResponse.json({
      saml: {
        enabled: settings.saml.enabled,
        buttonLabel: settings.saml.buttonLabel || undefined,
        imageUrl: settings.saml.imageUrl || undefined,
      },
      oidc: {
        enabled: settings.oidc.enabled,
        buttonLabel: settings.oidc.buttonLabel || undefined,
        imageUrl: settings.oidc.imageUrl || undefined,
      },
    });
  } catch {
    return NextResponse.json({ saml: { enabled: false }, oidc: { enabled: false } });
  }
}
