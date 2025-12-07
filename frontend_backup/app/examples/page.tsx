"use client";
import * as React from 'react';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import { DataGrid, GridRowsProp, GridColDef } from '@mui/x-data-grid';
import {
   BarChart,
   barClasses,
   barElementClasses,
   barLabelClasses,
} from '@mui/x-charts/BarChart';

import { loadFromStorage, saveToStorage } from '@/app/lib/client/storage';
import { LineChart, lineElementClasses, MarkElementProps, PieChart, ScatterChart } from '@mui/x-charts';

// Grid Chart data

const settingsBar1 = {
   xAxis: [{ data: ['group A', 'group B', 'group C'] }],
   series: [
      { id: '1', data: [4, 3, 5] },
      { id: '2', data: [1, 6, 3] },
      { id: '3', data: [2, 5, 6] },
   ],
   height: 300,
   barLabel: 'value',
   margin: { left: 0 },
} as const;

const rows: GridRowsProp = [
   { id: 1, name: 'Data Grid', description: 'the Community version' },
   { id: 2, name: 'Data Grid Pro', description: 'the Pro version' },
   { id: 3, name: 'Data Grid Premium', description: 'the Premium version' },
];

const columns: GridColDef[] = [
   { field: 'name', headerName: 'Product Name', width: 200 },
   { field: 'description', headerName: 'Description', width: 300 },
];

// Line Chart data
const uData = [4000, 3000, 2000, 2780, 1890, 2390, 3490];
const pData = [2400, 1398, 9800, 3908, 4800, 3800, 4300];
const xLabels = [
   'Page A',
   'Page B',
   'Page C',
   'Page D',
   'Page E',
   'Page F',
   'Page G',
];
const margin = { top: 20, right: 20, bottom: 20, left: 20 };

// Pie Chart data
const dataPieChart = [
   { id: 0, value: 10, label: 'series A' },
   { id: 1, value: 15, label: 'series B' },
   { id: 2, value: 20, label: 'series C' },
];

const settingsPieChart = {
   margin: { right: 5 },
   width: 200,
   height: 200,
   hideLegend: false,
};

// Scatter Chart data
const dataScatterChart = [
  { "id": "data-1", "x1": 21, "y1": 201, "x2": 144, "y2": 17 },
  { "id": "data-2", "x1": 242, "y1": 428, "x2": 159, "y2": 85 },
  { "id": "data-3", "x1": 156, "y1": 324, "x2": 292, "y2": 196 },
  { "id": "data-4", "x1": 42, "y1": 254, "x2": 226, "y2": 190 },
  { "id": "data-5", "x1": 23, "y1": 209, "x2": 150, "y2": 38 },
  { "id": "data-6", "x1": 228, "y1": 418, "x2": 297, "y2": 206 },
  { "id": "data-7", "x1": 16, "y1": 194, "x2": 181, "y2": 110 },
  { "id": "data-8", "x1": 145, "y1": 326, "x2": 295, "y2": 213 },
  { "id": "data-9", "x1": 0, "y1": 241, "x2": 368, "y2": 282 },
  { "id": "data-10", "x1": 133, "y1": 311, "x2": 314, "y2": 201 },
  { "id": "data-11", "x1": 182, "y1": 362, "x2": 309, "y2": 224 },
  { "id": "data-12", "x1": 14, "y1": 212, "x2": 353, "y2": 301 },
  { "id": "data-13", "x1": 95, "y1": 321, "x2": 225, "y2": 128 },
  { "id": "data-14", "x1": 27, "y1": 209, "x2": 330, "y2": 294 },
  { "id": "data-15", "x1": 153, "y1": 382, "x2": 181, "y2": 74 },
  { "id": "data-16", "x1": 180, "y1": 342, "x2": 196, "y2": 154 },
  { "id": "data-17", "x1": 15, "y1": 197, "x2": 268, "y2": 177 },
  { "id": "data-18", "x1": 94, "y1": 311, "x2": 348, "y2": 224 },
  { "id": "data-19", "x1": 125, "y1": 270, "x2": 370, "y2": 281 },
  { "id": "data-20", "x1": 241, "y1": 476, "x2": 280, "y2": 228 }
];

