import React, { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    MapPin,
    Clock,
    Car,
    User,
    Shield,
    Star,
    MessageSquare,
    Wallet,
    X,
    Check,
    Search,
    Settings,
    ChevronRight,
    ChevronLeft,
    Play,
    Pause,
    RefreshCw,
    Calendar,
} from "lucide-react";
import {
    LineChart,
    Line,
    ResponsiveContainer,
    Tooltip,
    CartesianGrid,
    XAxis,
    YAxis,
} from "recharts";

/**
 * POPUTI-style complex demo front-end
 * -------------------------------------------------------------
 * Язык интерфейса: RU (ключевые слова/имена функций — EN)
 * Цель: «замороченный» демо-проект со множеством фич:
 *  - Поиск A→B + временное окно, фильтры, детур-матчинг
 *  - SVG-карта со слоями и анимированной машиной
 *  - Карточки поездок, seat-map, выбор мест, правила отмен
 *  - Wallet + Escrow (эмуляция), dynamic pricing, promo
 *  - Chat внутри брони, рейтинги, KYC badges, Recurring trips
 *  - Admin(debug) панель, логи матчинга, фича-флаги
 *  - LocalStorage persistence, pseudo WebSocket bus
 *  - Recharts-панель «спрос/цена»
 * Всё внутри одного файла для демонстрации. Backend эмулирован.
 */

/*************************
 * 0) УТИЛИТЫ / HELPERS  *
 *************************/

// Haversine distance (км)
function haversine(a, b) {
    const R = 6371; // km
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLon = ((b.lon - a.lon) * Math.PI) / 180;
    const lat1 = (a.lat * Math.PI) / 180;
    const lat2 = (b.lat * Math.PI) / 180;
    const sinDLat = Math.sin(dLat / 2);
    const sinDLon = Math.sin(dLon / 2);
    const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
    const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    return R * c;
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

// Проекция lat/lon → SVG (простая, без учёта кривизны)
function project({ lat, lon }, bbox, width, height) {
    const { minLat, maxLat, minLon, maxLon } = bbox;
    const x = ((lon - minLon) / (maxLon - minLon)) * width;
    const y = ((maxLat - lat) / (maxLat - minLat)) * height; // инверсия Y
    return { x, y };
}

function unproject({ x, y }, bbox, width, height) {
    const { minLat, maxLat, minLon, maxLon } = bbox;
    const lon = minLon + (x / width) * (maxLon - minLon);
    const lat = maxLat - (y / height) * (maxLat - minLat);
    return { lat, lon };
}

// Находит ближайшую точку на полилинии к точке p
function nearestPointOnPath(p, path) {
    let best = { dist: Infinity, atIndex: -1, point: null, t: 0 };
    for (let i = 0; i < path.length - 1; i++) {
        const a = path[i];
        const b = path[i + 1];
        // аппроксимация в декартовых координатах: переводим в локальную систему (простая модель)
        // для небольших расстояний приемлемо
        const ax = a.lon;
        const ay = a.lat;
        const bx = b.lon;
        const by = b.lat;
        const px = p.lon;
        const py = p.lat;
        const abx = bx - ax;
        const aby = by - ay;
        const apx = px - ax;
        const apy = py - ay;
        const ab2 = abx * abx + aby * aby;
        const dot = apx * abx + apy * aby;
        let t = ab2 === 0 ? 0 : Math.max(0, Math.min(1, dot / ab2));
        const q = { lat: ay + aby * t, lon: ax + abx * t };
        const d = haversine(p, q);
        if (d < best.dist) best = { dist: d, atIndex: i, point: q, t };
    }
    return best;
}

// Вычисляем детур (км) для водителя, если он подбирает пассажира A и высаживает в B
function detourForPickup(driverPath, A, B) {
    const nearA = nearestPointOnPath(A, driverPath);
    const nearB = nearestPointOnPath(B, driverPath);
    const baseDistance = pathDistance(driverPath.slice(nearA.atIndex, nearB.atIndex + 2));
    const withPickup = haversine(nearA.point, A) + haversine(A, B) + haversine(B, nearB.point);
    // Детур как превышение против проезда по трассе (между проекциями)
    const detour = withPickup - baseDistance;
    return { detourKm: Math.max(0, detour), fromSeg: nearA.atIndex, toSeg: nearB.atIndex };
}

function pathDistance(path) {
    let d = 0;
    for (let i = 0; i < path.length - 1; i++) d += haversine(path[i], path[i + 1]);
    return d;
}

function fmtKm(km) {
    return `${km.toFixed(1)} км`;
}

function fmtAmd(amd) {
    return `${Math.round(amd).toLocaleString("ru-AM")} ֏`;
}

function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
}

function nowIso() {
    return new Date().toISOString();
}

/*****************************
 * 1) ДАННЫЕ / MOCK STORAGE  *
 *****************************/

// Границы для карты (Армения + часть Грузии)
const BBOX = {
    minLat: 39.5,
    maxLat: 42.4,
    minLon: 43.3,
    maxLon: 46.8,
};

