// Use HeroUI Input for month selection to align with project UI

"use client";
import React from "react";
import { Input } from '@heroui/input';

function yearFromMonthInput(v?: string) {
  if (!v) return undefined;
  // month input returns YYYY-MM
  const parts = v.split('-');
  const y = Number(parts[0]);
  return Number.isFinite(y) ? y : undefined;
}

export default function TimeRange({ value, onChangeAction }: { value?: { from: number; to: number }; onChangeAction?: (v: { from: number; to: number }) => void }) {
  const initialFromMonth = (value?.from ?? 2018) + "-01"; // use Jan of the year
  const initialToMonth = (value?.to ?? 2024) + "-12"; // use Dec of the year

  const [fromMonth, setFromMonth] = React.useState<string>(initialFromMonth);
  const [toMonth, setToMonth] = React.useState<string>(initialToMonth);

  // keep latest callback in ref to avoid including it in deps and causing loops
  const onChangeActionRef = React.useRef(onChangeAction);
  React.useEffect(() => { onChangeActionRef.current = onChangeAction; }, [onChangeAction]);

  // sync local state when `value` prop changes (but avoid unnecessary updates)
  React.useEffect(() => {
    if (!value) return;
    const desiredFrom = `${value.from}-01`;
    const desiredTo = `${value.to}-12`;
    setFromMonth((prev) => (prev === desiredFrom ? prev : desiredFrom));
    setToMonth((prev) => (prev === desiredTo ? prev : desiredTo));
  }, [value]);

  // debounce timer ref
  const timerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    // compute years
    const fYear = yearFromMonthInput(fromMonth) ?? 0;
    const tYear = yearFromMonthInput(toMonth) ?? 0;

    // if invalid range, normalize by setting months and return — change in state will re-run this effect
    if (fYear > tYear) {
      const minY = Math.min(fYear, tYear);
      const maxY = Math.max(fYear, tYear);
      setFromMonth(`${minY}-01`);
      setToMonth(`${maxY}-12`);
      return;
    }

    // clear previous timer
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // debounce call to parent to avoid rapid updates and break update loops
    timerRef.current = window.setTimeout(() => {
      try {
        onChangeActionRef.current?.({ from: fYear, to: tYear });
      } finally {
        // clear stored timer id
        timerRef.current = null;
      }
    }, 200);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [fromMonth, toMonth]);

  return (
    <div className="flex items-center gap-3">
      <div>
        <label className="text-sm text-gray-700">Od</label>
        <Input
          type="month"
          value={fromMonth}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFromMonth(e.target.value)}
          min="2000-01"
          max="2100-12"
        />
      </div>
      <div>
        <label className="text-sm text-gray-700">Do</label>
        <Input
          type="month"
          value={toMonth}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setToMonth(e.target.value)}
          min="2000-01"
          max="2100-12"
        />
      </div>
    </div>
  );
}
