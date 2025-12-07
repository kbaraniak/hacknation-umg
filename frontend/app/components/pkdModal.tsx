"use client";

import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
} from "@heroui/modal";
import { Button } from "@heroui/button";
import { useDisclosure } from "@heroui/use-disclosure";

export default function PKDModal() {
    const {isOpen, onOpen, onOpenChange} = useDisclosure();

    return (
        <>
            <Button onPress={onOpen} className="w-80">Numery PKD</Button>
            <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">Numery PKD</ModalHeader>
                            <ModalBody>
                                <p>
                                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam pulvinar risus non
                                    risus hendrerit venenatis. Pellentesque sit amet hendrerit risus, sed porttitor
                                    quam.
                                </p>
                            </ModalBody>
                            <ModalFooter>
                                <Button variant="ghost" color="danger">Wyczyść Numery</Button>
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
