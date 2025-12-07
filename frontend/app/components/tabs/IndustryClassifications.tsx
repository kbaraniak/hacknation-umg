"use client";

import React from "react";
import { getClassifications } from "@/app/lib/client/pkdClient";
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import CircularProgress from '@mui/material/CircularProgress';

type ClassificationData = {
    id: string;
    rank: number;
    code: string;
    name: string;
    section: string;
    overall_score: number;
    category: string;
    recommendation: string;
    specific_indicators: any;
};

const columns: GridColDef<ClassificationData>[] = [
    { field: 'rank', headerName: 'Ranking', width: 80 },
    { field: 'code', headerName: 'Kod PKD', width: 100 },
    { field: 'name', headerName: 'Nazwa', width: 300, flex: 1 },
    { field: 'section', headerName: 'Sekcja', width: 80 },
    {
        field: 'overall_score',
        headerName: 'Ocena',
        type: 'number',
        width: 100,
        valueFormatter: (value: number | undefined) => value ? `${value.toFixed(1)}/100` : '-',
    },
    {
        field: 'category',
        headerName: 'Kategoria',
        width: 120,
    },
    {
        field: 'recommendation',
        headerName: 'Rekomendacja',
        width: 200,
        renderCell: (params) => (
            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                params.value === 'PRIORYTET FINANSOWANIA' ? 'bg-green-100 text-green-800' :
                params.value === 'UNIKAJ FINANSOWANIA' ? 'bg-red-100 text-red-800' :
                params.value === 'BEZPIECZNE FINANSOWANIE' ? 'bg-blue-100 text-blue-800' :
                'bg-yellow-100 text-yellow-800'
            }`}>
                {params.value}
            </span>
        ),
    },
];

type ClassificationType = 'risky' | 'growing' | 'high-credit-needs' | 'stable';

const classificationTabs: { value: ClassificationType; label: string; description: string }[] = [
    { value: 'growing', label: 'Rosnące', description: 'Branże dynamicznie rozwijające się' },
    { value: 'stable', label: 'Stabilne', description: 'Branże stabilne i przewidywalne' },
    { value: 'risky', label: 'Zagrożone', description: 'Branże z wysokim ryzykiem' },
    { value: 'high-credit-needs', label: 'Wysokie potrzeby', description: 'Wysokie potrzeby kredytowe' },
];

export default function IndustryClassifications() {
    const [selectedType, setSelectedType] = React.useState<ClassificationType>('growing');
    const [data, setData] = React.useState<ClassificationData[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [description, setDescription] = React.useState('');
    const [criteria, setCriteria] = React.useState<any>({});
        console.log('classificationData', data);
    

    React.useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const response = await getClassifications(selectedType, "2025", 20);
                
                const formattedData = (response.branches || []).map((branch: any) => ({
                    id: branch.code,
                    rank: branch.rank,
                    code: branch.code,
                    name: branch.name,
                    section: branch.section,
                    overall_score: branch.scores?.overall || 0,
                    category: branch.classification?.category || '-',
                    recommendation: branch.recommendation || '-',
                    specific_indicators: branch.specific_indicators || {},
                }));

                setData(formattedData);
                setDescription(response.description || '');
                setCriteria(response.criteria || {});
            } catch (error) {
                console.error('Error fetching classifications:', error);
                setData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [selectedType]);

    const handleTabChange = (_event: React.SyntheticEvent, newValue: ClassificationType) => {
        setSelectedType(newValue);
    };

    return (
        <div className="rounded-md">
            <h1 className="text-2xl font-bold mb-4 text-white">Klasyfikacje Branż</h1>
            <p className="mb-4 text-white">
                Automatyczna klasyfikacja branż według kondycji finansowej i potencjału rozwoju.
            </p>

            <Box sx={{ width: '100%', bgcolor: 'background.paper', mb: 3 }}>
                <Tabs
                    value={selectedType}
                    onChange={handleTabChange}
                    centered
                    sx={{
                        '& .MuiTab-root': {
                            color: '#374151',
                            '&.Mui-selected': {
                                color: '#1976d2',
                            },
                        },
                    }}
                >
                    {classificationTabs.map((tab) => (
                        <Tab key={tab.value} value={tab.value} label={tab.label} />
                    ))}
                </Tabs>
            </Box>

            {description && (
                <Box sx={{ mb: 3, p: 2, bgcolor: '#f9fafb', borderRadius: 1, border: '1px solid #e5e7eb' }}>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {classificationTabs.find(t => t.value === selectedType)?.label}
                    </h3>
                    <p className="text-gray-700 mb-2">{description}</p>
                    {Object.keys(criteria).length > 0 && (
                        <div className="mt-2">
                            <strong className="text-gray-900">Kryteria:</strong>
                            <ul className="list-disc list-inside text-gray-700 ml-2">
                                {Object.entries(criteria).map(([key, value]) => (
                                    <li key={key}>
                                        <strong>{key}:</strong> {String(value)}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </Box>
            )}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <Box sx={{ height: 600, width: '100%', bgcolor: 'white' }}>
                    <DataGrid
                        rows={data}
                        columns={columns}
                        initialState={{
                            pagination: {
                                paginationModel: { page: 0, pageSize: 10 },
                            },
                        }}
                        pageSizeOptions={[10, 20, 50]}
                        disableRowSelectionOnClick
                        sx={{
                            '& .MuiDataGrid-cell': {
                                color: '#1f2937',
                            },
                            '& .MuiDataGrid-columnHeaders': {
                                backgroundColor: '#f9fafb',
                                color: '#1f2937',
                            },
                        }}
                    />
                </Box>
            )}

            {!loading && data.length === 0 && (
                <Box sx={{ p: 4, textAlign: 'center', color: '#6b7280' }}>
                    Brak danych dla wybranej klasyfikacji.
                </Box>
            )}
        </div>
    );
}
