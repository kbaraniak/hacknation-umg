"use client";
import React from "react";
import { getDivisions, getGroups } from "@/app/lib/client/pkdClient";
import { Input } from '@heroui/input';

type PKDValue = {
  section?: string;
  division?: string;   // "02"
  suffix?: string;     // "31" or "1" (third-level part)
  pkd?: string;        // e.g. "B.02.31"
  full?: string;
};

const DIVISION_FALLBACK = Array.from({ length: 99 }, (_, i) => String(i + 1).padStart(2, "0"));
const SUFFIX_FALLBACK = Array.from({ length: 99 }, (_, i) => String(i + 1)); // "1".."99"

export default function PKDInput({ onChangeAction }: { onChangeAction?: (v: PKDValue) => void }) {
  const [section, setSection] = React.useState("");
  const [division, setDivision] = React.useState("");
  const [suffix, setSuffix] = React.useState("");
  const [divisionSuggestions, setDivisionSuggestions] = React.useState<string[]>([]);
  const [suffixSuggestions, setSuffixSuggestions] = React.useState<string[]>([]);
  const [loadingDivisions, setLoadingDivisions] = React.useState(false);
  const [loadingSuffixes, setLoadingSuffixes] = React.useState(false);

  const sectionRef = React.useRef<HTMLInputElement | null>(null);
  const divisionInputRef = React.useRef<HTMLSelectElement | null>(null);
  const suffixRef = React.useRef<HTMLSelectElement | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const validSection = (s: string) => /^[A-U]$/i.test(s);
  const validDivision = (d: string) => /^\d{2}$/.test(d) && Number(d) >= 1 && Number(d) <= 99;
  const pad2 = (v: string) => v.padStart(2, "0");

  // load divisions (uses cached client which itself uses localStorage + TTL)
  const loadDivisions = React.useCallback(async (sec: string, force = false) => {
    if (!sec) return;
    setLoadingDivisions(true);
    try {
      const res = await getDivisions(sec, undefined, { force });
      const list = res?.divisions ?? DIVISION_FALLBACK;
      setDivisionSuggestions(list);
    } catch {
      setDivisionSuggestions(DIVISION_FALLBACK);
    } finally {
      setLoadingDivisions(false);
    }
  }, []);

  // load suffixes/groups (uses cached client)
  const loadSuffixes = React.useCallback(async (sec: string, div: string, force = false) => {
    if (!sec || !div) return;
    setLoadingSuffixes(true);
    try {
      const res = await getGroups(sec, div, undefined, { force });
      const list = res?.groups ?? SUFFIX_FALLBACK;
      setSuffixSuggestions(list);
    } catch {
      setSuffixSuggestions(SUFFIX_FALLBACK);
    } finally {
      setLoadingSuffixes(false);
    }
  }, []);

  // initial / reactive loads
  React.useEffect(() => {
    if (validSection(section)) {
      loadDivisions(section.toUpperCase(), false);
      // focus division input
    } else setDivisionSuggestions([]);
    // reset dependent fields
    setDivision("");
    setSuffix("");
  }, [section, loadDivisions]);

  React.useEffect(() => {
    if (validDivision(division) && validSection(section)) {
      loadSuffixes(section.toUpperCase(), pad2(division), false);
    } else setSuffixSuggestions([]);
    setSuffix("");
  }, [division, section, loadSuffixes]);

  // background sync: poll every 5 minutes for updates (force refresh)
  React.useEffect(() => {
    const iv = setInterval(() => {
      if (validSection(section)) loadDivisions(section.toUpperCase(), true);
      if (validSection(section) && validDivision(division)) loadSuffixes(section.toUpperCase(), pad2(division), true);
    }, 1000 * 60 * 5);
    return () => clearInterval(iv);
  }, [section, division, loadDivisions, loadSuffixes]);

  const onDivisionFocus = () => {
    if (validSection(section)) loadDivisions(section.toUpperCase(), false);
  };
  const onSuffixFocus = () => {
    if (validSection(section) && validDivision(division)) loadSuffixes(section.toUpperCase(), pad2(division), false);
  };

  const validateSection = (s: string) => {
    if (s && !validSection(s)) return "Sekcja: wybierz literę A–U";
    return undefined;
  };

  const validateDivision = (d: string) => {
    if (!d) return undefined;
    if (!validDivision(d)) return "Dział: wpisz dwie cyfry 01–99";
    if (divisionSuggestions.length > 0 && !divisionSuggestions.includes(pad2(d))) return "Wybierz dział z listy";
    return undefined;
  };

  const validateSuffix = (s: string) => {
    if (!s) return undefined;
    if (!/^[0-9]{1,2}$/.test(s)) return "Klasa: wpisz 1–2 cyfry";
    if (suffixSuggestions.length > 0 && !suffixSuggestions.includes(s)) return "Wybierz klasę z listy";
    return undefined;
  };

  const onDivisionBlur = () => {
    const err = validateDivision(division);
    setErrors((e) => ({ ...e, division: err ?? "" }));
  };

  const onSuffixBlur = () => {
    const err = validateSuffix(suffix);
    setErrors((e) => ({ ...e, suffix: err ?? "" }));
  };

  // keep a ref to the callback so we don't create an effect loop when parent passes inline functions
  const onChangeActionRef = React.useRef(onChangeAction);
  React.useEffect(() => {
    onChangeActionRef.current = onChangeAction;
  }, [onChangeAction]);

  // validation + onChange output
  const prevFullRef = React.useRef<string | undefined>(undefined);
  React.useEffect(() => {
    // empty division => means all divisions in the section (omit division)
    // empty suffix => means all classes in the division (omit suffix)
    const pkdParts = [
      section ? section.toUpperCase() : undefined,
      division ? pad2(division) : undefined,
      suffix || undefined,
    ].filter(Boolean);
    const pkd = pkdParts.length ? pkdParts.join(".") : undefined;

    // only notify parent if the full pkd changed; prevents refresh/update loops when parent
    // provides inline callbacks or when re-renders don't change value
    if (prevFullRef.current !== pkd) {
      prevFullRef.current = pkd;
      onChangeActionRef.current?.({
        section: section ? section.toUpperCase() : undefined,
        division: division || undefined,
        suffix: suffix || undefined,
        pkd,
        full: pkd,
      });
    }
  }, [section, division, suffix]);

  const [divisionQuery, setDivisionQuery] = React.useState("");
  const [divisionOpen, setDivisionOpen] = React.useState(false);
  const [divisionActive, setDivisionActive] = React.useState<number>(-1);

  const [suffixQuery, setSuffixQuery] = React.useState("");
  const [suffixOpen, setSuffixOpen] = React.useState(false);
  const [suffixActive, setSuffixActive] = React.useState<number>(-1);

  // sync queries when underlying selected values change (e.g. when parent clears)
  React.useEffect(() => {
    setDivisionQuery(division ? pad2(division) : "");
  }, [division]);
  React.useEffect(() => {
    setSuffixQuery(suffix ? suffix : "");
  }, [suffix]);

  // close dropdowns on outside click
  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (divisionInputRef.current && !divisionInputRef.current.contains(target as any)) {
        setDivisionOpen(false);
        setDivisionActive(-1);
      }
      if (suffixRef.current && !suffixRef.current.contains(target as any)) {
        setSuffixOpen(false);
        setSuffixActive(-1);
      }
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  return (
    <div className="w-full mt-8">
      <div className="flex items-end gap-4">
        {/* Section */}
        <div className="flex flex-col">
          <label className="text-sm text-gray-700 mb-1">Sekcja</label>
          <div style={{ width: 80 }}>
            <div>
              <Input
                list="section-list"
                ref={sectionRef as any}
                value={section || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSection(e.target.value.slice(0,1).toUpperCase())}
                onBlur={() => {
                  const err = validateSection(section);
                  setErrors((e) => ({ ...e, section: err ?? "" }));
                }}
                placeholder="A"
                aria-label="Sekcja"
              />
              <datalist id="section-list">
                {[..."ABCDEFGHIJKLMNOPQRSTUV"].slice(0,21).map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
           </div>
           {errors.section ? <div className="text-xs text-red-600 mt-1">{errors.section}</div> : null}
         </div>

         {/* Division */}
         <div className="flex flex-col">
           <label className="text-sm text-gray-700 mb-1">Dział</label>
           <div style={{ width: 96 }}>
             <div className="relative" ref={divisionInputRef as any}>
              <Input
                value={divisionQuery}
                placeholder={loadingDivisions ? 'ładowanie...' : divisionSuggestions[0] ?? 'np. 02'}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const raw = e.target.value.replace(/\D/g, '').slice(0, 2);
                  setDivisionQuery(raw);
                  // if user typed full two digits, auto-select
                  if (raw.length === 2) {
                    setDivision(pad2(raw));
                    setDivisionOpen(false);
                  } else {
                    // do not clear underlying selection until commit
                    setDivision('');
                    setDivisionOpen(true);
                  }
                }}
                onFocus={() => { onDivisionFocus(); setDivisionOpen(true); }}
                onBlur={onDivisionBlur}
                disabled={!validSection(section)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (!divisionOpen) return;
                  if (e.key === 'ArrowDown') { e.preventDefault(); setDivisionActive((a) => Math.min(a + 1, Math.max(0, divisionSuggestions.length - 1))); }
                  else if (e.key === 'ArrowUp') { e.preventDefault(); setDivisionActive((a) => Math.max(-1, a - 1)); }
                  else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (divisionActive === -1) {
                      // commit typed value if it's two digits
                      if (divisionQuery.length === 2) setDivision(pad2(divisionQuery));
                    } else {
                      const sel = divisionSuggestions[divisionActive];
                      if (sel) {
                        setDivision(sel);
                        setDivisionQuery(sel);
                      }
                    }
                    setDivisionOpen(false);
                    setDivisionActive(-1);
                  } else if (e.key === 'Escape') { setDivisionOpen(false); setDivisionActive(-1); }
                }}
              />

              {divisionOpen && validSection(section) ? (
                <ul className="absolute z-20 left-0 right-0 bg-gray-800 text-white border border-gray-700 rounded bottom-full mb-1 max-h-40 overflow-auto text-sm shadow-lg">
                  <li className={`px-3 py-2 cursor-pointer ${divisionActive === -1 ? 'bg-gray-700' : 'hover:bg-gray-700'}`} onMouseDown={(e) => { e.preventDefault(); setDivision(''); setDivisionQuery(''); setDivisionOpen(false); }}>
                    Wszystkie działy
                  </li>
                  {loadingDivisions ? (
                    <li className="px-3 py-2 text-gray-400">Ładowanie działów...</li>
                  ) : divisionSuggestions.length === 0 ? (
                    <li className="px-3 py-2 text-gray-400">Brak sugestii</li>
                  ) : (
                    divisionSuggestions.map((d, i) => (
                      <li key={d}
                        className={`px-3 py-2 cursor-pointer ${divisionActive === i ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
                        onMouseDown={(e) => { e.preventDefault(); setDivision(d); setDivisionQuery(d); setDivisionOpen(false); }}
                        onMouseEnter={() => setDivisionActive(i)}
                      >{d}</li>
                    ))
                  )}
                </ul>
              ) : null}
            </div>
          </div>
        </div>

        {/* Suffix */}
        <div className="flex flex-col">
          <label className="text-sm text-gray-700 mb-1">Klasa</label>
          <div style={{ width: 112 }}>
            <div className="relative" ref={suffixRef as any}>
              <Input
                value={suffixQuery}
                placeholder={loadingSuffixes ? 'ładowanie...' : suffixSuggestions[0] ?? 'np. 31'}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const raw = e.target.value.replace(/\D/g, '').slice(0, 2);
                  setSuffixQuery(raw);
                  if (raw.length === 2) { setSuffix(raw); setSuffixOpen(false); } else { setSuffix(''); setSuffixOpen(true); }
                }}
                onFocus={() => { onSuffixFocus(); setSuffixOpen(true); }}
                onBlur={onSuffixBlur}
                disabled={!validDivision(division)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (!suffixOpen) return;
                  if (e.key === 'ArrowDown') { e.preventDefault(); setSuffixActive((a) => Math.min(a + 1, Math.max(0, suffixSuggestions.length - 1))); }
                  else if (e.key === 'ArrowUp') { e.preventDefault(); setSuffixActive((a) => Math.max(-1, a - 1)); }
                  else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (suffixActive === -1) { if (suffixQuery.length === 2) setSuffix(suffixQuery); setSuffixOpen(false); }
                    else { const sel = suffixSuggestions[suffixActive]; if (sel) { setSuffix(sel); setSuffixQuery(sel); } setSuffixOpen(false); }
                  } else if (e.key === 'Escape') { setSuffixOpen(false); setSuffixActive(-1); }
                }}
              />
              {suffixOpen && validDivision(division) ? (
                <ul className="absolute z-20 left-0 right-0 bg-gray-800 text-white border border-gray-700 rounded bottom-full mb-1 max-h-40 overflow-auto text-sm shadow-lg">
                  <li className={`px-3 py-2 cursor-pointer ${suffixActive === -1 ? 'bg-gray-700' : 'hover:bg-gray-700'}`} onMouseDown={(e) => { e.preventDefault(); setSuffix(''); setSuffixQuery(''); setSuffixOpen(false); }}>Wszystkie klasy</li>
                  {loadingSuffixes ? (
                    <li className="px-3 py-2 text-gray-400">Ładowanie klas...</li>
                  ) : suffixSuggestions.length === 0 ? (
                    <li className="px-3 py-2 text-gray-400">Brak sugestii</li>
                  ) : (
                    suffixSuggestions.map((s, i) => (
                      <li key={s}
                        className={`px-3 py-2 cursor-pointer ${suffixActive === i ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
                        onMouseDown={(e) => { e.preventDefault(); setSuffix(s); setSuffixQuery(s); setSuffixOpen(false); }}
                        onMouseEnter={() => setSuffixActive(i)}
                      >{s}</li>
                    ))
                  )}
                </ul>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 text-sm text-gray-700">
        <div className="text-xs text-gray-500 mt-1">
          Przykład: wpisz "B", potem "02", potem "31", aby otrzymać "B.02.31". Sugestie są cache'owane lokalnie i okresowo synchronizowane z API.
        </div>
      </div>
    </div>
  );
}
