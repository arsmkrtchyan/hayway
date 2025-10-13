import React, { useEffect, useMemo, useState } from "react";
import { router } from "@inertiajs/react";
import { motion, AnimatePresence } from "framer-motion";
import { MapContainer, TileLayer, Marker, Polyline, useMap, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Phone, Users, Star, Car, MapPin, CalendarDays, CreditCard, DollarSign, X } from "lucide-react";
import CompanyDriverLayout from "@/Layouts/CompanyDriverLayout";

const buildRatingsMap = (list) => {
    const map = {};
    (list || []).forEach((r) => {
        const val = Number(r?.rating);
        if (Number.isFinite(val) && r?.user_id != null) {
            map[r.user_id] = { rating: val, note: r?.rating_note ?? "" };
        }
    });
    return map;
};

const toRoute = (name, params) => (typeof route === "function" ? route(name, params) : `/${name}`);
const fmtAMD = (n) => { try { return new Intl.NumberFormat("hy-AM").format(n || 0); } catch { return String(n); } };
const fmtDT = (iso) => { if (!iso) return "—"; try { return new Date(iso).toLocaleString("hy-AM", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }); } catch { return iso; } };

// leaflet default icon (bundlers)
const DefaultIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41], iconAnchor: [12, 41], shadowSize: [41, 41]
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

async function osrmRouteVia(profile, points) {
    const pts = (points || []).filter(p => Number.isFinite(p?.lng) && Number.isFinite(p?.lat));
    if (pts.length < 2) return null;
    const path = pts.map(p => `${p.lng},${p.lat}`).join(";");
    const url = `https://router.project-osrm.org/route/v1/${profile}/${path}?overview=full&geometries=geojson&alternatives=false&steps=false`;
    const r = await fetch(url);
    if (!r.ok) throw new Error("OSRM " + r.status);
    const d = await r.json();
    return d?.routes?.[0] || null;
}

export default function CompanyTripDetail({ trip, requests }) {
    const accepted = useMemo(() => (Array.isArray(requests) ? requests : []), [requests]);
    const taken = accepted.reduce((s, r) => s + (r.seats || 0), 0);
    const free = Math.max(0, (trip.seats_total || 0) - taken);
    const earnings = taken * (trip.price_amd || 0);

    const [rateTarget, setRateTarget] = useState(null); // {user_id, name}
    const [ratedUsers, setRatedUsers] = useState(() => buildRatingsMap(accepted));   // { [user_id]: {rating,note} }

    useEffect(() => {
        setRatedUsers(buildRatingsMap(accepted));
    }, [accepted]);

    const onStart = () => router.post(toRoute("driver.jobs.start", trip.id));
    const onFinish = () => router.post(toRoute("driver.jobs.finish", trip.id));

    const handleSaveRating = (v, note) => {
        if (!rateTarget?.user_id) return;
        const payloadNote = (note || "").trim();
        router.post(toRoute("driver.ratings.bulk"), {
            trip: trip.id,
            ratings: [{ user_id: rateTarget.user_id, rating: v, description: payloadNote || null }],
        }, {
            onSuccess: () => {
                setRatedUsers(prev => ({
                    ...prev,
                    [rateTarget.user_id]: { rating: v, note: payloadNote },
                }));
                setRateTarget(null);
            }
        });
    };

    return (
        <CompanyDriverLayout
            current="jobs"
            back={{ href: "/driver/jobs", label: "Վերադառնալ հանձնարարություններին" }}
        >
            <Header trip={trip} taken={taken} free={free} earnings={earnings} />

            <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
                <div className="space-y-6">
                    <MapCard trip={trip} />
                    <AcceptedPassengersCard
                        trip={trip}
                        accepted={accepted}
                        price={trip.price_amd}
                        ratedUsers={ratedUsers}
                        onRate={(data) => setRateTarget(data)}
                    />
                    <AboutVehicle trip={trip} />
                </div>
                <aside className="self-start lg:sticky lg:top-6">
                    <ControlPanel trip={trip} free={free} earnings={earnings} onStart={onStart} onFinish={onFinish} />
                </aside>
            </div>

            <AnimatePresence>
                {rateTarget && (
                    <RateModal
                        key="rate"
                        target={rateTarget}
                        onClose={() => setRateTarget(null)}
                        onSave={handleSaveRating}
                    />
                )}
            </AnimatePresence>
        </CompanyDriverLayout>
    );
}