// Узловые точки
const PLACES = {
    Yerevan: { lat: 40.1776, lon: 44.5126, name: "Ереван" },
    Gyumri: { lat: 40.789, lon: 43.847, name: "Гюмри" },
    Vanadzor: { lat: 40.8164, lon: 44.4949, name: "Ванадзор" },
    Dilijan: { lat: 40.7417, lon: 44.8636, name: "Дилижан" },
    Sevan: { lat: 40.549, lon: 44.953, name: "Севан" },
    Hrazdan: { lat: 40.4926, lon: 44.7662, name: "Раздан" },
    Tbilisi: { lat: 41.7151, lon: 44.8271, name: "Тбилиси" },
    Aparan: { lat: 40.5927, lon: 44.3571, name: "Апаран" },
};

// Предопределённые полилинии (схематичные, не идеальные шоссе)
const ROUTES = {
    YVN_GYR: [PLACES.Yerevan, PLACES.Aparan, PLACES.Vanadzor, PLACES.Gyumri],
    YVN_DIL: [PLACES.Yerevan, PLACES.Hrazdan, PLACES.Dilijan],
    YVN_SVN: [PLACES.Yerevan, PLACES.Hrazdan, PLACES.Sevan],
    YVN_TBS: [PLACES.Yerevan, PLACES.Hrazdan, PLACES.Dilijan, PLACES.Tbilisi],
};

// Драйверы с маршрутами
const DRIVERS = [
    {
        id: "drv_1",
        name: "Арман Г.",
        rating: 4.93,
        kyc: true,
        vehicle: { brand: "Toyota", model: "Prius", year: 2015, seats: 4 },
        pathKey: "YVN_GYR",
        departureAt: addHours(new Date(), 5),
        priceBaseAmd: 2500,
        baggage: true,
        childSeat: false,
        features: ["Eco", "A/C"],
        occupiedSeats: ["rear-right"],
    },
    {
        id: "drv_2",
        name: "Григор К.",
        rating: 4.81,
        kyc: true,
        vehicle: { brand: "Mercedes", model: "Vito", year: 2018, seats: 6 },
        pathKey: "YVN_TBS",
        departureAt: addHours(new Date(), 20),
        priceBaseAmd: 8000,
        baggage: true,
        childSeat: true,
        features: ["Business", "USB"],
        occupiedSeats: ["rear-left", "rear-middle"],
    },
    {
        id: "drv_3",
        name: "Марине С.",
        rating: 4.99,
        kyc: true,
        vehicle: { brand: "Hyundai", model: "Elantra", year: 2020, seats: 4 },
        pathKey: "YVN_DIL",
        departureAt: addHours(new Date(), 2.5),
        priceBaseAmd: 2000,
        baggage: false,
        childSeat: true,
        features: ["Comfort", "A/C"],
        occupiedSeats: [],
    },
    {
        id: "drv_4",
        name: "Ваграм Т.",
        rating: 4.66,
        kyc: false,
        vehicle: { brand: "Lada", model: "Vesta", year: 2017, seats: 4 },
        pathKey: "YVN_SVN",
        departureAt: addHours(new Date(), 1.2),
        priceBaseAmd: 1500,
        baggage: true,
        childSeat: false,
        features: ["Budget"],
        occupiedSeats: ["rear-left"],
    },
];

function addHours(d, h) {
    const x = new Date(d);
    x.setHours(x.getHours() + h);
    return x;
}

// Сид-мап (универсальный для 4/5/6 мест)
const SEAT_LAYOUTS = {
    4: ["front", "rear-left", "rear-middle", "rear-right"],
    5: ["front", "rear-left", "rear-middle", "rear-right", "extra-1"],
    6: ["front", "rear-left", "rear-middle", "rear-right", "extra-1", "extra-2"],
};

/***********************************
 * 2) PSEUDO DB + LOCAL PERSISTENCE *
 ***********************************/

const STORAGE_KEY = "poputi_demo_state_v1";
const initialDB = {
    walletAmd: 10000,
    bookings: [], // {id, driverId, seats:[..], paxName, status, escrowAmd, route, createdAt, messages:[]}
    flags: {
        dynamicPricing: true,
        surgeMultiplierMax: 1.6,
        showDebug: false,
    },
};

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return initialDB;
        const parsed = JSON.parse(raw);
        return { ...initialDB, ...parsed };
    } catch (e) {
        return initialDB;
    }
}

function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function reducer(state, action) {
    switch (action.type) {
        case "wallet:add": {
            const walletAmd = state.walletAmd + action.amount;
            const next = { ...state, walletAmd };
            saveState(next);
            return next;
        }
        case "booking:create": {
            const next = { ...state, bookings: [...state.bookings, action.booking] };
            saveState(next);
            return next;
        }
        case "booking:update": {
            const bookings = state.bookings.map((b) => (b.id === action.id ? { ...b, ...action.patch } : b));
            const next = { ...state, bookings };
            saveState(next);
            return next;
        }
        case "flags:set": {
            const flags = { ...state.flags, ...action.patch };
            const next = { ...state, flags };
            saveState(next);
            return next;
        }
        default:
            return state;
    }
}

