
import React, { useMemo, useState, useEffect, useRef } from 'react'
import { useForm, router } from '@inertiajs/react'
import dayjs from 'dayjs'
import DriverLayout from '@/Layouts/DriverLayout'

/* ================= helpers: geocode / route ================= */
const NOMI_LANG = 'hy,ru,en';

async function geocodeNominatim(q){
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=${encodeURIComponent(NOMI_LANG)}&q=${encodeURIComponent(q||'')}`;
    const r = await fetch(url, { headers:{Accept:'application/json'} });
    if(!r.ok) return null; const d = await r.json();
    if(!d?.length) return null;
    return { lng: parseFloat(d[0].lon), lat: parseFloat(d[0].lat), label: d[0].display_name || q };
}
async function reverseGeocodeNominatim(lng,lat){
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&accept-language=${encodeURIComponent(NOMI_LANG)}&lat=${lat}&lon=${lng}&addressdetails=1`;
    const r = await fetch(url, { headers:{Accept:'application/json'} });
    if(!r.ok) return '';
    const d = await r.json();
    const a = d?.address||{};
    const parts = [a.road, a.suburb, a.city || a.town || a.village, a.country].filter(Boolean);
    return parts.join(', ') || d?.display_name || '';
}
async function osrmRouteVia(profile, waypoints) {
    const pts = (waypoints||[]).filter(p=>Number.isFinite(p?.lng) && Number.isFinite(p?.lat));
    if (pts.length < 2) return null;
    const path = pts.map(p => `${p.lng},${p.lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/${profile}/${path}?overview=full&geometries=geojson&alternatives=false&steps=false`;
    const r = await fetch(url);
    if (!r.ok) throw new Error('OSRM '+r.status);
    const d = await r.json();
    return d?.routes?.[0] || null;
}

/* ================= lazy-load MapLibre ================= */
function ensureMapLibre(){
    return new Promise((resolve,reject)=>{
        if (window.maplibregl) return resolve(window.maplibregl);
        const cssId = 'maplibre-css';
        if (!document.getElementById(cssId)) {
            const l = document.createElement('link');
            l.id = cssId; l.rel='stylesheet';
            l.href='https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css';
            document.head.appendChild(l);
        }
        const s = document.createElement('script');
        s.src='https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js';
        s.async=true;
        s.onload=()=> resolve(window.maplibregl);
        s.onerror=()=> reject(new Error('Failed to load MapLibre'));
        document.body.appendChild(s);
    });
}

/* ================= amenities helpers ================= */
function useAmenityCatalog(initialCategories){
    const [cats, setCats] = useState(initialCategories || null);
    useEffect(()=>{
        if (initialCategories && initialCategories.length) return;
        let cancelled = false;
        (async ()=>{
            try{
                const r = await fetch('/amenities-catalog', { headers:{Accept:'application/json'} });
                if(!r.ok) return;
                const d = await r.json();
                if(!cancelled) setCats(d?.categories || []);
            }catch(_){}
        })();
        return ()=>{ cancelled = true; };
    }, [initialCategories]);
    return cats || [];
}
function flattenAmenities(categories){
    const res = [];
    (categories||[]).forEach(c=> (c.amenities||[]).forEach(a=>res.push(a)));
    return res;
}
function namesByIds(categories, ids){
    const all = flattenAmenities(categories);
    const map = Object.fromEntries(all.map(a=>[a.id, a.name]));
    return (ids||[]).map(id=>map[id]).filter(Boolean);
}
async function fetchTripAmenities(tripId){
    try{
        const r = await fetch(`/driver/trip/${tripId}/amenities`, { headers:{Accept:'application/json'} });
        if(!r.ok) return [];
        const d = await r.json();
        return Array.isArray(d?.amenities) ? d.amenities : [];
    }catch(_){ return []; }
}

/* ================= page ================= */
export default function DriverDashboard(props){
    return (
        <DriverLayout current="dashboard">
            <div className="space-y-8">
                <h1 className="text-3xl font-extrabold text-slate-900">Վարորդի վահանակ</h1>

                <a id="vehicle" />
                <VehicleCard vehicle={props.vehicle} />

                <TripCreateCard vehicle={props.vehicle} amenityCategories={props.amenityCategories} />

                <a id="trips" />
                <TripsList trips={props.trips || []} />

                <a id="requests" />
                <RequestsList requests={props.requests || []} />
            </div>
        </DriverLayout>
    )
}

/* ================= vehicle ================= */
function VehicleCard({ vehicle }){
    const { data, setData, post, processing, errors, transform } = useForm({
        brand: vehicle?.brand ?? '',
        model: vehicle?.model ?? '',
        seats: vehicle?.seats ?? 4,
        color: vehicle?.color ?? '#10b981',
        plate: vehicle?.plate ?? '',
        photo: null,
    })
    function submit(e){
        e.preventDefault()
        transform(d => { const f = new FormData(); Object.entries(d).forEach(([k,v])=>f.append(k,v)); return f })
        post('/driver/vehicle', { preserveScroll:true })
    }
    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
                <div className="text-xl font-bold text-slate-900">Իմ մեքենան</div>
                <span className="text-xs text-slate-500">միայն վարորդի համար</span>
            </div>
            <form onSubmit={submit} className="grid gap-3 md:grid-cols-3">
                <Input label="Մարքա" value={data.brand} onChange={v=>setData('brand',v)} error={errors.brand}/>
                <Input label="Մոդել" value={data.model} onChange={v=>setData('model',v)} error={errors.model}/>
                <Input type="number" label="Տեղերի քանակ (ուղևոր)" value={data.seats} onChange={v=>setData('seats',v)} error={errors.seats}/>
                <Input label="Գույն (hex)" value={data.color} onChange={v=>setData('color',v)} />
                <Input label="Պետ. համար" value={data.plate} onChange={v=>setData('plate',v)} />
                <File  label="Լուսանկար" onChange={f=>setData('photo',f)} />
                <div className="md:col-span-3 flex justify-end">
                    <button
                        disabled={processing}
                        className="rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2 font-semibold text-white shadow hover:brightness-95"
                    >
                        Պահպանել
                    </button>
                </div>
            </form>
        </section>
    )
}

