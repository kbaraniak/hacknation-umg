import React from "react";
import IndustryList from "@/app/components/App/IndustryList";
import TimeRange from "@/app/components/App/TimeRange";
import MultiIndustryChart from "@/app/components/App/MultiIndustryChart";

export default function Main({ selected, selectedKey }: { selected?: string | null; selectedKey?: string }) {
    const [industries, setIndustries] = React.useState<string[]>([]);
    const [range, setRange] = React.useState<{ from: number; to: number } | null>({ from: 2018, to: 2024 });

    return (
        <div className="w-full h-[100vh] bg-gray-200 rounded-md p-10 mx-4">
            {selected ? (
                <>
                    <h2 className="text-black text-center relative top-3">Załadowano: {selected}</h2>

                    <div className="mt-6">
                        <h3 className="text-lg mb-2">Wybierz branże</h3>
                        <IndustryList onChangeAction={(list) => setIndustries(list)} />
                    </div>

                    <div className="mt-6">
                        <h3 className="text-lg mb-2">Przedział czasowy</h3>
                        <TimeRange value={range ?? undefined} onChangeAction={(v) => setRange(v)} />
                    </div>

                    <div className="mt-6">
                        <h3 className="text-lg mb-2">Wykres</h3>
                        <MultiIndustryChart industries={industries} range={range} metricKey={selectedKey} />
                    </div>
                </>

            ) : (
                <h2 className="text-black text-center relative top-3">Ładowanie danych...</h2>
            )}
        </div>
    )
}