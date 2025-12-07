from typing import Optional
from fastapi import APIRouter

router = APIRouter()

from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from classes.pkd_data_service import PKDDataService
from classes.pkd_classification import PKDVersion, PKDLevel
from classes.industry_index import IndustryIndexCalculator

# Inicjalizacja serwisu
service = PKDDataService()
index_calculator = IndustryIndexCalculator()

router = APIRouter()


# ==================== Pydantic Models ====================

class PKDCodeResponse(BaseModel):
	"""Model odpowiedzi dla kodu PKD"""
	symbol: str
	name: str
	level: str
	section: Optional[str] = None
	division: Optional[str] = None
	group: Optional[str] = None
	subclass: Optional[str] = None


class FinancialMetricsResponse(BaseModel):
	"""Model odpowiedzi dla metryk finansowych"""
	year: int
	unit_count: Optional[float] = None
	profitable_units: Optional[float] = None
	revenue: Optional[float] = None
	net_income: Optional[float] = None
	operating_income: Optional[float] = None
	total_costs: Optional[float] = None
	long_term_debt: Optional[float] = None
	short_term_debt: Optional[float] = None
	profitability_ratio: Optional[float] = None
	margin_ratio: Optional[float] = None
    
	class Config:
		from_attributes = True


class IndustryDataResponse(BaseModel):
	"""Model odpowiedzi dla danych branży"""
	pkd_codes: List[PKDCodeResponse]
	financial_data: dict
	bankruptcy_data: dict
	query_params: dict
	version: str
	summary_statistics: dict


class IndustryIndexResponse(BaseModel):
	"""Model odpowiedzi dla indeksu branży"""
	pkd_codes: List[PKDCodeResponse]
	scores: dict = Field(..., description="Komponenty oceny (0-25 każdy, razem 0-100)")
	trend: dict = Field(..., description="Analiza trendu z prognozą")
	classification: dict = Field(..., description="Klasyfikacja branży i potrzeby kredytowe")
	version: str
	query_params: dict


class RankingItemResponse(BaseModel):
	"""Pojedynczy element rankingu"""
	rank: int
	pkd_code: str
	name: str
	section: Optional[str] = None
	level: str
	scores: dict
	classification: dict
	metrics_summary: dict


class RankingsResponse(BaseModel):
	"""Odpowiedź dla rankingu branż"""
	level: str
	version: str
	total_count: int
	rankings: List[RankingItemResponse]
	filters_applied: dict


class EconomySnapshotResponse(BaseModel):
	"""Snapshot całej gospodarki"""
	year: int
	version: str
	overall_health: dict
	top_performers: dict
	risk_areas: dict
	sections_overview: List[dict]


class ClassificationGroupResponse(BaseModel):
	"""Odpowiedź dla klasyfikacji grup (risky, growing, etc.)"""
	classification_type: str
	description: str
	criteria: dict
	branches: List[dict]


# ==================== Endpoints ====================

@router.get("/health")
async def health_check():
	"""Sprawdzenie zdrowia serwisu"""
	return {"status": "ok", "message": "PKD Data Service is running"}


@router.get("/industry")
async def get_industry_data(
	section: Optional[str] = Query(None, description="Sekcja PKD (A-U)"),
	division: Optional[str] = Query(None, description="Dział PKD (2-cyfrowy, wymaga section)"),
	group: Optional[str] = Query(None, description="Grupa PKD (wymaga division)"),
	subclass: Optional[str] = Query(None, description="Podklasa PKD (wymaga group)"),
	version: Optional[str] = Query("2025", description="Wersja PKD (2007 lub 2025)"),
) -> IndustryDataResponse:
	"""
	Pobierz dane dla wybranej branży.
    
	Obsługuje hierarchię PKD:
	- section: Sekcja (A-U)
	- division: Dział (2-cyfrowy, wymaga section)
	- group: Grupa (wymaga division)  
	- subclass: Podklasa (wymaga group)
    
	Przykłady:
	- /industry?section=A → wszystkie kody w sekcji A
	- /industry?section=G&division=46 → wszystkie kody w dziale 46
	- /industry?section=G&division=46&group=11 → grupa 46.11
	"""
	try:
		# Konwertuj wersję
		pkd_version = PKDVersion.VERSION_2025 if version == "2025" else PKDVersion.VERSION_2007
        
		# Pobierz dane
		industry_data = service.get_data(
			section=section,
			division=division,
			group=group,
			subclass=subclass,
			version=pkd_version
		)
        
		# Konwertuj kody do modelu odpowiedzi
		codes_response = [
			PKDCodeResponse(
				symbol=code.symbol,
				name=code.name,
				level=code.level.value,
				section=code.section,
				division=code.division,
				group=code.group,
				subclass=code.subclass
			)
			for code in industry_data.pkd_codes
		]
        
		# Przygotuj dane finansowe
		financial_dict = {}
		for symbol, metrics_dict in industry_data.financial_data.items():
			financial_dict[symbol] = {
				str(year): {
					"year": year,
					"unit_count": metrics.unit_count,
					"profitable_units": metrics.profitable_units,
					"revenue": metrics.revenue,
					"net_income": metrics.net_income,
					"operating_income": metrics.operating_income,
					"total_costs": metrics.total_costs,
					"long_term_debt": metrics.long_term_debt,
					"short_term_debt": metrics.short_term_debt,
					"profitability_ratio": metrics.get_profitability_ratio(),
					"margin_ratio": metrics.get_margin_ratio(),
				}
				for year, metrics in metrics_dict.items()
			}
        
		# Pobierz statystyki podsumowania
		summary = industry_data.get_summary_statistics()
        
		return IndustryDataResponse(
			pkd_codes=codes_response,
			financial_data=financial_dict,
			bankruptcy_data=industry_data.bankruptcy_data,
			query_params=industry_data.query_params,
			version=pkd_version.value,
			summary_statistics=summary
		)
    
	except ValueError as e:
		raise HTTPException(status_code=400, detail=str(e))
	except Exception as e:
		raise HTTPException(status_code=500, detail=f"Błąd serwera: {str(e)}")


