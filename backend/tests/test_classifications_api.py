"""
Testy dla endpointu /api/classifications/{type}
"""

from fastapi.testclient import TestClient
from app import app

client = TestClient(app)

valid_types = ["risky", "growing", "high-credit-needs", "stable"]


def test_classifications_all_types_ok():
    for t in valid_types:
        resp = client.get(f"/api/classifications/{t}?limit=5")
        assert resp.status_code == 200
        data = resp.json()
        assert data["classification_type"] == t
        assert "branches" in data
        assert "criteria" in data
        assert len(data["branches"]) <= 5


def test_classifications_invalid_type():
    resp = client.get("/api/classifications/unknown")
    assert resp.status_code == 400


def test_classifications_limit_bounds():
    resp = client.get("/api/classifications/risky?limit=1")
    assert resp.status_code == 200
    assert len(resp.json()["branches"]) <= 1
    resp = client.get("/api/classifications/risky?limit=60")
    assert resp.status_code == 422  # validation error for >50


def test_classifications_structure_branch():
    resp = client.get("/api/classifications/risky?limit=2")
    assert resp.status_code == 200
    data = resp.json()
    if data["branches"]:
        b = data["branches"][0]
        for key in ("code", "name", "section", "scores", "classification"):
            assert key in b