export default function Home() {
   saveToStorage("filter", { sort_name: "ascending", name: "piek" });
   console.log("Storage: " + loadFromStorage("filter")?.name);
   return (
      <Container maxWidth="lg">
         <Box
            sx={{
               my: 4,
               display: 'flex',
               flexDirection: 'column',
               justifyContent: 'center',
               alignItems: 'center',
            }}
         >
            <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
               Examples Demo
            </Typography>
         </Box>
         <h2 className='font-bold text-2xl text-center mt-5'>Data Grid</h2>
         <div style={{ height: 300, width: '100%' }}>
            <DataGrid rows={rows} columns={columns} />
         </div>
         <h2 className='font-bold text-2xl text-center mt-5'>Bar Chart</h2>
         <BarChart
            xAxis={[
               {
                  id: 'barCategories',
                  data: ['bar A', 'bar B', 'bar C'],
               },
            ]}
            series={[
               {
                  data: [2, 5, 3],
                  color: "red",
               },
            ]}
            height={300}
         />
         <BarChart
            {...settingsBar1}
            sx={{
               [`& .${barClasses.series}[data-series="2"] .${barElementClasses.root}`]: {
                  fill: 'url(#bar-gradient)',
               },
               [`& .${barClasses.seriesLabels}[data-series="2"] .${barLabelClasses.root}`]:
               {
                  fontWeight: 'bold',
               },
            }}
         >
            <defs>
               <Gradient id="bar-gradient" />
            </defs>
         </BarChart>
         {/* https://mui.com/x/react-charts/bars/ */}
         <h2 className='font-bold text-2xl text-center mt-5'>Line Chart</h2>
         <LineChart
            series={[
               { data: pData, label: 'pv' },
               { data: uData, label: 'uv' },
            ]}
            xAxis={[{ scaleType: 'point', data: xLabels }]}
            yAxis={[{ width: 50 }]}
            margin={margin}
         />
         <LineChart
            series={[{ data: pData, label: 'pv', color: 'green' }]}
            xAxis={[{ scaleType: 'point', data: xLabels }]}
            yAxis={[{ width: 50 }]}
            margin={margin}
            slots={{
               mark: CustomMark,
            }}
         />
         <LineChart
            series={[{ data: uData, label: 'uv', area: true, showMark: false, color: 'pink' }]}
            xAxis={[{ scaleType: 'point', data: xLabels }]}
            sx={{
               [`& .${lineElementClasses.root}`]: {
                  display: 'none',
               },
            }}
            margin={margin}
         />
         <h2 className='font-bold text-2xl text-center mt-5'>Pie Chart</h2>
         <div className="flex justify-center">
            <div className="w-1/2 h-60 bg-white m-2 flex items-center justify-center">
               <PieChart
                  series={[
                     {
                        data: [
                           { id: 0, value: 10, label: 'series A' },
                           { id: 1, value: 15, label: 'series B' },
                           { id: 2, value: 20, label: 'series C' },
                        ],
                     },
                  ]}
                  width={200}
                  height={200}
               />
               <PieChart
                  series={[{ innerRadius: 50, outerRadius: 100, data: dataPieChart, arcLabel: 'value' }]}
                  {...settingsPieChart}
               />
               <PieChart
                  series={[
                     {
                        data: [],
                        innerRadius: 26,
                        outerRadius: 100,
                        paddingAngle: 5,
                        cornerRadius: 5,
                        startAngle: -54,
                        endAngle: 225,
                        cx: 150,
                        cy: 150,
                     }
                  ]}
               />
            </div>
            {/* https://mui.com/x/react-charts/pie/ */}


         </div>
                      <h2 className='font-bold text-2xl text-center mt-5'>Scatter Chart</h2>
            <ScatterChart
               height={300}
               series={[
                  {
                     label: 'Series A',
                     data: dataScatterChart.map((v) => ({ x: v.x1, y: v.y1, id: v.id })),
                  },
                  {
                     label: 'Series B',
                     data: dataScatterChart.map((v) => ({ x: v.x2, y: v.y2, id: v.id })),
                  },
               ]}
            />


      </Container>
   );
}

function Gradient(props: React.SVGProps<SVGLinearGradientElement>) {
   return (
      <linearGradient gradientTransform="rotate(90)" {...props}>
         <stop offset="5%" stopColor="gold" />
         <stop offset="95%" stopColor="red" />
      </linearGradient>
   );
}

function CustomMark(props: MarkElementProps) {
   const { x, y } = props;

   return (
      <g>
         <circle cx={x} cy={y} r={4} fill={'white'} />
         <text
            x={x}
            y={Number(y) - 12}
            style={{
               textAnchor: 'middle',
               dominantBaseline: 'auto',
               fill: 'yellow',
               fontWeight: 'bold',
               fontSize: 12,
            }}
         >
            {pData[props.dataIndex].toString()}
         </text>
      </g>
   );
}