"use client";
import * as React from 'react';
import Container from '@mui/material/Container';
import Header from '@/app/components/Header/header';
import Main from '@/app/components/App/main';
import Sidebar from '@/app/components/Menu/sidebar';
import { loadFromStorage } from '@/app/lib/client/storage'; // <- dodane

export default function Home() {
  const [selected, setSelected] = React.useState<string | null>(null);

  React.useEffect(() => {
    // mapa klucz -> tekst (powinna być zgodna z navItems w Sidebar)
    const navMap: Record<string, string> = {
      size: 'Wielkość branży',
      growth: 'Rozwój branży',
      profit: 'Rentowność branży',
      debt: 'Zadłużenie branży',
      claims: 'Szkodowość branży',
    };

    const storedKey = loadFromStorage<string>('selected_nav');
    if (storedKey && navMap[storedKey]) {
      setSelected(navMap[storedKey]);
    } else {
      // domyślnie pierwszy element
      setSelected(navMap['size']);
    }
  }, []);

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