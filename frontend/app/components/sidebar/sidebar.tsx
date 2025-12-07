"use client";

import React from "react";
import {Tabs, Tab} from "@heroui/tabs";
import { PieChart, TrendingUp, AttachMoney, AccountBalance, ReportProblem, Category, EmojiEvents } from '@mui/icons-material';
import Image from "next/image";

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
        { key: "Classifications", title: "Klasyfikacje", Icon: Category },
        { key: "Rankings", title: "Rankingi", Icon: EmojiEvents },
    ];

    return (
        <div className="flex flex-col items-center fixed inset-y-0 left-0 w-64 bg-gray-800 text-white p-4">
            <Image className="rounded-md mt-2 mb-6" src="/favicon.ico" alt="Logo PKOBP" width={80} height={80} />
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
                        className={`justify-start h-12 ${selectedKey === item.key ? 'font-bold' : ''}`}
                    />
                ))}
            </Tabs>
        </div>
    );
}
