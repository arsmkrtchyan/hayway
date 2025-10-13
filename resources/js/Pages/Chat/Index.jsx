import React from 'react';
import { router, Link } from '@inertiajs/react';
import DriverLayout from '@/Layouts/DriverLayout'; // или общий Layout

export default function ChatIndex({ items }) {
    return (
        <DriverLayout current="chats">
            <div className="p-4">
                <h1 className="mb-4 text-2xl font-bold">Չաթեր</h1>
                <div className="divide-y rounded-xl border">
                    {items.data.map(c=>(
                        <Link key={c.id} href={route('chats.show', c.id)} className="flex items-center justify-between p-3 hover:bg-black/5">
                            <div>
                                <div className="text-sm text-black/60">Խոսակցություն #{c.id}</div>
                                <div className="text-black">{c.last_message?.body || '—'}</div>
                            </div>
                            <div className="text-right">
                                {c.unread>0 && <div className="inline-flex min-w-6 justify-center rounded-full bg-amber-500 px-2 py-0.5 text-xs text-white">{c.unread}</div>}
                                <div className="text-xs text-black/60">{c.status==='closed'?'Փակված':''}</div>
                                <div className={`mt-1 h-2 w-2 rounded-full ${c.online?'bg-emerald-500':'bg-gray-300'}`} />
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </DriverLayout>
    );
}
