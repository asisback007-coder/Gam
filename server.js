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
let coopEnemies = {};
let nextEnemyId = 1;
let coopPlayers = new Set();
const ARENA = { x: 0, y: 3000, z: 0 };
const COOP_CAP = 10;

function coopPlayerPositions() {
  return Array.from(coopPlayers).map(id => players[id]).filter(p => p);
}

function spawnCoopEnemy() {
  const ang = Math.random() * Math.PI * 2;
  const r = 20 + Math.random() * 15;
  const hp = 35 + Math.floor(Math.random() * 20);
  const id = nextEnemyId++;
  coopEnemies[id] = {
    id,
    x: ARENA.x + Math.cos(ang) * r,
    y: ARENA.y + 1.5,
    z: ARENA.z + Math.sin(ang) * r,
    hp, maxHp: hp
  };
}

setInterval(() => {
  if (coopPlayers.size === 0) return;
  if (Object.keys(coopEnemies).length >= COOP_CAP) return;
  spawnCoopEnemy();
}, 4000);

setInterval(() => {
  const targets = coopPlayerPositions();
  if (targets.length === 0) return;
  const speed = 2.4 * 0.15;
  Object.values(coopEnemies).forEach(en => {
    let nearest = null, nd = Infinity;
    targets.forEach(p => {
      const dx = p.x - en.x, dz = p.z - en.z;
      const d = dx*dx + dz*dz;
      if (d < nd) { nd = d; nearest = p; }
    });
    if (nearest) {
      const dx = nearest.x - en.x, dz = nearest.z - en.z;
      const dist = Math.sqrt(dx*dx + dz*dz);
      if (dist > 0.1) {
        en.x += (dx/dist) * speed;
        en.z += (dz/dist) * speed;
      }
    }
  });
  if (Object.keys(coopEnemies).length > 0) {
    broadcast({ type: 'coopUpdate', enemies: Object.values(coopEnemies) });
  }
}, 150);

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
  players[id] = { id, x: 0, y: 0, z: 0, yaw: 0, name: 'Wanderer' + id, color: 0x8855ff, hp: 100, pvp: false };
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

    if (data.type === 'pvpToggle') {
      const p = players[ws.playerId];
      if (!p) return;
      p.pvp = !!data.on;
      broadcast({ type: 'pvpToggle', id: ws.playerId, on: p.pvp });
    }

    if (data.type === 'duelHit') {
      broadcast({ type: 'duelHit', from: ws.playerId, targetId: data.targetId, dmg: data.dmg });
    }

    if (data.type === 'duelDefeat') {
      broadcast({ type: 'duelDefeat', victim: data.victim, killer: data.killer });
    }

    if (data.type === 'coopJoin') {
      coopPlayers.add(ws.playerId);
      broadcast({ type: 'coopUpdate', enemies: Object.values(coopEnemies) });
    }

    if (data.type === 'coopLeave') {
      coopPlayers.delete(ws.playerId);
    }

    if (data.type === 'coopHit') {
      const en = coopEnemies[data.enemyId];
      if (!en) return;
      en.hp -= data.dmg;
      if (en.hp <= 0) {
        delete coopEnemies[data.enemyId];
        const reward = 15 + Math.floor(en.maxHp / 5);
        broadcast({ type: 'coopKill', enemyId: data.enemyId, killerId: ws.playerId, reward });
      }
    }
  });

  ws.on('close', () => {
    delete players[ws.playerId];
    coopPlayers.delete(ws.playerId);
    broadcast({ type: 'leave', id: ws.playerId });
  });
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log('Aethermoor multiplayer server running on port ' + PORT);
});
