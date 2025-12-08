// resources/js/Pages/Client/Explore.jsx
import React, { useRef, useState, useEffect, Suspense, useMemo } from "react";
import { createPortal } from "react-dom";
import { router, usePage } from "@inertiajs/react";
import ExploreDesignLayout from "@/Pages/Client/ExploreDesignLayout.jsx";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, Users as UsersIcon, Map as MapIcon, ArrowLeftRight, MapPin as Pin } from "lucide-react";
import DatePickerDemo from "@/Pages/Explore/DatePickerDemo.jsx";
import TripsResultsSection from "@/Pages/Explore/TripsResultsSection.jsx";

const AboutSection = React.lazy(() => import("@/Pages/Explore/AboutSection.jsx"));
const PopularRoutesSection = React.lazy(() => import("@/Pages/Explore/PopularRoutesSection.jsx"));
const ReviewsSection = React.lazy(() => import("@/Pages/Explore/ReviewsSection.jsx"));
const StatsSection = React.lazy(() => import("@/Pages/Explore/StatsSection.jsx"));

const buildInitialSearch = (filters) => ({
    from: filters?.from || "",
    to: filters?.to || "",
    date: filters?.date_from || filters?.date || "",
    passengers: Number(filters?.seats) || 1,
    fromLat: filters?.from_lat ? Number(filters.from_lat) : null,
    fromLng: filters?.from_lng ? Number(filters.from_lng) : null,
    toLat: filters?.to_lat ? Number(filters.to_lat) : null,
    toLng: filters?.to_lng ? Number(filters.to_lng) : null,
});

const buildPayload = (search) => {
    const payload = {
        from: search.from,
        to: search.to,
        seats: search.passengers,
    };
    if (search.date) {
        payload.date_from = search.date;
        payload.date_to = search.date;
    }
    if (search.fromLat !== null && search.fromLng !== null) {
        payload.from_lat = search.fromLat;
        payload.from_lng = search.fromLng;
    }
    if (search.toLat !== null && search.toLng !== null) {
        payload.to_lat = search.toLat;
        payload.to_lng = search.toLng;
    }
    return payload;
};

