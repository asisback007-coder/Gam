* { margin:0; padding:0; box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
html,body { width:100%; height:100%; overflow:hidden; background:#060818;
  font-family:'Segoe UI', system-ui, sans-serif; color:#dfe6ff; user-select:none; touch-action:none; }
#game, #game canvas { position:fixed; inset:0; display:block; }

/* ---------- Fullscreen FX overlays ---------- */
#vignette { position:fixed; inset:0; pointer-events:none; z-index:7; opacity:0;
  background:radial-gradient(ellipse at center, transparent 55%, rgba(255,30,60,.55) 100%); }
#vignette.hit { animation:hitFlash .35s ease-out; }
@keyframes hitFlash { 0%{opacity:1;} 100%{opacity:0;} }
#frost { position:fixed; inset:0; pointer-events:none; z-index:7; opacity:0; transition:opacity .6s;
  background:radial-gradient(ellipse at center, transparent 40%, rgba(120,190,255,.5) 100%); }

/* ---------- HUD ---------- */
#hud { position:fixed; inset:0; pointer-events:none; z-index:5; }
#health-wrap { position:absolute; top:18px; left:18px; width:min(280px,42vw); height:22px;
  background:rgba(10,14,34,.7); border:1px solid rgba(127,232,255,.5); border-radius:11px; overflow:hidden; }
#health-bar { height:100%; width:100%; border-radius:10px;
  background:linear-gradient(90deg,#2ee6a8,#7fe8ff); transition:width .15s ease; }
#health-text { position:absolute; inset:0; text-align:center; font-size:12px; line-height:22px;
  font-weight:700; color:#04121e; text-shadow:0 0 4px rgba(255,255,255,.4); }
#stamina-wrap { position:absolute; top:46px; left:18px; width:min(200px,32vw); height:10px;
  background:rgba(10,14,34,.7); border:1px solid rgba(178,123,255,.45); border-radius:6px; overflow:hidden; }
#stamina-bar { height:100%; width:100%; background:linear-gradient(90deg,#b27bff,#ff6ad5); transition:width .1s linear; }

#materials { position:absolute; top:66px; left:18px; display:flex; flex-direction:column; gap:4px;
  font-size:12px; }
.mat-row { display:flex; align-items:center; gap:7px; background:rgba(10,14,34,.6);
  border:1px solid rgba(127,232,255,.2); border-radius:7px; padding:3px 9px; width:max-content; }
.mat-dot { width:10px; height:10px; border-radius:50%; box-shadow:0 0 7px currentColor; }

#wave-info { position:absolute; top:18px; right:18px; font-size:12px; letter-spacing:2px;
  color:#9fb4ff; background:rgba(10,14,34,.6); padding:6px 12px; border-radius:8px;
  border:1px solid rgba(127,232,255,.25); }

#crosshair { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%);
  font-size:22px; color:rgba(127,232,255,.9); text-shadow:0 0 6px #7fe8ff; }
#charge-ring { position:absolute; left:50%; top:50%; width:52px; height:52px;
  transform:translate(-50%,-50%); border-radius:50%; opacity:0; }
#charge-ring.on { opacity:1; }

#slots { position:absolute; left:50%; bottom:22px; transform:translateX(-50%); display:flex; gap:10px; }
.slot { position:relative; width:58px; height:58px; border-radius:14px; overflow:hidden;
  background:rgba(12,18,42,.75); border:1px solid rgba(127,232,255,.45);
  box-shadow:0 0 12px rgba(80,140,255,.25), inset 0 0 14px rgba(60,110,255,.15);
  display:flex; align-items:center; justify-content:center; }
.slot .icon { font-size:24px; filter:drop-shadow(0 0 5px rgba(127,232,255,.8)); }
.slot .key { position:absolute; top:2px; left:5px; font-size:9px; font-weight:700; color:#8fb4d8; letter-spacing:1px; }
.slot .cd { position:absolute; left:0; bottom:0; width:100%; height:0%; background:rgba(6,10,26,.78); }
.slot.locked { opacity:.35; border-style:dashed; }
.slot.ready { border-color:#7fe8ff; box-shadow:0 0 16px rgba(127,232,255,.55); }

#hint-bar { position:absolute; bottom:92px; left:50%; transform:translateX(-50%);
  font-size:11px; letter-spacing:1px; color:rgba(160,185,230,.75); white-space:nowrap; }
body.touch #hint-bar { display:none; }

/* ---------- Toasts & zone banner ---------- */
#toast { position:fixed; top:14%; left:50%; transform:translateX(-50%); z-index:9;
  background:rgba(10,16,38,.85); border:1px solid rgba(127,232,255,.5); border-radius:10px;
  padding:10px 22px; font-size:14px; letter-spacing:.5px; opacity:0; transition:opacity .3s;
  pointer-events:none; white-space:nowrap; box-shadow:0 0 20px rgba(80,140,255,.3); }
