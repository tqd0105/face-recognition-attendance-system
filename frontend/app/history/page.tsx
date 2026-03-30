"use client";

import { useMemo, useState } from "react";
import { DataTable } from "@/components/ui/DataTable";
import { attendanceService } from "@/services/attendance.service";
import type { AttendanceItem } from "@/types/models";

export default function HistoryPage() {
    const [history] = useState<AttendanceItem[]>(() => attendanceService.getLocal());

    const columns = useMemo(
        () => [
            {
                key: "time",
                title: "Check-in Time",
                render: (row: AttendanceItem) => new Date(row.check_in_time ?? row.created_at).toLocaleString(),
            },
            { key: "session", title: "Session ID", render: (row: AttendanceItem) => row.session_id },
            { key: "student", title: "Student ID", render: (row: AttendanceItem) => row.student_id },
            { key: "status", title: "Status", render: (row: AttendanceItem) => row.status },
            {
                key: "confidence",
                title: "Confidence",
                render: (row: AttendanceItem) => (typeof row.confidence_score === "number" ? row.confidence_score.toFixed(2) : "-"),
            },
        ],
        [],
    );

    return (
        <main className="motion-page space-y-4 px-1 py-1 sm:px-2">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Monitoring</p>
                <h1 className="text-2xl font-bold text-slate-900">Attendance History</h1>

                <div className="mt-4">
                    <DataTable columns={columns} rows={history} emptyText="No attendance records yet" />
                </div>
            </section>
        </main>
    );
}
