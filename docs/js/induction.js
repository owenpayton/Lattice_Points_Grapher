import { inductionOuterTriangle } from "./constants.js";
import { computePolygonSnapshot, orientation } from "./geometry.js";
import { state, resetInductionSnapshots } from "./state.js";

export function buildInductionTriangles() {
  const v0 = inductionOuterTriangle[0]; // right angle vertex
  const n = inductionOuterTriangle[1].x - v0.x; // leg length = 4

  const allTriangles = [];

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n - i; j++) {
      allTriangles.push({
        vertices: [
          { x: v0.x + i, y: v0.y + j },
          { x: v0.x + i + 1, y: v0.y + j },
          { x: v0.x + i, y: v0.y + j + 1 },
        ],
        gridPos: { i, j, type: "lower" },
      });

      if (i + j < n - 1) {
        allTriangles.push({
          vertices: [
            { x: v0.x + i + 1, y: v0.y + j },
            { x: v0.x + i + 1, y: v0.y + j + 1 },
            { x: v0.x + i, y: v0.y + j + 1 },
          ],
          gridPos: { i, j, type: "upper" },
        });
      }
    }
  }

  const ordered = [];
  const used = new Set();
  const getKey = (tri) => tri.vertices.map((v) => `${v.x},${v.y}`).sort().join("|");
  const sharesEdge = (t1, t2) => {
    const v1 = t1.vertices.map((v) => `${v.x},${v.y}`);
    const v2 = t2.vertices.map((v) => `${v.x},${v.y}`);
    let shared = 0;
    for (const p of v1) {
      if (v2.includes(p)) shared++;
    }
    return shared === 2;
  };

  const startTri = allTriangles.find(
    (t) => t.gridPos.i === 0 && t.gridPos.j === 0 && t.gridPos.type === "lower"
  );
  if (startTri) {
    ordered.push(startTri.vertices);
    used.add(getKey(startTri));
  }

  while (ordered.length < allTriangles.length) {
    let added = false;
    for (const tri of allTriangles) {
      const key = getKey(tri);
      if (used.has(key)) continue;
      for (const addedVerts of ordered) {
        if (sharesEdge({ vertices: addedVerts }, tri)) {
          ordered.push(tri.vertices);
          used.add(key);
          added = true;
          break;
        }
      }
      if (added) break;
    }
    if (!added) {
      for (const tri of allTriangles) {
        const key = getKey(tri);
        if (!used.has(key)) {
          ordered.push(tri.vertices);
          used.add(key);
          break;
        }
      }
    }
  }

  state.inductionTriangles = ordered;
}

export function getAccumulatedPolygon(stepIndex) {
  if (stepIndex <= 0) return [];
  if (stepIndex >= state.inductionTriangles.length) {
    return [...inductionOuterTriangle];
  }

  const pointSet = new Set();
  for (let i = 0; i < stepIndex; i++) {
    for (const v of state.inductionTriangles[i]) {
      pointSet.add(`${v.x},${v.y}`);
    }
  }

  const points = Array.from(pointSet).map((s) => {
    const [x, y] = s.split(",").map(Number);
    return { x, y };
  });

  if (points.length < 3) return points;

  let start = points.reduce((a, b) =>
    a.x < b.x || (a.x === b.x && a.y < b.y) ? a : b
  );
  const hull = [];
  let current = start;

  do {
    hull.push(current);
    let next = points[0];
    for (const p of points) {
      if (next === current || orientation(current, next, p) < 0) {
        next = p;
      }
    }
    current = next;
  } while (current !== start && hull.length < points.length + 1);

  return hull;
}

export function getSharedEdgeForStep(stepIndex) {
  if (stepIndex <= 0 || stepIndex >= state.inductionTriangles.length) return null;

  const newTri = state.inductionTriangles[stepIndex];
  const accumulated = getAccumulatedPolygon(stepIndex);
  if (accumulated.length < 2) return null;

  for (let i = 0; i < 3; i++) {
    const e1 = newTri[i];
    const e2 = newTri[(i + 1) % 3];
    const e1InAcc = accumulated.some((v) => v.x === e1.x && v.y === e1.y);
    const e2InAcc = accumulated.some((v) => v.x === e2.x && v.y === e2.y);

    if (e1InAcc && e2InAcc) {
      for (let j = 0; j < accumulated.length; j++) {
        const a1 = accumulated[j];
        const a2 = accumulated[(j + 1) % accumulated.length];
        const sameDirection = a1.x === e1.x && a1.y === e1.y && a2.x === e2.x && a2.y === e2.y;
        const oppositeDirection = a1.x === e2.x && a1.y === e2.y && a2.x === e1.x && a2.y === e1.y;
        if (sameDirection || oppositeDirection) {
          return { start: e1, end: e2 };
        }
      }
    }
  }

  return null;
}

export function computeInductionSnapshots() {
  resetInductionSnapshots();
  for (const tri of state.inductionTriangles) {
    const result = computePolygonSnapshot(tri);
    state.inductionSnapshots.push(result);
  }

  for (let i = 0; i < state.inductionTriangles.length; i++) {
    const accPoly = getAccumulatedPolygon(i + 1);
    if (accPoly.length >= 3) {
      const result = computePolygonSnapshot(accPoly);
      state.inductionAccumulatedSnapshots.push(result);
    }
  }
}

