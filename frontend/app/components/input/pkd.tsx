"use client";
import React from "react";
import { getDivisions, getGroups } from "@/app/lib/client/pkdClient";
import { Autocomplete, AutocompleteItem } from "@heroui/autocomplete";
import { usePolling } from "@/app/hooks/usePolling";

// ==================== Types ====================

type PKDValue = {
    section?: string;     // Letter A-U (e.g., "B")
    division?: string;    // 2-digit code (e.g., "02")
    suffix?: string;      // Class code (e.g., "31")
    pkd?: string;         // Full code (e.g., "B.02.31")
    full?: string;        // Same as pkd
};

// ==================== Constants ====================

const FALLBACK_DIVISIONS = Array.from({ length: 99 }, (_, index) =>
    String(index + 1).padStart(2, "0")
);

const FALLBACK_CLASSES = Array.from({ length: 99 }, (_, index) =>
    String(index + 1)
);

const SECTIONS = "ABCDEFGHIJKLMNOPQRSTUV".split("");
const SYNC_INTERVAL_MS = 1000 * 60 * 5; // 5 minutes

// ==================== Component ====================

export default function PKDInput({ onChangeAction }: { onChangeAction?: (v: PKDValue) => void }) {
    // Selected values
    const [selectedSection, setSelectedSection] = React.useState("");
    const [selectedDivision, setSelectedDivision] = React.useState("");
    const [selectedClass, setSelectedClass] = React.useState("");

    // Dropdown suggestions
    const [divisionOptions, setDivisionOptions] = React.useState<string[]>([]);
    const [classOptions, setClassOptions] = React.useState<string[]>([]);

    // Loading states
    const [isLoadingDivisions, setIsLoadingDivisions] = React.useState(false);
    const [isLoadingClasses, setIsLoadingClasses] = React.useState(false);

    // Validation errors
    const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({});

    // Refs
    const onChangeCallbackRef = React.useRef(onChangeAction);
    const previousPKDRef = React.useRef<string | undefined>(undefined);

    // ==================== Validation Functions ====================

    const isSectionValid = (value: string) => /^[A-U]$/i.test(value);

    const isDivisionValid = (value: string) =>
        /^\d{2}$/.test(value) && Number(value) >= 1 && Number(value) <= 99;

    const padToTwoDigits = (value: string) => value.padStart(2, "0");

    const validateSection = (value: string) => {
        if (value && !isSectionValid(value)) {
            return "Sekcja: wybierz literę A–U";
        }
        return undefined;
    };

    const validateDivision = (value: string) => {
        if (!value) return undefined;

        if (!isDivisionValid(value)) {
            return "Dział: wpisz dwie cyfry 01–99";
        }

        if (divisionOptions.length > 0 && !divisionOptions.includes(padToTwoDigits(value))) {
            return "Wybierz dział z listy";
        }

        return undefined;
    };

    const validateClass = (value: string) => {
        if (!value) return undefined;

        if (!/^[0-9]{1,2}$/.test(value)) {
            return "Klasa: wpisz 1–2 cyfry";
        }

        if (classOptions.length > 0 && !classOptions.includes(value)) {
            return "Wybierz klasę z listy";
        }

        return undefined;
    };

    // ==================== Data Loading Functions ====================

    const fetchDivisionOptions = React.useCallback(async (
        sectionCode: string,
        forceRefresh = false
    ) => {
        if (!sectionCode) return;

        setIsLoadingDivisions(true);
        try {
            const response = await getDivisions(sectionCode, undefined, { force: forceRefresh });
            const divisions = response?.divisions ?? FALLBACK_DIVISIONS;
            setDivisionOptions(divisions);
        } catch {
            setDivisionOptions(FALLBACK_DIVISIONS);
        } finally {
            setIsLoadingDivisions(false);
        }
    }, []);

    const fetchClassOptions = React.useCallback(async (
        sectionCode: string,
        divisionCode: string,
        forceRefresh = false
    ) => {
        if (!sectionCode || !divisionCode) return;

        setIsLoadingClasses(true);
        try {
            const response = await getGroups(sectionCode, divisionCode, undefined, { force: forceRefresh });
            const classes = response?.groups ?? FALLBACK_CLASSES;
            setClassOptions(classes);
        } catch {
            setClassOptions(FALLBACK_CLASSES);
        } finally {
            setIsLoadingClasses(false);
        }
    }, []);

    // ==================== Effects ====================

    // Load divisions when section changes
    React.useEffect(() => {
        if (isSectionValid(selectedSection)) {
            fetchDivisionOptions(selectedSection.toUpperCase(), false);
        } else {
            setDivisionOptions([]);
        }

        setSelectedDivision("");
        setSelectedClass("");
    }, [selectedSection, fetchDivisionOptions]);

    // Load classes when division changes
    React.useEffect(() => {
        if (isDivisionValid(selectedDivision) && isSectionValid(selectedSection)) {
            fetchClassOptions(
                selectedSection.toUpperCase(),
                padToTwoDigits(selectedDivision),
                false
            );
        } else {
            setClassOptions([]);
        }

        setSelectedClass("");
    }, [selectedDivision, selectedSection, fetchClassOptions]);

    // Use polling hook for background refresh every 5 minutes
    usePolling(SYNC_INTERVAL_MS);

    // Keep callback ref updated
    React.useEffect(() => {
        onChangeCallbackRef.current = onChangeAction;
    }, [onChangeAction]);

    // Notify parent of changes
    React.useEffect(() => {
        const pkdParts = [
            selectedSection ? selectedSection.toUpperCase() : undefined,
            selectedDivision ? padToTwoDigits(selectedDivision) : undefined,
            selectedClass || undefined,
        ].filter(Boolean);

        const fullPKD = pkdParts.length ? pkdParts.join(".") : undefined;

        // Only notify if PKD actually changed
        if (previousPKDRef.current !== fullPKD) {
            previousPKDRef.current = fullPKD;
            onChangeCallbackRef.current?.({
                section: selectedSection || undefined,
                division: selectedDivision || undefined,
                suffix: selectedClass || undefined,
                pkd: fullPKD,
                full: fullPKD,
            });
        }
    }, [selectedSection, selectedDivision, selectedClass]);

    // ==================== Render ====================

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Section picker */}
            <Autocomplete
                label="Sekcja"
                placeholder="Wybierz sekcję"
                selectedKey={selectedSection}
                onSelectionChange={(key) => setSelectedSection(key as string)}
                isInvalid={!!validationErrors.section}
                errorMessage={validationErrors.section}
            >
                {SECTIONS.map((letter) => (
                    <AutocompleteItem key={letter}>
                        {letter}
                    </AutocompleteItem>
                ))}
            </Autocomplete>

            {/* Division picker */}
            <Autocomplete
                label="Dział"
                placeholder="Wybierz dział"
                selectedKey={selectedDivision}
                onSelectionChange={(key) => setSelectedDivision(key as string)}
                isLoading={isLoadingDivisions}
                isDisabled={!isSectionValid(selectedSection)}
                isInvalid={!!validationErrors.division}
                errorMessage={validationErrors.division}
                onFocus={() => {
                    if (isSectionValid(selectedSection)) {
                        fetchDivisionOptions(selectedSection.toUpperCase(), false);
                    }
                }}
            >
                {divisionOptions.map((division) => (
                    <AutocompleteItem key={division}>
                        {division}
                    </AutocompleteItem>
                ))}
            </Autocomplete>

            {/* Class picker */}
            <Autocomplete
                label="Klasa"
                placeholder="Wybierz klasę"
                selectedKey={selectedClass}
                onSelectionChange={(key) => setSelectedClass(key as string)}
                isLoading={isLoadingClasses}
                isDisabled={!isDivisionValid(selectedDivision)}
                isInvalid={!!validationErrors.suffix}
                errorMessage={validationErrors.suffix}
                onFocus={() => {
                    if (isSectionValid(selectedSection) && isDivisionValid(selectedDivision)) {
                        fetchClassOptions(selectedSection.toUpperCase(), padToTwoDigits(selectedDivision), false);
                    }
                }}
            >
                {classOptions.map((classCode) => (
                    <AutocompleteItem key={classCode}>
                        {classCode}
                    </AutocompleteItem>
                ))}
            </Autocomplete>
        </div>
    );
}
