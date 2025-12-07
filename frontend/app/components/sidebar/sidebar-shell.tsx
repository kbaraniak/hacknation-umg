"use client";

import React, {useState, useEffect} from "react";
import Sidebar from "./sidebar";
import Size from "@/app/components/size";
import IndustryGrowth from "../tabs/IndustryGrowth";
import IndustryProfitability from "../tabs/IndustryProfitability";
import IndustryDebt from "../tabs/IndustryDebt";
import IndustryBankruptcy from "../tabs/IndustryBankruptcy";
import IndustryClassifications from "../tabs/IndustryClassifications";
import IndustryRankings from "../tabs/IndustryRankings";
import { saveToStorage, loadFromStorage } from '@/lib/client/storage';

const STORAGE_KEY_CATEGORY = 'hacknation_last_category';
const DEFAULT_CATEGORY = "Size";

export default function SidebarShell({children}: { children: React.ReactNode }) {
    const [isHydrated, setIsHydrated] = useState(false);
    const [selectedKey, setSelectedKey] = useState<string | null>(DEFAULT_CATEGORY);

    // Load from localStorage after hydration
    useEffect(() => {
        const storedCategory = loadFromStorage<string>(STORAGE_KEY_CATEGORY);
        if (storedCategory) {
            setSelectedKey(storedCategory);
        }
        setIsHydrated(true);
    }, []);

    // Save to localStorage when selection changes (only after hydration)
    useEffect(() => {
        if (isHydrated && selectedKey) {
            saveToStorage(STORAGE_KEY_CATEGORY, selectedKey);
        }
    }, [selectedKey, isHydrated]);

    const renderContent = () => {
        switch (selectedKey) {
            case "Size":
                return <Size/>;
            case "Trends":
                return <IndustryGrowth />;
            case "Finance":
                return <IndustryProfitability />;
            case "Debt":
                return <IndustryDebt />;
            case "Risk":
                return <IndustryBankruptcy />;
            case "Classifications":
                return <IndustryClassifications />;
            case "Rankings":
                return <IndustryRankings />;
            default:
                return <div>Empty</div>;
        }
    };

    return (
        <div className="min-h-screen flex">
            <div className="w-64">
                <Sidebar selectedKey={selectedKey} onSelectionChange={(k) => setSelectedKey(k)}/>
            </div>
            <main className="flex-1 flex flex-col p-6 pb-0">
                <div className="max-w-7xl w-full mx-auto flex-1 flex flex-col">
                    <div>{children}</div>
                    {/* render the tab-controlled content above the page children; flex-1 so it grows */}
                    <div className="">{renderContent()}</div>
                </div>
            </main>
        </div>
    );
}


