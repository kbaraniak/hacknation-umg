"use client";

import React from "react";
import {Tabs, Tab} from "@heroui/tabs";
import { PieChart, TrendingUp, AttachMoney, AccountBalance, ReportProblem, Category, EmojiEvents, Menu as MenuIcon, Close } from '@mui/icons-material';
import Image from "next/image";

export type SidebarProps = {
    selectedKey?: string | null;
    onSelectionChange?: (key: string | null) => void;
};

export default function Sidebar({ selectedKey, onSelectionChange }: SidebarProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
    
    const MENU_ITEMS = [
        { key: "Size", title: "Wielkość Branży", Icon: PieChart },
        { key: "Trends", title: "Trendy", Icon: TrendingUp },
        { key: "Finance", title: "Finanse", Icon: AttachMoney },
        { key: "Debt", title: "Zadłużenie", Icon: AccountBalance },
        { key: "Risk", title: "Ryzyko", Icon: ReportProblem },
        { key: "Classifications", title: "Klasyfikacje", Icon: Category },
        { key: "Rankings", title: "Rankingi", Icon: EmojiEvents },
    ];

    const selectedItem = MENU_ITEMS.find(item => item.key === selectedKey);

    const handleSelectionChange = (key: string) => {
        onSelectionChange?.(key);
        setIsMobileMenuOpen(false); // Zamknij menu po wyborze na mobile
    };

    return (
        <>
            {/* Mobile: Hamburger button and selected item */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-gray-800 text-white px-4 py-3 flex items-center justify-between">
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 hover:bg-gray-700 rounded-md transition-colors"
                    aria-label="Toggle menu"
                >
                    {isMobileMenuOpen ? <Close sx={{ fontSize: 28 }} /> : <MenuIcon sx={{ fontSize: 28 }} />}
                </button>
                
                {selectedItem && (
                    <div className="flex items-center gap-2 flex-1 justify-center">
                        <selectedItem.Icon sx={{ fontSize: 24 }} />
                        <span className="font-semibold text-sm">{selectedItem.title}</span>
                    </div>
                )}
                
                <Image className="rounded-md w-10 h-10" src="/favicon.ico" alt="Logo" width={40} height={40} />
            </div>

            {/* Mobile: Dropdown menu */}
            <div className={`lg:hidden fixed top-[57px] left-0 right-0 z-40 bg-gray-800 text-white transition-all duration-300 overflow-hidden ${
                isMobileMenuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
            }`}>
                <div className="p-4">
                    <Tabs 
                        aria-label="Menu" 
                        fullWidth 
                        isVertical={false}
                        selectedKey={selectedKey ?? undefined} 
                        onSelectionChange={(k) => handleSelectionChange(k as string)}
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
            </div>

            {/* Desktop: Fixed sidebar */}
            <div className="hidden lg:flex flex-col items-center w-64 fixed inset-y-0 left-0 bg-gray-800 text-white p-4">
                <Image className="rounded-md mt-2 mb-6 w-20 h-20" src="/favicon.ico" alt="Logo PKOBP" width={80} height={80} />
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
        </>
    );
}
