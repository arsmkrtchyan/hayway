// resources/js/Pages/Driver/MakeTrip.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "@inertiajs/react";
import { motion, AnimatePresence } from "framer-motion";
import DriverLayout from "@/Layouts/DriverLayout";

import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/* ===================== ՕԳՆԱԿԱՆՆԵՐ ======================= */
const NOMI_LANG = "hy,ru,en";

/** Գեոկոդ (одноразовый точный поиск) */
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

/** Ավտոառաջարկներ, приоритет Armenia + hy */
async function searchSuggestions(q, { onlyAM = false } = {}) {
  if (!q?.trim()) return [];
  const base = new URL("https://nominatim.openstreetmap.org/search");
  base.searchParams.set("format", "jsonv2");
  base.searchParams.set("accept-language", NOMI_LANG);
  base.searchParams.set("namedetails", "1");
  base.searchParams.set("addressdetails", "1");
  base.searchParams.set("limit", "7");
  if (onlyAM) base.searchParams.set("countrycodes", "am");
  base.searchParams.set("q", q.trim());
  const r = await fetch(base.toString(), { headers: { Accept: "application/json" } });
  if (!r.ok) return [];
  const arr = await r.json();

  const mapItem = (it) => {
    const hy = it?.namedetails?.["name:hy"];
    const label = hy || it.display_name || it.name || q;
    return {
      id: it.place_id,
      label,
      raw: it,
      lat: parseFloat(it.lat),
      lng: parseFloat(it.lon),
    };
  };
  return (arr || []).map(mapItem);
}

