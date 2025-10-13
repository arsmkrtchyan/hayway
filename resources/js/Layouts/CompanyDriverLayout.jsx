import React from "react";
import { Link, usePage } from "@inertiajs/react";
import NotificationsBell from "@/Components/Driver/NotificationsBell";
import { ChevronLeft, Star } from "lucide-react";

const nav = [
    { key: "jobs", href: "/driver/jobs", label: "Ընկերության հանձնարարումներ" },
];

const fmtRating = (rating) => {
    if (rating == null) return null;
    const num = Number(rating);
    if (!Number.isFinite(num)) return null;
    return num.toFixed(2);
};

export default function CompanyDriverLayout({ children, current = "jobs", back, title, description, actions }) {
    const { auth } = usePage().props || {};
    const user = auth?.user;
    const rating = fmtRating(user?.rating);

    return (
        <div className="min-h-screen bg-[radial-gradient(70%_50%_at_50%_-10%,#ecfdf5,transparent),linear-gradient(to_bottom_right,#f8fafc,#ecfeff)]">
            <header className="sticky top-0 z-40 border-b border-emerald-100 bg-white/90 backdrop-blur">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
                    <Link href="/" className="flex items-center gap-2">
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 font-bold text-white">
                            TX
                        </span>
                        <span className="font-extrabold tracking-wide text-slate-900">Taxi Platform</span>
                    </Link>

                    <nav className="flex items-center gap-2">
                        {nav.map((item) => (
                            <Link
                                key={item.key}
                                href={item.href}
                                className={
                                    current === item.key
                                        ? "rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 px-3 py-1.5 text-sm font-medium text-white shadow"
                                        : "rounded-lg px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
                                }
                            >
                                {item.label}
                            </Link>
                        ))}
                        <div className="hidden items-center gap-2 rounded-xl border border-emerald-200/60 bg-white/70 px-3 py-1.5 text-sm text-slate-700 sm:flex">
                            <span className="font-semibold text-slate-900">{user?.name}</span>
                            {rating && (
                                <span className="inline-flex items-center gap-1 text-emerald-600">
                                    <Star size={14} />
                                    <span>{rating}</span>
                                </span>
                            )}
                        </div>
                        <NotificationsBell />
                    </nav>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-4 py-6">
                {(back || actions) && (
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        {back ? (
                            <Link
                                href={back.href}
                                className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white/90 px-3 py-1.5 text-sm font-medium text-emerald-700 shadow-sm hover:bg-emerald-50"
                            >
                                <ChevronLeft size={16} />
                                <span>{back.label}</span>
                            </Link>
                        ) : (
                            <span />
                        )}
                        {actions && <div className="flex items-center gap-2">{actions}</div>}
                    </div>
                )}

                {(title || description) && (
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            {title && <h1 className="text-3xl font-extrabold text-slate-900">{title}</h1>}
                            {description && <p className="text-sm text-slate-600">{description}</p>}
                        </div>
                        {rating && (
                            <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white/70 px-3 py-1.5 text-sm text-slate-700">
                                <span className="font-semibold text-slate-900">{user?.name}</span>
                                <span className="inline-flex items-center gap-1 text-emerald-600">
                                    <Star size={16} />
                                    <span>{rating}</span>
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {children}
            </main>

            <footer className="border-t border-emerald-100 py-2 text-center text-xs text-slate-500">
                © {new Date().getFullYear()} Taxi Platform · Ընկերության վարորդ
            </footer>
        </div>
    );
}
