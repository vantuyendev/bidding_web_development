import productEvents from '../utils/eventEmitter.js';

export const streamProductEvents = (req, res) => {
  const { id } = req.params;

  // Set mandatory SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no' // Prevent Nginx from buffering SSE responses
  });

  // Flush the headers
  res.write('\n');

  // Helper to send structured SSE messages
  const sendEvent = (event, data) => {
    try {
      const eventString = event ? `event: ${event}\n` : '';
      res.write(`${eventString}data: ${JSON.stringify(data)}\n\n`);
    } catch (e) {
      // Stream could be closed
    }
  };

  // Send initial connection confirmation event
  sendEvent('connected', { message: 'SSE connection established successfully', productId: id });

  // Event listener for product updates
  const onUpdate = (data) => {
    sendEvent(undefined, data); // default event type is message
  };

  const eventName = `update-${id}`;
  productEvents.on(eventName, onUpdate);

  // Setup periodic heartbeat to prevent proxy timeout disconnects (every 15s)
  const heartbeat = setInterval(() => {
    sendEvent('heartbeat', { time: new Date().toISOString() });
  }, 15000);

  // Clean up listeners on client disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    productEvents.off(eventName, onUpdate);
    res.end();
  });
};

// Helper function to trigger events to all active SSE streams for a specific product
export const triggerProductUpdate = (productId, currentPrice, endTime, status, bid) => {
  productEvents.emit(`update-${productId}`, { currentPrice, endTime, status, bid });
};

