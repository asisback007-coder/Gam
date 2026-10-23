const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

const httpServer = http.createServer((req, res) => {
  const safePath = decodeURIComponent((req.url || '/').split('?')[0]);
  const relPath = safePath === '/' ? 'index.html' : safePath.replace(/^\/+/, '');
  const filePath = path.join(__dirname, relPath);
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(content);
  });
});

const wss = new WebSocket.Server({ server: httpServer });

let players = {};
let nextId = 1;

function broadcast(data, exceptWs) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN && client !== exceptWs) {
      client.send(msg);
    }
  });
}

wss.on('connection', (ws) => {
  const id = nextId++;
  players[id] = { id, x: 0, y: 0, z: 0, yaw: 0, name: 'Wanderer' + id, color: 0x8855ff, hp: 100 };
  ws.playerId = id;

  ws.send(JSON.stringify({ type: 'init', id, players }));
  broadcast({ type: 'join', player: players[id] }, ws);

  ws.on('message', (raw) => {
    let data;
    try { data = JSON.parse(raw); } catch (e) { return; }

    if (data.type === 'update') {
      const p = players[ws.playerId];
      if (!p) return;
      p.x = data.x; p.y = data.y; p.z = data.z; p.yaw = data.yaw;
      if (data.name) p.name = data.name;
      if (data.color) p.color = data.color;
      if (typeof data.hp === 'number') p.hp = data.hp;
      broadcast({ type: 'update', id: ws.playerId, x: p.x, y: p.y, z: p.z, yaw: p.yaw, hp: p.hp });
    }
  });

  ws.on('close', () => {
    delete players[ws.playerId];
    broadcast({ type: 'leave', id: ws.playerId });
  });
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log('Aethermoor multiplayer server running on port ' + PORT);
});
