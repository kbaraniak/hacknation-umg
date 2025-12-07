// Fetch real metric series from frontend API and render with @mui/x-charts LineChart

"use client";
import React from "react";
import { LineChart } from '@mui/x-charts';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type Point = { x: number; y: number };

export default function MultiIndustryChart({
  industries,
  range,
  metricKey,
}: {
  industries: string[];
  range: { from: number; to: number } | null;
  metricKey?: string | null;
}) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [debugResults, setDebugResults] = React.useState<any | null>(null);
  const [series, setSeries] = React.useState<any[]>([]);

  // compute year list from range
  const years = React.useMemo(() => {
    if (!range) return [] as number[];
    const arr: number[] = [];
    for (let y = range.from; y <= range.to; y++) arr.push(y);
    return arr;
  }, [range]);

  // helper: try to parse various response shapes into Point[]
  const parseResponseToPoints = (data: any): Point[] => {
    // if it's already an array of {year, value} or {x,y}
    if (Array.isArray(data)) {
      return data
        .map((it) => {
          if (it == null) return null;
          if (typeof it.year === 'number' && (typeof it.value === 'number' || typeof it.y === 'number')) {
            return { x: it.year, y: typeof it.value === 'number' ? it.value : it.y };
          }
          if (typeof it.x === 'number' && typeof it.y === 'number') return { x: it.x, y: it.y };
          return null;
        })
        .filter(Boolean) as Point[];
    }

    // handle wrapper objects commonly used by APIs
    if (data && typeof data === 'object') {
      // common wrapper keys
      const wrapper = (data.data ?? data.series ?? data.points ?? data.values ?? null) as any;
      if (wrapper) return parseResponseToPoints(wrapper);
    }

    // if it's an object mapping year->value
    if (data && typeof data === 'object') {
      const entries = Object.entries(data) as [string, any][];
      if (entries.length === 0) return [];

      // If the first value is an object with year/value fields, flatten like { '2019': {year:2019, value:123} }
      const firstVal: any = entries[0][1];
      if (firstVal && typeof firstVal === 'object' && ('value' in firstVal || 'y' in firstVal || 'year' in firstVal)) {
        return entries
          .flatMap(([k, v]) => {
            const vv: any = v;
            // if vv is an object mapping year->number inside (nested maps), handle that too
            if (vv && typeof vv === 'object') {
              // if vv looks like { '2019': 123, '2020': 234 }
              const innerEntries = Object.entries(vv) as [string, any][];
              const innerNumbers = innerEntries.every(([, val]) => typeof val === 'number' || (typeof val === 'string' && !Number.isNaN(Number(val))));
              if (innerNumbers) {
                return innerEntries
                  .map(([iy, iv]) => ({ x: Number(iy), y: typeof iv === 'number' ? iv : Number(iv) } as Point));
              }
            }
            const yr = Number(vv.year ?? Number(k));
            const val = vv.value ?? vv.y ?? null;
            if (Number.isFinite(yr) && typeof val === 'number') return { x: yr, y: val };
            return null;
          })
          .filter(Boolean) as Point[];
      }

      // If entries themselves are top-level year->number mapping, or string-numbers, handle that
      const simple = entries
        .map(([k, v]) => {
          const yr = Number(k);
          if (!Number.isFinite(yr)) return null;
          // accept numeric or numeric-string values
          if (typeof v === 'number') return { x: yr, y: v };
          if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return { x: yr, y: Number(v) };
          return null;
        })
        .filter(Boolean) as Point[];
      if (simple.length) return simple;
    }

    return [];
  };

  React.useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const load = async () => {
      setError(null);
      if (!range) return;
      if (!metricKey) {
        setError('Brak wybranego wskaźnika (metricKey)');
        setSeries([]);
        return;
      }
      if (industries.length === 0) {
        setSeries([]);
        return;
      }

      setLoading(true);

      try {
        // Use the /api/compare endpoint (accepts codes comma separated) per OpenAPI
        const codesParam = industries.join(',');
        const yearsParam = `${range.from}-${range.to}`;
        const url = `${API_URL}/api/compare?codes=${encodeURIComponent(codesParam)}&years=${encodeURIComponent(yearsParam)}`;
        
        const res = await fetch(url, { signal });
        let resultsRaw: any;
        if (res.ok) {
          resultsRaw = await res.json();
        } else {
          // fallback: set resultsRaw to empty array to trigger debug
          resultsRaw = null;
        }
        // debug log the request and raw response to help diagnose API shapes
        console.debug('[MultiIndustryChart] compareUrl', url, 'resultsRaw', resultsRaw);

         // Normalize results into array of { kod, data }
         let results: Array<{ kod: string; data: Point[] }> = [];
         if (!resultsRaw) {
           results = industries.map((kod) => ({ kod, data: [] }));
         } else if (Array.isArray(resultsRaw)) {
           // array of series or objects
           resultsRaw.forEach((item: any) => {
             if (!item) return;
             
             // Try to find the data for the requested metric
             let rawData = item.data || item.series || item.points;
             
             // If we have a metricKey, look for it in common places
             if (metricKey) {
                if (item[metricKey]) rawData = item[metricKey];
                else if (item.metrics && item.metrics[metricKey]) rawData = item.metrics[metricKey];
                else if (item.metrics_summary && item.metrics_summary[metricKey]) rawData = item.metrics_summary[metricKey];
                else if (item.values && item.values[metricKey]) rawData = item.values[metricKey];
             }

             const id = item.id || item.kod || item.pkd_code || item.symbol;
             
             if (id && rawData) {
               const pts = parseResponseToPoints(rawData);
               results.push({ kod: id, data: pts });
             }
           });
         } else if (typeof resultsRaw === 'object') {
           // expected shape: { series: { kod: [...] } } or { data: { kod: [...] } }
           const container = resultsRaw.series ?? resultsRaw.data ?? resultsRaw;
           if (container && typeof container === 'object') {
             for (const [k, v] of Object.entries(container)) {
               // If v is object and has metricKey
               let val = v;
               if (metricKey && val && typeof val === 'object' && !Array.isArray(val)) {
                   if ((val as any)[metricKey]) val = (val as any)[metricKey];
               }
               
               const pts = parseResponseToPoints(val);
               results.push({ kod: k, data: pts });
             }
           }
         }

         // build series: prefer using the returned point arrays directly (filter nulls and sort)
         const built = results.map((r) => {
           let pts = (r.data || []).slice().filter((p: Point | null) => p && Number.isFinite((p as Point).x) && Number.isFinite((p as Point).y as any)) as Point[];
           if (pts.length === 0) {
             // fallback: align to requested years but drop nulls
             pts = years
               .map((yr) => {
                 const found = r.data.find((p) => p.x === yr);
                 return found && Number.isFinite(found.y as any) ? { x: yr, y: found.y } : null;
               })
               .filter(Boolean) as Point[];
           }
           pts.sort((a, b) => a.x - b.x);
           return { type: 'line', id: r.kod, data: pts, label: r.kod };
         });

         // debug: if all series are empty, store raw results so UI can display them for inspection
         if (built.every((s) => !s.data || s.data.length === 0)) {
           console.warn('MultiIndustryChart: no data returned for series', resultsRaw ?? results);
           setDebugResults(resultsRaw ?? results);
         } else {
           setDebugResults(null);
         }

         setSeries(built);
       } catch (e: any) {
         if (e.name === 'AbortError') return;
         setError(e?.message ?? String(e));
         setSeries([]);
       } finally {
         if (!signal.aborted) setLoading(false);
       }
     };

     load();
     return () => { controller.abort(); };
   }, [industries, range, metricKey, years]);

   if (!range) return <div>Wybierz przedział czasowy</div>;
   if (industries.length === 0) return <div>Dodaj branżę, aby wyświetlić wykres</div>;
   if (error) return <div className="text-red-600">Błąd: {error}</div>;

   return (
     <div style={{ width: '100%', height: 400 }}>
       {loading ? <div>Ładowanie wykresu...</div> : null}
       <LineChart series={series} />
       {debugResults ? (
         <div className="mt-2 p-3 bg-red-50 text-sm text-red-800 rounded">
           <div className="font-medium mb-1">Debug: brak danych dla wykresu — surowe odpowiedzi API:</div>
           <pre style={{ maxHeight: 300, overflow: 'auto' }}>{JSON.stringify(debugResults, null, 2)}</pre>
         </div>
       ) : null}
     </div>
   );
}
