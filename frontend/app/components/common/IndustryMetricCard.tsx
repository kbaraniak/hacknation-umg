"use client";

import React from "react";
import Box from '@mui/material/Box';
import { BarChart } from '@mui/x-charts/BarChart';

type MetricData = {
    pkdCode: string;
    value: number;
    label: string;
};

type IndustryMetricCardProps = {
    title: string;
    data: MetricData[];
    color?: string;
    unit?: string;
};

export default function IndustryMetricCard({ 
    title, 
    data, 
    color = '#1976d2',
    unit = ''
}: IndustryMetricCardProps) {
    if (data.length === 0) return null;

    return (
        <div className="p-4 bg-white rounded-lg border border-gray-300">
            <h3 className="text-lg font-semibold mb-2 text-gray-900">{title}</h3>
            <BarChart
                xAxis={[{ 
                    scaleType: 'band', 
                    data: data.map(d => d.pkdCode),
                }]}
                series={[
                    { 
                        data: data.map(d => d.value), 
                        label: title,
                        color: color,
                    },
                ]}
                height={300}
                margin={{ top: 20, right: 20, bottom: 60, left: 60 }}
            />
            <div className="mt-3 space-y-1 bg-gray-50 p-3 rounded border border-gray-200">
                {data.map(d => (
                    <div key={d.pkdCode} className="text-sm text-gray-900">
                        <strong className="font-semibold">{d.pkdCode}</strong>: {d.value.toLocaleString('pl-PL')}{unit}
                    </div>
                ))}
            </div>
        </div>
    );
}
