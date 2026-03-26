"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Clock3, Eye, ScanSearch, ShieldCheck } from "lucide-react";
import { backendUrl } from "@/lib/backend";

type RecognitionItem = {
    student_id: string | null;
    similarity: number;
    status: "matched" | "unknown";
};

type AttendanceResponse = {
    success?: boolean;
    results?: RecognitionItem[];
};

type EventItem = {
    id: string;
    status: "matched" | "unknown";
    studentLabel: string;
    similarity: number;
    createdAt: string;
};

export default function AttendancePage() {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const timerRef = useRef<number | null>(null);

    const [sessionId, setSessionId] = useState("sess_demo_001");
    const [minSimilarity, setMinSimilarity] = useState(0.6);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [events, setEvents] = useState<EventItem[]>([]);
    const [popupText, setPopupText] = useState<string | null>(null);
    const [isBusy, setIsBusy] = useState(false);

    useEffect(() => {
        let stream: MediaStream | null = null;

        async function initCamera() {
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
                    audio: false,
                });

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
            stream?.getTracks().forEach((track) => track.stop());
        };
    }, []);

    function captureBlob(): Promise<Blob> {
        return new Promise((resolve, reject) => {
            const video = videoRef.current;
            const canvas = canvasRef.current;

            if (!video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) {
                reject(new Error("Camera is not ready"));
                return;
            }

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");

            if (!ctx) {
                reject(new Error("Cannot access canvas context"));
                return;
            }

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error("Failed to capture frame"));
                        return;
                    }
                    resolve(blob);
                },
                "image/jpeg",
                0.9,
            );
        });
    }

    function blobToDataUrl(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === "string") {
                    resolve(reader.result);
                    return;
                }
                reject(new Error("Cannot convert image blob"));
            };
            reader.onerror = () => reject(new Error("FileReader failed"));
            reader.readAsDataURL(blob);
        });
    }

    async function scanOnce() {
        if (isBusy || !isCameraReady) {
            return;
        }

        try {
            setIsBusy(true);

            const blob = await captureBlob();
            const imageBase64 = await blobToDataUrl(blob);

            const response = await fetch(backendUrl("/attendance/recognize"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    session_id: sessionId,
                    image_base64: imageBase64,
                    min_similarity: minSimilarity,
                    top_k: 1,
                }),
            });

            const data = (await response.json().catch(() => ({}))) as AttendanceResponse;
            if (!response.ok || !data.results) {
                return;
            }

            const newEvents = data.results.slice(0, 3).map((item, index) => {
                const studentLabel = item.student_id ?? "Unknown";
                return {
                    id: `${Date.now()}-${index}`,
                    status: item.status,
                    studentLabel,
                    similarity: item.similarity,
                    createdAt: new Date().toLocaleTimeString(),
                } satisfies EventItem;
            });

            if (newEvents.length > 0) {
                setEvents((prev) => [...newEvents, ...prev].slice(0, 10));

                const first = newEvents[0];
                setPopupText(
                    first.status === "matched"
                        ? `Recognized: ${first.studentLabel} (${first.similarity.toFixed(2)})`
                        : "Unknown face detected",
                );

                window.setTimeout(() => {
                    setPopupText(null);
                }, 1800);
            }
        } catch {
            // Keep scanning loop alive even if one frame fails.
        } finally {
            setIsBusy(false);
        }
    }

    function startScanning() {
        if (!isCameraReady || isScanning) {
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
                <header className="rounded-2xl bg-sky-700 p-5 text-white shadow-lg sm:p-6">
                    <div className="mb-3 flex items-center gap-3">
                        <div className="rounded-xl bg-white/20 p-2.5 shadow-md">
                            <ScanSearch className="h-7 w-7" />
                        </div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em]">Realtime Attendance</p>
                    </div>
                    <h1 className="text-2xl font-bold sm:text-3xl">Scan Live Camera Frames</h1>
                    <p className="mt-2 text-sm text-sky-50 sm:text-base">
                        Frames are sent to backend attendance API. Backend handles business rules and duplicate prevention.
                    </p>
                </header>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-100 p-3 shadow-sm">
                    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-zinc-900">
                        <video ref={videoRef} className="aspect-video w-full object-cover" autoPlay muted playsInline />
                        {!isCameraReady && (
                            <div className="absolute inset-0 grid place-items-center bg-black/45 text-sm font-medium text-white">
                                Waiting for camera permission...
                            </div>
                        )}
                        {popupText && (
                            <div className="absolute left-3 right-3 top-3 rounded-xl bg-sky-950/85 px-4 py-2.5 text-sm font-semibold text-sky-50 shadow-xl">
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
                            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
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
                            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                            type="number"
                            min={0}
                            max={1}
                            step={0.01}
                            value={minSimilarity}
                            onChange={(e) => setMinSimilarity(Number(e.target.value))}
                        />
                    </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                    <button
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-sky-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={startScanning}
                        disabled={!isCameraReady || isScanning || !sessionId.trim()}
                    >
                        <Eye className="h-5 w-5" />
                        Start Scan
                    </button>
                    <button
                        className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={stopScanning}
                        disabled={!isScanning}
                    >
                        Stop Scan
                    </button>
                </div>

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
                                    <span className={event.status === "matched" ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>
                                        {event.status}
                                    </span>
                                    <span>sim={event.similarity.toFixed(2)}</span>
                                    <time className="text-slate-500">{event.createdAt}</time>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <footer className="mt-5 flex flex-wrap gap-4 text-sm font-semibold text-sky-700">
                    <Link className="rounded-lg px-2 py-1 hover:bg-sky-50" href="/enrollment">
                        Go to enrollment
                    </Link>
                    <Link className="rounded-lg px-2 py-1 hover:bg-sky-50" href="/">
                        Back to dashboard
                    </Link>
                </footer>
            </section>
        </main>
    );
}
