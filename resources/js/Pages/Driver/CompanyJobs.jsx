// import React from "react";
// import { router } from "@inertiajs/react";
// import dayjs from "dayjs";
// import DriverLayout from "@/Layouts/DriverLayout";
//
// export default function CompanyJobs({ active = [], upcoming = [], done = [] }) {
//     return (
//         <DriverLayout current="company-jobs">
//             <div className="space-y-8">
//                 <h1 className="text-3xl font-extrabold text-black">Իմ հանձնարարումները</h1>
//
//                 {/* Активные (в пути) */}
//                 <Section title="Ընթացքում" emptyText="Չկան ընթացիկ երթուղիներ">
//                     {active.map(t => <TripCard key={t.id} t={t} kind="active" />)}
//                 </Section>
//
//                 {/* Назначенные на меня */}
//                 <Section title="Նշանակված ինձ" emptyText="Չկան նշանակված երթուղիներ">
//                     {upcoming.map(t => <TripCard key={t.id} t={t} kind="upcoming" />)}
//                 </Section>
//
//                 {/* Завершённые */}
//                 <Section title="Վերջին ավարտվածները" emptyText="Դեռ չկան ավարտվածներ">
//                     {done.map(t => <TripCard key={t.id} t={t} kind="done" />)}
//                 </Section>
//             </div>
//         </DriverLayout>
//     );
// }
//
// function Section({ title, children, emptyText }) {
//     const has = React.Children.count(children) > 0;
//     return (
//         <section className="rounded-3xl border border-black/10 bg-white p-5">
//             <div className="mb-3 text-xl font-bold text-black">{title}</div>
//             {has ? <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">{children}</div>
//                 : <div className="text-black/60">{emptyText}</div>}
//         </section>
//     );
// }
//
// function TripCard({ t, kind }) {
//     const seatsLeft = Math.max(0, (t.seats_total ?? 0) - (t.seats_taken ?? 0));
//     const when = t.departure_at ? dayjs(t.departure_at).format("MM-DD HH:mm") : "—";
//     const statusBadge = badge(t.status);
//     const driverBadge = driverBadgeCls(t.driver_state);
//
//     return (
//         <div className="rounded-2xl border border-black/10 bg-white p-4">
//             <div className="text-sm text-black/60">
//                 {t.company ? `${t.company.name}` : "—"} · {t.vehicle ? `${t.vehicle.brand} ${t.vehicle.model} · ${t.vehicle.plate}` : "—"}
//             </div>
//             <div className="mt-1 font-semibold text-black">
//                 {t.from_addr} → {t.to_addr}
//             </div>
//             <div className="text-sm text-black/70">Մեկնում՝ {when}</div>
//             <div className="text-sm text-black/70">Գին՝ {fmt(t.price_amd)} AMD · Տեղեր՝ {t.seats_taken}/{t.seats_total}</div>
//
//             <div className="mt-2 flex flex-wrap gap-2">
//                 <span className={`text-xs px-2 py-1 rounded ${statusBadge.cls}`}>{statusBadge.text}</span>
//                 <span className={`text-xs px-2 py-1 rounded ${driverBadge.cls}`}>{driverBadge.text}</span>
//                 <span className="text-xs text-black/60">հայտեր՝ {t.pending_requests_count} սպասում · {t.accepted_requests_count} հաստատված</span>
//             </div>
//
//             <div className="mt-3 flex gap-2">
//                 {kind === "upcoming" && (
//                     <button
//                         onClick={() => router.post(route('driver.jobs.start', { trip: t.id }))}
//                         className="px-3 py-1.5 rounded bg-black text-[#ffdd2c]"
//                     >
//                         Սկսել երթուղին
//                     </button>
//                 )}
//                 {kind === "active" && (
//                     <button
//                         onClick={() => router.post(route('driver.jobs.finish', { trip: t.id }))}
//                         className="px-3 py-1.5 rounded bg-emerald-600 text-white"
//                     >
//                         Ավարտել
//                     </button>
//                 )}
//             </div>
//         </div>
//     );
// }
//
// const fmt = n => new Intl.NumberFormat('hy-AM').format(n || 0);
//
// function badge(status){
//     if (status === 'published') return { cls: 'bg-emerald-100 text-emerald-700', text: 'Հրապարակված' };
//     if (status === 'draft')     return { cls: 'bg-amber-100 text-amber-700',   text: 'Սևագիր' };
//     if (status === 'archived')  return { cls: 'bg-slate-100 text-slate-700',   text: 'Արխիվ' };
//     return { cls: 'bg-rose-100 text-rose-700', text: status };
// }
// function driverBadgeCls(s){
//     if (s === 'en_route') return { cls: 'bg-blue-100 text-blue-700', text: 'Ընթացքում' };
//     if (s === 'done')     return { cls: 'bg-slate-100 text-slate-700', text: 'Ավարտված' };
//     return { cls: 'bg-amber-100 text-amber-700', text: 'Նշանակված' };
// }
import React, { useMemo, useState } from "react";
import dayjs from "dayjs";
import { router, Link } from "@inertiajs/react";
import { motion, AnimatePresence } from "framer-motion";
import {
    LayoutDashboard,
    Route as RouteIcon,
    CheckCircle2,
    History,
    CalendarClock,
    Search,
    Filter,
    MapPin,
    Car,
    Users,
    Banknote,
    ArrowRight,
    TimerReset,
} from "lucide-react";
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from "recharts";
import CompanyDriverLayout from "@/Layouts/CompanyDriverLayout";

