import { Vec2 } from './physics/Vec2.js'; // Your class here

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

canvas.width = 400;
canvas.height = 400;

const center = new Vec2(canvas.width / 2, canvas.height / 2);

const circles = [];
for (let i = 0; i < 10; i++) {
  circles.push({
    center: new Vec2(
      Math.random() * canvas.width,
      Math.random() * canvas.height
    ),
    radius: 20 + Math.random() * 30
  });
}

let target = center.clone();

canvas.addEventListener('touchmove', e => {
  const touch = e.touches[0];
  target.set(touch.clientX, touch.clientY);
});

function raycastCircle(rayOrigin, rayDir, circleCenter, radius) {
  const m = Vec2.subtract(rayOrigin, circleCenter);
  const b = m.dot(rayDir);
  const c = m.dot(m) - radius * radius;

  if (c > 0 && b > 0) return null;
  const discriminant = b * b - c;
  if (discriminant < 0) return null;

  const t = -b - Math.sqrt(discriminant);
  const hitT = t < 0 ? 0 : t;
  return Vec2.add(rayOrigin, Vec2.scale(rayDir, hitT));
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw all circles
  for (const c of circles) {
    ctx.beginPath();
    ctx.arc(c.center.x, c.center.y, c.radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Draw ray
  ctx.beginPath();
  ctx.moveTo(center.x, center.y);
  ctx.lineTo(target.x, target.y);
  ctx.strokeStyle = 'blue';
  ctx.stroke();

  // Check intersections
  const rayDir = Vec2.subtract(target, center).normalize();
  for (const c of circles) {
    const hit = raycastCircle(center, rayDir, c.center, c.radius);
    if (hit) {
      ctx.beginPath();
      ctx.arc(hit.x, hit.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = 'red';
      ctx.fill();
    }
  }

  requestAnimationFrame(draw);
}

draw();
