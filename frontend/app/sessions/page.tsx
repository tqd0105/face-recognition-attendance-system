"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, CalendarClock, Layers, CircleCheckBig, Pencil, Trash2 } from "lucide-react";
import { attendanceService } from "@/services/attendance.service";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { courseService } from "@/services/course.service";
import { sessionService } from "@/services/session.service";
import { backendUrl } from "@/lib/backend";
import type { CourseItem, Session } from "@/types/models";
import { SessionIcons } from "@/components/icons";

type ServiceHealth = {
    backend: "up" | "down";
    database: "up" | "down";
    ai: "up" | "down" | "unknown";
    ai_url?: string;
};

const INVALID_TIME_RANGE_MESSAGE = "End Time must be greater than Start Time.";
const DUPLICATE_SESSION_MESSAGE = "This session already exists (same class, date, and time).";
const BACKEND_INVALID_TIME_RANGE_MESSAGE = "Start time must be earlier than end time!";

function isTimeRangeInvalid(start: string, end: string): boolean {
    return Boolean(start && end && start >= end);
}

function isInvalidTimeRangeError(message: string | null): boolean {
    return message === INVALID_TIME_RANGE_MESSAGE || message === BACKEND_INVALID_TIME_RANGE_MESSAGE;
}

function isDuplicateSessionError(message: string | null): boolean {
    return message === DUPLICATE_SESSION_MESSAGE;
}

