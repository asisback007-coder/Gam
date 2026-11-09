(function(){
  var AM = window.AM;
  var THREE = window.THREE;
  if(!AM || !window.Phase7){ console.error('Phase 7b requires window.AM and window.Phase7'); return; }

  var pvpEnabled = false;
  var duelHp = 100, duelMaxHp = 100;
  var lastStrike = 0;
  var respawning = false;
  var STRIKE_RANGE = 50;
  var STRIKE_DMG = 9;
  var STRIKE_COOLDOWN = 500;

  var STATS_KEY = 'aethermoor_duelstats_v1';
  var stats = { wins:0, losses:0 };
  (function loadStats(){
    try{ var raw = localStorage.getItem(STATS_KEY); if(raw) stats = JSON.parse(raw); }catch(e){}
  })();
  function saveStats(){ try{ localStorage.setItem(STATS_KEY, JSON.stringify(stats)); }catch(e){} }

  function setDuelStatusUI(){
    var el = document.getElementById('duel-status');
    if(!el) return;
    if(!pvpEnabled){ el.style.display='none'; return; }
    el.style.display='block';
    el.textContent = '⚔️ PvP: ON  ❤️ ' + Math.max(0,Math.round(duelHp)) + '/' + duelMaxHp;
  }

  function togglePvp(){
    pvpEnabled = !pvpEnabled;
    duelHp = duelMaxHp;
    setDuelStatusUI();
    window.Phase7.send({ type:'pvpToggle', on: pvpEnabled });
    AM.showToast(pvpEnabled ? '⚔️ PvP enabled — other PvP players can now duel you' : '🛡️ PvP disabled');
  }

  /* ---------------- HP BAR SPRITES on other players ---------------- */
  function makeHPBarSprite(){
    var canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 32;
    var ctx = canvas.getContext('2d');
    var tex = new THREE.CanvasTexture(canvas);
    var mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    var sprite = new THREE.Sprite(mat);
    sprite.scale.set(2.4, 0.3, 1);
    sprite.userData.canvas = canvas;
    sprite.userData.ctx = ctx;
    sprite.userData.tex = tex;
    return sprite;
  }
  function redrawHPBar(sprite, hp, max){
    var ctx = sprite.userData.ctx, canvas = sprite.userData.canvas;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    var pct = Math.max(0, Math.min(1, hp/max));
    ctx.fillStyle = pct>0.5 ? '#4CAF50' : (pct>0.2 ? '#FFC107' : '#F44336');
    ctx.fillRect(2,2,(canvas.width-4)*pct,canvas.height-4);
    sprite.userData.tex.needsUpdate = true;
  }
  function ensureHPBar(op){
    if(op.hpBarSprite || !op.mesh) return;
    var bar = makeHPBarSprite();
    bar.position.set(0, 2.1, 0);
    op.mesh.add(bar);
    op.hpBarSprite = bar;
    redrawHPBar(bar, op.hp||100, 100);
  }

  function attachBarsToAll(){
    var others = window.Phase7.getOtherPlayers();
    Object.keys(others).forEach(function(id){ ensureHPBar(others[id]); });
  }
  var attachInterval = setInterval(attachBarsToAll, 500);

  /* ---------------- PVP ICON above opponents with pvp=true ---------------- */
  function makeSwordSprite(){
    var canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    var ctx = canvas.getContext('2d');
    ctx.font = '48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚔️', 32, 48);
    var tex = new THREE.CanvasTexture(canvas);
    var sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    sprite.scale.set(0.6,0.6,1);
    return sprite;
  }
  function ensurePvpIcon(op){
    if(!op.mesh) return;
    if(op.pvp && !op.pvpIcon){
      var icon = makeSwordSprite();
      icon.position.set(0, 2.9, 0);
      op.mesh.add(icon);
      op.pvpIcon = icon;
    }
    if(!op.pvp && op.pvpIcon){
      op.mesh.remove(op.pvpIcon);
      op.pvpIcon = null;
    }
  }

  /* ---------------- NETWORK EVENTS ---------------- */
  window.Phase7Events = function(data){
    var others = window.Phase7.getOtherPlayers();

    if(data.type === 'pvpToggle'){
      var op = others[data.id];
      if(op){ op.pvp = !!data.on; ensurePvpIcon(op); }
    }

    if(data.type === 'update'){
      var op2 = others[data.id];
      if(op2 && typeof data.hp === 'number'){
        op2.hp = data.hp;
        ensureHPBar(op2);
        if(op2.hpBarSprite) redrawHPBar(op2.hpBarSprite, op2.hp, 100);
      }
    }

    if(data.type === 'join' || data.type === 'init'){
      setTimeout(attachBarsToAll, 50);
      var list = data.type==='join' ? [data.player] : Object.keys(data.players||{}).map(function(k){return data.players[k];});
      list.forEach(function(p){
        var op3 = others[p.id];
        if(op3){ op3.pvp = !!p.pvp; setTimeout(function(){ ensurePvpIcon(op3); }, 60); }
      });
    }

    if(data.type === 'duelHit'){
      if(data.targetId === window.Phase7.getMyId() && pvpEnabled && !respawning){
        duelHp -= data.dmg;
        setDuelStatusUI();
        if(duelHp <= 0){
          respawning = true;
          var killerName = 'someone';
          var others2 = window.Phase7.getOtherPlayers();
          if(others2[data.from]) killerName = others2[data.from].name;
          AM.showToast('💀 Defeated by ' + killerName + ' — respawning...');
          window.Phase7.send({ type:'duelDefeat', victim: window.Phase7.getMyId(), killer: data.from });
          setTimeout(function(){
            duelHp = duelMaxHp;
            respawning = false;
            setDuelStatusUI();
          }, 3000);
        }
      }
    }

    if(data.type === 'duelDefeat'){
      var myId = window.Phase7.getMyId();
      if(data.killer === myId){
        stats.wins++; saveStats();
        try{ AM.addGold(30); }catch(e){}
        AM.showToast('🏆 You won the duel! (+30 💰)');
      } else if(data.victim === myId){
        stats.losses++; saveStats();
      }
    }
  };

  /* ---------------- DUEL STRIKE (ranged raycast click) ---------------- */
  var raycaster = new THREE.Raycaster();
  function tryDuelStrike(){
    if(!pvpEnabled || respawning) return;
    var now = performance.now();
    if(now - lastStrike < STRIKE_COOLDOWN) return;
    var others = window.Phase7.getOtherPlayers();
    var candidates = Object.keys(others).filter(function(id){ return others[id].pvp; }).map(function(id){ return {id:id, mesh:others[id].mesh}; });
    if(!candidates.length) return;

    var camPos = new THREE.Vector3(); AM.camera.getWorldPosition(camPos);
    var camDir = new THREE.Vector3(); AM.camera.getWorldDirection(camDir);
    raycaster.set(camPos, camDir);

    var meshes = candidates.map(function(c){ return c.mesh; });
    var hits = raycaster.intersectObjects(meshes, true);
    if(hits.length && hits[0].distance <= STRIKE_RANGE){
      var hitMesh = hits[0].object;
      var found = null;
      candidates.forEach(function(c){
        c.mesh.traverse(function(child){ if(child === hitMesh) found = c; });
      });
      if(found){
        lastStrike = now;
        window.Phase7.send({ type:'duelHit', targetId: parseInt(found.id,10), dmg: STRIKE_DMG });
        try{ AM.dmgNumber(hits[0].point, STRIKE_DMG, '#ff5577'); }catch(e){}
      }
    }
  }
  window.addEventListener('mousedown', function(e){ if(e.button===0) tryDuelStrike(); });

  /* ---------------- DUEL STATS MODAL ---------------- */
  function renderDuelStatsModal(){
    var total = stats.wins + stats.losses;
    var rate = total>0 ? Math.round((stats.wins/total)*100) : 0;
    var html = '<div class="shop-modal"><h2>🏆 Duel Stats</h2>'
      + '<div class="quest-row"><div><div class="quest-title">Wins</div><div class="quest-desc">'+stats.wins+'</div></div></div>'
      + '<div class="quest-row"><div><div class="quest-title">Losses</div><div class="quest-desc">'+stats.losses+'</div></div></div>'
      + '<div class="quest-row"><div><div class="quest-title">Win Rate</div><div class="quest-desc">'+rate+'%</div></div></div>'
      + '<button class="mbtn" onclick="AM.closeModal()">Close</button></div>';
    AM.openModal(html);
  }

  /* ---------------- WIRING ---------------- */
  var btnPvp = document.getElementById('btn-pvp');
  var btnStats = document.getElementById('btn-duelstats');
  if(btnPvp){ btnPvp.addEventListener('click', togglePvp); btnPvp.addEventListener('touchstart', togglePvp); }
  if(btnStats){ btnStats.addEventListener('click', renderDuelStatsModal); btnStats.addEventListener('touchstart', renderDuelStatsModal); }

  document.addEventListener('keydown', function(e){
    if(e.code === 'KeyP') togglePvp();
    if(e.code === 'KeyK') renderDuelStatsModal();
  });

  AM.showToast('⚔️ Phase 7b loaded — press P to enable PvP, K for duel stats');
})();
