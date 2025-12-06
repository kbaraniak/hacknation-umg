# 📊 PKD Industry Index API

System API do analizy kondycji branż w Polsce na podstawie Polskiej Klasyfikacji Działalności (PKD).

Projekt na hackatonzie "Indeks Branż" dla jednego z największych banków polskich.

## 🚀 Szybki Start

### Wymagania

- Python 3.13+
- NixOS z nix-shell (opcjonalnie)
- FastAPI
- Pandas

### Instalacja

```bash
# Klon lub pobierz projekt
cd /home/demwe/fastapi

# Załaduj nix-shell
nix-shell

# Instalacja zależności (jeśli nie używasz nix-shell)
pip install -r requirements.txt
```

### Uruchomienie

```bash
# Z nix-shell
nix-shell --run "python -m uvicorn main:app --reload"

# Bez nix-shell
uvicorn main:app --reload
```

API będzie dostępne na http://localhost:8000

## 📋 API Endpoints

### 1. Health Check
```bash
GET /api/health

# Odpowiedź:
{
  "status": "ok",
  "message": "PKD Data Service is running"
}
```

### 2. Pobierz dane branży
```bash
GET /api/industry?section=A&division=01&group=01.1&version=2025

# Query Parametry:
# - section (optional): Sekcja PKD (A-U)
# - division (optional): Dział (wymaga section)
# - group (optional): Grupa (wymaga division)
# - subclass (optional): Podklasa (wymaga group)
# - version (optional, default=2025): Wersja PKD (2007 lub 2025)
```

**Przykłady:**
```bash
# Cała sekcja A
curl "http://localhost:8000/api/industry?section=A"

# Dział 46 (handel)
curl "http://localhost:8000/api/industry?section=G&division=46"

# Grupa 46.11 (sprzedaż zbóż)
curl "http://localhost:8000/api/industry?section=G&division=46&group=11"

# Konkretny kod (46.11.A)
curl "http://localhost:8000/api/industry?section=G&division=46&group=11&subclass=A"

# Wersja 2007
curl "http://localhost:8000/api/industry?section=A&version=2007"
```

### 3. Lista sekcji
```bash
GET /api/sections?version=2025
```

### 4. Lista działów
```bash
GET /api/divisions?section=A&version=2025
```

### 5. Lista grup
```bash
GET /api/groups?section=A&division=01&version=2025
```

### 6. Translacja kodów
```bash
GET /api/translate?code=01&from_version=2007&to_version=2025
```

## 📊 Struktura Odpowiedzi

```json
{
  "pkd_codes": [
    {
      "symbol": "46.11.A",
      "name": "Sprzedaż hurtowa zbóż...",
      "level": "subclass",
      "section": "G",
      "division": "46",
      "group": "46.11",
      "subclass": "A"
    }
  ],
  "financial_data": {
    "46.11.A": {
      "2023": {
        "year": 2023,
        "revenue": 1000000,
        "net_income": 100000,
        "profitability_ratio": 0.1,
        "margin_ratio": 0.2,
        ...
      },
      "2022": { ... }
    }
  },
  "bankruptcy_data": {
    "46.11.A": {
      "2023": 5,
      "2022": 3
    }
  },
  "query_params": {
    "section": "G",
    "division": "46",
    "group": "11",
    "subclass": "A",
    "version": "2025"
  },
  "version": "2025",
  "summary_statistics": {
    "total_revenue": 5000000,
    "total_net_income": 500000,
    "total_units": 150,
    "total_profitable_units": 120,
    "total_bankruptcies": 8,
    "num_codes": 1
  }
}
```

## 🏗️ Architektura

System składa się z czterech głównych warstw:

1. **Classification Layer** (`pkd_classification.py`)
   - Reprezentacja hierarchii PKD
   - Walidacja poziomów hierarchii

2. **Data Loading Layer** (`pkd_data_loader.py`)
   - Wczytywanie CSV z danymi
   - Mapowanie PKD 2007 ↔ 2025
   - Cache danych finansowych

3. **Service Layer** (`pkd_data_service.py`)
   - Logika biznesowa
   - Interfejs wyszukiwania
   - Agregacja danych

4. **API Layer** (`api/routes.py`)
   - Endpoints REST
   - Walidacja requestów
   - Formatowanie odpowiedzi

Szczegóły w `STRUCTURE.md`.

## 🗂️ Struktura Plików

```
/home/demwe/fastapi/
├── classes/
│   ├── pkd_classification.py      # Hierarchia PKD
│   ├── pkd_data_loader.py         # Wczytywanie danych
│   └── pkd_data_service.py        # Serwis biznesowy
├── api/
│   └── routes.py                  # Endpoints API
├── data/
│   ├── PKD_2007.csv               # Hierarchia 2007
│   ├── PKD_2025.csv               # Hierarchia 2025
│   ├── MAP_PKD_2007_2025.csv      # Mapowania
│   ├── wsk_fin.csv                # Dane finansowe
│   └── krz_pkd.csv                # Upadłości
├── tests/
│   ├── test_pkd_classification.py # 13 testów
│   ├── test_pkd_data_loader.py    # 17 testów
│   └── test_pkd_data_service.py   # 14 testów
├── main.py
├── app.py
├── requirements.txt
├── shell.nix
├── STRUCTURE.md
└── README.md
```

