/* ============================================================
   AETHERMOOR — Core 3D Engine, Combat, Crafting, Boss & Phase 4 Hooks
   ============================================================ */
(function () {
'use strict';

/* ================= Scene, Camera, Renderer ================= */
var container = document.getElementById('game');
var scene = new THREE.Scene();
scene.background = new THREE.Color(0x060818);
scene.fog = new THREE.FogExp2(0x080d24, 0.0045);

var camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 600);
var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

var hemiLight = new THREE.HemisphereLight(0x9fb8ff, 0x1a1428, 0.75);
scene.add(hemiLight);

var dirLight = new THREE.DirectionalLight(0xdce8ff, 0.9);
dirLight.position.set(60, 110, 40);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 1024;
dirLight.shadow.mapSize.height = 1024;
dirLight.shadow.camera.near = 10;
dirLight.shadow.camera.far = 260;
var dCam = 95;
dirLight.shadow.camera.left = -dCam;
dirLight.shadow.camera.right = dCam;
dirLight.shadow.camera.top = dCam;
dirLight.shadow.camera.bottom = -dCam;
scene.add(dirLight);

/* ================= Glow Texture Helper ================= */
function makeGlowTex() {
  var c = document.createElement('canvas');
  c.width = c.height = 64;
  var ctx = c.getContext('2d');
  var g = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(180,230,255,0.55)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
var glowTex = makeGlowTex();

/* ================= Sky Stars ================= */
(function buildStars() {
  var geo = new THREE.BufferGeometry();
  var pts = [];
  for (var i = 0; i < 900; i++) {
    var r = 240 + Math.random() * 180;
    var theta = Math.random() * Math.PI * 2;
    var phi = Math.acos(2 * Math.random() - 1);
    pts.push(
      r * Math.sin(phi) * Math.cos(theta),
      Math.abs(r * Math.cos(phi)) + 15,
      r * Math.sin(phi) * Math.sin(theta)
    );
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  var mat = new THREE.PointsMaterial({ color: 0xcfe4ff, size: 1.4, transparent: true, opacity: 0.8 });
  scene.add(new THREE.Points(geo, mat));
})();

/* ================= World Islands ================= */
var ISLE = { EMBER: 0, FROST: 1, TEMPEST: 2, STORM: 2, VOID: 3 };
var ISLANDS = [
  { id: 0, key: 'EMBER', name: 'EMBERREACH', x: 0, y: 0, z: 0, r: 58, color: 0x2c4a3e, rim: 0x4b7c5e, banner: '#7fe8ff' },
  { id: 1, key: 'FROST', name: 'FROSTVEIL EXPANSE', x: 115, y: 8, z: -65, r: 46, color: 0x3b5878, rim: 0x8ad8ff, banner: '#8ad8ff' },
  { id: 2, key: 'TEMPEST', name: 'TEMPEST SPIRE', x: -110, y: 18, z: -85, r: 44, color: 0x3d2e5c, rim: 0xb27bff, banner: '#b27bff' },
  { id: 3, key: 'VOID', name: 'AETHER SANCTUM', x: 10, y: 28, z: -155, r: 40, color: 0x2a1f4a, rim: 0xffd76a, banner: '#ffd76a' }
];

var obstacles = [];
var stations = [];
var resourceNodes = [];
var scrollPickups = [];

function islandAt(x, z) {
  for (var i = 0; i < ISLANDS.length; i++) {
    var isl = ISLANDS[i];
    var dx = x - isl.x, dz = z - isl.z;
    if (dx * dx + dz * dz <= isl.r * isl.r) return isl;
  }
  return null;
}

function groundY(x, z) {
  var isl = islandAt(x, z);
  if (!isl) return -999;
  var dx = x - isl.x, dz = z - isl.z;
  var d = Math.sqrt(dx * dx + dz * dz);
  var bump = Math.sin(x * 0.08) * Math.cos(z * 0.08) * 0.35 * (1 - d / isl.r);
  return isl.y + bump;
}

(function buildWorld() {
  ISLANDS.forEach(function (isl) {
    var g = new THREE.Group();
    var topGeo = new THREE.CylinderGeometry(isl.r, isl.r * 0.86, 4, 32);
    var topMat = new THREE.MeshStandardMaterial({ color: isl.color, roughness: 0.85, metalness: 0.05 });
    var topMesh = new THREE.Mesh(topGeo, topMat);
    topMesh.position.y = -2;
    topMesh.receiveShadow = true;
    g.add(topMesh);

    var underGeo = new THREE.ConeGeometry(isl.r * 0.85, isl.r * 0.65, 20);
    var underMat = new THREE.MeshStandardMaterial({ color: 0x1a1e30, roughness: 0.95 });
    var underMesh = new THREE.Mesh(underGeo, underMat);
    underMesh.rotation.x = Math.PI;
    underMesh.position.y = -4 - isl.r * 0.32;
    g.add(underMesh);

    var ringGeo = new THREE.TorusGeometry(isl.r - 0.5, 0.35, 8, 48);
    var ringMat = new THREE.MeshBasicMaterial({ color: isl.rim });
    var ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.05;
    g.add(ring);

    g.position.set(isl.x, isl.y, isl.z);
    scene.add(g);

    // Decorative rocks & trees (obstacles)
    var count = Math.floor(isl.r * 0.25);
    for (var i = 0; i < count; i++) {
      var ang = (i / count) * Math.PI * 2 + (i % 3) * 0.2;
      var dist = 14 + ((i * 17) % (isl.r - 20));
      var ox = isl.x + Math.cos(ang) * dist;
      var oz = isl.z + Math.sin(ang) * dist;
      // Keep merchant & boss clearing open on Emberreach
      if (isl.id === 0 && ox < -10 && Math.abs(oz) < 25) continue;
      var oy = groundY(ox, oz);
      var pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.7, 1.1, 3.2, 7),
        new THREE.MeshStandardMaterial({ color: 0x263248, roughness: 0.9 })
      );
      pillar.position.set(ox, oy + 1.6, oz);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      scene.add(pillar);
      obstacles.push({ x: ox, z: oz, y: oy, r: 1.25 });
    }

    // Brewing Cauldron on each island
    var cx = isl.x + 8, cz = isl.z - 8;
    var cy = groundY(cx, cz);
    var cGrp = new THREE.Group();
    var pot = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 0.85, 1.2, 14),
      new THREE.MeshStandardMaterial({ color: 0x1d2236, metalness: 0.6, roughness: 0.4 })
    );
    pot.position.y = 0.6;
    pot.castShadow = true;
    var soup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 0.95, 0.1, 14),
      new THREE.MeshBasicMaterial({ color: 0x6affc9 })
    );
    soup.position.y = 1.18;
    var cLight = new THREE.PointLight(0x6affc9, 1.2, 10);
    cLight.position.y = 1.6;
    cGrp.add(pot, soup, cLight);
    cGrp.position.set(cx, cy, cz);
    scene.add(cGrp);
    stations.push({ x: cx, y: cy, z: cz, group: cGrp });
  });
})();

/* ================= Materials & Resource Nodes ================= */
var NODE_DEFS = [
  { id: 'ember_leaf', name: 'Ember Leaf', color: 0xff7a5a, hex: '#ff7a5a', island: 0 },
  { id: 'moon_dew', name: 'Moon Dew', color: 0x7fe8ff, hex: '#7fe8ff', island: 0 },
  { id: 'aether_shard', name: 'Aether Shard', color: 0xffd76a, hex: '#ffd76a', island: 0 },
  { id: 'frost_bloom', name: 'Frost Bloom', color: 0x9fd8ff, hex: '#9fd8ff', island: 1 },
  { id: 'storm_quartz', name: 'Storm Quartz', color: 0xb27bff, hex: '#b27bff', island: 2 },
  { id: 'bramble_heart', name: 'Bramble Heart', color: 0x6aff8a, hex: '#6aff8a', island: 0 }
];
var NODE_BY_ID = {};
NODE_DEFS.forEach(function (n) { NODE_BY_ID[n.id] = n; });

var materials = {
  ember_leaf: 3,
  moon_dew: 3,
  aether_shard: 3,
  frost_bloom: 1,
  storm_quartz: 1
};
var totalGathered = 0;

function spawnNode(def, x, z) {
  var y = groundY(x, z);
  var grp = new THREE.Group();
  var mesh = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.65, 0),
    new THREE.MeshStandardMaterial({ color: def.color, emissive: def.color, emissiveIntensity: 0.55, roughness: 0.25 })
  );
  mesh.position.y = 0.85;
  mesh.castShadow = true;
  var spr = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color: def.color, transparent: true, opacity: 0.7,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));
  spr.scale.set(2.0, 2.0, 1);
  spr.position.y = 0.85;
  grp.add(mesh, spr);
  grp.position.set(x, y, z);
  scene.add(grp);
  resourceNodes.push({ def: def, x: x, y: y, z: z, group: grp, mesh: mesh, cooldown: 0 });
}

