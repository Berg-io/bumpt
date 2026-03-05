import { withAuth } from "@/lib/middleware-auth";
import { subscribeCheckEvents } from "@/lib/check-events";
import type { JWTPayload } from "@/types";

export const runtime = "nodejs";

export const GET = withAuth(
  async (request: Request, _ctx: { params: Promise<Record<string, string>>; user: JWTPayload }) => {
    const { searchParams } = new URL(request.url);
    const itemIdFilter = searchParams.get("itemId");
    const batchIdFilter = searchParams.get("batchId");

    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const writeEvent = (eventName: string, data: unknown) => {
          controller.enqueue(encoder.encode(`event: ${eventName}\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        writeEvent("ready", { ok: true, timestamp: new Date().toISOString() });

        const unsubscribe = subscribeCheckEvents((payload) => {
          if (itemIdFilter && payload.itemId && payload.itemId !== itemIdFilter) return;
          if (batchIdFilter && payload.batchId && payload.batchId !== batchIdFilter) return;
          writeEvent(payload.type, payload);
        });

        const heartbeat = setInterval(() => {
          controller.enqueue(encoder.encode(": ping\n\n"));
        }, 20000);

        const onAbort = () => {
          clearInterval(heartbeat);
          unsubscribe();
          controller.close();
        };

        request.signal.addEventListener("abort", onAbort);
      },
      cancel() {
        // Handled by abort listener above.
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  },
  { roles: ["ADMIN"] }
);