/* ================= Header ================= */
function Header({ trip, taken, free, earnings }) {
    return (
        <div className="border-b border-emerald-100 bg-white/80 backdrop-blur">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 p-4">
                <div className="relative">
                    <div className="absolute -inset-1 rounded-xl bg-emerald-400/40 blur-lg" />
                    <div className="relative grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-lg">
                        <Car className="h-6 w-6" />
                    </div>
                </div>
                <div className="min-w-0">
                    <div className="text-xs uppercase tracking-wider text-emerald-700/80">Company Driver · Ուղևորություն</div>
                    <h1 className="truncate text-2xl font-bold">{trip.from_addr} → {trip.to_addr}</h1>
                    <div className="text-xs text-slate-600">{trip.company?.name || "—"} · {trip.driver?.name || "—"}</div>
                </div>
                <div className="ml-auto grid grid-cols-3 gap-3 text-center">
                    <KPI label="Զբաղ." value={`${taken}/${trip.seats_total}`} icon={<Users className="h-4 w-4" />} />
                    <KPI label="Եկամուտ" value={`${fmtAMD(earnings)} AMD`} icon={<DollarSign className="h-4 w-4" />} />
                    <KPI label="Մեկնում" value={fmtDT(trip.departure_at)} icon={<CalendarDays className="h-4 w-4" />} />
                </div>
            </div>
        </div>
    );
}
function KPI({ label, value, icon }) {
    return (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
            <div className="mb-1 flex items-center justify-center gap-1 text-emerald-700">{icon}<span>{label}</span></div>
            <div className="font-semibold text-emerald-900">{value}</div>
        </div>
    );
}

