"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Camera, CheckCircle2, UserRound } from "lucide-react";
import { authHeaders, backendUrl, getAccessToken } from "@/lib/backend";

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

        const accessToken = getAccessToken();
        if (!accessToken) {
            setResult({ success: false, message: "Missing auth token. Please login first." });
            return;
        }

        try {
            setIsSubmitting(true);
            setResult(null);

            const response = await fetch(backendUrl("/api/enrollments"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...authHeaders(accessToken),
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
        <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
            <section className="mx-auto w-full max-w-5xl rounded-3xl border border-slate-200 bg-white p-4 shadow-xl sm:p-7">
                <header className="rounded-2xl bg-slate-800 p-5 text-white shadow-lg sm:p-6">
                    <div className="mb-3 flex items-center gap-3">
                        <div className="rounded-xl bg-white/20 p-2.5 shadow-md">
                            <Camera className="h-7 w-7" />
                        </div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em]">Face Enrollment</p>
                    </div>
                    <h1 className="text-2xl font-bold sm:text-3xl">Register Student Face</h1>
                    <p className="mt-2 text-sm text-slate-100 sm:text-base">
                        Compatibility mode with current backend branch: this page enrolls student into course class via `/api/enrollments`.
                    </p>
                </header>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-100 p-3 shadow-sm">
                    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-800">
                        <video ref={videoRef} className="aspect-video w-full object-cover" autoPlay muted playsInline />
                        {!isCameraReady && (
                            <div className="absolute inset-0 grid place-items-center bg-slate-900/55 text-sm font-medium text-white">
                                Waiting for camera permission...
                            </div>
                        )}
                    </div>
                </div>

                <canvas ref={canvasRef} className="hidden-canvas" />

                <form className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm" onSubmit={onSubmit}>
                    <label className="text-sm font-semibold text-slate-700" htmlFor="student-id">
                        Student ID
                    </label>
                    <div className="relative">
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

                    <label className="text-sm font-semibold text-slate-700" htmlFor="course-class-id">
                        Course Class ID
                    </label>
                    <input
                        id="course-class-id"
                        className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        value={courseClassId}
                        onChange={(e) => setCourseClassId(e.target.value)}
                        placeholder="e.g. 1"
                        autoComplete="off"
                    />

                    <button
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isSubmitting}
                        type="submit"
                    >
                        <CheckCircle2 className="h-5 w-5" />
                        {isSubmitting ? "Submitting..." : "Capture & Enroll"}
                    </button>
                </form>

                {!getAccessToken() && (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 shadow-sm">
                        You are not logged in. Please sign in at <Link className="underline" href="/login">/login</Link> first.
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
        </main>
    );
}
