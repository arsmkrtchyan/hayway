
import React, { useEffect, useState } from "react";
import { Link, usePage } from "@inertiajs/react";

/** Цвета/токены темы (изумрудно‑циановая) */
const brand = {
    grad: "from-emerald-600 via-teal-600 to-cyan-600",
    btn: "bg-gradient-to-r from-emerald-600 to-cyan-600",
    btnHover: "hover:from-emerald-500 hover:to-cyan-500",
    ring: "focus-visible:ring-emerald-500/50",
    textSoft: "text-slate-600",
    glass: "bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60",
    glassDark: "bg-slate-900/40 backdrop-blur supports-[backdrop-filter]:bg-slate-900/30",
};

export default function CompanyLayout({ company, current, children }) {
    const { props } = usePage();
    const user = props?.auth?.user;

    const tabs = [
        { key: "dashboard", label: "Սկիզբ", href: route("company.dashboard.show", company.id) },
        { key: "fleet", label: "Ֆլոտ", href: route("company.fleet.index", company.id) },
        { key: "drivers", label: "Վարորդներ", href: route("company.members.index", company.id) },
        { key: "trips_make", label: "Երթուղիներ — make", href: route("company.trips.make", company.id) },
        { key: "trips_list", label: "Երթուղիներ — list", href: route("company.trips.index", company.id) },

        { key: "requests", label: "Հայտեր", href: route("company.requests.index", company.id) },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
            {/* Header */}
            <header className={`sticky top-0 z-[1000] border-b border-white/10 bg-gradient-to-r ${brand.grad}`}>
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 text-white">
                    <div className="flex items-center gap-3">
                        {company?.logo ? (
                            <img
                                src={company.logo}
                                alt="logo"
                                className="h-9 w-9 rounded-lg border border-white/20 object-cover"
                            />
                        ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-sm font-bold">
                                {company?.name?.[0]?.toUpperCase() ?? "C"}
                            </div>
                        )}
                        <div className="leading-tight">
                            <div className="text-sm/5 opacity-80">Taxi Platform</div>
                            <div className="text-base font-semibold">{company?.name}</div>
                        </div>
                    </div>

                    <nav className="hidden gap-1 md:flex">
                        {tabs.map((t) => {
                            const active = current === t.key;
                            return (
                                <Link
                                    key={t.key}
                                    href={t.href}
                                    className={[
                                        "rounded-lg px-3 py-2 text-sm font-medium transition",
                                        active
                                            ? "bg-white/20 ring-1 ring-white/30 shadow-sm"
                                            : "hover:bg-white/10",
                                    ].join(" ")}
                                >
                                    {t.label}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="flex items-center gap-3">
                        <div className="hidden text-sm md:block">
                            <div className="opacity-80">Մուտք է գործել</div>
                            <div className="font-medium">{user?.name ?? "Օգտատեր"}</div>
                        </div>
                        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/20 text-sm font-semibold">
                            {user?.name?.[0]?.toUpperCase() ?? "U"}
                        </div>
                    </div>
                </div>

                {/* Mobile tabs */}
                <div className="mx-auto block max-w-7xl px-2 pb-3 md:hidden">
                    <div className={`flex overflow-x-auto rounded-xl ${brand.glassDark} p-1 text-white`}>
                        {tabs.map((t) => {
                            const active = current === t.key;
                            return (
                                <Link
                                    key={t.key}
                                    href={t.href}
                                    className={[
                                        "whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition",
                                        active ? "bg-white/20 shadow-sm" : "hover:bg-white/10",
                                    ].join(" ")}
                                >
                                    {t.label}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </header>

            {/* Flash */}
            <div className="mx-auto max-w-7xl px-4 pt-4">
                <Flash />
            </div>

            {/* Main */}
            <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>

            {/* Footer */}
            <footer className="px-4 py-6 text-center text-xs text-slate-500">
                © 2025 Taxi Platform
            </footer>
        </div>
    );
}

/** Универсальный флэш-бар: читает ok | warn | error | flash.success … */
function Flash() {
    const { props } = usePage();
    const f = props?.flash ?? {};
    const ok = props?.ok || f.ok || f.success;
    const warn = props?.warn || f.warn;
    const err = props?.error || f.error;
    const errorsBag = props?.errors || {};

    const firstErrMsg = Object.values(errorsBag)[0];

    if (!ok && !warn && !err && !firstErrMsg) return null;

    const Item = ({ type = "ok", children }) => {
        const palette =
            type === "ok"
                ? "bg-emerald-600 text-white"
                : type === "warn"
                    ? "bg-amber-500 text-white"
                    : "bg-rose-600 text-white";

        return (
            <div
                className={`mb-2 flex items-center justify-between rounded-xl px-3 py-2 text-sm ${palette} shadow`}
            >
                <div className="font-medium">{children}</div>
            </div>
        );
    };

    return (
        <div>
            {ok && <Item type="ok">{ok}</Item>}
            {warn && <Item type="warn">{warn}</Item>}
            {(err || firstErrMsg) && <Item type="err">{err || firstErrMsg}</Item>}
        </div>
    );
}
