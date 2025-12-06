"""
Segmentation utilities for industry data.

Provides simple, extensible segmentation logic that groups PKD codes
into segments based on additional socio-economic or technological indicators.

This is intentionally lightweight: production systems should replace the
heuristics here with a tuned model or configuration-driven rules.
"""
from dataclasses import dataclass
from typing import Dict, List, Optional, Any


@dataclass
class Segment:
    """Reprezentacja pojedynczego segmentu branży"""
    name: str
    description: Optional[str]
    members: List[str]
    scores: Dict[str, float]  # dodatkowe wskaźniki użyte do segmentacji


class Segmenter:
    """Prosty segmenter oparty na progach i wagach wskaźników.

    Wejście:
      - indicators: Dict[pkd_symbol -> Dict[indicator_name -> value]]
    Reguły są proste: dla każdego PKD obliczamy ważoną sumę wskazników
    i przypisujemy do segmentu na podstawie zdefiniowanych progów.
    """

    def __init__(self, weights: Optional[Dict[str, float]] = None, thresholds: Optional[Dict[str, float]] = None):
        # weights: jak ważny jest dany wskaźnik
        self.weights = weights or {}
        # thresholds: progi mapujące skumulowaną wartość na segmenty
        # e.g. {"high": 0.7, "medium": 0.4}
        self.thresholds = thresholds or {"high": 0.7, "medium": 0.4}

    def score(self, indicator_values: Dict[str, float]) -> float:
        """Oblicz skalowany wynik 0..1 na podstawie wag i wartości."""
        total_weight = 0.0
        acc = 0.0
        for k, v in indicator_values.items():
            w = abs(self.weights.get(k, 1.0))
            acc += w * (v if v is not None else 0.0)
            total_weight += w

        if total_weight == 0:
            return 0.0

        # Normalizuj - zakładamy, że wartości wskaźników są już w zakresie 0..1
        return max(0.0, min(1.0, acc / total_weight))

    def assign_segments(self, indicators: Dict[str, Dict[str, float]]) -> Dict[str, Segment]:
        """Przypisz PKD do segmentów na podstawie indicatorów.

        Zwraca: dict[nazwa_segmentu] -> Segment
        """
        segments: Dict[str, Segment] = {
            "high_tech": Segment("high_tech", "Wysoki potencjał technologiczny", [], {}),
            "social_sensitive": Segment("social_sensitive", "Silnie zależne od wskaźników społecznych", [], {}),
            "traditional": Segment("traditional", "Tradycyjne, niskie wskaźniki", [], {}),
        }

        for pkd, inds in indicators.items():
            s = self.score(inds)

            if s >= self.thresholds.get("high", 0.7):
                segments["high_tech"].members.append(pkd)
                segments["high_tech"].scores[pkd] = s
            elif s >= self.thresholds.get("medium", 0.4):
                segments["social_sensitive"].members.append(pkd)
                segments["social_sensitive"].scores[pkd] = s
            else:
                segments["traditional"].members.append(pkd)
                segments["traditional"].scores[pkd] = s

        return segments
