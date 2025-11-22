import React, { useEffect, useMemo, useState } from "react";
import { Link, router, usePage } from "@inertiajs/react";
import DriverLayout from "@/Layouts/DriverLayout";
import dayjs from "dayjs";

/* ================= utils ================= */
const NOMI_LANG = "hy,ru,en";
const hyNum = (n)=>{ try{ return new Intl.NumberFormat("hy-AM").format(n||0);}catch{return String(n);} };
const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
const payText = (arr=[]) => {
    const hasCard = arr?.includes("card"); const hasCash = arr?.includes("cash");
    return `${hasCard?"Քարտ":""}${hasCard&&hasCash?" · ":""}${hasCash?"Կանխիկ":""}` || "—";
};
const fmtETA = (dt)=> dayjs(dt).format("MMM DD, HH:mm");
const fmtMinutes = (m)=>{ const x=Math.max(0,Math.round(m||0)); const h=Math.floor(x/60); const mm=x%60; return h?`${h} ժ ${mm} ր`:`${mm} ր`; };
const st = (s)=> ({ pending:"Սպասում է", accepted:"Ընդունված", rejected:"Մերժված", cancelled:"Չեղարկված" }[s]||s);
const csrf = ()=> (document.querySelector('meta[name="csrf-token"]')?.content || "");
const nearEq = (a,b,eps=1e-4)=> a && b && Math.abs(a.lat-b.lat)<=eps && Math.abs(a.lng-b.lng)<=eps;

/* ---- helpers: geocode & osrm ---- */
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

/* ================= Leaflet map ================= */
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

/* ================= safe post to route or URL ================= */
function tryRoutesPost(candidates, data={}, opts={}){
    for(const c of candidates){
        try{
            const href = typeof c === "string" && c.startsWith("/") ? c : (window.route ? window.route(c.name, c.param) : null);
            if(href){ router.post(href, data, opts); return true; }
        }catch(_e){}
    }
    return false;
}

