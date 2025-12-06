"use client";
import * as React from 'react';
import Container from '@mui/material/Container';
import Header from '@/app/components/Header/header';
import Main from '@/app/components/App/main';
import Sidebar from '@/app/components/Menu/sidebar';

export default function Home() {
  const [selected, setSelected] = React.useState<string | null>(null);

  return (
    <>
      <Header />
      <div className="flex flex-row">
        <Sidebar onSelect={(item) => setSelected(item.text)} />
        <Main selected={selected} />
      </div>
    </>
  );
}