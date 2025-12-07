"use client";

import React from "react";
import Box from '@mui/material/Box';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { BarChart } from '@mui/x-charts/BarChart';
import { getIndustry, compareIndustries } from "@/app/lib/client/pkdClient";
import { usePKD } from "@/app/context/PKDContext";

type PKDItem = {
    section?: string;
    division?: string;
    suffix?: string;
    pkd?: string;
    full?: string;
};

type IndustryData = {
    id: string;
    pkd_code: string;
    name: string;
    level: string;
    section?: string;
    revenue?: number;
    units?: number;
    profitability?: number;
};

type AggregatedData = {
    pkdCode: string;
    totalRevenue: number;
    totalUnits: number;
};

const columns: GridColDef<IndustryData>[] = [
    {
        field: 'section',
        headerName: 'Sekcja',
        width: 100,
        editable: false,
    },
    {   
        field: 'pkd_code', 
        headerName: 'Kod PKD', 
        width: 130 
    },
    {
        field: 'name',
        headerName: 'Nazwa',
        width: 300,
        editable: false,
    },
    {
        field: 'level',
        headerName: 'Poziom',
        width: 120,
        editable: false,
    },
    {
        field: 'units',
        headerName: 'Liczba jednostek',
        type: 'number',
        width: 150,
        editable: false,
        valueFormatter: (value: number | undefined) => value ? value.toLocaleString('pl-PL') : '-',
    },
    {
        field: 'revenue',
        headerName: 'Przychody (tys. PLN)',
        type: 'number',
        width: 180,
        editable: false,
        valueFormatter: (value: number | undefined) => value ? value.toLocaleString('pl-PL') : '-',
    },
    {
        field: 'profitability',
        headerName: 'Rentowność (%)',
        type: 'number',
        width: 150,
        editable: false,
        valueFormatter: (value: number | undefined) => value ? `${(value * 100).toFixed(2)}%` : '-',
    },
];

