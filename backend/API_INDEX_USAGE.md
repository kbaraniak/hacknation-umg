# Industry Index API - Dokumentacja dla Frontendu

## 📊 Nowy Endpoint: `/api/index`

Zwraca **pełny indeks branży** ze wskaźnikami, trendem i prognozą.

### Parametry Query

| Parametr | Typ | Opis | Przykład |
|----------|-----|------|---------|
| `section` | string | Sekcja PKD (A-U) | `G` |
| `division` | string | Dział PKD (2 cyfry) | `46` |
| `group` | string | Grupa PKD | `46.11` |
| `subclass` | string | Podklasa PKD | `A` |
| `version` | string | Wersja PKD | `2025` (default) |
| `forecast_years` | int | Lata do prognozy (1-5) | `2` (default) |

### Przykładowe Zapytania

#### 1️⃣ Pełna Branża (Handel Hurtowy)
```
GET /api/index?section=G&division=46&forecast_years=3
```

#### 2️⃣ Sekcja Bez Szczegółów
```
GET /api/index?section=A
```

#### 3️⃣ Konkretna Grupa
```
GET /api/index?section=G&division=46&group=46.11
```

---

## 📈 Struktura Odpowiedzi JSON

```json
{
  "pkd_codes": [
    {
      "symbol": "46",
      "name": "Handel hurtowy",
      "level": "DIVISION",
      "section": "G",
      "division": "46",
      "group": null,
      "subclass": null
    }
  ],
  "scores": {
    "overall": 72.45,
    "by_code": {
      "46": {
        "scores": {
          "size": 23.5,
          "profitability": 18.2,
          "growth": 20.1,
          "risk": 10.7,
          "overall": 72.5
        },
        "trend": {...},
        "classification": {...}
      }
    }
  },
  "trend": {
    "direction": "UP",           # "UP", "DOWN", "STABLE"
    "yoy_growth": 8.5,            # wzrost rok-do-roku w %
    "volatility": 12.3,           # zmienność w %
    "confidence": 78.5,           # zaufanie do prognozy (0-100)
    "forecast": {
      "2025": 1520000,
      "2026": 1645000,
      "2027": 1782000
    }
  },
  "classification": {
    "category": "ZDROWA",                  # ZDROWA, STABILNA, ZAGROŻONA, KRYZYS
    "status": "ROSNĄCA",                   # ROSNĄCA, STAGNACJA, SPADAJĄCA
    "credit_needs": "ŚREDNIE",             # NISKIE, ŚREDNIE, WYSOKIE
    "codes_by_credit_needs": {
      "NISKIE": 45,
      "ŚREDNIE": 120,
      "WYSOKIE": 78
    }
  },
  "version": "2025",
  "query_params": {
    "section": "G",
    "division": "46",
    "group": null,
    "subclass": null
  }
}
```

---

## 🎨 Co Pokazać na Froncie (Sugestie)

### 1. **Główny Indeks Branży (0-100)**
```
████████████░░░░ 72.5 / 100
```
Kolor:
- 75-100: 🟢 Zielony (ZDROWA)
- 60-74: 🟡 Żółty (STABILNA)
- 40-59: 🟠 Pomarańczowy (ZAGROŻONA)
- <40: 🔴 Czerwony (KRYZYS)

### 2. **Komponenty Oceny (4 słupki)**
```
Rozmiar      █████░░░░░ 23.5
Rentowność   ██████░░░░ 18.2
Wzrost       ███████░░░ 20.1
Ryzyko       █████░░░░░ 10.7
```

### 3. **Trend i Prognoza (Linia)**
```
Historia         Prognoza
  2020: 800k
  2021: 880k       2025: 1.52M  📈
  2022: 1.0M       2026: 1.65M
  2023: 1.2M       2027: 1.78M
  2024: 1.44M
```

### 4. **Status Branży (Tablica)**
| Właściwość | Wartość |
|-----------|---------|
| Kategoria | ZDROWA ✓ |
| Trend | ROSNĄCA 📈 +8.5% YoY |
| Potrzeby Kredytowe | ŚREDNIE |
| Volatilność | 12.3% (niska zmienność) |
| Zaufanie do Prognozy | 78.5% |

### 5. **Dropdown-y (Hierarchia)**
```
Sekcja:     [G - Handel, transport...▼]
Dział:      [46 - Handel hurtowy▼]
Grupa:      [46.11 - Handel auta...▼]
Podklasa:   [A - bez kategorii▼]
```

