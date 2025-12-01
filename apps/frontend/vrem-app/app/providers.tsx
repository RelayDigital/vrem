'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/context/auth-context';
import { BackendHealthProvider } from '@/context/BackendHealthContext';
import { Toaster } from '@/components/ui/sonner';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            <AuthProvider>
                <BackendHealthProvider>
                {children}
                <Toaster />
                </BackendHealthProvider>
            </AuthProvider>
        </ThemeProvider>
    );
}
