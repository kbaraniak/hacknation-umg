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

                            // Oblicz rentowność i marżę z dostępnych danych
                            let profitability = 0;
                            let margin = 0;
                            
                            if (latestData) {
                                const revenue = latestData.revenue || 0;
                                const netIncome = latestData.net_income || 0;
                                const operatingIncome = latestData.operating_income || 0;
                                const totalCosts = latestData.total_costs || 0;
                                
                                // Rentowność = (zysk netto / przychody) * 100
                                if (revenue > 0 && netIncome !== null) {
                                    profitability = (netIncome / revenue);
                                } else if (latestData.profitability_ratio !== null) {
                                    profitability = latestData.profitability_ratio;
                                }
                                
                                // Marża = (przychody - koszty) / przychody * 100
                                // lub (zysk operacyjny / przychody) * 100
                                if (revenue > 0 && operatingIncome !== null) {
                                    margin = (operatingIncome / revenue);
                                } else if (revenue > 0 && totalCosts > 0) {
                                    margin = ((revenue - totalCosts) / revenue);
                                } else if (latestData.margin_ratio !== null) {
                                    margin = latestData.margin_ratio;
                                }
                            }

                            // Oblicz zmianę rentowności
                            let profitabilityGrowth = 0;
                            if (years.length >= 2 && profitability > 0) {
                                const previousYear = years[years.length - 2];
                                const previousData = codeFinancialData[previousYear];
                                
                                let previousProf = 0;
                                if (previousData) {
                                    const prevRevenue = previousData.revenue || 0;
                                    const prevNetIncome = previousData.net_income || 0;
                                    
                                    if (prevRevenue > 0 && prevNetIncome !== null) {
                                        previousProf = (prevNetIncome / prevRevenue);
                                    } else if (previousData.profitability_ratio !== null) {
                                        previousProf = previousData.profitability_ratio;
                                    }
                                }
                                
                                profitabilityGrowth = (profitability - previousProf) * 100;
                            }

                            return {
                                id: `${pkd.pkd}-${code.symbol}-${index}`,
                                pkd_code: code.symbol,
                                name: code.name || 'Brak nazwy',
                                profitability_ratio: profitability,
                                margin_ratio: margin,
                                profitability_growth: profitabilityGrowth,
                            };
                        }).filter(Boolean);
                    })
                );

                const flattenedData = results.flat().filter(Boolean) as ProfitabilityData[];
                setProfitabilityData(flattenedData);

                // Agreguj dane - poprawiona logika
                const aggregated = selectedPKDs.map(pkd => {
                    // Znajdź wszystkie dane dla tego PKD
                    const pkdData = flattenedData.filter(d => {
                        // Porównaj bez prefiksu sekcji
                        const pkdCodeWithoutSection = pkd.pkd?.replace(/^[A-Z]\./, '') || '';
                        const dataCodeWithoutSection = d.pkd_code.replace(/^[A-Z]\./, '');
                        return dataCodeWithoutSection.startsWith(pkdCodeWithoutSection);
                    });

                    // Oblicz średnie tylko z danych tego PKD
                    const count = pkdData.length;
                    const avgProfitability = count > 0
                        ? pkdData.reduce((sum, d) => sum + (d.profitability_ratio * 100), 0) / count
                        : 0;
                    const avgMargin = count > 0
                        ? pkdData.reduce((sum, d) => sum + (d.margin_ratio * 100), 0) / count
                        : 0;

                    return {
                        pkdCode: pkd.pkd || '',
                        avgProfitability,
                        avgMargin,
                    };
                });
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
            <h1 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-gray-100">Rentowność Branży</h1>
            <p className="mb-3 sm:mb-4 text-sm sm:text-base text-gray-300">Rentowność i marża w wybranych branżach.</p>

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
