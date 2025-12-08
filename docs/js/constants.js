export const latticeRange = 10;
export const DEFAULT_SCALE = 32;
export const INDUCTION_SCALE = 70; // Larger scale for induction zoom
export const SHARED_EDGE_COLOR = "#c026d3";

export const TABS = {
  TRIANGLE: "triangle",
  ADDITIVE: "additive",
  INDUCTION: "induction",
};

export const initialTriangle = [
  { x: -3, y: -2 },
  { x: 3, y: -2 },
  { x: 0, y: 4 },
];

export const initialAdditive = [
  { x: -4, y: -1 },
  { x: 3, y: -1 },
  { x: 2, y: 4 },
  { x: -3, y: 4 },
];

// Outer triangle for induction proof - decomposed into base case triangles
export const inductionOuterTriangle = [
  { x: -2, y: -2 }, // right angle vertex
  { x: 2, y: -2 },  // base vertex
  { x: -2, y: 2 },  // height vertex
];

export const BASE_CASE_COLORS = [
  { fill: "rgba(27, 154, 170, 0.35)", stroke: "#1b9aaa" },
  { fill: "rgba(244, 140, 6, 0.35)", stroke: "#f48c06" },
  { fill: "rgba(42, 157, 143, 0.35)", stroke: "#2a9d8f" },
  { fill: "rgba(139, 92, 246, 0.35)", stroke: "#8b5cf6" },
  { fill: "rgba(236, 72, 153, 0.35)", stroke: "#ec4899" },
  { fill: "rgba(245, 158, 11, 0.35)", stroke: "#f59e0b" },
  { fill: "rgba(16, 185, 129, 0.35)", stroke: "#10b981" },
  { fill: "rgba(99, 102, 241, 0.35)", stroke: "#6366f1" },
  { fill: "rgba(244, 63, 94, 0.35)", stroke: "#f43f5e" },
  { fill: "rgba(234, 179, 8, 0.35)", stroke: "#eab308" },
  { fill: "rgba(168, 85, 247, 0.35)", stroke: "#a855f7" },
  { fill: "rgba(20, 184, 166, 0.35)", stroke: "#14b8a6" },
  { fill: "rgba(251, 146, 60, 0.35)", stroke: "#fb923c" },
  { fill: "rgba(34, 197, 94, 0.35)", stroke: "#22c55e" },
  { fill: "rgba(192, 38, 211, 0.35)", stroke: "#c026d3" },
  { fill: "rgba(59, 130, 246, 0.35)", stroke: "#3b82f6" },
];

