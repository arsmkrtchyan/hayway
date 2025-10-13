import React, {useEffect, useRef, useState} from "react";
import {Link, router} from "@inertiajs/react";
import TaxiTransition from "@/Components/TaxiTransition";
import NotificationsBell from "@/Components/Driver/NotificationsBell";

<meta name="csrf-token" content="{{ csrf_token() }}"/>
export default function DriverLayout({children, current = "my-trips"}) {
    const nav = [
        {key: "car", href: "/driver/car", label: "Իմ մեքենան"},
        {key: "make-trip", href: "/driver/make-trip", label: "Ստեղծել ուղևորություն"},
        {key: "my-trips", href: "/driver/my-trips", label: "Իմ ուղևորությունները"},
    ];

    const [transitionOn, setTransitionOn] = useState(false);
    const [finishArrived, setFinishArrived] = useState(false);
    const paintDoneRef = useRef(false);

    useEffect(() => {
        const removeStart = router.on('start', () => {
            paintDoneRef.current = false;
            setFinishArrived(false);
            setTransitionOn(true);
        });
        const removeFinish = router.on('finish', () => {
            setFinishArrived(true);
            if (paintDoneRef.current) setTransitionOn(false);
        });
        return () => {
            removeStart();
            removeFinish();
        };
    }, []);


    return (

        <div
            className="min-h-screen bg-[radial-gradient(70%_50%_at_50%_-10%,#ecfdf5,transparent),linear-gradient(to_bottom_right,#f8fafc,#ecfeff)]">
            <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
                    <Link href="/" className="flex items-center gap-2">
                        <span
                            className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 font-bold text-white">TX</span>
                        <span className="font-extrabold tracking-wide text-slate-900">Taxi Platform</span>
                    </Link>

                    <nav className="flex items-center gap-2">
                        {nav.map((n) => (
                            <Link
                                key={n.key}
                                href={n.href}
                                className={
                                    current === n.key
                                        ? "rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 px-3 py-1.5 text-sm font-medium text-white shadow"
                                        : "rounded-lg px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
                                }
                            >
                                {n.label}
                            </Link>
                        ))}
                        <NotificationsBell />
                    </nav>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>

            <footer className="border-t border-slate-200 py-2 text-center text-xs text-slate-600">
                © {new Date().getFullYear()} Taxi Platform · Վարորդի վահանակ
            </footer>

            {transitionOn && (
                <TaxiTransition
                    onPaintDone={() => {
                        paintDoneRef.current = true;
                        if (finishArrived) setTransitionOn(false);
                    }}
                />
            )}
        </div>
    );
}

