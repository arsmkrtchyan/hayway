
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, router, usePage } from "@inertiajs/react";
import dayjs from "dayjs";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search,
    MapPin,
    Calendar,
    Users as UsersIcon,
    Car,
    ArrowLeftRight,
    ChevronRight,
    ShieldCheck,
    Star,
    Clock,
    Filter,
    ChevronDown,
    UserRound,
    Map as MapIcon,
} from "lucide-react";
import ClientLayout from "@/Layouts/ClientLayout";

const NOMI_LANG = "hy,ru,en";
const WHEN_OPTIONS = [
    { key: "", label: "Ցանկացած օր" },
    { key: "today", label: "Այսօր" },
    { key: "tomorrow", label: "Վաղը" },
];
const TIME_BUCKETS = [
    { id: "before6", label: "Մինչև 06:00", from: 0, to: 6 },
    { id: "6-12", label: "06:00 – 12:00", from: 6, to: 12 },
    { id: "12-18", label: "12:00 – 18:00", from: 12, to: 18 },
    { id: "after18", label: "18:00-ից հետո", from: 18, to: 24 },
];
const SORT_OPTIONS = [
    { id: "earliest", label: "Ամենավաղ մեկնարկ" },
    { id: "cheapest", label: "Ամենաէժան ուղևորություն" },
    { id: "rating", label: "Բարձր վարկանիշ" },
    { id: "shortest", label: "Ամենակարճ երթուղի" },
];
const CATEGORY_TABS = [
    { id: "all", label: "Բոլորը" },
    { id: "rideshare", label: "Համատեղ" },
    { id: "company", label: "Ընկերություն" },
];

function formatAMD(value) {
    try {
        return new Intl.NumberFormat("hy-AM").format(value || 0);
    } catch {
        return value;
    }
}

function formatTime(iso) {
    if (!iso) return "—";
    try {
        return dayjs(iso).format("HH:mm");
    } catch {
        return "—";
    }
}

function formatDuration(startIso, endIso) {
    if (!startIso || !endIso) return null;
    try {
        const start = dayjs(startIso);
        const end = dayjs(endIso);
        const minutes = Math.max(0, end.diff(start, "minute"));
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
        if (h === 0) return `${m} րոպե`;
        if (m === 0) return `${h} ժ`;
        return `${h} ժ ${m} րոպե`;
    } catch {
        return null;
    }
}

function labelByType(key) {
    switch ((key || "").toUpperCase()) {
        case "AB":
            return "Ֆիքսված A→B";
        case "PAX_PAX":
            return "Հավաքական ուղևոր";
        case "PAX_B":
            return "Ուղևոր → կայան";
        case "A_PAX":
            return "Կայան → ուղևոր";
        default:
            return "Ուղևորություն";
    }
}

function zoneLabel(code) {
    return code === "FREE"
        ? "անվճար գոտի"
        : code === "PAID"
            ? "վճարովի գոտի"
            : code === "OUT"
                ? "դուրս գոտուց"
                : null;
}

