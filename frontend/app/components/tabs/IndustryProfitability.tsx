"use client";

import React from "react";
import { usePKD } from "@/app/context/PKDContext";
import { getIndustry } from "@/app/lib/client/pkdClient";
import IndustryComparison from '../common/IndustryComparison';
import IndustryTable from '../common/IndustryTable';
import { GridColDef } from '@mui/x-data-grid';

type ProfitabilityData = {
    id: string;
    pkd_code: string;
    name: string;
    profitability_ratio: number;
    margin_ratio: number;
    profitability_growth: number;
};

const columns: GridColDef<ProfitabilityData>[] = [
    { field: 'pkd_code', headerName: 'Kod PKD', width: 130 },
    { field: 'name', headerName: 'Nazwa', width: 300 },
    {
        field: 'profitability_ratio',
        headerName: 'Rentowność (%)',
        type: 'number',
        width: 150,
        valueFormatter: (value: number | undefined) => value ? `${(value * 100).toFixed(2)}%` : '-',
    },
    {
        field: 'margin_ratio',
        headerName: 'Marża (%)',
        type: 'number',
        width: 150,
        valueFormatter: (value: number | undefined) => value ? `${(value * 100).toFixed(2)}%` : '-',
    },
    {
        field: 'profitability_growth',
        headerName: 'Zmiana rentowności (pp)',
        type: 'number',
        width: 200,
        valueFormatter: (value: number | undefined) => value ? `${value.toFixed(2)}pp` : '-',
    },
];

export default function IndustryProfitability() {
    const { selectedPKDs, startYear, endYear } = usePKD();
    const [profitabilityData, setProfitabilityData] = React.useState<ProfitabilityData[]>([]);
    const [aggregatedData, setAggregatedData] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(false);
    console.log('profitabilityData', profitabilityData);

    React.useEffect(() => {
        const fetchProfitabilityData = async () => {
            if (selectedPKDs.length === 0) {
                setProfitabilityData([]);
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
                        const pkdCodes = response.pkd_codes || [];
                        
                        const codesWithData = pkdCodes.filter((code: any) => {
                            const cleanSymbol = code.symbol.replace(/^[A-U]\./, '').replace(/\.Z$/, '');
                            return financialData[cleanSymbol] && Object.keys(financialData[cleanSymbol]).length > 0;
                        });

                        return codesWithData.map((code: any, index: number) => {
                            const cleanSymbol = code.symbol.replace(/^[A-U]\./, '').replace(/\.Z$/, '');
                            const codeFinancialData = financialData[cleanSymbol] || {};
                            const years = Object.keys(codeFinancialData).sort();
                            
                            const latestYear = years[years.length - 1];
                            const latestData = latestYear ? codeFinancialData[latestYear] : null;

                            // Oblicz zmianę rentowności
                            let profitabilityGrowth = 0;
                            if (years.length >= 2) {
                                const previousYear = years[years.length - 2];
                                const previousData = codeFinancialData[previousYear];
                                const currentProf = latestData?.profitability_ratio || 0;
                                const previousProf = previousData?.profitability_ratio || 0;
                                profitabilityGrowth = (currentProf - previousProf) * 100; // w punktach procentowych
                            }

                            return {
                                id: `${pkd.pkd}-${code.symbol}-${index}`,
                                pkd_code: code.symbol,
                                name: code.name || 'Brak nazwy',
                                profitability_ratio: latestData?.profitability_ratio || 0,
                                margin_ratio: latestData?.margin_ratio || 0,
                                profitability_growth: profitabilityGrowth,
                            };
                        }).filter(Boolean);
                    })
                );

                const flattenedData = results.flat().filter(Boolean) as ProfitabilityData[];
                setProfitabilityData(flattenedData);

                // Agreguj dane
                const aggregated = selectedPKDs.map(pkd => ({
                    pkdCode: pkd.pkd || '',
                    avgProfitability: flattenedData
                        .filter(d => d.pkd_code.startsWith(pkd.pkd || ''))
                        .reduce((sum, d) => sum + d.profitability_ratio * 100, 0) / flattenedData.length || 0,
                    avgMargin: flattenedData
                        .filter(d => d.pkd_code.startsWith(pkd.pkd || ''))
                        .reduce((sum, d) => sum + d.margin_ratio * 100, 0) / flattenedData.length || 0,
                }));
                setAggregatedData(aggregated);

            } catch (error) {
                console.error('Error fetching profitability data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfitabilityData();
    }, [selectedPKDs, startYear, endYear]);

    const metrics = [
        {
            title: 'Rentowność (%)',
            data: aggregatedData.map(d => ({
                pkdCode: d.pkdCode,
                value: d.avgProfitability,
                label: 'Rentowność'
            })),
            color: '#2e7d32',
            unit: '%'
        },
        {
            title: 'Marża (%)',
            data: aggregatedData.map(d => ({
                pkdCode: d.pkdCode,
                value: d.avgMargin,
                label: 'Marża'
            })),
            color: '#ed6c02',
            unit: '%'
        },
    ];

    return (
        <div className="rounded-md p-2 sm:p-0">
            <h1 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-white">Rentowność Branży</h1>
            <p className="mb-3 sm:mb-4 text-sm sm:text-base text-gray-200">Rentowność i marża w wybranych branżach.</p>

            {selectedPKDs.length > 0 && aggregatedData.length > 0 && (
                <IndustryComparison
                    title="Porównanie rentowności"
                    metrics={metrics}
                />
            )}

            {selectedPKDs.length > 0 && (
                <IndustryTable
                    title="Szczegółowe dane rentowności"
                    rows={profitabilityData}
                    columns={columns}
                    loading={loading}
                />
            )}

            {selectedPKDs.length === 0 && (
                <p className="text-gray-600 text-center py-8 text-sm sm:text-base">
                    Wybierz kody PKD w menu, aby wyświetlić dane o rentowności branży.
                </p>
            )}
        </div>
    );
}
