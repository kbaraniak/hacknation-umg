"use client";

import React from "react";
import { usePKD } from "@/app/context/PKDContext";
import { getIndex } from "@/app/lib/client/pkdClient";
import IndustryComparison from '../common/IndustryComparison';
import IndustryTable from '../common/IndustryTable';
import { GridColDef } from '@mui/x-data-grid';

type GrowthData = {
    id: string;
    pkd_code: string;
    name: string;
    overall_score: number;
    trend_direction: string;
    yoy_growth: number;
    forecast_next_year?: number;
};

const columns: GridColDef<GrowthData>[] = [
    { field: 'pkd_code', headerName: 'Kod PKD', width: 130 },
    { field: 'name', headerName: 'Nazwa', width: 300 },
    {
        field: 'overall_score',
        headerName: 'Ocena ogólna',
        type: 'number',
        width: 150,
        valueFormatter: (value: number | undefined) => value ? `${value.toFixed(2)}/100` : '-',
    },
    {
        field: 'trend_direction',
        headerName: 'Kierunek',
        width: 120,
    },
    {
        field: 'yoy_growth',
        headerName: 'Wzrost YoY (%)',
        type: 'number',
        width: 150,
        valueFormatter: (value: number | undefined) => value ? `${value.toFixed(2)}%` : '-',
    },
    {
        field: 'forecast_next_year',
        headerName: 'Prognoza (rok +1)',
        type: 'number',
        width: 180,
        valueFormatter: (value: number | undefined) => value ? value.toFixed(2) : '-',
    },
];

export default function IndustryGrowth() {
    const { selectedPKDs, startYear, endYear } = usePKD();
    const [growthData, setGrowthData] = React.useState<GrowthData[]>([]);
    const [aggregatedData, setAggregatedData] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(false);
    console.log('selectedPKDs', selectedPKDs);
    console.log('growthData', growthData);

    React.useEffect(() => {
        const fetchGrowthData = async () => {
            if (selectedPKDs.length === 0) {
                setGrowthData([]);
                setAggregatedData([]);
                return;
            }

            setLoading(true);
            try {
                const results = await Promise.all(
                    selectedPKDs.map(async (pkd) => {
                        if (!pkd.section) return null;

                        const response = await getIndex({
                            section: pkd.section,
                            division: pkd.division,
                            group: pkd.suffix,
                            version: "2025",
                            year_from: startYear,
                            year_to: endYear,
                            forecast_years: 3
                        });

                        // Extract data from index response
                        const pkdCodes = response.pkd_codes || [];
                        const scores = response.scores || {};
                        const trend = response.trend || {};
                        const classification = response.classification || {};

                        // Get first forecast year value
                        const forecastYears = Object.keys(trend.forecast || {}).sort();
                        const nextYearForecast = forecastYears.length > 0 
                            ? trend.forecast[forecastYears[0]] 
                            : undefined;

                        // Get code-specific scores if available
                        const codeScores = scores.by_code || {};

                        return pkdCodes.map((code: any, index: number) => {
                            const codeSymbol = code.symbol;
                            const codeScore = codeScores[codeSymbol] || {};

                            return {
                                id: `${pkd.pkd}-${code.symbol}-${index}`,
                                pkd_code: code.symbol,
                                name: code.name || 'Brak nazwy',
                                overall_score: scores.overall || 0,
                                trend_direction: trend.direction || 'STABLE',
                                yoy_growth: trend.yoy_growth || 0,
                                forecast_next_year: nextYearForecast,
                            };
                        }).filter(Boolean);
                    })
                );

                const flattenedData = results.flat().filter(Boolean) as GrowthData[];
                setGrowthData(flattenedData);

                // Agreguj dane dla wykresów
                const aggregated = selectedPKDs.map(pkd => ({
                    pkdCode: pkd.pkd || '',
                    avgScore: flattenedData
                        .filter(d => d.pkd_code.startsWith(pkd.section || ''))
                        .reduce((sum, d) => sum + d.overall_score, 0) / (flattenedData.filter(d => d.pkd_code.startsWith(pkd.section || '')).length || 1),
                    avgGrowth: flattenedData
                        .filter(d => d.pkd_code.startsWith(pkd.section || ''))
                        .reduce((sum, d) => sum + d.yoy_growth, 0) / (flattenedData.filter(d => d.pkd_code.startsWith(pkd.section || '')).length || 1),
                }));
                setAggregatedData(aggregated);

            } catch (error) {
                console.error('Error fetching growth data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchGrowthData();
    }, [selectedPKDs, startYear, endYear]);

    const metrics = [
        {
            title: 'Ocena ogólna (0-100)',
            data: aggregatedData.map(d => ({
                pkdCode: d.pkdCode,
                value: d.avgScore,
                label: 'Ocena'
            })),
            color: '#1976d2',
            unit: ''
        },
        {
            title: 'Wzrost YoY (%)',
            data: aggregatedData.map(d => ({
                pkdCode: d.pkdCode,
                value: d.avgGrowth,
                label: 'Wzrost'
            })),
            color: '#2e7d32',
            unit: '%'
        },
    ];

    return (
        <div className="rounded-md p-2 sm:p-0">
            <h1 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-white">Rozwój Branży</h1>
            <p className="mb-3 sm:mb-4 text-sm sm:text-base text-gray-200">Analiza trendu, wzrostu i prognozy dla wybranych branż (dane z Industry Index).</p>

            {selectedPKDs.length > 0 && aggregatedData.length > 0 && (
                <IndustryComparison
                    title="Porównanie dynamiki wzrostu"
                    metrics={metrics}
                />
            )}

            {selectedPKDs.length > 0 && (
                <IndustryTable
                    title="Szczegółowe dane wzrostu"
                    rows={growthData}
                    columns={columns}
                    loading={loading}
                />
            )}

            {selectedPKDs.length === 0 && (
                <p className="text-gray-600 text-center py-8 text-sm sm:text-base">
                    Wybierz kody PKD w menu, aby wyświetlić dane o rozwoju branży.
                </p>
            )}
        </div>
    );
}
