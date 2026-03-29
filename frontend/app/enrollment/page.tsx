"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Camera, CheckCircle2, ShieldAlert, UserRound, X } from "lucide-react";
import { authHeaders, backendUrl, getAuthSession } from "@/lib/backend";
import { WebcamIcons } from "@/components/icons";

type EnrollmentResult = {
    success?: boolean;
    message?: string;
    student_id?: string;
};

export default function EnrollmentPage() {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [studentId, setStudentId] = useState("");
    const [courseClassId, setCourseClassId] = useState("");
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState<EnrollmentResult | null>(null);
    const [isFocusMode, setIsFocusMode] = useState(false);
    const authSession = getAuthSession();
    const hasEnrollmentAccess = authSession.role === "teacher" && Boolean(authSession.token);

    function stopCamera() {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setIsCameraReady(false);
    }

    useEffect(() => {
        let isMounted = true;

        async function initCamera() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
                    audio: false,
                });

                if (!isMounted) {
                    stream.getTracks().forEach((track) => track.stop());
                    return;
                }

                streamRef.current = stream;

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                    setIsCameraReady(true);
                }
            } catch {
                setIsCameraReady(false);
            }
        }

        void initCamera();

        return () => {
            isMounted = false;
            stopCamera();
        };
    }, []);

    useEffect(() => {
        if (!videoRef.current || !streamRef.current) {
            return;
        }

        videoRef.current.srcObject = streamRef.current;
        void videoRef.current.play().catch(() => {
            // Ignore play interruption when switching between inline and modal camera previews.
        });
    }, [isFocusMode]);

    function closeFocusMode() {
        setIsFocusMode(false);
    }

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!studentId.trim()) {
            setResult({ success: false, message: "Please enter student ID" });
            return;
        }

        if (!courseClassId.trim()) {
            setResult({ success: false, message: "Please enter course class ID" });
            return;
        }

        if (!hasEnrollmentAccess) {
            setResult({ success: false, message: "Teacher login is required for enrollment actions." });
            return;
        }

        try {
            setIsSubmitting(true);
            setResult(null);

            const response = await fetch(backendUrl("/api/enrollments"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...authHeaders(authSession.token),
                },
                body: JSON.stringify({
                    student_id: Number(studentId),
                    course_class_id: Number(courseClassId),
                }),
            });

            const data = (await response.json().catch(() => ({}))) as EnrollmentResult;

            if (!response.ok) {
                setResult({
                    success: false,
                    message: data.message ?? "Enrollment failed. Please try again.",
                });
                return;
            }

            setResult({
                success: true,
                student_id: data.student_id ?? studentId.trim(),
                message: data.message ?? "Enrollment success",
            });
        } catch {
            setResult({ success: false, message: "Cannot connect to backend service" });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <main className="motion-page relative min-h-screen overflow-hidden bg-slate-100 px-4 py-6 sm:px-6 lg:px-8">
            <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-blue-300/20 blur-3xl" />
            <div className="pointer-events-none absolute -right-28 bottom-16 h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl" />

            <section className="relative mx-auto w-full max-w-6xl rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.55)] sm:p-7">
                <header className="motion-hero rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-5 text-white shadow-lg sm:p-6">
                    <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[auto_1fr]">
                        <div className="flex justify-center sm:justify-start">
                            <img src={WebcamIcons} width={200} height={200} alt="Enrollment" className="h-24 w-24 object-contain sm:h-28 sm:w-28" />
                        </div>

                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em]">Face Enrollment</p>
                            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Register Student Face</h1>
                            <p className="mt-2 text-sm text-slate-100 sm:text-base">
                                Step-based workflow for teacher to create enrollment records via `/api/enrollments`.
                            </p>
                        </div>
                    </div>
                </header>

                <div className="motion-stagger mt-4 grid gap-3 md:grid-cols-3">
                    <article className="interactive-card rounded-2xl border border-blue-100 bg-blue-50 p-4 shadow-sm" data-role="teacher">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Step 1</p>
                        <p className="mt-2 text-sm font-bold text-blue-900">Prepare camera and student info</p>
                    </article>
                    <article className="interactive-card rounded-2xl border border-indigo-100 bg-indigo-50 p-4 shadow-sm" data-role="teacher">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700">Step 2</p>
                        <p className="mt-2 text-sm font-bold text-indigo-900">Validate class mapping and permissions</p>
                    </article>
                    <article className="interactive-card rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm" data-role={authSession.role}>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">Current role</p>
                        <p className="mt-2 text-sm font-bold text-slate-900">{authSession.role.toUpperCase()}</p>
                    </article>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
                    {!isFocusMode ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-100 p-3 shadow-sm">
                            <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-800">
                                <video ref={videoRef} className="h-[220px] w-full object-cover sm:h-[280px] lg:h-[320px]" autoPlay muted playsInline />
                                {!isCameraReady && (
                                    <div className="absolute inset-0 grid place-items-center bg-slate-900/55 text-sm font-medium text-white">
                                        Waiting for camera permission...
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900 shadow-sm">
                            Focus mode is active. Camera preview is displayed in modal.
                        </div>
                    )}

                    <form className="motion-hero grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm" onSubmit={onSubmit}>
                        <div>
                            <label className="text-sm font-semibold text-slate-700" htmlFor="student-id">
                                Student ID
                            </label>
                            <div className="relative mt-1">
                                <UserRound className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                <input
                                    id="student-id"
                                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                    value={studentId}
                                    onChange={(e) => setStudentId(e.target.value)}
                                    placeholder="e.g. B21DCCN001"
                                    autoComplete="off"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-semibold text-slate-700" htmlFor="course-class-id">
                                Course Class ID
                            </label>
                            <input
                                id="course-class-id"
                                className="mt-1 w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                value={courseClassId}
                                onChange={(e) => setCourseClassId(e.target.value)}
                                placeholder="e.g. 1"
                                autoComplete="off"
                            />
                        </div>

                        <div>
                            <div className="flex flex-wrap gap-3">
                                <button
                                    className="interactive-btn inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                                    data-role={hasEnrollmentAccess ? "teacher" : authSession.role}
                                    disabled={isSubmitting || !hasEnrollmentAccess}
                                    type="submit"
                                >
                                    <CheckCircle2 className="h-5 w-5" />
                                    {isSubmitting ? "Submitting..." : "Capture & Enroll"}
                                </button>
                                <button
                                    type="button"
                                    className="interactive-btn inline-flex items-center justify-center rounded-xl border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-100 hover:shadow-md"
                                    data-role={authSession.role}
                                    onClick={() => setIsFocusMode(true)}
                                >
                                    Focus Camera
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                <canvas ref={canvasRef} className="hidden-canvas" />

                {!hasEnrollmentAccess && (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
                        <p className="inline-flex items-center gap-2 font-semibold">
                            <ShieldAlert className="h-4 w-4" />
                            Access blocked: Enrollment is teacher-only.
                        </p>
                        <p className="mt-1 inline-flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Current mode: <strong>{authSession.role}</strong>. Please sign in as teacher at <Link className="underline" href="/login">/login</Link>.
                        </p>
                    </div>
                )}

                {result && (
                    <div
                        className={`mt-4 rounded-xl border px-4 py-3 text-sm font-semibold shadow-md ${result.success
                            ? "border-blue-200 bg-blue-50 text-blue-800"
                            : "border-rose-200 bg-rose-50 text-rose-800"
                            }`}
                    >
                        {result.message}
                        {result.student_id ? ` (${result.student_id})` : ""}
                    </div>
                )}

                <footer className="mt-5 flex flex-wrap gap-4 text-sm font-semibold text-blue-700">
                    <Link className="rounded-lg px-2 py-1 hover:bg-blue-50" href="/attendance">
                        Go to realtime attendance
                    </Link>
                    <Link className="rounded-lg px-2 py-1 hover:bg-blue-50" href="/">
                        Back to dashboard
                    </Link>
                </footer>
            </section>
            {isFocusMode && (
                <div className="motion-modal-backdrop fixed inset-0 z-50 grid place-items-center bg-slate-900/65 px-4" role="dialog" aria-modal="true">
                    <div className="motion-modal-panel w-full max-w-5xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-5">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Focus Mode</p>
                                <h2 className="text-lg font-bold text-slate-900">Enrollment Camera</h2>
                            </div>
                            <button
                                type="button"
                                className="interactive-btn inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
                                onClick={closeFocusMode}
                            >
                                <X className="h-4 w-4" /> Close
                            </button>
                        </div>

                        <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_0.8fr] lg:items-start">
                            <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
                                <video ref={videoRef} className="h-[42vh] w-full object-cover sm:h-[80vh]" autoPlay muted playsInline />
                                {!isCameraReady && (
                                    <div className="absolute inset-0 grid place-items-center bg-slate-900/55 text-sm font-medium text-white">
                                        Waiting for camera permission...
                                    </div>
                                )}
                            </div>

                            <form className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3" onSubmit={onSubmit}>
                                <div>
                                    <label className="text-sm font-semibold text-slate-700" htmlFor="student-id-focus">
                                        Student ID
                                    </label>
                                    <div className="relative mt-1">
                                        <UserRound className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                        <input
                                            id="student-id-focus"
                                            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                            value={studentId}
                                            onChange={(e) => setStudentId(e.target.value)}
                                            placeholder="e.g. B21DCCN001"
                                            autoComplete="off"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-semibold text-slate-700" htmlFor="course-class-id-focus">
                                        Course Class ID
                                    </label>
                                    <input
                                        id="course-class-id-focus"
                                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                        value={courseClassId}
                                        onChange={(e) => setCourseClassId(e.target.value)}
                                        placeholder="e.g. 1"
                                        autoComplete="off"
                                    />
                                </div>

                                <button
                                    className="interactive-btn inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                                    data-role={hasEnrollmentAccess ? "teacher" : authSession.role}
                                    disabled={isSubmitting || !hasEnrollmentAccess}
                                    type="submit"
                                >
                                    <CheckCircle2 className="h-5 w-5" />
                                    {isSubmitting ? "Submitting..." : "Capture & Enroll"}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
