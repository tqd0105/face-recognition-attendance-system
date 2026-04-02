"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Plus, CalendarClock, Layers, CircleCheckBig, Pencil, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { courseService } from "@/services/course.service";
import { sessionService } from "@/services/session.service";
import type { CourseItem, Session } from "@/types/models";
import { SessionIcons } from "@/components/icons";

export default function SessionsPage() {
    const canUpdateSession = true;
    const canDeleteSession = true;
    const canControlSession = true;

    const [sessions, setSessions] = useState<Session[]>([]);
    const [courses, setCourses] = useState<CourseItem[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
    const [pendingDeleteSession, setPendingDeleteSession] = useState<Session | null>(null);
    const [selectedCourseClassId, setSelectedCourseClassId] = useState("");
    const [sessionDate, setSessionDate] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [status, setStatus] = useState<"scheduled" | "active" | "completed" | "canceled">("scheduled");
    const [error, setError] = useState<string | null>(null);
    const [modalError, setModalError] = useState<string | null>(null);

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

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!selectedCourseClassId.trim() || !sessionDate || !startTime || !endTime) {
            return;
        }

        setModalError(null);

        const normalizedCourseClassId = Number(selectedCourseClassId);
        if (!Number.isFinite(normalizedCourseClassId) || normalizedCourseClassId <= 0) {
            setModalError("Invalid class selection. Please select a valid class.");
            return;
        }

        const duplicatedSession = sessions.some(
            (item) =>
                item.id !== editingSessionId &&
                Number(item.course_class_id ?? item.class_id) === normalizedCourseClassId &&
                item.session_date === sessionDate &&
                item.start_time === startTime &&
                item.end_time === endTime,
        );
        if (duplicatedSession) {
            setModalError("This session already exists (same class, date, and time).");
            return;
        }

        try {
            setIsCreating(true);
            setModalError(null);
            const payload = {
                course_class_id: normalizedCourseClassId,
                class_id: normalizedCourseClassId,
                session_date: sessionDate,
                session_name: `${sessionDate} ${startTime}-${endTime}`,
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
        setSessionDate(item.session_date ? item.session_date.split("T")[0] ?? item.session_date : "");
        setStartTime(item.start_time ? item.start_time.slice(0, 5) : "");
        setEndTime(item.end_time ? item.end_time.slice(0, 5) : "");
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
            await sessionService.start(item.id);
            const latest = await sessionService.getAll(courses.map((course) => Number(course.id)));
            setSessions(latest);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Cannot start session";
            setError(message);
        }
    }, [canControlSession, courses]);

    const onStopSession = useCallback(async (item: Session) => {
        if (!canControlSession) {
            setError("Current backend does not support stopping sessions yet.");
            return;
        }

        try {
            setError(null);
            await sessionService.stop(item.id);
            const latest = await sessionService.getAll(courses.map((course) => Number(course.id)));
            setSessions(latest);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Cannot stop session";
            setError(message);
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
            { key: "date", title: "Session Date", render: (row: Session) => row.session_date ?? "-" },
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
                                onClick={() => onStopSession(row)}
                            >
                                Stop
                            </button>
                        ) : (
                            <button
                                type="button"
                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                                onClick={() => onStartSession(row)}
                                disabled={row.status === "canceled"}
                            >
                                Start
                            </button>
                        )}
                        <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            onClick={() => onEditSession(row)}
                        >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                            onClick={() => onDeleteSession(row)}
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

                <div className="motion-stagger mt-4 grid gap-3 md:grid-cols-3">
                    <article className="interactive-card rounded-2xl border border-blue-100 bg-blue-50 p-4 shadow-sm">
                        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700"><CalendarClock className="h-4 w-4" /> Sessions</p>
                        <p className="mt-2 text-2xl font-bold text-blue-900">{totalSessions}</p>
                    </article>
                    <article className="interactive-card rounded-2xl border border-indigo-100 bg-indigo-50 p-4 shadow-sm">
                        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700"><CircleCheckBig className="h-4 w-4" /> Active</p>
                        <p className="mt-2 text-2xl font-bold text-indigo-900">{activeSessions}</p>
                    </article>
                    <article className="interactive-card rounded-2xl border border-cyan-100 bg-cyan-50 p-4 shadow-sm">
                        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700"><Layers className="h-4 w-4" /> {optionSourceLabel} Options</p>
                        <p className="mt-2 text-2xl font-bold text-cyan-900">{courseOptions.length}</p>
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

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-sm">
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
                            onChange={(e) => setStartTime(e.target.value)}
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
                            onChange={(e) => setEndTime(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-slate-700" htmlFor="session-status">
                            Status
                        </label>
                        <select
                            id="session-status"
                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            value={status}
                            onChange={(e) => setStatus(e.target.value as "scheduled" | "active" | "completed" | "canceled")}
                            disabled
                        >
                            <option value="scheduled">scheduled</option>
                        </select>
                    </div>
                    {/* <p className="text-xs text-slate-500">Session table constraint: start_time must be earlier than end_time.</p> */}
                    <button
                        type="submit"
                        className="interactive-btn inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                        disabled={
                            isCreating ||
                            !hasCourseOptions ||
                            (startTime && endTime ? startTime >= endTime : false)
                        }
                    >
                        {isCreating ? "Saving..." : editingSessionId ? "Update Session" : "Create Session"}
                    </button>
                    {startTime && endTime && startTime >= endTime && (
                        <p className="text-sm font-semibold text-rose-700">End Time must be greater than Start Time.</p>
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