(function populateNodes() {
  // Emberreach nodes
  for (var i = 0; i < 6; i++) {
    var a1 = (i / 6) * Math.PI * 2;
    spawnNode(NODE_BY_ID.ember_leaf, Math.cos(a1) * 22, Math.sin(a1) * 22);
    spawnNode(NODE_BY_ID.moon_dew, Math.cos(a1 + 0.5) * 32, Math.sin(a1 + 0.5) * 32);
  }
  for (var j = 0; j < 4; j++) {
    var a2 = (j / 4) * Math.PI * 2 + 0.3;
    spawnNode(NODE_BY_ID.aether_shard, Math.cos(a2) * 38, Math.sin(a2) * 38);
  }
  // Frostveil nodes
  var frostIsl = ISLANDS[1];
  for (var k = 0; k < 6; k++) {
    var a3 = (k / 6) * Math.PI * 2;
    spawnNode(NODE_BY_ID.frost_bloom, frostIsl.x + Math.cos(a3) * 24, frostIsl.z + Math.sin(a3) * 24);
    if (k % 2 === 0) spawnNode(NODE_BY_ID.aether_shard, frostIsl.x + Math.cos(a3 + 0.4) * 30, frostIsl.z + Math.sin(a3 + 0.4) * 30);
  }
  // Tempest nodes
  var tempIsl = ISLANDS[2];
  for (var m = 0; m < 6; m++) {
    var a4 = (m / 6) * Math.PI * 2;
    spawnNode(NODE_BY_ID.storm_quartz, tempIsl.x + Math.cos(a4) * 24, tempIsl.z + Math.sin(a4) * 24);
  }
  // Void Sanctum nodes
  var voidIsl = ISLANDS[3];
  for (var n = 0; n < 6; n++) {
    var a5 = (n / 6) * Math.PI * 2;
    spawnNode(NODE_BY_ID.aether_shard, voidIsl.x + Math.cos(a5) * 22, voidIsl.z + Math.sin(a5) * 22);
  }
})();

/* ================= Recipes, Potions & Abilities ================= */
var ABILITIES = {
  nova: { id: 'nova', name: 'Frost Nova', icon: '\u2744\uFE0F', cd: 6, color: 0x7fe8ff, desc: 'Unleash an icy shockwave that damages and slows nearby foes.' },
  blink: { id: 'blink', name: 'Aether Blink', icon: '\u26A1', cd: 4.5, color: 0xb27bff, desc: 'Teleport forward in a burst of arcane lightning.' },
  meteor: { id: 'meteor', name: 'Ember Meteor', icon: '\u2604\uFE0F', cd: 8, color: 0xff6a4a, desc: 'Hurl a blazing meteor that explodes on impact.' },
  shield: { id: 'shield', name: 'Arcane Aegis', icon: '\u{1F6E1}\uFE0F', cd: 12, color: 0x6affc9, desc: 'Surround yourself with a barrier absorbing 60 damage for 8s.' },
  chain: { id: 'chain', name: 'Tempest Chain', icon: '\u{1F329}\uFE0F', cd: 7, color: 0xffd76a, desc: 'Arc lightning across up to 4 enemies in front of you.' }
};

var RECIPES = [
  { id: 'heal_draught', name: 'Vitality Draught', icon: '\u{1F9EA}', type: 'consumable', known: true,
    mats: { ember_leaf: 2, moon_dew: 1 }, desc: 'Restores 50 HP when drunk.' },
  { id: 'pot_meteor', name: 'Potion of Ember Meteor', icon: '\u2604\uFE0F', type: 'ability', abilityId: 'meteor', known: true,
    mats: { ember_leaf: 2, aether_shard: 1 }, desc: 'Drink to equip the Ember Meteor ability.' },
  { id: 'pot_shield', name: 'Potion of Arcane Aegis', icon: '\u{1F6E1}\uFE0F', type: 'ability', abilityId: 'shield', known: true,
    mats: { moon_dew: 2, aether_shard: 1 }, desc: 'Drink to equip the Arcane Aegis barrier ability.' },
  { id: 'pot_chain', name: 'Potion of Tempest Chain', icon: '\u{1F329}\uFE0F', type: 'ability', abilityId: 'chain', known: false,
    mats: { storm_quartz: 2, aether_shard: 1 }, desc: 'Drink to equip the Tempest Chain ability.' },
  { id: 'pot_nova', name: 'Potion of Frost Nova', icon: '\u2744\uFE0F', type: 'ability', abilityId: 'nova', known: true,
    mats: { frost_bloom: 1, moon_dew: 2 }, desc: 'Drink to re-equip Frost Nova.' },
  { id: 'pot_blink', name: 'Potion of Aether Blink', icon: '\u26A1', type: 'ability', abilityId: 'blink', known: true,
    mats: { moon_dew: 2, ember_leaf: 1 }, desc: 'Drink to re-equip Aether Blink.' },
  { id: 'thermal_elixir', name: 'Thermal Ward Elixir', icon: '\u{1F525}', type: 'ward', known: true,
    mats: { ember_leaf: 3, moon_dew: 2 }, desc: 'Permanent immunity to Frostveil freezing winds.' },
  { id: 'tempest_tonic', name: 'Tempest Attunement Tonic', icon: '\u{1F300}', type: 'attune', known: false,
    mats: { frost_bloom: 2, aether_shard: 2 }, desc: 'Permanent immunity to Tempest Spire lightning.' },
  { id: 'heart_infusion', name: 'Bramble Heart Infusion', icon: '\u{1F49A}', type: 'heart', known: true,
    mats: { bramble_heart: 1, aether_shard: 1 }, desc: '+25 Max HP and unlocks an additional Ability Slot (up to 5).' }
];
var RECIPE_BY_ID = {};
RECIPES.forEach(function (r) { RECIPE_BY_ID[r.id] = r; });

// Spawn recipe scrolls in the world for unknown recipes
(function spawnScrolls() {
  var scrollDefs = [
    { recipeId: 'tempest_tonic', x: 18, z: -22, isl: 0 },
    { recipeId: 'pot_chain', x: ISLANDS[1].x - 12, z: ISLANDS[1].z + 10, isl: 1 }
  ];
  scrollDefs.forEach(function (sd) {
    var y = groundY(sd.x, sd.z);
    var grp = new THREE.Group();
    var cyl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.7, 12),
      new THREE.MeshStandardMaterial({ color: 0xffe6a3, emissive: 0xffb84d, emissiveIntensity: 0.5 })
    );
    cyl.rotation.z = Math.PI / 4;
    cyl.position.y = 0.9;
    var spr = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: 0xffd76a, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    spr.scale.set(2.2, 2.2, 1);
    spr.position.y = 0.9;
    grp.add(cyl, spr);
    grp.position.set(sd.x, y, sd.z);
    scene.add(grp);
    scrollPickups.push({ recipeId: sd.recipeId, x: sd.x, y: y, z: sd.z, group: grp, taken: false });
  });
})();

/* ================= Player & Staff 3D Rig ================= */
var player = new THREE.Group();
player.position.set(0, ISLANDS[0].y, 0);
scene.add(player);

var bodyMesh = new THREE.Mesh(
  new THREE.CylinderGeometry(0.38, 0.48, 1.45, 12),
  new THREE.MeshStandardMaterial({ color: 0x263868, roughness: 0.6 })
);
bodyMesh.position.y = 0.75;
bodyMesh.castShadow = true;
player.add(bodyMesh);

var headMesh = new THREE.Mesh(
  new THREE.SphereGeometry(0.3, 12, 10),
  new THREE.MeshStandardMaterial({ color: 0xdbe6ff, roughness: 0.5 })
);
headMesh.position.y = 1.68;
player.add(headMesh);

var hatMesh = new THREE.Mesh(
  new THREE.ConeGeometry(0.45, 0.7, 10),
  new THREE.MeshStandardMaterial({ color: 0x1b274d, roughness: 0.7 })
);
hatMesh.position.y = 2.15;
player.add(hatMesh);

// Broom mesh attached to player
var broom = new THREE.Group();
var broomStick = new THREE.Mesh(
  new THREE.CylinderGeometry(0.06, 0.07, 2.3, 8),
  new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.8 })
);
broomStick.rotation.x = Math.PI / 2;
var broomBrush = new THREE.Mesh(
  new THREE.ConeGeometry(0.24, 0.65, 8),
  new THREE.MeshStandardMaterial({ color: 0xd4a24c, roughness: 0.9 })
);
broomBrush.rotation.x = -Math.PI / 2;
broomBrush.position.z = 1.25;
broom.add(broomStick, broomBrush);
broom.position.set(0, 0.35, 0);
broom.visible = false;
player.add(broom);

// Staff rig
var staffGroup = new THREE.Group();
staffGroup.position.set(0.45, 1.15, -0.45);
player.add(staffGroup);

var shaft = new THREE.Mesh(
  new THREE.CylinderGeometry(0.04, 0.05, 1.55, 8),
  new THREE.MeshStandardMaterial({ color: 0x4b3621, roughness: 0.7 })
);
shaft.position.y = 0.1;
staffGroup.add(shaft);

var tip = new THREE.Mesh(
  new THREE.OctahedronGeometry(0.16, 0),
  new THREE.MeshStandardMaterial({ color: 0x7fe8ff, emissive: 0x7fe8ff, emissiveIntensity: 0.9, roughness: 0.2 })
);
tip.position.y = 0.95;
staffGroup.add(tip);

