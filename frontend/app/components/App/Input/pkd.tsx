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

export default function PKDInput({ onChange }: { onChange?: (v: PKDValue) => void }) {
  const [section, setSection] = React.useState("");
  const [division, setDivision] = React.useState("");
  const [suffix, setSuffix] = React.useState("");
  const [divisionSuggestions, setDivisionSuggestions] = React.useState<string[]>([]);
  const [suffixSuggestions, setSuffixSuggestions] = React.useState<string[]>([]);
  const [loadingDivisions, setLoadingDivisions] = React.useState(false);
  const [loadingSuffixes, setLoadingSuffixes] = React.useState(false);

  const sectionRef = React.useRef<HTMLInputElement | null>(null);
  const divisionRef = React.useRef<HTMLDivElement | null>(null);
  const divisionInputRef = React.useRef<HTMLInputElement | null>(null);
  const suffixRef = React.useRef<HTMLDivElement | null>(null);
  const [divisionOpen, setDivisionOpen] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [divisionInput, setDivisionInput] = React.useState("");
  
  // Refs to prevent update loops
  const prevFullRef = React.useRef<string | undefined>(undefined);
  const onChangeActionRef = React.useRef(onChange);
  
  // Update callback ref when onChange prop changes
  React.useEffect(() => {
    onChangeActionRef.current = onChange;
  }, [onChange]);

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
      // open division suggestions and focus input
      setDivisionOpen(true);
      setTimeout(() => divisionInputRef.current?.focus(), 0);
    } else setDivisionSuggestions([]);
    setDivision("");
    setSuffix("");
  }, [section, loadDivisions]);

  React.useEffect(() => {
    if (validDivision(division) && validSection(section)) loadSuffixes(section.toUpperCase(), pad2(division), false);
    else setSuffixSuggestions([]);
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

  // on-focus refresh if local cache stale (force=false above handles TTL in client)
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

  const onSectionBlur = () => {
    const err = validateSection(section);
    setErrors((e) => ({ ...e, section: err ?? "" }));
  };

  const onDivisionBlur = () => {
    const err = validateDivision(division);
    setErrors((e) => ({ ...e, division: err ?? "" }));
    // close dropdown when leaving
    setDivisionOpen(false);
  };

  const onSuffixBlur = () => {
    const err = validateSuffix(suffix);
    setErrors((e) => ({ ...e, suffix: err ?? "" }));
  };

  // validation + onChange output (only emit when PKD actually changes)
  React.useEffect(() => {
    const pkdParts = [
      section ? section.toUpperCase() : undefined,
      division ? pad2(division) : undefined,
      suffix || undefined,
    ].filter(Boolean);
    const pkd = pkdParts.length ? pkdParts.join(".") : undefined;
    
    // Only call onChange if the PKD value actually changed
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

  return (
    <div className="w-full mt-8">
      <div className="flex items-end gap-4">
        {/* Section (Autocomplete) */}
        <div className="flex flex-col">
          <label className="text-sm text-gray-700 mb-1">Sekcja</label>
          <div style={{ width: 80 }}>
            <Autocomplete
              options={[..."ABCDEFGHIJKLMNOPQRSTUV"].slice(0, 21)}
              value={section || undefined}
              onChange={(_, val) => {
                const v = (val || "").toString().slice(0, 1).toUpperCase();
                setSection(v);
                // after selecting section, open division suggestions
                if (validSection(v)) {
                  setDivisionOpen(true);
                  setTimeout(() => divisionInputRef.current?.focus(), 0);
                }
              }}
              freeSolo={false}
              disableClearable
              renderInput={(params) => (
                <TextField
                  {...params}
                  inputRef={sectionRef}
                  placeholder="A"
                  size="small"
                  onChange={(e) => {
                    const v = e.target.value.slice(0, 1).toUpperCase();
                    setSection(v);
                  }}
                  onBlur={onSectionBlur}
                />
              )}
            />
          </div>
          {errors.section ? <div className="text-xs text-red-600 mt-1">{errors.section}</div> : null}
        </div>

        {/* Division (MUI Autocomplete) */}
        <div className="flex flex-col">
          <label className="text-sm text-gray-700 mb-1">Dział</label>
          <div style={{ width: 96 }}>
            <Autocomplete
                            ref={divisionRef}
              options={divisionSuggestions}
              value={division ? pad2(division) : undefined}
              inputValue={divisionInput}
              onInputChange={(_, input, reason) => {
                // keep raw digits in input while typing
                if (reason === 'input') {
                  const digits = input.replace(/\D/g, '').slice(0, 2);
                  setDivisionInput(digits);
                  // if user completed two digits, commit division and move focus to suffix
                  if (digits.length === 2) {
                    const two = pad2(digits);
                    setDivision(two);
                    setDivisionInput(two);
                    setDivisionOpen(false);
                    setTimeout(() => suffixRef.current?.focus?.(), 0);
                  }
                }
              }}
              open={divisionOpen}
              onOpen={() => setDivisionOpen(true)}
              onClose={() => setDivisionOpen(false)}
              onChange={(_, val) => {
                // selection from list
                const digits = val ? val.toString().replace(/\D/g, '').slice(0, 2) : '';
                setDivision(digits);
                setDivisionInput(digits ? pad2(digits) : '');
                if (digits && digits.length === 2) setTimeout(() => suffixRef.current?.focus?.(), 0);
              }}
              disabled={!validSection(section)}
              freeSolo={true}
              disableClearable
              renderInput={(params) => (
                <TextField
                  {...params}
                  inputRef={divisionInputRef}
                  placeholder={loadingDivisions ? 'ładowanie...' : divisionSuggestions[0] ?? 'np. 02'}
                  size="small"
                  value={divisionInput}
                  onChange={(e) => {
                    if (!validSection(section)) return;
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 2);
                    setDivisionInput(digits);
                    // if user typed two digits, commit as division
                    if (digits.length === 2) {
                      const two = pad2(digits);
                      setDivision(two);
                      setDivisionInput(two);
                      setDivisionOpen(false);
                      setTimeout(() => suffixRef.current?.focus?.(), 0);
                    } else {
                      // keep division state cleared until user selects or finishes
                      setDivision('');
                    }
                  }}
                  onFocus={() => { onDivisionFocus(); setDivisionOpen(true); }}
                  onBlur={onDivisionBlur}
                />
              )}
            />
          </div>
          <div className="mt-1 text-xs text-gray-800">
            {!division && !loadingDivisions && divisionSuggestions[0] ? <>Podpowiedź: <span className="font-medium text-gray-900">{divisionSuggestions[0]}</span></> : null}
            {errors.division ? <div className="text-xs text-red-600 mt-1">{errors.division}</div> : null}
          </div>
        </div>

        {/* Suffix (MUI Autocomplete) */}
        <div className="flex flex-col">
          <label className="text-sm text-gray-700 mb-1">Klasa</label>
          <div style={{ width: 112 }}>
            <Autocomplete
              ref={suffixRef}
              options={suffixSuggestions}
              value={suffix || undefined}
              onChange={(_, val) => {
                const digits = val ? val.replace(/\D/g, "").slice(0, 2) : "";
                setSuffix(digits);
              }}
              disabled={!validDivision(division)}
              freeSolo={true}
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
                  onFocus={onSuffixFocus}
                  onBlur={onSuffixBlur}
                />
              )}
            />
          </div>
          <div className="mt-1 text-xs text-gray-800">
            {!suffix && !loadingSuffixes && suffixSuggestions[0] ? <>Podpowiedź: <span className="font-medium text-gray-900">{suffixSuggestions[0]}</span></> : null}
            {errors.suffix ? <div className="text-xs text-red-600 mt-1">{errors.suffix}</div> : null}
          </div>
        </div>
      </div>

      <div className="mt-3 text-sm text-gray-700">
        <div className="text-xs text-gray-500 mt-1">
          Przykład: wpisz &quot;B&quot;, potem &quot;02&quot;, potem &quot;31&quot;, aby otrzymać &quot;B.02.31&quot;. Sugestie są cache&apos;owane lokalnie i okresowo synchronizowane z API.
        </div>
      </div>
    </div>
  );
}
