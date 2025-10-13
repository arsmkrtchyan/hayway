//
// // resources/js/Pages/Driver/MakeTrip.jsx
// import React, { useEffect, useMemo, useState } from "react";
// import { useForm } from "@inertiajs/react";
// import dayjs from "dayjs";
// import DriverLayout from "@/Layouts/DriverLayout";
//
// /* ===== utils ===== */
// const NOMI_LANG = "hy,ru,en";
// async function geocodeNominatim(q) {
//     const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=${encodeURIComponent(
//         NOMI_LANG
//     )}&q=${encodeURIComponent(q || "")}`;
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
//     if (!r.ok) throw new Error("OSRM " + r.status);
//     const d = await r.json();
//     return d?.routes?.[0] || null;
// }
//
// /* ===== amenity helpers ===== */
// function useAmenityCatalog(initialCategories) {
//     const [cats, setCats] = useState(initialCategories || null);
//     useEffect(() => {
//         if (initialCategories && initialCategories.length) return;
//         let cancelled = false;
//         (async () => {
//             try {
//                 const r = await fetch("/amenities-catalog", { headers: { Accept: "application/json" } });
//                 if (!r.ok) return;
//                 const d = await r.json();
//                 if (!cancelled) setCats(d?.categories || []);
//             } catch {}
//         })();
//         return () => {
//             cancelled = true;
//         };
//     }, [initialCategories]);
//     return cats || [];
// }
// function namesByIds(categories, ids) {
//     const all = [];
//     (categories || []).forEach((c) => (c.amenities || []).forEach((a) => all.push(a)));
//     const map = Object.fromEntries(all.map((a) => [a.id, a.name]));
//     return (ids || []).map((id) => map[id]).filter(Boolean);
// }
//
// /* ===== page ===== */
// export default function MakeTrip({ vehicle, amenityCategories }) {
//     const [from, setFrom] = useState({ lat: null, lng: null, addr: "" });
//     const [to, setTo] = useState({ lat: null, lng: null, addr: "" });
//     const [mode, setMode] = useState("from");
//     const [stopsMode, setStopsMode] = useState(false);
//     const [stops, setStops] = useState([]);
//     const [previewStop, setPreviewStop] = useState(null);
//
//     const cats = useAmenityCatalog(amenityCategories);
//     const [amenityModal, setAmenityModal] = useState(false);
//
//     const { data, setData, post, processing, errors, reset } = useForm({
//         vehicle_id: vehicle?.id ?? "",
//         from_lat: "",
//         from_lng: "",
//         from_addr: "",
//         to_lat: "",
//         to_lng: "",
//         to_addr: "",
//         departure_at: dayjs().add(2, "hour").format("YYYY-MM-DDTHH:mm"),
//         seats_total: vehicle?.seats ?? 4,
//         price_amd: 2500,
//         pay_methods: ["cash"],
//         amenities: [],
//         description: "",
//         // types (ровно один true)
//         type_ab_fixed: true,
//         type_pax_to_pax: false,
//         type_pax_to_b: false,
//         type_a_to_pax: false,
//         // trip tariffs
//         start_free_km: "",
//         start_amd_per_km: "",
//         start_max_km: "",
//         end_free_km: "",
//         end_amd_per_km: "",
//         end_max_km: "",
//         // stops payload
//         stops: [],
//     });
//
//     /* keep vehicle defaults synced */
//     useEffect(() => {
//         if (vehicle?.id)
//             setData((d) => ({ ...d, vehicle_id: vehicle.id, seats_total: vehicle.seats || d.seats_total }));
//     }, [vehicle?.id, vehicle?.seats]);
//
//     /* sync from/to into form */
//     useEffect(() => {
//         setData((d) => ({
//             ...d,
//             from_lat: Number.isFinite(from.lat) ? from.lat : "",
//             from_lng: Number.isFinite(from.lng) ? from.lng : "",
//             from_addr: from.addr || "",
//         }));
//     }, [from.lat, from.lng, from.addr]);
//
//     useEffect(() => {
//         setData((d) => ({
//             ...d,
//             to_lat: Number.isFinite(to.lat) ? to.lat : "",
//             to_lng: Number.isFinite(to.lng) ? to.lng : "",
//             to_addr: to.addr || "",
//         }));
//     }, [to.lat, to.lng, to.addr]);
//
//     /* map stops -> payload */
//     useEffect(() => {
//         const prepared = (stops || [])
//             .slice(0, 10)
//             .map((s, idx) => ({
//                 name: s.name || null,
//                 addr: s.addr || null,
//                 lat: s.lat,
//                 lng: s.lng,
//                 position: idx + 1,
//                 ...(allowStopTariffs ? { free_km: nzNum(s.free_km), amd_per_km: nzInt(s.amd_per_km), max_km: nzNum(s.max_km) } : {}),
//             }));
//         setData("stops", prepared);
//         // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, [JSON.stringify(stops), data.type_pax_to_pax, data.type_ab_fixed, data.type_pax_to_b, data.type_a_to_pax]);
//
//     const coordsReady =
//         Number.isFinite(from.lat) && Number.isFinite(from.lng) && Number.isFinite(to.lat) && Number.isFinite(to.lng);
//     const canSubmit = !!vehicle?.id && coordsReady;
//
//     const saveDraft = (e) => {
//         e.preventDefault();
//         if (!canSubmit) return;
//         post("/driver/trip", { preserveScroll: true });
//     };
//     const publishNow = (e) => {
//         e.preventDefault();
//         if (!canSubmit) return;
//         post("/driver/trip/store-and-publish", { preserveScroll: true });
//     };
//
//     async function findFrom() {
//         const r = await geocodeNominatim(from.addr || data.from_addr);
//         if (!r) return alert("Չի գտնվել");
//         setFrom({ lat: r.lat, lng: r.lng, addr: r.label || from.addr || data.from_addr });
//         setMode("to");
//     }
//     async function findTo() {
//         const r = await geocodeNominatim(to.addr || data.to_addr);
//         if (!r) return alert("Չի գտնվել");
//         setTo({ lat: r.lat, lng: r.lng, addr: r.label || to.addr || data.to_addr });
//         setMode("stop");
//     }
//
//     /* trip type helpers */
//     function pickType(key) {
//         const next = {
//             type_ab_fixed: false,
//             type_pax_to_pax: false,
//             type_pax_to_b: false,
//             type_a_to_pax: false,
//         };
//         next[key] = true;
//         setData((d) => ({
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
//     const showStartTariff = data.type_ab_fixed || data.type_a_to_pax;
//     const showEndTariff = data.type_ab_fixed || data.type_pax_to_b;
//     const allowStopTariffs = !data.type_pax_to_pax;
//
//     const selectedAmenityNames = namesByIds(cats, data.amenities).slice(0, 3);
//     const moreCount = Math.max(0, (data.amenities?.length || 0) - selectedAmenityNames.length);
//
//     return (
//         <DriverLayout current="make-trip">
//             <h1 className="mb-4 text-3xl font-extrabold text-slate-900">Ստեղծել ուղևորություն</h1>
//
//             <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
//                 <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
//                     {/* LEFT: form */}
//                     <form className="space-y-4">
//                         {/* trip type */}
//                         <div className="rounded-xl border border-slate-200 p-3">
//                             <div className="mb-2 text-sm font-semibold text-slate-900">Տիպ (rovno odin true)</div>
//                             <div className="grid gap-2 sm:grid-cols-2">
//                                 <TypeBtn
//                                     active={data.type_ab_fixed}
//                                     onClick={() => pickType("type_ab_fixed")}
//                                     title="A → B (ֆիքս)"
//                                     desc="Սկիզբ և վերջ ֆիքս. Քա՛ղաք → Քա՛ղաք"
//                                 />
//                                 <TypeBtn
//                                     active={data.type_pax_to_pax}
//                                     onClick={() => pickType("type_pax_to_pax")}
//                                     title="PAX → PAX"
//                                     desc="Վերցնել/թողնել կոնկրետ հասցեներով"
//                                 />
//                                 <TypeBtn
//                                     active={data.type_pax_to_b}
//                                     onClick={() => pickType("type_pax_to_b")}
//                                     title="PAX → B (ֆիքս վերջ)"
//                                     desc="Սկիզբը ազատ կորիդոր, վերջը ֆիքս"
//                                 />
//                                 <TypeBtn
//                                     active={data.type_a_to_pax}
//                                     onClick={() => pickType("type_a_to_pax")}
//                                     title="A (ֆիքս սկիզբ) → PAX"
//                                     desc="Սկիզբը ֆիքս, վերջը ըստ ուղևորների"
//                                 />
//                             </div>
//                             <div className="mt-2 text-[11px] text-slate-500">
//                                 PAX→PAX — trip-տարിഫներ անջատված. Stop-տարિફներ թույլատրված՝ {allowStopTariffs ? "այո" : "ոչ"}.
//                             </div>
//                         </div>
//
//                         {/* from/to */}
//                         <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
//                             <Input
//                                 label="Սկիզբ (հասցե)"
//                                 value={from.addr}
//                                 onChange={(v) => setFrom((p) => ({ ...p, addr: v }))}
//                                 error={errors.from_addr}
//                             />
//                             <Input label="Վերջ (հասցե)" value={to.addr} onChange={(v) => setTo((p) => ({ ...p, addr: v }))} error={errors.to_addr} />
//                         </div>
//                         <div className="flex flex-wrap gap-2">
//                             <button type="button" onClick={findFrom} className="btn-secondary">
//                                 Գտնել սկիզբ
//                             </button>
//                             <button type="button" onClick={findTo} className="btn-secondary">
//                                 Գտնել վերջ
//                             </button>
//                             <button
//                                 type="button"
//                                 onClick={() => {
//                                     setStopsMode(true);
//                                     setMode("stop");
//                                 }}
//                                 className="btn-secondary"
//                             >
//                                 Ավելացնել կանգառներ
//                             </button>
//                         </div>
//
//                         {/* when adding stops inline search */}
//                         {stopsMode && (
//                             <StopAdder
//                                 onLocate={(p) => setPreviewStop(p)}
//                                 onAdd={(p) => {
//                                     setStops((arr) => [...arr, p].slice(0, 10));
//                                     setPreviewStop(null);
//                                 }}
//                             />
//                         )}
//
//                         {/* schedule+price+seats+pay */}
//                         <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
//                             <Input
//                                 type="datetime-local"
//                                 label="Ելքի ժամանակ"
//                                 value={data.departure_at}
//                                 onChange={(v) => setData("departure_at", v)}
//                                 error={errors.departure_at}
//                             />
//                             <Input
//                                 type="number"
//                                 label="Մեկ նստատեղի գին (AMD)"
//                                 value={data.price_amd}
//                                 onChange={(v) => setData("price_amd", v)}
//                                 error={errors.price_amd}
//                             />
//                         </div>
//                         <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
//                             <Input
//                                 type="number"
//                                 label="Տեղերի քանակ"
//                                 value={data.seats_total}
//                                 onChange={(v) => setData("seats_total", v)}
//                                 error={errors.seats_total}
//                             />
//                             <PayMethods value={data.pay_methods} onChange={(arr) => setData("pay_methods", arr)} />
//                         </div>
//
//                         {/* tariffs */}
//                         <div className="grid gap-3 lg:grid-cols-2">
//                             {showStartTariff ? (
//                                 <TariffCard
//                                     side="start"
//                                     title="Տարિફ — Սկիզբ A"
//                                     values={{
//                                         free_km: data.start_free_km,
//                                         amd_per_km: data.start_amd_per_km,
//                                         max_km: data.start_max_km,
//                                     }}
//                                     setValues={(v) => {
//                                         setData("start_free_km", v.free_km);
//                                         setData("start_amd_per_km", v.amd_per_km);
//                                         setData("start_max_km", v.max_km);
//                                     }}
//                                     errors={{
//                                         free_km: errors.start_free_km,
//                                         amd_per_km: errors.start_amd_per_km,
//                                         max_km: errors.start_max_km,
//                                     }}
//                                 />
//                             ) : (
//                                 <DisabledCard text="Սկզբի տարածքը չի մոնետիզացվում այս տիպի համար" />
//                             )}
//
//                             {showEndTariff ? (
//                                 <TariffCard
//                                     side="end"
//                                     title="Տարિફ — Վերջ B"
//                                     values={{
//                                         free_km: data.end_free_km,
//                                         amd_per_km: data.end_amd_per_km,
//                                         max_km: data.end_max_km,
//                                     }}
//                                     setValues={(v) => {
//                                         setData("end_free_km", v.free_km);
//                                         setData("end_amd_per_km", v.amd_per_km);
//                                         setData("end_max_km", v.max_km);
//                                     }}
//                                     errors={{
//                                         free_km: errors.end_free_km,
//                                         amd_per_km: errors.end_amd_per_km,
//                                         max_km: errors.end_max_km,
//                                     }}
//                                 />
//                             ) : (
//                                 <DisabledCard text="Վերջի տարածքը չի մոնետիզացվում այս տիպի համար" />
//                             )}
//                         </div>
//
//                         {/* description */}
//                         <div className="rounded-xl border border-slate-200 p-3">
//                             <div className="mb-1 text-sm font-medium text-slate-900">Նկարագրություն (ոչ պարտադիր)</div>
//                             <textarea
//                                 rows={4}
//                                 className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
//                                 placeholder="Օգտակար ինֆո — ուղևորության մանրամասներ"
//                                 value={data.description || ""}
//                                 onChange={(e) => setData("description", e.target.value)}
//                             />
//                             {errors.description && <div className="mt-1 text-xs text-rose-600">{errors.description}</div>}
//                         </div>
//
//                         {/* amenities */}
//                         <div className="rounded-xl border border-slate-200 p-3">
//                             <div className="mb-2 flex items-center justify-between">
//                                 <div className="text-sm font-medium text-slate-900">Հարմարություններ</div>
//                                 <button type="button" onClick={() => setAmenityModal(true)} className="btn-primary">
//                                     Ընտրել
//                                 </button>
//                             </div>
//                             {data.amenities?.length > 0 ? (
//                                 <div className="flex flex-wrap gap-2">
//                                     {selectedAmenityNames.map((n, i) => (
//                                         <span key={i} className="chip chip-emerald">
//                       {n}
//                     </span>
//                                     ))}
//                                     {moreCount > 0 && <span className="text-xs text-slate-500">+{moreCount}</span>}
//                                 </div>
//                             ) : (
//                                 <div className="text-xs text-slate-500">Չկա ընտրված</div>
//                             )}
//                             {errors.amenities && <div className="mt-1 text-xs text-rose-600">{errors.amenities}</div>}
//                         </div>
//
//                         {/* actions */}
//                         <div className="flex flex-wrap gap-2">
//                             <button disabled={!canSubmit || processing} onClick={saveDraft} className="btn-primary">
//                                 Պահպանել (սևագիր)
//                             </button>
//                             <button disabled={!canSubmit || processing} onClick={publishNow} className="btn-outline-emerald">
//                                 Հրապարակել հիմա
//                             </button>
//                             {stopsMode && (
//                                 <button type="button" onClick={() => setStopsMode(false)} className="btn-secondary">
//                                     Վերադառնալ սկիզբ/վերջ
//                                 </button>
//                             )}
//                         </div>
//                     </form>
//
//                     {/* RIGHT: map + stops */}
//                     <div className="space-y-3">
//                         <div className="flex items-center gap-2 text-sm text-slate-700">
//                             <span className="opacity-70">Քարտեզի ռեժիմ՝</span>
//                             <div className="flex overflow-hidden rounded-xl border border-slate-300">
//                                 {["from", "stop", "to"].map((k) => (
//                                     <button
//                                         key={k}
//                                         type="button"
//                                         onClick={() => setMode(k)}
//                                         className={`px-3 py-1.5 ${mode === k ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white" : "bg-white hover:bg-slate-100"}`}
//                                     >
//                                         {k === "from" ? "Սկիզբ" : k === "to" ? "Վերջ" : "Կանգառ"}
//                                     </button>
//                                 ))}
//                             </div>
//                         </div>
//
//                         <div className="h-80 overflow-hidden rounded-2xl border border-slate-200 shadow">
//                             <MapWithStops
//                                 from={from}
//                                 to={to}
//                                 stops={stops}
//                                 setFrom={setFrom}
//                                 setTo={setTo}
//                                 setStops={setStops}
//                                 mode={mode}
//                                 setMode={setMode}
//                                 preview={previewStop}
//                                 setPreview={setPreviewStop}
//                             />
//                         </div>
//
//                         <StopsEditor
//                             stops={stops}
//                             setStops={setStops}
//                             allowTariffs={allowStopTariffs}
//                             typeKey={typeKeyFromData(data)}
//                         />
//                     </div>
//                 </div>
//             </section>
//
//             {amenityModal && (
//                 <AmenityPickerModal
//                     categories={cats}
//                     initialSelected={data.amenities || []}
//                     onClose={() => setAmenityModal(false)}
//                     onSave={(ids) => {
//                         setData("amenities", ids);
//                         setAmenityModal(false);
//                     }}
//                 />
//             )}
//         </DriverLayout>
//     );
// }
//
// /* ===== small UI ===== */
// function Input({ label, error, className = "", ...p }) {
//     return (
//         <label className="block text-sm">
//             <div className="mb-1 text-slate-700">{label}</div>
//             <input
//                 {...p}
//                 onChange={(e) => p.onChange(e.target.value)}
//                 className={`w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-emerald-500 ${className}`}
//             />
//             {error && <div className="mt-1 text-xs text-rose-600">{error}</div>}
//         </label>
//     );
// }
// function PayMethods({ value = [], onChange }) {
//     const toggle = (k) => onChange(value.includes(k) ? value.filter((i) => i !== k) : [...value, k]);
//     return (
//         <div className="rounded-xl border border-slate-200 p-3">
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
//                 active
//                     ? "border-emerald-400 bg-emerald-50 shadow-inner"
//                     : "border-slate-300 bg-white hover:bg-slate-50"
//             }`}
//         >
//             <div className="text-sm font-semibold text-slate-900">{title}</div>
//             <div className="text-xs text-slate-600">{desc}</div>
//         </button>
//     );
// }
// function TariffCard({ title, values, setValues, errors }) {
//     return (
//         <div className="rounded-xl border border-slate-200 p-3">
//             <div className="mb-2 text-sm font-semibold text-slate-900">{title}</div>
//             <div className="grid grid-cols-3 gap-2">
//                 <Input
//                     type="number"
//                     label="free_km"
//                     value={values.free_km ?? ""}
//                     onChange={(v) => setValues({ ...values, free_km: v })}
//                     error={errors.free_km}
//                 />
//                 <Input
//                     type="number"
//                     label="amd_per_km"
//                     value={values.amd_per_km ?? ""}
//                     onChange={(v) => setValues({ ...values, amd_per_km: v })}
//                     error={errors.amd_per_km}
//                 />
//                 <Input
//                     type="number"
//                     label="max_km"
//                     value={values.max_km ?? ""}
//                     onChange={(v) => setValues({ ...values, max_km: v })}
//                     error={errors.max_km}
//                 />
//             </div>
//             <div className="mt-1 text-[11px] text-slate-500">
//                 Թողեք դատարկ՝ եթե դաշտը պետք չէ. Null semantics: free=0, rate=null, max=null.
//             </div>
//         </div>
//     );
// }
// function DisabledCard({ text }) {
//     return (
//         <div className="grid place-items-center rounded-xl border border-dashed border-slate-300 p-3 text-xs text-slate-500">
//             {text}
//         </div>
//     );
// }
//
// /* ===== Stops helpers ===== */
// function StopAdder({ onLocate, onAdd }) {
//     const [q, setQ] = useState("");
//     const [locating, setLocating] = useState(false);
//     const [found, setFound] = useState(null);
//
//     async function locate() {
//         if (!q.trim()) return;
//         setLocating(true);
//         const g = await geocodeNominatim(q.trim());
//         setLocating(false);
//         if (!g) return alert("Չի գտնվել");
//         const addr = g.label || q.trim();
//         const p = { lng: g.lng, lat: g.lat, addr };
//         setFound(p);
//         onLocate && onLocate(p);
//     }
//     async function add() {
//         let p = found;
//         if (!p) {
//             if (!q.trim()) return;
//             const g = await geocodeNominatim(q.trim());
//             if (!g) return alert("Չի գտնվել");
//             p = { lng: g.lng, lat: g.lat, addr: g.label || q.trim() };
//         }
//         onAdd && onAdd({ ...p, name: "" });
//         setQ("");
//         setFound(null);
//         onLocate && onLocate(null);
//     }
//
//     return (
//         <div className="rounded-xl border border-slate-200 p-3">
//             <div className="mb-2 text-sm font-medium text-slate-900">Կանգառներ</div>
//             <div className="flex flex-col gap-2 sm:flex-row">
//                 <input
//                     className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
//                     placeholder="Գտնել կանգառ (հասցե)"
//                     value={q}
//                     onChange={(e) => setQ(e.target.value)}
//                 />
//                 <div className="flex gap-2">
//                     <button type="button" onClick={locate} disabled={locating} className="btn-secondary">
//                         {locating ? "Գտնում է…" : "Գտնել քարտեզում"}
//                     </button>
//                     <button type="button" onClick={add} className="btn-primary">
//                         Ավելացնել կանգառ
//                     </button>
//                 </div>
//             </div>
//             {found && <div className="mt-2 text-xs text-slate-600">Գտնված՝ {found.addr}</div>}
//             <div className="mt-2 text-xs text-slate-500">Կարող եք նաև սեղմել քարտեզի վրա «Կանգառ» ռեժիմում</div>
//         </div>
//     );
// }
//
// function StopsEditor({ stops, setStops, allowTariffs, typeKey }) {
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
//         <div className="rounded-xl border border-slate-200 p-3">
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
//             {stops.length === 0 && <div className="text-xs text-slate-500">Ավելացրեք կանգառ քարտեզից կամ որոնումով</div>}
//
//             <div className="space-y-2">
//                 {stops.map((s, i) => (
//                     <div key={i} className="flex flex-col gap-2 rounded-lg border border-slate-200 p-2 md:flex-row md:items-start">
//                         <div className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 text-xs font-semibold text-white">
//                             {i + 1}
//                         </div>
//                         <div className="flex-1">
//                             <input
//                                 className="mb-1 w-full rounded-lg border border-slate-300 px-2 py-1 text-sm outline-none focus:border-emerald-500"
//                                 placeholder="Անուն կանգառի (ոչ պարտադիր)"
//                                 value={s.name || ""}
//                                 onChange={(e) => edit(i, { name: e.target.value })}
//                             />
//                             <input
//                                 className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 outline-none focus:border-emerald-500"
//                                 placeholder="Հասցե"
//                                 value={s.addr || ""}
//                                 onChange={(e) => edit(i, { addr: e.target.value })}
//                             />
//                             <div className="mt-1 text-[11px] text-slate-500">
//                                 lng: {isFinite(s.lng) ? s.lng.toFixed(6) : "-"} · lat: {isFinite(s.lat) ? s.lat.toFixed(6) : "-"}
//                             </div>
//
//                             {allowTariffs && (
//                                 <div className="mt-2 grid grid-cols-3 gap-2">
//                                     <TariffMini
//                                         label="free_km"
//                                         value={s.free_km ?? ""}
//                                         onChange={(v) => edit(i, { free_km: v })}
//                                     />
//                                     <TariffMini
//                                         label="amd_per_km"
//                                         value={s.amd_per_km ?? ""}
//                                         onChange={(v) => edit(i, { amd_per_km: v })}
//                                     />
//                                     <TariffMini
//                                         label="max_km"
//                                         value={s.max_km ?? ""}
//                                         onChange={(v) => edit(i, { max_km: v })}
//                                     />
//                                 </div>
//                             )}
//                         </div>
//                         <div className="flex gap-1 md:flex-col">
//                             <button type="button" onClick={() => move(i, -1)} className="btn-ghost-xs">
//                                 ↑
//                             </button>
//                             <button type="button" onClick={() => move(i, 1)} className="btn-ghost-xs">
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
//                 className="w-full rounded-lg border border-slate-300 px-2 py-1 outline-none focus:border-emerald-500"
//             />
//         </label>
//     );
// }
//
// /* ===== Map (Leaflet + OSRM) ===== */
// import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from "react-leaflet";
// import L from "leaflet";
// import "leaflet/dist/leaflet.css";
//
// // Fix default marker icons when bundling
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
//       <div style="position:relative;width:14px;height:14px;border-radius:50%;
//                   box-shadow:0 0 0 2px #fff,0 0 0 4px ${color};background:${color};"></div>
//       ${
//         label !== null
//             ? `<div style="position:absolute;left:50%;top:0;transform:translate(-50%,-140%);font:600 11px/1 system-ui;padding:2px 6px;border-radius:8px;background:#fff;color:#065f46;border:1px solid rgba(5,150,105,.35);box-shadow:0 1px 2px rgba(0,0,0,.06)">${label}</div>`
//             : ""
//     }
//     `;
//     return L.divIcon({ html, className: "", iconSize: [14, 14], iconAnchor: [7, 7] });
// }
//
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
//
// function ClickCapture({ mode, setMode, setFrom, setTo, setStops, setPreview }) {
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
//                 setStops((arr) => [...arr, { ...p, addr: label, name: "" }].slice(0, 10));
//                 setPreview && setPreview(null);
//             }
//         },
//     });
//     return null;
// }
//
// function toPts(from, stops, to) {
//     const pts = [];
//     if (Number.isFinite(from?.lng) && Number.isFinite(from?.lat)) pts.push({ lng: from.lng, lat: from.lat });
//     (stops || []).forEach((s) => {
//         if (Number.isFinite(s.lng) && Number.isFinite(s.lat)) pts.push({ lng: s.lng, lat: s.lat });
//     });
//     if (Number.isFinite(to?.lng) && Number.isFinite(to?.lat)) pts.push({ lng: to.lng, lat: to.lat });
//     return pts;
// }
//
// export function MapWithStops({ from, to, stops, setFrom, setTo, setStops, mode, setMode, preview, setPreview }) {
//     const [routeCoords, setRouteCoords] = useState([]); // [{lat,lng}]
//     const [fallbackCoords, setFallbackCoords] = useState([]);
//
//     const pts = useMemo(() => toPts(from, stops, to), [from?.lng, from?.lat, to?.lng, to?.lat, JSON.stringify(stops)]);
//
//     useEffect(() => {
//         let cancelled = false;
//         (async () => {
//             if (pts.length < 2) {
//                 setRouteCoords([]);
//                 setFallbackCoords([]);
//                 return;
//             }
//             try {
//                 const r = await osrmRouteVia("driving", pts);
//                 if (cancelled) return;
//                 const coords = (r?.geometry?.coordinates || []).map(([lng, lat]) => ({ lat, lng }));
//                 setRouteCoords(coords);
//                 setFallbackCoords([]);
//             } catch {
//                 if (cancelled) return;
//                 setRouteCoords([]);
//                 setFallbackCoords(pts.map((p) => ({ lat: p.lat, lng: p.lng })));
//             }
//         })();
//         return () => {
//             cancelled = true;
//         };
//     }, [JSON.stringify(pts)]);
//
//     return (
//         <MapContainer center={[40.1792, 44.4991]} zoom={8} className="h-full w-full">
//             <TileLayer
//                 attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
//                 url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//             />
//
//             <ClickCapture mode={mode} setMode={setMode} setFrom={setFrom} setTo={setTo} setStops={setStops} setPreview={setPreview} />
//
//             {routeCoords.length > 1 && <Polyline positions={routeCoords.map((p) => [p.lat, p.lng])} weight={6} />}
//             {routeCoords.length === 0 && fallbackCoords.length > 1 && (
//                 <Polyline positions={fallbackCoords.map((p) => [p.lat, p.lng])} weight={4} />
//             )}
//
//             {Number.isFinite(from?.lng) && Number.isFinite(from?.lat) && (
//                 <Marker
//                     position={[from.lat, from.lng]}
//                     draggable={true}
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
//                         draggable={true}
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
//                     draggable={true}
//                     icon={mkDivIcon("#ef4444", "Վերջ")}
//                     eventHandlers={{
//                         dragend: async (e) => {
//                             const { lat, lng } = e.target.getLatLng();
//                             setTo((t) => ({ ...t, lat, lng }));
//                             const label = await reverseGeocodeNominatim(lng, lat);
//                             setTo((t) => ({ ...t, addr: label || t.addr }));
//                         },
//                     }}
//                 />
//             )}
//
//             {preview && Number.isFinite(preview.lng) && Number.isFinite(preview.lat) && (
//                 <Marker position={[preview.lat, preview.lng]} icon={mkDivIcon("#7c3aed")} />
//             )}
//
//             <FitTo pts={pts} routeCoords={routeCoords} />
//         </MapContainer>
//     );
// }
//
// /* ===== Amenity modal ===== */
// function AmenityPickerModal({ categories = [], initialSelected = [], onSave, onClose }) {
//     const [selected, setSelected] = useState(initialSelected || []);
//     useEffect(() => {
//         setSelected(initialSelected || []);
//     }, [initialSelected]);
//     const toggle = (id) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
//
//     return (
//         <div className="fixed inset-0 z-[9999] grid place-items-center bg-black/40 p-4" onClick={onClose}>
//             <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
//                 <div className="flex items-center justify-between border-b border-slate-200 p-4">
//                     <div className="text-sm font-semibold text-slate-900">Հարմարություններ</div>
//                     <button onClick={onClose} className="rounded px-2 py-1 text-sm text-slate-700 hover:bg-slate-100">
//                         Փակել
//                     </button>
//                 </div>
//                 <div className="max-h-[60vh] space-y-4 overflow-y-auto p-4">
//                     {categories.length === 0 && <div className="text-sm text-slate-500">Բեռնվում է…</div>}
//                     {categories.map((cat) => (
//                         <div key={cat.id} className="rounded-xl border border-slate-200 p-3">
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
//                 <div className="flex items-center justify-end gap-2 border-t border-slate-200 p-4">
//                     <button onClick={onClose} className="btn-secondary">
//                         Չեղարկել
//                     </button>
//                     <button onClick={() => onSave && onSave(selected)} className="btn-primary">
//                         Պահպանել
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// }
//
// /* ===== helpers ===== */
// function nzNum(v) {
//     if (v === "" || v === null || typeof v === "undefined") return null;
//     const n = parseFloat(v);
//     return Number.isFinite(n) ? n : null;
// }
// function nzInt(v) {
//     if (v === "" || v === null || typeof v === "undefined") return null;
//     const n = parseInt(v, 10);
//     return Number.isFinite(n) ? n : null;
// }
// function typeKeyFromData(d) {
//     if (d.type_ab_fixed) return "AB";
//     if (d.type_pax_to_pax) return "PAX_PAX";
//     if (d.type_pax_to_b) return "PAX_B";
//     if (d.type_a_to_pax) return "A_PAX";
//     return "UNKNOWN";
// }
//
// /* ===== tiny style helpers ===== */
// const btnBase = "rounded-xl px-4 py-2 font-semibold";
// const classes = `
// .btn-primary{ @apply rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2 font-semibold text-white shadow hover:brightness-95 disabled:opacity-50; }
// .btn-secondary{ @apply rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-100; }
// .btn-outline-emerald{ @apply rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50; }
// .btn-ghost-xs{ @apply rounded border border-slate-300 bg-white px-2 py-1 text-xs hover:bg-slate-100; }
// .chip{ @apply rounded-lg px-2 py-1 text-xs ring-1; }
// .chip-emerald{ @apply bg-emerald-50 text-emerald-700 ring-emerald-200; }
// `;
// /* If you don't use Tailwind's @apply in your setup, replace the classNames above with literal utility classes. */
// resources/js/Pages/Driver/MakeTrip.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "@inertiajs/react";
import dayjs from "dayjs";
import DriverLayout from "@/Layouts/DriverLayout";

