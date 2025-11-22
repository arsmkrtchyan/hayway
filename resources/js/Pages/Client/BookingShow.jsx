
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, router } from "@inertiajs/react";
import { Car, Ticket } from "lucide-react";
import ClientLayout from "@/Layouts/ClientLayout";

/* ===== tiny utils ===== */
const hyNum  = (n)=>{ try{ return new Intl.NumberFormat("hy-AM").format(n||0);}catch{ return String(n); } };
const clamp  = (n,a,b)=> Math.max(a, Math.min(b,n));
const pad2   = (x)=> String(x).padStart(2,"0");
const fmtDT  = (isoStr)=>{ if(!isoStr) return "—"; try{ const d=new Date(isoStr); const ds=d.toLocaleDateString("hy-AM",{year:"numeric",month:"2-digit",day:"2-digit"}); const ts=d.toLocaleTimeString("hy-AM",{hour:"2-digit",minute:"2-digit"}); return `${ds} · ${ts}`; }catch{ return isoStr; } };

function useCountdown(isoDate){
    const [now,setNow] = useState(()=> new Date());
    useEffect(()=>{ const t=setInterval(()=>setNow(new Date()),1000); return()=>clearInterval(t);},[]);
    const target = useMemo(()=> new Date(isoDate||Date.now()), [isoDate]);
    const ms = Math.max(0, target - now);
    const s = Math.floor(ms/1000);
    return { hh:pad2(Math.floor(s/3600)), mm:pad2(Math.floor((s%3600)/60)), ss:pad2(Math.floor(s%60)), seconds:s };
}

/* ===== OSRM ===== */
async function osrmRouteVia(profile, points){
    const pts=(points||[]).filter(p=>Number.isFinite(p?.lng)&&Number.isFinite(p?.lat));
    if(pts.length<2) return null;
    const path=pts.map(p=>`${p.lng},${p.lat}`).join(";");
    const url=`https://router.project-osrm.org/route/v1/${profile}/${path}?overview=full&geometries=geojson&alternatives=false`;
    const r=await fetch(url); if(!r.ok) throw new Error("OSRM "+r.status);
    const d=await r.json();
    if (d?.code !== "Ok" || !Array.isArray(d?.routes) || !d.routes.length) {
        throw new Error("OSRM empty");
    }
    return d.routes[0];
}

