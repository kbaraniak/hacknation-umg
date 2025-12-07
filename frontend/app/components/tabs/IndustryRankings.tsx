"use client";

import React from "react";
import { getRankings } from "@/app/lib/client/pkdClient";
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

type RankingData = {
    id: string;
    rank: number;
    pkd_code: string;
    name: string;
    section: string;
    level: string;
    overall_score: number;
    size_score: number;
    profitability_score: number;
    growth_score: number;
    risk_score: number;
    category: string;
    credit_needs: string;
};

const columns: GridColDef<RankingData>[] = [
    { field: 'rank', headerName: 'Miejsce', width: 80 },
    { field: 'pkd_code', headerName: 'Kod PKD', width: 120 },
    { field: 'name', headerName: 'Nazwa', width: 300, flex: 1 },
    { field: 'section', headerName: 'Sekcja', width: 80 },
    {
        field: 'overall_score',
        headerName: 'Ocena ogólna',
        type: 'number',
        width: 120,
        valueFormatter: (value: number | undefined) => value ? `${value.toFixed(1)}/100` : '-',
        renderCell: (params) => (
            <span className={`font-semibold ${
                params.value >= 75 ? 'text-green-600' :
                params.value >= 60 ? 'text-blue-600' :
                params.value >= 40 ? 'text-yellow-600' :
                'text-red-600'
            }`}>
                {params.value?.toFixed(1)}/100
            </span>
        ),
    },
    {
        field: 'size_score',
        headerName: 'Rozmiar',
        type: 'number',
        width: 100,
        valueFormatter: (value: number | undefined) => value ? `${value.toFixed(1)}` : '-',
    },
    {
        field: 'profitability_score',
        headerName: 'Rentowność',
        type: 'number',
        width: 110,
        valueFormatter: (value: number | undefined) => value ? `${value.toFixed(1)}` : '-',
    },
    {
        field: 'growth_score',
        headerName: 'Wzrost',
        type: 'number',
        width: 100,
        valueFormatter: (value: number | undefined) => value ? `${value.toFixed(1)}` : '-',
    },
    {
        field: 'risk_score',
        headerName: 'Ryzyko',
        type: 'number',
        width: 100,
        valueFormatter: (value: number | undefined) => value ? `${value.toFixed(1)}` : '-',
    },
    {
        field: 'category',
        headerName: 'Kategoria',
        width: 120,
        renderCell: (params) => (
            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                params.value === 'ZDROWA' ? 'bg-green-100 text-green-800' :
                params.value === 'STABILNA' ? 'bg-blue-100 text-blue-800' :
                params.value === 'ZAGROŻONA' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
            }`}>
                {params.value}
            </span>
        ),
    },
];

type LevelType = 'section' | 'division' | 'group';
type OrderType = 'desc' | 'asc';

export default function IndustryRankings() {
    const [level, setLevel] = React.useState<LevelType>('division');
    const [order, setOrder] = React.useState<OrderType>('desc');
    const [data, setData] = React.useState<RankingData[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [totalCount, setTotalCount] = React.useState(0);

    React.useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const response = await getRankings(level, "2025", 50, undefined, order);
                
                const formattedData = (response.rankings || []).map((item: any) => ({
                    id: item.pkd_code,
                    rank: item.rank,
                    pkd_code: item.pkd_code,
                    name: item.name,
                    section: item.section || '-',
                    level: item.level,
                    overall_score: item.scores?.overall || 0,
                    size_score: item.scores?.size || 0,
                    profitability_score: item.scores?.profitability || 0,
                    growth_score: item.scores?.growth || 0,
                    risk_score: item.scores?.risk || 0,
                    category: item.classification?.category || '-',
                    credit_needs: item.classification?.credit_needs || '-',
                }));

                setData(formattedData);
                setTotalCount(response.total_count || 0);
            } catch (error) {
                console.error('Error fetching rankings:', error);
                setData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [level, order]);

    return (
        <div className="rounded-md">
            <h1 className="text-2xl font-bold mb-4 text-white">Rankingi Branż</h1>
            <p className="mb-4 text-white">
                Kompleksowy ranking branż według kondycji finansowej, potencjału wzrostu i poziomu ryzyka.
            </p>

            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel>Poziom szczegółowości</InputLabel>
                    <Select
                        value={level}
                        label="Poziom szczegółowości"
                        onChange={(e) => setLevel(e.target.value as LevelType)}
                    >
                        <MenuItem value="section">Sekcje (A-U)</MenuItem>
                        <MenuItem value="division">Działy (2-cyfrowe)</MenuItem>
                        <MenuItem value="group">Grupy (4-cyfrowe)</MenuItem>
                    </Select>
                </FormControl>

                <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel>Sortowanie</InputLabel>
                    <Select
                        value={order}
                        label="Sortowanie"
                        onChange={(e) => setOrder(e.target.value as OrderType)}
                    >
                        <MenuItem value="desc">Najlepsze ↓</MenuItem>
                        <MenuItem value="asc">Najgorsze ↑</MenuItem>
                    </Select>
                </FormControl>

                <Box sx={{ display: 'flex', alignItems: 'center', ml: 'auto', color: '#6b7280' }}>
                    <span className="text-sm">
                        Łącznie: <strong className="text-gray-900">{totalCount}</strong> branż
                    </span>
                </Box>
            </Box>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <Box sx={{ height: 700, width: '100%', bgcolor: 'white' }}>
                    <DataGrid
                        rows={data}
                        columns={columns}
                        initialState={{
                            pagination: {
                                paginationModel: { page: 0, pageSize: 25 },
                            },
                        }}
                        pageSizeOptions={[10, 25, 50]}
                        disableRowSelectionOnClick
                        sx={{
                            '& .MuiDataGrid-cell': {
                                color: '#1f2937',
                            },
                            '& .MuiDataGrid-columnHeaders': {
                                backgroundColor: '#f9fafb',
                                color: '#1f2937',
                                fontWeight: 600,
                            },
                        }}
                    />
                </Box>
            )}

            {!loading && data.length === 0 && (
                <Box sx={{ p: 4, textAlign: 'center', color: '#6b7280' }}>
                    Brak danych rankingowych.
                </Box>
            )}

            <Box sx={{ mt: 3, p: 3, bgcolor: '#f9fafb', borderRadius: 1, border: '1px solid #e5e7eb' }}>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Legenda ocen</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                        <strong className="text-gray-900">Rozmiar (0-25):</strong>
                        <p className="text-gray-700">Wielkość branży (przychody, jednostki)</p>
                    </div>
                    <div>
                        <strong className="text-gray-900">Rentowność (0-25):</strong>
                        <p className="text-gray-700">Marże, ROA, zyskowność</p>
                    </div>
                    <div>
                        <strong className="text-gray-900">Wzrost (0-25):</strong>
                        <p className="text-gray-700">Dynamika YoY, prognoza</p>
                    </div>
                    <div>
                        <strong className="text-gray-900">Ryzyko (0-25):</strong>
                        <p className="text-gray-700">Upadłości, zadłużenie, zmienność</p>
                    </div>
                </div>
            </Box>
        </div>
    );
}
