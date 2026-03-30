"use client";

import Link from "next/link";
import Image from "next/image";
import {
    CalendarClock,
    ClipboardList,
    Database,
    LogOut,
    School,
    Users,
    Video,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { FaceIdIcons, WebcamIcons, WebcamLiveIcons, StudentIcons, ClassIcons, SessionIcons, HistoryIcons } from "@/components/icons";

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
        title: "Class Management",
        description: "Browse classes and class details from backend data.",
        href: "/classes",
        cta: "Manage Classes",
        badge: "Academic",
        iconType: "image",
        icon: ClassIcons,
    },
    {
        title: "Session Management",
        description: "Create attendance sessions and keep local cache for quick access.",
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
    const { user, logout } = useAuth();

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
                            <h1 className="text-3xl font-bold sm:text-5xl">Overview Dashboard</h1>
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

                <div className="mt-5 flex flex-wrap gap-3">
                    <Link href="/camera" className="interactive-btn inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                        <Video className="h-4 w-4" /> Open Camera Page
                    </Link>
                    <Link href="/attendance" className="interactive-btn inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                        <ClipboardList className="h-4 w-4" /> Open Realtime Page
                    </Link>
                </div>
            </section>
        </main>
    );
}
