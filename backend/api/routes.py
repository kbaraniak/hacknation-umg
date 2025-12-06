from typing import Optional
from fastapi import APIRouter

router = APIRouter()

from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from classes.pkd_data_service import PKDDataService
from classes.pkd_classification import PKDVersion

# Inicjalizacja serwisu
service = PKDDataService()

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

