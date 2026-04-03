"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Camera,
    CalendarClock,
    ClipboardList,
    BookOpen,
    LayoutDashboard,
    LogOut,
    Mail,
    Menu,
    ShieldCheck,
    School,
    Users,
    UserRound,
    UserSquare2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Modal } from "@/components/ui/Modal";

const navItems = [
    { href: "/", label: "Overview", icon: LayoutDashboard },
    { href: "/enrollment", label: "Face Enrollment", icon: Camera },
    { href: "/attendance", label: "Realtime Attendance", icon: ClipboardList },
    { href: "/students", label: "Student Management", icon: Users },
    { href: "/classes", label: "Home Class Management", icon: School },
    { href: "/courses", label: "Course Class Management", icon: BookOpen },
    { href: "/sessions", label: "Session Management", icon: CalendarClock },
    { href: "/history", label: "Attendance History", icon: UserSquare2 },
    // { href: "/camera", label: "Camera Page", icon: Camera },
];

type TeacherTokenPayload = {
    id?: number | string;
    email?: string;
    role?: string;
};

function parseTeacherToken(token?: string): TeacherTokenPayload {
    if (!token) {
        return {};
    }

    try {
        const payloadPart = token.split(".")[1];
        if (!payloadPart) {
            return {};
        }

        const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
        const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
        const decoded = atob(padded);
        const parsed = JSON.parse(decoded) as TeacherTokenPayload;
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
}

export function SidebarShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
    const roleLabel = `${user.role.charAt(0).toUpperCase()}${user.role.slice(1)}`;
    const teacherMeta = parseTeacherToken(user.token);
    const nameInitials = useMemo(() => {
        const parts = user.displayName
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 3);
        return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "T";
    }, [user.displayName]);

    return (
        <div className="min-h-screen bg-slate-100">
            <div className="mx-auto flex w-full max-w-[1440px] gap-4 px-4 py-8 sm:px-6 lg:px-8">
                <aside className="hidden w-[270px] h-full shrink-0 rounded-3xl border border-slate-200 bg-white px-4 py-6 shadow-sm lg:block">
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

                    <div className="mt-4 w-full rounded-2xl border border-slate-300 bg-white p-4 text-sm shadow-sm">
                        <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-sky-50 via-indigo-50 to-cyan-50 p-3">
                            <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">{nameInitials}</div>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900">{user.displayName}</p>
                                <p className="truncate text-xs text-slate-600">{teacherMeta.email ?? roleLabel}</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            className="interactive-btn mt-3 inline-flex w-full items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
                            onClick={() => setIsProfileOpen(true)}
                        >
                            View Profile
                        </button>
                        <button
                            type="button"
                            className="interactive-btn mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-red-500 px-3 py-2 text-sm font-semibold text-white hover:bg-red-600"
                            onClick={logout}
                        >
                            <LogOut className="h-4 w-4" /> Logout
                        </button>
                    </div>
                </aside>

                <div className="min-w-0 flex-1">
                    <div className="mb-3 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm lg:hidden">
                        <button
                            type="button"
                            className="interactive-btn inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                            onClick={() => setIsMobileNavOpen(true)}
                        >
                            <Menu className="h-4 w-4" /> Menu
                        </button>
                        <p className="truncate px-2 text-sm font-semibold text-slate-800">{user.displayName}</p>
                        <button
                            type="button"
                            className="interactive-btn inline-flex items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700"
                            onClick={() => setIsProfileOpen(true)}
                        >
                            Profile
                        </button>
                    </div>

                    {children}
                </div>
            </div>

            {isMobileNavOpen && (
                <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
                    <button
                        type="button"
                        className="absolute inset-0 bg-slate-900/55"
                        aria-label="Close menu"
                        onClick={() => setIsMobileNavOpen(false)}
                    />
                    <aside className="absolute inset-y-0 left-0 w-[86%] max-w-[320px] border-r border-slate-200 bg-white px-4 py-5 shadow-2xl">
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Attendance System</p>
                                <h3 className="text-lg font-bold text-slate-900">Face Recognition</h3>
                            </div>
                            <button
                                type="button"
                                className="interactive-btn rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700"
                                onClick={() => setIsMobileNavOpen(false)}
                            >
                                Close
                            </button>
                        </div>

                        <nav className="mt-4 grid gap-2">
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
                                        onClick={() => setIsMobileNavOpen(false)}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>

                        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <p className="truncate text-sm font-semibold text-slate-900">{user.displayName}</p>
                            <p className="mt-0.5 truncate text-xs text-slate-600">{teacherMeta.email ?? roleLabel}</p>
                            <button
                                type="button"
                                className="interactive-btn mt-3 inline-flex w-full items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700"
                                onClick={() => {
                                    setIsMobileNavOpen(false);
                                    setIsProfileOpen(true);
                                }}
                            >
                                View Profile
                            </button>
                            <button
                                type="button"
                                className="interactive-btn mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-rose-500 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-600"
                                onClick={logout}
                            >
                                <LogOut className="h-4 w-4" /> Logout
                            </button>
                        </div>
                    </aside>
                </div>
            )}

            <Modal open={isProfileOpen} title="Teacher Profile" onClose={() => setIsProfileOpen(false)}>
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                    <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-cyan-800 p-5 text-white">
                        <div className="flex items-center gap-3">
                            <div className="grid h-12 w-12 place-items-center rounded-full bg-white/15 font-bold">{nameInitials}</div>
                            <div className="min-w-0">
                                <p className="truncate text-lg font-bold">{user.displayName}</p>
                                <p className="truncate text-sm text-cyan-100">Realtime Attendance Instructor</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-2 bg-white p-4 text-sm text-slate-700">
                        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                            <span className="inline-flex items-center gap-2 font-medium text-slate-600">
                                <ShieldCheck className="h-4 w-4 text-emerald-600" /> Role
                            </span>
                            <span className="font-semibold text-slate-900">{roleLabel}</span>
                        </div>

                        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                            <span className="inline-flex items-center gap-2 font-medium text-slate-600">
                                <UserRound className="h-4 w-4 text-indigo-600" /> Teacher ID
                            </span>
                            <span className="font-semibold text-slate-900">{teacherMeta.id ?? "N/A"}</span>
                        </div>

                        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                            <span className="inline-flex items-center gap-2 font-medium text-slate-600">
                                <Mail className="h-4 w-4 text-sky-600" /> Email
                            </span>
                            <p className="mt-1 truncate font-semibold text-slate-900" title={teacherMeta.email ?? ""}>{teacherMeta.email ?? "N/A"}</p>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
