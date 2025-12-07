"use client";

import React, {useState} from "react";
import Sidebar from "./sidebar";
import Size from "@/app/components/size";

export default function SidebarShell({children}: { children: React.ReactNode }) {
    const [selectedKey, setSelectedKey] = useState<string | null>("photos");

    const renderContent = () => {
        switch (selectedKey) {
            case "Size":
                return <Size/>;
            default:
                return <div>Empty</div>;
        }
    };

    return (
        <div className="min-h-screen flex">
            <div className="w-64">
                <Sidebar selectedKey={selectedKey} onSelectionChange={(k) => setSelectedKey(k)}/>
            </div>
            <main className="flex-1 flex flex-col p-6">
                <div className="max-w-7xl w-full mx-auto flex-1 flex flex-col">
                    <div>{children}</div>
                    {/* render the tab-controlled content above the page children; flex-1 so it grows */}
                    <div className="mb-6">{renderContent()}</div>
                </div>
            </main>
        </div>
    );
}


