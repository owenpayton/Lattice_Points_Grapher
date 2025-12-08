/**
 * Geometry utilities for the lattice triangle app.
 * 
 * Main computations (area, boundary/interior points) are done in Python via Pyodide.
 * This module provides JS utilities for validation and re-exports Python functions.
 */

import { latticeRange } from "./constants.js";
import {
  computePolygonSnapshot as pyComputeSnapshot,
  computeAdditiveSnapshot as pyComputeAdditive,
  createEmptySnapshot,
  createEmptyAdditiveSnapshot,
} from "./pyodide-loader.js";

// Re-export the Pyodide-based computation functions
export const computePolygonSnapshot = pyComputeSnapshot;
export const computeAdditiveSnapshot = pyComputeAdditive;
export { createEmptySnapshot as createEmptyPolygonSnapshot };
export { createEmptyAdditiveSnapshot };

/**
 * GCD calculation (used for JS-side validation).
 */
export function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    [x, y] = [y, x % y];
  }
  return x;
}

/**
 * Clamp a vertex to the lattice range.
 */
export function clampVertex(vertex) {
  return {
    x: Math.max(-latticeRange, Math.min(latticeRange, Math.round(vertex.x))),
    y: Math.max(-latticeRange, Math.min(latticeRange, Math.round(vertex.y))),
  };
}

/**
 * Calculate the signed area of a polygon (used for validation).
 */
export function polygonAreaValue(vertices) {
  if (!vertices || vertices.length < 3) return 0;
  let area2 = 0;
  for (let i = 0; i < vertices.length; i++) {
    const current = vertices[i];
    const next = vertices[(i + 1) % vertices.length];
    area2 += current.x * next.y - next.x * current.y;
  }
  return area2 / 2;
}

/**
 * Calculate orientation of three points.
 * Returns positive if counter-clockwise, negative if clockwise, 0 if collinear.
 */
export function orientation(a, b, c) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

/**
 * Check if point b is on segment ac.
 */
export function onSegment(a, b, c) {
  return (
    b.x >= Math.min(a.x, c.x) &&
    b.x <= Math.max(a.x, c.x) &&
    b.y >= Math.min(a.y, c.y) &&
    b.y <= Math.max(a.y, c.y)
  );
}

/**
 * Check if two line segments intersect.
 */
export function segmentsIntersect(p1, p2, p3, p4) {
  const o1 = orientation(p1, p2, p3);
  const o2 = orientation(p1, p2, p4);
  const o3 = orientation(p3, p4, p1);
  const o4 = orientation(p3, p4, p2);

  if (o1 === 0 && onSegment(p1, p3, p2)) return true;
  if (o2 === 0 && onSegment(p1, p4, p2)) return true;
  if (o3 === 0 && onSegment(p3, p1, p4)) return true;
  if (o4 === 0 && onSegment(p3, p2, p4)) return true;

  return o1 * o2 < 0 && o3 * o4 < 0;
}

/**
 * Check if a polygon is simple (no self-intersecting edges).
 */
export function isSimplePolygon(vertices) {
  if (!vertices || vertices.length < 3) return false;
  const unique = new Set(vertices.map((v) => `${v.x},${v.y}`));
  if (unique.size !== vertices.length) return false;
  if (Math.abs(polygonAreaValue(vertices)) < 0.5) return false;

  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const a1 = vertices[i];
    const a2 = vertices[(i + 1) % n];
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(i - j) <= 1) continue;
      if (i === 0 && j === n - 1) continue;
      const b1 = vertices[j];
      const b2 = vertices[(j + 1) % n];
      if (segmentsIntersect(a1, a2, b1, b2)) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Check if two triangles in a quadrilateral are on opposite sides of the diagonal.
 */
export function trianglesOnOppositeSides(vertices) {
  if (!vertices || vertices.length !== 4) return false;
  const [a, b, c, d] = vertices;
  const oB = orientation(a, c, b);
  const oD = orientation(a, c, d);
  if (oB === 0 || oD === 0) {
    return false;
  }
  return oB * oD < 0;
}

/**
 * Check if a point is on a line segment.
 */
export function isPointOnEdge(point, start, end) {
  const cross = (point.x - start.x) * (end.y - start.y) - (point.y - start.y) * (end.x - start.x);
  if (cross !== 0) return false;
  const minX = Math.min(start.x, end.x);
  const maxX = Math.max(start.x, end.x);
  const minY = Math.min(start.y, end.y);
  const maxY = Math.max(start.y, end.y);
  return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY;
}

/**
 * Collect boundary points for a polygon (JS fallback, used by induction).
 */
export function collectBoundaryPoints(vertices) {
  const boundary = new Set();
  for (let i = 0; i < vertices.length; i++) {
    const start = vertices[i];
    const end = vertices[(i + 1) % vertices.length];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const steps = gcd(Math.abs(dx), Math.abs(dy));
    if (steps === 0) {
      boundary.add(`${start.x},${start.y}`);
      continue;
    }
    const stepX = dx / steps;
    const stepY = dy / steps;
    for (let j = 0; j <= steps; j++) {
      boundary.add(`${start.x + stepX * j},${start.y + stepY * j}`);
    }
  }
  return Array.from(boundary)
    .map((entry) => entry.split(",").map((v) => Number(v)))
    .sort(([ax, ay], [bx, by]) => (ax === bx ? ay - by : ax - bx));
}

/**
 * Format an area value for display.
 */
export function formatArea(value) {
  if (!Number.isFinite(value)) return "0";
  return Number.isInteger(value) ? value.toString() : value.toFixed(2);
}
