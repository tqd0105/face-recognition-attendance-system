"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
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
import { FaceIdIcons, WebcamIcons, WebcamLiveIcons, StudentIcons, ClassIcons, SessionIcons, HistoryIcons } from "@/components/icons";
import { ErrorState, LoadingState } from "@/components/ui/States";

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
        description: "Capture and register student face profiles for attendance recognition.",
        href: "/enrollment",
        cta: "Open Enrollment",
        badge: "Core",
        iconType: "image",
        icon: WebcamIcons,
    },
    {
        title: "Realtime Attendance",
        description: "Monitor attendance events and run live session updates.",
        href: "/attendance",
        cta: "Open Realtime",
        badge: "Live",
        iconType: "image",
        icon: WebcamLiveIcons,
    },
    {
        title: "Student Management",
        description: "View student list and add new student records with modal form.",
        href: "/students",
        cta: "Manage Students",
        badge: "Data",
        iconType: "image",
        icon: StudentIcons,
    },
    {
        title: "Home Class Management",
        description: "Manage administrative home classes (class_code, major, department).",
        href: "/classes",
        cta: "Manage Home Classes",
        badge: "Academic",
        iconType: "image",
        icon: ClassIcons,
    },
    {
        title: "Course Class Management",
        description: "Manage course classes used by sessions and realtime attendance.",
        href: "/courses",
        cta: "Manage Course",
        badge: "Teaching",
        iconType: "image",
        icon: SessionIcons,
    },
    {
        title: "Session Management",
        description: "Create attendance sessions from course classes with DB-synced schedule.",
        href: "/sessions",
        cta: "Manage Sessions",
        badge: "Schedule",
        iconType: "image",
        icon: SessionIcons,
    },
    {
        title: "Attendance History",
        description: "Review posted attendance records with timeline and status.",
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

export default function DashboardPage() {
    const { user } = useAuth();
    const [kpi, setKpi] = useState({ totalStudents: 0, activeSessions: 0, checkedInToday: 0, lateToday: 0 });
    const [isKpiLoading, setIsKpiLoading] = useState(true);
    const [kpiError, setKpiError] = useState<string | null>(null);

    useEffect(() => {
        async function loadTeacherKpi() {
            if (user.role !== "teacher") {
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
                            <h1 className="text-3xl font-bold sm:text-4xl">Overview Functions </h1>
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

                {user.role === "teacher" && (
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

                <div className="motion-stagger mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {cards.map((card) => (
                        <article
                            key={card.href}
                            className="interactive-card flex flex-col justify-between rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-5 shadow-sm"
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
                    ))}
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
