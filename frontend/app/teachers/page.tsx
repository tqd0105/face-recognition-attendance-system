"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Users, Pencil, RotateCcw, Trash2, UserX, ShieldCheck, Mail, BadgeCheck } from "lucide-react";
import { DataTable } from "@/components/ui/DataTable";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { teacherService, TeacherInfo } from "@/services/teacher.service";
import { StudentIcons } from "@/components/icons";
import { useAuth } from "@/hooks/useAuth";

export default function TeacherManagementPage() {
    const { user } = useAuth();
    const [teachers, setTeachers] = useState<TeacherInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [modalError, setModalError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [editingTeacherId, setEditingTeacherId] = useState<number | null>(null);
    const [pendingDeleteTeacher, setPendingDeleteTeacher] = useState<TeacherInfo | null>(null);
    const [pendingAction, setPendingAction] = useState<"deactivate" | "restore" | "hard-delete">("deactivate");
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

    const [form, setForm] = useState({
        teacher_code: "",
        teacher_name: "",
        email: "",
        password: "",
        role: "teacher",
    });

    const loadTeachers = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await teacherService.getAll();
            setTeachers(data);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Cannot load teachers";
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadTeachers();
    }, [loadTeachers]);

    const visibleTeachers = useMemo(() => {
        if (statusFilter === "all") {
            return teachers;
        }
        return teachers.filter((item) => (item.status ?? "active") === statusFilter);
    }, [statusFilter, teachers]);

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!form.teacher_name.trim() || !form.email.trim()) {
            setModalError("Name and email are required.");
            return;
        }

        if (!editingTeacherId && !form.teacher_code.trim()) {
            setModalError("Teacher code is required for new teacher.");
            return;
        }

        try {
            setIsCreating(true);
            setModalError(null);
            
            if (editingTeacherId) {
                await teacherService.update(editingTeacherId, {
                    teacher_name: form.teacher_name,
                    email: form.email,
                    role: form.role,
                });
            } else {
                if (!form.password.trim()) {
                    setModalError("Password is required for new teacher.");
                    return;
                }
                await teacherService.create(form);
            }
            setIsModalOpen(false);
            setEditingTeacherId(null);
            setForm({ teacher_code: "", teacher_name: "", email: "", password: "", role: "teacher" });
            await loadTeachers();
        } catch (err) {
            const message = err instanceof Error ? err.message : "Cannot save teacher";
            setModalError(message);
        } finally {
            setIsCreating(false);
        }
    }

    const onDeleteTeacher = useCallback((teacher: TeacherInfo) => {
        setPendingAction("deactivate");
        setPendingDeleteTeacher(teacher);
    }, []);

    const onRestoreTeacher = useCallback((teacher: TeacherInfo) => {
        setPendingAction("restore");
        setPendingDeleteTeacher(teacher);
    }, []);

    const onHardDeleteTeacher = useCallback((teacher: TeacherInfo) => {
        setPendingAction("hard-delete");
        setPendingDeleteTeacher(teacher);
    }, []);

    const onConfirmDeleteTeacher = useCallback(async () => {
        if (!pendingDeleteTeacher) {
            return;
        }

        try {
            setIsDeleting(true);
            setError(null);
            if (pendingAction === "restore") {
                await teacherService.update(pendingDeleteTeacher.id, { 
                    status: "active",
                    teacher_name: pendingDeleteTeacher.teacher_name,
                    email: pendingDeleteTeacher.email,
                    role: pendingDeleteTeacher.role 
                });
            } else if (pendingAction === "hard-delete") {
                await teacherService.delete(pendingDeleteTeacher.id);
            } else {
                await teacherService.update(pendingDeleteTeacher.id, { 
                    status: "inactive",
                    teacher_name: pendingDeleteTeacher.teacher_name,
                    email: pendingDeleteTeacher.email,
                    role: pendingDeleteTeacher.role 
                });
            }
            setPendingDeleteTeacher(null);
            await loadTeachers();
        } catch (err) {
            const message = err instanceof Error
                ? err.message
                : pendingAction === "restore"
                    ? "Cannot restore teacher"
                    : pendingAction === "hard-delete"
                        ? "Cannot permanently delete teacher"
                        : "Cannot deactivate teacher";
            setError(message);
        } finally {
            setIsDeleting(false);
        }
    }, [loadTeachers, pendingAction, pendingDeleteTeacher]);

    const onEditTeacher = useCallback((teacher: TeacherInfo) => {
        setModalError(null);
        setEditingTeacherId(teacher.id);
        setForm({
            teacher_code: teacher.teacher_code ?? "",
            teacher_name: teacher.teacher_name ?? "",
            email: teacher.email ?? "",
            password: "", // Don't populate password on edit
            role: teacher.role ?? "teacher",
        });
        setIsModalOpen(true);
    }, []);

    const columns = useMemo(
        () => [
            { key: "code", title: "Teacher Code", render: (row: TeacherInfo) => row.teacher_code ?? "-" },
            { key: "name", title: "Name", render: (row: TeacherInfo) => row.teacher_name },
            { key: "email", title: "Email", render: (row: TeacherInfo) => row.email ?? "-" },
            { key: "role", title: "Role", render: (row: TeacherInfo) => (
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${row.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'}`}>
                    {row.role === 'admin' ? 'Admin' : 'Teacher'}
                </span>
            ) },
            { key: "status", title: "Status", render: (row: TeacherInfo) => row.status ?? "active" },
            {
                key: "actions",
                title: "Actions",
                render: (row: TeacherInfo) => (
                    <div className="flex items-center gap-1.5" onClick={(event) => event.stopPropagation()}>
                        <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                            onClick={() => onEditTeacher(row)}
                            title="Edit teacher"
                            aria-label="Edit teacher"
                        >
                            <Pencil className="h-3.5 w-3.5" />
                        </button>
                        
                        {/* Do not allow modifying status of admins to prevent accidental lockout */}
                        {row.role !== 'admin' && (
                            <>
                                {(row.status ?? "active") === "inactive" ? (
                                    <>
                                        <button
                                            type="button"
                                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                            onClick={() => onRestoreTeacher(row)}
                                            title="Restore teacher"
                                            aria-label="Restore teacher"
                                        >
                                            <RotateCcw className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100"
                                            onClick={() => onHardDeleteTeacher(row)}
                                            title="Delete teacher permanently"
                                            aria-label="Delete teacher permanently"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        type="button"
                                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100"
                                        onClick={() => onDeleteTeacher(row)}
                                        title="Deactivate teacher"
                                        aria-label="Deactivate teacher"
                                    >
                                        <UserX className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                ),
            },
        ],
        [onDeleteTeacher, onEditTeacher, onHardDeleteTeacher, onRestoreTeacher],
    );

    const totalTeachers = teachers.length;
    const adminCount = teachers.filter((item) => item.role === "admin").length;
    const activeTeachers = teachers.filter((item) => (item.status ?? "active") === "active").length;
    const inactiveTeachers = teachers.filter((item) => (item.status ?? "active") === "inactive").length;

    if (user.role !== "admin") {
        return (
            <main className="motion-page space-y-4 px-1 py-1 sm:px-2">
                <ErrorState label="Access Denied: Only administrators can view this page." />
            </main>
        );
    }

    return (
        <main className="motion-page space-y-4 px-1 py-1 sm:px-2">
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                <header className="flex items-center gap-2 motion-hero rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-5 text-white shadow-lg sm:p-6">
                    <div>
                        <ShieldCheck className="h-16 w-16 text-white opacity-90" />
                    </div>
                    <div>
                        <h1 className="mt-2 text-3xl font-bold sm:text-3xl">Teacher Management</h1>
                        <p className="mt-2 text-md text-slate-100 sm:text-base">Manage teacher accounts, admin privileges, and staff access.</p>
                    </div>
                </header>

                <div className="motion-stagger mt-4 grid gap-3 md:grid-cols-4">
                    <article className="interactive-card rounded-2xl border border-blue-100 bg-blue-50 p-4 shadow-sm">
                        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700"><Users className="h-4 w-4" /> Total Staff</p>
                        <p className="mt-2 text-2xl font-bold text-blue-900">{totalTeachers}</p>
                    </article>
                    <article className="interactive-card rounded-2xl border border-indigo-100 bg-indigo-50 p-4 shadow-sm">
                        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700"><ShieldCheck className="h-4 w-4" /> Admins</p>
                        <p className="mt-2 text-2xl font-bold text-indigo-900">{adminCount}</p>
                    </article>
                    <article className="interactive-card rounded-2xl border border-emerald-100 bg-emerald-50 p-4 shadow-sm">
                        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700"><BadgeCheck className="h-4 w-4" /> Active</p>
                        <p className="mt-2 text-2xl font-bold text-emerald-900">{activeTeachers}</p>
                    </article>
                    <article className="interactive-card rounded-2xl border border-rose-100 bg-rose-50 p-4 shadow-sm">
                        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-rose-700"><UserX className="h-4 w-4" /> Inactive</p>
                        <p className="mt-2 text-2xl font-bold text-rose-900">{inactiveTeachers}</p>
                    </article>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${statusFilter === "all"
                                ? "border-indigo-600 bg-indigo-600 text-white"
                                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                                }`}
                            onClick={() => setStatusFilter("all")}
                        >
                            All ({totalTeachers})
                        </button>
                        <button
                            type="button"
                            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${statusFilter === "active"
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                                }`}
                            onClick={() => setStatusFilter("active")}
                        >
                            Active ({activeTeachers})
                        </button>
                        <button
                            type="button"
                            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${statusFilter === "inactive"
                                ? "border-amber-600 bg-amber-600 text-white"
                                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                                }`}
                            onClick={() => setStatusFilter("inactive")}
                        >
                            Inactive ({inactiveTeachers})
                        </button>
                    </div>
                    <button
                        type="button"
                        className="interactive-btn inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                        onClick={() => {
                            setModalError(null);
                            setEditingTeacherId(null);
                            setForm({ teacher_code: "", teacher_name: "", email: "", password: "", role: "teacher" });
                            setIsModalOpen(true);
                        }}
                    >
                        <Plus className="h-4 w-4" /> Add Teacher
                    </button>
                </div>

                <div className="mt-4 md:rounded-2xl md:border md:border-slate-200 md:bg-slate-50 md:p-3 md:shadow-sm">
                    {isLoading && <LoadingState label="Loading teacher table..." />}
                    {!isLoading && error && <ErrorState label={error} />}
                    {!isLoading && !error && (
                        <DataTable
                            columns={columns}
                            rows={visibleTeachers}
                            emptyText="No teachers found"
                        />
                    )}
                </div>
            </section>

            <Modal
                open={isModalOpen}
                title={editingTeacherId ? "Edit Teacher" : "Add Teacher"}
                onClose={() => setIsModalOpen(false)}
            >
                <form onSubmit={onSubmit} className="grid gap-4">
                    {modalError && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
                            {modalError}
                        </div>
                    )}
                    <div>
                        <label className="text-sm font-semibold text-slate-700" htmlFor="teacher_code">
                            Teacher Code {!editingTeacherId && <span className="text-rose-500">*</span>}
                        </label>
                        <input
                            id="teacher_code"
                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-sm outline-none focus:border-indigo-500 disabled:opacity-60 disabled:bg-slate-50"
                            value={form.teacher_code}
                            onChange={(e) => setForm((prev) => ({ ...prev, teacher_code: e.target.value }))}
                            disabled={Boolean(editingTeacherId)}
                            placeholder="e.g. GV003"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-slate-700" htmlFor="teacher_name">
                            Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                            id="teacher_name"
                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-sm outline-none focus:border-indigo-500"
                            value={form.teacher_name}
                            onChange={(e) => setForm((prev) => ({ ...prev, teacher_name: e.target.value }))}
                            placeholder="e.g. Nguyễn Văn A"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-slate-700" htmlFor="email">
                            Email <span className="text-rose-500">*</span>
                        </label>
                        <input
                            id="email"
                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-sm outline-none focus:border-indigo-500"
                            value={form.email}
                            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                            placeholder="e.g. teacher@ut.edu.vn"
                        />
                    </div>
                    {!editingTeacherId && (
                        <div>
                            <label className="text-sm font-semibold text-slate-700" htmlFor="password">
                                Initial Password <span className="text-rose-500">*</span>
                            </label>
                            <input
                                id="password"
                                type="password"
                                className="mt-1 w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-sm outline-none focus:border-indigo-500"
                                value={form.password}
                                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                                placeholder="Min 6 characters"
                            />
                        </div>
                    )}
                    <div>
                        <label className="text-sm font-semibold text-slate-700" htmlFor="role">
                            System Role
                        </label>
                        <select
                            id="role"
                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-sm outline-none focus:border-indigo-500"
                            value={form.role}
                            onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
                        >
                            <option value="teacher">Teacher (Regular Access)</option>
                            <option value="admin">Admin (Full System Access)</option>
                        </select>
                        <p className="mt-1 text-[11px] text-slate-500">Admins can manage other users and system configurations.</p>
                    </div>

                    <div className="mt-2 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                        <button
                            type="button"
                            className="interactive-btn rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            onClick={() => setIsModalOpen(false)}
                            disabled={isCreating}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="interactive-btn rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                            disabled={isCreating}
                        >
                            {isCreating ? "Saving..." : "Save Teacher"}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                open={Boolean(pendingDeleteTeacher)}
                title={
                    pendingAction === "restore"
                        ? "Restore Teacher?"
                        : pendingAction === "hard-delete"
                            ? "Delete Teacher Permanently?"
                            : "Deactivate Teacher?"
                }
                message={
                    pendingAction === "restore"
                        ? `Are you sure you want to restore ${pendingDeleteTeacher?.teacher_name}? They will regain access to the system.`
                        : pendingAction === "hard-delete"
                            ? `Are you sure you want to permanently delete ${pendingDeleteTeacher?.teacher_name}? This action cannot be undone.`
                            : `Are you sure you want to deactivate ${pendingDeleteTeacher?.teacher_name}? They will no longer be able to sign in.`
                }
                confirmText={
                    pendingAction === "restore"
                        ? "Restore"
                        : pendingAction === "hard-delete"
                            ? "Delete"
                            : "Deactivate"
                }
                isLoading={isDeleting}
                onConfirm={onConfirmDeleteTeacher}
                onClose={() => setPendingDeleteTeacher(null)}
            />
        </main>
    );
}
