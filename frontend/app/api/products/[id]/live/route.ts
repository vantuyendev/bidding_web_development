import { EventEmitter } from "events";

export const dynamic = 'force-dynamic';

// Create a global event emitter instance that survives Next.js hot-reloading in dev mode
const globalForEvents = globalThis as unknown as {
  productEvents?: EventEmitter;
};

export const productEvents = globalForEvents.productEvents ?? new EventEmitter();

if (process.env.NODE_ENV !== 'production') {
  globalForEvents.productEvents = productEvents;
}

// Helper to trigger events to all active SSE streams for a specific product
export function triggerProductUpdate(productId: string, currentPrice: number, endTime: string) {
  productEvents.emit(`update-${productId}`, { currentPrice, endTime });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let isClosed = false;

  const stream = new ReadableStream({
    start(controller) {
      // Helper function to send structured SSE messages
      const sendEvent = (event: string | undefined, data: any) => {
        if (isClosed) return;
        try {
          const eventString = event ? `event: ${event}\n` : "";
          controller.enqueue(
            new TextEncoder().encode(`${eventString}data: ${JSON.stringify(data)}\n\n`)
          );
        } catch (e) {
          // Stream could be closed already
        }
      };

      // Send initial connection confirmation event
      sendEvent("connected", { message: "SSE connection established successfully", productId: id });

      // Event listener for product updates (defaults to event 'message', triggering onmessage on client)
      const onUpdate = (data: { currentPrice: number; endTime: string }) => {
        sendEvent(undefined, data);
      };

      const eventName = `update-${id}`;
      productEvents.on(eventName, onUpdate);

      // Setup a periodic heartbeat to prevent network/proxy timeout disconnects (every 15s)
      const heartbeat = setInterval(() => {
        sendEvent("heartbeat", { time: new Date().toISOString() });
      }, 15000);

      // Clean up listeners on client disconnect
      request.signal.addEventListener("abort", () => {
        isClosed = true;
        clearInterval(heartbeat);
        productEvents.off(eventName, onUpdate);
        try {
          controller.close();
        } catch (e) {
          // Silent catch in case it is already closed
        }
      });
    },
    cancel() {
      isClosed = true;
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
