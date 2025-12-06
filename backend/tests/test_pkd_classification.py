"""
Testy dla PKD Classification
"""

import pytest
from classes.pkd_classification import PKDCode, PKDHierarchy, PKDLevel, PKDVersion


class TestPKDCode:
    """Testy dla klasy PKDCode"""
    
    def test_create_pkd_code(self):
        """Test tworzenia kodu PKD"""
        code = PKDCode(
            symbol="46.11.A",
            name="Sprzedaż hurtowa zbóż i nasion oleistych",
            level=PKDLevel.SUBCLASS,
            section="G",
            division="46",
            group="46.11",
            subclass="A"
        )
        assert code.symbol == "46.11.A"
        assert code.section == "G"
        assert code.division == "46"
        assert code.group == "46.11"
        assert code.subclass == "A"
    
    def test_pkd_code_hierarchy_path(self):
        """Test zwracania ścieżki hierarchii"""
        code = PKDCode(
            symbol="46.11.A",
            name="Test",
            level=PKDLevel.SUBCLASS,
            section="G",
            division="46",
            group="46.11",
            subclass="A"
        )
        path = code.get_hierarchy_path()
        assert "section" in path
        assert path["section"] == "G"
        assert path["division"] == "46"


class TestPKDHierarchy:
    """Testy dla klasy PKDHierarchy"""
    
    @pytest.fixture
    def hierarchy(self):
        """Fixture - hierarchia z przykładowymi kodami"""
        h = PKDHierarchy(PKDVersion.VERSION_2025)
        
        # Dodaj przykładowe kody
        codes = [
            PKDCode("A", "ROLNICTWO", PKDLevel.SECTION, section="A"),
            PKDCode("01", "Uprawy rolne", PKDLevel.DIVISION, section="A", division="01"),
            PKDCode("01.1", "Uprawy rolne inne", PKDLevel.GROUP, section="A", division="01", group="01.1"),
            PKDCode("01.11", "Uprawa zbóż", PKDLevel.GROUP, section="A", division="01", group="01.11"),
            PKDCode("01.11.Z", "Uprawa zbóż - podklasa", PKDLevel.SUBCLASS, 
                   section="A", division="01", group="01.11", subclass="Z"),
            
            PKDCode("G", "HANDEL", PKDLevel.SECTION, section="G"),
            PKDCode("46", "Handel hurtowy", PKDLevel.DIVISION, section="G", division="46"),
            PKDCode("46.1", "Handel zbóż", PKDLevel.GROUP, section="G", division="46", group="46.1"),
            PKDCode("46.11", "Sprzedaż zbóż hurtowa", PKDLevel.GROUP, section="G", division="46", group="46.11"),
            PKDCode("46.11.A", "Sprzedaż zbóż - wersja A", PKDLevel.SUBCLASS, 
                   section="G", division="46", group="46.11", subclass="A"),
        ]
        
        for code in codes:
            h.add_code(code)
        
        return h
    
    def test_add_code(self, hierarchy):
        """Test dodawania kodów"""
        assert len(hierarchy) == 10
        assert hierarchy.get_by_symbol("46.11.A") is not None
    
    def test_get_by_section(self, hierarchy):
        """Test pobierania kodów po sekcji"""
        codes_g = hierarchy.get_by_section("G")
        assert len(codes_g) == 5  # G, 46, 46.1, 46.11, 46.11.A
        
        codes_a = hierarchy.get_by_section("A")
        assert len(codes_a) == 5  # A, 01, 01.1, 01.11, 01.11.Z
    
    def test_get_by_division(self, hierarchy):
        """Test pobierania kodów po dziale"""
        codes_46 = hierarchy.get_by_division("46")
        assert len(codes_46) == 4  # 46, 46.1, 46.11, 46.11.A
        
        codes_01 = hierarchy.get_by_division("01")
        assert len(codes_01) == 4  # 01, 01.1, 01.11, 01.11.Z
    
    def test_validate_hierarchy_valid(self, hierarchy):
        """Test validacji - prawidłowe hierarchie"""
        assert hierarchy.validate_hierarchy(section="A") == True
        assert hierarchy.validate_hierarchy(section="A", division="01") == True
        assert hierarchy.validate_hierarchy(section="A", division="01", group="01.11") == True
        assert hierarchy.validate_hierarchy(section="A", division="01", group="01.11", subclass="Z") == True
    
    def test_validate_hierarchy_invalid(self, hierarchy):
        """Test validacji - nieprawidłowe hierarchie"""
        # division bez section
        assert hierarchy.validate_hierarchy(division="01") == False
        # group bez division
        assert hierarchy.validate_hierarchy(group="01.11") == False
        # subclass bez group
        assert hierarchy.validate_hierarchy(subclass="Z") == False
        # group bez section
        assert hierarchy.validate_hierarchy(section="A", group="01.11") == False
    
    def test_get_codes_by_hierarchy_section(self, hierarchy):
        """Test pobierania kodów - tylko sekcja"""
        codes = hierarchy.get_codes_by_hierarchy(section="G")
        assert len(codes) == 5
        assert all(c.section == "G" for c in codes)
    
    def test_get_codes_by_hierarchy_division(self, hierarchy):
        """Test pobierania kodów - sekcja + dział"""
        codes = hierarchy.get_codes_by_hierarchy(section="G", division="46")
        assert len(codes) == 4
        assert all(c.division == "46" for c in codes)
    
    def test_get_codes_by_hierarchy_group(self, hierarchy):
        """Test pobierania kodów - sekcja + dział + grupa"""
        codes = hierarchy.get_codes_by_hierarchy(section="G", division="46", group="46.11")
        assert len(codes) == 2  # 46.11 i 46.11.A
    
    def test_get_codes_by_hierarchy_subclass(self, hierarchy):
        """Test pobierania kodów - pełny kod"""
        codes = hierarchy.get_codes_by_hierarchy(section="G", division="46", group="46.11", subclass="A")
        assert len(codes) == 1
        assert codes[0].symbol == "46.11.A"
    
    def test_get_codes_by_hierarchy_invalid(self, hierarchy):
        """Test pobierania kodów - nieprawidłowa hierarchia"""
        with pytest.raises(ValueError):
            hierarchy.get_codes_by_hierarchy(division="46")  # bez section
        
        with pytest.raises(ValueError):
            hierarchy.get_codes_by_hierarchy(section="G", group="46.11")  # bez division
    
    def test_get_codes_by_hierarchy_all(self, hierarchy):
        """Test pobierania wszystkich kodów"""
        codes = hierarchy.get_codes_by_hierarchy()
        assert len(codes) == 10


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
