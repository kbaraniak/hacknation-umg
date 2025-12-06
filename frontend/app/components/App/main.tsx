"use client";
import React from "react";
import IndustryList from "@/app/components/App/IndustryList";

export default function Main({ selected }: { selected?: string | null }) {
    const [industries, setIndustries] = React.useState<string[]>([]);

    return (
        <div className="w-full h-[100vh] bg-gray-200 rounded-md p-10 mx-4">
            {selected ? (
                <>
                    <h2 className="text-black text-center relative top-3">Załadowano: {selected}</h2>
                    <div className="mt-6">
                        <h3 className="text-lg mb-2">Wybierz branże</h3>
                        <IndustryList onChangeAction={(list) => setIndustries(list)} />
                    </div>
                    {industries.length > 0 && (
                        <div className="mt-4 text-sm text-gray-700">
                            <strong>Wybrane branże:</strong> {industries.join(", ")}
                        </div>
                    )}
                </>
            ) : (
                <h2 className="text-black text-center relative top-3">Ładowanie danych...</h2>
            )}
        </div>
    )
}