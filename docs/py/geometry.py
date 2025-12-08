"""
Lattice point geometry calculations for The Conjecture visualization.
This module is loaded via Pyodide in the browser.
"""

from math import gcd
from typing import Sequence, Tuple, List

Point = Tuple[int, int]


def _validate_points(points: Sequence[Point]) -> List[Point]:
    """Convert and validate a sequence of points."""
    pts = [tuple(int(v) for v in p) for p in points]
    if len(pts) < 3:
        raise ValueError("At least three points are required to describe a polygon.")
    return pts


def _edge_sign(point: Point, start: Point, end: Point) -> int:
    """Calculate the sign of the cross product for edge containment."""
    return (point[0] - end[0]) * (start[1] - end[1]) - (start[0] - end[0]) * (
        point[1] - end[1]
    )


def _triangle_contains(point: Point, vertices: Sequence[Point]) -> bool:
    """Check if a point is strictly inside a triangle (not on boundary)."""
    a, b, c = vertices
    d1 = _edge_sign(point, a, b)
    d2 = _edge_sign(point, b, c)
    d3 = _edge_sign(point, c, a)
    has_neg = d1 < 0 or d2 < 0 or d3 < 0
    has_pos = d1 > 0 or d2 > 0 or d3 > 0
    on_boundary = d1 == 0 or d2 == 0 or d3 == 0
    return not on_boundary and not (has_neg and has_pos)


def is_point_on_edge(point: Point, start: Point, end: Point) -> bool:
    """Check if a point lies on a line segment."""
    cross = (point[0] - start[0]) * (end[1] - start[1]) - (point[1] - start[1]) * (
        end[0] - start[0]
    )
    if cross != 0:
        return False
    min_x, max_x = sorted((start[0], end[0]))
    min_y, max_y = sorted((start[1], end[1]))
    return min_x <= point[0] <= max_x and min_y <= point[1] <= max_y


def _is_point_in_polygon(point: Point, vertices: Sequence[Point]) -> bool:
    """Check if a point is strictly inside a polygon using ray casting."""
    pts = _validate_points(vertices)
    x, y = point
    inside = False
    n = len(pts)
    for i in range(n):
        start = pts[i]
        end = pts[(i + 1) % n]
        if is_point_on_edge(point, start, end):
            return False
        x1, y1 = start
        x2, y2 = end
        if (y1 > y) != (y2 > y):
            denom = y2 - y1
            if denom != 0:
                xinters = (x2 - x1) * (y - y1) / denom + x1
                if xinters > x:
                    inside = not inside
    return inside


def _point_in_shape(point: Point, vertices: Sequence[Point]) -> bool:
    """Check if a point is strictly inside a shape (triangle or polygon)."""
    pts = _validate_points(vertices)
    if len(pts) == 3:
        return _triangle_contains(point, pts)
    return _is_point_in_polygon(point, pts)


def get_polygon_area(points: Sequence[Point]) -> float:
    """Calculate the area of a polygon using the shoelace formula."""
    pts = _validate_points(points)
    area2 = 0
    for i in range(len(pts)):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % len(pts)]
        area2 += x1 * y2 - x2 * y1
    return abs(area2) / 2.0


def get_boundary_points(points: Sequence[Point]) -> int:
    """Count the number of lattice points on the polygon boundary."""
    pts = _validate_points(points)
    boundary = 0
    for i in range(len(pts)):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % len(pts)]
        boundary += gcd(abs(x2 - x1), abs(y2 - y1))
    return boundary


def get_interior_points(points: Sequence[Point]) -> int:
    """Count the number of lattice points strictly inside the polygon."""
    pts = _validate_points(points)
    min_x = min(p[0] for p in pts)
    max_x = max(p[0] for p in pts)
    min_y = min(p[1] for p in pts)
    max_y = max(p[1] for p in pts)

    interior = 0
    n = len(pts)
    for x in range(min_x, max_x + 1):
        for y in range(min_y, max_y + 1):
            candidate = (x, y)
            if candidate in pts:
                continue
            if any(is_point_on_edge(candidate, pts[i], pts[(i + 1) % n]) for i in range(n)):
                continue
            if _point_in_shape(candidate, pts):
                interior += 1
    return interior


