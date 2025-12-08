import { TABS } from "./constants.js";
import {
  computeAdditiveSnapshot,
  computePolygonSnapshot,
  isSimplePolygon,
  trianglesOnOppositeSides,
} from "./geometry.js";
import { loadPyodide, isPythonReady } from "./pyodide-loader.js";
import { buildInductionTriangles, computeInductionSnapshots } from "./induction.js";
import { drawScene, canvasToLattice, findHandle, initRenderer } from "./render.js";
import { updateSidebar } from "./sidebar.js";
import {
  getActiveVertices,
  resetInductionStep,
  setActiveHandle,
  setTab,
  state,
} from "./state.js";

const dom = {
  canvas: document.getElementById("gridCanvas"),
  areaEl: document.getElementById("areaValue"),
  boundaryEl: document.getElementById("boundaryValue"),
  interiorEl: document.getElementById("interiorValue"),
  vertexEls: [
    document.getElementById("vertexA"),
    document.getElementById("vertexB"),
    document.getElementById("vertexC"),
  ],
  tabButtons: document.querySelectorAll(".tab"),
  trianglePanel: document.getElementById("trianglePanel"),
  additivePanel: document.getElementById("additivePanel"),
  inductionPanel: document.getElementById("inductionPanel"),
  additiveStats: {
    p1: {
      label: document.getElementById("addP1Label"),
      area: document.getElementById("addP1Area"),
      boundary: document.getElementById("addP1Boundary"),
      interior: document.getElementById("addP1Interior"),
    },
    p2: {
      label: document.getElementById("addP2Label"),
      area: document.getElementById("addP2Area"),
      boundary: document.getElementById("addP2Boundary"),
      interior: document.getElementById("addP2Interior"),
    },
    union: {
      label: document.getElementById("addUnionLabel"),
      area: document.getElementById("addUnionArea"),
      boundary: document.getElementById("addUnionBoundary"),
      interior: document.getElementById("addUnionInterior"),
    },
    edgeInterior: document.getElementById("addEdgeInterior"),
    equation: document.getElementById("addInteriorEquation"),
    conjectureWork: document.getElementById("addConjectureWork"),
  },
  additiveVertexEls: [
    document.getElementById("addVertexA"),
    document.getElementById("addVertexB"),
    document.getElementById("addVertexC"),
    document.getElementById("addVertexD"),
  ],
  indPrevBtn: document.getElementById("indPrevBtn"),
  indNextBtn: document.getElementById("indNextBtn"),
  indResetBtn: document.getElementById("indResetBtn"),
  indProgressBar: document.getElementById("indProgressBar"),
  indStepTitle: document.getElementById("indStepTitle"),
  indStepDesc: document.getElementById("indStepDesc"),
  indLegend: document.getElementById("indLegend"),
  indAreaLabel: document.getElementById("indAreaLabel"),
  indBoundaryLabel: document.getElementById("indBoundaryLabel"),
  indInteriorLabel: document.getElementById("indInteriorLabel"),
  indConjectureLabel: document.getElementById("indConjectureLabel"),
  indArea: document.getElementById("indArea"),
  indBoundary: document.getElementById("indBoundary"),
  indInterior: document.getElementById("indInterior"),
  indConjectureResult: document.getElementById("indConjectureResult"),
  indGlueBox: document.getElementById("indGlueBox"),
  indNewArea: document.getElementById("indNewArea"),
  indAbsorbed: document.getElementById("indAbsorbed"),
  indConjectureWork: document.getElementById("indConjectureWork"),
  indFinalCheck: document.getElementById("indFinalCheck"),
  indFinalMessage: document.getElementById("indFinalMessage"),
  loadingOverlay: null, // Will be created dynamically
};

function createLoadingOverlay() {
  const overlay = document.createElement("div");
  overlay.id = "loadingOverlay";
  overlay.innerHTML = `
    <div class="loading-content">
      <div class="loading-spinner"></div>
      <div class="loading-text">Loading Python environment...</div>
    </div>
  `;
  document.body.appendChild(overlay);
  dom.loadingOverlay = overlay;
}

function hideLoadingOverlay() {
  if (dom.loadingOverlay) {
    dom.loadingOverlay.classList.add("hidden");
  }
}

function pointerPosition(evt) {
  const rect = dom.canvas.getBoundingClientRect();
  return {
    x: evt.clientX - rect.left,
    y: evt.clientY - rect.top,
  };
}

