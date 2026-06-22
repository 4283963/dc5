class Entity {
  constructor(x, y, size) {
    this.id = Math.random().toString(36).slice(2, 9);
    this.x = x;
    this.y = y;
    this.size = size;
    this.vx = 0;
    this.vy = 0;
    this.dead = false;
  }

  get left() {
    return this.x - this.size / 2;
  }

  get right() {
    return this.x + this.size / 2;
  }

  get top() {
    return this.y - this.size / 2;
  }

  get bottom() {
    return this.y + this.size / 2;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  collidesWith(other) {
    return (
      this.left < other.right &&
      this.right > other.left &&
      this.top < other.bottom &&
      this.bottom > other.top
    );
  }
}

module.exports = Entity;
