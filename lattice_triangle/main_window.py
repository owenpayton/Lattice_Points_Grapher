"""Main window wiring grid view and stats panel together."""

from __future__ import annotations

from PySide6.QtCore import Qt
from PySide6.QtWidgets import QHBoxLayout, QMainWindow, QSizePolicy, QWidget

from .grid_view import GridView
from .stats_panel import StatsPanel


class MainWindow(QMainWindow):
    """Top-level window that synchronizes the grid and metrics panel."""

    def __init__(self, parent=None) -> None:
        super().__init__(parent)
        self.setWindowTitle("Lattice Point Triangle Visualizer")

        self.grid_view = GridView()
        self.stats_panel = StatsPanel()
        self.stats_panel.setFixedWidth(260)

        central = QWidget()
        layout = QHBoxLayout()
        layout.setContentsMargins(12, 12, 12, 12)
        layout.setSpacing(12)
        layout.addWidget(self.grid_view, stretch=3)
        layout.addWidget(self.stats_panel, stretch=1, alignment=Qt.AlignTop)
        central.setLayout(layout)
        central.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Expanding)
        self.setCentralWidget(central)

        self.grid_view.verticesChanged.connect(self._on_vertices_changed)
        self._on_vertices_changed(self.grid_view.vertices)
        self.resize(1100, 750)

    def _on_vertices_changed(self, vertices) -> None:
        metrics = self.grid_view.compute_metrics()
        self.stats_panel.update_vertices(vertices)
        self.stats_panel.update_metrics(
            metrics["area"],
            metrics["boundary"],
            metrics["interior"],
        )
