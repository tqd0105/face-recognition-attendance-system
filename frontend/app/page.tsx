"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    CalendarClock,
    ClipboardList,
    Database,
    Flame,
    School,
    Users,
    UserCheck,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { attendanceService } from "@/services/attendance.service";
import { courseService } from "@/services/course.service";
import { sessionService } from "@/services/session.service";
import { studentService } from "@/services/student.service";
import { FaceIdIcons, WebcamIcons, WebcamLiveIcons, StudentIcons, ClassIcons, SessionIcons, HistoryIcons, HomeClassIcons } from "@/components/icons";
import { ErrorState, LoadingState } from "@/components/ui/States";
import type { StudentDashboardResponse, StudentDashboardSessionItem } from "@/types/models";

type DashboardCard = {
    title: string;
    description: string;
    href: string;
    cta: string;
    badge: string;
    iconType: "image" | "symbol";
    icon: string;
};

const cards: DashboardCard[] = [
    {
        title: "Face Enrollment",
        description: "Register student faces for automated attendance recognition.",
        href: "/enrollment",
        cta: "Open Enrollment",
        badge: "Core",
        iconType: "image",
        icon: WebcamIcons,
    },
    {
        title: "Realtime Attendance",
        description: "Start live sessions and track attendance in real time using face recognition.",
        href: "/attendance",
        cta: "Open Realtime",
        badge: "Live",
        iconType: "image",
        icon: WebcamLiveIcons,
    },
    {
        title: "Student Management",
        description: "View, add, and manage student information and class enrollment.",
        href: "/students",
        cta: "Manage Students",
        badge: "Data",
        iconType: "image",
        icon: StudentIcons,
    },
    {
        title: "Home Class Management",
        description: "Manage administrative class structures, majors, and department mappings.",
        href: "/classes",
        cta: "Manage Home Classes",
        badge: "Academic",
        iconType: "image",
        icon: HomeClassIcons,
    },
    {
        title: "Course Class Management",
        description: "Organize course classes for teaching schedules and attendance sessions.",
        href: "/courses",
        cta: "Manage Course",
        badge: "Teaching",
        iconType: "image",
        icon: ClassIcons,
    },
    {
        title: "Session Management",
        description: "Generate attendance sessions from course classes and synchronized schedules.",
        href: "/sessions",
        cta: "Manage Sessions",
        badge: "Schedule",
        iconType: "image",
        icon: SessionIcons,
    },
    {
        title: "Attendance History",
        description: "Access attendance history, session timelines, and attendance status.",
        href: "/history",
        cta: "View History",
        badge: "Archive",
        iconType: "image",
        icon: HistoryIcons,
    },
];

function BadgeIcon({ name }: { name: string }) {
    if (name === "users") {
        return <Users className="h-7 w-7 text-cyan-700" />;
    }
    if (name === "school") {
        return <School className="h-7 w-7 text-emerald-700" />;
    }
    if (name === "calendar") {
        return <CalendarClock className="h-7 w-7 text-amber-700" />;
    }
    if (name === "history") {
        return <ClipboardList className="h-7 w-7 text-rose-700" />;
    }
    return <Database className="h-7 w-7 text-slate-700" />;
}

function formatSessionDate(value?: string): string {
    if (!value) {
        return "-";
    }

    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
        return new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Ho_Chi_Minh",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).format(parsed);
    }

    return String(value).slice(0, 10);
}

function formatSessionTime(value?: string): string {
    if (!value) {
        return "--:--";
    }

    const raw = String(value).trim();
    const match = raw.match(/^(\d{2}:\d{2})/);
    if (match) {
        return match[1];
    }

    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
        return new Intl.DateTimeFormat("en-GB", {
            timeZone: "Asia/Ho_Chi_Minh",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        }).format(parsed);
    }

    return raw.slice(0, 5);
}

function formatStatusLabel(value?: string): string {
    const raw = String(value || "-").toLowerCase();
    if (raw === "-") {
        return "-";
    }
    return `${raw.charAt(0).toUpperCase()}${raw.slice(1)}`;
}

function formatStudentSessionTitle(item: StudentDashboardSessionItem): string {
    const courseLabel = item.course_code ? `${item.course_code} - ${item.course_name ?? ""}` : item.course_name ?? "Course";
    const sessionLabel = String(item.session_name || "").trim() || `Session #${item.session_id}`;
    return `${courseLabel} | ${sessionLabel}`;
}

