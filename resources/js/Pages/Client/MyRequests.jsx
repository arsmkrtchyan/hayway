import React, { useMemo, useState } from "react";
import { Link, usePage, router } from "@inertiajs/react";
import dayjs from "dayjs";
import ClientLayout from "@/Layouts/ClientLayout";

const TABS = [
    { key: "upcoming",  label: "Սպասվող" },   // pending или accepted без driver_finished_at
    { key: "completed", label: "Ավարտված" },  // accepted и есть driver_finished_at
    { key: "cancelled", label: "Չեղարկված" }, // deleted / rejected / cancelled
];

export default function MyRequests(){
    const { items } = usePage().props;
    const [tab, setTab] = useState("upcoming");
    const all = items?.data || [];

    const filtered = useMemo(() => {
        return all.filter(r => {
            const finished = !!r.trip?.driver_finished_at;
            if (tab === "cancelled") return ["deleted","rejected","cancelled"].includes(r.status);
            if (tab === "completed") return r.status === "accepted" && finished;
            // upcoming
            return (r.status === "pending") || (r.status === "accepted" && !finished);
        });
    }, [all, tab]);

    return (
        <ClientLayout current="requests">
            <div className="space-y-6">
                <h1 className="text-3xl font-extrabold">Իմ հայտերը</h1>

                {/* переключатели */}
                <div className="inline-flex rounded-xl border border-black/10 bg-white p-1">
                    {TABS.map(t => (
                        <button
                            key={t.key}
                            onClick={()=>setTab(t.key)}
                            className={`px-4 py-2 text-sm rounded-lg ${tab===t.key ? "bg-black text-[#ffdd2c]" : "hover:bg-black/5"}`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* список */}
                <div className="space-y-3">
                    {filtered.length===0 && (
                        <div className="rounded-2xl border border-black/10 bg-white p-6 text-black/70">
                            Դատարկ ցուցակ։
                        </div>
                    )}
                    {filtered.map(r => <ReqRow key={r.id} r={r} />)}
                </div>

                {/* пагинация (остаётся общей, фильтрация — на текущей странице) */}
                <div className="flex gap-2 justify-center">
                    {items?.links?.map((l,i)=>(
                        <Link key={i} href={l.url || ''} preserveScroll
                              className={`px-3 py-1.5 rounded-lg text-sm ${l.active?'bg-black text-[#ffdd2c]':'bg-white border border-black/10 hover:bg-black/5'} ${!l.url?'pointer-events-none opacity-40':''}`}
                              dangerouslySetInnerHTML={{__html:l.label}}/>
                    ))}
                </div>
            </div>
        </ClientLayout>
    );
}

function ReqRow({ r }){
    const finished = !!r.trip?.driver_finished_at;
    const dep = r.trip?.departure_at ? dayjs(r.trip.departure_at).format("DD.MM.YYYY · HH:mm") : "—";

    const badge =
        r.status==='accepted' ? 'bg-emerald-100 text-emerald-700' :
            r.status==='pending'  ? 'bg-amber-100 text-amber-700' :
                r.status==='rejected' ? 'bg-rose-100 text-rose-700' :
                    r.status==='deleted'  ? 'bg-slate-100 text-slate-500' :
                        'bg-slate-100 text-slate-700';

    const st = {
        pending:'Սպասում է',
        accepted: finished ? 'Ավարտված' : 'Ընդունված',
        rejected:'Մերժված',
        cancelled:'Չեղարկված',
        deleted:'Հեռացված'
    }[r.status] || r.status;

    // отменять можно pending/accepted до завершения
    const canCancel = ['pending','accepted'].includes(r.status) && !finished;

    const removeReq = () => {
        if (!confirm('Չեղարկե՞լ հայտը')) return;
        router.delete(route('client.requests.destroy', r.id), {
            preserveScroll:true,
            onSuccess: ()=> router.reload({ only:['items'] })
        });
    };

    return (
        <div className="rounded-2xl border bg-white p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
                <div className="font-semibold text-slate-900 truncate">
                    {r.trip?.from_addr} → {r.trip?.to_addr}
                </div>
                <div className="text-xs text-slate-600 mt-0.5">{dep}</div>
                <div className="text-xs text-slate-600 mt-0.5">
                    Տեղեր՝ {r.seats} · Վարորդ՝ {r.trip?.driver}
                </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs px-2 py-1 rounded ${badge}`}>{st}</span>

                {canCancel && (
                    <button onClick={removeReq} className="text-xs px-2 py-1 rounded bg-rose-600 text-white">
                        Չեղարկել
                    </button>
                )}

                {r.status!=='deleted' && (
                    <Link href={route('client.booking.show', r.id)}
                          className="rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-100">
                        Դիտել ամրագիրը
                    </Link>
                )}
            </div>
        </div>
    );
}