/* ===== utils ===== */
const NOMI_LANG = "hy,ru,en";

async function geocodeNominatim(q) {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=${encodeURIComponent(
        NOMI_LANG
    )}&q=${encodeURIComponent(q || "")}`;
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
    if (!r.ok) throw new Error("OSRM " + r.status);
    const d = await r.json();
    return d?.routes?.[0] || null;
}

/* ===== amenity helpers ===== */
function useAmenityCatalog(initialCategories) {
    const [cats, setCats] = useState(initialCategories || null);
    useEffect(() => {
        if (initialCategories && initialCategories.length) return;
        let cancelled = false;
        (async () => {
            try {
                const r = await fetch("/amenities-catalog", { headers: { Accept: "application/json" } });
                if (!r.ok) return;
                const d = await r.json();
                if (!cancelled) setCats(d?.categories || []);
            } catch {}
        })();
        return () => {
            cancelled = true;
        };
    }, [initialCategories]);
    return cats || [];
}

function namesByIds(categories, ids) {
    const all = [];
    (categories || []).forEach((c) => (c.amenities || []).forEach((a) => all.push(a)));
    const map = Object.fromEntries(all.map((a) => [a.id, a.name]));
    return (ids || []).map((id) => map[id]).filter(Boolean);
}

/* ===== page ===== */
export default function MakeTrip({ vehicle, amenityCategories }) {
    const [from, setFrom] = useState({ lat: null, lng: null, addr: "" });
    const [to, setTo] = useState({ lat: null, lng: null, addr: "" });
    const [mode, setMode] = useState("from");
    const [stopsMode, setStopsMode] = useState(false);
    const [stops, setStops] = useState([]);
    const [previewStop, setPreviewStop] = useState(null);

    const cats = useAmenityCatalog(amenityCategories);
    const [amenityModal, setAmenityModal] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        vehicle_id: vehicle?.id ?? "",
        from_lat: "",
        from_lng: "",
        from_addr: "",
        to_lat: "",
        to_lng: "",
        to_addr: "",
        departure_at: dayjs().add(2, "hour").format("YYYY-MM-DDTHH:mm"),
        seats_total: vehicle?.seats ?? 4,
        price_amd: 2500,
        pay_methods: ["cash"],
        amenities: [],
        description: "",
        // types (ровно один true)
        type_ab_fixed: true,
        type_pax_to_pax: false,
        type_pax_to_b: false,
        type_a_to_pax: false,
        // trip tariffs
        start_free_km: "",
        start_amd_per_km: "",
        start_max_km: "",
        end_free_km: "",
        end_amd_per_km: "",
        end_max_km: "",
        // stops payload
        stops: [],
    });

    /* keep vehicle defaults synced */
    useEffect(() => {
        if (vehicle?.id)
            setData((d) => ({ ...d, vehicle_id: vehicle.id, seats_total: vehicle.seats || d.seats_total }));
    }, [vehicle?.id, vehicle?.seats, setData]);

    /* sync from/to into form */
    useEffect(() => {
        setData((d) => ({
            ...d,
            from_lat: Number.isFinite(from.lat) ? from.lat : "",
            from_lng: Number.isFinite(from.lng) ? from.lng : "",
            from_addr: from.addr || "",
        }));
    }, [from.lat, from.lng, from.addr, setData]);

    useEffect(() => {
        setData((d) => ({
            ...d,
            to_lat: Number.isFinite(to.lat) ? to.lat : "",
            to_lng: Number.isFinite(to.lng) ? to.lng : "",
            to_addr: to.addr || "",
        }));
    }, [to.lat, to.lng, to.addr, setData]);

    /* trip type helpers */
    function pickType(key) {
        const next = {
            type_ab_fixed: false,
            type_pax_to_pax: false,
            type_pax_to_b: false,
            type_a_to_pax: false,
        };
        next[key] = true;
        setData((d) => ({
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

    const showStartTariff = data.type_ab_fixed || data.type_a_to_pax;
    const showEndTariff = data.type_ab_fixed || data.type_pax_to_b;
    // const allowStopTariffs = !data.type_pax_to_pax;
    const allowStopTariffs = true;
    /* map stops -> payload */
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
        setData("stops", prepared);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(stops), allowStopTariffs]);

    const coordsReady =
        Number.isFinite(from.lat) && Number.isFinite(from.lng) && Number.isFinite(to.lat) && Number.isFinite(to.lng);
    const canSubmit = !!vehicle?.id && coordsReady;

    const saveDraft = (e) => {
        e.preventDefault();
        if (!canSubmit) return;
        post("/driver/trip", { preserveScroll: true });
    };

    const publishNow = (e) => {
        e.preventDefault();
        if (!canSubmit) return;
        post("/driver/trip/store-and-publish", { preserveScroll: true });
    };

    async function findFrom() {
        const r = await geocodeNominatim(from.addr || data.from_addr);
        if (!r) return alert("Չի գտնվել");
        setFrom({ lat: r.lat, lng: r.lng, addr: r.label || from.addr || data.from_addr });
        setMode("to");
    }
    async function findTo() {
        const r = await geocodeNominatim(to.addr || data.to_addr);
        if (!r) return alert("Չի գտնվել");
        setTo({ lat: r.lat, lng: r.lng, addr: r.label || to.addr || data.to_addr });
        setMode("stop");
    }

    const selectedAmenityNames = namesByIds(cats, data.amenities).slice(0, 3);
    const moreCount = Math.max(0, (data.amenities?.length || 0) - selectedAmenityNames.length);

    /* small UI class presets */
    const BTN = {
        primary:
            "rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2 font-semibold text-white shadow hover:brightness-95 disabled:opacity-50",
        secondary: "rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-100",
        outlineEmerald:
            "rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50",
        ghostXs: "rounded border border-slate-300 bg-white px-2 py-1 text-xs hover:bg-slate-100",
        chipEmerald: "rounded-lg px-2 py-1 text-xs ring-1 bg-emerald-50 text-emerald-700 ring-emerald-200",
    };

    return (
        <DriverLayout current="make-trip">
            <h1 className="mb-4 text-3xl font-extrabold text-slate-900">Ստեղծել ուղևորություն</h1>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
                <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
                    {/* LEFT: form */}
                    <form className="space-y-4">
                        {/* trip type */}
                        <div className="rounded-xl border border-slate-200 p-3">
                            <div className="mb-2 text-sm font-semibold text-slate-900">Տիպ (rovno odin true)</div>
                            <div className="grid gap-2 sm:grid-cols-2">
                                <TypeBtn
                                    active={data.type_ab_fixed}
                                    onClick={() => pickType("type_ab_fixed")}
                                    title="A → B (ֆիքս)"
                                    desc="Սկիզբ և վերջ ֆիքս. Քա՛ղաք → Քա՛ղաք"
                                />
                                <TypeBtn
                                    active={data.type_pax_to_pax}
                                    onClick={() => pickType("type_pax_to_pax")}
                                    title="PAX → PAX"
                                    desc="Վերցնել/թողնել կոնկրետ հասցեներով"
                                />
                                <TypeBtn
                                    active={data.type_pax_to_b}
                                    onClick={() => pickType("type_pax_to_b")}
                                    title="PAX → B (ֆիքս վերջ)"
                                    desc="Սկիզբը ազատ կորիդոր, վերջը ֆիքս"
                                />
                                <TypeBtn
                                    active={data.type_a_to_pax}
                                    onClick={() => pickType("type_a_to_pax")}
                                    title="A (ֆիքս սկիզբ) → PAX"
                                    desc="Սկիզբը ֆիքս, վերջը ըստ ուղևորների"
                                />
                            </div>
                            <div className="mt-2 text-[11px] text-slate-500">
                                PAX→PAX — trip-տարിഫներ անջատված. Stop-տարిఫներ թույլատրված՝ {allowStopTariffs ? "այո" : "ոչ"}.
                            </div>
                        </div>

                        {/* from/to */}
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <Input
                                label="Սկիզբ (հասցե)"
                                value={from.addr}
                                onChange={(v) => setFrom((p) => ({ ...p, addr: v }))}
                                error={errors.from_addr}
                            />
                            <Input
                                label="Վերջ (հասցե)"
                                value={to.addr}
                                onChange={(v) => setTo((p) => ({ ...p, addr: v }))}
                                error={errors.to_addr}
                            />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={findFrom} className={BTN.secondary}>
                                Գտնել սկիզբ
                            </button>
                            <button type="button" onClick={findTo} className={BTN.secondary}>
                                Գտնել վերջ
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setStopsMode(true);
                                    setMode("stop");
                                }}
                                className={BTN.secondary}
                            >
                                Ավելացնել կանգառներ
                            </button>
                        </div>

                        {/* when adding stops inline search */}
                        {stopsMode && (
                            <StopAdder
                                onLocate={(p) => setPreviewStop(p)}
                                onAdd={(p) => {
                                    setStops((arr) => [...arr, p].slice(0, 10));
                                    setPreviewStop(null);
                                }}
                            />
                        )}

                        {/* schedule+price+seats+pay */}
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <Input
                                type="datetime-local"
                                label="Ելքի ժամանակ"
                                value={data.departure_at}
                                onChange={(v) => setData("departure_at", v)}
                                error={errors.departure_at}
                            />
                            <Input
                                type="number"
                                label="Մեկ նստատեղի գին (AMD)"
                                value={data.price_amd}
                                onChange={(v) => setData("price_amd", v)}
                                error={errors.price_amd}
                            />
                        </div>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <Input
                                type="number"
                                label="Տեղերի քանակ"
                                value={data.seats_total}
                                onChange={(v) => setData("seats_total", v)}
                                error={errors.seats_total}
                            />
                            <PayMethods value={data.pay_methods} onChange={(arr) => setData("pay_methods", arr)} />
                        </div>

                        {/* tariffs */}
                        <div className="grid gap-3 lg:grid-cols-2">
                            {showStartTariff ? (
                                <TariffCard
                                    title="Տարિફ — Սկիզբ A"
                                    values={{
                                        free_km: data.start_free_km,
                                        amd_per_km: data.start_amd_per_km,
                                        max_km: data.start_max_km,
                                    }}
                                    setValues={(v) => {
                                        setData("start_free_km", v.free_km);
                                        setData("start_amd_per_km", v.amd_per_km);
                                        setData("start_max_km", v.max_km);
                                    }}
                                    errors={{
                                        free_km: errors.start_free_km,
                                        amd_per_km: errors.start_amd_per_km,
                                        max_km: errors.start_max_km,
                                    }}
                                />
                            ) : (
                                <DisabledCard text="Սկզբի տարածքը չի մոնետիզացվում այս տիպի համար" />
                            )}

                            {showEndTariff ? (
                                <TariffCard
                                    title="Տարિફ — Վերջ B"
                                    values={{
                                        free_km: data.end_free_km,
                                        amd_per_km: data.end_amd_per_km,
                                        max_km: data.end_max_km,
                                    }}
                                    setValues={(v) => {
                                        setData("end_free_km", v.free_km);
                                        setData("end_amd_per_km", v.amd_per_km);
                                        setData("end_max_km", v.max_km);
                                    }}
                                    errors={{
                                        free_km: errors.end_free_km,
                                        amd_per_km: errors.end_amd_per_km,
                                        max_km: errors.end_max_km,
                                    }}
                                />
                            ) : (
                                <DisabledCard text="Վերջի տարածքը չի մոնետիզացվում այս տիպի համար" />
                            )}
                        </div>

                        {/* description */}
                        <div className="rounded-xl border border-slate-200 p-3">
                            <div className="mb-1 text-sm font-medium text-slate-900">Նկարագրություն (ոչ պարտադիր)</div>
                            <textarea
                                rows={4}
                                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                                placeholder="Օգտակար ինֆո — ուղևորության մանրամասներ"
                                value={data.description || ""}
                                onChange={(e) => setData("description", e.target.value)}
                            />
                            {errors.description && <div className="mt-1 text-xs text-rose-600">{errors.description}</div>}
                        </div>

                        {/* amenities */}
                        <div className="rounded-xl border border-slate-200 p-3">
                            <div className="mb-2 flex items-center justify-between">
                                <div className="text-sm font-medium text-slate-900">Հարմարություններ</div>
                                <button type="button" onClick={() => setAmenityModal(true)} className={BTN.primary}>
                                    Ընտրել
                                </button>
                            </div>
                            {data.amenities?.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {selectedAmenityNames.map((n, i) => (
                                        <span key={i} className={BTN.chipEmerald}>
                      {n}
                    </span>
                                    ))}
                                    {moreCount > 0 && <span className="text-xs text-slate-500">+{moreCount}</span>}
                                </div>
                            ) : (
                                <div className="text-xs text-slate-500">Չկա ընտրված</div>
                            )}
                            {errors.amenities && <div className="mt-1 text-xs text-rose-600">{errors.amenities}</div>}
                        </div>

                        {/* actions */}
                        <div className="flex flex-wrap gap-2">
                            <button disabled={!canSubmit || processing} onClick={saveDraft} className={BTN.primary}>
                                Պահպանել (սևագիր)
                            </button>
                            <button disabled={!canSubmit || processing} onClick={publishNow} className={BTN.outlineEmerald}>
                                Հրապարակել հիմա
                            </button>
                            {stopsMode && (
                                <button type="button" onClick={() => setStopsMode(false)} className={BTN.secondary}>
                                    Վերադառնալ սկիզբ/վերջ
                                </button>
                            )}
                        </div>
                    </form>

                    {/* RIGHT: map + stops */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                            <span className="opacity-70">Քարտեզի ռեժիմ՝</span>
                            <div className="flex overflow-hidden rounded-xl border border-slate-300">
                                {["from", "stop", "to"].map((k) => (
                                    <button
                                        key={k}
                                        type="button"
                                        onClick={() => setMode(k)}
                                        className={`px-3 py-1.5 ${
                                            mode === k
                                                ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white"
                                                : "bg-white hover:bg-slate-100"
                                        }`}
                                    >
                                        {k === "from" ? "Սկիզբ" : k === "to" ? "Վերջ" : "Կանգառ"}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="h-80 overflow-hidden rounded-2xl border border-slate-200 shadow">
                            <MapWithStops
                                from={from}
                                to={to}
                                stops={stops}
                                setFrom={setFrom}
                                setTo={setTo}
                                setStops={setStops}
                                mode={mode}
                                setMode={setMode}
                                preview={previewStop}
                                setPreview={setPreviewStop}
                            />
                        </div>

                        <StopsEditor
                            stops={stops}
                            setStops={setStops}
                            allowTariffs={allowStopTariffs}
                            typeKey={typeKeyFromData(data)}
                            BTN={BTN}
                        />
                    </div>
                </div>
            </section>

            {amenityModal && (
                <AmenityPickerModal
                    categories={cats}
                    initialSelected={data.amenities || []}
                    onClose={() => setAmenityModal(false)}
                    onSave={(ids) => {
                        setData("amenities", ids);
                        setAmenityModal(false);
                    }}
                />
            )}
        </DriverLayout>
    );
}

/* ===== small UI ===== */
function Input({ label, error, className = "", ...p }) {
    return (
        <label className="block text-sm">
            <div className="mb-1 text-slate-700">{label}</div>
            <input
                {...p}
                onChange={(e) => p.onChange(e.target.value)}
                className={`w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-emerald-500 ${className}`}
            />
            {error && <div className="mt-1 text-xs text-rose-600">{error}</div>}
        </label>
    );
}

function PayMethods({ value = [], onChange }) {
    const toggle = (k) => onChange(value.includes(k) ? value.filter((i) => i !== k) : [...value, k]);
    return (
        <div className="rounded-xl border border-slate-200 p-3">
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

function TariffCard({ title, values, setValues, errors }) {
    return (
        <div className="rounded-xl border border-slate-200 p-3">
            <div className="mb-2 text-sm font-semibold text-slate-900">{title}</div>
            <div className="grid grid-cols-3 gap-2">
                <Input
                    type="number"
                    label="free_km"
                    value={values.free_km ?? ""}
                    onChange={(v) => setValues({ ...values, free_km: v })}
                    error={errors.free_km}
                />
                <Input
                    type="number"
                    label="amd_per_km"
                    value={values.amd_per_km ?? ""}
                    onChange={(v) => setValues({ ...values, amd_per_km: v })}
                    error={errors.amd_per_km}
                />
                <Input
                    type="number"
                    label="max_km"
                    value={values.max_km ?? ""}
                    onChange={(v) => setValues({ ...values, max_km: v })}
                    error={errors.max_km}
                />
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
                Թողեք դատարկ՝ եթե դաշտը պետք չէ. Null semantics: free=0, rate=null, max=null.
            </div>
        </div>
    );
}

function DisabledCard({ text }) {
    return (
        <div className="grid place-items-center rounded-xl border border-dashed border-slate-300 p-3 text-xs text-slate-500">
            {text}
        </div>
    );
}

/* ===== Stops helpers ===== */
function StopAdder({ onLocate, onAdd }) {
    const [q, setQ] = useState("");
    const [locating, setLocating] = useState(false);
    const [found, setFound] = useState(null);

    async function locate() {
        if (!q.trim()) return;
        setLocating(true);
        const g = await geocodeNominatim(q.trim());
        setLocating(false);
        if (!g) return alert("Չի գտնվել");
        const addr = g.label || q.trim();
        const p = { lng: g.lng, lat: g.lat, addr };
        setFound(p);
        onLocate && onLocate(p);
    }

    async function add() {
        let p = found;
        if (!p) {
            if (!q.trim()) return;
            const g = await geocodeNominatim(q.trim());
            if (!g) return alert("Չի գտնվել");
            p = { lng: g.lng, lat: g.lat, addr: g.label || q.trim() };
        }
        onAdd && onAdd({ ...p, name: "" });
        setQ("");
        setFound(null);
        onLocate && onLocate(null);
    }

    return (
        <div className="rounded-xl border border-slate-200 p-3">
            <div className="mb-2 text-sm font-medium text-slate-900">Կանգառներ</div>
            <div className="flex flex-col gap-2 sm:flex-row">
                <input
                    className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                    placeholder="Գտնել կանգառ (հասցե)"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                />
                <div className="flex gap-2">
                    <button type="button" onClick={locate} disabled={locating} className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-100">
                        {locating ? "Գտնում է…" : "Գտնել քարտեզում"}
                    </button>
                    <button type="button" onClick={add} className="rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2 font-semibold text-white shadow hover:brightness-95">
                        Ավելացնել կանգառ
                    </button>
                </div>
            </div>
            {found && <div className="mt-2 text-xs text-slate-600">Գտնված՝ {found.addr}</div>}
            <div className="mt-2 text-xs text-slate-500">Կարող եք նաև սեղմել քարտեզի վրա «Կանգառ» ռեժիմում</div>
        </div>
    );
}

function StopsEditor({ stops, setStops, allowTariffs, typeKey, BTN }) {
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
        <div className="rounded-xl border border-slate-200 p-3">
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

            {stops.length === 0 && <div className="text-xs text-slate-500">Ավելացրեք կանգառ քարտեզից կամ որոնումով</div>}

            <div className="space-y-2">
                {stops.map((s, i) => (
                    <div key={i} className="flex flex-col gap-2 rounded-lg border border-slate-200 p-2 md:flex-row md:items-start">
                        <div className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 text-xs font-semibold text-white">
                            {i + 1}
                        </div>
                        <div className="flex-1">
                            <input
                                className="mb-1 w-full rounded-lg border border-slate-300 px-2 py-1 text-sm outline-none focus:border-emerald-500"
                                placeholder="Անուն կանգառի (ոչ պարտադիր)"
                                value={s.name || ""}
                                onChange={(e) => edit(i, { name: e.target.value })}
                            />
                            <input
                                className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 outline-none focus:border-emerald-500"
                                placeholder="Հասցե"
                                value={s.addr || ""}
                                onChange={(e) => edit(i, { addr: e.target.value })}
                            />
                            <div className="mt-1 text-[11px] text-slate-500">
                                lng: {isFinite(s.lng) ? s.lng.toFixed(6) : "-"} · lat: {isFinite(s.lat) ? s.lat.toFixed(6) : "-"}
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
                            <button type="button" onClick={() => move(i, -1)} className={BTN.ghostXs}>
                                ↑
                            </button>
                            <button type="button" onClick={() => move(i, 1)} className={BTN.ghostXs}>
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
                className="w-full rounded-lg border border-slate-300 px-2 py-1 outline-none focus:border-emerald-500"
            />
        </label>
    );
}

/* ===== Map (Leaflet + OSRM) ===== */
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons when bundling
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

function ClickCapture({ mode, setMode, setFrom, setTo, setStops, setPreview }) {
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
                setStops((arr) => [...arr, { ...p, addr: label, name: "" }].slice(0, 10));
                setPreview && setPreview(null);
            }
        },
    });
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

export function MapWithStops({ from, to, stops, setFrom, setTo, setStops, mode, setMode, preview, setPreview }) {
    const [routeCoords, setRouteCoords] = useState([]); // [{lat,lng}]
    const [fallbackCoords, setFallbackCoords] = useState([]);

    const pts = useMemo(() => toPts(from, stops, to), [from?.lng, from?.lat, to?.lng, to?.lat, JSON.stringify(stops)]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (pts.length < 2) {
                setRouteCoords([]);
                setFallbackCoords([]);
                return;
            }
            try {
                const r = await osrmRouteVia("driving", pts);
                if (cancelled) return;
                const coords = (r?.geometry?.coordinates || []).map(([lng, lat]) => ({ lat, lng }));
                setRouteCoords(coords);
                setFallbackCoords([]);
            } catch {
                if (cancelled) return;
                setRouteCoords([]);
                setFallbackCoords(pts.map((p) => ({ lat: p.lat, lng: p.lng })));
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [JSON.stringify(pts)]);

    return (
        <MapContainer center={[40.1792, 44.4991]} zoom={8} className="h-full w-full">
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <ClickCapture mode={mode} setMode={setMode} setFrom={setFrom} setTo={setTo} setStops={setStops} setPreview={setPreview} />

            {routeCoords.length > 1 && <Polyline positions={routeCoords.map((p) => [p.lat, p.lng])} weight={6} />}
            {routeCoords.length === 0 && fallbackCoords.length > 1 && (
                <Polyline positions={fallbackCoords.map((p) => [p.lat, p.lng])} weight={4} />
            )}

            {Number.isFinite(from?.lng) && Number.isFinite(from?.lat) && (
                <Marker
                    position={[from.lat, from.lng]}
                    draggable={true}
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
                        draggable={true}
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
                    draggable={true}
                    icon={mkDivIcon("#ef4444", "Վերջ")}
                    eventHandlers={{
                        dragend: async (e) => {
                            const { lat, lng } = e.target.getLatLng();
                            setTo((t) => ({ ...t, lat, lng }));
                            const label = await reverseGeocodeNominatim(lng, lat);
                            setTo((t) => ({ ...t, addr: label || t.addr }));
                        },
                    }}
                />
            )}

            {preview && Number.isFinite(preview.lng) && Number.isFinite(preview.lat) && (
                <Marker position={[preview.lat, preview.lng]} icon={mkDivIcon("#7c3aed")} />
            )}

            <FitTo pts={pts} routeCoords={routeCoords} />
        </MapContainer>
    );
}

/* ===== Amenity modal ===== */
function AmenityPickerModal({ categories = [], initialSelected = [], onSave, onClose }) {
    const [selected, setSelected] = useState(initialSelected || []);
    useEffect(() => {
        setSelected(initialSelected || []);
    }, [initialSelected]);
    const toggle = (id) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

    return (
        <div className="fixed inset-0 z-[9999] grid place-items-center bg-black/40 p-4" onClick={onClose}>
            <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-slate-200 p-4">
                    <div className="text-sm font-semibold text-slate-900">Հարմարություններ</div>
                    <button onClick={onClose} className="rounded px-2 py-1 text-sm text-slate-700 hover:bg-slate-100">
                        Փակել
                    </button>
                </div>
                <div className="max-h-[60vh] space-y-4 overflow-y-auto p-4">
                    {categories.length === 0 && <div className="text-sm text-slate-500">Բեռնվում է…</div>}
                    {categories.map((cat) => (
                        <div key={cat.id} className="rounded-xl border border-slate-200 p-3">
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
                <div className="flex items-center justify-end gap-2 border-t border-slate-200 p-4">
                    <button onClick={onClose} className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-100">
                        Չեղարկել
                    </button>
                    <button onClick={() => onSave && onSave(selected)} className="rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2 font-semibold text-white shadow hover:brightness-95">
                        Պահպանել
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ===== helpers ===== */
function nzNum(v) {
    if (v === "" || v === null || typeof v === "undefined") return null;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
}
function nzInt(v) {
    if (v === "" || v === null || typeof v === "undefined") return null;
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
}
function typeKeyFromData(d) {
    if (d.type_ab_fixed) return "AB";
    if (d.type_pax_to_pax) return "PAX_PAX";
    if (d.type_pax_to_b) return "PAX_B";
    if (d.type_a_to_pax) return "A_PAX";
    return "UNKNOWN";
}