var tipGlow = new THREE.Sprite(new THREE.SpriteMaterial({
  map: glowTex, color: 0x7fe8ff, transparent: true, opacity: 0.85,
  blending: THREE.AdditiveBlending, depthWrite: false
}));
tipGlow.scale.set(0.95, 0.95, 1);
tipGlow.position.y = 0.95;
staffGroup.add(tipGlow);

var tipLight = new THREE.PointLight(0x7fe8ff, 1.1, 8);
tipLight.position.y = 0.95;
staffGroup.add(tipLight);

function tipWorld() {
  var v = new THREE.Vector3();
  tip.getWorldPosition(v);
  return v;
}

/* ================= Player State & Phase 4 Hooks ================= */
var playerState = {
  hp: 100, maxHp: 100, yaw: 0, speed: 7.5,
  lastHurt: -10, vy: 0, vel: new THREE.Vector3(),
  grounded: true, flying: false, stamina: 100, maxStamina: 100,
  lastSafe: new THREE.Vector3(0, ISLANDS[0].y, 0)
};
var staffLv = 1, flySpeedBase = 13;

/* ---- Phase 4: currency & staff stats ---- */
var gold = 50;
var staffDmgMult = 1, staffSpeedMult = 1, staffDefenseMult = 0;
function updateGoldHUD() {
  var g = document.getElementById('gold-count');
  if (g) g.textContent = gold;
}
updateGoldHUD();

var pitch = 0;
var thirdPerson = false;
var slotCount = 2;
var slots = ['nova', 'blink', null, null, null];
var slotCD = [0, 0, 0, 0, 0];
var potions = [
  { recipeId: 'heal_draught', quality: 1 },
  { recipeId: 'pot_meteor', quality: 1 }
];
var shieldT = 0, shieldHp = 0;
var thermalWard = false, tempestAttunement = false, heartStacks = 0;
var kills = 0;
var uiOpen = false;
var gameStarted = false;
var shakeMag = 0;

function shake(amt) {
  shakeMag = Math.max(shakeMag, amt);
}

/* ================= HUD & UI Helpers ================= */
var toastTimer = null;
function showToast(msg) {
  var el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2600);
}

var currentZone = '';
function showZoneBanner(name, color) {
  var el = document.getElementById('zone-banner');
  if (!el) return;
  el.textContent = name;
  el.style.color = color || '#7fe8ff';
  el.classList.add('show');
  setTimeout(function () { el.classList.remove('show'); }, 2200);
}

function dmgNumber(worldPos, text, cls) {
  var layer = document.getElementById('dmg-layer');
  if (!layer) return;
  var v = worldPos.clone().project(camera);
  if (v.z > 1) return;
  var x = (v.x * 0.5 + 0.5) * window.innerWidth;
  var y = (-v.y * 0.5 + 0.5) * window.innerHeight;
  var d = document.createElement('div');
  d.className = 'dmg' + (cls ? ' ' + cls : '');
  d.textContent = text;
  d.style.left = x + 'px';
  d.style.top = y + 'px';
  layer.appendChild(d);
  setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 900);
}

function updateMatPanel() {
  var wrap = document.getElementById('materials');
  if (!wrap) return;
  var html = '';
  NODE_DEFS.forEach(function (n) {
    var cnt = materials[n.id] || 0;
    if (cnt > 0 || n.id === 'aether_shard') {
      html += '<div class="mat-row"><span class="mat-dot" style="color:' + n.hex + ';background:' + n.hex + '"></span>' +
        '<span>' + n.name + ': <b>' + cnt + '</b></span></div>';
    }
  });
  wrap.innerHTML = html;
}
updateMatPanel();

function renderSlots() {
  var wrap = document.getElementById('slots');
  var mWrap = document.getElementById('abil-btns');
  if (!wrap) return;
  var html = '';
  var mHtml = '';
  for (var i = 0; i < 5; i++) {
    var locked = i >= slotCount;
    var abId = slots[i];
    var ab = abId ? ABILITIES[abId] : null;
    html += '<div class="slot' + (locked ? ' locked' : ' ready') + '" id="slot-' + i + '">' +
      '<span class="key">' + (i + 1) + '</span>' +
      '<span class="icon">' + (locked ? '\u{1F512}' : (ab ? ab.icon : '')) + '</span>' +
      '<div class="cd" id="slot-cd-' + i + '"></div></div>';
    if (!locked && ab) {
      mHtml += '<button class="abtn" data-slot="' + i + '">' + ab.icon +
        '<div class="acd" id="m-cd-' + i + '"></div></button>';
    }
  }
  wrap.innerHTML = html;
  if (mWrap) {
    mWrap.innerHTML = mHtml;
    var btns = mWrap.querySelectorAll('.abtn');
    btns.forEach(function (b) {
      b.addEventListener('touchstart', function (e) {
        e.preventDefault();
        useAbilitySlot(parseInt(b.getAttribute('data-slot'), 10));
      }, { passive: false });
    });
  }
}
renderSlots();

/* ================= Modal System ================= */
function openModal(html) {
  uiOpen = true;
  if (document.pointerLockElement) document.exitPointerLock();
  var m = document.getElementById('modal');
  var box = document.getElementById('modal-box');
  if (box) box.innerHTML = html;
  if (m) m.style.display = 'flex';
}

function closeModal() {
  uiOpen = false;
  if (brewAnim) { cancelAnimationFrame(brewAnim); brewAnim = null; }
  var m = document.getElementById('modal');
  if (m) m.style.display = 'none';
}

/* ================= Particles & Projectiles ================= */
var particles = [];
var projectiles = [];

function burst(pos, color, count, speed) {
  for (var i = 0; i < count; i++) {
    var m = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 6, 6),
      new THREE.MeshBasicMaterial({ color: color })
    );
    m.position.copy(pos);
    var v = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      Math.random() * 1.4,
      (Math.random() - 0.5) * 2
    ).normalize().multiplyScalar(speed * (0.4 + Math.random() * 0.8));
    scene.add(m);
    particles.push({ mesh: m, vel: v, life: 0.45 + Math.random() * 0.35 });
  }
}

function spawnProjectile(origin, dir, opts) {
  var g = new THREE.Group();
  var core = new THREE.Mesh(
    new THREE.SphereGeometry(opts.size || 0.15, 8, 8),
    new THREE.MeshBasicMaterial({ color: opts.color || 0x7fe8ff })
  );
  var spr = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color: opts.color || 0x7fe8ff, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));
  spr.scale.set((opts.size || 0.15) * 5, (opts.size || 0.15) * 5, 1);
  g.add(core, spr);
  g.position.copy(origin);
  scene.add(g);
  projectiles.push({
    group: g,
    vel: dir.clone().normalize().multiplyScalar(opts.speed || 38),
    dmg: opts.dmg || 12,
    aoe: opts.aoe || 0,
    color: opts.color || 0x7fe8ff,
    life: opts.life || 2.0,
    enemy: !!opts.enemy
  });
}

/* ================= Enemies & Boss (Bramble King) ================= */
var ENEMY_DEFS = [
  { id: 'stalker', name: 'Thorn Stalker', hp: 45, dmg: 10, speed: 4.8, range: 2.0, cd: 1.3, color: 0xff5a7a, scale: 0.95, score: 4 },
  { id: 'wisp', name: 'Aether Wisp', hp: 35, dmg: 12, speed: 4.2, range: 14.0, cd: 2.2, color: 0x7fe8ff, scale: 0.85, ranged: true, score: 5 },
  { id: 'golem', name: 'Runestone Golem', hp: 110, dmg: 20, speed: 2.8, range: 2.6, cd: 2.0, color: 0xffb35c, scale: 1.45, score: 9 }
];

var enemies = [];