@router.get("/sections")
async def get_sections(version: Optional[str] = Query("2025", description="Wersja PKD")):
	"""
	Pobierz listę wszystkich sekcji PKD
	"""
	try:
		pkd_version = PKDVersion.VERSION_2025 if version == "2025" else PKDVersion.VERSION_2007
		hierarchy = service.loader.get_hierarchy(pkd_version)
        
		sections = set()
		for code in hierarchy.codes.values():
			if code.section:
				sections.add(code.section)
        
		return {
			"version": pkd_version.value,
			"sections": sorted(list(sections))
		}
	except Exception as e:
		raise HTTPException(status_code=500, detail=str(e))


@router.get("/divisions")
async def get_divisions(
	section: str = Query(..., description="Sekcja PKD"),
	version: Optional[str] = Query("2025", description="Wersja PKD")
):
	"""
	Pobierz listę wszystkich działów w sekcji
	"""
	try:
		pkd_version = PKDVersion.VERSION_2025 if version == "2025" else PKDVersion.VERSION_2007
		codes = service.get_codes_for_section(section, version=pkd_version)
        
		divisions = set()
		for code in codes:
			if code.division:
				divisions.add(code.division)
        
		return {
			"section": section,
			"version": pkd_version.value,
			"divisions": sorted(list(divisions))
		}
	except Exception as e:
		raise HTTPException(status_code=500, detail=str(e))


@router.get("/groups")
async def get_groups(
	section: str = Query(..., description="Sekcja PKD"),
	division: str = Query(..., description="Dział PKD"),
	version: Optional[str] = Query("2025", description="Wersja PKD")
):
	"""
	Pobierz listę wszystkich grup w dziale
	"""
	try:
		pkd_version = PKDVersion.VERSION_2025 if version == "2025" else PKDVersion.VERSION_2007
		codes = service.get_codes_for_division(section, division, version=pkd_version)
        
		groups = set()
		for code in codes:
			if code.group:
				groups.add(code.group)
        
		return {
			"section": section,
			"division": division,
			"version": pkd_version.value,
			"groups": sorted(list(groups))
		}
	except Exception as e:
		raise HTTPException(status_code=500, detail=str(e))


@router.get("/translate")
async def translate_code(
	code: str = Query(..., description="Kod PKD do przetłumaczenia"),
	from_version: str = Query(..., description="Wersja źródłowa (2007 lub 2025)"),
	to_version: str = Query(..., description="Wersja docelowa (2007 lub 2025)")
):
	"""
	Przetłumacz kod PKD między wersjami
	"""
	try:
		from_v = PKDVersion.VERSION_2025 if from_version == "2025" else PKDVersion.VERSION_2007
		to_v = PKDVersion.VERSION_2025 if to_version == "2025" else PKDVersion.VERSION_2007
        
		translated = service.translate_code(code, from_v, to_v)
        
		if translated is None:
			raise HTTPException(
				status_code=404,
				detail=f"Nie znaleziono mapowania dla kodu {code}"
			)
        
		return {
			"original_code": code,
			"from_version": from_v.value,
			"translated_code": translated,
			"to_version": to_v.value
		}
	except HTTPException:
		raise
	except Exception as e:
		raise HTTPException(status_code=500, detail=str(e))