async function reverseGeocodeNominatim(lng, lat) {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&accept-language=${encodeURIComponent(NOMI_LANG)}&lat=${lat}&lon=${lng}&addressdetails=1`;
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (!res.ok) return "";
        const data = await res.json();
        const addr = data?.address || {};
        const parts = [addr.city, addr.town, addr.village, addr.road, addr.country].filter(Boolean);
        return parts.join(", ") || data?.display_name || "";
    } catch {
        return "";
    }
}

let maplibrePromise = null;
function ensureMapLibre() {
    if (typeof window === "undefined") return Promise.resolve(null);
    if (window.maplibregl) return Promise.resolve(window.maplibregl);
    if (maplibrePromise) return maplibrePromise;

    maplibrePromise = new Promise((resolve, reject) => {
        const cssId = "maplibre-gl-css";
        if (!document.getElementById(cssId)) {
            const link = document.createElement("link");
            link.id = cssId;
            link.rel = "stylesheet";
            link.href = "https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css";
            document.head.appendChild(link);
        }
        const script = document.createElement("script");
        script.src = "https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js";
        script.async = true;
        script.onload = () => resolve(window.maplibregl);
        script.onerror = () => reject(new Error("Cannot load maplibre"));
        document.body.appendChild(script);
    });

    return maplibrePromise;
}

export default function Explore() {
    const { trips, filters, amenityFilters } = usePage().props;
    const sourceTrips = useMemo(() => Array.isArray(trips?.data) ? trips.data : [], [trips]);

    const [search, setSearch] = useState(() => ({
        from: filters?.from || "",
        to: filters?.to || "",
        date: filters?.date_from || filters?.date || dayjs().format("YYYY-MM-DD"),
        passengers: Number(filters?.seats) || 1,
        fromLat: filters?.from_lat ? Number(filters.from_lat) : null,
        fromLng: filters?.from_lng ? Number(filters.from_lng) : null,
        toLat: filters?.to_lat ? Number(filters.to_lat) : null,
        toLng: filters?.to_lng ? Number(filters.to_lng) : null,
    }));

    const initialAmenities = useMemo(() => (filters?.amenities || "")
        .split(",")
        .map((id) => parseInt(id, 10))
        .filter(Number.isFinite), [filters?.amenities]);

    useEffect(() => {
        setSearch({
            from: filters?.from || "",
            to: filters?.to || "",
            date: filters?.date_from || filters?.date || dayjs().format("YYYY-MM-DD"),
            passengers: Number(filters?.seats) || 1,
            fromLat: filters?.from_lat ? Number(filters.from_lat) : null,
            fromLng: filters?.from_lng ? Number(filters.from_lng) : null,
            toLat: filters?.to_lat ? Number(filters.to_lat) : null,
            toLng: filters?.to_lng ? Number(filters.to_lng) : null,
        });
    }, [filters]);

    const [category, setCategory] = useState("all");
    const [sortOption, setSortOption] = useState("earliest");
    const [timeFilters, setTimeFilters] = useState(() => new Set());
    const [trustOnly, setTrustOnly] = useState(false);
    const [amenityIds, setAmenityIds] = useState(new Set(initialAmenities));
    const [mapTarget, setMapTarget] = useState(null);
// [ADD] Order modal state
    const [orderOpen, setOrderOpen] = useState(false);
    const [orderDraft, setOrderDraft] = useState(null);
    const [orderSuccess, setOrderSuccess] = useState(false);
    const [orderError, setOrderError] = useState(null);

    const csrf = () => document.querySelector('meta[name="csrf-token"]')?.content || '';

    const buildDefaultOrderFromSearch = () => {
        const date = search.date || dayjs().format("YYYY-MM-DD");
        return {
            // адреса и координаты из текущего поиска
            from_addr: search.from || "",
            to_addr:   search.to   || "",
            from_lat:  search.fromLat,
            from_lng:  search.fromLng,
            to_lat:    search.toLat,
            to_lng:    search.toLng,

            // окно по дате: весь день
            when_from: dayjs(date).startOf('day').toISOString(),
            when_to:   dayjs(date).endOf('day').toISOString(),

            seats: search.passengers || 1,
            payment: null,                 // пользователь может выбрать в модалке
            desired_price_amd: null        // опционально
        };
    };

    const openOrderModal = () => {
        setOrderDraft(buildDefaultOrderFromSearch());
        setOrderSuccess(false);
        setOrderError(null);
        setOrderOpen(true);
    };

    const submitOrder = async (draft) => {
        setOrderError(null);
        try {
            const res = await fetch('api/orderoffer/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrf(),
                    'Accept': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify(draft),
            });
            const data = await res.json();
            if (!res.ok || data?.ok !== true) throw new Error(data?.message || 'Create failed');

            // Show success message
            setOrderSuccess(true);

            // Close modal after 1.5 seconds
            setTimeout(() => {
                setOrderOpen(false);
                setOrderSuccess(false);
            }, 1500);
        } catch (e) {
            setOrderError(e?.message || 'Ошибка создания заявки');
        }
    };




    useEffect(() => {
        setAmenityIds(new Set(initialAmenities));
    }, [initialAmenities]);

    const handleSwapDirection = () => {
        setSearch((prev) => ({
            ...prev,
            from: prev.to,
            to: prev.from,
            fromLat: prev.toLat,
            fromLng: prev.toLng,
            toLat: prev.fromLat,
            toLng: prev.fromLng,
        }));
    };

    const handlePassengerChange = (delta) => {
        setSearch((prev) => {
            const next = Math.min(6, Math.max(1, (prev.passengers || 1) + delta));
            return { ...prev, passengers: next };
        });
    };

    const toggleTimeBucket = (bucket) => {
        setTimeFilters((prev) => {
            const next = new Set(prev);
            next.has(bucket) ? next.delete(bucket) : next.add(bucket);
            return next;
        });
    };

    const toggleAmenity = (id) => {
        setAmenityIds((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const payload = useMemo(() => {
        const p = {
            from: search.from,
            to: search.to,
            seats: search.passengers,
        };
        if (search.date) {
            p.date_from = search.date;
            p.date_to = search.date;
        }
        if (search.fromLat !== null && search.fromLng !== null) {
            p.from_lat = search.fromLat;
            p.from_lng = search.fromLng;
        }
        if (search.toLat !== null && search.toLng !== null) {
            p.to_lat = search.toLat;
            p.to_lng = search.toLng;
        }
        if (amenityIds.size) {
            p.amenities = Array.from(amenityIds).join(",");
        }
        return p;
    }, [search, amenityIds]);

    const appliedFiltersCount = useMemo(() => {
        let count = 0;
        if (search.from) count += 1;
        if (search.to) count += 1;
        if (search.date) count += 1;
        if (search.passengers > 1) count += 1;
        if (timeFilters.size) count += 1;
        if (trustOnly) count += 1;
        if (amenityIds.size) count += 1;
        return count;
    }, [search, timeFilters.size, trustOnly, amenityIds.size]);

    const categoryCounts = useMemo(() => {
        const rideshare = sourceTrips.filter((t) => !t.company).length;
        const companyCount = sourceTrips.filter((t) => !!t.company).length;
        return {
            all: sourceTrips.length,
            rideshare,
            company: companyCount,
        };
    }, [sourceTrips]);

    const filteredTrips = useMemo(() => {
        let list = [...sourceTrips];
        if (category === "rideshare") list = list.filter((t) => !t.company);
        if (category === "company") list = list.filter((t) => !!t.company);

        if (timeFilters.size) {
            list = list.filter((trip) => {
                const dep = trip?.departure_at ? dayjs(trip.departure_at) : null;
                if (!dep) return false;
                const hour = dep.hour();
                for (const bucketId of timeFilters) {
                    const bucket = TIME_BUCKETS.find((b) => b.id === bucketId);
                    if (!bucket) continue;
                    if (hour >= bucket.from && hour < bucket.to) return true;
                }
                return false;
            });
        }

        if (trustOnly) {
            list = list.filter((trip) => {
                const rating = trip?.driver?.rating || trip?.company?.rating;
                return Number(rating) >= 4.5;
            });
        }

        if (amenityIds.size) {
            list = list.filter((trip) => {
                const ids = (trip.amenities || []).map((a) => a.id);
                return Array.from(amenityIds).every((id) => ids.includes(id));
            });
        }

        switch (sortOption) {
            case "cheapest":
                list.sort((a, b) => (a.price_amd || Infinity) - (b.price_amd || Infinity));
                break;
            case "rating":
                list.sort((a, b) => ((b.driver?.rating || b.company?.rating || 0) - (a.driver?.rating || a.company?.rating || 0)));
                break;
            case "shortest":
                list.sort((a, b) => {
                    const da = a.departure_at && a.arrival_at ? dayjs(a.arrival_at).diff(dayjs(a.departure_at), "minute") : Infinity;
                    const db = b.departure_at && b.arrival_at ? dayjs(b.arrival_at).diff(dayjs(b.departure_at), "minute") : Infinity;
                    return da - db;
                });
                break;
            case "earliest":
            default:
                list.sort((a, b) => dayjs(a.departure_at).valueOf() - dayjs(b.departure_at).valueOf());
                break;
        }

        return list;
    }, [sourceTrips, category, timeFilters, trustOnly, amenityIds, sortOption]);

    const handleSubmit = (e) => {
        e.preventDefault();
        router.get("/trips", payload, { preserveScroll: true, preserveState: true });
    };

    const handleOpenMap = (side) => {
        setMapTarget({
            side,
            initial: side === "from"
                ? { lat: search.fromLat, lng: search.fromLng, label: search.from }
                : { lat: search.toLat, lng: search.toLng, label: search.to },
        });
    };

    const handleMapSelect = async (side, point) => {
        let label = point.addr || await reverseGeocodeNominatim(point.lng, point.lat);

        setSearch((prev) => ({
            ...prev,
            [side]: label || prev[side],
            [`${side}Lat`]: point.lat,
            [`${side}Lng`]: point.lng,
        }));

        // [ADD] если открыт OrderModal — обновим и его черновик
        setOrderDraft((prev) => prev ? {
            ...prev,
            [`${side}_addr`]: label || prev[`${side}_addr`],
            [`${side}_lat`]: point.lat,
            [`${side}_lng`]: point.lng,
        } : prev);

        setMapTarget(null);
    };


    return (
        <ClientLayout current="trips">
            <div className="min-h-screen bg-slate-50">
                <div className="border-b border-slate-200 bg-white/80 backdrop-blur">
                    <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 pb-6 pt-4">
                        <HeroSearchBar
                            search={search}
                            onSubmit={handleSubmit}
                            onChange={setSearch}
                            onSwap={handleSwapDirection}
                            onPassengersChange={handlePassengerChange}
                            onOpenMap={handleOpenMap}
                        />
                        <CategoryTabs
                            category={category}
                            onChange={setCategory}
                            counts={categoryCounts}
                        />
                    </div>
                </div>

                <main className="mx-auto max-w-6xl px-4 pb-10 pt-6">
                    <section className="flex flex-col gap-6 lg:flex-row">
                        <FilterSidebar
                            sortOption={sortOption}
                            onSortChange={setSortOption}
                            timeFilters={timeFilters}
                            toggleTime={toggleTimeBucket}
                            trustOnly={trustOnly}
                            setTrustOnly={setTrustOnly}
                            amenityGroups={amenityFilters || []}
                            amenityIds={amenityIds}
                            onToggleAmenity={toggleAmenity}
                        />

                        <div className="min-h-[500px] flex-1 rounded-3xl bg-white p-5 shadow-xl">
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900">
                                        Ուղևորություններ՝ {filteredTrips.length}
                                    </h2>
                                    <p className="text-sm text-slate-500">
                                        {appliedFiltersCount > 0
                                            ? `Ակտիվ ֆիլտրեր՝ ${appliedFiltersCount}`
                                            : "Օգտագործեք ֆիլտրերը՝ գտնելու լավագույն ուղևորությունը"}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setTimeFilters(new Set());
                                        setTrustOnly(false);
                                        setAmenityIds(new Set(initialAmenities));
                                        setSortOption("earliest");
                                        setCategory("all");
                                    }}
                                    className="text-sm font-medium text-emerald-600 hover:text-emerald-500"
                                >
                                    Մաքրել բոլոր ֆիլտրերը
                                </button>
                            </div>

                            {filteredTrips.length === 0 ? (
                                <EmptyState onCreate={() => openOrderModal()} />
                            ) : (
                                <div className="space-y-4">
                                    {filteredTrips.map((trip) => (<TripCard key={trip.id} trip={trip} />))}
                                </div>
                            )}

                        </div>
                    </section>
                </main>
            </div>

            <AnimatePresence>
                {mapTarget && (
                    <MapPicker
                        side={mapTarget.side}
                        initial={mapTarget.initial}
                        onSelect={handleMapSelect}
                        onClose={() => setMapTarget(null)}
                    />
                )}
                {orderOpen && (
                    <OrderModal
                        draft={orderDraft}
                        onChange={setOrderDraft}
                        onClose={() => setOrderOpen(false)}
                        onSubmit={() => submitOrder(orderDraft)}
                        onPick={(side)=> setMapTarget({ side, initial: side==='from'
                                ? { lat: orderDraft?.from_lat, lng: orderDraft?.from_lng, label: orderDraft?.from_addr }
                                : { lat: orderDraft?.to_lat,   lng: orderDraft?.to_lng,   label: orderDraft?.to_addr }
                        })}
                        success={orderSuccess}
                        error={orderError}
                    />
                )}
            </AnimatePresence>
        </ClientLayout>
    );
}
function OrderModal({ draft, onChange, onClose, onSubmit, onPick, success, error }) {
    if (!draft) return null;
    const update = (p) => onChange((prev) => ({ ...prev, ...p }));

    return createPortal(
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] grid place-items-center bg-black/40 p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                    <div className="text-sm font-semibold text-slate-900">Ստեղծել հիշեցում / Order</div>
                    <button onClick={onClose} className="rounded-full border border-slate-200 p-2 text-slate-500">×</button>
                </div>

                {/* Success/Error Messages */}
                {success && (
                    <div className="mx-4 mt-4 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        ✓ Հաջողությամբ ստեղծվեց! Մոդալը փակվում է...
                    </div>
                )}
                {error && (
                    <div className="mx-4 mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
                        ✗ {error}
                    </div>
                )}

                <div className="grid gap-4 p-4">
                    {/* FROM */}
                    <div className="grid gap-2">
                        <label className="text-xs font-semibold text-slate-600">Մեկնարկ (from)</label>
                        <div className="flex gap-2">
                            <input
                                value={draft.from_addr || ''} onChange={(e)=>update({from_addr:e.target.value})}
                                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                placeholder="Մեկնարկային հասցե"
                            />
                            <button type="button" onClick={()=>onPick('from')}
                                    className="rounded-xl border border-slate-200 px-3 text-sm">Քարտեզ</button>
                        </div>
                        {(draft.from_lat !== null || draft.from_lng !== null) && (
                            <div className="text-xs text-slate-500">
                                Կոորդինատներ: {draft.from_lat?.toFixed(5) || '—'}, {draft.from_lng?.toFixed(5) || '—'}
                            </div>
                        )}
                    </div>

                    {/* TO */}
                    <div className="grid gap-2">
                        <label className="text-xs font-semibold text-slate-600">Վերջակետ (to)</label>
                        <div className="flex gap-2">
                            <input
                                value={draft.to_addr || ''} onChange={(e)=>update({to_addr:e.target.value})}
                                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                placeholder="Վերջակետ"
                            />
                            <button type="button" onClick={()=>onPick('to')}
                                    className="rounded-xl border border-slate-200 px-3 text-sm">Քարտեզ</button>
                        </div>
                        {(draft.to_lat !== null || draft.to_lng !== null) && (
                            <div className="text-xs text-slate-500">
                                Կոորդինատներ: {draft.to_lat?.toFixed(5) || '—'}, {draft.to_lng?.toFixed(5) || '—'}
                            </div>
                        )}
                    </div>

                    {/* TIME WINDOW */}
                    <div className="grid gap-2">
                        <label className="text-xs font-semibold text-slate-600">Ժամային պատուհան</label>
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                type="datetime-local"
                                value={draft.when_from ? dayjs(draft.when_from).format('YYYY-MM-DDTHH:mm') : ''}
                                onChange={(e)=>update({when_from: e.target.value ? dayjs(e.target.value).toISOString() : null})}
                                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                            />
                            <input
                                type="datetime-local"
                                value={draft.when_to ? dayjs(draft.when_to).format('YYYY-MM-DDTHH:mm') : ''}
                                onChange={(e)=>update({when_to: e.target.value ? dayjs(e.target.value).toISOString() : null})}
                                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                            />
                        </div>
                    </div>

                    {/* SEATS | PAYMENT | PRICE */}
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">Seats</label>
                            <input type="number" min="1" max="6"
                                   value={draft.seats ?? 1} onChange={(e)=>update({seats: Math.min(6, Math.max(1, Number(e.target.value||1)))})}
                                   className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">Payment</label>
                            <select
                                value={draft.payment || ''} onChange={(e)=>update({payment: e.target.value || null})}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                            >
                                <option value="">—</option>
                                <option value="cash">cash</option>
                                <option value="card">card</option>
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-600">Желаемая цена, AMD</label>
                            <input type="number" min="0"
                                   value={draft.desired_price_amd ?? ''} onChange={(e)=>update({desired_price_amd: e.target.value===''?null:Number(e.target.value)})}
                                   className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3">
                    <button onClick={onClose} disabled={success} className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed">Չեղարկել</button>
                    <button onClick={onSubmit} disabled={success} className="rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow disabled:opacity-50 disabled:cursor-not-allowed">Ստեղծել order</button>
                </div>
            </motion.div>
        </motion.div>,
        document.body
    );
}

function HeroSearchBar({ search, onChange, onSubmit, onSwap, onPassengersChange, onOpenMap }) {
    const update = (payload) => onChange((prev) => ({ ...prev, ...payload }));

    return (
        <form
            onSubmit={onSubmit}
            className="flex flex-wrap items-end gap-3 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-lg"
        >
            <div className="flex flex-1 items-center gap-3">
                <div className="flex flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-emerald-500">
                    <MapPin className="h-4 w-4 text-emerald-600" />
                    <input
                        type="text"
                        className="w-full border-none bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
                        placeholder="Մեկնարկային կետ"
                        value={search.from}
                        onChange={(e) => update({ from: e.target.value, fromLat: null, fromLng: null })}
                    />
                    <button
                        type="button"
                        onClick={() => onOpenMap?.("from")}
                        className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-emerald-300 hover:text-emerald-600"
                        aria-label="Ընտրել քարտեզից"
                    >
                        <MapIcon className="h-4 w-4" />
                    </button>
                </div>
                <button
                    type="button"
                    onClick={onSwap}
                    className="hidden h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-emerald-300 hover:text-emerald-600 md:flex"
                    aria-label="Փոխանակել կետերը"
                >
                    <ArrowLeftRight className="h-4 w-4" />
                </button>
                <div className="flex flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-emerald-500">
                    <MapPin className="h-4 w-4 text-emerald-600" />
                    <input
                        type="text"
                        className="w-full border-none bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
                        placeholder="Վերջնակետ"
                        value={search.to}
                        onChange={(e) => update({ to: e.target.value, toLat: null, toLng: null })}
                    />
                    <button
                        type="button"
                        onClick={() => onOpenMap?.("to")}
                        className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-emerald-300 hover:text-emerald-600"
                        aria-label="Ընտրել քարտեզից"
                    >
                        <MapIcon className="h-4 w-4" />
                    </button>
                </div>
            </div>
            <div className="flex flex-wrap items-end gap-3">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <Calendar className="h-4 w-4 text-emerald-600" />
                    <input
                        type="date"
                        value={search.date}
                        onChange={(e) => update({ date: e.target.value })}
                        className="border-none bg-transparent text-sm text-slate-900 focus:outline-none"
                    />
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <UsersIcon className="h-4 w-4 text-emerald-600" />
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => onPassengersChange(-1)}
                            className="h-6 w-6 rounded-full border border-slate-300 text-slate-600 hover:border-emerald-300 hover:text-emerald-600"
                            aria-label="Նվազեցնել ուղևորների քանակը"
                        >
                            –
                        </button>
                        <span className="w-8 text-center text-sm font-semibold text-slate-900">{search.passengers}</span>
                        <button
                            type="button"
                            onClick={() => onPassengersChange(1)}
                            className="h-6 w-6 rounded-full border border-slate-300 text-slate-600 hover:border-emerald-300 hover:text-emerald-600"
                            aria-label="Ավելացնել ուղևորների քանակը"
                        >
                            +
                        </button>
                    </div>
                </div>
                <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow hover:brightness-95"
                >
                    <Search className="h-4 w-4" />
                    Որոնել
                </button>
            </div>
        </form>
    );
}

function CategoryTabs({ category, onChange, counts }) {
    return (
        <div className="flex flex-wrap gap-2 rounded-3xl border border-slate-200 bg-white px-3 py-2 shadow-lg">
            {CATEGORY_TABS.map((tab) => (
                <button
                    key={tab.id}
                    type="button"
                    onClick={() => onChange(tab.id)}
                    className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition ${
                        category === tab.id
                            ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow"
                            : "text-slate-600 hover:text-emerald-600"
                    }`}
                >
                    {tab.label}
                    <span className="text-xs font-semibold">
                        {(counts?.[tab.id] ?? 0).toLocaleString("hy-AM")}
                    </span>
                </button>
            ))}
        </div>
    );
}

