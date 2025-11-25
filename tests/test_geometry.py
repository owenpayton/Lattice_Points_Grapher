import pytest

from lattice_triangle.geometry import (
    get_boundary_points,
    get_interior_points,
    get_polygon_area,
    is_point_on_edge,
)


def test_right_triangle_metrics():
    vertices = [(0, 0), (4, 0), (0, 3)]
    assert get_polygon_area(vertices) == 6.0
    assert get_boundary_points(vertices) == 8
    assert get_interior_points(vertices) == 3


def test_orientation_invariant():
    vertices = [(0, 3), (0, 0), (4, 0)]
    assert get_polygon_area(vertices) == pytest.approx(6.0)
    assert get_interior_points(vertices) == 3


def test_no_interior_unit_triangle():
    vertices = [(0, 0), (1, 0), (0, 1)]
    assert get_polygon_area(vertices) == 0.5
    assert get_boundary_points(vertices) == 3
    assert get_interior_points(vertices) == 0


def test_colinear_vertices_have_zero_area_and_no_interior():
    vertices = [(0, 0), (2, 0), (4, 0)]
    assert get_polygon_area(vertices) == 0.0
    assert get_interior_points(vertices) == 0


def test_is_point_on_edge_detection():
    start, end = (0, 0), (3, 3)
    assert is_point_on_edge((1, 1), start, end)
    assert is_point_on_edge((0, 0), start, end)
    assert not is_point_on_edge((2, 1), start, end)