/**********************
 * 3) DEMO APP (React) *
 **********************/

export default function Demo() {
    const [db, dispatch] = useReducer(reducer, undefined, loadState);

    const [fromQuery, setFromQuery] = useState("Ереван");
    const [toQuery, setToQuery] = useState("Гюмри");
    const [when, setWhen] = useState(() => new Date(Date.now() + 2 * 3600e3).toISOString().slice(0, 16)); // local ISO for input[type=datetime-local]
    const [flexMinutes, setFlexMinutes] = useState(60);
    const [needChildSeat, setNeedChildSeat] = useState(false);
    const [needBaggage, setNeedBaggage] = useState(true);
    const [minRating, setMinRating] = useState(4.5);
    const [maxDetour, setMaxDetour] = useState(25); // км
    const [radiusKm, setRadiusKm] = useState(8);
    const [selected, setSelected] = useState(null); // выбранная поездка для брони

    const fromPlace = resolvePlace(fromQuery);
    const toPlace = resolvePlace(toQuery);

    const searchTs = useMemo(() => new Date(when).getTime(), [when]);

    // Матчинг
    const matches = useMemo(() => {
        if (!fromPlace || !toPlace) return [];
        const req = { A: fromPlace, B: toPlace, when: searchTs };
        return DRIVERS.map((d) => {
            const path = ROUTES[d.pathKey];
            const baseKm = pathDistance(path);
            const det = detourForPickup(path, req.A, req.B);
            const scoreDetour = clamp(1 - det.detourKm / maxDetour, 0, 1);
            const timeDeltaHr = Math.abs(d.departureAt.getTime() - req.when) / 3600e3;
            const scoreTime = clamp(1 - timeDeltaHr / (flexMinutes / 60), 0, 1);
            const scoreRating = clamp((d.rating - 4) / 1, 0, 1);
            const featurePenalty = (needBaggage && !d.baggage ? -0.3 : 0) + (needChildSeat && !d.childSeat ? -0.3 : 0);
            const score = scoreDetour * 0.45 + scoreTime * 0.35 + scoreRating * 0.2 + featurePenalty;
            const dyn = dynamicPrice(d, req.when, db.flags);
            return {
                driver: d,
                path,
                baseKm,
                detourKm: det.detourKm,
                priceAmd: dyn.price,
                surge: dyn.mult,
                score,
                timeDeltaHr,
            };
        })
            .filter((m) => m.score > 0 && m.driver.rating >= minRating)
            .sort((a, b) => b.score - a.score);
    }, [fromPlace, toPlace, searchTs, needBaggage, needChildSeat, maxDetour, minRating, flexMinutes, db.flags]);

    return (
        <div className="min-h-screen bg-neutral-50 text-neutral-900">
            <Header db={db} dispatch={dispatch} />
            <main className="max-w-7xl mx-auto px-4 py-6 grid lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 space-y-4">
                    <SearchPanel
                        fromQuery={fromQuery}
                        setFromQuery={setFromQuery}
                        toQuery={toQuery}
                        setToQuery={setToQuery}
                        when={when}
                        setWhen={setWhen}
                        flexMinutes={flexMinutes}
                        setFlexMinutes={setFlexMinutes}
                        radiusKm={radiusKm}
                        setRadiusKm={setRadiusKm}
                        needBaggage={needBaggage}
                        setNeedBaggage={setNeedBaggage}
                        needChildSeat={needChildSeat}
                        setNeedChildSeat={setNeedChildSeat}
                        minRating={minRating}
                        setMinRating={setMinRating}
                    />
                    <Results
                        matches={matches}
                        from={fromPlace}
                        to={toPlace}
                        onSelect={(m) => setSelected(m)}
                        flags={db.flags}
                    />
                </div>
                <div className="lg:col-span-2 space-y-4 sticky top-4 self-start">
                    <MapPanel from={fromPlace} to={toPlace} matches={matches} />
                    <DemandPanel from={fromPlace} to={toPlace} flags={db.flags} />
                    <AdminPanel flags={db.flags} onSetFlags={(patch) => dispatch({ type: "flags:set", patch })} />
                </div>
            </main>
            <BookingsPanel db={db} dispatch={dispatch} />

            <AnimatePresence>{selected && (
                <BookingModal
                    key={selected.driver.id}
                    match={selected}
                    onClose={() => setSelected(null)}
                    db={db}
                    dispatch={dispatch}
                    from={fromPlace}
                    to={toPlace}
                />
            )}</AnimatePresence>
        </div>
    );
}

/*********************
 * 4) UI COMPONENTS   *
 *********************/

