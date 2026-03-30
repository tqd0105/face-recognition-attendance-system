"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { DataTable } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { classService } from "@/services/class.service";
import { sessionService } from "@/services/session.service";
import type { ClassItem, Session } from "@/types/models";

export default function SessionsPage() {
    const [sessions, setSessions] = useState<Session[]>(() => sessionService.getLocal());
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [selectedCourseClassId, setSelectedCourseClassId] = useState("");
    const [sessionDate, setSessionDate] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [status, setStatus] = useState<"scheduled" | "active" | "completed" | "canceled">("scheduled");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadClasses() {
            try {
                const data = await classService.getAll();
                setClasses(data);
            } catch {
                // Keep page usable even when class lookup fails.
            }
        }

        void loadClasses();
    }, []);

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!selectedCourseClassId.trim() || !sessionDate || !startTime || !endTime) {
            return;
        }

        try {
            setIsCreating(true);
            setError(null);
            await sessionService.create({
                course_class_id: Number(selectedCourseClassId),
                class_id: Number(selectedCourseClassId),
                session_date: sessionDate,
                session_name: `${sessionDate} ${startTime}-${endTime}`,
                start_time: startTime,
                end_time: endTime,
                status,
            });
            setSessions(sessionService.getLocal());
            setSelectedCourseClassId("");
            setSessionDate("");
            setStartTime("");
            setEndTime("");
            setStatus("scheduled");
            setIsModalOpen(false);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Cannot create session";
            setError(message);
        } finally {
            setIsCreating(false);
        }
    }

    const columns = useMemo(
        () => [
            { key: "id", title: "Session ID", render: (row: Session) => row.id },
            { key: "courseClass", title: "Course Class ID", render: (row: Session) => row.course_class_id ?? row.class_id },
            { key: "date", title: "Session Date", render: (row: Session) => row.session_date ?? "-" },
            { key: "start", title: "Start Time", render: (row: Session) => row.start_time ?? "-" },
            { key: "end", title: "End Time", render: (row: Session) => row.end_time ?? "-" },
            { key: "status", title: "Status", render: (row: Session) => row.status ?? "scheduled" },
        ],
        [],
    );

    return (
        <main className="motion-page space-y-4 px-1 py-1 sm:px-2">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Management</p>
                        <h1 className="text-2xl font-bold text-slate-900">Session Management</h1>
                    </div>
                    <button
                        type="button"
                        className="interactive-btn inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                        onClick={() => setIsModalOpen(true)}
                    >
                        <Plus className="h-4 w-4" /> New Session
                    </button>
                </div>

                {error && (
                    <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
                        {error}
                    </div>
                )}

                <div className="mt-4">
                    <DataTable columns={columns} rows={sessions} emptyText="No sessions created yet" />
                </div>
            </section>

            <Modal open={isModalOpen} title="Create Session" onClose={() => setIsModalOpen(false)}>
                <form className="grid gap-3" onSubmit={onSubmit}>
                    <div>
                        <label className="text-sm font-semibold text-slate-700" htmlFor="session-class-id">
                            Course Class
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
                            {classes.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.course_code ?? item.class_code ?? item.id} - {item.course_name ?? item.name}
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
                        >
                            <option value="scheduled">scheduled</option>
                            <option value="active">active</option>
                            <option value="completed">completed</option>
                            <option value="canceled">canceled</option>
                        </select>
                    </div>
                    <p className="text-xs text-slate-500">Session table constraint: start_time must be earlier than end_time.</p>
                    <button
                        type="submit"
                        className="interactive-btn inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                        disabled={isCreating || (startTime && endTime ? startTime >= endTime : false)}
                    >
                        {isCreating ? "Creating..." : "Create Session"}
                    </button>
                    {startTime && endTime && startTime >= endTime && (
                        <p className="text-sm font-semibold text-rose-700">End Time must be greater than Start Time.</p>
                    )}
                </form>
            </Modal>
        </main>
    );
}
