// // resources/js/Pages/Company/TripsMake.jsx
// import React, { useEffect, useMemo, useState, useRef } from "react";
// import { router, usePage, Link } from "@inertiajs/react";
// import dayjs from "dayjs";
// import CompanyLayout from "./Layout";
//
// /* ===== Theme ===== */
// const brand = {
//     grad: "from-emerald-600 via-teal-600 to-cyan-600",
//     btn: "bg-gradient-to-r from-emerald-600 to-cyan-600",
//     btnHover: "hover:from-emerald-500 hover:to-cyan-500",
//     ring: "focus-visible:ring-emerald-500/50",
//     glass: "bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60",
//     card: "rounded-2xl border border-white/20 bg-white/70 shadow-sm backdrop-blur",
// };
//
// /* ===== Geo/OSRM helpers ===== */
// const NOMI_LANG = "hy,ru,en";
// async function geocodeNominatim(q) {
//     if (!q?.trim()) return null;
//     const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=${encodeURIComponent(
//         NOMI_LANG
//     )}&q=${encodeURIComponent(q)}`;
//     const r = await fetch(url, { headers: { Accept: "application/json" } });
//     if (!r.ok) return null;
//     const d = await r.json();
//     if (!d?.length) return null;
//     return { lng: parseFloat(d[0].lon), lat: parseFloat(d[0].lat), label: d[0].display_name || q };
// }
// async function reverseGeocodeNominatim(lng, lat) {
//     const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&accept-language=${encodeURIComponent(
//         NOMI_LANG
//     )}&lat=${lat}&lon=${lng}&addressdetails=1`;
//     const r = await fetch(url, { headers: { Accept: "application/json" } });
//     if (!r.ok) return "";
//     const d = await r.json();
//     const a = d?.address || {};
//     const parts = [a.road, a.suburb, a.city || a.town || a.village, a.country].filter(Boolean);
//     return parts.join(", ") || d?.display_name || "";
// }
// async function osrmRouteVia(profile, pts) {
//     const way = (pts || []).filter((p) => Number.isFinite(p?.lng) && Number.isFinite(p?.lat));
//     if (way.length < 2) return null;
//     const path = way.map((p) => `${p.lng},${p.lat}`).join(";");
//     const url = `https://router.project-osrm.org/route/v1/${profile}/${path}?overview=full&geometries=geojson&alternatives=false&steps=false`;
//     const r = await fetch(url);
//     if (!r.ok) return null;
//     const d = await r.json();
//     return d?.routes?.[0] || null;
// }
//
// /* ===== Utils ===== */
// const fmtAmd = (n) => {
//     try {
//         return new Intl.NumberFormat("hy-AM").format(n || 0);
//     } catch {
//         return String(n ?? 0);
//     }
// };
// const secToHHMM = (s) => {
//     if (!Number.isFinite(s) || s <= 0) return "—";
//     const h = Math.floor(s / 3600);
//     const m = Math.round((s % 3600) / 60);
//     return h > 0 ? `${h} ժ ${m} ր` : `${m} ր`;
// };
// const nzNum = (v) => {
//     if (v === "" || v === null || typeof v === "undefined") return null;
//     const n = parseFloat(v);
//     return Number.isFinite(n) ? n : null;
// };
// const nzInt = (v) => {
//     if (v === "" || v === null || typeof v === "undefined") return null;
//     const n = parseInt(v, 10);
//     return Number.isFinite(n) ? n : null;
// };
//
// /* ===== Page ===== */
// export default function TripsMake({ company, trips = [], vehicles = [], drivers = [] }) {
//     const { props } = usePage();
//
//     /* ===== Creation form state ===== */
//     const [from, setFrom] = useState({ lat: null, lng: null, addr: "" });
//     const [to, setTo] = useState({ lat: null, lng: null, addr: "" });
//     const [stops, setStops] = useState([]);
//     const [mode, setMode] = useState("from"); // from|to|stop
//
//     const [amenityCats, setAmenityCats] = useState([]);
//     const [amenityModal, setAmenityModal] = useState(false);
//
//     const [form, setForm] = useState(() => {
//         const saved = localStorage.getItem("company_trip_form_v2");
//         const base = saved ? JSON.parse(saved) : {};
//         return {
//             vehicle_id: vehicles[0]?.id || "",
//             assigned_driver_id: drivers[0]?.id || "",
//             from_addr: "",
//             to_addr: "",
//             from_lat: "",
//             from_lng: "",
//             to_lat: "",
//             to_lng: "",
//             departure_at: dayjs().add(2, "hour").format("YYYY-MM-DDTHH:mm"),
//             seats_total: 4,
//             price_amd: 2500,
//             pay_methods: ["cash"],
//             amenities: [],
//             description: "",
//             // TYPES (ровно один true)
//             type_ab_fixed: true,
//             type_pax_to_pax: false,
//             type_pax_to_b: false,
//             type_a_to_pax: false,
//             // TRIP tariffs
//             start_free_km: "",
//             start_amd_per_km: "",
//             start_max_km: "",
//             end_free_km: "",
//             end_amd_per_km: "",
//             end_max_km: "",
//             // stops payload
//             stops: [],
//             ...base,
//         };
//     });
//     useEffect(() => localStorage.setItem("company_trip_form_v2", JSON.stringify(form)), [JSON.stringify(form)]);
//     useEffect(() => {
//         let cancelled = false;
//         (async () => {
//             try {
//                 const r = await fetch(route("amenities.catalog"));
//                 if (!r.ok) return;
//                 const d = await r.json();
//                 if (!cancelled) setAmenityCats(d?.categories || []);
//             } catch {}
//         })();
//         return () => (cancelled = true);
//     }, []);
//     useEffect(() => setForm((s) => ({ ...s, from_addr: from.addr || "" })), [from.addr]);
//     useEffect(() => setForm((s) => ({ ...s, to_addr: to.addr || "" })), [to.addr]);
//     useEffect(() => {
//         setForm((s) => ({ ...s, from_lat: Number.isFinite(from.lat) ? from.lat : "", from_lng: Number.isFinite(from.lng) ? from.lng : "" }));
//     }, [from.lat, from.lng]);
//     useEffect(() => {
//         setForm((s) => ({ ...s, to_lat: Number.isFinite(to.lat) ? to.lat : "", to_lng: Number.isFinite(to.lng) ? to.lng : "" }));
//     }, [to.lat, to.lng]);
//
//     /* ===== Trip types & tariffs ===== */
//     function pickType(key) {
//         const next = { type_ab_fixed: false, type_pax_to_pax: false, type_pax_to_b: false, type_a_to_pax: false };
//         next[key] = true;
//         setForm((d) => ({
//             ...d,
//             ...next,
//             ...(key === "type_pax_to_pax"
//                 ? {
//                     start_free_km: "",
//                     start_amd_per_km: "",
//                     start_max_km: "",
//                     end_free_km: "",
//                     end_amd_per_km: "",
//                     end_max_km: "",
//                 }
//                 : key === "type_pax_to_b"
//                     ? { start_free_km: "", start_amd_per_km: "", start_max_km: "" }
//                     : key === "type_a_to_pax"
//                         ? { end_free_km: "", end_amd_per_km: "", end_max_km: "" }
//                         : {}),
//         }));
//     }
//     const showStartTariff = form.type_ab_fixed || form.type_a_to_pax;
//     const showEndTariff = form.type_ab_fixed || form.type_pax_to_b;
//     const allowStopTariffs = true;
//
//     /* ===== Stops -> payload ===== */
//     useEffect(() => {
//         const prepared = (stops || [])
//             .slice(0, 10)
//             .map((s, idx) => ({
//                 name: s.name || null,
//                 addr: s.addr || null,
//                 lat: s.lat,
//                 lng: s.lng,
//                 position: idx + 1,
//                 ...(allowStopTariffs
//                     ? { free_km: nzNum(s.free_km), amd_per_km: nzInt(s.amd_per_km), max_km: nzNum(s.max_km) }
//                     : {}),
//             }));
//         setForm((f) => ({ ...f, stops: prepared }));
//         // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, [JSON.stringify(stops), allowStopTariffs]);
//
//     /* ===== OSRM preview ===== */
//     const routePts = useMemo(() => {
//         const pts = [];
//         if (Number.isFinite(from.lng) && Number.isFinite(from.lat)) pts.push({ lng: from.lng, lat: from.lat });
//         (stops || []).forEach((s) => Number.isFinite(s.lng) && Number.isFinite(s.lat) && pts.push({ lng: s.lng, lat: s.lat }));
//         if (Number.isFinite(to.lng) && Number.isFinite(to.lat)) pts.push({ lng: to.lng, lat: to.lat });
//         return pts;
//     }, [from?.lng, from?.lat, to?.lng, to?.lat, JSON.stringify(stops)]);
//     const [osrm, setOsrm] = useState({ km: 0, sec: 0, coords: [] });
//     useEffect(() => {
//         let cancelled = false;
//         (async () => {
//             if (routePts.length < 2) {
//                 if (!cancelled) setOsrm({ km: 0, sec: 0, coords: [] });
//                 return;
//             }
//             const r = await osrmRouteVia("driving", routePts);
//             if (!r) {
//                 if (!cancelled) setOsrm({ km: 0, sec: 0, coords: routePts.map((p) => ({ lat: p.lat, lng: p.lng })) });
//                 return;
//             }
//             const km = (r.distance || 0) / 1000;
//             const sec = r.duration || 0;
//             const coords = (r.geometry?.coordinates || []).map(([lng, lat]) => ({ lat, lng }));
//             if (!cancelled) setOsrm({ km, sec, coords });
//         })();
//         return () => (cancelled = true);
//     }, [JSON.stringify(routePts)]);
//
//     const coordsReady =
//         Number.isFinite(Number(form.from_lat)) &&
//         Number.isFinite(Number(form.from_lng)) &&
//         Number.isFinite(Number(form.to_lat)) &&
//         Number.isFinite(Number(form.to_lng));
//
//     /* ===== Price helper ===== */
//     const [tariffPerKm, setTariffPerKm] = useState(200);
//     const suggestedPrice = useMemo(() => Math.round(Math.max(0, osrm.km) * tariffPerKm), [osrm.km, tariffPerKm]);
//
//     /* ===== Actions ===== */
//     function submitCreate(e, publish = false) {
//         e.preventDefault();
//         if (!coordsReady) return alert("Քարտեզի վրա ընտրեք սկիզբ և վերջ (երկու նշան)");
//         const payload = {
//             ...form,
//             vehicle_id: String(form.vehicle_id || ""),
//             assigned_driver_id: String(form.assigned_driver_id || ""),
//             price_amd: Number(form.price_amd) || 0,
//             seats_total: Number(form.seats_total) || 1,
//             from_lat: Number(form.from_lat),
//             from_lng: Number(form.from_lng),
//             to_lat: Number(form.to_lat),
//             to_lng: Number(form.to_lng),
//             amenities: form.amenities || [],
//             stops: form.stops || [],
//             pay_methods: form.pay_methods || ["cash"],
//             description: form.description || "",
//         };
//         router.post(
//             publish ? route("company.trips.store_publish", company.id) : route("company.trips.store", company.id),
//             payload,
//             { preserveScroll: true }
//         );
//     }
//
//     /* ===== Filters/list ===== */
//     const [q, setQ] = useState("");
//     const [status, setStatus] = useState("all"); // all|draft|published|archived
//     const filtered = useMemo(() => {
//         return (trips || []).filter((t) => {
//             const matchQ =
//                 !q ||
//                 t?.from_addr?.toLowerCase()?.includes(q.toLowerCase()) ||
//                 t?.to_addr?.toLowerCase()?.includes(q.toLowerCase()) ||
//                 t?.vehicle?.plate?.toLowerCase()?.includes(q.toLowerCase());
//             const matchS = status === "all" || t.status === status;
//             return matchQ && matchS;
//         });
//     }, [q, status, JSON.stringify(trips)]);
//
//     /* ===== Amenity helpers ===== */
//     function selectedAmenityNames(categories, ids) {
//         const all = [];
//         (categories || []).forEach((c) => (c.amenities || []).forEach((a) => all.push(a)));
//         const map = Object.fromEntries(all.map((a) => [a.id, a.name]));
//         return (ids || []).map((id) => map[id]).filter(Boolean);
//     }
//     const names = selectedAmenityNames(amenityCats, form.amenities).slice(0, 4);
//     const namesMore = Math.max(0, (form.amenities?.length || 0) - names.length);
//
//     return (
//         <CompanyLayout
//             company={{ id: company.id, name: company.name, logo: company.logo_path ? `/storage/${company.logo_path}` : null }}
//             current="trips_make"
//         >
//             {/* Header */}
//             <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
//                 <div>
//                     <h1 className="text-2xl font-bold text-emerald-800">Երթուղիներ (Company)</h1>
//                     <div className="text-sm text-slate-600">
//                         Ընդամենը՝ <b>{trips.length}</b>
//                     </div>
//                 </div>
//                 <div className="flex flex-wrap items-center gap-2">
//                     <input
//                         value={q}
//                         onChange={(e) => setQ(e.target.value)}
//                         placeholder="Որոնում․ հասցե/պլետ"
//                         className="rounded-xl border border-white/30 bg-white/80 px-3 py-2 text-sm outline-none focus:border-emerald-400"
//                     />
//                     <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border bg-white/80 px-3 py-2 text-sm">
//                         <option value="all">Բոլորը</option>
//                         <option value="draft">Սևագիր</option>
//                         <option value="published">Հրապարակված</option>
//                         <option value="archived">Արխիվ</option>
//                     </select>
//                     <Link
//                         href={route("company.trips.index", company.id)}
//                         className="rounded-xl border px-3 py-2 text-sm hover:bg-white/70"
//                     >
//                         Բացել լիստինգը
//                     </Link>
//                 </div>
//             </div>
//
//             {/* CREATE FORM */}
//             <section className={`mb-6 grid gap-4 lg:grid-cols-2 ${brand.card} p-4`}>
//                 <form className="space-y-3">
//                     <div className="grid grid-cols-2 gap-3">
//                         <Select
//                             label="Մեքենա"
//                             value={form.vehicle_id}
//                             onChange={(v) => setForm((s) => ({ ...s, vehicle_id: v }))}
//                             options={(vehicles || []).map((v) => ({ v: v.id, t: `${v.brand} ${v.model} · ${v.plate ?? "—"}` }))}
//                         />
//                         <Select
//                             label="Վարորդ"
//                             value={form.assigned_driver_id}
//                             onChange={(v) => setForm((s) => ({ ...s, assigned_driver_id: v }))}
//                             options={(drivers || []).map((d) => ({ v: d.id, t: d.name }))}
//                         />
//                     </div>
//
//                     {/* Types */}
//                     <div className="rounded-xl border p-3">
//                         <div className="mb-2 text-sm font-semibold text-slate-900">Տիպ (rovno odin true)</div>
//                         <div className="grid gap-2 sm:grid-cols-2">
//                             <TypeBtn active={form.type_ab_fixed} onClick={() => pickType("type_ab_fixed")} title="A → B (ֆիքս)" desc="Սկիզբ և վերջ ֆիքս" />
//                             <TypeBtn active={form.type_pax_to_pax} onClick={() => pickType("type_pax_to_pax")} title="PAX → PAX" desc="Սկիզբ/վերջ ըստ ուղևորների" />
//                             <TypeBtn active={form.type_pax_to_b} onClick={() => pickType("type_pax_to_b")} title="PAX → B (ֆիքս վերջ)" desc="Սկիզբը ազատ կորիդոր" />
//                             <TypeBtn active={form.type_a_to_pax} onClick={() => pickType("type_a_to_pax")} title="A (ֆիքս) → PAX" desc="Վերջը ըստ ուղևորների" />
//                         </div>
//                         <div className="mt-2 text-[11px] text-slate-500">PAX→PAX — trip-տարિફներ անջատված. Stop-տարിഫներ՝ թույլատր. ✓</div>
//                     </div>
//
//                     {/* From/To */}
//                     <div className="grid grid-cols-2 gap-3">
//                         <Input label="Սկիզբ (հասցե)" value={from.addr} onChange={(v) => setFrom((p) => ({ ...p, addr: v }))} />
//                         <Input label="Վերջ (հասցե)" value={to.addr} onChange={(v) => setTo((p) => ({ ...p, addr: v }))} />
//                     </div>
//                     <div className="flex flex-wrap gap-2">
//                         <button
//                             type="button"
//                             onClick={async () => {
//                                 const g = await geocodeNominatim(from.addr);
//                                 if (!g) return alert("Չի գտնվել սկիզբ");
//                                 setFrom({ lat: g.lat, lng: g.lng, addr: g.label });
//                                 setMode("to");
//                             }}
//                             className="rounded-lg border bg-white px-3 py-1.5 text-sm hover:bg-slate-100"
//                         >
//                             Գտնել սկիզբ
//                         </button>
//                         <button
//                             type="button"
//                             onClick={async () => {
//                                 const g = await geocodeNominatim(to.addr);
//                                 if (!g) return alert("Չի գտնվել վերջ");
//                                 setTo({ lat: g.lat, lng: g.lng, addr: g.label });
//                                 setMode("stop");
//                             }}
//                             className="rounded-lg border bg-white px-3 py-1.5 text-sm hover:bg-slate-100"
//                         >
//                             Գտնել վերջ
//                         </button>
//                         <button type="button" onClick={() => setMode("stop")} className="rounded-lg border bg-white px-3 py-1.5 text-sm hover:bg-slate-100">
//                             Ավելացնել կանգառներ (քարտեզից)
//                         </button>
//                     </div>
//
//                     {/* Schedule / price / seats / pay */}
//                     <div className="grid grid-cols-2 gap-3">
//                         <Input type="datetime-local" label="Մեկնման ժամանակ" value={form.departure_at} onChange={(v) => setForm((s) => ({ ...s, departure_at: v }))} />
//                         <Input type="number" label="Տեղերի թիվ" value={form.seats_total} onChange={(v) => setForm((s) => ({ ...s, seats_total: Number(v) || 1 }))} />
//                     </div>
//                     <div className="grid grid-cols-2 gap-3">
//                         <Input type="number" label="Գին (AMD մեկ նստատեղ)" value={form.price_amd} onChange={(v) => setForm((s) => ({ ...s, price_amd: Number(v) || 0 }))} />
//                         <PayMethods value={form.pay_methods} onChange={(arr) => setForm((s) => ({ ...s, pay_methods: arr }))} />
//                     </div>
//
//                     {/* Trip tariffs */}
//                     <div className="grid gap-3 lg:grid-cols-2">
//                         {showStartTariff ? (
//                             <TariffCard
//                                 title="Տարിഫ — Սկիզբ A"
//                                 values={{ free_km: form.start_free_km, amd_per_km: form.start_amd_per_km, max_km: form.start_max_km }}
//                                 setValues={(v) => setForm((s) => ({ ...s, start_free_km: v.free_km, start_amd_per_km: v.amd_per_km, start_max_km: v.max_km }))}
//                             />
//                         ) : (
//                             <DisabledCard text="Սկզբի տարածքը չի մոնետիզացվում" />
//                         )}
//                         {showEndTariff ? (
//                             <TariffCard
//                                 title="Տարിഫ — Վերջ B"
//                                 values={{ free_km: form.end_free_km, amd_per_km: form.end_amd_per_km, max_km: form.end_max_km }}
//                                 setValues={(v) => setForm((s) => ({ ...s, end_free_km: v.free_km, end_amd_per_km: v.amd_per_km, end_max_km: v.max_km }))}
//                             />
//                         ) : (
//                             <DisabledCard text="Վերջի տարածքը չի մոնետիզացվում" />
//                         )}
//                     </div>
//
//                     {/* Description */}
//                     <label className="block text-sm">
//                         <div className="mb-1 text-slate-700">Նկարագրություն (ըստ ցանկության)</div>
//                         <textarea
//                             rows={3}
//                             className="w-full rounded-xl border px-3 py-2 outline-none focus:border-emerald-400"
//                             placeholder="Օգտակար ինֆո՝ ուղևորության մանրամասներ"
//                             value={form.description || ""}
//                             onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
//                         />
//                     </label>
//
//                     {/* Amenities */}
//                     <div className="rounded-xl border p-3">
//                         <div className="mb-2 flex items-center justify-between">
//                             <div className="text-sm font-medium text-slate-700">Հարմարություններ</div>
//                             <button
//                                 type="button"
//                                 onClick={() => setAmenityModal(true)}
//                                 className={`rounded-lg px-3 py-1.5 text-sm font-semibold text-white ${brand.btn} ${brand.btnHover}`}
//                             >
//                                 Ընտրել
//                             </button>
//                         </div>
//                         {form.amenities?.length ? (
//                             <div className="flex flex-wrap gap-2">
//                                 {names.map((n, i) => (
//                                     <span key={i} className="rounded-lg bg-emerald-50 px-2 py-1 text-xs text-emerald-700 ring-1 ring-emerald-200">
//                     {n}
//                   </span>
//                                 ))}
//                                 {namesMore > 0 && <span className="text-xs text-slate-500">+{namesMore}</span>}
//                             </div>
//                         ) : (
//                             <div className="text-xs text-slate-500">Չկա ընտրված</div>
//                         )}
//                     </div>
//
//                     {/* OSRM preview + suggested price */}
//                     <div className="rounded-xl border p-3 text-sm text-slate-700">
//                         <div className="mb-2 font-medium">Վերահաշվարկ</div>
//                         <div className="grid grid-cols-3 gap-3">
//                             <div>Հեռավորություն՝ <b>{osrm.km ? osrm.km.toFixed(1) : "—"} կմ</b></div>
//                             <div>Ժամանակ՝ <b>{secToHHMM(osrm.sec)}</b></div>
//                             <div className="flex items-center gap-2">
//                                 <span>Սակագին՝</span>
//                                 <input type="number" value={tariffPerKm} onChange={(e) => setTariffPerKm(Number(e.target.value) || 0)} className="w-24 rounded-lg border px-2 py-1 text-right" />
//                                 <span>AMD/կմ</span>
//                             </div>
//                         </div>
//                         <div className="mt-2">
//                             Առաջարկվող գին ≈ <b>{fmtAmd(suggestedPrice)} AMD</b>{" "}
//                             <button type="button" onClick={() => setForm((s) => ({ ...s, price_amd: suggestedPrice }))} className="rounded border px-2 py-0.5 text-xs hover:bg-slate-50">
//                                 Դնել որպես գին
//                             </button>
//                         </div>
//                     </div>
//
//                     {/* Actions */}
//                     <div className="grid grid-cols-2 gap-2">
//                         <button
//                             onClick={(e) => submitCreate(e, false)}
//                             disabled={!coordsReady}
//                             className={`rounded-xl px-4 py-2 font-semibold text-white ${brand.btn} ${brand.btnHover}`}
//                         >
//                             Ստեղծել (սևագիր)
//                         </button>
//                         <button
//                             onClick={(e) => submitCreate(e, true)}
//                             disabled={!coordsReady}
//                             className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 font-semibold text-emerald-700 hover:bg-emerald-100"
//                         >
//                             Ստեղծել և հրապարակել
//                         </button>
//                     </div>
//                 </form>
//
//                 {/* RIGHT: map + stops */}
//                 <div className="space-y-3">
//                     <ToggleMode mode={mode} setMode={setMode} />
//                     <div className="h-80 overflow-hidden rounded-2xl border shadow">
//                         <TripMap
//                             from={from}
//                             to={to}
//                             stops={stops}
//                             setFrom={setFrom}
//                             setTo={setTo}
//                             setStops={setStops}
//                             mode={mode}
//                             setMode={setMode}
//                             routeCoords={osrm.coords}
//                         />
//                     </div>
//                     <StopsEditor stops={stops} setStops={setStops} allowTariffs={allowStopTariffs} />
//                 </div>
//             </section>
//
//             {/* LIST */}
//             <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
//                 {filtered.map((t) => (
//                     <TripCard key={t.id} company={company} t={t} />
//                 ))}
//                 {filtered.length === 0 && (
//                     <div className="md:col-span-2 rounded-2xl border bg-white p-6 text-center text-slate-500">Դատարկ է</div>
//                 )}
//             </section>
//
//             {/* Amenity modal for create form */}
//             {amenityModal && (
//                 <AmenityPickerModal
//                     categories={amenityCats}
//                     initialSelected={form.amenities || []}
//                     onClose={() => setAmenityModal(false)}
//                     onSave={(ids) => {
//                         setForm((s) => ({ ...s, amenities: ids }));
//                         setAmenityModal(false);
//                     }}
//                 />
//             )}
//         </CompanyLayout>
//     );
// }
//
// /* ===== Trip Card ===== */
// function TripCard({ company, t }) {
//     const seatsLeft = Math.max(0, (t.seats_total ?? 0) - (t.seats_taken ?? 0));
//     const canPublish = t.status === "draft" && seatsLeft > 0;
//
//     const [amenityModal, setAmenityModal] = useState(false);
//     const [stopsModal, setStopsModal] = useState(false);
//
//     const badgeCls =
//         t.status === "published"
//             ? "bg-emerald-100 text-emerald-700"
//             : t.status === "draft"
//                 ? "bg-amber-100 text-amber-700"
//                 : t.status === "archived"
//                     ? "bg-slate-100 text-slate-700"
//                     : "bg-rose-100 text-rose-700";
//
//     const publish = () => router.post(route("company.trips.publish", [company.id, t.id]), {}, { preserveScroll: true });
//     const archive = () => router.post(route("company.trips.archive", [company.id, t.id]), {}, { preserveScroll: true });
//     const unarchive = () => router.post(route("company.trips.unarchive", [company.id, t.id]), {}, { preserveScroll: true });
//
//     return (
//         <div className="rounded-2xl border bg-white p-4">
//             <div className="text-sm text-slate-600">
//                 {t.vehicle?.brand} {t.vehicle?.model} · {t.vehicle?.plate ?? "—"}
//             </div>
//             <div className="mt-1 font-semibold">
//                 {t.from_addr} → {t.to_addr}
//             </div>
//             <div className="text-sm text-slate-700">Վարորդ՝ {t.assigned_driver?.name ?? "—"}</div>
//             <div className="text-sm text-slate-700">Գին՝ {fmtAmd(t.price_amd)} AMD</div>
//             <div className="text-sm text-slate-700">Տեղեր՝ {t.seats_taken ?? 0}/{t.seats_total ?? 0}</div>
//             <div className="text-sm text-slate-700">
//                 Մեկնում՝ {t.departure_at ? dayjs(t.departure_at).format("YYYY-MM-DD HH:mm") : "—"}
//             </div>
//
//             <div className="mt-2 flex flex-wrap items-center gap-2">
//                 <span className={`text-xs px-2 py-1 rounded ${badgeCls}`}>{t.status}</span>
//                 <span className="text-xs text-slate-600">
//           Pending՝ {t.pending_requests_count ?? 0} · Accepted՝ {t.accepted_requests_count ?? 0}
//         </span>
//             </div>
//
//             <div className="mt-3 flex flex-wrap gap-2">
//                 {canPublish && (
//                     <button onClick={publish} className="rounded border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-emerald-700 hover:bg-emerald-100">
//                         Publish
//                     </button>
//                 )}
//                 {t.status !== "archived" && (
//                     <button onClick={archive} className={`rounded px-3 py-1.5 text-white ${brand.btn} ${brand.btnHover}`}>
//                         Archive
//                     </button>
//                 )}
//                 {t.status === "archived" && (
//                     <button onClick={unarchive} className="rounded bg-slate-200 px-3 py-1.5 text-slate-900">
//                         Unarchive
//                     </button>
//                 )}
//                 <Link href={route("company.trips.show", [company.id, t.id])} className="rounded border px-3 py-1.5 hover:bg-slate-50">
//                     Բացել
//                 </Link>
//
//                 <button onClick={() => setAmenityModal(true)} className="rounded border px-3 py-1.5 hover:bg-slate-50">
//                     Ուдобства
//                 </button>
//                 <button onClick={() => setStopsModal(true)} className="rounded border px-3 py-1.5 hover:bg-slate-50">
//                     Կանգառներ
//                 </button>
//             </div>
//
//             {amenityModal && <TripAmenityModal company={company} tripId={t.id} onClose={() => setAmenityModal(false)} />}
//             {stopsModal && <TripStopsReplaceModal company={company} tripId={t.id} onClose={() => setStopsModal(false)} />}
//         </div>
//     );
// }
//
// /* ===== Trip Amenity Modal (existing trip) ===== */
// function TripAmenityModal({ company, tripId, onClose }) {
//     const [loading, setLoading] = useState(true);
//     const [cats, setCats] = useState([]);
//     const [selected, setSelected] = useState([]);
//
//     useEffect(() => {
//         let cancelled = false;
//         (async () => {
//             try {
//                 const url = route("company.trips.amenities.show", [company.id, tripId]);
//                 const r = await fetch(url, { headers: { Accept: "application/json" } });
//                 if (!r.ok) return;
//                 const d = await r.json();
//                 if (cancelled) return;
//                 setSelected(d?.selected_ids || []);
//                 setCats(d?.categories || []);
//                 setLoading(false);
//             } catch {}
//         })();
//         return () => (cancelled = true);
//     }, [company.id, tripId]);
//
//     const toggle = (id) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
//     const save = () => {
//         router.post(
//             route("company.trips.amenities.update", [company.id, tripId]),
//             { amenities: selected },
//             { preserveScroll: true, onSuccess: onClose }
//         );
//     };
//
//     return (
//         <Modal title="Հարմարություններ (երթուղի)" onClose={onClose}>
//             {loading ? (
//                 <div className="p-4 text-sm text-slate-600">Բեռնվում է…</div>
//             ) : (
//                 <div className="max-h-[60vh] space-y-4 overflow-y-auto p-4">
//                     {cats.map((cat) => (
//                         <div key={cat.id} className="rounded-xl border p-3">
//                             <div className="mb-2 text-sm font-medium text-slate-900">{cat.name}</div>
//                             <div className="flex flex-wrap gap-3">
//                                 {(cat.amenities || []).map((a) => (
//                                     <label key={a.id} className="inline-flex items-center gap-2 text-sm">
//                                         <input type="checkbox" checked={selected.includes(a.id)} onChange={() => toggle(a.id)} />
//                                         {a.name}
//                                     </label>
//                                 ))}
//                             </div>
//                         </div>
//                     ))}
//                 </div>
//             )}
//             <div className="flex items-center justify-end gap-2 border-t p-3">
//                 <button onClick={onClose} className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50">
//                     Չեղարկել
//                 </button>
//                 <button onClick={save} className={`rounded px-3 py-1.5 text-sm font-semibold text-white ${brand.btn} ${brand.btnHover}`}>
//                     Պահպանել
//                 </button>
//             </div>
//         </Modal>
//     );
// }
//
// /* ===== Trip Stops Replace Modal (with stop tariffs) ===== */
// function TripStopsReplaceModal({ company, tripId, onClose }) {
//     const [stops, setStops] = useState([]);
//     const [mode, setMode] = useState("stop");
//     const [from, setFrom] = useState({ lat: null, lng: null });
//     const [to, setTo] = useState({ lat: null, lng: null });
//
//     // Optionally fetch existing stops:
//     useEffect(() => {
//         let cancelled = false;
//         (async () => {
//             try {
//                 const r = await fetch(route("company.trips.show", [company.id, tripId]), { headers: { Accept: "application/json" } });
//                 if (!r.ok) return;
//                 const d = await r.json();
//                 if (cancelled) return;
//                 const arr = (d?.data?.stops || d?.trip?.stops || []).map((s) => ({
//                     name: s.name || "",
//                     addr: s.addr || "",
//                     lat: s.lat,
//                     lng: s.lng,
//                     free_km: s.free_km ?? "",
//                     amd_per_km: s.amd_per_km ?? "",
//                     max_km: s.max_km ?? "",
//                 }));
//                 if (arr.length) setStops(arr);
//             } catch {}
//         })();
//         return () => (cancelled = true);
//     }, [company.id, tripId]);
//
//     const submit = () => {
//         const prepared = (stops || []).slice(0, 10).map((s, i) => ({
//             position: i + 1,
//             name: s.name || null,
//             addr: s.addr || null,
//             lat: s.lat,
//             lng: s.lng,
//             free_km: nzNum(s.free_km),
//             amd_per_km: nzInt(s.amd_per_km),
//             max_km: nzNum(s.max_km),
//         }));
//         router.post(
//             route("company.trips.stops.replace", [company.id, tripId]),
//             { stops: prepared },
//             { preserveScroll: true, onSuccess: onClose }
//         );
//     };
//
//     return (
//         <Modal title="Փոխարինել կանգառների ցանկը (մինչև 10)" onClose={onClose} wide>
//             <div className="grid gap-3 md:grid-cols-2 p-3">
//                 <div className="space-y-3">
//                     <div className="rounded-xl border p-3">
//                         <div className="mb-2 text-sm font-medium text-slate-900">Քարտեզի ռեժիմ՝</div>
//                         <div className="flex overflow-hidden rounded-xl border">
//                             {["stop"].map((k) => (
//                                 <button key={k} type="button" onClick={() => setMode(k)} className={`px-3 py-1.5 ${mode === k ? "bg-emerald-600 text-white" : "bg-white hover:bg-slate-50"}`}>
//                                     Կանգառ
//                                 </button>
//                             ))}
//                         </div>
//                     </div>
//                     <div className="h-72 overflow-hidden rounded-2xl border shadow">
//                         <TripMap from={from} to={to} stops={stops} setFrom={setFrom} setTo={setTo} setStops={setStops} mode={mode} setMode={setMode} />
//                     </div>
//                 </div>
//                 <div>
//                     <StopsEditor stops={stops} setStops={setStops} allowTariffs />
//                     <div className="mt-3 flex justify-end gap-2">
//                         <button onClick={onClose} className="rounded border px-3 py-1.5 hover:bg-slate-50">
//                             Չեղարկել
//                         </button>
//                         <button onClick={submit} className={`rounded px-3 py-1.5 font-semibold text-white ${brand.btn} ${brand.btnHover}`}>
//                             Պահպանել
//                         </button>
//                     </div>
//                 </div>
//             </div>
//         </Modal>
//     );
// }
//
// /* ===== Map (Leaflet) ===== */
// import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from "react-leaflet";
// import L from "leaflet";
// import "leaflet/dist/leaflet.css";
//
// const DefaultIcon = L.icon({
//     iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
//     iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
//     shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
//     iconSize: [25, 41],
//     iconAnchor: [12, 41],
//     shadowSize: [41, 41],
// });
// L.Marker.prototype.options.icon = DefaultIcon;
//
// function mkDivIcon(color, label = null) {
//     const html = `
//     <div style="position:relative;width:14px;height:14px;border-radius:50%;
//                 box-shadow:0 0 0 2px #fff,0 0 0 4px ${color};background:${color};"></div>
//     ${
//         label !== null
//             ? `<div style="position:absolute;left:50%;top:0;transform:translate(-50%,-140%);font:600 11px/1 system-ui;padding:2px 6px;border-radius:8px;background:#fff;color:#065f46;border:1px solid rgba(5,150,105,.35);box-shadow:0 1px 2px rgba(0,0,0,.06)">${label}</div>`
//             : ""
//     }
//   `;
//     return L.divIcon({ html, className: "", iconSize: [14, 14], iconAnchor: [7, 7] });
// }
// function FitTo({ pts, routeCoords }) {
//     const map = useMap();
//     useEffect(() => {
//         const coords = routeCoords?.length ? routeCoords.map((p) => [p.lat, p.lng]) : pts.map((p) => [p.lat, p.lng]);
//         if (!coords.length) return;
//         const b = L.latLngBounds(coords);
//         map.fitBounds(b.pad(0.2));
//     }, [map, JSON.stringify(pts), routeCoords?.length]);
//     return null;
// }
// function toPts(from, stops, to) {
//     const pts = [];
//     if (Number.isFinite(from?.lng) && Number.isFinite(from?.lat)) pts.push({ lng: from.lng, lat: from.lat });
//     (stops || []).forEach((s) => {
//         if (Number.isFinite(s.lng) && Number.isFinite(s.lat)) pts.push({ lng: s.lng, lat: s.lat });
//     });
//     if (Number.isFinite(to?.lng) && Number.isFinite(to?.lat)) pts.push({ lng: to.lng, lat: to.lat });
//     return pts;
// }
// function ClickCapture({ mode, setMode, setFrom, setTo, setStops }) {
//     useMapEvents({
//         click: async (e) => {
//             const p = { lng: e.latlng.lng, lat: e.latlng.lat };
//             if (mode === "from") {
//                 setFrom((f) => ({ ...f, ...p }));
//                 const label = await reverseGeocodeNominatim(p.lng, p.lat);
//                 setFrom((f) => ({ ...f, addr: label || f.addr }));
//                 setMode("to");
//             } else if (mode === "to") {
//                 setTo((t) => ({ ...t, ...p }));
//                 const label = await reverseGeocodeNominatim(p.lng, p.lat);
//                 setTo((t) => ({ ...t, addr: label || t.addr }));
//                 setMode("stop");
//             } else {
//                 const label = await reverseGeocodeNominatim(p.lng, p.lat);
//                 setStops((arr) => [...arr, { ...p, addr: label, name: "", free_km: "", amd_per_km: "", max_km: "" }].slice(0, 10));
//             }
//         },
//     });
//     return null;
// }
// function ToggleMode({ mode, setMode }) {
//     return (
//         <div className="flex items-center gap-2 text-sm text-slate-700">
//             <span className="opacity-70">Քարտեզի ռեժիմ՝</span>
//             <div className="flex overflow-hidden rounded-xl border">
//                 {["from", "to", "stop"].map((k) => (
//                     <button
//                         key={k}
//                         type="button"
//                         onClick={() => setMode(k)}
//                         className={`px-3 py-1.5 ${mode === k ? "bg-gradient-to-r from-emerald-600 to-cyan-600 text-white" : "bg-white hover:bg-slate-100"}`}
//                     >
//                         {k === "from" ? "Սկիզբ" : k === "to" ? "Վերջ" : "Կանգառ"}
//                     </button>
//                 ))}
//             </div>
//         </div>
//     );
// }
// function TripMap({ from, to, stops, setFrom, setTo, setStops, mode, setMode, routeCoords = [] }) {
//     const pts = useMemo(() => toPts(from, stops, to), [from?.lng, from?.lat, to?.lng, to?.lat, JSON.stringify(stops)]);
//     return (
//         <MapContainer center={[40.1792, 44.4991]} zoom={8} className="h-full w-full">
//             <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
//             <ClickCapture mode={mode} setMode={setMode} setFrom={setFrom} setTo={setTo} setStops={setStops} />
//             {routeCoords?.length > 1 && <Polyline positions={routeCoords.map((p) => [p.lat, p.lng])} weight={6} />}
//             {!routeCoords?.length && pts.length > 1 && <Polyline positions={pts.map((p) => [p.lat, p.lng])} weight={4} />}
//
//             {Number.isFinite(from?.lng) && Number.isFinite(from?.lat) && (
//                 <Marker
//                     position={[from.lat, from.lng]}
//                     draggable
//                     icon={mkDivIcon("#16a34a", "Սկիզբ")}
//                     eventHandlers={{
//                         dragend: async (e) => {
//                             const { lat, lng } = e.target.getLatLng();
//                             setFrom((f) => ({ ...f, lat, lng }));
//                             const label = await reverseGeocodeNominatim(lng, lat);
//                             setFrom((f) => ({ ...f, addr: label || f.addr }));
//                         },
//                     }}
//                 />
//             )}
//
//             {(stops || []).map((s, i) =>
//                 Number.isFinite(s.lng) && Number.isFinite(s.lat) ? (
//                     <Marker
//                         key={i}
//                         position={[s.lat, s.lng]}
//                         draggable
//                         icon={mkDivIcon("#22c55e", String(i + 1))}
//                         eventHandlers={{
//                             dragend: async (e) => {
//                                 const { lat, lng } = e.target.getLatLng();
//                                 setStops((arr) => arr.map((x, idx) => (idx === i ? { ...x, lat, lng } : x)));
//                                 const label = await reverseGeocodeNominatim(lng, lat);
//                                 setStops((arr) => arr.map((x, idx) => (idx === i ? { ...x, addr: label || x.addr } : x)));
//                             },
//                         }}
//                     />
//                 ) : null
//             )}
//
//             {Number.isFinite(to?.lng) && Number.isFinite(to?.lat) && (
//                 <Marker
//                     position={[to.lat, to.lng]}
//                     draggable
//                     icon={mkDivIcon("#ef4444", "Վերջ")}
//                     eventHandlers={{
//                         dragend: async (e) => {
//                             const { lat, lng } = e.target.getLatLng();
//                             setTo((tt) => ({ ...tt, lat, lng }));
//                             const label = await reverseGeocodeNominatim(lng, lat);
//                             setTo((tt) => ({ ...tt, addr: label || tt.addr }));
//                         },
//                     }}
//                 />
//             )}
//
//             <FitTo pts={pts} routeCoords={routeCoords} />
//         </MapContainer>
//     );
// }
//
// /* ===== Stops Editor ===== */
// function StopsEditor({ stops, setStops, allowTariffs = false }) {
//     const move = (i, dir) => {
//         const j = i + dir;
//         if (j < 0 || j >= stops.length) return;
//         const arr = stops.slice();
//         [arr[i], arr[j]] = [arr[j], arr[i]];
//         setStops(arr);
//     };
//     const del = (i) => setStops(stops.filter((_, idx) => idx !== i));
//     const edit = (i, patch) => setStops(stops.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
//
//     return (
//         <div className="rounded-xl border p-3">
//             <div className="mb-2 flex items-center justify-between">
//                 <div className="text-sm font-medium text-slate-900">
//                     Կանգառներ (մինչև 10){allowTariffs ? " · Տեղային տարկղ" : ""}
//                 </div>
//                 {stops.length > 0 && (
//                     <button type="button" onClick={() => setStops([])} className="rounded bg-emerald-600 px-2 py-1 text-xs text-white">
//                         Մաքրել բոլորը
//                     </button>
//                 )}
//             </div>
//
//             {stops.length === 0 && <div className="text-xs text-slate-500">Ավելացրեք քարտեզից կամ որոնումով</div>}
//
//             <div className="space-y-2">
//                 {stops.map((s, i) => (
//                     <div key={i} className="flex flex-col gap-2 rounded-lg border p-2 md:flex-row md:items-start">
//                         <div className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 text-xs font-semibold text-white">
//                             {i + 1}
//                         </div>
//                         <div className="flex-1">
//                             <input
//                                 className="mb-1 w-full rounded-lg border px-2 py-1 text-sm outline-none focus:border-emerald-500"
//                                 placeholder="Անուն կանգառի (ոչ պարտադիր)"
//                                 value={s.name || ""}
//                                 onChange={(e) => edit(i, { name: e.target.value })}
//                             />
//                             <input
//                                 className="w-full rounded-lg border px-2 py-1 text-xs text-slate-700 outline-none focus:border-emerald-500"
//                                 placeholder="Հասցե"
//                                 value={s.addr || ""}
//                                 onChange={(e) => edit(i, { addr: e.target.value })}
//                             />
//                             <div className="mt-1 text-[11px] text-slate-500">
//                                 lng: {isFinite(s.lng) ? Number(s.lng).toFixed(6) : "-"} · lat: {isFinite(s.lat) ? Number(s.lat).toFixed(6) : "-"}
//                             </div>
//
//                             {allowTariffs && (
//                                 <div className="mt-2 grid grid-cols-3 gap-2">
//                                     <TariffMini label="free_km" value={s.free_km ?? ""} onChange={(v) => edit(i, { free_km: v })} />
//                                     <TariffMini label="amd_per_km" value={s.amd_per_km ?? ""} onChange={(v) => edit(i, { amd_per_km: v })} />
//                                     <TariffMini label="max_km" value={s.max_km ?? ""} onChange={(v) => edit(i, { max_km: v })} />
//                                 </div>
//                             )}
//                         </div>
//                         <div className="flex gap-1 md:flex-col">
//                             <button type="button" onClick={() => move(i, -1)} className="rounded border bg-white px-2 py-1 text-xs hover:bg-slate-50">
//                                 ↑
//                             </button>
//                             <button type="button" onClick={() => move(i, 1)} className="rounded border bg-white px-2 py-1 text-xs hover:bg-slate-50">
//                                 ↓
//                             </button>
//                             <button type="button" onClick={() => del(i)} className="rounded bg-rose-600 px-2 py-1 text-xs text-white">
//                                 ✕
//                             </button>
//                         </div>
//                     </div>
//                 ))}
//             </div>
//         </div>
//     );
// }
// function TariffMini({ label, value, onChange }) {
//     return (
//         <label className="block text-[11px]">
//             <div className="mb-1 text-slate-600">{label}</div>
//             <input
//                 type="number"
//                 value={value}
//                 onChange={(e) => onChange(e.target.value)}
//                 className="w-full rounded-lg border px-2 py-1 outline-none focus:border-emerald-500"
//             />
//         </label>
//     );
// }
//
// /* ===== Small UI ===== */
// function Input({ label, value, onChange, type = "text" }) {
//     return (
//         <label className="block text-sm">
//             <div className="mb-1 text-slate-700">{label}</div>
//             <input
//                 type={type}
//                 value={value}
//                 onChange={(e) => onChange(e.target.value)}
//                 className="w-full rounded-xl border px-3 py-2 outline-none focus:border-emerald-400"
//             />
//         </label>
//     );
// }
// function Select({ label, value, onChange, options = [] }) {
//     return (
//         <label className="block text-sm">
//             <div className="mb-1 text-slate-700">{label}</div>
//             <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border px-3 py-2">
//                 {options.map((o) => (
//                     <option key={o.v} value={o.v}>
//                         {o.t}
//                     </option>
//                 ))}
//             </select>
//         </label>
//     );
// }
// function PayMethods({ value = [], onChange }) {
//     const toggle = (k) => onChange(value.includes(k) ? value.filter((i) => i !== k) : [...value, k]);
//     return (
//         <div className="rounded-xl border p-3">
//             <div className="mb-2 text-sm font-medium text-slate-900">Վճարման եղանակ</div>
//             <div className="flex gap-3 text-sm">
//                 <label className="inline-flex items-center gap-2">
//                     <input type="checkbox" checked={value.includes("cash")} onChange={() => toggle("cash")} />
//                     Կանխիկ
//                 </label>
//                 <label className="inline-flex items-center gap-2">
//                     <input type="checkbox" checked={value.includes("card")} onChange={() => toggle("card")} />
//                     Քարտ
//                 </label>
//             </div>
//         </div>
//     );
// }
// function TypeBtn({ active, onClick, title, desc }) {
//     return (
//         <button
//             type="button"
//             onClick={onClick}
//             className={`flex w-full flex-col items-start rounded-xl border p-3 text-left transition ${
//                 active ? "border-emerald-400 bg-emerald-50 shadow-inner" : "border-slate-300 bg-white hover:bg-slate-50"
//             }`}
//         >
//             <div className="text-sm font-semibold text-slate-900">{title}</div>
//             <div className="text-xs text-slate-600">{desc}</div>
//         </button>
//     );
// }
// function TariffCard({ title, values, setValues }) {
//     return (
//         <div className="rounded-xl border p-3">
//             <div className="mb-2 text-sm font-semibold text-slate-900">{title}</div>
//             <div className="grid grid-cols-3 gap-2">
//                 <Input type="number" label="free_km" value={values.free_km ?? ""} onChange={(v) => setValues({ ...values, free_km: v })} />
//                 <Input type="number" label="amd_per_km" value={values.amd_per_km ?? ""} onChange={(v) => setValues({ ...values, amd_per_km: v })} />
//                 <Input type="number" label="max_km" value={values.max_km ?? ""} onChange={(v) => setValues({ ...values, max_km: v })} />
//             </div>
//             <div className="mt-1 text-[11px] text-slate-500">Թողեք դատարկ՝ եթե պետք չէ. Null semantics: free=0, rate=null, max=null.</div>
//         </div>
//     );
// }
// function DisabledCard({ text }) {
//     return <div className="grid place-items-center rounded-xl border border-dashed p-3 text-xs text-slate-500">{text}</div>;
// }
// function Modal({ title, onClose, children, wide = false }) {
//     return (
//         <div className="fixed inset-0 z-[9999] grid place-items-center bg-black/40 p-3" onClick={onClose}>
//             <div
//                 className={`w-full ${wide ? "max-w-5xl" : "max-w-2xl"} overflow-hidden rounded-2xl border bg-white shadow-xl`}
//                 onClick={(e) => e.stopPropagation()}
//             >
//                 <div className={`flex items-center justify-between border-b p-3 ${brand.glass}`}>
//                     <div className="text-sm font-semibold text-slate-900">{title}</div>
//                     <button onClick={onClose} className="rounded px-2 py-1 text-sm text-slate-700 hover:bg-slate-100">
//                         ✕
//                     </button>
//                 </div>
//                 {children}
//             </div>
//         </div>
//     );
// }
// function AmenityPickerModal({ categories = [], initialSelected = [], onSave, onClose }) {
//     const [selected, setSelected] = useState(initialSelected || []);
//     useEffect(() => setSelected(initialSelected || []), [initialSelected]);
//     const toggle = (id) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
//     return (
//         <Modal title="Հարմարություններ" onClose={onClose}>
//             <div className="max-h-[60vh] space-y-4 overflow-y-auto p-4">
//                 {categories.length === 0 && <div className="text-sm text-slate-500">Բեռնվում է…</div>}
//                 {categories.map((cat) => (
//                     <div key={cat.id} className="rounded-xl border p-3">
//                         <div className="mb-2 text-sm font-medium text-slate-900">{cat.name}</div>
//                         <div className="flex flex-wrap gap-3">
//                             {(cat.amenities || []).map((a) => (
//                                 <label key={a.id} className="inline-flex items-center gap-2 text-sm">
//                                     <input type="checkbox" checked={selected.includes(a.id)} onChange={() => toggle(a.id)} />
//                                     {a.name}
//                                 </label>
//                             ))}
//                         </div>
//                     </div>
//                 ))}
//             </div>
//             <div className="flex items-center justify-end gap-2 border-t p-3">
//                 <button onClick={onClose} className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50">
//                     Չեղարկել
//                 </button>
//                 <button
//                     onClick={() => onSave && onSave(selected)}
//                     className={`rounded px-3 py-1.5 text-sm font-semibold text-white ${brand.btn} ${brand.btnHover}`}
//                 >
//                     Պահպանել
//                 </button>
//             </div>
//         </Modal>
//     );
// }
// resources/js/Pages/Company/TripsMake.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { router, usePage, Link } from "@inertiajs/react";
import dayjs from "dayjs";
import CompanyLayout from "./Layout";

