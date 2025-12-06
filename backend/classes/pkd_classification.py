"""
PKD Classification Module
Zawiera klasy do reprezentacji hierarchii Polskiej Klasyfikacji Działalności (PKD)
"""

from enum import Enum
from dataclasses import dataclass
from typing import Dict, List, Optional
from pathlib import Path


class PKDVersion(Enum):
    """Wersje klasyfikacji PKD"""
    VERSION_2007 = "2007"
    VERSION_2025 = "2025"


class PKDLevel(Enum):
    """Poziomy hierarchii PKD"""
    SECTION = "section"      # Sekcja (A-U)
    DIVISION = "division"    # Dział (2-cyfrowy, np. 46)
    GROUP = "group"          # Grupa (1-2 cyfrowy, np. 46.1 lub 46.11)
    SUBCLASS = "subclass"    # Podklasa (litera, np. A)


@dataclass
class PKDCode:
    """Reprezentacja pojedynczego kodu PKD"""
    symbol: str          # Pełny symbol, np. "46.11.A"
    name: str            # Opisowa nazwa
    level: PKDLevel      # Jaki to poziom hierarchii
    section: Optional[str] = None      # Sekcja (A-U)
    division: Optional[str] = None     # Dział (2-cyfrowy)
    group: Optional[str] = None        # Grupa (np. 46.1 lub 46.11)
    subclass: Optional[str] = None     # Podklasa (litera)
    
    def get_hierarchy_path(self) -> Dict[str, str]:
        """Zwraca pełną ścieżkę hierarchii"""
        path = {}
        if self.section:
            path["section"] = self.section
        if self.division:
            path["division"] = self.division
        if self.group:
            path["group"] = self.group
        if self.subclass:
            path["subclass"] = self.subclass
        return path
    
    def __str__(self) -> str:
        return f"{self.symbol} - {self.name}"
    
    def __repr__(self) -> str:
        return f"PKDCode(symbol={self.symbol}, level={self.level.value})"


class PKDHierarchy:
    """
    Reprezentacja całej hierarchii PKD dla jednej wersji.
    Umożliwia szybkie wyszukiwanie kodów na różnych poziomach.
    """
    
    def __init__(self, version: PKDVersion):
        self.version = version
        
        # Indeksy danych
        self.codes: Dict[str, PKDCode] = {}  # symbol → PKDCode
        self.section_index: Dict[str, List[str]] = {}  # section → list[symbols]
        self.division_index: Dict[str, List[str]] = {}  # division → list[symbols]
        self.group_index: Dict[str, List[str]] = {}  # group → list[symbols]
        self.subclass_index: Dict[str, List[str]] = {}  # subclass → list[symbols]
    
    def add_code(self, code: PKDCode) -> None:
        """Dodaj kod do hierarchii i zaktualizuj indeksy"""
        self.codes[code.symbol] = code
        
        # Dodaj do indeksów
        if code.section:
            if code.section not in self.section_index:
                self.section_index[code.section] = []
            self.section_index[code.section].append(code.symbol)
        
        if code.division:
            if code.division not in self.division_index:
                self.division_index[code.division] = []
            self.division_index[code.division].append(code.symbol)
        
        if code.group:
            if code.group not in self.group_index:
                self.group_index[code.group] = []
            self.group_index[code.group].append(code.symbol)
        
        if code.subclass:
            if code.subclass not in self.subclass_index:
                self.subclass_index[code.subclass] = []
            self.subclass_index[code.subclass].append(code.symbol)
    
    def get_by_symbol(self, symbol: str) -> Optional[PKDCode]:
        """Zwróć kod PKD po symbolu"""
        return self.codes.get(symbol)
    
    def get_by_section(self, section: str) -> List[PKDCode]:
        """Zwróć wszystkie kody w sekcji"""
        symbols = self.section_index.get(section, [])
        return [self.codes[sym] for sym in symbols if sym in self.codes]
    
    def get_by_division(self, division: str) -> List[PKDCode]:
        """Zwróć wszystkie kody w dziale"""
        symbols = self.division_index.get(division, [])
        return [self.codes[sym] for sym in symbols if sym in self.codes]
    
    def get_by_group(self, group: str) -> List[PKDCode]:
        """Zwróć wszystkie kody w grupie"""
        symbols = self.group_index.get(group, [])
        return [self.codes[sym] for sym in symbols if sym in self.codes]
    
    def get_by_subclass(self, subclass: str) -> List[PKDCode]:
        """Zwróć wszystkie kody z podklasą"""
        symbols = self.subclass_index.get(subclass, [])
        return [self.codes[sym] for sym in symbols if sym in self.codes]
    
    def validate_hierarchy(
        self,
        section: Optional[str] = None,
        division: Optional[str] = None,
        group: Optional[str] = None,
        subclass: Optional[str] = None
    ) -> bool:
        """
        Waliduj hierarchię - sprawdź czy parametry tworzą prawidłową ścieżkę.
        
        Reguły:
        - Jeśli division podany, to section musi być podany
        - Jeśli group podany, to division musi być podany
        - Jeśli subclass podany, to group musi być podany
        """
        if division is not None and section is None:
            return False
        
        if group is not None and division is None:
            return False
        
        if subclass is not None and group is None:
            return False
        
        return True
    
    def get_codes_by_hierarchy(
        self,
        section: Optional[str] = None,
        division: Optional[str] = None,
        group: Optional[str] = None,
        subclass: Optional[str] = None
    ) -> List[PKDCode]:
        """
        Zwróć kody PKD na podstawie hierarchii.
        Obsługuje wielopoziomowe zapytania z walidacją.
        
        Przykłady:
        - get_codes_by_hierarchy(section="A") → wszystkie kody w sekcji A
        - get_codes_by_hierarchy(section="A", division="46") → wszystkie kody w dziale 46
        - get_codes_by_hierarchy(section="A", division="46", group="11") → grupa 46.11
        - get_codes_by_hierarchy(section="A", division="46", group="11", subclass="A") → kod 46.11.A
        """
        
        # Walidacja hierarchii
        if not self.validate_hierarchy(section, division, group, subclass):
            raise ValueError(
                "Nieprawidłowa hierarchia: "
                "jeśli division, to wymaga section; "
                "jeśli group, to wymaga division; "
                "jeśli subclass, to wymaga group"
            )
        
        # Jeśli podany pełny kod
        if subclass is not None:
            # group może być już w formacie "46.11" lub "11"
            full_group = f"{division}.{group}" if not group.startswith(f"{division}.") else group
            code = self.get_by_symbol(f"{full_group}.{subclass}")
            return [code] if code else []
        
        # Jeśli podana grupa
        if group is not None:
            full_group = f"{division}.{group}" if not group.startswith(f"{division}.") else group
            return self.get_by_group(full_group)
        
        # Jeśli podany dział
        if division is not None:
            return self.get_by_division(division)
        
        # Jeśli podana sekcja
        if section is not None:
            return self.get_by_section(section)
        
        # Jeśli nic nie podano, zwróć wszystkie
        return list(self.codes.values())
    
    def __len__(self) -> int:
        """Liczba kodów w hierarchii"""
        return len(self.codes)
    
    def __str__(self) -> str:
        return f"PKDHierarchy(version={self.version.value}, codes={len(self.codes)})"
