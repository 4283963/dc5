const Entity = require('./Entity');
const { BULLET, WORLD_WIDTH, WORLD_HEIGHT } = require('../../../shared/constants');

class Bullet extends Entity {
  constructor(x, y, angle, ownerId) {
    super(x, y, BULLET.SIZE);
    this.ownerId = ownerId;
    this.speed = BULLET.SPEED;
    this.damage = BULLET.DAMAGE;
    this.color = BULLET.COLOR;
    this.lifetime = BULLET.LIFETIME;
    this.spawnTime = Date.now();

    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;
  }

  update(dt) {
    super.update(dt);

    if (
      this.x < -this.size ||
      this.x > WORLD_WIDTH + this.size ||
      this.y < -this.size ||
      this.y > WORLD_HEIGHT + this.size
    ) {
      this.dead = true;
    }

    if (Date.now() - this.spawnTime > this.lifetime) {
      this.dead = true;
    }
  }

  serialize() {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      size: this.size,
      color: this.color,
    };
  }
}

module.exports = Bullet;
