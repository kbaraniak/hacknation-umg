"use client";
import React from "react";
import { LineChart } from "@mui/x-charts/LineChart";

type Point = {
  x: number;
  y: number;
};

type Series = {
  type: "line";
  id: string;
  label: string;
  data: Point[];
};

type MultiIndustryChartProps = {
  codes: string[];
  years?: { from: number; to: number };
  version?: string;
};

/**
 * Tolerant parser that attempts to extract [{x:number, y:number}] from various response shapes.
 * Handles:
 * - Arrays of {year, value} or {x, y}
 * - Wrappers like {data: [...], series: [...], points: [...], values: [...]}
 * - Objects mapping year -> value
 * - Nested structures
 * - Numeric strings
 */
function parseResponseToPoints(data: unknown): Point[] {
  if (!data) return [];
  
  // Already an array of points
  if (Array.isArray(data)) {
    return data
      .map((item) => {
        if (typeof item === "object" && item !== null) {
          // Check for {x, y} format
          if ("x" in item && "y" in item) {
            const x = typeof item.x === "string" ? parseFloat(item.x) : item.x;
            const y = typeof item.y === "string" ? parseFloat(item.y) : item.y;
            if (typeof x === "number" && typeof y === "number" && !isNaN(x) && !isNaN(y)) {
              return { x, y };
            }
          }
          // Check for {year, value} format
          if ("year" in item && "value" in item) {
            const x = typeof item.year === "string" ? parseFloat(item.year) : item.year;
            const y = typeof item.value === "string" ? parseFloat(item.value) : item.value;
            if (typeof x === "number" && typeof y === "number" && !isNaN(x) && !isNaN(y)) {
              return { x, y };
            }
          }
        }
        return null;
      })
      .filter((p): p is Point => p !== null);
  }
  
  // Object wrapper with common keys
  if (typeof data === "object" && data !== null) {
    const obj = data as Record<string, unknown>;
    
    // Try common wrapper keys
    const wrapperKeys = ["data", "series", "points", "values", "timeseries", "history"];
    for (const key of wrapperKeys) {
      if (key in obj && Array.isArray(obj[key])) {
        const parsed = parseResponseToPoints(obj[key]);
        if (parsed.length > 0) return parsed;
      }
    }
    
    // Try to interpret as year -> value mapping
    const entries = Object.entries(obj);
    const points: Point[] = [];
    for (const [k, v] of entries) {
      const year = parseInt(k, 10);
      const value = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : null;
      if (!isNaN(year) && value !== null && !isNaN(value)) {
        points.push({ x: year, y: value });
      }
    }
    if (points.length > 0) {
      return points.sort((a, b) => a.x - b.x);
    }
  }
  
  return [];
}

