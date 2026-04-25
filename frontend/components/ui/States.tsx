export function LoadingState({ label = "Loading data..." }: { label?: string }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-5 shadow-sm">
            <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-blue-500" />
                <p className="text-sm font-semibold text-slate-700">{label}</p>
            </div>
            <div className="mt-3 grid gap-2">
                <div className="h-2.5 w-11/12 animate-pulse rounded-full bg-slate-200" />
                <div className="h-2.5 w-9/12 animate-pulse rounded-full bg-slate-200" />
                <div className="h-2.5 w-10/12 animate-pulse rounded-full bg-slate-200" />
            </div>
        </div>
    );
}

export function ErrorState({ label }: { label: string }) {
    return (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-700">Request Error</p>
            <p className="mt-1 text-sm font-semibold text-rose-800">{label}</p>
        </div>
    );
}
