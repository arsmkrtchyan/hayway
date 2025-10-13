// import React, { useEffect, useMemo, useState } from "react";
// import { router } from "@inertiajs/react";
// import CompanyLayout from "./Layout";
// import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from "react-leaflet";
// import "leaflet/dist/leaflet.css";
// import dayjs from "dayjs";
// import L from "leaflet";
//
// // Leaflet marker fix
// const DefaultIcon = L.icon({
//     iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
//     shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
// });
// L.Marker.prototype.options.icon = DefaultIcon;
//
// export default function Trips({ company, trips, vehicles, drivers }) {
//     // адреса как текст
//     const [fromAddr, setFromAddr] = useState("");
//     const [toAddr, setToAddr] = useState("");
//
//     // координаты — обязательны
//     const [from, setFrom] = useState({ lat: null, lng: null });
//     const [to, setTo] = useState({ lat: null, lng: null });
//
//     // кого ставим кликом: from или to
//     const [which, setWhich] = useState("from");
//
//     const [form, setForm] = useState({
//         vehicle_id: vehicles[0]?.id || "",
//         assigned_driver_id: drivers[0]?.id || "",
//         from_addr: "",
//         to_addr: "",
//         from_lat: "",
//         from_lng: "",
//         to_lat: "",
//         to_lng: "",
//         price_amd: 2500,
//         seats_total: 4,
//         departure_at: "",
//         pay_methods: ["cash"],
//     });
//
//     // синхронизация адресов и координат в form перед отправкой
//     useEffect(() => {
//         setForm((s) => ({ ...s, from_addr: fromAddr, to_addr: toAddr }));
//     }, [fromAddr, toAddr]);
//
//     useEffect(() => {
//         setForm((s) => ({
//             ...s,
//             from_lat: from.lat ?? "",
//             from_lng: from.lng ?? "",
//         }));
//     }, [from.lat, from.lng]);
//
//     useEffect(() => {
//         setForm((s) => ({
//             ...s,
//             to_lat: to.lat ?? "",
//             to_lng: to.lng ?? "",
//         }));
//     }, [to.lat, to.lng]);
//
//     function submit(e) {
//         e.preventDefault();
//
//         // Жесткая валидация на фронте, чтобы не слать пустые координаты
//         const hasFrom =
//             Number.isFinite(Number(form.from_lat)) && Number.isFinite(Number(form.from_lng));
//         const hasTo =
//             Number.isFinite(Number(form.to_lat)) && Number.isFinite(Number(form.to_lng));
//
//         if (!hasFrom || !hasTo) {
//             alert("Քարտեզի վրա ընտրիր «Որտեղից» և «Ուր» կետերը (երկու նշան)");
//             return;
//         }
//
//         // Нормализуем типы
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
//             departure_at: form.departure_at, // "YYYY-MM-DDTHH:mm"
//         };
//
//         router.post(route("company.trips.store", company.id), payload, { preserveScroll: true });
//     }
//
//     // центр карты — если точек нет, ставим в центр Армении
//     const center = useMemo(() => {
//         if (
//             Number.isFinite(from.lat) &&
//             Number.isFinite(from.lng) &&
//             Number.isFinite(to.lat) &&
//             Number.isFinite(to.lng)
//         ) {
//             return [(from.lat + to.lat) / 2, (from.lng + to.lng) / 2];
//         }
//         return [40.3, 44.3];
//     }, [from, to]);
//
//     return (
//         <CompanyLayout company={company} current="trips">
//             <h1 className="mb-4 text-2xl font-bold">Երթուղիներ</h1>
//
//             {/* Форма создания */}
//             <form
//                 onSubmit={submit}
//                 className="mb-6 grid gap-4 rounded-2xl border bg-white p-4 lg:grid-cols-2"
//             >
//                 {/* Левая колонка: поля */}
//                 <div className="space-y-3">
//                     <Select
//                         label="Մեքենա"
//                         value={form.vehicle_id}
//                         onChange={(v) => setForm((s) => ({ ...s, vehicle_id: v }))}
//                         options={vehicles.map((v) => ({
//                             v: v.id,
//                             t: `${v.brand} ${v.model} · ${v.plate}`,
//                         }))}
//                     />
//
//                     <Select
//                         label="Վարորդ"
//                         value={form.assigned_driver_id}
//                         onChange={(v) => setForm((s) => ({ ...s, assigned_driver_id: v }))}
//                         options={drivers.map((d) => ({ v: d.id, t: d.name }))}
//                     />
//
//                     <Input label="Որտեղից (հասցե)" value={fromAddr} onChange={setFromAddr} />
//                     <Input label="Ուր (հասցե)" value={toAddr} onChange={setToAddr} />
//
//                     <div className="grid grid-cols-2 gap-3">
//                         <Input
//                             type="datetime-local"
//                             label="Մեկնման ժամանակ"
//                             value={form.departure_at}
//                             onChange={(v) => setForm((s) => ({ ...s, departure_at: v }))}
//                         />
//                         <Input
//                             type="number"
//                             label="Գին (AMD)"
//                             value={form.price_amd}
//                             onChange={(v) => setForm((s) => ({ ...s, price_amd: Number(v) || 0 }))}
//                         />
//                     </div>
//
//                     <div className="grid grid-cols-2 gap-3">
//                         <Input
//                             type="number"
//                             label="Տեղերի թիվ"
//                             value={form.seats_total}
//                             onChange={(v) => setForm((s) => ({ ...s, seats_total: Number(v) || 1 }))}
//                         />
//                         <PayMethods
//                             value={form.pay_methods}
//                             onChange={(arr) => setForm((s) => ({ ...s, pay_methods: arr }))}
//                         />
//                     </div>
//
//                     {/* Координаты read-only для контроля */}
//                     <div className="grid grid-cols-2 gap-3 text-xs text-black/70">
//                         <div className="rounded-xl border p-3">
//                             <div className="font-medium">Ընտրված «Որտեղից»</div>
//                             <div>lat: {from.lat ?? "—"}</div>
//                             <div>lng: {from.lng ?? "—"}</div>
//                         </div>
//                         <div className="rounded-xl border p-3">
//                             <div className="font-medium">Ընտրված «Ուր»</div>
//                             <div>lat: {to.lat ?? "—"}</div>
//                             <div>lng: {to.lng ?? "—"}</div>
//                         </div>
//                     </div>
//
//                     <button className="w-full rounded-xl bg-black px-4 py-2 font-semibold text-[#ffdd2c]">
//                         Ստեղծել երթուղի
//                     </button>
//                     <div className="text-sm text-black/60">
//                         Քարտեզի վրա սեղմիր՝ նախ «Որտեղից», ապա «Ուր» կետերը: Կոորդինատները պարտադիր են։
//                     </div>
//                 </div>
//
//                 {/* Правая колонка: карта */}
//                 <div className="space-y-2">
//                     <ToggleWhich which={which} setWhich={setWhich} />
//                     <div className="h-96 overflow-hidden rounded-2xl border">
//                         <MapPick
//                             center={center}
//                             from={from}
//                             to={to}
//                             which={which}
//                             setFrom={setFrom}
//                             setTo={setTo}
//                             setWhich={setWhich}
//                         />
//                     </div>
//                 </div>
//             </form>
//
//             {/* Список уже созданных рейсов */}
//             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
//                 {trips.map((t) => {
//                     const seatsTaken = t.seats_taken ?? 0;
//                     const seatsTotal = t.seats_total ?? 0;
//                     const seatsLeft = Math.max(0, seatsTotal - seatsTaken);
//                     const canPublish = t.status === "draft" && seatsLeft > 0;
//
//                     const badgeCls =
//                         t.status === "published"
//                             ? "bg-emerald-100 text-emerald-700"
//                             : t.status === "draft"
//                                 ? "bg-amber-100 text-amber-700"
//                                 : t.status === "archived"
//                                     ? "bg-slate-100 text-slate-700"
//                                     : "bg-rose-100 text-rose-700";
//                     const statusLabel = (s) =>
//                         ({ draft: "Սևագիր", published: "Հրապարակված", archived: "Արխիվ" }[s] || s);
//
//                     return (
//                         <div key={t.id} className="rounded-2xl border bg-white p-4">
//                             <div className="text-sm text-black/60">
//                                 {t.vehicle?.brand} {t.vehicle?.model} · {t.vehicle?.plate}
//                             </div>
//                             <div className="mt-1 font-semibold">
//                                 {t.from_addr} → {t.to_addr}
//                             </div>
//                             <div className="text-sm text-black/70">
//                                 Գին՝ {new Intl.NumberFormat("hy-AM").format(t.price_amd)} AMD
//                             </div>
//                             <div className="text-sm text-black/70">
//                                 Տեղեր՝ {seatsTaken}/{seatsTotal}
//                             </div>
//                             <div className="text-sm text-black/70">
//                                 Մեկնում՝ {t.departure_at ? dayjs(t.departure_at).format("YYYY-MM-DD HH:mm") : "—"}
//                             </div>
//
//                             <div className="mt-2 flex items-center gap-2">
//                 <span className={`text-xs px-2 py-1 rounded ${badgeCls}`}>
//                   {statusLabel(t.status)}
//                 </span>
//                                 <span className="text-xs text-black/60">
//                   Սպասվող հայտեր՝ {t.pending_requests_count} · Հաստատված՝{" "}
//                                     {t.accepted_requests_count}
//                 </span>
//                             </div>
//
//                             <div className="mt-3 flex flex-wrap gap-2">
//                                 {canPublish && (
//                                     <button
//                                         onClick={() =>
//                                             router.post(route("company.trips.publish", [company.id, t.id]), {}, { preserveScroll: true })
//                                         }
//                                         className="rounded border border-black/10 bg-[#ffdd2c] px-3 py-1.5 text-black"
//                                     >
//                                         Հրապարակել
//                                     </button>
//                                 )}
//
//                                 {t.status !== "archived" && (
//                                     <button
//                                         onClick={() =>
//                                             router.post(route("company.trips.archive", [company.id, t.id]), {}, { preserveScroll: true })
//                                         }
//                                         className="rounded bg-black px-3 py-1.5 text-[#ffdd2c]"
//                                     >
//                                         Արխիվացնել
//                                     </button>
//                                 )}
//
//                                 {t.status === "archived" && (
//                                     <button
//                                         onClick={() =>
//                                             router.post(route("company.trips.unarchive", [company.id, t.id]), {}, { preserveScroll: true })
//                                         }
//                                         className="rounded bg-slate-200 px-3 py-1.5 text-slate-900"
//                                     >
//                                         Վերադարձնել (սևագիր)
//                                     </button>
//                                 )}
//                             </div>
//                         </div>
//                     );
//                 })}
//                 {trips.length === 0 && (
//                     <div className="md:col-span-2 rounded-2xl border bg-white p-6 text-center text-black/60">
//                         Դատարկ է
//                     </div>
//                 )}
//             </div>
//         </CompanyLayout>
//     );
// }
//
// function ToggleWhich({ which, setWhich }) {
//     return (
//         <div className="flex items-center gap-2 text-sm">
//             <span className="text-black/70">Ընտրում ես՝</span>
//             <button
//                 type="button"
//                 onClick={() => setWhich("from")}
//                 className={`rounded-lg px-3 py-1.5 ${which === "from" ? "bg-black text-[#ffdd2c]" : "border"}`}
//             >
//                 Որտեղից
//             </button>
//             <button
//                 type="button"
//                 onClick={() => setWhich("to")}
//                 className={`rounded-lg px-3 py-1.5 ${which === "to" ? "bg-black text-[#ffdd2c]" : "border"}`}
//             >
//                 Ուր
//             </button>
//             <span className="text-black/50">Քարտեզի վրա սեղմիր մարկեր դնելու համար</span>
//         </div>
//     );
// }
//
// function MapPick({ center, from, to, which, setFrom, setTo, setWhich }) {
//     function Clicker() {
//         useMapEvents({
//             click(e) {
//                 const { lat, lng } = e.latlng;
//                 if (which === "from") {
//                     setFrom({ lat, lng });
//                     setWhich("to");
//                 } else {
//                     setTo({ lat, lng });
//                     setWhich("from");
//                 }
//             },
//         });
//         return null;
//     }
//
//     const line =
//         Number.isFinite(from.lat) &&
//         Number.isFinite(from.lng) &&
//         Number.isFinite(to.lat) &&
//         Number.isFinite(to.lng)
//             ? [
//                 [from.lat, from.lng],
//                 [to.lat, to.lng],
//             ]
//             : null;
//
//     return (
//         <MapContainer center={center} zoom={8} style={{ height: "100%" }}>
//             <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
//             {Number.isFinite(from.lat) && Number.isFinite(from.lng) && (
//                 <Marker position={[from.lat, from.lng]} />
//             )}
//             {Number.isFinite(to.lat) && Number.isFinite(to.lng) && (
//                 <Marker position={[to.lat, to.lng]} />
//             )}
//             {line && <Polyline positions={line} />}
//             <Clicker />
//         </MapContainer>
//     );
// }
//
// function PayMethods({ value = [], onChange }) {
//     const toggle = (k) => onChange(value.includes(k) ? value.filter((i) => i !== k) : [...value, k]);
//     return (
//         <div className="rounded-xl border p-3">
//             <div className="mb-2 text-sm font-medium text-black">Վճարման եղանակ</div>
//             <div className="flex gap-3 text-sm">
//                 <label className="inline-flex items-center gap-2">
//                     <input type="checkbox" checked={value.includes("cash")} onChange={() => toggle("cash")} />{" "}
//                     Կանխիկ
//                 </label>
//                 <label className="inline-flex items-center gap-2">
//                     <input type="checkbox" checked={value.includes("card")} onChange={() => toggle("card")} />{" "}
//                     Քարտ
//                 </label>
//             </div>
//         </div>
//     );
// }
//
// function Input({ label, value, onChange, type = "text" }) {
//     return (
//         <label className="block text-sm">
//             <div className="mb-1 text-black/70">{label}</div>
//             <input
//                 type={type}
//                 value={value}
//                 onChange={(e) => onChange(e.target.value)}
//                 className="w-full rounded-xl border px-3 py-2"
//             />
//         </label>
//     );
// }
//
// function Select({ label, value, onChange, options }) {
//     return (
//         <label className="block text-sm">
//             <div className="mb-1 text-black/70">{label}</div>
//             <select
//                 value={value}
//                 onChange={(e) => onChange(e.target.value)}
//                 className="w-full rounded-xl border px-3 py-2"
//             >
//                 {options.map((o) => (
//                     <option key={o.v} value={o.v}>
//                         {o.t}
//                     </option>
//                 ))}
//             </select>
//         </label>
//     );
// }
import React, { useEffect, useMemo, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import dayjs from "dayjs";
import CompanyLayout from "./Layout";

/* ==== Тема / палитра ==== */
const brand = {
    grad: "from-emerald-600 via-teal-600 to-cyan-600",
    btn: "bg-gradient-to-r from-emerald-600 to-cyan-600",
    btnHover: "hover:from-emerald-500 hover:to-cyan-500",
    ring: "focus-visible:ring-emerald-500/50",
    glass: "bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60",
    card: "rounded-2xl border border-white/20 bg-white/70 shadow-sm backdrop-blur",
};

/* ==== Геокодер/маршрут (OSM/OSRM) ==== */
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
    return {
        lng: parseFloat(d[0].lon),
        lat: parseFloat(d[0].lat),
        label: d[0].display_name || q,
    };
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

/* ==== Вспомогалки ==== */
function fmtAmd(n) {
    try {
        return new Intl.NumberFormat("hy-AM").format(n || 0);
    } catch {
        return String(n ?? 0);
    }
}
function secToHHMM(s) {
    if (!Number.isFinite(s) || s <= 0) return "—";
    const h = Math.floor(s / 3600);
    const m = Math.round((s % 3600) / 60);
    if (h > 0) return `${h} ժ ${m} ր`;
    return `${m} ր`;
}

/* ==== Главная страница ==== */
export default function Trips({ company, trips = [], vehicles = [], drivers = [] }) {
    const [q, setQ] = useState("");
    const [status, setStatus] = useState("all"); // all|draft|published|archived

    /* ===== форма создания ===== */
    const [from, setFrom] = useState({ lat: null, lng: null, addr: "" });
    const [to, setTo] = useState({ lat: null, lng: null, addr: "" });
    const [stops, setStops] = useState([]);
    const [mode, setMode] = useState("from"); // from|to|stop

    const [amenityCats, setAmenityCats] = useState([]);
    const [amenityModal, setAmenityModal] = useState(false);

    const [form, setForm] = useState(() => {
        // восстановим из localStorage (маленький DX-бонус)
        const saved = localStorage.getItem("company_trip_form");
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
            ...base,
        };
    });

    // кэш формы
    useEffect(() => {
        localStorage.setItem("company_trip_form", JSON.stringify(form));
    }, [JSON.stringify(form)]);

    // подкачка каталога удобств
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const r = await fetch(route("amenities.catalog"));
                if (!r.ok) return;
                const d = await r.json();
                if (!cancelled) setAmenityCats(d?.categories || []);
            } catch (_) {}
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    // синхронизируем адреса с текстовыми полями формы
    useEffect(() => setForm((s) => ({ ...s, from_addr: from.addr || "" })), [from.addr]);
    useEffect(() => setForm((s) => ({ ...s, to_addr: to.addr || "" })), [to.addr]);

    useEffect(() => {
        setForm((s) => ({ ...s, from_lat: Number.isFinite(from.lat) ? from.lat : "", from_lng: Number.isFinite(from.lng) ? from.lng : "" }));
    }, [from.lat, from.lng]);
    useEffect(() => {
        setForm((s) => ({ ...s, to_lat: Number.isFinite(to.lat) ? to.lat : "", to_lng: Number.isFinite(to.lng) ? to.lng : "" }));
    }, [to.lat, to.lng]);

    // stops -> payload
    const preparedStops = useMemo(
        () =>
            (stops || [])
                .slice(0, 10)
                .map((s, idx) => ({ name: s.name || null, addr: s.addr || null, lat: s.lat, lng: s.lng, position: idx + 1 })),
        [JSON.stringify(stops)]
    );

    // построение маршрута для оценки дистанции/времени
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

    /* подсказка цены (просто helper) */
    const [tariffPerKm, setTariffPerKm] = useState(200); // AMD/км
    const suggestedPrice = useMemo(() => Math.round(Math.max(0, osrm.km) * tariffPerKm), [osrm.km, tariffPerKm]);

    function submitCreate(e) {
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
            stops: preparedStops,
            pay_methods: form.pay_methods || ["cash"],
            description: form.description || "",
        };
        router.post(route("company.trips.store", company.id), payload, {
            preserveScroll: true,
        });
    }

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

    return (
        <CompanyLayout company={{ id: company.id, name: company.name, logo: company.logo_path ? `/storage/${company.logo_path}` : null }} current="trips_make">
            {/* Заголовок */}
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-emerald-800">Երթուղիներ (Company)</h1>
                    <div className="text-sm text-slate-600">Ընդամենը՝ <b>{trips.length}</b></div>
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
                </div>
            </div>

            {/* ФОРМА СОЗДАНИЯ */}
            <section className={`mb-6 grid gap-4 lg:grid-cols-2 ${brand.card} p-4`}>
                {/* Левая колонка — поля */}
                <form onSubmit={submitCreate} className="space-y-3">
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

                    <div className="grid grid-cols-2 gap-3">
                        <Input type="datetime-local" label="Մեկնման ժամանակ" value={form.departure_at} onChange={(v) => setForm((s) => ({ ...s, departure_at: v }))} />
                        <Input type="number" label="Տեղերի թիվ" value={form.seats_total} onChange={(v) => setForm((s) => ({ ...s, seats_total: Number(v) || 1 }))} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Input type="number" label="Գին (AMD)" value={form.price_amd} onChange={(v) => setForm((s) => ({ ...s, price_amd: Number(v) || 0 }))} />
                        <PayMethods
                            value={form.pay_methods}
                            onChange={(arr) => setForm((s) => ({ ...s, pay_methods: arr }))}
                        />
                    </div>

                    {/* удобства */}
                    <div className="rounded-xl border p-3">
                        <div className="mb-2 flex items-center justify-between">
                            <div className="text-sm font-medium text-slate-700">Հարմարություններ</div>
                            <button type="button" onClick={() => setAmenityModal(true)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold text-white ${brand.btn} ${brand.btnHover}`}>
                                Ընտրել
                            </button>
                        </div>
                        <AmenityChips cats={amenityCats} selectedIds={form.amenities} />
                    </div>

                    {/* описание */}
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

                    {/* блок оценки маршрута/цены */}
                    <div className="rounded-xl border p-3 text-sm text-slate-700">
                        <div className="mb-2 font-medium">Վերահաշվարկ</div>
                        <div className="grid grid-cols-3 gap-3">
                            <div>Հեռավորություն՝ <b>{osrm.km ? osrm.km.toFixed(1) : "—"} կմ</b></div>
                            <div>Ժամանակ՝ <b>{secToHHMM(osrm.sec)}</b></div>
                            <div className="flex items-center gap-2">
                                <span>Սակագին՝</span>
                                <input
                                    type="number"
                                    value={tariffPerKm}
                                    onChange={(e) => setTariffPerKm(Number(e.target.value) || 0)}
                                    className="w-24 rounded-lg border px-2 py-1 text-right"
                                />
                                <span>AMD/կմ</span>
                            </div>
                        </div>
                        <div className="mt-2">
                            Առաջարկվող գին ≈ <b>{fmtAmd(suggestedPrice)} AMD</b>{" "}
                            <button
                                type="button"
                                onClick={() => setForm((s) => ({ ...s, price_amd: suggestedPrice }))}
                                className="rounded border px-2 py-0.5 text-xs hover:bg-slate-50"
                            >
                                Դնել որպես գին
                            </button>
                        </div>
                    </div>

                    <button
                        disabled={!coordsReady}
                        className={`w-full rounded-xl px-4 py-2 font-semibold text-white ${brand.btn} ${brand.btnHover}`}
                    >
                        Ստեղծել երթուղի (սևագիր)
                    </button>
                    <div className="text-xs text-slate-500">Հրապարակումը կկատարվի քարտից՝ «Publish»։</div>
                </form>

                {/* Правая колонка: карта + редактор остановок */}
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
                        />
                    </div>
                    <StopsEditor stops={stops} setStops={setStops} />
                </div>
            </section>

            {/* СПИСОК РЕЙСОВ */}
            <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filtered.map((t) => (
                    <TripCard key={t.id} company={company} t={t} />
                ))}
                {filtered.length === 0 && (
                    <div className="md:col-span-2 rounded-2xl border bg-white p-6 text-center text-slate-500">Դատարկ է</div>
                )}
            </section>

            {/* Модал выбора удобств (для формы) */}
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

/* ==== Карточка рейса ==== */
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
          Pending՝ {t.pending_requests_count} · Accepted՝ {t.accepted_requests_count}
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

                {/* редактирование удобств / остановок */}
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

/* ==== Модал редактирования удобств для конкретного рейса ==== */
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
            } catch (_) {}
        })();
        return () => (cancelled = true);
    }, [company.id, tripId]);

    const toggle = (id) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    const save = async () => {
        router.post(
            route("company.trips.amenities.update", [company.id, tripId]),
            { amenity_ids: selected },
            { preserveScroll: true, onSuccess: () => onClose() }
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
                <button onClick={onClose} className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50">Չեղարկել</button>
                <button onClick={save} className={`rounded px-3 py-1.5 text-sm font-semibold text-white ${brand.btn} ${brand.btnHover}`}>Պահպանել</button>
            </div>
        </Modal>
    );
}

/* ==== Модал полной замены остановок ==== */
function TripStopsReplaceModal({ company, tripId, onClose }) {
    const [stops, setStops] = useState([]); // заменяем с нуля (если нужно — можно доработать GET текущих)
    const submit = () => {
        const prepared = (stops || []).slice(0, 10).map((s, i) => ({
            position: i + 1,
            name: s.name || null,
            addr: s.addr || null,
            lat: s.lat,
            lng: s.lng,
        }));
        router.post(route("company.trips.stops.replace", [company.id, tripId]), { stops: prepared }, { preserveScroll: true, onSuccess: onClose });
    };

    const [mode, setMode] = useState("stop");
    const [from, setFrom] = useState({ lat: null, lng: null });
    const [to, setTo] = useState({ lat: null, lng: null });

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
                    <StopsEditor stops={stops} setStops={setStops} />
                    <div className="mt-3 flex justify-end gap-2">
                        <button onClick={onClose} className="rounded border px-3 py-1.5 hover:bg-slate-50">Չեղարկել</button>
                        <button onClick={submit} className={`rounded px-3 py-1.5 font-semibold text-white ${brand.btn} ${brand.btnHover}`}>Պահպանել</button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}

/* ==== Карта (Leaflet) ==== */
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from "react-leaflet";
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
    ${label !== null ? `<div style="position:absolute;left:50%;top:0;transform:translate(-50%,-140%);font:600 11px/1 system-ui;padding:2px 6px;border-radius:8px;background:#fff;color:#065f46;border:1px solid rgba(5,150,105,.35);box-shadow:0 1px 2px rgba(0,0,0,.06)">${label}</div>` : ""}
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
                setStops((arr) => [...arr, { ...p, addr: label, name: "" }].slice(0, 10));
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

function TripMap({ from, to, stops, setFrom, setTo, setStops, mode, setMode, routeCoords = [] }) {
    const pts = useMemo(() => toPts(from, stops, to), [from?.lng, from?.lat, to?.lng, to?.lat, JSON.stringify(stops)]);
    return (
        <MapContainer center={[40.1792, 44.4991]} zoom={8} className="h-full w-full">
            <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <ClickCapture mode={mode} setMode={setMode} setFrom={setFrom} setTo={setTo} setStops={setStops} />
            {routeCoords?.length > 1 && <Polyline positions={routeCoords.map((p) => [p.lat, p.lng])} weight={6} />}
            {!routeCoords?.length && pts.length > 1 && <Polyline positions={pts.map((p) => [p.lat, p.lng])} weight={4} />}

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

/* ==== Редактор списка остановок ==== */
function StopsEditor({ stops, setStops }) {
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
                <div className="text-sm font-medium text-slate-900">Կանգառներ (մինչև 10)</div>
                {stops.length > 0 && (
                    <button type="button" onClick={() => setStops([])} className="rounded bg-emerald-600 px-2 py-1 text-xs text-white">
                        Մաքրել բոլորը
                    </button>
                )}
            </div>

            {stops.length === 0 && <div className="text-xs text-slate-500">Ավելացրեք քարտեզից կամ որոնումով</div>}

            <div className="space-y-2">
                {stops.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg border p-2">
                        <div className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 text-xs font-semibold text-white">{i + 1}</div>
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
                            <div className="mt-1 text-[11px] text-slate-500">lng: {s.lng?.toFixed?.(6)} · lat: {s.lat?.toFixed?.(6)}</div>
                        </div>
                        <div className="flex flex-col gap-1">
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

/* ==== Модалки и кирпичики ==== */
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
                <button onClick={onClose} className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50">Չեղարկել</button>
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

function AmenityChips({ cats = [], selectedIds = [] }) {
    const all = [];
    (cats || []).forEach((c) => (c.amenities || []).forEach((a) => all.push(a)));
    const map = Object.fromEntries(all.map((a) => [a.id, a.name]));
    const names = (selectedIds || []).map((id) => map[id]).filter(Boolean);
    if (!names.length) return <div className="text-xs text-slate-500">Չկա ընտրված</div>;
    const shown = names.slice(0, 4);
    const more = Math.max(0, names.length - shown.length);
    return (
        <div className="flex flex-wrap gap-2">
            {shown.map((n, idx) => (
                <span key={idx} className="rounded-lg bg-emerald-50 px-2 py-1 text-xs text-emerald-700 ring-1 ring-emerald-200">
          {n}
        </span>
            ))}
            {more > 0 && <span className="text-xs text-slate-500">+{more}</span>}
        </div>
    );
}

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
