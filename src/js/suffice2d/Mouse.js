import { Vec2 } from './Vec2.js';

export class Mouse {
  constructor(x = 0, y = 0) {
    this.position = new Vec2(x, y);
    this.selectedBody = null;
    this.selectedAnchor = null;
  }

  setPosition(x, y) {
    this.position.set(x, y);
  }

  grabBody(body) {
    if (this.selectedBody === null) {
      this.selectedBody = body;
      this.selectedAnchor = this.selectedBody.addAnchorPoint(
        this.position.clone()
      );
    }
  }

  constrainBody(force = 1) {
    if (force > 1) force = 1;
    else if (force < 0) force = 0; 
    
    if (this.selectedBody) {
      this.selectedBody.addAnchorForce(
        this.selectedAnchor,
        this.position,
        force
      );
    }
  }

  dropBody() {
    if (this.selectedBody) {
      this.selectedBody.removeAnchorPoint(this.selectedAnchor);
      this.selectedBody = null;
      this.selectedAnchor = null;
    }
  }

  renderGrab(ctx) {
    if (this.selectedAnchor) {
      ctx.beginPath();
      ctx.moveTo(this.selectedAnchor.x, this.selectedAnchor.y);
      ctx.lineTo(this.position.x, this.position.y);
      ctx.strokeStyle = 'white';
      ctx.stroke();
    }
  }
}
