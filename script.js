/* ================== CONFIG ================== */
const STORAGE_KEY = "robot_maze_profile";
const API_LEADERBOARD = "/api/leaderboard";

/* ================== PROFILE ================== */
const profile = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
  score: 0,
  level: 1,
  badges: [],
  stats: {
    runs: 0,
    crashes: 0,
    loopsUsed: 0,
    perfectRuns: 0
  }
};

function saveProfile() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

/* ================== BADGES ================== */
const BADGES = {
  FIRST_RUN: { icon: "🚀", name: "First Move" },
  WALL_HIT: { icon: "🧱", name: "Wall Breaker" },
  LOOP_MASTER: { icon: "🧠", name: "Loop Master" },
  LEVEL_CLEAR: { icon: "🏁", name: "Level Clear" },
  PERFECT: { icon: "💯", name: "Perfect Run" },
  SPEED: { icon: "⚡", name: "Speed Runner" }
};

function unlockBadge(key) {
  if (profile.badges.includes(key)) return;
  profile.badges.push(key);
  saveProfile();
  showToast("🏆 Achievement!", `${BADGES[key].icon} ${BADGES[key].name}`);
  renderBadges();
}

/* ================== MAZE DATA ================== */
const levels = [
  [
    [1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,2,1],
    [1,0,1,1,1,0,1,0,0,1],
    [1,0,0,0,1,0,1,1,0,1],
    [1,1,1,0,1,0,0,0,0,1],
    [1,0,0,0,0,0,1,1,0,1],
    [1,0,1,1,1,0,0,0,0,1],
    [1,0,0,0,1,0,1,1,0,1],
    [1,0,1,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1]
  ]
];

/* ================== CANVAS ================== */
const TILE = 40;
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let gridX, gridY, dir;
let score = 0, level = 0;
let interpreter, running = false;
let hitWall = false;

/* ================== GAME ENGINE ================== */
function reset(){
  gridX=1; gridY=1; dir=0;
  score=0; hitWall=false;
  updateUI(); draw();
}

function nextLevel(){
  unlockBadge("LEVEL_CLEAR");

  if (!hitWall) {
    profile.stats.perfectRuns++;
    unlockBadge("PERFECT");
  }

  const speed = +document.getElementById("speed").value;
  if (speed >= 15) unlockBadge("SPEED");

  profile.level++;
  saveProfile();
  submitLeaderboard();

  showToast("🎉 Level Selesai!", "Naik ke level berikutnya 🚀");
  reset();
}

