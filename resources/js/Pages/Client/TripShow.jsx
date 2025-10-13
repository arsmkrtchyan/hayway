// resources/js/Pages/Client/TripShow.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import ClientLayout from "@/Layouts/ClientLayout";
import { router } from "@inertiajs/react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Car, Calendar, Clock, Users, ShieldCheck, Star, Check,
    Share2, Heart, MapPin, Navigation2, Search, X
} from "lucide-react";

/* ============ helpers ============ */
const fmtNum = (n) => { try { return new Intl.NumberFormat("hy-AM").format(n || 0); } catch { return n; } };
const fmtDT  = (iso) => !iso ? "—" : new Date(iso).toLocaleString("hy-AM",{month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"});
const clamp  = (n,a,b)=>Math.max(a,Math.min(b,n));
const inRange=(x,[a,b])=>Number.isFinite(x)&&x>=a&&x<=b;
const normLL = (p) => {
    let lng = Number(p?.lng), lat = Number(p?.lat);
    if(!Number.isFinite(lng)||!Number.isFinite(lat)) return null;
    const ok = inRange(lng,[43,47]) && inRange(lat,[38,42.6]);
    const okSwap = inRange(Number(p?.lat),[43,47]) && inRange(Number(p?.lng),[38,42.6]);
    if(!ok && okSwap){ [lng,lat] = [Number(p.lat), Number(p.lng)]; }
    if(!inRange(lng,[-180,180]) || !inRange(lat,[-90,90])) return null;
    return { lng: Math.round(lng*1e6)/1e6, lat: Math.round(lat*1e6)/1e6 };
};
const fmtEta = (sec) => {
    if(!Number.isFinite(sec)||sec<=0) return "—";
    const m=Math.round(sec/60), h=Math.floor(m/60), mm=m%60;
    return h>0 ? `${h} ժ ${mm} ր` : `${mm} ր`;
};
const distributeDots=(n,taken,pending)=> {
    const arr=[]; for(let i=0;i<Math.min(n,taken);i++) arr.push("red");
    for(let i=arr.length;i<Math.min(n,taken+pending);i++) arr.push("amber");
    while(arr.length<n) arr.push("green");
    return arr;
};
const dedupeBy=(arr,key)=>{const s=new Set();return arr.filter(x=>{const k=key(x);if(s.has(k))return false;s.add(k);return true;});};

/* ============ OSRM fallback ============ */
async function osrmRouteVia(points){
    const pts=(points||[]).map(normLL).filter(Boolean);
    if(pts.length<2) return null;
    const path = pts.map(p=>`${p.lng},${p.lat}`).join(";");
    const url  = `https://router.project-osrm.org/route/v1/driving/${path}?overview=full&geometries=geojson&alternatives=false&steps=false`;
    const r = await fetch(url);
    if(!r.ok) throw new Error(String(r.status));
    const d = await r.json();
    return d?.routes?.[0] || null;
}

/* ============ Geocoding (Nominatim) ============ */
async function geocodeQuery(q){
    const base="https://nominatim.openstreetmap.org/search";
    const params=(lang)=>new URLSearchParams({
        format:"jsonv2",addressdetails:"1",countrycodes:"am",limit:"6",
        viewbox:"43,38,47,42.6",bounded:"1","accept-language":lang,q
    }).toString();
    const urls=["hy","ru","en"].map(l=>`${base}?${params(l)}`);
    const results = await Promise.all(urls.map(u=>fetch(u).then(r=>r.ok?r.json():[]).catch(()=>[])));
    const flat = results.flat().map(x=>({
        id:String(x.place_id), lat:+x.lat, lng:+x.lon,
        display:x.display_name,
        name:x.name || x.address?.road || x.address?.city || x.address?.village || x.display_name
    }));
    return dedupeBy(flat, x=>x.id).slice(0,8);
}
async function reverseGeocode({lat,lng}){
    const u=`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=hy`;
    try{ const r=await fetch(u); if(!r.ok) return null; const d=await r.json(); return d?.display_name||null; }catch{ return null; }
}

/* ============ Leaflet ============ */
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
const DefaultIcon=L.icon({
    iconUrl:"https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl:"https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl:"https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize:[25,41],iconAnchor:[12,41],shadowSize:[41,41],
});
L.Marker.prototype.options.icon=DefaultIcon;
const mkDivIcon=(color,label=null)=>{
    const html=`
  <div style="position:relative;width:14px;height:14px;border-radius:50%;
    box-shadow:0 0 0 2px #fff,0 0 0 4px ${color};background:${color};"></div>
  ${label?`<div style="position:absolute;left:50%;top:0;transform:translate(-50%,-140%);
    font:600 11px/1 system-ui;padding:2px 6px;border-radius:8px;background:#fff;color:#065f46;
    border:1px solid rgba(5,150,105,.35);box-shadow:0 1px 2px rgba(0,0,0,.06)">${label}</div>`:""}
  `;
    return L.divIcon({ html, className:"", iconSize:[14,14], iconAnchor:[7,7] });
};
function FitTo({ coords, pts }){
    const map=useMap();
    useEffect(()=>{
        const arr = (coords?.length?coords:pts||[]).filter(p=>Number.isFinite(p?.lat)&&Number.isFinite(p?.lng));
        if(!arr.length) return;
        const b = L.latLngBounds(arr.map(p=>[p.lat,p.lng]));
        map.fitBounds(b.pad(0.2));
    },[map,JSON.stringify(coords),JSON.stringify(pts)]);
    return null;
}
function ClickCatcher({ onClick }){
    useMapEvents({ click(e){ onClick?.({lat:+e.latlng.lat.toFixed(6), lng:+e.latlng.lng.toFixed(6)}); } });
    return null;
}
function LeafletControlBox({ children, className }){
    const ref=useRef(null);
    useEffect(()=>{ if(ref.current){ L.DomEvent.disableClickPropagation(ref.current); L.DomEvent.disableScrollPropagation(ref.current); }},[]);
    return <div ref={ref} className={className}>{children}</div>;
}

/* ============ price preview ============ */
const distKm = (a,b)=>{
    if(!a||!b) return 0;
    const toRad=(d)=>d*Math.PI/180, R=6371;
    const dLat=toRad((b.lat||0)-(a.lat||0)), dLng=toRad((b.lng||0)-(a.lng||0));
    const s1=Math.sin(dLat/2)**2 + Math.cos(toRad(a.lat||0))*Math.cos(toRad(b.lat||0))*Math.sin(dLng/2)**2;
    return Math.round((2*R*Math.asin(Math.min(1,Math.sqrt(s1))))*100)/100;
};
function calcSurchargeAMD({ trip, pickup, drop }){
    const A=normLL({lat:trip.from_lat,lng:trip.from_lng});
    const B=normLL({lat:trip.to_lat,lng:trip.to_lng});
    let sum=0;
    if(pickup && Number.isFinite(trip.start_amd_per_km)){
        const free=Number.isFinite(trip.start_free_km)?trip.start_free_km:0;
        const per =trip.start_amd_per_km||0;
        const max =Number.isFinite(trip.start_max_km)?trip.start_max_km:Infinity;
        const over=Math.max(0, distKm(A,pickup)-free);
        sum += Math.round(Math.min(over,max)*per);
    }
    if(drop && Number.isFinite(trip.end_amd_per_km)){
        const free=Number.isFinite(trip.end_free_km)?trip.end_free_km:0;
        const per =trip.end_amd_per_km||0;
        const max =Number.isFinite(trip.end_max_km)?trip.end_max_km:Infinity;
        const over=Math.max(0, distKm(drop,B)-free);
        sum += Math.round(Math.min(over,max)*per);
    }
    return Math.max(0,sum);
}

/* ============ PAGE ============ */
export default function TripShow({ trip, eta_sec }){
    return (
        <ClientLayout current="trips">
            <div className="mb-6 flex items-center gap-3">
                <div className="relative">
                    <div className="absolute -inset-1 rounded-xl bg-emerald-400/40 blur-lg" />
                    <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-lg">
                        <Car className="h-6 w-6" />
                    </div>
                </div>
                <div>
                    <div className="text-xs uppercase tracking-wider text-emerald-700/80">Ուղևորություն</div>
                    <h1 className="text-2xl font-bold">{trip.from} → {trip.to}</h1>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                <div className="space-y-6">
                    <SummaryHero trip={trip} etaSec={eta_sec ?? trip.eta_sec} />
                    <Stats trip={trip} />
                    <ActorCard trip={trip} />
                    <VehicleCard vehicle={trip.vehicle} />
                    <About trip={trip} />
                </div>

                <aside className="self-start lg:sticky lg:top-6">
                    <SidebarBooking trip={trip} />
                </aside>
            </div>
        </ClientLayout>
    );
}

/* ============ sections ============ */
function SummaryHero({ trip, etaSec }){
    const [coords,setCoords]=useState([]);
    const A=useMemo(()=>normLL({lng:trip.from_lng,lat:trip.from_lat}),[trip.from_lng,trip.from_lat]);
    const B=useMemo(()=>normLL({lng:trip.to_lng,  lat:trip.to_lat}),  [trip.to_lng,trip.to_lat]);
    const stops = useMemo(()=> (trip.stops||[]).slice().sort((a,b)=>a.position-b.position).map(normLL).filter(Boolean), [trip.stops]);

    useEffect(()=>{
        let cancelled=false;
        (async()=>{
            try{
                const r=await osrmRouteVia([A,...stops,B].filter(Boolean));
                if(cancelled) return;
                const g=(r?.geometry?.coordinates||[]).map(([lng,lat])=>({lat,lng}));
                setCoords(g.length?g:[A,...stops,B].filter(Boolean));
            }catch{
                if(cancelled) return;
                setCoords([A,...stops,B].filter(Boolean));
            }
        })();
        return ()=>{cancelled=true};
    },[trip.id, JSON.stringify([A,stops,B])]);

    const markers = (trip.route_markers||[]).filter(m=>Number.isFinite(m?.lat)&&Number.isFinite(m?.lng));
    const center  = Number.isFinite(trip.from_lat) ? [trip.from_lat,trip.from_lng] : [40.1792,44.4991];

    return (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="h-1.5 w-full bg-[repeating-linear-gradient(90deg,#10b981_0_16px,#10b981_16px_18px,transparent_18px_34px,transparent_34px_36px)]" />
            <div className="grid gap-0 md:grid-cols-[1.2fr_1fr]">
                <div className="relative h-64 md:h-72">
                    <div className="absolute inset-0">
                        <MapContainer center={center} zoom={8} className="h-full w-full relative z-0" style={{zIndex:0}}>
                            <TileLayer attribution="&copy; OSM" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            {coords.length>1 && <Polyline positions={coords.map(p=>[p.lat,p.lng])} weight={6} />}
                            {markers.length
                                ? markers.map((m,i)=>{
                                    const label = m.source==='A'?'Սկիզբ':m.source==='B'?'Վերջ':m.source==='stop'?'Կանգառ':null;
                                    const color = m.source==='A'?'#16a34a':m.source==='B'?'#ef4444':'#0ea5e9';
                                    return <Marker key={i} position={[m.lat,m.lng]} icon={mkDivIcon(color,label)} />;
                                })
                                : <>
                                    {A && <Marker position={[A.lat,A.lng]} icon={mkDivIcon('#16a34a','Սկիզբ')} />}
                                    {B && <Marker position={[B.lat,B.lng]} icon={mkDivIcon('#ef4444','Վերջ')} />}
                                </>
                            }
                            <FitTo coords={coords} pts={markers} />
                        </MapContainer>
                    </div>
                    <div className="pointer-events-none absolute bottom-2 left-2 z-[20] rounded-lg bg-white/90 px-3 py-1.5 text-sm text-slate-700 shadow">
                        <Clock className="mr-1 inline h-4 w-4 text-emerald-600" />
                        Տևողություն՝ {fmtEta(etaSec)}
                    </div>
                </div>
                <div className="flex flex-col justify-between p-5">
                    <div className="space-y-3">
                        <Kv icon={<Calendar className="h-4 w-4 text-emerald-600" />} v={fmtDT(trip.departure_at)} />
                        <Kv icon={<Clock className="h-4 w-4 text-emerald-600" />} v={`Տևողություն․ ${fmtEta(etaSec)}`} />
                    </div>
                    <div className="pt-4 text-sm text-slate-600">
                        * Քարտեզը հաշվի է առնում նաև ոչ հանրային կանգառները։
                    </div>
                </div>
            </div>
        </div>
    );
}

function SidebarBooking({ trip }){
    const [open,setOpen]=useState(false);
    return (
        <>
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl relative z-10">
                <div className="mb-4 space-y-1">
                    <div className="text-sm text-emerald-700">{fmtDT(trip.departure_at)}</div>
                    <div className="text-xl font-semibold">{trip.from} → {trip.to}</div>
                </div>
                <div className="mb-4 rounded-2xl bg-emerald-50 p-4">
                    <div className="text-sm text-slate-600">Մեկ տեղ, գին</div>
                    <div className="text-3xl font-extrabold text-emerald-700">
                        {fmtNum(trip.price_amd)} <span className="text-base font-semibold text-emerald-600">AMD</span>
                    </div>
                </div>
                <div className="text-sm text-slate-600"><ShieldCheck className="mr-1 inline h-4 w-4 text-emerald-600"/> Պաշտպանված ամրագրում</div>
                <button onClick={()=>setOpen(true)} className="mt-3 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-400 px-4 py-3 font-semibold text-white shadow hover:brightness-95">Ամրագրել</button>
                <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                    <div className="inline-flex items-center gap-2"><Share2 className="h-4 w-4"/> Կիսվել</div>
                    <div className="inline-flex items-center gap-2"><Heart className="h-4 w-4"/> Պահել</div>
                </div>
            </div>
            <BookTripModal open={open} onClose={()=>setOpen(false)} trip={trip}/>
        </>
    );
}

function Stats({ trip }){
    const taken   = trip.seats_taken||0;
    const pending = trip.pending_requests_count||0;
    const total   = trip.seats_total||0;
    const dots = distributeDots(total,taken,pending);
    const dotSize = total>6?"h-2.5 w-2.5":"h-3 w-3";
    return (
        <div className="grid gap-4 md:grid-cols-3">
            <Card>
                <div className="text-sm text-slate-600">Ազատ տեղեր</div>
                <div className="mt-2">
                    <div className="flex flex-wrap gap-1">{dots.map((c,i)=>
                        <span key={i} className={`${dotSize} rounded-full ${c==="red"?"bg-rose-500":c==="amber"?"bg-amber-400":"bg-emerald-500"}`} />
                    )}</div>
                    <div className="mt-1 text-xs text-slate-500">Զբաղված՝ {taken} / {total} · Սպասում՝ {pending}</div>
                </div>
            </Card>
            <Card>
                <div className="text-sm text-slate-600">Վճար</div>
                <div className="mt-1 text-2xl font-bold text-emerald-600">{fmtNum(trip.price_amd)} AMD</div>
            </Card>
            <Card>
                <div className="text-sm text-slate-600">Պայմաններ</div>
                <div className="mt-1 text-emerald-700">Չեղարկում՝ 30 րոպե առաջ</div>
            </Card>
        </div>
    );
}

function ActorCard({ trip }){
    const a = trip.actor || { type:"driver", name:"Վարորդ", rating:5, trips:0 };
    return (
        <Card>
            <div className="mb-3 text-lg font-semibold">{a.type==="company" ? "Ընկերություն" : "Վարորդը"}</div>
            <div className="flex items-center gap-4">
                <div className="h-14 w-14 shrink-0 rounded-full border border-slate-200 bg-slate-50" />
                <div className="min-w-0">
                    <div className="truncate font-medium">{a.name}</div>
                    <div className="mt-1 flex items-center gap-3 text-sm text-slate-600">
                        <span className="inline-flex items-center gap-1 text-emerald-600"><Star className="h-4 w-4" />{(a.rating||0).toFixed(2)}</span>
                        <span className="text-slate-500">{a.trips} ուղևորություն</span>
                    </div>
                </div>
            </div>
        </Card>
    );
}

function VehicleCard({ vehicle }){
    const v = vehicle||{};
    return (
        <Card>
            <div className="mb-3 text-lg font-semibold">Մեքենայի տվյալներ</div>
            <div className="grid gap-3 sm:grid-cols-2">
                <Row k="Մարկա" v={v.brand||"—"} />
                <Row k="Մոդել" v={v.model||"—"} />
                <Row k="Գույն"  v={v.color||"—"} />
                <Row k="Պետհամարանիշ" v={v.plate||"—"} />
            </div>
        </Card>
    );
}

function About({ trip }){
    return (
        <Card>
            <div className="mb-2 text-lg font-semibold">Նկարագրություն</div>
            {trip.amenitiesByCat?.length
                ? <p className="text-slate-700">Հարմարություններ՝ {trip.amenitiesByCat.flatMap(c=>(c.items||[]).map(i=>i.name)).join(", ")}</p>
                : <p className="text-slate-700">—</p>
            }
        </Card>
    );
}

/* ============ Modal Booking (range lock) ============ */
function BookTripModal({ open, onClose, trip }){
    const [seats,setSeats]=useState(1);
    const [payment,setPayment]=useState(trip.pay_methods?.includes("cash")?"cash":(trip.pay_methods?.includes("card")?"card":"cash"));
    const [description,setDescription]=useState("");
    const [pickup,setPickup]=useState(null);
    const [drop,setDrop]=useState(null);
    const [sending,setSending]=useState(false);
    const [ok,setOk]=useState(false);
    const [errors,setErrors]=useState({});
    const [which,setWhich]=useState("pickup");

    useEffect(()=>{ if(!open){ setErrors({}); setOk(false);} },[open]);

    const A=useMemo(()=>normLL({lat:trip.from_lat,lng:trip.from_lng}),[trip.from_lat,trip.from_lng]);
    const B=useMemo(()=>normLL({lat:trip.to_lat,  lng:trip.to_lng}),  [trip.to_lat,trip.to_lng]);

    const pickupKm = useMemo(()=> (pickup&&A)?distKm(A,pickup):null,[pickup,A]);
    const dropKm   = useMemo(()=> (drop&&B)?distKm(drop,B):null,[drop,B]);

    const pickupOut = useMemo(()=> pickup && Number.isFinite(trip.start_max_km) && pickupKm>trip.start_max_km,[pickup,pickupKm,trip.start_max_km]);
    const dropOut   = useMemo(()=> drop && Number.isFinite(trip.end_max_km)   && dropKm>trip.end_max_km,[drop,dropKm,trip.end_max_km]);

    const outOfRange = pickupOut || dropOut;

    const extraAMD = useMemo(()=>calcSurchargeAMD({trip,pickup,drop}),[trip,pickup,drop]);
    const totalAMD = useMemo(()=> (seats*(trip.price_amd||0)) + extraAMD, [seats,trip.price_amd,extraAMD]);

    const typeKey = useMemo(()=>{
        if (trip.typeKey) return trip.typeKey;
        if (trip.type_pax_to_pax) return "PAX_PAX";
        if (trip.type_pax_to_b)   return "PAX_B";
        if (trip.type_a_to_pax)   return "A_PAX";
        if (trip.type_ab_fixed)   return "AB";
        return "AB";
    },[trip]);

    function buildPayload(){
        const computed = pickup && drop ? "PAX_PAX" : pickup ? "A_PAX" : drop ? "PAX_B" : "AB";
        const payload = { type: computed, seats, payment, description , price_amd: Math.max(0, Math.round(totalAMD)), };
        if (pickup) payload.pickup = pickup;
        if (drop)   payload.drop   = drop;
        return payload;
    }
    function submitBooking(e){
        e?.preventDefault?.();
        if(outOfRange) return;
        setSending(true); setErrors({});
        router.post(`/trips/${trip.id}/request`, buildPayload(), {
            preserveScroll:true,
            onError:(e)=>{ setErrors(e); setSending(false); },
            onSuccess:()=>{ setSending(false); setOk(true); setTimeout(()=>{ setOk(false); onClose?.(); }, 800); },
        });
    }

    const zonesLine = (
        <ul className="ml-5 list-disc">
            <li>Սկիզբ․ {Number.isFinite(trip.start_max_km) ? <>մինչև {trip.start_max_km} կմ {Number.isFinite(trip.start_free_km)&&Number.isFinite(trip.start_amd_per_km)?<>· անվճար մինչև {trip.start_free_km} կմ, ապա {trip.start_amd_per_km} AMD/կմ</>:null}</> : "սահմանափակում չկա"}</li>
            <li>Վերջ․ {Number.isFinite(trip.end_max_km) ? <>մինչև {trip.end_max_km} կմ {Number.isFinite(trip.end_free_km)&&Number.isFinite(trip.end_amd_per_km)?<>· անվճար մինչև {trip.end_free_km} կմ, ապա {trip.end_amd_per_km} AMD/կմ</>:null}</> : "սահմանափակում չկա"}</li>
        </ul>
    );

    return (
        <AnimatePresence>
            {open && (
                <motion.div className="fixed inset-0 z-[9999]" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
                    <div className="absolute inset-0 bg-black/40" onClick={onClose} />
                    <motion.div
                        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
                        className="absolute left-4 right-4 top-20 bottom-6 md:left-8 md:right-8 md:top-24 md:bottom-8 mx-auto max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl"
                        style={{ zIndex: 10000 }}
                    >
                        <div className="flex items-center justify-between border-b px-5 py-3">
                            <div className="text-lg font-semibold">{trip.from} → {trip.to}</div>
                            <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100"><X className="h-5 w-5"/></button>
                        </div>

                        <div className="grid gap-0 md:grid-cols-[7fr_5fr]">
                            <div className="relative h-[70vh] min_h-[420px]">
                                <BookingMap
                                    trip={trip}
                                    pickup={pickup} drop={drop}
                                    which={which} setWhich={setWhich}
                                    onMapPick={async(pt)=>{
                                        const addr = await reverseGeocode(pt) || undefined;
                                        const v = { ...pt, addr };
                                        if(which==="pickup") setPickup(v); else setDrop(v);
                                    }}
                                />
                            </div>

                            <div className="flex max-h-[70vh] min-h-[420px] flex-col gap-4 overflow-y-auto p-5">
                                <SearchBox
                                    label="Վերցնելու կետ"
                                    placeholder="Գտնել հասցեն (AM/EN/RU)"
                                    value={pickup}
                                    onClear={()=>setPickup(null)}
                                    onPick={(res)=>{ setPickup({ lat:res.lat, lng:res.lng, addr:res.display }); setWhich("drop"); }}
                                    active={which==="pickup"}
                                />
                                <SearchBox
                                    label="Իջեցնելու կետ"
                                    placeholder="Գտնել հասցեն (AM/EN/RU)"
                                    value={drop}
                                    onClear={()=>setDrop(null)}
                                    onPick={(res)=>{ setDrop({ lat:res.lat, lng:res.lng, addr:res.display }); }}
                                    active={which==="drop"}
                                />

                                <TypeHints trip={trip} typeKey={typeKey} />

                                <div className="rounded-2xl bg-emerald-50 p-4">
                                    <div className="mb-2 text-sm text-slate-600">Վճարի հաշվարկ (նախնական)</div>
                                    <div className="flex items-end justify-between">
                                        <div>
                                            <div className="text-3xl font-extrabold text-emerald-700">
                                                {fmtNum(totalAMD)} <span className="text-base font-semibold text-emerald-600">AMD</span>
                                            </div>
                                            <div className="mt-1 text-xs text-slate-600">
                                                Արտ. {fmtNum(trip.price_amd)} × {seats}{extraAMD>0?<> + հավելավճար ≈ {fmtNum(extraAMD)}</>:null}
                                            </div>
                                        </div>
                                        <Qty seats={seats} setSeats={setSeats} />
                                    </div>
                                </div>

                                {/* Zones info */}
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                                    <div className="mb-1 font-medium">Գործողության գոտիներ</div>
                                    {zonesLine}
                                </div>

                                {/* Out-of-range warning */}
                                <AnimatePresence>
                                    {outOfRange && (
                                        <motion.div
                                            initial={{opacity:0, y:6}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-6}}
                                            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                                            Ընտրված կետը դուրս է կարմիր գոտուց․
                                            <ul className="ml-5 list-disc">
                                                {pickupOut && <li>Վերցնել՝ {pickupKm?.toFixed(1)} կմ · առավելագույնը {trip.start_max_km} կմ</li>}
                                                {dropOut   && <li>Իջեցնել՝ {dropKm?.toFixed(1)} կմ · առավելագույնը {trip.end_max_km} կմ</li>}
                                            </ul>
                                            Խնդրում ենք ընտրել կետ կարմիր շրջանի ներսում:
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div className="grid gap-2">
                                    <div className="text-sm text-slate-600">
                                        <Users className="mr-1 inline h-4 w-4 text-emerald-600"/>
                                        Վճարում՝ {[trip.pay_methods?.includes("card")?"Քարտ":null, trip.pay_methods?.includes("cash")?"Կանխիկ":null].filter(Boolean).join(" · ")||"—"}
                                    </div>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={()=>setPayment("cash")} className={`flex-1 rounded-xl border px-3 py-1.5 text-sm ${payment==="cash"?"border-emerald-300 bg-emerald-100 text-emerald-800":"border-slate-300 bg-white text-slate-800"}`}>Կանխիկ</button>
                                        <button type="button" onClick={()=>setPayment("card")} className={`flex-1 rounded-xl border px-3 py-1.5 text-sm ${payment==="card"?"border-emerald-300 bg-emerald-100 text-emerald-800":"border-slate-300 bg-white text-slate-800"}`}>Քարտ</button>
                                    </div>
                                </div>

                                <div>
                                    <div className="mb-1 text-sm text-slate-600">Նշում վարորդին</div>
                                    <textarea rows={3} value={description} onChange={e=>setDescription(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"/>
                                    {errors.description && <div className="mt-1 text-xs text-rose-600">{errors.description}</div>}
                                </div>

                                <div className="text-sm text-slate-600"><ShieldCheck className="mr-1 inline h-4 w-4 text-emerald-600"/> Պաշտպանված ամրագրում</div>

                                <button
                                    onClick={submitBooking}
                                    disabled={sending || outOfRange}
                                    className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-400 px-4 py-3 font-semibold text-white shadow hover:brightness-95 disabled:opacity-60">
                                    {sending ? "Ուղարկում…" : "Ամրագրել"}
                                </button>

                                <AnimatePresence>{ok && (
                                    <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-6 }} className="-mt-2 inline-flex items-center gap-2 rounded-xl border border-emerald-300/60 bg-emerald-100 px-3 py-2 text-sm text-emerald-700">
                                        <Check className="h-4 w-4"/> Ամրագրված է
                                    </motion.div>
                                )}</AnimatePresence>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function TypeHints({ trip, typeKey }){
    const humanAnyInCity = <>քաղաքի ներսում ընտրեք ցանկացած կետ</>;
    const line = (label, free, per, max, showAny=false) => (
        <li>
            {label}․ {Number.isFinite(free)&&Number.isFinite(per)
            ? <>անվճար մինչև {free} կմ, ապա {per} AMD/կմ {Number.isFinite(max)?`(մինչև ${max} կմ)`:null}</>
            : showAny ? humanAnyInCity : "—"}
        </li>
    );
    const anyStart = !Number.isFinite(trip.start_amd_per_km);
    const anyEnd   = !Number.isFinite(trip.end_amd_per_km);

    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            {typeKey==='PAX_PAX' && <div>«Ուղևոր → Ուղևոր». ընտրեք վերցնելու և իջեցնելու կետերը։</div>}
            {typeKey==='A_PAX'   && line("Սկիզբ", trip.start_free_km, trip.start_amd_per_km, trip.start_max_km, anyStart)}
            {typeKey==='PAX_B'   && line("Վերջ",  trip.end_free_km,   trip.end_amd_per_km,   trip.end_max_km, anyEnd)}
            {typeKey==='AB' && (
                <div>ՍՏԱՐՏ/ՖԻՆԻՇ սակագին՝
                    <ul className="ml-5 list-disc">
                        {line("Սկիզբ", trip.start_free_km, trip.start_amd_per_km, trip.start_max_km, anyStart)}
                        {line("Վերջ",  trip.end_free_km,   trip.end_amd_per_km,   trip.end_max_km, anyEnd)}
                    </ul>
                </div>
            )}
        </div>
    );
}

/* ============ Booking map (only translucent circles) ============ */
function BookingMap({ trip, pickup, drop, which, setWhich, onMapPick }){
    const [coords,setCoords]=useState([]);
    const A=useMemo(()=>normLL({lng:trip.from_lng,lat:trip.from_lat}),[trip.from_lng,trip.from_lat]);
    const B=useMemo(()=>normLL({lng:trip.to_lng,  lat:trip.to_lat}),  [trip.to_lng,trip.to_lat]);
    const stops = useMemo(()=> (trip.stops||[]).slice().sort((a,b)=>a.position-b.position).map(normLL).filter(Boolean), [trip.stops]);

    useEffect(()=>{
        let cancelled=false;
        (async()=>{
            try{
                const r=await osrmRouteVia([A,...stops,pickup,drop,B].filter(Boolean));
                if(cancelled) return;
                const g=(r?.geometry?.coordinates||[]).map(([lng,lat])=>({lat,lng}));
                setCoords(g.length?g:[A,...stops,pickup,drop,B].filter(Boolean).map(normLL).filter(Boolean));
            }catch{
                if(cancelled) return;
                setCoords([A,...stops,pickup,drop,B].filter(Boolean).map(normLL).filter(Boolean));
            }
        })();
        return ()=>{cancelled=true};
    },[trip.id, JSON.stringify([A,stops,pickup,drop,B])]);

    const center = Number.isFinite(trip.from_lat) ? [trip.from_lat,trip.from_lng] : [40.1792,44.4991];
    const tk = (trip.typeKey)||(trip.type_pax_to_pax?"PAX_PAX":trip.type_pax_to_b?"PAX_B":trip.type_a_to_pax?"A_PAX":"AB");

    return (
        <div className="absolute inset-0">
            <MapContainer center={center} zoom={9} className="h-full w-full relative z-0" style={{zIndex:0}}>
                <TileLayer attribution="&copy; OSM" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {coords.length>1 && <Polyline positions={coords.map(p=>[p.lat,p.lng])} weight={6} />}

                {Number.isFinite(trip.from_lat)&&Number.isFinite(trip.from_lng) && (
                    <Marker position={[trip.from_lat,trip.from_lng]} icon={mkDivIcon('#16a34a','Սկիզբ')} />
                )}
                {Number.isFinite(trip.to_lat)&&Number.isFinite(trip.to_lng) && (
                    <Marker position={[trip.to_lat,trip.to_lng]} icon={mkDivIcon('#ef4444','Վերջ')} />
                )}

                {/* translucent tariff areas */}
                {(tk==='AB'||tk==='A_PAX') && Number.isFinite(trip.start_free_km) && trip.start_free_km>0 && (
                    <Circle center={[trip.from_lat,trip.from_lng]} radius={trip.start_free_km*1000}
                            pathOptions={{ color:'#10b981', weight:1, fillOpacity:0.12, fillColor:'#10b981' }} />
                )}
                {(tk==='AB'||tk==='A_PAX') && Number.isFinite(trip.start_max_km) && trip.start_max_km>0 && (
                    <Circle center={[trip.from_lat,trip.from_lng]} radius={trip.start_max_km*1000}
                            pathOptions={{ color:'#f43f5e', weight:1, dashArray:'4 4', fillOpacity:0.06, fillColor:'#f43f5e' }} />
                )}
                {(tk==='AB'||tk==='PAX_B') && Number.isFinite(trip.end_free_km) && trip.end_free_km>0 && (
                    <Circle center={[trip.to_lat,trip.to_lng]} radius={trip.end_free_km*1000}
                            pathOptions={{ color:'#10b981', weight:1, fillOpacity:0.12, fillColor:'#10b981' }} />
                )}
                {(tk==='AB'||tk==='PAX_B') && Number.isFinite(trip.end_max_km) && trip.end_max_km>0 && (
                    <Circle center={[trip.to_lat,trip.to_lng]} radius={trip.end_max_km*1000}
                            pathOptions={{ color:'#f43f5e', weight:1, dashArray:'4 4', fillOpacity:0.06, fillColor:'#f43f5e' }} />
                )}

                {pickup && <Marker position={[pickup.lat,pickup.lng]} icon={mkDivIcon('#0ea5e9','Վերցնել')} />}
                {drop   && <Marker position={[drop.lat,drop.lng]} icon={mkDivIcon('#f43f5e','Իջեցնել')} />}

                <FitTo coords={coords} />
                <ClickCatcher onClick={onMapPick} />

                <LeafletControlBox className="absolute left-2 top-2 z-[1000] flex gap-2">
                    <button
                        onClick={(e)=>{e.stopPropagation(); setWhich('pickup');}}
                        className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium shadow ${which==='pickup'?"bg-emerald-600 text-white":"bg-white/95 border border-slate-200"}`}>
                        <Navigation2 className="h-3.5 w-3.5"/> Վերցնել
                    </button>
                    <button
                        onClick={(e)=>{e.stopPropagation(); setWhich('drop');}}
                        className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium shadow ${which==='drop'?"bg-rose-600 text-white":"bg-white/95 border border-slate-200"}`}>
                        <MapPin className="h-3.5 w-3.5"/> Իջեցնել
                    </button>
                </LeafletControlBox>
            </MapContainer>
        </div>
    );
}

/* ============ SearchBox ============ */
// function SearchBox({ label, placeholder, value, onPick, onClear, active }){
//     const [q,setQ]=useState("");
//     const [items,setItems]=useState([]);
//     const [open,setOpen]=useState(false);
//     const acRef=useRef(null);
//
//     // Синхронизируем поле при внешнем изменении (выбор из карты/наружи) и закрываем список
//     useEffect(()=>{
//         if (value?.addr) setQ(value.addr);
//         else if (value?.lat && value?.lng) setQ(`${value.lat}, ${value.lng}`);
//         else setQ("");
//         // закрыть и отменить поиск
//         setItems([]);
//         setOpen(false);
//         if (acRef.current) acRef.current.abort();
//     }, [value]);
//
//     const runSearch = async () => {
//         const term = (q||"").trim();
//         if (term.length < 2) { setItems([]); setOpen(false); return; }
//         if (acRef.current) acRef.current.abort();
//         const ac = new AbortController(); acRef.current = ac;
//         try {
//             const res = await geocodeQuery(term);
//             if (!ac.signal.aborted) {
//                 setItems(res);
//                 setOpen(res.length > 0);
//             }
//         } catch {
//             if (!ac.signal.aborted) { setItems([]); setOpen(false); }
//         }
//     };
//
//     const handlePick = (it) => {
//         onPick?.(it);
//         setQ(it.name || it.display);
//         // закрыть + очистить текущие подсказки и отменить запрос
//         setOpen(false);
//         setItems([]);
//         if (acRef.current) acRef.current.abort();
//     };
//
//     return (
//         <div className="relative">
//             <div className="mb-1 text-sm font-medium text-slate-700">{label}</div>
//             <div className={`flex items-center gap-2 rounded-xl border ${active?"border-emerald-400 bg-emerald-50":"border-slate-300 bg-white"} px-3 py-2`}>
//                 {/* Кнопка запуска поиска */}
//                 <button
//                     type="button"
//                     onClick={runSearch}
//                     className="grid h-7 w-7 place-items-center rounded-md hover:bg-slate-100"
//                     title="Փնտրել"
//                 >
//                     <Search className="h-4 w-4 text-slate-500"/>
//                 </button>
//
//                 <input
//                     value={q}
//                     onChange={e=>setQ(e.target.value)}         // печать не запускает поиск
//                     onKeyDown={(e)=>{ if(e.key==='Enter'){ e.preventDefault(); runSearch(); } }}
//                     // не открываем дропдаун просто по фокусу
//                     placeholder={placeholder}
//                     className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
//                 />
//
//                 {value && (
//                     <button
//                         onClick={()=>{
//                             onClear?.();
//                             setQ("");
//                             setItems([]);
//                             setOpen(false);
//                             if (acRef.current) acRef.current.abort();
//                         }}
//                         className="rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-white"
//                     >
//                         Մաքրել
//                     </button>
//                 )}
//             </div>
//
//             <AnimatePresence>
//                 {open && items.length>0 && (
//                     <motion.div
//                         initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}}
//                         className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
//                     >
//                         <ul className="max-h-56 overflow-auto">
//                             {items.map(it=>(
//                                 <li key={it.id}>
//                                     {/* onMouseDown, чтобы выбрать до blur инпута */}
//                                     <button
//                                         type="button"
//                                         onMouseDown={(e)=>{ e.preventDefault(); handlePick(it); }}
//                                         className="block w-full px-3 py-2 text-left text-sm hover:bg-emerald-50"
//                                     >
//                                         <div className="font-medium text-slate-800">{it.name}</div>
//                                         <div className="text-xs text-slate-500">{it.display}</div>
//                                     </button>
//                                 </li>
//                             ))}
//                         </ul>
//                     </motion.div>
//                 )}
//             </AnimatePresence>
//         </div>
//     );
// }
function SearchBox({ label, placeholder, value, onPick, onClear, active }){
    const [q,setQ]=useState("");
    const [items,setItems]=useState([]);
    const [open,setOpen]=useState(false);
    const acRef=useRef(null);
    const skipFetchRef=useRef(false); // блокирует fetch после программной установки q

    // синхронизация с внешним value (в т.ч. выбор на карте) + жёсткое закрытие дропа
    useEffect(()=>{
        if (value?.addr) { skipFetchRef.current = true; setQ(value.addr); }
        else if (value?.lat && value?.lng) { skipFetchRef.current = true; setQ(`${value.lat}, ${value.lng}`); }
        else { setQ(""); }
        // гашу любые подсказки
        setItems([]);
        setOpen(false);
        if (acRef.current) acRef.current.abort();
    }, [value]);

    // поиск только когда пользователь реально редактирует
    useEffect(()=>{
        if (skipFetchRef.current){ skipFetchRef.current = false; return; }
        const qq = q.trim();
        if (qq.length < 2){ setItems([]); setOpen(false); return; }

        if (acRef.current) acRef.current.abort();
        const ac = new AbortController(); acRef.current = ac;

        const t = setTimeout(async ()=>{
            try{
                const res = await geocodeQuery(qq);
                if (!ac.signal.aborted){
                    setItems(res);
                    setOpen(res.length > 0);
                }
            }catch{
                if (!ac.signal.aborted){ setItems([]); setOpen(false); }
            }
        }, 300);

        return ()=>{ clearTimeout(t); ac.abort(); };
    }, [q]);

    return (
        <div className="relative" onBlur={()=>setTimeout(()=>setOpen(false),150)}>
            <div className="mb-1 text-sm font-medium text-slate-700">{label}</div>
            <div className={`flex items-center gap-2 rounded-xl border ${active?"border-emerald-400 bg-emerald-50":"border-slate-300 bg-white"} px-3 py-2`}>
                <Search className="h-4 w-4 text-slate-500"/>
                <input
                    value={q}
                    onFocus={()=>{ if (!value && items.length) setOpen(true); }} // если уже выбран пункт — не открываем
                    onChange={e=>{ setQ(e.target.value); }}                    // ввод пользователя снова включает поиск
                    placeholder={placeholder}
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                />
                {value && (
                    <button
                        onClick={()=>{ onClear?.(); setQ(""); setItems([]); setOpen(false); }}
                        className="rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-white"
                    >
                        Մաքրել
                    </button>
                )}
            </div>

            <AnimatePresence>
                {open && items.length>0 && (
                    <motion.div
                        initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}}
                        className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
                    >
                        <ul className="max-h-56 overflow-auto">
                            {items.map(it=>(
                                <li key={it.id}>
                                    <button
                                        onClick={()=>{
                                            onPick?.(it);
                                            skipFetchRef.current = true;    // не перезапускать поиск
                                            setQ(it.name || it.display);
                                            setItems([]); setOpen(false);   // жёстко закрыть
                                        }}
                                        className="block w-full px-3 py-2 text-left text-sm hover:bg-emerald-50"
                                    >
                                        <div className="font-medium text-slate-800">{it.name}</div>
                                        <div className="text-xs text-slate-500">{it.display}</div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// function SearchBox({ label, placeholder, value, onPick, onClear, active }){
//     const [q,setQ]=useState("");
//     const [items,setItems]=useState([]);
//     const [open,setOpen]=useState(false);
//     const acRef=useRef(null);
//
//     useEffect(()=>{
//         if (value?.addr) setQ(value.addr);
//         else if (value?.lat && value?.lng) setQ(`${value.lat}, ${value.lng}`);
//         else setQ("");
//     }, [value]);
//
//     useEffect(()=>{
//         if(!q || q.trim().length<2){ setItems([]); setOpen(false); return; }
//         if(acRef.current) acRef.current.abort();
//         const ac=new AbortController(); acRef.current=ac;
//         const run=async()=>{
//             try{ const res=await geocodeQuery(q); if(!ac.signal.aborted){ setItems(res); setOpen(true);} }
//             catch{ if(!ac.signal.aborted){ setItems([]); setOpen(false);} }
//         };
//         const t=setTimeout(run,300);
//         return ()=>{ clearTimeout(t); ac.abort(); };
//     },[q]);
//
//     return (
//         <div className="relative">
//             <div className="mb-1 text-sm font-medium text-slate-700">{label}</div>
//             <div className={`flex items-center gap-2 rounded-xl border ${active?"border-emerald-400 bg-emerald-50":"border-slate-300 bg-white"} px-3 py-2`}>
//                 <Search className="h-4 w-4 text-slate-500"/>
//                 <input
//                     value={q}
//                     onFocus={()=>{ if(items.length) setOpen(true); }}
//                     onChange={e=>setQ(e.target.value)}
//                     placeholder={placeholder}
//                     className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
//                 />
//                 {value && <button onClick={()=>{ onClear?.(); setQ(""); }} className="rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-white">Մաքրել</button>}
//             </div>
//
//             <AnimatePresence>
//                 {open && items.length>0 && (
//                     <motion.div initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}}
//                                 className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
//                         <ul className="max-h-56 overflow-auto">
//                             {items.map(it=>(
//                                 <li key={it.id}>
//                                     <button
//                                         onClick={()=>{
//                                             onPick?.(it);
//                                             setQ(it.name || it.display);
//                                             setOpen(false);
//                                         }}
//                                         className="block w-full px-3 py-2 text-left text-sm hover:bg-emerald-50">
//                                         <div className="font-medium text-slate-800">{it.name}</div>
//                                         <div className="text-xs text-slate-500">{it.display}</div>
//                                     </button>
//                                 </li>
//                             ))}
//                         </ul>
//                     </motion.div>
//                 )}
//             </AnimatePresence>
//         </div>
//     );
// }

/* ============ small UI ============ */
function Card({ children }){ return <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">{children}</div>; }
function Row({ k, v }){ return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
        <div className="text-sm text-slate-600">{k}</div>
        <div className="text-sm font-medium text-slate-800">{v}</div>
    </div>
); }
function Kv({ icon, v }){ return <div className="flex items-center gap-2 text-slate-700">{icon}<span>{v}</span></div>; }
function Qty({ seats, setSeats }){
    const dec = ()=> setSeats(s=>clamp(s-1,1,3));
    const inc = ()=> setSeats(s=>clamp(s+1,1,3));
    return (
        <div className="flex items-center gap-2">
            <button onClick={dec} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100">−</button>
            <div className="grid h-9 min-w-12 place-items-center rounded-xl border border-slate-300 bg-white px-2 font-medium">{seats}</div>
            <button onClick={inc} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100">+</button>
        </div>
    );
}
