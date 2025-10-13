
// resources/js/Pages/Chat.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Send, Paperclip, Image as ImageIcon, MapPin, Phone, Car, CheckCheck,
    Menu, Search, X, ShieldCheck, Clock, Users, Smartphone, Info, ArrowLeftRight,
    MapPinned, Check, XCircle
} from "lucide-react";
import { usePage } from "@inertiajs/react";
import axiosLib from "axios";

/* ========= helpers ========= */
const api = typeof window !== "undefined" && window.axios ? window.axios : axiosLib.create();
const r = (name, params = {}) => {
    try { return route(name, params); } catch {
        if (name === "chat.contacts") return "/chat/contacts";
        if (name === "chat.upload") return "/chat/upload";
        if (name === "chat.sync") return `/chat/${params.conversation}/sync`;
        if (name === "chat.history") return `/chat/${params.conversation}/history`;
        if (name === "chat.send") return `/chat/${params.conversation}/send`;
        if (name === "chat.read") return `/chat/${params.conversation}/read`;
        if (name === "chat.typing") return `/chat/${params.conversation}/typing`;
        if (name === "chat.heartbeat") return `/chat/${params.conversation}/heartbeat`;
        if (name === "chat.request_stop") return `/chat/${params.conversation}/request-stop`;
        if (name === "chat.stop_accept") return `/chat/${params.conversation}/stop-requests/${params.req}/accept`;
        if (name === "chat.stop_decline") return `/chat/${params.conversation}/stop-requests/${params.req}/decline`;
        return "/";
    }
};
const uid = () => Math.random().toString(36).slice(2);
const nowTime = () => new Date().toLocaleTimeString("hy-AM", { hour: "2-digit", minute: "2-digit" });
const fmtAMD = (n) => { try { return new Intl.NumberFormat("hy-AM").format(n || 0); } catch { return n; } };
const fmtSec = (s) => {
    s = Math.max(0, Math.round(s || 0));
    const h = Math.floor(s / 3600); const m = Math.round((s % 3600) / 60);
    if (h <= 0) return `${m} ր․`;
    return `${h} Ժ ${m} ր․`;
};
const sign = (n) => (n > 0 ? "+" : (n < 0 ? "−" : "±")) + Math.abs(n);

/* maplibre loader */
function ensureMapLibre() {
    return new Promise((resolve, reject) => {
        if (window.maplibregl) return resolve(window.maplibregl);
        const cssId = "maplibre-css";
        if (!document.getElementById(cssId)) {
            const l = document.createElement("link"); l.id = cssId; l.rel = "stylesheet";
            l.href = "https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css"; document.head.appendChild(l);
        }
        const s = document.createElement("script");
        s.src = "https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js"; s.async = true;
        s.onload = () => resolve(window.maplibregl); s.onerror = () => reject(new Error("MapLibre load"));
        document.body.appendChild(s);
    });
}

/* geocode suggest + reverse */
const NOMI_LANG = "hy,ru,en";
async function geocodeSuggest(q, limit = 6) {
    if (!q?.trim()) return [];
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=${limit}&accept-language=${encodeURIComponent(NOMI_LANG)}&q=${encodeURIComponent(q)}`;
    const r = await fetch(url, { headers: { Accept: "application/json" } }); if (!r.ok) return [];
    const d = await r.json();
    return (d || []).map(i => ({ lng: parseFloat(i.lon), lat: parseFloat(i.lat), label: i.display_name }));
}
async function reverseGeocode(lat, lng) {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&accept-language=${encodeURIComponent(NOMI_LANG)}&lat=${lat}&lon=${lng}`;
        const r = await fetch(url, { headers: { Accept: "application/json" } });
        if (!r.ok) return "";
        const d = await r.json(); return d?.display_name || "";
    } catch { return ""; }
}

