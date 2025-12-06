"""
Testy dla endpointu /api/economy/snapshot
"""

from fastapi.testclient import TestClient
from app import app

client = TestClient(app)


def test_snapshot_basic():
    resp = client.get("/api/economy/snapshot")
    assert resp.status_code == 200
    data = resp.json()
    for key in ("year", "version", "overall_health", "top_performers", "risk_areas", "sections_overview"):
        assert key in data
    health = data["overall_health"]
    assert "score" in health and "classification" in health
    assert isinstance(data["sections_overview"], list)


def test_snapshot_year_param():
    resp = client.get("/api/economy/snapshot?year=2023")
    assert resp.status_code == 200
    data = resp.json()
    assert data["year"] == 2023


def test_snapshot_version_2007():
    resp = client.get("/api/economy/snapshot?version=2007")
    assert resp.status_code == 200
    data = resp.json()
    assert data["version"] == "2007"