## 🧪 Testy

```bash
# Wszystkie testy
nix-shell --run "python -m pytest tests/test_pkd*.py -v"

# Specyficzne moduły
nix-shell --run "python -m pytest tests/test_pkd_classification.py -v"
nix-shell --run "python -m pytest tests/test_pkd_data_loader.py -v"
nix-shell --run "python -m pytest tests/test_pkd_data_service.py -v"

# Z raportowaniem pokrycia
nix-shell --run "python -m pytest tests/test_pkd*.py --cov=classes --cov-report=html"
```

**Status testów:** ✅ 44/44 PASS (100%)

## 💻 Użycie w Pythonie

```python
from classes.pkd_data_service import PKDDataService
from classes.pkd_classification import PKDVersion

# Inicjalizacja
service = PKDDataService()

# Pobierz dane dla sekcji A
data = service.get_data(section="A")

# Dostęp do danych
print(f"Liczba kodów: {len(data.pkd_codes)}")
print(f"Dostępne lata: {data.get_all_years()}")

# Statystyki
stats = data.get_summary_statistics()
print(f"Przychody razem: {stats['total_revenue']}")
print(f"Rentowne jednostki: {stats['total_profitable_units']}")

# Dane finansowe
for symbol, metrics_dict in data.financial_data.items():
    for year, metrics in metrics_dict.items():
        rentowność = metrics.get_profitability_ratio()
        marża = metrics.get_margin_ratio()
        print(f"{symbol} ({year}): Rentowność={rentowność}, Marża={marża}")
```

## 📈 Wskaźniki Finansowe

System udostępnia następujące wskaźniki:

**Wielkość branży:**
- `unit_count` - Liczba jednostek gospodarczych
- `revenue` - Przychody ogółem
- `net_revenue` - Przychody netto

**Rentowność:**
- `net_income` - Zysk netto
- `operating_income` - Wynik na działalności operacyjnej
- `profitability_ratio` - Zysk/Przychody
- `margin_ratio` - Zysk operacyjny/Przychody

**Zadłużenie:**
- `long_term_debt` - Zobowiązania długoterminowe
- `short_term_debt` - Zobowiązania krótkoterminowe
- `debt_ratio` - Całkowity dług

**Ryzyko:**
- `bankruptcy_count` - Liczba upadłości
- `profitable_units` - Liczba rentownych jednostek

I wiele innych...

## 🔄 Wersje PKD

System obsługuje obie wersje:

- **PKD 2007** - Starsza wersja, 1651 kodów
- **PKD 2025** - Nowa wersja, 1775 kodów

Translacja między wersjami odbywa się automatycznie:

```bash
# Przetłumacz kod z 2007 na 2025
curl "http://localhost:8000/api/translate?code=01&from_version=2007&to_version=2025"
```

## ⚙️ Walidacja Hierarchii

System wymaga prawidłowej hierarchii:

✅ Prawidłowe:
- `section=A`
- `section=A&division=01`
- `section=A&division=01&group=01.1`
- `section=A&division=01&group=01.1&subclass=Z`

❌ Nieprawidłowe:
- `division=01` (brak section)
- `group=01.1` (brak division)
- `section=A&group=01.1` (pominięty division)
- `section=A&division=01&subclass=Z` (pominięta group)

## 📝 Dokumentacja

- `STRUCTURE.md` - Szczegółowy opis architektury
- `README.md` - Ten plik

## 🤝 Integracja

### Z FastAPI
```python
from main import app
from api.routes import router

app.include_router(router, prefix="/api")
```

### Z Frontendem
```javascript
// Pobierz dane
const response = await fetch('/api/industry?section=G&division=46');
const data = await response.json();

// Wykresy, tabele, etc.
console.log(data.summary_statistics);
```

## 🐛 Troubleshooting

### "Plik nie znaleziony"
Upewnij się, że pliki CSV są w `/home/demwe/fastapi/data/`

### "Hierarchia nie prawidłowa"
Pamiętaj o hierarchii: section → division → group → subclass

### "Timeout przy wczytywaniu"
Pierwsza inicjalizacja trwa 3-5 sekund (wczytywanie CSV). Dane są cachowane.

## 📊 Dane Źródłowe

- **PKD_2007.csv** - 1651 kodów klasyfikacji
- **PKD_2025.csv** - 1775 kodów klasyfikacji
- **wsk_fin.csv** - Dane finansowe od 2005 do 2024
- **krz_pkd.csv** - Dane o upadłościach od 2018
- **MAP_PKD_2007_2025.csv** - 996 mapowań

## 📞 Kontakt

Projekt na hackatonie "Indeks Branż" 2025

## 📄 Licencja

Projekt Created for Polish Banking Hackathon 2025

---

**Status:** ✅ Production Ready
**Testy:** ✅ 44/44 PASS
**Dokumentacja:** ✅ Kompletna
