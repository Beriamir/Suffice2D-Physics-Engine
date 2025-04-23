function raycastCircle(rayOrigin, rayDir, circleCenter, radius) {
  const m = Vec2.subtract(rayOrigin, circleCenter); // Vector from circle to ray origin
  const b = m.dot(rayDir);
  const c = m.dot(m) - radius * radius;

  // Early out if ray origin is outside and pointing away
  if (c > 0 && b > 0) return null;

  const discriminant = b * b - c;

  // No intersection
  if (discriminant < 0) return null;

  // Ray intersects circle, return the nearest point
  const t = -b - Math.sqrt(discriminant);

  // t < 0 means the ray started inside the circle
  const hitT = t < 0 ? 0 : t;
  const hitPoint = Vec2.add(rayOrigin, Vec2.scale(rayDir, hitT));

  return {
    point: hitPoint,
    t: hitT
  };
}
