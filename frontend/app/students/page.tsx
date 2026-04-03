"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Users, Mail, BadgeCheck, Pencil, RotateCcw, Trash2, UserX, CalendarDays, Clock3, BookOpenText, CheckCheckIcon, AlertTriangleIcon } from "lucide-react";
import { DataTable } from "@/components/ui/DataTable";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { attendanceService } from "@/services/attendance.service";
import { biometricService } from "@/services/biometric.service";
import { classService } from "@/services/class.service";
import { courseService } from "@/services/course.service";
import { sessionService } from "@/services/session.service";
import { studentService } from "@/services/student.service";
import type { AttendanceItem, ClassItem, CreateStudentPayload, Session, Student, StudentAttendanceHistoryItem } from "@/types/models";
import { StudentIcons } from "@/components/icons";

export default function StudentsPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [homeClasses, setHomeClasses] = useState<ClassItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [modalError, setModalError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [editingStudentId, setEditingStudentId] = useState<number | null>(null);
    const [pendingDeleteStudent, setPendingDeleteStudent] = useState<Student | null>(null);
    const [pendingAction, setPendingAction] = useState<"deactivate" | "restore" | "hard-delete">("deactivate");
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("active");
    const [sessionOptions, setSessionOptions] = useState<Session[]>([]);
    const [selectedSessionId, setSelectedSessionId] = useState("");
    const [attendanceByStudent, setAttendanceByStudent] = useState<Record<number, AttendanceItem["status"]>>({});
    const [historyModalStudent, setHistoryModalStudent] = useState<Student | null>(null);
    const [historyRows, setHistoryRows] = useState<StudentAttendanceHistoryItem[]>([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [faceModalStudent, setFaceModalStudent] = useState<Student | null>(null);
    const [faceRows, setFaceRows] = useState<Array<{ id: number; studentId: number; qualityScore?: number; createdAt?: string }>>([]);
    const [isFaceLoading, setIsFaceLoading] = useState(false);
    const [isFaceDeleting, setIsFaceDeleting] = useState(false);
    const [faceError, setFaceError] = useState<string | null>(null);
    const [pendingFaceDelete, setPendingFaceDelete] = useState<{
        mode: "all" | "single";
        student: Student;
        enrollmentId?: number;
    } | null>(null);

    const [form, setForm] = useState<CreateStudentPayload>({
        student_code: "",
        name: "",
        email: "",
    });

    const loadStudents = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await studentService.getAll();
            setStudents(data);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Cannot load students";
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadStudents();

        async function loadHomeClasses() {
            try {
                const data = await classService.getAll();
                setHomeClasses(data);
            } catch {
                setHomeClasses([]);
            }
        }

        void loadHomeClasses();

        async function loadSessionsForAttendance() {
            try {
                const courses = await courseService.getAll();
                const courseIds = courses.map((item) => Number(item.id)).filter((id) => Number.isFinite(id) && id > 0);
                if (courseIds.length === 0) {
                    setSessionOptions([]);
                    setSelectedSessionId("");
                    return;
                }

                const sessionItems = await sessionService.getAll(courseIds);
                setSessionOptions(sessionItems);
                const preferred = sessionItems.find((item) => item.status === "active") ?? sessionItems[0];
                setSelectedSessionId(preferred ? String(preferred.id) : "");
            } catch {
                setSessionOptions([]);
                setSelectedSessionId("");
            }
        }

        void loadSessionsForAttendance();
    }, [loadStudents]);

    useEffect(() => {
        async function loadAttendanceStatusBySession() {
            if (!selectedSessionId.trim()) {
                setAttendanceByStudent({});
                return;
            }

            try {
                const records = await attendanceService.getBySession(Number(selectedSessionId));
                const nextMap: Record<number, AttendanceItem["status"]> = {};
                records.forEach((item) => {
                    const sid = Number(item.student_id);
                    if (Number.isFinite(sid) && sid > 0 && !nextMap[sid]) {
                        nextMap[sid] = item.status;
                    }
                });
                setAttendanceByStudent(nextMap);
            } catch {
                setAttendanceByStudent({});
            }
        }

        void loadAttendanceStatusBySession();
    }, [selectedSessionId]);

    const homeClassCodeMap = useMemo(() => {
        return new Map(homeClasses.map((item) => [Number(item.id), item.class_code ?? `Class #${item.id}`]));
    }, [homeClasses]);

    const visibleStudents = useMemo(() => {
        if (statusFilter === "all") {
            return students;
        }
        return students.filter((item) => (item.status ?? "active") === statusFilter);
    }, [statusFilter, students]);

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!form.student_code.trim() || !form.name.trim()) {
            return;
        }

        setModalError(null);

        const normalizedCode = form.student_code.trim().toLowerCase();
        const normalizedEmail = form.email?.trim().toLowerCase();

        const duplicatedCode = students.some((item) => item.id !== editingStudentId && item.student_code?.trim().toLowerCase() === normalizedCode);
        if (duplicatedCode) {
            setModalError("Student code already exists. Please use another code.");
            return;
        }

        if (normalizedEmail) {
            const duplicatedEmail = students.some((item) => item.id !== editingStudentId && item.email?.trim().toLowerCase() === normalizedEmail);
            if (duplicatedEmail) {
                setModalError("Email already exists. Please use another email.");
                return;
            }
        }

        try {
            setIsCreating(true);
            setModalError(null);
            if (editingStudentId) {
                await studentService.update(editingStudentId, form);
            } else {
                await studentService.create(form);
            }
            setIsModalOpen(false);
            setEditingStudentId(null);
            setForm({ student_code: "", name: "", email: "", home_class_id: undefined });
            await loadStudents();
        } catch (err) {
            const message = err instanceof Error ? err.message : "Cannot create student";
            setModalError(message);
        } finally {
            setIsCreating(false);
        }
    }

    const onDeleteStudent = useCallback((student: Student) => {
        setPendingAction("deactivate");
        setPendingDeleteStudent(student);
    }, []);

    const onRestoreStudent = useCallback((student: Student) => {
        setPendingAction("restore");
        setPendingDeleteStudent(student);
    }, []);

    const onHardDeleteStudent = useCallback((student: Student) => {
        setPendingAction("hard-delete");
        setPendingDeleteStudent(student);
    }, []);

    const onConfirmDeleteStudent = useCallback(async () => {
        if (!pendingDeleteStudent) {
            return;
        }

        try {
            setIsDeleting(true);
            setError(null);
            if (pendingAction === "restore") {
                await studentService.restore(pendingDeleteStudent.id);
            } else if (pendingAction === "hard-delete") {
                await studentService.hardDelete(pendingDeleteStudent.id);
            } else {
                await studentService.remove(pendingDeleteStudent.id);
            }
            setPendingDeleteStudent(null);
            await loadStudents();
        } catch (err) {
            const message = err instanceof Error
                ? err.message
                : pendingAction === "restore"
                    ? "Cannot restore student"
                    : pendingAction === "hard-delete"
                        ? "Cannot permanently delete student"
                        : "Cannot deactivate student";
            setError(message);
        } finally {
            setIsDeleting(false);
        }
    }, [loadStudents, pendingAction, pendingDeleteStudent]);

    const onEditStudent = useCallback((student: Student) => {
        setModalError(null);
        setEditingStudentId(student.id);
        setForm({
            student_code: student.student_code ?? "",
            name: student.name,
            email: student.email ?? "",
            home_class_id: student.home_class_id ?? student.class_id,
        });
        setIsModalOpen(true);
    }, []);

    const openHistoryModal = useCallback(async (student: Student) => {
        setHistoryModalStudent(student);
        setHistoryRows([]);
        setIsHistoryLoading(true);
        try {
            const rows = await attendanceService.getStudentHistory(student.id);
            setHistoryRows(rows);
        } catch {
            setHistoryRows([]);
        } finally {
            setIsHistoryLoading(false);
        }
    }, []);

    const openFaceModal = useCallback(async (student: Student) => {
        setFaceModalStudent(student);
        setFaceRows([]);
        setFaceError(null);
        setIsFaceLoading(true);
        try {
            const rows = await biometricService.getEnrollmentHistory(student.id);
            setFaceRows(rows);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Cannot load face enrollment records";
            setFaceError(message);
            setFaceRows([]);
        } finally {
            setIsFaceLoading(false);
        }
    }, []);

    const onConfirmFaceDelete = useCallback(async () => {
        if (!pendingFaceDelete) {
            return;
        }

        try {
            setIsFaceDeleting(true);
            setFaceError(null);

            if (pendingFaceDelete.mode === "all") {
                await biometricService.deleteAllEnrollments(pendingFaceDelete.student.id);
            } else if (pendingFaceDelete.enrollmentId) {
                await biometricService.deleteEnrollmentById(pendingFaceDelete.enrollmentId);
            }

            const refreshed = await biometricService.getEnrollmentHistory(pendingFaceDelete.student.id);
            setFaceRows(refreshed);
            setPendingFaceDelete(null);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Cannot delete face enrollment records";
            setFaceError(message);
        } finally {
            setIsFaceDeleting(false);
        }
    }, [pendingFaceDelete]);

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

    function formatHistorySessionDate(value?: string): string {
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

    function getHistoryStatusClass(status?: string): string {
        if (status === "present") {
            return "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700";
        }
        if (status === "late") {
            return "rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700";
        }
        return "rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700";
    }

    const columns = useMemo(
        () => [
            { key: "code", title: "Student Code", render: (row: Student) => row.student_code ?? "-" },
            { key: "name", title: "Name", render: (row: Student) => row.name },
            { key: "email", title: "Email", render: (row: Student) => row.email ?? "-" },
            {
                key: "homeClass",
                title: "Home Class",
                render: (row: Student) => {
                    const classId = Number(row.home_class_id ?? row.class_id ?? 0);
                    if (!classId) {
                        return "-";
                    }
                    return homeClassCodeMap.get(classId) ?? `Class #${classId}`;
                },
            },
            { key: "status", title: "Status", render: (row: Student) => row.status ?? "active" },
            {
                key: "attendance",
                title: "Attendance",
                render: (row: Student) => {
                    const state = attendanceByStudent[row.id];
                    if (!state) {
                        return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">Not checked</span>;
                    }

                    if (state === "present") {
                        return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Present</span>;
                    }

                    if (state === "late") {
                        return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Late</span>;
                    }

                    return <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">Absent</span>;
                },
            },
            {
                key: "actions",
                title: "Actions",
                render: (row: Student) => (
                    <div
                        className="flex items-center gap-1.5"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                            onClick={() => {
                                void openFaceModal(row);
                            }}
                            title="Manage face enrollments"
                            aria-label="Manage face enrollments"
                        >
                            <AlertTriangleIcon className="h-3.5 w-3.5" />
                        </button>
                        <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                            onClick={() => onEditStudent(row)}
                            title="Edit student"
                            aria-label="Edit student"
                        >
                            <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {(row.status ?? "active") === "inactive" ? (
                            <>
                                <button
                                    type="button"
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                    onClick={() => onRestoreStudent(row)}
                                    title="Restore student"
                                    aria-label="Restore student"
                                >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    type="button"
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100"
                                    onClick={() => onHardDeleteStudent(row)}
                                    title="Delete student permanently"
                                    aria-label="Delete student permanently"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </>
                        ) : (
                            <button
                                type="button"
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100"
                                onClick={() => onDeleteStudent(row)}
                                title="Deactivate student"
                                aria-label="Deactivate student"
                            >
                                <UserX className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                ),
            },
        ],
        [attendanceByStudent, homeClassCodeMap, onDeleteStudent, onEditStudent, onHardDeleteStudent, onRestoreStudent, openFaceModal],
    );

    const totalStudents = students.length;
    const studentsWithEmail = visibleStudents.filter((item) => Boolean(item.email?.trim())).length;
    const activeStudents = students.filter((item) => (item.status ?? "active") === "active").length;
    const inactiveStudents = students.filter((item) => (item.status ?? "active") === "inactive").length;
    const checkedInCount = visibleStudents.filter((item) => Boolean(attendanceByStudent[item.id])).length;
    const historyStats = useMemo(() => {
        const total = historyRows.length;
        const present = historyRows.filter((item) => item.status === "present").length;
        const late = historyRows.filter((item) => item.status === "late").length;
        const absent = historyRows.filter((item) => item.status === "absent").length;
        return { total, present, late, absent };
    }, [historyRows]);

    return (
        <main className="motion-page space-y-4 px-1 py-1 sm:px-2">
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                <header className="flex items-center gap-2 motion-hero rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-5 text-white shadow-lg sm:p-6">
                    <div>
                        <img src={StudentIcons} width={80} height={80} alt="" />
                    </div>
                    <div>
                        <h1 className="mt-2 text-3xl font-bold sm:text-3xl">Student Management</h1>
                        <p className="mt-2 text-md text-slate-100 sm:text-base">Manage student information, class assignments, and student identity records.</p>
                    </div>
                </header>

                <div className="motion-stagger mt-4 grid gap-3 md:grid-cols-4">
                    <article className="interactive-card rounded-2xl border border-blue-100 bg-blue-50 p-4 shadow-sm">
                        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700"><Users className="h-4 w-4" /> Total Students</p>
                        <p className="mt-2 text-2xl font-bold text-blue-900">{totalStudents}</p>
                    </article>
                    <article className="interactive-card rounded-2xl border border-indigo-100 bg-indigo-50 p-4 shadow-sm">
                        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700"><Mail className="h-4 w-4" /> Email Coverage</p>
                        <p className="mt-2 text-2xl font-bold text-indigo-900">{studentsWithEmail}</p>
                    </article>
                    <article className="interactive-card rounded-2xl border border-emerald-100 bg-emerald-50 p-4 shadow-sm">
                        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700"><BadgeCheck className="h-4 w-4" /> Active</p>
                        <p className="mt-2 text-2xl font-bold text-emerald-900">{activeStudents}</p>
                    </article>
                    <article className="interactive-card rounded-2xl border border-cyan-100 bg-cyan-50 p-4 shadow-sm">
                        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700"><BadgeCheck className="h-4 w-4" /> Checked-in</p>
                        <p className="mt-2 text-2xl font-bold text-cyan-900">{checkedInCount}</p>
                    </article>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
                    <div className="ml-4">
                        <p className=" text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">List Student</p>
                        <div className="mt-2 max-w-xs">
                            <select
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
                                value={selectedSessionId}
                                onChange={(event) => setSelectedSessionId(event.target.value)}
                            >
                                <option value="">Attendance: no session selected</option>
                                {sessionOptions.map((item) => (
                                    <option key={item.id} value={String(item.id)}>
                                        Session #{item.id} - {item.session_date || "No date"}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                            <button
                                type="button"
                                className={`rounded-lg border px-3 py-1 text-xs font-semibold transition ${statusFilter === "active"
                                    ? "border-blue-600 bg-blue-600 text-white"
                                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                                    }`}
                                onClick={() => setStatusFilter("active")}
                            >
                                Active ({activeStudents})
                            </button>
                            <button
                                type="button"
                                className={`rounded-lg border px-3 py-1 text-xs font-semibold transition ${statusFilter === "inactive"
                                    ? "border-amber-600 bg-amber-600 text-white"
                                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                                    }`}
                                onClick={() => setStatusFilter("inactive")}
                            >
                                Inactive ({inactiveStudents})
                            </button>
                            <button
                                type="button"
                                className={`rounded-lg border px-3 py-1 text-xs font-semibold transition ${statusFilter === "all"
                                    ? "border-indigo-600 bg-indigo-600 text-white"
                                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                                    }`}
                                onClick={() => setStatusFilter("all")}
                            >
                                All ({students.length})
                            </button>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="interactive-btn inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                        onClick={() => {
                            setModalError(null);
                            setEditingStudentId(null);
                            setForm({ student_code: "", name: "", email: "", home_class_id: undefined });
                            setIsModalOpen(true);
                        }}
                    >
                        <Plus className="h-4 w-4" /> Add Student
                    </button>
                </div>

                <div className="mt-4 md:rounded-2xl md:border md:border-slate-200 md:bg-slate-50 md:p-3 md:shadow-sm">
                    {isLoading && <LoadingState label="Loading student table..." />}
                    {!isLoading && error && <ErrorState label={error} />}
                    {!isLoading && !error && (
                        <DataTable
                            columns={columns}
                            rows={visibleStudents}
                            emptyText="No students found"
                            onRowClick={(row) => {
                                void openHistoryModal(row);
                            }}
                        />
                    )}
                </div>
            </section>

            <Modal
                open={Boolean(historyModalStudent)}
                title={historyModalStudent ? `Attendance History: ${historyModalStudent.name}` : "Attendance History"}
                onClose={() => {
                    setHistoryModalStudent(null);
                    setHistoryRows([]);
                }}
            >
                {isHistoryLoading ? (
                    <LoadingState label="Loading attendance history..." />
                ) : historyRows.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-center">
                        <p className="text-sm font-semibold text-slate-700">No attendance records yet</p>
                        <p className="mt-1 text-xs text-slate-500">This student has no attendance history in the selected data scope.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <section className="rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-900 to-cyan-900 px-4 py-3 text-white">
                            <p className="text-lg font-bold">{historyModalStudent?.name}</p>
                            <p className="mt-1 text-xs text-slate-200">
                                {historyModalStudent?.student_code ?? "No code"}
                                {historyModalStudent?.home_class_id
                                    ? ` | ${homeClassCodeMap.get(Number(historyModalStudent.home_class_id)) ?? `Class #${historyModalStudent.home_class_id}`}`
                                    : ""}
                                {historyModalStudent?.email ? ` | ${historyModalStudent.email}` : ""}
                            </p>
                        </section>

                        <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            <article className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-center">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-700">Records</p>
                                <p className="mt-1 text-lg font-bold text-blue-900">{historyStats.total}</p>
                            </article>
                            <article className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-center">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">Present</p>
                                <p className="mt-1 text-lg font-bold text-emerald-900">{historyStats.present}</p>
                            </article>
                            <article className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700">Late</p>
                                <p className="mt-1 text-lg font-bold text-amber-900">{historyStats.late}</p>
                            </article>
                            <article className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-center">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-700">Absent</p>
                                <p className="mt-1 text-lg font-bold text-rose-900">{historyStats.absent}</p>
                            </article>
                        </section>

                        <ul className="grid gap-2.5">
                            {historyRows.map((item) => (
                                <li key={`${item.attendance_id}-${item.check_in_time ?? "none"}`} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm">
                                    <div className="flex items-start justify-between gap-3">
                                        <p className="font-semibold text-slate-900">{item.course_code ?? "Course"}{item.course_name ? ` - ${item.course_name}` : ""}</p>
                                        <span className={getHistoryStatusClass(item.status)}>{item.status?.toUpperCase() ?? "UNKNOWN"}</span>
                                    </div>
                                    <div className="mt-2 grid gap-1 text-xs text-slate-600">
                                        <p className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-indigo-600" /> Session: {formatHistorySessionDate(item.session_date)} | {item.start_time ?? "--:--"} - {item.end_time ?? "--:--"}</p>
                                        <p className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5 text-cyan-600" /> Check-in: {formatHistoryDateTime(item.check_in_time)}</p>
                                        <p className="inline-flex items-center gap-1.5"><BookOpenText className="h-3.5 w-3.5 text-blue-600" /> Attendance ID: {item.attendance_id}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </Modal>

            <Modal
                open={Boolean(faceModalStudent)}
                title={faceModalStudent ? `Face Records: ${faceModalStudent.name}` : "Face Records"}
                onClose={() => {
                    setFaceModalStudent(null);
                    setFaceRows([]);
                    setFaceError(null);
                }}
            >
                <div className="grid gap-3">
                    {faceError && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
                            {faceError}
                        </div>
                    )}

                    <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <p className="text-sm font-semibold text-slate-700">
                            Total records: <span className="text-slate-900">{faceRows.length}</span>
                        </p>
                        <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                            onClick={() => {
                                if (!faceModalStudent) {
                                    return;
                                }
                                setPendingFaceDelete({ mode: "all", student: faceModalStudent });
                            }}
                            disabled={!faceModalStudent || faceRows.length === 0 || isFaceLoading || isFaceDeleting}
                        >
                            Delete All Face Records
                        </button>
                    </div>

                    {isFaceLoading ? (
                        <LoadingState label="Loading face records..." />
                    ) : faceRows.length === 0 ? (
                        <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
                            No face enrollment records for this student.
                        </div>
                    ) : (
                        <ul className="grid gap-2">
                            {faceRows.map((item, index) => (
                                <li key={`${item.id}-${index}`} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">
                                            {item.createdAt ? formatHistoryDateTime(item.createdAt) : "Unknown time"}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            Quality: {typeof item.qualityScore === "number" ? `${(item.qualityScore * 100).toFixed(1)}%` : "N/A"}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100"
                                        onClick={() => {
                                            if (!faceModalStudent) {
                                                return;
                                            }
                                            setPendingFaceDelete({ mode: "single", student: faceModalStudent, enrollmentId: item.id });
                                        }}
                                        title="Delete this face record"
                                        aria-label="Delete this face record"
                                        disabled={isFaceDeleting}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </Modal>

            <Modal
                open={isModalOpen}
                title={editingStudentId ? "Edit Student" : "Add Student"}
                onClose={() => {
                    setModalError(null);
                    setEditingStudentId(null);
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
                        <label className="text-sm font-semibold text-slate-700" htmlFor="student-code">
                            Student Code
                        </label>
                        <input
                            id="student-code"
                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            value={form.student_code}
                            onChange={(e) => setForm((prev) => ({ ...prev, student_code: e.target.value }))}
                            required
                        />
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-slate-700" htmlFor="student-name">
                            Name
                        </label>
                        <input
                            id="student-name"
                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            value={form.name}
                            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                            required
                        />
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-slate-700" htmlFor="student-home-class-id">
                            Home Class
                        </label>
                        <select
                            id="student-home-class-id"
                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            value={form.home_class_id ?? ""}
                            onChange={(e) => setForm((prev) => ({ ...prev, home_class_id: e.target.value ? Number(e.target.value) : undefined }))}
                        >
                            <option value="">No class</option>
                            {homeClasses.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.class_code ?? `Class #${item.id}`} - {item.major ?? "Major"}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-slate-700" htmlFor="student-email">
                            Email
                        </label>
                        <input
                            id="student-email"
                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            value={form.email ?? ""}
                            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                        />
                    </div>
                    <button
                        type="submit"
                        className="interactive-btn inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                        disabled={isCreating}
                    >
                        {isCreating ? "Saving..." : editingStudentId ? "Update Student" : "Save Student"}
                    </button>
                </form>
            </Modal>

            <ConfirmDialog
                open={Boolean(pendingDeleteStudent)}
                title={
                    pendingAction === "restore"
                        ? "Restore Student"
                        : pendingAction === "hard-delete"
                            ? "Delete Student Permanently"
                            : "Deactivate Student"
                }
                message={
                    pendingAction === "restore"
                        ? `Restore ${pendingDeleteStudent?.student_code ?? pendingDeleteStudent?.name ?? "this student"} back to active list?`
                        : pendingAction === "hard-delete"
                            ? `Permanently delete ${pendingDeleteStudent?.student_code ?? pendingDeleteStudent?.name ?? "this student"}? This will remove related data and cannot be undone.`
                            : `Deactivate ${pendingDeleteStudent?.student_code ?? pendingDeleteStudent?.name ?? "this student"}? This student will be hidden from active list.`
                }
                onConfirm={onConfirmDeleteStudent}
                onClose={() => {
                    if (!isDeleting) {
                        setPendingDeleteStudent(null);
                    }
                }}
                confirmText={
                    pendingAction === "restore"
                        ? "Restore Student"
                        : pendingAction === "hard-delete"
                            ? "Delete Permanently"
                            : "Deactivate Student"
                }
                isLoading={isDeleting}
            />

            <ConfirmDialog
                open={Boolean(pendingFaceDelete)}
                title={pendingFaceDelete?.mode === "all" ? "Delete All Face Records" : "Delete Face Record"}
                message={pendingFaceDelete?.mode === "all"
                    ? `Delete all face enrollment records for ${pendingFaceDelete?.student.student_code ?? pendingFaceDelete?.student.name ?? "this student"}?`
                    : `Delete selected face enrollment record for ${pendingFaceDelete?.student.student_code ?? pendingFaceDelete?.student.name ?? "this student"}?`}
                onConfirm={() => {
                    void onConfirmFaceDelete();
                }}
                onClose={() => {
                    if (!isFaceDeleting) {
                        setPendingFaceDelete(null);
                    }
                }}
                confirmText={pendingFaceDelete?.mode === "all" ? "Delete All" : "Delete Record"}
                isLoading={isFaceDeleting}
            />
        </main>
    );
}