@router.get("/index")
async def get_industry_index(
	section: Optional[str] = Query(None, description="Sekcja PKD (A-U)"),
	division: Optional[str] = Query(None, description="Dział PKD (2-cyfrowy)"),
	group: Optional[str] = Query(None, description="Grupa PKD"),
	subclass: Optional[str] = Query(None, description="Podklasa PKD"),
	version: Optional[str] = Query("2025", description="Wersja PKD (2007 lub 2025)"),
	forecast_years: int = Query(2, description="Liczba lat do prognozy (1-5)"),
) -> IndustryIndexResponse:
	"""
	Pobierz indeks branży ze wskaźnikami, trendem i prognozą.
	
	Zwraca:
	- **scores**: Komponenty oceny (rozmiar, rentowność, wzrost, ryzyko)
	- **trend**: Kierunek, wzrost YoY, zmienność, prognoza na 1-5 lat
	- **classification**: Kategoria (ZDROWA/STABILNA/ZAGROŻONA/KRYZYS), status, potrzeby kredytowe
	
	Przykład: /index?section=G&division=46 → Handel hurtowy
	"""
	try:
		# Limit prognozy
		forecast_years = max(1, min(5, forecast_years))
		
		# Konwertuj wersję
		pkd_version = PKDVersion.VERSION_2025 if version == "2025" else PKDVersion.VERSION_2007
		
		# Pobierz dane branży
		industry_data = service.get_data(
			section=section,
			division=division,
			group=group,
			subclass=subclass,
			version=pkd_version
		)
		
		if not industry_data.pkd_codes:
			raise HTTPException(status_code=404, detail="Brak danych dla wybranej branży")
		
		# Konwertuj kody
		codes_response = [
			PKDCodeResponse(
				symbol=code.symbol,
				name=code.name,
				level=code.level.value,
				section=code.section,
				division=code.division,
				group=code.group,
				subclass=code.subclass
			)
			for code in industry_data.pkd_codes
		]
		
		# Oblicz indeks dla każdego kodu
		indices_by_code = {}
		avg_overall_score = 0
		
		for code in industry_data.pkd_codes:
			symbol = code.symbol
			financial_history = industry_data.financial_data.get(symbol, {})
			bankruptcy_history = industry_data.bankruptcy_data.get(symbol, {})
			
			if financial_history:
				index_data = index_calculator.calculate_full_index(
					financial_history,
					bankruptcy_history,
					forecast_years=forecast_years
				)
				indices_by_code[symbol] = index_data
				avg_overall_score += index_data["scores"]["overall"]
		
		# Średnia dla branży
		if indices_by_code:
			avg_overall_score /= len(indices_by_code)
		
		# Agreguj trendy dla branży
		all_trends = [idx["trend"] for idx in indices_by_code.values()]
		if all_trends:
			avg_yoy_growth = sum(t["yoy_growth"] for t in all_trends) / len(all_trends)
			avg_volatility = sum(t["volatility"] for t in all_trends) / len(all_trends)
			avg_confidence = sum(t["confidence"] for t in all_trends) / len(all_trends)
		else:
			avg_yoy_growth = 0.0
			avg_volatility = 0.0
			avg_confidence = 0.0
		
		# Agreguj prognozy
		all_forecasts = {}
		for idx in indices_by_code.values():
			for year, value in idx["trend"]["forecast"].items():
				if year not in all_forecasts:
					all_forecasts[year] = []
				all_forecasts[year].append(value)
		
		aggregated_forecast = {
			year: round(sum(vals) / len(vals), 2)
			for year, vals in all_forecasts.items()
		}
		
		# Kierunek trendu
		if avg_yoy_growth > 5:
			trend_direction = "UP"
		elif avg_yoy_growth < -5:
			trend_direction = "DOWN"
		else:
			trend_direction = "STABLE"
		
		# Klasyfikacja branży
		if avg_overall_score >= 75:
			category = "ZDROWA"
		elif avg_overall_score >= 60:
			category = "STABILNA"
		elif avg_overall_score >= 40:
			category = "ZAGROŻONA"
		else:
			category = "KRYZYS"
		
		if trend_direction == "UP":
			status = "ROSNĄCA"
		elif trend_direction == "DOWN":
			status = "SPADAJĄCA"
		else:
			status = "STAGNACJA"
		
		# Potrzeby kredytowe dla branży
		credit_needs_count = {"NISKIE": 0, "ŚREDNIE": 0, "WYSOKIE": 0}
		for idx in indices_by_code.values():
			credit_needs_count[idx["classification"]["credit_needs"]] += 1
		
		if credit_needs_count["WYSOKIE"] > credit_needs_count["NISKIE"]:
			branch_credit_needs = "WYSOKIE"
		elif credit_needs_count["ŚREDNIE"] >= credit_needs_count["NISKIE"] and credit_needs_count["ŚREDNIE"] >= credit_needs_count["WYSOKIE"]:
			branch_credit_needs = "ŚREDNIE"
		else:
			branch_credit_needs = "NISKIE"
		
		return IndustryIndexResponse(
			pkd_codes=codes_response,
			scores={
				"overall": round(avg_overall_score, 2),
				"by_code": indices_by_code,  # Szczegóły dla każdego kodu
			},
			trend={
				"direction": trend_direction,
				"yoy_growth": round(avg_yoy_growth, 2),
				"volatility": round(avg_volatility, 2),
				"confidence": round(avg_confidence, 2),
				"forecast": aggregated_forecast,
			},
			classification={
				"category": category,
				"status": status,
				"credit_needs": branch_credit_needs,
				"codes_by_credit_needs": credit_needs_count,
			},
			version=pkd_version.value,
			query_params=industry_data.query_params
		)
	
	except ValueError as e:
		raise HTTPException(status_code=400, detail=str(e))
	except HTTPException:
		raise
	except Exception as e:
		raise HTTPException(status_code=500, detail=f"Błąd: {str(e)}")


@router.get("/compare")
async def compare_branches(
	codes: str = Query(..., description="Lista kodów PKD lub sekcji oddzielonych przecinkami (np. 46,47,G,C)"),
	version: Optional[str] = Query("2025", description="Wersja PKD (2007 lub 2025)"),
	years: Optional[str] = Query(None, description="Zakres lat, np. 2020-2024")
):
	"""
	Porównaj wiele branż jednocześnie. Przyjmuje kody PKD (działy, grupy) lub litery sekcji.
	Zwraca metryki, score oraz serię czasową gotową do wizualizacji.
	
	Przykłady:
	- /compare?codes=46,47 → porównaj działy 46 i 47
	- /compare?codes=G,C → porównaj sekcje G i C
	- /compare?codes=46.11,47.1 → porównaj grupy
	"""
	try:
		pkd_version = PKDVersion.VERSION_2025 if version == "2025" else PKDVersion.VERSION_2007
		hierarchy = service.loader.get_hierarchy(pkd_version)
		
		code_list = [c.strip() for c in codes.split(",") if c.strip()]
		results = []
		
		# Parse years range
		start_year, end_year = 0, 9999
		if years:
			try:
				parts = years.split("-")
				if len(parts) == 2:
					start_year = int(parts[0])
					end_year = int(parts[1])
			except:
				pass
		
		for code_str in code_list:
			# Usuń kropki z końca (dane mają "46.", API przyjmuje "46")
			code_clean = code_str.rstrip('.')
			
			rep_code = None
			
			# 1. Sprawdź czy to litera sekcji (A-U)
			if len(code_clean) == 1 and code_clean.isalpha():
				sec_codes = hierarchy.get_by_section(code_clean.upper())
				rep_code = sec_codes[0] if sec_codes else None
			# 2. Sprawdź bezpośrednie dopasowanie w codes
			elif code_clean in hierarchy.codes:
				rep_code = hierarchy.codes[code_clean]
			# 3. Sprawdź w indeksie działów
			elif code_clean in hierarchy.division_index:
				div_codes = hierarchy.get_by_division(code_clean)
				rep_code = div_codes[0] if div_codes else None
			# 4. Sprawdź w indeksie grup
			elif code_clean in hierarchy.group_index:
				grp_codes = hierarchy.get_by_group(code_clean)
				rep_code = grp_codes[0] if grp_codes else None
			# 5. Fallback: próbuj sekcję
			else:
				sec_codes = hierarchy.get_by_section(code_clean.upper())
				rep_code = sec_codes[0] if sec_codes else None
			
			if rep_code is None:
				print(f"Warning: code {code_str} not found")
				continue
			
			# Pobierz dane dla znalezionego reprezentatywnego kodu
			industry_data = service.get_data(
				section=rep_code.section,
				division=rep_code.division,
				group=rep_code.group,
				subclass=rep_code.subclass,
				version=pkd_version
			)
			
			if industry_data and industry_data.financial_data:
				# Aggregate financial data
				years_set = industry_data.get_all_years()
				aggregated_values = {} # year -> { revenue, net_income, ... }
				
				for year in years_set:
					if not (start_year <= year <= end_year):
						continue
						
					agg = {"revenue": 0.0, "net_income": 0.0, "unit_count": 0}
					for symbol, history in industry_data.financial_data.items():
						if year in history:
							m = history[year]
							if m.revenue: agg["revenue"] += m.revenue
							if m.net_income: agg["net_income"] += m.net_income
							if m.unit_count: agg["unit_count"] += m.unit_count
					aggregated_values[year] = agg
				
				# Format for frontend
				values_by_metric = {
					"revenue": [],
					"net_income": [],
					"unit_count": []
				}
				for year in sorted(aggregated_values.keys()):
					vals = aggregated_values[year]
					values_by_metric["revenue"].append({"year": year, "value": vals["revenue"]})
					values_by_metric["net_income"].append({"year": year, "value": vals["net_income"]})
					values_by_metric["unit_count"].append({"year": year, "value": vals["unit_count"]})

				results.append({
					"id": rep_code.symbol,  # Użyj pełnego symbolu z sekcją
					"values": values_by_metric,
					"summary": industry_data.get_summary_statistics()
				})
		
		return results

	except Exception as e:
		raise HTTPException(status_code=500, detail=str(e))


