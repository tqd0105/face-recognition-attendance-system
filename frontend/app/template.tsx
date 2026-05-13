"use client";

export default function Template({ children }: { children: React.ReactNode }) {
    return (
        <div className="motion-route-transition">
            {children}
        </div>
    );
}
