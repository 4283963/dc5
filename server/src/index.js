const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const Room = require('./Room');
const { MESSAGE_TYPES } = require('../../shared/constants');

const PORT = process.env.PORT || 8080;

const CLIENT_DIR = path.join(__dirname, '../../client');
const SHARED_DIR = path.join(__dirname, '../../shared');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

function serveStaticFile(req, res) {
  let urlPath = req.url.split('?')[0];

  if (urlPath === '/') {
    urlPath = '/index.html';
  }

  let filePath;
  if (urlPath.startsWith('/shared/')) {
    filePath = path.join(SHARED_DIR, urlPath.replace('/shared/', ''));
  } else {
    filePath = path.join(CLIENT_DIR, urlPath);
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Server Error');
      }
      return;
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/ws')) {
    return;
  }
  serveStaticFile(req, res);
});

const wss = new WebSocket.Server({ server, path: '/ws' });

const rooms = new Map();

function getOrCreateRoom(roomId) {
  let room = rooms.get(roomId);
  if (!room) {
    room = new Room(roomId);
    rooms.set(roomId, room);
    console.log(`Room ${roomId} created`);
  }
  return room;
}

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const roomId = url.searchParams.get('room') || 'default';
  const playerName = url.searchParams.get('name') || 'Player';
  const playerId = Math.random().toString(36).slice(2, 9);

  console.log(`Player ${playerId} (${playerName}) connected to room ${roomId}`);

  const room = getOrCreateRoom(roomId);
  room.addPlayer(ws, playerId, playerName);

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case MESSAGE_TYPES.INPUT:
          room.handleInput(playerId, message.input);
          break;
        case MESSAGE_TYPES.SHOOT:
          room.handleShoot(playerId, message.targetX, message.targetY);
          break;
      }
    } catch (err) {
      console.error('Error parsing message:', err);
    }
  });

  ws.on('close', () => {
    console.log(`Player ${playerId} disconnected`);
    room.removePlayer(playerId);

    if (room.playerCount === 0) {
      room.destroy();
      rooms.delete(roomId);
      console.log(`Room ${roomId} destroyed`);
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket: ws://localhost:${PORT}/ws`);
  console.log('Open the URL in your browser to play!');
});
