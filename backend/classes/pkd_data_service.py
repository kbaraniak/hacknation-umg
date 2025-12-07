"""
PKD Data Service Module
Główny serwis do pobierania i przetwarzania danych PKD
"""

from pathlib import Path
from typing import Dict, List, Optional
from dataclasses import dataclass, field

from classes.pkd_classification import PKDVersion, PKDCode
from classes.pkd_data_loader import (
    PKDDataLoader,
    FinancialMetrics,
    BankruptcyData
)


@dataclass
class IndustryData:
    """
    Dane dla wybranej branży/branż
    """
    pkd_codes: List[PKDCode]  # Wybrane kody PKD
    financial_data: Dict[str, Dict[int, FinancialMetrics]] = field(default_factory=dict)
    bankruptcy_data: Dict[str, Dict[int, int]] = field(default_factory=dict)
    query_params: Dict = field(default_factory=dict)
    version: PKDVersion = PKDVersion.VERSION_2025
    
    def get_all_years(self) -> List[int]:
        """Zwróć listę wszystkich lat dostępnych w danych"""
        years = set()
        for years_dict in self.financial_data.values():
            years.update(years_dict.keys())
        return sorted(list(years))
    
    def get_summary_statistics(self, year: Optional[int] = None) -> Dict:
        """
        Zwróć podsumowanie statystyk dla wybranych kodów
        """
        summary = {
            "total_revenue": 0,
            "total_net_income": 0,
            "total_units": 0,
            "total_profitable_units": 0,
            "total_bankruptcies": 0,
            "num_codes": len(self.pkd_codes),
        }
        
        for pkd_symbol in self.financial_data:
            data = self.financial_data[pkd_symbol]
            
            if year is not None:
                if year not in data:
                    continue
                metrics = data[year]
                years_to_process = [year]
            else:
                years_to_process = list(data.keys())
                metrics = data[max(data.keys())] if data else None
            
            for y in years_to_process:
                if y not in data:
                    continue
                m = data[y]
                
                if m.revenue:
                    summary["total_revenue"] += m.revenue
                if m.net_income:
                    summary["total_net_income"] += m.net_income
                if m.unit_count:
                    summary["total_units"] += m.unit_count
                if m.profitable_units:
                    summary["total_profitable_units"] += m.profitable_units
        
        # Upadłości
        for pkd_symbol in self.bankruptcy_data:
            data = self.bankruptcy_data[pkd_symbol]
            
            if year is not None:
                if year in data:
                    summary["total_bankruptcies"] += data[year]
            else:
                summary["total_bankruptcies"] += sum(data.values())
        
        return summary
    
    def __str__(self) -> str:
        years_str = f"{min(self.get_all_years())}-{max(self.get_all_years())}" if self.get_all_years() else "N/A"
        return (
            f"IndustryData("
            f"codes={len(self.pkd_codes)}, "
            f"years={years_str}, "
            f"version={self.version.value}"
            f")"
        )


