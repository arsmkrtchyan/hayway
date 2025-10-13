// resources/js/Pages/Company/TripsIndex.jsx
import React, { useMemo, useState } from "react";
import { Link, router } from "@inertiajs/react";
import dayjs from "dayjs";
import CompanyLayout from "./Layout";

const hyNum = (n)=>{ try{ return new Intl.NumberFormat("hy-AM").format(n||0);}catch{return String(n);} };

export default function TripsIndex({ company, trips = [] }) {
    const [q, setQ] = useState("");
    const [status, setStatus] = useState("all"); // all|draft|published|archived

    const filtered = useMemo(()=>{
        return trips.filter(t=>{
            const matchQ = !q || `${t.from_addr} ${t.to_addr}`.toLowerCase().includes(q.toLowerCase());
            const matchS = status==='all' || t.status===status;
            return matchQ && matchS;
        });
    }, [q, status, trips]);

    return (
        <CompanyLayout company={company} current="trips_list">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-emerald-800">Երթուղիներ</h1>
                    <div className="text-sm text-slate-600">Ընդամենը՝ <b>{trips.length}</b></div>
                </div>
                <div className="flex gap-2">
                    {/* Если потом сделаешь отдельную страницу создания — поставим сюда ссылку */}
                    {/* <Link href={route('company.trips.create', company.id)} className="rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow">
            + Ստեղծել երթուղի
          </Link> */}
                    <Link href={route('company.requests.index', company.id)} className="rounded-xl border bg-white/70 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white">Հայտեր</Link>
                </div>
            </div>

            <section className="mb-4 rounded-2xl border bg-white/70 p-4 backdrop-blur">
                <div className="grid gap-3 md:grid-cols-3">
                    <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Որոնում՝ սկս → վերջ"
                           className="rounded-xl border px-3 py-2" />
                    <select value={status} onChange={(e)=>setStatus(e.target.value)} className="rounded-xl border px-3 py-2">
                        <option value="all">Բոլորը</option>
                        <option value="draft">Սևագիր</option>
                        <option value="published">Հրապարակված</option>
                        <option value="archived">Արխիվ</option>
                    </select>
                    <div className="text-sm text-slate-600 self-center">
                        Սպասվող հայտեր՝ <b>{trips.reduce((s,t)=>s+(t.pending_requests_count||0),0)}</b>
                    </div>
                </div>
            </section>

            <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {filtered.map(t => <TripCard key={t.id} company={company} t={t} />)}
                {filtered.length===0 && (
                    <div className="md:col-span-2 rounded-2xl border bg-white p-6 text-center text-slate-500">Չկա</div>
                )}
            </section>
        </CompanyLayout>
    );
}

function TripCard({ company, t }) {
    const pending = t.pending_requests_count || 0;
    const acc = t.accepted_requests_count || 0;
    const seats = `${t.seats_taken||0}/${t.seats_total||0}`;
    const goShow = () => router.visit(route('company.trips.show', [company.id, t.id]));

    const badge = t.status==='published'
        ? "bg-emerald-100 text-emerald-700"
        : t.status==='draft'
            ? "bg-amber-100 text-amber-800"
            : "bg-slate-100 text-slate-800";

    return (
        <div className="rounded-2xl border bg-white/70 p-4 backdrop-blur transition hover:bg-white">
            <div className="mb-1 text-sm text-slate-600">{t.vehicle?.brand} {t.vehicle?.model} · {t.vehicle?.plate}</div>
            <div className="font-semibold text-slate-900">{t.from_addr} → {t.to_addr}</div>
            <div className="text-sm text-slate-700">
                {t.departure_at ? dayjs(t.departure_at).format('YYYY-MM-DD HH:mm') : '—'} · {hyNum(t.price_amd)} AMD · Տեղեր՝ {seats}
            </div>
            <div className="mt-2 flex items-center gap-2">
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${badge}`}>
          {t.status==='published'?'Հրապարակված':t.status==='draft'?'Սևագիր':'Արխիվ'}
        </span>
                <span className="text-xs text-slate-600">Սպասվող հայտեր՝ {pending} · Հաստատված՝ {acc}</span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
                {t.status==='draft' && (t.seats_total - (t.seats_taken||0) > 0) && (
                    <button onClick={()=>router.post(route('company.trips.publish',[company.id,t.id]))}
                            className="rounded bg-gradient-to-r from-emerald-600 to-cyan-600 px-3 py-1.5 text-sm font-semibold text-white">
                        Հրապարակել
                    </button>
                )}
                {t.status!=='archived' && (
                    <button onClick={()=>router.post(route('company.trips.archive',[company.id,t.id]))}
                            className="rounded border bg-white px-3 py-1.5 text-sm hover:bg-slate-50">
                        Արխիվացնել
                    </button>
                )}
                {t.status==='archived' && (
                    <button onClick={()=>router.post(route('company.trips.unarchive',[company.id,t.id]))}
                            className="rounded bg-slate-100 px-3 py-1.5 text-sm">
                        Վերադարձնել (սևագիր)
                    </button>
                )}
                <button onClick={goShow} className="rounded border bg-white px-3 py-1.5 text-sm hover:bg-slate-50">Բացել</button>
            </div>
        </div>
    );
}
