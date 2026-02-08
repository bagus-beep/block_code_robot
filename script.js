/* =========================================================
   CONFIG & STORAGE
========================================================= */
const STORAGE_PROFILE = "robot_maze_profile";
const STORAGE_PLAYER  = "robot_maze_player";
const API_LEADERBOARD = "/api/leaderboard";

/* =========================================================
   PLAYER MODAL
========================================================= */
const modal        = document.getElementById("playerModal");
const modalName    = document.getElementById("playerModalName");
const modalAvatar  = document.getElementById("avatarModalPreview");
const modalUpload  = document.getElementById("avatarModalUpload");

const headerName   = document.getElementById("playerNameHeader");
const headerAvatar = document.getElementById("playerAvatarHeader");

function loadPlayer(){
  return JSON.parse(localStorage.getItem(STORAGE_PLAYER)) || {
    name: "",
    avatar: "icon-192.png"
  };
}

function savePlayer(player){
  localStorage.setItem(STORAGE_PLAYER, JSON.stringify(player));
}

function applyPlayer(player){
  headerName.textContent = player.name;
  headerAvatar.src = player.avatar;
}

function startGame(){
  const name = modalName.value.trim();
  if(!name) return alert("Masukkan nama pemain!");
  const player = { name, avatar: modalAvatar.src };
  savePlayer(player);
  applyPlayer(player);
  modal.classList.add("hidden");
}

modalUpload.addEventListener("change", e=>{
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=> modalAvatar.src = reader.result;
  reader.readAsDataURL(file);
});

function initPlayer(){
  const player = loadPlayer();
  if(player.name){
    applyPlayer(player);
    modal.classList.add("hidden");
  }else{
    modal.classList.remove("hidden");
  }
}

window.addEventListener("DOMContentLoaded", initPlayer);

/* =========================================================
   PROFILE & BADGES
========================================================= */
const profile = JSON.parse(localStorage.getItem(STORAGE_PROFILE)) || {
  score:0, level:1, badges:[],
  stats:{ runs:0, crashes:0, loopsUsed:0, perfectRuns:0 }
};

function saveProfile(){
  localStorage.setItem(STORAGE_PROFILE, JSON.stringify(profile));
}

const BADGES = {
  FIRST_RUN:{icon:"🚀",name:"First Move"},
  WALL_HIT:{icon:"🧱",name:"Wall Breaker"},
  LOOP_MASTER:{icon:"🧠",name:"Loop Master"},
  LEVEL_CLEAR:{icon:"🏁",name:"Level Clear"},
  PERFECT:{icon:"💯",name:"Perfect Run"},
  SPEED:{icon:"⚡",name:"Speed Runner"}
};

function unlockBadge(key){
  if(profile.badges.includes(key)) return;
  profile.badges.push(key);
  saveProfile();
  showToast("🏆 Achievement!", `${BADGES[key].icon} ${BADGES[key].name}`);
  renderBadges();
}

function renderBadges(){
  const el=document.getElementById("badges");
  if(!el) return;
  el.innerHTML = profile.badges
    .map(b=>`<span class="badge">${BADGES[b].icon}</span>`).join("");
}

/* =========================================================
   MAZE GENERATOR
========================================================= */
const MAX_LEVEL = 10;
const MAZE_SIZE = 10;

function generateMaze(level){
  const maze = Array.from({length: MAZE_SIZE}, (_, y) =>
    Array.from({length: MAZE_SIZE}, (_, x) =>
      (x === 0 || y === 0 || x === MAZE_SIZE - 1 || y === MAZE_SIZE - 1) ? 1 : 0
    )
  );

  const wallCount = 12 + level * 4;

  for(let i=0;i<wallCount;i++){
    const x = 1 + Math.floor(Math.random() * (MAZE_SIZE - 2));
    const y = 1 + Math.floor(Math.random() * (MAZE_SIZE - 2));
    if(x !== 1 || y !== 1) maze[y][x] = 1;
  }

  let fx, fy;
  do{
    fx = 1 + Math.floor(Math.random() * (MAZE_SIZE - 2));
    fy = 1 + Math.floor(Math.random() * (MAZE_SIZE - 2));
  } while (
    maze[fy][fx] === 1 ||
    (fx === 1 && fy === 1)
  );

  for(let x = 1; x <= fx; x++) maze[1][x] = 0;
  for(let y = 1; y <= fy; y++) maze[y][fx] = 0;

  maze[fy][fx] = 2;

  return maze;
}

