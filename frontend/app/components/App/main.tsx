import React from "react";

export default function Main({ selected }: { selected?: string | null }) {
    return (
        <div className="w-full h-[100vh] bg-gray-200 rounded-md p-10 mx-4">
            {selected ? (
                <h2 className="text-black text-center relative top-3">Załadowano: {selected}</h2>
            ) : (
                <h2 className="text-black text-center relative top-3">Ładowanie danych...</h2>
            )}
        </div>
    )
}