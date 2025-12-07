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
        <div className="flex flex-col items-center w-full lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 bg-gray-800 text-white p-4">
            <Image className="rounded-md mt-2 mb-4 lg:mb-6 w-16 h-16 lg:w-20 lg:h-20" src="/favicon.ico" alt="Logo PKOBP" width={80} height={80} />
            <Tabs 
                aria-label="Menu" 
                fullWidth 
                isVertical={false}
                selectedKey={selectedKey ?? undefined} 
                onSelectionChange={(k) => onSelectionChange?.(k as string)}
                classNames={{
                    base: "w-full",
                    tabList: "bg-transparent flex-col gap-2 w-full",
                    cursor: "bg-gray-700 w-full",
                    tab: "justify-start h-12 px-4 w-full data-[hover-unselected=true]:opacity-100",
                    tabContent: "text-white group-data-[selected=true]:text-white text-sm w-full"
                
                }}
            >
                {MENU_ITEMS.map((item) => (
                    <Tab 
                        key={item.key} 
                        title={
                            <div className="flex items-center gap-2 w-full">
                                <item.Icon sx={{ fontSize: 20 }} />
                                <span>{item.title}</span>
                            </div>
                        }
                        className={`justify-start w-full ${selectedKey === item.key ? 'font-bold' : ''}`}
                    />
                ))}
            </Tabs>
        </div>
    );
}
