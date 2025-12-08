// KaTeX rendering utilities

// Wait for KaTeX to be available
function waitForKatex() {
  return new Promise((resolve) => {
    if (typeof katex !== "undefined") {
      resolve();
      return;
    }
    const check = setInterval(() => {
      if (typeof katex !== "undefined") {
        clearInterval(check);
        resolve();
      }
    }, 50);
  });
}

let katexReady = false;
const katexPromise = waitForKatex().then(() => {
  katexReady = true;
});

// Render LaTeX to an element
export function renderMath(element, latex, displayMode = false) {
  if (!element) return;
  
  if (katexReady) {
    try {
      katex.render(latex, element, {
        throwOnError: false,
        displayMode,
      });
    } catch (e) {
      element.textContent = latex;
    }
  } else {
    // Fallback while loading
    element.textContent = latex;
    katexPromise.then(() => {
      try {
        katex.render(latex, element, {
          throwOnError: false,
          displayMode,
        });
      } catch (e) {
        element.textContent = latex;
      }
    });
  }
}

// Render LaTeX inline and return HTML string
export function mathToHtml(latex, displayMode = false) {
  if (katexReady) {
    try {
      return katex.renderToString(latex, {
        throwOnError: false,
        displayMode,
      });
    } catch (e) {
      return latex;
    }
  }
  return `<span class="katex-pending" data-latex="${escapeHtml(latex)}">${latex}</span>`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Process any pending KaTeX elements
export async function processPendingMath() {
  await katexPromise;
  document.querySelectorAll(".katex-pending").forEach((el) => {
    const latex = el.dataset.latex;
    if (latex) {
      try {
        katex.render(latex, el, { throwOnError: false });
        el.classList.remove("katex-pending");
      } catch (e) {
        // Keep fallback text
      }
    }
  });
}

// Common math expressions used in the app
export const MATH = {
  // The conjecture: A = I + B/2 - 1
  conjecture: "A = I + \\frac{B}{2} - 1",
  conjectureFull: "A(P) = I(P) + \\frac{B(P)}{2} - 1",
  
  // Polygon labels
  P1: "P_1",
  P2: "P_2",
  union: (n1, n2) => `P_{${n1}} \\cup P_{${n2}}`,
  unionRange: (start, end) => `P_1 \\cup \\cdots \\cup P_{${end}}`,
  
  // Interior/boundary/area
  I: (label) => `I(${label})`,
  B: (label) => `B(${label})`,
  A: (label) => `A(${label})`,
  
  // Subscripts
  sub: (base, sub) => `${base}_{${sub}}`,
  
  // Fractions
  frac: (num, denom) => `\\frac{${num}}{${denom}}`,
  half: "\\frac{1}{2}",
  
  // Verification
  check: "\\checkmark",
  cross: "\\times",
  
  // Build conjecture equation with values
  conjectureEq: (area, interior, boundary) => {
    const rhs = interior + boundary / 2 - 1;
    const rhsStr = Number.isInteger(rhs) ? rhs : rhs.toFixed(2);
    const areaStr = Number.isInteger(area) ? area : area.toFixed(2);
    return `${areaStr} = ${interior} + \\frac{${boundary}}{2} - 1 = ${rhsStr}`;
  },
  
  // Interior equation for union
  interiorUnion: (i1, i2, shared, total) => 
    `I(P_1 \\cup P_2) = I(P_1) + I(P_2) + I(\\text{shared}) = ${i1} + ${i2} + ${shared} = ${total}`,
};

// Initialize KaTeX when module loads
export { katexPromise };


