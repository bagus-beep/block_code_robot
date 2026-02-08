/* =========================================================
   CONFIG & STORAGE
========================================================= */
const STORAGE_PROFILE = "robot_maze_profile";
const STORAGE_PLAYER = "robot_maze_player";
const API_LEADERBOARD = "/api/leaderboard";

/* =========================================================
   PLAYER MODAL (FIRST LOAD)
========================================================= */
const modal = document.getElementById("playerModal");
const modalName = document.getElementById("playerModalName");
const modalAvatar = document.getElementById("avatarModalPreview");
const modalUpload = document.getElementById("avatarModalUpload");

const headerName = document.getElementById("playerNameHeader");
const headerAvatar = document.getElementById("playerAvatarHeader");

function loadPlayer() {
  return JSON.parse(localStorage.getItem(STORAGE_PLAYER)) || {
    name: "",
    avatar: "avatar.png"
  };
}

function savePlayer(player) {
  localStorage.setItem(STORAGE_PLAYER, JSON.stringify(player));
}

function startGame() {
  const name = modalName.value.trim();
  if (!name) return alert("Masukkan nama pemain!");

  const player = {
    name,
    avatar: modalAvatar.src
  };

  savePlayer(player);
  applyPlayer(player);
  modal.classList.add("hidden");
}

function applyPlayer(player) {
  headerName.textContent = player.name;
  headerAvatar.src = player.avatar;
}

modalUpload.addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => modalAvatar.src = reader.result;
  reader.readAsDataURL(file);
});

window.addEventListener("load", () => {
  const player = loadPlayer();
  if (player.name) {
    applyPlayer(player);
    modal.classList.add("hidden");
  }
});

/* =========================================================
   PROFILE & BADGES
========================================================= */
const profile = JSON.parse(localStorage.getItem(STORAGE_PROFILE)) || {
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
  localStorage.setItem(STORAGE_PROFILE, JSON.stringify(profile));
}

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

function renderBadges() {
  const el = document.getElementById("badges");
  if (!el) return;
  el.innerHTML = profile.badges.map(
    b => `<span class="badge">${BADGES[b].icon}</span>`
  ).join("");
}

/* =========================================================
   MAZE & CANVAS
========================================================= */
const TILE = 40;
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

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

let gridX, gridY, dir;
let score = 0;
let level = 0;
let hitWall = false;

/* =========================================================
   GAME ENGINE
========================================================= */
function reset() {
  gridX = 1;
  gridY = 1;
  dir = 0;
  score = 0;
  hitWall = false;
  updateUI();
  draw();
}

function draw() {
  ctx.clearRect(0,0,400,400);
  const maze = levels[level];

  maze.forEach((row,y)=>{
    row.forEach((cell,x)=>{
      if(cell === 1){
        ctx.fillStyle = "#374151";
        ctx.fillRect(x*TILE,y*TILE,TILE,TILE);
      }
      if(cell === 2){
        ctx.fillStyle = "#22c55e";
        ctx.fillRect(x*TILE,y*TILE,TILE,TILE);
      }
    });
  });

  ctx.save();
  ctx.translate(gridX*TILE+20, gridY*TILE+20);
  ctx.rotate(dir * Math.PI / 180);
  ctx.fillStyle="#2563eb";
  ctx.beginPath();
  ctx.moveTo(15,0);
  ctx.lineTo(-10,-10);
  ctx.lineTo(-10,10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function moveForward() {
  const dx=[1,0,-1,0], dy=[0,1,0,-1];
  const nx = gridX + dx[dir/90];
  const ny = gridY + dy[dir/90];
  const tile = levels[level][ny][nx];

  if(tile === 1){
    hitWall = true;
    profile.stats.crashes++;
    if(profile.stats.crashes >= 3) unlockBadge("WALL_HIT");
    saveProfile();
    showToast("🚧 Oops!", "Robot menabrak tembok!", "error");
    throw new Error("wall");
  }

  gridX = nx;
  gridY = ny;
  score += 10;
  profile.score += 10;

  if(tile === 2) nextLevel();

  updateUI();
  draw();
}

function turnLeft(){ dir = (dir + 270) % 360; draw(); }
function turnRight(){ dir = (dir + 90) % 360; draw(); }

function nextLevel(){
  unlockBadge("LEVEL_CLEAR");

  if(!hitWall){
    profile.stats.perfectRuns++;
    unlockBadge("PERFECT");
  }

  const speed = +document.getElementById("speed").value;
  if(speed >= 15) unlockBadge("SPEED");

  profile.level++;
  saveProfile();
  submitLeaderboard();
  showToast("🎉 Level Selesai!", "Naik ke level berikutnya 🚀", "success");
  reset();
}

/* =========================================================
   UI & TOAST
========================================================= */
const scoreEl = document.getElementById("score");

function updateUI() {
  scoreEl.textContent = score;
}

const toast = document.getElementById("gameToast");
const toastBox = document.getElementById("gameToastBox");
const toastTitle = document.getElementById("gameToastTitle");
const toastBody = document.getElementById("gameToastBody");

let toastTimer;

function showToast(title, message, type="info"){
  positionToast();

  toastBox.className =
    "rounded-lg shadow-xl p-4 text-sm border-l-4 animate-slide " +
    (type==="error" ? "bg-red-50 border-red-500"
      : type==="success" ? "bg-green-50 border-green-500"
      : "bg-blue-50 border-blue-500");

  toastTitle.innerHTML = title;
  toastBody.innerHTML = message;

  toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>toast.classList.add("hidden"),2200);
}

function positionToast(){
  const game = document.getElementById("gameArea");
  const rect = game.getBoundingClientRect();
  toast.style.top = rect.top + window.scrollY + 12 + "px";
  toast.style.left = rect.left + window.scrollX + 12 + "px";
}

/* =========================================================
   BLOCKLY & INTERPRETER
========================================================= */
Blockly.JavaScript.forBlock['start']=()=>``;
Blockly.JavaScript.forBlock['move_forward']=()=>`moveForward();\n`;
Blockly.JavaScript.forBlock['turn_left']=()=>`turnLeft();\n`;
Blockly.JavaScript.forBlock['turn_right']=()=>`turnRight();\n`;

const workspace = Blockly.inject("blocklyDiv", {
  toolbox: document.getElementById("toolbox")
});

function initInterpreter(i,g){
  i.setProperty(g,'moveForward',i.createNativeFunction(moveForward));
  i.setProperty(g,'turnLeft',i.createNativeFunction(turnLeft));
  i.setProperty(g,'turnRight',i.createNativeFunction(turnRight));
}

let interpreter, running=false;

function run(){
  reset();
  const code = Blockly.JavaScript.workspaceToCode(workspace);

  profile.stats.runs++;
  unlockBadge("FIRST_RUN");

  if(code.includes("for") || code.includes("repeat")){
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
  const speed = +document.getElementById("speed").value;
  try{
    for(let i=0;i<speed;i++){
      if(!interpreter.step()){ running=false; return; }
    }
  }catch{
    running=false;
  }
  requestAnimationFrame(loop);
}

function pause(){ running=false; }
function stepOnce(){ interpreter?.step(); }

/* =========================================================
   LEADERBOARD
========================================================= */
async function submitLeaderboard(){
  const player = loadPlayer();
  try{
    await fetch(API_LEADERBOARD,{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({
        name: player.name,
        avatar: player.avatar,
        score: profile.score,
        level: profile.level,
        badges: profile.badges.length
      })
    });
  }catch{
    console.warn("Offline mode");
  }
}

/* =========================================================
   INIT
========================================================= */
renderBadges();
reset();
