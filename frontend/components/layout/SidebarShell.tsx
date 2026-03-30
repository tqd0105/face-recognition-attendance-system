"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Camera,
    CalendarClock,
    ClipboardList,
    LayoutDashboard,
    LogOut,
    School,
    Users,
    UserSquare2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/enrollment", label: "Face Enrollment", icon: Camera },
    { href: "/attendance", label: "Realtime Attendance", icon: ClipboardList },
    { href: "/students", label: "Student Management", icon: Users },
    { href: "/classes", label: "Class Management", icon: School },
    { href: "/sessions", label: "Session Management", icon: CalendarClock },
    { href: "/history", label: "Attendance History", icon: UserSquare2 },
    { href: "/camera", label: "Camera Page", icon: Camera },
];

export function SidebarShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const roleLabel = `${user.role.charAt(0).toUpperCase()}${user.role.slice(1)}`;

    return (
        <div className="min-h-screen bg-slate-100">
            <div className="mx-auto flex w-full max-w-[1440px] gap-4 px-4 py-4 sm:px-6 lg:px-8">
                <aside className="hidden w-[270px] shrink-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:block">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 text-center" >Attendance System use</p>
                    <h3 className="mt-0 text-xl font-bold text-slate-900 uppercase text-center">Face Recognition</h3>

                    <nav className="mt-5 grid gap-2">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const active = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`interactive-btn inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active
                                        ? "bg-slate-900 text-white shadow"
                                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                        }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="mt-4 w-full rounded-2xl border border-gray-400 bg-white/10 p-4 text-sm backdrop-blur shadow-xl ">
                        <p className="font-semibold text-slate-900 text-center">{roleLabel}: {user.displayName}</p>
                        <button
                            type="button"
                            className="interactive-btn mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-red-500 px-3 py-2 text-sm font-semibold text-white hover:bg-red-600"
                            onClick={logout}
                        >
                            <LogOut className="h-4 w-4" /> Logout
                        </button>
                    </div>
                </aside>

                <div className="min-w-0 flex-1">{children}</div>
            </div>
        </div>
    );
}
