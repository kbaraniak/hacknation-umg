"use client";
import React from "react";
import { Input } from "@heroui/react";

type TimeRangeValue = {
  from: number;
  to: number;
};

type TimeRangeProps = {
  value?: TimeRangeValue;
  onChangeAction?: (range: TimeRangeValue) => void;
  minYear?: number;
  maxYear?: number;
};

export default function TimeRange({ 
  value, 
  onChangeAction, 
  minYear = 2000, 
  maxYear = new Date().getFullYear() 
}: TimeRangeProps) {
  const [fromMonth, setFromMonth] = React.useState(value?.from || minYear);
  const [toMonth, setToMonth] = React.useState(value?.to || maxYear);
  
  // Use ref to store callback to prevent effect loops
  const onChangeActionRef = React.useRef(onChangeAction);
  const timerRef = React.useRef<number | null>(null);
  
  // Update callback ref when prop changes
  React.useEffect(() => {
    onChangeActionRef.current = onChangeAction;
  }, [onChangeAction]);
  
  // Sync local state when value prop changes
  React.useEffect(() => {
    if (value) {
      setFromMonth(value.from);
      setToMonth(value.to);
    }
  }, [value]);
  
  // Debounced notification to parent (200ms delay)
  React.useEffect(() => {
    // Clear previous timer
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
    
    // Normalize: ensure from <= to
    let fYear = fromMonth;
    let tYear = toMonth;
    if (fYear > tYear) {
      [fYear, tYear] = [tYear, fYear];
    }
    
    // Clamp to valid range
    fYear = Math.max(minYear, Math.min(maxYear, fYear));
    tYear = Math.max(minYear, Math.min(maxYear, tYear));
    
    // Set debounced timer
    timerRef.current = window.setTimeout(() => {
      onChangeActionRef.current?.({ from: fYear, to: tYear });
    }, 200);
    
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [fromMonth, toMonth, minYear, maxYear]);
  
  const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) {
      setFromMonth(val);
    }
  };
  
  const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) {
      setToMonth(val);
    }
  };
  
  return (
    <div className="w-full mt-4">
      <div className="flex items-center gap-4">
        <div className="flex flex-col flex-1">
          <label className="text-sm text-gray-700 mb-1">Rok od</label>
          <Input
            type="number"
            value={fromMonth.toString()}
            onChange={handleFromChange}
            min={minYear}
            max={maxYear}
            size="sm"
          />
        </div>
        
        <div className="flex items-center pt-6">
          <span className="text-gray-500">—</span>
        </div>
        
        <div className="flex flex-col flex-1">
          <label className="text-sm text-gray-700 mb-1">Rok do</label>
          <Input
            type="number"
            value={toMonth.toString()}
            onChange={handleToChange}
            min={minYear}
            max={maxYear}
            size="sm"
          />
        </div>
      </div>
      
      <div className="mt-2 text-xs text-gray-500">
        Zakres lat: {Math.min(fromMonth, toMonth)} - {Math.max(fromMonth, toMonth)}
      </div>
    </div>
  );
}
