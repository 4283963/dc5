const { MESSAGE_TYPES } = CONSTANTS;

let app = null;
let ws = null;
let playerId = null;
let worldWidth = 0;
let worldHeight = 0;

const players = new Map();
const bullets = new Map();
const monsters = new Map();

const keys = {
  up: false,
  down: false,
  left: false,
  right: false,
};

let lastInputState = null;
let mouseWorldX = 0;
let mouseWorldY = 0;

let gameContainer = null;
let playersLayer = null;
let bulletsLayer = null;
let monstersLayer = null;
let backgroundLayer = null;

let camera = { x: 0, y: 0 };

function initPixi() {
  app = new PIXI.Application({
    resizeTo: window,
    backgroundColor: 0x0f0f1a,
    antialias: false,
    pixelDensity: 1,
  });

  document.getElementById('game-container').appendChild(app.view);

  gameContainer = new PIXI.Container();
  app.stage.addChild(gameContainer);

  backgroundLayer = new PIXI.Container();
  bulletsLayer = new PIXI.Container();
  monstersLayer = new PIXI.Container();
  playersLayer = new PIXI.Container();

  gameContainer.addChild(backgroundLayer);
  gameContainer.addChild(bulletsLayer);
  gameContainer.addChild(monstersLayer);
  gameContainer.addChild(playersLayer);

  createBackground();

  app.ticker.add(() => {
    const dt = app.ticker.deltaTime / 60;
    updateCamera();
    sendInputIfChanged();
    updateMonsterParticles(dt);
    updateMonsterStatusVisuals();
  });

  window.addEventListener('resize', onResize);
}

function createBackground() {
  const tileSize = 64;
  const cols = Math.ceil(CONSTANTS.WORLD_WIDTH / tileSize);
  const rows = Math.ceil(CONSTANTS.WORLD_HEIGHT / tileSize);

  const graphics = new PIXI.Graphics();

  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      const isEven = (x + y) % 2 === 0;
      graphics.beginFill(isEven ? 0x1a1a2e : 0x16162a);
      graphics.drawRect(x * tileSize, y * tileSize, tileSize, tileSize);
      graphics.endFill();
    }
  }

  graphics.lineStyle(2, 0x4ade80, 1);
  graphics.drawRect(0, 0, CONSTANTS.WORLD_WIDTH, CONSTANTS.WORLD_HEIGHT);

  backgroundLayer.addChild(graphics);
}

function updateMonsterParticles(dt) {
  for (const monster of monsters.values()) {
    const hasBurning = monster.data.statuses && monster.data.statuses.some(s => s.type === 'burning');

    if (hasBurning) {
      monster._particleTimer += dt;
      const emitInterval = 0.08;
      while (monster._particleTimer >= emitInterval) {
        monster._particleTimer -= emitInterval;
        spawnBurnParticle(monster);
      }
    }

    for (let i = monster.particles.length - 1; i >= 0; i--) {
      const p = monster.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        monster.particleContainer.removeChild(p.sprite);
        monster.particles.splice(i, 1);
        continue;
      }
      p.sprite.x += p.vx * dt;
      p.sprite.y += p.vy * dt;
      p.sprite.alpha = p.life / p.maxLife;
      p.vy -= 40 * dt;
    }
  }
}

function spawnBurnParticle(monster) {
  const size = 3 + Math.random() * 3;
  const sprite = new PIXI.Graphics();
  sprite.beginFill(0xf97316);
  sprite.drawCircle(0, 0, size);
  sprite.endFill();
  sprite.x = (Math.random() - 0.5) * monster.data.size * 0.6;
  sprite.y = -monster.data.size / 2;
  monster.particleContainer.addChild(sprite);

  const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
  const speed = 30 + Math.random() * 40;

  monster.particles.push({
    sprite,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life: 0.6,
    maxLife: 0.6,
  });
}

