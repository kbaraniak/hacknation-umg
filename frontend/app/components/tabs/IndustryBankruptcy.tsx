"use client";

import React from "react";
import { usePKD } from "@/app/context/PKDContext";
import { getIndustry } from "@/app/lib/client/pkdClient";
import IndustryComparison from '../common/IndustryComparison';
import IndustryTable from '../common/IndustryTable';
import { GridColDef } from '@mui/x-data-grid';

type BankruptcyData = {
    id: string;
    pkd_code: string;
    name: string;
    total_units: number;
    bankruptcies: number;
    bankruptcy_rate: number;
    bankruptcy_trend: number;
};

const columns: GridColDef<BankruptcyData>[] = [
    { field: 'pkd_code', headerName: 'Kod PKD', width: 130 },
    { field: 'name', headerName: 'Nazwa', width: 250 },
    {
        field: 'total_units',
        headerName: 'Liczba jednostek',
        type: 'number',
        width: 150,
        valueFormatter: (value: number | undefined) => value ? value.toLocaleString('pl-PL') : '-',
    },
    {
        field: 'bankruptcies',
        headerName: 'Liczba upadłości',
        type: 'number',
        width: 150,
        valueFormatter: (value: number | undefined) => value ? value.toLocaleString('pl-PL') : '-',
    },
    {
        field: 'bankruptcy_rate',
        headerName: 'Wskaźnik upadłości (%)',
        type: 'number',
        width: 180,
        valueFormatter: (value: number | undefined) => value ? `${value.toFixed(2)}%` : '-',
    },
    {
        field: 'bankruptcy_trend',
        headerName: 'Zmiana (pp)',
        type: 'number',
        width: 150,
        valueFormatter: (value: number | undefined) => value ? `${value > 0 ? '+' : ''}${value.toFixed(2)}pp` : '-',
    },
];

export default function IndustryBankruptcy() {
    const { selectedPKDs, startYear, endYear } = usePKD();
    const [bankruptcyData, setBankruptcyData] = React.useState<BankruptcyData[]>([]);
    const [aggregatedData, setAggregatedData] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
        const fetchBankruptcyData = async () => {
            if (selectedPKDs.length === 0) {
                setBankruptcyData([]);
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
                            version: "2025",
                            year_from: startYear,
                            year_to: endYear
                        });

                        const financialData = response.financial_data || {};
                        const bankruptcyDataApi = response.bankruptcy_data || {};
                        const pkdCodes = response.pkd_codes || [];
                        
                        const codesWithData = pkdCodes.filter((code: any) => {
                            const cleanSymbol = code.symbol.replace(/^[A-U]\./, '').replace(/\.Z$/, '');
                            return financialData[cleanSymbol] || bankruptcyDataApi[code.symbol];
                        });

                        return codesWithData.map((code: any, index: number) => {
                            const cleanSymbol = code.symbol.replace(/^[A-U]\./, '').replace(/\.Z$/, '');
                            const codeFinancialData = financialData[cleanSymbol] || {};
                            const years = Object.keys(codeFinancialData).sort();
                            
                            const latestYear = years[years.length - 1];
                            const latestData = latestYear ? codeFinancialData[latestYear] : null;
                            const totalUnits = latestData?.unit_count || 0;

                            // Pobierz dane o upadłościach
                            const bankruptcies = bankruptcyDataApi[code.symbol] || {};
                            const bankruptcyYears = Object.keys(bankruptcies).sort();
                            const latestBankruptcyYear = bankruptcyYears[bankruptcyYears.length - 1];
                            const latestBankruptcies = latestBankruptcyYear ? bankruptcies[latestBankruptcyYear] : 0;

                            // Oblicz wskaźnik upadłości
                            const bankruptcyRate = totalUnits > 0 ? (latestBankruptcies / totalUnits) * 100 : 0;

                            // Oblicz trend
                            let bankruptcyTrend = 0;
                            if (bankruptcyYears.length >= 2) {
                                const previousYear = bankruptcyYears[bankruptcyYears.length - 2];
                                const previousBankruptcies = bankruptcies[previousYear] || 0;
                                const previousRate = totalUnits > 0 ? (previousBankruptcies / totalUnits) * 100 : 0;
                                bankruptcyTrend = bankruptcyRate - previousRate;
                            }

                            return {
                                id: `${pkd.pkd}-${code.symbol}-${index}`,
                                pkd_code: code.symbol,
                                name: code.name || 'Brak nazwy',
                                total_units: totalUnits,
                                bankruptcies: latestBankruptcies,
                                bankruptcy_rate: bankruptcyRate,
                                bankruptcy_trend: bankruptcyTrend,
                            };
                        }).filter(Boolean);
                    })
                );

                const flattenedData = results.flat().filter(Boolean) as BankruptcyData[];
                setBankruptcyData(flattenedData);

                // Agreguj dane
                const aggregated = selectedPKDs.map(pkd => {
                    const pkdData = flattenedData.filter(d => d.pkd_code.startsWith(pkd.pkd || ''));
                    const totalUnits = pkdData.reduce((sum, d) => sum + d.total_units, 0);
                    const totalBankruptcies = pkdData.reduce((sum, d) => sum + d.bankruptcies, 0);
                    return {
                        pkdCode: pkd.pkd || '',
                        totalBankruptcies: totalBankruptcies,
                        bankruptcyRate: totalUnits > 0 ? (totalBankruptcies / totalUnits) * 100 : 0,
                    };
                });
                setAggregatedData(aggregated);

            } catch (error) {
                console.error('Error fetching bankruptcy data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchBankruptcyData();
    }, [selectedPKDs, startYear, endYear]);

    const metrics = [
        {
            title: 'Liczba upadłości',
            data: aggregatedData.map(d => ({
                pkdCode: d.pkdCode,
                value: d.totalBankruptcies,
                label: 'Upadłości'
            })),
            color: '#d32f2f',
            unit: ''
        },
        {
            title: 'Wskaźnik upadłości (%)',
            data: aggregatedData.map(d => ({
                pkdCode: d.pkdCode,
                value: d.bankruptcyRate,
                label: 'Wskaźnik upadłości'
            })),
            color: '#f57c00',
            unit: '%'
        },
    ];

    return (
        <div className="rounded-md">
            <h1 className="text-2xl font-bold mb-4 text-gray-900">Szkodowość Branży</h1>
            <p className="mb-4 text-gray-700">Wskaźnik upadłości i jego dynamika w wybranych branżach.</p>

            {selectedPKDs.length > 0 && aggregatedData.length > 0 && (
                <IndustryComparison
                    title="Porównanie szkodowości"
                    metrics={metrics}
                />
            )}

            {selectedPKDs.length > 0 && (
                <IndustryTable
                    title="Szczegółowe dane szkodowości"
                    rows={bankruptcyData}
                    columns={columns}
                    loading={loading}
                />
            )}

            {selectedPKDs.length === 0 && (
                <p className="text-gray-600 text-center py-8">
                    Wybierz kody PKD w menu, aby wyświetlić dane o szkodowości branży.
                </p>
            )}
        </div>
    );
}
