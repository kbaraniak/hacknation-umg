"use client";
import React from "react";
import { Button } from "@heroui/react";
import { Add as AddIcon, Remove as RemoveIcon } from "@mui/icons-material";
import PKDInput from "@/app/components/App/Input/pkd";

type PKDValue = {
  section?: string;
  division?: string;
  suffix?: string;
  pkd?: string;
  full?: string;
};

type IndustryListProps = {
  onChangeAction?: (list: string[]) => void;
};

export default function IndustryList({ onChangeAction }: IndustryListProps) {
  const [items, setItems] = React.useState<PKDValue[]>([{}]);

  // Store onChangeAction in a ref to prevent dependency loop
  const onChangeActionRef = React.useRef(onChangeAction);
  React.useEffect(() => {
    onChangeActionRef.current = onChangeAction;
  }, [onChangeAction]);

  // Effect that only depends on items, not onChangeAction
  React.useEffect(() => {
    // Propagate only valid 'full' PKD strings to parent
    const validPkds = items.map((it) => it.full || "").filter(Boolean);
    onChangeActionRef.current?.(validPkds);
  }, [items]);

  // Update an item, but preserve array reference if no actual change
  const updateItem = (idx: number, v: Partial<PKDValue>) => {
    setItems((s) => {
      const current = s[idx];
      const merged = { ...current, ...v };
      
      // Check if values actually changed (including pkd field)
      if (
        current?.full === merged.full &&
        current?.section === merged.section &&
        current?.division === merged.division &&
        current?.suffix === merged.suffix &&
        current?.pkd === merged.pkd
      ) {
        return s; // same array reference -> avoids triggering effect
      }
      
      const next = s.slice();
      next[idx] = merged;
      return next;
    });
  };

  const addItem = () => {
    setItems((s) => [...s, {}]);
  };

  const removeItem = (idx: number) => {
    setItems((s) => {
      // Keep at least one item - don't remove if only one item remains
      if (s.length <= 1) return s;
      const next = s.slice();
      next.splice(idx, 1);
      return next;
    });
  };

  return (
    <div className="w-full">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-start gap-2 mb-4">
          <div className="flex-1">
            <PKDInput
              onChange={(v) => updateItem(idx, v)}
            />
          </div>
          <div className="flex gap-2 mt-8">
            {idx === items.length - 1 && (
              <Button
                isIconOnly
                color="primary"
                aria-label="Dodaj branżę"
                onPress={addItem}
                size="sm"
              >
                <AddIcon />
              </Button>
            )}
            {items.length > 1 && (
              <Button
                isIconOnly
                color="danger"
                aria-label="Usuń branżę"
                onPress={() => removeItem(idx)}
                size="sm"
              >
                <RemoveIcon />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
