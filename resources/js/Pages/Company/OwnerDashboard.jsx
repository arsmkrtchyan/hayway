// import React from "react";
// import CompanyLayout from "./Layout";
//
// export default function Dashboard({ company }) {
//     return (
//         <CompanyLayout company={company} current="dashboard">
//             <h1 className="text-2xl font-bold mb-4">Ընկերության վահանակ</h1>
//             <div className="grid md:grid-cols-4 gap-4">
//                 <Card title="Մեքենաներ" value={company.vehicles_count}/>
//                 <Card title="Երթուղիներ" value={company.trips_count}/>
//                 <Card title="Սպասվող հայտեր" value={company.pending_requests}/>
//                 <Card title="Սեփականատեր" value={company.owner?.name}/>
//             </div>
//         </CompanyLayout>
//     );
// }
//
// function Card({title, value}) {
//     return (
//         <div className="rounded-2xl border bg-white p-4">
//             <div className="text-sm text-black/60">{title}</div>
//             <div className="text-2xl font-bold mt-1">{value ?? '—'}</div>
//         </div>
//     );
// }
import React from "react";
import CompanyLayout from "./Layout";
import dayjs from "dayjs";
import {
    ResponsiveContainer,
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    BarChart, Bar, Legend,
    PieChart, Pie, Cell,
} from "recharts";
import { Link } from "@inertiajs/react";

const C = {
    emerald: "#10b981",
    cyan: "#06b6d4",
    ink: "#0f172a",
    glass: "bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60",
    card: "rounded-2xl border border-white/20 bg-white/70 shadow-sm backdrop-blur",
};

const AMD = (n) => new Intl.NumberFormat("hy-AM").format(n ?? 0);