/* ========= root ========= */
export default function Chat() {
    const { props } = usePage();
    const initialConvId = props?.openConversationId || null;

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [contacts, setContacts] = useState([]);
    const [activeId, setActiveId] = useState(initialConvId);
    const [byConv, setByConv] = useState({});
    const [value, setValue] = useState("");
    const [att, setAtt] = useState(null);
    const [sending, setSending] = useState(false);
    const [stopModalOpen, setStopModalOpen] = useState(false);

    // contacts
    useEffect(() => {
        let stop = false;
        const load = async () => {
            try {
                const { data } = await api.get(r("chat.contacts"));
                if (stop) return;
                setContacts(data.items || []);
                if (!activeId && data.items?.length) setActiveId(data.items[0].id);
            } catch (_) { }
        };
        load(); const t = setInterval(load, 15000);
        return () => { stop = true; clearInterval(t); };
    }, []);

    const current = useMemo(() => contacts.find(c => c.id === activeId) || null, [contacts, activeId]);
    const myRole = useMemo(() => current ? (current.note === "Վարորդ" ? "client" : "driver") : null, [current]);
    const list = useMemo(() => (byConv[activeId]?.messages || []), [byConv, activeId]);

    // long-poll
    useEffect(() => {
        if (!activeId) return;
        let aborted = false; let since = byConv[activeId]?.since || 0;

        const beat = async () => { try { await api.post(r("chat.heartbeat", { conversation: activeId })); } catch { } };
        beat(); const hb = setInterval(beat, 20000);

        const poll = async () => {
            while (!aborted) {
                try {
                    const { data } = await api.get(r("chat.sync", { conversation: activeId }) + `?since_id=${since}&timeout=22`);
                    if (aborted) break;
                    if (Array.isArray(data.messages) && data.messages.length) {
                        const incoming = data.messages; since = incoming[incoming.length - 1].id;
                        setByConv(prev => {
                            const old = prev[activeId]?.messages || [];
                            const ids = new Set(old.map(m => m.id));
                            const merged = [...old, ...incoming.filter(m => !ids.has(m.id))];
                            return { ...prev, [activeId]: { ...(prev[activeId] || {}), messages: merged, since, peer: data.peer || {} } };
                        });
                    } else {
                        setByConv(prev => ({ ...prev, [activeId]: { ...(prev[activeId] || {}), since, peer: data.peer || {} } }));
                    }
                } catch { await new Promise(res => setTimeout(res, 800)); }
            }
        };
        poll();
        return () => { aborted = true; clearInterval(hb); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeId]);

    // first history
    useEffect(() => {
        if (!activeId) return;
        if ((byConv[activeId]?.messages || []).length) return;
        (async () => {
            try {
                const { data } = await api.get(r("chat.history", { conversation: activeId }) + "?limit=40");
                const msgs = Array.isArray(data.messages) ? data.messages : [];
                const since = msgs.length ? msgs[msgs.length - 1].id : 0;
                setByConv(prev => ({ ...prev, [activeId]: { messages: msgs, since, peer: { online: false, typing: false } } }));
            } catch (_) { }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeId]);

    // send text/image
    async function send() {
        if (!activeId || sending) return;
        const text = value.trim();
        if (!text && !att) return;

        setSending(true);
        try {
            let payload = { client_mid: uid(), type: att ? "image" : "text" };
            if (att) {
                const fd = new FormData();
                fd.append("file", att.file);
                const up = await api.post(r("chat.upload"), fd, { headers: { "Content-Type": "multipart/form-data" } });
                payload.upload_id = up.data.upload_id;
            } else {
                payload.text = text;
            }
            const { data } = await api.post(r("chat.send", { conversation: activeId }), payload);
            if (data?.message) {
                setByConv(prev => {
                    const old = prev[activeId]?.messages || [];
                    return { ...prev, [activeId]: { ...(prev[activeId] || {}), messages: [...old, data.message], since: data.message.id, peer: prev[activeId]?.peer || {} } };
                });
            }
            setValue(""); setAtt(null);
        } catch (_) { }
        setSending(false);
    }

    // share GPS
    async function shareLocation() {
        if (!activeId || sending) return;
        if (!("geolocation" in navigator)) { alert("Geolocation unavailable in this browser"); return; }

        setSending(true);
        navigator.geolocation.getCurrentPosition(async ({ coords }) => {
            const lat = +coords.latitude.toFixed(6);
            const lng = +coords.longitude.toFixed(6);
            let addr = await reverseGeocode(lat, lng).catch(() => "");
            try {
                const payload = { client_mid: uid(), type: "location", lat, lng, addr };
                const { data } = await api.post(r("chat.send", { conversation: activeId }), payload);
                if (data?.message) {
                    setByConv(prev => {
                        const old = prev[activeId]?.messages || [];
                        return { ...prev, [activeId]: { ...(prev[activeId] || {}), messages: [...old, data.message], since: data.message.id, peer: prev[activeId]?.peer || {} } };
                    });
                }
            } catch {
                alert("Չհաջողվեց ուղարկել տեղադրությունը");
            }
            setSending(false);
        }, (err) => {
            alert("Geolocation error: " + err.message);
            setSending(false);
        }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
    }

    // create stop request from modal
    async function createStopRequest(place) {
        if (!activeId) return;
        try {
            const { data } = await api.post(r("chat.request_stop", { conversation: activeId }), {
                lat: place.lat, lng: place.lng, addr: place.addr || null, name: place.name || null
            });
            if (data?.message) {
                setByConv(prev => {
                    const old = prev[activeId]?.messages || [];
                    return { ...prev, [activeId]: { ...(prev[activeId] || {}), messages: [...old, data.message], since: data.message.id, peer: prev[activeId]?.peer || {} } };
                });
            }
            setStopModalOpen(false);
        } catch (e) {
            alert("Չհանեցվեց ուղարկել կանգառի հարցումը");
        }
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(70%_50%_at_50%_-10%,#e8fff4,transparent),linear-gradient(to_bottom_right,#f8fafc,#ecfdf5)] text-slate-900">
            {/* header */}
            <header className="sticky top-0 z-40 border-b border-emerald-200/50 bg-white/80 backdrop-blur">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                        <button className="rounded-lg p-2 hover:bg-emerald-50 focus:outline-none md:hidden" onClick={() => setSidebarOpen(true)}>
                            <Menu className="h-5 w-5 text-emerald-700" />
                        </button>
                        <div className="relative">
                            <div className="absolute -inset-1 rounded-xl bg-emerald-400/30 blur-md" />
                            <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-400 text-white"><Car className="h-5 w-5" /></div>
                        </div>
                        <div className="ml-1">
                            <div className="text-xs uppercase tracking-wide text-emerald-700/80">Քաղաքային տրանսֆեր</div>
                            <div className="font-bold">Taxi Chat</div>
                        </div>
                    </div>
                    <div className="hidden items-center gap-3 md:flex">
                        <KBadge><ShieldCheck className="h-4 w-4" /> Պաշտպանված զրույց</KBadge>
                        <KBadge><Smartphone className="h-4 w-4" /> Թեթև կայք</KBadge>
                    </div>
                </div>
            </header>

            <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-6 md:grid-cols-[300px,1fr]">
                {/* sidebar */}
                <Sidebar
                    open={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                    contacts={contacts}
                    activeId={activeId}
                    onPick={(id) => { setActiveId(id); setSidebarOpen(false); setContacts(prev => prev.map(c => c.id === id ? { ...c, unread: 0 } : c)); }}
                />

                {/* chat */}
                <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
                    {current ? <ChatHeader person={current} peer={byConv[activeId]?.peer} /> : <div className="p-6 text-slate-500">Չատ ընտրեք</div>}
                    <ChatScrollArea
                        messages={list}
                        typing={byConv[activeId]?.peer?.typing}
                        onSeen={(lastId) => { if (!lastId) return; api.post(r("chat.read", { conversation: activeId }), { last_visible_id: lastId }).catch(() => { }); }}
                        myRole={myRole}
                        convoId={activeId}
                    />
                    <ChatInput
                        value={value}
                        onChange={(v) => { setValue(v); if (activeId) api.post(r("chat.typing", { conversation: activeId }), { is_typing: true }).catch(() => { }); }}
                        onSend={send}
                        onAttach={(e) => { const f = e.target.files?.[0]; if (!f) return; setAtt({ file: f, type: "image", url: URL.createObjectURL(f) }); }}
                        att={att} setAtt={setAtt}
                        onQuick={(txt) => { setValue(txt); setTimeout(send, 20); }}
                        onShare={shareLocation}
                        onRequestStop={() => setStopModalOpen(true)}
                        disabled={!current || sending}
                        myRole={myRole}
                    />
                </div>
            </div>

            <footer className="border-t border-emerald-200/40 bg-white/70 py-2 text-center text-xs text-emerald-800/80">
                © {new Date().getFullYear()} Taxi Platform · Զրույց
            </footer>

            <StopRequestModal
                open={stopModalOpen}
                onClose={() => setStopModalOpen(false)}
                onSubmit={createStopRequest}
            />
        </div>
    );
}

/* ========= sidebar ========= */
function Sidebar({ open, onClose, contacts, activeId, onPick }) {
    const [q, setQ] = useState("");
    const filtered = contacts.filter(c => (c.name + " " + (c.note || "")).toLowerCase().includes(q.toLowerCase()));
    return (
        <>
            <div className="hidden rounded-3xl border border-slate-200 bg-white shadow-xl md:block">
                <SidebarInner q={q} setQ={setQ} items={filtered} activeId={activeId} onPick={onPick} />
            </div>
            <AnimatePresence>
                {open && (
                    <motion.div className="fixed inset-0 z-[9998] grid grid-cols-[1fr] bg-black/30 md:hidden"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
                        <motion.div
                            className="h-full w-[84%] overflow-hidden border-r border-slate-200 bg-white"
                            initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 420, damping: 34 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-2 border-b border-slate-200 p-3">
                                <button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-50"><X className="h-4 w-4" /></button>
                                <div className="font-semibold">Մարդիկ</div>
                            </div>
                            <SidebarInner q={q} setQ={setQ} items={filtered} activeId={activeId} onPick={onPick} />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
function StatusDot({ s }) {
    const map = { online: "bg-emerald-500", busy: "bg-amber-500", offline: "bg-slate-400" };
    return <span className={`inline-block h-2.5 w-2.5 rounded-full ${map[s] || "bg-slate-400"}`} />;
}
function SidebarInner({ q, setQ, items, activeId, onPick }) {
    return (
        <div className="flex h-full flex-col">
            <div className="p-3">
                <label className="relative block">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input value={q} onChange={e => setQ(e.target.value)} placeholder="Փնտրել մարդկանց"
                           className="w-full rounded-xl border border-slate-200 bg-white px-9 py-2 text-sm outline-none focus:border-emerald-400" />
                </label>
            </div>
            <div className="flex-1 divide-y divide-slate-100 overflow-auto">
                {items.map(p => (
                    <button key={p.id} onClick={() => onPick(p.id)}
                            className={`flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-emerald-50 ${p.id === activeId ? "bg-emerald-50/60" : ""}`}>
                        <img src={p.avatar || `https://i.pravatar.cc/64?u=${encodeURIComponent(p.name)}`} alt={p.name} className="h-10 w-10 rounded-full border border-slate-200 object-cover" />
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                                <div className="truncate font-medium">{p.name}</div>
                                <div className="ml-2 flex items-center gap-1 text-xs text-slate-500">
                                    <StatusDot s={p.status} /><span className="hidden sm:inline">{p.status === "online" ? "Առցանց" : "Կցանցից դուրս"}</span>
                                    {p.unread > 0 && <span className="ml-2 rounded-full bg-emerald-500 px-2 py-[2px] text-[11px] font-semibold text-white">{p.unread}</span>}
                                </div>
                            </div>
                            <div className="truncate text-sm text-slate-500">{p.note}</div>
                        </div>
                    </button>
                ))}
                {items.length === 0 && <div className="p-4 text-sm text-slate-500">Ոչինչ չի գտնվել</div>}
            </div>
            <div className="border-t border-slate-200 p-3 text-xs text-slate-600">
                <div className="mb-1 font-semibold">Արագ խորհուրդներ</div>
                <ul className="list-inside list-disc space-y-1">
                    <li>Սեղմեք քարտեզի կոճակը՝ կիսվելու ձեր դիրքով</li>
                    <li>Կցեք նկարը՝ ուղեբեռի չափը ցույց տալու համար</li>
                    <li>Օգտվեք արագ պատասխաններից</li>
                </ul>
            </div>
        </div>
    );
}

/* ========= chat area ========= */
function ChatHeader({ person, peer }) {
    return (
        <div className="flex items-center gap-3 border-b border-slate-200 p-3">
            <img src={person.avatar || `https://i.pravatar.cc/80?u=${encodeURIComponent(person.name)}`} className="h-10 w-10 rounded-full border border-slate-200 object-cover" alt="avatar" />
            <div className="min-w-0">
                <div className="font-semibold leading-tight">{person.name}</div>
                <div className="text-xs text-emerald-700">{person.note} · {peer?.online ? "Առցանց" : "Կցանցից դուրս"}</div>
            </div>
            <div className="ml-auto flex items-center gap-2 text-xs text-slate-600">
                <KBadge><Users className="h-4 w-4" /> 4 տեղ</KBadge>
                <KBadge><Clock className="h-4 w-4" /> Արագ կապ</KBadge>
                <KBadge><Phone className="h-4 w-4" /> Զանգ</KBadge>
            </div>
        </div>
    );
}

function ChatScrollArea({ messages, typing, onSeen, myRole, convoId }) {
    const ref = useRef(null); const [atBottom, setAtBottom] = useState(true);
    useEffect(() => {
        if (ref.current && atBottom) ref.current.scrollTop = ref.current.scrollHeight;
        if (messages.length) onSeen(messages[messages.length - 1].id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages, typing]);
    function onScroll() {
        if (!ref.current) return;
        const near = ref.current.scrollHeight - ref.current.scrollTop - ref.current.clientHeight < 60;
        setAtBottom(near);
        if (near && messages.length) onSeen(messages[messages.length - 1].id);
    }
    return (
        <div className="relative h-[58vh] overflow-hidden md:h-[62vh]">
            <div ref={ref} onScroll={onScroll} className="h-full overflow-auto bg-[linear-gradient(180deg,rgba(16,185,129,0.06),transparent_120px)] p-3">
                <div className="mx-auto max-w-2xl">
                    {messages.map((m, i) => (
                        <Message key={m.id} m={m} prev={messages[i - 1]} next={messages[i + 1]} myRole={myRole} convoId={convoId} />
                    ))}
                    <AnimatePresence>{typing && <TypingBubble />}</AnimatePresence>
                </div>
            </div>
            {!atBottom && (
                <button
                    onClick={() => { if (!ref.current) return; ref.current.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" }); }}
                    className="absolute bottom-20 right-3 rounded-full bg-emerald-600 p-2 text-white shadow-md"
                >↓</button>
            )}
        </div>
    );
}

/* bubbles with group-aware radiuses & spacing */
function Message({ m, prev, next, myRole, convoId }) {
    const mine = m.from === "me";
    const firstInGroup = !prev || prev.from !== m.from;
    const lastInGroup = !next || next.from !== m.from;

    const cornerMine = [
        "rounded-2xl",
        firstInGroup ? "rounded-tr-2xl" : "rounded-tr-md",
        lastInGroup ? "rounded-br-2xl" : "rounded-br-md",
        "rounded-tl-2xl", "rounded-bl-2xl",
    ].join(" ");
    const cornerPeer = [
        "rounded-2xl",
        firstInGroup ? "rounded-tl-2xl" : "rounded-tl-md",
        lastInGroup ? "rounded-bl-2xl" : "rounded-bl-md",
        "rounded-tr-2xl", "rounded-br-2xl",
    ].join(" ");

    const bubble = (
        <div className={`inline-block max-w-[86%] break-words px-3 py-2 text-sm shadow
      ${mine
            ? `bg-gradient-to-br from-emerald-500 to-cyan-400 text-white ${cornerMine}`
            : `bg-white border border-slate-200 text-slate-800 ${cornerPeer}`}`}>
            {m.type === "text" && <div className="whitespace-pre-wrap leading-relaxed">{m.text}</div>}
            {m.type === "image" && (
                <img src={m.url} alt="upload" className={`max-h-64 rounded-xl ${mine ? "border-white/50" : "border-slate-200"} border`} />
            )}
            {m.type === "trip" && <TripCard trip={m.trip} compact />}
            {m.type === "location" && <MapBubble loc={m.loc} mine={mine} />}
            {m.type === "system" && <div className="text-center text-xs text-slate-500">{m.text}</div>}

            {m.type === "stop_request" && <StopRequestBubble m={m} myRole={myRole} convoId={convoId} />}
            {m.type === "trip_update" && <TripUpdateBubble m={m} />}

            <div className={`mt-1 flex items-center gap-1 ${mine ? "justify-end text-white/80" : "justify-end text-slate-500"}`}>
                <span className="text-[11px]">{m.at || nowTime()}</span>
                {mine ? <CheckCheck className="h-3.5 w-3.5" /> : null}
            </div>
        </div>
    );

    return (
        <div
            className={`flex w-full items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}
            style={{ marginTop: firstInGroup ? 14 : 4 }}
        >
            {!mine && firstInGroup && (
                <img
                    src={`https://i.pravatar.cc/80?u=${encodeURIComponent("peer")}`}
                    alt="peer"
                    className="mt-auto h-7 w-7 rounded-full border border-slate-200 object-cover"
                />
            )}
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                {bubble}
            </motion.div>
        </div>
    );
}

/* map bubble (location) */
function MapBubble({ loc, mine }) {
    const ref = useRef(null); const mapRef = useRef(null); const mkRef = useRef(null);
    const lat = Number(loc?.lat || 0); const lng = Number(loc?.lng || 0);
    useEffect(() => {
        (async () => {
            if (!lat || !lng) return;
            const mgl = await ensureMapLibre();
            const style = { version: 8, sources: { osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256 } }, layers: [{ id: "osm", type: "raster", source: "osm" }] };
            const map = new mgl.Map({ container: ref.current, style, center: [lng, lat], zoom: 15, attributionControl: false });
            map.addControl(new mgl.NavigationControl({ showCompass: false }), "top-right");
            mapRef.current = map;
            const el = document.createElement("div");
            el.style.cssText = "width:14px;height:14px;border-radius:50%;box-shadow:0 0 0 2px #fff,0 0 0 4px #06b6d4;background:#06b6d4;";
            mkRef.current = new mgl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
        })();
        return () => { try { mapRef.current && mapRef.current.remove(); } catch { } };
    }, [lat, lng]);

    const title = loc?.addr || `${lat}, ${lng}`;
    const gmap = loc?.gmap || `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

    return (
        <a href={gmap} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-white/40 bg-white/10">
            <div ref={ref} className={`h-56 w-[min(72vw,520px)] ${mine ? "opacity-95" : ""}`} />
            <div className={`px-2 py-1 text-xs ${mine ? "text-white/90" : "text-slate-700"}`}>{title}</div>
        </a>
    );
}

function TypingBubble() {
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-end gap-2">
            <img src="https://i.pravatar.cc/80?u=typing" alt="peer" className="mt-auto h-7 w-7 rounded-full border border-slate-200 object-cover" />
            <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow">
                <div className="flex items-center gap-1">
                    {[0, 1, 2].map(i => (
                        <motion.span key={i} className="h-2 w-2 rounded-full bg-emerald-500" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.15 }} />
                    ))}
                </div>
            </div>
        </motion.div>
    );
}

/* ========= input ========= */
function ChatInput({ value, onChange, onSend, onAttach, att, setAtt, onQuick, onShare, onRequestStop, disabled, myRole }) {
    const fileRef = useRef(null);
    const quick = ["Բարև, մոտենում եմ", "Կտեսնվենք մետրոյի մոտ", "Կգնեմ Նորքի կողմից"];
    return (
        <div className="border-t border-slate-200 p-2">
            <div className="mx-auto max-w-2xl">
                <div className="mb-1 flex flex-wrap gap-2">
                    <button disabled={disabled} className="inline-flex items-center gap-1 rounded-full border border-emerald-300/60 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700 hover:bg-emerald-100 disabled:opacity-50" onClick={onShare}>
                        <MapPin className="h-3.5 w-3.5" /> Կիսվել տեղադրությամբ
                    </button>
                    <button disabled={disabled} className="inline-flex items-center gap-1 rounded-full border border-sky-300/60 bg-sky-50 px-2.5 py-1 text-xs text-sky-700 hover:bg-sky-100 disabled:opacity-50" onClick={() => onQuick("Գինը հաստատո՞ւմ եք 5500 AMD / տեղ")}>
                        <ArrowLeftRight className="h-3.5 w-3.5" /> Գնի հաստատում
                    </button>
                    {myRole === "client" && (
                        <button
                            disabled={disabled}
                            className="inline-flex items-center gap-1 rounded-full border border-violet-300/60 bg-violet-50 px-2.5 py-1 text-xs text-violet-700 hover:bg-violet-100 disabled:opacity-50"
                            onClick={onRequestStop}
                        >
                            <MapPinned className="h-3.5 w-3.5" /> Կանգառի հարցում
                        </button>
                    )}
                </div>

                {att && (
                    <div className="mb-2 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs">
                        <div className="flex items-center gap-2"><ImageIcon className="h-4 w-4 text-slate-500" /><span>Կցված պատկեր</span></div>
                        <button onClick={() => setAtt(null)} className="rounded px-2 py-1 text-slate-600 hover:bg-slate-200">Հեռացնել</button>
                    </div>
                )}

                <div className="flex items-end gap-2">
                    <button disabled={disabled} onClick={() => fileRef.current?.click()} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50 disabled:opacity-50"><Paperclip className="h-5 w-5" /></button>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onAttach} />

                    <label className="relative block w-full">
                        <input
                            value={value} onChange={e => onChange(e.target.value)} placeholder="Գրեք հաղորդագրությունը…"
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 outline-none focus:border-emerald-400"
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
                            disabled={disabled}
                        />
                        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><Info className="h-4 w-4" /></div>
                    </label>

                    <button disabled={disabled} onClick={onSend} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-400 px-4 py-2 font-semibold text-white shadow hover:brightness-95 disabled:opacity-50">
                        <Send className="h-4 w-4" /> Ուղարկել
                    </button>
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                    {quick.map((q, i) => (
                        <button key={i} disabled={disabled} onClick={() => onQuick(q)} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50">{q}</button>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ========= small blocks ========= */
function KBadge({ children }) { return <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/60 bg-emerald-50 px-2 py-[2px] text-[11px] text-emerald-800">{children}</span>; }

function TripCard({ trip, compact = false }) {
    if (!trip) return null;
    return (
        <div className={`overflow-hidden rounded-xl border ${compact ? "border-white/40 bg-white/10" : "border-slate-200 bg-slate-50"} p-3`}>
            <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-semibold text-emerald-700">{trip.from} → {trip.to}</div>
                <div className="text-xs text-slate-500">{trip.date} · {trip.time}</div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
                <div className="flex items-center gap-2 text-xs text-slate-600"><Users className="h-4 w-4 text-emerald-600" /> Տեղեր՝ {(trip.seatsTotal || 0) - (trip.seatsTaken || 0)} ազատ</div>
                <div className="flex items-center gap-2 text-xs text-slate-600"><Clock className="h-4 w-4 text-emerald-600" /> Մոտ. 2-3 ժ</div>
            </div>
            <div className="mt-2 flex items-center justify-between">
                <div className="text-sm font-bold text-emerald-700">{fmtAMD(trip.priceAMD)} AMD <span className="text-xs font-medium text-emerald-600">/ տեղ</span></div>
                <div className="text-xs text-slate-600">{trip?.vehicle?.brand} {trip?.vehicle?.model} · {trip?.vehicle?.plate}</div>
            </div>
        </div>
    );
}

/* ========= Stop Request Modal ========= */
function StopRequestModal({ open, onClose, onSubmit }) {
    const [q, setQ] = useState(""); const [list, setList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [picked, setPicked] = useState(null); // {lat,lng,addr,name}
    const mapRef = useRef(null); const mglRef = useRef(null); const mkRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        const id = setTimeout(async () => {
            if (!q.trim()) { setList([]); return; }
            setLoading(true);
            try { setList(await geocodeSuggest(q.trim())); } catch { setList([]); }
            setLoading(false);
        }, 300);
        return () => clearTimeout(id);
    }, [q, open]);

    useEffect(() => {
        if (!open) return;
        (async () => {
            const mgl = await ensureMapLibre();
            const style = { version: 8, sources: { osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256 } }, layers: [{ id: "osm", type: "raster", source: "osm" }] };
            const map = new mgl.Map({ container: mapRef.current, style, center: [44.5, 40.2], zoom: 8 });
            map.addControl(new mgl.NavigationControl({ showCompass: false }), "top-right");
            mglRef.current = map;
            map.on("click", async (e) => {
                const lat = +e.lngLat.lat.toFixed(6); const lng = +e.lngLat.lng.toFixed(6);
                const addr = await reverseGeocode(lat, lng);
                setPicked({ lat, lng, addr, name: "" });
                drawMarker(lng, lat);
            });
        })();
        return () => { try { mglRef.current && mglRef.current.remove(); mglRef.current = null; } catch { } };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    function drawMarker(lng, lat) {
        const mgl = window.maplibregl; const map = mglRef.current;
        if (!mgl || !map) return;
        if (mkRef.current) mkRef.current.remove();
        const el = document.createElement("div");
        el.style.cssText = "width:14px;height:14px;border-radius:50%;box-shadow:0 0 0 2px #fff,0 0 0 4px #7c3aed;background:#7c3aed;";
        mkRef.current = new mgl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
        map.easeTo({ center: [lng, lat], zoom: 14, duration: 350 });
    }

    return (
        <AnimatePresence>
            {open && (
                <motion.div className="fixed inset-0 z-[9999] grid place-items-center bg-black/40 p-3"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <motion.div
                        className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl"
                        initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }}
                    >
                        <div className="flex items-center justify-between border-b p-3">
                            <div className="font-semibold">Կանգառի հարցում</div>
                            <button onClick={onClose} className="rounded p-1 hover:bg-slate-100"><X className="h-4 w-4" /></button>
                        </div>
                        <div className="grid gap-3 p-3 md:grid-cols-[1.3fr,1fr]">
                            <div className="h-80 overflow-hidden rounded-xl border">
                                <div ref={mapRef} className="h-full w-full" />
                            </div>
                            <div className="space-y-2">
                                <label className="block">
                                    <span className="mb-1 block text-xs font-medium text-slate-600">Որոնում</span>
                                    <input value={q} onChange={e => setQ(e.target.value)} placeholder="Տեղի անուն կամ հասցե"
                                           className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500" />
                                </label>
                                {loading && <div className="text-xs text-slate-500">Որոնում…</div>}
                                {!loading && list.length > 0 && (
                                    <div className="max-h-40 overflow-auto rounded-xl border">
                                        {list.map((p, i) => (
                                            <button key={i}
                                                    className="block w-full truncate px-3 py-2 text-left text-sm hover:bg-slate-50"
                                                    onMouseEnter={() => drawMarker(p.lng, p.lat)}
                                                    onClick={() => { setPicked({ lat: p.lat, lng: p.lng, addr: p.label, name: "" }); drawMarker(p.lng, p.lat); }}
                                            >
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <label className="block">
                                    <span className="mb-1 block text-xs font-medium text-slate-600">Անուն (ոչ պարտադիր)</span>
                                    <input value={picked?.name || ""} onChange={e => setPicked(prev => ({ ...(prev || {}), name: e.target.value }))}
                                           placeholder="Օր. «Սուպերմարկետ Ազատություն»"
                                           className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500" />
                                </label>
                                <div className="text-xs text-slate-500">
                                    Ընտրեք քարտեզի վրա կամ նույնացրեք որոնումով, ապա հաստատեք:
                                </div>
                                <div className="pt-1">
                                    <button
                                        onClick={() => picked && onSubmit(picked)}
                                        disabled={!picked}
                                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2 font-semibold text-white disabled:opacity-60"
                                    >
                                        <MapPinned className="h-4 w-4" /> Պահանջել կանգառ
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/* ========= Stop Request Bubble ========= */
function StopRequestBubble({ m, myRole, convoId }) {
    const reqId = m?.stopRequest?.id;
    const place = m?.stopRequest?.place || {};
    const preview = m?.stopRequest?.preview || {};
    const [busy, setBusy] = useState(false);

    const delta = (preview?.delta_sec || 0);
    const better = delta < 0;

    async function act(accept) {
        if (!convoId || !reqId || busy) return;
        setBusy(true);
        try {
            const routeName = accept ? "chat.stop_accept" : "chat.stop_decline";
            const { data } = await api.post(r(routeName, { conversation: convoId, req: reqId }));
            if (data?.message && accept) {
                // append trip_update immediately (poll will also deliver)
                // handled by scroll area merge (dedupe by id)
            }
        } catch (_) { }
        setBusy(false);
    }

    return (
        <div className="overflow-hidden rounded-xl border border-violet-200 bg-violet-50/50">
            <div className="flex items-center justify-between gap-2 border-b border-violet-100 px-3 py-2">
                <div className="flex items-center gap-2 text-violet-700">
                    <MapPinned className="h-4 w-4" />
                    <div className="text-sm font-semibold">Կանգառի հարցում</div>
                </div>
                <div className={`text-xs font-semibold ${better ? "text-emerald-700" : "text-slate-600"}`}>
                    Δ {sign(Math.round(delta / 60))} ր․
                </div>
            </div>

            {/* route preview map */}
            <div className="p-2">
                <MiniRouteMap geometry={preview?.route?.geometry} order={preview?.new_order} />
            </div>

            {/* info */}
            <div className="grid gap-2 px-3 pb-3 sm:grid-cols-2">
                <div className="text-xs text-slate-700">
                    <div className="font-semibold text-slate-800">Վայրը</div>
                    <div>{place?.name || "—"}</div>
                    <div className="truncate text-[11px] text-slate-500">{place?.addr || `${place?.lat}, ${place?.lng}`}</div>
                </div>
                <div className="text-xs text-slate-700">
                    <div className="font-semibold text-slate-800">Տևողություն</div>
                    <div>Հին՝ {fmtSec(preview?.old_sec)} · Նոր՝ {fmtSec(preview?.new_sec)}</div>
                    <div className={`${better ? "text-emerald-700" : "text-slate-600"}`}>Տարբերություն {sign(Math.round(delta / 60))} ր․</div>
                </div>
            </div>

            {/* order list */}
            <div className="px-3 pb-3">
                <OrderList order={preview?.new_order} />
            </div>

            {myRole === "driver" && (
                <div className="flex items-center gap-2 border-t border-violet-100 bg-white/70 px-3 py-2">
                    <button disabled={busy} onClick={() => act(true)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50">
                        <Check className="h-4 w-4" /> Ընդունել
                    </button>
                    <button disabled={busy} onClick={() => act(false)} className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50">
                        <XCircle className="h-4 w-4" /> Մերժել
                    </button>
                </div>
            )}
        </div>
    );
}

/* ========= Trip Update Bubble ========= */
function TripUpdateBubble({ m }) {
    const u = m.tripUpdate || {};
    const d = u.durations || {};
    return (
        <div className="overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/60">
            <div className="flex items-center gap-2 border-b border-emerald-100 px-3 py-2 text-emerald-700">
                <Check className="h-4 w-4" />
                <div className="text-sm font-semibold">Ուղևորությունը թարմացվեց</div>
                <div className="ml-auto text-xs font-semibold text-emerald-800">Δ {sign(Math.round((d?.delta_sec || 0) / 60))} ր․</div>
            </div>
            <div className="p-2">
                <MiniRouteMap geometry={u?.route?.geometry} order={u?.new_order} />
            </div>
            <div className="grid gap-2 px-3 pb-3 sm:grid-cols-2 text-xs text-slate-700">
                <div><span className="font-semibold text-slate-800">Հին՝</span> {fmtSec(d?.old_sec)}</div>
                <div><span className="font-semibold text-slate-800">Նոր՝</span> {fmtSec(d?.new_sec)}</div>
            </div>
            <div className="px-3 pb-3"><OrderList order={u?.new_order} /></div>
        </div>
    );
}

/* ========= Order List ========= */
function OrderList({ order = [] }) {
    if (!Array.isArray(order) || order.length === 0) return null;
    const label = (p, idx) => (p?.type === "from" ? "Սկիզբ" : p?.type === "to" ? "Վերջ" : (p?.name?.trim() || `Կանգառ ${idx}`));
    return (
        <div className="rounded-xl border border-slate-200 bg-white/70 p-2">
            <div className="mb-1 text-xs font-semibold text-slate-700">Կարգ (կարճագույն)</div>
            <div className="flex flex-wrap gap-2">
                {order.map((p, i) => (
                    <span key={i} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-700">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 text-[11px] font-semibold text-white">{i + 1}</span>
            <span className="truncate max-w-[28ch]">{label(p, i + 1)}</span>
          </span>
                ))}
            </div>
        </div>
    );
}

/* ========= Mini Route Map ========= */
function MiniRouteMap({ geometry, order = [] }) {
    const ref = useRef(null); const mapRef = useRef(null);
    const srcId = useRef(`rt-${Math.random().toString(36).slice(2)}`).current;
    const layerId = useRef(`rtL-${Math.random().toString(36).slice(2)}`).current;
    useEffect(() => {
        (async () => {
            const mgl = await ensureMapLibre();
            const style = { version: 8, sources: { osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256 } }, layers: [{ id: "osm", type: "raster", source: "osm" }] };
            const map = new mgl.Map({ container: ref.current, style, center: [44.5, 40.2], zoom: 7, attributionControl: false });
            map.addControl(new mgl.NavigationControl({ showCompass: false }), "top-right");
            mapRef.current = map;

            map.on("load", () => {
                try {
                    if (geometry) {
                        map.addSource(srcId, { type: "geojson", data: { type: "Feature", properties: {}, geometry } });
                        map.addLayer({ id: layerId, type: "line", source: srcId, paint: { "line-color": "#06b6d4", "line-width": 4, "line-opacity": 0.9 }, layout: { "line-cap": "round", "line-join": "round" } });
                        const c = geometry.coordinates || [];
                        if (c.length) {
                            const b = c.reduce((B, p) => B.extend(p), new mgl.LngLatBounds(c[0], c[0]));
                            map.fitBounds(b, { padding: 36, duration: 350 });
                        }
                    }
                    // markers
                    const mk = (p, color, tag) => {
                        const el = document.createElement("div");
                        el.style.cssText = `position:relative;width:12px;height:12px;border-radius:50%;box-shadow:0 0 0 2px #fff,0 0 0 4px ${color};background:${color};`;
                        if (tag) {
                            const t = document.createElement("div"); t.textContent = tag;
                            t.style.cssText = 'position:absolute;transform:translate(-50%,-140%);left:50%;top:0;font:600 10px/1 system-ui;padding:2px 6px;border-radius:8px;background:#fff;color:#065f46;border:1px solid rgba(5,150,105,.35);box-shadow:0 1px 2px rgba(0,0,0,.06)';
                            el.appendChild(t);
                        }
                        return new mgl.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(mapRef.current);
                    };
                    order.forEach((p, i) => {
                        const color = p.type === "from" ? "#16a34a" : (p.type === "to" ? "#ef4444" : "#22c55e");
                        const tag = p.type === "from" ? "Սկիզբ" : (p.type === "to" ? "Վերջ" : String(i + 1));
                        if (Number.isFinite(p.lng) && Number.isFinite(p.lat)) mk({ lng: p.lng, lat: p.lat }, color, tag);
                    });
                    if (!geometry && order.length) {
                        const mgl2 = window.maplibregl;
                        const coords = order.filter(p => Number.isFinite(p.lng) && Number.isFinite(p.lat)).map(p => [p.lng, p.lat]);
                        if (coords.length) {
                            const b = coords.reduce((B, p) => B.extend(p), new mgl2.LngLatBounds(coords[0], coords[0]));
                            map.fitBounds(b, { padding: 36, duration: 350 });
                        }
                    }
                } catch { }
            });
        })();
        return () => { try { mapRef.current && mapRef.current.remove(); } catch { } };
    }, [geometry, JSON.stringify(order)]);
    return <div ref={ref} className="h-56 w-[min(72vw,520px)] rounded-xl border" />;
}

/* ========= END ========= */
