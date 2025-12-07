"use client";

import React, { createContext, useContext, useState } from 'react';

type PKDItem = {
    section?: string;
    division?: string;
    suffix?: string;
    pkd?: string;
    full?: string;
};

type PKDContextType = {
    selectedPKDs: PKDItem[];
    setSelectedPKDs: (pkds: PKDItem[]) => void;
};

const PKDContext = createContext<PKDContextType | undefined>(undefined);

export function PKDProvider({ children }: { children: React.ReactNode }) {
    const [selectedPKDs, setSelectedPKDs] = useState<PKDItem[]>([]);

    return (
        <PKDContext.Provider value={{ selectedPKDs, setSelectedPKDs }}>
            {children}
        </PKDContext.Provider>
    );
}

export function usePKD() {
    const context = useContext(PKDContext);
    if (context === undefined) {
        throw new Error('usePKD must be used within a PKDProvider');
    }
    return context;
}