@router.get("/trends")
async def get_trends(
	codes: str = Query(..., description="Sekcje lub kody PKD oddzielone przecinkami, np. G,C,46"),
	years: Optional[str] = Query(None, description="Zakres lat np. 2018-2024"),
	metrics: Optional[str] = Query("revenue,growth,bankruptcies", description="Lista metryk")
):
	"""
	Trendy w czasie dla wielu sekcji/kodów jednocześnie. Zwraca dane do wykresów.
	"""
	try:
		codes_list = [s.strip() for s in codes.split(",") if s.strip()]
		if not codes_list:
			raise HTTPException(status_code=400, detail="Brak kodów")
		
		years_range = None
		if years:
			try:
				start, end = years.split("-")
				years_range = (int(start), int(end))
			except Exception:
				raise HTTPException(status_code=400, detail="Nieprawidłowy format years. Użyj np. 2018-2024")
		
		metrics_list = [m.strip() for m in metrics.split(",") if m.strip()]
		pkd_version = PKDVersion.VERSION_2025
		hierarchy = service.loader.get_hierarchy(pkd_version)
		
		sections_data = {}
		labels = []
		
		for sec in codes_list:
			# Obsługa zarówno sekcji jak i kodów
			target_code = sec
			
			# Sprawdź czy to sekcja czy kod
			if len(sec) == 1 and sec.isalpha():
				# To sekcja
				ind_data = service.get_data(section=sec, version=pkd_version)
				name = hierarchy.get_by_symbol(sec).name if hierarchy.get_by_symbol(sec) else f"Sekcja {sec}"
			else:
				# To kod (dział, grupa itp)
				# Znajdź kod w hierarchii
				code_obj = hierarchy.get_by_symbol(sec)
				if not code_obj:
					# Spróbuj znaleźć w indeksach
					if sec in hierarchy.division_index:
						code_obj = hierarchy.codes[hierarchy.division_index[sec][0]]
					elif sec in hierarchy.group_index:
						code_obj = hierarchy.codes[hierarchy.group_index[sec][0]]
				
				if code_obj:
					name = code_obj.name
					if code_obj.level == PKDLevel.SECTION:
						ind_data = service.get_data(section=code_obj.section, version=pkd_version)
					elif code_obj.level == PKDLevel.DIVISION:
						ind_data = service.get_data(section=code_obj.section, division=code_obj.division, version=pkd_version)
					elif code_obj.level == PKDLevel.GROUP:
						ind_data = service.get_data(section=code_obj.section, division=code_obj.division, group=code_obj.group, version=pkd_version)
					else:
						ind_data = service.get_data(section=code_obj.section, version=pkd_version) # Fallback
				else:
					print(f"Warning: Code {sec} not found")
					continue

			if not ind_data.financial_data:
				continue
			from classes.pkd_data_loader import FinancialMetrics
			agg_financial = {}
			agg_bankruptcies = {}
			for fin_data in ind_data.financial_data.values():
				for yr, m in fin_data.items():
					if years_range and not (years_range[0] <= yr <= years_range[1]):
						continue
					if yr not in agg_financial:
						agg_financial[yr] = FinancialMetrics(year=yr)
					cur = agg_financial[yr]
					cur.revenue = (cur.revenue or 0) + (m.revenue or 0)
					cur.net_income = (cur.net_income or 0) + (m.net_income or 0)
					cur.unit_count = (cur.unit_count or 0) + (m.unit_count or 0)
			for bank_data in ind_data.bankruptcy_data.values():
				for yr, cnt in bank_data.items():
					if years_range and not (years_range[0] <= yr <= years_range[1]):
						continue
					agg_bankruptcies[yr] = agg_bankruptcies.get(yr, 0) + cnt
			
			if not agg_financial:
				continue
			years_sorted = sorted(agg_financial.keys())
			labels = [str(y) for y in years_sorted]
			growth_series = {}
			for i in range(1, len(years_sorted)):
				prev_y = years_sorted[i-1]
				cur_y = years_sorted[i]
				prev_rev = agg_financial[prev_y].revenue or 0
				cur_rev = agg_financial[cur_y].revenue or 0
				if prev_rev > 0:
					growth = ((cur_rev - prev_rev) / prev_rev) * 100
				else:
					growth = 0
				growth_series[str(cur_y)] = growth
			
			sections_data[sec] = {
				"name": name,
				"time_series": {
					"revenue": {str(y): agg_financial[y].revenue or 0 for y in years_sorted},
					"net_income": {str(y): agg_financial[y].net_income or 0 for y in years_sorted},
					"unit_count": {str(y): agg_financial[y].unit_count or 0 for y in years_sorted},
					"bankruptcies": {str(y): agg_bankruptcies.get(y, 0) for y in years_sorted}
				},
				"growth": growth_series,
				"trend_analysis": {
					"direction": "UP" if growth_series and list(growth_series.values())[-1] > 0 else "DOWN" if growth_series and list(growth_series.values())[-1] < 0 else "STABLE",
					"avg_growth": round(sum(growth_series.values()) / len(growth_series), 2) if growth_series else 0,
					"volatility": round((max(growth_series.values()) - min(growth_series.values())) if growth_series else 0, 2)
				}
			}
		
		if not sections_data:
			raise HTTPException(status_code=404, detail="Brak danych dla wybranych sekcji")
		
		datasets = []
		for sec, data in sections_data.items():
			if "revenue" in metrics_list:
				datasets.append({
					"label": f"Sekcja {sec} - Przychody",
					"data": [data["time_series"]["revenue"].get(l, 0) for l in labels]
				})
			if "growth" in metrics_list:
				datasets.append({
					"label": f"Sekcja {sec} - YoY %",
					"data": [data["growth"].get(l, 0) for l in labels]
				})
			if "bankruptcies" in metrics_list:
				datasets.append({
					"label": f"Sekcja {sec} - Upadłości",
					"data": [data["time_series"]["bankruptcies"].get(l, 0) for l in labels]
				})
		
		return {
			"time_range": {
				"from": labels[0],
				"to": labels[-1]
			},
			"metrics": metrics_list,
			"sections_data": sections_data,
			"chart_ready_data": {
				"labels": labels,
				"datasets": datasets
			}
		}
	
	except HTTPException:
		raise
	except Exception as e:
		raise HTTPException(status_code=500, detail=f"Błąd: {str(e)}")


