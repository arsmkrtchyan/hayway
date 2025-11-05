// resources/js/Components/NotificationBell.jsx
import React, {useEffect, useMemo, useRef, useState} from "react";
import { Link } from "@inertiajs/react";
import { Bell, Check, Loader2 } from "lucide-react";

function useOutside(ref, handler){
    useEffect(() => {
        const f = (e) => { if (ref.current && !ref.current.contains(e.target)) handler(); };
        document.addEventListener("mousedown", f);
        return () => document.removeEventListener("mousedown", f);
    }, [ref, handler]);
}

function fmt(dt){
    try {
        return new Intl.DateTimeFormat(undefined, {
            hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short"
        }).format(new Date(dt));
    } catch { return ""; }
}

export default function NotificationBell({ pollMs = 15000 }){
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [items, setItems] = useState([]);
    const [unread, setUnread] = useState(0);
    const boxRef = useRef(null);
    useOutside(boxRef, () => setOpen(false));

    const csrf = useMemo(() => {
        const el = document.querySelector('meta[name="csrf-token"]');
        return el?.getAttribute("content") || "";
    }, []);

    async function fetchState(){
        try{
            const r = await fetch("/api/notifications/state", { credentials: "same-origin" });
            if (!r.ok) return;
            const json = await r.json();
            setItems(Array.isArray(json.items) ? json.items : []);
            setUnread(Number(json.unread_count || 0));
        } catch {}
    }

    async function markAllRead(){
        if (busy || items.length === 0) return;
        setBusy(true);
        try{
            const ids = items.filter(i => i.unread).map(i => i.id);
            if (ids.length){
                await fetch("/api/notifications/read", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "X-CSRF-TOKEN": csrf },
                    body: JSON.stringify({ ids }),
                    credentials: "same-origin",
                });
            }
            setItems(prev => prev.map(i => ({...i, unread:false})));
            setUnread(0);
        } finally { setBusy(false); }
    }

    useEffect(() => {
        fetchState(); // начальная загрузка

        // SSE канал
        let es;
        try{
            es = new EventSource("/api/notifications/stream", { withCredentials: true });
            es.onmessage = (e) => {
                try{
                    const n = JSON.parse(e.data);
                    // ожидается { id,type,title,body,link,created_at }
                    setItems(prev => [{...n, unread:true}, ...prev].slice(0, 50));
                    setUnread(prev => prev + 1);
                } catch {}
            };
            es.onerror = () => { /* молча. поллинг покроет */ };
        } catch {}

        // поллинг как резерв
        const t = setInterval(fetchState, pollMs);

        return () => {
            clearInterval(t);
            if (es && es.close) es.close();
        };
    }, [pollMs]);

    return (
        <div className="relative" ref={boxRef}>
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="relative grid h-9 w-9 place-items-center rounded-lg border border-slate-300 bg-white hover:bg-slate-100"
                aria-label="Notifications"
            >
                <Bell className="h-5 w-5 text-slate-700" />
                {unread > 0 && (
                    <span className="absolute -right-1 -top-1 min-w-[20px] rounded-full bg-rose-500 px-1.5 text-center text-[10px] font-bold leading-5 text-white">
            {unread > 99 ? "99+" : unread}
          </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 z-50 mt-2 w-[360px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                        <div className="text-sm font-semibold">Ծանուցումներ</div>
                        <button
                            onClick={markAllRead}
                            disabled={busy || unread === 0}
                            className="flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            Կարդացված
                        </button>
                    </div>

                    <div className="max-h-[60vh] divide-y divide-slate-100 overflow-auto">
                        {items.length === 0 ? (
                            <div className="p-4 text-center text-sm text-slate-500">Դատարկ է</div>
                        ) : items.map(n => (
                            <div key={n.id} className={`p-3 ${n.unread ? "bg-emerald-50/60" : "bg-white"}`}>
                                <div className="flex items-start gap-2">
                                    <div className={`mt-1 h-2.5 w-2.5 rounded-full ${n.unread ? "bg-emerald-500" : "bg-slate-300"}`} />
                                    <div className="flex-1">
                                        <div className="text-sm font-medium">{n.title || "Ծանուցում"}</div>
                                        {n.body && <div className="mt-0.5 text-sm text-slate-600">{n.body}</div>}
                                        <div className="mt-1 text-xs text-slate-400">{fmt(n.created_at)}</div>
                                        {n.link && (
                                            <div className="mt-2">
                                                <Link
                                                    href={n.link}
                                                    className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
                                                    onClick={() => {
                                                        // оптимистично помечаем прочитанным
                                                        if (n.unread) {
                                                            setItems(prev => prev.map(x => x.id===n.id ? {...x, unread:false} : x));
                                                            setUnread(u => Math.max(0, u-1));
                                                        }
                                                    }}
                                                >
                                                    Բացել
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