function Header({ db, dispatch }) {
    return (
        <div className="border-b bg-white">
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
                <div className="flex items-center gap-2 font-bold text-lg"><Car className="w-5 h-5"/> Poputi.Next</div>
                <div className="text-sm text-neutral-500 hidden md:block">демо-проект: поиск попуток, escrow, карта, чат</div>
                <div className="ml-auto flex items-center gap-3">
                    <Wallet className="w-4 h-4"/>
                    <span className="font-semibold">{fmtAmd(db.walletAmd)}</span>
                    <button
                        onClick={() => dispatch({ type: "wallet:add", amount: 5000 })}
                        className="px-3 py-1.5 rounded-xl bg-neutral-900 text-white text-sm hover:bg-neutral-800"
                    >+5 000</button>
                    <button
                        onClick={() => dispatch({ type: "wallet:add", amount: 10000 })}
                        className="px-3 py-1.5 rounded-xl bg-neutral-900 text-white text-sm hover:bg-neutral-800"
                    >+10 000</button>
                </div>
            </div>
        </div>
    );
}

function SearchPanel(props) {
    const {
        fromQuery,
        setFromQuery,
        toQuery,
        setToQuery,
        when,
        setWhen,
        flexMinutes,
        setFlexMinutes,
        radiusKm,
        setRadiusKm,
        needBaggage,
        setNeedBaggage,
        needChildSeat,
        setNeedChildSeat,
        minRating,
        setMinRating,
    } = props;

    return (
        <div className="bg-white rounded-2xl shadow p-4 border">
            <div className="flex items-center gap-2 text-neutral-700 mb-3"><Search className="w-4 h-4"/> Поиск маршрутов</div>
            <div className="grid md:grid-cols-2 gap-3">
                <Labeled label="Откуда">
                    <input value={fromQuery} onChange={(e) => setFromQuery(e.target.value)} className="w-full rounded-xl border px-3 py-2" placeholder="Ереван"/>
                </Labeled>
                <Labeled label="Куда">
                    <input value={toQuery} onChange={(e) => setToQuery(e.target.value)} className="w-full rounded-xl border px-3 py-2" placeholder="Гюмри"/>
                </Labeled>
                <Labeled label="Когда (локальное время)">
                    <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="w-full rounded-xl border px-3 py-2"/>
                </Labeled>
                <div className="grid grid-cols-3 gap-3">
                    <Labeled label="Flex, мин">
                        <input type="number" value={flexMinutes} onChange={(e) => setFlexMinutes(+e.target.value)} min={15} max={240} className="w-full rounded-xl border px-3 py-2"/>
                    </Labeled>
                    <Labeled label="Радиус, км">
                        <input type="number" value={radiusKm} onChange={(e) => setRadiusKm(+e.target.value)} min={2} max={30} className="w-full rounded-xl border px-3 py-2"/>
                    </Labeled>
                    <Labeled label={"Рейтинг ≥ " + minRating.toFixed(1)}>
                        <input type="range" min={3.5} max={5} step={0.05} value={minRating} onChange={(e) => setMinRating(+e.target.value)} className="w-full"/>
                    </Labeled>
                </div>
                <div className="col-span-2 grid grid-cols-3 gap-3 items-end">
                    <Toggle label="Багаж" checked={needBaggage} onChange={setNeedBaggage} />
                    <Toggle label="Детское кресло" checked={needChildSeat} onChange={setNeedChildSeat} />
                    <div className="text-sm text-neutral-500 flex items-center gap-2"><Shield className="w-4 h-4"/> KYC/проверка авто включена по умолчанию (демо)</div>
                </div>
            </div>
        </div>
    );
}