def collect_boundary_points(vertices: Sequence[Point]) -> List[Point]:
    """Collect all lattice points on the polygon boundary."""
    pts = _validate_points(vertices)
    boundary = set()
    for i in range(len(pts)):
        start = pts[i]
        end = pts[(i + 1) % len(pts)]
        dx, dy = end[0] - start[0], end[1] - start[1]
        steps = gcd(abs(dx), abs(dy))
        if steps == 0:
            boundary.add(start)
            continue
        step_x, step_y = dx // steps, dy // steps
        for j in range(steps + 1):
            boundary.add((start[0] + step_x * j, start[1] + step_y * j))
    return sorted(boundary)


def collect_interior_points(vertices: Sequence[Point]) -> List[Point]:
    """Collect all lattice points strictly inside the polygon."""
    pts = _validate_points(vertices)
    min_x = min(p[0] for p in pts)
    max_x = max(p[0] for p in pts)
    min_y = min(p[1] for p in pts)
    max_y = max(p[1] for p in pts)

    interior = []
    n = len(pts)
    for x in range(min_x, max_x + 1):
        for y in range(min_y, max_y + 1):
            candidate = (x, y)
            if candidate in pts:
                continue
            if any(is_point_on_edge(candidate, pts[i], pts[(i + 1) % n]) for i in range(n)):
                continue
            if _point_in_shape(candidate, pts):
                interior.append(candidate)
    return interior


def compute_snapshot(vertices: Sequence[Point]) -> dict:
    """
    Compute a complete snapshot of polygon statistics.
    
    Returns a dictionary with:
    - area: The polygon area
    - boundary: Number of boundary lattice points
    - interior: Number of interior lattice points
    - boundary_points: List of boundary point coordinates
    - interior_points: List of interior point coordinates
    """
    pts = [tuple(int(v) for v in pair) for pair in vertices]
    return {
        "area": get_polygon_area(pts),
        "boundary": get_boundary_points(pts),
        "interior": get_interior_points(pts),
        "boundary_points": collect_boundary_points(pts),
        "interior_points": collect_interior_points(pts),
    }


def _segment_interior_lattice_points(start: Point, end: Point) -> Tuple[int, List[Point]]:
    """Get interior lattice points on a line segment (excluding endpoints)."""
    dx, dy = end[0] - start[0], end[1] - start[1]
    steps = gcd(abs(dx), abs(dy))
    if steps <= 1:
        return 0, []
    step_x, step_y = dx // steps, dy // steps
    points = [
        (start[0] + step_x * i, start[1] + step_y * i)
        for i in range(1, steps)
    ]
    return steps - 1, points


def compute_additive_snapshot(vertices: Sequence[Point]) -> dict:
    """
    Compute snapshot for two triangles sharing an edge (quadrilateral).
    
    Expects exactly 4 vertices forming a convex quadrilateral where
    vertices[0] and vertices[2] define the shared diagonal.
    
    Returns a dictionary with:
    - t1: Snapshot for triangle (v0, v1, v2)
    - t2: Snapshot for triangle (v0, v3, v2)
    - union: Snapshot for the full quadrilateral
    - shared_edge: Info about the shared diagonal
    """
    pts = _validate_points(vertices)
    if len(pts) != 4:
        raise ValueError("Additive snapshot expects exactly four vertices.")
    a, b, c, d = pts

    triangle_one = compute_snapshot((a, b, c))
    triangle_two = compute_snapshot((a, d, c))
    union = compute_snapshot(pts)

    edge_interior_count, edge_interior_points = _segment_interior_lattice_points(a, c)

    return {
        "t1": triangle_one,
        "t2": triangle_two,
        "union": union,
        "shared_edge": {
            "points": edge_interior_points,
            "interior_count": edge_interior_count,
            "endpoints": [a, c]
        },
    }

