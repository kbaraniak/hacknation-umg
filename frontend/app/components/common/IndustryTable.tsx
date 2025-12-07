"use client";

import React from "react";
import Box from '@mui/material/Box';
import { DataGrid, GridColDef } from '@mui/x-data-grid';

type TableColumn = GridColDef;

type IndustryTableProps = {
    title: string;
    rows: any[];
    columns: TableColumn[];
    loading?: boolean;
};

export default function IndustryTable({ 
    title, 
    rows, 
    columns, 
    loading = false 
}: IndustryTableProps) {
    return (
        <Box sx={{ 
            height: 600, 
            width: '100%', 
            backgroundColor: 'white', 
            p: 2, 
            borderRadius: 2, 
            border: '1px solid #e5e7eb' 
        }}>
            <h2 className="text-xl font-semibold mb-3 text-gray-900">{title}</h2>
            <DataGrid
                rows={rows}
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
                    backgroundColor: 'white',
                    '& .MuiDataGrid-cell': {
                        color: '#111827',
                        fontSize: '0.875rem',
                    },
                    '& .MuiDataGrid-columnHeaders': {
                        backgroundColor: '#f3f4f6',
                        color: '#111827',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                    },
                    '& .MuiDataGrid-row': {
                        '&:hover': {
                            backgroundColor: '#f9fafb',
                        },
                    },
                    '& .MuiCheckbox-root': {
                        color: '#6b7280',
                    },
                    '& .MuiDataGrid-footerContainer': {
                        backgroundColor: '#f9fafb',
                        color: '#111827',
                    },
                }}
            />
        </Box>
    );
}
