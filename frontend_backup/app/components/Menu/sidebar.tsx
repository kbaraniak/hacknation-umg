"use client";
import React from 'react';
import { Button } from '@heroui/button';
import { PieChart, TrendingUp, AttachMoney, AccountBalance, ReportProblem } from '@mui/icons-material';
import { saveToStorage } from '@/app/lib/client/storage'; // <- dodane

type NavItem = { key: string; text: string; Icon: React.ElementType };

export default function Sidebar({ onSelectAction }: { onSelectAction?: (item: NavItem) => void }) {
    // Pomocniczy komponent dla ikonek (Tailwind)
    const IconWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <div className="bg-blue-600 rounded-lg w-9 h-9 flex items-center justify-center">
            {children}
        </div>
    );

    const navItems: NavItem[] = [
        { key: 'size', text: 'Wielkość branży', Icon: PieChart },
        { key: 'growth', text: 'Rozwój branży', Icon: TrendingUp },
        { key: 'profit', text: 'Rentowność branży', Icon: AttachMoney },
        { key: 'debt', text: 'Zadłużenie branży', Icon: AccountBalance },
        { key: 'claims', text: 'Szkodowość branży', Icon: ReportProblem },
    ];

    const renderNavItem = (item: NavItem) => (
        <div key={item.key} className="mb-2">
            <Button
                variant="ghost"
                color="neutral"
                onClick={() => {
                    saveToStorage('selected_nav', item.key);
                    onSelectAction?.(item);
                }}
                className="w-full justify-start px-3 py-2"
                aria-label={item.text}
            >
                <div className="mr-3">
                    <IconWrapper>
                        <item.Icon sx={{ color: 'white' }} />
                    </IconWrapper>
                </div>
                <span className="text-left">{item.text}</span>
            </Button>
        </div>
    );

    return (
        <div className="w-[350px] h-screen bg-gray-900 text-white flex flex-col">
            {/* Logo / App Title */}
            <div className="flex items-center justify-center py-4">
                <h1 className="text-xl font-semibold">Wybierz Opcje</h1>
            </div>

            {/* Navigation */}
            <nav className="px-4 py-3">
                {navItems.map(renderNavItem)}
            </nav>
        </div>
    );
}
