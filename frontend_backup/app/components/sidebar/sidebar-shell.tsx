"use client";

import React, { useState } from "react";
import Sidebar from "./sidebar";
import Size from "@/app/components/size";

export default function SidebarShell({ children }: { children: React.ReactNode }) {
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
    <div className="flex">
      <Sidebar selectedKey={selectedKey} onSelectionChange={(k) => setSelectedKey(k)} />
      <main className="container mx-auto max-w-7xl p-6 flex-grow ml-64">
        <div>{children}</div>
        {/* render the tab-controlled content above the page children */}
        <div className="mb-6">{renderContent()}</div>
      </main>
    </div>
  );
}

