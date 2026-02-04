/* ========= CONSTANTS ========= */
const suits = [
  {id:"S", symbol:"♠"},
  {id:"H", symbol:"♥"},
  {id:"D", symbol:"♦"},
  {id:"C", symbol:"♣"}
];
const ranks = [
  {l:"A",v:1},{l:"2",v:2},{l:"3",v:3},{l:"4",v:4},{l:"5",v:5},{l:"6",v:6},
  {l:"7",v:7},{l:"8",v:8},{l:"9",v:9},{l:"10",v:10},{l:"J",v:11},{l:"Q",v:12},{l:"K",v:13}
];

/* ========= STATE ========= */
let gameState;
let history = [];
let moves = 0;
let timer = 0;
let timerId = null;

let cardImages = {};
let defaultImages = {};
let cardBackImage = null;

/* ========= TIMER ========= */
function startTimer() {
  if (timerId) return;
  timerId = setInterval(() => {
    timer++;
    const m = String(Math.floor(timer / 60)).padStart(2,"0");
    const s = String(timer % 60).padStart(2,"0");
    document.getElementById("timer").textContent = `${m}:${s}`;
  },1000);
}
function resetTimer() {
  clearInterval(timerId);
  timerId = null;
  timer = 0;
  document.getElementById("timer").textContent = "00:00";
}

/* ========= UTIL ========= */
function isRed(cardOrSuit) {
  if (!cardOrSuit) return false;
  let suit;
  if (typeof cardOrSuit === "string") suit = cardOrSuit;
  else if (cardOrSuit.suit) suit = cardOrSuit.suit;
  else if (cardOrSuit.id) suit = cardOrSuit.id;
  return suit === "H" || suit === "D";
}
function saveState() {
  history.push(JSON.parse(JSON.stringify(gameState)));
}

/* ========= IMAGE GENERATION ========= */
function generateDefaultCard(rank,suitObj){
  const c = document.createElement("canvas");
  c.width = 180; c.height = 260;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "white"; ctx.fillRect(0,0,c.width,c.height);
  ctx.strokeRect(0,0,c.width,c.height);
  ctx.fillStyle = isRed(suitObj) ? "red" : "black";
  ctx.font = "36px sans-serif";
  ctx.fillText(rank+suitObj.symbol,10,40);
  return c.toDataURL();
}
function generateCardBack(){
  const c = document.createElement("canvas");
  c.width = 180; c.height = 260;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#b00000";
  ctx.fillRect(0,0,c.width,c.height);
  return c.toDataURL();
}
cardBackImage = generateCardBack();

/* ========= GAME SETUP ========= */
function setupGame() {
  history = [];
  moves = 0;
  resetTimer();
  document.getElementById("moveCounter").textContent = `Moves: 0`;
  hideWinScreen();

  gameState = {
    stock: [],
    waste: [],
    tableau: [[],[],[],[],[],[],[]],
    foundations: [[],[],[],[]]
  };

  const deck = [];
  suits.forEach(s => {
    ranks.forEach(r => {
      const id = r.l + s.id;
      defaultImages[id] ??= generateDefaultCard(r.l,s);
      deck.push({id, suit: s.id, value: r.v, faceUp: false});
    });
  });

  deck.sort(() => Math.random()-0.5);

  for(let i=0;i<7;i++){
    for(let j=0;j<=i;j++){
      const c = deck.pop();
      c.faceUp = j===i;
      gameState.tableau[i].push(c);
    }
  }
  gameState.stock = deck;
  render();
}

/* ========= RULES ========= */
function canToTableau(c,p){
  if(!p.length) return c.value===13;
  const t = p.at(-1);
  return t.faceUp && isRed(c)!==isRed(t) && c.value===t.value-1;
}
function canToFoundation(c,p){
  if(!p.length) return c.value===1;
  const t = p.at(-1);
  return t.suit === c.suit && c.value === t.value+1;
}

/* ========= RENDER ========= */
function imgFor(c){
  return c.faceUp ? (cardImages[c.id]||defaultImages[c.id]) : cardBackImage;
}

function renderPile(pile,el,isFoundation){
  el.innerHTML = "";
  pile.forEach((c,i)=>{
    const img = document.createElement("img");
    img.className = "card";
    img.src = imgFor(c);
    img.style.top = isFoundation ? "0px" : `${i*20}px`;
    img.onclick = () => autoMove(c,pile);
    el.appendChild(img);
  });
}

function render() {
  const stock = document.getElementById("stock");
  stock.innerHTML = "";
  if(gameState.stock.length){
    const img = document.createElement("img");
    img.className = "card";
    img.src = cardBackImage;
    stock.appendChild(img);
  }

  const waste = document.getElementById("activeStock");
  waste.innerHTML = "";
  if(gameState.waste.length){
    const top = gameState.waste.at(-1);
    const img = document.createElement("img");
    img.className = "card";
    img.src = imgFor(top);
    img.onclick = () => autoMove(top,"waste");
    waste.appendChild(img);
  }

  document.querySelectorAll(".foundation").forEach((el,i)=>{
    renderPile(gameState.foundations[i],el,true);
  });
  document.querySelectorAll(".tableau").forEach((el,i)=>{
    renderPile(gameState.tableau[i],el,false);
  });

  checkWin();
}

