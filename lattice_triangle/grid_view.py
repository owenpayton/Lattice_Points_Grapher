"""QGraphicsView rendering a lattice grid with a draggable triangle."""

from __future__ import annotations

from math import gcd
from typing import Iterable, Sequence

from PySide6.QtCore import QPointF, QRectF, Qt, Signal
from PySide6.QtGui import QColor, QBrush, QPainter, QPen, QPolygonF
from PySide6.QtWidgets import (
    QGraphicsEllipseItem,
    QGraphicsPolygonItem,
    QGraphicsScene,
    QGraphicsSimpleTextItem,
    QGraphicsView,
)

from .geometry import (
    get_boundary_points,
    get_interior_points,
    get_polygon_area,
    is_point_on_edge,
)

Point = tuple[int, int]


class _VertexHandle(QGraphicsEllipseItem):
    """Draggable handle that snaps to lattice points."""

    def __init__(self, owner: "GridView", radius: float = 7.0) -> None:
        super().__init__(-radius, -radius, radius * 2, radius * 2)
        self.owner = owner
        self.setBrush(QBrush(QColor("#ffffff")))
        self.setPen(QPen(QColor("#1b9aaa"), 2))
        self.setZValue(10)
        self.setFlags(
            QGraphicsEllipseItem.ItemIsMovable
            | QGraphicsEllipseItem.ItemSendsGeometryChanges
            | QGraphicsEllipseItem.ItemIsSelectable
        )
        self.setCursor(Qt.OpenHandCursor)

    def itemChange(self, change, value):  # noqa: N802 - Qt signature
        if change == QGraphicsEllipseItem.ItemPositionChange:
            snapped = self.owner.snap_scene_pos(value)
            return snapped
        if change == QGraphicsEllipseItem.ItemPositionHasChanged:
            self.owner.handle_moved()
        return super().itemChange(change, value)

    def mousePressEvent(self, event):  # noqa: N802 - Qt signature
        self.setCursor(Qt.ClosedHandCursor)
        super().mousePressEvent(event)

    def mouseReleaseEvent(self, event):  # noqa: N802 - Qt signature
        self.setCursor(Qt.OpenHandCursor)
        super().mouseReleaseEvent(event)