/* =========================================================
   CANVAS & GAME STATE
========================================================= */
const TILE=40;
const canvas=document.getElementById("canvas");
const ctx=canvas.getContext("2d");

let levels=[];
let gridX,gridY,dir,score=0,level=0,hitWall=false;

function initLevels(){
  levels=[];
  for(let i=0;i<MAX_LEVEL;i++) levels.push(generateMaze(i+1));
}

function reset(){
  gridX=1; gridY=1; dir=0; hitWall=false;
  updateUI(); draw();
}

function draw(){
  if(!levels[level]) return;
  ctx.clearRect(0,0,400,400);
  const maze=levels[level];

  maze.forEach((r,y)=>r.forEach((c,x)=>{
    if(c===1){ctx.fillStyle="#374151";ctx.fillRect(x*TILE,y*TILE,TILE,TILE);}
    if(c===2){ctx.fillStyle="#22c55e";ctx.fillRect(x*TILE,y*TILE,TILE,TILE);}
  }));

  ctx.save();
  ctx.translate(gridX*TILE+20,gridY*TILE+20);
  ctx.rotate(dir*Math.PI/180);
  ctx.fillStyle="#2563eb";
  ctx.beginPath();
  ctx.moveTo(15,0);ctx.lineTo(-10,-10);ctx.lineTo(-10,10);
  ctx.closePath();ctx.fill();
  ctx.restore();
}

function resetGame(){
  running = false;
  score = 0;
  level = 0;
  profile.level = 1;
  profile.score = 0;
  saveProfile();

  initLevels();
  reset();

  document.getElementById("resetBtn")?.classList.add("hidden");
  showToast("🔄 Reset","Game dimulai ulang","success");
}

/* =========================================================
   ROBOT ACTIONS
========================================================= */
function moveForward(){
  const dx=[1,0,-1,0],dy=[0,1,0,-1];
  const nx=gridX+dx[dir/90], ny=gridY+dy[dir/90];
  const tile=levels[level][ny][nx];

  if(tile===1){
    hitWall=true; profile.stats.crashes++;
    if(profile.stats.crashes>=3) unlockBadge("WALL_HIT");
    saveProfile(); showToast("🚧 Oops!","Robot menabrak tembok!","error");
    throw new Error("wall");
  }

  gridX=nx; gridY=ny;
  score+=10; profile.score+=10;

  if(tile===2) nextLevel();
  updateUI(); draw();
}

function turnLeft(){dir=(dir+270)%360;draw();}
function turnRight(){dir=(dir+90)%360;draw();}

/* =========================================================
   LEVEL FLOW
========================================================= */
function nextLevel(){
   unlockBadge("LEVEL_CLEAR");

   if(!hitWall){
      profile.stats.perfectRuns++;
      unlockBadge("PERFECT");
   }

   if(+document.getElementById("speed").value>=15)
      unlockBadge("SPEED");

   profile.level++;
   saveProfile();
   level++;
   
   if(level >= MAX_LEVEL){
     updateUI(); // pastikan UI benar (Level 10)
     showToast("🏆 Tamat!","Semua level selesai!","success");
     running = false;
   
     document.getElementById("resetBtn")?.classList.remove("hidden");
     launchConfetti(); // 🎉
     return;
   }

   showToast("🎉 Level Up!",`Masuk Level ${level+1}`,"success");
   reset();
}

/* =========================================================
   UI & TOAST
========================================================= */
const scoreEl=document.getElementById("score");
const levelEl = document.getElementById("level");

function updateUI(){
  scoreEl.textContent = score;

  if(levelEl){
    const displayLevel = Math.min(level + 1, MAX_LEVEL);
    levelEl.textContent = displayLevel;
  }
}