/* ===== Page ===== */
export default function BookingShow({ booking }){
    const bk = booking;
    const trip = bk.trip || {};
    const depISO = trip?.departure_at;
    const until = useCountdown(depISO);

    const freeAvail = Math.max(0, (trip.seats_total||0) - (trip.seats_taken||0));
    const finished  = Boolean(trip?.driver_finished_at);
    const canAdd    = !finished && ['pending','accepted'].includes(bk.status) && freeAvail > 0;
    const canCancel = !finished && ['pending','accepted'].includes(bk.status);
    const canFreeCancel = canCancel && (until.seconds/60) > (trip?.policy?.cancelMinBefore ?? 30);

    const [addSeats, setAddSeats]    = useState(1);
    const [adding, setAdding]        = useState(false);
    const [cancelling, setCancelling]= useState(false);

    const pricing = bk.pricing || {};
    const seatsBooked = pricing.seats ?? bk.seats ?? 0;
    const basePerSeat = pricing.base_per_seat_amd ?? trip.price_amd ?? 0;
    const effectivePerSeat = pricing.effective_per_seat_amd ?? basePerSeat;
    const addonTotal = pricing.addon_total_amd ?? 0;
    const total = pricing.total_amd ?? Math.max(0, (seatsBooked * basePerSeat) + addonTotal);

    const onAdd = ()=>{
        if (!canAdd) return;
        setAdding(true);
        router.post(
            `/trips/${trip.id}/book`,
            { description: "Add seats", seats: addSeats, payment: bk.payment||"cash" },
            { preserveScroll:true, onFinish:()=>setAdding(false) }
        );
    };
    const onCancel = ()=>{
        if (!canCancel) return;
        if (!confirm("Չեղարկել ամրագիրը?")) return;
        setCancelling(true);
        router.delete(route("client.requests.destroy", bk.id), {
            preserveScroll:true,
            onFinish:()=>setCancelling(false),
            onSuccess:()=> router.visit(route('client.requests'))
        });
    };

    return (
        <ClientLayout current="requests">
            <div className="mx-auto max-w-6xl">
                {/* header */}
                    <div className="mb-6 flex items-center gap-3">
                        <div className="relative">
                            <div className="absolute -inset-1 rounded-xl bg-emerald-400/40 blur-lg" />
                            <div className="relative grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-lg">
                                <Car className="h-6 w-6"/>
                        </div>
                    </div>
                    <div>
                        <div className="text-xs uppercase tracking-wider text-emerald-700/80">Ամրագրում</div>
                        <h1 className="text-2xl font-bold">{bk.code}</h1>
                    </div>
                    <StatusBadge status={bk.status} finished={finished} className="ml-auto" />
                </div>

                <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                    <div className="space-y-6">
                        <Hero trip={trip} until={until} meta={bk.meta} />

                        <CardsRow bk={bk} pricing={pricing} total={total} freeAvail={freeAvail} />
                        <StopsCard stops={trip.stops||[]} from={trip.from} to={trip.to} />
                    </div>

                    <aside className="self-start lg:sticky lg:top-6">
                        <SummaryCard
                            trip={trip}
                            seats={seatsBooked}
                            pricing={pricing}
                            payment={bk.payment}
                            addSeats={addSeats}
                            setAddSeats={(v)=>setAddSeats(s=>clamp(typeof v==="number"?v:s+v,1,3))}
                            onAdd={onAdd}
                            onCancel={onCancel}
                            canFreeCancel={canFreeCancel}
                            adding={adding}
                            cancelling={cancelling}
                            canAdd={canAdd}
                            canCancel={canCancel}
                            finished={finished}
                        />
                    </aside>
                </div>

                <div className="mt-4 text-xs text-slate-600">
                    ID #{bk.id} · {new Date(bk.created_at||Date.now()).toLocaleString("hy-AM")}
                </div>
            </div>
        </ClientLayout>
    );
}

/* ===== sections ===== */
function Hero({ trip, until, meta = {} }){
    const [durationMin,setDurationMin]=useState(null);

    const pickup = meta?.pickup || null;
    const drop   = meta?.drop   || null;

    return (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="h-1.5 w-full bg-[repeating-linear-gradient(90deg,#10b981_0_16px,#10b981_16px_18px,transparent_18px_34px,transparent_34px_36px)]" />
            <div className="grid gap-0 md:grid-cols-[1.2fr_1fr]">
                <div className="h-64 md:h-72">
                    <MapRoute
                        A={{ lng: trip.from_lng, lat: trip.from_lat }}
                        B={{ lng: trip.to_lng,   lat: trip.to_lat   }}
                        stops={(trip.stops||[]).sort((a,b)=> (a.position||0)-(b.position||0))}
                        routePoints={trip.route_points||[]}
                        pickup={pickup}
                        drop={drop}
                        onDuration={(sec)=>setDurationMin(Math.round((sec||0)/60))}
                    />
                </div>
                <div className="flex flex-col justify-between p-5">
                    <div className="space-y-2 text-slate-700">
                        <Kv k="Ամսաթիվ"   v={fmtDT(trip.departure_at)} />
                        <Kv k="Ուղղություն" v={`${trip.from} → ${trip.to}`} />
                        <Kv k="Տևողություն" v={`~${durationMin??"—"} ժ`} />
                    </div>
                    <CountdownBar until={until} />
                </div>
            </div>
        </div>
    );
}

