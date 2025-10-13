import React, { useState } from 'react'
import { router } from '@inertiajs/react'
import dayjs from 'dayjs'

export default function CompletedTrips({ items }) {
    return (
        <div className="mx-auto max-w-3xl p-4">
            <h1 className="mb-4 text-2xl font-bold">Ավարտված ուղևորություններ</h1>
            <div className="space-y-4">
                {items.data.map(row => <TripCard key={row.request_id} row={row} />)}
                {items.data.length===0 && <div className="text-black/60">Դեռ ոչինչ</div>}
            </div>
            <div className="mt-6 flex gap-2">
                {items.links?.map((l,i)=>(
                    <a key={i} href={l.url||'#'}
                       className={`rounded border px-3 py-1 text-sm ${l.active?'bg-black text-[#ffdd2c]':'bg-white'}`}
                       dangerouslySetInnerHTML={{__html:l.label}} />
                ))}
            </div>
        </div>
    )
}

function TripCard({ row }) {
    const t = row.trip
    const my = row.my_rating
    const [open, setOpen] = useState(false)

    return (
        <div className="rounded-2xl border border-black/10 p-4">
            <div className="text-sm text-black/60">{t.from_addr} → {t.to_addr}</div>
            <div className="font-semibold text-black">{t.departure_at ? dayjs(t.departure_at).format('YYYY-MM-DD HH:mm') : '—'}</div>
            <div className="text-sm text-black/80">Գին․ {t.price_amd} AMD · Վարորդ՝ {t.driver}{t.company ? ` · Ընկերություն՝ ${t.company}`:''}</div>

            <div className="mt-3">
                {my ? (
                    <div className="rounded-xl bg-emerald-50 p-3 text-sm">
                        <div className="mb-1 font-medium text-emerald-800">Ձեր գնահատականը — {Number(my.rating).toFixed(2)}</div>
                        {my.description && <div className="text-emerald-900/80">{my.description}</div>}
                        <button onClick={()=>setOpen(true)} className="mt-2 rounded border border-emerald-300 bg-white px-3 py-1 text-sm">Փոխել գնահատականը</button>
                    </div>
                ) : (
                    <button onClick={()=>setOpen(true)} className="rounded bg-black px-3 py-1.5 text-sm font-semibold text-[#ffdd2c]">Թողնել отзыв</button>
                )}
            </div>

            {open && <RateModal tripId={t.id} initial={my} onClose={()=>setOpen(false)} />}
        </div>
    )
}

function RateModal({ tripId, initial, onClose }) {
    const [val, setVal] = useState(initial?.rating || 5)
    const [text, setText] = useState(initial?.description || '')
    const [busy, setBusy] = useState(false)

    function submit(e){
        e.preventDefault()
        setBusy(true)
        router.post(`/my/completed-trips/${tripId}/rate`, { rating: val, description: text }, {
            onFinish(){ setBusy(false) },
            onSuccess(){ onClose && onClose() }
        })
    }

    return (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
            <div className="w-full max-w-md overflow-hidden rounded-2xl border border-black/10 bg-white" onClick={e=>e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-black/10 p-4">
                    <div className="text-sm font-semibold text-black">Գնահատել ուղևորությունը</div>
                    <button onClick={onClose} className="rounded px-2 py-1 text-sm text-black/70 hover:bg-black/5">Փակել</button>
                </div>
                <form onSubmit={submit} className="space-y-3 p-4">
                    <Stars value={val} onChange={setVal} />
                    <textarea
                        value={text}
                        onChange={e=>setText(e.target.value)}
                        placeholder="Մեկնաբանություն (ըստ ցանկության)"
                        className="min-h-28 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
                        maxLength={2000}
                    />
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="rounded border border-black/10 bg-white px-3 py-1.5 text-sm">Չեղարկել</button>
                        <button disabled={busy} className="rounded bg-black px-3 py-1.5 text-sm font-semibold text-[#ffdd2c]">{busy?'Պահպանում է…':'Պահպանել'}</button>
                    </div>
                </form>
            </div>
        </div>
    )
}

function Stars({ value=5, onChange }){
    return (
        <div className="flex items-center gap-1">
            {[1,2,3,4,5].map(n=>(
                <button key={n} type="button" onClick={()=>onChange(n)} title={`${n}`}
                        className={`text-2xl leading-none ${n<=value?'text-yellow-500':'text-black/20'}`}>★</button>
            ))}
            <span className="ml-2 text-sm text-black/70">{Number(value).toFixed(2)}</span>
        </div>
    )
}