function spawnEnemy(def, x, z, elite) {
  var y = groundY(x, z);
  if (y < -100) return;
  var grp = new THREE.Group();
  var sc = def.scale * (elite ? 1.25 : 1);
  var body = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.65 * sc, 1),
    new THREE.MeshStandardMaterial({
      color: def.color, emissive: def.color, emissiveIntensity: elite ? 0.55 : 0.25, roughness: 0.4
    })
  );
  body.position.y = 0.85 * sc;
  body.castShadow = true;
  var eye = new THREE.Mesh(
    new THREE.SphereGeometry(0.16 * sc, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  eye.position.set(0, 0.95 * sc, 0.5 * sc);
  grp.add(body, eye);
  grp.position.set(x, y, z);
  scene.add(grp);

  var maxHp = def.hp * (elite ? 1.8 : 1);
  enemies.push({
    def: def, group: grp, body: body,
    hp: maxHp, maxHp: maxHp,
    elite: !!elite, atkCd: 0, slowT: 0,
    vel: new THREE.Vector3()
  });
}

(function initialEnemySpawns() {
  // Spawn enemies across islands
  for (var i = 0; i < 6; i++) {
    var a = (i / 6) * Math.PI * 2 + 0.4;
    spawnEnemy(ENEMY_DEFS[i % 3], Math.cos(a) * 28, Math.sin(a) * 28, i === 4);
  }
  ISLANDS.slice(1).forEach(function (isl, idx) {
    for (var j = 0; j < 5; j++) {
      var ang = (j / 5) * Math.PI * 2;
      spawnEnemy(ENEMY_DEFS[(j + idx) % 3], isl.x + Math.cos(ang) * 20, isl.z + Math.sin(ang) * 20, j === 0);
    }
  });
})();

// Bramble King Boss in Emberreach's western clearing
var boss = {
  isBoss: true,
  state: 'alive',
  hp: 600,
  maxHp: 600,
  atkCd: 2.5,
  phase: 1,
  group: new THREE.Group()
};

(function buildBoss() {
  var bx = -36, bz = -14;
  var by = groundY(bx, bz);
  var core = new THREE.Mesh(
    new THREE.DodecahedronGeometry(2.1, 1),
    new THREE.MeshStandardMaterial({ color: 0x295228, emissive: 0x3aff5a, emissiveIntensity: 0.3, roughness: 0.5 })
  );
  core.position.y = 2.2;
  core.castShadow = true;
  var crown = new THREE.Mesh(
    new THREE.TorusGeometry(1.3, 0.22, 8, 16),
    new THREE.MeshBasicMaterial({ color: 0xc9ffa8 })
  );
  crown.rotation.x = Math.PI / 2;
  crown.position.y = 4.1;
  boss.group.add(core, crown);
  boss.group.position.set(bx, by, bz);
  scene.add(boss.group);
})();

function damageEnemy(en, amount, knockDir, knockForce, isBeam) {
  if (!en || en.hp <= 0) return;
  var crit = !isBeam && Math.random() < 0.2;
  var finalDmg = Math.round(amount * (crit ? 1.5 : 1));
  en.hp -= finalDmg;
  dmgNumber(en.group.position.clone().add(new THREE.Vector3(0, 1.4, 0)), finalDmg, crit ? 'crit' : '');
  if (knockDir && knockForce) {
    en.vel.addScaledVector(knockDir, knockForce * 0.35);
  }
  if (en.hp <= 0) killEnemy(en);
}

function killEnemy(en) {
  kills++;
  var pos = en.group.position;
  var goldGain = Math.round((1 + Math.random() * 2) * en.def.score * (en.elite ? 1.8 : 1));
  gold += goldGain;
  updateGoldHUD();
  dmgNumber(pos.clone().add(new THREE.Vector3(0, 1.3, 0)), '+' + goldGain + ' \u{1F4B0}', 'gain');
  burst(pos.clone().add(new THREE.Vector3(0, 0.9, 0)), 0xff6ad5, 22, 8);
  burst(pos.clone().add(new THREE.Vector3(0, 0.9, 0)), 0x903050, 12, 5);
  scene.remove(en.group);
  enemies.splice(enemies.indexOf(en), 1);
  shake(0.25);

  // Drop material chance
  if (Math.random() < 0.55 || en.elite) {
    var dropId = en.elite ? 'aether_shard' : (Math.random() < 0.35 ? 'aether_shard' : 'ember_leaf');
    materials[dropId] = (materials[dropId] || 0) + 1;
    updateMatPanel();
    showToast('Looted +1 ' + NODE_BY_ID[dropId].name);
  }

  // Respawn replacement enemy after delay
  setTimeout(function () {
    var isl = ISLANDS[Math.floor(Math.random() * ISLANDS.length)];
    var ang = Math.random() * Math.PI * 2;
    var r = 16 + Math.random() * (isl.r - 22);
    spawnEnemy(ENEMY_DEFS[Math.floor(Math.random() * ENEMY_DEFS.length)], isl.x + Math.cos(ang) * r, isl.z + Math.sin(ang) * r, Math.random() < 0.2);
  }, 9000);
}

function damageBoss(amount, isBeam) {
  if (boss.state !== 'alive') return;
  var finalDmg = Math.round(amount);
  boss.hp = Math.max(0, boss.hp - finalDmg);
  dmgNumber(boss.group.position.clone().add(new THREE.Vector3(0, 3.2, 0)), finalDmg, isBeam ? '' : 'crit');
  var fill = document.getElementById('boss-fill');
  if (fill) fill.style.width = (boss.hp / boss.maxHp * 100) + '%';
  if (boss.hp <= 0) killBoss();
}

function killBoss() {
  boss.state = 'dead';
  var pos = boss.group.position.clone();
  gold += 200;
  updateGoldHUD();
  dmgNumber(pos.clone().add(new THREE.Vector3(0, 3, 0)), '+200 \u{1F4B0}', 'gain');
  burst(pos.clone().add(new THREE.Vector3(0, 2, 0)), 0x6aff8a, 45, 14);
  scene.remove(boss.group);
  var bw = document.getElementById('boss-wrap');
  if (bw) bw.style.display = 'none';
  materials.bramble_heart = (materials.bramble_heart || 0) + 1;
  materials.aether_shard = (materials.aether_shard || 0) + 3;
  updateMatPanel();
  if (slotCount < 5) {
    slotCount++;
    renderSlots();
  }
  showToast('\u{1F33F} Bramble King Defeated! +1 Bramble Heart, +3 Aether Shards & Ability Slot Unlocked!');
  shake(0.6);
}

/* ================= Combat: Basic Bolt, Beam & Abilities ================= */
var beamMesh = (function () {
  var geo = new THREE.CylinderGeometry(0.11, 0.11, 1, 10);
  geo.rotateX(Math.PI / 2);
  geo.translate(0, 0, 0.5);
  var mat = new THREE.MeshBasicMaterial({ color: 0x7fe8ff, transparent: true, opacity: 0.85 });
  var m = new THREE.Mesh(geo, mat);
  m.visible = false;
  scene.add(m);
  return m;
})();

function fireBolt() {
  var dir = new THREE.Vector3(); camera.getWorldDirection(dir);
  spawnProjectile(tipWorld(), dir, { dmg: 12 * staffDmgMult, speed: 42, size: 0.15, color: 0x7fe8ff, life: 2.2 });
  shake(0.08); burst(tipWorld(), 0x7fe8ff, 5, 3);
}

var beamTickAcc = 0;
function updateBeam(dt) {
  var origin = tipWorld();
  var dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  var maxD = 32;
  var endD = maxD;

  beamTickAcc += dt;
  var doDmg = beamTickAcc >= 0.12;
  if (doDmg) beamTickAcc = 0;

  var targets = enemies.slice();
  if (boss.state === 'alive') targets.push(boss);

  targets.forEach(function (en) {
    var center = en.group.position.clone().add(new THREE.Vector3(0, en.isBoss ? 2.0 : 0.9, 0));
    var toEn = center.clone().sub(origin);
    var t = toEn.dot(dir);
    if (t > 0 && t < maxD) {
      var closest = origin.clone().addScaledVector(dir, t);
      if (closest.distanceTo(center) < (en.isBoss ? 2.5 : 1.35)) {
        if (doDmg) {
          if (en.isBoss) damageBoss(35 * staffDmgMult, true); else damageEnemy(en, 35 * staffDmgMult, dir, 7, true);
        }
        endD = Math.min(endD, t + 1);
      }
    }
  });

  beamMesh.visible = true;
  beamMesh.position.copy(origin);
  beamMesh.lookAt(origin.clone().add(dir));
  beamMesh.scale.set(1, 1, endD);
}

function useAbilitySlot(idx) {
  if (uiOpen || idx < 0 || idx >= slotCount) return;
  var abId = slots[idx];
  if (!abId) { showToast('Empty ability slot — brew & drink an ability potion!'); return; }
  if (slotCD[idx] > 0) { showToast(ABILITIES[abId].name + ' on cooldown (' + slotCD[idx].toFixed(1) + 's)'); return; }
  var ab = ABILITIES[abId];
  slotCD[idx] = ab.cd;

  var pPos = player.position.clone();
  var dir = new THREE.Vector3();
  camera.getWorldDirection(dir);

  if (abId === 'nova') {
    burst(pPos.clone().add(new THREE.Vector3(0, 1, 0)), 0x7fe8ff, 36, 11);
    shake(0.3);
    enemies.slice().forEach(function (en) {
      if (en.group.position.distanceTo(pPos) <= 10) {
        en.slowT = 4.0;
        damageEnemy(en, 32 * staffDmgMult, en.group.position.clone().sub(pPos).normalize(), 12, false);
      }
    });
    if (boss.state === 'alive' && boss.group.position.distanceTo(pPos) <= 11) {
      damageBoss(40 * staffDmgMult, false);
    }
    showToast('\u2744\uFE0F Frost Nova!');
  } else if (abId === 'blink') {
    burst(pPos.clone().add(new THREE.Vector3(0, 1, 0)), 0xb27bff, 18, 7);
    var flat = new THREE.Vector3(dir.x, 0, dir.z).normalize();
    var target = pPos.clone().addScaledVector(flat, 11);
    var gy = groundY(target.x, target.z);
    if (gy > -100 || playerState.flying) {
      player.position.x = target.x;
      player.position.z = target.z;
      if (!playerState.flying) player.position.y = gy;
    }
    burst(player.position.clone().add(new THREE.Vector3(0, 1, 0)), 0xb27bff, 18, 7);
    showToast('\u26A1 Aether Blink!');
  } else if (abId === 'meteor') {
    spawnProjectile(tipWorld(), dir, { dmg: 55 * staffDmgMult, speed: 28, size: 0.38, color: 0xff6a4a, aoe: 6.5, life: 3.0 });
    shake(0.25);
    showToast('\u2604\uFE0F Ember Meteor!');
  } else if (abId === 'shield') {
    shieldT = 8.0;
    shieldHp = 60;
    burst(pPos.clone().add(new THREE.Vector3(0, 1, 0)), 0x6affc9, 24, 6);
    showToast('\u{1F6E1}\uFE0F Arcane Aegis active (60 HP shield)!');
  } else if (abId === 'chain') {
    var hitCount = 0;
    enemies.slice().forEach(function (en) {
      if (hitCount < 4 && en.group.position.distanceTo(pPos) <= 16) {
        hitCount++;
        burst(en.group.position.clone().add(new THREE.Vector3(0, 1, 0)), 0xffd76a, 14, 7);
        damageEnemy(en, 38 * staffDmgMult, dir, 5, false);
      }
    });
    if (hitCount < 4 && boss.state === 'alive' && boss.group.position.distanceTo(pPos) <= 18) {
      damageBoss(45 * staffDmgMult, false);
      hitCount++;
    }
    showToast('\u{1F329}\uFE0F Tempest Chain hit ' + hitCount + ' targets!');
  }
}

/* ================= Player Damage & Respawn ================= */
function hurtPlayer(dmg, fromPos) {
  if (playerState.hp <= 0) return;
  dmg *= (1 - staffDefenseMult);
  if (shieldT > 0 && shieldHp > 0) {
    var absorbed = Math.min(shieldHp, dmg);
    shieldHp -= absorbed;
    dmg -= absorbed;
    if (shieldHp <= 0) shieldT = 0;
    if (dmg <= 0.5) {
      dmgNumber(player.position.clone().add(new THREE.Vector3(0, 1.8, 0)), 'ABSORBED', 'gain');
      return;
    }
  }
  var finalDmg = Math.max(1, Math.round(dmg));
  playerState.hp = Math.max(0, playerState.hp - finalDmg);
  playerState.lastHurt = performance.now() * 0.001;
  dmgNumber(player.position.clone().add(new THREE.Vector3(0, 1.8, 0)), '-' + finalDmg, 'hurt');
  var vig = document.getElementById('vignette');
  if (vig) {
    vig.classList.remove('hit');
    void vig.offsetWidth;
    vig.classList.add('hit');
  }
  shake(0.3);
  if (playerState.hp <= 0) {
    var dOv = document.getElementById('death-overlay');
    if (dOv) dOv.style.display = 'flex';
    if (document.pointerLockElement) document.exitPointerLock();
  }
}

var respawnBtn = document.getElementById('respawn-btn');
if (respawnBtn) {
  respawnBtn.addEventListener('click', function () {
    playerState.hp = playerState.maxHp;
    playerState.stamina = playerState.maxStamina;
    player.position.copy(playerState.lastSafe);
    var dOv = document.getElementById('death-overlay');
    if (dOv) dOv.style.display = 'none';
  });
}

/* ================= Gathering, Brewing & Inventory Modals ================= */
function nearStation() {
  for (var i = 0; i < stations.length; i++) {
    var s = stations[i];
    var dx = player.position.x - s.x, dz = player.position.z - s.z;
    if (dx * dx + dz * dz < 16 && Math.abs(player.position.y - s.y) < 3.5) return s;
  }
  return null;
}

function nearGatherable() {
  for (var i = 0; i < scrollPickups.length; i++) {
    var sc = scrollPickups[i];
    if (!sc.taken) {
      var dx = player.position.x - sc.x, dz = player.position.z - sc.z;
      if (dx * dx + dz * dz < 12) return { type: 'scroll', obj: sc };
    }
  }
  for (var j = 0; j < resourceNodes.length; j++) {
    var n = resourceNodes[j];
    if (n.cooldown <= 0) {
      var dx2 = player.position.x - n.x, dz2 = player.position.z - n.z;
      if (dx2 * dx2 + dz2 * dz2 < 14) return { type: 'node', obj: n };
    }
  }
  return null;
}

function gather() {
  var hit = nearGatherable();
  if (!hit) { showToast('Nothing nearby to gather'); return; }
  if (hit.type === 'scroll') {
    var sc = hit.obj;
    sc.taken = true;
    sc.group.visible = false;
    var r = RECIPE_BY_ID[sc.recipeId];
    if (r) {
      r.known = true;
      showToast('\u{1F4DC} Discovered Recipe: ' + r.name + '!');
      burst(sc.group.position.clone().add(new THREE.Vector3(0, 1, 0)), 0xffd76a, 24, 7);
    }
    return;
  }
  var node = hit.obj;
  node.cooldown = 14;
  node.group.visible = false;
  materials[node.def.id] = (materials[node.def.id] || 0) + 1;
  totalGathered++;
  updateMatPanel();
  dmgNumber(node.group.position.clone().add(new THREE.Vector3(0, 1.2, 0)), '+1 ' + node.def.name, 'gain');
  burst(node.group.position.clone().add(new THREE.Vector3(0, 0.8, 0)), node.def.color, 15, 5);
  if (totalGathered === 6 && slotCount < 3) {
    slotCount = 3;
    renderSlots();
    showToast('\u2728 Gathering Milestone! Ability Slot 3 Unlocked!');
  }
}

function tryInteract() {
  if (uiOpen) return;
  if (window.AM && window.AM.nearMerchant && window.AM.nearMerchant()) { window.AM.openShop(); return; }
  if (nearStation()) { openBrew(); return; }
  gather();
}

/* ---- Brewing Modal & Timing Minigame ---- */
var brewAnim = null;
var brewPos = 0, brewDir = 1, activeBrewRecipe = null;

function canCraft(r) {
  var keys = Object.keys(r.mats);
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    if ((materials[k] || 0) < r.mats[k]) return false;
  }
  return true;
}

