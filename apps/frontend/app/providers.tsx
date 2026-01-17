'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/context/auth-context';
import { BackendHealthProvider } from '@/context/BackendHealthContext';
import { NotificationsProvider } from '@/context/notifications-context';
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
                <NotificationsProvider>
                    <BackendHealthProvider>
                    {children}
                    <Toaster />
                    </BackendHealthProvider>
                </NotificationsProvider>
            </AuthProvider>
        </ThemeProvider>
    );
}
