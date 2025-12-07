"use client";

import React from "react";
import Box from '@mui/material/Box';
import { BarChart } from '@mui/x-charts/BarChart';
import { LineChart } from '@mui/x-charts/LineChart';

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
    chartType?: 'bar' | 'line';
};

export default function IndustryMetricCard({ 
    title, 
    data, 
    color = '#1976d2',
    unit = '',
    chartType = 'bar'
}: IndustryMetricCardProps) {
    if (!data || data.length === 0) {
        return null;
    }

    const xAxisData = data.map(d => d.pkdCode);
    const seriesData = data.map(d => d.value);

    return (
        <div className="p-4 bg-white rounded-lg border border-gray-300">
            <h3 className="text-lg font-semibold mb-2 text-gray-900">{title}</h3>
            {chartType === 'line' ? (
                <LineChart
                    xAxis={[{ 
                        scaleType: 'point', 
                        data: xAxisData,
                        label: 'Kod PKD',
                    }]}
                    series={[
                        { 
                            data: seriesData, 
                            label: title,
                            color: color,
                            curve: 'linear',
                            showMark: true,
                        },
                    ]}
                    height={300}
                    margin={{ top: 20, right: 20, bottom: 60, left: 80 }}
                    slotProps={{
                        legend: { hidden: false }
                    }}
                />
            ) : (
                <BarChart
                    xAxis={[{ 
                        scaleType: 'band', 
                        data: xAxisData,
                        label: 'Kod PKD',
                    }]}
                    series={[
                        { 
                            data: seriesData, 
                            label: title,
                            color: color,
                            type: 'bar' as const,
                        },
                    ]}
                    height={300}
                    margin={{ top: 20, right: 20, bottom: 60, left: 80 }}
                    slotProps={{
                        legend: { hidden: false }
                    }}
                />
            )}
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