function openBrew() {
  var html = '<button class="m-close" onclick="UI.close()">\u2715</button>' +
    '<h2>ARCANE CAULDRON</h2><div class="sub2">Select a discovered recipe to brew</div>';
  RECIPES.forEach(function (r) {
    if (!r.known) return;
    var ok = canCraft(r);
    var matStr = Object.keys(r.mats).map(function (k) {
      var need = r.mats[k], have = materials[k] || 0;
      var cls = have < need ? 'lack' : '';
      return '<span class="' + cls + '">' + NODE_BY_ID[k].name + ' ' + have + '/' + need + '</span>';
    }).join(' &middot; ');
    html += '<div class="m-row"><div class="info"><div class="name">' + r.icon + ' ' + r.name + '</div>' +
      '<div class="mats">' + matStr + '</div>' +
      '<div class="mats" style="opacity:.75">' + r.desc + '</div></div>' +
      '<button class="m-btn" ' + (ok ? '' : 'disabled') + ' onclick="UI.startBrew(\'' + r.id + '\')">BREW</button></div>';
  });
  openModal(html);
}

function startBrew(recipeId) {
  var r = RECIPE_BY_ID[recipeId];
  if (!r || !canCraft(r)) return;
  Object.keys(r.mats).forEach(function (k) { materials[k] -= r.mats[k]; });
  updateMatPanel();
  activeBrewRecipe = r;
  brewPos = 0;
  brewDir = 1;
  var html = '<h2>BREWING: ' + r.name.toUpperCase() + '</h2>' +
    '<div class="sub2">Click STIR when the marker hits the glowing zone!</div>' +
    '<div id="brew-bar"><div id="brew-zone"><div class="perfect"></div></div><div id="brew-marker"></div></div>' +
    '<div class="m-actions"><button class="m-btn" onclick="UI.finishBrew()">STIR NOW</button></div>';
  openModal(html);

  var last = performance.now();
  function step(now) {
    var dt = (now - last) * 0.001;
    last = now;
    brewPos += brewDir * dt * 1.15;
    if (brewPos >= 1) { brewPos = 1; brewDir = -1; }
    if (brewPos <= 0) { brewPos = 0; brewDir = 1; }
    var mk = document.getElementById('brew-marker');
    if (mk) mk.style.left = (brewPos * 100) + '%';
    brewAnim = requestAnimationFrame(step);
  }
  brewAnim = requestAnimationFrame(step);
}

function finishBrew() {
  if (brewAnim) { cancelAnimationFrame(brewAnim); brewAnim = null; }
  var r = activeBrewRecipe;
  if (!r) { closeModal(); return; }
  var pct = brewPos * 100;
  var quality = 1;
  var label = 'Standard';
  if (pct >= 49 && pct <= 56) { quality = 2; label = 'Perfect'; }
  else if (pct >= 38 && pct <= 68) { quality = 1.5; label = 'Potent'; }
  potions.push({ recipeId: r.id, quality: quality });
  showToast('\u2728 Brewed ' + label + ' ' + r.name + '! (Press I to open Bag)');
  openBrew();
}

/* ---- Inventory / Bag & Ability Replacement Flow ---- */
var pendingPotionIdx = -1;
var pendingReplaceSlot = -1;

