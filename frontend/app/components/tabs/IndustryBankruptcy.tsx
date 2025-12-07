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

                        // Flatten financial data to get all PKD codes with data
                        const allBankruptcyRecords: Array<{
                            pkdCode: string;
                            year: number;
                            unitCount: number;
                            bankruptcies: number;
                        }> = [];

                        // Process financial data for unit counts
                        Object.entries(financialData).forEach(([pkdCode, yearData]: [string, any]) => {
                            Object.entries(yearData).forEach(([year, data]: [string, any]) => {
                                if (data && typeof data === 'object') {
                                    allBankruptcyRecords.push({
                                        pkdCode,
                                        year: parseInt(year),
                                        unitCount: data.unit_count || 0,
                                        bankruptcies: 0
                                    });
                                }
                            });
                        });

                        // Process bankruptcy data
                        Object.entries(bankruptcyDataApi).forEach(([symbol, yearData]: [string, any]) => {
                            const cleanSymbol = symbol.replace(/^[A-U]\./, '').replace(/\.Z$/, '');
                            Object.entries(yearData).forEach(([year, bankruptcyCount]: [string, any]) => {
                                const yearNum = parseInt(year);
                                const existingRecord = allBankruptcyRecords.find(
                                    r => r.pkdCode === cleanSymbol && r.year === yearNum
                                );
                                
                                if (existingRecord) {
                                    existingRecord.bankruptcies = bankruptcyCount || 0;
                                } else {
                                    allBankruptcyRecords.push({
                                        pkdCode: cleanSymbol,
                                        year: yearNum,
                                        unitCount: 0,
                                        bankruptcies: bankruptcyCount || 0
                                    });
                                }
                            });
                        });

                        // Group by PKD code and calculate metrics
                        const pkdGrouped = new Map<string, Array<typeof allBankruptcyRecords[0]>>();
                        allBankruptcyRecords.forEach(record => {
                            if (!pkdGrouped.has(record.pkdCode)) {
                                pkdGrouped.set(record.pkdCode, []);
                            }
                            pkdGrouped.get(record.pkdCode)!.push(record);
                        });

                        return Array.from(pkdGrouped.entries()).map(([pkdCode, records], index) => {
                            // Sort by year
                            const sortedRecords = records.sort((a, b) => b.year - a.year);
                            const latestRecord = sortedRecords[0];
                            const previousRecord = sortedRecords[1];

                            if (!latestRecord) return null;

                            // Calculate bankruptcy rate
                            const bankruptcyRate = latestRecord.unitCount > 0
                                ? (latestRecord.bankruptcies / latestRecord.unitCount) * 100
                                : 0;

                            // Calculate trend (change in bankruptcy rate)
                            let bankruptcyTrend = 0;
                            if (previousRecord && previousRecord.unitCount > 0) {
                                const previousRate = (previousRecord.bankruptcies / previousRecord.unitCount) * 100;
                                bankruptcyTrend = bankruptcyRate - previousRate;
                            }

                            // Find the code information
                            const codeInfo = pkdCodes.find((c: any) => {
                                const cleanSym = c.symbol.replace(/^[A-U]\./, '').replace(/\.Z$/, '');
                                return cleanSym === pkdCode;
                            });

                            return {
                                id: `${pkd.pkd}-${pkdCode}-${index}`,
                                pkd_code: codeInfo?.symbol || pkdCode,
                                name: codeInfo?.name || 'Brak nazwy',
                                total_units: latestRecord.unitCount,
                                bankruptcies: latestRecord.bankruptcies,
                                bankruptcy_rate: bankruptcyRate,
                                bankruptcy_trend: bankruptcyTrend,
                            };
                        }).filter((item): item is BankruptcyData => item !== null);
                    })
                );

                const flattenedData = results.flat().filter(Boolean) as BankruptcyData[];
                setBankruptcyData(flattenedData);

                // Aggregate data by selected PKD
                const aggregated = selectedPKDs.map(pkd => {
                    const basePkdCode = pkd.pkd || '';
                    
                    // Filter data for this PKD (match by removing section prefix)
                    const pkdData = flattenedData.filter(d => {
                        const cleanCode = d.pkd_code.replace(/^[A-U]\./, '').replace(/\.Z$/, '');
                        return cleanCode.startsWith(basePkdCode);
                    });

                    if (pkdData.length === 0) {
                        return {
                            pkdCode: basePkdCode,
                            totalBankruptcies: 0,
                            bankruptcyRate: 0,
                        };
                    }

                    // Calculate averages
                    const totalUnits = pkdData.reduce((sum, d) => sum + d.total_units, 0);
                    const totalBankruptcies = pkdData.reduce((sum, d) => sum + d.bankruptcies, 0);
                    
                    // Average bankruptcy rate
                    const avgBankruptcyRate = pkdData.reduce((sum, d) => sum + d.bankruptcy_rate, 0) / pkdData.length;

                    return {
                        pkdCode: basePkdCode,
                        totalBankruptcies: totalBankruptcies,
                        bankruptcyRate: avgBankruptcyRate,
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
        <div className="rounded-md p-2 sm:p-0">
            <h1 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-gray-100">Szkodowość Branży</h1>
            <p className="mb-3 sm:mb-4 text-sm sm:text-base text-gray-300">Wskaźnik upadłości i jego dynamika w wybranych branżach.</p>

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
                <p className="text-gray-600 text-center py-8 text-sm sm:text-base">
                    Wybierz kody PKD w menu, aby wyświetlić dane o szkodowości branży.
                </p>
            )}
        </div>
    );
}