class GridView(QGraphicsView):
    """Interactive canvas for viewing a lattice grid and triangle handles."""

    verticesChanged = Signal(list)

    def __init__(
        self,
        vertices: Iterable[Point] | None = None,
        lattice_range: int = 10,
        parent=None,
    ) -> None:
        super().__init__(parent)
        self.scale_factor = 30.0
        self.lattice_range = lattice_range
        self.scene_obj = QGraphicsScene(self)
        self.setScene(self.scene_obj)
        self._updating_handles = False
        self.vertices: list[Point] = []
        self.handles: list[_VertexHandle] = []
        self.polygon_item: QGraphicsPolygonItem | None = None
        self.boundary_items: list[QGraphicsEllipseItem] = []
        self.interior_items: list[QGraphicsEllipseItem] = []

        self._configure_view()
        self._draw_grid()
        default_vertices = list(vertices) if vertices else [(-3, -2), (3, -2), (0, 4)]
        self.set_vertices(default_vertices, emit_signal=False)

    # Basic setup ---------------------------------------------------------
    def _configure_view(self) -> None:
        self.setRenderHint(QPainter.Antialiasing, True)
        extent = (self.lattice_range + 2) * self.scale_factor
        self.setSceneRect(QRectF(-extent, -extent, extent * 2, extent * 2))
        self.setBackgroundBrush(QColor("#f7f7fb"))
        self.setViewportUpdateMode(QGraphicsView.FullViewportUpdate)
        self.setTransformationAnchor(QGraphicsView.AnchorUnderMouse)
        self.setDragMode(QGraphicsView.NoDrag)

    def _draw_grid(self) -> None:
        axis_pen = QPen(QColor("#222222"))
        axis_pen.setWidthF(1.6)
        tick_pen = QPen(QColor("#555555"))
        tick_pen.setWidthF(0.8)
        grid_brush = QBrush(QColor("#b0b8c2"))

        min_c, max_c = -self.lattice_range, self.lattice_range

        # Axes
        self.scene_obj.addLine(
            self._to_scene_x(min_c),
            self._to_scene_y(0),
            self._to_scene_x(max_c),
            self._to_scene_y(0),
            axis_pen,
        )
        self.scene_obj.addLine(
            self._to_scene_x(0),
            self._to_scene_y(min_c),
            self._to_scene_x(0),
            self._to_scene_y(max_c),
            axis_pen,
        )

        for coord in range(min_c, max_c + 1):
            if coord == 0:
                continue
            # Tick marks
            self.scene_obj.addLine(
                self._to_scene_x(coord),
                -4,
                self._to_scene_x(coord),
                4,
                tick_pen,
            )
            self.scene_obj.addLine(
                -4,
                self._to_scene_y(coord),
                4,
                self._to_scene_y(coord),
                tick_pen,
            )
            # Labels
            x_label = QGraphicsSimpleTextItem(str(coord))
            x_label.setBrush(QColor("#555555"))
            x_label.setPos(self._to_scene_x(coord) - 6, 6)
            self.scene_obj.addItem(x_label)

            y_label = QGraphicsSimpleTextItem(str(coord))
            y_label.setBrush(QColor("#555555"))
            y_label.setPos(6, self._to_scene_y(coord) - 10)
            self.scene_obj.addItem(y_label)

        # Lattice dots
        dot_radius = 2.2
        dot_pen = QPen(Qt.NoPen)
        for x in range(min_c, max_c + 1):
            for y in range(min_c, max_c + 1):
                cx, cy = self._to_scene_x(x), self._to_scene_y(y)
                self.scene_obj.addEllipse(
                    cx - dot_radius,
                    cy - dot_radius,
                    dot_radius * 2,
                    dot_radius * 2,
                    dot_pen,
                    grid_brush,
                )

    # Coordinate helpers --------------------------------------------------
    def _to_scene_x(self, x: int | float) -> float:
        return float(x) * self.scale_factor

    def _to_scene_y(self, y: int | float) -> float:
        return -float(y) * self.scale_factor

    def lattice_to_scene(self, point: Point) -> QPointF:
        return QPointF(self._to_scene_x(point[0]), self._to_scene_y(point[1]))

    def scene_to_lattice(self, pos: QPointF) -> Point:
        x = round(pos.x() / self.scale_factor)
        y = round(-pos.y() / self.scale_factor)
        return self._clamp_point((x, y))

    def _clamp_point(self, point: Point) -> Point:
        min_c, max_c = -self.lattice_range, self.lattice_range
        return (
            max(min_c, min(point[0], max_c)),
            max(min_c, min(point[1], max_c)),
        )

    def snap_scene_pos(self, pos: QPointF) -> QPointF:
        lattice = self.scene_to_lattice(pos)
        return self.lattice_to_scene(lattice)

    # Triangle rendering --------------------------------------------------
    def set_vertices(self, vertices: Iterable[Point], emit_signal: bool = True) -> None:
        pts = [self._clamp_point((int(x), int(y))) for x, y in vertices]
        if len(pts) != 3:
            raise ValueError("Exactly three vertices are required.")
        self.vertices = pts

        if not self.handles:
            for _ in pts:
                handle = _VertexHandle(self)
                self.handles.append(handle)
                self.scene_obj.addItem(handle)

        self._updating_handles = True
        for handle, point in zip(self.handles, pts):
            handle.setPos(self.lattice_to_scene(point))
        self._updating_handles = False

        self._refresh_triangle()
        if emit_signal:
            self.verticesChanged.emit(self.vertices.copy())

    def handle_moved(self) -> None:
        if self._updating_handles:
            return
        self.vertices = [self.scene_to_lattice(h.pos()) for h in self.handles]
        self._refresh_triangle()
        self.verticesChanged.emit(self.vertices.copy())

    def _refresh_triangle(self) -> None:
        polygon = QPolygonF([self.lattice_to_scene(v) for v in self.vertices])
        if not self.polygon_item:
            self.polygon_item = QGraphicsPolygonItem(polygon)
            self.polygon_item.setPen(QPen(QColor("#1b9aaa"), 2.4))
            self.polygon_item.setBrush(QBrush(QColor(27, 154, 170, 55)))
            self.polygon_item.setZValue(5)
            self.scene_obj.addItem(self.polygon_item)
        else:
            self.polygon_item.setPolygon(polygon)

        for handle, vertex in zip(self.handles, self.vertices):
            handle.setToolTip(f"({vertex[0]}, {vertex[1]})")

        self._update_overlays()

    # Overlays ------------------------------------------------------------
    def _update_overlays(self) -> None:
        for item in [*self.boundary_items, *self.interior_items]:
            self.scene_obj.removeItem(item)
        self.boundary_items.clear()
        self.interior_items.clear()

        boundary_points = self._collect_boundary_points(self.vertices)
        interior_points = self._collect_interior_points(self.vertices)

        dot_pen = QPen(Qt.NoPen)
        boundary_brush = QBrush(QColor("#f48c06"))
        interior_brush = QBrush(QColor("#2a9d8f"))
        radius = 4.0

        for point in boundary_points:
            item = self.scene_obj.addEllipse(
                self._to_scene_x(point[0]) - radius,
                self._to_scene_y(point[1]) - radius,
                radius * 2,
                radius * 2,
                dot_pen,
                boundary_brush,
            )
            item.setZValue(3)
            self.boundary_items.append(item)

        for point in interior_points:
            item = self.scene_obj.addEllipse(
                self._to_scene_x(point[0]) - radius,
                self._to_scene_y(point[1]) - radius,
                radius * 2,
                radius * 2,
                dot_pen,
                interior_brush,
            )
            item.setZValue(3)
            self.interior_items.append(item)

    def _collect_boundary_points(self, vertices: Sequence[Point]) -> list[Point]:
        boundary: set[Point] = set()
        for i in range(3):
            start = vertices[i]
            end = vertices[(i + 1) % 3]
            dx, dy = end[0] - start[0], end[1] - start[1]
            steps = gcd(abs(dx), abs(dy))
            if steps == 0:
                boundary.add(start)
                continue
            step_x, step_y = dx // steps, dy // steps
            for j in range(steps + 1):
                boundary.add((start[0] + step_x * j, start[1] + step_y * j))
        return sorted(boundary)

    def _collect_interior_points(self, vertices: Sequence[Point]) -> list[Point]:
        min_x = min(p[0] for p in vertices)
        max_x = max(p[0] for p in vertices)
        min_y = min(p[1] for p in vertices)
        max_y = max(p[1] for p in vertices)

        interior: list[Point] = []
        for x in range(min_x, max_x + 1):
            for y in range(min_y, max_y + 1):
                candidate = (x, y)
                if candidate in vertices:
                    continue
                if any(
                    is_point_on_edge(candidate, vertices[i], vertices[(i + 1) % 3])
                    for i in range(3)
                ):
                    continue
                if self._point_inside_triangle(candidate, vertices):
                    interior.append(candidate)
        return interior

    @staticmethod
    def _point_inside_triangle(point: Point, vertices: Sequence[Point]) -> bool:
        a, b, c = vertices

        def sign(p1: Point, p2: Point, p3: Point) -> int:
            return (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (
                p1[1] - p3[1]
            )

        d1 = sign(point, a, b)
        d2 = sign(point, b, c)
        d3 = sign(point, c, a)
        has_neg = d1 < 0 or d2 < 0 or d3 < 0
        has_pos = d1 > 0 or d2 > 0 or d3 > 0
        on_boundary = d1 == 0 or d2 == 0 or d3 == 0
        return not on_boundary and not (has_neg and has_pos)

    # Metrics -------------------------------------------------------------
    def compute_metrics(self) -> dict[str, int | float]:
        area = get_polygon_area(self.vertices)
        boundary_count = get_boundary_points(self.vertices)
        interior_count = get_interior_points(self.vertices)
        return {
            "area": area,
            "boundary": boundary_count,
            "interior": interior_count,
        }
