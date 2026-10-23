(function(){
  var AM = window.AM;
  if(!AM){ console.error('Phase 7 requires window.AM from style.js'); return; }
  var THREE = window.THREE;

  // EDIT THIS if testing across two devices on the same WiFi — replace
  // 'localhost' with your host computer's local IP (e.g. ws://192.168.1.23:8080)
  var SERVER_URL = (!location.host || location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'ws://localhost:8080'
    : ((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host);

  var myName = 'Wanderer' + Math.floor(Math.random()*9000+1000);
  var myColor = 0x8855ff;
  var ws = null;
  var otherPlayers = {}; // id -> {mesh, nameSprite, lastUpdate}
  var myId = null;

  function setStatus(text){
    var el = document.getElementById('mp-status');
    if(el) el.textContent = text;
  }

  function makeNameTag(name){
    var canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    var ctx = canvas.getContext('2d');
    ctx.font = 'bold 32px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(name, 128, 40);
    var tex = new THREE.CanvasTexture(canvas);
    var mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    var sprite = new THREE.Sprite(mat);
    sprite.scale.set(3, 0.75, 1);
    return sprite;
  }

  function makePlayerMesh(color){
    var g = new THREE.Group();
    var body = new THREE.Mesh(
      new THREE.ConeGeometry(0.5, 1.6, 8),
      new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.3 })
    );
    body.position.y = 0.8;
    var head = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xffe0c0 })
    );
    head.position.y = 1.8;
    g.add(body, head);
    return g;
  }

  function addOtherPlayer(p){
    if(otherPlayers[p.id]) return;
    var mesh = makePlayerMesh(p.color || 0x8855ff);
    mesh.position.set(p.x, p.y, p.z);
    AM.scene.add(mesh);
    var tag = makeNameTag(p.name || ('Player'+p.id));
    tag.position.set(0, 2.4, 0);
    mesh.add(tag);
    otherPlayers[p.id] = { mesh: mesh, lastUpdate: performance.now() };
  }

  function removeOtherPlayer(id){
    var op = otherPlayers[id];
    if(!op) return;
    AM.scene.remove(op.mesh);
    delete otherPlayers[id];
  }

  function updateOtherPlayer(id, data){
    var op = otherPlayers[id];
    if(!op) return;
    op.targetPos = { x: data.x, y: data.y, z: data.z };
    op.targetYaw = data.yaw;
    op.lastUpdate = performance.now();
  }

  function countOnline(){ return Object.keys(otherPlayers).length + 1; }

  function connect(){
    try{
      ws = new WebSocket(SERVER_URL);
    }catch(e){
      setStatus('🔴 Could not connect');
      return;
    }

    ws.onopen = function(){
      setStatus('🟢 Connected (1 player)');
      AM.showToast('🌐 Connected to multiplayer server');
    };

    ws.onclose = function(){
      setStatus('🔌 Offline');
      Object.keys(otherPlayers).forEach(removeOtherPlayer);
    };

    ws.onerror = function(){
      setStatus('🔴 Connection failed — is server.js running?');
    };

    ws.onmessage = function(ev){
      var data;
      try{ data = JSON.parse(ev.data); }catch(e){ return; }

      if(data.type === 'init'){
        myId = data.id;
        Object.keys(data.players).forEach(function(pid){
          if(parseInt(pid,10) !== myId) addOtherPlayer(data.players[pid]);
        });
        setStatus('🟢 Connected (' + countOnline() + ' players)');
      }
      if(data.type === 'join'){
        if(data.player.id !== myId){
          addOtherPlayer(data.player);
          setStatus('🟢 Connected (' + countOnline() + ' players)');
          AM.showToast('👋 ' + data.player.name + ' joined');
        }
      }
      if(data.type === 'update'){
        if(data.id !== myId) updateOtherPlayer(data.id, data);
      }
      if(data.type === 'leave'){
        removeOtherPlayer(data.id);
        setStatus('🟢 Connected (' + countOnline() + ' players)');
      }
    };
  }

  function sendUpdate(){
    if(!ws || ws.readyState !== WebSocket.OPEN || !AM.player) return;
    var yaw = 0;
    try{ yaw = AM.player.rotation.y || 0; }catch(e){}
    var hp = undefined;
    try{ hp = AM.playerState.hp; }catch(e){}
    ws.send(JSON.stringify({
      type: 'update',
      x: AM.player.position.x,
      y: AM.player.position.y,
      z: AM.player.position.z,
      yaw: yaw,
      name: myName,
      color: myColor,
      hp: hp
    }));
  }
  setInterval(sendUpdate, 120);

  function tick(){
    requestAnimationFrame(tick);
    var now = performance.now();
    Object.keys(otherPlayers).forEach(function(id){
      var op = otherPlayers[id];
      if(op.targetPos){
        op.mesh.position.lerp(new THREE.Vector3(op.targetPos.x, op.targetPos.y, op.targetPos.z), 0.25);
      }
      if(typeof op.targetYaw === 'number'){
        op.mesh.rotation.y = op.targetYaw;
      }
      // if no update in 10s, assume disconnected ghost and remove
      if(now - op.lastUpdate > 10000) removeOtherPlayer(id);
    });
  }
  tick();

  window.Phase7 = {
    connect: connect,
    setName: function(n){ myName = n; sendUpdate(); },
    status: function(){ return ws ? ws.readyState : -1; }
  };

  // Ask for a name once, then auto-connect
  setTimeout(function(){
    var chosen = window.prompt('Enter your Aethermoor name:', myName);
    if(chosen && chosen.trim()) myName = chosen.trim().slice(0, 16);
    connect();
  }, 800);

})();
