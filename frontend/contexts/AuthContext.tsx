"use client";

import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { clearAccessToken, getAuthSession, setAuthSession } from "@/lib/backend";
import { authService } from "@/services/auth.service";
import type { AuthUser, LoginPayload } from "@/types/models";

type AuthContextValue = {
    user: AuthUser;
    isHydrated: boolean;
    isLoggingIn: boolean;
    login: (payload: LoginPayload) => Promise<void>;
    logout: () => void;
};

const guestUser: AuthUser = {
    token: "",
    role: "guest",
    displayName: "Unauthenticated",
};

export const AuthContext = createContext<AuthContextValue>({
    user: guestUser,
    isHydrated: false,
    isLoggingIn: false,
    login: async () => undefined,
    logout: () => undefined,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser>(guestUser);
    const [isHydrated, setIsHydrated] = useState(false);
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const syncFromStorage = useCallback(() => {
        setUser(getAuthSession());
    }, []);

    useEffect(() => {
        syncFromStorage();
        setIsHydrated(true);
        window.addEventListener("focus", syncFromStorage);
        window.addEventListener("storage", syncFromStorage);
        return () => {
            window.removeEventListener("focus", syncFromStorage);
            window.removeEventListener("storage", syncFromStorage);
        };
    }, [syncFromStorage]);

    const login = useCallback(async (payload: LoginPayload) => {
        setIsLoggingIn(true);
        try {
            const data = await authService.login(payload);
            if (!data.token) {
                throw new Error(data.message ?? "Login failed");
            }
            const emailPrefix = payload.email.split("@")[0]?.trim();
            const role = data.role ?? payload.role;
            const displayName =
                data.student_name?.trim() ||
                data.teacher_name?.trim() ||
                emailPrefix ||
                (role === "admin" ? "Admin" : role === "teacher" ? "Teacher" : "Student");
            setAuthSession(data.token, role, displayName);
            setUser(getAuthSession());
        } finally {
            setIsLoggingIn(false);
        }
    }, []);

    const logout = useCallback(() => {
        clearAccessToken();
        setUser(getAuthSession());
    }, []);

    const value = useMemo(
        () => ({ user, isHydrated, isLoggingIn, login, logout }),
        [user, isHydrated, isLoggingIn, login, logout],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