/** Ռևեռս-գեոկոդ */
async function reverseGeocodeNominatim(lng, lat) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&accept-language=${encodeURIComponent(
    NOMI_LANG
  )}&lat=${lat}&lon=${lng}&addressdetails=1&namedetails=1`;
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  if (!r.ok) return "";
  const d = await r.json();
  const hy = d?.namedetails?.["name:hy"];
  if (hy) return hy;
  const a = d?.address || {};
  const parts = [a.road, a.suburb, a.city || a.town || a.village, a.country].filter(Boolean);
  return parts.join(", ") || d?.display_name || "";
}

/** Ուղեգծի հաշվարկ (OSRM) */
async function osrmRoute(profile, pts) {
  const ok = (p) => Number.isFinite(p?.lng) && Number.isFinite(p?.lat);
  const way = (pts || []).filter(ok);
  if (way.length < 2) return null;
  const path = way.map((p) => `${p.lng},${p.lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/${profile}/${path}?overview=full&geometries=geojson&alternatives=false&steps=false`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("OSRM " + r.status);
  const d = await r.json();
  return d?.routes?.[0] || null;
}

/* Leaflet default marker fix */
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
  <div style="position:relative;width:16px;height:16px;border-radius:50%;
              box-shadow:0 0 0 2px #fff,0 0 0 4px ${color};background:${color};"></div>
  ${
    label !== null
      ? `<div style="position:absolute;left:50%;top:0;transform:translate(-50%,-150%);
           font:700 12px/1 system-ui;padding:3px 8px;border-radius:10px;background:#fff;color:#065f46;
           border:1px solid rgba(5,150,105,.35);box-shadow:0 1px 2px rgba(0,0,0,.06)">${label}</div>`
      : ""
  }`;
  return L.divIcon({ html, className: "", iconSize: [16, 16], iconAnchor: [8, 8] });
}

/* ===================== UI ======================= */
function Section({ title, subtitle, children }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 xl:p-9 shadow-xl">
      <div className="mb-5">
        <div className="text-2xl font-extrabold text-slate-900">{title}</div>
        {subtitle && <div className="mt-0.5 text-base text-slate-600">{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

function Input({ label, error, className = "", ...p }) {
  return (
    <label className="block text-base">
      <div className="mb-1.5 text-slate-700">{label}</div>
      <input
        {...p}
        onChange={(e) => p.onChange?.(e.target.value)}
        className={`w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500 ${className}`}
      />
      {error && <div className="mt-1 text-sm text-rose-600">{error}</div>}
    </label>
  );
}

function TextArea({ label, error, rows = 5, ...p }) {
  return (
    <label className="block text-base">
      <div className="mb-1.5 text-slate-700">{label}</div>
      <textarea
        rows={rows}
        {...p}
        onChange={(e) => p.onChange?.(e.target.value)}
        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-emerald-500"
      />
      {error && <div className="mt-1 text-sm text-rose-600">{error}</div>}
    </label>
  );
}

const BTN = {
  primary:
    "rounded-2xl bg-gradient-to-r from-emerald-600 to-cyan-600 px-6 py-3 font-semibold text-white shadow hover:brightness-95 disabled:opacity-50",
  secondary:
    "rounded-2xl border border-slate-300 bg-white px-5 py-3 text-slate-800 hover:bg-slate-100",
  ghost: "rounded-2xl px-4 py-2.5 text-slate-700 hover:bg-slate-100",
  danger: "rounded-2xl bg-rose-600 px-3.5 py-2 text-sm font-semibold text-white hover:brightness-95",
  chip: "rounded-xl px-2.5 py-1.5 text-sm ring-1 bg-emerald-50 text-emerald-700 ring-emerald-200",
};

function Stepper({ steps, activeIdx, setIdx }) {
  return (
    <div className="space-y-3">
      {steps.map((s, i) => {
        const done = i < activeIdx;
        const active = i === activeIdx;
        return (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={`w-full rounded-2xl border p-4 text-left transition flex items-center gap-4
            ${active ? "border-emerald-400 bg-emerald-50 shadow-inner"
                     : done   ? "border-slate-200 bg-white"
                     : "border-slate-200 bg-white hover:bg-slate-50"}`}
          >
            <div
              className={`grid h-11 w-11 place-items-center rounded-xl text-base font-extrabold
              ${active ? "bg-gradient-to-br from-emerald-600 to-cyan-600 text-white"
                       : done   ? "bg-emerald-100 text-emerald-700"
                       : "bg-slate-100 text-slate-700"}`}
            >
              {i + 1}
            </div>
            <div className="min-w-0">
              <div className="truncate text-lg font-semibold text-slate-900">{s.title}</div>
              <div className="truncate text-sm text-slate-500">{s.hint}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ===================== ՔԱՐՏԵԶ ======================= */
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

function ClickCapture({ mode, setMode, setFrom, setTo, addStop }) {
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
        addStop({ ...p, addr: label, name: "" });
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

function RouteMap({ from, to, stops, setFrom, setTo, setStops, mode, setMode }) {
  const addStop = (p) => setStops((arr) => [...arr, p].slice(0, 10));
  const pts = useMemo(() => toPts(from, stops, to), [from?.lng, from?.lat, to?.lng, to?.lat, JSON.stringify(stops)]);
  const [routeCoords, setRouteCoords] = useState([]);
  const [fallbackCoords, setFallbackCoords] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (pts.length < 2) {
        setRouteCoords([]);
        setFallbackCoords([]);
        return;
      }
      try {
        const r = await osrmRoute("driving", pts);
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
    return () => { cancelled = true; };
  }, [JSON.stringify(pts)]);

  return (
    <MapContainer center={[40.1792, 44.4991]} zoom={8} className="h-[620px] w-full rounded-2xl overflow-hidden">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickCapture mode={mode} setMode={setMode} setFrom={setFrom} setTo={setTo} addStop={addStop} />

      {routeCoords.length > 1 && <Polyline positions={routeCoords.map((p) => [p.lat, p.lng])} weight={7} />}
      {routeCoords.length === 0 && fallbackCoords.length > 1 && (
        <Polyline positions={fallbackCoords.map((p) => [p.lat, p.lng])} weight={5} />
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

      <FitTo pts={pts} routeCoords={routeCoords} />
    </MapContainer>
  );
}

/* ===================== ԱՎՏՈԼՑՈՒՑԱԿԻՆ ՎԵՐԱԴԱՐՁՆԵՐ ======================= */
function useDebouncedState(v, delay = 300) {
  const [val, setVal] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setVal(v), delay);
    return () => clearTimeout(t);
  }, [v, delay]);
  return val;
}

/** Ավտոառաջարկներով դաշտ */
function AddressInput({ label, value, onChange, onPick, placeholder = "Գրեք հասցեն…" }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState([]);
  const [idx, setIdx] = useState(-1);
  const debounced = useDebouncedState(value, 250);
  const boxRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!debounced?.trim()) { setItems([]); return; }
      setBusy(true);
      try {
        let am = await searchSuggestions(debounced, { onlyAM: true });
        if (am.length < 5) {
          const rest = await searchSuggestions(debounced, { onlyAM: false });
          const used = new Set(am.map(i => i.id));
          rest.forEach(i => { if (!used.has(i.id)) am.push(i); });
        }
        if (!cancelled) setItems(am.slice(0, 10));
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => { cancelled = true; };
  }, [debounced]);

  useEffect(() => {
    function onDocClick(e) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function choose(i) {
    const it = items[i];
    if (!it) return;
    onPick && onPick({ lat: it.lat, lng: it.lng, addr: it.label });
    setOpen(false);
  }

  return (
    <div ref={boxRef} className="relative">
      <label className="block text-base">
        <div className="mb-1.5 text-slate-700">{label}</div>
        <input
          value={value}
          onChange={(e) => { onChange?.(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) { setOpen(true); return; }
            if (e.key === "ArrowDown") { e.preventDefault(); setIdx((p) => Math.min((items.length - 1), p + 1)); }
            if (e.key === "ArrowUp")   { e.preventDefault(); setIdx((p) => Math.max(-1, p - 1)); }
            if (e.key === "Enter" || e.key === "Tab") {
              if (idx >= 0) { e.preventDefault(); choose(idx); }
            }
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-emerald-500"
        />
      </label>

      {open && (
        <div className="absolute z-[100] mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          {!busy && items.length === 0 && (
            <div className="px-4 py-3 text-sm text-slate-500">Ոչ մի առաջարկ</div>
          )}
          {busy && <div className="px-4 py-3 text-sm text-slate-500">Բեռնվում է…</div>}
          {items.map((it, i) => (
            <button
              key={it.id || i}
              onMouseEnter={() => setIdx(i)}
              onMouseLeave={() => setIdx(-1)}
              onClick={() => choose(i)}
              className={`block w-full px-4 py-3 text-left text-[15px] transition
                ${i === idx ? "bg-emerald-50" : "bg-white hover:bg-slate-50"}`}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ===================== ՕԳՏԱԿԱՐ ======================= */
function nzNum(v) { if (v === "" || v === null || typeof v === "undefined") return null; const n = parseFloat(v); return Number.isFinite(n) ? n : null; }
function nzInt(v) { if (v === "" || v === null || typeof v === "undefined") return null; const n = parseInt(v, 10); return Number.isFinite(n) ? n : null; }

/* ===================== ԷՋ (ՎԻԶԱՐԴ) ======================= */
export default function MakeTrip({ vehicle, amenityCategories }) {
  const [from, setFrom] = useState({ lat: null, lng: null, addr: "" });
  const [to, setTo] = useState({ lat: null, lng: null, addr: "" });
  const [mode, setMode] = useState("from");
  const [stops, setStops] = useState([]);

  const [cats, setCats] = useState(amenityCategories || []);
  useEffect(() => {
    if (amenityCategories?.length) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/amenities-catalog", { headers: { Accept: "application/json" } });
        if (!r.ok) return;
        const d = await r.json();
        if (!cancelled) setCats(d?.categories || []);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [amenityCategories]);

  const { data, setData, post, processing, errors } = useForm({
    vehicle_id: vehicle?.id ?? "",
    from_lat: "", from_lng: "", from_addr: "",
    to_lat: "", to_lng: "", to_addr: "",
    departure_at: new Date(Date.now() + 2 * 3600e3).toISOString().slice(0,16),
    seats_total: vehicle?.seats ?? 4,
    price_amd: 2500,
    pay_methods: ["cash"],
    amenities: [],
    description: "",
    // տեսակի դրոշներ
    type_ab_fixed: true,
    type_pax_to_pax: false,
    type_pax_to_b: false,
    type_a_to_pax: false,
    // հատվածային գներ
    start_free_km: "", start_amd_per_km: "", start_max_km: "",
    end_free_km: "",   end_amd_per_km: "",   end_max_km: "",
    stops: [],
  });

  useEffect(() => {
    if (vehicle?.id) setData((d) => ({ ...d, vehicle_id: vehicle.id, seats_total: vehicle.seats || d.seats_total }));
  }, [vehicle?.id, vehicle?.seats, setData]);

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

  useEffect(() => {
    const prepared = (stops || []).slice(0, 10).map((s, idx) => ({
      name: s.name || null,
      addr: s.addr || null,
      lat: s.lat, lng: s.lng, position: idx + 1,
    }));
    setData("stops", prepared);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(stops)]);

  const steps = [
    { key: "route",  title: "Ուղի (սկիզբ/վերջ)", hint: "Նշեք հասցեները և քարտեզի վրա տեղերը" },
    { key: "stops",  title: "Կանգառներ (ըստ ցանկության)", hint: "Ավելացրեք մինչև 10 կանգառ" },
    { key: "time",   title: "Ժամանակ, գին, տեղեր", hint: "Ելքի ժամ, մեկ տեղ–գին, վճարում" },
    { key: "type",   title: "Տեսակ և հատվածային գներ", hint: "Պարզ ընտրություն՝ հստակ բացատրություններով" },
    { key: "finish", title: "Ամփոփում և հրապարակում", hint: "Ստուգեք և ուղարկեք" },
  ];
  const [idx, setIdx] = useState(0);
  const wrapRef = useRef(null);
  const go = (toIdx) => {
    setIdx(Math.max(0, Math.min(steps.length - 1, toIdx)));
    setTimeout(() => wrapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  const canNext = (() => {
    if (idx === 0) {
      return Number.isFinite(from.lat) && Number.isFinite(from.lng) && Number.isFinite(to.lat) && Number.isFinite(to.lng);
    }
    if (idx === 2) {
      return (data.departure_at && String(data.price_amd).length && String(data.seats_total).length);
    }
    return true;
  })();

  const saveDraft = (e) => { e?.preventDefault?.(); post("/driver/trip", { preserveScroll: true }); };
  const publishNow = (e) => { e?.preventDefault?.(); post("/driver/trip/store-and-publish", { preserveScroll: true }); };

  return (
    <DriverLayout current="make-trip">
      <div
        ref={wrapRef}
        className="mx-auto w-full max-w-[1600px] 2xl:max-w-[1760px] px-2 md:px-4 py-4 lg:py-6 text-[17px] md:text-[18px] leading-relaxed"
      >
        <div className="mb-6">
          <div className="text-4xl font-extrabold text-slate-900">Ստեղծել ուղևորություն</div>
          <div className="mt-1 text-base text-slate-600">Լայն լեյաութ, պարզ վիզարդ</div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
          {/* Սայդբար-վիզարդ — ձախ */}
          <aside className="lg:sticky lg:top-4 h-max">
            <Stepper steps={steps} activeIdx={idx} setIdx={go} />
          </aside>

          {/* Контент — справа */}
          <div className="space-y-6">
            <AnimatePresence mode="wait">
              {idx === 0 && (
                <motion.div key="step-0" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
                  <Section title="Քայլ 1. Սկիզբ և Վերջ" subtitle="Մուտքագրեք հասցեները կամ սեղմեք քարտեզի վրա">
                    <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
                      <form className="space-y-5">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <AddressInput
                            label="Սկիզբ (հասցե)"
                            value={from.addr}
                            onChange={(v) => setFrom((p) => ({ ...p, addr: v }))}
                            onPick={(p) => { setFrom(p); setMode("to"); }}
                          />
                          <AddressInput
                            label="Վերջ (հասցե)"
                            value={to.addr}
                            onChange={(v) => setTo((p) => ({ ...p, addr: v }))}
                            onPick={(p) => { setTo(p); setMode("stop"); }}
                          />
                        </div>

                        <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
                          <div className="font-semibold mb-1">Կոորդինատներ</div>
                          <div>Սկիզբ — lng: {Number.isFinite(from.lng) ? from.lng.toFixed(6) : "-"}, lat: {Number.isFinite(from.lat) ? from.lat.toFixed(6) : "-"}</div>
                          <div>Վերջ — lng: {Number.isFinite(to.lng) ? to.lng.toFixed(6) : "-"}, lat: {Number.isFinite(to.lat) ? to.lat.toFixed(6) : "-"}</div>
                        </div>
                      </form>

                      <div className="space-y-4">
                        <div className="flex items-center gap-3 text-base text-slate-700">
                          <span className="opacity-70">Քարտեզի ռեժիմ՝</span>
                          <div className="flex overflow-hidden rounded-2xl border border-slate-300">
                            {["from", "stop", "to"].map((k) => (
                              <button
                                key={k}
                                type="button"
                                onClick={() => setMode(k)}
                                className={`px-4 py-2.5 ${mode === k ? "bg-gradient-to-r from-emerald-600 to-cyan-600 text-white" : "bg-white hover:bg-slate-100"}`}
                              >
                                {k === "from" ? "Սկիզբ" : k === "to" ? "Վերջ" : "Կանգառ"}
                              </button>
                            ))}
                          </div>
                        </div>
                        <RouteMap
                          from={from} to={to} stops={stops}
                          setFrom={setFrom} setTo={setTo} setStops={setStops}
                          mode={mode} setMode={setMode}
                        />
                      </div>
                    </div>

                    <div className="mt-8 border-t border-slate-100 pt-6 flex justify-end">
                      <button
                        type="button"
                        className={BTN.primary}
                        disabled={!canNext}
                        onClick={() => go(idx + 1)}
                      >
                        Հաջորդ
                      </button>
                    </div>
                  </Section>
                </motion.div>
              )}

              {idx === 1 && (
                <motion.div key="step-1" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
                  <Section title="Քայլ 2. Կանգառներ" subtitle="Ընտրովի քայլ — ավելացրեք միջանկյալ կանգառներ">
                    <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
                      <div className="space-y-5">
                        <AddStop onAdd={async (q) => {
                          if (!q?.trim()) return;
                          const g = await geocodeNominatim(q.trim());
                          if (!g) return;
                          setStops((arr) => [...arr, { lng: g.lng, lat: g.lat, addr: g.label || q, name: "" }].slice(0, 10));
                        }} />
                        <StopsEditor stops={stops} setStops={setStops} />
                      </div>
                      <RouteMap
                        from={from} to={to} stops={stops}
                        setFrom={setFrom} setTo={setTo} setStops={setStops}
                        mode={"stop"} setMode={setMode}
                      />
                    </div>

                    <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
                      <button type="button" className={BTN.secondary} onClick={() => go(idx - 1)}>
                        Նախորդ
                      </button>
                      <button type="button" className={BTN.primary} onClick={() => go(idx + 1)}>
                        Հաջորդ
                      </button>
                    </div>
                  </Section>
                </motion.div>
              )}

              {idx === 2 && (
                <motion.div key="step-2" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
                  <Section title="Քայլ 3. Ժամանակ, Գին, Տեղեր, Վճարում" subtitle="Սահմանեք մեկնարկի ժամը և գները">
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
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
                      <Input
                        type="number"
                        label="Տեղերի քանակ"
                        value={data.seats_total}
                        onChange={(v) => setData("seats_total", v)}
                        error={errors.seats_total}
                      />
                      <PayMethods value={data.pay_methods} onChange={(arr) => setData("pay_methods", arr)} />
                    </div>

                    <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
                      <button type="button" className={BTN.secondary} onClick={() => go(idx - 1)}>
                        Նախորդ
                      </button>
                      <button
                        type="button"
                        className={BTN.primary}
                        disabled={!canNext}
                        onClick={() => go(idx + 1)}
                      >
                        Հաջորդ
                      </button>
                    </div>
                  </Section>
                </motion.div>
              )}

              {idx === 3 && (
                <motion.div key="step-3" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
                  <Section title="Քայլ 4. Տեսակ և հատվածային գներ" subtitle="Պարզ բացատրություններով, առանց մասնագիտական բառերի">
                    <div className="grid gap-5 lg:grid-cols-2">
                      <TypeCard
                        active={data.type_ab_fixed}
                        onClick={() => pickType("type_ab_fixed", setData)}
                        title="Քաղաք → Քաղաք (ֆիքս գին)"
                        desc="Մեկնարկն ու վերջն ամրագրած են։"
                      />
                      <TypeCard
                        active={data.type_pax_to_pax}
                        onClick={() => pickType("type_pax_to_pax", setData)}
                        title="Հասցե → Հասցե"
                        desc="Վերցնում և թողնում՝ կոնկրետ հասցեներով։"
                      />
                      <TypeCard
                        active={data.type_a_to_pax}
                        onClick={() => pickType("type_a_to_pax", setData)}
                        title="Ֆիքս մեկնարկ → Ազատ վերջ"
                        desc="Մեկնարկը ամրագրված է, վերջը՝ ըստ ընտրության։"
                      />
                      <TypeCard
                        active={data.type_pax_to_b}
                        onClick={() => pickType("type_pax_to_b", setData)}
                        title="Ազատ մեկնարկ → Ֆիքս վերջ"
                        desc="Վերջը ամրագրված է, մեկնարկը՝ ըստ ընտրության։"
                      />
                    </div>

                    <div className="mt-5 grid gap-5 lg:grid-cols-2">
                      <TariffCard
                        show={data.type_ab_fixed || data.type_a_to_pax}
                        side="A (սկիզբ)"
                        values={{ free_km: data.start_free_km, amd_per_km: data.start_amd_per_km, max_km: data.start_max_km }}
                        setValues={(v) => {
                          setData("start_free_km", v.free_km);
                          setData("start_amd_per_km", v.amd_per_km);
                          setData("start_max_km", v.max_km);
                        }}
                        errors={{ free_km: errors.start_free_km, amd_per_km: errors.start_amd_per_km, max_km: errors.start_max_km }}
                      />
                      <TariffCard
                        show={data.type_ab_fixed || data.type_pax_to_b}
                        side="B (վերջ)"
                        values={{ free_km: data.end_free_km, amd_per_km: data.end_amd_per_km, max_km: data.end_max_km }}
                        setValues={(v) => {
                          setData("end_free_km", v.free_km);
                          setData("end_amd_per_km", v.amd_per_km);
                          setData("end_max_km", v.max_km);
                        }}
                        errors={{ free_km: errors.end_free_km, amd_per_km: errors.end_amd_per_km, max_km: errors.end_max_km }}
                      />
                    </div>

                    <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
                      <button type="button" className={BTN.secondary} onClick={() => go(idx - 1)}>
                        Նախորդ
                      </button>
                      <button type="button" className={BTN.primary} onClick={() => go(idx + 1)}>
                        Հաջորդ
                      </button>
                    </div>
                  </Section>
                </motion.div>
              )}

              {idx === 4 && (
                <motion.div key="step-4" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
                  <Section title="Քայլ 5. Ամփոփում և հրապարակում" subtitle="Լրացրեք լրացուցիչ դաշտերը և պահպանեք">
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
                      <div className="space-y-5">
                        <TextArea
                          label="Նկարագրություն (ոչ պարտադիր)"
                          value={data.description || ""}
                          onChange={(v) => setData("description", v)}
                          error={errors.description}
                        />
                        <AmenitiesPicker
                          categories={cats}
                          value={data.amenities}
                          onChange={(ids) => setData("amenities", ids)}
                        />
                      </div>

                      <div className="rounded-3xl border border-slate-200 p-5">
                        <div className="mb-3 text-lg font-semibold text-slate-900">Ամփոփում</div>
                        <ul className="text-base text-slate-800 space-y-1.5">
                          <li>Սկիզբ՝ {from.addr || "չի նշված"}</li>
                          <li>Վերջ՝ {to.addr || "չի նշված"}</li>
                          <li>Կանգառներ՝ {stops.length}</li>
                          <li>Ելքի ժամանակ՝ {data.departure_at || "չի նշված"}</li>
                          <li>Գին / տեղ՝ {data.price_amd ? `${data.price_amd} AMD` : "չի նշված"}</li>
                          <li>Տեղեր՝ {data.seats_total || "չի նշված"}</li>
                          <li>Վճարում՝ {(data.pay_methods || []).join(", ") || "չկա"}</li>
                        </ul>
                      </div>
                    </div>

                    <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
                      <button type="button" className={BTN.secondary} onClick={() => go(idx - 1)}>
                        Նախորդ
                      </button>
                      <div className="flex gap-3">
                        <button type="button" className={BTN.secondary} disabled={processing} onClick={saveDraft}>
                          Պահպանել (սևագիր)
                        </button>
                        <button type="button" className={BTN.primary} disabled={processing} onClick={publishNow}>
                          Հրապարակել հիմա
                        </button>
                      </div>
                    </div>
                  </Section>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </DriverLayout>
  );
}

/* ===================== ԿՈՄՊՈՆԵՆՏՆԵՐ ======================= */
function TypeCard({ active, onClick, title, desc }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full flex-col items-start rounded-2xl border p-5 text-left transition
      ${active ? "border-emerald-400 bg-emerald-50 shadow-inner" : "border-slate-300 bg-white hover:bg-slate-50"}`}
    >
      <div className="text-lg font-semibold text-slate-900">{title}</div>
      <div className="text-sm text-slate-600">{desc}</div>
    </button>
  );
}