/* ================= Map Card ================= */
function FitTo({ pts, route }) {
    const map = useMap();
    useEffect(() => {
        const coords = route?.length ? route.map(p => [p.lat, p.lng]) : (pts || []).map(p => [p.lat, p.lng]);
        if (!coords.length) return;
        const b = L.latLngBounds(coords);
        map.fitBounds(b.pad(0.2));
    }, [map, JSON.stringify(pts), JSON.stringify(route)]);
    return null;
}
function MapCard({ trip }) {
    const A = useMemo(() => ({ lat: +trip.from_lat, lng: +trip.from_lng }), [trip.from_lat, trip.from_lng]);
    const B = useMemo(() => ({ lat: +trip.to_lat, lng: +trip.to_lng }), [trip.to_lat, trip.to_lng]);
    const stops = useMemo(() => (trip.stops || []).slice().sort((a, b) => a.position - b.position), [trip.stops]);
    const [route, setRoute] = useState([]);
    const [fallback, setFallback] = useState([]);
    const pts = useMemo(() => [A, ...stops, B].filter(p => Number.isFinite(p?.lat) && Number.isFinite(p?.lng)), [A, B, JSON.stringify(stops)]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (pts.length < 2) { setRoute([]); setFallback([]); return; }
            try {
                const r = await osrmRouteVia("driving", pts);
                if (cancelled) return;
                const coords = (r?.geometry?.coordinates || []).map(([lng, lat]) => ({ lat, lng }));
                setRoute(coords); setFallback([]);
            } catch {
                if (cancelled) return;
                setRoute([]); setFallback(pts.map(p => ({ lat: p.lat, lng: p.lng })));
            }
        })();
        return () => { cancelled = true; };
    }, [JSON.stringify(pts)]);

    const center = Number.isFinite(A?.lat) && Number.isFinite(B?.lat) ? [(A.lat + B.lat) / 2, (A.lng + B.lng) / 2] : [40.1792, 44.4991];

    return (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="h-1.5 w-full bg-[repeating-linear-gradient(90deg,#10b981_0_16px,#10b981_16px_18px,transparent_18px_34px,transparent_34px_36px)]" />
            <div className="grid gap-0 md:grid-cols-[1.2fr_1fr]">
                <div className="h-64 md:h-80">
                    <MapContainer center={center} zoom={8} className="h-full w-full">
                        <TileLayer attribution='&copy; OSM contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        {route.length > 1 && (<Polyline positions={route.map(p => [p.lat, p.lng])} weight={6} />)}
                        {route.length === 0 && fallback.length > 1 && (<Polyline positions={fallback.map(p => [p.lat, p.lng])} weight={4} />)}
                        {Number.isFinite(A?.lng) && Number.isFinite(A?.lat) && (<Marker position={[A.lat, A.lng]} icon={mkDivIcon('#16a34a', 'Սկիզբ')} />)}
                        {stops.map((s, i) => Number.isFinite(s?.lng) && Number.isFinite(s?.lat) ? (
                            <Marker key={i} position={[s.lat, s.lng]} icon={mkDivIcon('#22c55e', String(i + 1))} />
                        ) : null)}
                        {Number.isFinite(B?.lng) && Number.isFinite(B?.lat) && (<Marker position={[B.lat, B.lng]} icon={mkDivIcon('#ef4444', 'Վերջ')} />)}
                        {A && <Circle center={[A.lat, A.lng]} radius={400} pathOptions={{ color: '#22c55e', weight: 1, fillOpacity: .05 }} />}
                        {B && <Circle center={[B.lat, B.lng]} radius={400} pathOptions={{ color: '#ef4444', weight: 1, fillOpacity: .05 }} />}
                        <FitTo pts={pts} route={route} />
                    </MapContainer>
                </div>
                <div className="flex flex-col justify-between p-5">
                    <div className="space-y-2 text-slate-700">
                        <InfoRow icon={<MapPin className="h-4 w-4 text-emerald-600" />} label="Ուղղություն" value={`${trip.from_addr} → ${trip.to_addr}`} />
                        <InfoRow icon={<CalendarDays className="h-4 w-4 text-emerald-600" />} label="Մեկնում" value={fmtDT(trip.departure_at)} />
                        <InfoRow icon={<Users className="h-4 w-4 text-emerald-600" />} label="Տեղեր" value={`${trip.seats_total}`} />
                        <InfoRow icon={<CreditCard className="h-4 w-4 text-emerald-600" />} label="Վճարում" value={(trip.pay_methods || []).join(" · ") || '—'} />
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-4 text-sm">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <div className="text-slate-600">Վարորդ</div>
                            <div className="font-medium">{trip.driver?.name || '—'}</div>
                            <div className="text-xs text-slate-500">{trip.driver?.phone || '—'}</div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <div className="text-slate-600">Մեքենա</div>
                            <div className="font-medium">{trip.vehicle?.brand} {trip.vehicle?.model}</div>
                            <div className="text-xs text-slate-500">{trip.vehicle?.color} · {trip.vehicle?.plate}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
function InfoRow({ icon, label, value }) {
    return (<div className="flex items-center gap-2"><span>{icon}</span><span className="text-slate-600">{label}:</span><span className="font-medium text-slate-800">{value}</span></div>);
}

/* ================= Accepted Passengers ================= */
function AcceptedPassengersCard({ trip, accepted, price, ratedUsers, onRate }) {
    const [q, setQ] = useState("");
    const done = trip.driver_state === 'done';
    const list = (accepted || []).filter(r =>
        (r.passenger_name || "").toLowerCase().includes(q.toLowerCase()) || (r.phone || "").includes(q)
    );

    return (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-3 flex flex-wrap items-center gap-2">
                <div className="text-lg font-semibold">Ընդունված ուղևորներ</div>
                <div className="ml-auto"></div>
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="որոնել անունով/հեռ."
                       className="h-9 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500" />
            </div>

            <div className="space-y-2">
                {list.map(r => {
                    const ratingData = ratedUsers?.[r.user_id];
                    const fallbackDriverRating = Number(r?.rating);
                    const driverRating = Number.isFinite(ratingData?.rating)
                        ? ratingData.rating
                        : (Number.isFinite(fallbackDriverRating) ? fallbackDriverRating : null);
                    const driverNote = ratingData?.note ?? (r?.rating_note ?? "");
                    const userRatingValue = Number(r?.user_rating);
                    const userRating = Number.isFinite(userRatingValue) ? userRatingValue : null;

                    return (
                        <AcceptedRow
                            key={r.id}
                            r={r}
                            price={price}
                            done={done}
                            driverRating={driverRating}
                            userRating={userRating}
                            canRate={!!r.user_id}
                            onRate={() => onRate({
                                user_id: r.user_id,
                                name: r.passenger_name || 'Passenger',
                                currentRating: Number.isFinite(driverRating) ? driverRating : null,
                                currentNote: driverNote || "",
                            })}
                        />
                    );
                })}
                {list.length === 0 && <div className="text-sm text-slate-500">Դատարկ</div>}
            </div>
        </div>
    );
}
function AcceptedRow({ r, price, done, driverRating, userRating, canRate, onRate }) {
    const telHref = (p) => (p ? `tel:${p.replace(/\s|\(|\)|-/g, "")}` : "#");
    const driverRatingText = Number.isFinite(driverRating) ? driverRating.toFixed(1) : null;
    const userRatingText = Number.isFinite(userRating) ? userRating.toFixed(1) : null;
    return (
        <div className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-600 font-semibold text-white">{(r.passenger_name||'?').slice(0,1)}</div>
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 font-medium">
                        <span className="truncate">{r.passenger_name}</span>
                        <a href={telHref(r.phone)} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-0.5 text-xs hover:bg-slate-50">
                            <Phone className="h-3.5 w-3.5"/> {r.phone || '—'}
                        </a>
                    </div>
                    <div className="text-sm text-slate-600">Տեղեր՝ {r.seats} · Վճարում՝ {r.payment === 'card' ? 'Քարտ' : 'Կանխիկ'} · Գին՝ {fmtAMD(r.seats * (price || 0))} AMD</div>
                    {(driverRatingText || userRatingText) && (
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                            {userRatingText && (
                                <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 text-amber-500" />Ընդհանուր՝ {userRatingText}</span>
                            )}
                            {driverRatingText && (
                                <span className="inline-flex items-center gap-1 text-emerald-700"><Star className="h-3 w-3" />Իմ՝ {driverRatingText}</span>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
                {done && canRate ? (
                    <button
                        onClick={onRate}
                        className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
                    >
                        {driverRatingText ? `Փոփոխել (${driverRatingText})` : 'Գնահատել ★'}
                    </button>
                ) : done ? (
                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-500">Գնահատումը հասանելի չէ</span>
                ) : null}
            </div>
        </div>
    );
}

/* ================= Vehicle/About ================= */
function AboutVehicle({ trip }) {
    return (
        <div className="grid gap-4 md:grid-cols-2">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
                <div className="mb-2 text-lg font-semibold">Մեքենայի տվյալներ</div>
                <div className="grid gap-3 sm:grid-cols-2">
                    <Row k="Մարկա" v={trip.vehicle?.brand || '—'} />
                    <Row k="Մոդել" v={trip.vehicle?.model || '—'} />
                    <Row k="Գույն" v={trip.vehicle?.color || '—'} />
                    <Row k="Պետհամարանիշ" v={trip.vehicle?.plate || '—'} />
                </div>
            </div>
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
                <div className="mb-2 text-lg font-semibold">Ընկերություն / Վարորդ</div>
                <div className="grid gap-3">
                    <Row k="Ընկերություն" v={trip.company?.name || '—'} />
                    <Row k="Վարորդ" v={`${trip.driver?.name || '—'} · ${trip.driver?.phone || '—'}`} />
                    <Row k="Վարկանիշ" v={<span className="inline-flex items-center gap-1"><Star className="h-4 w-4 text-amber-500" />{(trip.company?.rating || 5).toFixed(2)}</span>} />
                </div>
            </div>
        </div>
    );
}
function Row({ k, v }) { return (<div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"><div className="text-slate-600">{k}</div><div className="font-medium text-slate-800">{v}</div></div>); }

/* ================= Controls ================= */
function ControlPanel({ trip, free, earnings, onStart, onFinish }) {
    const running = trip.driver_state === "en_route";
    const done = trip.driver_state === "done";
    return (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-3 text-lg font-semibold">Վերահսկում</div>
            <div className="grid gap-2 text-sm">
                <Row k="Վճարում" v={(trip.pay_methods || []).join(" · ") || '—'} />
                <Row k="Տեղեր ազատ" v={free} />
                <Row k="Սպասվող եկամուտ" v={`${fmtAMD(earnings)} AMD`} />
            </div>
            <div className="mt-4 grid gap-2">
                {!done && !running && (
                    <button onClick={onStart} className="rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2 font-semibold text-white">Սկսել ուղևորությունը</button>
                )}
                {running && (
                    <button onClick={onFinish} className="rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 px-4 py-2 font-semibold text-white">Ավարտել</button>
                )}
                {done && (
                    <div className="rounded-2xl bg-slate-100 px-4 py-2 text-center text-sm font-semibold text-slate-600">Ավարտված է</div>
                )}
            </div>
        </div>
    );
}

/* ================= Modal ================= */
function ModalShell({ children, onClose }) {
    return (
        <motion.div className="fixed inset-0 z-[9999] grid items-start justify-center bg-black/50 p-4 sm:items-center"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
            <motion.div onClick={(e) => e.stopPropagation()}
                        initial={{ y: 32, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 12, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 420, damping: 32 }}
                        className="mt-16 w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:mt-0">
                {children}
            </motion.div>
        </motion.div>
    );
}
function RateModal({ target, onClose, onSave }) {
    const [v, setV] = useState(target?.currentRating ? Math.round(Number(target.currentRating)) : 5);
    const [note, setNote] = useState(target?.currentNote ?? "");

    useEffect(() => {
        setV(target?.currentRating ? Math.round(Number(target.currentRating)) : 5);
        setNote(target?.currentNote ?? "");
    }, [target]);
    return (
        <ModalShell onClose={onClose}>
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
                <div className="text-sm font-semibold">Գնահատել {target?.name}</div>
                <button onClick={onClose} className="rounded p-1 hover:bg-slate-100" aria-label="Close"><X className="h-4 w-4"/></button>
            </div>
            <div className="space-y-3 p-4 text-sm">
                <div className="flex items-center gap-1 text-2xl">
                    {[1,2,3,4,5].map(n => (
                        <button key={n} onClick={() => setV(n)} className={`${n <= v ? 'text-yellow-500' : 'text-slate-300'}`}>★</button>
                    ))}
                    <span className="ml-2 text-sm text-slate-700">{v.toFixed(2)}</span>
                </div>
                <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Մեկնաբանություն (ըստ ցանկության)" className="min-h-28 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none" />
                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className="rounded border border-slate-200 px-3 py-2 text-sm">Փակել</button>
                    <button onClick={() => onSave?.(v, note)} className="rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">Պահպանել</button>
                </div>
            </div>
        </ModalShell>
    );
}
