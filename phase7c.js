(function(){
  var AM = window.AM;
  var THREE = window.THREE;
  if(!AM || !window.Phase7){ console.error('Phase 7c requires window.AM and window.Phase7'); return; }

  var ARENA = { x: 0, y: 3000, z: 0 };
  var joined = false;
  var savedPos = null;
  var enemyMeshes = {}; // id -> mesh
  var lastContactDmg = {};
  var floorBuilt = false;

  function setHud(){
    var hud = document.getElementById('coop-hud');
    if(!hud) return;
    hud.style.display = joined ? 'block' : 'none';
    var left = document.getElementById('coop-enemies-left');
    if(left) left.textContent = 'Enemies: ' + Object.keys(enemyMeshes).length;
  }

  /* ---------------- ARENA FLOOR (so the shared space isn't an invisible void) ---------------- */
  function buildFloor(){
    if(floorBuilt) return;
    floorBuilt = true;
    var group = new THREE.Group();
    group.position.set(ARENA.x, ARENA.y, ARENA.z);

    var disc = new THREE.Mesh(
      new THREE.CylinderGeometry(40, 40, 1, 64),
      new THREE.MeshStandardMaterial({ color: 0x14202e, roughness: 0.9, metalness: 0.1 })
    );
    disc.position.y = -0.5;
    group.add(disc);

    var rim = new THREE.Mesh(
      new THREE.TorusGeometry(39.4, 0.45, 8, 64),
      new THREE.MeshStandardMaterial({ color: 0x3ad6ff, emissive: 0x1a6f8a, emissiveIntensity: 1.2 })
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.2;
    group.add(rim);

    var grid = new THREE.GridHelper(80, 16, 0x2a7f9e, 0x1b3d4d);
    grid.position.y = 0.05;
    group.add(grid);

    AM.scene.add(group);
    AM.coopArenaGroup = group;
  }

  /* ---------------- ENEMY MESHES ---------------- */
  function makeEnemyMesh(){
    return new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.1, 0),
      new THREE.MeshStandardMaterial({ color: 0x3399ff, emissive: 0x002244 })
    );
  }

  function ensureEnemy(data){
    if(!enemyMeshes[data.id]){
      var mesh = makeEnemyMesh();
      mesh.position.set(data.x, data.y, data.z);
      AM.scene.add(mesh);
      enemyMeshes[data.id] = mesh;
    } else {
      enemyMeshes[data.id].position.lerp(new THREE.Vector3(data.x, data.y, data.z), 0.3);
    }
  }

  function removeEnemy(id){
    var mesh = enemyMeshes[id];
    if(mesh){ AM.scene.remove(mesh); delete enemyMeshes[id]; }
  }

  function syncEnemyList(list){
    var seen = {};
    list.forEach(function(e){ seen[e.id] = true; ensureEnemy(e); });
    Object.keys(enemyMeshes).forEach(function(id){
      if(!seen[id]) removeEnemy(id);
    });
    setHud();
  }

  function toggleCoop(){
    joined = !joined;
    if(joined){
      buildFloor();
      savedPos = AM.player.position.clone();
      try{ AM.playerState.lastSafe.copy(savedPos); }catch(e){}
      try{ AM.playerState.vy = 0; AM.playerState.grounded = true; }catch(e){}
      AM.player.position.set(ARENA.x, ARENA.y + 0.2, ARENA.z + 6);
      window.Phase7.send({ type: 'coopJoin' });
      AM.showToast('🤝 Joined Co-op Arena — fight together!');
    } else {
      window.Phase7.send({ type: 'coopLeave' });
      Object.keys(enemyMeshes).forEach(function(id){ removeEnemy(id); });
      try{ AM.playerState.vy = 0; }catch(e){}
      if(savedPos){
        AM.player.position.copy(savedPos);
        try{ AM.playerState.lastSafe.copy(savedPos); }catch(e){}
      }
      AM.showToast('Left Co-op Arena');
    }
    setHud();
  }

  // Chain into existing Phase7Events handler instead of replacing it
  var prevHandler = window.Phase7Events;
  window.Phase7Events = function(data){
    if(prevHandler) prevHandler(data);

    if(data.type === 'coopUpdate'){
      syncEnemyList(data.enemies || []);
    }

    if(data.type === 'coopKill'){
      removeEnemy(data.enemyId);
      setHud();
      if(data.killerId === window.Phase7.getMyId()){
        try{ AM.addGold(data.reward); }catch(e){}
        AM.showToast('+' + data.reward + ' 💰 — enemy defeated!');
      }
    }
  };

  /* ---------------- RAYCAST STRIKE on co-op enemies ---------------- */
  var raycaster = new THREE.Raycaster();
  var lastStrike = 0;
  function tryCoopStrike(){
    if(!joined) return;
    var now = performance.now();
    if(now - lastStrike < 450) return;
    var ids = Object.keys(enemyMeshes);
    if(!ids.length) return;
    var meshes = ids.map(function(id){ return enemyMeshes[id]; });

    var camPos = new THREE.Vector3(); AM.camera.getWorldPosition(camPos);
    var camDir = new THREE.Vector3(); AM.camera.getWorldDirection(camDir);
    raycaster.set(camPos, camDir);
    var hits = raycaster.intersectObjects(meshes);
    if(hits.length){
      var hitMesh = hits[0].object;
      var hitId = null;
      ids.forEach(function(id){ if(enemyMeshes[id] === hitMesh) hitId = id; });
      if(hitId){
        lastStrike = now;
        var mult = 1;
        try{ var sm = AM.getStaffMults(); if(sm && sm.dmg) mult = sm.dmg; }catch(e){}
        var dmg = Math.round(13 * mult);
        window.Phase7.send({ type: 'coopHit', enemyId: parseInt(hitId,10), dmg: dmg });
        try{ AM.dmgNumber(hits[0].point, dmg, 'crit'); }catch(e){}
      }
    }
  }
  window.addEventListener('mousedown', function(e){ if(e.button===0) tryCoopStrike(); });

  /* ---------------- CONTACT DAMAGE (client-side self-check) ---------------- */
  function tick(){
    requestAnimationFrame(tick);
    if(!joined) return;
    var now = performance.now();
    Object.keys(enemyMeshes).forEach(function(id){
      var mesh = enemyMeshes[id];
      var dx = AM.player.position.x - mesh.position.x;
      var dz = AM.player.position.z - mesh.position.z;
      var dist = Math.sqrt(dx*dx + dz*dz);
      if(dist < 2.2 && (now - (lastContactDmg[id]||0)) > 900){
        lastContactDmg[id] = now;
        try{
          if(AM.playerState && typeof AM.playerState.hp === 'number'){
            AM.playerState.hp = Math.max(0, AM.playerState.hp - 6);
          }
        }catch(e){}
      }
    });
  }
  tick();

  var btn = document.getElementById('btn-coop');
  if(btn){ btn.addEventListener('click', toggleCoop); btn.addEventListener('touchstart', toggleCoop); }
  document.addEventListener('keydown', function(e){ if(e.code === 'KeyM') toggleCoop(); });

  window.Phase7c = { toggle: toggleCoop, isJoined: function(){ return joined; } };

  AM.showToast('🤝 Phase 7c loaded — press M to join the Co-op Arena');
})();
