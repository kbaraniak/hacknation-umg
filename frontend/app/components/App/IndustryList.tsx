// Rename prop to `onChangeAction` to follow Next `use client` conventions

"use client";
import React from "react";
import PKDInput from "@/app/components/App/Input/pkd";
import { Button } from '@heroui/button';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';

type PKDValue = {
  section?: string;
  division?: string;
  suffix?: string;
  pkd?: string;
  full?: string;
};

export default function IndustryList({
  value,
  onChangeAction,
}: {
  value?: string[];
  onChangeAction?: (list: string[]) => void;
}) {
  const [items, setItems] = React.useState<PKDValue[]>(
    value && value.length > 0 ? value.map((v) => ({ full: v, pkd: v })) : [{ full: undefined }]
  );

  // keep onChangeAction in a ref to avoid rerunning the items effect when parent
  // provides an inline callback that changes identity on every render
  const onChangeActionRef = React.useRef(onChangeAction);
  React.useEffect(() => { onChangeActionRef.current = onChangeAction; }, [onChangeAction]);

  React.useEffect(() => {
    // propagate only `full` strings (filter undefined/empty)
    onChangeActionRef.current?.(items.map((it) => it.full || '').filter(Boolean));
  }, [items]);

  const addItem = () => setItems((s) => [...s, { full: undefined }]);
  const removeItem = (idx: number) => setItems((s) => s.filter((_, i) => i !== idx));
  const updateItem = (idx: number, v: PKDValue) =>
    setItems((s) => {
      const current = s[idx];
      const merged = { ...current, ...v };
      // if nothing changed, return the same array reference to avoid triggering re-renders
      if (
        current?.full === merged.full &&
        current?.section === merged.section &&
        current?.division === merged.division &&
        current?.suffix === merged.suffix
      ) {
        return s;
      }
      const next = s.slice();
      next[idx] = merged;
      return next;
    });

  return (
    <div className="w-full">
      {items.map((it, idx) => (
        <div key={idx} className="flex items-start gap-4 mb-4">
          <div className="flex-1">
            <PKDInput
              onChangeAction={(v) => updateItem(idx, v)}
            />
          </div>
          <div>
            <Button
              variant="ghost"
              color="danger"
              onClick={() => removeItem(idx)}
              disabled={items.length === 1}
              aria-label="remove"
            >
              <RemoveCircleOutlineIcon />
            </Button>
          </div>
        </div>
      ))}

      <div className="mt-2">
        <Button variant="solid" color="primary" onClick={addItem} aria-label="add">
          <AddCircleOutlineIcon />
        </Button>
      </div>
    </div>
  );
}