function updateMonsterStatusVisuals() {
  for (const monster of monsters.values()) {
    const statuses = monster.data.statuses || [];
    const hasFrozen = statuses.some(s => s.type === 'frozen');
    const hasBurning = statuses.some(s => s.type === 'burning');

    monster.statusOverlay.clear();

    if (hasFrozen) {
      const s = monster.data.size;
      monster.statusOverlay.lineStyle(2, 0x60a5fa, 0.9);
      monster.statusOverlay.beginFill(0x60a5fa, 0.35);
      monster.statusOverlay.moveTo(0, -s / 2);
      monster.statusOverlay.lineTo(s / 2, s / 2);
      monster.statusOverlay.lineTo(-s / 2, s / 2);
      monster.statusOverlay.closePath();
      monster.statusOverlay.endFill();
    }

    if (hasBurning) {
      const pulse = 0.5 + Math.sin(Date.now() / 80) * 0.5;
      monster.statusOverlay.lineStyle(3, 0xf97316, pulse * 0.8);
      monster.statusOverlay.drawCircle(0, 0, monster.data.size / 2 + 5);
    }
  }
}

function updateCamera() {
  const player = players.get(playerId);
  if (!player) return;

  const targetX = player.sprite.x - app.screen.width / 2;
  const targetY = player.sprite.y - app.screen.height / 2;

  camera.x += (targetX - camera.x) * 0.1;
  camera.y += (targetY - camera.y) * 0.1;

  camera.x = Math.max(0, Math.min(CONSTANTS.WORLD_WIDTH - app.screen.width, camera.x));
  camera.y = Math.max(0, Math.min(CONSTANTS.WORLD_HEIGHT - app.screen.height, camera.y));

  gameContainer.x = -camera.x;
  gameContainer.y = -camera.y;
}

function onResize() {
  if (app) {
    app.resize();
  }
}

function createPlayerSprite(playerData) {
  const container = new PIXI.Container();

  const body = new PIXI.Graphics();
  body.beginFill(playerData.color);
  body.drawRect(-playerData.size / 2, -playerData.size / 2, playerData.size, playerData.size);
  body.endFill();

  const eyeOffset = playerData.size * 0.2;
  const eyeSize = playerData.size * 0.15;
  body.beginFill(0x000000);
  body.drawRect(-eyeOffset - eyeSize / 2, -playerData.size * 0.1, eyeSize, eyeSize * 1.5);
  body.drawRect(eyeOffset - eyeSize / 2, -playerData.size * 0.1, eyeSize, eyeSize * 1.5);
  body.endFill();

  container.addChild(body);

  const hpBarBg = new PIXI.Graphics();
  hpBarBg.beginFill(0x333333);
  hpBarBg.drawRect(-playerData.size / 2, -playerData.size / 2 - 10, playerData.size, 4);
  hpBarBg.endFill();
  container.addChild(hpBarBg);

  const hpBar = new PIXI.Graphics();
  hpBar.beginFill(0x4ade80);
  hpBar.drawRect(-playerData.size / 2, -playerData.size / 2 - 10, playerData.size, 4);
  hpBar.endFill();
  container.addChild(hpBar);

  if (playerData.name) {
    const text = new PIXI.Text(playerData.name, {
      fontSize: 12,
      fill: 0xffffff,
      align: 'center',
      stroke: 0x000000,
      strokeThickness: 2,
    });
    text.anchor.set(0.5);
    text.y = -playerData.size / 2 - 22;
    container.addChild(text);
  }

  container.x = playerData.x;
  container.y = playerData.y;

  return { container, hpBar, body, hpBarBg };
}

function createBulletSprite(bulletData) {
  const graphics = new PIXI.Graphics();
  graphics.beginFill(bulletData.color);
  graphics.drawCircle(0, 0, bulletData.size / 2);
  graphics.endFill();
  graphics.x = bulletData.x;
  graphics.y = bulletData.y;
  return graphics;
}