export default function Explore() {
    const { trips, filters, amenityFilters, stats, auth } = usePage().props;
    const tripsList = useMemo(() => (Array.isArray(trips?.data) ? trips.data : []), [trips]);
    const hasFilters = useMemo(() => {
        const f = filters || {};
        return Boolean(
            f.from ||
            f.to ||
            f.date_from ||
            f.date_to ||
            f.seats ||
            f.types ||
            f.amenities
        );
    }, [filters]);
    const [showResults, setShowResults] = useState(hasFilters || tripsList.length > 0);
    const [headerCollapsed, setHeaderCollapsed] = useState(false);
    const [search, setSearch] = useState(() => buildInitialSearch(filters));
    const [searching, setSearching] = useState(false);

    const stageRef = useRef(null);
    const heroRef = useRef(null);

    const handleSearch = () => {
        if (!showResults) setShowResults(true);
        setSearching(true);
        router.get("/trips", buildPayload(search), {
            preserveScroll: true,
            preserveState: true,
            onFinish: () => setSearching(false),
        });
        if (stageRef.current) {
            stageRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    };

    useEffect(() => {
        setSearch(buildInitialSearch(filters));
        setSearching(false);
    }, [filters]);

    useEffect(() => {
        if (hasFilters || tripsList.length > 0) {
            setShowResults(true);
        }
    }, [hasFilters, tripsList.length]);

    useEffect(() => {
        const onScroll = () => {
            if (!heroRef.current) return;
            const rect = heroRef.current.getBoundingClientRect();
            const headerHeight = 110;
            const shouldCollapse = rect.top <= headerHeight;
            setHeaderCollapsed((prev) => (prev === shouldCollapse ? prev : shouldCollapse));
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const [mapTarget, setMapTarget] = useState(null);

    const handlePassengersChange = (delta) => {
        setSearch((prev) => {
            const next = Math.min(6, Math.max(1, (prev.passengers || 1) + delta));
            return { ...prev, passengers: next };
        });
    };

    const handleSearchPatch = (patch) => {
        setSearch((prev) => ({ ...prev, ...patch }));
    };

    const handleSwap = () => {
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

    const handleOpenMap = (side) => {
        setMapTarget({
            side,
            initial:
                side === "from"
                    ? { lat: search.fromLat, lng: search.fromLng, label: search.from }
                    : { lat: search.toLat, lng: search.toLng, label: search.to },
        });
    };

    const handleMapSelect = (side, point) => {
        handleSearchPatch({
            [side]: point.addr || search[side],
            [`${side}Lat`]: point.lat,
            [`${side}Lng`]: point.lng,
        });
        setMapTarget(null);
    };

    return (
        <ExploreDesignLayout user={auth?.user} headerCollapsed={headerCollapsed}>
            <TopSearchBar
                onSearch={handleSearch}
                heroRef={heroRef}
                headerCollapsed={headerCollapsed}
                search={search}
                onSearchChange={handleSearchPatch}
                onPassengersChange={handlePassengersChange}
                onSwap={handleSwap}
                onOpenMap={handleOpenMap}
            />

            <div ref={stageRef} id="trips-section" className="relative z-0 mt-4 scroll-mt-24 sm:scroll-mt-28">
                <AnimatePresence mode="wait">
                    {!showResults ? (
                        <motion.div
                            key="presearch"
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -16 }}
                            transition={{ duration: 0.4 }}
                            className="-mx-4 sm:-mx-6 lg:-mx-8"
                        >
                            <section className="relative scroll-mt-32">
                                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                                    <div className="overflow-hidden rounded-3xl border border-cyan-100 bg-white/90 px-6 py-6 shadow-[0_18px_55px_rgba(34,197,235,0.28)] backdrop-blur-xl sm:px-8 sm:py-8">
                                        <h1 className="text-center text-[clamp(22px,6vw,40px)] font-extrabold text-slate-900">Գտի՛ր ուղևորություն՝ արագ և հարմար</h1>
                                        <p className="mt-2 text-center text-sm text-slate-700">
                                            Մուտքագրի՛ր քաղաքները, համեմատի՛ր գները, տես վարորդի վարկանիշը և ընտրի՛ր ամենահարմար տարբերակը HayWay պլատֆորմով։
                                        </p>
                                        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-[11px]">
                                            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-900">
                                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                Ավելի մատչելի, քան classic տաքսիի ծառայությունները
                                            </span>
                                            <span className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 px-3 py-1 text-cyan-900">
                                                <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                                                Real-time հայտեր վարորդներից և ուղևորներից
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <Suspense fallback={null}>
                                <section id="about-section" className="scroll-mt-32">
                                    <AboutSection rating={stats?.avg_rating} reviewsCount={stats?.total_reviews} />
                                </section>
                                <section id="popular-routes-section" className="scroll-mt-32">
                                    <PopularRoutesSection />
                                </section>
                                <section id="reviews-section" className="scroll-mt-32">
                                    <ReviewsSection />
                                </section>
                                <section id="stats-section" className="scroll-mt-32">
                                    <StatsSection stats={stats} />
                                </section>
                            </Suspense>
                        </motion.div>
                    ) : (
                        <section id="results-inner" className="scroll-mt-32">
                            <TripsResultsSection
                                trips={tripsList}
                                meta={trips?.meta}
                                amenityOptions={amenityFilters}
                                isSearching={searching}
                            />
                        </section>
                    )}
                </AnimatePresence>
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
            </AnimatePresence>
        </ExploreDesignLayout>
    );
}

function TopSearchBar({ onSearch, heroRef, headerCollapsed, search, onSearchChange, onPassengersChange, onSwap, onOpenMap }) {
    const topClass = headerCollapsed ? "top-4 sm:top-5 lg:top-6" : "top-24 sm:top-28 lg:top-32";

    return (
        <section ref={heroRef} id="hero-section" className="relative mt-4 -mx-4 scroll-mt-32 sm:-mx-6 lg:-mx-8">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className={`sticky z-30 transition-all duration-300 ${topClass}`}>
                    <HeroSearchForm
                        onSearch={onSearch}
                        search={search}
                        onChange={onSearchChange}
                        onPassengersChange={onPassengersChange}
                        onSwap={onSwap}
                        onOpenMap={onOpenMap}
                    />
                </div>
            </div>
        </section>
    );
}

function HeroSearchForm({ onSearch, search, onChange, onPassengersChange, onSwap, onOpenMap }) {
    const handleChange = (field, value) => {
        onChange?.({ [field]: value });
    };

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                onSearch?.();
            }}
            className="flex w-full flex-col gap-2 rounded-full border border-cyan-100/70 bg-white/95 px-3 py-2 shadow-[0_14px_40px_rgba(34,211,238,0.25)] backdrop-blur xl:flex-row xl:items-center"
        >
            <div className="flex min-w-0 flex-1 items-stretch gap-2">
                <AddressInput
                    side="from"
                    value={search?.from}
                    lat={search?.fromLat}
                    lng={search?.fromLng}
                    placeholder="Մեկնարկային կետ"
                    onChange={handleChange}
                    onOpenMap={onOpenMap}
                />

                <button
                    type="button"
                    onClick={onSwap}
                    className="hidden h-11 w-11 items-center justify-center rounded-full border border-slate-100 bg-white text-slate-600 shadow-sm transition hover:border-emerald-300 hover:text-emerald-600 sm:flex"
                    aria-label="Փոխանակել ուղղությունները"
                >
                    <ArrowLeftRight className="h-4 w-4" />
                </button>

                <AddressInput
                    side="to"
                    value={search?.to}
                    lat={search?.toLat}
                    lng={search?.toLng}
                    placeholder="Վերջնակետ"
                    onChange={handleChange}
                    onOpenMap={onOpenMap}
                />
            </div>

            <div className="flex flex-wrap items-center gap-2 xl:flex-nowrap">
                <div className="flex h-12 items-center">
                    <DatePickerDemo value={search?.date} onChange={(date) => handleChange("date", date)} />
                </div>
                <div className="flex h-12 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 shadow-sm">
                    <UsersIcon className="h-4 w-4 text-emerald-700" />
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 text-xs font-semibold text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
                            onClick={() => onPassengersChange?.(-1)}
                        >
                            -
                        </button>
                        <span className="min-w-[24px] text-center text-sm font-semibold">{search?.passengers || 1}</span>
                        <button
                            type="button"
                            className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 text-xs font-semibold text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
                            onClick={() => onPassengersChange?.(1)}
                        >
                            +
                        </button>
                    </div>
                </div>
                <button type="submit" className="inline-flex h-12 items-center gap-2 rounded-full bg-gradient-to-r from-[rgb(34,211,238)] to-[rgb(45,212,191)] px-5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(45,212,191,0.6)]">
                    <Search className="h-4 w-4" />
                    Որոնել
                </button>
            </div>
        </form>
    );
}

