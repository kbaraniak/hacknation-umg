"""
Industry Index Module
Wskaźniki kondycji branż, predykcja trendów i klasyfikacja
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from statistics import mean, stdev
import math

from statsmodels.tsa.holtwinters import SimpleExpSmoothing


@dataclass
class TrendForecast:
    """Prognoza trendu dla branży"""
    direction: str  # "UP", "DOWN", "STABLE"
    yoy_growth: float  # Zmiana rok-do-roku w %
    volatility: float  # Zmienność (0-100)
    forecast_values: Dict[int, float] = field(default_factory=dict)  # Rok → wartość prognozowana
    confidence: float = 0.0  # Zaufanie do prognozy (0-100)


@dataclass
class IndustryScore:
    """Komponenty oceny branży"""
    size_score: float  # 0-25: Wielkość branży
    profitability_score: float  # 0-25: Rentowność
    growth_score: float  # 0-25: Wzrost/trend
    risk_score: float  # 0-25: Ryzyko
    overall_score: float  # 0-100: Suma
    
    def to_dict(self) -> Dict:
        return {
            "size": round(self.size_score, 2),
            "profitability": round(self.profitability_score, 2),
            "growth": round(self.growth_score, 2),
            "risk": round(self.risk_score, 2),
            "overall": round(self.overall_score, 2),
        }


@dataclass
class IndustryClassification:
    """Klasyfikacja branży"""
    category: str  # ZDROWA, STABILNA, ZAGROŻONA, KRYZYS
    status: str  # ROSNĄCA, STAGNACJA, SPADAJĄCA
    credit_needs: str  # NISKIE, ŚREDNIE, WYSOKIE
    credit_amount_estimate: float  # Szacunkowa kwota potrzeb kredytowych
    risk_level: str  # NISKIE, ŚREDNIE, WYSOKIE
    
    def to_dict(self) -> Dict:
        return {
            "category": self.category,
            "status": self.status,
            "credit_needs": self.credit_needs,
            "credit_amount_estimate": round(self.credit_amount_estimate, 2),
            "risk_level": self.risk_level,
        }


class ExponentialSmoothingPredictor:
    """
    Prognoza używająca Exponential Smoothing.
    Używa statsmodels jeśli dostępne, w przeciwnym razie własna implementacja.
    """
    
    def __init__(self, alpha: float = 0.3):
        """
        alpha: waga ostatnich danych (0-1)
        0.1 = wolno się adaptuje do zmian (smooth)
        0.5 = umiarkownie
        0.9 = szybko reaguje na zmiany (mniej smooth)
        """
        self.alpha = alpha
    
    def predict(
        self,
        historical_values: List[float],
        historical_years: List[int],
        forecast_years: int = 2
    ) -> Tuple[Dict[int, float], float]:
        """
        Prognozuj przyszłe wartości używając statsmodels SimpleExpSmoothing.
        
        Returns:
            (Dict[rok → wartość prognozowana], confidence 0-100)
        """
        if len(historical_values) < 2:
            return {}, 0.0
        
        try:
            # Dla małych danych użyj estimated initialization
            init_method = "estimated" if len(historical_values) < 10 else "heuristic"
            
            # Wygeneruj model
            model = SimpleExpSmoothing(historical_values, initialization_method=init_method)
            
            # Dopasuj model z parametrem smoothing_level (alpha)
            fitted_model = model.fit(smoothing_level=self.alpha, optimized=False)
            
            # Prognoza
            forecast_values = fitted_model.forecast(steps=forecast_years)
            
            # Konwersja do dict
            forecast = {}
            last_year = historical_years[-1]
            for i, value in enumerate(forecast_values, start=1):
                forecast[last_year + i] = max(0, float(value))
            
            # Confidence na podstawie danych historycznych
            confidence = self._calculate_confidence(historical_values)
            
            return forecast, confidence
            
        except Exception as e:
            # Jeśli statsmodels zawiedzie, zwróć pusty wynik
            print(f"Warning: Prediction failed: {e}")
            return {}, 0.0
    
    def _calculate_confidence(self, values: List[float]) -> float:
        """Oblicz zaufanie do prognozy (0-100)"""
        if len(values) < 3:
            return 50.0
        
        # Im mniejsza wariancja, tym wyższe zaufanie
        try:
            mean_val = mean(values)
            if mean_val == 0:
                return 50.0
            
            std_dev = stdev(values)
            coef_var = std_dev / mean_val  # Coefficient of Variation
            
            # Mapuj na 0-100
            # coef_var < 0.2 → high confidence (80-100)
            # coef_var > 0.5 → low confidence (30-50)
            confidence = 100 - (coef_var * 100)
            return max(20, min(100, confidence))
        except:
            return 50.0


class IndustryIndexCalculator:
    """
    Kalkulator indeksu branży ze wskaźnikami i prognozą
    """
    
    def __init__(self):
        self.predictor = ExponentialSmoothingPredictor(alpha=0.4)
    
    def calculate_industry_scores(
        self,
        financial_history: Dict[int, 'FinancialMetrics'],
        bankruptcy_history: Dict[int, int],
        sector_avg_profitability: float = 0.08,  # Średnia rentowność sektora (8%)
        total_units_in_sector: int = 100,  # Liczba jednostek w sektorze
    ) -> IndustryScore:
        """
        Oblicz wszystkie komponenty oceny branży.
        
        Args:
            financial_history: Dict[rok] → FinancialMetrics
            bankruptcy_history: Dict[rok] → liczba upadłości
            sector_avg_profitability: Średnia rentowność sektora dla porównania
            total_units_in_sector: Liczba jednostek w sektorze (do upadłości %)
        """
        
        if not financial_history:
            return IndustryScore(0, 0, 0, 0, 0)
        
        # 1. SIZE SCORE (0-25)
        size_score = self._calculate_size_score(financial_history)
        
        # 2. PROFITABILITY SCORE (0-25)
        profitability_score = self._calculate_profitability_score(
            financial_history,
            sector_avg_profitability
        )
        
        # 3. GROWTH SCORE (0-25)
        growth_score = self._calculate_growth_score(financial_history)
        
        # 4. RISK SCORE (0-25)
        risk_score = self._calculate_risk_score(
            financial_history,
            bankruptcy_history,
            total_units_in_sector
        )
        
        overall_score = size_score + profitability_score + growth_score + risk_score
        
        return IndustryScore(
            size_score=size_score,
            profitability_score=profitability_score,
            growth_score=growth_score,
            risk_score=risk_score,
            overall_score=overall_score,
        )
    
    def _calculate_size_score(self, financial_history: Dict[int, 'FinancialMetrics']) -> float:
        """
        SIZE SCORE (0-25)
        Opiera się na przychodach względem średniej
        """
        revenues = [
            m.revenue for m in financial_history.values()
            if m.revenue and m.revenue > 0
        ]
        
        if not revenues:
            return 0.0
        
        # Średnia przychody
        avg_revenue = mean(revenues)
        current_revenue = revenues[-1] if revenues else 0
        
        # Porównanie z średnią
        if avg_revenue > 0:
            ratio = current_revenue / avg_revenue
            # ratio 1.0 = średnia = 12.5 pkt
            # ratio 1.5+ = 25 pkt
            # ratio 0.5 = 0 pkt
            score = (ratio - 0.5) * 25
            return max(0, min(25, score))
        
        return 12.5  # Średnia jeśli brak danych
    
    def _calculate_profitability_score(
        self,
        financial_history: Dict[int, 'FinancialMetrics'],
        sector_avg: float
    ) -> float:
        """
        PROFITABILITY SCORE (0-25)
        Marża zysku vs średnia sektora
        """
        margins = [
            m.get_profitability_ratio() for m in financial_history.values()
            if m.get_profitability_ratio() is not None
        ]
        
        if not margins:
            return 12.5
        
        current_margin = margins[-1]
        
        # Porównanie z sektorem
        # Jeśli margin = sector_avg → 12.5 pkt
        # Jeśli margin = sector_avg * 2 → 25 pkt
        # Jeśli margin = 0 → 0 pkt
        
        if current_margin <= 0:
            return 0.0
        
        if sector_avg <= 0:
            sector_avg = 0.08
        
        ratio = current_margin / sector_avg
        score = (ratio * 12.5)  # ratio 1.0 = 12.5, ratio 2.0 = 25
        
        return max(0, min(25, score))
    
    def _calculate_growth_score(self, financial_history: Dict[int, 'FinancialMetrics']) -> float:
        """
        GROWTH SCORE (0-25)
        Trend wzrostu przychodów rok-do-roku
        """
        years = sorted(financial_history.keys())
        
        if len(years) < 2:
            return 12.5
        
        yoy_changes = []
        for i in range(1, len(years)):
            prev_revenue = financial_history[years[i-1]].revenue
            curr_revenue = financial_history[years[i]].revenue
            
            if prev_revenue and prev_revenue > 0 and curr_revenue:
                change = (curr_revenue - prev_revenue) / prev_revenue
                yoy_changes.append(change)
        
        if not yoy_changes:
            return 12.5
        
        # Średni wzrost
        avg_growth = mean(yoy_changes)
        
        # Mapowanie:
        # +20% → 25 pkt
        # +10% → 18 pkt
        # 0% → 12.5 pkt
        # -10% → 5 pkt
        # -20% → 0 pkt
        
        score = 12.5 + (avg_growth * 62.5)  # +20% = +12.5 pkt
        return max(0, min(25, score))
    
    def _calculate_risk_score(
        self,
        financial_history: Dict[int, 'FinancialMetrics'],
        bankruptcy_history: Dict[int, int],
        total_units: int
    ) -> float:
        """
        RISK SCORE (0-25) - im mniej tym lepiej
        Opiera się na: zadłużeniu i upadłościach
        """
        # 1. Debt Ratio
        debt_ratios = []
        for m in financial_history.values():
            total_debt = (m.long_term_debt or 0) + (m.short_term_debt or 0)
            if total_debt > 0:
                debt_ratios.append(total_debt)
        
        avg_debt_level = mean(debt_ratios) if debt_ratios else 0
        
        # Debt score: 0% dług = 15 pkt, 100% dług = 0 pkt
        if avg_debt_level > 0:
            # Assumptions: 50% debt = max risk
            debt_score = max(0, 15 - (avg_debt_level / 2))
        else:
            debt_score = 15
        
        # 2. Bankruptcy Rate
        bankruptcy_rate = 0
        if bankruptcy_history and total_units > 0:
            avg_bankruptcies = mean(bankruptcy_history.values())
            bankruptcy_rate = avg_bankruptcies / total_units
        
        # Bankruptcy score: 0% = 10 pkt, 5% = 0 pkt
        bankruptcy_score = max(0, 10 - (bankruptcy_rate * 200))
        
        risk_score = debt_score + bankruptcy_score
        return max(0, min(25, risk_score))
    
    def classify_industry(
        self,
        score: IndustryScore,
        trend_forecast: TrendForecast,
        financial_history: Dict[int, 'FinancialMetrics']
    ) -> IndustryClassification:
        """
        Klasyfikuj branżę na podstawie oceny i trendu
        """
        # CATEGORY: ZDROWA, STABILNA, ZAGROŻONA, KRYZYS
        if score.overall_score >= 75:
            category = "ZDROWA"
        elif score.overall_score >= 60:
            category = "STABILNA"
        elif score.overall_score >= 40:
            category = "ZAGROŻONA"
        else:
            category = "KRYZYS"
        
        # STATUS: ROSNĄCA, STAGNACJA, SPADAJĄCA
        if trend_forecast.yoy_growth > 5:
            status = "ROSNĄCA"
        elif trend_forecast.yoy_growth > -5:
            status = "STAGNACJA"
        else:
            status = "SPADAJĄCA"
        
        # RISK LEVEL
        if score.risk_score >= 20:
            risk_level = "NISKIE"
        elif score.risk_score >= 12:
            risk_level = "ŚREDNIE"
        else:
            risk_level = "WYSOKIE"
        
        # CREDIT NEEDS
        if status == "ROSNĄCA" and score.overall_score < 70:
            # Rośnie ale ma niską marżę - potrzeba kapitału
            credit_needs = "WYSOKIE"
        elif status == "SPADAJĄCA" or category == "ZAGROŻONA":
            # Spada - ryzykowne, ale może być refinancing
            credit_needs = "ŚREDNIE"
        elif status == "ROSNĄCA" and score.profitability_score > 15:
            # Rośnie i rentowna - mało potrzeb
            credit_needs = "NISKIE"
        else:
            credit_needs = "ŚREDNIE"
        
        # Szacunkowa kwota (bazowana na przychodach i potrzebach)
        credit_amount = self._estimate_credit_amount(
            financial_history,
            credit_needs,
            status
        )
        
        return IndustryClassification(
            category=category,
            status=status,
            credit_needs=credit_needs,
            credit_amount_estimate=credit_amount,
            risk_level=risk_level,
        )
    
    def _estimate_credit_amount(
        self,
        financial_history: Dict[int, 'FinancialMetrics'],
        credit_needs: str,
        status: str
    ) -> float:
        """Szacunkowa kwota potrzeb kredytowych"""
        revenues = [
            m.revenue for m in financial_history.values()
            if m.revenue and m.revenue > 0
        ]
        
        if not revenues:
            return 0.0
        
        current_revenue = revenues[-1]
        
        # Credit % of revenue
        if credit_needs == "WYSOKIE":
            credit_ratio = 0.20  # 20% przychodów
        elif credit_needs == "ŚREDNIE":
            credit_ratio = 0.10  # 10% przychodów
        else:
            credit_ratio = 0.05  # 5% przychodów
        
        # Jeśli spada - wyższa kwota potrzebna
        if status == "SPADAJĄCA":
            credit_ratio *= 1.5
        
        return current_revenue * credit_ratio
    
    def calculate_trend_forecast(
        self,
        financial_history: Dict[int, 'FinancialMetrics'],
        forecast_years: int = 2
    ) -> TrendForecast:
        """
        Oblicz prognozę trendu dla branży
        """
        years = sorted(financial_history.keys())
        revenues = [financial_history[y].revenue for y in years if financial_history[y].revenue]
        
        if len(revenues) < 2:
            return TrendForecast(
                direction="STABLE",
                yoy_growth=0.0,
                volatility=0.0,
                forecast_values={},
                confidence=30.0
            )
        
        # YoY Growth (ostatnie 2-3 lata)
        recent_years = years[-min(3, len(years)):]
        recent_revenues = [financial_history[y].revenue for y in recent_years if financial_history[y].revenue]
        
        if len(recent_revenues) >= 2:
            yoy_growth = ((recent_revenues[-1] - recent_revenues[0]) / recent_revenues[0]) * 100
        else:
            yoy_growth = 0.0
        
        # Volatility (wariancja zmian)
        changes = []
        for i in range(1, len(revenues)):
            if revenues[i-1] > 0:
                change = (revenues[i] - revenues[i-1]) / revenues[i-1]
                changes.append(abs(change))
        
        volatility = (mean(changes) * 100) if changes else 0.0
        
        # Direction
        if yoy_growth > 5:
            direction = "UP"
        elif yoy_growth < -5:
            direction = "DOWN"
        else:
            direction = "STABLE"
        
        # Prognoza
        forecast_dict, confidence = self.predictor.predict(
            revenues,
            years,
            forecast_years
        )
        
        return TrendForecast(
            direction=direction,
            yoy_growth=round(yoy_growth, 2),
            volatility=round(volatility, 2),
            forecast_values=forecast_dict,
            confidence=round(confidence, 2)
        )
    
    def calculate_full_index(
        self,
        financial_history: Dict[int, 'FinancialMetrics'],
        bankruptcy_history: Dict[int, int],
        sector_avg_profitability: float = 0.08,
        total_units_in_sector: int = 100,
        forecast_years: int = 2,
    ) -> Dict:
        """
        Oblicz pełny indeks branży - wszystko w jednym
        """
        # Scores
        scores = self.calculate_industry_scores(
            financial_history,
            bankruptcy_history,
            sector_avg_profitability,
            total_units_in_sector
        )
        
        # Trend forecast
        trend = self.calculate_trend_forecast(
            financial_history,
            forecast_years
        )
        
        # Classification
        classification = self.classify_industry(scores, trend, financial_history)
        
        return {
            "scores": scores.to_dict(),
            "trend": {
                "direction": trend.direction,
                "yoy_growth": trend.yoy_growth,
                "volatility": trend.volatility,
                "confidence": trend.confidence,
                "forecast": {
                    str(year): round(value, 2)
                    for year, value in trend.forecast_values.items()
                }
            },
            "classification": classification.to_dict(),
        }
