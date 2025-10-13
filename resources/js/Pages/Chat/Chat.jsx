// // resources/js/Pages/Chat.jsx
// import React, { useEffect, useMemo, useRef, useState } from "react";
// import { motion, AnimatePresence } from "framer-motion";
// import {
//     Send, Paperclip, Image as ImageIcon, MapPin, Phone, Car, CheckCheck, Check,
//     Menu, Search, X, ShieldCheck, Clock, Users, Smartphone, Info, ArrowLeftRight,
// } from "lucide-react";
// import { usePage } from "@inertiajs/react";
// import axiosLib from "axios";
//
// /* ========= helpers ========= */
// const api = typeof window !== "undefined" && window.axios ? window.axios : axiosLib.create();
// const r = (name, params={}) => {
//     try { return route(name, params); } catch { // ziggy fallback на прямые пути
//         if (name === "chat.contacts") return "/chat/contacts";
//         if (name === "chat.upload") return "/chat/upload";
//         if (name === "chat.sync") return `/chat/${params.conversation}/sync`;
//         if (name === "chat.history") return `/chat/${params.conversation}/history`;
//         if (name === "chat.send") return `/chat/${params.conversation}/send`;
//         if (name === "chat.read") return `/chat/${params.conversation}/read`;
//         if (name === "chat.typing") return `/chat/${params.conversation}/typing`;
//         if (name === "chat.heartbeat") return `/chat/${params.conversation}/heartbeat`;
//         return "/";
//     }
// };
// const uid = () => Math.random().toString(36).slice(2);
// const nowTime = () => new Date().toLocaleTimeString("hy-AM", { hour: "2-digit", minute: "2-digit" });
// const fmtAMD = (n) => { try { return new Intl.NumberFormat("hy-AM").format(n || 0); } catch { return n; } };
//
// /* ========= root ========= */
// export default function Chat() {
//     const { props } = usePage();
//     const initialConvId = props?.openConversationId || null;
//
//     const [sidebarOpen, setSidebarOpen] = useState(false);
//     const [contacts, setContacts] = useState([]);
//     const [activeId, setActiveId] = useState(initialConvId);
//     const [byConv, setByConv] = useState({}); // { convId: { messages:[], since:0, peer:{online:false,typing:false} } }
//     const [value, setValue] = useState("");
//     const [att, setAtt] = useState(null);
//     const [sending, setSending] = useState(false);
//
//     // load contacts
//     useEffect(() => {
//         let stop = false;
//         const load = async () => {
//             try {
//                 const { data } = await api.get(r("chat.contacts"));
//                 if (stop) return;
//                 setContacts(data.items || []);
//                 if (!activeId && data.items?.length) setActiveId(data.items[0].id);
//             } catch (_) {}
//         };
//         load();
//         const t = setInterval(load, 15000);
//         return () => { stop = true; clearInterval(t); };
//     }, []);
//
//     const current = useMemo(() => contacts.find(c=>c.id===activeId) || null, [contacts, activeId]);
//     const list = useMemo(()=> (byConv[activeId]?.messages || []), [byConv, activeId]);
//
//     // long-poll
//     useEffect(() => {
//         if (!activeId) return;
//         let aborted = false;
//         let since = byConv[activeId]?.since || 0;
//
//         const beat = async () => {
//             try { await api.post(r("chat.heartbeat",{conversation:activeId})); } catch {}
//         };
//         beat();
//         const hb = setInterval(beat, 20000);
//
//         const poll = async () => {
//             while (!aborted) {
//                 try {
//                     const { data } = await api.get(
//                         r("chat.sync",{conversation:activeId}) + `?since_id=${since}&timeout=22`
//                     );
//                     if (aborted) break;
//
//                     // messages
//                     if (Array.isArray(data.messages) && data.messages.length) {
//                         const incoming = data.messages;
//                         since = incoming[incoming.length-1].id;
//                         setByConv(prev => {
//                             const old = prev[activeId]?.messages || [];
//                             // simple dedupe by id
//                             const ids = new Set(old.map(m=>m.id));
//                             const merged = [...old, ...incoming.filter(m=>!ids.has(m.id))];
//                             return { ...prev, [activeId]: { ...(prev[activeId]||{}), messages: merged, since, peer: data.peer || {} } };
//                         });
//                     } else {
//                         // peer state tick
//                         setByConv(prev => ({ ...prev, [activeId]: { ...(prev[activeId]||{}), since, peer: data.peer || {} } }));
//                     }
//                 } catch (e) {
//                     await new Promise(res=>setTimeout(res, 800));
//                 }
//             }
//         };
//         poll();
//
//         return () => { aborted = true; clearInterval(hb); };
//         // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, [activeId]);
//
//     // first history load on conversation change
//     useEffect(()=>{
//         if (!activeId) return;
//         if ((byConv[activeId]?.messages || []).length) return;
//         (async ()=>{
//             try{
//                 const { data } = await api.get(r("chat.history",{conversation:activeId}) + "?limit=40");
//                 const msgs = Array.isArray(data.messages) ? data.messages : [];
//                 const since = msgs.length ? msgs[msgs.length-1].id : 0;
//                 setByConv(prev=> ({ ...prev, [activeId]: { messages: msgs, since, peer: { online:false, typing:false } } }));
//             }catch(_){}
//         })();
//         // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, [activeId]);
//
//     // send
//     async function send() {
//         if (!activeId || sending) return;
//         const text = value.trim();
//         if (!text && !att) return;
//
//         setSending(true);
//         try {
//             let payload = { client_mid: uid(), type: att ? "image" : "text" };
//             if (att) {
//                 const fd = new FormData();
//                 fd.append("file", att.file);
//                 const up = await api.post(r("chat.upload"), fd, { headers: { "Content-Type": "multipart/form-data" } });
//                 payload.upload_id = up.data.upload_id;
//             } else {
//                 payload.text = text;
//             }
//             const { data } = await api.post(r("chat.send",{conversation:activeId}), payload);
//             if (data?.message) {
//                 // append
//                 setByConv(prev=>{
//                     const old = prev[activeId]?.messages || [];
//                     return { ...prev, [activeId]: { ...(prev[activeId]||{}), messages: [...old, data.message], since: data.message.id, peer: prev[activeId]?.peer || {} } };
//                 });
//             }
//             setValue("");
//             setAtt(null);
//         } catch(_) {}
//         setSending(false);
//     }
//
//     return (
//         <div className="min-h-screen bg-[radial-gradient(70%_50%_at_50%_-10%,#e8fff4,transparent),linear-gradient(to_bottom_right,#f8fafc,#ecfdf5)] text-slate-900">
//             {/* header */}
//             <header className="sticky top-0 z-40 border-b border-emerald-200/50 bg-white/80 backdrop-blur">
//                 <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
//                     <div className="flex items-center gap-2">
//                         <button className="rounded-lg p-2 hover:bg-emerald-50 focus:outline-none md:hidden" onClick={()=>setSidebarOpen(true)}>
//                             <Menu className="h-5 w-5 text-emerald-700"/>
//                         </button>
//                         <div className="relative">
//                             <div className="absolute -inset-1 rounded-xl bg-emerald-400/30 blur-md"/>
//                             <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-400 text-white"><Car className="h-5 w-5"/></div>
//                         </div>
//                         <div className="ml-1">
//                             <div className="text-xs uppercase tracking-wide text-emerald-700/80">Քաղաքային տրանսֆեր</div>
//                             <div className="font-bold">Taxi Chat</div>
//                         </div>
//                     </div>
//                     <div className="hidden items-center gap-3 md:flex">
//                         <KBadge><ShieldCheck className="h-4 w-4"/> Պաշտպանված զրույց</KBadge>
//                         <KBadge><Smartphone className="h-4 w-4"/> Թեթև կայք</KBadge>
//                     </div>
//                 </div>
//             </header>
//
//             <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-6 md:grid-cols-[300px,1fr]">
//                 {/* sidebar */}
//                 <Sidebar
//                     open={sidebarOpen}
//                     onClose={()=>setSidebarOpen(false)}
//                     contacts={contacts}
//                     activeId={activeId}
//                     onPick={(id)=>{ setActiveId(id); setSidebarOpen(false); setContacts(prev=>prev.map(c=>c.id===id?{...c,unread:0}:c)); }}
//                 />
//
//                 {/* chat */}
//                 <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
//                     {current ? <ChatHeader person={current} peer={byConv[activeId]?.peer}/> : <div className="p-6 text-slate-500">Չատ ընտրեք</div>}
//                     <ChatScrollArea
//                         messages={list}
//                         typing={byConv[activeId]?.peer?.typing}
//                         onSeen={(lastId)=> {
//                             if (!lastId) return;
//                             api.post(r("chat.read",{conversation:activeId}), { last_visible_id: lastId }).catch(()=>{});
//                         }}
//                     />
//                     <ChatInput
//                         value={value} onChange={(v)=>{ setValue(v); if (activeId) api.post(r("chat.typing",{conversation:activeId}), { is_typing:true }).catch(()=>{}); }}
//                         onSend={send}
//                         onAttach={(e)=>{ const f=e.target.files?.[0]; if(!f) return; setAtt({ file:f, type:"image", url:URL.createObjectURL(f) }); }}
//                         att={att} setAtt={setAtt}
//                         onQuick={(txt)=>{ setValue(txt); setTimeout(send, 20); }}
//                         disabled={!current || sending}
//                     />
//                 </div>
//             </div>
//
//             <footer className="border-t border-emerald-200/40 bg-white/70 py-2 text-center text-xs text-emerald-800/80">
//                 © {new Date().getFullYear()} Taxi Platform · Զրույց
//             </footer>
//         </div>
//     );
// }
//
// /* ========= sidebar ========= */
// function Sidebar({ open, onClose, contacts, activeId, onPick }){
//     const [q, setQ] = useState("");
//     const filtered = contacts.filter(c =>
//         (c.name+" "+(c.note||"")).toLowerCase().includes(q.toLowerCase())
//     );
//
//     return (
//         <>
//             {/* desktop */}
//             <div className="hidden rounded-3xl border border-slate-200 bg-white shadow-xl md:block">
//                 <SidebarInner q={q} setQ={setQ} items={filtered} activeId={activeId} onPick={onPick} />
//             </div>
//
//             {/* mobile drawer */}
//             <AnimatePresence>
//                 {open && (
//                     <motion.div
//                         className="fixed inset-0 z-[9998] grid grid-cols-[1fr] bg-black/30 md:hidden"
//                         initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
//                         onClick={onClose}
//                     >
//                         <motion.div
//                             className="h-full w-[84%] overflow-hidden border-r border-slate-200 bg-white"
//                             initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}
//                             transition={{ type: "spring", stiffness: 420, damping: 34 }}
//                             onClick={e=>e.stopPropagation()}
//                         >
//                             <div className="flex items-center gap-2 border-b border-slate-200 p-3">
//                                 <button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-50"><X className="h-4 w-4"/></button>
//                                 <div className="font-semibold">Մարդիկ</div>
//                             </div>
//                             <SidebarInner q={q} setQ={setQ} items={filtered} activeId={activeId} onPick={onPick} />
//                         </motion.div>
//                     </motion.div>
//                 )}
//             </AnimatePresence>
//         </>
//     );
// }
//
// function StatusDot({ s }){
//     const map = { online:"bg-emerald-500", busy:"bg-amber-500", offline:"bg-slate-400" };
//     return <span className={`inline-block h-2.5 w-2.5 rounded-full ${map[s]||"bg-slate-400"}`} />;
// }
//
// function SidebarInner({ q, setQ, items, activeId, onPick }){
//     return (
//         <div className="flex h-full flex-col">
//             <div className="p-3">
//                 <label className="relative block">
//                     <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/>
//                     <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Փնտրել մարդկանց"
//                            className="w-full rounded-xl border border-slate-200 bg-white px-9 py-2 text-sm outline-none focus:border-emerald-400"/>
//                 </label>
//             </div>
//
//             <div className="flex-1 divide-y divide-slate-100 overflow-auto">
//                 {items.map(p => (
//                     <button
//                         key={p.id}
//                         onClick={()=>onPick(p.id)}
//                         className={`flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-emerald-50 ${p.id===activeId?"bg-emerald-50/60":""}`}
//                     >
//                         <img src={p.avatar || `https://i.pravatar.cc/64?u=${encodeURIComponent(p.name)}`} alt={p.name} className="h-10 w-10 rounded-full border border-slate-200 object-cover"/>
//                         <div className="min-w-0 flex-1">
//                             <div className="flex items-center justify-between">
//                                 <div className="truncate font-medium">{p.name}</div>
//                                 <div className="ml-2 flex items-center gap-1 text-xs text-slate-500">
//                                     <StatusDot s={p.status} /><span className="hidden sm:inline">{p.status==="online"?"Առցանց":"Կցանցից դուրս"}</span>
//                                     {p.unread>0 && <span className="ml-2 rounded-full bg-emerald-500 px-2 py-[2px] text-[11px] font-semibold text-white">{p.unread}</span>}
//                                 </div>
//                             </div>
//                             <div className="truncate text-sm text-slate-500">{p.note}</div>
//                         </div>
//                     </button>
//                 ))}
//                 {items.length===0 && <div className="p-4 text-sm text-slate-500">Ոչինչ չի գտնվել</div>}
//             </div>
//
//             <div className="border-t border-slate-200 p-3 text-xs text-slate-600">
//                 <div className="mb-1 font-semibold">Արագ խորհուրդներ</div>
//                 <ul className="list-inside list-disc space-y-1">
//                     <li>Սեղմեք քարտեզի կոճակը՝ կիսվելու ձեր դիրքով</li>
//                     <li>Կցեք նկարը՝ ուղեբեռի չափը ցույց տալու համար</li>
//                     <li>Օգտվեք արագ պատասխաններից</li>
//                 </ul>
//             </div>
//         </div>
//     );
// }
//
// /* ========= chat header ========= */
// function ChatHeader({ person, peer }){
//     return (
//         <div className="flex items-center gap-3 border-b border-slate-200 p-3">
//             <img src={person.avatar || `https://i.pravatar.cc/80?u=${encodeURIComponent(person.name)}`} className="h-10 w-10 rounded-full border border-slate-200 object-cover" alt="avatar"/>
//             <div className="min-w-0">
//                 <div className="font-semibold leading-tight">{person.name}</div>
//                 <div className="text-xs text-emerald-700">{person.note} · {peer?.online ? "Առցանց" : "Թղթապանակ"}</div>
//             </div>
//             <div className="ml-auto flex items-center gap-2 text-xs text-slate-600">
//                 <KBadge><Users className="h-4 w-4"/> 4 տեղ</KBadge>
//                 <KBadge><Clock className="h-4 w-4"/> Արագ կապ</KBadge>
//                 <KBadge><Phone className="h-4 w-4"/> Զանգ</KBadge>
//             </div>
//         </div>
//     );
// }
//
// /* ========= chat list ========= */
// function ChatScrollArea({ messages, typing, onSeen }){
//     const ref = useRef(null);
//     const [atBottom, setAtBottom] = useState(true);
//
//     useEffect(()=>{
//         if (ref.current && atBottom) ref.current.scrollTop = ref.current.scrollHeight;
//         // report seen
//         if (messages.length) onSeen(messages[messages.length-1].id);
//         // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, [messages, typing]);
//
//     function onScroll(){
//         if (!ref.current) return;
//         const near = ref.current.scrollHeight - ref.current.scrollTop - ref.current.clientHeight < 60;
//         setAtBottom(near);
//         if (near && messages.length) onSeen(messages[messages.length-1].id);
//     }
//
//     return (
//         <div className="relative h-[58vh] overflow-hidden md:h-[62vh]">
//             <div ref={ref} onScroll={onScroll} className="h-full overflow-auto bg-[linear-gradient(180deg,rgba(16,185,129,0.06),transparent_120px)] p-3">
//                 <div className="mx-auto max-w-2xl space-y-8">
//                     {messages.map((m,i)=> <Message key={m.id} m={m} prev={messages[i-1]} />)}
//                     <AnimatePresence>{typing && <TypingBubble/>}</AnimatePresence>
//                 </div>
//             </div>
//             {!atBottom && (
//                 <button
//                     onClick={()=>{ if(!ref.current) return; ref.current.scrollTo({ top: ref.current.scrollHeight, behavior:"smooth" }); }}
//                     className="absolute bottom-20 right-3 rounded-full bg-emerald-600 p-2 text-white shadow-md"
//                 >↓</button>
//             )}
//         </div>
//     );
// }
//
// function Message({ m, prev }){
//     const mine = m.from === "me";
//     const groupTop = !prev || prev.from !== m.from;
//     const bubble = (
//         <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow ${mine?"bg-gradient-to-br from-emerald-500 to-cyan-400 text-white":"bg-white border border-slate-200 text-slate-800"}`}>
//             {m.type === "text" && <div className="whitespace-pre-wrap leading-relaxed">{m.text}</div>}
//             {m.type === "image" && <img src={m.url} alt="upload" className={`max-h-64 rounded-xl ${mine?"border-white/50":"border-slate-200"} border`} />}
//             {m.type === "trip"  && <TripCard trip={m.trip} compact />}
//             {m.type === "system" && <div className="text-center text-xs text-slate-500">{m.text}</div>}
//             <div className={`mt-1 flex items-center gap-1 ${mine?"justify-end text-white/80":"justify-end text-slate-500"}`}>
//                 <span className="text-[11px]">{m.at || nowTime()}</span>
//                 {mine ? <CheckCheck className="h-3.5 w-3.5"/> : null}
//             </div>
//         </div>
//     );
//     return (
//         <div className={`flex items-end gap-2 ${mine?"justify-end":""}`}>
//             {!mine && groupTop && <img src={`https://i.pravatar.cc/80?u=${encodeURIComponent("peer")}`} alt="peer" className="mt-auto h-7 w-7 rounded-full border border-slate-200 object-cover" />}
//             <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>{bubble}</motion.div>
//         </div>
//     );
// }
//
// function TypingBubble(){
//     return (
//         <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-end gap-2">
//             <img src="https://i.pravatar.cc/80?u=typing" alt="peer" className="mt-auto h-7 w-7 rounded-full border border-slate-200 object-cover" />
//             <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow">
//                 <div className="flex items-center gap-1">
//                     {[0,1,2].map(i=> (
//                         <motion.span key={i} className="h-2 w-2 rounded-full bg-emerald-500" animate={{ opacity: [0.2,1,0.2] }} transition={{ repeat: Infinity, duration: 1.2, delay: i*0.15 }} />
//                     ))}
//                 </div>
//             </div>
//         </motion.div>
//     );
// }
//
// /* ========= input ========= */
// function ChatInput({ value, onChange, onSend, onAttach, att, setAtt, onQuick, disabled }){
//     const fileRef = useRef(null);
//     const quick = ["Բարև, մոտենում եմ","Կտեսնվենք մետրոյի մոտ","Կգնեմ Նորքի կողմից"];
//     return (
//         <div className="border-t border-slate-200 p-2">
//             <div className="mx-auto max-w-2xl">
//                 <div className="mb-1 flex flex-wrap gap-2">
//                     <button disabled={disabled} className="inline-flex items-center gap-1 rounded-full border border-emerald-300/60 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700 hover:bg-emerald-100 disabled:opacity-50" onClick={()=>onQuick("Իմ դիրքը՝ Երևան Մալիք-Փաշայան 12")}>
//                         <MapPin className="h-3.5 w-3.5"/> Կիսվել տեղադրությամբ
//                     </button>
//                     <button disabled={disabled} className="inline-flex items-center gap-1 rounded-full border border-sky-300/60 bg-sky-50 px-2.5 py-1 text-xs text-sky-700 hover:bg-sky-100 disabled:opacity-50" onClick={()=>onQuick("Գինը հաստատո՞ւմ եք 5500 AMD / տեղ")}>
//                         <ArrowLeftRight className="h-3.5 w-3.5"/> Գնի հաստատում
//                     </button>
//                 </div>
//
//                 {att && (
//                     <div className="mb-2 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs">
//                         <div className="flex items-center gap-2"><ImageIcon className="h-4 w-4 text-slate-500"/><span>Կցված պատկեր</span></div>
//                         <button onClick={()=>setAtt(null)} className="rounded px-2 py-1 text-slate-600 hover:bg-slate-200">Հեռացնել</button>
//                     </div>
//                 )}
//
//                 <div className="flex items-end gap-2">
//                     <button disabled={disabled} onClick={()=>fileRef.current?.click()} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50 disabled:opacity-50"><Paperclip className="h-5 w-5"/></button>
//                     <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onAttach} />
//
//                     <label className="relative block w-full">
//                         <input
//                             value={value} onChange={e=>onChange(e.target.value)} placeholder="Գրեք հաղորդագրությունը…"
//                             className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 outline-none focus:border-emerald-400"
//                             onKeyDown={(e)=>{ if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); onSend(); } }}
//                             disabled={disabled}
//                         />
//                         <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><Info className="h-4 w-4"/></div>
//                     </label>
//
//                     <button disabled={disabled} onClick={onSend} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-400 px-4 py-2 font-semibold text-white shadow hover:brightness-95 disabled:opacity-50">
//                         <Send className="h-4 w-4"/> Ուղարկել
//                     </button>
//                 </div>
//
//                 <div className="mt-2 flex flex-wrap gap-2">
//                     {quick.map((q,i)=> (
//                         <button key={i} disabled={disabled} onClick={()=>onQuick(q)} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50">{q}</button>
//                     ))}
//                 </div>
//             </div>
//         </div>
//     );
// }
//
// /* ========= small blocks ========= */
// function KBadge({ children }){ return <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/60 bg-emerald-50 px-2 py-[2px] text-[11px] text-emerald-800">{children}</span>; }
//
// function TripCard({ trip, compact = false }){
//     if (!trip) return null;
//     return (
//         <div className={`overflow-hidden rounded-xl border ${compact?"border-white/40 bg-white/10":"border-slate-200 bg-slate-50"} p-3`}>
//             <div className="mb-2 flex items-center justify-between">
//                 <div className="text-sm font-semibold text-emerald-700">{trip.from} → {trip.to}</div>
//                 <div className="text-xs text-slate-500">{trip.date} · {trip.time}</div>
//             </div>
//             <div className="grid gap-2 sm:grid-cols-2">
//                 <div className="flex items-center gap-2 text-xs text-slate-600"><Users className="h-4 w-4 text-emerald-600"/> Տեղեր՝ {(trip.seatsTotal||0) - (trip.seatsTaken||0)} ազատ</div>
//                 <div className="flex items-center gap-2 text-xs text-slate-600"><Clock className="h-4 w-4 text-emerald-600"/> Մոտ. 2-3 ժ</div>
//             </div>
//             <div className="mt-2 flex items-center justify-between">
//                 <div className="text-sm font-bold text-emerald-700">{fmtAMD(trip.priceAMD)} AMD <span className="text-xs font-medium text-emerald-600">/ տեղ</span></div>
//                 <div className="text-xs text-slate-600">{trip?.vehicle?.brand} {trip?.vehicle?.model} · {trip?.vehicle?.plate}</div>
//             </div>
//         </div>
//     );
// }
//
// resources/js/Pages/Chat.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Send, Paperclip, Image as ImageIcon, MapPin, Phone, Car, CheckCheck,
    Menu, Search, X, ShieldCheck, Clock, Users, Smartphone, Info, ArrowLeftRight,
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
        return "/";
    }
};
const uid = () => Math.random().toString(36).slice(2);
const nowTime = () => new Date().toLocaleTimeString("hy-AM", { hour: "2-digit", minute: "2-digit" });
const fmtAMD = (n) => { try { return new Intl.NumberFormat("hy-AM").format(n || 0); } catch { return n; } };
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