/* ========= MOVES ========= */
function autoMove(card,from){
  if(!card.faceUp) return;
  startTimer();
  saveState();

  let source, stack;
  if(from==="waste"){
    source = gameState.waste;
    stack = [card];
  } else {
    source = from;
    stack = from.slice(from.indexOf(card));
  }

  if(stack.length===1){
    for(const f of gameState.foundations){
      if(canToFoundation(card,f)){
        source.splice(source.indexOf(card),1);
        f.push(card);
        finishMove(source);
        return;
      }
    }
  }

  for(const t of gameState.tableau){
    if(canToTableau(stack[0],t)){
      source.splice(source.indexOf(stack[0]),stack.length);
      t.push(...stack);
      finishMove(source);
      return;
    }
  }

  history.pop(); 
}

function finishMove(source){
  if(source.length && !source.at(-1).faceUp) source.at(-1).faceUp = true;
  moves++;
  document.getElementById("moveCounter").textContent = `Moves: ${moves}`;
  render();
}

/* ========= STOCK/WASTE ========= */
document.getElementById("stock").onclick = () => {
  startTimer();
  saveState();
  moves++;
  document.getElementById("moveCounter").textContent = `Moves: ${moves}`;

  if(gameState.stock.length){
    const c = gameState.stock.pop();
    c.faceUp = true;
    gameState.waste.push(c);
  } else {
    gameState.stock = gameState.waste.reverse().map(c=>({...c, faceUp:false}));
    gameState.waste = [];
  }
  render();
};

/* ========= UNDO ========= */
document.getElementById("undoMove").onclick = () => {
  if(!history.length) return;
  gameState = history.pop();
  moves++;
  document.getElementById("moveCounter").textContent = `Moves: ${moves}`;
  render();
};

/* ========= SETTINGS ========= */
document.getElementById("openSettings").onclick = () => {
  document.getElementById("settings").classList.remove("hidden");
  openEditor();
};
document.getElementById("closeSettings").onclick = () => {
  document.getElementById("settings").classList.add("hidden");
};

/* ========= CARD EDITOR ========= */
function openEditor(){
  const editor = document.getElementById("card-editor");
  editor.innerHTML = "";

  document.getElementById("cardBackPreview").src = cardBackImage;
  document.getElementById("cardBackPreview").onclick = () => {
    document.getElementById("backUpload").click();
  };
  document.getElementById("backUpload").onchange = e => {
    const f = e.target.files[0];
    if(!f) return;
    cardBackImage = URL.createObjectURL(f);
    document.getElementById("cardBackPreview").src = cardBackImage;
    render();
  };

  suits.forEach(s => {
    const sec = document.createElement("div");
    sec.className = "suit-section";
    sec.innerHTML = `<div class="suit-header">${s.symbol}</div>`;
    const grid = document.createElement("div");
    grid.className = "card-grid";

    ranks.forEach(r => {
      const id = r.l+s.id;
      const img = document.createElement("img");
      img.src = cardImages[id]||defaultImages[id];
      img.onclick = () => {
        const inp = document.createElement("input");
        inp.type="file"; inp.accept="image/*";
        inp.onchange = e => {
          const f = e.target.files[0];
          if(!f) return;
          cardImages[id] = URL.createObjectURL(f);
          img.src = cardImages[id];
          render();
        };
        inp.click();
      };
      grid.appendChild(img);
    });

    sec.appendChild(grid);
    editor.appendChild(sec);
  });
}

/* ========= IMPORT / EXPORT ========= */
document.getElementById("exportDeck").onclick = () => {
  const blob = new Blob([JSON.stringify({cardImages,cardBackImage})],{type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "solitaire-deck.json";
  a.click();
};

document.getElementById("importDeckInput").onchange = e => {
  const r = new FileReader();
  r.onload = ev => {
    const d = JSON.parse(ev.target.result);
    cardImages = d.cardImages||{};
    cardBackImage = d.cardBackImage||cardBackImage;
    render();
  };
  r.readAsText(e.target.files[0]);
};

/* ========= WIN SCREEN ========= */
function checkWin(){
  const allCards = gameState.foundations.flat();
  if(allCards.length===52){
    showWinScreen();
  }
}
function showWinScreen(){
  let winScreen = document.getElementById("winScreen");
  if(!winScreen){
    winScreen = document.createElement("div");
    winScreen.id = "winScreen";
    winScreen.className = "settings-panel";
    winScreen.innerHTML = `
      <h2>You Win!</h2>
      <p>Time: <span id="winTime">00:00</span></p>
      <p>Moves: <span id="winMoves">0</span></p>
      <button id="winNewGame">New Game</button>
    `;
    document.body.appendChild(winScreen);
    document.getElementById("winNewGame").onclick = () => {
      winScreen.classList.add("hidden");
      setupGame();
    };
  }
  document.getElementById("winTime").textContent = document.getElementById("timer").textContent;
  document.getElementById("winMoves").textContent = moves;
  winScreen.classList.remove("hidden");
}
function hideWinScreen(){
  const winScreen = document.getElementById("winScreen");
  if(winScreen) winScreen.classList.add("hidden");
}

/* ========= START GAME ========= */
setupGame();
document.getElementById("newGame").onclick = () => setupGame();