export default function Size() {
    const { selectedPKDs, startYear, endYear } = usePKD();
    const [industryData, setIndustryData] = React.useState<IndustryData[]>([]);
    const [aggregatedData, setAggregatedData] = React.useState<AggregatedData[]>([]);
    const [loading, setLoading] = React.useState(false);

    // Fetch data when PKDs are selected - OPTIMIZED with /api/compare
    React.useEffect(() => {
        const fetchIndustryData = async () => {
            if (selectedPKDs.length === 0) {
                setIndustryData([]);
                setAggregatedData([]);
                return;
            }

            setLoading(true);
            try {
                // Build codes string for compare API (e.g., "G.46,C.10,A")
                const codes = selectedPKDs
                    .filter(pkd => pkd.section)
                    .map(pkd => {
                        const parts = [pkd.section];
                        if (pkd.division) parts.push(pkd.division);
                        if (pkd.suffix) parts.push(pkd.suffix);
                        return parts.join('.');
                    })
                    .join(',');

                if (!codes) {
                    setIndustryData([]);
                    setAggregatedData([]);
                    setLoading(false);
                    return;
                }

                // Single API call to compare all branches
                const yearsRange = startYear && endYear ? `${startYear}-${endYear}` : undefined;
                const compareResults = await compareIndustries(codes, "2025", yearsRange);

                const aggregatedResults: AggregatedData[] = [];
                const allTableRows: any[] = [];

                // Process compare results
                for (const result of compareResults) {
                    const summary = result.summary || {};
                    const pkdCode = result.id || '';
                    
                    aggregatedResults.push({
                        pkdCode,
                        totalRevenue: summary.total_revenue || 0,
                        totalUnits: summary.total_units || 0,
                    });

                    // For detailed table, we still need individual industry data
                    // (compare API returns aggregated time series, not per-code breakdown)
                    const matchingPKD = selectedPKDs.find(p => {
                        const fullCode = [p.section, p.division, p.suffix].filter(Boolean).join('.');
                        return pkdCode.includes(fullCode) || fullCode.includes(pkdCode.replace(/^[A-U]\./, ''));
                    });

                    if (matchingPKD && matchingPKD.section) {
                        try {
                            const detailResponse = await getIndustry({
                                section: matchingPKD.section,
                                division: matchingPKD.division,
                                group: matchingPKD.suffix,
                                version: "2025",
                                year_from: startYear,
                                year_to: endYear
                            });

                            const pkdCodes = detailResponse.pkd_codes || [];
                            const financialData = detailResponse.financial_data || {};

                            const codesWithData = pkdCodes.filter((code: any) => {
                                const cleanSymbol = code.symbol.replace(/^[A-U]\./, '').replace(/\.Z$/, '');
                                return financialData[cleanSymbol] && Object.keys(financialData[cleanSymbol]).length > 0;
                            });

                            const rows = codesWithData.map((code: any, index: number) => {
                                const symbolWithoutSection = code.symbol.replace(/^[A-U]\./, '');
                                const cleanSymbol = symbolWithoutSection.replace(/\.Z$/, '');
                                const codeFinancialData = financialData[cleanSymbol] || {};
                                const years = Object.keys(codeFinancialData).sort().reverse();
                                const latestYear = years[0];
                                const latestData = latestYear ? codeFinancialData[latestYear] : null;

                                return {
                                    id: `${matchingPKD.pkd}-${code.symbol}-${index}`,
                                    pkd_code: code.symbol || matchingPKD.pkd || '',
                                    name: code.name || 'Brak nazwy',
                                    level: code.level || 'N/A',
                                    section: code.section || matchingPKD.section,
                                    units: latestData?.unit_count,
                                    revenue: latestData?.revenue,
                                    profitability: latestData?.profitability_ratio,
                                };
                            });

                            allTableRows.push(...rows);
                        } catch (error) {
                            console.error(`Error fetching detail for ${pkdCode}:`, error);
                        }
                    }
                }

                setIndustryData(allTableRows);
                setAggregatedData(aggregatedResults);
            } catch (error) {
                console.error('Error fetching industry data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchIndustryData();
    }, [selectedPKDs, startYear, endYear]);

    return (
        <div className="rounded-md">
            <h1 className="text-2xl font-bold mb-4 text-gray-900">Wielkość Branży</h1>
            <p className="mb-4 text-gray-700">Wybierz kody PKD w głównym menu, aby wyświetlić dane branżowe.</p>

            {/* Bar Chart - Comparison */}
            {selectedPKDs.length > 0 && aggregatedData.length > 0 && (
                <Box sx={{ width: '100%', mb: 4, p: 3, backgroundColor: 'white', borderRadius: 2, border: '1px solid #e5e7eb' }}>
                    <h2 className="text-xl font-semibold mb-3 text-gray-900">Porównanie wybranych PKD</h2>
                    
                    <div className="grid grid-cols-2 gap-4">
                        {/* Wykres przychodów */}
                        <div>
                            <h3 className="text-lg font-medium mb-2 text-gray-800">Przychody (mln PLN)</h3>
                            <BarChart
                                xAxis={[{ 
                                    scaleType: 'band', 
                                    data: aggregatedData.map(d => d.pkdCode),
                                }]}
                                series={[
                                    { 
                                        data: aggregatedData.map(d => d.totalRevenue), 
                                        label: 'Przychody (mln PLN)',
                                        color: '#1976d2',
                                    },
                                ]}
                                height={300}
                                margin={{ top: 20, right: 20, bottom: 60, left: 60 }}
                            />
                        </div>
                        
                        {/* Wykres jednostek */}
                        <div>
                            <h3 className="text-lg font-medium mb-2 text-gray-800">Liczba jednostek</h3>
                            <BarChart
                                xAxis={[{ 
                                    scaleType: 'band', 
                                    data: aggregatedData.map(d => d.pkdCode),
                                }]}
                                series={[
                                    { 
                                        data: aggregatedData.map(d => d.totalUnits), 
                                        label: 'Jednostki',
                                        color: '#dc004e',
                                    },
                                ]}
                                height={300}
                                margin={{ top: 20, right: 20, bottom: 60, left: 60 }}
                            />
                        </div>
                    </div>
                    
                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-gray-900">
                        {aggregatedData.map(d => (
                            <div key={d.pkdCode} className="p-2 bg-gray-100 rounded border border-gray-300">
                                <strong className="text-gray-900">{d.pkdCode}</strong>: {d.totalRevenue.toLocaleString('pl-PL')} mln PLN 
                                <br/>
                                Jednostek: {d.totalUnits.toLocaleString('pl-PL')}
                            </div>
                        ))}
                    </div>
                </Box>
            )}

            {/* Data Grid */}
            {selectedPKDs.length > 0 && (
                <Box sx={{ height: 600, width: '100%', backgroundColor: 'white', p: 2, borderRadius: 2, border: '1px solid #e5e7eb' }}>
                    <h2 className="text-xl font-semibold mb-3 text-gray-900">Szczegółowe dane</h2>
                    <DataGrid
                        rows={industryData}
                        columns={columns}
                        loading={loading}
                        initialState={{
                            pagination: {
                                paginationModel: {
                                    pageSize: 10,
                                },
                            },
                        }}
                        className="rounded-md"
                        pageSizeOptions={[5, 10, 25, 50]}
                        checkboxSelection
                        disableRowSelectionOnClick
                        sx={{
                            '& .MuiDataGrid-cell': {
                                fontSize: '0.875rem',
                            },
                            '& .MuiDataGrid-columnHeaders': {
                                backgroundColor: '#f5f5f5',
                                fontWeight: 'bold',
                            },
                        }}
                    />
                </Box>
            )}

            {selectedPKDs.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    <p>Nie wybrano żadnych kodów PKD. Użyj przycisku "Numery PKD" w głównym menu, aby wybrać kody.</p>
                </div>
            )}
        </div>
    );
}