/* ========= root ========= */
export default function Chat() {
    const { props } = usePage();
    const initialConvId = props?.openConversationId || null;

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [contacts, setContacts] = useState([]);
    const [activeId, setActiveId] = useState(initialConvId);
    const [byConv, setByConv] = useState({}); // { convId: { messages:[], since:0, peer:{online:false,typing:false} } }
    const [value, setValue] = useState("");
    const [att, setAtt] = useState(null);
    const [sending, setSending] = useState(false);

    // per-conversation since tracker that survives renders
    const sinceRef = useRef({}); // { convId: lastId }

    // load contacts
    useEffect(() => {
        let stop = false;
        const load = async () => {
            try {
                const { data } = await api.get(r("chat.contacts"));
                if (stop) return;
                setContacts(data.items || []);
                if (!activeId && data.items?.length) setActiveId(data.items[0].id);
            } catch {}
        };
        load();
        const t = setInterval(load, 15000);
        return () => { stop = true; clearInterval(t); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const current = useMemo(() => contacts.find(c => c.id === activeId) || null, [contacts, activeId]);
    const list = useMemo(() => (byConv[activeId]?.messages || []), [byConv, activeId]);

    // long-poll
    useEffect(() => {
        if (!activeId) return;
        let aborted = false;
        let since = sinceRef.current[activeId] ?? (byConv[activeId]?.since || 0);

        const beat = async () => { try { await api.post(r("chat.heartbeat", { conversation: activeId })); } catch {} };
        beat();
        const hb = setInterval(beat, 20000);

        const poll = async () => {
            while (!aborted) {
                try {
                    const { data } = await api.get(r("chat.sync", { conversation: activeId }) + `?since_id=${since}&timeout=22`);
                    if (aborted) break;

                    if (Array.isArray(data.messages) && data.messages.length) {
                        const incoming = data.messages;
                        since = incoming[incoming.length - 1].id;
                        sinceRef.current[activeId] = since;

                        setByConv(prev => {
                            const old = prev[activeId]?.messages || [];
                            const ids = new Set(old.map(m => m.id));
                            const merged = [...old, ...incoming.filter(m => !ids.has(m.id))];
                            return { ...prev, [activeId]: { ...(prev[activeId] || {}), messages: merged, since, peer: data.peer || {} } };
                        });

                        // immediately continue polling for next updates
                        continue;
                    }

                    // peer state tick, keep since
                    setByConv(prev => ({ ...prev, [activeId]: { ...(prev[activeId] || {}), since, peer: data.peer || {} } }));
                    await sleep(150);
                    continue;
                } catch {
                    await sleep(800);
                    continue;
                }
            }
        };
        poll();

        return () => { aborted = true; clearInterval(hb); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeId]);

    // first history load on conversation change
    useEffect(() => {
        if (!activeId) return;
        if ((byConv[activeId]?.messages || []).length) return;
        (async () => {
            try {
                const { data } = await api.get(r("chat.history", { conversation: activeId }) + "?limit=40");
                const msgs = Array.isArray(data.messages) ? data.messages : [];
                const since = msgs.length ? msgs[msgs.length - 1].id : 0;
                sinceRef.current[activeId] = since;
                setByConv(prev => ({ ...prev, [activeId]: { messages: msgs, since, peer: { online: false, typing: false } } }));
            } catch {}
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeId]);

    // send
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
                    const next = { ...(prev[activeId] || {}) };
                    next.messages = [...old, data.message];
                    next.since = data.message.id;
                    return { ...prev, [activeId]: next };
                });
                sinceRef.current[activeId] = data.message.id; // keep poll cursor in sync
            }
            setValue("");
            setAtt(null);
        } catch {}
        setSending(false);
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
                        onSeen={(lastId) => {
                            if (!lastId) return;
                            api.post(r("chat.read", { conversation: activeId }), { last_visible_id: lastId }).catch(() => { });
                        }}
                    />
                    <ChatInput
                        value={value}
                        onChange={(v) => { setValue(v); if (activeId) api.post(r("chat.typing", { conversation: activeId }), { is_typing: true }).catch(() => { }); }}
                        onSend={send}
                        onAttach={(e) => { const f = e.target.files?.[0]; if (!f) return; setAtt({ file: f, type: "image", url: URL.createObjectURL(f) }); }}
                        att={att} setAtt={setAtt}
                        onQuick={(txt) => { setValue(txt); setTimeout(send, 20); }}
                        disabled={!current || sending}
                    />
                </div>
            </div>

            <footer className="border-t border-emerald-200/40 bg-white/70 py-2 text-center text-xs text-emerald-800/80">
                © {new Date().getFullYear()} Taxi Platform · Զրույց
            </footer>
        </div>
    );
}

/* ========= sidebar ========= */
function Sidebar({ open, onClose, contacts, activeId, onPick }) {
    const [q, setQ] = useState("");
    const filtered = contacts.filter(c =>
        (c.name + " " + (c.note || "")).toLowerCase().includes(q.toLowerCase())
    );

    return (
        <>
            {/* desktop */}
            <div className="hidden rounded-3xl border border-slate-200 bg-white shadow-xl md:block">
                <SidebarInner q={q} setQ={setQ} items={filtered} activeId={activeId} onPick={onPick} />
            </div>

            {/* mobile drawer */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        className="fixed inset-0 z-[9998] grid grid-cols-[1fr] bg-black/30 md:hidden"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                    >
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
                    <button
                        key={p.id}
                        onClick={() => onPick(p.id)}
                        className={`flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-emerald-50 ${p.id === activeId ? "bg-emerald-50/60" : ""}`}
                    >
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

/* ========= chat header ========= */
function ChatHeader({ person, peer }) {
    return (
        <div className="flex items-center gap-3 border-b border-slate-200 p-3">
            <img src={person.avatar || `https://i.pravatar.cc/80?u=${encodeURIComponent(person.name)}`} className="h-10 w-10 rounded-full border border-slate-200 object-cover" alt="avatar" />
            <div className="min-w-0">
                <div className="font-semibold leading-tight">{person.name}</div>
                <div className="text-xs text-emerald-700">{person.note} · {peer?.online ? "Առցանց" : "Թղթապանակ"}</div>
            </div>
            <div className="ml-auto flex items-center gap-2 text-xs text-slate-600">
                <KBadge><Users className="h-4 w-4" /> 4 տեղ</KBadge>
                <KBadge><Clock className="h-4 w-4" /> Արագ կապ</KBadge>
                <KBadge><Phone className="h-4 w-4" /> Զանգ</KBadge>
            </div>
        </div>
    );
}

/* ========= chat list ========= */
function ChatScrollArea({ messages, typing, onSeen }) {
    const ref = useRef(null);
    const [atBottom, setAtBottom] = useState(true);

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
                <div className="mx-auto max-w-2xl space-y-8">
                    {messages.map((m, i) => <Message key={m.id} m={m} prev={messages[i - 1]} />)}
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

function Message({ m, prev }) {
    const mine = m.from === "me";
    const groupTop = !prev || prev.from !== m.from;
    const bubble = (
        <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow ${mine ? "bg-gradient-to-br from-emerald-500 to-cyan-400 text-white" : "bg-white border border-slate-200 text-slate-800"}`}>
            {m.type === "text" && <div className="whitespace-pre-wrap leading-relaxed">{m.text}</div>}
            {m.type === "image" && <img src={m.url} alt="upload" className={`max-h-64 rounded-xl ${mine ? "border-white/50" : "border-slate-200"} border`} />}
            {m.type === "trip" && <TripCard trip={m.trip} compact />}
            {m.type === "system" && <div className="text-center text-xs text-slate-500">{m.text}</div>}
            <div className={`mt-1 flex items-center gap-1 ${mine ? "justify-end text-white/80" : "justify-end text-slate-500"}`}>
                <span className="text-[11px]">{m.at || nowTime()}</span>
                {mine ? <CheckCheck className="h-3.5 w-3.5" /> : null}
            </div>
        </div>
    );
    return (
        <div className={`flex items-end gap-2 ${mine ? "justify-end" : ""}`}>
            {!mine && groupTop && <img src={`https://i.pravatar.cc/80?u=${encodeURIComponent("peer")}`} alt="peer" className="mt-auto h-7 w-7 rounded-full border border-slate-200 object-cover" />}
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>{bubble}</motion.div>
        </div>
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
function ChatInput({ value, onChange, onSend, onAttach, att, setAtt, onQuick, disabled }) {
    const fileRef = useRef(null);
    const quick = ["Բարև, մոտենում եմ", "Կտեսնվենք մետրոյի մոտ", "Կգնեմ Նորքի կողմից"];
    return (
        <div className="border-t border-slate-200 p-2">
            <div className="mx-auto max-w-2xl">
                <div className="mb-1 flex flex-wrap gap-2">
                    <button disabled={disabled} className="inline-flex items-center gap-1 rounded-full border border-emerald-300/60 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700 hover:bg-emerald-100 disabled:opacity-50" onClick={() => onQuick("Իմ դիրքը՝ Երևան Մալիք-Փաշայան 12")}>
                        <MapPin className="h-3.5 w-3.5" /> Կիսվել տեղադրությամբ
                    </button>
                    <button disabled={disabled} className="inline-flex items-center gap-1 rounded-full border border-sky-300/60 bg-sky-50 px-2.5 py-1 text-xs text-sky-700 hover:bg-sky-100 disabled:opacity-50" onClick={() => onQuick("Գինը հաստատո՞ւմ եք 5500 AMD / տեղ")}>
                        <ArrowLeftRight className="h-3.5 w-3.5" /> Գնի հաստատում
                    </button>
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
