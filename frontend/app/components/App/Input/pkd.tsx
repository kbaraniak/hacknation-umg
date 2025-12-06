"use client";
import React from "react";
import { getDivisions, getGroups } from "@/app/lib/client/pkdClient";
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';

type PKDValue = {
  section?: string;
  division?: string;   // "02"
  suffix?: string;     // "31" or "1" (third-level part)
  pkd?: string;        // e.g. "B.02.31"
  full?: string;
};

const DIVISION_FALLBACK = Array.from({ length: 99 }, (_, i) => String(i + 1).padStart(2, "0"));
const SUFFIX_FALLBACK = Array.from({ length: 99 }, (_, i) => String(i + 1)); // "1".."99"

// Simple in-memory cache
const divisionsCache: Record<string, string[]> = {};
const groupsCache: Record<string, string[]> = {};

export default function PKDInput({ onChange }: { onChange?: (v: PKDValue) => void }) {
  const [section, setSection] = React.useState("");
  const [division, setDivision] = React.useState("");
  const [suffix, setSuffix] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [divisionSuggestions, setDivisionSuggestions] = React.useState<string[]>([]);
  const [suffixSuggestions, setSuffixSuggestions] = React.useState<string[]>([]);
  const [loadingDivisions, setLoadingDivisions] = React.useState(false);
  const [loadingSuffixes, setLoadingSuffixes] = React.useState(false);

  const sectionRef = React.useRef<HTMLInputElement | null>(null);
  const divisionRef = React.useRef<HTMLInputElement | null>(null);
  const suffixRef = React.useRef<HTMLInputElement | null>(null);

  const validSection = (s: string) => /^[A-U]$/i.test(s);
  const validDivision = (d: string) => /^\d{2}$/.test(d) && Number(d) >= 1 && Number(d) <= 99;
  const validSuffix = (s: string) => /^\d{1,2}$/.test(s); // supports 1 or 2 digits (e.g. "1" or "31")

  const pad2 = (v: string) => v.padStart(2, "0");

  // load divisions (cache -> localStorage -> API -> fallback)
  const loadDivisions = React.useCallback(async (sec: string) => {
    if (!sec) return;
    const key = `pkd_divisions_${sec}`;
    if (divisionsCache[sec]) {
      setDivisionSuggestions(divisionsCache[sec]);
      return;
    }
    const stored = typeof window !== "undefined" ? localStorage.getItem(key) : null;
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as string[];
        divisionsCache[sec] = parsed;
        setDivisionSuggestions(parsed);
        return;
      } catch {}
    }

    // fetch from API once, but don't spam on failure
    setLoadingDivisions(true);
    try {
      const res = await getDivisions(sec);
      const list = res?.divisions ?? DIVISION_FALLBACK;
      divisionsCache[sec] = list;
      if (typeof window !== "undefined") localStorage.setItem(key, JSON.stringify(list));
      setDivisionSuggestions(list);
    } catch {
      // fallback to local generated list
      divisionsCache[sec] = DIVISION_FALLBACK;
      if (typeof window !== "undefined") localStorage.setItem(key, JSON.stringify(DIVISION_FALLBACK));
      setDivisionSuggestions(DIVISION_FALLBACK);
    } finally {
      setLoadingDivisions(false);
    }
  }, []);

  // load groups/subclasses for section+division
  const loadSuffixes = React.useCallback(async (sec: string, div: string) => {
    if (!sec || !div) return;
    const k = `${sec}_${div}`;
    if (groupsCache[k]) {
      setSuffixSuggestions(groupsCache[k]);
      return;
    }
    const key = `pkd_groups_${k}`;
    const stored = typeof window !== "undefined" ? localStorage.getItem(key) : null;
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as string[];
        groupsCache[k] = parsed;
        setSuffixSuggestions(parsed);
        return;
      } catch {}
    }

    setLoadingSuffixes(true);
    try {
      const res = await getGroups(sec, div);
      const list = res?.groups ?? SUFFIX_FALLBACK;
      groupsCache[k] = list;
      if (typeof window !== "undefined") localStorage.setItem(key, JSON.stringify(list));
      setSuffixSuggestions(list);
    } catch {
      groupsCache[k] = SUFFIX_FALLBACK;
      if (typeof window !== "undefined") localStorage.setItem(key, JSON.stringify(SUFFIX_FALLBACK));
      setSuffixSuggestions(SUFFIX_FALLBACK);
    } finally {
      setLoadingSuffixes(false);
    }
  }, []);

  // effect: when section valid -> load divisions
  React.useEffect(() => {
    if (validSection(section)) loadDivisions(section.toUpperCase());
    else {
      setDivisionSuggestions([]);
    }
    setDivision("");
    setSuffix("");
  }, [section, loadDivisions]);

  // effect: when division valid -> load suffixes
  React.useEffect(() => {
    if (validDivision(division) && validSection(section)) loadSuffixes(section.toUpperCase(), pad2(division));
    else setSuffixSuggestions([]);
    setSuffix("");
  }, [division, section, loadSuffixes]);

  // validate and produce onChange
  React.useEffect(() => {
    const newErrors: Record<string, string> = {};
    if (section && !validSection(section)) newErrors.section = "Sekcja: litera A–U";
    if (division) {
      if (!validDivision(division)) newErrors.division = "Dział: dwie cyfry 01-99";
      else if (divisionSuggestions.length > 0 && !divisionSuggestions.includes(pad2(division)))
        newErrors.division = "Wybierz dział z podpowiedzi";
    }
    if (suffix) {
      if (!validSuffix(suffix)) newErrors.suffix = "Następny poziom: 1–2 cyfry";
      else if (suffixSuggestions.length > 0 && !suffixSuggestions.includes(suffix))
        newErrors.suffix = "Wybierz klasę z podpowiedzi";
    }
    setErrors(newErrors);

    const pkdParts = [
      section ? section.toUpperCase() : undefined,
      division ? pad2(division) : undefined,
      suffix || undefined,
    ].filter(Boolean);
    const pkd = pkdParts.length ? pkdParts.join(".") : undefined;

    onChange?.({
      section: section ? section.toUpperCase() : undefined,
      division: division || undefined,
      suffix: suffix || undefined,
      pkd,
      full: pkd,
    });
  }, [section, division, suffix, divisionSuggestions, suffixSuggestions, onChange]);

  // helpers for suggestion filtering and click fill
  const filterSuggestions = (list: string[], q: string) =>
    list.filter((v) => v.startsWith(q) || v.includes(q)).slice(0, 10);

  return (
    <div className="w-full mt-8">
      <div className="flex items-end gap-4">
        {/* Section */}
        <div className="flex flex-col">
          <label className="text-sm text-gray-700 mb-1">Sekcja</label>
          <input
            ref={sectionRef}
            className="w-20 px-2 py-1 rounded border border-gray-300 bg-white text-black"
            placeholder="A"
            value={section}
            onChange={(e) => {
              const v = e.target.value.slice(0, 1).toUpperCase();
              setSection(v);
              if (validSection(v)) setTimeout(() => divisionRef.current?.focus(), 0);
            }}
            maxLength={1}
            aria-invalid={!!errors.section}
          />
        </div>

        {/* Division (MUI Autocomplete dropdown + input, uses existing MUI component) */}
        <div className="flex flex-col relative">
          <label className="text-sm text-gray-700 mb-1">Dział</label>
          <div style={{ width: 96 }}>
            <Autocomplete
              ref={divisionRef}
              options={divisionSuggestions}
              value={division ? pad2(division) : null}
              onChange={(_, val) => {
                const digits = val ? val.replace(/\D/g, "").slice(0, 2) : "";
                setDivision(digits);
                if (digits && digits.length === 2) setTimeout(() => suffixRef.current?.focus(), 0);
              }}
              disabled={!validSection(section)}
              disableClearable
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder={loadingDivisions ? "ładowanie..." : divisionSuggestions[0] ?? "np. 02"}
                  size="small"
                  onChange={(e) => {
                    if (!validSection(section)) return;
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 2);
                    // update input as raw digits (Autocomplete value sync handled in onChange)
                    setDivision(digits);
                  }}
                />
              )}
              PopperProps={{ sx: { zIndex: 1300 } }}
            />
          </div>
          {/* helper / placeholder BELOW input */}
          <div className="mt-1">
            {loadingDivisions ? (
              <div className="text-xs text-gray-500">Ładowanie podpowiedzi...</div>
            ) : divisionSuggestions.length > 0 && !division ? (
              <div className="text-xs text-gray-700">Podpowiedź: <span className="font-medium text-gray-900">{divisionSuggestions[0]}</span></div>
            ) : null}
          </div>
        </div>

        {/* Suffix (MUI Autocomplete dropdown + input) */}
        <div className="flex flex-col relative">
          <label className="text-sm text-gray-700 mb-1">Klasa</label>
          <div style={{ width: 112 }}>
            <Autocomplete
              ref={suffixRef}
              options={suffixSuggestions}
              value={suffix || null}
              onChange={(_, val) => {
                const digits = val ? val.replace(/\D/g, "").slice(0, 2) : "";
                setSuffix(digits);
              }}
              disabled={!validDivision(division)}
              disableClearable
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder={loadingSuffixes ? "ładowanie..." : suffixSuggestions[0] ?? "np. 31"}
                  size="small"
                  onChange={(e) => {
                    if (!validDivision(division)) return;
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 2);
                    setSuffix(digits);
                  }}
                />
              )}
              PopperProps={{ sx: { zIndex: 1300 } }}
            />
          </div>
          <div className="mt-1">
            {loadingSuffixes ? (
              <div className="text-xs text-gray-500">Ładowanie podpowiedzi...</div>
            ) : suffixSuggestions.length > 0 && !suffix ? (
              <div className="text-xs text-gray-700">Podpowiedź: <span className="font-medium text-gray-900">{suffixSuggestions[0]}</span></div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Errors shown together a bit below inputs */}
      <div className="mt-3 text-sm">
        {Object.keys(errors).length > 0 ? (
          <div className="text-red-600">
            {Object.values(errors).map((msg, i) => (
              <div key={i} className="mb-1">{msg}</div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-3 text-sm text-gray-700">
        <div className="text-xs text-gray-500 mt-1">
          Przykład: wpisz "B", potem "02", potem "31", aby otrzymać "B.02.31". Wybierz wartość z podpowiedzi (kliknij) lub wpisz dokładną wartość.
        </div>
      </div>
    </div>
  );
}