export default function SessionsPage() {
    const router = useRouter();
    const canUpdateSession = true;
    const canDeleteSession = true;
    const canControlSession = true;

    const [sessions, setSessions] = useState<Session[]>([]);
    const [courses, setCourses] = useState<CourseItem[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [actionSessionId, setActionSessionId] = useState<number | null>(null);
    const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
    const [pendingDeleteSession, setPendingDeleteSession] = useState<Session | null>(null);
    const [selectedCourseClassId, setSelectedCourseClassId] = useState("");
    const [sessionName, setSessionName] = useState("");
    const [sessionDate, setSessionDate] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [status, setStatus] = useState<"scheduled" | "active" | "completed" | "canceled">("scheduled");
    const [error, setError] = useState<string | null>(null);
    const [modalError, setModalError] = useState<string | null>(null);
    const [featuredAttendanceCount, setFeaturedAttendanceCount] = useState(0);
    const [serviceHealth, setServiceHealth] = useState<ServiceHealth | null>(null);

    const createStatusDescription = "New sessions are always created as scheduled. Use Start and Stop actions in the list to change lifecycle status.";

    useEffect(() => {
        async function loadClassSources() {
            try {
                const courseData = await courseService.getAll();
                setCourses(courseData);

                if (courseData.length === 0) {
                    setError("No course class found. Please create course class before creating sessions.");
                    sessionService.clearCache();
                    setSessions([]);
                    return;
                }

                try {
                    const courseIds = courseData.map((item) => Number(item.id));
                    const data = await sessionService.getAll(courseIds);
                    setSessions(data);
                } catch {
                    setSessions([]);
                }
            } catch (err) {
                const message = err instanceof Error ? err.message : "Cannot load course classes";
                setError(message);
                setSessions([]);
            }
        }

        void loadClassSources();
    }, []);

    useEffect(() => {
        let timer: ReturnType<typeof setInterval> | null = null;
        let isMounted = true;

        async function loadServiceHealth() {
            try {
                const response = await fetch(backendUrl("/api/health/services"));
                const payload = (await response.json()) as { data?: ServiceHealth };
                if (isMounted && payload?.data) {
                    setServiceHealth(payload.data);
                }
            } catch {
                if (isMounted) {
                    setServiceHealth({ backend: "down", database: "down", ai: "unknown" });
                }
            }
        }

        void loadServiceHealth();
        timer = setInterval(() => {
            void loadServiceHealth();
        }, 15000);

        return () => {
            isMounted = false;
            if (timer) {
                clearInterval(timer);
            }
        };
    }, []);

    const hasCourseOptions = courses.length > 0;
    const optionSourceLabel = "Course class";

    const courseOptions = courses
        .map((item) => ({ item, value: Number(item.id) }))
        .filter((entry) => entry.value > 0);

    const classCodeMap = useMemo(() => {
        const map = new Map<number, string>();
        courseOptions.forEach(({ item, value }) => {
            map.set(value, item.course_code ?? item.course_name ?? `Class #${value}`);
        });
        return map;
    }, [courseOptions]);

    const normalizedCourseClassId = Number(selectedCourseClassId);
    const isTimeRangeCurrentlyInvalid = isTimeRangeInvalid(startTime, endTime);
    const hasDuplicateSession = useMemo(
        () =>
            Number.isFinite(normalizedCourseClassId) &&
            normalizedCourseClassId > 0 &&
            sessions.some(
                (item) =>
                    item.id !== editingSessionId &&
                    Number(item.course_class_id ?? item.class_id) === normalizedCourseClassId &&
                    normalizeSessionDate(item.session_date) === sessionDate &&
                    normalizeSessionTime(item.start_time) === startTime &&
                    normalizeSessionTime(item.end_time) === endTime,
            ),
        [editingSessionId, endTime, normalizedCourseClassId, sessionDate, sessions, startTime],
    );

    function normalizeSessionDate(value?: string): string {
        if (!value) {
            return "";
        }
        return value.includes("T") ? value.split("T")[0] ?? value : value;
    }

    function normalizeSessionTime(value?: string): string {
        if (!value) {
            return "";
        }
        return value.slice(0, 5);
    }

    function formatSessionDate(value?: string): string {
        const normalized = normalizeSessionDate(value);
        if (!normalized) {
            return "-";
        }

        const parsed = new Date(`${normalized}T00:00:00`);
        if (Number.isNaN(parsed.getTime())) {
            return normalized;
        }

        return new Intl.DateTimeFormat("en-GB", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            timeZone: "Asia/Ho_Chi_Minh",
        }).format(parsed);
    }

    useEffect(() => {
        if (!modalError) {
            return;
        }

        if (isInvalidTimeRangeError(modalError) && !isTimeRangeCurrentlyInvalid) {
            setModalError(null);
            return;
        }

        if (isDuplicateSessionError(modalError) && !hasDuplicateSession) {
            setModalError(null);
        }
    }, [hasDuplicateSession, isTimeRangeCurrentlyInvalid, modalError]);

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!selectedCourseClassId.trim() || !sessionDate || !startTime || !endTime) {
            return;
        }

        setModalError(null);

        if (!Number.isFinite(normalizedCourseClassId) || normalizedCourseClassId <= 0) {
            setModalError("Invalid class selection. Please select a valid class.");
            return;
        }

        if (isTimeRangeCurrentlyInvalid) {
            setModalError(INVALID_TIME_RANGE_MESSAGE);
            return;
        }

        if (hasDuplicateSession) {
            setModalError(DUPLICATE_SESSION_MESSAGE);
            return;
        }

        try {
            setIsCreating(true);
            setModalError(null);
            const payload = {
                course_class_id: normalizedCourseClassId,
                class_id: normalizedCourseClassId,
                session_date: sessionDate,
                session_name: sessionName.trim() || `${sessionDate} ${startTime}-${endTime}`,
                start_time: startTime,
                end_time: endTime,
                status: "scheduled" as const,
            };

            if (editingSessionId) {
                await sessionService.update(editingSessionId, payload);
            } else {
                await sessionService.create(payload);
            }
            try {
                const latest = await sessionService.getAll(courses.map((item) => Number(item.id)));
                setSessions(latest);
            } catch {
                setSessions(sessionService.getLocal());
            }
            setEditingSessionId(null);
            setSelectedCourseClassId("");
            setSessionName("");
            setSessionDate("");
            setStartTime("");
            setEndTime("");
            setStatus("scheduled");
            setIsModalOpen(false);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Cannot create session";
            setModalError(message);
        } finally {
            setIsCreating(false);
        }
    }

    const onEditSession = useCallback((item: Session) => {
        setModalError(null);
        setEditingSessionId(item.id);
        setSelectedCourseClassId(String(item.course_class_id ?? item.class_id ?? ""));
        setSessionName(item.session_name ?? "");
        setSessionDate(normalizeSessionDate(item.session_date));
        setStartTime(normalizeSessionTime(item.start_time));
        setEndTime(normalizeSessionTime(item.end_time));
        setStatus(item.status ?? "scheduled");
        setIsModalOpen(true);
    }, []);

    const onDeleteSession = useCallback((item: Session) => {
        if (!canDeleteSession) {
            setError("Current backend does not support deleting sessions yet.");
            return;
        }

        setPendingDeleteSession(item);
    }, [canDeleteSession]);

    const onConfirmDeleteSession = useCallback(async () => {
        if (!pendingDeleteSession) {
            return;
        }

        try {
            setIsDeleting(true);
            setError(null);
            await sessionService.remove(pendingDeleteSession.id);
            setPendingDeleteSession(null);
            const latest = await sessionService.getAll(courses.map((course) => Number(course.id)));
            setSessions(latest);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Cannot delete session";
            setError(message);
        } finally {
            setIsDeleting(false);
        }
    }, [courses, pendingDeleteSession]);

    const onStartSession = useCallback(async (item: Session) => {
        if (!canControlSession) {
            setError("Current backend does not support starting sessions yet.");
            return;
        }

        try {
            setError(null);
            setActionSessionId(item.id);

            const updated = await sessionService.start(item.id);
            setSessions((prev) => prev.map((session) => (session.id === item.id ? { ...session, ...updated } : session)));

            try {
                const latest = await sessionService.getAll(courses.map((course) => Number(course.id)));
                setSessions(latest);
            } catch {
                // Keep optimistic update when refresh fails.
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : "Cannot start session";
            setError(message);
        } finally {
            setActionSessionId(null);
        }
    }, [canControlSession, courses]);

    const onStopSession = useCallback(async (item: Session) => {
        if (!canControlSession) {
            setError("Current backend does not support stopping sessions yet.");
            return;
        }

        try {
            setError(null);
            setActionSessionId(item.id);
            const updated = await sessionService.stop(item.id);
            setSessions((prev) => prev.map((session) => (session.id === item.id ? { ...session, ...updated } : session)));

            try {
                const latest = await sessionService.getAll(courses.map((course) => Number(course.id)));
                setSessions(latest);
            } catch {
                // Keep optimistic update when refresh fails.
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : "Cannot stop session";
            setError(message);
        } finally {
            setActionSessionId(null);
        }
    }, [canControlSession, courses]);

    const columns = useMemo(
        () => [
            {
                key: "classCode",
                title: "Class Code",
                render: (row: Session) => {
                    const classId = Number(row.course_class_id ?? row.class_id ?? 0);
                    if (!classId) {
                        return "-";
                    }
                    return classCodeMap.get(classId) ?? `Class #${classId}`;
                },
            },
            { key: "sessionName", title: "Session Name", render: (row: Session) => row.session_name ?? "Session" },
            { key: "date", title: "Session Date", render: (row: Session) => formatSessionDate(row.session_date) },
            { key: "start", title: "Start Time", render: (row: Session) => row.start_time ?? "-" },
            { key: "end", title: "End Time", render: (row: Session) => row.end_time ?? "-" },
            { key: "status", title: "Status", render: (row: Session) => row.status ?? "scheduled" },
            {
                key: "actions",
                title: "Actions",
                render: (row: Session) => (
                    <div className="flex gap-2">
                        {row.status === "active" ? (
                            <button
                                type="button"
                                className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    void onStopSession(row);
                                }}
                                disabled={actionSessionId === row.id}
                            >
                                {actionSessionId === row.id ? "Stopping..." : "Stop"}
                            </button>
                        ) : (
                            <button
                                type="button"
                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    void onStartSession(row);
                                }}
                                disabled={actionSessionId === row.id}
                            >
                                {actionSessionId === row.id ? "Starting..." : "Start"}
                            </button>
                        )}
                        <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            onClick={(event) => {
                                event.stopPropagation();
                                onEditSession(row);
                            }}
                        >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                            onClick={(event) => {
                                event.stopPropagation();
                                onDeleteSession(row);
                            }}
                        >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                    </div>
                ),
            },
        ],
        [classCodeMap, onDeleteSession, onEditSession, onStartSession, onStopSession],
    );

    const totalSessions = sessions.length;
    const activeSessions = sessions.filter((item) => item.status === "active").length;
    const featuredSession = useMemo(() => {
        const active = sessions.find((item) => item.status === "active");
        if (active) {
            return active;
        }
        return sessions[0] ?? null;
    }, [sessions]);

    useEffect(() => {
        async function loadFeaturedAttendance() {
            if (!featuredSession) {
                setFeaturedAttendanceCount(0);
                return;
            }

            try {
                const rows = await attendanceService.getBySession(Number(featuredSession.id));
                setFeaturedAttendanceCount(rows.length);
            } catch {
                setFeaturedAttendanceCount(0);
            }
        }

        void loadFeaturedAttendance();
    }, [featuredSession]);

    return (
        <main className="motion-page space-y-4 px-1 py-1 sm:px-2">
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                <header className="flex items-center gap-2 motion-hero rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-5 text-white shadow-lg sm:p-6">
                    <div>
                        <img src={SessionIcons} width={80} height={80} alt="" />
                    </div>
                    <div>
                        <h1 className="mt-2 text-3xl font-bold sm:text-3xl">Session Management</h1>
                        <p className="mt-2 text-md text-slate-100 sm:text-base">Plan and monitor session schedules linked to Course Class records in database.</p>
                    </div>
                </header>

                {/* <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${serviceHealth?.backend === "up" ? "border border-emerald-300 bg-emerald-50 text-emerald-700" : "border border-rose-300 bg-rose-50 text-rose-700"}`}>
                            Backend: {serviceHealth?.backend === "up" ? "Up" : "Down"}
                        </span>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${serviceHealth?.database === "up" ? "border border-emerald-300 bg-emerald-50 text-emerald-700" : "border border-rose-300 bg-rose-50 text-rose-700"}`}>
                            Database: {serviceHealth?.database === "up" ? "Up" : "Down"}
                        </span>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${serviceHealth?.ai === "up" ? "border border-emerald-300 bg-emerald-50 text-emerald-700" : serviceHealth?.ai === "down" ? "border border-rose-300 bg-rose-50 text-rose-700" : "border border-slate-300 bg-slate-100 text-slate-700"}`}>
                            AI Service: {serviceHealth?.ai === "up" ? "Up" : serviceHealth?.ai === "down" ? "Down" : "Unknown"}
                        </span>
                    </div>
                    {serviceHealth?.ai_url && (
                        <p className="mt-2 text-xs text-slate-500">AI endpoint: {serviceHealth.ai_url}</p>
                    )}
                </div> */}

                <div className="motion-stagger mt-4 grid gap-3 md:grid-cols-3">
                    <article
                        className="interactive-card cursor-pointer rounded-2xl border border-blue-100 bg-blue-50 p-4 shadow-sm"
                        onClick={() => router.push("/attendance?source=sessions")}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                router.push("/attendance?source=sessions");
                            }
                        }}
                    >
                        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700"><CalendarClock className="h-4 w-4" /> Sessions</p>
                        <p className="mt-2 text-2xl font-bold text-blue-900">{totalSessions}</p>
                        <p className="mt-1 text-xs font-medium text-blue-700">Open realtime attendance</p>
                    </article>
                    <article className="interactive-card rounded-2xl border border-indigo-100 bg-indigo-50 p-4 shadow-sm">
                        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700"><CircleCheckBig className="h-4 w-4" /> Active</p>
                        <p className="mt-2 text-2xl font-bold text-indigo-900">{activeSessions}</p>
                        <p className="mt-1 text-xs font-medium text-indigo-700">Sessions currently running</p>
                    </article>
                    <article
                        className="interactive-card cursor-pointer rounded-2xl border border-cyan-100 bg-cyan-50 p-4 shadow-sm"
                        onClick={() => {
                            if (featuredSession) {
                                router.push(`/attendance?source=sessions&session=${featuredSession.id}`);
                                return;
                            }
                            router.push("/attendance?source=sessions");
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                if (featuredSession) {
                                    router.push(`/attendance?source=sessions&session=${featuredSession.id}`);
                                } else {
                                    router.push("/attendance?source=sessions");
                                }
                            }
                        }}
                    >
                        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700"><Layers className="h-4 w-4" /> {optionSourceLabel} Options</p>
                        <p className="mt-2 text-2xl font-bold text-cyan-900">{featuredAttendanceCount}</p>
                        <p className="mt-1 text-xs font-medium text-cyan-700">
                            {featuredSession ? `Checked-in for session #${featuredSession.id}` : "No session selected"}
                        </p>
                    </article>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
                    <div>
                        <p className="ml-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">List Session</p>
                    </div>
                    <button
                        type="button"
                        className="interactive-btn inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                        onClick={() => {
                            setModalError(null);
                            setEditingSessionId(null);
                            setSelectedCourseClassId("");
                            setSessionName("");
                            setSessionDate("");
                            setStartTime("");
                            setEndTime("");
                            setStatus("scheduled");
                            setIsModalOpen(true);
                        }}
                    >
                        <Plus className="h-4 w-4" /> New Session
                    </button>
                </div>

                {error && (
                    <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
                        {error}
                    </div>
                )}

                {/* {!error && (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                        Current backend supports listing, creating, and start/stop session lifecycle. Edit/Delete fallback may still be unavailable.
                    </div>
                )} */}

                {/* {!error && hasCourseOptions && (
                    <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
                        Sessions can only be created from Course Class Management, not Home Class Management.
                    </div>
                )} */}

                <div className="mt-4 md:rounded-2xl md:border md:border-slate-200 md:bg-slate-50 md:p-3 md:shadow-sm">
                    <DataTable columns={columns} rows={sessions} emptyText="No sessions created yet" />
                </div>
            </section>

            <Modal
                open={isModalOpen}
                title={editingSessionId ? "Edit Session" : "Create Session"}
                onClose={() => {
                    setModalError(null);
                    setEditingSessionId(null);
                    setIsModalOpen(false);
                }}
            >
                <form className="grid gap-3" onSubmit={onSubmit}>
                    {modalError && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
                            {modalError}
                        </div>
                    )}
                    <div>
                        <label className="text-sm font-semibold text-slate-700" htmlFor="session-class-id">
                            Course Class ({courseOptions.length})
                        </label>
                        <select
                            id="session-class-id"
                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            value={selectedCourseClassId}
                            onChange={(e) => setSelectedCourseClassId(e.target.value)}
                            required
                        >
                            <option value="" disabled>
                                Select course class
                            </option>
                            {courseOptions.map(({ item, value }) => (
                                <option key={value} value={value}>
                                    {item.course_code ?? value} - {item.course_name ?? "Course"}
                                </option>
                            ))}
                        </select>

                    </div>
                    <div>
                        <label className="text-sm font-semibold text-slate-700" htmlFor="session-date">
                            Session Name
                        </label>
                        <input
                            id="session-name"
                            type="text"
                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            value={sessionName}
                            onChange={(e) => setSessionName(e.target.value)}
                            placeholder="e.g. Week 1 - Monday Morning"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-slate-700" htmlFor="session-date">
                            Session Date
                        </label>
                        <input
                            id="session-date"
                            type="date"
                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            value={sessionDate}
                            onChange={(e) => setSessionDate(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-slate-700" htmlFor="session-start-time">
                            Start Time
                        </label>
                        <input
                            id="session-start-time"
                            type="time"
                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            value={startTime}
                            onChange={(e) => {
                                const newStart = e.target.value;
                                setStartTime(newStart);
                                if (modalError && isInvalidTimeRangeError(modalError) && !isTimeRangeInvalid(newStart, endTime)) {
                                    setModalError(null);
                                }
                            }}
                            required
                        />
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-slate-700" htmlFor="session-end-time">
                            End Time
                        </label>
                        <input
                            id="session-end-time"
                            type="time"
                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            value={endTime}
                            onChange={(e) => {
                                const newEnd = e.target.value;
                                setEndTime(newEnd);
                                if (modalError && isInvalidTimeRangeError(modalError) && !isTimeRangeInvalid(startTime, newEnd)) {
                                    setModalError(null);
                                }
                            }}
                            required
                        />
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-slate-700" htmlFor="session-status">
                            Status
                        </label>
                        <input
                            id="session-status"
                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            value={editingSessionId ? status : "scheduled"}
                            readOnly
                            disabled
                        />
                        <p className="mt-1 text-xs text-slate-500">
                            {editingSessionId
                                ? "Edit status from the session lifecycle actions in the list."
                                : createStatusDescription}
                        </p>
                    </div>
                    {/* <p className="text-xs text-slate-500">Session table constraint: start_time must be earlier than end_time.</p> */}
                    <button
                        type="submit"
                        className="interactive-btn inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                        disabled={
                            isCreating ||
                            !hasCourseOptions ||
                            isTimeRangeCurrentlyInvalid
                        }
                    >
                        {isCreating ? "Saving..." : editingSessionId ? "Update Session" : "Create Session"}
                    </button>
                    {isTimeRangeCurrentlyInvalid && (
                        <p className="text-sm font-semibold text-rose-700">{INVALID_TIME_RANGE_MESSAGE}</p>
                    )}
                </form>
            </Modal>

            <ConfirmDialog
                open={Boolean(pendingDeleteSession)}
                title="Delete Session"
                message={`Are you sure you want to delete session #${pendingDeleteSession?.id ?? ""}?`}
                onConfirm={onConfirmDeleteSession}
                onClose={() => {
                    if (!isDeleting) {
                        setPendingDeleteSession(null);
                    }
                }}
                confirmText="Delete Session"
                isLoading={isDeleting}
            />
        </main>
    );
}
