"""
Sentiment utilities for industry-level sentiment indicators.

This module provides lightweight functions and a small service class to
attach precomputed sentiment time-series (e.g., from social media or
reports) to `IndustryData` and compute aggregated indicators.

In production, sentiment ingestion would call external APIs or a message
queue; here we keep a deterministic, dependency-free implementation so
it can be unit-tested and extended later.
"""
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
from statistics import mean


@dataclass
class SentimentIndicator:
    """Reprezentuje skompresowany wynik sentymentu dla branży.

    avg_score: średni wynik (−1 .. +1)
    trend: roczny procentowy wzrost/zmiana sentymentu (w punktach procentowych)
    recent_scores: list of floats (most recent values)
    """
    avg_score: float
    trend: float
    recent_scores: List[float]


class SentimentService:
    """Prosty serwis do obliczania wskaźników nastrojów z serii czasowej.

    Oczekuje: sentiment_series: Dict[pkd_symbol -> Dict[year -> score]]
    gdzie score jest w zakresie -1..+1.
    """

    def aggregate(self, sentiment_series: Dict[str, Dict[int, float]], window_years: int = 3) -> Dict[str, SentimentIndicator]:
        """Dla każdego PKD oblicz avg_score i trend na bazie ostatnich N lat.

        Zwraca dict[pkd_symbol -> SentimentIndicator]
        """
        result: Dict[str, SentimentIndicator] = {}

        for pkd, series in sentiment_series.items():
            if not series:
                continue

            years = sorted(series.keys())
            recent_years = years[-window_years:]
            recent_scores = [series[y] for y in recent_years if y in series]

            if not recent_scores:
                continue

            avg_score = mean(recent_scores)

            # trend: percent change between first and last in the window
            if len(recent_scores) >= 2 and abs(recent_scores[0]) > 1e-9:
                trend = ((recent_scores[-1] - recent_scores[0]) / abs(recent_scores[0])) * 100.0
            else:
                trend = 0.0

            result[pkd] = SentimentIndicator(avg_score=avg_score, trend=round(trend, 2), recent_scores=recent_scores)

        return result