/* ===== Helpers & extra UI ===== */
const NOMI_LANG = "hy,ru,en";

function useDebouncedValue(value, delay = 250) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const id = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(id);
    }, [value, delay]);
    return debounced;
}

async function searchSuggestions(q) {
    if (!q?.trim()) return [];
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=7&accept-language=${encodeURIComponent(
        NOMI_LANG
    )}&q=${encodeURIComponent(q.trim())}`;
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    if (!r.ok) return [];
    const arr = (await r.json()) || [];
    return arr.map((it) => ({
        id: it.place_id ?? `${it.lat},${it.lon}`,
        label: it.display_name || q,
        lat: parseFloat(it.lat),
        lng: parseFloat(it.lon),
    }));
}

async function reverseGeocodeNominatim(lng, lat) {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&accept-language=${encodeURIComponent(
            NOMI_LANG
        )}&lat=${lat}&lon=${lng}&addressdetails=1`;
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

function AddressInput({ side, value, lat, lng, placeholder, onChange, onOpenMap }) {
    const [input, setInput] = useState(value || "");
    const [items, setItems] = useState([]);
    const [busy, setBusy] = useState(false);
    const [open, setOpen] = useState(false);
    const [highlight, setHighlight] = useState(-1);
    const debounced = useDebouncedValue(input, 220);

    useEffect(() => setInput(value || ""), [value]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const q = debounced?.trim();
            if (!q) {
                setItems([]);
                setOpen(false);
                return;
            }
            setBusy(true);
            try {
                const list = await searchSuggestions(q);
                if (!cancelled) {
                    setItems(list);
                    setOpen(list.length > 0);
                    setHighlight(-1);
                }
            } finally {
                if (!cancelled) setBusy(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [debounced]);

    const applyPatch = (label, newLat, newLng) => {
        onChange?.({
            [side]: label,
            [`${side}Lat`]: newLat,
            [`${side}Lng`]: newLng,
        });
    };

    const chooseItem = (item) => {
        setInput(item.label);
        setItems([]);
        setOpen(false);
        setHighlight(-1);
        applyPatch(item.label, item.lat, item.lng);
    };

    return (
        <div className="relative flex flex-1">
            <div className="flex h-12 min-w-[190px] flex-1 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 shadow-sm focus-within:border-emerald-400">
                <MapPin className="h-4 w-4 text-emerald-700" />
                <input
                    className="w-full border-none bg-transparent text-sm placeholder-slate-400 focus:outline-none"
                    placeholder={placeholder}
                    value={input}
                    onChange={(e) => {
                        const v = e.target.value;
                        setInput(v);
                        applyPatch(v, null, null);
                    }}
                    onFocus={() => items.length && setOpen(true)}
                    onKeyDown={(e) => {
                        if (!open || !items.length) return;
                        if (e.key === "ArrowDown") {
                            e.preventDefault();
                            setHighlight((prev) => (prev + 1) % items.length);
                        } else if (e.key === "ArrowUp") {
                            e.preventDefault();
                            setHighlight((prev) => (prev - 1 + items.length) % items.length);
                        } else if (e.key === "Enter") {
                            if (highlight >= 0 && highlight < items.length) {
                                e.preventDefault();
                                chooseItem(items[highlight]);
                            }
                        } else if (e.key === "Escape") {
                            setOpen(false);
                        }
                    }}
                    onBlur={() => setTimeout(() => setOpen(false), 120)}
                />
                {busy && <span className="text-[10px] text-slate-400">...</span>}
                <button
                    type="button"
                    onClick={() => onOpenMap?.(side)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500 text-white shadow-md shadow-sky-400/50 transition hover:bg-sky-600"
                    aria-label="Քարտեզ"
                >
                    <MapIcon className="h-4 w-4" />
                </button>
            </div>

            {open && items.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-64 overflow-auto rounded-2xl border border-slate-200 bg-white shadow-lg">
                    {items.map((item, i) => (
                        <button
                            key={item.id}
                            type="button"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                chooseItem(item);
                            }}
                            className={`flex w-full items-start gap-2 px-3 py-2 text-left text-xs transition ${
                                i === highlight ? "bg-emerald-50 text-emerald-700" : "text-slate-700 hover:bg-slate-50"
                            }`}
                        >
                            <Pin className="mt-[2px] h-3.5 w-3.5 text-emerald-500" />
                            <span>{item.label}</span>
                        </button>
                    ))}
                </div>
            )}

        </div>
    );
}

function MapPicker({ side, initial, onSelect, onClose }) {
    const containerRef = useRef(null);
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const [address, setAddress] = useState(initial?.label || "");
    const [position, setPosition] = useState(() => {
        if (initial?.lat && initial?.lng) return { lat: initial.lat, lng: initial.lng };
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
                markerRef.current = new maplibregl.Marker({ color: "#10b981" }).setLngLat([position.lng, position.lat]).addTo(map);
            }

            map.on("click", async (event) => {
                const { lng, lat } = event.lngLat;
                setPosition({ lat, lng });
                if (markerRef.current) {
                    markerRef.current.setLngLat([lng, lat]);
                } else {
                    markerRef.current = new maplibregl.Marker({ color: "#10b981" }).setLngLat([lng, lat]).addTo(map);
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
                    <div className="text-sm font-semibold text-slate-900">Քարտեզով ընտրել · {side === "from" ? "Մեկնարկ" : "Վերջակետ"}</div>
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
                            Հաստատել կետը
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>,
        document.body
    );
}
