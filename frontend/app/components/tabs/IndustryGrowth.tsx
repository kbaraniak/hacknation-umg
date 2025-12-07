"use client";

import React from "react";
import { usePKD } from "@/app/context/PKDContext";
import { getIndustry } from "@/app/lib/client/pkdClient";
import IndustryComparison from '../common/IndustryComparison';
import IndustryTable from '../common/IndustryTable';
import { GridColDef } from '@mui/x-data-grid';

type GrowthData = {
    id: string;
    pkd_code: string;
    name: string;
    revenue_growth: number;
    profit_growth: number;
    assets_growth: number;
};

const columns: GridColDef<GrowthData>[] = [
    { field: 'pkd_code', headerName: 'Kod PKD', width: 130 },
    { field: 'name', headerName: 'Nazwa', width: 300 },
    {
        field: 'revenue_growth',
        headerName: 'Wzrost przychodów (%)',
        type: 'number',
        width: 180,
        valueFormatter: (value: number | undefined) => value ? `${value.toFixed(2)}%` : '-',
    },
    {
        field: 'profit_growth',
        headerName: 'Wzrost zysku (%)',
        type: 'number',
        width: 180,
        valueFormatter: (value: number | undefined) => value ? `${value.toFixed(2)}%` : '-',
    },
    {
        field: 'assets_growth',
        headerName: 'Wzrost aktywów (%)',
        type: 'number',
        width: 180,
        valueFormatter: (value: number | undefined) => value ? `${value.toFixed(2)}%` : '-',
    },
];

export default function IndustryGrowth() {
    const { selectedPKDs } = usePKD();
    const [growthData, setGrowthData] = React.useState<GrowthData[]>([]);
    const [aggregatedData, setAggregatedData] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(false);

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

                        const response = await getIndustry({
                            section: pkd.section,
                            division: pkd.division,
                            group: pkd.suffix,
                            version: "2025"
                        });

                        const financialData = response.financial_data || {};
                        
                        // Oblicz dynamikę dla każdego kodu
                        const pkdCodes = response.pkd_codes || [];
                        const codesWithData = pkdCodes.filter((code: any) => {
                            const cleanSymbol = code.symbol.replace(/^[A-U]\./, '').replace(/\.Z$/, '');
                            return financialData[cleanSymbol] && Object.keys(financialData[cleanSymbol]).length > 1;
                        });

                        return codesWithData.map((code: any, index: number) => {
                            const cleanSymbol = code.symbol.replace(/^[A-U]\./, '').replace(/\.Z$/, '');
                            const codeFinancialData = financialData[cleanSymbol] || {};
                            const years = Object.keys(codeFinancialData).sort();
                            
                            if (years.length < 2) return null;

                            const latestYear = years[years.length - 1];
                            const previousYear = years[years.length - 2];
                            const latestData = codeFinancialData[latestYear];
                            const previousData = codeFinancialData[previousYear];

                            // Oblicz wzrosty
                            const revenueGrowth = previousData?.revenue && latestData?.revenue
                                ? ((latestData.revenue - previousData.revenue) / previousData.revenue) * 100
                                : 0;
                            
                            const profitGrowth = previousData?.net_income && latestData?.net_income
                                ? ((latestData.net_income - previousData.net_income) / previousData.net_income) * 100
                                : 0;

                            return {
                                id: `${pkd.pkd}-${code.symbol}-${index}`,
                                pkd_code: code.symbol,
                                name: code.name || 'Brak nazwy',
                                revenue_growth: revenueGrowth,
                                profit_growth: profitGrowth,
                                assets_growth: 0, // TODO: Dodaj gdy będą dane o aktywach
                            };
                        }).filter(Boolean);
                    })
                );

                const flattenedData = results.flat().filter(Boolean) as GrowthData[];
                setGrowthData(flattenedData);

                // Agreguj dane dla wykresów
                const aggregated = selectedPKDs.map(pkd => ({
                    pkdCode: pkd.pkd || '',
                    avgRevenueGrowth: flattenedData
                        .filter(d => d.pkd_code.startsWith(pkd.pkd || ''))
                        .reduce((sum, d) => sum + d.revenue_growth, 0) / flattenedData.length || 0,
                    avgProfitGrowth: flattenedData
                        .filter(d => d.pkd_code.startsWith(pkd.pkd || ''))
                        .reduce((sum, d) => sum + d.profit_growth, 0) / flattenedData.length || 0,
                }));
                setAggregatedData(aggregated);

            } catch (error) {
                console.error('Error fetching growth data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchGrowthData();
    }, [selectedPKDs]);

    const metrics = [
        {
            title: 'Wzrost przychodów (%)',
            data: aggregatedData.map(d => ({
                pkdCode: d.pkdCode,
                value: d.avgRevenueGrowth,
                label: 'Wzrost przychodów'
            })),
            color: '#1976d2',
            unit: '%'
        },
        {
            title: 'Wzrost zysku (%)',
            data: aggregatedData.map(d => ({
                pkdCode: d.pkdCode,
                value: d.avgProfitGrowth,
                label: 'Wzrost zysku'
            })),
            color: '#2e7d32',
            unit: '%'
        },
    ];

    return (
        <div className="rounded-md">
            <h1 className="text-2xl font-bold mb-4 text-gray-900">Rozwój Branży</h1>
            <p className="mb-4 text-gray-700">Dynamika przychodów, zysku i aktywów w wybranych branżach.</p>

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
                <p className="text-gray-600 text-center py-8">
                    Wybierz kody PKD w menu, aby wyświetlić dane o rozwoju branży.
                </p>
            )}
        </div>
    );
}
