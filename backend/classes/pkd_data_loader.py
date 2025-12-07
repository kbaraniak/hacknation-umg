"""
PKD Data Loading Module
Zawiera klasy do wczytywania hierarchii PKD i danych finansowych z CSV
"""

import csv
import pandas as pd
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from classes.pkd_classification import PKDCode, PKDHierarchy, PKDLevel, PKDVersion


@dataclass
class FinancialMetrics:
    """Wskaźniki finansowe dla branży w danym roku"""
    year: int
    unit_count: Optional[float] = None              # EN - Liczba jednostek
    profitable_units: Optional[float] = None        # PEN - Liczba rentownych
    revenue: Optional[float] = None                 # GS - Przychody ogółem
    net_revenue: Optional[float] = None             # PNPM - Przychody netto
    revenue_from_sales: Optional[float] = None      # GS(I) - Przychody ze sprzedaży
    financial_income: Optional[float] = None        # Przych. fin. - Przychody finansowe
    other_operating_income: Optional[float] = None  # PPO - Pozostałe przychody operacyjne
    net_income: Optional[float] = None              # NP - Zysk netto
    operating_income: Optional[float] = None        # OP - Wynik na działalności operacyjnej
    sales_income: Optional[float] = None            # POS - Wynik na sprzedaży
    financial_surplus: Optional[float] = None       # CF - Nadwyżka finansowa
    total_costs: Optional[float] = None             # TC - Koszty ogółem
    other_financial_costs: Optional[float] = None   # OFE - Pozostałe koszty finansowe
    interest_expense: Optional[float] = None        # IP - Odsetki do zapłacenia
    depreciation: Optional[float] = None            # DEPR - Amortyzacja
    investments: Optional[float] = None             # IO - Wartość nakładów inwestycyjnych
    working_capital: Optional[float] = None         # NWC - Kapitał obrotowy
    cash_and_securities: Optional[float] = None     # C - Środki pieniężne i pap. wart.
    long_term_debt: Optional[float] = None          # LTL - Zobowiązania długoterminowe
    short_term_debt: Optional[float] = None         # STL - Zobowiązania krótkoterminowe
    long_term_credits: Optional[float] = None       # LTC - Długoterminowe kredyty bankowe
    short_term_credits: Optional[float] = None      # STC - Krótkoterminowe kredyty bankowe
    inventory: Optional[float] = None               # INV - Zapasy
    short_term_receivables: Optional[float] = None  # REC - Należności krótkoterminowe
    
    def get_profitability_ratio(self) -> Optional[float]:
        """Zwróć rentowność: zysk netto / przychody"""
        if self.net_income and self.revenue and self.revenue != 0:
            return self.net_income / self.revenue
        return None
    
    def get_debt_ratio(self) -> Optional[float]:
        """Zwróć wskaźnik zadłużenia: całkowity dług / aktywa"""
        total_debt = (self.long_term_debt or 0) + (self.short_term_debt or 0)
        if total_debt == 0:
            return None
        return total_debt
    
    def get_margin_ratio(self) -> Optional[float]:
        """Zwróć marżę: zysk operacyjny / przychody"""
        if self.operating_income and self.revenue and self.revenue != 0:
            return self.operating_income / self.revenue
        return None


@dataclass
class BankruptcyData:
    """Dane o upadłościach branży w danym roku"""
    year: int
    bankruptcy_count: int


