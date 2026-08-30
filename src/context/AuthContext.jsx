import React, { createContext, useState, useEffect, useRef } from 'react';
import { tourService } from '../services/api.service';
import configService from '../services/config.service';

export const AuthContext = createContext(null);

const REFRESH_MIN_INTERVAL = 5 * 60 * 1000; // 5 minutes

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const lastRefreshRef = useRef(0);

    const refreshUser = () => {
        const userStr = localStorage.getItem('tour_app_user');
        setUser(userStr ? JSON.parse(userStr) : null);
        setLoading(false);
    };

    const refreshProfile = async () => {
        if (!localStorage.getItem('tour_app_token')) return;

        const now = Date.now();
        if (now - lastRefreshRef.current < REFRESH_MIN_INTERVAL) return;
        lastRefreshRef.current = now;

        try {
            const latestUser = await tourService.getMe();
            const userToStore = {
                id: latestUser._id,
                name: latestUser.name,
                email: latestUser.email,
                role: latestUser.role,
                googleTokens: latestUser.googleTokens
            };
            localStorage.setItem('tour_app_user', JSON.stringify(userToStore));
            setUser(userToStore);
        } catch (err) {
            console.error('Failed to refresh profile:', err);
        }
    };

    useEffect(() => {
        refreshUser();
        refreshProfile();

        const onSync = () => refreshProfile();
        window.addEventListener('focus', onSync);
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') onSync();
        };
        window.addEventListener('visibilitychange', handleVisibilityChange);

        const handleForcedLogout = () => {
            setUser(null);
            setLoading(false);
        };
        window.addEventListener('auth:logout', handleForcedLogout);

        return () => {
            window.removeEventListener('focus', onSync);
            window.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('auth:logout', handleForcedLogout);
        };
    }, []);

    const login = async (email, password) => {
        const data = await tourService.login(email, password);
        refreshUser();
        return data;
    };

    const logout = () => {
        tourService.logout();
        configService.clearCache();
        setUser(null);
        setLoading(false);
    };

    const value = {
        user,
        loading,
        login,
        logout,
        refreshUser,
        refreshProfile
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