function TariffCard({ show, side, values, setValues, errors }) {
  if (!show)
    return <div className="grid place-items-center rounded-2xl border border-dashed border-slate-300 p-5 text-base text-slate-500">
      Այս տեսակի համար հատվածային գներ չեն կիրառվում
    </div>;
  return (
    <div className="rounded-2xl border border-slate-200 p-5">
      <div className="mb-3 text-lg font-semibold text-slate-900">Հատվածային գին — {side}</div>
      <div className="grid grid-cols-3 gap-3">
        <SmallNumber
          label="Ազատ կմ"
          value={values.free_km ?? ""}
          onChange={(v) => setValues({ ...values, free_km: v })}
          error={errors.free_km}
        />
        <SmallNumber
          label="Դր/կմ"
          value={values.amd_per_km ?? values.end_amd_per_km ?? ""}
          onChange={(v) => setValues({ ...values, amd_per_km: v, end_amd_per_km: v })}
          error={errors.amd_per_km}
        />
        <SmallNumber
          label="Առավելագույն կմ"
          value={values.max_km ?? ""}
          onChange={(v) => setValues({ ...values, max_km: v })}
          error={errors.max_km}
        />
      </div>
      <div className="mt-1 text-sm text-slate-500">Թողեք դատարկ, եթե դաշտը պետք չէ.</div>
    </div>
  );
}