#toast.show { opacity:1; }
#zone-banner { position:fixed; top:34%; left:50%; transform:translateX(-50%); z-index:9;
  font-size:clamp(28px,6vw,52px); font-weight:800; letter-spacing:14px; opacity:0;
  pointer-events:none; text-shadow:0 0 30px currentColor; transition:opacity .8s; }
#zone-banner.show { opacity:1; }

/* ---------- Damage numbers ---------- */
#dmg-layer { position:fixed; inset:0; pointer-events:none; z-index:6; overflow:hidden; }
.dmg { position:absolute; transform:translate(-50%,-50%); font-weight:800; font-size:18px;
  color:#aef3ff; text-shadow:0 0 6px #2288ff, 0 1px 2px #000; animation:floatUp .9s ease-out forwards; }
.dmg.crit { color:#ffd76a; font-size:24px; text-shadow:0 0 8px #ff9a2a, 0 1px 2px #000; }
.dmg.hurt { color:#ff7a8a; text-shadow:0 0 8px #ff2244, 0 1px 2px #000; }
.dmg.gain { color:#8affc9; text-shadow:0 0 8px #22cc88, 0 1px 2px #000; }
@keyframes floatUp { 0%{opacity:1; margin-top:0;} 100%{opacity:0; margin-top:-56px;} }

/* ---------- Mobile ---------- */
#mobile-ui { display:none; }
body.touch #mobile-ui { display:block; }
#joystick { position:fixed; width:120px; height:120px; border-radius:50%; z-index:8;
  background:rgba(127,232,255,.08); border:2px solid rgba(127,232,255,.35);
  display:none; transform:translate(-50%,-50%); pointer-events:none; }
#joystick-knob { position:absolute; left:50%; top:50%; width:52px; height:52px; border-radius:50%;
  transform:translate(-50%,-50%); background:rgba(127,232,255,.35); box-shadow:0 0 14px rgba(127,232,255,.6); }
.mbtn { position:fixed; z-index:8; width:64px; height:64px; border-radius:50%;
  background:rgba(12,18,42,.7); border:2px solid rgba(127,232,255,.5); color:#7fe8ff;
  font-size:26px; pointer-events:auto; }
.mbtn:active { background:rgba(127,232,255,.35); }
.mbtn.small { width:52px; height:52px; font-size:20px; }
#btn-cast { right:26px; bottom:96px; width:84px; height:84px; font-size:34px; }
#btn-nova { right:126px; bottom:66px; }
#btn-blink { right:120px; bottom:160px; }
#btn-broom { left:22px; bottom:190px; }
#btn-gather { right:220px; bottom:90px; display:none; }
#btn-up { right:36px; bottom:200px; display:none; }
#btn-down { right:106px; bottom:220px; display:none; }
body.flying #btn-up, body.flying #btn-down { display:block; }

/* ---------- Overlays ---------- */
#start-overlay, #death-overlay { position:fixed; inset:0; z-index:20; display:flex; flex-direction:column;
  align-items:center; justify-content:center; gap:14px; background:rgba(6,9,22,.88);
  backdrop-filter:blur(4px); text-align:center; }
#death-overlay { display:none; }
#start-overlay h1, #death-overlay h1 { font-size:clamp(34px,8vw,64px); letter-spacing:10px;
  background:linear-gradient(180deg,#bfefff,#5b8dff); -webkit-background-clip:text; background-clip:text;
  color:transparent; text-shadow:0 0 40px rgba(90,150,255,.35); }
#death-overlay h1 { background:linear-gradient(180deg,#ffb3bd,#ff4466); -webkit-background-clip:text; background-clip:text; }
.sub { letter-spacing:4px; color:#9fb4ff; font-size:13px; }
.hint { font-size:12px; line-height:1.9; color:rgba(170,195,240,.7); max-width:560px; }
.hint b { color:#aef3ff; }
#play-btn, #respawn-btn { margin-top:10px; padding:14px 44px; font-size:16px; font-weight:800;
  letter-spacing:3px; color:#06121f; border:none; border-radius:12px; cursor:pointer;
  background:linear-gradient(90deg,#7fe8ff,#4f9dff); box-shadow:0 0 26px rgba(90,180,255,.5); }
#play-btn:hover, #respawn-btn:hover { filter:brightness(1.15); }

/* ---------- Modal system ---------- */
#modal { position:fixed; inset:0; z-index:15; display:none; align-items:center; justify-content:center;
  background:rgba(4,7,18,.72); backdrop-filter:blur(3px); }
#modal-box { width:min(480px,92vw); max-height:82vh; overflow-y:auto; background:rgba(12,18,42,.96);
  border:1px solid rgba(127,232,255,.5); border-radius:16px; padding:20px 22px;
  box-shadow:0 0 40px rgba(80,140,255,.35); }
#modal-box h2 { font-size:18px; letter-spacing:3px; color:#aef3ff; margin-bottom:4px; }
#modal-box .sub2 { font-size:11px; color:#8fa4d8; margin-bottom:14px; letter-spacing:1px; }
.m-close { float:right; background:none; border:1px solid rgba(127,232,255,.4); color:#9fb4ff;
  border-radius:8px; width:30px; height:30px; cursor:pointer; font-size:14px; }
.m-close:hover { background:rgba(127,232,255,.15); }

/* recipe / potion rows */
.m-row { display:flex; align-items:center; justify-content:space-between; gap:10px;
  background:rgba(20,28,58,.6); border:1px solid rgba(127,232,255,.18); border-radius:10px;
  padding:9px 12px; margin-bottom:8px; }
.m-row .info { flex:1; }
.m-row .name { font-size:13px; font-weight:700; color:#dfe9ff; }
.m-row .mats { font-size:11px; margin-top:3px; color:#9fb4ff; }
.m-row .mats .lack { color:#ff8a9a; }
.m-btn { padding:8px 14px; font-size:12px; font-weight:800; letter-spacing:1px; border:none;
  border-radius:8px; cursor:pointer; background:linear-gradient(90deg,#7fe8ff,#4f9dff); color:#06121f; }
.m-btn:disabled { opacity:.35; cursor:not-allowed; }
.m-btn.danger { background:linear-gradient(90deg,#ff9a8a,#ff4466); color:#21060c; }
.m-btn.ghost { background:rgba(127,232,255,.12); color:#aef3ff; border:1px solid rgba(127,232,255,.4); }

/* brew minigame */
#brew-bar { position:relative; height:26px; border-radius:13px; margin:16px 0 10px;
  background:rgba(6,10,26,.9); border:1px solid rgba(127,232,255,.4); overflow:hidden; }
#brew-zone { position:absolute; top:0; bottom:0; left:38%; width:30%;
  background:rgba(106,255,201,.25); border-left:1px solid #6affc9; border-right:1px solid #6affc9; }
#brew-zone .perfect { position:absolute; top:0; bottom:0; left:38%; width:24%;
  background:rgba(255,215,106,.3); }
#brew-marker { position:absolute; top:-2px; bottom:-2px; width:4px; left:0;
  background:#fff; box-shadow:0 0 10px #7fe8ff; }

/* replace / confirm */
.replace-grid { display:flex; flex-direction:column; gap:8px; margin:12px 0; }
.replace-slot { display:flex; align-items:center; gap:12px; padding:10px 14px;
  background:rgba(20,28,58,.7); border:1px solid rgba(127,232,255,.3); border-radius:10px;
  cursor:pointer; font-size:14px; }
.replace-slot:hover { background:rgba(127,232,255,.14); border-color:#7fe8ff; }
.replace-slot .ric { font-size:22px; }
.replace-slot .rkey { margin-left:auto; font-size:10px; color:#8fb4d8; letter-spacing:1px; }
.confirm-text { font-size:14px; line-height:1.6; margin:12px 0 16px; color:#cfe0ff; }
.confirm-text b { color:#ffd76a; }
.m-actions { display:flex; gap:10px; justify-content:flex-end; }

/* buffs */
#buffs { position:absolute; top:46px; left:230px; display:flex; gap:6px; }
.buff { background:rgba(10,14,34,.7); border:1px solid rgba(127,232,255,.35); border-radius:7px;
  padding:2px 8px; font-size:12px; }

/* mobile ability buttons */
#abil-btns { position:fixed; right:26px; bottom:300px; display:flex; flex-direction:column; gap:10px; z-index:8; }
#abil-btns .abtn { position:relative; width:52px; height:52px; border-radius:50%;
  background:rgba(12,18,42,.7); border:2px solid rgba(127,232,255,.5); font-size:22px; overflow:hidden; }
#abil-btns .abtn .acd { position:absolute; left:0; bottom:0; width:100%; background:rgba(6,10,26,.75); }
#btn-bag { left:22px; bottom:260px; }
#btn-brew { right:220px; bottom:160px; display:none; }

/* ---------- Boss bar ---------- */
#boss-wrap { position:absolute; top:16px; left:50%; transform:translateX(-50%);
  width:min(460px,70vw); display:none; text-align:center; }
#boss-name { font-size:13px; letter-spacing:5px; color:#c9ffa8; text-shadow:0 0 12px #5aff5a;
  margin-bottom:5px; font-weight:800; }
#boss-bar { height:14px; background:rgba(10,14,30,.8); border:1px solid rgba(150,255,120,.6);
  border-radius:8px; overflow:hidden; }
#boss-fill { height:100%; width:100%; background:linear-gradient(90deg,#5aff5a,#c9ffa8); transition:width .15s; }
