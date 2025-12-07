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

export default function PKDModal() {
    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const [pkdList, setPkdList] = React.useState<PKDItem[]>([]);
    const [currentPKD, setCurrentPKD] = React.useState<PKDItem | null>(null);

    const handleAddPKD = () => {
        if (currentPKD?.pkd) {
            // Sprawdź czy PKD już nie istnieje na liście
            const exists = pkdList.some(item => item.pkd === currentPKD.pkd);
            if (!exists) {
                setPkdList([...pkdList, currentPKD]);
                // Reset current selection after adding
                setCurrentPKD(null);
            }
        }
    };

    const handleRemovePKD = (pkdToRemove: string) => {
        setPkdList(pkdList.filter(item => item.pkd !== pkdToRemove));
    };

    const handleClearAll = () => {
        setPkdList([]);
        setCurrentPKD(null);
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
                                    <Button 
                                        color="primary" 
                                        onPress={handleAddPKD}
                                        isDisabled={!currentPKD?.pkd}
                                        fullWidth
                                    >
                                        Dodaj PKD {currentPKD?.pkd ? `(${currentPKD.pkd})` : ''}
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
                                            {pkdList.map((item) => (
                                                <Chip
                                                    key={item.pkd}
                                                    onClose={() => handleRemovePKD(item.pkd!)}
                                                    variant="flat"
                                                    color="primary"
                                                >
                                                    {item.pkd}
                                                </Chip>
                                            ))}
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