function recomputeCurrentTab() {
  if (!isPythonReady()) return;
  
  if (state.currentTab === TABS.TRIANGLE) {
    state.triangleSnapshot = computePolygonSnapshot(state.triangleVertices);
  } else if (state.currentTab === TABS.ADDITIVE) {
    state.additiveSnapshot = computeAdditiveSnapshot(state.additiveVertices);
  } else if (state.currentTab === TABS.INDUCTION) {
    computeInductionSnapshots();
  }
}

function refreshUI() {
  updateSidebar(dom);
  drawScene();
}

function onVertexChange() {
  recomputeCurrentTab();
  refreshUI();
}

function attachTabListeners() {
  dom.tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetTab = button.dataset.tab;
      if (!targetTab || targetTab === state.currentTab) return;
      setTab(targetTab);
      dom.tabButtons.forEach((btn) => {
        const isActive = btn.dataset.tab === targetTab;
        btn.classList.toggle("active", isActive);
        btn.setAttribute("aria-selected", isActive ? "true" : "false");
      });
      setActiveHandle(null);
      recomputeCurrentTab();
      refreshUI();
    });
  });
}

function attachPointerHandlers() {
  dom.canvas.addEventListener("pointerdown", (evt) => {
    if (state.currentTab === TABS.INDUCTION) return;
    const pos = pointerPosition(evt);
    const hit = findHandle(pos);
    if (hit !== null) {
      setActiveHandle(hit);
      dom.canvas.setPointerCapture(evt.pointerId);
    }
  });

  dom.canvas.addEventListener("pointermove", (evt) => {
    if (state.activeHandle === null) return;
    const pos = pointerPosition(evt);
    const verts = getActiveVertices();
    const previous = { ...verts[state.activeHandle] };
    const next = canvasToLattice(pos);
    if (previous.x === next.x && previous.y === next.y) {
      return;
    }
    verts[state.activeHandle] = next;
    if (
      state.currentTab === TABS.ADDITIVE &&
      (!isSimplePolygon(state.additiveVertices) || !trianglesOnOppositeSides(state.additiveVertices))
    ) {
      verts[state.activeHandle] = previous;
      drawScene();
      return;
    }
    onVertexChange();
  });

  function releasePointer(evt) {
    if (state.activeHandle !== null && dom.canvas.hasPointerCapture(evt.pointerId)) {
      dom.canvas.releasePointerCapture(evt.pointerId);
    }
    setActiveHandle(null);
  }

  dom.canvas.addEventListener("pointerup", releasePointer);
  dom.canvas.addEventListener("pointercancel", releasePointer);
}

function attachInductionControls() {
  dom.indPrevBtn.addEventListener("click", () => {
    if (state.inductionStep > 0) {
      state.inductionStep -= 1;
      refreshUI();
    }
  });

  dom.indNextBtn.addEventListener("click", () => {
    if (state.inductionStep < state.inductionTriangles.length) {
      state.inductionStep += 1;
      refreshUI();
    }
  });

  dom.indResetBtn.addEventListener("click", () => {
    resetInductionStep();
    refreshUI();
  });
}

function setupAnimation() {
  const animate = () => {
    if (state.currentTab === TABS.INDUCTION && state.inductionStep < state.inductionTriangles.length) {
      drawScene();
    }
    requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);
}

async function initialize() {
  // Create and show loading overlay
  createLoadingOverlay();
  
  // Initialize renderer and build induction triangles (doesn't need Python)
  initRenderer(dom.canvas);
  buildInductionTriangles();
  
  // Attach event listeners (doesn't need Python)
  attachTabListeners();
  attachPointerHandlers();
  attachInductionControls();
  window.addEventListener("resize", drawScene);
  
  // Draw initial scene with empty data
  drawScene();
  
  // Load Pyodide and Python geometry module
  try {
    await loadPyodide();
    
    // Now compute initial snapshots with Python
    state.triangleSnapshot = computePolygonSnapshot(state.triangleVertices);
    state.additiveSnapshot = computeAdditiveSnapshot(state.additiveVertices);
    computeInductionSnapshots();
    
    // Update UI with computed data
    refreshUI();
    
    // Hide loading overlay
    hideLoadingOverlay();
  } catch (error) {
    console.error("Failed to initialize Python:", error);
    if (dom.loadingOverlay) {
      dom.loadingOverlay.querySelector(".loading-text").textContent = 
        "Failed to load Python. Please refresh the page.";
    }
  }
  
  // Start animation loop
  setupAnimation();
}

initialize();
