"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Camera,
    CalendarClock,
    ClipboardList,
    BookOpen,
    LayoutDashboard,
    LogOut,
    School,
    Users,
    UserSquare2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

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
    const roleLabel = `${user.role.charAt(0).toUpperCase()}${user.role.slice(1)}`;
    const teacherMeta = parseTeacherToken(user.token);

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
                        <p className="text-center text-base font-semibold text-slate-900">{user.displayName}</p>
                        <div className="mt-2 grid gap-1.5 text-xs text-slate-600">
                            <p className="rounded-lg bg-slate-50 px-2 py-1">
                                <span className="font-medium text-slate-700">Role:</span> {roleLabel}
                            </p>
                            {teacherMeta.email && (
                                <p className="truncate rounded-lg bg-slate-50 px-2 py-1" title={teacherMeta.email}>
                                    <span className="font-medium text-slate-700">Email:</span> {teacherMeta.email}
                                </p>
                            )}
                            {teacherMeta.id !== undefined && teacherMeta.id !== null && (
                                <p className="rounded-lg bg-slate-50 px-2 py-1">
                                    <span className="font-medium text-slate-700">Teacher ID:</span> {teacherMeta.id}
                                </p>
                            )}
                        </div>
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
