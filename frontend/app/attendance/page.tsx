"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Clock3, Eye, ScanSearch, ShieldCheck } from "lucide-react";
import { authHeaders, backendUrl, getAccessToken } from "@/lib/backend";

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

    async function scanOnce() {
        const accessToken = getAccessToken();
        if (isBusy || !sessionId.trim() || !accessToken) {
            return;
        }

        try {
            setIsBusy(true);

            const response = await fetch(backendUrl(`/api/attendance/session/${sessionId}`), {
                method: "GET",
                headers: {
                    ...authHeaders(accessToken),
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
        const accessToken = getAccessToken();
        if (!sessionId.trim() || !studentId.trim() || !accessToken) {
            setPopupText("Missing auth token. Please login first.");
            return;
        }

        try {
            const response = await fetch(backendUrl("/api/attendance/check-in"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...authHeaders(accessToken),
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

    return (
        <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
            <section className="mx-auto w-full max-w-5xl rounded-3xl border border-slate-200 bg-white p-4 shadow-xl sm:p-7">
                <header className="rounded-2xl bg-slate-800 p-5 text-white shadow-lg sm:p-6">
                    <div className="mb-3 flex items-center gap-3">
                        <div className="rounded-xl bg-white/20 p-2.5 shadow-md">
                            <ScanSearch className="h-7 w-7" />
                        </div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em]">Realtime Attendance</p>
                    </div>
                    <h1 className="text-2xl font-bold sm:text-3xl">Scan Live Camera Frames</h1>
                    <p className="mt-2 text-sm text-slate-100 sm:text-base">
                        Backend compatibility mode: create check-in records and poll `/api/attendance/session/:session_id`.
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
                        {popupText && (
                            <div className="absolute left-3 right-3 top-3 rounded-xl bg-slate-900/85 px-4 py-2.5 text-sm font-semibold text-slate-100 shadow-xl">
                                {popupText}
                            </div>
                        )}
                    </div>
                </div>

                <canvas ref={canvasRef} className="hidden-canvas" />

                <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm md:grid-cols-[auto_1fr] md:items-center md:gap-x-4">
                    <label className="text-sm font-semibold text-slate-700" htmlFor="session-id">
                        Session ID
                    </label>
                    <div className="relative">
                        <Clock3 className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        <input
                            id="session-id"
                            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            value={sessionId}
                            onChange={(e) => setSessionId(e.target.value)}
                            autoComplete="off"
                        />
                    </div>

                    <label className="text-sm font-semibold text-slate-700" htmlFor="similarity">
                        Min Similarity
                    </label>
                    <div className="relative">
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

                    <label className="text-sm font-semibold text-slate-700" htmlFor="student-id">
                        Student ID (check-in)
                    </label>
                    <input
                        id="student-id"
                        className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        placeholder="e.g. 1"
                        autoComplete="off"
                    />
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                    <button
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={startScanning}
                        disabled={isScanning || !sessionId.trim()}
                    >
                        <Eye className="h-5 w-5" />
                        Start Auto Refresh
                    </button>
                    <button
                        className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={stopScanning}
                        disabled={!isScanning}
                    >
                        Stop Refresh
                    </button>
                    <button
                        className="inline-flex items-center justify-center rounded-xl border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-100 hover:shadow-md"
                        onClick={createCheckIn}
                    >
                        Create Check-in
                    </button>
                </div>

                {!getAccessToken() && (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 shadow-sm">
                        You are not logged in. Please sign in at <Link className="underline" href="/login">/login</Link> first.
                    </div>
                )}

                <section className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
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
        </main>
    );
}