function SmallNumber({ label, value, onChange, error }) {
  return (
    <label className="block text-sm">
      <div className="mb-1 text-slate-600">{label}</div>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-emerald-500"
      />
      {error && <div className="mt-1 text-sm text-rose-600">{error}</div>}
    </label>
  );
}

function PayMethods({ value = [], onChange }) {
  const toggle = (k) => onChange(value.includes(k) ? value.filter((i) => i !== k) : [...value, k]);
  return (
    <div className="rounded-2xl border border-slate-200 p-5">
      <div className="mb-2 text-lg font-semibold text-slate-900">Վճարման եղանակ</div>
      <div className="flex gap-5 text-base">
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={value.includes("cash")} onChange={() => toggle("cash")} /> Կանխիկ
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={value.includes("card")} onChange={() => toggle("card")} /> Քարտ
        </label>
      </div>
    </div>
  );
}

function AddStop({ onAdd }) {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const add = async () => {
    if (!q.trim()) return;
    setLoading(true);
    try { await onAdd(q.trim()); } finally { setLoading(false); setQ(""); }
  };
  return (
    <div className="rounded-2xl border border-slate-200 p-5">
      <div className="mb-2 text-lg font-semibold text-slate-900">Ավելացնել կանգառ</div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          className="flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-emerald-500"
          placeholder="Գրեք հասցեն (օր.՝ Երևան, Օպերա)…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="flex gap-3">
          <button type="button" onClick={add} disabled={loading} className={BTN.primary}>
            {loading ? "Ավելացնում է…" : "Ավելացնել"}
          </button>
        </div>
      </div>
      <div className="mt-2 text-sm text-slate-500">Կարելի է նաև քարտեզում սեղմել «Կանգառ» ռեժիմում։</div>
    </div>
  );
}

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
    <div className="rounded-2xl border border-slate-200 p-5">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-900">Կանգառների ցանկ (մինչև 10)</div>
        {stops.length > 0 && (
          <button type="button" onClick={() => setStops([])} className={BTN.danger}>
            Մաքրել բոլորը
          </button>
        )}
      </div>

      {stops.length === 0 && <div className="text-base text-slate-500">Ավելացրեք կանգառ քարտեզից կամ որոնումով</div>}

      <div className="space-y-3">
        {stops.map((s, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 md:flex-row md:items-start">
            <div className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-emerald-600 to-cyan-600 text-sm font-semibold text-white">
              {i + 1}
            </div>
            <div className="flex-1">
              <input
                className="mb-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-emerald-500"
                placeholder="Կանգառի անուն (ոչ պարտադիր)"
                value={s.name || ""}
                onChange={(e) => edit(i, { name: e.target.value })}
              />
              <input
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-500"
                placeholder="Հասցե"
                value={s.addr || ""}
                onChange={(e) => edit(i, { addr: e.target.value })}
              />
              <div className="mt-1 text-sm text-slate-500">
                lng: {isFinite(s.lng) ? s.lng.toFixed(6) : "-"} · lat: {isFinite(s.lat) ? s.lat.toFixed(6) : "-"}
              </div>
            </div>
            <div className="flex gap-1 md:flex-col">
              <button type="button" onClick={() => move(i, -1)} className={BTN.ghost}>↑</button>
              <button type="button" onClick={() => move(i, 1)} className={BTN.ghost}>↓</button>
              <button type="button" onClick={() => del(i)} className={BTN.danger}>✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AmenitiesPicker({ categories = [], value = [], onChange }) {
  const [open, setOpen] = useState(false);
  const toggle = (id) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);

  return (
    <div className="rounded-2xl border border-slate-200 p-5">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-900">Հարմարություններ</div>
        <button type="button" className={BTN.secondary} onClick={() => setOpen((v) => !v)}>{open ? "Փակել" : "Բացել ցանկը"}</button>
      </div>

      {!open && (
        <div className="text-base text-slate-600">
          Ընտրված՝{" "}
          {value.length ? <span className="inline-flex flex-wrap gap-2">{value.map((id) => <span key={id} className={BTN.chip}>#{id}</span>)}</span> : "ոչ մի բան"}
        </div>
      )}

      {open && (
        <div className="max-h-[50vh] space-y-4 overflow-y-auto">
          {categories.length === 0 && <div className="text-base text-slate-500">Բեռնվում է…</div>}
          {categories.map((cat) => (
            <div key={cat.id} className="rounded-xl border border-slate-200 p-4">
              <div className="mb-2 text-base font-semibold text-slate-900">{cat.name}</div>
              <div className="flex flex-wrap gap-4">
                {(cat.amenities || []).map((a) => (
                  <label key={a.id} className="inline-flex items-center gap-2 text-base">
                    <input type="checkbox" checked={value.includes(a.id)} onChange={() => toggle(a.id)} /> {a.name}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ===================== ՕԳՆԱԿԱՆ ՖՈՒՆԿՑԻԱՆԵՐ ======================= */
function pickType(which, setData) {
  const next = {
    type_ab_fixed: false,
    type_pax_to_pax: false,
    type_pax_to_b: false,
    type_a_to_pax: false,
  };
  next[which] = true;
  const resetStart = { start_free_km: "", start_amd_per_km: "", start_max_km: "" };
  const resetEnd   = { end_free_km: "",   end_amd_per_km: "",   end_max_km: ""   };
  let patch = {};
  if (which === "type_pax_to_pax") patch = { ...resetStart, ...resetEnd };
  else if (which === "type_a_to_pax") patch = { ...resetEnd };
  else if (which === "type_pax_to_b") patch = { ...resetStart };
  setData((d) => ({ ...d, ...next, ...patch }));
}
