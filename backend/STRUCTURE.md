# 📊 Struktura Klas PKD Data Service

## Przegląd

System zarządzania danymi Polskiej Klasyfikacji Działalności (PKD) dla hackatonu "Indeks Branż". Architektura umożliwia pracę z hierarchią PKD 2007 i 2025, automatyczną translację między wersjami, oraz dostęp do danych finansowych i upadłości branż.

## Architektura Systemu

```
┌─────────────────────────────────────────────────────────────┐
│                   HIERARCHIA KLAS                           │
└─────────────────────────────────────────────────────────────┘

1. CORE - classes/pkd_classification.py
   ├── PKDVersion (enum)
   ├── PKDLevel (enum)
   ├── PKDCode
   └── PKDHierarchy

2. DATA LOADING - classes/pkd_data_loader.py
   ├── FinancialMetrics
   ├── BankruptcyData
   ├── PKDMapper
   └── PKDDataLoader

3. SERVICE - classes/pkd_data_service.py
   ├── IndustryData
   └── PKDDataService

4. API - api/routes.py
   ├── Health Check
   ├── /industry (główny endpoint)
   ├── /sections, /divisions, /groups
   └── /translate
```

## Szczegółowy Opis Klas

### 1. PKDVersion (Enum)
Reprezentuje wersje klasyfikacji PKD.

```python
class PKDVersion(Enum):
    VERSION_2007 = "2007"
    VERSION_2025 = "2025"
```

### 2. PKDLevel (Enum)
Reprezentuje poziomy hierarchii PKD.

```python
class PKDLevel(Enum):
    SECTION = "section"      # Sekcja (A-U)
    DIVISION = "division"    # Dział (2-cyfrowy, np. 46)
    GROUP = "group"          # Grupa (3-cyfrowy, np. 46.1)
    SUBCLASS = "subclass"    # Podklasa (5-znakowy, np. 46.11.A)
```

### 3. PKDCode
Reprezentacja pojedynczego kodu PKD.

**Właściwości:**
- `symbol: str` - Pełny symbol (np. "46.11.A")
- `name: str` - Opisowa nazwa
- `level: PKDLevel` - Poziom hierarchii
- `section, division, group, subclass` - Komponenty hierarchii

**Metody:**
- `get_hierarchy_path()` - Zwraca pełną ścieżkę hierarchii jako dict

### 4. PKDHierarchy
Reprezentacja całej hierarchii PKD dla jednej wersji z indeksami.

**Indeksy:**
- `codes` - symbol → PKDCode
- `section_index` - sekcja → lista kodów
- `division_index` - dział → lista kodów
- `group_index` - grupa → lista kodów
- `subclass_index` - podklasa → lista kodów

**Metody:**
- `add_code(code)` - Dodaj kod i zaktualizuj indeksy
- `get_by_symbol(symbol)` - Pobierz kod po symbolu
- `get_by_section(section)` - Pobierz wszystkie kody w sekcji
- `get_by_division(division)` - Pobierz wszystkie kody w dziale
- `get_by_group(group)` - Pobierz wszystkie kody w grupie
- `validate_hierarchy()` - Waliduj hierarchię wejść
- `get_codes_by_hierarchy()` - Główna metoda wyszukiwania z walidacją

### 5. FinancialMetrics
Wskaźniki finansowe dla branży w danym roku.

**Główne pole:**
- `year: int` - Rok raportu

**Wskaźniki finansowe (wszystkie Optional[float]):**
- `unit_count` - Liczba jednostek gospodarczych
- `profitable_units` - Liczba rentownych jednostek
- `revenue` - Przychody ogółem
- `net_income` - Zysk netto
- `operating_income` - Wynik na działalności operacyjnej
- `total_costs` - Koszty ogółem
- `long_term_debt` - Zobowiązania długoterminowe
- `short_term_debt` - Zobowiązania krótkoterminowe
- I wiele innych...

**Computed Properties:**
- `get_profitability_ratio()` - Zysk netto / Przychody
- `get_debt_ratio()` - Całkowity dług
- `get_margin_ratio()` - Zysk operacyjny / Przychody

### 6. BankruptcyData
Dane o upadłościach branży w danym roku.

**Właściwości:**
- `year: int`
- `bankruptcy_count: int` - Liczba upadłości

### 7. PKDMapper
Mapowanie kodów PKD między wersjami 2007 i 2025.

