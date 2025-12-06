"""
Testy dla PKD Data Service
"""

import pytest
from pathlib import Path
from classes.pkd_data_service import PKDDataService, IndustryData
from classes.pkd_classification import PKDVersion


class TestIndustryData:
    """Testy dla klasy IndustryData"""
    
    def test_create_industry_data(self):
        """Test tworzenia IndustryData"""
        from classes.pkd_classification import PKDCode, PKDLevel
        
        code = PKDCode(
            symbol="46.11.A",
            name="Test",
            level=PKDLevel.SUBCLASS,
            section="G",
            division="46",
            group="46.11",
            subclass="A"
        )
        
        data = IndustryData(pkd_codes=[code])
        assert len(data.pkd_codes) == 1
        assert data.version == PKDVersion.VERSION_2025


class TestPKDDataService:
    """Testy dla PKDDataService"""
    
    @pytest.fixture
    def data_dir(self):
        """Zwróć ścieżkę do danych"""
        return Path(__file__).parent.parent / "data"
    
    @pytest.fixture
    def service(self, data_dir):
        """Fixture - serwis z danymi"""
        if not (data_dir / "PKD_2025.csv").exists():
            pytest.skip("Pliki danych nie istnieją")
        return PKDDataService(data_dir)
    
    def test_service_initialization(self, service):
        """Test inicjalizacji serwisu"""
        assert service.default_version == PKDVersion.VERSION_2025
        assert service.loader is not None
    
    def test_get_data_all(self, service):
        """Test pobierania wszystkich danych"""
        data = service.get_data()
        
        assert isinstance(data, IndustryData)
        assert len(data.pkd_codes) > 0
        assert data.query_params["version"] == "2025"
    
    def test_get_data_by_section(self, service):
        """Test pobierania danych po sekcji"""
        data = service.get_data(section="A")
        
        assert isinstance(data, IndustryData)
        assert len(data.pkd_codes) > 0
        assert all(c.section == "A" for c in data.pkd_codes)
    
    def test_get_data_by_division(self, service):
        """Test pobierania danych po dziale"""
        data = service.get_data(section="G", division="46")
        
        assert isinstance(data, IndustryData)
        assert len(data.pkd_codes) > 0
        assert all(c.division == "46" for c in data.pkd_codes)
    
    def test_get_data_with_version_2007(self, service):
        """Test pobierania danych dla wersji 2007"""
        data = service.get_data(section="A", version=PKDVersion.VERSION_2007)
        
        assert isinstance(data, IndustryData)
        assert data.version == PKDVersion.VERSION_2007
        assert data.query_params["version"] == "2007"
    
    def test_get_data_validation_error_division_without_section(self, service):
        """Test błędu walidacji - division bez section"""
        with pytest.raises(ValueError):
            service.get_data(division="46")
    
    def test_get_data_validation_error_group_without_division(self, service):
        """Test błędu walidacji - group bez division"""
        with pytest.raises(ValueError):
            service.get_data(section="G", group="11")
    
    def test_get_data_validation_error_subclass_without_group(self, service):
        """Test błędu walidacji - subclass bez group"""
        with pytest.raises(ValueError):
            service.get_data(section="G", division="46", subclass="A")
    
    def test_get_codes_for_section(self, service):
        """Test pobierania kodów dla sekcji"""
        codes = service.get_codes_for_section("A")
        
        assert isinstance(codes, list)
        assert len(codes) > 0
        assert all(c.section == "A" for c in codes)
    
    def test_get_codes_for_division(self, service):
        """Test pobierania kodów dla działu"""
        codes = service.get_codes_for_division("A", "01")
        
        assert isinstance(codes, list)
        assert len(codes) > 0
        assert all(c.division == "01" for c in codes)
    
    def test_translate_code(self, service):
        """Test tłumaczenia kodu"""
        # Spróbuj przetłumaczyć kod 2007 na 2025
        code_2025 = service.translate_code("01", PKDVersion.VERSION_2007, PKDVersion.VERSION_2025)
        
        if code_2025:  # Jeśli mapowanie istnieje
            assert code_2025 == "01"  # Kod 01 powinien się mapować sam na siebie
    
    def test_industry_data_get_summary_statistics(self, service):
        """Test pobierania statystyk podsumowania"""
        data = service.get_data(section="A")
        summary = data.get_summary_statistics()
        
        assert isinstance(summary, dict)
        assert "total_revenue" in summary
        assert "total_net_income" in summary
        assert "num_codes" in summary
        assert summary["num_codes"] > 0
    
    def test_industry_data_get_all_years(self, service):
        """Test pobierania dostępnych lat"""
        data = service.get_data(section="A")
        years = data.get_all_years()
        
        assert isinstance(years, list)
        # Powinny być jakieś lata dostępne
        if len(data.financial_data) > 0:
            assert len(years) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
