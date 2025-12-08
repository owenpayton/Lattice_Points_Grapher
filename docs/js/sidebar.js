import { BASE_CASE_COLORS, TABS } from "./constants.js";
import {
  createEmptyAdditiveSnapshot,
  createEmptyPolygonSnapshot,
  formatArea,
} from "./geometry.js";
import { renderMath, mathToHtml, MATH } from "./katex-utils.js";
import { state } from "./state.js";

function updateTriangleSidebar(dom) {
  const snap = state.triangleSnapshot ?? createEmptyPolygonSnapshot();
  dom.areaEl.textContent = formatArea(snap.area ?? 0);
  dom.boundaryEl.textContent = snap.boundary ?? 0;
  dom.interiorEl.textContent = snap.interior ?? 0;
  state.triangleVertices.forEach((vertex, idx) => {
    if (dom.vertexEls[idx]) {
      dom.vertexEls[idx].textContent = `(${vertex.x}, ${vertex.y})`;
    }
  });
}

function conjectureLineKatex(label, labelLatex, snapshot) {
  const area = snapshot.area ?? 0;
  const boundary = snapshot.boundary ?? 0;
  const interior = snapshot.interior ?? 0;
  const rhs = boundary / 2 + interior - 1;
  const matches = Math.abs(area - rhs) < 1e-6;
  const areaStr = formatArea(area);
  const rhsStr = formatArea(rhs);
  
  const latex = `${labelLatex}: ${areaStr} = \\frac{${boundary}}{2} + ${interior} - 1 = ${rhsStr}`;
  
  return {
    html: mathToHtml(latex),
    matches,
  };
}

function updateAdditiveSidebar(dom) {
  const snap = state.additiveSnapshot ?? createEmptyAdditiveSnapshot();
  const p1 = snap.t1 ?? createEmptyPolygonSnapshot();
  const p2 = snap.t2 ?? createEmptyPolygonSnapshot();
  const union = snap.union ?? createEmptyPolygonSnapshot();
  const shared = snap.shared_edge ?? { interior_count: 0, points: [] };

  // Render labels with KaTeX
  renderMath(dom.additiveStats.p1.label, "P_1");
  renderMath(dom.additiveStats.p2.label, "P_2");
  renderMath(dom.additiveStats.union.label, "P_1 \\cup P_2");

  dom.additiveStats.p1.area.textContent = formatArea(p1.area ?? 0);
  dom.additiveStats.p1.boundary.textContent = p1.boundary ?? 0;
  dom.additiveStats.p1.interior.textContent = p1.interior ?? 0;

  dom.additiveStats.p2.area.textContent = formatArea(p2.area ?? 0);
  dom.additiveStats.p2.boundary.textContent = p2.boundary ?? 0;
  dom.additiveStats.p2.interior.textContent = p2.interior ?? 0;

  dom.additiveStats.union.area.textContent = formatArea(union.area ?? 0);
  dom.additiveStats.union.boundary.textContent = union.boundary ?? 0;
  dom.additiveStats.union.interior.textContent = union.interior ?? 0;

  const p1Interior = p1.interior ?? 0;
  const p2Interior = p2.interior ?? 0;
  const unionInterior = union.interior ?? 0;
  const edgeInterior = shared.interior_count ?? 0;
  dom.additiveStats.edgeInterior.textContent = edgeInterior;
  
  // Interior equation with KaTeX
  const interiorEqLatex = `I(P_1 \\cup P_2) = I(P_1) + I(P_2) + I(\\text{shared}) = ${p1Interior} + ${p2Interior} + ${edgeInterior} = ${unionInterior}`;
  renderMath(dom.additiveStats.equation, interiorEqLatex);

  // The conjecture verification lines with KaTeX
  const theoremLines = [
    { html: mathToHtml(MATH.conjectureFull), matches: true },
    conjectureLineKatex("P1", "P_1", p1),
    conjectureLineKatex("P2", "P_2", p2),
    conjectureLineKatex("P1 ∪ P2", "P_1 \\cup P_2", union),
  ];
  dom.additiveStats.conjectureWork.innerHTML = theoremLines
    .map(
      (line) =>
        `<div class="conjecture-line${line.matches ? "" : " alert"}">${line.html}</div>`
    )
    .join("");

  state.additiveVertices.forEach((vertex, idx) => {
    if (dom.additiveVertexEls[idx]) {
      dom.additiveVertexEls[idx].textContent = `(${vertex.x}, ${vertex.y})`;
    }
  });
}