export default function MultiIndustryChart({ codes, years, version = "2025" }: MultiIndustryChartProps) {
  const [series, setSeries] = React.useState<Series[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [debugResults, setDebugResults] = React.useState<unknown>(null);
  
  React.useEffect(() => {
    if (!codes || codes.length === 0) {
      setSeries([]);
      setDebugResults(null);
      return;
    }
    
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setDebugResults(null);
      
      try {
        const codesParam = codes.join(",");
        const yearsParam = years ? `${years.from}-${years.to}` : "";
        const compareUrl = `/api/compare?codes=${encodeURIComponent(codesParam)}${yearsParam ? `&years=${encodeURIComponent(yearsParam)}` : ""}&version=${encodeURIComponent(version)}`;
        
        console.debug("[MultiIndustryChart] compareUrl", compareUrl);
        
        const res = await fetch(compareUrl);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        const resultsRaw = await res.json();
        console.debug("[MultiIndustryChart] resultsRaw", resultsRaw);
        
        // Normalize response into array of {kod, data}
        let results: Array<{ kod: string; data: Point[] }> = [];
        
        if (Array.isArray(resultsRaw)) {
          // Response is already an array
          results = resultsRaw.map((item, idx) => {
            if (typeof item === "object" && item !== null) {
              const kod = (item as Record<string, unknown>).code || 
                          (item as Record<string, unknown>).kod || 
                          (item as Record<string, unknown>).pkd || 
                          codes[idx] || 
                          `Series ${idx + 1}`;
              const dataRaw = (item as Record<string, unknown>).data || 
                              (item as Record<string, unknown>).series || 
                              (item as Record<string, unknown>).values || 
                              item;
              return {
                kod: String(kod),
                data: parseResponseToPoints(dataRaw),
              };
            }
            return { kod: codes[idx] || `Series ${idx + 1}`, data: [] };
          });
        } else if (typeof resultsRaw === "object" && resultsRaw !== null) {
          // Response is an object, try to extract series
          const obj = resultsRaw as Record<string, unknown>;
          
          // Check for common wrapper keys
          if ("results" in obj && Array.isArray(obj.results)) {
            results = (obj.results as unknown[]).map((item, idx) => {
              if (typeof item === "object" && item !== null) {
                const kod = (item as Record<string, unknown>).code || 
                            (item as Record<string, unknown>).kod || 
                            codes[idx] || 
                            `Series ${idx + 1}`;
                const dataRaw = (item as Record<string, unknown>).data || 
                                (item as Record<string, unknown>).series || 
                                item;
                return {
                  kod: String(kod),
                  data: parseResponseToPoints(dataRaw),
                };
              }
              return { kod: codes[idx] || `Series ${idx + 1}`, data: [] };
            });
          } else if ("series" in obj && Array.isArray(obj.series)) {
            results = (obj.series as unknown[]).map((item, idx) => {
              if (typeof item === "object" && item !== null) {
                const kod = (item as Record<string, unknown>).code || 
                            (item as Record<string, unknown>).kod || 
                            codes[idx] || 
                            `Series ${idx + 1}`;
                const dataRaw = (item as Record<string, unknown>).data || item;
                return {
                  kod: String(kod),
                  data: parseResponseToPoints(dataRaw),
                };
              }
              return { kod: codes[idx] || `Series ${idx + 1}`, data: [] };
            });
          } else {
            // Try to interpret each code as a key
            results = codes.map((code) => ({
              kod: code,
              data: parseResponseToPoints(obj[code]),
            }));
          }
        }
        
        // Build series for chart
        const built: Series[] = results
          .filter((r) => r.data.length > 0)
          .map((r) => ({
            type: "line" as const,
            id: r.kod,
            label: r.kod,
            data: r.data.sort((a, b) => a.x - b.x).filter((p) => !isNaN(p.x) && !isNaN(p.y)),
          }));
        
        setSeries(built);
        
        // Set debug results if no series were built
        if (built.length === 0) {
          setDebugResults(resultsRaw);
        }
      } catch (err) {
        console.error("[MultiIndustryChart] error", err);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [codes, years, version]);
  
  if (loading) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-gray-100 rounded-lg">
        <p className="text-gray-600">Ładowanie danych...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="w-full p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800 font-medium">Błąd podczas ładowania danych</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    );
  }
  
  if (!codes || codes.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-gray-100 rounded-lg">
        <p className="text-gray-600">Wybierz branże do porównania</p>
      </div>
    );
  }
  
  if (series.length === 0) {
    return (
      <div className="w-full">
        <div className="h-64 flex items-center justify-center bg-gray-100 rounded-lg mb-4">
          <p className="text-gray-600">Brak danych do wyświetlenia</p>
        </div>
        
        {debugResults && (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm font-medium text-gray-900 mb-2">Debug: Raw API Response</p>
            <pre className="text-xs text-gray-700 overflow-auto max-h-96">
              {JSON.stringify(debugResults, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  }
  
  // Extract x values for axis
  const allXValues = new Set<number>();
  series.forEach((s) => s.data.forEach((p) => allXValues.add(p.x)));
  const xValues = Array.from(allXValues).sort((a, b) => a - b);
  
  // Convert series data to y-only arrays (MUI expects separate x axis)
  const muiSeries = series.map((s) => {
    // Create a map for quick lookup
    const dataMap = new Map(s.data.map((p) => [p.x, p.y]));
    // Map x values to y values (null if missing)
    const yValues = xValues.map((x) => dataMap.get(x) ?? null);
    return {
      label: s.label,
      data: yValues,
    };
  });
  
  return (
    <div className="w-full">
      <LineChart
        xAxis={[
          {
            data: xValues,
            label: "Rok",
            scaleType: "linear" as const,
          },
        ]}
        series={muiSeries}
        height={400}
        margin={{ top: 20, right: 20, bottom: 60, left: 80 }}
      />
      
      {debugResults && (
        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-sm font-medium text-gray-900 mb-2">Debug: Raw API Response</p>
          <pre className="text-xs text-gray-700 overflow-auto max-h-96">
            {JSON.stringify(debugResults, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
