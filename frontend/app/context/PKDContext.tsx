"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { saveToStorage, loadFromStorage } from '@/lib/client/storage';

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
    startYear: number;
    setStartYear: (year: number) => void;
    endYear: number;
    setEndYear: (year: number) => void;
};

const PKDContext = createContext<PKDContextType | undefined>(undefined);

const STORAGE_KEYS = {
    PKDS: 'hacknation_selected_pkds',
    START_YEAR: 'hacknation_start_year',
    END_YEAR: 'hacknation_end_year',
};

// Default values - used on both server and client initial render
const DEFAULT_VALUES = {
    PKDS: [] as PKDItem[],
    START_YEAR: 2015,
    END_YEAR: 2025,
};

export function PKDProvider({ children }: { children: React.ReactNode }) {
    const [isHydrated, setIsHydrated] = useState(false);
    
    // Initialize with defaults (same on server and client)
    const [selectedPKDs, setSelectedPKDsState] = useState<PKDItem[]>(DEFAULT_VALUES.PKDS);
    const [startYear, setStartYearState] = useState<number>(DEFAULT_VALUES.START_YEAR);
    const [endYear, setEndYearState] = useState<number>(DEFAULT_VALUES.END_YEAR);

    // Load from localStorage after hydration
    useEffect(() => {
        const storedPKDs = loadFromStorage<PKDItem[]>(STORAGE_KEYS.PKDS);
        const storedStartYear = loadFromStorage<number>(STORAGE_KEYS.START_YEAR);
        const storedEndYear = loadFromStorage<number>(STORAGE_KEYS.END_YEAR);

        if (storedPKDs !== null) {
            setSelectedPKDsState(storedPKDs);
        }
        if (storedStartYear !== null) {
            setStartYearState(storedStartYear);
        }
        if (storedEndYear !== null) {
            setEndYearState(storedEndYear);
        }

        setIsHydrated(true);
    }, []);

    // Save to localStorage whenever values change (only after hydration)
    useEffect(() => {
        if (isHydrated) {
            saveToStorage(STORAGE_KEYS.PKDS, selectedPKDs);
        }
    }, [selectedPKDs, isHydrated]);

    useEffect(() => {
        if (isHydrated) {
            saveToStorage(STORAGE_KEYS.START_YEAR, startYear);
        }
    }, [startYear, isHydrated]);

    useEffect(() => {
        if (isHydrated) {
            saveToStorage(STORAGE_KEYS.END_YEAR, endYear);
        }
    }, [endYear, isHydrated]);

    const setSelectedPKDs = (pkds: PKDItem[]) => {
        setSelectedPKDsState(pkds);
    };

    const setStartYear = (year: number) => {
        setStartYearState(year);
    };

    const setEndYear = (year: number) => {
        setEndYearState(year);
    };

    return (
        <PKDContext.Provider value={{ 
            selectedPKDs, 
            setSelectedPKDs,
            startYear,
            setStartYear,
            endYear,
            setEndYear
        }}>
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