function openBag() {
  var html = '<button class="m-close" onclick="UI.close()">\u2715</button>' +
    '<h2>ALCHEMIST BAG</h2><div class="sub2">Potions (' + potions.length + ') &middot; Ability Slots (' + slotCount + '/5)</div>';
  if (potions.length === 0) {
    html += '<div class="confirm-text">Your potion bag is empty. Visit a cauldron to brew potions!</div>';
  } else {
    potions.forEach(function (p, idx) {
      var r = RECIPE_BY_ID[p.recipeId];
      if (!r) return;
      var qTag = p.quality === 2 ? ' [Perfect]' : (p.quality > 1 ? ' [Potent]' : '');
      html += '<div class="m-row"><div class="info"><div class="name">' + r.icon + ' ' + r.name + qTag + '</div>' +
        '<div class="mats">' + r.desc + '</div></div>' +
        '<button class="m-btn" onclick="UI.drinkPotion(' + idx + ')">DRINK</button></div>';
    });
  }
  openModal(html);
}

function drinkPotion(idx) {
  var p = potions[idx];
  if (!p) return;
  var r = RECIPE_BY_ID[p.recipeId];
  if (!r) return;

  if (r.type === 'consumable') {
    var heal = Math.round(50 * (p.quality || 1));
    playerState.hp = Math.min(playerState.maxHp, playerState.hp + heal);
    potions.splice(idx, 1);
    showToast('\u{1F49A} Restored ' + heal + ' HP!');
    openBag();
    return;
  }
  if (r.type === 'ward') {
    thermalWard = true;
    potions.splice(idx, 1);
    showToast('\u{1F525} Thermal Ward active — Frostveil cold no longer harms you!');
    openBag();
    return;
  }
  if (r.type === 'attune') {
    tempestAttunement = true;
    potions.splice(idx, 1);
    showToast('\u{1F300} Tempest Attunement active — Storm Spire lightning no longer harms you!');
    openBag();
    return;
  }
  if (r.type === 'heart') {
    heartStacks++;
    playerState.maxHp += 25;
    playerState.hp = playerState.maxHp;
    if (slotCount < 5) slotCount++;
    potions.splice(idx, 1);
    renderSlots();
    showToast('\u{1F49A} Max HP +25 & Ability Slot unlocked (' + slotCount + '/5)!');
    openBag();
    return;
  }
  if (r.type === 'ability') {
    var abId = r.abilityId;
    if (slots.slice(0, slotCount).indexOf(abId) !== -1) {
      showToast('That ability is already equipped!');
      return;
    }
    // Check if an unlocked slot is empty
    for (var i = 0; i < slotCount; i++) {
      if (!slots[i]) {
        slots[i] = abId;
        potions.splice(idx, 1);
        renderSlots();
        showToast('\u2728 Equipped ' + ABILITIES[abId].name + ' in Slot ' + (i + 1) + '!');
        openBag();
        return;
      }
    }
    // All unlocked slots occupied -> ask which ability to replace
    pendingPotionIdx = idx;
    var html = '<h2>WHICH ABILITY DO YOU WANT TO REPLACE?</h2>' +
      '<div class="sub2">Equipping ' + ABILITIES[abId].icon + ' ' + ABILITIES[abId].name + '</div>' +
      '<div class="replace-grid">';
    for (var s = 0; s < slotCount; s++) {
      var cur = ABILITIES[slots[s]];
      html += '<div class="replace-slot" onclick="UI.selectReplace(' + s + ')">' +
        '<span class="ric">' + (cur ? cur.icon : '') + '</span>' +
        '<span><b>' + (cur ? cur.name : 'Empty') + '</b></span>' +
        '<span class="rkey">SLOT ' + (s + 1) + '</span></div>';
    }
    html += '</div><div class="m-actions"><button class="m-btn ghost" onclick="UI.cancelReplace()">CANCEL</button></div>';
    openModal(html);
  }
}

function selectReplace(slotIdx) {
  var p = potions[pendingPotionIdx];
  if (!p) { openBag(); return; }
  var r = RECIPE_BY_ID[p.recipeId];
  var oldAb = ABILITIES[slots[slotIdx]];
  var newAb = ABILITIES[r.abilityId];
  pendingReplaceSlot = slotIdx;
  var html = '<h2>CONFIRM REPLACEMENT</h2>' +
    '<div class="confirm-text">Are you sure you want to replace <b>' + (oldAb ? oldAb.name : 'Slot') +
    '</b> with <b>' + newAb.name + '</b>?<br>Replacing removes the old ability until brewed again.</div>' +
    '<div class="m-actions">' +
    '<button class="m-btn ghost" onclick="UI.cancelReplace()">CANCEL</button>' +
    '<button class="m-btn danger" onclick="UI.confirmReplace()">CONFIRM</button></div>';
  openModal(html);
}

function confirmReplace() {
  var p = potions[pendingPotionIdx];
  if (p && pendingReplaceSlot >= 0 && pendingReplaceSlot < slotCount) {
    var r = RECIPE_BY_ID[p.recipeId];
    slots[pendingReplaceSlot] = r.abilityId;
    slotCD[pendingReplaceSlot] = 0;
    potions.splice(pendingPotionIdx, 1);
    renderSlots();
    showToast('\u2728 Equipped ' + ABILITIES[r.abilityId].name + ' in Slot ' + (pendingReplaceSlot + 1) + '!');
  }
  pendingPotionIdx = -1;
  pendingReplaceSlot = -1;
  openBag();
}

function cancelReplace() {
  pendingPotionIdx = -1;
  pendingReplaceSlot = -1;
  openBag();
}

window.UI = {
  close: closeModal,
  startBrew: startBrew,
  finishBrew: finishBrew,
  drinkPotion: drinkPotion,
  selectReplace: selectReplace,
  confirmReplace: confirmReplace,
  cancelReplace: cancelReplace
};

/* ================= Controls: Keyboard, Mouse & Touch ================= */
var keys = {};
var lmbDown = false, lmbHoldTime = 0;
var flyUp = false, flyDown = false;

window.addEventListener('keydown', function (e) {
  keys[e.code] = true;
  if (e.repeat) return;
  if (e.code === 'Escape' && uiOpen) { closeModal(); return; }
  if (uiOpen) return;
  if (e.code === 'Digit1') useAbilitySlot(0);
  if (e.code === 'Digit2') useAbilitySlot(1);
  if (e.code === 'Digit3') useAbilitySlot(2);
  if (e.code === 'Digit4') useAbilitySlot(3);
  if (e.code === 'Digit5') useAbilitySlot(4);
  if (e.code === 'KeyF') tryInteract();
  if (e.code === 'KeyI') openBag();
  if (e.code === 'KeyV') {
    thirdPerson = !thirdPerson;
    showToast(thirdPerson ? 'Third-Person Camera' : 'First-Person Camera');
  }
  if (e.code === 'Space') {
    if (!playerState.flying && playerState.stamina > 15) {
      playerState.flying = true;
      playerState.vy = 4;
      document.body.classList.add('flying');
      showToast('\u{1F9F9} Broom summoned!');
    } else if (playerState.flying) {
      playerState.flying = false;
      broom.visible = false;
      document.body.classList.remove('flying');
    }
  }
});

window.addEventListener('keyup', function (e) {
  keys[e.code] = false;
});

var playBtn = document.getElementById('play-btn');
if (playBtn) {
  playBtn.addEventListener('click', function () {
    var sOv = document.getElementById('start-overlay');
    if (sOv) sOv.style.display = 'none';
    gameStarted = true;
    if (!('ontouchstart' in window) && renderer.domElement.requestPointerLock) {
      renderer.domElement.requestPointerLock();
    }
  });
}

renderer.domElement.addEventListener('mousedown', function (e) {
  if (!gameStarted || uiOpen || e.button !== 0) return;
  if (!('ontouchstart' in window) && document.pointerLockElement !== renderer.domElement) {
    renderer.domElement.requestPointerLock();
    return;
  }
  lmbDown = true;
  lmbHoldTime = 0;
});

window.addEventListener('mouseup', function (e) {
  if (e.button === 0) {
    if (lmbDown && lmbHoldTime < 0.28 && !uiOpen && gameStarted) {
      fireBolt();
    }
    lmbDown = false;
    lmbHoldTime = 0;
    beamMesh.visible = false;
    var cr = document.getElementById('charge-ring');
    if (cr) cr.classList.remove('on');
  }
});

window.addEventListener('mousemove', function (e) {
  if (document.pointerLockElement !== renderer.domElement || uiOpen) return;
  playerState.yaw -= e.movementX * 0.0022;
  pitch = Math.max(-1.2, Math.min(1.2, pitch - e.movementY * 0.0022));
});

// Touch detection & mobile controls
var joyVec = { x: 0, y: 0 };
if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
  document.body.classList.add('touch');
}

