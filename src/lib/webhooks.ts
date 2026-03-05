export type WebhookEventType =
  | "version.new"
  | "version.critical"
  | "cve.detected"
  | "item.eol"
  | "check.failed";

export interface WebhookEventPayload {
  itemName: string;
  itemType: string;
  oldVersion?: string | null;
  newVersion?: string | null;
  latestVersion?: string | null;
  cves?: string[];
  eolDate?: string | null;
  error?: string;
}

export async function dispatchWebhookEvent(
  _event: WebhookEventType,
  _payload: WebhookEventPayload
): Promise<void> {
  // Webhooks require a Professional license
}