/* ===== Theme ===== */
const brand = {
    grad: "from-emerald-600 via-teal-600 to-cyan-600",
    btn: "bg-gradient-to-r from-emerald-600 to-cyan-600",
    btnHover: "hover:from-emerald-500 hover:to-cyan-500",
    ring: "focus-visible:ring-emerald-500/50",
    glass: "bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60",
    card: "rounded-2xl border border-white/20 bg-white/70 shadow-sm backdrop-blur",
};

/* ===== Geo/OSRM helpers ===== */
const NOMI_LANG = "hy,ru,en";
async function geocodeNominatim(q) {
    if (!q?.trim()) return null;
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=${encodeURIComponent(
        NOMI_LANG
    )}&q=${encodeURIComponent(q)}`;
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    if (!r.ok) return null;
    const d = await r.json();
    if (!d?.length) return null;
    return { lng: parseFloat(d[0].lon), lat: parseFloat(d[0].lat), label: d[0].display_name || q };
}
async function reverseGeocodeNominatim(lng, lat) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&accept-language=${encodeURIComponent(
        NOMI_LANG
    )}&lat=${lat}&lon=${lng}&addressdetails=1`;
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    if (!r.ok) return "";
    const d = await r.json();
    const a = d?.address || {};
    const parts = [a.road, a.suburb, a.city || a.town || a.village, a.country].filter(Boolean);
    return parts.join(", ") || d?.display_name || "";
}
async function osrmRouteVia(profile, pts) {
    const way = (pts || []).filter((p) => Number.isFinite(p?.lng) && Number.isFinite(p?.lat));
    if (way.length < 2) return null;
    const path = way.map((p) => `${p.lng},${p.lat}`).join(";");
    const url = `https://router.project-osrm.org/route/v1/${profile}/${path}?overview=full&geometries=geojson&alternatives=false&steps=false`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const d = await r.json();
    return d?.routes?.[0] || null;
}

