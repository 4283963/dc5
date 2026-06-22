const Entity = require('./Entity');
const { MONSTER, WORLD_WIDTH, WORLD_HEIGHT } = require('../../../shared/constants');

class Monster extends Entity {
  constructor(x, y) {
    super(x, y, MONSTER.SIZE);
    this.hp = MONSTER.MAX_HP;
    this.maxHp = MONSTER.MAX_HP;
    this.speed = MONSTER.SPEED;
    this.color = MONSTER.COLOR;
    this.target = null;
  }

  update(dt, players) {
    let nearestPlayer = null;
    let nearestDist = Infinity;

    for (const player of players.values()) {
      if (player.dead) continue;
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestPlayer = player;
      }
    }

    if (nearestPlayer) {
      const dx = nearestPlayer.x - this.x;
      const dy = nearestPlayer.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        this.vx = (dx / dist) * this.speed;
        this.vy = (dy / dist) * this.speed;
      }
    }

    super.update(dt);

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
    };
  }
}

module.exports = Monster;