function updateInductionSidebar(dom) {
  const totalSteps = state.inductionTriangles.length;

  // Render static labels with KaTeX
  renderMath(dom.indAreaLabel, "\\text{Area } (A)");
  renderMath(dom.indBoundaryLabel, "\\text{Boundary } (B)");
  renderMath(dom.indInteriorLabel, "\\text{Interior } (I)");
  renderMath(dom.indConjectureLabel, "\\frac{B}{2} + I - 1");
  renderMath(dom.indFinalMessage, "A = \\frac{B}{2} + I - 1 \\text{ verified by induction!}");

  let progressHTML = "";
  for (let i = 0; i < totalSteps; i++) {
    let cls = "progress-dot";
    if (i < state.inductionStep) cls += " complete";
    else if (i === state.inductionStep) cls += " active";
    progressHTML += `<div class="${cls}"></div>`;
  }
  dom.indProgressBar.innerHTML = progressHTML;

  dom.indPrevBtn.disabled = state.inductionStep <= 0;
  dom.indNextBtn.disabled = state.inductionStep >= totalSteps;

  if (state.inductionStep === 0) {
    dom.indStepTitle.textContent = "Step 0: Base Case";
  } else if (state.inductionStep === 1) {
    dom.indStepTitle.textContent = "Step 1: Base Case";
  } else if (state.inductionStep >= totalSteps) {
    dom.indStepTitle.textContent = `Complete: All ${totalSteps} Triangles`;
  } else {
    dom.indStepTitle.innerHTML = `Step ${state.inductionStep}: Glue ${mathToHtml(`P_{${state.inductionStep}}`)}`;
  }
  dom.indStepDesc.innerHTML = ``;

  let legendHTML = "";
  const maxLegendItems = 8;
  const showCount = Math.min(state.inductionStep + 1, totalSteps, maxLegendItems);
  for (let i = 0; i < showCount; i++) {
    const opacity = i < state.inductionStep ? "1" : "0.6";
    const color = BASE_CASE_COLORS[i % BASE_CASE_COLORS.length];
    legendHTML += `<div class="legend-item" style="opacity:${opacity}">
      <div class="legend-swatch" style="background:${color.fill};border-color:${color.stroke}"></div>
      <span>${mathToHtml(`P_{${i + 1}}`)}</span>
    </div>`;
  }
  if (state.inductionStep >= maxLegendItems) {
    legendHTML += `<div class="legend-item"><span>... +${state.inductionStep + 1 - maxLegendItems} more</span></div>`;
  }
  dom.indLegend.innerHTML = legendHTML;

  if (state.inductionStep === 0) {
    dom.indArea.textContent = "0";
    dom.indBoundary.textContent = "0";
    dom.indInterior.textContent = "0";
    dom.indConjectureResult.textContent = "−";
    dom.indGlueBox.classList.add("hidden");
    dom.indConjectureWork.innerHTML = `
      <div class="conjecture-line">Each base case triangle has:</div>
      <div class="conjecture-line">• ${mathToHtml("A = \\frac{1}{2}")}</div>
      <div class="conjecture-line">• ${mathToHtml("B = 3")} (vertices only)</div>
      <div class="conjecture-line">• ${mathToHtml("I = 0")}</div>
      <div class="conjecture-line success">• ${mathToHtml("\\frac{1}{2} = \\frac{3}{2} + 0 - 1")} ✓</div>`;
  } else {
    const accSnap = state.inductionAccumulatedSnapshots[state.inductionStep - 1];
    if (accSnap) {
      const area = accSnap.area ?? 0;
      const boundary = accSnap.boundary ?? 0;
      const interior = accSnap.interior ?? 0;
      const conjectureVal = boundary / 2 + interior - 1;

      dom.indArea.textContent = formatArea(area);
      dom.indBoundary.textContent = boundary;
      dom.indInterior.textContent = interior;
      dom.indConjectureResult.textContent = formatArea(conjectureVal);

      if (state.inductionStep > 1 && state.inductionStep <= totalSteps) {
        dom.indGlueBox.classList.remove("hidden");
        const triSnap = state.inductionSnapshots[state.inductionStep - 1];
        renderMath(dom.indNewArea, `\\frac{1}{2}`);
        dom.indAbsorbed.textContent = "0";
      } else if (state.inductionStep === 1) {
        dom.indGlueBox.classList.remove("hidden");
        renderMath(dom.indNewArea, `\\frac{1}{2}`);
        dom.indAbsorbed.textContent = "−";
      } else {
        dom.indGlueBox.classList.add("hidden");
      }

      let conjectureHTML = `<div class="conjecture-line">Conjecture: ${mathToHtml(MATH.conjecture)}</div>`;

      if (state.inductionStep >= 1) {
        conjectureHTML += `<div class="conjecture-line success"><strong>Base:</strong> ${mathToHtml("P_1")}: ${mathToHtml("\\frac{1}{2} = \\frac{3}{2} + 0 - 1")} ✓</div>`;
      }

      const maxDisplay = 6;
      const startIdx = Math.max(1, state.inductionStep - maxDisplay + 1);

      if (startIdx > 1) {
        conjectureHTML += `<div class="conjecture-line">... earlier steps verified ...</div>`;
      }

      for (let i = startIdx; i < state.inductionStep; i++) {
        const snap = state.inductionAccumulatedSnapshots[i];
        if (snap) {
          const a = snap.area ?? 0;
          const b = snap.boundary ?? 0;
          const iVal = snap.interior ?? 0;
          const rhs = b / 2 + iVal - 1;
          const matches = Math.abs(a - rhs) < 1e-6;
          const labelLatex = `P_1 \\cup \\cdots \\cup P_{${i + 1}}`;
          const aStr = formatArea(a);
          const rhsStr = formatArea(rhs);
          const eqLatex = `${labelLatex}: ${aStr} = \\frac{${b}}{2} + ${iVal} - 1 = ${rhsStr}`;
          conjectureHTML += `<div class="conjecture-line ${matches ? "success" : "alert"}">${mathToHtml(eqLatex)} ${matches ? "✓" : "✗"}</div>`;
        }
      }
      dom.indConjectureWork.innerHTML = conjectureHTML;
    }
  }

  if (state.inductionStep >= totalSteps) {
    dom.indFinalCheck.classList.remove("hidden");
  } else {
    dom.indFinalCheck.classList.add("hidden");
  }
}

export function updateSidebar(dom) {
  const isTriangle = state.currentTab === TABS.TRIANGLE;
  const isAdditive = state.currentTab === TABS.ADDITIVE;
  const isInduction = state.currentTab === TABS.INDUCTION;

  dom.trianglePanel.classList.toggle("hidden", !isTriangle);
  dom.additivePanel.classList.toggle("hidden", !isAdditive);
  dom.inductionPanel.classList.toggle("hidden", !isInduction);

  if (isTriangle) {
    updateTriangleSidebar(dom);
  } else if (isAdditive) {
    updateAdditiveSidebar(dom);
  } else if (isInduction) {
    updateInductionSidebar(dom);
  }
}