/* ================= page ================= */
export default function TripShow({ trip, requests=[], ratingsByUserId={} }){
    const flash = usePage().props?.flash || {};
    const [from,setFrom]=useState({ lng: Number.isFinite(trip.from_lng)? trip.from_lng : parseFloat(trip.from_lng), lat: Number.isFinite(trip.from_lat)? trip.from_lat : parseFloat(trip.from_lat), addr: trip.from_addr||"", });
    const [to,setTo]=useState({ lng: Number.isFinite(trip.to_lng)? trip.to_lng : parseFloat(trip.to_lng), lat: Number.isFinite(trip.to_lat)? trip.to_lat : parseFloat(trip.to_lat), addr: trip.to_addr||"", });
    const [stops,setStops]=useState((trip.stops||[]).map(s=>({lng:s.lng,lat:s.lat,addr:s.addr||"",name:s.name||""})));
    const [preview,setPreview]=useState(null);
    const [mode,setMode]=useState("stop");
    const [savingStops,setSavingStops]=useState(false);

    // Accept/Reject processing flags
    const [workingAccept, setWorkingAccept] = useState({});
    const [workingReject, setWorkingReject] = useState({});

    // Simulation modal state
    const [sim,setSim] = useState({
        open:false, loading:false, error:null, reqId:null,
        base:null, new:null, delta:null,
        earn:{current:0,plus:0,projected:0},
        baseCoords:[], newCoords:[],
        baseStops:[], newStops:[], addedStops:[]
    });

    // countdown & ETA
    const depISO = trip.departure_at;
    const [now,setNow]=useState(()=>new Date());
    const [routeDurMin,setRouteDurMin]=useState(180);
    useEffect(()=>{ const t=setInterval(()=>setNow(new Date()),1000); return ()=>clearInterval(t); },[]);
    const minsLeft = Math.round((new Date(depISO) - now)/60000);
    const eta = useMemo(()=>{
        const start = dayjs(depISO);
        const end = start.add(routeDurMin||180, "minute");
        return fmtETA(end);
    }, [depISO, routeDurMin]);

    // sync from props
    useEffect(()=>{
        setFrom({ lng: parseFloat(trip.from_lng), lat: parseFloat(trip.from_lat), addr: trip.from_addr||"" });
        setTo({   lng: parseFloat(trip.to_lng),   lat: parseFloat(trip.to_lat),   addr: trip.to_addr||"" });
        setStops((trip.stops||[]).map(s=>({lng:s.lng,lat:s.lat,addr:s.addr||"",name:s.name||""})));
    }, [trip.id, trip.from_lng, trip.from_lat, trip.to_lng, trip.to_lat, JSON.stringify(trip.stops||[])]);

    // KPIs
    const accepted = requests.filter(r=>r.status==="accepted");
    const pending  = requests.filter(r=>r.status==="pending");
    const acceptedSeats = accepted.reduce((s,r)=>s+(r.seats||0),0);
    const pendingSeats  = pending.reduce((s,r)=>s+(r.seats||0),0);
    const freeSeats     = Math.max(0,(trip.seats_total||0) - acceptedSeats);

    const earningsAMD = requests
        .filter(r => r.trip_id === trip.id && r.status === "accepted")
        .reduce((sum, r) => sum + (Number(r.price_amd) || 0), 0);

    // helpers
    const seqBase = useMemo(()=>{
        const arr=[];
        if(Number.isFinite(from?.lng)&&Number.isFinite(from?.lat)) arr.push({lng:from.lng,lat:from.lat});
        (stops||[]).forEach(s=>{ if(Number.isFinite(s?.lng)&&Number.isFinite(s?.lat)) arr.push({lng:s.lng,lat:s.lat}); });
        if(Number.isFinite(to?.lng)&&Number.isFinite(to?.lat)) arr.push({lng:to.lng,lat:to.lat});
        return arr;
    }, [from?.lng,from?.lat,to?.lng,to?.lat, JSON.stringify(stops)]);

    async function saveStops(){
        setSavingStops(true);
        const payload = { stops: (stops||[]).slice(0,10).map((s,i)=>({ lat:s.lat, lng:s.lng, addr:s.addr||null, name:s.name||null, position:i+1 })) };
        const url = window.route ? route('driver.trip.stops.update', trip.id) : `/driver/trip/${trip.id}/stops`;
        router.patch(url, payload, { preserveScroll:true, onFinish:()=>setSavingStops(false) });
    }

    function acceptRequest(id){
        setWorkingAccept(x=>({...x,[id]:true}));
        const opts = {
            preserveScroll:true,
            onFinish:()=> setWorkingAccept(x=>({...x,[id]:false})),
            onSuccess:()=> {
                const url = window.route ? route('driver.trip.show', trip.id) : `/driver/trip/${trip.id}`;
                router.visit(url, { replace:true, preserveScroll:true });
            },
        };
        const ok = tryRoutesPost(
            [{ name:"driver.request.accept", param:id }, "/driver/requests/"+id+"/accept", "/driver/ride-requests/"+id+"/accept"],
            {}, opts
        );
        if(!ok) setWorkingAccept(x=>({...x,[id]:false}));
    }

    function rejectRequest(id){
        setWorkingReject(x=>({...x,[id]:true}));
        const opts = {
            preserveScroll:true,
            onFinish:()=> setWorkingReject(x=>({...x,[id]:false})),
            onSuccess:()=> {
                const url = window.route ? route('driver.trip.show', trip.id) : `/driver/trip/${trip.id}`;
                router.visit(url, { replace:true, preserveScroll:true });
            },
        };
        const ok = tryRoutesPost(
            [{ name:"driver.request.reject", param:id }, "/driver/requests/"+id+"/reject", "/driver/ride-requests/"+id+"/reject"],
            {}, opts
        );
        if(!ok) setWorkingReject(x=>({...x,[id]:false}));
    }

    // Simulation preview
    async function previewRequest(req){
        const m = req?.meta || {};
        const hasPickup = Number.isFinite(m?.pickup?.lat) && Number.isFinite(m?.pickup?.lng);
        const hasDrop   = Number.isFinite(m?.drop?.lat)   && Number.isFinite(m?.drop?.lng);
        if(!hasPickup && !hasDrop) return;

        setSim(s=>({...s, open:true, loading:true, error:null, reqId: req.id }));

        try{
            const url = window.route ? route('driver.trip.simulate', [trip.id, req.id]) : `/driver/trip/${trip.id}/simulate/${req.id}`;
            const res = await fetch(url, {
                method:'POST',
                headers:{ 'Accept':'application/json','Content-Type':'application/json','X-CSRF-TOKEN': csrf() },
                body: JSON.stringify({})
            });
            const data = await res.json();

            if(!res.ok || !data?.ok){
                setSim({
                    open:true, loading:false, error:data?.error||('HTTP_'+res.status), reqId:req.id,
                    base:null, new:null, delta:null,
                    earn:{current:0,plus:0,projected:0},
                    baseCoords:[], newCoords:[],
                    baseStops:[], newStops:[], addedStops:[]
                });
                return;
            }

            // точки: base/new/added
            const baseStops = (stops||[]).map(s=>({lat:+s.lat, lng:+s.lng}));
            const newStops  = (data.stops||[]).map(s=>({lat:+s.lat, lng:+s.lng}));
            const addedStops = newStops.filter(ns => !baseStops.some(bs => nearEq(ns, bs)));

            // маршруты
            const basePts = [
                {lng:from.lng, lat:from.lat},
                ...baseStops.map(s=>({lng:s.lng,lat:s.lat})),
                {lng:to.lng, lat:to.lat}
            ];
            const newPts = [
                {lng:from.lng, lat:from.lat},
                ...newStops.map(s=>({lng:s.lng,lat:s.lat})),
                {lng:to.lng, lat:to.lat}
            ];

            let baseCoords=[], newCoords=[];
            try{ const r = await osrmRouteVia("driving", basePts); baseCoords = (r?.geometry?.coordinates||[]).map(([lng,lat])=>({lat,lng})); }catch{}
            try{ const r = await osrmRouteVia("driving", newPts);  newCoords  = (r?.geometry?.coordinates||[]).map(([lng,lat])=>({lat,lng})); }catch{}

            setSim({
                open:true, loading:false, error:null, reqId:req.id,
                base: data.base_duration_sec, new: data.new_duration_sec, delta: data.delta_sec,
                earn: data.earnings || {current:0,plus:0,projected:0},
                baseCoords, newCoords,
                baseStops, newStops, addedStops
            });
        }catch(e){
            setSim({
                open:true, loading:false, error:String(e), reqId:req.id,
                base:null,new:null,delta:null,earn:{current:0,plus:0,projected:0},
                baseCoords:[], newCoords:[], baseStops:[], newStops:[], addedStops:[]
            });
        }
    }

    const closeSim = ()=> setSim({
        open:false,loading:false,error:null,reqId:null,
        base:null,new:null,delta:null,earn:{current:0,plus:0,projected:0},
        baseCoords:[],newCoords:[],baseStops:[],newStops:[],addedStops:[]
    });

    return (
        <DriverLayout current="trips">
            <div className="space-y-6">
                {flash?.ok && (<div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{String(flash.ok)}</div>)}
                {flash?.error && (<div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{String(flash.error)}</div>)}

                {/* header */}
                <div className="mb-2 flex items-center justify-between">
                    <div>
                        <div className="text-xs text-emerald-700">{dayjs(depISO).format("YYYY-MM-DD HH:mm")}</div>
                        <h1 className="text-2xl font-bold">{trip.from_addr} → {trip.to_addr}</h1>
                        <div className="text-sm text-slate-600">Գին՝ {hyNum(trip.price_amd)} AMD / տեղ • Վճարում՝ {payText(trip.pay_methods)}</div>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        trip.driver_state==="done" ? "bg-slate-100 text-slate-800 ring-1 ring-slate-200"
                            : trip.driver_state==="en_route" ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
                                : "bg-amber-100 text-amber-800 ring-1 ring-amber-200"
                    }`}>
            {trip.driver_state==="done"?"Ավարտված":trip.driver_state==="en_route"?"Ճանապարհին":"Նշանակված"}
          </span>
                </div>

                {/* KPI row */}
                <KpiRow free={freeSeats} accepted={acceptedSeats} pending={pendingSeats} price={trip.price_amd} earnings={earningsAMD} pay={trip.pay_methods} />

                <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                    <div className="space-y-6">
                        {/* map + stops */}
                        <Card>
                            <div className="mb-2 flex items-center justify-between">
                                <div className="text-lg font-semibold">Քարտեզ և կանգառներ</div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-slate-600">Ռեժիմ</span>
                                    <div className="flex overflow-hidden rounded-xl border border-slate-300">
                                        {["from","stop","to"].map(k=>(
                                            <button key={k} onClick={()=>setMode(k)}
                                                    className={`px-3 py-1.5 text-sm ${mode===k?"bg-gradient-to-r from-emerald-500 to-cyan-500 text-white":"bg-white hover:bg-slate-100"}`}>
                                                {k==="from"?"Սկիզբ":k==="to"?"Վերջ":"Կանգառ"}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-3 md:grid-cols-2">
                                <div className="h-80 overflow-hidden rounded-2xl border relative z-0">
                                    <MapWithStops
                                        from={from} to={to} stops={stops}
                                        setFrom={setFrom} setTo={setTo} setStops={setStops}
                                        mode={mode} setMode={setMode}
                                        preview={preview} setPreview={setPreview}
                                        onRouteDuration={(sec)=> setRouteDurMin(Math.max(1, Math.round(sec/60)))}
                                    />
                                </div>
                                <div className="space-y-3">
                                    <StopAdder onPick={(p)=>setPreview(p)} onAdd={(p)=>{ setStops(list=>[...list,p].slice(0,10)); setPreview(null); }} />
                                    <StopsEditor stops={stops} setStops={setStops} />
                                    <div className="flex gap-2">
                                        <button onClick={saveStops} disabled={savingStops} className="rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                                            {savingStops?"Պահպանում…":"Պահպանել կանգառները"}
                                        </button>
                                        <button onClick={()=>setStops([])} className="rounded-xl border px-4 py-2 text-sm">Մաքրել</button>
                                        <Link href={route("driver.trip_stop_requests.index", trip.id)} className="rounded-xl border px-4 py-2 text-sm hover:bg-slate-50">
                                            Հայցեր կանգառների համար →
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <TripStopsCard from={from} to={to} stops={stops} />

                        {/* passengers */}
                        <PassengersCard
                            trip={trip}
                            requests={requests}
                            ratingsByUserId={ratingsByUserId}
                            onAccept={acceptRequest}
                            onReject={rejectRequest}
                            onPreview={previewRequest}
                            workingAccept={workingAccept}
                            workingReject={workingReject}
                        />

                        {!!trip.description && (
                            <Card>
                                <div className="mb-2 text-lg font-semibold">Նկարագրություն</div>
                                <div className="whitespace-pre-wrap text-sm text-slate-800">{trip.description}</div>
                            </Card>
                        )}
                    </div>

                    <aside className="self-start lg:sticky lg:top-24">
                        <Card>
                            <div className="mb-3 text-lg font-semibold">Վերահսկում</div>
                            <div className="grid gap-2 text-sm">
                                <Row k="Մինչ մեկնարկը" v={minsLeft>0 ? `${minsLeft} ր․` : "Սկսված/Ավարտված"} />
                                <Row k="Տևողությունը" v={`~${fmtMinutes(routeDurMin)}`}  />
                                <Row k="ԵՏԱ" v={eta} />
                                <Row k="Մեկ seat գին" v={`${hyNum(trip.price_amd)} AMD`} />
                                <Row k="Տեղեր՝ զբաղ./ընդմ." v={`${acceptedSeats}/${trip.seats_total}`} />
                                <Row k="Վճարում" v={payText(trip.pay_methods)} />
                            </div>
                            {trip.driver_state!=="done" && (
                                <div className="mt-3 grid gap-2">
                                    {trip.driver_state==="en_route" ? (
                                        <button onClick={()=>router.post(route("driver.trip.finish", trip.id))}
                                                className="rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 px-4 py-2 font-semibold text-white">
                                            Ավարտել
                                        </button>
                                    ) : (
                                        <button onClick={()=>router.post(route("driver.trip.start", trip.id))}
                                                className="rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2 font-semibold text-white">
                                            Սկսել ուղևորությունը
                                        </button>
                                    )}
                                </div>
                            )}
                        </Card>
                    </aside>
                </div>
            </div>

            {/* Simulation Modal */}
            {sim.open && (
                <div className="fixed inset-0 z-[10000]">
                    {/* backdrop */}
                    <div className="absolute inset-0 bg-black/50" onClick={closeSim} />

                    {/* modal */}
                    <div
                        className="relative z-[10001] grid h-full w-full place-items-center p-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-full max-w-5xl rounded-3xl bg-white p-4 shadow-2xl">
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => { if(sim.reqId) acceptRequest(sim.reqId); closeSim(); }}
                                        className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:brightness-95"
                                        disabled={!sim.reqId}
                                    >
                                        Ընդունել հայտը
                                    </button>
                                    <button
                                        onClick={() => { if(sim.reqId) rejectRequest(sim.reqId); closeSim(); }}
                                        className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:brightness-95"
                                        disabled={!sim.reqId}
                                    >
                                        Մերժել հայտը
                                    </button>
                                </div>
                                <div className="text-lg font-semibold">Պրեվյու՝ օպտիմացված երթուղի</div>
                                <button onClick={closeSim} className="rounded-xl border px-3 py-1 text-sm">Փակել</button>
                            </div>

                            {sim.loading ? (
                                <div className="rounded-xl border bg-slate-50 p-6 text-sm">Հաշվում է…</div>
                            ) : sim.error ? (
                                <div className="rounded-xl border bg-rose-50 p-4 text-sm text-rose-700">
                                    Սխալ: {String(sim.error)}
                                </div>
                            ) : (
                                <>
                                    <div className="mb-3 grid gap-3 sm:grid-cols-3">
                                        <Row k="Նոր տևողություն" v={sim.new ? `~${fmtMinutes(sim.new/60)}` : "—"} />
                                        <Row k="Տարբերություն" v={Number.isFinite(sim.delta)? `${Math.round(sim.delta/60)} ր` : "—"} />
                                        <Row k="Սպասվող ժամանել" v={sim.new ? dayjs(depISO).add(Math.round(sim.new/60), "minute").format("YYYY-MM-DD HH:mm") : "—"} />
                                    </div>
                                    <div className="mb-3 grid gap-3 sm:grid-cols-3">
                                        <Row k="Ընթացիկ եկամուտ" v={`${hyNum(sim.earn.current)} AMD`} />
                                        <Row k="Այս ուղևորից +" v={`${hyNum(sim.earn.plus)} AMD`} />
                                        <Row k="Եթե ընդունեմ՝ միասին" v={`${hyNum(sim.earn.projected)} AMD`} />
                                    </div>

                                    <div className="h-[56vh] overflow-hidden rounded-2xl border">
                                        <MapContainer
                                            center={[from.lat || 40.1792, from.lng || 44.4991]}
                                            zoom={8}
                                            className="h-full w-full relative z-0"
                                            style={{ zIndex: 0 }}
                                        >
                                            <TileLayer attribution="&copy; OSM" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                                            {/* Линии: базовая и новая */}
                                            {/* {sim.baseCoords?.length > 1 && (
                                                <Polyline positions={sim.baseCoords.map((p) => [p.lat, p.lng])} weight={4} />
                                            )} */}
                                            {sim.newCoords?.length > 1 && (
                                                <Polyline positions={sim.newCoords.map((p) => [p.lat, p.lng])} weight={6} />
                                            )}

                                            {/* Точки: старт/финиш */}
                                            {Number.isFinite(from?.lng)&&Number.isFinite(from?.lat) && (
                                                <Marker position={[from.lat,from.lng]} icon={mkDivIcon("#16a34a","Սկիզբ")} />
                                            )}
                                            {Number.isFinite(to?.lng)&&Number.isFinite(to?.lat) && (
                                                <Marker position={[to.lat,to.lng]} icon={mkDivIcon("#ef4444","Վերջ")} />
                                            )}

                                            {/* Точки: существующие остановки (зелёные) */}
                                            {(sim.baseStops||[]).map((s,i)=>(
                                                Number.isFinite(s?.lng)&&Number.isFinite(s?.lat)
                                                    ? <Marker key={`base-${i}-${s.lng},${s.lat}`} position={[s.lat,s.lng]} icon={mkDivIcon("#22c55e", String(i+1))} />
                                                    : null
                                            ))}

                                            {/* Точки: добавленные в новой схеме (синие) */}
                                            {(sim.addedStops||[]).map((s,i)=>(
                                                Number.isFinite(s?.lng)&&Number.isFinite(s?.lat)
                                                    ? <Marker key={`added-${i}-${s.lng},${s.lat}`} position={[s.lat,s.lng]} icon={mkDivIcon("#3b82f6", `+${i+1}`)} />
                                                    : null
                                            ))}

                                            <FitTo routeCoords={sim.newCoords?.length ? sim.newCoords : sim.baseCoords} />
                                        </MapContainer>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </DriverLayout>
    );
}

/* ================= KPI row ================= */
function KpiRow({ free, accepted, pending, price, earnings, pay }){
    return (
        <div className="grid gap-4 md:grid-cols-4">
            <Card><div className="text-sm text-slate-600">Ազատ տեղեր</div><div className="mt-1 text-2xl font-bold text-emerald-700">{free}</div></Card>
            <Card>
                <div className="text-sm text-slate-600">Հաստատված տեղեր</div>
                <div className="mt-1 text-2xl font-bold text-emerald-700">
                    {accepted} <span className="text-sm font-normal text-slate-500">(+ {pending} սպասում)</span>
                </div>
            </Card>
            <Card><div className="text-sm text-slate-600">Վարձ</div><div className="mt-1 text-2xl font-bold text-emerald-700">{hyNum(price)} AMD</div></Card>
            <Card>
                <div className="text-sm text-slate-600">Սպասվող եկամուտ</div>
                <div className="mt-1 text-2xl font-bold text-emerald-700">{hyNum(earnings)} AMD</div>
                <div className="text-xs text-slate-500">Վճարում՝ {payText(pay)}</div>
            </Card>
        </div>
    );
}

/* ================= passengers ================= */
function PassengersCard({ trip, requests=[], ratingsByUserId={}, onAccept, onReject, onPreview, workingAccept={}, workingReject={} }){
    const done = trip.driver_state==="done";
    const groups = useMemo(()=>({
        pending:  requests.filter(r=>r.status==="pending"),
        accepted: requests.filter(r=>r.status==="accepted"),
        rejected: requests.filter(r=>r.status==="rejected"),
    }), [requests]);

    const hasPts = (m)=>{
        const mk = (p)=>Number.isFinite(p?.lat)&&Number.isFinite(p?.lng);
        return mk(m?.pickup)||mk(m?.drop);
    };

    const renderRow = (r)=> {
        const rated = r.user_id ? ratingsByUserId?.[r.user_id] : null;
        const wa = !!workingAccept[r.id];
        const wr = !!workingReject[r.id];
        return (
            <div key={r.id} className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="font-medium">{r.passenger_name} · {r.phone||"—"}</div>
                    <div className="text-sm text-slate-600">Տեղեր՝ {r.seats} · Վճարում՝ {r.payment==="card"?"Քարտ":"Կանխիկ"} · Կարգավիճակ՝ {st(r.status)}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {r.user_id && (
                        <button onClick={()=>router.post(route("driver.request.open_chat", r.id))}
                                className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50">💬 Չաթ</button>
                    )}

                    {hasPts(r.meta) && (
                        <button onClick={()=>onPreview?.(r)} className="rounded border border-emerald-600 px-3 py-1.5 text-sm text-emerald-700 hover:bg-emerald-50">🧭 Պրեվյու</button>
                    )}

                    {trip.driver_state!=="done" && (
                        <>
                            {r.status!=="accepted" && (
                                <button onClick={()=>onAccept?.(r.id)} disabled={wa || wr}
                                        className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white disabled:opacity-60">
                                    {wa?"Ընդունում…":"Ընդունել"}
                                </button>
                            )}
                            <button onClick={()=>onReject?.(r.id)} disabled={wa || wr}
                                    className="rounded bg-rose-600 px-3 py-1.5 text-sm text-white disabled:opacity-60">
                                {wr? (r.status==="accepted"?"Չեղարկում…":"Մերժում…") : (r.status==="accepted"?"Մերժել (չեղարկել)":"Մերժել")}
                            </button>
                        </>
                    )}

                    {done && r.user_id && (
                        <RateMini
                            initial={rated?.rating ? Number(rated.rating) : 5}
                            initialText={rated?.description||""}
                            disabled={!!rated}
                            onSave={(val, text)=>{
                                router.post(route("driver.trip.rate_user", trip.id), { user_id: r.user_id, rating: val, description: text }, { preserveScroll:true });
                            }}
                        />
                    )}
                </div>
            </div>
        );
    };

    return (
        <Card>
            <div className="mb-3 text-lg font-semibold">Ուղևորներ</div>
            {groups.pending.length>0 && (<><div className="mb-1 text-sm font-semibold text-amber-700">Սպասողներ</div><div className="mb-3 space-y-2">{groups.pending.map(renderRow)}</div></>)}
            {groups.accepted.length>0 && (<><div className="mb-1 text-sm font-semibold text-emerald-700">Ընդունված</div><div className="mb-3 space-y-2">{groups.accepted.map(renderRow)}</div></>)}
            {groups.rejected.length>0 && (<><div className="mb-1 text-sm font-semibold text-slate-700">Մերժված</div><div className="space-y-2 opacity-70">{groups.rejected.map(renderRow)}</div></>)}
            {requests.length===0 && <div className="text-sm text-slate-500">Չկան տվյալներ</div>}
        </Card>
    );
}

/* ================= rate widget ================= */
function RateMini({ initial=5, initialText="", disabled=false, onSave }){
    const [v,setV]=useState(clamp(Math.round(initial),1,5));
    const [t,setT]=useState(initialText);
    return (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2">
            <div className="flex">{[1,2,3,4,5].map(i=>(
                <button key={i} disabled={disabled} onClick={()=>setV(i)} className={`px-0.5 text-xl ${i<=v?"text-yellow-500":"text-slate-300"}`}>★</button>
            ))}</div>
            <input disabled={disabled} value={t} onChange={e=>setT(e.target.value)} placeholder="Մեկնաբանություն"
                   className="w-52 rounded-lg border border-slate-300 px-2 py-1 text-sm outline-none disabled:bg-slate-100"/>
            <button disabled={disabled} onClick={()=>onSave?.(v,t)} className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white disabled:opacity-50">Պահպանել</button>
        </div>
    );
}

/* ================= stop adder ================= */
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
                        <button key={i} className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                                onMouseEnter={()=>onPick?.(p)} onFocus={()=>onPick?.(p)}
                                onClick={()=>{ onAdd?.({lng:p.lng,lat:p.lat,addr:p.label,name:""}); setQ(""); setList([]); }}>
                            {p.label}
                        </button>
                    ))}
                </div>
            )}
            <div className="mt-2 text-xs text-slate-500">Կարող եք նաև սեղմել քարտեզի վրա «Կանգառ» ռեժիմում</div>
        </div>
    );
}

/* ================= map with route & stops ================= */
function MapWithStops({ from, to, stops, setFrom, setTo, setStops, mode, setMode, preview, setPreview, onRouteDuration }){
    const [routeCoords, setRouteCoords] = useState([]); // [{lat,lng}]
    const [fallbackCoords, setFallbackCoords] = useState([]);

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
                const r = await osrmRouteVia("driving", points);
                if (cancelled) return;
                const coords = (r?.geometry?.coordinates||[]).map(([lng,lat])=>({lat,lng}));
                setRouteCoords(coords);
                setFallbackCoords([]);
                if (onRouteDuration && Number.isFinite(r?.duration)) onRouteDuration(r.duration); // seconds
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
                if (mode === "from"){
                    setFrom((x)=>({ ...x, ...p })); setMode("to");
                    try{ const addr=await reverseGeocode(p.lng,p.lat); setFrom((x)=>({ ...x, addr: addr || x.addr })); }catch{}
                } else if (mode === "to"){
                    setTo((x)=>({ ...x, ...p })); setMode("stop");
                    try{ const addr=await reverseGeocode(p.lng,p.lat); setTo((x)=>({ ...x, addr: addr || x.addr })); }catch{}
                } else {
                    try{ const addr=await reverseGeocode(p.lng,p.lat); setStops((arr)=>[...arr,{ ...p, addr, name:""}].slice(0,10)); }catch{ setStops((arr)=>[...arr,{ ...p, addr:"", name:""}].slice(0,10)); }
                    setPreview && setPreview(null);
                }
            }
        });
        return null;
    }

    return (
        <MapContainer center={center} zoom={8} className="h-full w-full relative z-0" style={{ zIndex: 0 }}>
            <TileLayer attribution='&copy; OSM' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {routeCoords.length > 1 && (<Polyline positions={routeCoords.map(p=>[p.lat,p.lng])} weight={6} />)}
            {routeCoords.length === 0 && fallbackCoords.length > 1 && (<Polyline positions={fallbackCoords.map(p=>[p.lat,p.lng])} weight={4} />)}

            {Number.isFinite(from?.lng)&&Number.isFinite(from?.lat) && (<Marker position={[from.lat,from.lng]} icon={mkDivIcon("#16a34a","Սկիզբ")} />)}
            {(stops||[]).map((s,i)=>(
                Number.isFinite(s?.lng)&&Number.isFinite(s?.lat)
                    ? <Marker key={`${s.lng},${s.lat},${i}`} position={[s.lat,s.lng]} icon={mkDivIcon("#22c55e", (s.name && s.name.trim()) ? s.name : String(i+1))} />
                    : null
            ))}
            {Number.isFinite(to?.lng)&&Number.isFinite(to?.lat) && (<Marker position={[to.lat,to.lng]} icon={mkDivIcon("#ef4444","Վերջ")} />)}
            {preview && Number.isFinite(preview.lng) && Number.isFinite(preview.lat) && (<Marker position={[preview.lat,preview.lng]} icon={mkDivIcon("#7c3aed", null)} />)}

            <FitTo routeCoords={routeCoords} pts={points} />
            <ClickHandler />
        </MapContainer>
    );
}

/* ================= trip stops summary ================= */
function TripStopsCard({ from, to, stops=[] }){
    return (
        <Card>
            <div className="mb-3 text-lg font-semibold">Ուղևորության կանգառներ</div>
            <ol className="space-y-2">
                {Number.isFinite(from?.lat)&&Number.isFinite(from?.lng) && (
                    <li className="flex items-start gap-2">
                        <span className="mt-1 h-5 w-5 shrink-0 rounded-full bg-emerald-600 text-white grid place-items-center text-xs">1</span>
                        <div>
                            <div className="font-medium">Սկիզբ</div>
                            <div className="text-sm text-slate-600">{from.addr || `${from.lat.toFixed(5)}, ${from.lng.toFixed(5)}`}</div>
                        </div>
                    </li>
                )}
                {(stops||[]).map((s,i)=>(
                    <li key={i} className="flex items-start gap-2">
            <span className="mt-1 h-5 w-5 shrink-0 rounded-full bg-emerald-500 text-white grid place-items-center text-xs">
              {(Number.isFinite(from?.lat)&&Number.isFinite(from?.lng) ? 2 : 1) + i}
            </span>
                        <div>
                            <div className="font-medium">{s.name?.trim() || `Կանգառ #${i+1}`}</div>
                            <div className="text-sm text-slate-600">{s.addr || `${s.lat?.toFixed(5)}, ${s.lng?.toFixed(5)}`}</div>
                        </div>
                    </li>
                ))}
                {Number.isFinite(to?.lat)&&Number.isFinite(to?.lng) && (
                    <li className="flex items-start gap-2">
            <span className="mt-1 h-5 w-5 shrink-0 rounded-full bg-rose-600 text-white grid place-items-center text-xs">
              {(Number.isFinite(from?.lat)&&Number.isFinite(from?.lng) ? 2 : 1) + (stops?.length||0)}
            </span>
                        <div>
                            <div className="font-medium">Վերջ</div>
                            <div className="text-sm text-slate-600">{to.addr || `${to.lat.toFixed(5)}, ${to.lng.toFixed(5)}`}</div>
                        </div>
                    </li>
                )}
            </ol>
        </Card>
    );
}

/* ================= list editor ================= */
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
                                   placeholder="Անուն (ոչ պարտադիր)" value={s.name||""} onChange={e=>edit(i,{name:e.target.value})}/>
                            <input className="w-full rounded-lg border px-2 py-1 text-xs outline-none focus:border-emerald-500"
                                   placeholder="Հասցե" value={s.addr||""} onChange={e=>edit(i,{addr:e.target.value})}/>
                            <div className="mt-1 text-[11px] text-slate-500">lng: {s.lng?.toFixed(6)} · lat: {s.lat?.toFixed(6)}</div>
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

/* ================= tiny UI ================= */
function Card({children}){ return <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">{children}</div>; }
function Row({k,v}){ return (<div className="flex items-center justify-between rounded-xl border bg-slate-50 px-3 py-2 text-sm"><div className="text-slate-600">{k}</div><div className="font-medium">{v}</div></div>); }
