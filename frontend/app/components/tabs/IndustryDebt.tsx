"use client";

import React from "react";
import { usePKD } from "@/app/context/PKDContext";
import { getIndustry } from "@/app/lib/client/pkdClient";
import IndustryComparison from '../common/IndustryComparison';
import IndustryTable from '../common/IndustryTable';
import { GridColDef } from '@mui/x-data-grid';

type DebtData = {
    id: string;
    pkd_code: string;
    name: string;
    long_term_debt: number;
    short_term_debt: number;
    total_debt: number;
    debt_growth: number;
};

const columns: GridColDef<DebtData>[] = [
    { field: 'pkd_code', headerName: 'Kod PKD', width: 130 },
    { field: 'name', headerName: 'Nazwa', width: 250 },
    {
        field: 'long_term_debt',
        headerName: 'Dług długoterminowy (mln PLN)',
        type: 'number',
        width: 200,
        valueFormatter: (value: number | undefined) => value ? value.toLocaleString('pl-PL') : '-',
    },
    {
        field: 'short_term_debt',
        headerName: 'Dług krótkoterminowy (mln PLN)',
        type: 'number',
        width: 200,
        valueFormatter: (value: number | undefined) => value ? value.toLocaleString('pl-PL') : '-',
    },
    {
        field: 'total_debt',
        headerName: 'Zadłużenie całkowite (mln PLN)',
        type: 'number',
        width: 200,
        valueFormatter: (value: number | undefined) => value ? value.toLocaleString('pl-PL') : '-',
    },
    {
        field: 'debt_growth',
        headerName: 'Zmiana zadłużenia (%)',
        type: 'number',
        width: 180,
        valueFormatter: (value: number | undefined) => value ? `${value.toFixed(2)}%` : '-',
    },
];

export default function IndustryDebt() {
    const { selectedPKDs, startYear, endYear } = usePKD();
    const [debtData, setDebtData] = React.useState<DebtData[]>([]);
    const [aggregatedData, setAggregatedData] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(false);
    console.log('debtData', debtData);

    React.useEffect(() => {
        const fetchDebtData = async () => {
            if (selectedPKDs.length === 0) {
                setDebtData([]);
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

                            const longTermDebt = latestData?.long_term_debt || 0;
                            const shortTermDebt = latestData?.short_term_debt || 0;
                            const totalDebt = longTermDebt + shortTermDebt;

                            // Oblicz zmianę zadłużenia
                            let debtGrowth = 0;
                            if (years.length >= 2) {
                                const previousYear = years[years.length - 2];
                                const previousData = codeFinancialData[previousYear];
                                const previousTotal = (previousData?.long_term_debt || 0) + (previousData?.short_term_debt || 0);
                                if (previousTotal > 0) {
                                    debtGrowth = ((totalDebt - previousTotal) / previousTotal) * 100;
                                }
                            }

                            return {
                                id: `${pkd.pkd}-${code.symbol}-${index}`,
                                pkd_code: code.symbol,
                                name: code.name || 'Brak nazwy',
                                long_term_debt: longTermDebt,
                                short_term_debt: shortTermDebt,
                                total_debt: totalDebt,
                                debt_growth: debtGrowth,
                            };
                        }).filter(Boolean);
                    })
                );

                const flattenedData = results.flat().filter(Boolean) as DebtData[];
                setDebtData(flattenedData);

                // Agreguj dane
                const aggregated = selectedPKDs.map(pkd => {
                    const pkdData = flattenedData.filter(d => d.pkd_code.startsWith(pkd.pkd || ''));
                    return {
                        pkdCode: pkd.pkd || '',
                        totalLongTermDebt: pkdData.reduce((sum, d) => sum + d.long_term_debt, 0),
                        totalShortTermDebt: pkdData.reduce((sum, d) => sum + d.short_term_debt, 0),
                        totalDebt: pkdData.reduce((sum, d) => sum + d.total_debt, 0),
                    };
                });
                setAggregatedData(aggregated);

            } catch (error) {
                console.error('Error fetching debt data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDebtData();
    }, [selectedPKDs, startYear, endYear]);

    const metrics = [
        {
            title: 'Dług długoterminowy (mln PLN)',
            data: aggregatedData.map(d => ({
                pkdCode: d.pkdCode,
                value: d.totalLongTermDebt,
                label: 'Dług długoterminowy'
            })),
            color: '#d32f2f',
            unit: ' mln PLN'
        },
        {
            title: 'Dług krótkoterminowy (mln PLN)',
            data: aggregatedData.map(d => ({
                pkdCode: d.pkdCode,
                value: d.totalShortTermDebt,
                label: 'Dług krótkoterminowy'
            })),
            color: '#f57c00',
            unit: ' mln PLN'
        },
    ];

    return (
        <div className="rounded-md p-2 sm:p-0">
            <h1 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-gray-100">Zadłużenie Branży</h1>
            <p className="mb-3 sm:mb-4 text-sm sm:text-base text-gray-300">Poziom i dynamika zadłużenia w wybranych branżach.</p>

            {selectedPKDs.length > 0 && aggregatedData.length > 0 && (
                <IndustryComparison
                    title="Porównanie zadłużenia"
                    metrics={metrics}
                />
            )}

            {selectedPKDs.length > 0 && (
                <IndustryTable
                    title="Szczegółowe dane zadłużenia"
                    rows={debtData}
                    columns={columns}
                    loading={loading}
                />
            )}

            {selectedPKDs.length === 0 && (
                <p className="text-gray-600 text-center py-8 text-sm sm:text-base">
                    Wybierz kody PKD w menu, aby wyświetlić dane o zadłużeniu branży.
                </p>
            )}
        </div>
    );
}