function CardsRow({ bk, pricing = {}, total, freeAvail }){
    const t = bk.trip || {};
    const seats = pricing.seats ?? bk.seats ?? 0;
    const basePerSeat = pricing.base_per_seat_amd ?? t.price_amd ?? 0;
    const effectivePerSeat = pricing.effective_per_seat_amd ?? basePerSeat;
    const addonTotal = pricing.addon_total_amd ?? 0;
    const totalAmount = total ?? pricing.total_amd ?? Math.max(0, seats * effectivePerSeat);
    const hasAddon = addonTotal > 0;
    return (
        <div className="grid gap-4 md:grid-cols-3">
            <Card>
                <div className="mb-2 text-sm text-slate-600">Ուղևոր</div>
                <div className="text-lg font-semibold">{bk.passenger?.name||"—"}</div>
                <div className="text-sm text-slate-600">{bk.passenger?.phone||"—"}</div>
            </Card>
            <Card>
                <div className="mb-2 text-sm text-slate-600">Վճարում</div>
                <div className="font-medium">{bk.payment==="card"?"Քարտ":"Կանխիկ"}</div>
                <div className="text-sm text-slate-600">Բազային՝ {hyNum(basePerSeat)} AMD / տեղ</div>
                {hasAddon && (
                    <div className="text-xs text-emerald-600">
                        Վերջնական՝ {hyNum(effectivePerSeat)} AMD / տեղ
                    </div>
                )}
            </Card>
            <Card>
                <div className="mb-2 text-sm text-slate-600">Ընդհանուր</div>
                <div className="text-2xl font-bold text-emerald-700">{hyNum(totalAmount)} AMD</div>
                <div className="text-sm text-slate-600">Իմ՝ {seats||1} · Ազատ՝ {freeAvail} / {t.seats_total||0}</div>
                {hasAddon && (
                    <div className="text-xs text-slate-500">Հավելավճար՝ +{hyNum(addonTotal)} AMD</div>
                )}
            </Card>
        </div>
    );
}

