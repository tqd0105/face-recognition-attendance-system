"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Clock3, CircleCheckBig, Search, RotateCcw, Filter, Info, TriangleAlert } from "lucide-react";
import { DataTable } from "@/components/ui/DataTable";
import { attendanceService } from "@/services/attendance.service";
import { courseService } from "@/services/course.service";
import { sessionService } from "@/services/session.service";
import type { AttendanceItem, StudentAttendanceHistoryItem } from "@/types/models";
import { HistoryIcons } from "@/components/icons";
import { useAuth } from "@/hooks/useAuth";

type HistoryFilters = {
    keyword: string;
    classQuery: string;
    fromDate: string;
    toDate: string;
    status: "all" | "present" | "late" | "absent" | "excused";
};

const initialFilters: HistoryFilters = {
    keyword: "",
    classQuery: "",
    fromDate: "",
    toDate: "",
    status: "all",
};

export default function HistoryPage() {
    const { user } = useAuth();
    const [history, setHistory] = useState<AttendanceItem[]>(() => attendanceService.getLocal());
    const [draftFilters, setDraftFilters] = useState<HistoryFilters>(initialFilters);
    const [appliedFilters, setAppliedFilters] = useState<HistoryFilters>(initialFilters);

    const formatSessionLabel = (row: Pick<AttendanceItem, "course_code" | "course_name" | "session_name" | "session_id" | "session_date" | "session_start_time" | "session_end_time">) => {
        const courseLabel = row.course_code
            ? `${row.course_code}${row.course_name ? ` - ${row.course_name}` : ""}`
            : row.course_name || "Course";
        const sessionLabel = row.session_name?.trim()
            || (row.session_date ? `${row.session_date}${row.session_start_time ? ` ${row.session_start_time}` : ""}${row.session_end_time ? `-${row.session_end_time}` : ""}` : "Session");
        return `${courseLabel} | ${sessionLabel}`;
    };

    function formatHistoryDateTime(value?: string): string {
        if (!value) {
            return "-";
        }

        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return value;
        }

        return new Intl.DateTimeFormat("en-GB", {
            year: "numeric",
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
            timeZone: "Asia/Ho_Chi_Minh",
            timeZoneName: "short",
        }).format(parsed);
    }

    function formatHistoryDate(value?: string): string {
        if (!value) {
            return "-";
        }

        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return value;
        }

        return new Intl.DateTimeFormat("en-GB", {
            year: "numeric",
            month: "short",
            day: "2-digit",
            timeZone: "Asia/Ho_Chi_Minh",
        }).format(parsed);
    }

    function formatTime(value?: string): string {
        if (!value) {
            return "--:--";
        }

        const raw = String(value).trim();
        const match = raw.match(/^(\d{2}:\d{2})/);
        if (match) {
            return match[1];
        }

        const parsed = new Date(raw);
        if (Number.isNaN(parsed.getTime())) {
            return raw.slice(0, 5);
        }

        return new Intl.DateTimeFormat("en-GB", {
            timeZone: "Asia/Ho_Chi_Minh",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        }).format(parsed);
    }

    function normalizeText(value?: string): string {
        return String(value || "").trim().toLowerCase();
    }

    function getRecordTime(row: AttendanceItem): number {
        const parsed = new Date(row.check_in_time ?? row.created_at).getTime();
        return Number.isNaN(parsed) ? 0 : parsed;
    }

    const classSuggestions = useMemo(() => {
        const items = history
            .map((row) => [row.home_class_code, row.course_code, row.course_name, row.home_class_major, row.home_class_department]
                .filter(Boolean)
                .join(" • "))
            .filter(Boolean);
        return Array.from(new Set(items)).sort((a, b) => a.localeCompare(b));
    }, [history]);

    const filteredHistory = useMemo(() => {
        const keyword = normalizeText(appliedFilters.keyword);
        const classQuery = normalizeText(appliedFilters.classQuery);
        const fromTs = appliedFilters.fromDate ? new Date(`${appliedFilters.fromDate}T00:00:00`).getTime() : null;
        const toTs = appliedFilters.toDate ? new Date(`${appliedFilters.toDate}T23:59:59.999`).getTime() : null;

        return history.filter((row) => {
            const recordTime = getRecordTime(row);

            if (fromTs !== null && !Number.isNaN(fromTs) && recordTime && recordTime < fromTs) {
                return false;
            }

            if (toTs !== null && !Number.isNaN(toTs) && recordTime && recordTime > toTs) {
                return false;
            }

            if (appliedFilters.status !== "all" && row.status !== appliedFilters.status) {
                return false;
            }

            if (keyword) {
                const searchable = [
                    row.student_code,
                    row.student_name,
                    row.course_code,
                    row.course_name,
                    row.home_class_code,
                    row.home_class_major,
                    row.home_class_department,
                    row.teacher_name,
                    row.session_name,
                    row.session_date,
                    row.session_start_time,
                    row.session_end_time,
                    row.session_status,
                    row.status,
                    formatSessionLabel(row),
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();

                if (!searchable.includes(keyword)) {
                    return false;
                }
            }

            if (classQuery) {
                const classText = [
                    row.home_class_code,
                    row.course_code,
                    row.course_name,
                    row.home_class_major,
                    row.home_class_department,
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();

                if (!classText.includes(classQuery)) {
                    return false;
                }
            }

            return true;
        });
    }, [appliedFilters, history]);

    useEffect(() => {
        async function loadHistory() {
            if (user.role === "student") {
                try {
                    const rows: StudentAttendanceHistoryItem[] = await attendanceService.getMyHistory();
                    const mapped: AttendanceItem[] = rows.map((item) => ({
                        id: String(item.attendance_id),
                        session_id: Number(item.session_id ?? 0),
                        student_id: 0,
                        status: item.status,
                        confidence_score: item.confidence_score,
                        check_in_time: item.check_in_time ?? new Date().toISOString(),
                        created_at: item.check_in_time ?? new Date().toISOString(),
                        course_name: item.course_name,
                        course_code: item.course_code,
                        session_name: item.session_name,
                        session_date: item.session_date,
                        session_start_time: item.start_time,
                        session_end_time: item.end_time,
                        student_code: item.student_code,
                        student_name: item.student_name,
                    }));
                    setHistory(mapped);
                } catch {
                    setHistory([]);
                }
                return;
            }

            try {
                const courses = await courseService.getAll();
                const courseIds = courses.map((item) => Number(item.id)).filter((id) => Number.isFinite(id) && id > 0);
                if (courseIds.length === 0) {
                    setHistory([]);
                    return;
                }
                const sessions = await sessionService.getAll(courseIds);
                if (sessions.length === 0) {
                    setHistory([]);
                    return;
                }
                const attendanceRows = await Promise.all(
                    sessions.map((session) => attendanceService.getBySession(Number(session.id)).catch(() => []))
                );
                const merged = attendanceRows.flat();
                merged.sort((a, b) => {
                    const aTime = new Date(a.check_in_time ?? a.created_at).getTime();
                    const bTime = new Date(b.check_in_time ?? b.created_at).getTime();
                    return bTime - aTime;
                });
                setHistory(merged);
            } catch {
                setHistory([]);
            }
            return;
        }

        void loadHistory();
    }, [user.role]);

    const columns = useMemo(() => {
        const baseColumns = [
            {
                key: "time",
                title: "Check-in Time",
                render: (row: AttendanceItem) => formatHistoryDateTime(row.check_in_time ?? row.created_at),
            },
        ];

        if (user.role !== "student") {
            baseColumns.push({
                key: "student",
                title: "Student",
                render: (row: AttendanceItem) =>
                    row.student_code
                        ? `${row.student_code}${row.student_name ? ` - ${row.student_name}` : ""}`
                        : row.student_name || "-",
            });
        }

        baseColumns.push({
            key: "session",
            title: "Session",
            render: (row: AttendanceItem) => formatSessionLabel(row),
        });

        baseColumns.push(
            { key: "status", title: "Status", render: (row: AttendanceItem) => row.status },
            {
                key: "confidence",
                title: "Confidence",
                render: (row: AttendanceItem) => (typeof row.confidence_score === "number" ? row.confidence_score.toFixed(2) : "-"),
            },
        );

        return baseColumns;
    }, [user.role]);

    const totalRecords = filteredHistory.length;
    const presentCount = filteredHistory.filter((item) => item.status === "present").length;
    const lateCount = filteredHistory.filter((item) => item.status === "late").length;
    const hasActiveFilters = useMemo(() => {
        return Boolean(
            appliedFilters.keyword.trim()
            || appliedFilters.classQuery.trim()
            || appliedFilters.fromDate
            || appliedFilters.toDate
            || appliedFilters.status !== "all"
        );
    }, [appliedFilters]);

    function applyFilters(event?: React.FormEvent<HTMLFormElement>) {
        event?.preventDefault();
        setAppliedFilters({ ...draftFilters });
    }

    function resetFilters() {
        setDraftFilters(initialFilters);
        setAppliedFilters(initialFilters);
    }

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

                <form className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm" onSubmit={applyFilters}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                <Filter className="h-4 w-4" /> Search & Filter
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                                Search by time, class, student, teacher, session name, or status.
                            </p>
                        </div>
                        <p className="text-xs font-semibold text-slate-500">
                            Showing {filteredHistory.length} of {history.length} records
                        </p>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <div>
                            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600" htmlFor="history-keyword">Keyword</label>
                            <input
                                id="history-keyword"
                                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                                value={draftFilters.keyword}
                                onChange={(event) => setDraftFilters((prev) => ({ ...prev, keyword: event.target.value }))}
                                placeholder="Student, teacher, session, status..."
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600" htmlFor="history-class">Class / Course</label>
                            <input
                                id="history-class"
                                list="history-class-options"
                                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                                value={draftFilters.classQuery}
                                onChange={(event) => setDraftFilters((prev) => ({ ...prev, classQuery: event.target.value }))}
                                placeholder="Class code, course code, or course name"
                            />
                            <datalist id="history-class-options">
                                {classSuggestions.map((item) => (
                                    <option key={item} value={item} />
                                ))}
                            </datalist>
                        </div>

                        <div>
                            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600" htmlFor="history-from">From date</label>
                            <input
                                id="history-from"
                                type="date"
                                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                                value={draftFilters.fromDate}
                                onChange={(event) => setDraftFilters((prev) => ({ ...prev, fromDate: event.target.value }))}
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600" htmlFor="history-to">To date</label>
                            <input
                                id="history-to"
                                type="date"
                                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                                value={draftFilters.toDate}
                                onChange={(event) => setDraftFilters((prev) => ({ ...prev, toDate: event.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-end gap-3">
                        <div className="min-w-[180px] flex-1">
                            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600" htmlFor="history-status">Status</label>
                            <select
                                id="history-status"
                                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                                value={draftFilters.status}
                                onChange={(event) => setDraftFilters((prev) => ({ ...prev, status: event.target.value as HistoryFilters["status"] }))}
                            >
                                <option value="all">All status</option>
                                <option value="present">Present</option>
                                <option value="late">Late</option>
                                <option value="absent">Absent</option>
                                <option value="excused">Excused</option>
                            </select>
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="submit"
                                className="interactive-btn inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                            >
                                <Search className="h-4 w-4" /> Tra cứu
                            </button>
                            <button
                                type="button"
                                className="interactive-btn inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                                onClick={resetFilters}
                            >
                                <RotateCcw className="h-4 w-4" /> Reset
                            </button>
                        </div>
                    </div>
                </form>

                <div className="mt-3">
                    <p className="ml-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Attendance Records</p>
                </div>

                <div
                    className={`mt-3 rounded-2xl border p-4 shadow-sm ${totalRecords > 0
                        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                        : "border-amber-200 bg-amber-50 text-amber-900"
                        }`}
                    role="status"
                    aria-live="polite"
                >
                    <div className="flex items-start gap-3">
                        {totalRecords > 0 ? (
                            <Info className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                        ) : (
                            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                        )}
                        <div className="space-y-1">
                            <p className="font-semibold">
                                {totalRecords > 0
                                    ? `Tìm thấy ${totalRecords} kết quả phù hợp${hasActiveFilters ? " với bộ lọc hiện tại" : ""}.`
                                    : hasActiveFilters
                                        ? "Không có kết quả nào khớp với bộ lọc hiện tại."
                                        : "Chưa có dữ liệu điểm danh để hiển thị."}
                            </p>
                            <p className="text-sm opacity-90">
                                {totalRecords > 0
                                    ? "Bạn có thể đổi bộ lọc để thu hẹp hoặc mở rộng phạm vi tra cứu."
                                    : hasActiveFilters
                                        ? "Hãy thử nới điều kiện thời gian, lớp học hoặc trạng thái để xem thêm dữ liệu."
                                        : "Sau khi có dữ liệu điểm danh, danh sách sẽ xuất hiện ở đây."}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-sm">
                    <DataTable columns={columns} rows={filteredHistory} emptyText="No attendance records match your filters" />
                </div>
            </section>
        </main>
    );
}