class PKDMapper:
    """
    Mapowanie między wersjami PKD 2007 ↔ 2025
    """
    
    def __init__(self, data_dir: Path):
        self.data_dir = Path(data_dir)
        self.mapping_2007_to_2025: Dict[str, str] = {}
        self.mapping_2025_to_2007: Dict[str, str] = {}
        self._load_mappings()
    
    def _load_mappings(self) -> None:
        """Wczytaj mapowania z MAP_PKD_2007_2025.csv"""
        mapping_file = self.data_dir / "MAP_PKD_2007_2025.csv"
        
        if not mapping_file.exists():
            raise FileNotFoundError(f"Plik mapowania nie znaleziony: {mapping_file}")
        
        try:
            df = pd.read_csv(mapping_file)
            for _, row in df.iterrows():
                symbol_2007 = str(row['symbol_2007']).strip()
                symbol_2025 = str(row['symbol_2025']).strip()
                
                self.mapping_2007_to_2025[symbol_2007] = symbol_2025
                self.mapping_2025_to_2007[symbol_2025] = symbol_2007
        except Exception as e:
            raise RuntimeError(f"Błąd wczytywania mapowania: {e}")
    
    def translate(self, code: str, from_version: PKDVersion, to_version: PKDVersion) -> Optional[str]:
        """Przetłumacz kod PKD między wersjami"""
        if from_version == to_version:
            return code
        
        if from_version == PKDVersion.VERSION_2007 and to_version == PKDVersion.VERSION_2025:
            return self.mapping_2007_to_2025.get(code)
        
        if from_version == PKDVersion.VERSION_2025 and to_version == PKDVersion.VERSION_2007:
            return self.mapping_2025_to_2007.get(code)
        
        return None
    
    def validate_mapping(self, code: str, version: PKDVersion) -> bool:
        """Sprawdź czy kod ma mapowanie na drugą wersję"""
        if version == PKDVersion.VERSION_2007:
            return code in self.mapping_2007_to_2025
        elif version == PKDVersion.VERSION_2025:
            return code in self.mapping_2025_to_2007
        return False


