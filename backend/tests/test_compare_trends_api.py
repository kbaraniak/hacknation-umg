"""
Testy dla endpointów /compare i /trends
"""

from fastapi.testclient import TestClient
from app import app

client = TestClient(app)


def test_compare_basic():
    resp = client.get("/api/compare?codes=46,47")
    assert resp.status_code == 200
    data = resp.json()
    assert "comparison" in data and len(data["comparison"]) >= 1
    assert "relative_comparison" in data


def test_compare_with_years():
    resp = client.get("/api/compare?codes=46&years=2018-2024")
    assert resp.status_code == 200
    data = resp.json()
    assert data["input_codes"] == ["46"]


def test_compare_invalid_years():
    resp = client.get("/api/compare?codes=46&years=bad")
    assert resp.status_code == 400


def test_trends_basic():
    resp = client.get("/api/trends?sections=G,C")
    assert resp.status_code == 200
    data = resp.json()
    assert "sections_data" in data
    assert "chart_ready_data" in data


def test_trends_invalid_years():
    resp = client.get("/api/trends?sections=G&years=bad")
    assert resp.status_code == 400