**Indeksy:**
- `mapping_2007_to_2025` - Dict mapowań w przód
- `mapping_2025_to_2007` - Dict mapowań wstecz

**Metody:**
- `translate(code, from_version, to_version)` - Przetłumacz kod
- `validate_mapping(code, version)` - Sprawdź czy kod ma mapowanie

### 8. PKDDataLoader
Główna klasa do wczytywania danych z CSV.

**Składniki:**
- `hierarchy_2007, hierarchy_2025` - Hierarchie dla obu wersji
- `mapper` - Instancja PKDMapper
- `financial_data` - Dict[symbol][rok] → FinancialMetrics
- `bankruptcy_data` - Dict[symbol][rok] → liczba upadłości

**Metody:**
- `load_all()` - Załaduj wszystkie dane z CSV
- `get_hierarchy(version)` - Pobierz hierarchię
- `get_financial_metrics(pkd, year?)` - Pobierz metryki finansowe
- `get_bankruptcy_count(pkd, year)` - Pobierz liczbę upadłości

**Wczytywane pliki:**
- `PKD_2007.csv` - Hierarchia PKD 2007
- `PKD_2025.csv` - Hierarchia PKD 2025
- `MAP_PKD_2007_2025.csv` - Mapowania
- `wsk_fin.csv` - Dane finansowe
- `krz_pkd.csv` - Dane o upadłościach

### 9. IndustryData
Wynik zapytania - dane dla wybranej branży/branż.

**Właściwości:**
- `pkd_codes: List[PKDCode]` - Wybrane kody
- `financial_data` - Dane finansowe dla kodów
- `bankruptcy_data` - Dane o upadłościach
- `query_params` - Parametry zapytania
- `version` - Używana wersja PKD

**Metody:**
- `get_all_years()` - Listę dostępnych lat
- `get_summary_statistics(year?)` - Statystyki podsumowania

### 10. PKDDataService
Główny serwis - fasada dla całego systemu.

**Metody:**
- `get_data(section?, division?, group?, subclass?, version?)` - Główna metoda z hierarchią
- `get_codes_for_section(section)` - Wszystkie kody w sekcji
- `get_codes_for_division(section, division)` - Wszystkie kody w dziale
- `translate_code(code, from_version, to_version)` - Translacja

**Walidacja:**
- Wymaga hierarchii: section → division → group → subclass
- Nie można przeskakiwać poziomów

## Przepływ Danych

```
CSV Files (data/)
    ↓
PKDDataLoader.load_all()
    ├→ _load_pkd_hierarchies() → PKDHierarchy (2007 + 2025)
    ├→ _load_mappings() → PKDMapper
    ├→ _load_financial_data() → Dict[symbol][rok]→FinancialMetrics
    └→ _load_bankruptcy_data() → Dict[symbol][rok]→int
    ↓
PKDDataService
    ├→ Walidacja hierarchii
    ├→ get_data() → filtrowanie kodów
    └→ Zbieranie danych
    ↓
IndustryData
    ├→ lista kodów
    ├→ dane finansowe
    ├→ dane o upadłościach
    └→ statystyki
    ↓
API Endpoints
    └→ JSON Response
```

## API Endpoints

### GET `/health`
Sprawdzenie zdrowia serwisu.

```bash
curl http://localhost:8000/api/health
```

### GET `/industry`
Główny endpoint do pobierania danych branży.

**Parametry:**
- `section` (optional) - Sekcja PKD (A-U)
- `division` (optional) - Dział (wymaga section)
- `group` (optional) - Grupa (wymaga division)
- `subclass` (optional) - Podklasa (wymaga group)
- `version` (optional, default=2025) - Wersja PKD

**Przykłady:**
```bash
# Całą sekcja A
curl "http://localhost:8000/api/industry?section=A"

# Dział 46 w sekcji G
curl "http://localhost:8000/api/industry?section=G&division=46"

# Grupa 46.11
curl "http://localhost:8000/api/industry?section=G&division=46&group=11"

# Konkretny kod 46.11.A
curl "http://localhost:8000/api/industry?section=G&division=46&group=11&subclass=A"

# Dla wersji 2007
curl "http://localhost:8000/api/industry?section=A&version=2007"
```

### GET `/sections`
Lista wszystkich sekcji.

```bash
curl "http://localhost:8000/api/sections?version=2025"
```

