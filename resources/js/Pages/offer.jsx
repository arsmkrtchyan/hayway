// // HayWay Ultra Demo JSX (Explore + Offers only)
// // One file. React + Tailwind + framer-motion + lucide-react + MapLibre.
// // Integrated with Laravel API for orders and offers functionality.
// // Default export <HayWayUltraDemo />
//
// import React, { useEffect, useMemo, useRef, useState } from "react";
// import { motion, AnimatePresence } from "framer-motion";
// import {
//   MapPin, Search, Users as UsersIcon, Calendar, Car, ArrowLeftRight,
//   Star, ShieldCheck, Clock, ChevronRight, Filter,
//   MessageSquare, Building2, Sparkles, UserRound, Map as MapIcon
// } from "lucide-react";
// import dayjs from "dayjs";
//
// /*********************************
//  * UTILITIES & THEMING
//  *********************************/
// const fmtAMD = n => new Intl.NumberFormat("hy-AM").format(Number(n||0));
// const rand = (min, max) => Math.random() * (max - min) + min;
// const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
//
// const useLocal = (key, initial) => {
//   const [v, setV] = useState(() => {
//     try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : initial; } catch { return initial; }
//   });
//   useEffect(()=>{ try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }, [key, v]);
//   return [v, setV];
// };
//
// /*********************************
//  * MAPLIBRE LOADER
//  *********************************/
// const NOMI_LANG = "hy,ru,en";
// async function reverseGeocodeNominatim(lng, lat) {
//   try {
//     const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&accept-language=${encodeURIComponent(NOMI_LANG)}&lat=${lat}&lon=${lng}&addressdetails=1`;
//     const res = await fetch(url, { headers: { Accept: "application/json" } });
//     if (!res.ok) return "";
//     const data = await res.json();
//     const addr = data?.address || {};
//     const parts = [addr.city, addr.town, addr.village, addr.road, addr.country].filter(Boolean);
//     return parts.join(", ") || data?.display_name || "";
//   } catch { return ""; }
// }
// let maplibrePromise = null;
// function ensureMapLibre() {
//   if (typeof window === "undefined") return Promise.resolve(null);
//   if (window.maplibregl) return Promise.resolve(window.maplibregl);
//   if (maplibrePromise) return maplibrePromise;
//   maplibrePromise = new Promise((resolve, reject) => {
//     const cssId = "maplibre-gl-css";
//     if (!document.getElementById(cssId)) {
//       const link = document.createElement("link");
//       link.id = cssId; link.rel = "stylesheet";
//       link.href = "https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css";
//       document.head.appendChild(link);
//     }
//     const script = document.createElement("script");
//     script.src = "https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js";
//     script.async = true;
//     script.onload = () => resolve(window.maplibregl);
//     script.onerror = () => reject(new Error("Cannot load maplibre"));
//     document.body.appendChild(script);
//   });
//   return maplibrePromise;
// }
//
// /*********************************
//  * LARAVEL API INTEGRATION
//  *********************************/
// const API_BASE = '/offers/api';
//
// // Get CSRF token from meta tag
// function getCSRFToken() {
//   const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
//   return token || '';
// }
// async function initCsrf(){
//   await fetch('/sanctum/csrf-cookie', { credentials:'include' });
// }
//
// // API helper with error handling for Inertia.js
// function getXsrfFromCookie(){
//   const m = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
//   return m ? decodeURIComponent(m[1]) : '';
// }
//
// async function apiCall(endpoint, options = {}) {
//   const url = `/offers/api${endpoint}`;
//   const cfg = {
//     method: 'GET',
//     credentials: 'include',
//     headers: {
//       'Accept': 'application/json',
//       'Content-Type': 'application/json',
//       'X-XSRF-TOKEN': getXsrfFromCookie(),
//       'X-Requested-With': 'XMLHttpRequest',
//     },
//     ...options,
//     headers: {
//       ...options.headers,
//       'Accept':'application/json',
//       'Content-Type': options.body ? 'application/json' : 'application/json',
//       'X-XSRF-TOKEN': getXsrfFromCookie(),
//       'X-Requested-With': 'XMLHttpRequest',
//     }
//   };
//   const res = await fetch(url, cfg);
//   const ct = res.headers.get('content-type')||'';
//   const body = ct.includes('application/json') ? await res.json() : await res.text();
//   if(!res.ok) { console.error('API Error', {url, status:res.status, body}); throw new Error(`HTTP ${res.status}`); }
//   return body;
// }
//
// // Laravel API service
// function useLaravelApi() {
//   return {
//     // Get amenities
//     listAmenities: async () => {
//       const data = await apiCall('/amenities');
//       return data.data || [];
//     },
//
//     // Get trips (using existing trip endpoint)
//     listTrips: async (filters = {}) => {
//       const params = new URLSearchParams();
//
//       if (filters.from) params.append('from', filters.from);
//       if (filters.to) params.append('to', filters.to);
//       if (filters.seats) params.append('seats', filters.seats);
//       if (filters.date_from) params.append('date_from', filters.date_from);
//       if (filters.amenities) params.append('amenities', filters.amenities);
//
//       const data = await apiCall(`/trips?${params.toString()}`);
//       return data.data || [];
//     },
//
//     // Create order
//     createOrder: async (orderData) => {
//       const data = await apiCall('/orders', {
//         method: 'POST',
//         body: JSON.stringify(orderData),
//       });
//       return data;
//     },
//
//     // Get my orders
//     myOrders: async () => {
//       const data = await apiCall('/orders');
//       return data.data || [];
//     },
//
//     // Get matching orders for a trip
//     getMatchingOrders: async (tripId, filters = {}) => {
//       const params = new URLSearchParams();
//       params.append('mode', filters.mode || 'radius');
//       if (filters.radius_km) params.append('radius_km', filters.radius_km);
//       if (filters.corridor_km) params.append('corridor_km', filters.corridor_km);
//       if (filters.time_from) params.append('time_from', filters.time_from);
//       if (filters.time_to) params.append('time_to', filters.time_to);
//       if (filters.min_seats) params.append('min_seats', filters.min_seats);
//       if (filters.max_price_amd) params.append('max_price_amd', filters.max_price_amd);
//
//       const data = await apiCall(`/trips/${tripId}/matching-orders?${params.toString()}`);
//       return data.data || [];
//     },
//
//     // Create offer
//     createOffer: async (offerData) => {
//       const data = await apiCall('/offers', {
//         method: 'POST',
//         body: JSON.stringify(offerData),
//       });
//       return data;
//     },
//
//     // Get my offers
//     myOffers: async () => {
//       const data = await apiCall('/offers');
//       return data.data || [];
//     },
//
//     // Accept offer
//     acceptOffer: async (offerId) => {
//       const data = await apiCall(`/offers/${offerId}/accept`, {
//         method: 'POST',
//       });
//       return data;
//     },
//
//     // Reject offer
//     rejectOffer: async (offerId) => {
//       const data = await apiCall(`/offers/${offerId}/reject`, {
//         method: 'POST',
//       });
//       return data;
//     },
//
//     // Withdraw offer
//     withdrawOffer: async (offerId) => {
//       const data = await apiCall(`/offers/${offerId}/withdraw`, {
//         method: 'POST',
//       });
//       return data;
//     },
//   };
// }
//
// /*********************************
//  * LAYOUT + SHELL
//  *********************************/
// function AppShell({ current, onNav, children }) {
//   return (
//
//     <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
//       <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-slate-200">
//         <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
//           <Sparkles className="h-5 w-5 text-emerald-600" />
//           <div className="font-semibold tracking-tight">HayWay • Ultra Demo</div>
//           <nav className="ml-auto flex items-center gap-2 text-sm">
//             <TabBtn label="Поиск" active={current==='explore'} onClick={()=>onNav('explore')} />
//             <TabBtn label="Предложения" icon={<Building2 className="h-4 w-4"/>} active={current==='offers'} onClick={()=>onNav('offers')} />
//           </nav>
//         </div>
//       </header>
//       <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
//       <footer className="mx-auto max-w-7xl px-4 py-6 text-xs text-slate-500">Demo. Mock data only.</footer>
//     </div>
//   );
// }
// function TabBtn({ label, active, onClick, icon }){
//   return (
//     <button onClick={onClick}
//       className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 border text-slate-600 transition ${active? 'border-emerald-400 bg-emerald-50 text-emerald-700 shadow-sm':'border-slate-200 hover:border-emerald-300 hover:text-emerald-700'}`}
//     >{icon}{label}</button>
//   );
// }
//
// /*********************************
//  * EXPLORE PAGE
//  *********************************/
// function ExplorePage({ api, initialData }){
//   const [filters, setFilters] = useState({ from:"", to:"", date_from: dayjs().format("YYYY-MM-DD"), seats:1, amenities:"" });
//   const [amenityGroups, setAmenityGroups] = useState(initialData?.amenities || []);
//   const [trips, setTrips] = useState(initialData?.trips || []);
//   const [trust, setTrust] = useState(false);
//   const [sort, setSort] = useState("earliest");
//   const [mapPick, setMapPick] = useState(null);
//   const [orderOpen, setOrderOpen] = useState(false);
//   const [orderDraft, setOrderDraft] = useState(null);
//   const [busy, setBusy] = useState(false);
//   const [error, setError] = useState(null);
// useEffect(()=>{ initCsrf(); },[]);
//   useEffect(()=>{
//     if (!initialData?.amenities) {
//       loadAmenities();
//     }
//   },[]);
//
//   useEffect(()=>{
//     if (!initialData?.trips) {
//       loadTrips();
//     }
//   }, [JSON.stringify(filters)]);
//
//   const loadAmenities = async () => {
//     try {
//       const data = await api.listAmenities();
//       setAmenityGroups(data);
//     } catch (err) {
//       console.error('Error loading amenities:', err);
//     }
//   };
//
//   const loadTrips = async () => {
//     setBusy(true);
//     setError(null);
//     try {
//       const data = await api.listTrips(filters);
//       setTrips(data);
//     } catch (err) {
//       setError(err.message);
//       console.error('Error loading trips:', err);
//     } finally {
//       setBusy(false);
//     }
//   };
//
//   const filtered = useMemo(()=>{
//     let list=[...trips];
//     if(trust) list=list.filter(t=> (t.company?.rating || t.driver?.rating || 0) >= 4.5);
//     switch (sort){
//       case 'cheapest': list.sort((a,b)=>(a.price_amd||1e9)-(b.price_amd||1e9)); break;
//       case 'rating': list.sort((a,b)=>((b.company?.rating||b.driver?.rating||0)-(a.company?.rating||a.driver?.rating||0))); break;
//       case 'shortest': list.sort((a,b)=> (a.eta_sec||1e9)-(b.eta_sec||1e9)); break;
//       default: list.sort((a,b)=> dayjs(a.departure_at)-dayjs(b.departure_at));
//     }
//     return list;
//   }, [trips, trust, sort]);
//
//   const openOrder = ()=>{
//     const d = filters.date_from || dayjs().format('YYYY-MM-DD');
//     setOrderDraft({
//       from_addr: filters.from, to_addr: filters.to,
//       from_lat: mapPick?.initial?.lat ?? null, from_lng: mapPick?.initial?.lng ?? null,
//       to_lat: null, to_lng: null,
//       when_from: dayjs(d).startOf('day').toISOString(), when_to: dayjs(d).endOf('day').toISOString(),
//       seats: Number(filters.seats)||1, payment: null, desired_price_amd: null,
//     });
//     setOrderOpen(true);
//   };
//
//   return (
//     <div className="grid gap-6 md:grid-cols-[280px,1fr]">
//       <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow">
//         <form className="space-y-3" onSubmit={e=>{e.preventDefault();}}>
//           <Field label="Откуда">
//             <div className="flex items-center gap-2 rounded-xl border px-3 py-2">
//               <MapPin className="h-4 w-4 text-emerald-600"/>
//               <input className="w-full outline-none text-sm" value={filters.from} placeholder="Երևան" onChange={e=>setFilters(p=>({...p, from:e.target.value}))} />
//               <IconBtn onClick={()=> setMapPick({ side:'from', initial: null })}><MapIcon className="h-4 w-4"/></IconBtn>
//             </div>
//           </Field>
//           <div className="flex justify-center"><ArrowLeftRight className="h-4 w-4 text-slate-400"/></div>
//           <Field label="Куда">
//             <div className="flex items-center gap-2 rounded-xl border px-3 py-2">
//               <MapPin className="h-4 w-4 text-emerald-600"/>
//               <input className="w-full outline-none text-sm" value={filters.to} placeholder="Դիլիջան" onChange={e=>setFilters(p=>({...p, to:e.target.value}))} />
//               <IconBtn onClick={()=> setMapPick({ side:'to', initial: null })}><MapIcon className="h-4 w-4"/></IconBtn>
//             </div>
//           </Field>
//           <div className="grid grid-cols-2 gap-2">
//             <Field label="Дата">
//               <div className="flex items-center gap-2 rounded-xl border px-3 py-2">
//                 <Calendar className="h-4 w-4 text-emerald-600"/>
//                 <input type="date" className="w-full outline-none text-sm" value={filters.date_from} onChange={e=>setFilters(p=>({...p, date_from:e.target.value}))}/>
//               </div>
//             </Field>
//             <Field label="Места">
//               <div className="flex items-center gap-2 rounded-xl border px-3 py-2">
//                 <UsersIcon className="h-4 w-4 text-emerald-600"/>
//                 <input type="number" min={1} max={6} className="w-full outline-none text-sm" value={filters.seats} onChange={e=>setFilters(p=>({...p, seats: clamp(parseInt(e.target.value||'1'),1,6)}))}/>
//               </div>
//             </Field>
//           </div>
//           <Field label="Удобства">
//             <div className="flex flex-wrap gap-2">
//               {amenityGroups.flatMap(g=>g.amenities).map(a=>{
//                 const active = (filters.amenities||"").split(',').map(x=>+x).includes(a.id);
//                 return (
//                   <button key={a.id} type="button" onClick={()=>{
//                     const set = new Set(String(filters.amenities||"").split(',').filter(Boolean).map(x=>+x));
//                     set.has(a.id)? set.delete(a.id) : set.add(a.id);
//                     setFilters(p=>({...p, amenities: Array.from(set).join(',')}));
//                   }} className={`text-xs rounded-full px-3 py-1 border ${active? 'border-emerald-400 bg-emerald-50 text-emerald-700':'border-slate-200 text-slate-600'}`}>{a.icon||""} {a.name}</button>
//                 );
//               })}
//             </div>
//           </Field>
//           <div className="flex items-center justify-between text-sm">
//             <label className="inline-flex items-center gap-2"><input type="checkbox" checked={trust} onChange={e=>setTrust(e.target.checked)} /> <ShieldCheck className="h-4 w-4 text-emerald-600"/> Рейтинг ≥ 4.5</label>
//             <label className="inline-flex items-center gap-2 text-slate-500">
//               <Filter className="h-4 w-4"/> Сортировка
//               <select className="border rounded px-2 py-1" value={sort} onChange={e=>setSort(e.target.value)}>
//                 <option value="earliest">Ранний старт</option>
//                 <option value="cheapest">Дешевле</option>
//                 <option value="rating">Рейтинг</option>
//                 <option value="shortest">Короткая</option>
//               </select>
//             </label>
//           </div>
//           <div className="grid grid-cols-2 gap-2 pt-2">
//             <button type="button" onClick={()=>setFilters({ from:"", to:"", date_from: dayjs().format("YYYY-MM-DD"), seats:1, amenities:"" })} className="rounded-xl border px-3 py-2 text-sm">Сброс</button>
//             <button type="button" onClick={openOrder} className="rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-3 py-2 text-sm font-semibold text-white">Создать order</button>
//           </div>
//         </form>
//       </aside>
//
//       <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow">
//         <div className="mb-3 flex items-center justify-between">
//           <div className="text-sm text-slate-600">Найдено: <b>{filtered.length}</b></div>
//           <div className="inline-flex items-center gap-2 text-xs text-slate-500">
//             <Clock className="h-4 w-4"/> {busy? 'Обновление…':'Готово'}
//           </div>
//         </div>
//
//         {error && (
//           <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
//             {error}
//           </div>
//         )}
//         <div className="grid gap-3">
//           <AnimatePresence>
//           {filtered.map(t=> (
//             <TripCard key={t.id} trip={t} />
//           ))}
//           </AnimatePresence>
//           {filtered.length===0 && (
//             <div className="grid place-items-center py-16 text-center">
//               <Car className="h-12 w-12 text-emerald-500"/>
//               <div className="mt-3 text-slate-900 font-semibold">Ничего не найдено по условиям</div>
//               <div className="text-sm text-slate-600">Измените фильтры или создайте заказ, мы сматчим офферы</div>
//             </div>
//           )}
//         </div>
//       </section>
//
//       <AnimatePresence>
//         {mapPick && (
//           <MapPicker
//             side={mapPick.side}
//             initial={mapPick.initial}
//             onSelect={(side, point)=>{
//               const label = point.addr || "";
//               setFilters(p=> side==='from' ? { ...p, from: label } : { ...p, to: label });
//               setMapPick(null);
//             }}
//             onClose={()=>setMapPick(null)}
//           />
//         )}
//         {orderOpen && (
//           <OrderModal draft={orderDraft} onChange={setOrderDraft} onClose={()=>setOrderOpen(false)} onSubmit={async()=>{
//             try {
//               const res = await api.createOrder(orderDraft);
//               if(res?.ok){
//                 setOrderOpen(false);
//                 setError(null);
//                 // Optionally reload trips to show new order
//                 loadTrips();
//               }
//             } catch (err) {
//               setError(err.message);
//             }
//           }} onPick={(side)=> setMapPick({ side, initial: side==='from'? { lat: orderDraft?.from_lat, lng: orderDraft?.from_lng, label: orderDraft?.from_addr }: { lat: orderDraft?.to_lat, lng: orderDraft?.to_lng, label: orderDraft?.to_addr } })} />
//         )}
//       </AnimatePresence>
//     </div>
//   );
// }
//
// function Field({ label, children }){ return (
//   <label className="grid gap-1 text-xs text-slate-600">
//     <span className="font-semibold">{label}</span>
//     {children}
//   </label>
// ); }
// function IconBtn({ children, onClick }){ return (
//   <button type="button" onClick={onClick} className="rounded-full border border-slate-200 p-2 text-slate-500 hover:border-emerald-300 hover:text-emerald-600">{children}</button>
// ); }
//
// function TripCard({ trip }){
//   const fromTime = dayjs(trip.departure_at).format('HH:mm');
//   const toTime = dayjs(trip.departure_at).add(trip.eta_sec||0,'s').format('HH:mm');
//   const free = Math.max(0,(trip.seats_total||0)-(trip.seats_taken||0));
//   const operatorName = trip.company? (trip.company.name || 'Компания') : (trip.driver?.name || 'Водитель');
//   return (
//     <motion.article layout initial={{opacity:0, y:8}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-8}}
//       className="rounded-2xl border border-slate-200 p-4 hover:shadow-lg transition shadow-sm">
//       <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
//         <div className="space-y-1">
//           <div className="text-sm text-slate-600 inline-flex items-center gap-2"><Clock className="h-4 w-4 text-emerald-600"/><b className="text-slate-900">{fromTime}</b> <ChevronRight className="h-4 w-4 text-slate-400"/> <b className="text-slate-900">{toTime}</b> <span className="text-xs text-slate-500">{Math.round((trip.eta_sec||0)/60)} мин</span></div>
//           <div className="text-lg font-semibold text-slate-900">{trip.from_addr} → {trip.to_addr}</div>
//           <div className="flex flex-wrap gap-3 text-sm text-slate-600 items-center">
//             <span className="inline-flex items-center gap-1"><Car className="h-4 w-4 text-emerald-600"/>{trip.company? trip.company.name : 'Частный'}</span>
//             <span className="inline-flex items-center gap-1"><UsersIcon className="h-4 w-4 text-emerald-600"/>Свободно: {free} / {trip.seats_total}</span>
//             {(trip.company?.rating || trip.driver?.rating) && <span className="inline-flex items-center gap-1 text-emerald-600"><Star className="h-4 w-4"/>{(trip.company?.rating || trip.driver?.rating).toFixed(1)}</span>}
//           </div>
//           {!!trip.amenities?.length && (
//             <div className="flex flex-wrap gap-2 text-xs text-slate-600">
//               {trip.amenities.map(a=> <span key={a.id} className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5">{a.icon} {a.name}</span>)}
//             </div>
//           )}
//         </div>
//         <div className="text-right">
//           <div className="text-2xl font-semibold text-emerald-700">{fmtAMD(trip.price_amd)} AMD</div>
//           <div className="mt-1 text-xs text-slate-500 inline-flex items-center gap-2 rounded-full border px-2 py-1"><UserRound className="h-4 w-4 text-slate-400"/>{operatorName}</div>
//           <MapThumb trip={trip}/>
//         </div>
//       </div>
//     </motion.article>
//   );
// }
//
// function MapThumb({ trip }){
//   const ref = useRef(null);
//   useEffect(()=>{ let map; (async()=>{
//     const maplibregl = await ensureMapLibre(); if(!maplibregl || !ref.current) return;
//     map = new maplibregl.Map({ container: ref.current, style:{version:8, sources:{osm:{type:'raster',tiles:["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize:256}}, layers:[{id:'osm',type:'raster',source:'osm'}]}, center:[trip.from_lng||44.51, trip.from_lat||40.18], zoom: 8, interactive:false });
//     map.on('load', ()=>{
//       map.addSource('route',{ type:'geojson', data:{ type:'Feature', geometry:{ type:'LineString', coordinates:(trip.route_points||[]).map(p=>[p.lng,p.lat]) }, properties:{} } });
//       map.addLayer({ id:'route-line', type:'line', source:'route', paint:{ 'line-color':'#10b981', 'line-width':3 } });
//     });
//   })();
//   return ()=>{ try{ map?.remove(); }catch{} };
//   }, [trip.id]);
//   return <div ref={ref} className="mt-2 h-28 w-64 rounded-xl border"/>;
// }
//
// function MapPicker({ side, initial, onSelect, onClose }){
//   const mapRef = useRef(null); const markerRef = useRef(null); const containerRef = useRef(null);
//   const [address, setAddress] = useState(initial?.label || "");
//   const [position, setPosition] = useState(initial?.lat && initial?.lng? {lat:initial.lat, lng:initial.lng} : null);
//   useEffect(()=>{ let mounted=true; (async()=>{ const maplibregl = await ensureMapLibre(); if(!mounted||!maplibregl) return;
//     const map = new maplibregl.Map({ container: containerRef.current, style:{version:8, sources:{osm:{type:'raster', tiles:["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize:256}}, layers:[{id:'osm',type:'raster',source:'osm'}]}, center: position? [position.lng, position.lat] : [44.51,40.18], zoom: position? 12:7 });
//     mapRef.current = map; map.addControl(new maplibregl.NavigationControl({showCompass:false}), 'top-right');
//     if(position){ markerRef.current = new maplibregl.Marker({ color:'#10b981'}).setLngLat([position.lng, position.lat]).addTo(map); }
//     map.on('click', async (e)=>{ const { lng, lat } = e.lngLat; setPosition({lat, lng}); if(markerRef.current) markerRef.current.setLngLat([lng,lat]); else markerRef.current = new maplibregl.Marker({ color:'#10b981'}).setLngLat([lng,lat]).addTo(map); const label = await reverseGeocodeNominatim(lng,lat); setAddress(label); });
//   })(); return ()=>{ mounted=false; try{ mapRef.current?.remove(); }catch{} }}, []);
//
//   return (
//     <motion.div className="fixed inset-0 z-[80] grid place-items-center bg-black/40 p-4" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose}>
//       <motion.div className="w-full max-w-3xl overflow-hidden rounded-3xl border bg-white" initial={{y:24,opacity:0}} animate={{y:0,opacity:1}} exit={{y:12,opacity:0}} transition={{type:'spring', stiffness:420, damping:32}} onClick={(e)=>e.stopPropagation()}>
//         <div className="flex items-center justify-between border-b px-4 py-3"><div className="text-sm font-semibold">Выбор на карте · {side==='from'? 'Откуда':'Куда'}</div><button onClick={onClose} className="rounded-full border p-2 text-slate-500">×</button></div>
//         <div ref={containerRef} className="h-[60vh]"/>
//         <div className="flex items-center justify-between gap-3 border-t px-4 py-3 text-sm">
//           <div className="flex-1 truncate text-slate-600">{position? (<>
//             {address || 'Укажите точку на карте'} <span className="ml-2 text-xs text-slate-400">({position.lat?.toFixed(5)}, {position.lng?.toFixed(5)})</span>
//           </>) : 'Кликните по карте'}</div>
//           <div className="flex gap-2">
//             <button onClick={onClose} className="rounded-full border px-4 py-2 text-sm text-slate-600">Отмена</button>
//             <button disabled={!position} onClick={()=> position && onSelect(side, { ...position, addr: address })} className="rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Выбрать</button>
//           </div>
//         </div>
//       </motion.div>
//     </motion.div>
//   );
// }
//
// function OrderModal({ draft, onChange, onClose, onSubmit, onPick }){
//   if(!draft) return null; const update = p=> onChange(prev=>({...prev, ...p}));
//   return (
//     <motion.div className="fixed inset-0 z-[85] grid place-items-center bg-black/40 p-4" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose}>
//       <motion.div className="w-full max-w-2xl overflow-hidden rounded-3xl border bg-white" onClick={e=>e.stopPropagation()} initial={{y:24,opacity:0}} animate={{y:0,opacity:1}} exit={{y:12,opacity:0}} transition={{type:'spring', stiffness:420, damping:32}}>
//         <div className="flex items-center justify-between border-b px-4 py-3"><div className="text-sm font-semibold">Создать order</div><button onClick={onClose} className="rounded-full border p-2 text-slate-500">×</button></div>
//         <div className="grid gap-3 p-4">
//           <Field label="Откуда">
//             <div className="flex gap-2"><input className="flex-1 rounded-xl border px-3 py-2 text-sm" value={draft.from_addr||''} onChange={e=>update({from_addr:e.target.value})}/><button onClick={()=>onPick('from')} className="rounded-xl border px-3 text-sm">Карта</button></div>
//           </Field>
//           <Field label="Куда">
//             <div className="flex gap-2"><input className="flex-1 rounded-xl border px-3 py-2 text-sm" value={draft.to_addr||''} onChange={e=>update({to_addr:e.target.value})}/><button onClick={()=>onPick('to')} className="rounded-xl border px-3 text-sm">Карта</button></div>
//           </Field>
//           <div className="grid grid-cols-2 gap-2">
//             <Field label="Когда с"><input type="datetime-local" className="rounded-xl border px-3 py-2 text-sm" value={draft.when_from? dayjs(draft.when_from).format('YYYY-MM-DDTHH:mm'):''} onChange={e=>update({when_from: e.target.value? dayjs(e.target.value).toISOString(): null})}/></Field>
//             <Field label="Когда до"><input type="datetime-local" className="rounded-xl border px-3 py-2 text-sm" value={draft.when_to? dayjs(draft.when_to).format('YYYY-MM-DDTHH:mm'):''} onChange={e=>update({when_to: e.target.value? dayjs(e.target.value).toISOString(): null})}/></Field>
//           </div>
//           <div className="grid grid-cols-3 gap-2">
//             <Field label="Места"><input type="number" min="1" max="6" className="w-full rounded-xl border px-3 py-2 text-sm" value={draft.seats??1} onChange={e=>update({seats: clamp(Number(e.target.value||1),1,6)})}/></Field>
//             <Field label="Оплата"><select className="w-full rounded-xl border px-3 py-2 text-sm" value={draft.payment||''} onChange={e=>update({payment: e.target.value||null})}><option value="">—</option><option value="cash">cash</option><option value="card">card</option></select></Field>
//             <Field label="Желаемая цена AMD"><input type="number" min="0" className="w-full rounded-xl border px-3 py-2 text-sm" value={draft.desired_price_amd??''} onChange={e=>update({desired_price_amd: e.target.value===''
// ? null: Number(e.target.value)})}/></Field>
//           </div>
//         </div>
//         <div className="flex items-center justify-end gap-2 border-t px-4 py-3"><button onClick={onClose} className="rounded-full border px-4 py-2 text-sm">Отмена</button><button onClick={onSubmit} className="rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white">Создать</button></div>
//       </motion.div>
//     </motion.div>
//   );
// }
//
// /*********************************
//  * OFFERS PAGE (driver side demo)
//  *********************************/
// function OffersPage({ api, initialData }){
//   const [trips, setTrips] = useState(initialData?.trips || []);
//   const [orders, setOrders] = useState(initialData?.orders || []);
//   const [myOffers, setMyOffers] = useState(initialData?.offers || []);
//   const [selected, setSelected] = useState(null);
//   const [price, setPrice] = useState(2000);
//   const [seats, setSeats] = useState(1);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);
//
// // авто-выбор первого рейса после загрузки
//   useEffect(() => {
//     if (!selected?.trip_id && trips.length) {
//       setSelected({ trip_id: trips[0].id });
//     }
//   }, [trips]);
//
//   const loadData = async () => {
//     setLoading(true);
//     setError(null);
//     try {
//       const [tripsData, offersData] = await Promise.all([
//         api.listTrips({}), api.myOffers()
//       ]);
//       setTrips(tripsData); setOrders([]); setMyOffers(offersData);
//     } catch (err) {
//       setError(err.message);
//       console.error('Error loading data:', err);
//     } finally {
//       setLoading(false);
//     }
//   };
// useEffect(() => {
//   if (!selected?.trip_id) { setOrders([]); return; }
//   setLoading(true); setError(null);
//   api.getMatchingOrders(selected.trip_id, {
//     mode: 'auto',        // radius для AB, city для PAX_PAX
//     radius_km: 10,
//     min_seats: 1,
//   }).then(setOrders).catch(e=>setError(e.message)).finally(()=>setLoading(false));
// }, [selected?.trip_id]);
//   const createOffer = async ()=>{
//     if(!selected?.order_id || !selected?.trip_id) {
//       setError('Выберите заказ и рейс');
//       return;
//     }
//     useEffect(()=>{ initCsrf(); },[]);
//     setLoading(true);
//     setError(null);
//     try {
//       const payload = {
//         order_id: selected.order_id,
//         trip_id: selected.trip_id,
//         price_amd: price,
//         seats
//       };
//       const result = await api.createOffer(payload);
//       if(result?.ok) {
//         await loadData(); // Reload offers
//         setSelected(null);
//         setPrice(2000);
//         setSeats(1);
//       }
//     } catch (err) {
//       setError(err.message);
//       console.error('Error creating offer:', err);
//     } finally {
//       setLoading(false);
//     }
//   };
//
//   const handleOfferAction = async (offerId, action) => {
//     setLoading(true);
//     setError(null);
//     try {
//       let result;
//       switch(action) {
//         case 'accept':
//           result = await api.acceptOffer(offerId);
//           break;
//         case 'reject':
//           result = await api.rejectOffer(offerId);
//           break;
//         case 'withdraw':
//           result = await api.withdrawOffer(offerId);
//           break;
//         default:
//           throw new Error('Unknown action');
//       }
//
//       if(result?.ok) {
//         await loadData(); // Reload offers
//       }
//     } catch (err) {
//       setError(err.message);
//       console.error(`Error ${action}ing offer:`, err);
//     } finally {
//       setLoading(false);
//     }
//   };
//
//   return (
//     <div className="grid gap-6 lg:grid-cols-2">
//       <Card title="Сделать оффер" icon={<Building2 className="h-4 w-4"/>}>
//         <div className="grid gap-2">
//           <div className="text-xs text-slate-500">Свяжем заказ ↔️ рейс</div>
//
//           {error && (
//             <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
//               {error}
//             </div>
//           )}
//
//          <Selector
//   label="Заказ"
//   options={orders.map(o=>({
//     id:o.id,
//     label:`#${o.id} · ${(o.from?.addr||o.from_addr||'—')} → ${(o.to?.addr||o.to_addr||'—')}`,
//     value:o.id
//   }))}
//   onPick={id=> setSelected(p=>({ ...(p||{}), order_id:id }))}
// /> {!selected?.trip_id && <div className="text-xs text-slate-500">Сначала выберите рейс</div>}
//
//           <Selector
//             label="Рейс"
//             options={trips.slice(0,20).map(t=>({
//               id:t.id,
//               label:`#${t.id} · ${t.from_addr}→${t.to_addr} · ${fmtAMD(t.price_amd)} AMD`,
//               value:t.id
//             }))}
//             onPick={id=> setSelected(p=>({ ...(p||{}), trip_id:id }))}
//           />
//
//           <div className="grid grid-cols-2 gap-2">
//             <Field label="Цена, AMD">
//               <input
//                 type="number"
//                 min="0"
//                 value={price}
//                 onChange={e=>setPrice(+e.target.value||0)}
//                 className="w-full rounded-xl border px-3 py-2 text-sm"
//                 disabled={loading}
//               />
//             </Field>
//             <Field label="Места">
//               <input
//                 type="number"
//                 min="1"
//                 max="6"
//                 value={seats}
//                 onChange={e=>setSeats(clamp(+e.target.value,1,6))}
//                 className="w-full rounded-xl border px-3 py-2 text-sm"
//                 disabled={loading}
//               />
//             </Field>
//           </div>
//
//           <div className="flex justify-end">
//             <button
//               onClick={createOffer}
//               disabled={loading || !selected?.order_id || !selected?.trip_id}
//               className="rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
//             >
//               {loading ? 'Создание...' : 'Создать оффер'}
//             </button>
//           </div>
//         </div>
//       </Card>
//
//       <Card title="Мои офферы" icon={<MessageSquare className="h-4 w-4"/>}>
//         <div className="divide-y">
//           {myOffers.map(offer=> (
//             <div key={offer.id} className="py-3 text-sm">
//               <div className="flex items-center justify-between mb-2">
//                 <div className="font-medium"># {offer.id}</div>
//                 <div className="text-slate-500">
//                   {fmtAMD(offer.price_amd)} AMD · {offer.seats} места
//                 </div>
//               </div>
//               <div className="text-xs text-slate-600 mb-2">
//                 Trip: {offer.trip_id} · Order: {offer.order_id}
//               </div>
//               <div className="flex items-center justify-between">
//                 <span className={`px-2 py-1 rounded-full text-xs ${
//                   offer.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
//                   offer.status === 'accepted' ? 'bg-green-100 text-green-800' :
//                   offer.status === 'rejected' ? 'bg-red-100 text-red-800' :
//                   'bg-gray-100 text-gray-800'
//                 }`}>
//                   {offer.status}
//                 </span>
//                 <div className="flex gap-1">
//                   {offer.status === 'pending' && (
//                     <>
//                       <button
//                         onClick={()=>handleOfferAction(offer.id, 'withdraw')}
//                         disabled={loading}
//                         className="rounded-full border px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
//                       >
//                         Отозвать
//                       </button>
//                     </>
//                   )}
//                 </div>
//               </div>
//             </div>
//           ))}
//           {myOffers.length===0 && !loading && (
//             <div className="text-sm text-slate-500 text-center py-4">Нет офферов</div>
//           )}
//           {loading && (
//             <div className="text-sm text-slate-500 text-center py-4">Загрузка...</div>
//           )}
//         </div>
//       </Card>
//     </div>
//   );
// }
// function Selector({ label, options, onPick }){ return (
//   <div className="grid gap-1 text-sm">
//     <div className="text-xs text-slate-600 font-semibold">{label}</div>
//     <div className="rounded-xl border p-2 max-h-44 overflow-auto space-y-1">
//       {options.map(o=> (
//         <button key={o.id} onClick={()=>onPick(o.id)} className="w-full text-left rounded-lg px-2 py-1 hover:bg-emerald-50">
//           {o.label}
//         </button>
//       ))}
//       {options.length===0 && <div className="text-xs text-slate-500">Нет данных</div>}
//     </div>
//   </div>
// ); }
//
// /*********************************
//  * GENERIC CARD
//  *********************************/
// function Card({ title, icon, children }){ return (
//   <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow">
//     <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><span className="text-emerald-600">{icon}</span>{title}</div>
//     {children}
//   </div>
// ); }
//
// /*********************************
//  * ROOT COMPONENT
//  *********************************/
// export default function HayWayUltraDemo({ initialData }){
//   const api = useLaravelApi();
//   const [tab, setTab] = useLocal('hayway-tab', 'explore');
//
//   // Use initial data from server if available
//   const [serverData, setServerData] = useState(initialData || {
//     trips: [],
//     orders: [],
//     offers: [],
//     amenities: []
//   });
//
//   return (
//     <AppShell current={tab} onNav={setTab}>
//       {tab==='explore' && <ExplorePage api={api} initialData={serverData} />}
//       {tab==='offers' && <OffersPage api={api} initialData={serverData} />}
//     </AppShell>
//   );
// }
