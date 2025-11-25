"""Stats panel showing triangle metrics."""

from __future__ import annotations

from typing import Iterable

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QFormLayout,
    QLabel,
    QVBoxLayout,
    QWidget,
)

Point = tuple[int, int]


class StatsPanel(QWidget):
    """Displays vertex positions and derived lattice metrics."""

    def __init__(self, parent=None) -> None:
        super().__init__(parent)
        self.vertex_labels: list[QLabel] = []
        self.area_label = QLabel("0")
        self.boundary_label = QLabel("0")
        self.interior_label = QLabel("0")
        self._build_ui()

    def _build_ui(self) -> None:
        root_layout = QVBoxLayout()
        root_layout.setAlignment(Qt.AlignTop)
        root_layout.setContentsMargins(12, 12, 12, 12)
        root_layout.setSpacing(6)

        form = QFormLayout()
        form.setLabelAlignment(Qt.AlignLeft)
        form.setFormAlignment(Qt.AlignTop)
        form.setVerticalSpacing(8)
        form.setHorizontalSpacing(12)

        for name in ("A", "B", "C"):
            label = QLabel("(0, 0)")
            label.setAlignment(Qt.AlignRight | Qt.AlignVCenter)
            self.vertex_labels.append(label)
            form.addRow(f"Vertex {name}", label)

        form.addRow("Area", self.area_label)
        form.addRow("Boundary points", self.boundary_label)
        form.addRow("Interior points", self.interior_label)

        root_layout.addLayout(form)
        root_layout.addStretch()
        self.setLayout(root_layout)

    def update_vertices(self, vertices: Iterable[Point]) -> None:
        for label, vertex in zip(self.vertex_labels, vertices):
            label.setText(f"({vertex[0]}, {vertex[1]})")

    def update_metrics(self, area: float, boundary: int, interior: int) -> None:
        self.area_label.setText(self._format_number(area))
        self.boundary_label.setText(str(boundary))
        self.interior_label.setText(str(interior))

    @staticmethod
    def _format_number(value: float) -> str:
        return str(int(value)) if value.is_integer() else f"{value:.2f}"
