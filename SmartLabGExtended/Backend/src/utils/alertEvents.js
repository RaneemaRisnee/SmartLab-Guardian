// Tiny Server-Sent Events hub: the dashboard keeps ONE open connection and the
// server pushes a message only when an alert is created/resolved (no polling).
const clients = new Set();

function addClient(req, res) {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  res.write('retry: 3000\n\n'); // browser auto-reconnects after 3 s

  clients.add(res);
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 25000); // keeps proxies from closing it

  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(res);
  });
}

function broadcast(event, data = {}) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) res.write(msg);
}

module.exports = { addClient, broadcast, clientCount: () => clients.size };
