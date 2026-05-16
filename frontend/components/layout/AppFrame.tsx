"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SidebarShell } from "@/components/layout/SidebarShell";
import { LoadingState } from "@/components/ui/States";
import { useAuth } from "@/hooks/useAuth";

export function AppFrame({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, isHydrated } = useAuth();
    const isPublic = pathname === "/login";
    const isRedirecting = useRef(false);

    useEffect(() => {
        if (!isHydrated || isPublic) {
            isRedirecting.current = false;
            return;
        }

        if (isRedirecting.current) {
            return;
        }

        if (!user.token) {
            isRedirecting.current = true;
            router.replace("/login");
            return;
        }

        const studentOnlyAllowed = ["/", "/history"];
        if (user.role === "student" && !studentOnlyAllowed.includes(pathname)) {
            isRedirecting.current = true;
            router.replace("/history");
            return;
        }

        if (user.role !== "admin" && pathname === "/admin") {
            isRedirecting.current = true;
            router.replace("/");
        }
    }, [isHydrated, isPublic, user.token, user.role, pathname, router]);

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