@router.get("/classifications/{classification_type}")
async def get_classification_group(
	classification_type: str,
	version: Optional[str] = Query("2025", description="Wersja PKD"),
	limit: int = Query(15, description="Liczba wyników", ge=1, le=50)
) -> ClassificationGroupResponse:
	"""
	Zwróć branże sklasyfikowane według typu:
	- risky: Branże zagrożone (wysokie ryzyko upadłości)
	- growing: Branże dynamicznie rozwijające się
	- high-credit-needs: Branże z wysokimi potrzebami kredytowymi
	- stable: Branże stabilne
	
	Przykład: /classifications/risky?limit=10
	"""
	try:
		valid_types = ["risky", "growing", "high-credit-needs", "stable"]
		if classification_type not in valid_types:
			raise HTTPException(
				status_code=400,
				detail=f"Invalid classification type. Use: {', '.join(valid_types)}"
			)
		
		pkd_version = PKDVersion.VERSION_2025 if version == "2025" else PKDVersion.VERSION_2007
		hierarchy = service.loader.get_hierarchy(pkd_version)
		
		# Zbierz dane dla wszystkich działów
		all_divisions = {}
		for code in hierarchy.codes.values():
			if code.division and code.division not in all_divisions:
				all_divisions[code.division] = code
		
		# Oblicz indeksy
		branches_data = []
		
		for division, rep_code in all_divisions.items():
			try:
				industry_data = service.get_data(
					section=rep_code.section,
					division=rep_code.division,
					version=pkd_version
				)
				
				if not industry_data.financial_data:
					continue
				
				# Agreguj dane
				agg_financial = {}
				agg_bankruptcies = {}
				
				for symbol in industry_data.financial_data.keys():
					fin_data = industry_data.financial_data[symbol]
					for yr, metrics in fin_data.items():
						if yr not in agg_financial:
							from classes.pkd_data_loader import FinancialMetrics
							agg_financial[yr] = FinancialMetrics(year=yr)
						
						current = agg_financial[yr]
						current.unit_count = (current.unit_count or 0) + (metrics.unit_count or 0)
						current.profitable_units = (current.profitable_units or 0) + (metrics.profitable_units or 0)
						current.revenue = (current.revenue or 0) + (metrics.revenue or 0)
						current.net_income = (current.net_income or 0) + (metrics.net_income or 0)
						current.operating_income = (current.operating_income or 0) + (metrics.operating_income or 0)
						current.total_costs = (current.total_costs or 0) + (metrics.total_costs or 0)
						current.long_term_debt = (current.long_term_debt or 0) + (metrics.long_term_debt or 0)
						current.short_term_debt = (current.short_term_debt or 0) + (metrics.short_term_debt or 0)
				
				for symbol in industry_data.bankruptcy_data.keys():
					bank_data = industry_data.bankruptcy_data[symbol]
					for yr, count in bank_data.items():
						if yr not in agg_bankruptcies:
							agg_bankruptcies[yr] = 0
						agg_bankruptcies[yr] += count
				
				if agg_financial:
					index_result = index_calculator.calculate_full_index(
						agg_financial,
						agg_bankruptcies,
						forecast_years=2
					)
					
					# Sprawdź czy spełnia kryteria dla danego typu
					scores = index_result["scores"]
					trend = index_result["trend"]
					classification = index_result["classification"]
					
					include = False
					specific_indicators = {}
					recommendation = ""
					
					if classification_type == "risky":
						# Zagrożone: niski risk score, wysokie upadłości, słaby overall
						if scores["risk"] < 15 or scores["overall"] < 50 or classification["category"] in ["ZAGROŻONA", "KRYZYS"]:
							include = True
							
							last_year = max(agg_financial.keys())
							last_metrics = agg_financial[last_year]
							bankruptcy_rate = 0
							if last_metrics.unit_count and last_metrics.unit_count > 0:
								bankruptcies_last = agg_bankruptcies.get(last_year, 0)
								bankruptcy_rate = (bankruptcies_last / last_metrics.unit_count) * 100
							
							debt_ratio = 0
							if last_metrics.revenue and last_metrics.revenue > 0:
								total_debt = (last_metrics.long_term_debt or 0) + (last_metrics.short_term_debt or 0)
								debt_ratio = (total_debt / last_metrics.revenue) * 100
							
							negative_years = sum(1 for y in sorted(agg_financial.keys())[-3:] 
												  if agg_financial[y].net_income and agg_financial[y].net_income < 0)
							
							specific_indicators = {
								"bankruptcy_rate": round(bankruptcy_rate, 2),
								"debt_ratio": round(debt_ratio, 2),
								"negative_growth_years": negative_years
							}
							recommendation = "UNIKAJ FINANSOWANIA"
					
					elif classification_type == "growing":
						# Rosnące: wysoki growth score, dodatni YoY, trend UP
						if scores["growth"] > 20 and trend["yoy_growth"] > 10 and trend["direction"] == "UP":
							include = True
							
							# Średni wzrost z ostatnich 3 lat
							recent_years = sorted(agg_financial.keys())[-3:]
							if len(recent_years) >= 2:
								revenues = [agg_financial[y].revenue for y in recent_years if agg_financial[y].revenue]
								if len(revenues) >= 2:
									avg_growth_3y = ((revenues[-1] - revenues[0]) / revenues[0]) * 100 / len(revenues)
								else:
									avg_growth_3y = trend["yoy_growth"]
							else:
								avg_growth_3y = trend["yoy_growth"]
							
							last_year = max(agg_financial.keys())
							new_businesses = agg_financial[last_year].unit_count or 0
							if last_year - 1 in agg_financial:
								prev_businesses = agg_financial[last_year - 1].unit_count or 0
								new_businesses = max(0, new_businesses - prev_businesses)
							
							specific_indicators = {
								"yoy_growth_3y_avg": round(avg_growth_3y, 2),
								"forecast_2025": trend["forecast"].get("2025", 0) if "2025" in trend["forecast"] else 0,
								"new_businesses": int(new_businesses)
							}
							recommendation = "PRIORYTET FINANSOWANIA"
					
					elif classification_type == "high-credit-needs":
						# Wysokie potrzeby kredytowe
						if classification["credit_needs"] == "WYSOKIE":
							include = True
							
							last_year = max(agg_financial.keys())
							last_metrics = agg_financial[last_year]
							
							estimated_credit = classification["credit_amount_estimate"]
							
							specific_indicators = {
								"estimated_credit_need": round(estimated_credit, 2),
								"growth_trend": trend["direction"],
								"current_revenue": last_metrics.revenue or 0
							}
							recommendation = "OCENA INDYWIDUALNA"
					
					elif classification_type == "stable":
						# Stabilne: overall 60-75, STABILNA kategoria
						if 60 <= scores["overall"] <= 75 and classification["category"] == "STABILNA":
							include = True
							
							specific_indicators = {
								"volatility": trend["volatility"],
								"confidence": trend["confidence"],
								"status": classification["status"]
							}
							recommendation = "BEZPIECZNE FINANSOWANIE"
					
					if include:
						branches_data.append({
							"code": division,
							"name": rep_code.name,
							"section": rep_code.section,
							"scores": scores,
							"classification": classification,
							"specific_indicators": specific_indicators,
							"recommendation": recommendation,
							"sort_value": scores["overall"]  # Dla sortowania
						})
			
			except Exception as e:
				print(f"Warning: Failed to process division {division}: {e}")
				continue
		
		# Sortuj według typu
		if classification_type == "risky":
			branches_data.sort(key=lambda x: x["scores"]["risk"])  # Najniższe risk score pierwsze
		elif classification_type == "growing":
			branches_data.sort(key=lambda x: x["scores"]["growth"], reverse=True)
		elif classification_type == "high-credit-needs":
			branches_data.sort(key=lambda x: x["classification"]["credit_amount_estimate"], reverse=True)
		else:  # stable
			branches_data.sort(key=lambda x: abs(x["scores"]["overall"] - 67.5))  # Najbliższe środka stabilności
		
		branches_data = branches_data[:limit]
		
		# Dodaj rankingi
		for rank, branch in enumerate(branches_data, start=1):
			branch["rank"] = rank
		
		# Opisy i kryteria dla każdego typu
		descriptions = {
			"risky": "Branże z wysokim ryzykiem upadłości lub słabą kondycją finansową",
			"growing": "Branże dynamicznie rozwijające się",
			"high-credit-needs": "Branże z wysokimi potrzebami kredytowymi",
			"stable": "Branże stabilne i przewidywalne"
		}
		
		criteria = {
			"risky": {
				"risk_score": "< 15",
				"bankruptcy_rate": "> 2%",
				"overall_score": "< 50"
			},
			"growing": {
				"growth_score": "> 20",
				"yoy_growth": "> 10%",
				"trend": "UP"
			},
			"high-credit-needs": {
				"credit_needs": "WYSOKIE",
				"estimated_amount": "> 10% przychodów"
			},
			"stable": {
				"overall_score": "60-75",
				"category": "STABILNA",
				"volatility": "< 15%"
			}
		}
		
		return ClassificationGroupResponse(
			classification_type=classification_type,
			description=descriptions[classification_type],
			criteria=criteria[classification_type],
			branches=branches_data
		)
	
	except HTTPException:
		raise
	except Exception as e:
		raise HTTPException(status_code=500, detail=f"Błąd: {str(e)}")

