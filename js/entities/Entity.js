/** An axis-aligned box: the shape of everything that collides. */
export class Entity {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  get left() {
    return this.x;
  }

  get right() {
    return this.x + this.width;
  }

  get top() {
    return this.y;
  }

  get bottom() {
    return this.y + this.height;
  }

  get centerX() {
    return this.x + this.width / 2;
  }

  get centerY() {
    return this.y + this.height / 2;
  }

  overlaps(other) {
    return this.overlapsHorizontally(other) && this.overlapsVertically(other);
  }

  /** `skin` shrinks the test, so overlaps thinner than it are ignored. */
  overlapsHorizontally(other, skin = 0) {
    return this.right > other.left + skin && this.left < other.right - skin;
  }

  overlapsVertically(other, skin = 0) {
    return this.bottom > other.top + skin && this.top < other.bottom - skin;
  }
}
