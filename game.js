function storyMarkup(){
  const stage=state.storyStage;
  if(stage===0){return panelHeading('ACT I · THE SHATTERED VEIL','Chronicle','A choice waits beneath the broken shrine.')+`<article class="story-card"><div class="story-portrait">${state.faction==='demon'?'♆':'☼'}</div><div><small>THE VEILKEEPER</small><h3>“The watch is ash. The field remembers.”</h3><p>Defeat the Ashen Watch and return to the central altar. What opens there will alter the covenant.</p></div></article><div class="story-progress"><b>${Math.min(3,state.kills)} / 3</b><span>ASHEN WATCH DEFEATED</span></div>`;}
  if(stage===1){return panelHeading('ACT I · THE VEILKEEPER','The Covenant Offered','The Veilkeeper has laid two futures before you.')+`<article class="story-card"><div class="story-portrait">◇</div><div><small>THE FIRST OATH</small><h3>Sealing the Veil</h3><p>Close the breach and spare the wardens trapped on the other side. This is the road of mercy and restraint.</p></div></article><article class="story-card"><div class="story-portrait">♆</div><div><small>THE SECOND OATH</small><h3>Claiming the Rift</h3><p>Enter the breach and bind its power to yourself. The road grants might, but loosens the boundary.</p></div></article><div class="panel-actions"><button class="action-btn" data-action="story-choice" data-choice="seal">◇ SEAL THE VEIL</button><button class="action-btn demon-choice" data-action="story-choice" data-choice="claim">♆ CLAIM THE RIFT</button></div>`;}
  const seal=state.storyChoice==='seal';
  return panelHeading('ACT I · THE CHRONICLE','Covenant Declared','Your decision has altered the Shattered Veil.')+`<article class="story-card"><div class="story-portrait">${seal?'◇':'♆'}</div><div><small>${seal?'THE VEIL SEALED':'THE RIFT CLAIMED'}</small><h3>${seal?'Mercy became a wall of dawn.':'Power became a burning star.'}</h3><p>${seal?'The borderlands are calmer. Their remaining hostiles hit harder, but the altar grants a restorative ward.':'The breach answers your blood. Enemy waves arrive faster, while fallen enemies yield more shards.'}</p></div></article><div class="story-progress"><b>COMPLETED</b><span>${seal?'THE COVENANT OF DAWN':'THE COVENANT OF ASH'}</span></div>`;
}
function openStory(){
  if(state.kills<3){toast('THE ALTAR IS SILENT · DEFEAT THE ASHEN WATCH');return;}
  if(state.storyStage===0){state.storyStage=1;toast('THE VEILKEEPER WAITS');}
  openPanel('story');
}

function updateStoryConsequences(){
  if(state.storyChoice==='seal'&&state.storyStage>=2){
    if(state.hp<state.maxHp)state.hp=Math.min(state.maxHp,state.hp+dtStoryHeal);
  }
}

let dtStoryHeal=0;

// Story choices change resources and enemy pressure.
const originalHandlePanelAction=handlePanelAction;
handlePanelAction=function(action,id,slot,type){
  if(action==='story-choice'){
    const choice=slot||id;
    if(choice!=='seal'&&choice!=='claim')return;
    state.storyChoice=choice;
    state.storyStage=2;
    if(choice==='seal'){
      state.ward=4;
      state.maxHp+=10;
      state.hp=Math.min(state.maxHp,state.hp+40);
      state.inventory.push(item('Dawn Ward','Artifact','epic','◇','A covenant blessing that strengthens the bearer.',{bonus:10,effect:'seal'}));
      toast('COVENANT CHOSEN · THE VEIL IS SEALED');
      feed('<b>THE DAWN WALLS RISE</b> · +10 vitality','good');
    }else{
      state.weaponPower+=12;
      state.shards+=25;
      state.inventory.push(item('Rift Heart','Artifact','epic','♆','An ember torn from the breach. It answers your will.',{bonus:12,effect:'claim'}));
      toast('COVENANT CHOSEN · THE RIFT IS CLAIMED');
      feed('<b>THE RIFT ANSWERS</b> · +12 weapon power','damage');
    }
    refreshHud();
    renderPanel('story');
    return;
  }
  originalHandlePanelAction(action,id,slot,type);
};