@router.get("/economy/snapshot")
async def get_economy_snapshot(
	version: Optional[str] = Query("2025", description="Wersja PKD"),
	year: Optional[int] = Query(2024, description="Rok dla snapshot")
) -> EconomySnapshotResponse:
	"""
	Snapshot całej gospodarki - obraz stanu Polski.
	
	Zwraca:
	- Ogólny health score gospodarki
	- TOP wykonawcy (największe, najszybciej rosnące, najbardziej rentowne)
	- Obszary ryzyka (upadłości, spadki)
	- Przegląd wszystkich sekcji
	
	Przykład: /economy/snapshot?year=2024
	"""
	try:
		pkd_version = PKDVersion.VERSION_2025 if version == "2025" else PKDVersion.VERSION_2007
		hierarchy = service.loader.get_hierarchy(pkd_version)
		
		# Zbierz dane dla wszystkich sekcji
		sections_data = []
		all_sections = sorted(set(code.section for code in hierarchy.codes.values() if code.section))
		
		total_revenue = 0
		total_bankruptcies = 0
		total_businesses = 0
		overall_scores = []
		
		top_by_size = []
		top_by_growth = []
		top_by_profitability = []
		most_bankruptcies = []
		declining = []
		
		for section in all_sections:
			try:
				# Pobierz dane sekcji
				industry_data = service.get_data(section=section, version=pkd_version)
				
				if not industry_data.financial_data:
					continue
				
				# Agreguj dane finansowe
				section_financial = {}
				section_bankruptcies = {}
				
				for symbol in industry_data.financial_data.keys():
					fin_data = industry_data.financial_data[symbol]
					for yr, metrics in fin_data.items():
						if yr not in section_financial:
							from classes.pkd_data_loader import FinancialMetrics
							section_financial[yr] = FinancialMetrics(year=yr)
						
						current = section_financial[yr]
						current.unit_count = (current.unit_count or 0) + (metrics.unit_count or 0)
						current.profitable_units = (current.profitable_units or 0) + (metrics.profitable_units or 0)
						current.revenue = (current.revenue or 0) + (metrics.revenue or 0)
						current.net_income = (current.net_income or 0) + (metrics.net_income or 0)
						current.operating_income = (current.operating_income or 0) + (metrics.operating_income or 0)
						current.total_costs = (current.total_costs or 0) + (metrics.total_costs or 0)
						current.long_term_debt = (current.long_term_debt or 0) + (metrics.long_term_debt or 0)
						current.short_term_debt = (current.short_term_debt or 0) + (metrics.short_term_debt or 0)
				
				for symbol in industry_data.bankruptcy_data.keys():
					bank_data = industry_data.bankruptcy_data[symbol]
					for yr, count in bank_data.items():
						if yr not in section_bankruptcies:
							section_bankruptcies[yr] = 0
						section_bankruptcies[yr] += count
				
				# Oblicz indeks dla sekcji
				if section_financial:
					index_result = index_calculator.calculate_full_index(
						section_financial,
						section_bankruptcies,
						forecast_years=1
					)
					
					# Dane dla wybranego roku
					if year in section_financial:
						year_metrics = section_financial[year]
						section_revenue = year_metrics.revenue or 0
						section_units = year_metrics.unit_count or 0
						section_bankruptcies_year = section_bankruptcies.get(year, 0)
						
						# Aktualizuj totale
						total_revenue += section_revenue
						total_bankruptcies += section_bankruptcies_year
						total_businesses += section_units
						overall_scores.append(index_result["scores"]["overall"])
						
						# Znajdź nazwę sekcji
						section_code = hierarchy.get_by_symbol(section)
						section_name = section_code.name if section_code else f"Sekcja {section}"
						
						# Liczba działów w sekcji
						divisions_in_section = len(set(
							code.division for code in hierarchy.codes.values()
							if code.section == section and code.division
						))
						
						sections_data.append({
							"section": section,
							"name": section_name,
							"divisions_count": divisions_in_section,
							"avg_score": round(index_result["scores"]["overall"], 2),
							"total_revenue": round(section_revenue, 2),
							"total_businesses": int(section_units),
							"classification": index_result["classification"]["category"]
						})
						
						# TOP performers
						top_by_size.append({
							"code": section,
							"name": section_name,
							"revenue": section_revenue
						})
						
						top_by_growth.append({
							"code": section,
							"name": section_name,
							"growth_yoy": index_result["trend"]["yoy_growth"]
						})
						
						margin = 0
						if section_revenue > 0 and year_metrics.net_income:
							margin = (year_metrics.net_income / section_revenue) * 100
						
						top_by_profitability.append({
							"code": section,
							"name": section_name,
							"margin": round(margin, 2)
						})
						
						# Risk areas
						most_bankruptcies.append({
							"code": section,
							"name": section_name,
							"bankruptcies": section_bankruptcies_year
						})
						
						if index_result["trend"]["yoy_growth"] < -2:
							declining.append({
								"code": section,
								"name": section_name,
								"growth_yoy": index_result["trend"]["yoy_growth"]
							})
			
			except Exception as e:
				print(f"Warning: Failed to process section {section}: {e}")
				continue
		
		# Sortuj i ogranicz TOP listy
		top_by_size.sort(key=lambda x: x["revenue"], reverse=True)
		top_by_size = top_by_size[:5]
		
		top_by_growth.sort(key=lambda x: x["growth_yoy"], reverse=True)
		top_by_growth = top_by_growth[:5]
		
		top_by_profitability.sort(key=lambda x: x["margin"], reverse=True)
		top_by_profitability = top_by_profitability[:5]
		
		most_bankruptcies.sort(key=lambda x: x["bankruptcies"], reverse=True)
		most_bankruptcies = most_bankruptcies[:5]
		
		declining.sort(key=lambda x: x["growth_yoy"])
		declining = declining[:5]
		
		# Ogólny health score
		avg_health = sum(overall_scores) / len(overall_scores) if overall_scores else 50.0
		
		if avg_health >= 75:
			health_classification = "ZDROWA"
		elif avg_health >= 60:
			health_classification = "STABILNA"
		elif avg_health >= 40:
			health_classification = "ZAGROŻONA"
		else:
			health_classification = "KRYZYS"
		
		return EconomySnapshotResponse(
			year=year,
			version=pkd_version.value,
			overall_health={
				"score": round(avg_health, 2),
				"classification": health_classification,
				"total_revenue": round(total_revenue, 2),
				"total_bankruptcies": int(total_bankruptcies),
				"active_businesses": int(total_businesses)
			},
			top_performers={
				"by_size": top_by_size,
				"by_growth": top_by_growth,
				"by_profitability": top_by_profitability
			},
			risk_areas={
				"most_bankruptcies": most_bankruptcies,
				"declining": declining
			},
			sections_overview=sections_data
		)
	
	except HTTPException:
		raise
	except Exception as e:
		raise HTTPException(status_code=500, detail=f"Błąd: {str(e)}")

