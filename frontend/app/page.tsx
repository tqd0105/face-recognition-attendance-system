import Link from "next/link";
import { Camera, Clock3, ScanFace } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-xl sm:p-7">
        <header className="rounded-2xl bg-slate-800 p-5 text-white shadow-lg sm:p-7">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/20 p-2.5 shadow-md">
              <ScanFace className="h-8 w-8" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white">
                Face Recognition Attendance
              </p>
              <h1 className=" text-2xl font-bold leading-tight sm:text-4xl">Control Center Dashboard</h1>
            </div>
          </div>

          <p className="mt-2 max-w-3xl text-sm text-slate-100 sm:text-base">
            Manage face enrollment and realtime attendance with a clean workflow. Frontend calls backend APIs, and backend coordinates AI recognition.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="rounded-xl bg-blue-600 p-2.5 text-white shadow-md">
                <Camera className="h-6 w-6" />
              </div>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">Setup</span>
            </div>

            <h2 className="text-xl font-bold text-blue-950">Face Enrollment</h2>
            <p className="mt-2 text-sm leading-6 text-blue-900/85">
              Capture a clear face image to create student biometric data via backend enrollment API.
            </p>

            <Link
              className="mt-5 inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 hover:shadow-lg"
              href="/enrollment"
            >
              Open Enrollment
            </Link>
          </article>

          <article className="rounded-2xl border border-sky-100 bg-sky-50 p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="rounded-xl bg-indigo-600 p-2.5 text-white shadow-md">
                <Clock3 className="h-6 w-6" />
              </div>
              <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">Realtime</span>
            </div>

            <h2 className="text-xl font-bold text-indigo-950">Realtime Attendance</h2>
            <p className="mt-2 text-sm leading-6 text-indigo-900/90">
              Continuously scan frames, send to backend recognition endpoint, and monitor latest events.
            </p>

            <Link
              className="mt-5 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700 hover:shadow-lg"
              href="/attendance"
            >
              Open Attendance
            </Link>
          </article>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
          <p className="text-sm text-slate-700">
            First time setup: sign in as teacher to store auth token for protected APIs.
          </p>
          <Link
            className="mt-3 inline-flex items-center justify-center rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-slate-900 hover:shadow-lg"
            href="/login"
          >
            Open Login
          </Link>
        </div>

      </section>
    </main>
  );
}