---

## 📊 Konwersja Danych do Wizualizacji

### Dla Chart.js (Prognoza Liniowa)
```javascript
const response = await fetch('/api/index?section=G&division=46&forecast_years=3');
const data = await response.json();

const forecastData = {
  labels: Object.keys(data.trend.forecast),
  datasets: [{
    label: 'Prognoza przychodu',
    data: Object.values(data.trend.forecast),
    borderColor: data.trend.direction === 'UP' ? 'green' : 'red',
    fill: false,
    tension: 0.1
  }]
};
```

### Dla Gauge Chart (Indeks)
```javascript
const overallScore = data.scores.overall;
const gaugeOptions = {
  type: 'gauge',
  min: 0,
  max: 100,
  value: overallScore,
  color: overallScore >= 75 ? 'green' : 
         overallScore >= 60 ? 'yellow' : 
         overallScore >= 40 ? 'orange' : 'red'
};
```

### Dla Radar Chart (Komponenty)
```javascript
const byCode = data.scores.by_code[Object.keys(data.scores.by_code)[0]];
const radarData = {
  labels: ['Rozmiar', 'Rentowność', 'Wzrost', 'Ryzyko'],
  datasets: [{
    label: data.pkd_codes[0].name,
    data: [
      byCode.scores.size,
      byCode.scores.profitability,
      byCode.scores.growth,
      byCode.scores.risk
    ]
  }]
};
```

---

## 🔄 Filtry i Dynamika

### Dostępne Sekcje
```
A - Rolnictwo, leśnictwo, rybactwo
B - Górnictwo
C - Przetwórstwo
D - Elektro, gaz, ciepło
E - Kanalizacja, odpady
F - Budownictwo
G - Handel, transport
H - Hotele, gastronomia
...itd.
```

Pobierz listę:
```
GET /api/sections
→ { "sections": ["A", "B", "C", ...] }
```

### Działów w Sekcji
```
GET /api/divisions?section=G
→ { "divisions": ["46", "47", "49", ...] }
```

### Grup w Dziale
```
GET /api/groups?section=G&division=46
→ { "groups": ["46.11", "46.12", "46.13", ...] }
```

---

## ⚙️ Zaawansowane

### Porównanie Wersji PKD
```
GET /api/index?section=G&version=2007
GET /api/index?section=G&version=2025
```

### Wiersze z Danymi dla Każdego Kodu
Endpoint zwraca `by_code` - możliwy drill-down do każdego kodu:

```json
"by_code": {
  "46": {
    "scores": { "size": 23.5, ... },
    "trend": { "direction": "UP", ... },
    "classification": { "category": "ZDROWA", ... }
  },
  "47": { ... },
  ...
}
```

Dla granularności - pokaż każdy kod w oddzielnym rzędzie tabeli lub jako sub-elementy.

---

## 🎯 Rekomendacje UX

1. **Domyślnie**: Pokaż sekcje (A-U)
2. **Po wyborze sekcji**: Pokaż działów
3. **Po wyborze działu**: Pokaż Indeks + Prognozę
4. **Opcjonalnie**: Rozwijane grupy i podklasy

**Kolory statusów**:
- 🟢 ZDROWA + ROSNĄCA = **Inwestuj**
- 🟡 STABILNA = **Monitor**
- 🟠 ZAGROŻONA = **Ostrożnie**
- 🔴 KRYZYS = **Unikaj** / **Refinancowanie**

---

## 🔗 API Endpoints do Integracji

Wszystkie dostępne endpointy:

| Endpoint | Metoda | Opis |
|----------|--------|------|
| `/api/health` | GET | Sprawdzenie zdrowia |
| `/api/industry` | GET | Dane branży (bez indeksu) |
| `/api/index` | GET | **Indeks branży (NOWY)** |
| `/api/sections` | GET | Lista sekcji |
| `/api/divisions` | GET | Lista działów |
| `/api/groups` | GET | Lista grup |
| `/api/translate` | GET | Translacja kodu PKD |

---

## 📞 Pytania?

- **Brakuje wam pola?** → Dodaj do `query_params` w zapytaniu
- **Inny format?** → Modyfikuję strukturę JSON
- **Inne metryki?** → Dodaję do `scores` lub `classification`

Zaraz jestem do dyspozycji! 🚀
