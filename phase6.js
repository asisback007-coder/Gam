(function(){
  var AM = window.AM;
  if(!AM){ console.error('Phase 6 requires window.AM from style.js'); return; }

  /* ---------------- LOADOUT PRESETS ---------------- */
  var LOADOUT_KEY = 'aethermoor_loadouts_v1';
  var loadouts = { 1:null, 2:null, 3:null };
  (function loadLoadouts(){
    try{
      var raw = localStorage.getItem(LOADOUT_KEY);
      if(raw) loadouts = JSON.parse(raw);
    }catch(e){}
  })();
  function saveLoadouts(){ try{ localStorage.setItem(LOADOUT_KEY, JSON.stringify(loadouts)); }catch(e){} }

  function previewText(arr){
    if(!arr || !arr.length) return '(empty)';
    return arr.filter(function(a){ return !!a; }).map(function(a){
      if(typeof a === 'string') return a;
      return (a && (a.name||a.id)) || '?';
    }).join(', ') || '(empty)';
  }

  function savePreset(n){
    try{
      loadouts[n] = JSON.parse(JSON.stringify(AM.slots));
      saveLoadouts();
      AM.showToast('Saved current abilities to Preset '+n);
      renderLoadoutModal();
    }catch(e){
      AM.showToast('Could not save preset — slot data not readable');
    }
  }

  function applyPreset(n){
    var data = loadouts[n];
    if(!data){ AM.showToast('Preset '+n+' is empty'); return; }
    try{
      AM.slots.length = 0;
      data.forEach(function(item){ AM.slots.push(item); });
      if(AM.renderSlots) AM.renderSlots();
      AM.showToast('Loaded Preset '+n);
    }catch(e){
      AM.showToast('Could not load preset — see console for details');
      console.error(e);
    }
  }

  function renderLoadoutModal(){
    var rows = [1,2,3].map(function(n){
      var filled = loadouts[n] ? previewText(loadouts[n]) : '(empty)';
      return '<div class="loadout-row">'
        + '<div><b>Preset '+n+'</b><div class="loadout-slots-preview">'+filled+'</div></div>'
        + '<div><button class="mbtn" onclick="Phase6.save('+n+')">SAVE HERE</button> '
        + '<button class="mbtn" onclick="Phase6.load('+n+')">EQUIP</button></div>'
        + '</div>';
    }).join('');
    var html = '<div class="shop-modal"><h2>📑 Ability Loadouts</h2>'
      + '<p style="opacity:0.7;font-size:12px;">Save your current 5 ability slots as a preset, or instantly swap to a saved one. Presets do not consume potions — only your currently equipped slots are swapped.</p>'
      + rows + '<button class="mbtn" onclick="AM.closeModal()">Close</button></div>';
    AM.openModal(html);
  }

  /* ---------------- WAVE MUTATORS ---------------- */
  var MUTATORS = [
    { id:'none', name:'None', desc:'No modifier today' },
    { id:'explode', name:'Volatile Foes', desc:'Enemies explode on death (visual only)' },
    { id:'swift', name:'Swift Swarm', desc:'Enemies move 40% faster' },
    { id:'golden', name:'Golden Hour', desc:'Gold rewards doubled' },
    { id:'glass', name:'Glass Cannon', desc:'You deal +30% damage, enemies deal more too' }
  ];
  function todaysMutator(){
    var d = new Date();
    var seed = d.getFullYear()*372 + d.getMonth()*31 + d.getDate();
    return MUTATORS[seed % MUTATORS.length];
  }
  var activeMutator = todaysMutator();

  function applyMutatorToDamage(baseDmg){
    if(activeMutator.id==='glass') return baseDmg*1.3;
    return baseDmg;
  }
  function applyMutatorToGold(baseGold){
    if(activeMutator.id==='golden') return baseGold*2;
    return baseGold;
  }
  function applyMutatorToEnemySpeed(baseSpeed){
    if(activeMutator.id==='swift') return baseSpeed*1.4;
    if(activeMutator.id==='glass') return baseSpeed*1.15;
    return baseSpeed;
  }

  function updateMutatorHUD(){
    var el = document.getElementById('wave-mutator');
    if(el) el.textContent = 'Mutator: '+activeMutator.name;
  }
  updateMutatorHUD();

  // Hook into Phase5's wave system if present, non-destructively
  if(window.Phase5){
    var origStart = window.Phase5.startWave;
    window.Phase5.startWave = function(){
      activeMutator = todaysMutator();
      updateMutatorHUD();
      AM.showToast('Today\'s mutator: '+activeMutator.name+' — '+activeMutator.desc);
      if(origStart) origStart();
    };
  }
  window.Phase6Mutators = {
    get: function(){ return activeMutator; },
    dmg: applyMutatorToDamage,
    gold: applyMutatorToGold,
    speed: applyMutatorToEnemySpeed
  };

  /* ---------------- QUEST LOG ---------------- */
  var QUEST_KEY = 'aethermoor_quests_v1';
  var claimed = {};
  (function loadClaimed(){
    try{
      var raw = localStorage.getItem(QUEST_KEY);
      if(raw) claimed = JSON.parse(raw);
    }catch(e){}
  })();
  function saveClaimed(){ try{ localStorage.setItem(QUEST_KEY, JSON.stringify(claimed)); }catch(e){} }

  function getBestWave(){
    try{ return parseInt(localStorage.getItem('aethermoor_bestwave_v1')||'0',10) || 0; }catch(e){ return 0; }
  }

  var QUESTS = [
    { id:'first_blood', name:'First Blood', desc:'Defeat 1 enemy', reward:20,
      check:function(){ return AM.getKills() >= 1; }, progress:function(){ return Math.min(AM.getKills(),1)+'/1'; } },
    { id:'monster_hunter', name:'Monster Hunter', desc:'Defeat 25 enemies', reward:75,
      check:function(){ return AM.getKills() >= 25; }, progress:function(){ return Math.min(AM.getKills(),25)+'/25'; } },
    { id:'veteran_hunter', name:'Veteran Hunter', desc:'Defeat 100 enemies', reward:200,
      check:function(){ return AM.getKills() >= 100; }, progress:function(){ return Math.min(AM.getKills(),100)+'/100'; } },
    { id:'gatherer', name:'Gatherer', desc:'Gather 20 materials', reward:40,
      check:function(){ return AM.getTotalGathered() >= 20; }, progress:function(){ return Math.min(AM.getTotalGathered(),20)+'/20'; } },
    { id:'master_forager', name:'Master Forager', desc:'Gather 100 materials', reward:120,
      check:function(){ return AM.getTotalGathered() >= 100; }, progress:function(){ return Math.min(AM.getTotalGathered(),100)+'/100'; } },
    { id:'proving_grounds', name:'Proving Grounds', desc:'Reach Wave 3 in Wave Survival', reward:150,
      check:function(){ return getBestWave() >= 3; }, progress:function(){ return Math.min(getBestWave(),3)+'/3'; } },
    { id:'storm_veteran', name:'Storm Veteran', desc:'Reach Wave 7 in Wave Survival', reward:300,
      check:function(){ return getBestWave() >= 7; }, progress:function(){ return Math.min(getBestWave(),7)+'/7'; } },
    { id:'gold_hoarder', name:'Gold Hoarder', desc:'Accumulate 1000 gold at once', reward:0,
      check:function(){ return AM.getGold() >= 1000; }, progress:function(){ return Math.min(AM.getGold(),1000)+'/1000'; } }
  ];

  function checkQuestsAndNotify(){
    QUESTS.forEach(function(q){
      if(!claimed[q.id] && q.check()){
        claimed[q.id] = true;
        if(q.reward>0) AM.addGold(q.reward);
        saveClaimed();
        AM.showToast('✅ Quest complete: '+q.name+(q.reward>0?' (+'+q.reward+' 💰)':''));
      }
    });
  }
  setInterval(checkQuestsAndNotify, 4000);

  function renderQuestModal(){
    var rows = QUESTS.map(function(q){
      var done = !!claimed[q.id];
      return '<div class="quest-row'+(done?' done':'')+'">'
        + '<div><div class="quest-title">'+(done?'✅ ':'')+q.name+'</div>'
        + '<div class="quest-desc">'+q.desc+'</div>'
        + '<div class="quest-progress">'+(done?'Claimed':q.progress())+(q.reward>0 && !done?' · Reward: '+q.reward+' 💰':'')+'</div></div>'
        + '</div>';
    }).join('');
    var html = '<div class="shop-modal"><h2>📜 Quest Log</h2>'+rows+'<button class="mbtn" onclick="AM.closeModal()">Close</button></div>';
    AM.openModal(html);
  }

  /* ---------------- WIRING ---------------- */
  var btnLoadout = document.getElementById('btn-loadout');
  var btnQuests = document.getElementById('btn-quests');
  if(btnLoadout){ btnLoadout.addEventListener('click', renderLoadoutModal); btnLoadout.addEventListener('touchstart', renderLoadoutModal); }
  if(btnQuests){ btnQuests.addEventListener('click', renderQuestModal); btnQuests.addEventListener('touchstart', renderQuestModal); }

  document.addEventListener('keydown', function(e){
    if(e.code==='KeyL') renderLoadoutModal();
    if(e.code==='KeyJ') renderQuestModal();
  });

  window.Phase6 = {
    save: savePreset,
    load: applyPreset,
    openLoadouts: renderLoadoutModal,
    openQuests: renderQuestModal
  };

  AM.showToast('📑 Phase 6 loaded — Loadouts (L), Quests (J), daily mutator: '+activeMutator.name);
})();