export default function DashboardPage() {
    const { user } = useAuth();
    const visibleCards = useMemo(() => {
        if (user.role === "student") {
            return cards.filter((card) => card.href === "/history");
        }
        if (user.role === "admin") {
            return cards;
        }
        return cards;
    }, [user.role]);

    const [kpi, setKpi] = useState({ totalStudents: 0, activeSessions: 0, checkedInToday: 0, lateToday: 0 });
    const [isKpiLoading, setIsKpiLoading] = useState(true);
    const [kpiError, setKpiError] = useState<string | null>(null);
    const [studentDashboard, setStudentDashboard] = useState<StudentDashboardResponse | null>(null);
    const [isStudentDashboardLoading, setIsStudentDashboardLoading] = useState(false);
    const [studentDashboardError, setStudentDashboardError] = useState<string | null>(null);

    useEffect(() => {
        async function loadTeacherKpi() {
            if (user.role !== "teacher" && user.role !== "admin") {
                setIsKpiLoading(false);
                return;
            }

            try {
                setIsKpiLoading(true);
                setKpiError(null);

                const [students, courses] = await Promise.all([
                    studentService.getAll(),
                    courseService.getAll(),
                ]);

                const courseIds = courses.map((item) => Number(item.id)).filter((id) => Number.isFinite(id) && id > 0);
                const sessions = courseIds.length > 0 ? await sessionService.getAll(courseIds) : [];

                const todayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
                const todaySessions = sessions.filter((item) => (item.session_date ?? "").slice(0, 10) === todayKey);
                const targetSessions = todaySessions.length > 0 ? todaySessions : sessions.filter((item) => item.status === "active");

                const attendanceRows = await Promise.all(
                    targetSessions.slice(0, 12).map((item) => attendanceService.getBySession(Number(item.id)).catch(() => []))
                );

                const merged = attendanceRows.flat();
                const checkedUnique = new Set(
                    merged
                        .map((item) => `${item.session_id}:${item.student_id}`)
                        .filter((value) => value && !value.endsWith(":0"))
                );

                setKpi({
                    totalStudents: students.filter((item) => (item.status ?? "active") === "active").length,
                    activeSessions: sessions.filter((item) => item.status === "active").length,
                    checkedInToday: checkedUnique.size,
                    lateToday: merged.filter((item) => item.status === "late").length,
                });
            } catch (error) {
                const message = error instanceof Error ? error.message : "Unable to load dashboard KPI";
                setKpiError(message);
            } finally {
                setIsKpiLoading(false);
            }
        }

        void loadTeacherKpi();
    }, [user.role]);

    useEffect(() => {
        async function loadStudentDashboard() {
            if (user.role !== "student") {
                setIsStudentDashboardLoading(false);
                setStudentDashboard(null);
                return;
            }

            try {
                setIsStudentDashboardLoading(true);
                setStudentDashboardError(null);
                const data = await attendanceService.getMyDashboard();
                setStudentDashboard(data);
            } catch (error) {
                const message = error instanceof Error ? error.message : "Unable to load student dashboard";
                setStudentDashboardError(message);
            } finally {
                setIsStudentDashboardLoading(false);
            }
        }

        void loadStudentDashboard();
    }, [user.role]);

    const todayList = studentDashboard?.today.sessions ?? [];
    const timetableList = studentDashboard?.timetable.sessions ?? [];
    const summary = studentDashboard?.summary;
    const riskCourses = (studentDashboard?.course_stats ?? []).filter((item) => item.attendance_rate < 80);

    const statusBadgeClass = (status: string) => {
        const normalized = String(status || "").toLowerCase();
        if (normalized === "present") return "bg-emerald-50 text-emerald-700 border border-emerald-200";
        if (normalized === "late") return "bg-amber-50 text-amber-700 border border-amber-200";
        if (normalized === "excused") return "bg-sky-50 text-sky-700 border border-sky-200";
        if (normalized === "ongoing") return "bg-indigo-50 text-indigo-700 border border-indigo-200";
        if (normalized === "upcoming") return "bg-slate-100 text-slate-700 border border-slate-200";
        if (normalized === "canceled") return "bg-rose-50 text-rose-700 border border-rose-200";
        return "bg-rose-50 text-rose-700 border border-rose-200";
    };

    return (
        <main className="motion-page min-h-screen px-1 py-1 sm:px-2">
            <section className="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.45)] sm:p-6">
                <header className="flex flex-col gap-4 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 p-5 text-white shadow-xl sm:flex-row sm:items-center sm:justify-between sm:p-7">
                    <div className="flex items-center gap-4">
                        <div className="rounded-2xl bg-white/15 p-3 ring-1 ring-white/20">
                            <Image src={FaceIdIcons} width={56} height={56} alt="Face icon" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">Face Recognition Attendance System</p>
                            <h1 className="text-2xl font-bold sm:text-4xl">System Overview</h1>
                        </div>
                    </div>

                    {/* <div className="w-full rounded-2xl border border-white/30 bg-white/10 p-4 text-sm backdrop-blur sm:w-auto sm:min-w-[290px]">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">
                            {user.role}: {user.displayName}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <Link
                                href="/enrollment"
                                className="interactive-btn inline-flex items-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900"
                            >
                                Open Enrollment
                            </Link>
                            <button
                                type="button"
                                className="interactive-btn inline-flex items-center gap-2 rounded-xl border border-white/40 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
                                onClick={logout}
                            >
                                <LogOut className="h-4 w-4" /> Logout
                            </button>
                        </div>
                    </div> */}
                </header>

                {(user.role === "teacher" || user.role === "admin") && (
                    <section className="motion-stagger mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {isKpiLoading ? (
                            <div className="sm:col-span-2 xl:col-span-4">
                                <LoadingState label="Loading teacher KPI..." />
                            </div>
                        ) : kpiError ? (
                            <div className="sm:col-span-2 xl:col-span-4">
                                <ErrorState label={kpiError} />
                            </div>
                        ) : (
                            <>
                                <article className="interactive-card rounded-2xl border border-blue-100 bg-blue-50 p-4 shadow-sm">
                                    <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700"><Users className="h-4 w-4" /> Active Students</p>
                                    <p className="mt-2 text-2xl font-bold text-blue-900">{kpi.totalStudents}</p>
                                </article>
                                <article className="interactive-card rounded-2xl border border-indigo-100 bg-indigo-50 p-4 shadow-sm">
                                    <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700"><CalendarClock className="h-4 w-4" /> Active Sessions</p>
                                    <p className="mt-2 text-2xl font-bold text-indigo-900">{kpi.activeSessions}</p>
                                </article>
                                <article className="interactive-card rounded-2xl border border-emerald-100 bg-emerald-50 p-4 shadow-sm">
                                    <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700"><UserCheck className="h-4 w-4" /> Checked-in Today</p>
                                    <p className="mt-2 text-2xl font-bold text-emerald-900">{kpi.checkedInToday}</p>
                                </article>
                                <article className="interactive-card rounded-2xl border border-amber-100 bg-amber-50 p-4 shadow-sm">
                                    <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700"><Flame className="h-4 w-4" /> Late Today</p>
                                    <p className="mt-2 text-2xl font-bold text-amber-900">{kpi.lateToday}</p>
                                </article>
                            </>
                        )}
                    </section>
                )}

                {user.role === "student" && (
                    <section className="motion-stagger mt-4 space-y-4">
                        {isStudentDashboardLoading ? (
                            <LoadingState label="Loading your attendance dashboard..." />
                        ) : studentDashboardError ? (
                            <ErrorState label={studentDashboardError} />
                        ) : (
                            <>
                                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                    <article className="interactive-card rounded-2xl border border-indigo-100 bg-indigo-50 p-4 shadow-sm">
                                        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700"><CalendarClock className="h-4 w-4" /> Today Sessions</p>
                                        <p className="mt-2 text-2xl font-bold text-indigo-900">{studentDashboard?.today.total_sessions ?? 0}</p>
                                    </article>
                                    <article className="interactive-card rounded-2xl border border-emerald-100 bg-emerald-50 p-4 shadow-sm">
                                        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700"><UserCheck className="h-4 w-4" /> Checked In</p>
                                        <p className="mt-2 text-2xl font-bold text-emerald-900">{studentDashboard?.today.checked_in_sessions ?? 0}</p>
                                    </article>
                                    <article className="interactive-card rounded-2xl border border-rose-100 bg-rose-50 p-4 shadow-sm">
                                        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-rose-700"><ClipboardList className="h-4 w-4" /> Remaining</p>
                                        <p className="mt-2 text-2xl font-bold text-rose-900">{studentDashboard?.today.remaining_sessions ?? 0}</p>
                                    </article>
                                    <article className="interactive-card rounded-2xl border border-blue-100 bg-blue-50 p-4 shadow-sm">
                                        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700"><Flame className="h-4 w-4" /> Attendance Rate</p>
                                        <p className="mt-2 text-2xl font-bold text-blue-900">{summary?.attendance_rate ?? 0}%</p>
                                    </article>
                                </div>

                                <div className="grid gap-4 xl:grid-cols-3">
                                    <article className="xl:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                                        <div className="flex items-center justify-between gap-2">
                                            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-600">Today Attendance</h2>
                                            <Link href="/history" className="text-xs font-semibold text-indigo-700 hover:underline">View Full History</Link>
                                        </div>
                                        <div className="mt-3 space-y-2">
                                            {todayList.length === 0 ? (
                                                <p className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-5 text-sm text-slate-500">No session scheduled for today.</p>
                                            ) : (
                                                todayList.map((item) => (
                                                    <div key={item.session_id} className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                                            <p className="text-sm font-semibold text-slate-900">
                                                                {formatStudentSessionTitle(item)}
                                                            </p>
                                                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(item.display_status ?? item.attendance_status ?? "absent")}`}>
                                                                {formatStatusLabel(item.display_status ?? item.attendance_status ?? "absent")}
                                                            </span>
                                                        </div>
                                                        <p className="mt-1 text-xs text-slate-500">
                                                            {formatSessionDate(item.session_date)} | {formatSessionTime(item.start_time)} - {formatSessionTime(item.end_time)} (GMT+7)
                                                        </p>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </article>

                                    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                                        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-600">Statistics</h2>
                                        <div className="mt-3 grid gap-2 text-sm">
                                            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"><span>Total Completed Sessions</span><b>{summary?.total_sessions ?? 0}</b></div>
                                            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"><span>Present</span><b>{summary?.present_count ?? 0}</b></div>
                                            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"><span>Late</span><b>{summary?.late_count ?? 0}</b></div>
                                            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"><span>Excused</span><b>{summary?.excused_count ?? 0}</b></div>
                                            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"><span>Absent</span><b>{summary?.absent_count ?? 0}</b></div>
                                        </div>

                                        <div className="mt-4">
                                            <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Risk Courses (&lt; 80%)</h3>
                                            <div className="mt-2 space-y-2">
                                                {riskCourses.length === 0 ? (
                                                    <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">No risk courses. Keep it up.</p>
                                                ) : (
                                                    riskCourses.map((item) => (
                                                        <div key={item.course_class_id} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                                            <p className="font-semibold inline-flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> {item.course_code} - {item.course_name}</p>
                                                            <p className="mt-1">Rate: {item.attendance_rate}% | Absent: {item.absent_count}</p>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </article>
                                </div>

                                <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                                    <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-600">My Timetable (Next 14 days)</h2>
                                    <div className="mt-3 overflow-x-auto">
                                        <table className="min-w-[720px] w-full divide-y divide-slate-200 text-sm">
                                            <thead className="bg-slate-100">
                                                <tr>
                                                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">Date</th>
                                                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">Time</th>
                                                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">Course</th>
                                                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">Teacher</th>
                                                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">Attendance</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 bg-white">
                                                {timetableList.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className="px-3 py-5 text-sm text-slate-500">No sessions in the selected window.</td>
                                                    </tr>
                                                ) : (
                                                    timetableList.map((item) => (
                                                        <tr key={`${item.session_id}-${item.session_date}`}>
                                                            <td className="px-3 py-2 text-slate-700">{formatSessionDate(item.session_date)}</td>
                                                            <td className="px-3 py-2 text-slate-700">{formatSessionTime(item.start_time)} - {formatSessionTime(item.end_time)} (GMT+7)</td>
                                                            <td className="px-3 py-2 text-slate-700">{formatStudentSessionTitle(item)}</td>
                                                            <td className="px-3 py-2 text-slate-700">{item.teacher_name ?? "-"}</td>
                                                            <td className="px-3 py-2 text-slate-700">{formatStatusLabel(item.attendance_status)}</td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </article>
                            </>
                        )}
                    </section>
                )}

                <div className="motion-stagger mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {visibleCards.map((card, index) => {
                        const isLastOddCard = visibleCards.length % 2 === 1 && index === visibleCards.length - 1;

                        return (
                            <article
                                key={card.href}
                                className={`interactive-card flex flex-col justify-between rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-5 shadow-sm ${isLastOddCard ? "md:col-span-2 xl:col-span-1 xl:col-start-2" : ""}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="">
                                        {card.iconType === "symbol" ? (
                                            <BadgeIcon name={card.icon} />
                                        ) : (
                                            <img src={card.icon} width={150} height={150} alt={card.title} />
                                        )}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900">{card.title}</h2>
                                        <p className="mt-2 text-sm leading-6 text-slate-600">{card.description}</p>
                                    </div>
                                </div>

                                <div className="mt-5 flex items-center justify-between gap-2">
                                    <Link
                                        href={card.href}
                                        className="interactive-btn inline-flex items-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                                    >
                                        {card.cta}
                                    </Link>
                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{card.badge}</span>
                                </div>
                            </article>
                        );
                    })}
                </div>

                {/* <div className="mt-5 flex flex-wrap gap-3">
                    <Link href="/camera" className="interactive-btn inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                        <Video className="h-4 w-4" /> Open Camera Page
                    </Link>
                    <Link href="/attendance" className="interactive-btn inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                        <ClipboardList className="h-4 w-4" /> Open Realtime Page
                    </Link>
                </div> */}
            </section>
        </main>
    );
}
