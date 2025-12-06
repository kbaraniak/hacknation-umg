"use client";
import React from "react";
import { Button } from "@heroui/react";

type PKDValue = {
  section?: string;
  division?: string;
  suffix?: string;
  pkd?: string;
  full?: string;
};

type IndustryListProps = {
  items: PKDValue[];
  onChangeAction?: (codes: string[]) => void;
  onAdd?: () => void;
  onRemove?: (index: number) => void;
};

export default function IndustryList({ items, onChangeAction, onAdd, onRemove }: IndustryListProps) {
  // Use ref to store callback to prevent effect loops
  const onChangeActionRef = React.useRef(onChangeAction);
  
  // Update callback ref when prop changes
  React.useEffect(() => {
    onChangeActionRef.current = onChangeAction;
  }, [onChangeAction]);
  
  // Notify parent when items change (only depends on items, not callback)
  React.useEffect(() => {
    const codes = items.map(it => it.full || '').filter(Boolean);
    onChangeActionRef.current?.(codes);
  }, [items]);
  
  return (
    <div className="w-full mt-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Wybrane branże</h3>
          {onAdd && (
            <Button
              size="sm"
              color="primary"
              onClick={onAdd}
            >
              Dodaj branżę
            </Button>
          )}
        </div>
        
        {items.length === 0 ? (
          <div className="text-sm text-gray-500 italic">
            Brak wybranych branż. Kliknij &quot;Dodaj branżę&quot; aby rozpocząć.
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900">
                    {item.full || 'Nie określono'}
                  </span>
                  <span className="text-xs text-gray-500">
                    Sekcja: {item.section || '-'} | Dział: {item.division || '-'} | Klasa: {item.suffix || '-'}
                  </span>
                </div>
                {onRemove && (
                  <Button
                    size="sm"
                    color="danger"
                    variant="light"
                    onClick={() => onRemove(index)}
                  >
                    Usuń
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
