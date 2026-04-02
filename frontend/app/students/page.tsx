"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Users, Mail, BadgeCheck, Pencil, RotateCcw, Trash2, UserX } from "lucide-react";
import { DataTable } from "@/components/ui/DataTable";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { classService } from "@/services/class.service";
import { studentService } from "@/services/student.service";
import type { ClassItem, CreateStudentPayload, Student } from "@/types/models";
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
    }, [loadStudents]);

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
                key: "actions",
                title: "Actions",
                render: (row: Student) => (
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 xl:h-auto xl:w-auto xl:gap-1 xl:px-2.5 xl:py-1"
                            onClick={() => onEditStudent(row)}
                            title="Edit student"
                            aria-label="Edit student"
                        >
                            <Pencil className="h-3.5 w-3.5" />
                            <span className="hidden 2xl:inline text-xs font-semibold">Edit</span>
                        </button>
                        {(row.status ?? "active") === "inactive" ? (
                            <>
                                <button
                                    type="button"
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 xl:h-auto xl:w-auto xl:gap-1 xl:px-2.5 xl:py-1"
                                    onClick={() => onRestoreStudent(row)}
                                    title="Restore student"
                                    aria-label="Restore student"
                                >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    <span className="hidden 2xl:inline text-xs font-semibold">Restore</span>
                                </button>
                                <button
                                    type="button"
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 xl:h-auto xl:w-auto xl:gap-1 xl:px-2.5 xl:py-1"
                                    onClick={() => onHardDeleteStudent(row)}
                                    title="Delete student permanently"
                                    aria-label="Delete student permanently"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    <span className="hidden 2xl:inline text-xs font-semibold">Delete Permanently</span>
                                </button>
                            </>
                        ) : (
                            <button
                                type="button"
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 xl:h-auto xl:w-auto xl:gap-1 xl:px-2.5 xl:py-1"
                                onClick={() => onDeleteStudent(row)}
                                title="Deactivate student"
                                aria-label="Deactivate student"
                            >
                                <UserX className="h-3.5 w-3.5" />
                                <span className="hidden 2xl:inline text-xs font-semibold">Deactivate</span>
                            </button>
                        )}
                    </div>
                ),
            },
        ],
        [homeClassCodeMap, onDeleteStudent, onEditStudent, onHardDeleteStudent, onRestoreStudent],
    );

    const totalStudents = students.length;
    const studentsWithEmail = visibleStudents.filter((item) => Boolean(item.email?.trim())).length;
    const activeStudents = students.filter((item) => (item.status ?? "active") === "active").length;
    const inactiveStudents = students.filter((item) => (item.status ?? "active") === "inactive").length;

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

                <div className="motion-stagger mt-4 grid gap-3 md:grid-cols-3">
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
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
                    <div className="ml-4">
                        <p className=" text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">List Student</p>
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

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-sm">
                    {isLoading && <LoadingState label="Loading student table..." />}
                    {!isLoading && error && <ErrorState label={error} />}
                    {!isLoading && !error && <DataTable columns={columns} rows={visibleStudents} emptyText="No students found" />}
                </div>
            </section>

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
        </main>
    );
}