(function setupTouch() {
  var joyEl = document.getElementById('joystick');
  var knobEl = document.getElementById('joystick-knob');
  var joyId = null, joyOrigin = { x: 0, y: 0 };
  var lookId = null, lookLast = { x: 0, y: 0 };

  window.addEventListener('touchstart', function (e) {
    if (!gameStarted || uiOpen) return;
    document.body.classList.add('touch');
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      if (t.target && t.target.tagName === 'BUTTON') continue;
      if (t.clientX < window.innerWidth * 0.45 && joyId === null) {
        joyId = t.identifier;
        joyOrigin = { x: t.clientX, y: t.clientY };
        if (joyEl) {
          joyEl.style.display = 'block';
          joyEl.style.left = t.clientX + 'px';
          joyEl.style.top = t.clientY + 'px';
        }
      } else if (lookId === null) {
        lookId = t.identifier;
        lookLast = { x: t.clientX, y: t.clientY };
      }
    }
  }, { passive: true });

  window.addEventListener('touchmove', function (e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      if (t.identifier === joyId) {
        var dx = t.clientX - joyOrigin.x, dy = t.clientY - joyOrigin.y;
        var maxR = 45;
        var d = Math.hypot(dx, dy);
        if (d > maxR) { dx = dx / d * maxR; dy = dy / d * maxR; }
        joyVec.x = dx / maxR;
        joyVec.y = dy / maxR;
        if (knobEl) knobEl.style.transform = 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px))';
      } else if (t.identifier === lookId) {
        var lx = t.clientX - lookLast.x, ly = t.clientY - lookLast.y;
        lookLast = { x: t.clientX, y: t.clientY };
        playerState.yaw -= lx * 0.005;
        pitch = Math.max(-1.2, Math.min(1.2, pitch - ly * 0.005));
      }
    }
  }, { passive: true });

  function endTouch(e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      if (t.identifier === joyId) {
        joyId = null;
        joyVec.x = 0; joyVec.y = 0;
        if (joyEl) joyEl.style.display = 'none';
        if (knobEl) knobEl.style.transform = 'translate(-50%,-50%)';
      } else if (t.identifier === lookId) {
        lookId = null;
      }
    }
  }
  window.addEventListener('touchend', endTouch, { passive: true });
  window.addEventListener('touchcancel', endTouch, { passive: true });

  function bindBtn(id, downFn, upFn) {
    var b = document.getElementById(id);
    if (!b) return;
    b.addEventListener('touchstart', function (e) { e.preventDefault(); downFn(); }, { passive: false });
    if (upFn) b.addEventListener('touchend', function (e) { e.preventDefault(); upFn(); }, { passive: false });
  }
  bindBtn('btn-cast', function () { lmbDown = true; lmbHoldTime = 0; }, function () {
    if (lmbHoldTime < 0.28) fireBolt();
    lmbDown = false; lmbHoldTime = 0; beamMesh.visible = false;
  });
  bindBtn('btn-broom', function () {
    playerState.flying = !playerState.flying;
    if (!playerState.flying) broom.visible = false;
    document.body.classList.toggle('flying', playerState.flying);
  });
  bindBtn('btn-bag', openBag);
  bindBtn('btn-gather', gather);
  bindBtn('btn-brew', openBrew);
  bindBtn('btn-up', function () { flyUp = true; }, function () { flyUp = false; });
  bindBtn('btn-down', function () { flyDown = true; }, function () { flyDown = false; });
})();

/* ================= Main Game Loop ================= */
var lastTime = performance.now();
var envTick = 0;

