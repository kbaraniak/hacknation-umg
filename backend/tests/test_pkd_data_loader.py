"""
Testy dla PKD Data Loader
"""

import pytest
from pathlib import Path
from classes.pkd_data_loader import PKDDataLoader, FinancialMetrics, BankruptcyData, PKDMapper
from classes.pkd_classification import PKDVersion


class TestFinancialMetrics:
    """Testy dla klasy FinancialMetrics"""
    
    def test_create_financial_metrics(self):
        """Test tworzenia metryki finansowej"""
        metrics = FinancialMetrics(
            year=2023,
            revenue=1000000,
            net_income=100000
        )
        assert metrics.year == 2023
        assert metrics.revenue == 1000000
        assert metrics.net_income == 100000
    
    def test_profitability_ratio(self):
        """Test obliczania rentowności"""
        metrics = FinancialMetrics(
            year=2023,
            revenue=1000000,
            net_income=100000
        )
        ratio = metrics.get_profitability_ratio()
        assert ratio == 0.1  # 100000 / 1000000 = 0.1
    
    def test_profitability_ratio_none(self):
        """Test rentowności gdy brak danych"""
        metrics = FinancialMetrics(year=2023)
        assert metrics.get_profitability_ratio() is None
    
    def test_margin_ratio(self):
        """Test obliczania marży"""
        metrics = FinancialMetrics(
            year=2023,
            revenue=1000000,
            operating_income=200000
        )
        ratio = metrics.get_margin_ratio()
        assert ratio == 0.2  # 200000 / 1000000 = 0.2


class TestBankruptcyData:
    """Testy dla klasy BankruptcyData"""
    
    def test_create_bankruptcy_data(self):
        """Test tworzenia danych o upadłościach"""
        data = BankruptcyData(year=2023, bankruptcy_count=15)
        assert data.year == 2023
        assert data.bankruptcy_count == 15


class TestPKDMapper:
    """Testy dla mapowania PKD"""
    
    @pytest.fixture
    def data_dir(self):
        """Zwróć ścieżkę do danych"""
        return Path(__file__).parent.parent / "data"
    
    def test_mapper_initialization(self, data_dir):
        """Test inicjalizacji mappera"""
        if not (data_dir / "MAP_PKD_2007_2025.csv").exists():
            pytest.skip("Plik mapowania nie istnieje")
        
        mapper = PKDMapper(data_dir)
        assert len(mapper.mapping_2007_to_2025) > 0
        assert len(mapper.mapping_2025_to_2007) > 0
    
    def test_mapper_translate(self, data_dir):
        """Test tłumaczenia kodów"""
        if not (data_dir / "MAP_PKD_2007_2025.csv").exists():
            pytest.skip("Plik mapowania nie istnieje")
        
        mapper = PKDMapper(data_dir)
        
        # Test tłumaczenia 2007 → 2025
        code_2025 = mapper.translate("01", PKDVersion.VERSION_2007, PKDVersion.VERSION_2025)
        assert code_2025 is not None
        
        # Test tłumaczenia 2025 → 2007
        code_2007 = mapper.translate(code_2025, PKDVersion.VERSION_2025, PKDVersion.VERSION_2007)
        assert code_2007 == "01"
    
    def test_mapper_same_version(self, data_dir):
        """Test translacji na tę samą wersję"""
        if not (data_dir / "MAP_PKD_2007_2025.csv").exists():
            pytest.skip("Plik mapowania nie istnieje")
        
        mapper = PKDMapper(data_dir)
        code = mapper.translate("01", PKDVersion.VERSION_2007, PKDVersion.VERSION_2007)
        assert code == "01"


class TestPKDDataLoader:
    """Testy dla PKDDataLoader"""
    
    @pytest.fixture
    def data_dir(self):
        """Zwróć ścieżkę do danych"""
        return Path(__file__).parent.parent / "data"
    
    def test_loader_initialization(self, data_dir):
        """Test inicjalizacji loadera"""
        loader = PKDDataLoader(data_dir)
        assert not loader._loaded
        assert loader.data_dir == data_dir
    
    def test_loader_load_all(self, data_dir):
        """Test załadowania wszystkich danych"""
        if not (data_dir / "PKD_2007.csv").exists():
            pytest.skip("Pliki PKD nie istnieją")
        
        loader = PKDDataLoader(data_dir)
        loader.load_all()
        
        assert loader._loaded
        assert loader.hierarchy_2007 is not None
        assert loader.hierarchy_2025 is not None
        assert loader.mapper is not None
        assert len(loader.financial_data) > 0
    
    def test_loader_get_hierarchy(self, data_dir):
        """Test pobierania hierarchii"""
        if not (data_dir / "PKD_2007.csv").exists():
            pytest.skip("Pliki PKD nie istnieją")
        
        loader = PKDDataLoader(data_dir)
        
        hierarchy_2007 = loader.get_hierarchy(PKDVersion.VERSION_2007)
        assert hierarchy_2007 is not None
        assert len(hierarchy_2007) > 0
        
        hierarchy_2025 = loader.get_hierarchy(PKDVersion.VERSION_2025)
        assert hierarchy_2025 is not None
        assert len(hierarchy_2025) > 0
    
    def test_loader_get_financial_metrics(self, data_dir):
        """Test pobierania metryk finansowych"""
        if not (data_dir / "PKD_2007.csv").exists():
            pytest.skip("Pliki nie istnieją")
        
        loader = PKDDataLoader(data_dir)
        
        # Pobierz metryki dla "OG" (ogółem)
        metrics = loader.get_financial_metrics("OG")
        assert isinstance(metrics, dict)
        
        if len(metrics) > 0:
            # Sprawdź czy wartości to FinancialMetrics
            first_year = list(metrics.keys())[0]
            assert isinstance(metrics[first_year], FinancialMetrics)
    
    def test_loader_get_bankruptcy_count(self, data_dir):
        """Test pobierania liczby upadłości"""
        if not (data_dir / "krz_pkd.csv").exists():
            pytest.skip("Plik upadłości nie istnieje")
        
        loader = PKDDataLoader(data_dir)
        
        # Pobierz liczbę upadłości
        count = loader.get_bankruptcy_count("0111Z", 2018)
        assert isinstance(count, int)
    
    def test_parse_symbol_section(self, data_dir):
        """Test parsowania sekcji"""
        loader = PKDDataLoader(data_dir)
        
        section, division, group, subclass = loader._parse_symbol("A")
        assert section == "A"
        assert division is None
        assert group is None
        assert subclass is None
    
    def test_parse_symbol_division(self, data_dir):
        """Test parsowania działu"""
        loader = PKDDataLoader(data_dir)
        
        section, division, group, subclass = loader._parse_symbol("46")
        assert section is None
        assert division == "46"
        assert group is None
        assert subclass is None
    
    def test_parse_symbol_group(self, data_dir):
        """Test parsowania grupy"""
        loader = PKDDataLoader(data_dir)
        
        section, division, group, subclass = loader._parse_symbol("46.11")
        assert section is None
        assert division == "46"
        assert group == "46.11"
        assert subclass is None
    
    def test_parse_symbol_subclass(self, data_dir):
        """Test parsowania podklasy"""
        loader = PKDDataLoader(data_dir)
        
        section, division, group, subclass = loader._parse_symbol("46.11.A")
        assert section is None
        assert division == "46"
        assert group == "46.11"
        assert subclass == "A"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