class PKDDataService:
    """
    Główny serwis do pobierania danych PKD
    Implementuje interfejs get_data() z walidacją hierarchii
    """
    
    def __init__(self, data_dir: Optional[Path] = None, default_version: PKDVersion = PKDVersion.VERSION_2025):
        self.loader = PKDDataLoader(data_dir)
        self.default_version = default_version
        self.loader.load_all()
    
    def get_data(
        self,
        section: Optional[str] = None,
        division: Optional[str] = None,
        group: Optional[str] = None,
        subclass: Optional[str] = None,
        version: Optional[PKDVersion] = None,
        year_from: Optional[int] = None,
        year_to: Optional[int] = None
    ) -> IndustryData:
        """
        Pobierz dane dla wybranej branży/branż.
        
        Obsługuje hierarchię:
        - section: Sekcja (A-U)
        - division: Dział (2-cyfrowy, wymaga section)
        - group: Grupa (wymaga division)
        - subclass: Podklasa (wymaga group)
        
        Przykłady:
        - get_data(section="A") → wszystkie kody w sekcji A
        - get_data(section="G", division="46") → wszystkie kody w dziale 46
        - get_data(section="G", division="46", group="11") → grupa 46.11
        - get_data(section="G", division="46", group="11", subclass="A") → kod 46.11.A
        
        Args:
            section: Sekcja PKD
            division: Dział PKD
            group: Grupa PKD
            subclass: Podklasa PKD
            version: Wersja PKD (domyślnie VERSION_2025)
            year_from: Rok początkowy dla filtrowania danych (opcjonalny)
            year_to: Rok końcowy dla filtrowania danych (opcjonalny)
        
        Returns:
            IndustryData z wybranymi kodami i danymi
        """
        
        # Ustaw wersję
        if version is None:
            version = self.default_version
        
        # Waliduj hierarchię
        self._validate_hierarchy(section, division, group, subclass)
        
        # Pobierz hierarchię dla danej wersji
        hierarchy = self.loader.get_hierarchy(version)
        
        # Pobierz kody PKD
        pkd_codes = hierarchy.get_codes_by_hierarchy(section, division, group, subclass)
        
        # Zbierz dane finansowe i upadłości dla każdego kodu
        financial_data = {}
        bankruptcy_data = {}
        
        for pkd_code in pkd_codes:
            # Dane finansowe - spróbuj różnych wariantów symbolu
            fin_metrics = None
            for symbol_variant in self._get_financial_symbol_variants(pkd_code.symbol):
                fin_metrics = self.loader.get_financial_metrics(symbol_variant)
                if fin_metrics:
                    # Filtruj według zakresu lat
                    if year_from is not None or year_to is not None:
                        filtered_metrics = {}
                        for year, metrics in fin_metrics.items():
                            if year_from is not None and year < year_from:
                                continue
                            if year_to is not None and year > year_to:
                                continue
                            filtered_metrics[year] = metrics
                        fin_metrics = filtered_metrics
                    
                    # Zapisz pod ORYGINALNYM symbolem bez sekcji dla spójności z frontendem
                    # np. A.02.10.Z -> 02.10
                    clean_symbol = pkd_code.symbol.replace(f"{pkd_code.section}.", "").replace(".Z", "")
                    if fin_metrics:  # Tylko jeśli są dane po filtrowaniu
                        financial_data[clean_symbol] = fin_metrics
                    break
            
            # Dane o upadłościach - pobierz dla wszystkich dostępnych lat
            bankruptcy_dict = {}
            start_year = year_from if year_from else 2018
            end_year = year_to if year_to else 2024
            
            for pkd_symbol_short in self._get_alternative_symbols(pkd_code.symbol):
                # Szukaj danych w krz_pkd.csv dla wszystkich lat
                for year in range(start_year, end_year + 1):  # Dane dostępne od 2018
                    count = self.loader.get_bankruptcy_count(pkd_symbol_short, year)
                    if count > 0:
                        if year not in bankruptcy_dict:
                            bankruptcy_dict[year] = 0
                        bankruptcy_dict[year] += count
            
            if bankruptcy_dict:
                bankruptcy_data[pkd_code.symbol] = bankruptcy_dict
        
        # Stwórz IndustryData
        industry_data = IndustryData(
            pkd_codes=pkd_codes,
            financial_data=financial_data,
            bankruptcy_data=bankruptcy_data,
            query_params={
                "section": section,
                "division": division,
                "group": group,
                "subclass": subclass,
                "version": version.value,
                "year_from": year_from,
                "year_to": year_to
            },
            version=version
        )
        
        return industry_data
    
    def _validate_hierarchy(
        self,
        section: Optional[str],
        division: Optional[str],
        group: Optional[str],
        subclass: Optional[str]
    ) -> None:
        """
        Waliduj hierarchię - sprawdź czy parametry tworzą prawidłową ścieżkę.
        
        Reguły:
        - Jeśli division podany, to section musi być podany
        - Jeśli group podany, to division musi być podany
        - Jeśli subclass podany, to group musi być podany
        """
        if division is not None and section is None:
            raise ValueError("Jeśli podana jest dział (division), to sekcja (section) jest wymagana")
        
        if group is not None and division is None:
            raise ValueError("Jeśli podana jest grupa (group), to dział (division) jest wymagany")
        
        if subclass is not None and group is None:
            raise ValueError("Jeśli podana jest podklasa (subclass), to grupa (group) jest wymagana")
    
    def _get_alternative_symbols(self, symbol: str) -> List[str]:
        """
        Zwróć alternatywne symbole dla szukania w krz_pkd.csv
        np. dla "46.11.A" szukaj też "46.11Z" lub pełnego 5-znakowego kodu
        """
        symbols = [symbol]
        
        # Jeśli symbol zawiera literkę, spróbuj zmienić na Z
        if symbol[-1].isalpha() and symbol[-1] != 'Z':
            symbols.append(symbol[:-1] + 'Z')
        
        # Spróbuj znaleźć 5-znakowy kod
        parts = symbol.split('.')
        if len(parts) == 3:
            code_5 = f"{parts[0]}{parts[1]}{parts[2]}"
            symbols.append(code_5)
        
        return symbols
    
    def _get_financial_symbol_variants(self, symbol: str) -> List[str]:
        """
        Zwróć warianty symbolu dla szukania w wsk_fin.csv
        np. dla "A.02.10.Z" szukaj: "02.10.Z", "02.10", "02.1", "02"
        """
        variants = []
        
        # Usuń sekcję (A-U)
        no_section = symbol
        if '.' in symbol and symbol[0].isalpha() and symbol[0].isupper():
            no_section = '.'.join(symbol.split('.')[1:])
        
        variants.append(no_section)  # "02.10.Z"
        
        # Bez końcówki .Z
        if no_section.endswith('.Z'):
            variants.append(no_section[:-2])  # "02.10"
        
        # Warianty skrócone
        parts = no_section.replace('.Z', '').split('.')
        if len(parts) >= 2:
            variants.append(f"{parts[0]}.{parts[1][0]}")  # "02.1"
        if len(parts) >= 1:
            variants.append(parts[0])  # "02"
        
        return variants
    
    def get_codes_for_section(self, section: str, version: Optional[PKDVersion] = None) -> List[PKDCode]:
        """Zwróć wszystkie kody w sekcji"""
        if version is None:
            version = self.default_version
        
        hierarchy = self.loader.get_hierarchy(version)
        return hierarchy.get_codes_by_hierarchy(section=section)
    
    def get_codes_for_division(
        self,
        section: str,
        division: str,
        version: Optional[PKDVersion] = None
    ) -> List[PKDCode]:
        """Zwróć wszystkie kody w dziale"""
        if version is None:
            version = self.default_version
        
        hierarchy = self.loader.get_hierarchy(version)
        return hierarchy.get_codes_by_hierarchy(section=section, division=division)
    
    def translate_code(
        self,
        code: str,
        from_version: PKDVersion,
        to_version: PKDVersion
    ) -> Optional[str]:
        """Przetłumacz kod PKD między wersjami"""
        if self.loader.mapper:
            return self.loader.mapper.translate(code, from_version, to_version)
        return None
    
    def __str__(self) -> str:
        return f"PKDDataService(default_version={self.default_version.value}, loader={self.loader})"
