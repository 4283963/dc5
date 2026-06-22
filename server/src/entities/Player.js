const Entity = require('./Entity');
const { PLAYER, WORLD_WIDTH, WORLD_HEIGHT } = require('../../../shared/constants');

class Player extends Entity {
  constructor(x, y, name = 'Player') {
    super(x, y, PLAYER.SIZE);
    this.name = name;
    this.hp = PLAYER.MAX_HP;
    this.maxHp = PLAYER.MAX_HP;
    this.speed = PLAYER.SPEED;
    this.input = {
      up: false,
      down: false,
      left: false,
      right: false,
    };
    this.color = PLAYER.COLOR;
    this.score = 0;
  }

  update(dt) {
    let dx = 0;
    let dy = 0;

    if (this.input.up) dy -= 1;
    if (this.input.down) dy += 1;
    if (this.input.left) dx -= 1;
    if (this.input.right) dx += 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
    }

    const speed = this.speed * this.speedMultiplier;
    this.vx = dx * speed;
    this.vy = dy * speed;

    super.update(dt);
    this.updateStatuses(dt);

    this.x = Math.max(this.size / 2, Math.min(WORLD_WIDTH - this.size / 2, this.x));
    this.y = Math.max(this.size / 2, Math.min(WORLD_HEIGHT - this.size / 2, this.y));
  }

  takeDamage(damage) {
    this.hp -= damage;
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
    }
  }

  serialize() {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      size: this.size,
      hp: this.hp,
      maxHp: this.maxHp,
      color: this.color,
      name: this.name,
      score: this.score,
      statuses: this.getActiveStatuses(),
    };
  }
}

module.exports = Player;