function createMonsterSprite(monsterData) {
  const container = new PIXI.Container();

  const body = new PIXI.Graphics();
  body.beginFill(monsterData.color);
  body.moveTo(0, -monsterData.size / 2);
  body.lineTo(monsterData.size / 2, monsterData.size / 2);
  body.lineTo(-monsterData.size / 2, monsterData.size / 2);
  body.closePath();
  body.endFill();
  container.addChild(body);

  const eyeSize = monsterData.size * 0.12;
  body.beginFill(0x000000);
  body.drawCircle(-monsterData.size * 0.15, 0, eyeSize);
  body.drawCircle(monsterData.size * 0.15, 0, eyeSize);
  body.endFill();

  const hpBarBg = new PIXI.Graphics();
  hpBarBg.beginFill(0x333333);
  hpBarBg.drawRect(-monsterData.size / 2, -monsterData.size / 2 - 8, monsterData.size, 3);
  hpBarBg.endFill();
  container.addChild(hpBarBg);

  const hpBar = new PIXI.Graphics();
  hpBar.beginFill(0xef4444);
  hpBar.drawRect(-monsterData.size / 2, -monsterData.size / 2 - 8, monsterData.size, 3);
  hpBar.endFill();
  container.addChild(hpBar);

  const statusOverlay = new PIXI.Graphics();
  container.addChild(statusOverlay);

  const particleContainer = new PIXI.Container();
  container.addChild(particleContainer);

  container.x = monsterData.x;
  container.y = monsterData.y;

  return {
    container,
    hpBar,
    body,
    statusOverlay,
    particleContainer,
    particles: [],
    statuses: [],
    _particleTimer: 0,
    _baseColor: monsterData.color,
  };
}

function updateGameState(state) {
  worldWidth = state.worldWidth;
  worldHeight = state.worldHeight;

  const currentPlayerIds = new Set(state.players.map((p) => p.id));
  for (const [id, player] of players) {
    if (!currentPlayerIds.has(id)) {
      playersLayer.removeChild(player.container);
      players.delete(id);
    }
  }

  for (const playerData of state.players) {
    let player = players.get(playerData.id);
    if (!player) {
      const sprites = createPlayerSprite(playerData);
      player = { ...sprites, data: playerData };
      players.set(playerData.id, player);
      playersLayer.addChild(player.container);
    } else {
      player.data = playerData;
    }

    player.container.x = playerData.x;
    player.container.y = playerData.y;

    const hpPercent = playerData.hp / playerData.maxHp;
    player.hpBar.clear();
    player.hpBar.beginFill(playerData.id === playerId ? 0x4ade80 : 0x60a5fa);
    player.hpBar.drawRect(
      -playerData.size / 2,
      -playerData.size / 2 - 10,
      playerData.size * hpPercent,
      4
    );
    player.hpBar.endFill();
  }

  const currentBulletIds = new Set(state.bullets.map((b) => b.id));
  for (const [id, bullet] of bullets) {
    if (!currentBulletIds.has(id)) {
      bulletsLayer.removeChild(bullet);
      bullets.delete(id);
    }
  }

  for (const bulletData of state.bullets) {
    let bullet = bullets.get(bulletData.id);
    if (!bullet) {
      bullet = createBulletSprite(bulletData);
      bullets.set(bulletData.id, bullet);
      bulletsLayer.addChild(bullet);
    }
    bullet.x = bulletData.x;
    bullet.y = bulletData.y;
  }

  const currentMonsterIds = new Set(state.monsters.map((m) => m.id));
  for (const [id, monster] of monsters) {
    if (!currentMonsterIds.has(id)) {
      monstersLayer.removeChild(monster.container);
      monsters.delete(id);
    }
  }

  for (const monsterData of state.monsters) {
    let monster = monsters.get(monsterData.id);
    if (!monster) {
      const sprites = createMonsterSprite(monsterData);
      monster = { ...sprites, data: monsterData };
      monsters.set(monsterData.id, monster);
      monstersLayer.addChild(monster.container);
    } else {
      monster.data = monsterData;
    }

    monster.container.x = monsterData.x;
    monster.container.y = monsterData.y;

    const hpPercent = monsterData.hp / monsterData.maxHp;
    monster.hpBar.clear();
    monster.hpBar.beginFill(0xef4444);
    monster.hpBar.drawRect(
      -monsterData.size / 2,
      -monsterData.size / 2 - 8,
      monsterData.size * hpPercent,
      3
    );
    monster.hpBar.endFill();
  }

  updateUI(state);
}

