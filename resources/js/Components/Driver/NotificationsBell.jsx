import React, { useEffect, useRef, useState } from "react";
import { Link } from "@inertiajs/react";

export default function NotificationsBell({ className = "" }) {
    const [open, setOpen] = useState(false);
    const [count, setCount] = useState(0);
    const [latest, setLatest] = useState([]);
    const timer = useRef(null);
    const prev = useRef(0);

    useEffect(() => {
        if ("Notification" in window && Notification.permission === "default") {
            try {
                Notification.requestPermission().catch(() => {});
            } catch (_) {}
        }
    }, []);

    useEffect(() => {
        let stopped = false;
        const tick = async () => {
            try {
                const r = await fetch("/driver/pending-requests/state", { headers: { Accept: "application/json" } });
                if (!r.ok) throw new Error("state " + r.status);
                const d = await r.json();
                const next = Number(d?.total_pending || 0);
                setCount(next);
                setLatest(Array.isArray(d?.latest) ? d.latest : []);
                if (next > prev.current) {
                    beep();
                    if (
                        document.visibilityState !== "visible" &&
                        "Notification" in window &&
                        Notification.permission === "granted"
                    ) {
                        try {
                            const newest = d.latest?.[0];
                            const body = newest
                                ? `${newest.passenger_name || "Ուղևոր"} · ${newest.seats} տեղ · ${
                                      newest.trip?.from_addr || ""
                                  } → ${newest.trip?.to_addr || ""}`
                                : "Նոր հայտ";
                            new Notification("Նոր հայտ (booking request)", { body });
                        } catch (_) {}
                    }
                }
                prev.current = next;
            } catch (_) {}
            if (!stopped) timer.current = setTimeout(tick, 8000);
        };
        tick();
        return () => {
            stopped = true;
            if (timer.current) clearTimeout(timer.current);
        };
    }, []);

    return (
        <div className={`relative ${className}`}>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="relative grid h-9 w-9 place-items-center rounded-lg hover:bg-slate-100"
                aria-label="Notifications"
            >
                <BellIcon />
                {count > 0 && (
                    <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-rose-600 px-1.5 py-0.5 text-center text-[10px] font-bold text-white">
                        {count > 99 ? "99+" : count}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-96 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                    <div className="border-b border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900">
                        Հայտեր՝ սպասման մեջ {count}
                    </div>
                    <div className="max-h-80 divide-y overflow-y-auto">
                        {latest.length === 0 && <div className="p-3 text-sm text-slate-500">Դատարկ է</div>}
                        {latest.map((it) => (
                            <Link
                                key={it.id}
                                href={`/driver/trip/${it.trip?.id}`}
                                className="block p-3 text-sm hover:bg-slate-50"
                                onClick={() => setOpen(false)}
                            >
                                <div className="font-medium text-slate-900">
                                    {it.passenger_name || "Ուղևոր"} · {it.seats} տեղ · {it.payment === "cash" ? "Կանխիկ" : "Քարտ"}
                                </div>
                                <div className="text-slate-600">
                                    {it.trip?.from_addr} → {it.trip?.to_addr}
                                </div>
                            </Link>
                        ))}
                    </div>
                    <div className="border-t border-slate-200 p-2 text-right">
                        <Link href="/driver/my-trips" className="rounded-lg px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100">
                            Բացել «Իմ ուղևորությունները»
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}

function BellIcon() {
    return (
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-700" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 0 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5" />
            <path d="M9 17a3 3 0 0 0 6 0" />
        </svg>
    );
}

function beep() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = 880;
        osc.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
    } catch (_) {}
}
