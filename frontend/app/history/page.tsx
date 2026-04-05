"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Clock3, CircleCheckBig } from "lucide-react";
import { DataTable } from "@/components/ui/DataTable";
import { attendanceService } from "@/services/attendance.service";
import type { AttendanceItem, StudentAttendanceHistoryItem } from "@/types/models";
import { HistoryIcons } from "@/components/icons";
import { useAuth } from "@/hooks/useAuth";

export default function HistoryPage() {
    const { user } = useAuth();
    const [history, setHistory] = useState<AttendanceItem[]>(() => attendanceService.getLocal());

    useEffect(() => {
        async function loadStudentHistory() {
            if (user.role !== "student") {
                setHistory(attendanceService.getLocal());
                return;
            }

            try {
                const rows: StudentAttendanceHistoryItem[] = await attendanceService.getMyHistory();
                const mapped: AttendanceItem[] = rows.map((item) => ({
                    id: String(item.attendance_id),
                    session_id: 0,
                    student_id: 0,
                    status: item.status,
                    confidence_score: undefined,
                    check_in_time: item.check_in_time ?? new Date().toISOString(),
                    created_at: item.check_in_time ?? new Date().toISOString(),
                    course_name: item.course_name,
                    course_code: item.course_code,
                    session_date: item.session_date,
                    session_start_time: item.start_time,
                    session_end_time: item.end_time,
                }));
                setHistory(mapped);
            } catch {
                setHistory([]);
            }
        }

        void loadStudentHistory();
    }, [user.role]);

    const columns = useMemo(
        () => [
            {
                key: "time",
                title: "Check-in Time",
                render: (row: AttendanceItem) => new Date(row.check_in_time ?? row.created_at).toLocaleString(),
            },
            {
                key: "session",
                title: "Session",
                render: (row: AttendanceItem) =>
                    row.course_code ? `${row.course_code}${row.course_name ? ` - ${row.course_name}` : ""}` : row.session_id,
            },
            { key: "status", title: "Status", render: (row: AttendanceItem) => row.status },
            {
                key: "confidence",
                title: "Confidence",
                render: (row: AttendanceItem) => (typeof row.confidence_score === "number" ? row.confidence_score.toFixed(2) : "-"),
            },
        ],
        [],
    );

    const totalRecords = history.length;
    const presentCount = history.filter((item) => item.status === "present").length;
    const lateCount = history.filter((item) => item.status === "late").length;

    return (
        <main className="motion-page space-y-4 px-1 py-1 sm:px-2">
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                <header className="flex items-center gap-2 motion-hero rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-5 text-white shadow-lg sm:p-6">
                    <div>
                        <img src={HistoryIcons} width={80} height={80} alt="" />
                    </div>
                    <div>
                        <h1 className="mt-2 text-3xl font-bold sm:text-3xl">Attendance History</h1>
                        <p className="mt-2 text-md text-slate-100 sm:text-base">Track check-in records, confidence trends, and attendance outcomes.</p>
                    </div>
                </header>

                <div className="motion-stagger mt-4 grid gap-3 md:grid-cols-3">
                    <article className="interactive-card rounded-2xl border border-blue-100 bg-blue-50 p-4 shadow-sm">
                        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700"><ClipboardList className="h-4 w-4" /> Records</p>
                        <p className="mt-2 text-2xl font-bold text-blue-900">{totalRecords}</p>
                    </article>
                    <article className="interactive-card rounded-2xl border border-emerald-100 bg-emerald-50 p-4 shadow-sm">
                        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700"><CircleCheckBig className="h-4 w-4" /> Present</p>
                        <p className="mt-2 text-2xl font-bold text-emerald-900">{presentCount}</p>
                    </article>
                    <article className="interactive-card rounded-2xl border border-amber-100 bg-amber-50 p-4 shadow-sm">
                        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700"><Clock3 className="h-4 w-4" /> Late</p>
                        <p className="mt-2 text-2xl font-bold text-amber-900">{lateCount}</p>
                    </article>
                </div>

                <div className="mt-3">
                    <p className="ml-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">List History</p>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-sm">
                    <DataTable columns={columns} rows={history} emptyText="No attendance records yet" />
                </div>
            </section>
        </main>
    );
}
