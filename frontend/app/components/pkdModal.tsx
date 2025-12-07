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
        
        // Walidacja - wymagamy section i division
        if (!currentPKD?.section || !currentPKD?.division) {
            setErrorMessage('Wybierz przynajmniej Sekcję i Dział przed dodaniem PKD');
            return;
        }
        
        // Stwórz identyfikator PKD (nawet jeśli suffix/group nie jest wybrany)
        const pkdIdentifier = currentPKD.suffix 
            ? `${currentPKD.section}.${currentPKD.division}.${currentPKD.suffix}`
            : `${currentPKD.section}.${currentPKD.division}`;
        
        // Sprawdź czy PKD już nie istnieje na liście
        const exists = pkdList.some(item => {
            const existingIdentifier = item.suffix
                ? `${item.section}.${item.division}.${item.suffix}`
                : `${item.section}.${item.division}`;
            return existingIdentifier === pkdIdentifier;
        });
        
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
                                        isDisabled={!currentPKD?.section || !currentPKD?.division}
                                        fullWidth
                                    >
                                        Dodaj PKD {currentPKD?.section && currentPKD?.division 
                                            ? `(${currentPKD.section}.${currentPKD.division}${currentPKD.suffix ? '.' + currentPKD.suffix : ''})` 
                                            : ''}
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
                                                console.log(item);
                                                // Zbuduj wyświetlaną etykietę
                                                const displayLabel = item.suffix 
                                                    ? `${item.section}.${item.division}.${item.suffix}`
                                                    : `${item.section}.${item.division}`;
                                                
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
