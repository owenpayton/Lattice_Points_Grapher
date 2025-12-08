/**
 * Pyodide loader and Python geometry interface.
 * Handles loading Pyodide and providing access to Python geometry functions.
 */

let pyodide = null;
let pythonReady = false;
let loadPromise = null;

// Python geometry functions
let computeSnapshotPy = null;
let computeAdditiveSnapshotPy = null;

/**
 * Load Pyodide and the geometry module.
 * @returns {Promise<void>}
 */
export async function loadPyodide() {
  if (loadPromise) return loadPromise;
  
  loadPromise = (async () => {
    try {
      // Load Pyodide from CDN
      pyodide = await globalThis.loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/"
      });
      
      // Fetch and run the Python geometry module
      const response = await fetch('./py/geometry.py');
      const pythonCode = await response.text();
      await pyodide.runPythonAsync(pythonCode);
      
      // Get references to Python functions
      computeSnapshotPy = pyodide.globals.get("compute_snapshot");
      computeAdditiveSnapshotPy = pyodide.globals.get("compute_additive_snapshot");
      
      pythonReady = true;
      console.log("Pyodide and geometry module loaded successfully");
    } catch (error) {
      console.error("Failed to load Pyodide:", error);
      throw error;
    }
  })();
  
  return loadPromise;
}

/**
 * Check if Python is ready.
 * @returns {boolean}
 */
export function isPythonReady() {
  return pythonReady;
}

/**
 * Wait for Python to be ready.
 * @returns {Promise<void>}
 */
export async function waitForPython() {
  if (pythonReady) return;
  await loadPromise;
}

/**
 * Convert JS vertices to Python format and compute snapshot.
 * @param {Array<{x: number, y: number}>} vertices
 * @returns {Object} Polygon snapshot
 */
export function computePolygonSnapshot(vertices) {
  if (!pythonReady) {
    return createEmptySnapshot();
  }
  
  try {
    const pyVertices = pyodide.toPy(vertices.map(v => [v.x, v.y]));
    const result = computeSnapshotPy(pyVertices).toJs({ dict_converter: Object.fromEntries });
    pyVertices.destroy();
    return result;
  } catch (error) {
    console.error("Error computing polygon snapshot:", error);
    return createEmptySnapshot();
  }
}

/**
 * Convert JS vertices to Python format and compute additive snapshot.
 * @param {Array<{x: number, y: number}>} vertices - Must be exactly 4 vertices
 * @returns {Object} Additive snapshot with t1, t2, union, and shared_edge
 */
export function computeAdditiveSnapshot(vertices) {
  if (!pythonReady) {
    return createEmptyAdditiveSnapshot();
  }
  
  try {
    const pyVertices = pyodide.toPy(vertices.map(v => [v.x, v.y]));
    const result = computeAdditiveSnapshotPy(pyVertices).toJs({ dict_converter: Object.fromEntries });
    pyVertices.destroy();
    return result;
  } catch (error) {
    console.error("Error computing additive snapshot:", error);
    return createEmptyAdditiveSnapshot();
  }
}

/**
 * Create an empty polygon snapshot (used as fallback).
 */
export function createEmptySnapshot() {
  return {
    area: 0,
    boundary: 0,
    interior: 0,
    boundary_points: [],
    interior_points: [],
  };
}

/**
 * Create an empty additive snapshot (used as fallback).
 */
export function createEmptyAdditiveSnapshot() {
  return {
    t1: createEmptySnapshot(),
    t2: createEmptySnapshot(),
    union: createEmptySnapshot(),
    shared_edge: {
      points: [],
      interior_count: 0,
      endpoints: [[0, 0], [0, 0]],
    },
  };
}