// Keep all interface buttons responsive to the active story and game state.
$('#help-btn').addEventListener('click',()=>openPanel('codex'));
$('#audio-btn').addEventListener('click',()=>{
  state.muted=!state.muted;
  $('#audio-btn').textContent=state.muted?'♫':'♪';
  toast(state.muted?'AMBIENCE MUTED':'AMBIENCE ENABLED');
});

let lastTime=performance.now();
let manaRegen=0;
function resize(){
  const rect=$('#game').getBoundingClientRect();
  renderer.setSize(rect.width,rect.height,false);
  camera.aspect=rect.width/rect.height;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize',resize);
resize();

function animate(now){
  const dt=Math.min(.033,(now-lastTime)/1000||0);
  lastTime=now;
  state.invulnerable=Math.max(0,state.invulnerable-dt);
  for(let i=0;i<state.cooldowns.length;i++)state.cooldowns[i]=Math.max(0,state.cooldowns[i]-dt);
  $$('.cooldown').forEach((el,i)=>{
    const cd=state.cooldowns[i]||0;
    el.style.setProperty('--cooldown',cd>0?`${Math.min(100,cd/([.55,7,9,16][i])*100)}%`:'0%');
  });
  manaRegen+=dt;
  if(manaRegen>.8){state.mana=Math.min(state.maxMana,state.mana+1);manaRegen=0;refreshHud();}

  if(state.started){
    let x=(state.keys.d||state.keys.arrowright?1:0)-(state.keys.a||state.keys.arrowleft?1:0)+state.stick.x;
    let z=(state.keys.s||state.keys.arrowdown?1:0)-(state.keys.w||state.keys.arrowup?1:0)+state.stick.z;
    const len=Math.hypot(x,z);
    if(len>1){x/=len;z/=len;}
    if(len>.05){
      player.position.x+=x*5.2*dt;
      player.position.z+=z*5.2*dt;
      player.position.x=THREE.MathUtils.clamp(player.position.x,-46,46);
      player.position.z=THREE.MathUtils.clamp(player.position.z,-68,38);
      heroBody.rotation.y=Math.atan2(x,z);
      heroBody.position.y=Math.abs(Math.sin(now*.012))*0.035;
    }
    const target=new THREE.Vector3(player.position.x+5.3,7.3,player.position.z+9.4);
    camera.position.lerp(target,1-Math.exp(-dt*3.1));
    camera.lookAt(player.position.x,0,player.position.z-1.6);
  }else{
    camera.position.lerp(new THREE.Vector3(5.3,7.3,13.4),1-Math.exp(-dt*2));
    camera.lookAt(0,0,-1);
  }

  updateEnemies(dt);
  updateInteraction();
  altarRune.rotation.y+=dt*.28;
  altarRune.position.y=1.25+Math.sin(now*.0018)*.12;
  wings.forEach((wing,i)=>{wing.rotation.z=(i?-.08:.08)+Math.sin(now*.002+i)*.025;});
  fireLight.intensity=34+Math.sin(now*.005)*5;

  if(state.storyChoice==='seal'&&state.storyStage===2){
    dtStoryHeal=dt*1.5;
    updateStoryConsequences();
  }
  if(state.storyChoice==='claim'&&state.storyStage===2&&Math.random()<dt*.015){
    state.shards++;
    refreshHud();
  }

  renderer.render(scene,camera);
  requestAnimationFrame(animate);
}

// Initial camera and faction setup.
camera.position.set(5.3,7.3,13.4);
camera.lookAt(0,0,-1);
refreshHud();
requestAnimationFrame(animate);
