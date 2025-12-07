"use client";

import React from "react";
import {Tabs, Tab} from "@heroui/tabs";

export type SidebarProps = {
    selectedKey?: string | null;
    onSelectionChange?: (key: string | null) => void;
};

export default function Sidebar({ selectedKey, onSelectionChange }: SidebarProps) {
    return (
        <div className="fixed inset-y-0 left-0 w-64 bg-gray-800 text-white p-4">
            <p>PKO LOGO</p>
            <Tabs aria-label="Menu" fullWidth isVertical selectedKey={selectedKey ?? undefined} onSelectionChange={onSelectionChange}>
                <Tab key="Size" title="Wielkość Branży"/>
                <Tab key="Blank1" title="Blank"/>
                <Tab key="Blank2" title="Blank"/>
                <Tab key="Blank3" title="Blank"/>
            </Tabs>
        </div>
    );
}