function draw(){
  ctx.clearRect(0,0,400,400);
  const maze = levels[level];

  maze.forEach((row,y)=>{
    row.forEach((cell,x)=>{
      if(cell===1){
        ctx.fillStyle="#374151";
        ctx.fillRect(x*TILE,y*TILE,TILE,TILE);
      }
      if(cell===2){
        ctx.fillStyle="#22c55e";
        ctx.fillRect(x*TILE,y*TILE,TILE,TILE);
      }
    });
  });

  ctx.save();
  ctx.translate(gridX*TILE+20,gridY*TILE+20);
  ctx.rotate(dir*Math.PI/180);
  ctx.fillStyle="#2563eb";
  ctx.beginPath();
  ctx.moveTo(15,0);
  ctx.lineTo(-10,-10);
  ctx.lineTo(-10,10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function moveForward(){
  const dx=[1,0,-1,0], dy=[0,1,0,-1];
  const nx=gridX+dx[dir/90], ny=gridY+dy[dir/90];
  const tile=levels[level][ny][nx];

  if(tile===1){
    score-=5;
    hitWall=true;
    profile.stats.crashes++;
    if (profile.stats.crashes >= 3) unlockBadge("WALL_HIT");
    saveProfile();
    // showToast("🚧 Oops!", "Robot menabrak tembok!");
    throw "wall";
  }

  gridX=nx; gridY=ny;
  score+=10;
  profile.score += 10;

  if(tile===2) nextLevel();

  updateUI(); draw();
}

function turnLeft(){ dir=(dir+270)%360; draw(); }
function turnRight(){ dir=(dir+90)%360; draw(); }

function updateUI(){
  scoreEl.textContent = score;
}

/* ================== BLOCKLY ================== */
Blockly.Blocks['start']={
  init(){
    this.appendDummyInput().appendField("▶ mulai");
    this.setNextStatement(true);
    this.setColour(20);
  }
};

Blockly.Blocks['move_forward']={
  init(){
    this.appendDummyInput().appendField("maju");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(160);
  }
};

Blockly.Blocks['turn_left']={
  init(){
    this.appendDummyInput().appendField("putar kiri");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(210);
  }
};

Blockly.Blocks['turn_right']={
  init(){
    this.appendDummyInput().appendField("putar kanan");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(210);
  }
};

Blockly.JavaScript.STATEMENT_PREFIX='highlight(%1);\n';
Blockly.JavaScript.addReservedWords('highlight');

Blockly.JavaScript.forBlock['start']=()=>``;
Blockly.JavaScript.forBlock['move_forward']=()=>`moveForward();\n`;
Blockly.JavaScript.forBlock['turn_left']=()=>`turnLeft();\n`;
Blockly.JavaScript.forBlock['turn_right']=()=>`turnRight();\n`;

const workspace = Blockly.inject('blocklyDiv',{
  toolbox: document.getElementById('toolbox')
});

/* ================== INTERPRETER ================== */
function initInterpreter(i,g){
  i.setProperty(g,'moveForward',i.createNativeFunction(moveForward));
  i.setProperty(g,'turnLeft',i.createNativeFunction(turnLeft));
  i.setProperty(g,'turnRight',i.createNativeFunction(turnRight));
  i.setProperty(g,'highlight',i.createNativeFunction(id=>workspace.highlightBlock(id)));
}

function run(){
  reset();
  const code = Blockly.JavaScript.workspaceToCode(workspace);

  profile.stats.runs++;
  unlockBadge("FIRST_RUN");

  if (code.includes("repeat") || code.includes("for")) {
    profile.stats.loopsUsed++;
    unlockBadge("LOOP_MASTER");
  }

  saveProfile();
  interpreter = new Interpreter(code, initInterpreter);
  running = true;
  loop();
}

function loop(){
  if(!running) return;
  const speed=+document.getElementById("speed").value;
  try{
    for(let i=0;i<speed;i++){
      if(!interpreter.step()){ running=false; return; }
    }
  }catch(e){ running=false; }
  requestAnimationFrame(loop);
}

function pause(){ running=false; }
function stepOnce(){ interpreter?.step(); }

/* ================== LEADERBOARD ================== */
async function submitLeaderboard(){
  try{
    await fetch(API_LEADERBOARD,{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({
        score: profile.score,
        level: profile.level,
        badges: profile.badges.length
      })
    });
  }catch(e){}
}

/* ================== UI ================== */
function renderBadges(){
  const el=document.getElementById("badges");
  if(!el) return;
  el.innerHTML = profile.badges
    .map(b=>`<span class="badge">${BADGES[b].icon}</span>`)
    .join("");
}

/* ================== INIT ================== */
const scoreEl=document.getElementById("score");
renderBadges();
reset();

/* ============== PLAYER PROFILE ============== */
const PLAYER_KEY = "robot_maze_player";

const player = JSON.parse(localStorage.getItem(PLAYER_KEY)) || {
  name: "Player",
  avatar: null
};

const nameInput = document.getElementById("playerName");
const avatarUpload = document.getElementById("avatarUpload");
const avatarPreview = document.getElementById("avatarPreview");

nameInput.value = player.name;
if (player.avatar) avatarPreview.src = player.avatar;

nameInput.addEventListener("input", () => {
  player.name = nameInput.value;
  savePlayer();
});

avatarUpload.addEventListener("change", e => {
  const file = e.target.files[0];
  const reader = new FileReader();
  reader.onload = () => {
    player.avatar = reader.result;
    avatarPreview.src = reader.result;
    savePlayer();
  };
  reader.readAsDataURL(file);
});

function savePlayer(){
  localStorage.setItem(PLAYER_KEY, JSON.stringify(player));
}

function renderLeaderboard(data) {
  const el = document.getElementById("leaderboard");
  if (!el) return;

  el.innerHTML = data.map((u,i)=>`
    <li class="flex items-center gap-3 bg-gray-100 rounded-lg p-2">
      <span class="font-bold w-6">#${i+1}</span>
      <img src="${u.avatar || 'avatar.png'}"
           class="w-8 h-8 rounded-full border">
      <div class="flex-1">
        <div class="font-semibold">${u.name || 'Player'}</div>
        <div class="text-xs text-gray-500">
          ⭐ ${u.score} | Lv ${u.level} | 🏆 ${u.badges}
        </div>
      </div>
    </li>
  `).join("");
}

async function submitLeaderboard() {
  try {
    await fetch(API_LEADERBOARD, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: player.name,
        avatar: player.avatar,
        score: profile.score,
        level: profile.level,
        badges: profile.badges.length
      })
    });
  } catch {
    console.warn("Offline mode");
  }
}

const toast = document.getElementById("gameToast");
const toastBox = document.getElementById("gameToastBox");
const toastTitle = document.getElementById("gameToastTitle");
const toastBody = document.getElementById("gameToastBody");

let toastTimer = null;

function showToast(title, message, type = "info") {
  positionToast();

  toastBox.className =
    "rounded-lg shadow-xl p-4 text-sm border-l-4 animate-slide " +
    (type === "error"
      ? "bg-red-50 border-red-500"
      : type === "success"
      ? "bg-green-50 border-green-500"
      : "bg-blue-50 border-blue-500");

  toastTitle.innerHTML = title;
  toastBody.innerHTML = message;

  toast.classList.remove("hidden");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.add("hidden");
  }, 2200);
}

function positionToast() {
  const game = document.getElementById("gameArea");
  const rect = game.getBoundingClientRect();

  toast.style.top = rect.top + window.scrollY + 12 + "px";
  toast.style.left = rect.left + window.scrollX + 12 + "px";
}

