'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@/types';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (credentials: { email: string; password: string }) => Promise<void>;
    register: (data: any) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const initAuth = async () => {
            const storedToken = localStorage.getItem('token');
            if (storedToken) {
                setToken(storedToken);
                try {
                    const user = await api.auth.me();
                    setUser(user);
                    if (user.organizationId) {
                        localStorage.setItem('organizationId', user.organizationId);
                    }
                } catch (error) {
                    console.error('Failed to fetch user:', error);
                    localStorage.removeItem('token');
                    setToken(null);
                }
            }
            setIsLoading(false);
        };

        initAuth();
    }, []);

    const login = async (credentials: { email: string; password: string }) => {
        setIsLoading(true);
        try {
            const response = await api.auth.login(credentials);
            localStorage.setItem('token', response.token);
            if (response.user.organizationId) {
                localStorage.setItem('organizationId', response.user.organizationId);
            }
            setToken(response.token);
            setUser(response.user);

            // Redirect based on role
            if (response.user.role === 'AGENT' as any) {
                router.push('/agent');
            } else if (response.user.role === 'PHOTOGRAPHER' as any || response.user.role === 'TECHNICIAN' as any) {
                router.push('/photographer');
            } else if (response.user.role === 'ADMIN' as any || response.user.role === 'PROJECT_MANAGER' as any || response.user.role === 'EDITOR' as any) {
                router.push('/dispatcher');
            } else {
                router.push('/');
            }
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (data: any) => {
        setIsLoading(true);
        try {
            const response = await api.auth.register(data);
            localStorage.setItem('token', response.token);
            if (response.user.organizationId) {
                localStorage.setItem('organizationId', response.user.organizationId);
            }
            setToken(response.token);
            setUser(response.user);
            router.push('/');
        } catch (error) {
            console.error('Registration failed:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        // Clear authentication data
        localStorage.removeItem('token');
        localStorage.removeItem('organizationId');
        setToken(null);
        setUser(null);
        // Use window.location for a full page reload to ensure complete logout
        window.location.href = '/';
    };

    return (
        <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
