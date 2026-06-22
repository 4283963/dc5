class Entity {
  constructor(x, y, size) {
    this.id = Math.random().toString(36).slice(2, 9);
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.prevY = y;
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

  get prevLeft() {
    return this.prevX - this.size / 2;
  }

  get prevRight() {
    return this.prevX + this.size / 2;
  }

  get prevTop() {
    return this.prevY - this.size / 2;
  }

  get prevBottom() {
    return this.prevY + this.size / 2;
  }

  savePrev() {
    this.prevX = this.x;
    this.prevY = this.y;
  }

  update(dt) {
    this.savePrev();
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

  static sweepCollides(entityA, entityB) {
    if (entityA.collidesWith(entityB)) {
      return true;
    }

    const minX = Math.min(entityA.prevLeft, entityA.left);
    const maxX = Math.max(entityA.prevRight, entityA.right);
    const minY = Math.min(entityA.prevTop, entityA.top);
    const maxY = Math.max(entityA.prevBottom, entityA.bottom);

    if (
      maxX < entityB.left ||
      minX > entityB.right ||
      maxY < entityB.top ||
      minY > entityB.bottom
    ) {
      return false;
    }

    if (
      entityA.prevX === entityA.x &&
      entityA.prevY === entityA.y
    ) {
      return false;
    }

    return Entity._segmentIntersectsRect(
      entityA.prevX, entityA.prevY,
      entityA.x, entityA.y,
      entityA.size / 2,
      entityB
    );
  }

  static _segmentIntersectsRect(x1, y1, x2, y2, radius, rect) {
    const half = rect.size / 2;
    const rx = rect.x - half - radius;
    const ry = rect.y - half - radius;
    const rw = rect.size + radius * 2;
    const rh = rect.size + radius * 2;

    if (
      x1 >= rx && x1 <= rx + rw &&
      y1 >= ry && y1 <= ry + rh
    ) {
      return true;
    }

    return (
      Entity._segSegIntersect(x1, y1, x2, y2, rx, ry, rx + rw, ry) ||
      Entity._segSegIntersect(x1, y1, x2, y2, rx + rw, ry, rx + rw, ry + rh) ||
      Entity._segSegIntersect(x1, y1, x2, y2, rx + rw, ry + rh, rx, ry + rh) ||
      Entity._segSegIntersect(x1, y1, x2, y2, rx, ry + rh, rx, ry)
    );
  }

  static _segSegIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
    const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    if (denom === 0) return false;

    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
  }
}

module.exports = Entity;
