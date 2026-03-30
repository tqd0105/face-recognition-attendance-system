"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SidebarShell } from "@/components/layout/SidebarShell";
import { LoadingState } from "@/components/ui/States";
import { useAuth } from "@/hooks/useAuth";

export function AppFrame({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, isHydrated } = useAuth();
    const isPublic = pathname === "/login";

    useEffect(() => {
        if (!isHydrated || isPublic) {
            return;
        }

        if (!user.token) {
            router.replace("/login");
        }
    }, [isHydrated, isPublic, user.token, router]);

    if (!isHydrated) {
        return (
            <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
                <LoadingState label="Preparing workspace..." />
            </main>
        );
    }

    if (isPublic) {
        return <>{children}</>;
    }

    if (!user.token) {
        return (
            <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
                <LoadingState label="Redirecting to login..." />
            </main>
        );
    }

    return <SidebarShell>{children}</SidebarShell>;
}
