from typing import Dict, List, Any, Tuple
from collections import defaultdict
import math

# This module computes a simple industry index from provided dataset wrappers.
# It is defensive about field names and uses a configurable grouping level.


def _get_code_from_record(rec: Dict[str, Any], code_field: str = "pkd_code") -> str:
    # try the specified field first, then fallback to common names
    for key in (code_field, "pkd_code", "pkd", "code", "symbol", "kod", "kod_pkd"):
        if key in rec and rec[key] is not None:
            return str(rec[key])
    return ""


def group_key(code: str, level: int = 2) -> str:
    if not code:
        return "UNKNOWN"
    s = code.replace(".", "").strip()
    return s[:level]


def compile_wsk_by_group(
    wsk_records: List[Dict[str, Any]], 
    group_level: int = 2,
    year: int = None,
    code_field: str = "pkd_code",
    value_field: str = "value",
    indicator_field: str = "indicator",
    year_field: str = "year",
) -> Dict[str, Dict[str, float]]:
    """Aggregate numeric 'value' field in WskFin by PKD group and indicator type.

    Returns mapping group -> {indicator: sum, ...}
    """
    out: Dict[str, Dict[str, float]] = defaultdict(lambda: defaultdict(float))
    for r in wsk_records:
        # optional year filter
        if year is not None and int(r.get(year_field) or -1) != year:
            continue
        code = _get_code_from_record(r, code_field)
        g = group_key(code, group_level)
        indicator = r.get(indicator_field, "unknown")
        value = r.get(value_field, 0)
        try:
            out[g][indicator] += float(value or 0)
        except Exception:
            continue
        out[g]["_count_records"] += 1
    return {g: dict(vals) for g, vals in out.items()}


def compile_krz_by_group(
    krz_records: List[Dict[str, Any]], 
    group_level: int = 2, 
    year: int = None,
    code_field: str = "pkd",
) -> Dict[str, Dict[str, float]]:
    """Aggregate bankruptcy counts by PKD group (optionally filter by year).

    Returns mapping group -> {"upadlosci": total}
    """
    out: Dict[str, Dict[str, float]] = defaultdict(lambda: {"upadlosci": 0.0, "count_records": 0})
    for r in krz_records:
        if year is not None and int(r.get("rok") or -1) != year:
            continue
        code = _get_code_from_record(r, code_field)
        g = group_key(code, group_level)
        try:
            out[g]["upadlosci"] += float(r.get("liczba_upadlosci") or r.get("count") or 0)
        except Exception:
            continue
        out[g]["count_records"] += 1
    return out


def zscore_map(values: List[float]) -> List[float]:
    if not values:
        return []
    mean = sum(values) / len(values)
    var = sum((v - mean) ** 2 for v in values) / len(values)
    sd = math.sqrt(var) if var > 0 else 0.0
    if sd == 0:
        return [0.0 for _ in values]
    return [(v - mean) / sd for v in values]


def build_industry_index(
    wsk_records: List[Dict[str, Any]],
    krz_records: List[Dict[str, Any]],
    group_level: int = 2,
    krz_year: int = None,
    wsk_year: int = None,
    wsk_size_indicator: str = "przychody",  # revenue indicator name
    wsk_profit_indicator: str = "zysk",  # profit indicator name
    weights: Dict[str, float] = None,
) -> Tuple[Dict[str, Dict[str, Any]], List[Tuple[str, float]]]:
    """Compute a simple industry index.

    - Groups PKD by leading characters (group_level).
    - From `wsk` aggregates by indicator type (revenue, profit, etc.) and extracts size/profit by indicator name.
    - From `krz` computes upadlosci (bankruptcy counts) per group for krz_year (or all years if None).
    - Normalizes indicators (z-scores) and computes weighted index.

    Returns (per_group_metrics, sorted_index_list)
    """
    if weights is None:
        weights = {"size": 0.4, "profit": 0.3, "insolvency": -0.3}

    wsk_by_group = compile_wsk_by_group(
        wsk_records, 
        group_level=group_level, 
        year=wsk_year,
        code_field="pkd_code",
        value_field="value",
        indicator_field="indicator",
        year_field="year",
    )
    krz_by_group = compile_krz_by_group(krz_records, group_level=group_level, year=krz_year, code_field="pkd")

    # prepare vectors
    groups = sorted(set(list(wsk_by_group.keys()) + list(krz_by_group.keys())))

    size_values = []
    profit_values = []
    insolv_values = []

    for g in groups:
        w = wsk_by_group.get(g, {})
        kr = krz_by_group.get(g, {})
        size = 0.0
        profit = 0.0
        insolv = kr.get("upadlosci", 0.0)
        # heuristics for fields
        if wsk_size_indicator and wsk_size_indicator in w:
            size = float(w.get(wsk_size_indicator, 0) or 0)
        else:
            # fallback: pick the largest numeric value present
            numeric_vals = [float(v or 0) for k, v in w.items() if k != "_count_records"]
            if numeric_vals:
                size = max(numeric_vals)

        if wsk_profit_indicator and wsk_profit_indicator in w:
            profit = float(w.get(wsk_profit_indicator, 0) or 0)
        else:
            # try common indicator names
            for cand in ("zysk", "zysk_netto", "wynik", "profit"):
                if cand in w:
                    profit = float(w.get(cand) or 0)
                    break

        size_values.append(size)
        profit_values.append(profit)
        insolv_values.append(insolv)

    # normalize
    size_z = zscore_map(size_values)
    profit_z = zscore_map(profit_values)
    insolv_z = zscore_map(insolv_values)

    per_group: Dict[str, Dict[str, Any]] = {}
    index_scores: List[Tuple[str, float]] = []
    for i, g in enumerate(groups):
        s = size_z[i]
        p = profit_z[i]
        ins = insolv_z[i]
        score = (
            weights.get("size", 0) * s
            + weights.get("profit", 0) * p
            + weights.get("insolvency", 0) * ins
        )
        per_group[g] = {
            "size_raw": size_values[i],
            "profit_raw": profit_values[i],
            "insolv_raw": insolv_values[i],
            "size_z": s,
            "profit_z": p,
            "insolv_z": ins,
            "index": score,
        }
        index_scores.append((g, score))

    index_scores.sort(key=lambda x: x[1], reverse=True)
    return per_group, index_scores
