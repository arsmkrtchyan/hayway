// resources/js/Pages/Company/TripShow.jsx
import React, { useEffect, useMemo, useState } from "react";

import { Link, router } from "@inertiajs/react";
import CompanyLayout from "./Layout";
import dayjs from "dayjs";

/* ===== utils ===== */
const NOMI_LANG = "hy,ru,en";
const hyNum = (n)=>{ try{ return new Intl.NumberFormat("hy-AM").format(n||0);}catch{return String(n);} };
const payText = (arr=[]) => {
    const hasCard = arr?.includes("card"); const hasCash = arr?.includes("cash");
    return `${hasCard?"Քարտ":""}${hasCard&&hasCash?" · ":""}${hasCash?"Կանխիկ":""}` || "—";
};
const st = (s)=>({ pending:"Սպասում է", accepted:"Ընդունված", rejected:"Մերժված", cancelled:"Չեղարկված" }[s]||s);
const tripTypeText = (t) => {
    if (t?.type_ab_fixed)   return "A→B (фикс)";
    if (t?.type_pax_to_pax) return "PAX→PAX";
    if (t?.type_pax_to_b)   return "PAX→B";
    if (t?.type_a_to_pax)   return "A→PAX";
    return "Չսահմանված";
};
/* ===== geocode & route helpers ===== */
async function geocodeSuggest(q, limit=5){
    if(!q?.trim()) return [];
    const url=`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=${limit}&accept-language=${encodeURIComponent(NOMI_LANG)}&q=${encodeURIComponent(q)}`;
    const r=await fetch(url,{headers:{Accept:"application/json"}}); if(!r.ok) return [];
    const d=await r.json(); return (d||[]).map(i=>({lng:parseFloat(i.lon),lat:parseFloat(i.lat),label:i.display_name}));
}
async function reverseGeocode(lng,lat){
    const url=`https://nominatim.openstreetmap.org/reverse?format=jsonv2&accept-language=${encodeURIComponent(NOMI_LANG)}&lat=${lat}&lon=${lng}`;
    const r=await fetch(url,{headers:{Accept:"application/json"}}); if(!r.ok) return "";
    const d=await r.json(); return d?.display_name||"";
}
async function osrmRouteVia(profile, pts){
    const path=pts.map(p=>`${p.lng},${p.lat}`).join(";");
    const url=`https://router.project-osrm.org/route/v1/${profile}/${path}?overview=full&geometries=geojson&alternatives=false&steps=false`;
    const r=await fetch(url); if(!r.ok) throw new Error("OSRM "+r.status);
    const d=await r.json(); return d?.routes?.[0]||null;
}

/* ===== Leaflet ===== */
import { MapContainer, TileLayer, Marker, Polyline, Circle, Tooltip, useMap, useMapEvents } from "react-leaflet";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

// fix marker icons
const DefaultIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25,41], iconAnchor:[12,41], shadowSize:[41,41],
});
L.Marker.prototype.options.icon = DefaultIcon;

