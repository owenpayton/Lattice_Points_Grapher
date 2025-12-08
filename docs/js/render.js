import {
  BASE_CASE_COLORS,
  DEFAULT_SCALE,
  INDUCTION_SCALE,
  SHARED_EDGE_COLOR,
  TABS,
  latticeRange,
  inductionOuterTriangle,
} from "./constants.js";
import { clampVertex } from "./geometry.js";
import { getSharedEdgeForStep } from "./induction.js";
import { getActiveVertices, setOriginFromRect, state } from "./state.js";

let canvas;
let ctx;

export function initRenderer(canvasElement) {
  canvas = canvasElement;
  ctx = canvas?.getContext("2d");
}

export function getScale() {
  return state.currentTab === TABS.INDUCTION ? INDUCTION_SCALE : DEFAULT_SCALE;
}

export function latticeToCanvas(point) {
  const s = getScale();
  return {
    x: state.originX + point.x * s,
    y: state.originY - point.y * s,
  };
}

export function canvasToLattice(point) {
  const s = getScale();
  return clampVertex({
    x: (point.x - state.originX) / s,
    y: (state.originY - point.y) / s,
  });
}

export function findHandle(position) {
  const radius = 14;
  const verts = getActiveVertices();
  for (let i = 0; i < verts.length; i++) {
    const center = latticeToCanvas(verts[i]);
    const dist2 = (center.x - position.x) ** 2 + (center.y - position.y) ** 2;
    if (dist2 <= radius ** 2) return i;
  }
  return null;
}