/* ================= trip create with “stops mode” ================= */
function TripCreateCard({ vehicle, amenityCategories }){
    const [from, setFrom] = useState({ lat: null, lng: null, addr: '' })
    const [to,   setTo]   = useState({ lat: null, lng: null, addr: '' })
    const [mode, setMode] = useState('from') // from | stop | to
    const [stopsMode, setStopsMode] = useState(false)
    const [stops, setStops] = useState([])
    const [previewStop, setPreviewStop] = useState(null)

    const cats = useAmenityCatalog(amenityCategories);
    const [amenityModal, setAmenityModal] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        vehicle_id: vehicle?.id ?? '',
        from_lat: '', from_lng: '', from_addr: '',
        to_lat:   '', to_lng:   '', to_addr:   '',
        departure_at: dayjs().add(2,'hour').format('YYYY-MM-DDTHH:mm'),
        seats_total: vehicle?.seats ?? 4,
        price_amd: 2500,
        pay_methods: ['cash'],
        amenities: [],
        stops: [],
    })

    useEffect(() => {
        if (vehicle?.id) setData(d => ({ ...d, vehicle_id: vehicle.id, seats_total: vehicle.seats || d.seats_total }))
    }, [vehicle?.id, vehicle?.seats])

    useEffect(() => {
        setData(d => ({
            ...d,
            from_lat: Number.isFinite(from.lat) ? from.lat : '',
            from_lng: Number.isFinite(from.lng) ? from.lng : '',
            from_addr: from.addr || ''
        }))
    }, [from.lat, from.lng, from.addr])

    useEffect(() => {
        setData(d => ({
            ...d,
            to_lat: Number.isFinite(to.lat) ? to.lat : '',
            to_lng: Number.isFinite(to.lng) ? to.lng : '',
            to_addr: to.addr || ''
        }))
    }, [to.lat, to.lng, to.addr])

    useEffect(()=>{
        const prepared = (stops||[]).slice(0,10).map((s,idx)=>({
            name: s.name || null,
            addr: s.addr || null,
            lat:  s.lat,
            lng:  s.lng,
            position: idx+1,
        }));
        setData('stops', prepared);
    }, [JSON.stringify(stops)])

    const coordsReady =
        Number.isFinite(from.lat) && Number.isFinite(from.lng) &&
        Number.isFinite(to.lat)   && Number.isFinite(to.lng)
    const canSubmit = !!vehicle?.id && coordsReady

    const saveDraft   = (e) => { e.preventDefault(); if(!canSubmit) return; post('/driver/trip', { preserveScroll:true }) }
    const publishNow  = (e) => { e.preventDefault(); if(!canSubmit) return; post('/driver/trip/store-and-publish', { preserveScroll:true }) }

    async function findFrom(){
        const r = await geocodeNominatim(from.addr || data.from_addr); if(!r) return alert('Չի գտնվել');
        setFrom({ lat:r.lat, lng:r.lng, addr: r.label || from.addr || data.from_addr }); setMode('to');
    }
    async function findTo(){
        const r = await geocodeNominatim(to.addr || data.to_addr); if(!r) return alert('Չի գտնվել');
        setTo({ lat:r.lat, lng:r.lng, addr: r.label || to.addr || data.to_addr }); setMode('stop');
    }

    const selectedAmenityNames = namesByIds(cats, data.amenities).slice(0,3);
    const moreCount = Math.max(0, (data.amenities?.length||0) - selectedAmenityNames.length);

    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
                <div className="text-xl font-bold text-slate-900">Ավելացնել ուղևորություն</div>
                {!vehicle && <div className="text-sm text-rose-600">Սկզբում լրացրեք «Իմ մեքենան» բաժինը</div>}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                {/* form */}
                <form className="order-2 space-y-3 lg:order-1">
                    {!stopsMode && (
                        <>
                            <div className="grid grid-cols-2 gap-3">
                                <Input label="Սկիզբ (հասցե)" value={from.addr} onChange={v=>setFrom(p=>({ ...p, addr:v }))} error={errors.from_addr}/>
                                <Input label="Վերջ (հասցե)"  value={to.addr}   onChange={v=>setTo(p=>({ ...p, addr:v }))}   error={errors.to_addr}/>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button type="button" onClick={findFrom} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-100">Գտնել սկիզբ</button>
                                <button type="button" onClick={findTo}   className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-100">Գտնել վերջ</button>
                                <button type="button" onClick={()=>{ setStopsMode(true); setMode('stop'); }} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5">
                                    Ավելացնել կանգառներ
                                </button>
                            </div>
                        </>
                    )}

                    {stopsMode && (
                        <StopAdder
                            onLocate={(p)=>setPreviewStop(p)}
                            onAdd={p=>{
                                setStops(arr => [...arr, p].slice(0,10));
                                setPreviewStop(null);
                            }}
                        />
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <Input type="datetime-local" label="Ելքի ժամանակ" value={data.departure_at} onChange={v=>setData('departure_at', v)} error={errors.departure_at}/>
                        <Input type="number" label="Մեկ նստատեղի գին (AMD)" value={data.price_amd} onChange={v=>setData('price_amd', v)} error={errors.price_amd}/>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <Input type="number" label="Տեղերի քանակ" value={data.seats_total} onChange={v=>setData('seats_total', v)} error={errors.seats_total}/>
                        <PayMethods value={data.pay_methods} onChange={arr=>setData('pay_methods', arr)} />
                    </div>

                    {/* amenities */}
                    <div className="rounded-xl border border-slate-200 p-3">
                        <div className="mb-2 flex items-center justify-between">
                            <div className="text-sm font-medium text-slate-900">Հարմարություններ</div>
                            <button type="button" onClick={()=>setAmenityModal(true)} className="rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 px-3 py-1.5 text-sm font-semibold text-white shadow">
                                Ընտրել
                            </button>
                        </div>
                        {data.amenities?.length>0 ? (
                            <div className="flex flex-wrap gap-2">
                                {selectedAmenityNames.map((n,i)=>(
                                    <span key={i} className="rounded-lg bg-emerald-50 px-2 py-1 text-xs text-emerald-700 ring-1 ring-emerald-200">{n}</span>
                                ))}
                                {moreCount>0 && <span className="text-xs text-slate-500">+{moreCount}</span>}
                            </div>
                        ) : (
                            <div className="text-xs text-slate-500">Չկա ընտրված</div>
                        )}
                        {errors.amenities && <div className="mt-1 text-xs text-rose-600">{errors.amenities}</div>}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            disabled={!canSubmit || processing}
                            onClick={saveDraft}
                            className="rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2 font-semibold text-white shadow hover:brightness-95 disabled:opacity-50">
                            Պահպանել (սևագիր)
                        </button>
                        <button
                            disabled={!canSubmit || processing}
                            onClick={publishNow}
                            className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">
                            Հրապարակել հիմա
                        </button>
                        {stopsMode && (
                            <button type="button" onClick={()=>setStopsMode(false)} className="rounded-xl border border-slate-300 bg-white px-4 py-2 hover:bg-slate-100">
                                Վերադառնալ սկիզբ/վերջ
                            </button>
                        )}
                    </div>

                    <div className="text-xs text-slate-500">Սևագրից հետո կարող եք «Հրապարակել» նաև քարտի մեջ:</div>
                    {errors['stops'] && <div className="text-xs text-rose-600">{String(errors['stops'])}</div>}
                </form>

                {/* map + stops */}
                <div className="order-1 space-y-3 lg:order-2">
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                        <span className="opacity-70">Քարտեզի ռեժիմ՝</span>
                        <div className="flex overflow-hidden rounded-xl border border-slate-300">
                            {['from','stop','to'].map(k=>(
                                <button
                                    key={k}
                                    type="button"
                                    onClick={()=>setMode(k)}
                                    className={`px-3 py-1.5 ${mode===k?'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white':'bg-white hover:bg-slate-100'}`}>
                                    {k==='from'?'Սկիզբ':k==='to'?'Վերջ':'Կանգառ'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="h-80 overflow-hidden rounded-2xl border border-slate-200 shadow">
                        <MapLibreWithStops
                            from={from} to={to} stops={stops}
                            setFrom={setFrom} setTo={setTo} setStops={setStops}
                            mode={mode} setMode={setMode}
                            preview={previewStop} setPreview={setPreviewStop}
                        />
                    </div>

                    <StopsEditor stops={stops} setStops={setStops} />
                </div>
            </div>

            {amenityModal && (
                <AmenityPickerModal
                    categories={cats}
                    initialSelected={data.amenities || []}
                    onClose={()=>setAmenityModal(false)}
                    onSave={(ids)=>{ setData('amenities', ids); setAmenityModal(false); }}
                />
            )}
        </section>
    )
}

/* ================= StopAdder ================= */
function StopAdder({ onLocate, onAdd }){
    const [q, setQ] = useState('');
    const [locating, setLocating] = useState(false);
    const [found, setFound] = useState(null);

    async function locate(){
        if(!q.trim()) return;
        setLocating(true);
        const g = await geocodeNominatim(q.trim());
        setLocating(false);
        if(!g) return alert('Չի գտնվել');
        const addr = g.label || q.trim();
        const p = { lng:g.lng, lat:g.lat, addr };
        setFound(p);
        onLocate && onLocate(p);
    }
    async function add(){
        let p = found;
        if (!p) {
            if(!q.trim()) return;
            const g = await geocodeNominatim(q.trim());
            if(!g) return alert('Չի գտնվել');
            p = { lng:g.lng, lat:g.lat, addr: g.label || q.trim() };
        }
        onAdd && onAdd(p);
        setQ(''); setFound(null);
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
                    onChange={e=>setQ(e.target.value)}
                />
                <div className="flex gap-2">
                    <button type="button" onClick={locate} disabled={locating} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
                        {locating?'Գտնում է…':'Գտնել քարտեզում'}
                    </button>
                    <button type="button" onClick={add} className="rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 px-3 py-2 text-sm font-semibold text-white shadow">
                        Ավելացնել կանգառ
                    </button>
                </div>
            </div>
            {found && <div className="mt-2 text-xs text-slate-600">Գտնված՝ {found.addr}</div>}
            <div className="mt-2 text-xs text-slate-500">Կարող եք նաև սեղմել քարտեզի վրա «Կանգառ» ռեժիմում</div>
        </div>
    );
}

/* ================= Map with stops & preview ================= */
function MapLibreWithStops({ from, to, stops, setFrom, setTo, setStops, mode, setMode, preview, setPreview }) {
    const ref = useRef(null);
    const mapRef = useRef(null);
    const Aref = useRef(null);
    const Bref = useRef(null);
    const stopMks = useRef([]);
    const previewMk = useRef(null);
    const routeSrc = useRef('route-src');
    const routeLayer = useRef('route-layer');

    const mapReady = ()=> mapRef.current && window.maplibregl;

    const placeMk = (lngLat, color, label=null)=>{
        const el = document.createElement('div');
        el.style.cssText =
            `position:relative;width:14px;height:14px;border-radius:50%;
       box-shadow:0 0 0 2px #fff,0 0 0 4px ${color};background:${color};`;
        if (label!==null) {
            const tag = document.createElement('div');
            tag.textContent = label;
            tag.style.cssText =
                'position:absolute;transform:translate(-50%,-140%);left:50%;top:0;' +
                'font:600 11px/1 system-ui;padding:2px 6px;border-radius:8px;' +
                'background:#ffffff;color:#065f46;border:1px solid rgba(5,150,105,.35);' +
                'box-shadow:0 1px 2px rgba(0,0,0,.06)';
            el.appendChild(tag);
        }
        return new window.maplibregl.Marker({ element: el }).setLngLat(lngLat).addTo(mapRef.current);
    };

    const drawStops = ()=>{
        stopMks.current.forEach(m=>m.remove());
        stopMks.current = [];
        (stops||[]).forEach((s,idx)=>{
            const m = placeMk({lng:s.lng,lat:s.lat}, '#22c55e', String(idx+1));
            stopMks.current.push(m);
        });
    };

    const drawPreview = ()=>{
        if (!mapReady()) return;
        if (previewMk.current) { previewMk.current.remove(); previewMk.current=null; }
        if (preview && Number.isFinite(preview.lng) && Number.isFinite(preview.lat)) {
            previewMk.current = placeMk({lng:preview.lng, lat:preview.lat}, '#7c3aed');
        }
    };

    const rebuildRoute = async ()=>{
        if (!mapReady()) return;
        const pts = [];
        if (Number.isFinite(from?.lng) && Number.isFinite(from?.lat)) pts.push({lng:from.lng,lat:from.lat});
        (stops||[]).forEach(s=>{
            if (Number.isFinite(s?.lng) && Number.isFinite(s?.lat)) pts.push({lng:s.lng,lat:s.lat});
        });
        if (Number.isFinite(to?.lng) && Number.isFinite(to?.lat)) pts.push({lng:to.lng,lat:to.lat});
        const map = mapRef.current;

        if (pts.length < 2) {
            if (map.getLayer(routeLayer.current)) map.removeLayer(routeLayer.current);
            if (map.getSource(routeSrc.current)) map.removeSource(routeSrc.current);
            return;
        }

        try{
            const route = await osrmRouteVia('driving', pts);
            const geo = route?.geometry; if (!geo) return;

            if (map.getLayer(routeLayer.current)) map.removeLayer(routeLayer.current);
            if (map.getSource(routeSrc.current)) map.removeSource(routeSrc.current);

            map.addSource(routeSrc.current, { type:'geojson', data:{ type:'Feature', properties:{}, geometry: geo } });
            map.addLayer({
                id: routeLayer.current, type:'line', source: routeSrc.current,
                paint:{ 'line-color':'#0ea5e9', 'line-width':5, 'line-opacity':0.9 },
                layout:{ 'line-cap':'round','line-join':'round' }
            });

            const c = geo.coordinates;
            const b = c.reduce((B,p)=>B.extend(p), new window.maplibregl.LngLatBounds(c[0], c[0]));
            map.fitBounds(b, { padding: 48, duration: 600 });
        }catch(_){}
    };

    useEffect(()=>{
        let destroyed = false;
        (async ()=>{
            const mgl = await ensureMapLibre();
            if (destroyed) return;
            const style = {
                version:8,
                sources:{ osm:{ type:'raster', tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize:256 } },
                layers:[ { id:'osm', type:'raster', source:'osm' } ]
            };
            const map = new mgl.Map({ container: ref.current, style, center:[44.4991,40.1792], zoom:8 });
            map.addControl(new mgl.NavigationControl({ showCompass:false }), 'top-right');
            map.addControl(new mgl.ScaleControl({ unit:'metric' }));
            mapRef.current = map;

            map.on('click', async (e)=>{
                const p = { lng:e.lngLat.lng, lat:e.lngLat.lat };
                if (mode==='from') {
                    if (Aref.current) Aref.current.remove();
                    Aref.current = placeMk(p, '#16a34a');
                    setFrom(f=>({...f, ...p}));
                    const label = await reverseGeocodeNominatim(p.lng, p.lat);
                    setFrom(f=>({...f, addr: label || f.addr}));
                    setMode('to');
                } else if (mode==='to') {
                    if (Bref.current) Bref.current.remove();
                    Bref.current = placeMk(p, '#ef4444');
                    setTo(t=>({...t, ...p}));
                    const label = await reverseGeocodeNominatim(p.lng, p.lat);
                    setTo(t=>({...t, addr: label || t.addr}));
                    setMode('stop');
                } else {
                    const label = await reverseGeocodeNominatim(p.lng, p.lat);
                    setStops(arr => [...arr, { ...p, addr: label, name:'' }].slice(0,10));
                    setPreview && setPreview(null);
                }
            });
        })();
        return ()=>{ try{ mapRef.current && mapRef.current.remove(); }catch(_){ } };
    }, []);

    useEffect(()=>{
        if (!mapReady()) return;
        if (Number.isFinite(from?.lng) && Number.isFinite(from?.lat)) {
            if (Aref.current) Aref.current.remove();
            Aref.current = placeMk({lng:from.lng,lat:from.lat}, '#16a34a');
        }
        if (Number.isFinite(to?.lng) && Number.isFinite(to?.lat)) {
            if (Bref.current) Bref.current.remove();
            Bref.current = placeMk({lng:to.lng,lat:to.lat}, '#ef4444');
        }
        drawStops();
        drawPreview();
        rebuildRoute();
    }, [from?.lng,from?.lat,to?.lng,to?.lat, JSON.stringify(stops), preview?.lng, preview?.lat]);

    return <div ref={ref} className="h-full w-full" />;
}

/* ================= Stops editor (list) ================= */
function StopsEditor({ stops, setStops }) {
    const move = (i, dir) => {
        const j = i + dir;
        if (j<0 || j>=stops.length) return;
        const arr = stops.slice();
        [arr[i], arr[j]] = [arr[j], arr[i]];
        setStops(arr);
    };
    const del = (i) => setStops(stops.filter((_,idx)=>idx!==i));
    const edit = (i, patch) => setStops(stops.map((s,idx)=> idx===i ? {...s, ...patch} : s));

    return (
        <div className="rounded-xl border border-slate-200 p-3">
            <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-medium text-slate-900">Կանգառներ (մինչև 10)</div>
                {stops.length>0 && (
                    <button type="button" onClick={()=>setStops([])} className="rounded bg-emerald-600 px-2 py-1 text-xs text-white">
                        Մաքրել բոլորը
                    </button>
                )}
            </div>

            {stops.length===0 && <div className="text-xs text-slate-500">Ավելացրեք կանգառ քարտեզից կամ որոնումով</div>}

            <div className="space-y-2">
                {stops.map((s,i)=>(
                    <div key={i} className="flex items-start gap-2 rounded-lg border border-slate-200 p-2">
                        <div className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 text-xs font-semibold text-white">{i+1}</div>
                        <div className="flex-1">
                            <input
                                className="mb-1 w-full rounded-lg border border-slate-300 px-2 py-1 text-sm outline-none focus:border-emerald-500"
                                placeholder="Անուն կանգառի (ոչ պարտադիր)"
                                value={s.name||''}
                                onChange={e=>edit(i,{name:e.target.value})}
                            />
                            <input
                                className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 outline-none focus:border-emerald-500"
                                placeholder="Հասցե"
                                value={s.addr||''}
                                onChange={e=>edit(i,{addr:e.target.value})}
                            />
                            <div className="mt-1 text-[11px] text-slate-500">lng: {s.lng?.toFixed(6)} · lat: {s.lat?.toFixed(6)}</div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <button type="button" onClick={()=>move(i,-1)} className="rounded border border-slate-300 bg-white px-2 py-1 text-xs hover:bg-slate-100">↑</button>
                            <button type="button" onClick={()=>move(i, 1)} className="rounded border border-slate-300 bg-white px-2 py-1 text-xs hover:bg-slate-100">↓</button>
                            <button type="button" onClick={()=>del(i)} className="rounded bg-rose-600 px-2 py-1 text-xs text-white">✕</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ================= lists ================= */
function TripsList({ trips }){
    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
                <div className="text-xl font-bold text-slate-900">Իմ ուղևորությունները</div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
                {trips.map(t => <TripItem key={t.id} t={t} />)}
                {trips.length===0 && <div className="text-slate-500">Դեռ չկան</div>}
            </div>
        </section>
    )
}

function TripItem({ t }){
    const seatsLeft = (t.seats_total||0) - (t.seats_taken||0)
    const canPublish = t.status==='draft' && seatsLeft>0
    const hasPending = (t.pending_requests_count||0) > 0

    const cats = useAmenityCatalog();
    const [amenities, setAmenities] = useState(Array.isArray(t.amenities) ? t.amenities : []);

    useEffect(()=>{
        let cancelled = false;
        (async ()=>{
            if (Array.isArray(t.amenities) && t.amenities.length) return;
            const list = await fetchTripAmenities(t.id);
            if (!cancelled) setAmenities(list);
        })();
        return ()=>{ cancelled = true; };
    }, [t.id, t.amenities]);

    const selectedIds = amenities.map(a=>a.id);
    const amenityNames = amenities.map(a=>a.name);

    function patchAmenities(nextIds){
        const payload = { amenities: nextIds };
        const opts = { preserveScroll:true };
        if (router.patch) router.patch(`/driver/trip/${t.id}/amenities`, payload, opts);
        else router.post(`/driver/trip/${t.id}/amenities`, { ...payload, _method:'PATCH' }, opts);
    }

    function removeOne(id){
        const next = selectedIds.filter(x=>x!==id);
        setAmenities(prev => prev.filter(a=>a.id!==id));
        patchAmenities(next);
    }

    const [open, setOpen] = useState(false);
    const openTrip = () => router.visit(`/driver/trip/${t.id}`);

    return (
        <div
            onClick={openTrip}
            className="relative rounded-2xl border border-slate-200 p-4 cursor-pointer hover:bg-slate-50 transition"
        >
            {hasPending && (
                <span className="absolute right-3 top-3 rounded-full bg-rose-600 px-2 py-0.5 text-[11px] font-semibold text-white">
          {t.pending_requests_count} հայտ
        </span>
            )}

            <div className="text-sm text-slate-600">{t.from_addr} → {t.to_addr}</div>
            <div className="font-semibold text-slate-900">
                {t.departure_at ? dayjs(t.departure_at).format('YYYY-MM-DD HH:mm') : '—'}
            </div>
            <div className="text-sm text-slate-700">
                Գին․ {t.price_amd} AMD · Տեղեր՝ {t.seats_taken||0}/{t.seats_total||0}
            </div>

            {/* Driver progress */}
            <div className="mt-1 text-xs text-slate-600">
                {t.driver_state === 'en_route' && (
                    <>Սկսված է՝ {t.driver_started_at ? dayjs(t.driver_started_at).format('YYYY-MM-DD HH:mm') : '—'}</>
                )}
                {t.driver_state === 'done' && (
                    <>Ավարտված է՝ {t.driver_finished_at ? dayjs(t.driver_finished_at).format('YYYY-MM-DD HH:mm') : '—'}</>
                )}
                {(!t.driver_state || t.driver_state === 'assigned') && <>Վիճակ՝ նշանակված</>}
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
                {amenityNames.length>0 ? amenityNames.map((n,i)=>(
                    <span key={selectedIds[i]} className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs text-emerald-700 ring-1 ring-emerald-200">
            {n}
                        <button
                            onClick={(e)=>{ e.stopPropagation(); removeOne(selectedIds[i]); }}
                            className="ml-1 rounded bg-emerald-100 px-1 text-[10px] leading-none text-emerald-800"
                            title="Remove"
                        >×</button>
          </span>
                )) : <span className="text-xs text-slate-500">Հարմարություններ չկան</span>}
            </div>

            <div className="mt-3 flex flex-wrap gap-2" onClick={(e)=>e.stopPropagation()}>
                {canPublish && (
                    <button
                        onClick={()=>router.post(`/driver/trip/${t.id}/publish`)}
                        className="rounded bg-emerald-600 px-3 py-1.5 text-white hover:brightness-95">
                        Հրապարակել
                    </button>
                )}
                {t.status!=='archived' && (
                    <button
                        onClick={()=>router.post(`/driver/trip/${t.id}/archive`)}
                        className="rounded border border-slate-300 bg-white px-3 py-1.5 text-slate-800 hover:bg-slate-100">
                        Արխիվացնել
                    </button>
                )}
                <button
                    onClick={()=>router.post(`/driver/trip/${t.id}/fake-request`)}
                    className="rounded bg-cyan-600 px-3 py-1.5 text-white">
                    Թեստային հայտ
                </button>

                <button
                    onClick={()=>setOpen(true)}
                    className="rounded border border-slate-300 bg-white px-3 py-1.5 text-slate-900 hover:bg-slate-100">
                    Հարմարություններ
                </button>

                {t.driver_state !== 'done' && (
                    t.driver_state === 'en_route' ? (
                        <button
                            onClick={()=>router.post(`/driver/trip/${t.id}/finish`)}
                            className="rounded bg-emerald-600 px-3 py-1.5 text-white">
                            Ավարտել
                        </button>
                    ) : (
                        <button
                            onClick={()=>router.post(`/driver/trip/${t.id}/start`)}
                            className="rounded bg-blue-600 px-3 py-1.5 text-white">
                            Սկսել
                        </button>
                    )
                )}
            </div>

            {open && (
                <AmenityPickerModal
                    categories={cats}
                    initialSelected={selectedIds}
                    onClose={()=>setOpen(false)}
                    onSave={(ids)=>{
                        patchAmenities(ids);
                        const nameMap = new Map(flattenAmenities(cats).map(a=>[a.id, a.name]));
                        setAmenities(ids.map(id=>({ id, name: nameMap.get(id)||String(id) })));
                        setOpen(false);
                    }}
                />
            )}
        </div>
    )
}

/* ================= requests ================= */
function RequestsList({ requests }){
    const groups = useMemo(()=>{
        const m = {}; (requests||[]).forEach(r=>{ const k = (r.trip?.id||'0') + '|' + (r.trip?.from_addr||''); (m[k]??=[]).push(r) })
        return Object.entries(m)
    }, [requests])
    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-3 text-xl font-bold text-slate-900">Սպասվող հայտեր</div>
            {groups.length===0 && <div className="text-slate-500">Չկան</div>}
            <div className="space-y-4">
                {groups.map(([k,list])=>{
                    const trip = list[0].trip
                    return (
                        <div key={k} className="rounded-2xl border border-slate-200 p-4">
                            <button
                                onClick={()=>router.visit(`/driver/trip/${trip.id}`)}
                                className="text-left text-sm text-slate-600 hover:underline"
                            >
                                {trip.from_addr} → {trip.to_addr} · {dayjs(trip.departure_at).format('MM-DD HH:mm')}
                            </button>
                            <div className="divide-y">
                                {list.map(r=> <RequestRow key={r.id} r={r} />)}
                            </div>
                        </div>
                    )
                })}
            </div>
        </section>
    )
}
function RequestRow({ r }){
    const pending = r.status==='pending'
    return (
        <div className={`flex items-center justify-between py-2 ${pending?'bg-emerald-50':''}`}>
            <div>
                <div className="font-medium text-slate-900">{r.passenger_name} · {r.phone}</div>
                <div className="text-sm text-slate-700">Տեղեր՝ {r.seats} · Վճարում՝ {r.payment==='cash'?'Կանխիկ':'Քարտ'} · Կարգավիճակ՝ {statusReq(r.status)}</div>
            </div>
            <div className="flex gap-2">
                {r.status==='pending' && (
                    <>
                        <button onClick={()=>router.post(`/driver/request/${r.id}/accept`)} className="rounded bg-emerald-600 px-3 py-1.5 text-white">Ընդունել</button>
                        <button onClick={()=>router.post(`/driver/request/${r.id}/reject`)} className="rounded bg-rose-600 px-3 py-1.5 text-white">Մերժել</button>
                    </>
                )}
                {r.status!=='pending' && (
                    <span className={`rounded px-2 py-1 text-xs ${r.status==='accepted'?'bg-emerald-100 text-emerald-700':'bg-rose-100 text-rose-700'}`}>
            {statusReq(r.status)}
          </span>
                )}
            </div>
        </div>
    )
}
const statusReq = (s)=> ({pending:'Սպասում է', accepted:'Ընդունված', rejected:'Մերժված', cancelled:'Չեղարկված'})[s] || s

/* ================= UI ================= */
function Input({label,error,...p}){ return (
    <label className="block text-sm">
        <div className="mb-1 text-slate-700">{label}</div>
        <input {...p} onChange={e=>p.onChange(e.target.value)}
               className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-emerald-500"/>
        {error && <div className="mt-1 text-xs text-rose-600">{error}</div>}
    </label>
)}
function File({label,onChange}){ return (
    <label className="block text-sm">
        <div className="mb-1 text-slate-700">{label}</div>
        <input type="file" accept="image/*" onChange={e=>onChange(e.target.files[0])} className="w-full"/>
    </label>
)}
function PayMethods({ value = [], onChange }) {
    const toggle = (k) => onChange(value.includes(k) ? value.filter((i) => i !== k) : [...value, k]);
    return (
        <div className="rounded-xl border border-slate-200 p-3">
            <div className="mb-2 text-sm font-medium text-slate-900">Վճարման եղանակ</div>
            <div className="flex gap-3 text-sm">
                <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={value.includes('cash')} onChange={() => toggle('cash')} />
                    Կանխիկ
                </label>
                <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={value.includes('card')} onChange={() => toggle('card')} />
                    Քարտ
                </label>
            </div>
        </div>
    );
}

/* ================= Amenity modal ================= */
function AmenityPickerModal({ categories = [], initialSelected = [], onSave, onClose }){
    const [selected, setSelected] = useState(initialSelected||[]);
    useEffect(()=>{ setSelected(initialSelected||[]); }, [initialSelected]);
    const toggle = (id)=> setSelected(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]);

    return (
        <div className="fixed inset-0 z-[9999] grid place-items-center bg-black/40 p-4" onClick={onClose}>
            <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl" onClick={e=>e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-slate-200 p-4">
                    <div className="text-sm font-semibold text-slate-900">Հարմարություններ</div>
                    <button onClick={onClose} className="rounded px-2 py-1 text-sm text-slate-700 hover:bg-slate-100">Փակել</button>
                </div>
                <div className="max-h-[60vh] space-y-4 overflow-y-auto p-4">
                    {categories.length===0 && <div className="text-sm text-slate-500">Բեռնվում է…</div>}
                    {categories.map(cat=>(
                        <div key={cat.id} className="rounded-xl border border-slate-200 p-3">
                            <div className="mb-2 text-sm font-medium text-slate-900">{cat.name}</div>
                            <div className="flex flex-wrap gap-3">
                                {(cat.amenities||[]).map(a=>(
                                    <label key={a.id} className="inline-flex items-center gap-2 text-sm">
                                        <input type="checkbox" checked={selected.includes(a.id)} onChange={()=>toggle(a.id)} />
                                        {a.name}
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-slate-200 p-4">
                    <button onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-100">Չեղարկել</button>
                    <button
                        onClick={()=>onSave && onSave(selected)}
                        className="rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 px-3 py-1.5 text-sm font-semibold text-white shadow">
                        Պահպանել
                    </button>
                </div>
            </div>
        </div>
    );
}