@router.get("/rankings")
async def get_rankings(
	level: str = Query("division", description="Poziom agregacji: section, division, group"),
	version: Optional[str] = Query("2025", description="Wersja PKD (2007 lub 2025)"),
	limit: int = Query(20, description="Liczba wyników (max 100)", ge=1, le=100),
	sort_by: str = Query("overall", description="Sortuj po: overall, growth, profitability, size, risk")
) -> RankingsResponse:
	"""
	Ranking wszystkich branż według wybranego poziomu PKD.
	
	Zwraca top N branż posortowane według wybranego kryterium.
	
	Przykłady:
	- /rankings?level=division&sort_by=overall&limit=20 → TOP 20 działów
	- /rankings?level=section&sort_by=growth → Sekcje posortowane po wzroście
	"""
	try:
		pkd_version = PKDVersion.VERSION_2025 if version == "2025" else PKDVersion.VERSION_2007
		hierarchy = service.loader.get_hierarchy(pkd_version)
		
		# Zbierz wszystkie kody na wybranym poziomie
		all_codes = list(hierarchy.codes.values())
		
		# Filtruj po poziomie
		if level == "section":
			# Grupuj po sekcji
			codes_by_group = {}
			for code in all_codes:
				if code.section and code.section not in codes_by_group:
					# Znajdź kod reprezentujący sekcję
					section_code = hierarchy.get_by_symbol(code.section)
					if section_code:
						codes_by_group[code.section] = section_code
		elif level == "division":
			# Grupuj po dziale
			codes_by_group = {}
			for code in all_codes:
				if code.division and code.division not in codes_by_group:
					# Znajdź pierwszy kod z tego działu
					division_codes = hierarchy.get_by_division(code.division)
					if division_codes:
						codes_by_group[code.division] = division_codes[0]
		elif level == "group":
			# Grupuj po grupie
			codes_by_group = {}
			for code in all_codes:
				if code.group and code.group not in codes_by_group:
					group_codes = hierarchy.get_by_group(code.group)
					if group_codes:
						codes_by_group[code.group] = group_codes[0]
		else:
			raise HTTPException(status_code=400, detail="Invalid level. Use: section, division, or group")
		
		# Oblicz indeksy dla każdej grupy
		rankings = []
		for group_key, representative_code in codes_by_group.items():
			try:
				# Pobierz dane dla tej grupy
				if level == "section":
					industry_data = service.get_data(section=representative_code.section, version=pkd_version)
				elif level == "division":
					industry_data = service.get_data(
						section=representative_code.section,
						division=representative_code.division,
						version=pkd_version
					)
				elif level == "group":
					industry_data = service.get_data(
						section=representative_code.section,
						division=representative_code.division,
						group=representative_code.group,
						version=pkd_version
					)
				
				if not industry_data.pkd_codes or not industry_data.financial_data:
					continue
				
				# Agreguj dane finansowe dla całej grupy
				all_financial_data = {}
				all_bankruptcy_data = {}
				
				for symbol in industry_data.financial_data.keys():
					fin_data = industry_data.financial_data[symbol]
					for year, metrics in fin_data.items():
						if year not in all_financial_data:
							from classes.pkd_data_loader import FinancialMetrics
							all_financial_data[year] = FinancialMetrics(year=year)
						
						# Agreguj metryki
						current = all_financial_data[year]
						current.unit_count = (current.unit_count or 0) + (metrics.unit_count or 0)
						current.profitable_units = (current.profitable_units or 0) + (metrics.profitable_units or 0)
						current.revenue = (current.revenue or 0) + (metrics.revenue or 0)
						current.net_income = (current.net_income or 0) + (metrics.net_income or 0)
						current.operating_income = (current.operating_income or 0) + (metrics.operating_income or 0)
						current.total_costs = (current.total_costs or 0) + (metrics.total_costs or 0)
						current.long_term_debt = (current.long_term_debt or 0) + (metrics.long_term_debt or 0)
						current.short_term_debt = (current.short_term_debt or 0) + (metrics.short_term_debt or 0)
				
				for symbol in industry_data.bankruptcy_data.keys():
					bank_data = industry_data.bankruptcy_data[symbol]
					for year, count in bank_data.items():
						if year not in all_bankruptcy_data:
							all_bankruptcy_data[year] = 0
						all_bankruptcy_data[year] += count
				
				# Oblicz indeks
				if all_financial_data:
					index_result = index_calculator.calculate_full_index(
						all_financial_data,
						all_bankruptcy_data,
						forecast_years=2
					)
					
					# Pobierz ostatnie metryki
					last_year = max(all_financial_data.keys())
					last_metrics = all_financial_data[last_year]
					
					rankings.append({
						"pkd_code": group_key,
						"name": representative_code.name,
						"section": representative_code.section,
						"level": level,
						"scores": index_result["scores"],
						"classification": index_result["classification"],
						"trend": index_result["trend"],
						"metrics_summary": {
							"revenue_2024": last_metrics.revenue or 0,
							"yoy_growth": index_result["trend"]["yoy_growth"],
							"bankruptcy_rate": (
								all_bankruptcy_data.get(last_year, 0) / last_metrics.unit_count * 100
								if last_metrics.unit_count and last_metrics.unit_count > 0
								else 0
							)
						}
					})
			except Exception as e:
				# Skip problematyczne kody
				print(f"Warning: Failed to process {group_key}: {e}")
				continue
		
		# Sortuj
		sort_key_map = {
			"overall": lambda x: x["scores"]["overall"],
			"growth": lambda x: x["scores"]["growth"],
			"profitability": lambda x: x["scores"]["profitability"],
			"size": lambda x: x["scores"]["size"],
			"risk": lambda x: x["scores"]["risk"],
		}
		
		if sort_by not in sort_key_map:
			sort_by = "overall"
		
		rankings.sort(key=sort_key_map[sort_by], reverse=True)
		
		# Ogranicz do limitu
		rankings = rankings[:limit]
		
		# Dodaj ranki
		ranking_items = []
		for rank, item in enumerate(rankings, start=1):
			ranking_items.append(RankingItemResponse(
				rank=rank,
				pkd_code=item["pkd_code"],
				name=item["name"],
				section=item["section"],
				level=item["level"],
				scores=item["scores"],
				classification=item["classification"],
				metrics_summary=item["metrics_summary"]
			))
		
		return RankingsResponse(
			level=level,
			version=pkd_version.value,
			total_count=len(codes_by_group),
			rankings=ranking_items,
			filters_applied={
				"level": level,
				"sort_by": sort_by,
				"limit": limit,
				"version": version
			}
		)
	
	except HTTPException:
		raise
	except Exception as e:
		raise HTTPException(status_code=500, detail=f"Błąd: {str(e)}")

