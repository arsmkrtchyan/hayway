import React from "react";
import { router } from "@inertiajs/react";
import CompanyLayout from "./Layout";

export default function Requests({ company, requests }) {
    function accept(id){ router.post(route('company.requests.accept', [company.id, id])); }
    function decline(id){ router.post(route('company.requests.decline', [company.id, id])); }

    return (
        <CompanyLayout company={company} current="requests">
            <h1 className="text-2xl font-bold mb-4">Հայտերի հերթ</h1>
            <div className="grid gap-3">
                {requests.map(r=>(
                    <div key={r.id} className="rounded-2xl border bg-white p-4 flex items-center justify-between">
                        <div>
                            <div className="text-sm text-black/60">{r.trip.from_addr} → {r.trip.to_addr} · {r.trip.departure_at}</div>
                            <div className="font-semibold">{r.user?.name} · տեղեր՝ {r.seats} · {r.payment==='card'?'Քարտ':'Կանխիկ'}</div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={()=>accept(r.id)} className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-sm">Ընդունել</button>
                            <button onClick={()=>decline(r.id)} className="rounded-lg bg-rose-600 text-white px-3 py-1.5 text-sm">Մերժել</button>
                        </div>
                    </div>
                ))}
                {requests.length===0 && <div className="rounded-2xl border bg-white p-6 text-center text-black/60">Սպասվող հայտեր չկան</div>}
            </div>
        </CompanyLayout>
    );
}