function launchConfetti(){
  const duration = 2000;
  const end = Date.now() + duration;

  (function frame(){
    confetti({
      particleCount: 6,
      angle: 60,
      spread: 70,
      origin: { x: 0 }
    });
    confetti({
      particleCount: 6,
      angle: 120,
      spread: 70,
      origin: { x: 1 }
    });

    if(Date.now() < end){
      requestAnimationFrame(frame);
    }
  })();
}

const toast=document.getElementById("gameToast");
const toastBox=document.getElementById("gameToastBox");
const toastTitle=document.getElementById("gameToastTitle");
const toastBody=document.getElementById("gameToastBody");
let toastTimer;

function showToast(title,msg,type="info"){
  const game=document.getElementById("gameArea").getBoundingClientRect();
  toast.style.top=game.top+window.scrollY+12+"px";
  toast.style.left=game.left+window.scrollX+12+"px";
  toastBox.className="rounded-lg shadow-xl p-4 border-l-4 animate-slide "+
    (type==="error"?"bg-red-50 border-red-500":
     type==="success"?"bg-green-50 border-green-500":
     "bg-blue-50 border-blue-500");
  toastTitle.innerHTML=title;
  toastBody.innerHTML=msg;
  toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>toast.classList.add("hidden"),2200);
}

/* =========================================================
   BLOCKLY
========================================================= */
let workspace;
window.addEventListener("DOMContentLoaded",()=>{
  Blockly.Blocks['start']={init(){
    this.appendDummyInput().appendField("▶ mulai");
    this.setNextStatement(true);this.setColour(20);
  }};
  Blockly.Blocks['move_forward']={init(){
    this.appendDummyInput().appendField("maju");
    this.setPreviousStatement(true);this.setNextStatement(true);this.setColour(210);
  }};
  Blockly.Blocks['turn_left']={init(){
    this.appendDummyInput().appendField("belok kiri");
    this.setPreviousStatement(true);this.setNextStatement(true);this.setColour(210);
  }};
  Blockly.Blocks['turn_right']={init(){
    this.appendDummyInput().appendField("belok kanan");
    this.setPreviousStatement(true);this.setNextStatement(true);this.setColour(210);
  }};

  Blockly.JavaScript.forBlock['start']=()=>``;
  Blockly.JavaScript.forBlock['move_forward']=()=>`moveForward();\n`;
  Blockly.JavaScript.forBlock['turn_left']=()=>`turnLeft();\n`;
  Blockly.JavaScript.forBlock['turn_right']=()=>`turnRight();\n`;

  workspace=Blockly.inject("blocklyDiv",{
    toolbox:document.getElementById("toolbox"),
    trashcan:true,scrollbars:true
  });
});

/* =========================================================
   RUN ENGINE
========================================================= */
let interpreter,running=false;

function hasStartBlock(){
  return workspace.getTopBlocks(false).some(b=>b.type==="start");
}

function run(){
  const player=loadPlayer();
  if(!player.name){
    modal.classList.remove("hidden");
    showToast("👤","Isi nama pemain dulu","error");
    return;
  }
  if(!hasStartBlock()){
    showToast("❗ Error","Program harus diawali ▶ mulai","error");
    return;
  }

  level=Math.max(0,profile.level-1);
  reset();

  const code=Blockly.JavaScript.workspaceToCode(workspace);
  profile.stats.runs++;
  unlockBadge("FIRST_RUN");
  if(code.includes("for")) unlockBadge("LOOP_MASTER");
  saveProfile();

  interpreter=new Interpreter(code,(i,g)=>{
    i.setProperty(g,'moveForward',i.createNativeFunction(moveForward));
    i.setProperty(g,'turnLeft',i.createNativeFunction(turnLeft));
    i.setProperty(g,'turnRight',i.createNativeFunction(turnRight));
  });

  running=true;
  loop();
}

function loop(){
  if(!running) return;
  try{
    for(let i=0;i<+document.getElementById("speed").value;i++)
      if(!interpreter.step()){running=false;return;}
  }catch{running=false;}
  requestAnimationFrame(loop);
}

function pause(){running=false;}
function stepOnce(){interpreter?.step();}

/* =========================================================
   INIT
========================================================= */
renderBadges();
initLevels();
level=Math.max(0,profile.level-1);
reset();



