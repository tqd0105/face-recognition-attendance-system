export function LoadingState({ label = "Loading data..." }: { label?: string }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm font-semibold text-slate-600 shadow-sm">
            {label}
        </div>
    );
}

export function ErrorState({ label }: { label: string }) {
    return (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-6 text-sm font-semibold text-rose-800 shadow-sm">
            {label}
        </div>
    );
}
