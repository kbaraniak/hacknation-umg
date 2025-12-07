"use client";

import React from "react";
import {Tabs, Tab} from "@heroui/tabs";
import { PieChart, TrendingUp, AttachMoney, AccountBalance, ReportProblem } from '@mui/icons-material';

export type SidebarProps = {
    selectedKey?: string | null;
    onSelectionChange?: (key: string | null) => void;
};

export default function Sidebar({ selectedKey, onSelectionChange }: SidebarProps) {
    const MENU_ITEMS = [
        { key: "Size", title: "Wielkość Branży", Icon: PieChart },
        { key: "Trends", title: "Trendy", Icon: TrendingUp },
        { key: "Finance", title: "Finanse", Icon: AttachMoney },
        { key: "Debt", title: "Zadłużenie", Icon: AccountBalance },
        { key: "Risk", title: "Ryzyko", Icon: ReportProblem },
    ];

    return (
        <div className="fixed inset-y-0 left-0 w-64 bg-gray-800 text-white p-4">
            <p className="text-xl font-bold mb-6">PKO LOGO</p>
            <Tabs 
                aria-label="Menu" 
                fullWidth 
                isVertical 
                selectedKey={selectedKey ?? undefined} 
                onSelectionChange={(k) => onSelectionChange?.(k as string)}
                classNames={{
                    tabList: "bg-transparent",
                    cursor: "bg-gray-700",
                    tab: "justify-start h-12",
                    tabContent: "text-white group-data-[selected=true]:text-white"
                }}
            >
                {MENU_ITEMS.map((item) => (
                    <Tab 
                        key={item.key} 
                        title={
                            <div className="flex items-center gap-2">
                                <item.Icon sx={{ fontSize: 20 }} />
                                <span>{item.title}</span>
                            </div>
                        }
                    />
                ))}
            </Tabs>
        </div>
    );
}
