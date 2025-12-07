"use client";

import React from "react";
import Box from '@mui/material/Box';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { BarChart } from '@mui/x-charts/BarChart';
import { getIndustry } from "@/app/lib/client/pkdClient";
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
    const { selectedPKDs } = usePKD();
    const [industryData, setIndustryData] = React.useState<IndustryData[]>([]);
    const [aggregatedData, setAggregatedData] = React.useState<AggregatedData[]>([]);
    const [loading, setLoading] = React.useState(false);

    // Fetch data when PKDs are selected
    React.useEffect(() => {
        const fetchIndustryData = async () => {
            if (selectedPKDs.length === 0) {
                setIndustryData([]);
                setAggregatedData([]);
                return;
            }

            setLoading(true);
            try {
                const aggregatedResults: AggregatedData[] = [];
                
                const dataPromises = selectedPKDs.map(async (pkd) => {
                    try {
                        // Walidacja - wymagamy przynajmniej section
                        if (!pkd.section) {
                            console.warn('Pominięto PKD bez section:', pkd);
                            return [];
                        }

                        const response = await getIndustry({
                            section: pkd.section,
                            division: pkd.division,
                            group: pkd.suffix,
                            version: "2025"
                        });

                        // Pobierz summary statistics dla wykresu
                        const summary = response.summary_statistics || {};
                        aggregatedResults.push({
                            pkdCode: pkd.pkd || `${pkd.section}${pkd.division ? '.' + pkd.division : ''}${pkd.suffix ? '.' + pkd.suffix : ''}`,
                            totalRevenue: summary.total_revenue || 0,
                            totalUnits: summary.total_units || 0,
                        });
                        
                        // Extract relevant data from response
                        const pkdCodes = response.pkd_codes || [];
                        const financialData = response.financial_data || {};
                        
                        // Pokaż wszystkie poziomy które mają dane finansowe (nie tylko subklasy)
                        const codesWithData = pkdCodes.filter((code: any) => {
                            const cleanSymbol = code.symbol.replace(/^[A-U]\./, '').replace(/\.Z$/, '');
                            return financialData[cleanSymbol] && Object.keys(financialData[cleanSymbol]).length > 0;
                        });
                        
                        return codesWithData.map((code: any, index: number) => {
                            // Backend teraz zwraca klucze w formacie bez sekcji i bez .Z (np. "02.10")
                            // Usuń tylko sekcję z symbolu: A.02.10.Z -> 02.10.Z
                            const symbolWithoutSection = code.symbol.replace(/^[A-U]\./, '');
                            // Usuń .Z: 02.10.Z -> 02.10
                            const cleanSymbol = symbolWithoutSection.replace(/\.Z$/, '');
                            
                            const codeFinancialData = financialData[cleanSymbol] || {};
                            const years = Object.keys(codeFinancialData).sort().reverse();
                            const latestYear = years[0];
                            const latestData = latestYear ? codeFinancialData[latestYear] : null;

                            const rowData = {
                                id: `${pkd.pkd}-${code.symbol}-${index}`,
                                pkd_code: code.symbol || pkd.pkd || '',
                                name: code.name || 'Brak nazwy',
                                level: code.level || 'N/A',
                                section: code.section || pkd.section,
                                units: latestData?.unit_count,
                                revenue: latestData?.revenue,
                                profitability: latestData?.profitability_ratio,
                            };
                            
                            // Debug pierwszego wiersza
                            if (index === 0) {
                                console.log('🔍 Pierwszy wiersz tabeli:', rowData);
                                console.log('📊 latestData:', latestData);
                            }
                            
                            return rowData;
                        });
                    } catch (error) {
                        console.error(`Error fetching data for PKD ${pkd.pkd}:`, error);
                        return [{
                            id: pkd.pkd || Math.random().toString(),
                            pkd_code: pkd.pkd || 'N/A',
                            name: 'Błąd ładowania danych',
                            level: 'N/A',
                            section: pkd.section,
                            units: undefined,
                            revenue: undefined,
                            profitability: undefined,
                        }];
                    }
                });

                const results = await Promise.all(dataPromises);
                const flattenedData = results.flat();
                setIndustryData(flattenedData);
                setAggregatedData(aggregatedResults);
            } catch (error) {
                console.error('Error fetching industry data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchIndustryData();
    }, [selectedPKDs]);

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