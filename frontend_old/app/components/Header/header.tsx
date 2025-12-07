import React from "react";
import Image from "next/image";

export default function Header() {
    return (
        <header className="p-5 flex justify-center align-center items-center justify-center text-center">
            <Image className="rounded-md" src="/favicon.ico" alt="PKO BP" width={75} height={75} />
            <h1 className="mx-3 text-3xl">Indeksy Branżowe - Analiza Danych</h1>
        </header>
    );
}