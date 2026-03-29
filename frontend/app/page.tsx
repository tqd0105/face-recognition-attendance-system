"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  LogOut,
  LockKeyhole,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { clearAccessToken, getAuthSession, type AuthSession } from "@/lib/backend";
import { FaceIdIcons, WebcamIcons, WebcamLiveIcons } from "@/components/icons";

type FeatureKey = "enrollment" | "attendance";

const guestSession: AuthSession = {
  token: "",
  role: "guest",
  displayName: "Guest",
};

export default function Home() {
  const router = useRouter();
  const [authSession, setAuthSession] = useState<AuthSession>(guestSession);
  const [warningModal, setWarningModal] = useState<{ open: boolean; feature: FeatureKey | null }>({
    open: false,
    feature: null,
  });
  const [roleWarning, setRoleWarning] = useState<string | null>(null);

  useEffect(() => {
    const syncAuth = () => {
      setAuthSession(getAuthSession());
    };

    syncAuth();
    window.addEventListener("focus", syncAuth);
    window.addEventListener("storage", syncAuth);
    return () => {
      window.removeEventListener("focus", syncAuth);
      window.removeEventListener("storage", syncAuth);
    };
  }, []);

  function logout() {
    clearAccessToken();
    setAuthSession(getAuthSession());
  }

  function openFeature(feature: FeatureKey) {
    if (authSession.role === "guest") {
      setWarningModal({ open: true, feature });
      return;
    }

    if (feature === "enrollment") {
      if (authSession.role !== "teacher") {
        setRoleWarning("Enrollment is available for teacher role only.");
        window.setTimeout(() => setRoleWarning(null), 2200);
        return;
      }

      router.push("/enrollment");
      return;
    }

    router.push("/attendance");
  }

  function closeModal() {
    setWarningModal({ open: false, feature: null });
  }

  const featureLabel = warningModal.feature === "enrollment" ? "Face Enrollment" : "Realtime Attendance";
  const primaryActionHref = authSession.role === "teacher" ? "/enrollment" : "/attendance";
  const primaryActionLabel = authSession.role === "teacher" ? "Open Enrollment" : "Open Attendance";
  const sessionLabel =
    authSession.role === "guest"
      ? "Guest"
      : `${authSession.role.charAt(0).toUpperCase()}${authSession.role.slice(1)}: ${authSession.displayName}`;

  return (
    <main className="motion-page relative min-h-screen overflow-hidden bg-slate-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 bottom-16 h-80 w-80 rounded-full bg-blue-300/20 blur-3xl" />

      <section className="relative mx-auto flex w-full max-w-6xl flex-col gap-5 rounded-3xl border border-slate-200/80 bg-white/95 p-4 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.55)] sm:p-7">
        <header className="flex justify-between items-center motion-hero rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 p-6 text-white shadow-xl sm:p-8">

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/15 p-3 shadow-md ring-1 ring-white/20">
                <Image src={FaceIdIcons} width={50} height={50} alt="Face ID" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">Face Recognition Attendance System</p>
                <h1 className="text-3xl font-bold leading-tight sm:text-4xl">Overview Dashboard</h1>
              </div>
            </div>


          </div>

          <div className="w-full sm:w-auto">
            <div className="rounded-2xl border border-white/30 bg-white/15 p-4 text-sm shadow-lg backdrop-blur">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">
                {authSession.role === "guest" ? <LockKeyhole className="h-4 w-4" /> : authSession.role === "teacher" ? <ShieldCheck className="h-4 w-4" /> : <GraduationCap className="h-4 w-4" />}
                {sessionLabel}
              </p>

              {authSession.role === "guest" ? (
                <>
                  <p className="mt-2 text-slate-100"> Login is required for more actions.</p>
                  <Link
                    className="interactive-btn w-full mt-3 inline-flex items-center justify-center rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-md transition hover:bg-slate-100"
                    data-role="guest"
                    href="/login"
                  >
                    Login
                  </Link>
                </>
              ) : (
                <>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      className="interactive-btn inline-flex items-center justify-center rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-md transition hover:bg-slate-100"
                      data-role={authSession.role}
                      href={primaryActionHref}
                    >
                      {primaryActionLabel}
                    </Link>
                    <button
                      type="button"
                      className="interactive-btn inline-flex items-center justify-center gap-2 rounded-xl border border-white/40 bg-transparent px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                      data-role={authSession.role}
                      onClick={logout}
                    >
                      <LogOut className="h-4 w-4" /> Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* <p className="mt-3 max-w-3xl text-sm text-slate-100 sm:text-base">
            Home only introduces product capabilities and user experience. Real operation access lives inside role-based Teacher or Student workspaces.
          </p> */}


        </header>

        <div className="motion-stagger grid gap-4 lg:grid-cols-2">
          <article className="interactive-card rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50 to-white p-6 shadow-sm" data-role="teacher">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <div className="mb-2 sm:mb-0">
                <Image src={WebcamIcons} width={120} height={120} alt="Enrollment" className="h-20 w-20 object-contain sm:h-24 sm:w-24" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-blue-950">Face Enrollment</h2>
                <p className="mt-3 text-base leading-7 text-blue-900/85">
                  Explore the workflow for entering student ID, course class ID, and creating face enrollment records.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 justify-between mt-6">
              <button
                type="button"
                className="cursor-pointer interactive-btn inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-base font-semibold text-white shadow-md transition hover:bg-blue-700 hover:shadow-lg"
                data-role={authSession.role}
                onClick={() => openFeature("enrollment")}
              >
                Explore Enrollment
              </button>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">Setup</span>
            </div>
          </article>

          <article className="interactive-card rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50 to-white p-6 shadow-sm" data-role="student">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <div className="mb-2 sm:mb-0">
                <Image src={WebcamLiveIcons} width={120} height={120} alt="Realtime attendance" className="h-20 w-20 object-contain sm:h-24 sm:w-24" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-indigo-950">Realtime Attendance</h2>
                <p className="mt-3 text-base leading-7 text-indigo-900/90">
                  Explore session-based attendance event tracking, including polling and realtime visibility.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                type="button"
                className="interactive-btn inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-base font-semibold text-white shadow-md transition hover:bg-indigo-700 hover:shadow-lg"
                data-role={authSession.role}
                onClick={() => openFeature("attendance")}
              >
                Explore Attendance
              </button>
              <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">Realtime</span>
            </div>
          </article>
        </div>

        {roleWarning && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 shadow-sm">
            {roleWarning}
          </div>
        )}

      </section>

      {warningModal.open && (
        <div className="motion-modal-backdrop fixed inset-0 z-50 grid place-items-center bg-slate-900/45 px-4" role="dialog" aria-modal="true">
          <div className="motion-modal-panel interactive-card w-full max-w-md rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5 shadow-2xl" data-role="guest">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
              <ShieldAlert className="h-4 w-4" />
              Login Required
            </p>
            <h2 className="mt-2 text-xl font-bold text-amber-950">You are not signed in</h2>
            <p className="mt-2 text-sm text-amber-900">
              To open <strong>{featureLabel}</strong>, sign in with a Teacher or Student account.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                className="interactive-btn inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-black"
                data-role="guest"
                href="/login"
              >
                Open Login
              </Link>
              <button
                type="button"
                className="interactive-btn inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-semibold text-amber-900 shadow-sm transition hover:bg-amber-100"
                data-role="guest"
                onClick={closeModal}
              >
                <X className="h-4 w-4" />
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
