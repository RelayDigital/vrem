'use client';

import { useRequireRole } from '@/hooks/useRequireRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { H1, P } from '@/components/ui/typography';

export default function SettingsPage() {
    const { user, isLoading } = useRequireRole(['ADMIN', 'PROJECT_MANAGER', 'TECHNICIAN', 'EDITOR', 'AGENT']);

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    if (!user) {
        return null;
    }

    return (
        <div className="p-6 space-y-6">
            <H1 className="text-2xl font-bold">Settings</H1>
            <Card>
                <CardHeader>
                    <CardTitle>User Profile</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <P><strong>Name:</strong> {user.name}</P>
                        <P><strong>Email:</strong> {user.email}</P>
                        <P><strong>Role:</strong> {user.role}</P>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Team Settings</CardTitle>
                </CardHeader>
                <CardContent>
                    <P className="text-muted-foreground">Team settings will appear here.</P>
                </CardContent>
            </Card>
        </div>
    );
}
