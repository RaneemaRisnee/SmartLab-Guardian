const { Server } = require('socket.io');

let io = null;

/**
 * Attaches a socket.io server to the running HTTP server. The dashboard uses
 * these events only as a nudge to refetch — every screen still works on plain
 * REST polling if the websocket cannot connect.
 */
function initRealtime(httpServer, origins) {
  io = new Server(httpServer, {
    cors: { origin: origins, credentials: true }
  });

  io.on('connection', (socket) => {
    socket.on('join', (room) => {
      if (typeof room === 'string' && room.length < 64) socket.join(room);
    });
  });

  return io;
}

/** Broadcasts an event to every connected dashboard. Safe before init. */
function emitEvent(event, payload) {
  if (!io) return;
  io.emit(event, payload);
}

module.exports = { initRealtime, emitEvent };
