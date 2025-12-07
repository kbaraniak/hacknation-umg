"use client";

import React from "react";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
} from "@heroui/modal";
import { Button } from "@heroui/button";
import { useDisclosure } from "@heroui/use-disclosure";
import { Chip } from "@heroui/chip";
import PKDInput from "./input/pkd";

type PKDItem = {
    section?: string;
    division?: string;
    suffix?: string;
    pkd?: string;
    full?: string;
};

type PKDModalProps = {
    onPKDsChange?: (pkds: PKDItem[]) => void;
};

export default function PKDModal({ onPKDsChange }: PKDModalProps) {
    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const [pkdList, setPkdList] = React.useState<PKDItem[]>([]);
    const [currentPKD, setCurrentPKD] = React.useState<PKDItem | null>(null);
    const [errorMessage, setErrorMessage] = React.useState<string>("");

    const handleAddPKD = () => {
        // Reset error
        setErrorMessage("");
        
        // Walidacja - wymagamy przynajmniej section
        if (!currentPKD?.section) {
            setErrorMessage('Wybierz przynajmniej Sekcję przed dodaniem PKD');
            return;
        }
        
        // Debug log
        console.log('Adding PKD:', currentPKD);
        
        // Stwórz identyfikator PKD
        // Uwaga: suffix może już zawierać division (np. suffix="14.21" gdy division="14")
        let pkdIdentifier: string;
        if (currentPKD.suffix && currentPKD.division) {
            // Sprawdź czy suffix już zawiera division
            if (currentPKD.suffix.startsWith(currentPKD.division + '.')) {
                // suffix = "14.21", division = "14" -> C.14.21
                pkdIdentifier = `${currentPKD.section}.${currentPKD.suffix}`;
            } else if (currentPKD.suffix.startsWith(currentPKD.division)) {
                // suffix = "1421", division = "14" -> C.14.21 (usuń duplikację)
                pkdIdentifier = `${currentPKD.section}.${currentPKD.division}.${currentPKD.suffix.slice(currentPKD.division.length)}`;
            } else {
                // suffix = "21", division = "14" -> C.14.21 (normalny przypadek)
                pkdIdentifier = `${currentPKD.section}.${currentPKD.division}.${currentPKD.suffix}`;
            }
        } else if (currentPKD.division) {
            // Format: C.14 (section.division)
            pkdIdentifier = `${currentPKD.section}.${currentPKD.division}`;
        } else if (currentPKD.suffix) {
            // Gdy jest suffix ale nie ma division - błąd danych
            console.error('Invalid PKD: suffix without division', currentPKD);
            setErrorMessage('Błąd: wybrano klasę bez działu');
            return;
        } else {
            // Format: C (tylko section)
            pkdIdentifier = currentPKD.section;
        }
        
        console.log('Generated PKD identifier:', pkdIdentifier);
        
        // Sprawdź czy PKD już nie istnieje na liście
        const exists = pkdList.some(item => item.pkd === pkdIdentifier);
        
        if (!exists) {
            // Dodaj z wygenerowanym identyfikatorem
            const newPKD = {
                ...currentPKD,
                pkd: pkdIdentifier,
                full: pkdIdentifier
            };
            const newList = [...pkdList, newPKD];
            setPkdList(newList);
            // Notify parent component
            onPKDsChange?.(newList);
            // Reset current selection after adding
            setCurrentPKD(null);
        } else {
            setErrorMessage('Ten kod PKD jest już na liście');
        }
    };

    const handleRemovePKD = (pkdToRemove: string) => {
        const newList = pkdList.filter(item => item.pkd !== pkdToRemove);
        setPkdList(newList);
        // Notify parent component
        onPKDsChange?.(newList);
    };

    const handleClearAll = () => {
        setPkdList([]);
        setCurrentPKD(null);
        // Notify parent component
        onPKDsChange?.([]);
    };

    return (
        <>
            <Button onPress={onOpen} className="w-80">Numery PKD ({pkdList.length})</Button>
            <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="2xl">
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">
                                Numery PKD
                            </ModalHeader>
                            <ModalBody>
                                {/* PKD Input Component */}
                                <div className="mb-4">
                                    <PKDInput onChangeAction={setCurrentPKD} />
                                </div>

                                {/* Add Button */}
                                <div className="mb-4">
                                    {errorMessage && (
                                        <div className="mb-2 p-2 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                                            {errorMessage}
                                        </div>
                                    )}
                                    <Button 
                                        color="primary" 
                                        onPress={handleAddPKD}
                                        isDisabled={!currentPKD?.section}
                                        fullWidth
                                    >
                                        Dodaj PKD {(() => {
                                            if (!currentPKD?.section) return '';
                                            
                                            let preview = currentPKD.section;
                                            if (currentPKD.suffix && currentPKD.division) {
                                                // Sprawdź czy suffix już zawiera division
                                                if (currentPKD.suffix.startsWith(currentPKD.division + '.')) {
                                                    preview = `${currentPKD.section}.${currentPKD.suffix}`;
                                                } else if (currentPKD.suffix.startsWith(currentPKD.division)) {
                                                    preview = `${currentPKD.section}.${currentPKD.division}.${currentPKD.suffix.slice(currentPKD.division.length)}`;
                                                } else {
                                                    preview = `${currentPKD.section}.${currentPKD.division}.${currentPKD.suffix}`;
                                                }
                                            } else if (currentPKD.division) {
                                                preview = `${currentPKD.section}.${currentPKD.division}`;
                                            }
                                            
                                            return `(${preview})`;
                                        })()}
                                    </Button>
                                </div>

                                {/* PKD List */}
                                <div className="space-y-2">
                                    <h4 className="text-sm font-semibold text-gray-700">
                                        Wybrane numery PKD ({pkdList.length}):
                                    </h4>
                                    {pkdList.length === 0 ? (
                                        <p className="text-sm text-gray-500 italic">
                                            Brak wybranych numerów PKD. Użyj formularza powyżej, aby dodać.
                                        </p>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {pkdList.map((item) => {
                                                console.log('PKD Item:', item);
                                                
                                                // Zbuduj wyświetlaną etykietę
                                                // suffix może już zawierać division (np. "14.21" gdy division="14")
                                                let displayLabel: string;
                                                if (item.suffix && item.division) {
                                                    // Sprawdź czy suffix już zawiera division
                                                    if (item.suffix.startsWith(item.division + '.')) {
                                                        // suffix = "14.21" -> C.14.21
                                                        displayLabel = `${item.section}.${item.suffix}`;
                                                    } else if (item.suffix.startsWith(item.division)) {
                                                        // suffix = "1421" -> C.14.21
                                                        displayLabel = `${item.section}.${item.division}.${item.suffix.slice(item.division.length)}`;
                                                    } else {
                                                        // suffix = "21" -> C.14.21
                                                        displayLabel = `${item.section}.${item.division}.${item.suffix}`;
                                                    }
                                                } else if (item.division) {
                                                    // Tylko dział: C.14
                                                    displayLabel = `${item.section}.${item.division}`;
                                                } else {
                                                    // Tylko sekcja: C
                                                    displayLabel = item.section || item.pkd || '';
                                                }
                                                
                                                return (
                                                    <Chip
                                                        key={item.pkd}
                                                        onClose={() => handleRemovePKD(item.pkd!)}
                                                        variant="flat"
                                                        color="primary"
                                                    >
                                                        {displayLabel}
                                                    </Chip>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </ModalBody>
                            <ModalFooter>
                                <Button 
                                    variant="light" 
                                    color="danger" 
                                    onPress={handleClearAll}
                                    isDisabled={pkdList.length === 0}
                                >
                                    Wyczyść wszystkie
                                </Button>
                                <Button color="primary" onPress={onClose}>
                                    Zamknij
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </>
    );
}