export default function Dashboard({ company, kpis, funnel, series, top_drivers, recent_trips }) {
    const daily = series?.daily ?? [];

    const pieData = [
        { name: "Սպասում",    value: funnel?.pending   ?? 0 },
        { name: "Ընդունված",  value: funnel?.accepted  ?? 0 },
        { name: "Մերժված",    value: funnel?.rejected  ?? 0 },
        { name: "Չեղարկված",  value: funnel?.cancelled ?? 0 },
    ];
    const pieColors = ["#a7f3d0", "#10b981", "#fca5a5", "#93c5fd"];

    return (
        <CompanyLayout company={company} current="dashboard">
            <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-emerald-800">Վահանակ</h1>
                    <div className="text-sm text-slate-600">
                        Պարբերություն՝ {kpis?.from} → {kpis?.to}
                    </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/60 px-2.5 py-1">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
            Live
          </span>
                </div>
            </header>

            {/* KPI */}
            <section className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <Kpi title="Եկամուտ (30 օր)" value={`${AMD(kpis?.revenue_30d)} AMD`} accent />
                <Kpi title="Երթուղիներ (30 օր)" value={kpis?.trips_30d} />
                <Kpi title="Վաճառված տեղեր (30 օր)" value={kpis?.seats_sold_30d} />
                <Kpi title="Ընդունման տոկոս" value={`${((kpis?.accept_rate_30d ?? 0)*100).toFixed(1)}%`} />
                <Kpi title="Միջին գնահատական" value={kpis?.avg_rating?.toFixed?.(2) ?? "—"} />
            </section>

            {/* Charts row */}
            <section className="mb-6 grid gap-4 lg:grid-cols-3">
                {/* Revenue/Seats */}
                <div className={`${C.card} p-4 lg:col-span-2`}>
                    <div className="mb-2 flex items-baseline justify-between">
                        <h3 className="font-semibold text-emerald-900">Դինամիկա եկամուտի և տեղերի</h3>
                        <span className="text-xs text-slate-600">օրական (30 օր)</span>
                    </div>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={daily}>
                                <defs>
                                    <linearGradient id="gSeats" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={C.cyan} stopOpacity={0.6} />
                                        <stop offset="100%" stopColor={C.cyan} stopOpacity={0.06} />
                                    </linearGradient>
                                    <linearGradient id="gRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={C.emerald} stopOpacity={0.7} />
                                        <stop offset="100%" stopColor={C.emerald} stopOpacity={0.06} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#d1fae5" />
                                <XAxis dataKey="d" tickFormatter={(d)=>dayjs(d).format("MM-DD")} />
                                <YAxis yAxisId="left" />
                                <YAxis yAxisId="right" orientation="right" />
                                <Tooltip formatter={(v, k)=> k==='revenue' ? `${AMD(v)} AMD` : v} />
                                <Area yAxisId="left"  type="monotone" dataKey="seats"   name="Վաճառված տեղեր"
                                      stroke={C.cyan}    fill="url(#gSeats)"   strokeWidth={2} />
                                <Area yAxisId="right" type="monotone" dataKey="revenue" name="Եկամուտ"
                                      stroke={C.emerald} fill="url(#gRevenue)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Funnel Pie */}
                <div className={`${C.card} p-4`}>
                    <div className="mb-2 flex items-baseline justify-between">
                        <h3 className="font-semibold text-emerald-900">Հայտերի հոսք</h3>
                        <span className="text-xs text-slate-600">30 օր</span>
                    </div>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={92}>
                                    {pieData.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                                </Pie>
                                <Legend />
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </section>

            {/* Requests per day + Top drivers */}
            <section className="mb-6 grid gap-4 lg:grid-cols-3">
                {/* Requests bars */}
                <div className={`${C.card} p-4`}>
                    <div className="mb-2 flex items-baseline justify-between">
                        <h3 className="font-semibold text-emerald-900">Հայտեր ըստ օրերի</h3>
                        <span className="text-xs text-slate-600">30 օր</span>
                    </div>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={daily}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#d1fae5" />
                                <XAxis dataKey="d" tickFormatter={(d)=>dayjs(d).format("MM-DD")} />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="requests" name="Հայտեր"    fill={C.cyan} />
                                <Bar dataKey="accepted" name="Ընդունված" fill={C.emerald} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top drivers */}
                <div className={`${C.card} p-4 lg:col-span-2`}>
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="font-semibold text-emerald-900">Լավագույն վարորդներ (30 օր)</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                            <tr className="text-left text-slate-600">
                                <th className="py-2">Վարորդ</th>
                                <th className="py-2">Եկամուտ</th>
                                <th className="py-2">Տեղեր</th>
                                <th className="py-2">Երթուղիներ</th>
                            </tr>
                            </thead>
                            <tbody>
                            {top_drivers?.map(d => (
                                <tr key={d.id} className="border-t border-white/30">
                                    <td className="py-2">{d.name || "—"}</td>
                                    <td className="py-2 font-medium">{AMD(d.revenue)} AMD</td>
                                    <td className="py-2">{d.seats}</td>
                                    <td className="py-2">{d.trips}</td>
                                </tr>
                            ))}
                            {(!top_drivers || top_drivers.length===0) && (
                                <tr><td colSpan={4} className="py-6 text-center text-slate-500">Դատարկ է</td></tr>
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* Recent trips */}
            <section className={`${C.card} p-4`}>
                <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-semibold text-emerald-900">Վերջին երթուղիներ</h3>
                    <Link href={route('company.trips.index', company.id)} className="text-sm text-cyan-700 hover:underline">
                        Դիտել բոլորը
                    </Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                        <tr className="text-left text-slate-600">
                            <th className="py-2">Մեկնում → Վերջնակետ</th>
                            <th className="py-2">Մեքենա</th>
                            <th className="py-2">Վարորդ</th>
                            <th className="py-2">Գին</th>
                            <th className="py-2">Տեղեր</th>
                            <th className="py-2">Կարգավիճակ</th>
                            <th className="py-2">Ժամանակ</th>
                        </tr>
                        </thead>
                        <tbody>
                        {recent_trips?.map(t => (
                            <tr key={t.id} className="border-t border-white/30">
                                <td className="py-2 font-medium">{t.from} → {t.to}</td>
                                <td className="py-2">{t.vehicle || "—"}</td>
                                <td className="py-2">{t.driver || "—"}</td>
                                <td className="py-2">{AMD(t.price_amd)} AMD</td>
                                <td className="py-2">{t.seats}</td>
                                <td className="py-2"><StatusBadge status={t.status} /></td>
                                <td className="py-2">{t.departure_at ? dayjs(t.departure_at).format("YYYY-MM-DD HH:mm") : "—"}</td>
                            </tr>
                        ))}
                        {(!recent_trips || recent_trips.length===0) && (
                            <tr><td colSpan={7} className="py-6 text-center text-slate-500">Դատարկ է</td></tr>
                        )}
                        </tbody>
                    </table>
                </div>
            </section>
        </CompanyLayout>
    );
}

function Kpi({ title, value, accent=false }) {
    return (
        <div className={`${C.card} p-4`}>
            <div className={`inline-block rounded-xl px-3 py-1 text-xs font-semibold text-emerald-900
        ${accent ? "bg-gradient-to-r from-emerald-100 to-cyan-100" : "bg-white/80 border border-white/40"}`}>
                {title}
            </div>
            <div className="mt-3 text-3xl font-bold text-emerald-900">{value ?? "—"}</div>
        </div>
    );
}

function StatusBadge({ status }) {
    const map = {
        published: "bg-emerald-100 text-emerald-700",
        draft:     "bg-amber-100 text-amber-700",
        archived:  "bg-slate-100 text-slate-700",
        cancelled: "bg-rose-100 text-rose-700",
    };
    return (
        <span className={`rounded px-2 py-0.5 text-xs ${map[status] || "bg-slate-100 text-slate-700"}`}>
      {status}
    </span>
    );
}
