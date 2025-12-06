"use client";
import React from 'react';
import { Box, List, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { PieChart, TrendingUp, AttachMoney, AccountBalance, ReportProblem } from '@mui/icons-material';
import { blue } from '@mui/material/colors';
import { saveToStorage } from '@/app/lib/client/storage'; // <- dodane

type NavItem = { key: string; text: string; Icon: React.ElementType };

export default function Sidebar({ onSelect }: { onSelect?: (item: NavItem) => void }) {
    // Pomocniczy komponent dla ikonek
    const IconWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <Box
            sx={{
                bgcolor: blue[500],
                borderRadius: '12px',
                width: 38,
                height: 38,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            {children}
        </Box>
    );

    const navItems: NavItem[] = [
        { key: 'size', text: 'Wielkość branży', Icon: PieChart },
        { key: 'growth', text: 'Rozwój branży', Icon: TrendingUp },
        { key: 'profit', text: 'Rentowność branży', Icon: AttachMoney },
        { key: 'debt', text: 'Zadłużenie branży', Icon: AccountBalance },
        { key: 'claims', text: 'Szkodowość branży', Icon: ReportProblem },
    ];

    const renderNavItem = (item: NavItem) => (
        <ListItemButton
            key={item.key}
            onClick={() => {
                saveToStorage('selected_nav', item.key); // zapis do localStorage jako identyfikator (np. "size")
                onSelect?.(item);
            }}
            sx={{ '&:hover': { bgcolor: 'grey.700', borderRadius: 1 } }}
        >
            <ListItemIcon>
                <IconWrapper>
                    <item.Icon sx={{ color: 'white' }} />
                </IconWrapper>
            </ListItemIcon>
            <ListItemText primary={item.text} />
        </ListItemButton>
    );

    return (
        <Box
            sx={{
                width: 350,
                height: '100vh',
                bgcolor: 'grey.900',
                color: 'white',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* Logo / App Title */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 2 }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Wybierz Opcje</h1>
            </Box>

            {/* Navigation */}
            <List sx={{ px: 2, py: 3 }}>
                {navItems.map(renderNavItem)}
            </List>
        </Box>
    );
}
