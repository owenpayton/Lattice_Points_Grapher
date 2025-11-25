"""Deterministic geometry helpers for lattice triangles."""

from __future__ import annotations

from math import gcd
from typing import Iterable, Sequence, Tuple

Point = Tuple[int, int]


def _validate_points(points: Sequence[Point]) -> list[Point]:
    pts = list(points)
    if len(pts) < 3:
        raise ValueError("At least three points are required to describe a polygon.")
    return pts


def _edge_sign(point: Point, start: Point, end: Point) -> int:
    """Signed area * 2 of the triangle (point, start, end)."""
    return (point[0] - end[0]) * (start[1] - end[1]) - (start[0] - end[0]) * (
        point[1] - end[1]
    )


def _triangle_contains(point: Point, vertices: Sequence[Point]) -> bool:
    """Return True if point is strictly inside the triangle defined by vertices."""
    a, b, c = vertices
    d1 = _edge_sign(point, a, b)
    d2 = _edge_sign(point, b, c)
    d3 = _edge_sign(point, c, a)

    has_neg = d1 < 0 or d2 < 0 or d3 < 0
    has_pos = d1 > 0 or d2 > 0 or d3 > 0
    on_boundary = d1 == 0 or d2 == 0 or d3 == 0
    return not on_boundary and not (has_neg and has_pos)


def get_polygon_area(points: Sequence[Point]) -> float:
    """Compute polygon area using the shoelace formula."""
    pts = _validate_points(points)
    area2 = 0
    for i in range(len(pts)):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % len(pts)]
        area2 += x1 * y2 - x2 * y1
    return abs(area2) / 2.0


def get_boundary_points(points: Sequence[Point]) -> int:
    """Count lattice points on the polygon boundary using GCD of edge deltas."""
    pts = _validate_points(points)
    boundary = 0
    for i in range(len(pts)):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % len(pts)]
        boundary += gcd(abs(x2 - x1), abs(y2 - y1))
    return boundary


def is_point_on_edge(point: Point, start: Point, end: Point) -> bool:
    """Return True when the point lies on the closed segment start-end."""
    cross = (point[0] - start[0]) * (end[1] - start[1]) - (point[1] - start[1]) * (
        end[0] - start[0]
    )
    if cross != 0:
        return False

    min_x, max_x = sorted((start[0], end[0]))
    min_y, max_y = sorted((start[1], end[1]))
    return min_x <= point[0] <= max_x and min_y <= point[1] <= max_y


def get_interior_points(points: Sequence[Point]) -> int:
    """Enumerate lattice points strictly inside a triangle."""
    pts = _validate_points(points)
    if len(pts) != 3:
        raise ValueError("Interior enumeration is implemented for triangles only.")

    min_x = min(p[0] for p in pts)
    max_x = max(p[0] for p in pts)
    min_y = min(p[1] for p in pts)
    max_y = max(p[1] for p in pts)

    interior = 0
    for x in range(min_x, max_x + 1):
        for y in range(min_y, max_y + 1):
            candidate = (x, y)
            if candidate in pts:
                continue
            if any(is_point_on_edge(candidate, pts[i], pts[(i + 1) % 3]) for i in range(3)):
                continue
            if _triangle_contains(candidate, pts):
                interior += 1
    return interior