function mkDivIcon(color, label = null) {
    const html = `
    <div style="position:relative;width:14px;height:14px;border-radius:50%;
                box-shadow:0 0 0 2px #fff,0 0 0 4px ${color};background:${color};"></div>
    ${label !== null ? `<div style="position:absolute;left:50%;top:0;transform:translate(-50%,-140%);
      font:600 11px/1 system-ui;padding:2px 6px;border-radius:8px;background:#fff;color:#065f46;
      border:1px solid rgba(5,150,105,.35);box-shadow:0 1px 2px rgba(0,0,0,.06)">${label}</div>` : ""}
  `;
    return L.divIcon({ html, className: "", iconSize: [14, 14], iconAnchor: [7, 7] });
}

/** Fit с учётом шапки */
function FitTo({ routeCoords, pts, headerPx = 80 }){
    const map = useMap();
    useEffect(() => {
        const coords = routeCoords?.length
            ? routeCoords.map((p) => [p.lat, p.lng])
            : (pts||[]).filter(p=>Number.isFinite(p?.lat)&&Number.isFinite(p?.lng)).map((p)=>[p.lat,p.lng]);
        if (!coords.length) return;
        const b = L.latLngBounds(coords);
        map.fitBounds(b, {
            paddingTopLeft: [0, headerPx],
            padding: [16,16],
        });
    }, [map, routeCoords?.length, JSON.stringify(pts), headerPx]);
    return null;
}

/** invalidateSize после mount + при ресайзе */
function ResizeFix() {
    const map = useMap();
    useEffect(() => {
        const invalidate = () => map.invalidateSize();
        const t = setTimeout(invalidate, 0);
        window.addEventListener('resize', invalidate);
        return () => { clearTimeout(t); window.removeEventListener('resize', invalidate); };
    }, [map]);
    return null;
}

/* ===== page ===== */
export default function TripShow({ company, trip, requests = [], ratingsByUserId = {}, canEditStops = true }) {
    // from/to локально; сохраняем на бэке только stops
    const [from, setFrom] = useState({
        lng: Number.isFinite(trip.from_lng)? trip.from_lng : parseFloat(trip.from_lng),
        lat: Number.isFinite(trip.from_lat)? trip.from_lat : parseFloat(trip.from_lat),
        addr: trip.from_addr || ""
    });
    const [to, setTo] = useState({
        lng: Number.isFinite(trip.to_lng)? trip.to_lng : parseFloat(trip.to_lng),
        lat: Number.isFinite(trip.to_lat)? trip.to_lat : parseFloat(trip.to_lat),
        addr: trip.to_addr || ""
    });
    const [stops, setStops] = useState((trip.stops || []).map(s => ({
        lng: Number.isFinite(s.lng)? s.lng : parseFloat(s.lng),
        lat: Number.isFinite(s.lat)? s.lat : parseFloat(s.lat),
        addr: s.addr || "",
        name: s.name || "",
        free_km: Number.isFinite(s.free_km) ? s.free_km : (s.free_km? parseFloat(s.free_km): null),
        amd_per_km: Number.isFinite(s.amd_per_km) ? s.amd_per_km : (s.amd_per_km? parseInt(s.amd_per_km): null),
        max_km: Number.isFinite(s.max_km) ? s.max_km : (s.max_km? parseFloat(s.max_km): null),
    })));

    const [mode, setMode] = useState("stop");   // 'from' | 'stop' | 'to'
    const [preview, setPreview] = useState(null);
    const [savingStops, setSavingStops] = useState(false);

    // transfer ui
    const [transferFor, setTransferFor] = useState(null); // RideRequest or null

    // KPI
    const accepted = requests.filter(r => r.status === "accepted");
    const pending  = requests.filter(r => r.status === "pending");
    const acceptedSeats = accepted.reduce((s, r) => s + (r.seats || 0), 0);
    const pendingSeats  = pending.reduce((s, r) => s + (r.seats || 0), 0);
    const freeSeats     = Math.max(0, (trip.seats_total || 0) - acceptedSeats);
    const earningsAMD   = acceptedSeats * (trip.price_amd || 0);

    // удобства
    const [amenityNames, setAmenityNames] = useState([]);
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const r = await fetch(route("company.trips.amenities.show", [company.id, trip.id]), { headers: { Accept: "application/json" } });
                if (!r.ok) return;
                const d = await r.json();
                const list = (d.categories || []).flatMap(c => c.amenities || []);
                const map = new Map(list.map(a => [a.id, a.name]));
                const ids = d.selected_ids || [];
                if (!cancelled) setAmenityNames(ids.map(id => map.get(id)).filter(Boolean));
            } catch {}
        })();
        return () => { cancelled = true; };
    }, [company.id, trip.id]);

    async function saveStops() {
        setSavingStops(true);
        const payload = {
            stops: (stops || []).slice(0, 10).map((s, i) => ({
                lat: Number(s.lat), lng: Number(s.lng),
                addr: typeof s.addr === "string" ? s.addr : "",
                name: typeof s.name === "string" ? s.name : "",
                position: i + 1,
                free_km: s.free_km != null ? Number(s.free_km) : null,
                amd_per_km: s.amd_per_km != null ? Number(s.amd_per_km) : null,
                max_km: s.max_km != null ? Number(s.max_km) : null,
            })),
        };
        router.patch(
            route('company.trips.stops.replace', [company.id, trip.id]),
            payload,
            { preserveScroll: true, preserveState: true, onFinish: ()=>setSavingStops(false), onError: ()=>setSavingStops(false), onSuccess: ()=>setSavingStops(false) }
        );
    }

    return (
        <CompanyLayout company={company} current="trips_list">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="text-xs text-emerald-700">{trip.departure_at ? dayjs(trip.departure_at).format("YYYY-MM-DD HH:mm") : "—"}</div>
                    <h1 className="text-2xl font-bold text-slate-900">{trip.from_addr} → {trip.to_addr}</h1>
                    <div className="text-sm text-slate-600">
                        Մեքենա՝ {trip.vehicle?.brand} {trip.vehicle?.model} · {trip.vehicle?.plate} · Վարորդ՝ {trip.assigned_driver?.name || "—"}
                    </div>
                    <div className="mt-1 text-xs inline-flex items-center gap-2">
                        <span className="rounded-full bg-indigo-100 text-indigo-800 px-2 py-0.5 font-semibold">
      Տիպ՝ {tripTypeText(trip)}
                        </span>
                    </div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    trip.status==="published" ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
                        : trip.status==="draft" ? "bg-amber-100 text-amber-800 ring-1 ring-amber-200"
                            : "bg-slate-100 text-slate-800 ring-1 ring-slate-200"
                }`}>
          {trip.status==="published"?"Հրապարակված":trip.status==="draft"?"Սևագիր":"Արխիվ"}
        </span>
            </div>

            {/* KPI */}
            <div className="mb-6 grid gap-4 md:grid-cols-4">
                <Kpi title="Ազատ տեղեր" value={freeSeats} />
                <Kpi title="Ընդունված/Սպասում" value={<><b>{acceptedSeats}</b> <span className="text-sm text-slate-500">(+{pendingSeats})</span></>} />
                <Kpi title="Գին (AMD)" value={hyNum(trip.price_amd)} />
                <Kpi title="Սպասվող եկամուտ" value={`${hyNum(earningsAMD)} AMD`} />
            </div>

            <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                <div className="space-y-6">
                    {/* ===== ՔԱՐՏԵԶ + Կանգառներ ===== */}
                    <Card>
                        <div className="mb-2 flex items-center justify-between">
                            <div className="text-lg font-semibold">Քարտեզ և կանգառներ</div>
                            {canEditStops && (
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-slate-600">Ռեժիմ</span>
                                    <div className="flex overflow-hidden rounded-xl border border-slate-300">
                                        {['from','stop','to'].map(k=>(
                                            <button key={k} onClick={()=>setMode(k)}
                                                    className={`px-3 py-1.5 text-sm ${mode===k?'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white':'bg-white hover:bg-slate-100'}`}>
                                                {k==='from'?'Սկիզբ':k==='to'?'Վերջ':'Կանգառ'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                            <div className="h-80 overflow-hidden rounded-2xl border">
                                <MapWithStops
                                    from={from} to={to} stops={stops}
                                    setFrom={canEditStops ? setFrom : ()=>{}}
                                    setTo={canEditStops ? setTo : ()=>{}}
                                    setStops={canEditStops ? setStops : ()=>{}}
                                    mode={mode} setMode={setMode}
                                    preview={preview} setPreview={setPreview}
                                    trip={trip}
                                />
                            </div>

                            <div className="space-y-3">
                                {canEditStops ? (
                                    <>
                                        <StopAdder
                                            onPick={(p)=>setPreview(p)}
                                            onAdd={(p)=>{
                                                const addr = typeof p.addr === 'string' ? p.addr : (p.label || '');
                                                setStops(list => [
                                                    ...list,
                                                    { lng: Number(p.lng), lat: Number(p.lat), name: '', addr, free_km: null, amd_per_km: null, max_km: null }
                                                ].slice(0, 10));
                                                setPreview(null);
                                            }}
                                        />
                                        <StopsEditor stops={stops} setStops={setStops} />
                                        <div className="flex gap-2">
                                            <button onClick={saveStops} disabled={savingStops}
                                                    className="rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                                                {savingStops ? "Պահպանում…" : "Պահպանել կանգառները"}
                                            </button>
                                            <button onClick={()=>setStops([])} className="rounded-xl border px-4 py-2 text-sm">Մաքրել</button>
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            Սեղմեք քարտեզի վրա «Կանգառ» ռեժիմում, կամ օգտագործեք որոնումը վերևում։ Սկիզբ/Վերջ փոխվում են միայն տեղական հաշվարկի համար։
                                        </div>
                                    </>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="text-sm font-medium">Կանգառների ցանկ</div>
                                        {(stops||[]).length===0 && <div className="text-xs text-slate-500">Չկա</div>}
                                        {(stops||[]).map((s,i)=>(
                                            <div key={i} className="flex items-start gap-2 rounded-lg border p-2">
                                                <div className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 text-xs font-semibold text-white">{i+1}</div>
                                                <div className="flex-1 text-sm">
                                                    <div className="font-medium">{s.name || `Կանգառ #${i+1}`}</div>
                                                    <div className="text-slate-600 text-xs">{s.addr || "—"}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>

                    {/* ===== Հայտեր (с transfer) ===== */}
                    <Card>
                        <div className="mb-3 flex items-center justify-between">
                            <div className="text-lg font-semibold">Հայտեր</div>
                            <Link href={route("company.requests.index", company.id)}
                                  className="rounded-lg border bg-white px-3 py-1.5 text-sm hover:bg-slate-50">Բացնել հայտերի էջը</Link>
                        </div>
                        {requests.length===0 && <div className="text-sm text-slate-500">Չկան հայտեր</div>}
                        <div className="space-y-2">
                            {requests.map(r=>(
                                <div key={r.id} className="flex flex-col gap-3 rounded-xl border bg-white/70 p-3 md:flex-row md:items-center md:justify-between">
                                    <div className="flex-1">
                                        <div className="font-medium">{r.passenger_name || "—"} · {r.phone || "—"}</div>
                                        <div className="text-sm text-slate-600">
                                            Տեղեր՝ {r.seats} · Վճարում՝ {r.payment==="card"?"Քարտ":"Կանխիկ"} · Կարգավիճակ՝ {st(r.status)}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={()=>setTransferFor(r)}
                                            className="rounded-xl border px-3 py-1.5 text-sm hover:bg-slate-50"
                                        >
                                            Տեղափոխել
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* ===== Հարմարություններ + նկարագրություն ===== */}
                    <Card>
                        <div className="mb-2 text-lg font-semibold">Հարմարություններ</div>
                        {amenityNames.length>0 ? (
                            <div className="flex flex-wrap gap-2">
                                {amenityNames.map((n,i)=>(
                                    <span key={i} className="rounded-lg bg-emerald-50 px-2 py-1 text-xs text-emerald-700 ring-1 ring-emerald-200">{n}</span>
                                ))}
                            </div>
                        ) : <div className="text-sm text-slate-500">Չկա ընտրված</div>}
                        {!!trip.description && (
                            <>
                                <div className="mt-4 text-lg font-semibold">Նկարագրություն</div>
                                <div className="whitespace-pre-wrap text-sm text-slate-800">{trip.description}</div>
                            </>
                        )}
                    </Card>
                </div>

                {/* ===== Սայդբար ===== */}
                <aside className="self-start lg:sticky lg:top-6">
                    <Card>
                        <div className="mb-3 text-lg font-semibold">Վերահսկում</div>
                        <div className="grid gap-2 text-sm">
                            <Row k="Մեկ seat գին" v={`${hyNum(trip.price_amd)} AMD`} />
                            <Row k="Տեղեր՝ զբաղ./ընդմ." v={`${trip.seats_taken||0}/${trip.seats_total||0}`} />
                            <Row k="Վճարում" v={payText(trip.pay_methods)} />
                            <Row k="Վարորդ" v={trip.assigned_driver?.name || "—"} />
                            <Row k="Մեքենա" v={`${trip.vehicle?.brand||""} ${trip.vehicle?.model||""} · ${trip.vehicle?.plate||""}`} />
                        </div>
                    </Card>

                    <Card>
                        <div className="mb-2 text-lg font-semibold">Վարորդի տված գնահատականները</div>
                        {Object.keys(ratingsByUserId||{}).length===0 && (
                            <div className="text-sm text-slate-500">Դեռ չկան գնահատականներ</div>
                        )}
                        <div className="space-y-2">
                            {Object.entries(ratingsByUserId||{}).map(([uid, r])=>(
                                <div key={uid} className="rounded-xl border bg-white/70 px-3 py-2">
                                    <div className="flex items-center gap-2 text-amber-500">
                                        {Array.from({length:5}).map((_,i)=>(
                                            <span key={i} className={`text-lg ${i < Math.round(Number(r.rating)||0) ? "opacity-100" : "opacity-30"}`}>★</span>
                                        ))}
                                        <span className="text-sm text-slate-600">({Number(r.rating).toFixed(1)})</span>
                                    </div>
                                    {!!r.description && <div className="mt-1 text-sm text-slate-800">{r.description}</div>}
                                </div>
                            ))}
                        </div>
                        <div className="mt-2 text-xs text-slate-500">
                            Գնահատականները տալիս է նշանակված վարորդը, ընկերությունն այստեղ միայն դիտում է։
                        </div>
                    </Card>
                </aside>
            </div>

            {/* ===== Transfer Modal ===== */}
            {transferFor && (
                <TransferModal
                    companyId={company.id}
                    currentTripId={trip.id}
                    request={transferFor}
                    onClose={()=>setTransferFor(null)}
                />
            )}
        </CompanyLayout>
    );
}

/* ===== Map ===== */
function MapWithStops({ from, to, stops, setFrom, setTo, setStops, mode, setMode, preview, setPreview, trip }){
    const [routeCoords, setRouteCoords] = useState([]);     // [{lat,lng}]
    const [fallbackCoords, setFallbackCoords] = useState([]); // если OSRM недоступен

    const points = useMemo(() => {
        const seq = [];
        if (Number.isFinite(from?.lng) && Number.isFinite(from?.lat)) seq.push({lng:from.lng,lat:from.lat});
        (stops||[]).forEach(s=>{ if(Number.isFinite(s?.lng)&&Number.isFinite(s?.lat)) seq.push({lng:s.lng,lat:s.lat}); });
        if (Number.isFinite(to?.lng) && Number.isFinite(to?.lat)) seq.push({lng:to.lng,lat:to.lat});
        return seq;
    }, [from?.lng,from?.lat,to?.lng,to?.lat, JSON.stringify(stops)]);

    useEffect(()=>{
        let cancelled=false;
        (async()=>{
            if (points.length < 2) { setRouteCoords([]); setFallbackCoords([]); return; }
            try{
                const r = await osrmRouteVia('driving', points);
                if (cancelled) return;
                const coords = (r?.geometry?.coordinates||[]).map(([lng,lat])=>({lat,lng}));
                setRouteCoords(coords);
                setFallbackCoords([]);
            }catch{
                if (cancelled) return;
                setRouteCoords([]);
                setFallbackCoords(points.map(p=>({lat:p.lat,lng:p.lng})));
            }
        })();
        return ()=>{ cancelled=true; };
    }, [JSON.stringify(points)]);

    const center = Number.isFinite(from?.lat)&&Number.isFinite(to?.lat)
        ? [(from.lat+to.lat)/2, (from.lng+to.lng)/2]
        : [40.1792, 44.4991];

    function ClickHandler(){
        useMapEvents({
            click: async (e)=>{
                const p = { lng: e.latlng.lng, lat: e.latlng.lat };
                if (mode === 'from'){
                    setFrom((x)=>({ ...x, ...p }));
                    setMode('to');
                    try{ const addr=await reverseGeocode(p.lng,p.lat); setFrom((x)=>({ ...x, addr: addr || x.addr })); }catch{}
                } else if (mode === 'to'){
                    setTo((x)=>({ ...x, ...p }));
                    setMode('stop');
                    try{ const addr=await reverseGeocode(p.lng,p.lat); setTo((x)=>({ ...x, addr: addr || x.addr })); }catch{}
                } else {
                    try{
                        const addr=await reverseGeocode(p.lng,p.lat);
                        setStops((arr)=>[...arr,{ ...p, addr: addr || "", name: "" }].slice(0,10));
                    }catch{
                        setStops((arr)=>[...arr,{ ...p, addr:"", name:"" }].slice(0,10));
                    }
                    setPreview && setPreview(null);
                }
            }
        });
        return null;
    }

    return (
        <MapContainer
            center={center}
            zoom={8}
            className="relative z-0 h-full w-full"
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <ResizeFix />
            <FitTo routeCoords={routeCoords} pts={points} />

            {/* Route polyline */}
            {routeCoords.length > 1 && (
                <Polyline positions={routeCoords.map(p=>[p.lat,p.lng])} weight={6} />
            )}
            {routeCoords.length === 0 && fallbackCoords.length > 1 && (
                <Polyline positions={fallbackCoords.map(p=>[p.lat,p.lng])} weight={4} />
            )}
            {/* ====== ZONES: A/B тарифы ====== */}
            {Number.isFinite(from?.lat) && Number.isFinite(from?.lng) && (
                <>
                    {Number.isFinite(trip?.start_free_km) && trip.start_free_km > 0 && (
                        <Circle
                            center={[from.lat, from.lng]}
                            radius={trip.start_free_km * 1000}
                            pathOptions={{ fillOpacity: 0.08 }}
                        >
                            <Tooltip>Սկիզբ • Free {trip.start_free_km} կմ</Tooltip>
                        </Circle>
                    )}
                    {Number.isFinite(trip?.start_max_km) && trip.start_max_km > 0 && (
                        <Circle
                            center={[from.lat, from.lng]}
                            radius={trip.start_max_km * 1000}
                            pathOptions={{ fillOpacity: 0, dashArray: "6 6" }}
                        >
                            <Tooltip>Սկիզբ • Max {trip.start_max_km} կմ</Tooltip>
                        </Circle>
                    )}
                </>
            )}

            {Number.isFinite(to?.lat) && Number.isFinite(to?.lng) && (
                <>
                    {Number.isFinite(trip?.end_free_km) && trip.end_free_km > 0 && (
                        <Circle
                            center={[to.lat, to.lng]}
                            radius={trip.end_free_km * 1000}
                            pathOptions={{ fillOpacity: 0.08 }}
                        >
                            <Tooltip>Վերջ • Free {trip.end_free_km} կմ</Tooltip>
                        </Circle>
                    )}
                    {Number.isFinite(trip?.end_max_km) && trip.end_max_km > 0 && (
                        <Circle
                            center={[to.lat, to.lng]}
                            radius={trip.end_max_km * 1000}
                            pathOptions={{ fillOpacity: 0, dashArray: "6 6" }}
                        >
                            <Tooltip>Վերջ • Max {trip.end_max_km} կմ</Tooltip>
                        </Circle>
                    )}
                </>
            )}

            {/* ====== ZONES: по каждому стопу ====== */}
            {(stops||[]).map((s, i) => (
                (Number.isFinite(s?.lat) && Number.isFinite(s?.lng)) ? (
                    <React.Fragment key={`z${i}`}>
                        {Number.isFinite(s?.free_km) && s.free_km > 0 && (
                            <Circle
                                center={[s.lat, s.lng]}
                                radius={s.free_km * 1000}
                                pathOptions={{ fillOpacity: 0.06 }}
                            >
                                <Tooltip>{(s.name?.trim()||`Կանգառ #${i+1}`)} • Free {s.free_km} կմ</Tooltip>
                            </Circle>
                        )}
                        {Number.isFinite(s?.max_km) && s.max_km > 0 && (
                            <Circle
                                center={[s.lat, s.lng]}
                                radius={s.max_km * 1000}
                                pathOptions={{ fillOpacity: 0, dashArray: "6 6" }}
                            >
                                <Tooltip>{(s.name?.trim()||`Կանգառ #${i+1}`)} • Max {s.max_km} կմ</Tooltip>
                            </Circle>
                        )}
                    </React.Fragment>
                ) : null
            ))}
            {/* Markers */}
            {Number.isFinite(from?.lng)&&Number.isFinite(from?.lat) && (
                <Marker position={[from.lat,from.lng]} icon={mkDivIcon('#16a34a','Սկիզբ')} />
            )}
            {(stops||[]).map((s,i)=>(
                Number.isFinite(s?.lng)&&Number.isFinite(s?.lat)
                    ? <Marker key={`${s.lng},${s.lat},${i}`} position={[s.lat,s.lng]} icon={mkDivIcon('#22c55e', (s.name && s.name.trim()) ? s.name : String(i+1))} />
                    : null
            ))}
            {Number.isFinite(to?.lng)&&Number.isFinite(to?.lat) && (
                <Marker position={[to.lat,to.lng]} icon={mkDivIcon('#ef4444','Վերջ')} />
            )}
            {preview && Number.isFinite(preview.lng) && Number.isFinite(preview.lat) && (
                <Marker position={[preview.lat,preview.lng]} icon={mkDivIcon('#7c3aed', null)} />
            )}

            <ClickHandler />
            <div className="absolute right-2 bottom-2 z-[1000] rounded-lg border bg-white/90 px-2 py-1 text-[11px] shadow">
                <div>● Free зона — прозрачная заливка</div>
                <div>— — — Max зона — пунктир</div>
            </div>
        </MapContainer>
    );
}

/* ===== stop adder with suggest ===== */
function StopAdder({ onPick, onAdd }){
    const [q,setQ]=useState(""); const [list,setList]=useState([]); const [loading,setLoading]=useState(false);
    useEffect(()=>{ const id=setTimeout(async()=>{ if(!q.trim()){setList([]);return;}
        setLoading(true); try{ setList(await geocodeSuggest(q.trim())); }catch{ setList([]);} setLoading(false); },300);
        return ()=>clearTimeout(id);
    },[q]);
    return (
        <div className="rounded-xl border border-slate-200 p-3">
            <div className="mb-2 text-sm font-medium">Ավելացնել կանգառ</div>
            <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                   value={q} onChange={e=>setQ(e.target.value)} placeholder="Մուտքագրեք տեղը/հասցեն"/>
            {loading && <div className="mt-2 text-xs text-slate-500">Որոնում…</div>}
            {!loading && list.length>0 && (
                <div className="mt-2 max-h-44 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                    {list.map((p,i)=>(
                        <button
                            key={i}
                            className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                            onMouseEnter={()=>onPick?.(p)} onFocus={()=>onPick?.(p)}
                            onClick={()=>{
                                onAdd?.(p); // p: {lng,lat,label}
                                setQ("");
                                setList([]);
                            }}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            )}
            <div className="mt-2 text-xs text-slate-500">Կարող եք նաև սեղմել քարտեզի վրա «Կանգառ» ռեժիմում</div>
        </div>
    );
}

/* ===== Transfer modal (новый поиск: from/to) ===== */
function TransferModal({ companyId, currentTripId, request, onClose }){
    const [fromQ,setFromQ]=useState("");
    const [toQ,setToQ]=useState("");
    const [loading,setLoading]=useState(false);
    const [list,setList]=useState([]); // items из бекенда
    const [selected,setSelected]=useState(null);
    const [reason,setReason]=useState("");
    const [submitting,setSubmitting]=useState(false);
    const needSeats = Number(request?.seats||0);

    // поиск по рейсам компании: от/до — можно указать одно или оба
    useEffect(()=>{
        let cancel=false;
        const t=setTimeout(async ()=>{
            setLoading(true);
            try{
                const qs = new URLSearchParams();
                if (fromQ.trim()) qs.set('from', fromQ.trim());
                if (toQ.trim())   qs.set('to', toQ.trim());
                qs.set('exclude', String(currentTripId));
                // limit по желанию:
                qs.set('limit','50');
                const url = `${route('company.trips.search', companyId)}?${qs.toString()}`;
                const r = await fetch(url, { headers: { Accept: "application/json" }});
                const data = r.ok ? await r.json() : { items: [] };
                const rows = Array.isArray(data?.items) ? data.items : [];
                if(!cancel) setList(rows);
            }catch{ if(!cancel) setList([]); }
            if(!cancel) setLoading(false);
        }, 300);
        return ()=>{ clearTimeout(t); cancel=true; };
    },[fromQ, toQ, companyId, currentTripId]);

    function freeSeats(t){ return Math.max(0, Number(t?.seats_total||0) - Number(t?.seats_taken||0)); }

    function submit(){
        if(!selected) return;
        setSubmitting(true);
        router.post(
            `/companies/${companyId}/requests/${request.id}/transfer`,
            { to_trip_id: selected, reason },
            {
                preserveScroll: true,
                onFinish: ()=>setSubmitting(false),
                onSuccess: ()=>onClose?.(),
                onError: ()=>{}, // ошибки покажет inertia flash
            }
        );
    }

    return (
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/30" onClick={onClose}/>
            <div className="absolute left-1/2 top-8 w-[740px] -translate-x-1/2 rounded-2xl bg-white p-5 shadow-xl">
                <div className="mb-3 flex items-center justify-between">
                    <div className="text-lg font-semibold">Տեղափոխել հայտը այլ երթուղու</div>
                    <button className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100" onClick={onClose}>✕</button>
                </div>

                <div className="mb-3 text-sm text-slate-600">
                    Կարող եք լրացնել միայն «մի քաղաք» (սթարթ կամ ֆինիշ), կամ երկու դաշտն էլ: Հայերեն/ռուսերեն/անգլերեն տարբերակները նույնացվում են։
                    Հաճախորդի տեղերի քանակ՝ <b>{needSeats}</b>.
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                    <input
                        value={fromQ}
                        onChange={(e)=>setFromQ(e.target.value)}
                        placeholder="Որոնել ՍԿԻԶԲ (օր՝ Երևան / Erevan / Yerevan)"
                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                    />
                    <input
                        value={toQ}
                        onChange={(e)=>setToQ(e.target.value)}
                        placeholder="Որոնել ՎԵՐՋ (օր՝ Մոսկվա / Moskva / Москва)"
                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                    />
                </div>

                <div className="mt-3 max-h-80 overflow-y-auto rounded-xl border">
                    {loading && <div className="p-3 text-sm text-slate-500">Փնտրում…</div>}
                    {!loading && list.length===0 && <div className="p-3 text-sm text-slate-500">Գրանցում չկա</div>}

                    {!loading && list.map(t=>{
                        const free = freeSeats(t);
                        const disabled = free < needSeats;
                        return (
                            <label key={t.id} className={`flex items-center gap-3 border-b p-3 last:border-b-0 ${disabled?'opacity-50':''}`}>
                                <input
                                    type="radio"
                                    name="toTrip"
                                    disabled={disabled}
                                    value={t.id}
                                    checked={selected===t.id}
                                    onChange={()=>setSelected(t.id)}
                                />
                                <div className="flex-1">
                                    <div className="text-sm font-medium">
                                        {dayjs(t.departure_at).format("YYYY-MM-DD HH:mm")} · {t.from_addr} → {t.to_addr}
                                    </div>
                                    <div className="text-xs text-slate-600">
                                        Ազատ տեղեր՝ {free}/{t.seats_total}
                                        {disabled && <span className="ml-2 text-rose-600">անբավարար է</span>}
                                    </div>
                                </div>
                                <div className="text-xs text-slate-500">#{t.id}</div>
                            </label>
                        );
                    })}
                </div>

                <div className="mt-3">
          <textarea
              value={reason}
              onChange={e=>setReason(e.target.value)}
              className="h-20 w-full resize-none rounded-xl border px-3 py-2 text-sm outline-none focus:border-emerald-500"
              placeholder="Պատճառ (ոչ պարտադիր)"
              maxLength={240}
          />
                </div>

                <div className="mt-4 flex items-center justify-end gap-2">
                    <button onClick={onClose} className="rounded-xl border px-4 py-2 text-sm">Չեղարկել</button>
                    <button
                        onClick={submit}
                        disabled={!selected || submitting}
                        className="rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                        {submitting? "Տեղափոխում…":"Հաստատել տեղափոխումը"}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ===== list editor ===== */
function StopsEditor({ stops, setStops }){
    const move=(i,dir)=>{ const j=i+dir; if(j<0||j>=stops.length) return; const a=stops.slice(); [a[i],a[j]]=[a[j],a[i]]; setStops(a); };
    const del=(i)=> setStops(stops.filter((_,k)=>k!==i));
    const edit=(i,p)=> setStops(stops.map((s,k)=>k===i?{...s,...p}:s));
    return (
        <div className="rounded-xl border border-slate-200 p-3">
            <div className="mb-2 text-sm font-medium">Կանգառների ցանկ (մինչև 10)</div>
            {stops.length===0 && <div className="text-xs text-slate-500">Չկա</div>}
            <div className="space-y-2">
                {stops.map((s,i)=>(
                    <div key={i} className="flex items-start gap-2 rounded-lg border p-2">
                        <div className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 text-xs font-semibold text-white">{i+1}</div>
                        <div className="flex-1">
                            <input className="mb-1 w-full rounded-lg border px-2 py-1 text-sm outline-none focus:border-emerald-500"
                                   placeholder="Անուն (ոչ պարտադիր)" value={s.name||''} onChange={e=>edit(i,{name:e.target.value})}/>
                            <input className="w-full rounded-lg border px-2 py-1 text-xs outline-none focus:border-emerald-500"
                                   placeholder="Հասցե" value={s.addr||''} onChange={e=>edit(i,{addr:e.target.value})}/>
                            <div className="mt-1 text-[11px] text-slate-500">lng: {Number.isFinite(s.lng)? s.lng.toFixed(6):s.lng} · lat: {Number.isFinite(s.lat)? s.lat.toFixed(6):s.lat}</div>
                            <div className="mt-2 grid grid-cols-3 gap-2">
                                <input
                                    type="number" min="0" step="0.1"
                                    className="rounded-lg border px-2 py-1 text-xs outline-none focus:border-emerald-500"
                                    placeholder="Free km"
                                    value={s.free_km ?? ''}
                                    onChange={e=>edit(i,{free_km: e.target.value===''? null : Number(e.target.value)})}
                                />
                                <input
                                    type="number" min="0" step="1"
                                    className="rounded-lg border px-2 py-1 text-xs outline-none focus:border-emerald-500"
                                    placeholder="AMD/km"
                                    value={s.amd_per_km ?? ''}
                                    onChange={e=>edit(i,{amd_per_km: e.target.value===''? null : Number(e.target.value)})}
                                />
                                <input
                                    type="number" min="0" step="0.1"
                                    className="rounded-lg border px-2 py-1 text-xs outline-none focus:border-emerald-500"
                                    placeholder="Max km"
                                    value={s.max_km ?? ''}
                                    onChange={e=>edit(i,{max_km: e.target.value===''? null : Number(e.target.value)})}
                                />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <button onClick={()=>move(i,-1)} className="rounded border px-2 py-1 text-xs">↑</button>
                            <button onClick={()=>move(i, 1)} className="rounded border px-2 py-1 text-xs">↓</button>
                            <button onClick={()=>del(i)} className="rounded bg-rose-600 px-2 py-1 text-xs text-white">✕</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ===== tiny UI ===== */
function Card({children}){ return <div className="overflow-hidden rounded-3xl border bg-white p-5 shadow">{children}</div>; }
function Kpi({ title, value }) {
    return (
        <div className="rounded-2xl border bg-white/70 p-4 backdrop-blur">
            <div className="text-xs font-semibold text-slate-600">{title}</div>
            <div className="mt-1 text-2xl font-bold text-emerald-800">{value}</div>
        </div>
    );
}
function Row({k,v}){ return (<div className="flex items-center justify-between rounded-xl border bg-slate-50 px-3 py-2 text-sm"><div className="text-slate-600">{k}</div><div className="font-medium">{v}</div></div>); }
