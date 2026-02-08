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

let achievements = JSON.parse(localStorage.getItem("achievements")) || {};
let hitWall = false;

const TILE = 40;
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let gridX, gridY, dir;
let score = 0, level = 0;
let interpreter, running = false;

/* ================== GAME ENGINE ================== */

function unlockBadge(id, title, emoji){
  if(achievements[id]) return;

  achievements[id] = true;
  localStorage.setItem("achievements", JSON.stringify(achievements));

  showModal(`${emoji} Achievement!`, `Kamu mendapatkan <b>${title}</b>`);
}

function reset(){
  gridX=1; gridY=1; dir=0; score=0;
  updateUI(); draw();
}

function nextLevel(){
  unlockBadge("first_win","First Win","🏁");

  if(!hitWall) unlockBadge("perfect","Perfect Run","⚡");

  const speed = +document.getElementById("speed").value;
  if(speed >= 15) unlockBadge("speed","Speed Runner","🚀");

  showModal("🎉 Level Selesai!", "Lanjut ke level berikutnya 🚀");

  level++;
  hitWall=false;
  document.getElementById("level").innerText=level+1;
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
    hitWall = true;
    showModal("🚧 Oops!", "Robot menabrak tembok!");
    throw "wall";
  }

  gridX=nx; gridY=ny; score+=10;
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
  const code=Blockly.JavaScript.workspaceToCode(workspace);
  interpreter=new Interpreter(code,initInterpreter);
  running=true; loop();
}

function loop(){
  if(!running) return;
  const speed=+document.getElementById("speed").value;
  try{
    for(let i=0;i<speed;i++){
      if(!interpreter.step()){running=false;return;}
    }
  }catch(e){ alert(e); running=false; }
  requestAnimationFrame(loop);
}

function pause(){ running=false; }
function stepOnce(){ interpreter?.step(); }

const scoreEl = document.getElementById("score");
reset();

function showModal(title, body){
  modalTitle.innerHTML = title;
  modalBody.innerHTML = body;
  modal.classList.remove("hidden");
}

function closeModal(){
  modal.classList.add("hidden");
}

const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");

