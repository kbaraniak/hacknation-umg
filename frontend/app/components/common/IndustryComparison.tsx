"use client";

import React from "react";
import Box from '@mui/material/Box';
import IndustryMetricCard from '../common/IndustryMetricCard';

type MetricData = {
    pkdCode: string;
    value: number;
    label: string;
};

type IndustryComparisonProps = {
    title: string;
    metrics: {
        title: string;
        data: MetricData[];
        color?: string;
        unit?: string;
        chartType?: 'bar' | 'line';
    }[];
    summaryData?: { pkdCode: string; [key: string]: any }[];
};

export default function IndustryComparison({ 
    title, 
    metrics = [],
    summaryData = []
}: IndustryComparisonProps) {
    if (!metrics || metrics.length === 0) {
        return null;
    }

    return (
        <Box sx={{ 
            width: '100%', 
            mb: 4, 
            p: 3, 
            backgroundColor: 'white', 
            borderRadius: 2, 
            border: '1px solid #e5e7eb' 
        }}>
            <h2 className="text-xl font-semibold mb-3 text-gray-900">{title}</h2>
            
            <div className={`grid gap-4 ${metrics.length === 2 ? 'grid-cols-2' : metrics.length === 3 ? 'grid-cols-3' : 'grid-cols-1'}`}>
                {metrics.map((metric, index) => (
                    <IndustryMetricCard
                        key={index}
                        title={metric.title}
                        data={metric.data}
                        color={metric.color}
                        unit={metric.unit}
                        chartType={metric.chartType}
                    />
                ))}
            </div>
            
            {summaryData.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    {summaryData.map(d => (
                        <div key={d.pkdCode} className="p-3 bg-gray-50 rounded border border-gray-300">
                            {Object.entries(d).map(([key, value]) => (
                                key !== 'pkdCode' && (
                                    <div key={key} className="text-gray-900">
                                        <strong className="font-semibold text-gray-900">{key}</strong>: {value}
                                    </div>
                                )
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </Box>
    );
}
