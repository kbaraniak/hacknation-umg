"use client";
import React from "react";
import PKDInput from "@/app/components/App/Input/pkd";
import IndustryList from "@/app/components/App/IndustryList";
import TimeRange from "@/app/components/App/TimeRange";
import MultiIndustryChart from "@/app/components/App/MultiIndustryChart";

type PKDValue = {
  section?: string;
  division?: string;
  suffix?: string;
  pkd?: string;
  full?: string;
};

export default function DemoPage() {
  const [selectedPKD, setSelectedPKD] = React.useState<PKDValue | null>(null);
  const [industries, setIndustries] = React.useState<PKDValue[]>([]);
  const [timeRange, setTimeRange] = React.useState({ from: 2020, to: 2024 });
  const [selectedCodes, setSelectedCodes] = React.useState<string[]>([]);
  
  const handlePKDChange = (value: PKDValue) => {
    console.log("PKD changed:", value);
    setSelectedPKD(value);
  };
  
  const handleAddIndustry = () => {
    if (selectedPKD && selectedPKD.full) {
      // Check if already exists
      if (!industries.some(i => i.full === selectedPKD.full)) {
        setIndustries([...industries, selectedPKD]);
      }
    }
  };
  
  const handleRemoveIndustry = (index: number) => {
    setIndustries(industries.filter((_, i) => i !== index));
  };
  
  const handleIndustryListChange = (codes: string[]) => {
    console.log("Industry codes changed:", codes);
    setSelectedCodes(codes);
  };
  
  const handleTimeRangeChange = (range: { from: number; to: number }) => {
    console.log("Time range changed:", range);
    setTimeRange(range);
  };
  
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Demo: PKD Components
        </h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            1. PKD Input
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Wybierz sekcję, dział i klasę PKD. Komponent automatycznie załaduje sugestie z API.
          </p>
          <PKDInput onChange={handlePKDChange} />
          
          {selectedPKD && selectedPKD.full && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-900">
                Wybrano: {selectedPKD.full}
              </p>
              <button
                onClick={handleAddIndustry}
                className="mt-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Dodaj do listy
              </button>
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            2. Industry List
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Lista wybranych branż. Możesz dodawać i usuwać branże.
          </p>
          <IndustryList
            items={industries}
            onChangeAction={handleIndustryListChange}
            onRemove={handleRemoveIndustry}
          />
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            3. Time Range
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Wybierz zakres lat do analizy. Zmiany są debounce&apos;owane (200ms).
          </p>
          <TimeRange
            value={timeRange}
            onChangeAction={handleTimeRangeChange}
            minYear={2000}
            maxYear={2024}
          />
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            4. Multi-Industry Chart
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Wykres porównujący wybrane branże. Dane pobierane z API /api/compare.
          </p>
          
          {selectedCodes.length === 0 ? (
            <div className="p-8 bg-gray-50 rounded-lg text-center">
              <p className="text-gray-600">
                Dodaj branże do listy powyżej, aby zobaczyć wykres porównawczy.
              </p>
            </div>
          ) : (
            <MultiIndustryChart
              codes={selectedCodes}
              years={timeRange}
              version="2025"
            />
          )}
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Debug Info</h3>
          <div className="text-xs text-blue-800 space-y-1">
            <div>Selected PKD: {selectedPKD?.full || "none"}</div>
            <div>Industries: {industries.length}</div>
            <div>Selected Codes: {selectedCodes.join(", ") || "none"}</div>
            <div>Time Range: {timeRange.from} - {timeRange.to}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