function animate() {
  requestAnimationFrame(animate);
  var now = performance.now();
  var dt = Math.min(0.05, (now - lastTime) * 0.001);
  lastTime = now;

  // Cooldowns
  for (var i = 0; i < 5; i++) {
    if (slotCD[i] > 0) slotCD[i] = Math.max(0, slotCD[i] - dt);
    var cdEl = document.getElementById('slot-cd-' + i);
    var mCdEl = document.getElementById('m-cd-' + i);
    var ab = slots[i] ? ABILITIES[slots[i]] : null;
    var pct = (ab && slotCD[i] > 0) ? (slotCD[i] / ab.cd * 100) : 0;
    if (cdEl) cdEl.style.height = pct + '%';
    if (mCdEl) mCdEl.style.height = pct + '%';
  }
  if (shieldT > 0) shieldT = Math.max(0, shieldT - dt);

  // Resource node respawns & rotation
  resourceNodes.forEach(function (n) {
    if (n.cooldown > 0) {
      n.cooldown -= dt;
      if (n.cooldown <= 0) n.group.visible = true;
    } else {
      n.mesh.rotation.y += dt * 1.4;
    }
  });

  if (gameStarted && !uiOpen && playerState.hp > 0) {
    // Movement input
    var fwd = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) - joyVec.y;
    var str = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + joyVec.x;
    var forwardVec = new THREE.Vector3(-Math.sin(playerState.yaw), 0, -Math.cos(playerState.yaw));
    var rightVec = new THREE.Vector3(Math.cos(playerState.yaw), 0, -Math.sin(playerState.yaw));
    var moveDir = new THREE.Vector3().addScaledVector(forwardVec, fwd).addScaledVector(rightVec, str);
    if (moveDir.lengthSq() > 1) moveDir.normalize();

    if (playerState.flying) {
      broom.visible = true;
      var spd = flySpeedBase * staffSpeedMult;
      player.position.addScaledVector(moveDir, spd * dt);
      var vUp = (keys.Space || keys.KeyE || flyUp ? 1 : 0) - (keys.ShiftLeft || keys.KeyQ || flyDown ? 1 : 0);
      player.position.y += (vUp * 7.5 + Math.sin(pitch) * fwd * spd * 0.45) * dt;
      playerState.stamina = Math.max(0, playerState.stamina - 6.5 * dt);
      if (playerState.stamina <= 0) {
        playerState.flying = false;
        broom.visible = false;
        document.body.classList.remove('flying');
      }
      var gyFly = groundY(player.position.x, player.position.z);
      if (gyFly > -100 && player.position.y <= gyFly + 0.05) {
        player.position.y = gyFly;
        playerState.flying = false;
        broom.visible = false;
        document.body.classList.remove('flying');
      }
    } else {
      broom.visible = false;
      playerState.stamina = Math.min(playerState.maxStamina, playerState.stamina + 14 * dt);
      player.position.addScaledVector(moveDir, playerState.speed * dt);
      playerState.vy -= 22 * dt;
      player.position.y += playerState.vy * dt;

      var gy = groundY(player.position.x, player.position.z);
      if (gy > -100 && player.position.y <= gy) {
        player.position.y = gy;
        playerState.vy = 0;
        playerState.grounded = true;
        playerState.lastSafe.copy(player.position);
      } else {
        playerState.grounded = false;
      }

      if (player.position.y < -45) {
        hurtPlayer(25);
        player.position.copy(playerState.lastSafe);
        playerState.vy = 0;
      }
    }

    // Obstacle collision
    obstacles.forEach(function (ob) {
      if (Math.abs(player.position.y - ob.y) < 3.2) {
        var dx = player.position.x - ob.x, dz = player.position.z - ob.z;
        var dist = Math.hypot(dx, dz);
        var minD = ob.r + 0.45;
        if (dist < minD && dist > 0.001) {
          player.position.x = ob.x + (dx / dist) * minD;
          player.position.z = ob.z + (dz / dist) * minD;
        }
      }
    });

    player.rotation.y = playerState.yaw;

    // Zone banner & environmental hazards
    var curIsl = islandAt(player.position.x, player.position.z);
    if (curIsl && curIsl.name !== currentZone) {
      currentZone = curIsl.name;
      showZoneBanner(curIsl.name, curIsl.banner);
    }
    var frostEl = document.getElementById('frost');
    if (curIsl && curIsl.id === ISLE.FROST && !thermalWard) {
      if (frostEl) frostEl.style.opacity = '1';
      envTick += dt;
      if (envTick >= 1.5) { envTick = 0; hurtPlayer(6); showToast('\u2744\uFE0F Freezing winds! Brew Thermal Ward Elixir!'); }
    } else {
      if (frostEl) frostEl.style.opacity = '0';
      if (curIsl && curIsl.id === ISLE.TEMPEST && !tempestAttunement) {
        envTick += dt;
        if (envTick >= 2.0) { envTick = 0; hurtPlayer(8); showToast('\u26A1 Storm static! Brew Tempest Attunement Tonic!'); }
      }
    }

    // Beam hold logic
    if (lmbDown) {
      lmbHoldTime += dt;
      if (lmbHoldTime >= 0.28 && playerState.stamina > 2) {
        var cr = document.getElementById('charge-ring');
        if (cr) cr.classList.add('on');
        playerState.stamina = Math.max(0, playerState.stamina - 18 * dt);
        updateBeam(dt);
      } else {
        beamMesh.visible = false;
      }
    }

    // Mobile contextual buttons
    var gBtn = document.getElementById('btn-gather');
    var bBtn = document.getElementById('btn-brew');
    if (gBtn) gBtn.style.display = nearGatherable() ? 'block' : 'none';
    if (bBtn) bBtn.style.display = nearStation() ? 'block' : 'none';
  }

  // Update Enemies
  var pPos = player.position;
  enemies.forEach(function (en) {
    en.body.rotation.y += dt * 1.5;
    if (en.slowT > 0) en.slowT -= dt;
    if (en.atkCd > 0) en.atkCd -= dt;

    en.group.position.addScaledVector(en.vel, dt);
    en.vel.multiplyScalar(Math.pow(0.05, dt));

    var d = en.group.position.distanceTo(pPos);
    if (d < 28 && gameStarted && playerState.hp > 0) {
      var toP = pPos.clone().sub(en.group.position);
      toP.y = 0;
      var distFlat = toP.length();
      if (distFlat > 0.01) toP.divideScalar(distFlat);

      var spd = en.def.speed * (en.slowT > 0 ? 0.45 : 1);
      if (en.def.ranged) {
        if (distFlat > en.def.range * 0.85) en.group.position.addScaledVector(toP, spd * dt);
        else if (distFlat < 6) en.group.position.addScaledVector(toP, -spd * 0.6 * dt);
      } else if (distFlat > en.def.range * 0.8) {
        en.group.position.addScaledVector(toP, spd * dt);
      }

      var gy = groundY(en.group.position.x, en.group.position.z);
      if (gy > -100) en.group.position.y = gy;

      if (distFlat <= en.def.range && en.atkCd <= 0) {
        en.atkCd = en.def.cd;
        if (en.def.ranged) {
          var aimDir = pPos.clone().add(new THREE.Vector3(0, 1.1, 0)).sub(en.group.position.clone().add(new THREE.Vector3(0, 1, 0))).normalize();
          spawnProjectile(en.group.position.clone().add(new THREE.Vector3(0, 1, 0)), aimDir, {
            dmg: en.def.dmg, speed: 20, size: 0.18, color: 0xff6ad5, life: 2.5, enemy: true
          });
        } else {
          hurtPlayer(en.def.dmg, en.group.position);
        }
      }
    }
  });

  // Update Boss (Bramble King)
  var bw = document.getElementById('boss-wrap');
  if (boss.state === 'alive') {
    boss.group.rotation.y += dt * 0.8;
    var bd = boss.group.position.distanceTo(pPos);
    if (bw) bw.style.display = bd < 32 ? 'block' : 'none';
    if (bd < 30 && gameStarted && playerState.hp > 0) {
      boss.atkCd -= dt;
      var bToP = pPos.clone().sub(boss.group.position);
      bToP.y = 0;
      if (bToP.length() > 3.5) {
        bToP.normalize();
        boss.group.position.addScaledVector(bToP, 3.1 * dt);
        var bgy = groundY(boss.group.position.x, boss.group.position.z);
        if (bgy > -100) boss.group.position.y = bgy;
      }
      if (boss.atkCd <= 0) {
        boss.atkCd = 2.4;
        // Fire thorn volley
        for (var k = -1; k <= 1; k++) {
          var bDir = pPos.clone().add(new THREE.Vector3(0, 1.0, 0)).sub(boss.group.position.clone().add(new THREE.Vector3(0, 2, 0))).normalize();
          bDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), k * 0.22);
          spawnProjectile(boss.group.position.clone().add(new THREE.Vector3(0, 2, 0)), bDir, {
            dmg: 16, speed: 22, size: 0.24, color: 0x6aff8a, life: 2.6, enemy: true
          });
        }
      }
    }
  }

  // Update Projectiles
  for (var p = projectiles.length - 1; p >= 0; p--) {
    var pr = projectiles[p];
    pr.life -= dt;
    pr.group.position.addScaledVector(pr.vel, dt);
    var hit = false;

    if (pr.enemy) {
      if (pr.group.position.distanceTo(pPos.clone().add(new THREE.Vector3(0, 1.0, 0))) < 1.1) {
        hurtPlayer(pr.dmg, pr.group.position);
        hit = true;
      }
    } else {
      for (var eIdx = 0; eIdx < enemies.length; eIdx++) {
        var targetEn = enemies[eIdx];
        if (pr.group.position.distanceTo(targetEn.group.position.clone().add(new THREE.Vector3(0, 0.9, 0))) < 1.25) {
          if (pr.aoe > 0) {
            enemies.slice().forEach(function (aoeEn) {
              if (aoeEn.group.position.distanceTo(pr.group.position) <= pr.aoe) {
                damageEnemy(aoeEn, pr.dmg, pr.vel.clone().normalize(), 9, false);
              }
            });
          } else {
            damageEnemy(targetEn, pr.dmg, pr.vel.clone().normalize(), 6, false);
          }
          hit = true;
          break;
        }
      }
      if (!hit && boss.state === 'alive' && pr.group.position.distanceTo(boss.group.position.clone().add(new THREE.Vector3(0, 2, 0))) < 2.4) {
        damageBoss(pr.dmg, false);
        hit = true;
      }
    }

    if (hit || pr.life <= 0) {
      if (hit) burst(pr.group.position, pr.color, pr.aoe > 0 ? 26 : 10, pr.aoe > 0 ? 9 : 4);
      scene.remove(pr.group);
      projectiles.splice(p, 1);
    }
  }

  // Update Particles
  for (var pt = particles.length - 1; pt >= 0; pt--) {
    var part = particles[pt];
    part.life -= dt;
    part.mesh.position.addScaledVector(part.vel, dt);
    if (part.life <= 0) {
      scene.remove(part.mesh);
      particles.splice(pt, 1);
    }
  }

  // Camera follow (1st / 3rd person) + screen shake
  bodyMesh.visible = thirdPerson || playerState.flying;
  headMesh.visible = thirdPerson || playerState.flying;
  hatMesh.visible = thirdPerson || playerState.flying;

  var camTarget = player.position.clone().add(new THREE.Vector3(0, 1.65, 0));
  if (thirdPerson || playerState.flying) {
    var back = new THREE.Vector3(
      Math.sin(playerState.yaw) * Math.cos(pitch),
      -Math.sin(pitch),
      Math.cos(playerState.yaw) * Math.cos(pitch)
    );
    camera.position.copy(camTarget).addScaledVector(back, 5.2).add(new THREE.Vector3(0, 0.6, 0));
    camera.lookAt(camTarget.clone().addScaledVector(back, -6));
  } else {
    camera.position.copy(camTarget);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = playerState.yaw;
    camera.rotation.x = pitch;
  }

  if (shakeMag > 0.001) {
    camera.position.x += (Math.random() - 0.5) * shakeMag;
    camera.position.y += (Math.random() - 0.5) * shakeMag;
    shakeMag *= Math.pow(0.02, dt);
  }

  // HUD updates
  var hb = document.getElementById('health-bar');
  var ht = document.getElementById('health-text');
  var sb = document.getElementById('stamina-bar');
  var ec = document.getElementById('enemy-count');
  var bf = document.getElementById('buffs');
  if (hb) hb.style.width = (playerState.hp / playerState.maxHp * 100) + '%';
  if (ht) ht.textContent = Math.ceil(playerState.hp) + ' / ' + playerState.maxHp;
  if (sb) sb.style.width = (playerState.stamina / playerState.maxStamina * 100) + '%';
  if (ec) ec.textContent = enemies.length + (boss.state === 'alive' ? ' (+BOSS)' : '');
  if (bf) {
    var bHtml = '';
    if (shieldT > 0) bHtml += '<div class="buff">\u{1F6E1}\uFE0F ' + Math.ceil(shieldHp) + ' (' + shieldT.toFixed(0) + 's)</div>';
    if (thermalWard) bHtml += '<div class="buff">\u{1F525} Thermal Ward</div>';
    if (tempestAttunement) bHtml += '<div class="buff">\u{1F300} Tempest Attuned</div>';
    if (heartStacks > 0) bHtml += '<div class="buff">\u{1F49A} +' + (heartStacks * 25) + ' HP</div>';
    bf.innerHTML = bHtml;
  }

  renderer.render(scene, camera);
}

window.addEventListener('resize', function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();

/* ================= Phase 4 exposure hook ================= */
window.AM = {
  scene: scene, camera: camera, player: player, playerState: playerState,
  ISLANDS: ISLANDS, ISLE: ISLE, groundY: groundY, islandAt: islandAt,
  materials: materials, potions: potions, slots: slots,
  RECIPES: RECIPES, RECIPE_BY_ID: RECIPE_BY_ID, NODE_BY_ID: NODE_BY_ID,
  showToast: showToast, openModal: openModal, closeModal: closeModal,
  updateMatPanel: updateMatPanel, renderSlots: renderSlots,
  dmgNumber: dmgNumber, burst: burst, glowTex: glowTex,
  tip: tip, tipGlow: tipGlow, tipLight: tipLight,
  getGold: function () { return gold; },
  addGold: function (n) { gold += n; updateGoldHUD(); },
  spendGold: function (n) { if (gold < n) return false; gold -= n; updateGoldHUD(); return true; },
  getSlotCount: function () { return slotCount; },
  setSlotCount: function (v) { slotCount = v; renderSlots(); },
  getTotalGathered: function () { return totalGathered; },
  setTotalGathered: function (v) { totalGathered = v; },
  getKills: function () { return kills; },
  getThermalWard: function () { return thermalWard; },
  setThermalWard: function (v) { thermalWard = v; },
  getTempestAttunement: function () { return tempestAttunement; },
  setTempestAttunement: function (v) { tempestAttunement = v; },
  getHeartStacks: function () { return heartStacks; },
  setHeartStacks: function (v) { heartStacks = v; },
  getStaffMults: function () { return { dmg: staffDmgMult, speed: staffSpeedMult, def: staffDefenseMult }; },
  setStaffMults: function (m) {
    staffDmgMult = m.dmg; staffSpeedMult = m.speed; staffDefenseMult = m.def;
  }
};
})();
