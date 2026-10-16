/* ============================================================
   AETHERMOOR — Phase 4: Currency, Merchant, Staff Shop & Saving
   Requires style.js to run first (it exposes window.AM)
   ============================================================ */
(function () {
'use strict';

function ready(cb) {
  if (window.AM) cb();
  else setTimeout(function () { ready(cb); }, 50);
}

ready(function () {
  var AM = window.AM;

  /* ================= Staff database ================= */
  var STAFF_DB = [
    { id: 'apprentice', name: 'Apprentice Staff', rarity: 'common', price: 0,
      icon: '\u{1FA84}', dmgMult: 1.0, speedMult: 1.0, defMult: 0.0,
      color: 0x7fe8ff, desc: 'Your trusty starting staff.' },
    { id: 'willow', name: 'Willow Wandstaff', rarity: 'common', price: 90,
      icon: '\u{1F33F}', dmgMult: 1.15, speedMult: 1.05, defMult: 0.02,
      color: 0x6affc9, desc: 'A balanced upgrade over the apprentice staff.' },
    { id: 'stormwood', name: 'Stormwood Staff', rarity: 'rare', price: 240,
      icon: '\u26A1', dmgMult: 1.35, speedMult: 1.15, defMult: 0.04,
      color: 0xb27bff, desc: 'Crackles with captured stormlight.' },
    { id: 'glacien', name: 'Glacien Rod', rarity: 'rare', price: 260,
      icon: '\u2744\uFE0F', dmgMult: 1.3, speedMult: 1.2, defMult: 0.06,
      color: 0x9fd8ff, desc: 'Carved from unmelting Frostveil ice.' },
    { id: 'voidglass', name: 'Voidglass Rod', rarity: 'epic', price: 520,
      icon: '\u{1F52E}', dmgMult: 1.6, speedMult: 1.3, defMult: 0.08,
      color: 0x8a5cff, desc: 'Hums with unstable void energy.' },
    { id: 'aetherking', name: "Aether King's Scepter", rarity: 'legendary', price: 950,
      icon: '\u{1F451}', dmgMult: 2.0, speedMult: 1.5, defMult: 0.12,
      color: 0xffd76a, desc: 'A relic from the age before the Shattering.' }
  ];
  var STAFF_BY_ID = {};
  STAFF_DB.forEach(function (s) { STAFF_BY_ID[s.id] = s; });

  var owned = { apprentice: 1 };
  var equippedId = 'apprentice';
  var MAX_LEVEL = 5;

  function computeStaffStats(id) {
    var base = STAFF_BY_ID[id];
    var lvl = owned[id] || 1;
    return {
      dmg: base.dmgMult * (1 + 0.08 * (lvl - 1)),
      speed: base.speedMult * (1 + 0.05 * (lvl - 1)),
      def: Math.min(0.35, base.defMult + 0.015 * (lvl - 1))
    };
  }

  function equipStaff(id) {
    if (!owned[id]) return;
    equippedId = id;
    var st = computeStaffStats(id);
    AM.setStaffMults({ dmg: st.dmg, speed: st.speed, def: st.def });
    var s = STAFF_BY_ID[id];
    AM.tip.material.color.setHex(s.color);
    AM.tip.material.emissive.setHex(s.color);
    AM.tipGlow.material.color.setHex(s.color);
    AM.tipLight.color.setHex(s.color);
    var nameEl = document.getElementById('staff-name');
    if (nameEl) nameEl.textContent = s.name + ' (Lv ' + owned[id] + ')';
  }

  /* ================= Rotating merchant stock ================= */
  var stock = [];
  function rollStock() {
    var pool = STAFF_DB.filter(function (s) { return s.id !== 'apprentice'; });
    for (var i = pool.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
    }
    stock = pool.slice(0, 4).map(function (s) { return s.id; });
  }
  rollStock();
  setInterval(rollStock, 5 * 60 * 1000);

  /* ================= Merchant NPC (3D) ================= */
  function buildMerchant() {
    var isl = AM.ISLANDS[AM.ISLE.EMBER];
    var grp = new THREE.Group();
    var robeMat = new THREE.MeshStandardMaterial({
      color: 0x3a2a10, emissive: 0xffb35c, emissiveIntensity: 0.3, roughness: 0.7 });
    var robe = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.7, 10), robeMat);
    robe.position.y = 1.05; robe.castShadow = true;
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0xd9c9a8, roughness: 0.7 }));
    head.position.y = 2.05;
    var hat = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.6, 10),
      new THREE.MeshStandardMaterial({ color: 0x6a4a1a, roughness: 0.8 }));
    hat.position.y = 2.42;
    var sign = new THREE.Sprite(new THREE.SpriteMaterial({
      map: AM.glowTex, color: 0xffd76a, transparent: true, opacity: 0.8,
      blending: THREE.AdditiveBlending, depthWrite: false }));
    sign.scale.set(2.6, 2.6, 1); sign.position.y = 3.1;
    grp.add(robe, head, hat, sign);
    grp.position.set(isl.x - 20, isl.y, isl.z + 10);
    AM.scene.add(grp);
    grp.userData.sign = sign;
    return grp;
  }
  var merchantGroup = buildMerchant();

  function nearMerchant() {
    var dx = AM.player.position.x - merchantGroup.position.x;
    var dz = AM.player.position.z - merchantGroup.position.z;
    var dy = Math.abs(AM.player.position.y - merchantGroup.position.y);
    return (dx * dx + dz * dz) < 36 && dy < 3.5;
  }

  /* ================= Shop UI ================= */
  function staffRow(s, opts) {
    opts = opts || {};
    var stats = computeStaffStats(s.id);
    var lvl = owned[s.id] || 0;
    var html = '<div class="staff-card"><span class="sc-icon">' + s.icon + '</span>' +
      '<div class="sc-info"><div class="sc-name rarity-' + s.rarity + '">' + s.name +
      (lvl ? ' (Lv ' + lvl + ')' : '') + '</div>' +
      '<div class="sc-stats">DMG x' + stats.dmg.toFixed(2) + ' &middot; SPD x' + stats.speed.toFixed(2) +
      ' &middot; DEF +' + Math.round(stats.def * 100) + '%</div>' +
      '<div class="sc-stats" style="opacity:.7">' + s.desc + '</div></div>';
    if (opts.buy) {
      html += '<div class="sc-price">' + s.price + ' \u{1F4B0}</div>' +
        '<button class="m-btn" ' + (AM.getGold() < s.price ? 'disabled' : '') +
        ' onclick="Shop.buy(\'' + s.id + '\')">BUY</button>';
    } else if (opts.owned) {
      if (s.id === equippedId) html += '<button class="m-btn ghost" disabled>EQUIPPED</button>';
      else html += '<button class="m-btn" onclick="Shop.equip(\'' + s.id + '\')">EQUIP</button>';
      html += '<button class="m-btn ghost" onclick="Shop.upgrade(\'' + s.id + '\')">UPGRADE</button>';
    }
    html += '</div>';
    return html;
  }

  function renderShopModal() {
    var html = '<button class="m-close" onclick="Shop.close()">\u2715</button>' +
      '<h2>WANDERING MERCHANT</h2><div class="sub2">Gold: ' + AM.getGold() + ' \u{1F4B0}</div>';
    html += '<div class="sub2" style="margin-top:8px">FOR SALE (restocks every few minutes)</div><div class="staff-grid">';
    stock.forEach(function (id) {
      if (owned[id]) return;
      html += staffRow(STAFF_BY_ID[id], { buy: true });
    });
    html += '</div><div class="sub2" style="margin-top:10px">YOUR STAFFS</div><div class="staff-grid">';
    Object.keys(owned).forEach(function (id) {
      if (!STAFF_BY_ID[id]) return;
      html += staffRow(STAFF_BY_ID[id], { owned: true });
    });
    html += '</div>';
    AM.openModal(html);
  }
  function openShop() { renderShopModal(); }

  function buyStaff(id) {
    var s = STAFF_BY_ID[id];
    if (!s || owned[id]) return;
    if (!AM.spendGold(s.price)) { AM.showToast('Not enough gold'); return; }
    owned[id] = 1;
    AM.burst(AM.player.position.clone().add(new THREE.Vector3(0, 1.5, 0)), s.color, 20, 7);
    AM.showToast('Purchased ' + s.name + '!');
    saveGame();
    renderShopModal();
  }

  function tryUpgrade(id) {
    var lvl = owned[id] || 0;
    if (!lvl) return;
    if (lvl >= MAX_LEVEL) { AM.showToast('Already at max level (' + MAX_LEVEL + ')'); return; }
    var goldCost = 50 * lvl, shardCost = lvl;
    var haveShard = AM.materials.aether_shard || 0;
    var before = computeStaffStats(id);
    owned[id] = lvl + 1; var after = computeStaffStats(id); owned[id] = lvl;
    var canAfford = AM.getGold() >= goldCost && haveShard >= shardCost;
    var s = STAFF_BY_ID[id];
    var html = '<h2>UPGRADE ' + s.name.toUpperCase() + '</h2>' +
      '<div class="sub2">Level ' + lvl + ' &rarr; ' + (lvl + 1) + '</div>' +
      '<div class="upgrade-row"><span>Damage</span><span>x' + before.dmg.toFixed(2) +
      ' <span class="arrow">&rarr;</span> <span class="better">x' + after.dmg.toFixed(2) + '</span></span></div>' +
      '<div class="upgrade-row"><span>Fly Speed</span><span>x' + before.speed.toFixed(2) +
      ' <span class="arrow">&rarr;</span> <span class="better">x' + after.speed.toFixed(2) + '</span></span></div>' +
      '<div class="upgrade-row"><span>Defense</span><span>+' + Math.round(before.def * 100) + '%' +
      ' <span class="arrow">&rarr;</span> <span class="better">+' + Math.round(after.def * 100) + '%</span></span></div>' +
      '<div class="confirm-text">Cost: <b>' + goldCost + ' gold</b> &amp; <b>' + shardCost + ' Aether Shard</b> ' +
      '(<span style="color:' + (haveShard >= shardCost ? '#8affc9' : '#ff8a9a') + '">have ' + haveShard + '</span>)</div>' +
      '<div class="m-actions"><button class="m-btn ghost" onclick="Shop.cancelUpgrade()">CANCEL</button>' +
      '<button class="m-btn" ' + (canAfford ? '' : 'disabled') +
      ' onclick="Shop.confirmUpgrade(\'' + id + '\')">CONFIRM</button></div>';
    AM.openModal(html);
  }

  function confirmUpgrade(id) {
    var lvl = owned[id] || 0;
    var goldCost = 50 * lvl, shardCost = lvl;
    if (AM.getGold() < goldCost || (AM.materials.aether_shard || 0) < shardCost) {
      AM.showToast('Not enough resources'); return;
    }
    AM.spendGold(goldCost);
    AM.materials.aether_shard -= shardCost;
    AM.updateMatPanel();
    owned[id] = lvl + 1;
    if (id === equippedId) equipStaff(id);
    AM.showToast('\u2728 ' + STAFF_BY_ID[id].name + ' upgraded to Lv ' + (lvl + 1) + '!');
    saveGame();
    renderShopModal();
  }

  window.Shop = {
    buy: buyStaff,
    equip: function (id) { equipStaff(id); saveGame(); renderShopModal(); },
    upgrade: tryUpgrade,
    confirmUpgrade: confirmUpgrade,
    cancelUpgrade: renderShopModal,
    close: AM.closeModal
  };

  /* ================= Input hooks ================= */
  window.addEventListener('keydown', function (e) {
    if (e.repeat) return;
    if (e.code === 'KeyB') {
      if (nearMerchant()) openShop(); else AM.showToast('No merchant nearby');
    }
  });
  var shopBtn = document.getElementById('btn-shop');
  if (shopBtn) {
    shopBtn.addEventListener('touchstart', function (e) {
      e.preventDefault();
      if (nearMerchant()) openShop(); else AM.showToast('No merchant nearby');
    }, { passive: false });
  }
  AM.nearMerchant = nearMerchant;
  AM.openShop = openShop;

  /* ================= Save / Load ================= */
  var SAVE_KEY = 'aethermoor_save_v1';
  function saveGame() {
    var data = {
      gold: AM.getGold(),
      materials: AM.materials,
      potions: AM.potions.slice(),
      slots: AM.slots.slice(),
      slotCount: AM.getSlotCount(),
      recipesKnown: AM.RECIPES.filter(function (r) { return r.known; }).map(function (r) { return r.id; }),
      owned: owned,
      equippedId: equippedId,
      hp: AM.playerState.hp, maxHp: AM.playerState.maxHp,
      heartStacks: AM.getHeartStacks(),
      thermalWard: AM.getThermalWard(),
      tempestAttunement: AM.getTempestAttunement(),
      totalGathered: AM.getTotalGathered(),
      pos: { x: AM.player.position.x, y: AM.player.position.y, z: AM.player.position.z },
      yaw: AM.playerState.yaw
    };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) { /* storage unavailable */ }
  }

  function loadGame() {
    var raw;
    try { raw = localStorage.getItem(SAVE_KEY); } catch (e) { return; }
    if (!raw) return;
    var data;
    try { data = JSON.parse(raw); } catch (e) { return; }

    AM.addGold(data.gold - AM.getGold());

    Object.keys(AM.materials).forEach(function (k) { delete AM.materials[k]; });
    Object.keys(data.materials || {}).forEach(function (k) { AM.materials[k] = data.materials[k]; });
    AM.updateMatPanel();

    AM.potions.length = 0;
    (data.potions || []).forEach(function (p) { AM.potions.push(p); });

    for (var i = 0; i < 5; i++) AM.slots[i] = (data.slots && data.slots[i] !== undefined) ? data.slots[i] : AM.slots[i];
    AM.setSlotCount(data.slotCount || AM.getSlotCount());

    (data.recipesKnown || []).forEach(function (id) {
      if (AM.RECIPE_BY_ID[id]) AM.RECIPE_BY_ID[id].known = true;
    });

    owned = data.owned || { apprentice: 1 };
    equippedId = data.equippedId || 'apprentice';
    equipStaff(equippedId);

    if (typeof data.hp === 'number') AM.playerState.hp = data.hp;
    if (typeof data.maxHp === 'number') AM.playerState.maxHp = data.maxHp;
    AM.setHeartStacks(data.heartStacks || 0);
    AM.setThermalWard(!!data.thermalWard);
    AM.setTempestAttunement(!!data.tempestAttunement);
    AM.setTotalGathered(data.totalGathered || 0);

    if (data.pos) AM.player.position.set(data.pos.x, data.pos.y, data.pos.z);
    if (typeof data.yaw === 'number') AM.playerState.yaw = data.yaw;

    AM.renderSlots();
    AM.showToast('\u{1F4BE} Save loaded — welcome back!');
  }

  loadGame();
  setInterval(saveGame, 20000);
  window.addEventListener('beforeunload', saveGame);

  /* ================= Idle / proximity loop ================= */
  var mTipShown = false;
  function tick() {
    requestAnimationFrame(tick);
    var t = performance.now() * 0.001;
    if (merchantGroup && merchantGroup.userData.sign) {
      merchantGroup.userData.sign.material.opacity = 0.6 + Math.sin(t * 2) * 0.2;
    }
    var near = nearMerchant();
    var btn = document.getElementById('btn-shop');
    if (btn) btn.style.display = near ? 'block' : 'none';
    if (near && !mTipShown) { mTipShown = true; AM.showToast('\u{1F6D2} Merchant nearby — press F or B to trade'); }
    if (!near) mTipShown = false;
  }
  tick();
});
})();