const hyNum = (n) => { try { return new Intl.NumberFormat("hy-AM").format(n || 0); } catch { return String(n); } };
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const toRoute = (name, params) => (typeof route === "function" ? route(name, params) : `/${name}`);

export default function CompanyJobs({ active = [], upcoming = [], done = [] }) {
    const [tab, setTab] = useState("dashboard");
    const [q, setQ] = useState("");

    const filtered = useMemo(() => ({
        active: filterTrips(active, q),
        upcoming: filterTrips(upcoming, q),
        done: filterTrips(done, q),
    }), [active, upcoming, done, q]);

    const kpis = useMemo(() => buildKpis({ active: filtered.active, upcoming: filtered.upcoming, done: filtered.done }), [filtered]);
    const daily = useMemo(() => buildDailySeries([...active, ...done, ...upcoming]), [active, done, upcoming]);

    const hasActiveAny = (active || []).length > 0;

    return (
        <CompanyDriverLayout
            current="jobs"
            title="Ընկերության հանձնարարումներ"
            description="Վերահսկեք ընթացիկ, նշանակված և ավարտված ուղևորությունները մի տեղում"
        >
            <div className="grid grid-cols-12 gap-5">
                {/* Sidebar */}
                <aside className="col-span-12 md:col-span-3 lg:col-span-3">
                    <div className="sticky top-4 rounded-3xl border border-emerald-200/60 bg-white/80 backdrop-blur p-4">
                            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                                <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 grid place-content-center text-white">
                                    <RouteIcon size={20} />
                                </div>
                                <div>
                                    <div className="text-xs uppercase tracking-wide text-slate-500">Ընկերություն</div>
                                </div>
                            </div>

                            <nav className="mt-3 space-y-1">
                                <SidebarBtn icon={<LayoutDashboard size={18} />} label="Դաշբորդ" active={tab === "dashboard"} onClick={() => setTab("dashboard")} />
                                <SidebarBtn icon={<TimerReset size={18} />} label="Ընթացքում" active={tab === "active"} onClick={() => setTab("active")} />
                                <SidebarBtn icon={<CalendarClock size={18} />} label="Նշանակված" active={tab === "upcoming"} onClick={() => setTab("upcoming")} />
                                <SidebarBtn icon={<History size={18} />} label="Պատմություն" active={tab === "history"} onClick={() => setTab("history")} />
                            </nav>

                            <div className="mt-6">
                                <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Որոնում</div>
                                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                                    <Search size={16} className="text-slate-400" />
                                    <input
                                        value={q}
                                        onChange={(e) => setQ(e.target.value)}
                                        placeholder="քաղաք, հասցե…"
                                        className="w-full bg-transparent outline-none text-sm"
                                    />
                                </div>
                            </div>

                            <div className="mt-6 rounded-2xl bg-gradient-to-br from-emerald-100 to-cyan-100 p-3">
                                <div className="text-xs text-slate-600">Արագ թվեր</div>
                                <div className="mt-2 grid grid-cols-2 gap-2 text-center">
                                    <KpiMini label="Սպասվող" value={kpis.upcomingCount} />
                                    <KpiMini label="Ավարտված" value={kpis.doneCount} />
                                </div>
                            </div>
                    </div>
                </aside>

                {/* Content */}
                <main className="col-span-12 md:col-span-9 lg:col-span-9">
                    <div className="rounded-3xl border border-emerald-200/60 bg-white/90 backdrop-blur p-4 md:p-6">
                            <AnimatePresence mode="wait">
                                {tab === "dashboard" && (
                                    <motion.div key="dashboard" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                                        <DashboardPanel kpis={kpis} series={daily} recent={[...active, ...upcoming].slice(0, 6)} hasActive={hasActiveAny} />
                                    </motion.div>
                                )}
                                {tab === "active" && (
                                    <motion.div key="active" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                                        <TripsGrid items={filtered.active} kind="active" hasActive={hasActiveAny} />
                                    </motion.div>
                                )}
                                {tab === "upcoming" && (
                                    <motion.div key="upcoming" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                                        <SectionTitle title="Նշանակված ինձ" subtitle="Սպասվող մեկնարկներ և հերթագրվածներ" />
                                        <TripsGrid items={filtered.upcoming} kind="upcoming" hasActive={hasActiveAny} />
                                    </motion.div>
                                )}
                                {tab === "history" && (
                                    <motion.div key="history" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                                        <SectionTitle title="Վերջին ավարտվածները" subtitle="Ավարտված երթուղիների կողքին տեսեք միավորներն ու եկամուտը" />
                                        <TripsGrid items={filtered.done} kind="done" hasActive={hasActiveAny} />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                    </div>
                </main>
            </div>
        </CompanyDriverLayout>
    );
}

/* ========== helpers ========== */
function filterTrips(arr, q) {
    if (!q) return arr || [];
    const s = q.toLowerCase().trim();
    return (arr || []).filter((t) =>
        [t.from_addr, t.to_addr, t.company?.name, t.vehicle?.brand, t.vehicle?.model]
            .filter(Boolean)
            .some((x) => String(x).toLowerCase().includes(s))
    );
}
function buildKpis({ active, upcoming, done }) {
    const activeCount = active?.length || 0;
    const upcomingCount = upcoming?.length || 0;
    const doneCount = done?.length || 0;
    const revenueAmd = [...(done || []), ...(active || [])]
        .reduce((sum, t) => sum + (t.price_amd || 0) * (t.seats_taken || 0), 0);
    return { activeCount, upcomingCount, doneCount, revenueAmd };
}
function buildDailySeries(items = []) {
    const days = [...Array(14)].map((_, i) => dayjs().subtract(13 - i, "day").format("MM-DD"));
    const map = new Map(days.map((d) => [d, 0]));
    const list = Array.isArray(items) ? items : [];
    list.forEach((t) => {
        const iso = t && t.departure_at ? t.departure_at : null;
        const d = iso ? dayjs(iso).format("MM-DD") : null;
        if (d && map.has(d)) map.set(d, (map.get(d) || 0) + 1);
    });
    return days.map((d) => ({ d, trips: map.get(d) || 0 }));
}

/* ========== UI bits ========== */
function SidebarBtn({ icon, label, active, onClick }) {
    return (
        <button
            onClick={onClick}
            className={[
                "w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm",
                active
                    ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow"
                    : "hover:bg-slate-50 text-slate-700 border border-transparent",
            ].join(" ")}
        >
            <span className="shrink-0">{icon}</span>
            <span className="truncate">{label}</span>
        </button>
    );
}
function SectionTitle({ title, subtitle }) {
    return (
        <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-900">{title}</h2>
            {subtitle && <div className="text-sm text-slate-500">{subtitle}</div>}
        </div>
    );
}
function KpiMini({ label, value }) {
    return (
        <div className="rounded-xl bg-white/70 border border-emerald-200/60 py-3">
            <div className="text-xs text-slate-500">{label}</div>
            <div className="text-lg font-bold">{hyNum(value)}</div>
        </div>
    );
}
function KpiCard({ icon, label, value, hint }) {
    return (
        <div className="rounded-2xl border border-emerald-200/60 bg-white p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-white grid place-content-center">
                {icon}
            </div>
            <div className="flex-1">
                <div className="text-xs text-slate-500">{label}</div>
                <div className="text-xl font-extrabold leading-6">{value}</div>
                {hint && <div className="text-[11px] text-slate-400">{hint}</div>}
            </div>
        </div>
    );
}
function DashboardPanel({ kpis, series, recent, hasActive }) {
    return (
        <div className="mt-5 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <KpiCard icon={<CalendarClock />} label="Սպասվող" value={kpis.upcomingCount} hint="քանակ" />
                <KpiCard icon={<CheckCircle2 />} label="Ավարտված" value={kpis.doneCount} hint="վերջին 90դ" />
                <KpiCard icon={<Banknote />} label="Եկամուտ" value={`${hyNum(kpis.revenueAmd)} AMD`} hint="գնահատված" />
            </div>

            <div className="rounded-2xl border border-slate-100 p-3">
                <div className="text-sm text-slate-600 mb-2">Վերջին 14 օր · երթուղիների ակտիվություն</div>
                <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={series} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                            <defs>
                                <linearGradient id="c1" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.05} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                            <XAxis dataKey="d" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                            <Tooltip formatter={(v, n) => [v, n === "trips" ? "Երթուղիներ" : "Տեսքեր"]} />
                            <Area type="monotone" dataKey="trips" stroke="#10b981" fill="url(#c1)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {recent.map((t) => (
                        <TripCard key={`rec-${t.id}`} t={t} kind={t.driver_state} hasActive={hasActive} />
                    ))}
                </div>
            </div>
        </div>
    );
}
function TripsGrid({ items, kind, hasActive }) {
    if (!items?.length) return <EmptyState />;
    return (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((t) => (
                <TripCard key={t.id} t={t} kind={kind} hasActive={hasActive} />
            ))}
        </div>
    );
}
function EmptyState() {
    return (
        <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-slate-500 bg-slate-50/50">
            Տվյալներ չկան
        </div>
    );
}
function actionBtn(kind, t, hasActive) {
    if (kind === "upcoming" || t.driver_state === "assigned") {
        const disabled = !!hasActive;
        return {
            text: "Սկսել",
            route: toRoute("driver.jobs.start", t.id),
            cls: "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 text-[#ffdd2c] text-sm",
            disabled,
            hint: disabled ? "Ակտիվ երթուղի արդեն կա" : null,
        };
    }
    if (kind === "active" || t.driver_state === "en_route") {
        return {
            text: "Ավարտել",
            route: toRoute("driver.jobs.finish", t.id),
            cls: "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-sm",
            disabled: false,
        };
    }
    return null;
}
function TripCard({ t, kind, hasActive }) {
    const when = t.departure_at ? dayjs(t.departure_at).format("MM-DD HH:mm") : "—";
    const seatsTaken = clamp(t.seats_taken || 0, 0, t.seats_total || 0);
    const progress = (100 * seatsTaken) / Math.max(1, t.seats_total || 1);
    const btn = actionBtn(kind, t, hasActive);

    const doPost = (url) => router.post(url);

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 hover:shadow-sm transition">
            <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{t.company?.name || ""}</span>
                <span className="inline-flex items-center gap-1"><Car size={14} />{t.vehicle ? `${t.vehicle.brand} ${t.vehicle.model}` : "—"}</span>
            </div>

            <div className="mt-2 font-semibold text-slate-900 flex items-center gap-2">
                <MapPin size={16} className="text-emerald-600" />
                <span className="truncate">{t.from_addr}</span>
                <ArrowRight size={16} className="text-slate-400" />
                <span className="truncate">{t.to_addr}</span>
            </div>

            <div className="mt-1 text-sm text-slate-600 flex items-center gap-4">
                <span className="inline-flex items-center gap-1"><CalendarClock size={14} /> {when}</span>
                <span className="inline-flex items-center gap-1"><Users size={14} /> {seatsTaken}/{t.seats_total}</span>
            </div>

            <div className="mt-3 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500" style={{ width: `${progress}%` }} />
            </div>

            <div className="mt-2 text-[13px] text-slate-500 flex items-center gap-3">
                <span className="inline-flex items-center gap-1"><Banknote size={14} /> {hyNum(t.price_amd)} AMD</span>
                {t.pending_requests_count != null && (
                    <span className="inline-flex items-center gap-1"><Filter size={14} /> հայտեր {t.pending_requests_count} • հսթ {t.accepted_requests_count ?? 0}</span>
                )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2 items-center">
                {btn && (
                    <button
                        onClick={() => !btn.disabled && doPost(btn.route)}
                        disabled={btn.disabled}
                        className={(btn.disabled ? "opacity-50 cursor-not-allowed " : "") + btn.cls}
                    >
                        <span>{btn.text}</span>
                    </button>
                )}
                <Link
                    href={toRoute("driver.trips.show", t.id)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 text-sm hover:bg-slate-50"
                >
                    Մանրամասներ
                </Link>
            </div>
            {btn?.hint && <div className="mt-1 text-xs text-amber-600">{btn.hint}</div>}
        </div>
    );
}
