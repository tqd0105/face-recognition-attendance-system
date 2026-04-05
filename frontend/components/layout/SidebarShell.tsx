"use client";

import { useEffect, useMemo, useState } from "react";
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
import { studentAuthService } from "@/services/student-auth.service";
import { http } from "@/services/http";

type NavRole = "teacher" | "admin" | "student";
type NavItem = {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    roles: readonly NavRole[];
};

const navItems: NavItem[] = [
    { href: "/", label: "Overview", icon: LayoutDashboard, roles: ["teacher", "admin", "student"] as const },
    { href: "/enrollment", label: "Face Enrollment", icon: Camera, roles: ["teacher", "admin"] as const },
    { href: "/attendance", label: "Realtime Attendance", icon: ClipboardList, roles: ["teacher", "admin"] as const },
    { href: "/students", label: "Student Management", icon: Users, roles: ["teacher", "admin"] as const },
    { href: "/classes", label: "Home Class Management", icon: School, roles: ["teacher", "admin"] as const },
    { href: "/courses", label: "Course Class Management", icon: BookOpen, roles: ["teacher", "admin"] as const },
    { href: "/sessions", label: "Session Management", icon: CalendarClock, roles: ["teacher", "admin"] as const },
    { href: "/history", label: "My Attendance", icon: UserSquare2, roles: ["student"] as const },
    { href: "/history", label: "Attendance History", icon: UserSquare2, roles: ["teacher", "admin"] as const },
    { href: "/admin", label: "Admin Dashboard", icon: ShieldCheck, roles: ["admin"] as const },
    // { href: "/camera", label: "Camera Page", icon: Camera },
];

type TeacherTokenPayload = {
    id?: number | string;
    email?: string;
    role?: string;
    teacher_code?: string;
    student_code?: string;
};

type ProfileResponse = {
    email?: string;
    teacher_code?: string;
    student_code?: string;
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
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [passwordNotice, setPasswordNotice] = useState<string | null>(null);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [profile, setProfile] = useState<ProfileResponse | null>(null);
    const roleLabel = `${user.role.charAt(0).toUpperCase()}${user.role.slice(1)}`;
    const visibleNavItems = useMemo(
        () => navItems.filter((item) => item.roles.includes(user.role as NavRole)),
        [user.role]
    );
    const teacherMeta = parseTeacherToken(user.token);
    const effectiveEmail = profile?.email ?? teacherMeta.email ?? "N/A";
    const effectiveTeacherCode = profile?.teacher_code ?? teacherMeta.teacher_code ?? "N/A";
    const effectiveStudentCode = profile?.student_code ?? teacherMeta.student_code ?? "N/A";
    const nameInitials = useMemo(() => {
        const parts = user.displayName
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 3);
        return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "T";
    }, [user.displayName]);

    useEffect(() => {
        if (!isProfileOpen) {
            return;
        }

        let mounted = true;

        (async () => {
            try {
                const { data } = await http.get("/api/auth/me");
                if (mounted) {
                    setProfile(data ?? null);
                }
            } catch {
                if (mounted) {
                    setProfile(null);
                }
            }
        })();

        return () => {
            mounted = false;
        };
    }, [isProfileOpen]);

    return (
        <div className="min-h-screen bg-slate-100">
            <div className="mx-auto flex w-full max-w-[1440px] gap-4 px-4 py-8 sm:px-6 lg:px-8">
                <aside className="hidden w-[270px] h-full shrink-0 rounded-3xl border border-slate-200 bg-white px-4 py-6 shadow-sm lg:block">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 text-center" >Attendance System use</p>
                    <h3 className="mt-0 text-xl font-bold text-slate-900 uppercase text-center">Face Recognition</h3>

                    <nav className="mt-5 grid gap-2">
                        {visibleNavItems.map((item) => {
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
                                <p className="truncate text-xs text-slate-600">{effectiveEmail !== "N/A" ? effectiveEmail : roleLabel}</p>
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
                            {visibleNavItems.map((item) => {
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
                            <p className="mt-0.5 truncate text-xs text-slate-600">{effectiveEmail !== "N/A" ? effectiveEmail : roleLabel}</p>
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

            <Modal open={isProfileOpen} title={`${roleLabel} Profile`} onClose={() => setIsProfileOpen(false)}>
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

                        {user.role !== "student" ? (
                            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                <span className="inline-flex items-center gap-2 font-medium text-slate-600">
                                    <UserRound className="h-4 w-4 text-indigo-600" /> Teacher Code
                                </span>
                                <span className="font-semibold text-slate-900">{effectiveTeacherCode}</span>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                <span className="inline-flex items-center gap-2 font-medium text-slate-600">
                                    <UserRound className="h-4 w-4 text-indigo-600" /> Student Code
                                </span>
                                <span className="font-semibold text-slate-900">{effectiveStudentCode}</span>
                            </div>
                        )}

                        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                            <span className="inline-flex items-center gap-2 font-medium text-slate-600">
                                <Mail className="h-4 w-4 text-sky-600" /> Email
                            </span>
                            <p className="mt-1 truncate font-semibold text-slate-900" title={effectiveEmail !== "N/A" ? effectiveEmail : ""}>{effectiveEmail}</p>
                        </div>

                        {user.role === "student" && (
                            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-700">Student Security</p>
                                <div className="mt-2 grid gap-2">
                                    <input
                                        type="password"
                                        value={currentPassword}
                                        onChange={(event) => setCurrentPassword(event.target.value)}
                                        placeholder="Current password"
                                        className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none"
                                    />
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(event) => setNewPassword(event.target.value)}
                                        placeholder="New password (>= 6 chars)"
                                        className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none"
                                    />
                                    <button
                                        type="button"
                                        disabled={isChangingPassword}
                                        className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                                        onClick={async () => {
                                            try {
                                                setIsChangingPassword(true);
                                                setPasswordNotice(null);
                                                await studentAuthService.changePassword(currentPassword, newPassword);
                                                setCurrentPassword("");
                                                setNewPassword("");
                                                setPasswordNotice("Password changed successfully.");
                                            } catch (error) {
                                                const message = error instanceof Error ? error.message : "Cannot change password";
                                                setPasswordNotice(message);
                                            } finally {
                                                setIsChangingPassword(false);
                                            }
                                        }}
                                    >
                                        {isChangingPassword ? "Updating..." : "Change Password"}
                                    </button>
                                    {passwordNotice && <p className="text-xs font-semibold text-indigo-700">{passwordNotice}</p>}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
}