function Results({ matches, from, to, onSelect, flags }) {
    return (
        <div className="space-y-3">
            {matches.length === 0 && (
                <div className="text-sm text-neutral-600 bg-white border rounded-2xl p-4">Нет подходящих результатов. Измените фильтры или flex.</div>
            )}
            {matches.map((m) => (
                <motion.div key={m.driver.id} layout className="bg-white border rounded-2xl p-4 shadow-sm">
                    <div className="flex items-start gap-4">
                        <Avatar name={m.driver.name} />
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="font-semibold">{m.driver.name}</div>
                                {m.driver.kyc && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1"><Shield className="w-3 h-3"/>KYC</span>}
                                <Stars value={m.driver.rating} />
                                <span className="text-xs text-neutral-500">{m.driver.vehicle.brand} {m.driver.vehicle.model} • {m.driver.vehicle.year}</span>
                            </div>
                            <div className="text-sm text-neutral-600 flex flex-wrap gap-x-4 gap-y-1">
                                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5"/>{from?.name} → {to?.name}</span>
                                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5"/>{fmtDateTime(m.driver.departureAt)} (± ваш flex)</span>
                                <span>Детур: <b>{fmtKm(m.detourKm)}</b></span>
                                <span>Спрос: x{m.surge.toFixed(2)}</span>
                            </div>
                            <div className="mt-3 grid md:grid-cols-2 gap-3">
                                <SeatMap seats={m.driver.vehicle.seats} occupied={m.driver.occupiedSeats} />
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-xs text-neutral-500">Цена/пассажир</div>
                                        <div className="text-2xl font-bold">{fmtAmd(m.priceAmd)}</div>
                                        {flags.dynamicPricing && <div className="text-xs text-neutral-500">(вкл. динамика)</div>}
                                    </div>
                                    <button
                                        onClick={() => onSelect(m)}
                                        className="px-4 py-2 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800"
                                    >Забронировать</button>
                                </div>
                            </div>
                            <div className="mt-2 text-xs text-neutral-500">Фичи: {m.driver.features.join(", ")} · Багаж: {m.driver.baggage ? "да" : "нет"} · Детк. кресло: {m.driver.childSeat ? "да" : "нет"}</div>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}

function MapPanel({ from, to, matches }) {
    const width = 640;
    const height = 360;
    const [playingId, setPlayingId] = useState(null);
    const tRef = useRef(0);

    // Анимация машины вдоль пути
    useEffect(() => {
        let raf;
        const loop = () => {
            tRef.current = (tRef.current + 0.002) % 1; // скорость
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, []);

    const drawPath = (path) => path
        .map((p) => project(p, BBOX, width, height))
        .map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`))
        .join(" ");

    const marker = (p, cls) => {
        const { x, y } = project(p, BBOX, width, height);
        return <circle cx={x} cy={y} r={5} className={cls} />;
    };

    return (
        <div className="bg-white border rounded-2xl p-4">
            <div className="flex items-center gap-2 text-neutral-700 mb-3"><MapPin className="w-4 h-4"/> Карта (SVG)</div>
            <div className="relative border rounded-xl overflow-hidden">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-72 block bg-neutral-100">
                    {/* сетка */}
                    <GridSVG width={width} height={height} />

                    {/* маршруты водителей */}
                    {matches.map((m) => (
                        <g key={m.driver.id}>
                            <path d={drawPath(m.path)} fill="none" stroke="#111827" strokeWidth={2} opacity={0.2} />
                            {/* анимированная машина */}
                            <CarIconOnPath path={m.path} t={playingId === m.driver.id ? tRef.current : 0} width={width} height={height} />
                        </g>
                    ))}

                    {/* Откуда/Куда */}
                    {from && marker(from, "fill-emerald-600")}
                    {to && marker(to, "fill-rose-600")}
                </svg>
                <div className="absolute bottom-2 left-2 flex gap-2">
                    {matches.map((m) => (
                        <button key={m.driver.id} onClick={() => setPlayingId((id) => (id === m.driver.id ? null : m.driver.id))} className={`px-2.5 py-1 rounded-lg text-xs border bg-white/90 backdrop-blur flex items-center gap-1 ${playingId===m.driver.id?"border-neutral-900":""}`}>
                            {playingId === m.driver.id ? <Pause className="w-3 h-3"/> : <Play className="w-3 h-3"/>}
                            {m.driver.name.split(" ")[0]}
                        </button>
                    ))}
                </div>
            </div>
            <div className="mt-2 text-xs text-neutral-500">Маршруты схематичны, для демо. Линии — пути драйверов; зелёная точка — «откуда», красная — «куда».</div>
        </div>
    );
}

function CarIconOnPath({ path, t, width, height }) {
    if (!path || path.length < 2) return null;
    const total = pathDistance(path);
    let acc = 0;
    let target = t * total;
    for (let i = 0; i < path.length - 1; i++) {
        const seg = haversine(path[i], path[i + 1]);
        if (acc + seg >= target) {
            const localT = (target - acc) / seg;
            const lat = lerp(path[i].lat, path[i + 1].lat, localT);
            const lon = lerp(path[i].lon, path[i + 1].lon, localT);
            const { x, y } = project({ lat, lon }, BBOX, width, height);
            return (
                <g transform={`translate(${x} ${y})`}>
                    <motion.rect initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.3 }} x={-6} y={-4} width={12} height={8} rx={2} fill="#111827" />
                </g>
            );
        }
        acc += seg;
    }
    return null;
}

function DemandPanel({ from, to, flags }) {
    const data = useMemo(() => buildDemandData(from, to, flags), [from, to, flags]);
    return (
        <div className="bg-white border rounded-2xl p-4">
            <div className="flex items-center gap-2 text-neutral-700 mb-3"><RefreshCw className="w-4 h-4"/> Прогноз спроса/цены</div>
            <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="h" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip />
                        <Line yAxisId="left" type="monotone" dataKey="demand" strokeWidth={2} dot={false} />
                        <Line yAxisId="right" type="monotone" dataKey="priceMult" strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            <div className="text-xs text-neutral-500 mt-2">Спрос (лев.) и множитель цены (прав.). Динамическое ценообразование можно отключить в Admin.</div>
        </div>
    );
}

function AdminPanel({ flags, onSetFlags }) {
    return (
        <div className="bg-white border rounded-2xl p-4">
            <div className="flex items-center gap-2 text-neutral-700 mb-3"><Settings className="w-4 h-4"/> Admin / Debug</div>
            <div className="space-y-2 text-sm">
                <Toggle label="Dynamic pricing" checked={flags.dynamicPricing} onChange={(v) => onSetFlags({ dynamicPricing: v })} />
                <Labeled label={`Surge max x${flags.surgeMultiplierMax.toFixed(2)}`}>
                    <input type="range" min={1} max={2} step={0.05} value={flags.surgeMultiplierMax} onChange={(e) => onSetFlags({ surgeMultiplierMax: +e.target.value })} className="w-full"/>
                </Labeled>
                <Toggle label="Показать debug-поля" checked={flags.showDebug} onChange={(v) => onSetFlags({ showDebug: v })} />
            </div>
        </div>
    );
}

function BookingsPanel({ db, dispatch }) {
    const [open, setOpen] = useState(true);
    return (
        <div className="max-w-7xl mx-auto px-4 pb-12">
            <div className="mt-2">
                <button onClick={() => setOpen((v) => !v)} className="text-sm text-neutral-600 flex items-center gap-1">
                    {open ? <ChevronDownIcon/> : <ChevronRight className="w-4 h-4"/>}
                    Ваши брони ({db.bookings.length})
                </button>
                <AnimatePresence>
                    {open && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
                            {db.bookings.map((b) => (
                                <BookingCard key={b.id} b={b} dispatch={dispatch} />
                            ))}
                            {db.bookings.length === 0 && (
                                <div className="text-sm text-neutral-500">Пока пусто. Выберите маршрут и нажмите «Забронировать».</div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

function BookingCard({ b, dispatch }) {
    const d = DRIVERS.find((x) => x.id === b.driverId);
    const [message, setMessage] = useState("");
    const canCancel = b.status === "HELD" || b.status === "CONFIRMED";
    const timeToGoH = (new Date(d.departureAt).getTime() - Date.now()) / 3600e3;
    const policy = refundPolicy(timeToGoH);

    function handleCancel() {
        const refund = Math.round(b.escrowAmd * policy.refundRate);
        dispatch({ type: "booking:update", id: b.id, patch: { status: "CANCELED" } });
        dispatch({ type: "wallet:add", amount: refund });
    }

    function handleStart() {
        dispatch({ type: "booking:update", id: b.id, patch: { status: "IN_TRIP" } });
    }
    function handleComplete() {
        // escrow освобождён — просто помечаем COMPLETE
        dispatch({ type: "booking:update", id: b.id, patch: { status: "COMPLETED" } });
    }

    function sendMessage() {
        if (!message.trim()) return;
        const msg = { id: Math.random().toString(36).slice(2), text: message, at: nowIso(), from: "you" };
        dispatch({ type: "booking:update", id: b.id, patch: { messages: [...(b.messages||[]), msg] } });
        setMessage("");
    }

    return (
        <div className="bg-white border rounded-2xl p-4">
            <div className="flex items-start gap-3">
                <Avatar name={d.name} />
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <div className="font-semibold">{d.name}</div>
                        <Stars value={d.rating} />
                        {d.kyc && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1"><Shield className="w-3 h-3"/>KYC</span>}
                    </div>
                    <div className="text-xs text-neutral-500 mb-2">{d.vehicle.brand} {d.vehicle.model} • {d.vehicle.year}</div>
                    <div className="text-sm">Статус: <b>{statusLabel(b.status)}</b></div>
                    <div className="text-sm">Места: {b.seats.join(", ")}</div>
                    <div className="text-sm">Escrow: {fmtAmd(b.escrowAmd)}</div>
                    {canCancel && (
                        <div className="mt-2 bg-neutral-50 border rounded-xl p-2 text-xs">
                            <div className="mb-1">Отмена: сейчас → вы вернёте <b>{Math.round(policy.refundRate*100)}%</b> escrow ({fmtAmd(Math.round(b.escrowAmd*policy.refundRate))}).</div>
                            <div>Правило: {policy.label}</div>
                        </div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                        {b.status === "HELD" && <button onClick={() => dispatch({ type: "booking:update", id: b.id, patch: { status: "CONFIRMED" } })} className="px-3 py-1.5 rounded-xl bg-neutral-900 text-white text-sm">Подтвердить</button>}
                        {canCancel && <button onClick={handleCancel} className="px-3 py-1.5 rounded-xl bg-white border text-sm">Отменить</button>}
                        {b.status === "CONFIRMED" && <button onClick={handleStart} className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-sm">Начать поездку</button>}
                        {b.status === "IN_TRIP" && <button onClick={handleComplete} className="px-3 py-1.5 rounded-xl bg-emerald-700 text-white text-sm">Завершить поездку</button>}
                    </div>
                    <div className="mt-3 border-t pt-3">
                        <div className="text-sm mb-1 flex items-center gap-1"><MessageSquare className="w-4 h-4"/> Чат</div>
                        <div className="max-h-32 overflow-y-auto bg-neutral-50 rounded-xl p-2 text-sm space-y-1">
                            {(b.messages||[]).map((m) => (
                                <div key={m.id} className={`px-2 py-1 rounded-lg inline-block ${m.from==="you"?"bg-neutral-900 text-white ml-auto":"bg-white border"}`}>{m.text}</div>
                            ))}
                            {(b.messages||[]).length===0 && <div className="text-xs text-neutral-500">Сообщений пока нет.</div>}
                        </div>
                        <div className="mt-2 flex gap-2">
                            <input value={message} onChange={(e)=>setMessage(e.target.value)} className="flex-1 rounded-xl border px-3 py-2 text-sm" placeholder="Написать водителю…"/>
                            <button onClick={sendMessage} className="px-3 py-2 rounded-xl bg-neutral-900 text-white text-sm">Отправить</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function BookingModal({ match, onClose, db, dispatch, from, to }) {
    const d = match.driver;
    const availableSeats = SEAT_LAYOUTS[d.vehicle.seats].filter((s) => !d.occupiedSeats.includes(s));
    const [selectedSeats, setSelectedSeats] = useState([]);
    const [agree, setAgree] = useState(true);
    const totalAmd = match.priceAmd * selectedSeats.length;

    function toggleSeat(s) {
        setSelectedSeats((arr) => (arr.includes(s) ? arr.filter((x) => x !== s) : [...arr, s]));
    }

    function book() {
        if (!agree || selectedSeats.length === 0) return;
        if (db.walletAmd < totalAmd) return alert("Недостаточно средств на кошельке. Пополните сверху.");
        const booking = {
            id: "bk_" + Math.random().toString(36).slice(2),
            driverId: d.id,
            seats: selectedSeats,
            paxName: "Вы",
            status: "HELD", // escrow удержан
            escrowAmd: totalAmd,
            route: { from: from?.name, to: to?.name },
            createdAt: nowIso(),
            messages: [],
        };
        dispatch({ type: "booking:create", booking });
        dispatch({ type: "wallet:add", amount: -totalAmd });
        onClose();
    }

    return (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="relative bg-white rounded-2xl shadow-2xl border w-full max-w-2xl">
                <div className="p-4 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2"><Car className="w-4 h-4"/> Бронирование — {d.name}</div>
                    <button onClick={onClose} className="p-1 hover:bg-neutral-100 rounded-lg"><X className="w-4 h-4"/></button>
                </div>
                <div className="p-4 space-y-3">
                    <div className="text-sm text-neutral-600 flex items-center gap-2"><MapPin className="w-4 h-4"/>{from?.name} → {to?.name}</div>
                    <div className="text-sm text-neutral-600 flex items-center gap-2"><Clock className="w-4 h-4"/>{fmtDateTime(d.departureAt)}</div>
                    <div className="grid md:grid-cols-2 gap-3">
                        <SeatChooser seats={d.vehicle.seats} occupied={d.occupiedSeats} selected={selectedSeats} onToggle={toggleSeat} />
                        <div className="bg-neutral-50 rounded-xl p-3 border">
                            <div className="text-sm">Цена за место: <b>{fmtAmd(match.priceAmd)}</b></div>
                            <div className="text-sm">Выбрано: <b>{selectedSeats.length}</b></div>
                            <div className="text-lg font-bold">Итого: {fmtAmd(totalAmd)}</div>
                            <div className="text-xs text-neutral-500">Кошелёк: {fmtAmd(db.walletAmd)}</div>
                            <div className="mt-3 text-xs text-neutral-500 bg-white border rounded-xl p-2">
                                <div className="mb-1 font-medium">Правила отмены</div>
                                <div>≥12ч — возврат 100%</div>
                                <div>3–12ч — возврат 50%</div>
                                <div>≤3ч — возврат 0%</div>
                            </div>
                            <label className="mt-3 flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> Я согласен(а) с условиями
                            </label>
                            <button onClick={book} className="mt-3 w-full py-2 rounded-xl bg-neutral-900 text-white disabled:opacity-50" disabled={!agree || selectedSeats.length===0}>Перейти к оплате (escrow)</button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

/*******************
 * 5) SUB-COMPONENTS *
 *******************/

function Labeled({ label, children }) {
    return (
        <label className="text-sm">
            <div className="mb-1 text-neutral-600 flex items-center gap-1">{label}</div>
            {children}
        </label>
    );
}

function Toggle({ label, checked, onChange }) {
    return (
        <label className="flex items-center gap-2 select-none text-sm">
            <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
            {label}
        </label>
    );
}

function Stars({ value }) {
    const stars = Math.round(value);
    return (
        <div className="flex items-center gap-0.5 text-amber-500">
            {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`w-3.5 h-3.5 ${i < stars ? "fill-amber-400" : ""}`} />
            ))}
            <span className="ml-1 text-xs text-neutral-500">{value.toFixed(2)}</span>
        </div>
    );
}

function Avatar({ name }) {
    const initials = name
        .split(" ")
        .map((x) => x[0])
        .slice(0, 2)
        .join("");
    return (
        <div className="w-12 h-12 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-semibold">
            {initials}
        </div>
    );
}

function SeatMap({ seats = 4, occupied = [] }) {
    const layout = SEAT_LAYOUTS[seats] || SEAT_LAYOUTS[4];
    return (
        <div className="grid grid-cols-4 gap-2">
            {layout.map((s) => (
                <div key={s} className={`rounded-xl border p-2 text-center text-xs ${occupied.includes(s) ? "bg-rose-100 border-rose-300" : "bg-emerald-50 border-emerald-300"}`}>{seatLabel(s)}</div>
            ))}
        </div>
    );
}

function SeatChooser({ seats = 4, occupied = [], selected = [], onToggle }) {
    const layout = SEAT_LAYOUTS[seats] || SEAT_LAYOUTS[4];
    return (
        <div>
            <div className="text-sm text-neutral-600 mb-2">Выберите места</div>
            <div className="grid grid-cols-3 gap-2">
                {layout.map((s) => {
                    const occ = occupied.includes(s);
                    const sel = selected.includes(s);
                    return (
                        <button key={s} disabled={occ} onClick={() => onToggle(s)} className={`rounded-xl border px-3 py-2 text-sm ${occ?"opacity-50 cursor-not-allowed bg-neutral-50":"hover:bg-neutral-50"} ${sel?"ring-2 ring-neutral-900":""}`}>
                            {seatLabel(s)}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function GridSVG({ width, height }) {
    const step = 40;
    const lines = [];
    for (let x = step; x < width; x += step) {
        lines.push(<line key={`v${x}`} x1={x} y1={0} x2={x} y2={height} stroke="#e5e7eb" strokeWidth={1} />);
    }
    for (let y = step; y < height; y += step) {
        lines.push(<line key={`h${y}`} x1={0} y1={y} x2={width} y2={y} stroke="#e5e7eb" strokeWidth={1} />);
    }
    return <g>{lines}</g>;
}

function ChevronDownIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>; }

function seatLabel(s) {
    const map = {
        front: "Пассажир спереди",
        "rear-left": "Задн. лев.",
        "rear-middle": "Задн. центр",
        "rear-right": "Задн. прав.",
        "extra-1": "Доп. 1",
        "extra-2": "Доп. 2",
    };
    return map[s] || s;
}

function statusLabel(s) {
    return (
        {
            HELD: "Escrow удержан",
            CONFIRMED: "Подтверждено",
            IN_TRIP: "В пути",
            COMPLETED: "Завершено",
            CANCELED: "Отменено",
        }[s] || s
    );
}

/***********************
 * 6) BUSINESS LOGIC    *
 ***********************/

function resolvePlace(q) {
    if (!q) return null;
    const norm = q.trim().toLowerCase();
    const hit = Object.values(PLACES).find((p) => p.name.toLowerCase().includes(norm));
    return hit || null;
}

function fmtDateTime(d) {
    return new Date(d).toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" });
}

function dynamicPrice(driver, whenTs, flags) {
    const base = driver.priceBaseAmd;
    if (!flags.dynamicPricing) return { price: base, mult: 1 };
    const h = new Date(whenTs).getHours();
    // Пиковые часы: 7–9, 17–20 → повышаем, ночи — понижаем
    let mult = 1;
    if (h >= 7 && h <= 9) mult = 1.25;
    else if (h >= 17 && h <= 20) mult = 1.35;
    else if (h <= 6 || h >= 22) mult = 0.9;
    // Дополнительно учтём заполненность
    const occ = driver.occupiedSeats.length;
    const cap = driver.vehicle.seats;
    const load = occ / cap;
    mult *= 1 + load * 0.2; // чем больше занято, тем дороже
    mult = Math.min(mult, flags.surgeMultiplierMax);
    const price = Math.round(base * mult);
    return { price, mult };
}

function buildDemandData(from, to, flags) {
    const points = [];
    for (let h = 0; h < 24; h++) {
        const peak = (h>=7 && h<=9) || (h>=17 && h<=20) ? 1 : 0;
        const demand = Math.round(30 + 50*peak + Math.max(0, 20 - Math.abs(12 - h)) );
        let priceMult = 1;
        if (flags.dynamicPricing) {
            priceMult = 1 + (peak?0.35:0) + (Math.sin(h/24*Math.PI*2)*0.1);
            priceMult = clamp(priceMult, 0.8, flags.surgeMultiplierMax);
        }
        points.push({ h, demand, priceMult: +priceMult.toFixed(2) });
    }
    return points;
}

function refundPolicy(timeToGoH) {
    if (timeToGoH >= 12) return { refundRate: 1, label: "≥12ч: возврат 100%" };
    if (timeToGoH >= 3) return { refundRate: 0.5, label: "3–12ч: возврат 50%" };
    return { refundRate: 0, label: "≤3ч: возврат 0%" };
}

/***********************
 * 7) NOTES / EXTENSIONS *
 ***********************
 * Возможные расширения (для твоего бэкенда на Laravel + PostgreSQL/PostGIS):
 *  - Таблицы trips/bookings/payments с реальным PSP (Idram/ArCa/ApplePay/GP)
 *  - Geo-индексация (H3/Geohash) по точкам A/B и точкам полилиний водителей
 *  - Реальный детур-расчёт по дорожному графу (OSRM/GraphHopper) или PostGIS ST_LineLocatePoint/Length
 *  - WebSockets (Laravel Reverb) для live-чата и live-tracking
 *  - KYC провайдер (селфи + ID), хранить только ссылки на токены
 *  - Recurring trips + auto-accept «избранных» пассажиров
 *  - Disputes/модерация/отзывы + антиспам/ML
 */