function drawGrid(rect) {
  const s = getScale();
  const range = state.currentTab === TABS.INDUCTION ? 5 : latticeRange;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, rect.width, rect.height);

  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#e5e7eb";
  for (let i = -range; i <= range; i++) {
    const x = state.originX + i * s;
    const y = state.originY - i * s;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, rect.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(rect.width, y);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "#111827";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, state.originY);
  ctx.lineTo(rect.width, state.originY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(state.originX, 0);
  ctx.lineTo(state.originX, rect.height);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "#9ca3af";
  const dotSize = state.currentTab === TABS.INDUCTION ? 3.5 : 2.2;
  for (let x = -range; x <= range; x++) {
    for (let y = -range; y <= range; y++) {
      const p = latticeToCanvas({ x, y });
      ctx.beginPath();
      ctx.arc(p.x, p.y, dotSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawPolygon(vertexList, options = {}) {
  if (!vertexList || vertexList.length === 0) return;
  const {
    fill = "rgba(27, 154, 170, 0.16)",
    stroke = "#1b9aaa",
    lineWidth = 2.2,
  } = options;
  const pts = vertexList.map(latticeToCanvas);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x, pts[i].y);
  }
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
  ctx.restore();
}

function drawPoints(points, color, size = 4) {
  ctx.save();
  ctx.fillStyle = color;
  for (const point of points || []) {
    const p = latticeToCanvas({ x: point[0], y: point[1] });
    ctx.beginPath();
    ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawHandles(verts) {
  ctx.save();
  for (const vertex of verts) {
    const p = latticeToCanvas(vertex);
    ctx.beginPath();
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#1b9aaa";
    ctx.lineWidth = 2.4;
    ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawSharedEdge(sharedEdge, defaultEndpoints) {
  if (!sharedEdge) return;
  const [start, end] = sharedEdge.endpoints || defaultEndpoints;
  const startPt = latticeToCanvas({ x: start[0], y: start[1] });
  const endPt = latticeToCanvas({ x: end[0], y: end[1] });
  ctx.save();
  ctx.strokeStyle = SHARED_EDGE_COLOR;
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(startPt.x, startPt.y);
  ctx.lineTo(endPt.x, endPt.y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
  drawPoints(sharedEdge.points, SHARED_EDGE_COLOR);
}

function drawAdditiveScene() {
  drawPoints(state.additiveSnapshot.union.boundary_points, "#f48c06");
  drawPoints(state.additiveSnapshot.union.interior_points, "#2a9d8f");
  const verts = state.additiveVertices;
  const triangleOne = [verts[0], verts[1], verts[2]];
  const triangleTwo = [verts[0], verts[3], verts[2]];
  drawPolygon(triangleOne, { fill: "rgba(27, 154, 170, 0.16)", stroke: "#1b9aaa", lineWidth: 2.2 });
  drawPolygon(triangleTwo, { fill: "rgba(244, 140, 6, 0.18)", stroke: "#f48c06", lineWidth: 2.2 });
  drawSharedEdge(state.additiveSnapshot.shared_edge, [
    [verts[0].x, verts[0].y],
    [verts[2].x, verts[2].y],
  ]);
  drawHandles(state.additiveVertices);
}

function drawInductionScene() {
  ctx.save();
  const fullPts = inductionOuterTriangle.map(latticeToCanvas);
  ctx.beginPath();
  ctx.moveTo(fullPts[0].x, fullPts[0].y);
  for (let i = 1; i < fullPts.length; i++) {
    ctx.lineTo(fullPts[i].x, fullPts[i].y);
  }
  ctx.closePath();
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 3.5;
  ctx.setLineDash([10, 10]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1.5;
  const v0 = inductionOuterTriangle[0];
  const n = inductionOuterTriangle[1].x - v0.x;

  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= n - i; j++) {
      const p = latticeToCanvas({ x: v0.x + i, y: v0.y + j });
      if (i + 1 <= n - j) {
        const p2 = latticeToCanvas({ x: v0.x + i + 1, y: v0.y + j });
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
      if (j + 1 <= n - i) {
        const p2 = latticeToCanvas({ x: v0.x + i, y: v0.y + j + 1 });
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
      if (i + 1 <= n - j && j + 1 <= n - i - 1) {
        const p2 = latticeToCanvas({ x: v0.x + i + 1, y: v0.y + j + 1 });
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }
  }
  ctx.restore();

  for (let i = 0; i < state.inductionStep && i < state.inductionTriangles.length; i++) {
    const tri = state.inductionTriangles[i];
    const color = BASE_CASE_COLORS[i % BASE_CASE_COLORS.length];
    drawPolygon(tri, { fill: color.fill, stroke: color.stroke, lineWidth: 2.5 });
  }

  if (state.inductionStep < state.inductionTriangles.length) {
    const nextTri = state.inductionTriangles[state.inductionStep];
    const color = BASE_CASE_COLORS[state.inductionStep % BASE_CASE_COLORS.length];
    ctx.save();
    ctx.globalAlpha = 0.5 + 0.3 * Math.sin(Date.now() / 250);
    drawPolygon(nextTri, { fill: color.fill, stroke: color.stroke, lineWidth: 3.5 });
    ctx.restore();

    if (state.inductionStep > 0) {
      const sharedEdge = getSharedEdgeForStep(state.inductionStep);
      if (sharedEdge) {
        const startPt = latticeToCanvas(sharedEdge.start);
        const endPt = latticeToCanvas(sharedEdge.end);
        ctx.save();
        ctx.strokeStyle = SHARED_EDGE_COLOR;
        ctx.lineWidth = 6;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(startPt.x, startPt.y);
        ctx.lineTo(endPt.x, endPt.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    }
  }

  if (state.inductionStep > 0 && state.inductionAccumulatedSnapshots[state.inductionStep - 1]) {
    const snap = state.inductionAccumulatedSnapshots[state.inductionStep - 1];
    drawPoints(snap.boundary_points, "#f48c06", 7);
    drawPoints(snap.interior_points, "#2a9d8f", 7);
  }

  ctx.save();
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= n - i; j++) {
      const p = latticeToCanvas({ x: v0.x + i, y: v0.y + j });
      ctx.beginPath();
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#64748b";
      ctx.lineWidth = 2;
      ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function drawScene() {
  if (!ctx || !canvas) return;
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  setOriginFromRect(rect);
  drawGrid(rect);

  if (state.currentTab === TABS.TRIANGLE) {
    drawPoints(state.triangleSnapshot.boundary_points, "#f48c06");
    drawPoints(state.triangleSnapshot.interior_points, "#2a9d8f");
    drawPolygon(state.triangleVertices);
    drawHandles(state.triangleVertices);
  } else if (state.currentTab === TABS.ADDITIVE) {
    drawAdditiveScene();
  } else if (state.currentTab === TABS.INDUCTION) {
    drawInductionScene();
  }
}

