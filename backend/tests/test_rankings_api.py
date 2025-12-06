"""
Testy dla nowych endpointów: /rankings, /economy/snapshot, /classifications
"""

import pytest
from fastapi.testclient import TestClient
from app import app

client = TestClient(app)


class TestRankingsEndpoint:
    """Testy dla /api/rankings"""
    
    def test_rankings_default(self):
        """Test podstawowego wywołania rankings"""
        response = client.get("/api/rankings")
        assert response.status_code == 200
        
        data = response.json()
        assert "level" in data
        assert "version" in data
        assert "total_count" in data
        assert "rankings" in data
        assert "filters_applied" in data
        
        # Default parametry
        assert data["level"] == "division"
        assert data["version"] == "2025"
        assert len(data["rankings"]) <= 20
    
    def test_rankings_by_section(self):
        """Test rankings na poziomie sekcji"""
        response = client.get("/api/rankings?level=section&limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert data["level"] == "section"
        assert len(data["rankings"]) <= 10
        
        # Sprawdź strukturę pojedynczego elementu
        if data["rankings"]:
            item = data["rankings"][0]
            assert "rank" in item
            assert "pkd_code" in item
            assert "name" in item
            assert "scores" in item
            assert "classification" in item
            assert "metrics_summary" in item
    
    def test_rankings_sort_by_growth(self):
        """Test sortowania po wzroście"""
        response = client.get("/api/rankings?sort_by=growth&limit=5")
        assert response.status_code == 200
        
        data = response.json()
        rankings = data["rankings"]
        
        # Sprawdź czy posortowane malejąco po growth
        if len(rankings) > 1:
            for i in range(len(rankings) - 1):
                assert rankings[i]["scores"]["growth"] >= rankings[i+1]["scores"]["growth"]
    
    def test_rankings_sort_by_risk(self):
        """Test sortowania po ryzyku"""
        response = client.get("/api/rankings?sort_by=risk&limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert data["filters_applied"]["sort_by"] == "risk"
    
    def test_rankings_invalid_level(self):
        """Test nieprawidłowego poziomu"""
        response = client.get("/api/rankings?level=invalid")
        assert response.status_code == 400
    
    def test_rankings_limit_bounds(self):
        """Test granic limitu"""
        # Min
        response = client.get("/api/rankings?limit=1")
        assert response.status_code == 200
        assert len(response.json()["rankings"]) <= 1
        
        # Max
        response = client.get("/api/rankings?limit=100")
        assert response.status_code == 200
        
        # Ponad max (powinno być odrzucone przez walidację)
        response = client.get("/api/rankings?limit=150")
        assert response.status_code == 422  # Validation error
    
    def test_rankings_version_2007(self):
        """Test z wersją PKD 2007"""
        response = client.get("/api/rankings?version=2007&limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert data["version"] == "2007"
    
    def test_rankings_scores_structure(self):
        """Test struktury scores"""
        response = client.get("/api/rankings?limit=1")
        assert response.status_code == 200
        
        data = response.json()
        if data["rankings"]:
            scores = data["rankings"][0]["scores"]
            assert "overall" in scores
            assert "size" in scores
            assert "profitability" in scores
            assert "growth" in scores
            assert "risk" in scores
            
            # Sprawdź zakresy (0-25 dla każdego, 0-100 dla overall)
            assert 0 <= scores["overall"] <= 100
            assert 0 <= scores["size"] <= 25
            assert 0 <= scores["profitability"] <= 25
            assert 0 <= scores["growth"] <= 25
            assert 0 <= scores["risk"] <= 25
    
    def test_rankings_classification_structure(self):
        """Test struktury classification"""
        response = client.get("/api/rankings?limit=1")
        assert response.status_code == 200
        
        data = response.json()
        if data["rankings"]:
            classification = data["rankings"][0]["classification"]
            assert "category" in classification
            assert "status" in classification
            assert "credit_needs" in classification
            
            # Sprawdź dozwolone wartości
            assert classification["category"] in ["ZDROWA", "STABILNA", "ZAGROŻONA", "KRYZYS"]
            assert classification["status"] in ["ROSNĄCA", "STAGNACJA", "SPADAJĄCA"]
            assert classification["credit_needs"] in ["NISKIE", "ŚREDNIE", "WYSOKIE"]
    
    def test_rankings_metrics_summary(self):
        """Test metrics_summary"""
        response = client.get("/api/rankings?limit=1")
        assert response.status_code == 200
        
        data = response.json()
        if data["rankings"]:
            metrics = data["rankings"][0]["metrics_summary"]
            assert "revenue_2024" in metrics
            assert "yoy_growth" in metrics
            assert "bankruptcy_rate" in metrics
            
            # Wartości numeryczne
            assert isinstance(metrics["revenue_2024"], (int, float))
            assert isinstance(metrics["yoy_growth"], (int, float))
            assert isinstance(metrics["bankruptcy_rate"], (int, float))


class TestRankingsPerformance:
    """Testy wydajnościowe"""
    
    def test_rankings_response_time(self):
        """Ranking powinien odpowiadać w rozsądnym czasie"""
        import time
        
        start = time.time()
        response = client.get("/api/rankings?limit=10")
        elapsed = time.time() - start
        
        assert response.status_code == 200
        assert elapsed < 30  # Maksymalnie 30 sekund (może być wolne przy pierwszym wywołaniu)
    
    def test_rankings_different_levels(self):
        """Test że różne poziomy zwracają różne dane"""
        response_section = client.get("/api/rankings?level=section&limit=5")
        response_division = client.get("/api/rankings?level=division&limit=5")
        
        assert response_section.status_code == 200
        assert response_division.status_code == 200
        
        # Powinny mieć różną liczbę elementów
        # (sekcji jest mniej niż działów)
        data_section = response_section.json()
        data_division = response_division.json()
        
        assert data_section["total_count"] < data_division["total_count"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