function StopsCard({ stops=[], from, to }){
    const all=[{name:from, edge:"Սկիզբ"}, ...stops, {name:to, edge:"Վերջ"}];
    return (
        <Card>
            <div className="mb-2 text-lg font-semibold">Կանգառներ</div>
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="absolute left-6 top-6 bottom-6 w-px bg-gradient-to-b from-emerald-300 via-emerald-500 to-emerald-300" />
                <div className="relative space-y-4">
                    {all.map((s,i)=> (
                        <div key={i} className="flex items-start gap-4">
                            <div className="mt-1 h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(255,255,255,0.9)]" />
                            <div>
                                <div className="font-medium text-slate-800">{s.edge||s.name||`Կանգառ ${i}`}</div>
                                {s.addr && <div className="text-xs text-slate-500">{s.addr}</div>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    );
}

function SummaryCard({
                         trip, seats, pricing = {}, payment,
                         addSeats, setAddSeats, onAdd, onCancel,
                         canFreeCancel, adding, cancelling,
                         canAdd, canCancel, finished
                     }){
    const basePerSeat = pricing.base_per_seat_amd ?? trip.price_amd ?? 0;
    const effectivePerSeat = pricing.effective_per_seat_amd ?? basePerSeat;
    const addonTotal = pricing.addon_total_amd ?? 0;
    const total = pricing.total_amd ?? Math.max(0, seats * effectivePerSeat);
    const hasAddon = addonTotal > 0;
    return (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 space-y-1">
                <div className="text-sm text-emerald-700">{fmtDT(trip.departure_at)}</div>
                <div className="text-xl font-semibold">{trip.from} → {trip.to}</div>
            </div>

            <div className="mb-4 space-y-2 rounded-2xl bg-emerald-50 p-4">
                <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>Բազային արժեք / տեղ</span>
                    <span className="font-semibold text-slate-700">{hyNum(basePerSeat)} AMD</span>
                </div>
                {hasAddon && (
                    <div className="flex items-center justify-between text-sm text-emerald-700">
                        <span>Վերջնական արժեք / տեղ</span>
                        <span className="font-semibold">{hyNum(effectivePerSeat)} AMD</span>
                    </div>
                )}
                {hasAddon && (
                    <div className="text-xs text-slate-600">Հավելավճար՝ +{hyNum(addonTotal)} AMD</div>
                )}
                <div className="border-t border-emerald-200 pt-2 text-right text-sm text-slate-600">
                    Ընդհանուր՝ <span className="font-semibold text-emerald-700">{hyNum(total)} AMD</span>
                </div>
            </div>

            {canAdd ? (
                <div className="mb-3 rounded-xl border border-slate-200 bg-white p-3">
                    <div className="mb-2 text-sm text-slate-600">Ավելացնել տեղ</div>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={()=>setAddSeats(-1)} className="h-9 w-9 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100">−</button>
                        <div className="grid h-9 min-w-12 place-items-center rounded-xl border border-slate-300 bg-white px-2 font-medium">{addSeats}</div>
                        <button type="button" onClick={()=>setAddSeats(1)} className="h-9 w-9 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100">+</button>
                        <button onClick={onAdd} disabled={adding} className="ml-auto rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">Ավելացնել</button>
                    </div>
                </div>
            ) : (
                <div className="mb-3 text-xs text-slate-500">
                    {finished ? 'Երթուղին ավարտված է․ փոփոխությունները անհասանելի են։' : 'Ավելացնելու համար տեղ չկա կամ գործողությունը անհնար է։'}
                </div>
            )}

            {canCancel ? (
                <button onClick={onCancel} disabled={cancelling}
                        className={`mb-2 w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow ${canFreeCancel?"bg-rose-600 hover:bg-rose-700":"bg-amber-600 hover:bg-amber-700"}`}>
                    Չեղարկել ամրագիրը{!canFreeCancel?" (կարող է լինել տույժ)":""}
                </button>
            ) : (
                <div className="mb-2 w-full rounded-2xl px-4 py-3 text-sm font-semibold text-slate-500 text-center bg-slate-100">
                    Չեղարկումը հասանելի չէ
                </div>
            )}

            <div className="text-xs text-slate-500">Չեղարկումը օգտվում է առկա կանոններից</div>
        </div>
    );
}

/* ===== atoms ===== */
function Card({ children }){ return <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">{children}</div>; }
function Kv({ k, v }){ return (<div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"><div className="text-slate-600">{k}</div><div className="font-medium text-slate-800">{v}</div></div>); }
function StatusBadge({ status, finished, className='' }){
    const map = {
        pending:"bg-amber-100 text-amber-700 ring-1 ring-amber-200",
        accepted:"bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200",
        rejected:"bg-rose-100 text-rose-700 ring-1 ring-rose-200",
        cancelled:"bg-slate-100 text-slate-700 ring-1 ring-slate-200",
        deleted:"bg-slate-100 text-slate-500 ring-1 ring-slate-200",
    };
    const text =
        status==='accepted' ? (finished ? "Ավարտված" : "Հաստատված") :
            status==='pending'  ? "Սպասում է" :
                status==='rejected' ? "Մերժված" :
                    status==='cancelled'? "Չեղարկված" :
                        status==='deleted'  ? "Հեռացված" : status;

    return <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${map[status]||"bg-slate-100 text-slate-700"} ${className}`}><Ticket className="h-3.5 w-3.5"/>{text}</span>;
}

function CountdownBar({ until }){
    const twelve = 12*3600; const left = until.seconds; const pct = Math.max(0, Math.min(100, 100 - Math.min(left,twelve)/twelve*100));
    return (
        <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-xs text-slate-600"><span>Մինչ մեկնարկը</span><span className="font-medium text-emerald-700">{until.hh}:{until.mm}:{until.ss}</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-emerald-100"><div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500" style={{ width: `${pct}%`, transition: "width .8s ease" }} /></div>
        </div>
    );
}

/* ===== map with route & stops (Leaflet + OSRM) ===== */
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons for bundlers
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

function FitTo({ routeCoords, pts }){
    const map = useMap();
    useEffect(() => {
        const coords = routeCoords?.length
            ? routeCoords.map((p) => [p.lat, p.lng])
            : (pts||[]).filter(p=>Number.isFinite(p?.lat)&&Number.isFinite(p?.lng)).map((p)=>[p.lat,p.lng]);
        if (!coords.length) return;
        const b = L.latLngBounds(coords);
        map.fitBounds(b.pad(0.2));
    }, [map, routeCoords?.length, JSON.stringify(pts)]);
    return null;
}

function MapRoute({ A, B, stops = [], pickup = null, drop = null, routePoints = [], onDuration }) {
    const [routeCoords, setRouteCoords] = useState([]); // [{lat,lng}]
    const [fallbackCoords, setFallbackCoords] = useState([]);

    const normPoint = (p) => {
        if (!p) return null;
        const lat = Number(p.lat);
        const lng = Number(p.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return { lat, lng };
    };

    const normA    = normPoint(A);
    const normB    = normPoint(B);
    const normPickup = normPoint(pickup);
    const normDrop   = normPoint(drop);
    const providedRoute = useMemo(
        () => (routePoints || []).map((p) => normPoint(p)).filter(Boolean),
        [JSON.stringify(routePoints)]
    );

    // Порядок точек, через которые "принятый" рейс поедет
    const points = useMemo(() => {
        const orderedStops = (stops || [])
            .slice()
            .sort((a, b) => (a.position || 0) - (b.position || 0))
            .map((s) => normPoint(s))
            .filter(Boolean);

        const arr = [];
        if (normA) arr.push(normA);

        // Вставляем pickup ближе к старту
        if (normPickup) arr.push(normPickup);

        // Потом официальные остановки
        arr.push(...orderedStops);

        // Drop ближе к финишу
        if (normDrop) arr.push(normDrop);

        if (normB) arr.push(normB);

        return arr;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(stops), JSON.stringify(normA), JSON.stringify(normB), JSON.stringify(normPickup), JSON.stringify(normDrop)]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (providedRoute.length > 1) {
                setRouteCoords(providedRoute);
                setFallbackCoords([]);
                return;
            }
            if (points.length < 2) {
                setRouteCoords([]);
                setFallbackCoords([]);
                return;
            }
            try {
                const r = await osrmRouteVia('driving', points);
                if (cancelled) return;
                const coords = (r?.geometry?.coordinates || []).map(([lng, lat]) => ({ lat, lng }));
                if (coords.length > 1) {
                    setRouteCoords(coords);
                    setFallbackCoords([]);
                } else {
                    setRouteCoords([]);
                    setFallbackCoords(points.map(p => ({ lat: p.lat, lng: p.lng })));
                }
                if (onDuration && Number.isFinite(r?.duration)) onDuration(r.duration); // seconds
            } catch {
                if (cancelled) return;
                setRouteCoords([]);
                setFallbackCoords(points.map(p => ({ lat: p.lat, lng: p.lng })));
            }
        })();
        return () => { cancelled = true; };
    }, [JSON.stringify(points), onDuration]);

    const mid = (normA && normB)
        ? [(normA.lat + normB.lat) / 2, (normA.lng + normB.lng) / 2]
        : (providedRoute[0] ? [providedRoute[0].lat, providedRoute[0].lng] : [40.1792, 44.4991]);

    return (
        <MapContainer center={mid} zoom={8} className="h-full w-full">
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Route polyline */}
            {routeCoords.length > 1 && (
                <Polyline positions={routeCoords.map(p => [p.lat, p.lng])} weight={6} />
            )}
            {routeCoords.length === 0 && fallbackCoords.length > 1 && (
                <Polyline positions={fallbackCoords.map(p => [p.lat, p.lng])} weight={4} />
            )}

            {/* Markers: A, stops, B */}
            {normA && (
                <Marker position={[normA.lat, normA.lng]} icon={mkDivIcon('#16a34a', 'Սկիզբ')} />
            )}
            {(stops || [])
                .slice()
                .sort((a, b) => (a.position || 0) - (b.position || 0))
                .forEach} {/* оставь как есть, см. ниже */}
            {(stops || [])
                .slice()
                .sort((a, b) => (a.position || 0) - (b.position || 0))
                .map((s, i) => {
                    const ns = normPoint(s);
                    if (!ns) return null;
                    return (
                        <Marker
                            key={i}
                            position={[ns.lat, ns.lng]}
                            icon={mkDivIcon('#22c55e', String(i + 1))}
                        />
                    );
                })}
            {normB && (
                <Marker position={[normB.lat, normB.lng]} icon={mkDivIcon('#ef4444', 'Վերջ')} />
            )}

            {/* Маркеры клиента: pickup / drop */}
            {normPickup && (
                <Marker
                    position={[normPickup.lat, normPickup.lng]}
                    icon={mkDivIcon('#0ea5e9', 'Վերցնել')}
                />
            )}
            {normDrop && (
                <Marker
                    position={[normDrop.lat, normDrop.lng]}
                    icon={mkDivIcon('#6366f1', 'Իջեցնել')}
                />
            )}

            <FitTo routeCoords={routeCoords} pts={points} />
        </MapContainer>
    );
}
