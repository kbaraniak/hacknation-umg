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
                    selectedPKDs.map(async (pkd, pkdIndex) => {
                        if (!pkd.section) return { tableData: [], aggregated: null };

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
                        
                        let totalProfitability = 0;
                        let totalMargin = 0;
                        let itemCount = 0;
                        
                        const codesWithData = pkdCodes.filter((code: any) => {
                            const cleanSymbol = code.symbol.replace(/^[A-U]\./, '').replace(/\.Z$/, '');
                            return financialData[cleanSymbol] && Object.keys(financialData[cleanSymbol]).length > 0;
                        });

                        const tableData = codesWithData.map((code: any, index: number) => {
                            const cleanSymbol = code.symbol.replace(/^[A-U]\./, '').replace(/\.Z$/, '');
                            const codeFinancialData = financialData[cleanSymbol] || {};
                            const years = Object.keys(codeFinancialData).sort();
                            
                            const latestYear = years[years.length - 1];
                            const latestData = latestYear ? codeFinancialData[latestYear] : null;

                            const profRatio = latestData?.profitability_ratio || 0;
                            const margRatio = latestData?.margin_ratio || 0;
                            
                            totalProfitability += profRatio * 100;
                            totalMargin += margRatio * 100;
                            itemCount++;

                            // Oblicz zmianę rentowności
                            let profitabilityGrowth = 0;
                            if (years.length >= 2) {
                                const previousYear = years[years.length - 2];
                                const previousData = codeFinancialData[previousYear];
                                const currentProf = profRatio;
                                const previousProf = previousData?.profitability_ratio || 0;
                                profitabilityGrowth = (currentProf - previousProf) * 100;
                            }

                            return {
                                id: `${pkdIndex}-${code.symbol}-${index}`,
                                pkd_code: code.symbol,
                                name: code.name || 'Brak nazwy',
                                profitability_ratio: profRatio,
                                margin_ratio: margRatio,
                                profitability_growth: profitabilityGrowth,
                            };
                        }).filter(Boolean);

                        const aggregated = itemCount > 0 ? {
                            pkdCode: pkd.pkd || `${pkd.section}${pkd.division ? '.' + pkd.division : ''}${pkd.suffix ? '.' + pkd.suffix : ''}`,
                            avgProfitability: totalProfitability / itemCount,
                            avgMargin: totalMargin / itemCount,
                        } : null;

                        return { tableData, aggregated };
                    })
                );

                const allTableData = results.flatMap(r => r.tableData).filter(Boolean) as ProfitabilityData[];
                const aggregatedData = results.map(r => r.aggregated).filter(Boolean);
                
                console.log('📊 Table data:', allTableData);
                console.log('📈 Aggregated data:', aggregatedData);

                setProfitabilityData(allTableData);
                setAggregatedData(aggregatedData);

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
        <div className="rounded-md">
            <h1 className="text-2xl font-bold mb-4 text-gray-900">Rentowność Branży</h1>
            <p className="mb-4 text-gray-700">Rentowność i marża w wybranych branżach.</p>

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
                <p className="text-gray-600 text-center py-8">
                    Wybierz kody PKD w menu, aby wyświetlić dane o rentowności branży.
                </p>
            )}
        </div>
    );
}
