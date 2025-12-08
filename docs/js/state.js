import { TABS, latticeRange, initialTriangle, initialAdditive } from "./constants.js";
import { createEmptyAdditiveSnapshot, createEmptyPolygonSnapshot } from "./geometry.js";

const cloneVertex = (v) => ({ x: v.x, y: v.y });

export const state = {
  latticeRange,
  originX: 0,
  originY: 0,
  activeHandle: null,
  currentTab: TABS.TRIANGLE,
  triangleVertices: initialTriangle.map(cloneVertex),
  additiveVertices: initialAdditive.map(cloneVertex),
  triangleSnapshot: createEmptyPolygonSnapshot(),
  additiveSnapshot: createEmptyAdditiveSnapshot(),
  inductionStep: 0,
  inductionTriangles: [],
  inductionSnapshots: [],
  inductionAccumulatedSnapshots: [],
};

export function setTab(tab) {
  state.currentTab = tab;
}

export function setOriginFromRect(rect) {
  state.originX = rect.width / 2;
  state.originY = rect.height / 2;
}

export function setActiveHandle(index) {
  state.activeHandle = index;
}

export function resetSnapshots() {
  state.triangleSnapshot = createEmptyPolygonSnapshot();
  state.additiveSnapshot = createEmptyAdditiveSnapshot();
}

export function resetInductionSnapshots() {
  state.inductionSnapshots = [];
  state.inductionAccumulatedSnapshots = [];
}

export function resetInductionStep() {
  state.inductionStep = 0;
}

export function getActiveVertices() {
  if (state.currentTab === TABS.TRIANGLE) return state.triangleVertices;
  if (state.currentTab === TABS.ADDITIVE) return state.additiveVertices;
  return [];
}