function updateUI(state) {
  const player = state.players.find((p) => p.id === playerId);
  if (player) {
    const hpPercent = (player.hp / player.maxHp) * 100;
    document.getElementById('hp-fill').style.width = hpPercent + '%';
    document.getElementById('score').textContent = '分数: ' + player.score;
  }

  const playerListEl = document.getElementById('player-list');
  playerListEl.innerHTML = state.players
    .map((p) => `<div>${p.name}: ${p.score}分</div>`)
    .join('');
}

function sendInputIfChanged() {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  const currentInput = {
    up: keys.up,
    down: keys.down,
    left: keys.left,
    right: keys.right,
  };

  if (
    !lastInputState ||
    lastInputState.up !== currentInput.up ||
    lastInputState.down !== currentInput.down ||
    lastInputState.left !== currentInput.left ||
    lastInputState.right !== currentInput.right
  ) {
    ws.send(JSON.stringify({
      type: MESSAGE_TYPES.INPUT,
      input: currentInput,
    }));
    lastInputState = { ...currentInput };
  }
}

function handleKeyDown(e) {
  switch (e.key.toLowerCase()) {
    case 'w':
    case 'arrowup':
      keys.up = true;
      break;
    case 's':
    case 'arrowdown':
      keys.down = true;
      break;
    case 'a':
    case 'arrowleft':
      keys.left = true;
      break;
    case 'd':
    case 'arrowright':
      keys.right = true;
      break;
  }
}

function handleKeyUp(e) {
  switch (e.key.toLowerCase()) {
    case 'w':
    case 'arrowup':
      keys.up = false;
      break;
    case 's':
    case 'arrowdown':
      keys.down = false;
      break;
    case 'a':
    case 'arrowleft':
      keys.left = false;
      break;
    case 'd':
    case 'arrowright':
      keys.right = false;
      break;
  }
}

function handleMouseMove(e) {
  const rect = app.view.getBoundingClientRect();
  const screenX = e.clientX - rect.left;
  const screenY = e.clientY - rect.top;
  mouseWorldX = screenX + camera.x;
  mouseWorldY = screenY + camera.y;
}

function handleClick(e) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  const rect = app.view.getBoundingClientRect();
  const screenX = e.clientX - rect.left;
  const screenY = e.clientY - rect.top;
  const worldX = screenX + camera.x;
  const worldY = screenY + camera.y;

  ws.send(JSON.stringify({
    type: MESSAGE_TYPES.SHOOT,
    targetX: worldX,
    targetY: worldY,
  }));
}

function connectWebSocket(serverUrl) {
  ws = new WebSocket(serverUrl);

  ws.onopen = () => {
    document.getElementById('status').textContent = '已连接';
  };

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case MESSAGE_TYPES.INIT:
          playerId = message.playerId;
          worldWidth = message.worldWidth;
          worldHeight = message.worldHeight;
          break;
        case MESSAGE_TYPES.GAME_STATE:
          updateGameState(message);
          break;
        case MESSAGE_TYPES.PLAYER_JOIN:
          console.log('玩家加入:', message.playerId);
          break;
        case MESSAGE_TYPES.PLAYER_LEAVE:
          console.log('玩家离开:', message.playerId);
          break;
      }
    } catch (err) {
      console.error('Error parsing message:', err);
    }
  };

  ws.onclose = () => {
    document.getElementById('status').textContent = '连接断开';
  };

  ws.onerror = (err) => {
    console.error('WebSocket error:', err);
    document.getElementById('status').textContent = '连接错误';
  };
}

function startGame() {
  const name = document.getElementById('player-name').value.trim() || 'Player';
  const room = document.getElementById('room-id').value.trim() || 'default';

  document.getElementById('start-screen').style.display = 'none';

  initPixi();

  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const serverUrl = `${protocol}//${location.host}/ws?name=${encodeURIComponent(name)}&room=${encodeURIComponent(room)}`;

  connectWebSocket(serverUrl);

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  app.view.addEventListener('mousemove', handleMouseMove);
  app.view.addEventListener('click', handleClick);
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('start-btn').addEventListener('click', startGame);
  document.getElementById('player-name').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') startGame();
  });
  document.getElementById('room-id').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') startGame();
  });
});
