import React from 'react';
import { router } from '@inertiajs/react';


export default function AdminDashboard({ drivers = [], companies = [] }){
    return (
        <div className="max-w-6xl mx-auto py-10 px-4 space-y-8">
            <h1 className="text-3xl font-bold mb-4">Админ — одобрения</h1>
            <Section title="Таксисты (ожидают)">
                {drivers.length===0 && <Empty>Нет заявок</Empty>}
                <div className="grid md:grid-cols-2 gap-4">
                    {drivers.map(d => (
                        <div key={d.id} className="rounded-2xl border p-4 bg-white">
                            <div className="font-semibold">{d.name} · {d.email}</div>
                            <div className="text-sm text-slate-600">KYC загружен</div>
                            <div className="mt-3 flex gap-2">
                                <button onClick={()=>router.post(`/admin/driver/${d.id}/approve`)} className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white">Одобрить</button>
                                <button onClick={()=>router.post(`/admin/driver/${d.id}/reject`)} className="px-3 py-1.5 rounded-xl bg-rose-600 text-white">Отклонить</button>
                            </div>
                        </div>
                    ))}
                </div>
            </Section>


            <Section title="Компании (ожидают)">
                {companies.length===0 && <Empty>Нет заявок</Empty>}
                <div className="grid md:grid-cols-2 gap-4">
                    {companies.map(c => (
                        <div key={c.id} className="rounded-2xl border p-4 bg-white">
                            <div className="font-semibold">{c.name}</div>
                            <div className="text-sm text-slate-600">Владелец: {c.owner?.name} · {c.email}</div>
                            <div className="mt-3 flex gap-2">
                                <button onClick={()=>router.post(`/admin/company/${c.id}/approve`)} className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white">Одобрить</button>
                                <button onClick={()=>router.post(`/admin/company/${c.id}/reject`)} className="px-3 py-1.5 rounded-xl bg-rose-600 text-white">Отклонить</button>
                            </div>
                        </div>
                    ))}
                </div>
            </Section>
        </div>
    );
}


function Section({title,children}){
    return (
        <section>
            <h2 className="text-xl font-semibold mb-2">{title}</h2>
            {children}
        </section>
    );
}
function Empty({children}){ return <div className="rounded-xl border p-6 text-center text-slate-500 bg-white">{children}</div>; }