/* ===== Utils ===== */
const fmtAmd = (n) => {
    try {
        return new Intl.NumberFormat("hy-AM").format(n || 0);
    } catch {
        return String(n ?? 0);
    }
};
const secToHHMM = (s) => {
    if (!Number.isFinite(s) || s <= 0) return "—";
    const h = Math.floor(s / 3600);
    const m = Math.round((s % 3600) / 60);
    return h > 0 ? `${h} ժ ${m} ր` : `${m} ր`;
};
const nzNum = (v) => {
    if (v === "" || v === null || typeof v === "undefined") return null;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
};
const nzInt = (v) => {
    if (v === "" || v === null || typeof v === "undefined") return null;
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
};

/* ===== Page ===== */
export default function TripsMake({ company, trips = [], vehicles = [], drivers = [] }) {
    const { props } = usePage();

    /* ===== Creation form state ===== */
    const [from, setFrom] = useState({ lat: null, lng: null, addr: "" });
    const [to, setTo] = useState({ lat: null, lng: null, addr: "" });
    const [stops, setStops] = useState([]);
    const [mode, setMode] = useState("from"); // from|to|stop

    const [amenityCats, setAmenityCats] = useState([]);
    const [amenityModal, setAmenityModal] = useState(false);

    const [form, setForm] = useState(() => {
        const saved = localStorage.getItem("company_trip_form_v2");
        const base = saved ? JSON.parse(saved) : {};
        return {
            vehicle_id: vehicles[0]?.id || "",
            assigned_driver_id: drivers[0]?.id || "",
            from_addr: "",
            to_addr: "",
            from_lat: "",
            from_lng: "",
            to_lat: "",
            to_lng: "",
            departure_at: dayjs().add(2, "hour").format("YYYY-MM-DDTHH:mm"),
            seats_total: 4,
            price_amd: 2500,
            pay_methods: ["cash"],
            amenities: [],
            description: "",
            // TYPES (ровно один true)
            type_ab_fixed: true,
            type_pax_to_pax: false,
            type_pax_to_b: false,
            type_a_to_pax: false,
            // TRIP tariffs
            start_free_km: "",
            start_amd_per_km: "",
            start_max_km: "",
            end_free_km: "",
            end_amd_per_km: "",
            end_max_km: "",
            // stops payload
            stops: [],
            ...base,
        };
    });
    useEffect(() => localStorage.setItem("company_trip_form_v2", JSON.stringify(form)), [JSON.stringify(form)]);
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const r = await fetch(route("amenities.catalog"));
                if (!r.ok) return;
                const d = await r.json();
                if (!cancelled) setAmenityCats(d?.categories || []);
            } catch {}
        })();
        return () => (cancelled = true);
    }, []);
    useEffect(() => setForm((s) => ({ ...s, from_addr: from.addr || "" })), [from.addr]);
    useEffect(() => setForm((s) => ({ ...s, to_addr: to.addr || "" })), [to.addr]);
    useEffect(() => {
        setForm((s) => ({ ...s, from_lat: Number.isFinite(from.lat) ? from.lat : "", from_lng: Number.isFinite(from.lng) ? from.lng : "" }));
    }, [from.lat, from.lng]);
    useEffect(() => {
        setForm((s) => ({ ...s, to_lat: Number.isFinite(to.lat) ? to.lat : "", to_lng: Number.isFinite(to.lng) ? to.lng : "" }));
    }, [to.lat, to.lng]);

    /* ===== Trip types & tariffs ===== */
    function pickType(key) {
        const next = { type_ab_fixed: false, type_pax_to_pax: false, type_pax_to_b: false, type_a_to_pax: false };
        next[key] = true;
        setForm((d) => ({
            ...d,
            ...next,
            ...(key === "type_pax_to_pax"
                ? {
                    start_free_km: "",
                    start_amd_per_km: "",
                    start_max_km: "",
                    end_free_km: "",
                    end_amd_per_km: "",
                    end_max_km: "",
                }
                : key === "type_pax_to_b"
                    ? { start_free_km: "", start_amd_per_km: "", start_max_km: "" }
                    : key === "type_a_to_pax"
                        ? { end_free_km: "", end_amd_per_km: "", end_max_km: "" }
                        : {}),
        }));
    }
    const showStartTariff = form.type_ab_fixed || form.type_a_to_pax;
    const showEndTariff = form.type_ab_fixed || form.type_pax_to_b;
    const allowStopTariffs = true;

    /* ===== Stops -> payload ===== */
    useEffect(() => {
        const prepared = (stops || [])
            .slice(0, 10)
            .map((s, idx) => ({
                name: s.name || null,
                addr: s.addr || null,
                lat: s.lat,
                lng: s.lng,
                position: idx + 1,
                ...(allowStopTariffs
                    ? { free_km: nzNum(s.free_km), amd_per_km: nzInt(s.amd_per_km), max_km: nzNum(s.max_km) }
                    : {}),
            }));
        setForm((f) => ({ ...f, stops: prepared }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(stops), allowStopTariffs]);

    /* ===== OSRM preview ===== */
    const routePts = useMemo(() => {
        const pts = [];
        if (Number.isFinite(from.lng) && Number.isFinite(from.lat)) pts.push({ lng: from.lng, lat: from.lat });
        (stops || []).forEach((s) => Number.isFinite(s.lng) && Number.isFinite(s.lat) && pts.push({ lng: s.lng, lat: s.lat }));
        if (Number.isFinite(to.lng) && Number.isFinite(to.lat)) pts.push({ lng: to.lng, lat: to.lat });
        return pts;
    }, [from?.lng, from?.lat, to?.lng, to?.lat, JSON.stringify(stops)]);
    const [osrm, setOsrm] = useState({ km: 0, sec: 0, coords: [] });
    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (routePts.length < 2) {
                if (!cancelled) setOsrm({ km: 0, sec: 0, coords: [] });
                return;
            }
            const r = await osrmRouteVia("driving", routePts);
            if (!r) {
                if (!cancelled) setOsrm({ km: 0, sec: 0, coords: routePts.map((p) => ({ lat: p.lat, lng: p.lng })) });
                return;
            }
            const km = (r.distance || 0) / 1000;
            const sec = r.duration || 0;
            const coords = (r.geometry?.coordinates || []).map(([lng, lat]) => ({ lat, lng }));
            if (!cancelled) setOsrm({ km, sec, coords });
        })();
        return () => (cancelled = true);
    }, [JSON.stringify(routePts)]);

    const coordsReady =
        Number.isFinite(Number(form.from_lat)) &&
        Number.isFinite(Number(form.from_lng)) &&
        Number.isFinite(Number(form.to_lat)) &&
        Number.isFinite(Number(form.to_lng));

    /* ===== Price helper ===== */
    const [tariffPerKm, setTariffPerKm] = useState(200);
    const suggestedPrice = useMemo(() => Math.round(Math.max(0, osrm.km) * tariffPerKm), [osrm.km, tariffPerKm]);

    /* ===== Actions ===== */
    function submitCreate(e, publish = false) {
        e.preventDefault();
        if (!coordsReady) return alert("Քարտեզի վրա ընտրեք սկիզբ և վերջ (երկու նշան)");
        const payload = {
            ...form,
            vehicle_id: String(form.vehicle_id || ""),
            assigned_driver_id: String(form.assigned_driver_id || ""),
            price_amd: Number(form.price_amd) || 0,
            seats_total: Number(form.seats_total) || 1,
            from_lat: Number(form.from_lat),
            from_lng: Number(form.from_lng),
            to_lat: Number(form.to_lat),
            to_lng: Number(form.to_lng),
            amenities: form.amenities || [],
            stops: form.stops || [],
            pay_methods: form.pay_methods || ["cash"],
            description: form.description || "",
        };
        router.post(
            publish ? route("company.trips.store_publish", company.id) : route("company.trips.store", company.id),
            payload,
            { preserveScroll: true }
        );
    }

    /* ===== Filters/list ===== */
    const [q, setQ] = useState("");
    const [status, setStatus] = useState("all"); // all|draft|published|archived
    const filtered = useMemo(() => {
        return (trips || []).filter((t) => {
            const matchQ =
                !q ||
                t?.from_addr?.toLowerCase()?.includes(q.toLowerCase()) ||
                t?.to_addr?.toLowerCase()?.includes(q.toLowerCase()) ||
                t?.vehicle?.plate?.toLowerCase()?.includes(q.toLowerCase());
            const matchS = status === "all" || t.status === status;
            return matchQ && matchS;
        });
    }, [q, status, JSON.stringify(trips)]);

    /* ===== Amenity helpers ===== */
    function selectedAmenityNames(categories, ids) {
        const all = [];
        (categories || []).forEach((c) => (c.amenities || []).forEach((a) => all.push(a)));
        const map = Object.fromEntries(all.map((a) => [a.id, a.name]));
        return (ids || []).map((id) => map[id]).filter(Boolean);
    }
    const names = selectedAmenityNames(amenityCats, form.amenities).slice(0, 4);
    const namesMore = Math.max(0, (form.amenities?.length || 0) - names.length);

    return (
        <CompanyLayout
            company={{ id: company.id, name: company.name, logo: company.logo_path ? `/storage/${company.logo_path}` : null }}
            current="trips_make"
        >
            {/* Header */}
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-emerald-800">Երթուղիներ (Company)</h1>
                    <div className="text-sm text-slate-600">
                        Ընդամենը՝ <b>{trips.length}</b>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Որոնում․ հասցե/պլետ"
                        className="rounded-xl border border-white/30 bg-white/80 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                    />
                    <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border bg-white/80 px-3 py-2 text-sm">
                        <option value="all">Բոլորը</option>
                        <option value="draft">Սևագիր</option>
                        <option value="published">Հրապարակված</option>
                        <option value="archived">Արխիվ</option>
                    </select>
                    <Link
                        href={route("company.trips.index", company.id)}
                        className="rounded-xl border px-3 py-2 text-sm hover:bg-white/70"
                    >
                        Բացել լիստինգը
                    </Link>
                </div>
            </div>

            {/* CREATE FORM */}
            <section className={`mb-6 grid gap-4 lg:grid-cols-2 ${brand.card} p-4`}>
                <form className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <Select
                            label="Մեքենա"
                            value={form.vehicle_id}
                            onChange={(v) => setForm((s) => ({ ...s, vehicle_id: v }))}
                            options={(vehicles || []).map((v) => ({ v: v.id, t: `${v.brand} ${v.model} · ${v.plate ?? "—"}` }))}
                        />
                        <Select
                            label="Վարորդ"
                            value={form.assigned_driver_id}
                            onChange={(v) => setForm((s) => ({ ...s, assigned_driver_id: v }))}
                            options={(drivers || []).map((d) => ({ v: d.id, t: d.name }))}
                        />
                    </div>

                    {/* Types */}
                    <div className="rounded-xl border p-3">
                        <div className="mb-2 text-sm font-semibold text-slate-900">Տիպ (rovno odin true)</div>
                        <div className="grid gap-2 sm:grid-cols-2">
                            <TypeBtn active={form.type_ab_fixed} onClick={() => pickType("type_ab_fixed")} title="A → B (ֆիքս)" desc="Սկիզբ և վերջ ֆիքս" />
                            <TypeBtn active={form.type_pax_to_pax} onClick={() => pickType("type_pax_to_pax")} title="PAX → PAX" desc="Սկիզբ/վերջ ըստ ուղևորների" />
                            <TypeBtn active={form.type_pax_to_b} onClick={() => pickType("type_pax_to_b")} title="PAX → B (ֆիքս վերջ)" desc="Սկիզբը ազատ կորիդոր" />
                            <TypeBtn active={form.type_a_to_pax} onClick={() => pickType("type_a_to_pax")} title="A (ֆիքս) → PAX" desc="Վերջը ըստ ուղևորների" />
                        </div>
                        <div className="mt-2 text-[11px] text-slate-500">PAX→PAX — trip-տարિફներ անջատված. Stop-տարിഫներ՝ թույլատր. ✓</div>
                    </div>

                    {/* From/To */}
                    <div className="grid grid-cols-2 gap-3">
                        <Input label="Սկիզբ (հասցե)" value={from.addr} onChange={(v) => setFrom((p) => ({ ...p, addr: v }))} />
                        <Input label="Վերջ (հասցե)" value={to.addr} onChange={(v) => setTo((p) => ({ ...p, addr: v }))} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={async () => {
                                const g = await geocodeNominatim(from.addr);
                                if (!g) return alert("Չի գտնվել սկիզբ");
                                setFrom({ lat: g.lat, lng: g.lng, addr: g.label });
                                setMode("to");
                            }}
                            className="rounded-lg border bg-white px-3 py-1.5 text-sm hover:bg-slate-100"
                        >
                            Գտնել սկիզբ
                        </button>
                        <button
                            type="button"
                            onClick={async () => {
                                const g = await geocodeNominatim(to.addr);
                                if (!g) return alert("Չի գտնվել վերջ");
                                setTo({ lat: g.lat, lng: g.lng, addr: g.label });
                                setMode("stop");
                            }}
                            className="rounded-lg border bg-white px-3 py-1.5 text-sm hover:bg-slate-100"
                        >
                            Գտնել վերջ
                        </button>
                        <button type="button" onClick={() => setMode("stop")} className="rounded-lg border bg-white px-3 py-1.5 text-sm hover:bg-slate-100">
                            Ավելացնել կանգառներ (քարտեզից)
                        </button>
                    </div>

                    {/* Schedule / price / seats / pay */}
                    <div className="grid grid-cols-2 gap-3">
                        <Input type="datetime-local" label="Մեկնման ժամանակ" value={form.departure_at} onChange={(v) => setForm((s) => ({ ...s, departure_at: v }))} />
                        <Input type="number" label="Տեղերի թիվ" value={form.seats_total} onChange={(v) => setForm((s) => ({ ...s, seats_total: Number(v) || 1 }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <Input type="number" label="Գին (AMD մեկ նստատեղ)" value={form.price_amd} onChange={(v) => setForm((s) => ({ ...s, price_amd: Number(v) || 0 }))} />
                        <PayMethods value={form.pay_methods} onChange={(arr) => setForm((s) => ({ ...s, pay_methods: arr }))} />
                    </div>

                    {/* Trip tariffs */}
                    <div className="grid gap-3 lg:grid-cols-2">
                        {showStartTariff ? (
                            <TariffCard
                                title="Տարിഫ — Սկիզբ A"
                                values={{ free_km: form.start_free_km, amd_per_km: form.start_amd_per_km, max_km: form.start_max_km }}
                                setValues={(v) => setForm((s) => ({ ...s, start_free_km: v.free_km, start_amd_per_km: v.amd_per_km, start_max_km: v.max_km }))}
                            />
                        ) : (
                            <DisabledCard text="Սկզբի տարածքը չի մոնետիզացվում" />
                        )}
                        {showEndTariff ? (
                            <TariffCard
                                title="Տարിഫ — Վերջ B"
                                values={{ free_km: form.end_free_km, amd_per_km: form.end_amd_per_km, max_km: form.end_max_km }}
                                setValues={(v) => setForm((s) => ({ ...s, end_free_km: v.free_km, end_amd_per_km: v.amd_per_km, end_max_km: v.max_km }))}
                            />
                        ) : (
                            <DisabledCard text="Վերջի տարածքը չի մոնետիզացվում" />
                        )}
                    </div>

                    {/* Description */}
                    <label className="block text-sm">
                        <div className="mb-1 text-slate-700">Նկարագրություն (ըստ ցանկության)</div>
                        <textarea
                            rows={3}
                            className="w-full rounded-xl border px-3 py-2 outline-none focus:border-emerald-400"
                            placeholder="Օգտակար ինֆո՝ ուղևորության մանրամասներ"
                            value={form.description || ""}
                            onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                        />
                    </label>

                    {/* Amenities */}
                    <div className="rounded-xl border p-3">
                        <div className="mb-2 flex items-center justify-between">
                            <div className="text-sm font-medium text-slate-700">Հարմարություններ</div>
                            <button
                                type="button"
                                onClick={() => setAmenityModal(true)}
                                className={`rounded-lg px-3 py-1.5 text-sm font-semibold text-white ${brand.btn} ${brand.btnHover}`}
                            >
                                Ընտրել
                            </button>
                        </div>
                        {form.amenities?.length ? (
                            <div className="flex flex-wrap gap-2">
                                {names.map((n, i) => (
                                    <span key={i} className="rounded-lg bg-emerald-50 px-2 py-1 text-xs text-emerald-700 ring-1 ring-emerald-200">
                    {n}
                  </span>
                                ))}
                                {namesMore > 0 && <span className="text-xs text-slate-500">+{namesMore}</span>}
                            </div>
                        ) : (
                            <div className="text-xs text-slate-500">Չկա ընտրված</div>
                        )}
                    </div>

                    {/* OSRM preview + suggested price */}
                    <div className="rounded-xl border p-3 text-sm text-slate-700">
                        <div className="mb-2 font-medium">Վերահաշվարկ</div>
                        <div className="grid grid-cols-3 gap-3">
                            <div>Հեռավորություն՝ <b>{osrm.km ? osrm.km.toFixed(1) : "—"} կմ</b></div>
                            <div>Ժամանակ՝ <b>{secToHHMM(osrm.sec)}</b></div>
                            <div className="flex items-center gap-2">
                                <span>Սակագին՝</span>
                                <input type="number" value={tariffPerKm} onChange={(e) => setTariffPerKm(Number(e.target.value) || 0)} className="w-24 rounded-lg border px-2 py-1 text-right" />
                                <span>AMD/կմ</span>
                            </div>
                        </div>
                        <div className="mt-2">
                            Առաջարկվող գին ≈ <b>{fmtAmd(suggestedPrice)} AMD</b>{" "}
                            <button type="button" onClick={() => setForm((s) => ({ ...s, price_amd: suggestedPrice }))} className="rounded border px-2 py-0.5 text-xs hover:bg-slate-50">
                                Դնել որպես գին
                            </button>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={(e) => submitCreate(e, false)}
                            disabled={!coordsReady}
                            className={`rounded-xl px-4 py-2 font-semibold text-white ${brand.btn} ${brand.btnHover}`}
                        >
                            Ստեղծել (սևագիր)
                        </button>
                        <button
                            onClick={(e) => submitCreate(e, true)}
                            disabled={!coordsReady}
                            className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 font-semibold text-emerald-700 hover:bg-emerald-100"
                        >
                            Ստեղծել և հրապարակել
                        </button>
                    </div>
                </form>

                {/* RIGHT: map + stops */}
                <div className="space-y-3">
                    <ToggleMode mode={mode} setMode={setMode} />
                    <div className="h-80 overflow-hidden rounded-2xl border shadow">
                        <TripMap
                            from={from}
                            to={to}
                            stops={stops}
                            setFrom={setFrom}
                            setTo={setTo}
                            setStops={setStops}
                            mode={mode}
                            setMode={setMode}
                            routeCoords={osrm.coords}
                         showStartTariff={showStartTariff}
                         showEndTariff={showEndTariff}
                         startTariff={{ free_km: nzNum(form.start_free_km), max_km: nzNum(form.start_max_km) }}
                         endTariff={{ free_km: nzNum(form.end_free_km),   max_km: nzNum(form.end_max_km)   }}
                        />
                    </div>
                    <StopsEditor stops={stops} setStops={setStops} allowTariffs={allowStopTariffs} />
                </div>
            </section>

            {/* LIST */}
            <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filtered.map((t) => (
                    <TripCard key={t.id} company={company} t={t} />
                ))}
                {filtered.length === 0 && (
                    <div className="md:col-span-2 rounded-2xl border bg-white p-6 text-center text-slate-500">Դատարկ է</div>
                )}
            </section>

            {/* Amenity modal for create form */}
            {amenityModal && (
                <AmenityPickerModal
                    categories={amenityCats}
                    initialSelected={form.amenities || []}
                    onClose={() => setAmenityModal(false)}
                    onSave={(ids) => {
                        setForm((s) => ({ ...s, amenities: ids }));
                        setAmenityModal(false);
                    }}
                />
            )}
        </CompanyLayout>
    );
}

/* ===== Trip Card ===== */
function TripCard({ company, t }) {
    const seatsLeft = Math.max(0, (t.seats_total ?? 0) - (t.seats_taken ?? 0));
    const canPublish = t.status === "draft" && seatsLeft > 0;

    const [amenityModal, setAmenityModal] = useState(false);
    const [stopsModal, setStopsModal] = useState(false);

    const badgeCls =
        t.status === "published"
            ? "bg-emerald-100 text-emerald-700"
            : t.status === "draft"
                ? "bg-amber-100 text-amber-700"
                : t.status === "archived"
                    ? "bg-slate-100 text-slate-700"
                    : "bg-rose-100 text-rose-700";

    const publish = () => router.post(route("company.trips.publish", [company.id, t.id]), {}, { preserveScroll: true });
    const archive = () => router.post(route("company.trips.archive", [company.id, t.id]), {}, { preserveScroll: true });
    const unarchive = () => router.post(route("company.trips.unarchive", [company.id, t.id]), {}, { preserveScroll: true });

    return (
        <div className="rounded-2xl border bg-white p-4">
            <div className="text-sm text-slate-600">
                {t.vehicle?.brand} {t.vehicle?.model} · {t.vehicle?.plate ?? "—"}
            </div>
            <div className="mt-1 font-semibold">
                {t.from_addr} → {t.to_addr}
            </div>
            <div className="text-sm text-slate-700">Վարորդ՝ {t.assigned_driver?.name ?? "—"}</div>
            <div className="text-sm text-slate-700">Գին՝ {fmtAmd(t.price_amd)} AMD</div>
            <div className="text-sm text-slate-700">Տեղեր՝ {t.seats_taken ?? 0}/{t.seats_total ?? 0}</div>
            <div className="text-sm text-slate-700">
                Մեկնում՝ {t.departure_at ? dayjs(t.departure_at).format("YYYY-MM-DD HH:mm") : "—"}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded ${badgeCls}`}>{t.status}</span>
                <span className="text-xs text-slate-600">
          Pending՝ {t.pending_requests_count ?? 0} · Accepted՝ {t.accepted_requests_count ?? 0}
        </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
                {canPublish && (
                    <button onClick={publish} className="rounded border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-emerald-700 hover:bg-emerald-100">
                        Publish
                    </button>
                )}
                {t.status !== "archived" && (
                    <button onClick={archive} className={`rounded px-3 py-1.5 text-white ${brand.btn} ${brand.btnHover}`}>
                        Archive
                    </button>
                )}
                {t.status === "archived" && (
                    <button onClick={unarchive} className="rounded bg-slate-200 px-3 py-1.5 text-slate-900">
                        Unarchive
                    </button>
                )}
                <Link href={route("company.trips.show", [company.id, t.id])} className="rounded border px-3 py-1.5 hover:bg-slate-50">
                    Բացել
                </Link>

                <button onClick={() => setAmenityModal(true)} className="rounded border px-3 py-1.5 hover:bg-slate-50">
                    Ուдобства
                </button>
                <button onClick={() => setStopsModal(true)} className="rounded border px-3 py-1.5 hover:bg-slate-50">
                    Կանգառներ
                </button>
            </div>

            {amenityModal && <TripAmenityModal company={company} tripId={t.id} onClose={() => setAmenityModal(false)} />}
            {stopsModal && <TripStopsReplaceModal company={company} tripId={t.id} onClose={() => setStopsModal(false)} />}
        </div>
    );
}

/* ===== Trip Amenity Modal (existing trip) ===== */
function TripAmenityModal({ company, tripId, onClose }) {
    const [loading, setLoading] = useState(true);
    const [cats, setCats] = useState([]);
    const [selected, setSelected] = useState([]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const url = route("company.trips.amenities.show", [company.id, tripId]);
                const r = await fetch(url, { headers: { Accept: "application/json" } });
                if (!r.ok) return;
                const d = await r.json();
                if (cancelled) return;
                setSelected(d?.selected_ids || []);
                setCats(d?.categories || []);
                setLoading(false);
            } catch {}
        })();
        return () => (cancelled = true);
    }, [company.id, tripId]);

    const toggle = (id) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    const save = () => {
        router.post(
            route("company.trips.amenities.update", [company.id, tripId]),
            { amenities: selected },
            { preserveScroll: true, onSuccess: onClose }
        );
    };

    return (
        <Modal title="Հարմարություններ (երթուղի)" onClose={onClose}>
            {loading ? (
                <div className="p-4 text-sm text-slate-600">Բեռնվում է…</div>
            ) : (
                <div className="max-h-[60vh] space-y-4 overflow-y-auto p-4">
                    {cats.map((cat) => (
                        <div key={cat.id} className="rounded-xl border p-3">
                            <div className="mb-2 text-sm font-medium text-slate-900">{cat.name}</div>
                            <div className="flex flex-wrap gap-3">
                                {(cat.amenities || []).map((a) => (
                                    <label key={a.id} className="inline-flex items-center gap-2 text-sm">
                                        <input type="checkbox" checked={selected.includes(a.id)} onChange={() => toggle(a.id)} />
                                        {a.name}
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <div className="flex items-center justify-end gap-2 border-t p-3">
                <button onClick={onClose} className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50">
                    Չեղարկել
                </button>
                <button onClick={save} className={`rounded px-3 py-1.5 text-sm font-semibold text-white ${brand.btn} ${brand.btnHover}`}>
                    Պահպանել
                </button>
            </div>
        </Modal>
    );
}

/* ===== Trip Stops Replace Modal (with stop tariffs) ===== */
function TripStopsReplaceModal({ company, tripId, onClose }) {
    const [stops, setStops] = useState([]);
    const [mode, setMode] = useState("stop");
    const [from, setFrom] = useState({ lat: null, lng: null });
    const [to, setTo] = useState({ lat: null, lng: null });

    // Optionally fetch existing stops:
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const r = await fetch(route("company.trips.show", [company.id, tripId]), { headers: { Accept: "application/json" } });
                if (!r.ok) return;
                const d = await r.json();
                if (cancelled) return;
                const arr = (d?.data?.stops || d?.trip?.stops || []).map((s) => ({
                    name: s.name || "",
                    addr: s.addr || "",
                    lat: s.lat,
                    lng: s.lng,
                    free_km: s.free_km ?? "",
                    amd_per_km: s.amd_per_km ?? "",
                    max_km: s.max_km ?? "",
                }));
                if (arr.length) setStops(arr);
            } catch {}
        })();
        return () => (cancelled = true);
    }, [company.id, tripId]);

    const submit = () => {
        const prepared = (stops || []).slice(0, 10).map((s, i) => ({
            position: i + 1,
            name: s.name || null,
            addr: s.addr || null,
            lat: s.lat,
            lng: s.lng,
            free_km: nzNum(s.free_km),
            amd_per_km: nzInt(s.amd_per_km),
            max_km: nzNum(s.max_km),
        }));
        router.post(
            route("company.trips.stops.replace", [company.id, tripId]),
            { stops: prepared },
            { preserveScroll: true, onSuccess: onClose }
        );
    };

    return (
        <Modal title="Փոխարինել կանգառների ցանկը (մինչև 10)" onClose={onClose} wide>
            <div className="grid gap-3 md:grid-cols-2 p-3">
                <div className="space-y-3">
                    <div className="rounded-xl border p-3">
                        <div className="mb-2 text-sm font-medium text-slate-900">Քարտեզի ռեժիմ՝</div>
                        <div className="flex overflow-hidden rounded-xl border">
                            {["stop"].map((k) => (
                                <button key={k} type="button" onClick={() => setMode(k)} className={`px-3 py-1.5 ${mode === k ? "bg-emerald-600 text-white" : "bg-white hover:bg-slate-50"}`}>
                                    Կանգառ
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="h-72 overflow-hidden rounded-2xl border shadow">
                        <TripMap from={from} to={to} stops={stops} setFrom={setFrom} setTo={setTo} setStops={setStops} mode={mode} setMode={setMode} />
                    </div>
                </div>
                <div>
                    <StopsEditor stops={stops} setStops={setStops} allowTariffs />
                    <div className="mt-3 flex justify-end gap-2">
                        <button onClick={onClose} className="rounded border px-3 py-1.5 hover:bg-slate-50">
                            Չեղարկել
                        </button>
                        <button onClick={submit} className={`rounded px-3 py-1.5 font-semibold text-white ${brand.btn} ${brand.btnHover}`}>
                            Պահպանել
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}

/* ===== Map (Leaflet) ===== */
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const DefaultIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

function mkDivIcon(color, label = null) {
    const html = `
    <div style="position:relative;width:14px;height:14px;border-radius:50%;
                box-shadow:0 0 0 2px #fff,0 0 0 4px ${color};background:${color};"></div>
    ${
        label !== null
            ? `<div style="position:absolute;left:50%;top:0;transform:translate(-50%,-140%);font:600 11px/1 system-ui;padding:2px 6px;border-radius:8px;background:#fff;color:#065f46;border:1px solid rgba(5,150,105,.35);box-shadow:0 1px 2px rgba(0,0,0,.06)">${label}</div>`
            : ""
    }
  `;
    return L.divIcon({ html, className: "", iconSize: [14, 14], iconAnchor: [7, 7] });
}
function FitTo({ pts, routeCoords }) {
    const map = useMap();
    useEffect(() => {
        const coords = routeCoords?.length ? routeCoords.map((p) => [p.lat, p.lng]) : pts.map((p) => [p.lat, p.lng]);
        if (!coords.length) return;
        const b = L.latLngBounds(coords);
        map.fitBounds(b.pad(0.2));
    }, [map, JSON.stringify(pts), routeCoords?.length]);
    return null;
}
function toPts(from, stops, to) {
    const pts = [];
    if (Number.isFinite(from?.lng) && Number.isFinite(from?.lat)) pts.push({ lng: from.lng, lat: from.lat });
    (stops || []).forEach((s) => {
        if (Number.isFinite(s.lng) && Number.isFinite(s.lat)) pts.push({ lng: s.lng, lat: s.lat });
    });
    if (Number.isFinite(to?.lng) && Number.isFinite(to?.lat)) pts.push({ lng: to.lng, lat: to.lat });
    return pts;
}
function ClickCapture({ mode, setMode, setFrom, setTo, setStops }) {
    useMapEvents({
        click: async (e) => {
            const p = { lng: e.latlng.lng, lat: e.latlng.lat };
            if (mode === "from") {
                setFrom((f) => ({ ...f, ...p }));
                const label = await reverseGeocodeNominatim(p.lng, p.lat);
                setFrom((f) => ({ ...f, addr: label || f.addr }));
                setMode("to");
            } else if (mode === "to") {
                setTo((t) => ({ ...t, ...p }));
                const label = await reverseGeocodeNominatim(p.lng, p.lat);
                setTo((t) => ({ ...t, addr: label || t.addr }));
                setMode("stop");
            } else {
                const label = await reverseGeocodeNominatim(p.lng, p.lat);
                setStops((arr) => [...arr, { ...p, addr: label, name: "", free_km: "", amd_per_km: "", max_km: "" }].slice(0, 10));
            }
        },
    });
    return null;
}
function ToggleMode({ mode, setMode }) {
    return (
        <div className="flex items-center gap-2 text-sm text-slate-700">
            <span className="opacity-70">Քարտեզի ռեժիմ՝</span>
            <div className="flex overflow-hidden rounded-xl border">
                {["from", "to", "stop"].map((k) => (
                    <button
                        key={k}
                        type="button"
                        onClick={() => setMode(k)}
                        className={`px-3 py-1.5 ${mode === k ? "bg-gradient-to-r from-emerald-600 to-cyan-600 text-white" : "bg-white hover:bg-slate-100"}`}
                    >
                        {k === "from" ? "Սկիզբ" : k === "to" ? "Վերջ" : "Կանգառ"}
                    </button>
                ))}
            </div>
        </div>
    );
}
function TripMap({ from, to, stops, setFrom, setTo, setStops, mode, setMode, routeCoords = [],
                     showStartTariff=false, showEndTariff=false, startTariff={}, endTariff={}}) {
    const pts = useMemo(() => toPts(from, stops, to), [from?.lng, from?.lat, to?.lng, to?.lat, JSON.stringify(stops)]);
    return (
        <MapContainer center={[40.1792, 44.4991]} zoom={8} className="h-full w-full">
            <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <ClickCapture mode={mode} setMode={setMode} setFrom={setFrom} setTo={setTo} setStops={setStops} />
            {routeCoords?.length > 1 && <Polyline positions={routeCoords.map((p) => [p.lat, p.lng])} weight={6} />}
            {!routeCoords?.length && pts.length > 1 && <Polyline positions={pts.map((p) => [p.lat, p.lng])} weight={4} />}
                 {/* === START A zones === */}
                 {Number.isFinite(from?.lat) && Number.isFinite(from?.lng) && showStartTariff && (
                  <>
                         {Number.isFinite(startTariff.free_km) && startTariff.free_km>0 && (
                           <Circle center={[from.lat, from.lng]} radius={startTariff.free_km*1000}
                                   pathOptions={{ color:'#10b981', weight:1, fillOpacity:0.12, fillColor:'#10b981' }}/>
                         )}
                         {Number.isFinite(startTariff.max_km) && startTariff.max_km>0 && (
                           <Circle center={[from.lat, from.lng]} radius={startTariff.max_km*1000}
                                   pathOptions={{ color:'#f43f5e', weight:1, dashArray:'4 4', fillOpacity:0.06, fillColor:'#f43f5e' }}/>
                         )}
                       </>
                 )}

                 {/* === END B zones === */}
                 {Number.isFinite(to?.lat) && Number.isFinite(to?.lng) && showEndTariff && (
                   <>
                         {Number.isFinite(endTariff.free_km) && endTariff.free_km>0 && (
                           <Circle center={[to.lat, to.lng]} radius={endTariff.free_km*1000}
                                   pathOptions={{ color:'#10b981', weight:1, fillOpacity:0.12, fillColor:'#10b981' }}/>
                        )}
                         {Number.isFinite(endTariff.max_km) && endTariff.max_km>0 && (
                           <Circle center={[to.lat, to.lng]} radius={endTariff.max_km*1000}
                                   pathOptions={{ color:'#f43f5e', weight:1, dashArray:'4 4', fillOpacity:0.06, fillColor:'#f43f5e' }}/>
                         )}
                              </>
                )}

                 {/* === STOP zones (если заданы локальные тарифы) === */}
                {(stops||[]).map((s,i)=>(
                (Number.isFinite(s.lat)&&Number.isFinite(s.lng)) ? (
                         <React.Fragment key={`z-${i}`}>
                               {Number.isFinite(nzNum(s.free_km)) && nzNum(s.free_km)>0 && (
                                 <Circle center={[s.lat, s.lng]} radius={nzNum(s.free_km)*1000}
                                         pathOptions={{ color:'#10b981', weight:1, fillOpacity:0.12, fillColor:'#10b981' }}/>
                              )}
                               {Number.isFinite(nzNum(s.max_km)) && nzNum(s.max_km)>0 && (
                                 <Circle center={[s.lat, s.lng]} radius={nzNum(s.max_km)*1000}
                                         pathOptions={{ color:'#f43f5e', weight:1, dashArray:'4 4', fillOpacity:0.06, fillColor:'#f43f5e' }}/>
                                              )}
                             </React.Fragment>
                       ) : null
                     ))}
            {Number.isFinite(from?.lng) && Number.isFinite(from?.lat) && (
                <Marker
                    position={[from.lat, from.lng]}
                    draggable
                    icon={mkDivIcon("#16a34a", "Սկիզբ")}
                    eventHandlers={{
                        dragend: async (e) => {
                            const { lat, lng } = e.target.getLatLng();
                            setFrom((f) => ({ ...f, lat, lng }));
                            const label = await reverseGeocodeNominatim(lng, lat);
                            setFrom((f) => ({ ...f, addr: label || f.addr }));
                        },
                    }}
                />
            )}

            {(stops || []).map((s, i) =>
                Number.isFinite(s.lng) && Number.isFinite(s.lat) ? (
                    <Marker
                        key={i}
                        position={[s.lat, s.lng]}
                        draggable
                        icon={mkDivIcon("#22c55e", String(i + 1))}
                        eventHandlers={{
                            dragend: async (e) => {
                                const { lat, lng } = e.target.getLatLng();
                                setStops((arr) => arr.map((x, idx) => (idx === i ? { ...x, lat, lng } : x)));
                                const label = await reverseGeocodeNominatim(lng, lat);
                                setStops((arr) => arr.map((x, idx) => (idx === i ? { ...x, addr: label || x.addr } : x)));
                            },
                        }}
                    />
                ) : null
            )}

            {Number.isFinite(to?.lng) && Number.isFinite(to?.lat) && (
                <Marker
                    position={[to.lat, to.lng]}
                    draggable
                    icon={mkDivIcon("#ef4444", "Վերջ")}
                    eventHandlers={{
                        dragend: async (e) => {
                            const { lat, lng } = e.target.getLatLng();
                            setTo((tt) => ({ ...tt, lat, lng }));
                            const label = await reverseGeocodeNominatim(lng, lat);
                            setTo((tt) => ({ ...tt, addr: label || tt.addr }));
                        },
                    }}
                />
            )}

            <FitTo pts={pts} routeCoords={routeCoords} />
        </MapContainer>
    );
}

/* ===== Stops Editor ===== */
function StopsEditor({ stops, setStops, allowTariffs = false }) {
    const move = (i, dir) => {
        const j = i + dir;
        if (j < 0 || j >= stops.length) return;
        const arr = stops.slice();
        [arr[i], arr[j]] = [arr[j], arr[i]];
        setStops(arr);
    };
    const del = (i) => setStops(stops.filter((_, idx) => idx !== i));
    const edit = (i, patch) => setStops(stops.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

    return (
        <div className="rounded-xl border p-3">
            <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-medium text-slate-900">
                    Կանգառներ (մինչև 10){allowTariffs ? " · Տեղային տարկղ" : ""}
                </div>
                {stops.length > 0 && (
                    <button type="button" onClick={() => setStops([])} className="rounded bg-emerald-600 px-2 py-1 text-xs text-white">
                        Մաքրել բոլորը
                    </button>
                )}
            </div>

            {stops.length === 0 && <div className="text-xs text-slate-500">Ավելացրեք քարտեզից կամ որոնումով</div>}

            <div className="space-y-2">
                {stops.map((s, i) => (
                    <div key={i} className="flex flex-col gap-2 rounded-lg border p-2 md:flex-row md:items-start">
                        <div className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 text-xs font-semibold text-white">
                            {i + 1}
                        </div>
                        <div className="flex-1">
                            <input
                                className="mb-1 w-full rounded-lg border px-2 py-1 text-sm outline-none focus:border-emerald-500"
                                placeholder="Անուն կանգառի (ոչ պարտադիր)"
                                value={s.name || ""}
                                onChange={(e) => edit(i, { name: e.target.value })}
                            />
                            <input
                                className="w-full rounded-lg border px-2 py-1 text-xs text-slate-700 outline-none focus:border-emerald-500"
                                placeholder="Հասցե"
                                value={s.addr || ""}
                                onChange={(e) => edit(i, { addr: e.target.value })}
                            />
                            <div className="mt-1 text-[11px] text-slate-500">
                                lng: {isFinite(s.lng) ? Number(s.lng).toFixed(6) : "-"} · lat: {isFinite(s.lat) ? Number(s.lat).toFixed(6) : "-"}
                            </div>

                            {allowTariffs && (
                                <div className="mt-2 grid grid-cols-3 gap-2">
                                    <TariffMini label="free_km" value={s.free_km ?? ""} onChange={(v) => edit(i, { free_km: v })} />
                                    <TariffMini label="amd_per_km" value={s.amd_per_km ?? ""} onChange={(v) => edit(i, { amd_per_km: v })} />
                                    <TariffMini label="max_km" value={s.max_km ?? ""} onChange={(v) => edit(i, { max_km: v })} />
                                </div>
                            )}
                        </div>
                        <div className="flex gap-1 md:flex-col">
                            <button type="button" onClick={() => move(i, -1)} className="rounded border bg-white px-2 py-1 text-xs hover:bg-slate-50">
                                ↑
                            </button>
                            <button type="button" onClick={() => move(i, 1)} className="rounded border bg-white px-2 py-1 text-xs hover:bg-slate-50">
                                ↓
                            </button>
                            <button type="button" onClick={() => del(i)} className="rounded bg-rose-600 px-2 py-1 text-xs text-white">
                                ✕
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
function TariffMini({ label, value, onChange }) {
    return (
        <label className="block text-[11px]">
            <div className="mb-1 text-slate-600">{label}</div>
            <input
                type="number"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full rounded-lg border px-2 py-1 outline-none focus:border-emerald-500"
            />
        </label>
    );
}

/* ===== Small UI ===== */
function Input({ label, value, onChange, type = "text" }) {
    return (
        <label className="block text-sm">
            <div className="mb-1 text-slate-700">{label}</div>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 outline-none focus:border-emerald-400"
            />
        </label>
    );
}
function Select({ label, value, onChange, options = [] }) {
    return (
        <label className="block text-sm">
            <div className="mb-1 text-slate-700">{label}</div>
            <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border px-3 py-2">
                {options.map((o) => (
                    <option key={o.v} value={o.v}>
                        {o.t}
                    </option>
                ))}
            </select>
        </label>
    );
}
function PayMethods({ value = [], onChange }) {
    const toggle = (k) => onChange(value.includes(k) ? value.filter((i) => i !== k) : [...value, k]);
    return (
        <div className="rounded-xl border p-3">
            <div className="mb-2 text-sm font-medium text-slate-900">Վճարման եղանակ</div>
            <div className="flex gap-3 text-sm">
                <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={value.includes("cash")} onChange={() => toggle("cash")} />
                    Կանխիկ
                </label>
                <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={value.includes("card")} onChange={() => toggle("card")} />
                    Քարտ
                </label>
            </div>
        </div>
    );
}
function TypeBtn({ active, onClick, title, desc }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex w-full flex-col items-start rounded-xl border p-3 text-left transition ${
                active ? "border-emerald-400 bg-emerald-50 shadow-inner" : "border-slate-300 bg-white hover:bg-slate-50"
            }`}
        >
            <div className="text-sm font-semibold text-slate-900">{title}</div>
            <div className="text-xs text-slate-600">{desc}</div>
        </button>
    );
}
function TariffCard({ title, values, setValues }) {
    return (
        <div className="rounded-xl border p-3">
            <div className="mb-2 text-sm font-semibold text-slate-900">{title}</div>
            <div className="grid grid-cols-3 gap-2">
                <Input type="number" label="free_km" value={values.free_km ?? ""} onChange={(v) => setValues({ ...values, free_km: v })} />
                <Input type="number" label="amd_per_km" value={values.amd_per_km ?? ""} onChange={(v) => setValues({ ...values, amd_per_km: v })} />
                <Input type="number" label="max_km" value={values.max_km ?? ""} onChange={(v) => setValues({ ...values, max_km: v })} />
            </div>
            <div className="mt-1 text-[11px] text-slate-500">Թողեք դատարկ՝ եթե պետք չէ. Null semantics: free=0, rate=null, max=null.</div>
        </div>
    );
}
function DisabledCard({ text }) {
    return <div className="grid place-items-center rounded-xl border border-dashed p-3 text-xs text-slate-500">{text}</div>;
}
function Modal({ title, onClose, children, wide = false }) {
    return (
        <div className="fixed inset-0 z-[9999] grid place-items-center bg-black/40 p-3" onClick={onClose}>
            <div
                className={`w-full ${wide ? "max-w-5xl" : "max-w-2xl"} overflow-hidden rounded-2xl border bg-white shadow-xl`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className={`flex items-center justify-between border-b p-3 ${brand.glass}`}>
                    <div className="text-sm font-semibold text-slate-900">{title}</div>
                    <button onClick={onClose} className="rounded px-2 py-1 text-sm text-slate-700 hover:bg-slate-100">
                        ✕
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}
function AmenityPickerModal({ categories = [], initialSelected = [], onSave, onClose }) {
    const [selected, setSelected] = useState(initialSelected || []);
    useEffect(() => setSelected(initialSelected || []), [initialSelected]);
    const toggle = (id) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    return (
        <Modal title="Հարմարություններ" onClose={onClose}>
            <div className="max-h-[60vh] space-y-4 overflow-y-auto p-4">
                {categories.length === 0 && <div className="text-sm text-slate-500">Բեռնվում է…</div>}
                {categories.map((cat) => (
                    <div key={cat.id} className="rounded-xl border p-3">
                        <div className="mb-2 text-sm font-medium text-slate-900">{cat.name}</div>
                        <div className="flex flex-wrap gap-3">
                            {(cat.amenities || []).map((a) => (
                                <label key={a.id} className="inline-flex items-center gap-2 text-sm">
                                    <input type="checkbox" checked={selected.includes(a.id)} onChange={() => toggle(a.id)} />
                                    {a.name}
                                </label>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex items-center justify-end gap-2 border-t p-3">
                <button onClick={onClose} className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50">
                    Չեղարկել
                </button>
                <button
                    onClick={() => onSave && onSave(selected)}
                    className={`rounded px-3 py-1.5 text-sm font-semibold text-white ${brand.btn} ${brand.btnHover}`}
                >
                    Պահպանել
                </button>
            </div>
        </Modal>
    );
}
