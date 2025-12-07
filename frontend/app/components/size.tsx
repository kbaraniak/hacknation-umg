"use client";

import React from "react";
import Box from '@mui/material/Box';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
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
    // {
    //     field: 'level',
    //     headerName: 'Poziom',
    //     width: 120,
    //     editable: false,
    // },
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
    const [loading, setLoading] = React.useState(false);

    // Fetch data when PKDs are selected
    React.useEffect(() => {
        const fetchIndustryData = async () => {
            if (selectedPKDs.length === 0) {
                setIndustryData([]);
                return;
            }

            setLoading(true);
            try {
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

                        // Extract relevant data from response
                        const pkdCodes = response.pkd_codes || [];
                        const financialData = response.financial_data || {};
                        
                        // Filtruj tylko subklasy (podklasy)
                        const subclassesOnly = pkdCodes.filter((code: any) => 
                            code.level === 'subclass' || code.level === 'SUBCLASS'
                        );
                        
                        return subclassesOnly.map((code: any, index: number) => {
                            // Get latest year's financial data
                            const years = Object.keys(financialData).sort().reverse();
                            const latestYear = years[0];
                            const latestData = latestYear ? financialData[latestYear]?.[0] : null;

                            return {
                                id: `${pkd.pkd}-${index}`,
                                pkd_code: code.symbol || pkd.pkd || '',
                                name: code.name || 'Brak nazwy',
                                level: code.level || 'N/A',
                                section: code.section || pkd.section,
                                units: latestData?.unit_count,
                                revenue: latestData?.revenue,
                                profitability: latestData?.profitability_ratio,
                            };
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
            <h1 className="text-2xl font-bold mb-4">Wielkość Branży</h1>
            <p className="mb-4">Wybierz kody PKD w głównym menu, aby wyświetlić dane branżowe (pokazywane tylko podklasy).</p>

            {/* Data Grid */}
            {selectedPKDs.length > 0 && (
                <Box sx={{ height: 600, width: '100%' }}>
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