class PKDDataLoader:
    """
    Główna klasa do wczytywania wszystkich danych PKD
    """
    
    def __init__(self, data_dir: Optional[Path] = None):
        if data_dir is None:
            data_dir = Path(__file__).parent.parent / "data"
        
        self.data_dir = Path(data_dir)
        
        # Hierarchie
        self.hierarchy_2007: Optional[PKDHierarchy] = None
        self.hierarchy_2025: Optional[PKDHierarchy] = None
        
        # Mapper
        self.mapper: Optional[PKDMapper] = None
        
        # Dane finansowe: symbol → rok → FinancialMetrics
        self.financial_data: Dict[str, Dict[int, FinancialMetrics]] = {}
        
        # Dane o upadłościach: symbol → rok → liczba upadłości
        self.bankruptcy_data: Dict[str, Dict[int, int]] = {}
        
        # Flaga załadowania
        self._loaded = False
    
    def load_all(self) -> None:
        """Załaduj wszystkie dane"""
        if self._loaded:
            return
        
        print("Ładowanie danych PKD...")
        self._load_pkd_hierarchies()
        self._load_mappings()
        self._load_financial_data()
        self._load_bankruptcy_data()
        
        self._loaded = True
        print("✓ Dane załadowane pomyślnie")
    
    def _load_pkd_hierarchies(self) -> None:
        """Wczytaj hierarchie PKD dla obu wersji"""
        print("  → Ładowanie hierarchii PKD...")
        
        self.hierarchy_2007 = self._load_single_hierarchy(
            PKDVersion.VERSION_2007,
            self.data_dir / "PKD_2007.csv"
        )
        
        self.hierarchy_2025 = self._load_single_hierarchy(
            PKDVersion.VERSION_2025,
            self.data_dir / "PKD_2025.csv"
        )
        
        print(f"    ✓ PKD 2007: {len(self.hierarchy_2007)} kodów")
        print(f"    ✓ PKD 2025: {len(self.hierarchy_2025)} kodów")
    
    def _load_single_hierarchy(self, version: PKDVersion, file_path: Path) -> PKDHierarchy:
        """Wczytaj hierarchię z jednego pliku CSV"""
        hierarchy = PKDHierarchy(version)
        
        if not file_path.exists():
            raise FileNotFoundError(f"Plik hierarchii nie znaleziony: {file_path}")
        
        try:
            df = pd.read_csv(file_path)
            
            # Śledzimy aktualną sekcję i dział, bo w CSV sekcja jest podana raz, a kolejne wiersze dziedziczą ją kontekstowo
            current_section = None
            current_division = None
            
            for _, row in df.iterrows():
                typ = str(row['typ']).strip()
                symbol = str(row['symbol']).strip()
                nazwa = str(row['nazwa']).strip()
                
                level_map = {
                    'SEKCJA': PKDLevel.SECTION,
                    'DZIAŁ': PKDLevel.DIVISION,
                    'GRUPA': PKDLevel.GROUP,
                    'KLASA': PKDLevel.GROUP,  # Klasa to też grupa
                    'PODKLASA': PKDLevel.SUBCLASS,
                }
                level = level_map.get(typ, PKDLevel.SUBCLASS)
                
                section, division, group, subclass = self._parse_symbol(symbol)
                
                if level == PKDLevel.SECTION:
                    current_section = section
                    current_division = None
                elif level == PKDLevel.DIVISION:
                    current_division = division
                    if section is None:
                        section = current_section
                else:  # GROUP lub SUBCLASS
                    if section is None:
                        section = current_section
                    if division is None:
                        division = current_division
                
                code = PKDCode(
                    symbol=symbol,
                    name=nazwa,
                    level=level,
                    section=section,
                    division=division,
                    group=group,
                    subclass=subclass
                )
                
                hierarchy.add_code(code)
        
        except Exception as e:
            raise RuntimeError(f"Błąd wczytywania hierarchii z {file_path}: {e}")
        
        return hierarchy
    
    def _parse_symbol(self, symbol: str) -> Tuple[Optional[str], Optional[str], Optional[str], Optional[str]]:
        """
        Parsuj symbol PKD na komponenty hierarchii
        Przykłady:
        - "A" → ("A", None, None, None)
        - "46" → (None, "46", None, None)
        - "46.1" → (None, "46", "46.1", None)
        - "46.11" → (None, "46", "46.11", None)
        - "46.11.A" → (None, "46", "46.11", "A")
        """
        section = None
        division = None
        group = None
        subclass = None
        
        # Jeśli to litera (A-U) to sekcja
        if len(symbol) == 1 and symbol.isalpha():
            section = symbol
        # Jeśli zawiera kropki - to dział/grupa/podklasa
        elif '.' in symbol:
            parts = symbol.split('.')
            division = parts[0]
            group = f"{parts[0]}.{parts[1]}"
            if len(parts) > 2:
                subclass = parts[2]
        # Jeśli to liczba - dział
        elif symbol.isdigit():
            division = symbol
        
        return section, division, group, subclass
    
    def _load_mappings(self) -> None:
        """Wczytaj mapowania PKD 2007 ↔ 2025"""
        print("  → Ładowanie mapowania PKD...")
        self.mapper = PKDMapper(self.data_dir)
        print(f"    ✓ {len(self.mapper.mapping_2007_to_2025)} mapowań załadowanych")
    
    def _normalize_pkd_key(self, code: str) -> str:
        """Normalizuj klucz PKD z formatu CSV do formatu hierarchii.
        
        Konwersje:
        - SEK_A → A, SEK_B → B, itd.
        - 01. → 01
        - 01.1 → 01.1 (zostaje bez zmian)
        - 01.11 → 01.11 (zostaje bez zmian)
        """
        code = code.strip()
        
        # Konwertuj SEK_X na X (sekcje)
        if code.startswith('SEK_'):
            return code[4:]  # Usuń 'SEK_' prefix
        
        # Konwertuj XX. na XX (działów z kropką na końcu)
        if code.endswith('.') and len(code) >= 3:
            return code[:-1]  # Usuń ostatnią kropkę
        
        return code
    
    def _load_financial_data(self) -> None:
        """Wczytaj dane finansowe z wsk_fin.csv"""
        print("  → Ładowanie danych finansowych...")
        
        financial_file = self.data_dir / "wsk_fin.csv"
        if not financial_file.exists():
            raise FileNotFoundError(f"Plik danych finansowych nie znaleziony: {financial_file}")
        
        try:
            # Wczytaj z separatorem ;
            df = pd.read_csv(financial_file, sep=';')
            
            # Kolumny z latami
            year_columns = [col for col in df.columns if col.isdigit()]
            years = sorted([int(col) for col in year_columns])
            
            for _, row in df.iterrows():
                pkd = self._normalize_pkd_key(str(row['PKD']))
                wskaznik = str(row['WSKAZNIK']).strip()
                
                if pkd not in self.financial_data:
                    self.financial_data[pkd] = {}
                
                # Mapa wskaźników
                indicator_map = {
                    'EN': 'unit_count',
                    'PEN': 'profitable_units',
                    'GS': 'revenue',
                    'PNPM': 'net_revenue',
                    'GS (I)': 'revenue_from_sales',
                    'Przych. fin.': 'financial_income',
                    'PPO': 'other_operating_income',
                    'NP': 'net_income',
                    'OP': 'operating_income',
                    'POS': 'sales_income',
                    'CF': 'financial_surplus',
                    'TC': 'total_costs',
                    'OFE': 'other_financial_costs',
                    'IP': 'interest_expense',
                    'DEPR': 'depreciation',
                    'IO': 'investments',
                    'NWC': 'working_capital',
                    'C': 'cash_and_securities',
                    'LTL': 'long_term_debt',
                    'STL': 'short_term_debt',
                    'LTC': 'long_term_credits',
                    'STC': 'short_term_credits',
                    'INV': 'inventory',
                    'REC': 'short_term_receivables',
                }
                
                # Pobierz kod pola z mapy
                field_name = None
                for key, value in indicator_map.items():
                    if key in wskaznik:
                        field_name = value
                        break
                
                if field_name:
                    # Dla każdego roku
                    for year in years:
                        year_str = str(year)
                        if year_str in row:
                            value = row[year_str]
                            
                            # Pomiń 'bd' (brak danych) i wartości puste
                            if pd.isna(value) or value == 'bd':
                                continue
                            
                            try:
                                value = float(value)
                            except (ValueError, TypeError):
                                continue
                            
                            # Inicjalizuj FinancialMetrics dla roku jeśli nie istnieje
                            if year not in self.financial_data[pkd]:
                                self.financial_data[pkd][year] = FinancialMetrics(year=year)
                            
                            # Ustaw wartość pola
                            setattr(self.financial_data[pkd][year], field_name, value)
            
            print(f"    ✓ Dane finansowe dla {len(self.financial_data)} kodów PKD załadowane")
        
        except Exception as e:
            raise RuntimeError(f"Błąd wczytywania danych finansowych: {e}")
    
    def _load_bankruptcy_data(self) -> None:
        """Wczytaj dane o upadłościach z krz_pkd.csv"""
        print("  → Ładowanie danych o upadłościach...")
        
        bankruptcy_file = self.data_dir / "krz_pkd.csv"
        if not bankruptcy_file.exists():
            raise FileNotFoundError(f"Plik danych o upadłościach nie znaleziony: {bankruptcy_file}")
        
        try:
            df = pd.read_csv(bankruptcy_file, sep=';')
            
            for _, row in df.iterrows():
                rok = int(row['rok'])
                pkd = str(row['pkd']).strip()
                liczba_upadlosci = int(row['liczba_upadlosci'])
                
                if pkd not in self.bankruptcy_data:
                    self.bankruptcy_data[pkd] = {}
                
                self.bankruptcy_data[pkd][rok] = liczba_upadlosci
            
            print(f"    ✓ Dane o upadłościach dla {len(self.bankruptcy_data)} kodów PKD załadowane")
        
        except Exception as e:
            raise RuntimeError(f"Błąd wczytywania danych o upadłościach: {e}")
    
    def get_hierarchy(self, version: PKDVersion) -> PKDHierarchy:
        """Zwróć hierarchię dla danej wersji"""
        if not self._loaded:
            self.load_all()
        
        if version == PKDVersion.VERSION_2007:
            return self.hierarchy_2007
        else:
            return self.hierarchy_2025
    
    def get_financial_metrics(self, pkd: str, year: Optional[int] = None) -> Dict[int, FinancialMetrics]:
        """Zwróć metryki finansowe dla kodu PKD"""
        if not self._loaded:
            self.load_all()
        
        if pkd not in self.financial_data:
            return {}
        
        data = self.financial_data[pkd]
        
        if year is not None:
            return {year: data[year]} if year in data else {}
        
        return data
    
    def get_bankruptcy_count(self, pkd: str, year: int) -> int:
        """Zwróć liczbę upadłości dla kodu PKD w danym roku"""
        if not self._loaded:
            self.load_all()
        
        if pkd not in self.bankruptcy_data:
            return 0
        
        return self.bankruptcy_data[pkd].get(year, 0)
    
    def __str__(self) -> str:
        if not self._loaded:
            return "PKDDataLoader(not loaded)"
        
        return (
            f"PKDDataLoader("
            f"hierarchy_2007={len(self.hierarchy_2007)}, "
            f"hierarchy_2025={len(self.hierarchy_2025)}, "
            f"financial_codes={len(self.financial_data)}, "
            f"bankruptcy_codes={len(self.bankruptcy_data)}"
            f")"
        )