### GET `/divisions`
Lista działów w sekcji.

```bash
curl "http://localhost:8000/api/divisions?section=A&version=2025"
```

### GET `/groups`
Lista grup w dziale.

```bash
curl "http://localhost:8000/api/groups?section=A&division=01&version=2025"
```

### GET `/translate`
Translacja kodu PKD między wersjami.

```bash
curl "http://localhost:8000/api/translate?code=01&from_version=2007&to_version=2025"
```

## Walidacja Hierarchii

System wymaga hierarchii! Nie można przeskakiwać poziomów:

✅ **Prawidłowe:**
- `section="A"`
- `section="A", division="01"`
- `section="A", division="01", group="01.1"`
- `section="A", division="01", group="01.1", subclass="Z"`

❌ **Nieprawidłowe:**
- `division="01"` (bez section)
- `group="01.1"` (bez division i section)
- `section="A", group="01.1"` (skip division)
- `section="A", division="01", subclass="Z"` (skip group)

## Testy

Projekt zawiera kompleksowe testy:

```bash
# Wszystkie testy
nix-shell --run "python -m pytest tests/test_pkd*.py -v"

# Specyficzne testy
nix-shell --run "python -m pytest tests/test_pkd_classification.py -v"
nix-shell --run "python -m pytest tests/test_pkd_data_loader.py -v"
nix-shell --run "python -m pytest tests/test_pkd_data_service.py -v"
```

**Ilość testów: 44**
- PKD Classification: 13 testów
- PKD Data Loader: 17 testów
- PKD Data Service: 14 testów

## Struktura Plików

```
/home/demwe/fastapi/
├── classes/
│   ├── pkd_classification.py      (PKDCode, PKDHierarchy)
│   ├── pkd_data_loader.py         (FinancialMetrics, PKDDataLoader)
│   └── pkd_data_service.py        (IndustryData, PKDDataService)
├── api/
│   └── routes.py                  (API Endpoints)
├── tests/
│   ├── test_pkd_classification.py
│   ├── test_pkd_data_loader.py
│   └── test_pkd_data_service.py
├── data/
│   ├── PKD_2007.csv
│   ├── PKD_2025.csv
│   ├── MAP_PKD_2007_2025.csv
│   ├── wsk_fin.csv
│   └── krz_pkd.csv
└── shell.nix
```

## Wdrożenie

1. **Inicjalizacja:**
```python
from classes.pkd_data_service import PKDDataService

service = PKDDataService()
```

2. **Pobieranie danych:**
```python
# Sekcja A
data = service.get_data(section="A")

# Dział 46
data = service.get_data(section="G", division="46")

# Kod 46.11.A
data = service.get_data(section="G", division="46", group="11", subclass="A")

# Wersja 2007
data = service.get_data(section="A", version=PKDVersion.VERSION_2007)
```

3. **Dostęp do danych:**
```python
# Kody PKD
for code in data.pkd_codes:
    print(f"{code.symbol} - {code.name}")

# Dane finansowe
for symbol, metrics_dict in data.financial_data.items():
    for year, metrics in metrics_dict.items():
        print(f"{symbol} ({year}): Revenue={metrics.revenue}")

# Statystyki
stats = data.get_summary_statistics()
print(f"Total Revenue: {stats['total_revenue']}")
```

## Cechy Systemu

✨ **Kluczowe cechy:**
- ✅ Pełna hierarchia PKD z wieloma poziomami
- ✅ Automatyczna translacja PKD 2007 ↔ 2025
- ✅ Dane finansowe z wyczerpującym zestawem wskaźników
- ✅ Dane o upadłościach branż
- ✅ Walidacja hierarchii
- ✅ RESTful API
- ✅ Testowanie (44 testy, 100% pass rate)
- ✅ Cache danych w pamięci
- ✅ Czytelne błędy walidacji

## Wydajność

- Wczytanie danych: ~3-5 sekund (cache w memorii)
- Zapytania: <100ms (indeksy w pamięci)
- Pamięć: ~50-100MB (zależy od rozmiaru cache'u)

## Przyszłe Rozszerzenia

- [ ] Cache dyskowy
- [ ] Wskaźniki zaawansowane (np. Z-score)
- [ ] Export do Excel/PDF
- [ ] Wizualizacje
- [ ] GraphQL endpoint
- [ ] WebSocket do live updates
