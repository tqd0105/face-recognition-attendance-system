"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Clock3, Eye, ShieldAlert, ShieldCheck, X } from "lucide-react";
import { authHeaders, backendUrl, getAuthSession } from "@/lib/backend";
import { WebcamLiveIcons } from "@/components/icons";

type AttendanceRow = {
    id: number;
    student_id: number;
    status: "present" | "late" | "absent";
    confidence_score: number | null;
    check_in_time: string;
    student_code?: string;
    name?: string;
};

type EventItem = {
    id: string;
    status: string;
    studentLabel: string;
    similarity: number;
    createdAt: string;
};

export default function AttendancePage() {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const timerRef = useRef<number | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [sessionId, setSessionId] = useState("sess_demo_001");
    const [minSimilarity, setMinSimilarity] = useState(0.6);
    const [studentId, setStudentId] = useState("");
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [events, setEvents] = useState<EventItem[]>([]);
    const [popupText, setPopupText] = useState<string | null>(null);
    const [isBusy, setIsBusy] = useState(false);
    const [isFocusMode, setIsFocusMode] = useState(false);
    const authSession = getAuthSession();
    const canManageAttendance = authSession.role === "teacher" && Boolean(authSession.token);
    const canViewAttendance = authSession.role === "teacher" || authSession.role === "student";

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
            if (timerRef.current) {
                window.clearInterval(timerRef.current);
            }
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
            // Ignore autoplay/play interruption when switching between layouts.
        });
    }, [isFocusMode]);

    async function scanOnce() {
        if (isBusy || !sessionId.trim() || !canViewAttendance || !authSession.token) {
            return;
        }

        try {
            setIsBusy(true);

            const response = await fetch(backendUrl(`/api/attendance/session/${sessionId}`), {
                method: "GET",
                headers: {
                    ...authHeaders(authSession.token),
                },
            });

            const data = (await response.json().catch(() => ([]))) as AttendanceRow[];
            if (!response.ok || !Array.isArray(data)) {
                return;
            }

            const newEvents = data.slice(0, 10).map((item, index) => {
                const studentLabel = item.name ?? item.student_code ?? `student_${item.student_id}`;
                return {
                    id: `${item.id}-${index}`,
                    status: item.status,
                    studentLabel,
                    similarity: item.confidence_score ?? 0,
                    createdAt: new Date(item.check_in_time).toLocaleTimeString(),
                } satisfies EventItem;
            });

            setEvents(newEvents);
        } catch {
            // Keep scanning loop alive even if one frame fails.
        } finally {
            setIsBusy(false);
        }
    }

    async function createCheckIn() {
        if (!canManageAttendance) {
            setPopupText("Teacher role is required to create check-in.");
            return;
        }

        if (!sessionId.trim() || !studentId.trim()) {
            setPopupText("Please enter session ID and student ID.");
            return;
        }

        try {
            const response = await fetch(backendUrl("/api/attendance/check-in"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...authHeaders(authSession.token),
                },
                body: JSON.stringify({
                    session_id: Number(sessionId),
                    student_id: Number(studentId),
                    status: "present",
                    confidence_score: minSimilarity,
                }),
            });

            const data = (await response.json().catch(() => ({}))) as { message?: string };
            setPopupText(data.message ?? (response.ok ? "Check-in success" : "Check-in failed"));
            window.setTimeout(() => setPopupText(null), 1800);
            if (response.ok) {
                void scanOnce();
            }
        } catch {
            setPopupText("Cannot connect to backend service");
            window.setTimeout(() => setPopupText(null), 1800);
        }
    }

    function startScanning() {
        if (isScanning) {
            return;
        }

        setIsFocusMode(true);
        setIsScanning(true);

        void scanOnce();
        timerRef.current = window.setInterval(() => {
            void scanOnce();
        }, 1600);
    }

    function stopScanning() {
        if (timerRef.current) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
        }
        setIsScanning(false);
    }

    function closeFocusMode() {
        setIsFocusMode(false);
    }

    return (
        <main className="motion-page relative min-h-screen overflow-hidden bg-slate-100 px-4 py-6 sm:px-6 lg:px-8">
            <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-indigo-300/20 blur-3xl" />
            <div className="pointer-events-none absolute -right-28 bottom-16 h-80 w-80 rounded-full bg-sky-300/20 blur-3xl" />

            <section className="relative mx-auto w-full max-w-6xl rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.55)] sm:p-7">
                <header className="motion-hero rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-5 text-white shadow-lg sm:p-6">
                    <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[auto_1fr]">
                        <div className="flex justify-center sm:justify-start">
                            <img src={WebcamLiveIcons} width={200} height={200} alt="Realtime attendance" className="h-24 w-24 object-contain sm:h-28 sm:w-28" />
                        </div>

                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em]">Realtime Attendance</p>
                            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Scan Live Camera Frames</h1>
                            <p className="mt-2 text-sm text-slate-100 sm:text-base">
                                Session-oriented attendance monitor with controlled permissions for teacher and student modes.
                            </p>
                        </div>
                    </div>
                </header>

                <div className="motion-stagger mt-4 grid gap-3 md:grid-cols-3">
                    <article className="interactive-card rounded-2xl border border-indigo-100 bg-indigo-50 p-4 shadow-sm" data-role={authSession.role}>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700">Role</p>
                        <p className="mt-2 text-sm font-bold text-indigo-900">{authSession.role.toUpperCase()}</p>
                    </article>
                    <article className="interactive-card rounded-2xl border border-blue-100 bg-blue-50 p-4 shadow-sm" data-role={authSession.role}>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">View permission</p>
                        <p className="mt-2 text-sm font-bold text-blue-900">{canViewAttendance ? "Enabled" : "Blocked"}</p>
                    </article>
                    <article className="interactive-card rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm" data-role={authSession.role}>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">Write permission</p>
                        <p className="mt-2 text-sm font-bold text-slate-900">{canManageAttendance ? "Teacher access" : "Read-only"}</p>
                    </article>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
                    {!isFocusMode ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-100 p-3 shadow-sm">
                            <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-800">
                                <video ref={videoRef} className="h-[220px] w-full object-cover sm:h-[280px] lg:h-[320px]" autoPlay muted playsInline />
                                {!isCameraReady && (
                                    <div className="absolute inset-0 grid place-items-center bg-slate-900/55 text-sm font-medium text-white">
                                        Waiting for camera permission...
                                    </div>
                                )}
                                {popupText && (
                                    <div className="absolute left-3 right-3 top-3 rounded-xl bg-slate-900/85 px-4 py-2.5 text-sm font-semibold text-slate-100 shadow-xl">
                                        {popupText}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-900 shadow-sm">
                            Focus mode is active. Camera preview is displayed in modal.
                        </div>
                    )}

                    <div className="grid gap-3">
                        <div className="motion-hero grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                            <div>
                                <label className="text-sm font-semibold text-slate-700" htmlFor="session-id">
                                    Session ID
                                </label>
                                <div className="relative mt-1">
                                    <Clock3 className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                    <input
                                        id="session-id"
                                        className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                        value={sessionId}
                                        onChange={(e) => setSessionId(e.target.value)}
                                        autoComplete="off"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-slate-700" htmlFor="similarity">
                                    Min Similarity
                                </label>
                                <div className="relative mt-1">
                                    <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                    <input
                                        id="similarity"
                                        className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                        type="number"
                                        min={0}
                                        max={1}
                                        step={0.01}
                                        value={minSimilarity}
                                        onChange={(e) => setMinSimilarity(Number(e.target.value))}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-slate-700" htmlFor="student-id">
                                    Student ID (check-in)
                                </label>
                                <input
                                    id="student-id"
                                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                    value={studentId}
                                    onChange={(e) => setStudentId(e.target.value)}
                                    placeholder="e.g. 1"
                                    autoComplete="off"
                                />
                            </div>
                        </div>

                        <div className="flex justify-center flex-wrap gap-3">
                            <button
                                className="interactive-btn inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                                data-role={authSession.role}
                                onClick={startScanning}
                                disabled={isScanning || !sessionId.trim() || !canViewAttendance}
                            >
                                <Eye className="h-5 w-5" />
                                Start
                            </button>
                            <button
                                className="interactive-btn inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                                data-role={authSession.role}
                                onClick={stopScanning}
                                disabled={!isScanning}
                            >
                                Stop
                            </button>
                            <button
                                className="interactive-btn inline-flex items-center justify-center rounded-xl border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-100 hover:shadow-md"
                                data-role={canManageAttendance ? "teacher" : authSession.role}
                                onClick={createCheckIn}
                                disabled={!canManageAttendance}
                            >
                                Create Check-in
                            </button>
                        </div>
                    </div>
                </div>

                <canvas ref={canvasRef} className="hidden-canvas" />

                {!canViewAttendance && (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
                        <p className="inline-flex items-center gap-2 font-semibold">
                            <ShieldAlert className="h-4 w-4" />
                            Access blocked: You are in guest mode.
                        </p>
                        <p className="mt-1 inline-flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Please sign in at <Link className="underline" href="/login">/login</Link> as teacher or student.
                        </p>
                    </div>
                )}

                {authSession.role === "student" && (
                    <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900 shadow-sm">
                        <p className="font-semibold">Student mode is active.</p>
                        <p className="mt-1">You can view attendance events, but manual check-in creation is disabled.</p>
                    </div>
                )}

                <section className="motion-hero mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                    <h2 className="text-base font-bold text-slate-900">Latest Events</h2>
                    {events.length === 0 ? (
                        <p className="mt-2 text-sm text-slate-600">No events yet. Start scanning to receive recognition results.</p>
                    ) : (
                        <ul className="mt-3 grid gap-2">
                            {events.map((event) => (
                                <li
                                    key={event.id}
                                    className="grid gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm sm:grid-cols-[1fr_auto_auto_auto] sm:items-center"
                                >
                                    <strong className="text-slate-900">{event.studentLabel}</strong>
                                    <span className={event.status === "present" ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>
                                        {event.status}
                                    </span>
                                    <span>sim={event.similarity.toFixed(2)}</span>
                                    <time className="text-slate-500">{event.createdAt}</time>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <footer className="mt-5 flex flex-wrap gap-4 text-sm font-semibold text-blue-700">
                    <Link className="rounded-lg px-2 py-1 hover:bg-blue-50" href="/enrollment">
                        Go to enrollment
                    </Link>
                    <Link className="rounded-lg px-2 py-1 hover:bg-blue-50" href="/">
                        Back to dashboard
                    </Link>
                </footer>
            </section>
            {isFocusMode && (
                <div className="motion-modal-backdrop fixed inset-0 z-50 grid place-items-center bg-slate-900/65 px-4" role="dialog" aria-modal="true">
                    <div className="motion-modal-panel w-full max-w-6xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-5">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-700">Focus Mode</p>
                                <h2 className="text-lg font-bold text-slate-900">Attendance Camera</h2>
                            </div>
                            <button
                                type="button"
                                className="interactive-btn inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
                                onClick={closeFocusMode}
                            >
                                <X className="h-4 w-4" /> Close
                            </button>
                        </div>

                        <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_0.8fr] lg:items-start">
                            <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
                                <video ref={videoRef} className="h-[42vh] w-full object-cover sm:h-[70vh]" autoPlay muted playsInline />
                                {!isCameraReady && (
                                    <div className="absolute inset-0 grid place-items-center bg-slate-900/55 text-sm font-medium text-white">
                                        Waiting for camera permission...
                                    </div>
                                )}
                                {popupText && (
                                    <div className="absolute left-3 right-3 top-3 rounded-xl bg-slate-900/85 px-4 py-2.5 text-sm font-semibold text-slate-100 shadow-xl">
                                        {popupText}
                                    </div>
                                )}
                            </div>

                            <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                                <div>
                                    <label className="text-sm font-semibold text-slate-700" htmlFor="session-id-focus">
                                        Session ID
                                    </label>
                                    <div className="relative mt-1">
                                        <Clock3 className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                        <input
                                            id="session-id-focus"
                                            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                            value={sessionId}
                                            onChange={(e) => setSessionId(e.target.value)}
                                            autoComplete="off"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-semibold text-slate-700" htmlFor="student-id-focus">
                                        Student ID (check-in)
                                    </label>
                                    <input
                                        id="student-id-focus"
                                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                        value={studentId}
                                        onChange={(e) => setStudentId(e.target.value)}
                                        placeholder="e.g. 1"
                                        autoComplete="off"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-semibold text-slate-700" htmlFor="similarity-focus">
                                        Min Similarity
                                    </label>
                                    <input
                                        id="similarity-focus"
                                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                        type="number"
                                        min={0}
                                        max={1}
                                        step={0.01}
                                        value={minSimilarity}
                                        onChange={(e) => setMinSimilarity(Number(e.target.value))}
                                    />
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    <button
                                        className="interactive-btn inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                                        data-role={authSession.role}
                                        onClick={startScanning}
                                        disabled={isScanning || !sessionId.trim() || !canViewAttendance}
                                        type="button"
                                    >
                                        <Eye className="h-5 w-5" />
                                        Start
                                    </button>
                                    <button
                                        className="interactive-btn inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                                        data-role={authSession.role}
                                        onClick={stopScanning}
                                        disabled={!isScanning}
                                        type="button"
                                    >
                                        Stop
                                    </button>
                                    <button
                                        className="interactive-btn inline-flex items-center justify-center rounded-xl border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-100 hover:shadow-md"
                                        data-role={canManageAttendance ? "teacher" : authSession.role}
                                        onClick={createCheckIn}
                                        disabled={!canManageAttendance}
                                        type="button"
                                    >
                                        Create Check-in
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
