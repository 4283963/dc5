const Entity = require('./entities/Entity');
const Player = require('./entities/Player');
const Bullet = require('./entities/Bullet');
const Monster = require('./entities/Monster');
const {
  TICK_INTERVAL,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  MONSTER,
  BULLET,
  MESSAGE_TYPES,
} = require('../../shared/constants');

const MAX_SUBSTEP_DISTANCE = 2;

class Game {
  constructor() {
    this.players = new Map();
    this.bullets = new Map();
    this.monsters = new Map();
    this.lastTickTime = Date.now();
    this.lastMonsterSpawn = 0;
    this.running = false;
    this.tickCount = 0;
    this.broadcastCallback = null;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTickTime = Date.now();
    this._tick();
  }

  stop() {
    this.running = false;
  }

  _tick() {
    if (!this.running) return;

    const now = Date.now();
    const dt = Math.min((now - this.lastTickTime) / 1000, 0.1);
    this.lastTickTime = now;

    this.update(dt);
    this.tickCount++;

    if (this.broadcastCallback) {
      const state = this.getState();
      this.broadcastCallback(state);
    }

    const nextTick = TICK_INTERVAL - (Date.now() - now);
    setTimeout(() => this._tick(), Math.max(0, nextTick));
  }

  update(dt) {
    const maxSpeed = BULLET.SPEED + MONSTER.SPEED;
    const minDtForSubstep = MAX_SUBSTEP_DISTANCE / maxSpeed;
    const substepCount = Math.max(1, Math.ceil(dt / minDtForSubstep));
    const subDt = dt / substepCount;

    for (let s = 0; s < substepCount; s++) {
      for (const player of this.players.values()) {
        if (!player.dead) {
          player.update(subDt);
        }
      }

      for (const bullet of this.bullets.values()) {
        bullet.update(subDt);
      }

      for (const monster of this.monsters.values()) {
        monster.update(subDt, this.players);
      }

      this._checkCollisions();
    }

    this._spawnMonsters();
    this._cleanup();
  }

  _checkCollisions() {
    for (const bullet of this.bullets.values()) {
      if (bullet.dead) continue;

      for (const monster of this.monsters.values()) {
        if (monster.dead) continue;

        if (Entity.sweepCollides(bullet, monster)) {
          monster.takeDamage(bullet.damage);
          bullet.dead = true;

          if (monster.dead) {
            const owner = this.players.get(bullet.ownerId);
            if (owner) {
              owner.score += 10;
            }
          }
          break;
        }
      }
    }

    for (const monster of this.monsters.values()) {
      if (monster.dead) continue;

      for (const player of this.players.values()) {
        if (player.dead) continue;

        if (Entity.sweepCollides(monster, player)) {
          player.takeDamage(10);
          monster.dead = true;
        }
      }
    }
  }

  _spawnMonsters() {
    const now = Date.now();
    if (now - this.lastMonsterSpawn < MONSTER.SPAWN_INTERVAL) return;
    if (this.monsters.size >= MONSTER.MAX_COUNT) return;

    this.lastMonsterSpawn = now;

    const side = Math.floor(Math.random() * 4);
    let x, y;

    switch (side) {
      case 0:
        x = Math.random() * WORLD_WIDTH;
        y = -MONSTER.SIZE;
        break;
      case 1:
        x = WORLD_WIDTH + MONSTER.SIZE;
        y = Math.random() * WORLD_HEIGHT;
        break;
      case 2:
        x = Math.random() * WORLD_WIDTH;
        y = WORLD_HEIGHT + MONSTER.SIZE;
        break;
      case 3:
        x = -MONSTER.SIZE;
        y = Math.random() * WORLD_HEIGHT;
        break;
    }

    const monster = new Monster(x, y);
    this.monsters.set(monster.id, monster);
  }

  _cleanup() {
    for (const [id, bullet] of this.bullets) {
      if (bullet.dead) {
        this.bullets.delete(id);
      }
    }

    for (const [id, monster] of this.monsters) {
      if (monster.dead) {
        this.monsters.delete(id);
      }
    }
  }

  addPlayer(playerId, name) {
    const x = WORLD_WIDTH / 2 + (Math.random() - 0.5) * 100;
    const y = WORLD_HEIGHT / 2 + (Math.random() - 0.5) * 100;
    const player = new Player(x, y, name);
    player.id = playerId;
    this.players.set(playerId, player);
    return player;
  }

  removePlayer(playerId) {
    this.players.delete(playerId);
  }

  handleInput(playerId, input) {
    const player = this.players.get(playerId);
    if (!player || player.dead) return;
    player.input = { ...player.input, ...input };
  }

  handleShoot(playerId, targetX, targetY) {
    const player = this.players.get(playerId);
    if (!player || player.dead) return;

    const dx = targetX - player.x;
    const dy = targetY - player.y;
    const angle = Math.atan2(dy, dx);

    const bullet = new Bullet(player.x, player.y, angle, playerId);
    this.bullets.set(bullet.id, bullet);
  }

  getState() {
    return {
      type: MESSAGE_TYPES.GAME_STATE,
      tick: this.tickCount,
      players: Array.from(this.players.values()).map((p) => p.serialize()),
      bullets: Array.from(this.bullets.values()).map((b) => b.serialize()),
      monsters: Array.from(this.monsters.values()).map((m) => m.serialize()),
      worldWidth: WORLD_WIDTH,
      worldHeight: WORLD_HEIGHT,
    };
  }

  setBroadcastCallback(callback) {
    this.broadcastCallback = callback;
  }
}

module.exports = Game;