function FilterSidebar({
                           sortOption,
                           onSortChange,
                           timeFilters,
                           toggleTime,
                           trustOnly,
                           setTrustOnly,
                           amenityGroups,
                           amenityIds,
                           onToggleAmenity,
                       }) {
    return (
        <aside className="space-y-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-xl lg:w-72">
            <div>
                <div className="mb-3 flex items-center justify-between text-sm font-semibold text-slate-900">
                    <div className="inline-flex items-center gap-2">
                        <Filter className="h-4 w-4 text-emerald-600" />
                        Դասակարգում
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                </div>
                <div className="space-y-2">
                    {SORT_OPTIONS.map((opt) => (
                        <label key={opt.id} className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                            <input
                                type="radio"
                                name="sort"
                                value={opt.id}
                                checked={sortOption === opt.id}
                                onChange={() => onSortChange(opt.id)}
                                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                            />
                            {opt.label}
                        </label>
                    ))}
                </div>
            </div>

            <div>
                <p className="mb-3 text-sm font-semibold text-slate-900">Մեկնելու ժամ</p>
                <div className="space-y-2">
                    {TIME_BUCKETS.map((bucket) => (
                        <label
                            key={bucket.id}
                            className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:border-emerald-300"
                        >
                            <span className="inline-flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={timeFilters.has(bucket.id)}
                                    onChange={() => toggleTime(bucket.id)}
                                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                                />
                                {bucket.label}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            <div>
                <p className="mb-3 text-sm font-semibold text-slate-900">Վստահություն</p>
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:border-emerald-300">
                    <input
                        type="checkbox"
                        checked={trustOnly}
                        onChange={(e) => setTrustOnly(e.target.checked)}
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                    />
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    Վարորդի վարկանիշ ≥ 4.5
                </label>
            </div>

            {Array.isArray(amenityGroups) && amenityGroups.length > 0 && (
                <div>
                    <p className="mb-3 text-sm font-semibold text-slate-900">Հարմարություններ</p>
                    <div className="space-y-3">
                        {amenityGroups.map((group) => (
                            <div key={group.id} className="rounded-xl border border-slate-200 p-3">
                                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    {group.name}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {(group.amenities || []).map((amenity) => (
                                        <label
                                            key={amenity.id}
                                            className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition ${
                                                amenityIds.has(amenity.id)
                                                    ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                                                    : "border-slate-200 text-slate-500 hover:border-emerald-200"
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                className="hidden"
                                                checked={amenityIds.has(amenity.id)}
                                                onChange={() => onToggleAmenity(amenity.id)}
                                            />
                                            {amenity.name}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </aside>
    );
}

function TripCard({ trip }) {
    const fromTime = formatTime(trip.departure_at);
    const etaSec = Number.isFinite(Number(trip.eta_sec)) ? Number(trip.eta_sec) : null;
    let arrivalIso = trip.arrival_at;
    if (!arrivalIso && trip.departure_at && etaSec !== null) {
        arrivalIso = dayjs(trip.departure_at).add(etaSec, "second").toISOString();
    }
    const toTime = formatTime(arrivalIso);
    const duration = formatDuration(trip.departure_at, arrivalIso);
    const seatsTaken = trip.seats_taken || 0;
    const seatsTotal = trip.seats_total || 0;
    const freeSeats = Math.max(0, seatsTotal - seatsTaken);
    const company = !!trip.company;
    const driverName = trip.driver?.name || "Վարորդ";
    const rating = trip.driver?.rating || trip.company?.rating;
    const match = trip.match || {};
    const addon = match.addon || {};
    const basePrice = Number(trip.price_amd) || 0;
    const addonFrom = Number(addon.from_amd) || 0;
    const addonTo = Number(addon.to_amd) || 0;
    const totalHint = Number(addon.total_amd);
    const addonTotalRaw = Number.isFinite(totalHint) ? totalHint : addonFrom + addonTo;
    const addonTotal = Math.max(0, addonTotalRaw);
    const effectivePrice = basePrice + addonTotal;
    const startZoneLabel = zoneLabel(match.start_zone);
    const endZoneLabel = zoneLabel(match.end_zone);
    const operatorName = company ? (trip.company?.name || "Ընկերություն") : driverName;

    return (
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                        <Clock className="h-4 w-4 text-emerald-600" />
                        <span>
                            <strong className="text-slate-900">{fromTime}</strong>
                            <ChevronRight className="mx-1 inline h-4 w-4 text-slate-400" />
                            <strong className="text-slate-900">{toTime}</strong>
                            {duration && <span className="ml-2 text-xs text-slate-500">{duration}</span>}
                        </span>
                    </div>
                    <div className="text-lg font-semibold text-slate-900">
                        {trip.from_addr || "Մեկնարկ"} → {trip.to_addr || "Վերջակետ"}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                        <span className="inline-flex items-center gap-1">
                            <Car className="h-4 w-4 text-emerald-600" />
                            {company ? (trip.company?.name || "Ընկերություն") : labelByType(trip.type_key)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <UsersIcon className="h-4 w-4 text-emerald-600" />
                            Ազատ՝ {freeSeats} / {seatsTotal}
                        </span>
                        {rating && (
                            <span className="inline-flex items-center gap-1 text-emerald-600">
                                <Star className="h-4 w-4" /> {Number(rating).toFixed(1)}
                            </span>
                        )}
                    </div>
                    {(startZoneLabel || endZoneLabel || Number(addon.total_amd) > 0) && (
                        <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                            {startZoneLabel && (
                                <Badge>
                                    Մեկնարկ՝ {startZoneLabel}
                                    {Number(addon.from_amd) > 0 && ` (+${formatAMD(addon.from_amd)} AMD)`}
                                </Badge>
                            )}
                            {endZoneLabel && (
                                <Badge>
                                    Վերջակետ՝ {endZoneLabel}
                                    {Number(addon.to_amd) > 0 && ` (+${formatAMD(addon.to_amd)} AMD)`}
                                </Badge>
                            )}
                            {Number(addon.total_amd) > 0 && (
                                <Badge>Ընդհանուր հավելավճար՝ {formatAMD(addon.total_amd)} AMD</Badge>
                            )}
                        </div>
                    )}
                </div>
                <div className="text-right">
                    <div className="text-2xl font-semibold text-emerald-700">
                        {formatAMD(effectivePrice)} AMD
                    </div>
                    {addonTotal > 0 && (
                        <div className="mt-1 text-xs text-slate-500">
                            {formatAMD(basePrice)} AMD բազային + {formatAMD(addonTotal)} AMD հավելավճար
                        </div>
                    )}
                    <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500">
                        <UserRound className="h-4 w-4 text-slate-400" />
                        {operatorName}
                    </div>
                    <Link
                        href={`/trip/${trip.id}`}
                        className="mt-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow hover:brightness-95"
                    >
                        Մանրամասներ
                        <ChevronRight className="h-4 w-4" />
                    </Link>
                </div>
            </div>
        </article>
    );
}

function Badge({ children }) {
    return (
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
            {children}
        </span>
    );
}

function EmptyState({ onCreate }) {
    return (
        <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-emerald-300 bg-emerald-50/50 p-10 text-center text-slate-700">
            <Car className="h-12 w-12 text-emerald-500" />
            <div className="text-xl font-semibold text-slate-900">
                Ընտրված պայմաններով ուղևորություններ մինչ այժմ չեն գտնվել
            </div>
            <div className="max-w-sm text-sm text-slate-600">
                Փոփոխեք որոնման պարամետրերը կամ ստեղծեք հիշեցում, և մենք կտեղեկացնենք, երբ հայտնվեն նոր առաջարկներ։
            </div>
            <button
                onClick={onCreate}
                className="rounded-full border border-emerald-500 px-5 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-500/10"
            >
                Ստեղծել հիշեցում
            </button>
        </div>
    );
}


function MapPicker({ side, initial, onSelect, onClose }) {
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const containerRef = useRef(null);
    const [address, setAddress] = useState(initial?.label || "");
    const [position, setPosition] = useState(() => {
        if (initial?.lat && initial?.lng) {
            return { lat: initial.lat, lng: initial.lng };
        }
        return null;
    });

    useEffect(() => {
        let mounted = true;
        (async () => {
            const maplibregl = await ensureMapLibre();
            if (!mounted || !maplibregl) return;

            const map = new maplibregl.Map({
                container: containerRef.current,
                style: {
                    version: 8,
                    sources: {
                        osm: {
                            type: "raster",
                            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
                            tileSize: 256,
                        },
                    },
                    layers: [{ id: "osm", type: "raster", source: "osm" }],
                },
                center: position ? [position.lng, position.lat] : [44.51, 40.18],
                zoom: position ? 12 : 7,
            });

            mapRef.current = map;
            map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

            if (position) {
                markerRef.current = new maplibregl.Marker({ color: "#10b981" })
                    .setLngLat([position.lng, position.lat])
                    .addTo(map);
            }

            map.on("click", async (event) => {
                const { lng, lat } = event.lngLat;
                setPosition({ lat, lng });
                if (markerRef.current) {
                    markerRef.current.setLngLat([lng, lat]);
                } else {
                    markerRef.current = new maplibregl.Marker({ color: "#10b981" })
                        .setLngLat([lng, lat])
                        .addTo(map);
                }
                const label = await reverseGeocodeNominatim(lng, lat);
                setAddress(label);
            });
        })();

        return () => {
            mounted = false;
            try {
                mapRef.current?.remove();
            } catch (e) {
                void e;
            }
        };
    }, []);

    return createPortal(
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] grid place-items-center bg-black/40 p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 12, opacity: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                className="w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                    <div className="text-sm font-semibold text-slate-900">
                        Քարտեզով ընտրել · {side === "from" ? "Մեկնարկ" : "Վերջակետ"}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                        aria-label="Փակել"
                    >
                        ×
                    </button>
                </div>
                <div ref={containerRef} className="h-[60vh]" />
                <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm">
                    <div className="flex-1 truncate text-slate-600">
                        {position ? (
                            <>
                                {address || "Ղեկավարեք քարտեզի վրա ճշգրիտ կետը"}
                                <span className="ml-2 text-xs text-slate-400">
                                    ({position.lat.toFixed(5)}, {position.lng.toFixed(5)})
                                </span>
                            </>
                        ) : (
                            "Քարտեզի վրա սեղմեք՝ կետ ընտրելու համար"
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
                        >
                            Չեղարկել
                        </button>
                        <button
                            type="button"
                            disabled={!position}
                            onClick={() => position && onSelect(side, { ...position, addr: address })}
                            className="rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow disabled:opacity-60"
                        >
                            Հստակեցնել կետը
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>,
        document.body
    );
}
