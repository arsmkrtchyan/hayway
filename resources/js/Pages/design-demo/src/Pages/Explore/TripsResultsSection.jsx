// resources/js/Pages/Explore/TripsResultsSection.jsx
import React, { useMemo, useState } from "react"
import {
    ChevronRight,
    ShieldCheck,
    Clock,
    Users as UsersIcon,
    Car,
    Star,
    UserRound,
    ArrowLeft,
    Wifi,
    Baby,
    Usb,
    Wind,
    CircleDot,
    AlertTriangle,
    Flame,
    PawPrint,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

// === CONSTANTS ===

const CATEGORY_TABS = [
    { id: "all", label: "Բոլորը" },
    { id: "rideshare", label: "Համատեղ" },
    { id: "company", label: "Ընկերություն" },
]

const VISIBLE_LIMIT = 4

const SORT_OPTIONS = [
    { id: "earliest", label: "Ամենավաղ մեկնարկ" },
    { id: "cheapest", label: "Ամենաէժան ուղևորություն" },
    { id: "rating", label: "Բարձր վարկանիշ" },
    { id: "shortest", label: "Ամենակարճ երթուղի" },
]

const TIME_RANGE_OPTIONS = [
    { id: "early", label: "Մինչև 06:00", from: 0, to: 6 },
    { id: "morning", label: "06:00 – 12:00", from: 6, to: 12 },
    { id: "day", label: "12:00 – 18:00", from: 12, to: 18 },
    { id: "evening", label: "18:00-ից հետո", from: 18, to: 24 },
]

// ԲԱԼՈՆԸ ՀԱՆՎԱԾ Է
const AMENITY_OPTIONS = [
    "Կոնդիցիոներ",
    "USB լիցքավորում",
    "Wi-Fi",
    "Մանկական աթոռ",
    "Ծխելու թույլտվություն",
    "Կենդանիներ թույլատրվում են",
]

const TIME_RANGES_DEFAULT = {
    early: false,
    morning: false,
    day: false,
    evening: false,
}

// amenity → icon map (Բալոն չկա)
const AMENITY_ICON_MAP = {
    "Կոնդիցիոներ": Wind,
    "USB լիցքավորում": Usb,
    "Wi-Fi": Wifi,
    "Մանկական աթոռ": Baby,
    "Ծխելու թույլտվություն": Flame,
    "Կենդանիներ թույլատրվում են": PawPrint,
}

// === HELPERS ===

function parseHourFromHHMM(hhmm) {
    if (!hhmm || typeof hhmm !== "string") return null
    const [h] = hhmm.split(":")
    const hour = Number(h)
    return Number.isNaN(hour) ? null : hour
}

function parseMinutesFromHHMM(hhmm) {
    if (!hhmm || typeof hhmm !== "string") return null
    const [h, m] = hhmm.split(":")
    const hour = Number(h)
    const min = Number(m)
    if (Number.isNaN(hour) || Number.isNaN(min)) return null
    return hour * 60 + min
}

// === MAIN COMPONENT ===

export default function TripsResultsSection({ trips = [] }) {
    const [category, setCategory] = useState("all")
    const [sortMode, setSortMode] = useState("earliest")
    const [timeRanges, setTimeRanges] = useState(() => ({ ...TIME_RANGES_DEFAULT }))
    const [onlyHighRating, setOnlyHighRating] = useState(false)

    const [amenitiesFilter, setAmenitiesFilter] = useState([])
    const [amenitiesDraft, setAmenitiesDraft] = useState([])

    const [showAmenitiesPanel, setShowAmenitiesPanel] = useState(false)

    const safeTrips = useMemo(
        () => (Array.isArray(trips) ? trips : []),
        [trips],
    )

    const counts = useMemo(() => {
        if (!safeTrips.length) {
            return { all: 0, rideshare: 0, company: 0 }
        }

        let all = 0
        let rideshare = 0
        let company = 0

        for (const t of safeTrips) {
            all++
            if (t.type === "Rideshare") rideshare++
            if (t.type === "Company") company++
        }

        return { all, rideshare, company }
    }, [safeTrips])

    const categoryTrips = useMemo(() => {
        if (!safeTrips.length) return []
        return safeTrips.filter((t) => {
            if (category === "all") return true
            if (category === "company") return t.type === "Company"
            return t.type === "Rideshare"
        })
    }, [safeTrips, category])

    const filteredTrips = useMemo(() => {
        if (!categoryTrips.length) return []

        const activeTimeIds = Object.entries(timeRanges)
            .filter(([_, val]) => val)
            .map(([id]) => id)

        const hasTimeFilter = activeTimeIds.length > 0

        const timeMap = TIME_RANGE_OPTIONS.reduce((acc, r) => {
            acc[r.id] = r
            return acc
        }, {})

        const result = categoryTrips.filter((t) => {
            if (onlyHighRating) {
                if (!(typeof t.rating === "number" && t.rating >= 4.5)) {
                    return false
                }
            }

            if (hasTimeFilter) {
                const hour = parseHourFromHHMM(t.departure_hhmm)
                if (hour === null) return false

                let ok = false
                for (const id of activeTimeIds) {
                    const range = timeMap[id]
                    if (!range) continue
                    if (hour >= range.from && hour < range.to) {
                        ok = true
                        break
                    }
                }
                if (!ok) return false
            }

            if (amenitiesFilter.length) {
                if (!Array.isArray(t.amenities)) return false
                for (const a of amenitiesFilter) {
                    if (!t.amenities.includes(a)) return false
                }
            }

            return true
        })

        const sorted = result.slice().sort((a, b) => {
            switch (sortMode) {
                case "cheapest": {
                    const ap =
                        typeof a.price_amd === "number"
                            ? a.price_amd
                            : Infinity
                    const bp =
                        typeof b.price_amd === "number"
                            ? b.price_amd
                            : Infinity
                    return ap - bp
                }
                case "rating": {
                    const ar = typeof a.rating === "number" ? a.rating : 0
                    const br = typeof b.rating === "number" ? b.rating : 0
                    return br - ar
                }
                case "shortest": {
                    const ad =
                        typeof a.duration_min === "number"
                            ? a.duration_min
                            : Number.MAX_SAFE_INTEGER
                    const bd =
                        typeof b.duration_min === "number"
                            ? b.duration_min
                            : Number.MAX_SAFE_INTEGER
                    return ad - bd
                }
                case "earliest":
                default: {
                    const am = parseMinutesFromHHMM(a.departure_hhmm) ?? Infinity
                    const bm = parseMinutesFromHHMM(b.departure_hhmm) ?? Infinity
                    return am - bm
                }
            }
        })

        return sorted
    }, [categoryTrips, sortMode, timeRanges, onlyHighRating, amenitiesFilter])

    const stats = useMemo(() => {
        if (!filteredTrips.length) {
            return {
                avgPrice: 0,
                minPrice: 0,
                avgRating: 0,
            }
        }

        let priceSum = 0
        let priceCount = 0
        let minPrice = Infinity

        let ratingSum = 0
        let ratingCount = 0

        for (const t of filteredTrips) {
            if (typeof t.price_amd === "number") {
                priceSum += t.price_amd
                priceCount++
                if (t.price_amd < minPrice) minPrice = t.price_amd
            }

            if (typeof t.rating === "number") {
                ratingSum += t.rating
                ratingCount++
            }
        }

        const avgPrice = priceCount > 0 ? Math.round(priceSum / priceCount) : 0
        const minPriceFinal = priceCount > 0 ? minPrice : 0
        const avgRating = ratingCount > 0 ? ratingSum / ratingCount : 0

        return { avgPrice, minPrice: minPriceFinal, avgRating }
    }, [filteredTrips])

    const visibleTrips = useMemo(
        () => filteredTrips.slice(0, VISIBLE_LIMIT),
        [filteredTrips],
    )
    const hiddenCount = Math.max(0, filteredTrips.length - visibleTrips.length)

    const mainTrip = visibleTrips[0] || null
    const otherTrips = visibleTrips.slice(1)

    const toggleTimeRange = (id) => {
        setTimeRanges((prev) => ({
            ...prev,
            [id]: !prev[id],
        }))
    }

    const toggleDraftAmenity = (label) => {
        setAmenitiesDraft((prev) =>
            prev.includes(label)
                ? prev.filter((a) => a !== label)
                : [...prev, label],
        )
    }

    const handleClearFilters = () => {
        setSortMode("earliest")
        setTimeRanges(() => ({ ...TIME_RANGES_DEFAULT }))
        setOnlyHighRating(false)
        setAmenitiesFilter([])
        setAmenitiesDraft([])
        setShowAmenitiesPanel(false)
    }

    const activeFiltersCount = useMemo(() => {
        let count = 0
        if (sortMode !== "earliest") count += 1
        if (onlyHighRating) count += 1
        count += Object.values(timeRanges).filter(Boolean).length
        count += amenitiesFilter.length
        return count
    }, [sortMode, onlyHighRating, timeRanges, amenitiesFilter])

    const openAmenitiesPanel = () => {
        setAmenitiesDraft(amenitiesFilter)
        setShowAmenitiesPanel(true)
    }

    const handleAmenitiesConfirm = () => {
        setAmenitiesFilter(amenitiesDraft)
        setShowAmenitiesPanel(false)
    }

    const handleAmenitiesCancel = () => {
        setAmenitiesDraft([])
        setShowAmenitiesPanel(false)
    }

    return (
        <div className="relative flex min-h-[100svh] w-full items-center justify-center bg-gradient-to-b from-sky-50 via-slate-50 to-emerald-50 px-3 py-4 md:px-6 md:py-6">
            <motion.div
                key="results"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="relative flex w-full max-w-6xl flex-col gap-4 rounded-[24px] border border-slate-200 bg-white/98 p-4 shadow-md md:p-6"
            >
                {/* Header */}
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-600">
                            HAYWAY · TRIPS
                        </p>
                        <h1 className="mt-1 text-xl font-semibold text-slate-900 md:text-2xl">
                            Գտնված ուղևորություններ
                        </h1>
                        <p className="text-xs text-slate-500">
                            Դեմո ցուցադրում՝ հիմնված քո որոնման պարամետրերի և
                            ակտիվ filter-ների վրա։
                        </p>
                    </div>

                    <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                        <CategoryTabs
                            category={category}
                            onChange={setCategory}
                            counts={counts}
                        />

                        <a
                            href="/trips"
                            className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:border-emerald-200 hover:text-emerald-700"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            <span>Վերադառնալ գլխավոր էջ</span>
                        </a>
                    </div>
                </div>

                {/* Main row */}
                <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
                    <CompactFilterSidebar
                        sortMode={sortMode}
                        onSortChange={setSortMode}
                        timeRanges={timeRanges}
                        onTimeRangeToggle={toggleTimeRange}
                        onlyHighRating={onlyHighRating}
                        onOnlyHighRatingChange={setOnlyHighRating}
                        amenitiesFilter={amenitiesFilter}
                        activeFiltersCount={activeFiltersCount}
                        onClearFilters={handleClearFilters}
                        onOpenAmenitiesPanel={openAmenitiesPanel}
                    />

                    <div className="flex min-h-[220px] flex-col gap-3">
                        {!mainTrip ? (
                            <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/70 px-4 py-6 text-center text-xs text-emerald-900/80">
                                <div className="space-y-1">
                                    <p className="text-sm font-semibold">
                                        Ներկայումս ուղևորություններ չկան։
                                    </p>
                                    <p className="text-[11px]">
                                        Փոխիր օրը, ուղղությունը կամ filter-ները՝
                                        նոր առաջարկներ տեսնելու համար։
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Գլխավոր քարտը երևում է միայն այն ժամանակ, երբ
                                    հարմարությունների panel-ը փակ է */}
                                {!showAmenitiesPanel && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{
                                            duration: 0.2,
                                            ease: "easeOut",
                                            delay: 0.03,
                                        }}
                                        className="relative overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-4 shadow-sm transition-shadow hover:shadow-md"
                                    >
                                        <TripRow t={mainTrip} variant="big" />
                                    </motion.div>
                                )}

                                <AnimatePresence mode="wait">
                                    {showAmenitiesPanel ? (
                                        <motion.div
                                            key="amenities-panel"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{
                                                duration: 0.2,
                                                ease: "easeOut",
                                            }}
                                        >
                                            <AmenitiesPanel
                                                draftAmenities={amenitiesDraft}
                                                onDraftToggle={toggleDraftAmenity}
                                                onConfirm={handleAmenitiesConfirm}
                                                onCancel={handleAmenitiesCancel}
                                            />
                                        </motion.div>
                                    ) : (
                                        otherTrips.length > 0 && (
                                            <motion.div
                                                key="other-trips"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                transition={{
                                                    duration: 0.2,
                                                    ease: "easeOut",
                                                }}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                                                        Այլ ընտրանքներ
                                                    </p>
                                                    {hiddenCount > 0 && (
                                                        <p className="text-[11px] text-slate-500">
                                                            +{" "}
                                                            <span className="font-semibold">
                                                                {hiddenCount.toLocaleString(
                                                                    "hy-AM",
                                                                )}
                                                            </span>{" "}
                                                            այլ առաջարկ (չեն
                                                            ցուցադրվում այս
                                                            դեմոյում)
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="flex gap-3 overflow-x-auto pb-1">
                                                    {otherTrips.map((t, i) => (
                                                        <div
                                                            key={t.id ?? i}
                                                            className="min-w-[230px] max-w-[260px] flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm transition-transform duration-150 hover:-translate-y-1 hover:shadow-md"
                                                        >
                                                            <TripRow
                                                                t={t}
                                                                variant="small"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )
                                    )}
                                </AnimatePresence>
                            </>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    )
}

/* === SummaryCard (չի օգտագործվում հիմա, թողած է ապագայի համար) === */
function SummaryCard({ label, value, helper }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white/98 p-3.5 text-xs shadow-sm transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-md">
            <p className="text-[11px] font-medium text-slate-500">{label}</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
            <p className="mt-1 text-[10px] text-slate-500">{helper}</p>
        </div>
    )
}

/* === CategoryTabs === */
function CategoryTabs({ category, onChange, counts }) {
    return (
        <div className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-[999px] border border-slate-200/80 bg-white/95 p-1 shadow-sm">
            {CATEGORY_TABS.map((tab) => {
                const isActive = category === tab.id
                const count = (counts?.[tab.id] ?? 0).toLocaleString("hy-AM")

                return (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => onChange(tab.id)}
                        className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium transition ${isActive
                            ? "bg-gradient-to-r from-[rgb(34,211,238)] to-[rgb(45,212,191)] text-white shadow"
                            : "text-slate-700 hover:bg-slate-50 hover:text-emerald-700"
                            }`}
                    >
                        <span>{tab.label}</span>
                        <span
                            className={`rounded-full px-2 py-0.5 text-[10px] ${isActive
                                ? "bg-white/20 text-white"
                                : "bg-slate-100 text-slate-500"
                                }`}
                        >
                            {count}
                        </span>
                    </button>
                )
            })}
        </div>
    )
}

/* === CompactFilterSidebar === */
function CompactFilterSidebar({
    sortMode,
    onSortChange,
    timeRanges,
    onTimeRangeToggle,
    onlyHighRating,
    onOnlyHighRatingChange,
    amenitiesFilter,
    activeFiltersCount,
    onClearFilters,
    onOpenAmenitiesPanel,
}) {
    return (
        <aside className="space-y-4 rounded-2xl border border-slate-200/90 bg-white/98 p-3.5 text-xs shadow-sm lg:sticky lg:top-4">
            <div className="mb-1 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Filters
                </p>
                {activeFiltersCount > 0 && (
                    <button
                        type="button"
                        onClick={onClearFilters}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-200"
                    >
                        Մաքրել ({activeFiltersCount})
                    </button>
                )}
            </div>

            {/* Sort */}
            <div>
                <p className="mb-1 text-[11px] font-semibold text-slate-800">
                    Դասակարգում
                </p>
                <div className="space-y-1.5">
                    {SORT_OPTIONS.map((opt) => (
                        <label
                            key={opt.id}
                            className="flex items-center gap-2 rounded-lg px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
                        >
                            <input
                                type="radio"
                                name="sort"
                                className="h-3.5 w-3.5 text-emerald-700"
                                checked={sortMode === opt.id}
                                onChange={() => onSortChange(opt.id)}
                            />
                            {opt.label}
                        </label>
                    ))}
                </div>
            </div>

            {/* Departure time */}
            <div>
                <p className="mb-1 text-[11px] font-semibold text-slate-800">
                    Մեկնելու ժամ
                </p>
                <div className="space-y-1 text-[11px]">
                    {TIME_RANGE_OPTIONS.map((range) => (
                        <label
                            key={range.id}
                            className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600 hover:border-emerald-200"
                        >
                            <span className="inline-flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    className="h-3.5 w-3.5 text-emerald-700"
                                    checked={!!timeRanges[range.id]}
                                    onChange={() =>
                                        onTimeRangeToggle(range.id)
                                    }
                                />
                                {range.label}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Trust */}
            <div>
                <p className="mb-1 text-[11px] font-semibold text-slate-800">
                    Վստահություն
                </p>
                <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-600 hover:border-emerald-200">
                    <input
                        type="checkbox"
                        className="h-3.5 w-3.5 text-emerald-700"
                        checked={onlyHighRating}
                        onChange={(e) =>
                            onOnlyHighRatingChange(e.target.checked)
                        }
                    />
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                    Վարկանիշ ≥ 4.5
                </label>
            </div>

            {/* Amenities */}
            <div>
                <p className="mb-1 text-[11px] font-semibold text-slate-800">
                    Հարմարություններ
                </p>
                <button
                    type="button"
                    onClick={onOpenAmenitiesPanel}
                    className="inline-flex w-full items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-medium text-emerald-800 hover:bg-emerald-100"
                >
                    <span className="inline-flex items-center gap-1.5">
                        <Wind className="h-3.5 w-3.5" />
                        <span>Բացել հարմարությունների panel-ը</span>
                    </span>
                    {amenitiesFilter.length > 0 && (
                        <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-600 text-[10px] font-semibold text-white">
                            {amenitiesFilter.length}
                        </span>
                    )}
                </button>
            </div>
        </aside>
    )
}

/* === AmenitiesPanel === */
function AmenitiesPanel({
    draftAmenities,
    onDraftToggle,
    onConfirm,
    onCancel,
}) {
    return (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
            <p className="text-[11px] font-semibold text-emerald-800">
                Հարմարություններ
            </p>
            <p className="mt-1 mb-3 text-[11px] text-emerald-700/80">
                Ընտրիր այն հարմարությունները, որոնք կարևոր են քեզ համար․
                ընտրությունը ուժի մեջ կմտնի միայն «Հաստատել ընտրությունները»
                կոճակը սեղմելուց հետո։
            </p>

            <div className="grid gap-1.5 sm:grid-cols-2">
                {AMENITY_OPTIONS.map((label) => {
                    const selected = draftAmenities.includes(label)
                    const Icon = AMENITY_ICON_MAP[label]

                    return (
                        <button
                            key={label}
                            type="button"
                            onClick={() => onDraftToggle(label)}
                            className={`flex items-center justify-between rounded-xl px-3 py-2 text-left text-[12px] transition ${selected
                                ? "border border-emerald-200 bg-white text-emerald-800 shadow-sm"
                                : "border border-transparent bg-emerald-50 text-emerald-800/80 hover:border-emerald-100 hover:bg-white/80"
                                }`}
                        >
                            <span className="inline-flex items-center gap-2">
                                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                                    {Icon && <Icon className="h-4 w-4" />}
                                </span>
                                <span>{label}</span>
                            </span>
                            {selected && (
                                <span className="text-[10px] font-semibold text-emerald-700">
                                    Ընտրված
                                </span>
                            )}
                        </button>
                    )
                })}
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 hover:border-slate-300 hover:text-slate-800"
                >
                    Չեղարկել
                </button>
                <button
                    type="button"
                    onClick={onConfirm}
                    className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[rgb(34,211,238)] to-[rgb(45,212,191)] px-4 py-1.5 text-[11px] font-semibold text-white shadow-sm"
                >
                    Հաստատել ընտրությունները
                    <ChevronRight className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    )
}

/* === TripRow — React.memo === */
const TripRow = React.memo(function TripRow({ t, variant = "big" }) {
    const freeSeats = Math.max(0, (t.seats_total || 0) - (t.seats_taken || 0))
    const isCompany = t.type === "Company"
    const isHighRating = typeof t.rating === "number" && t.rating >= 4.8
    const isLastSeats = freeSeats <= 1

    const badges = [
        isCompany && { label: "Հավաստագրված ընկերություն", type: "company" },
        isHighRating && { label: "Բարձր վարկանիշ", type: "rating" },
        isLastSeats && { label: "Վերջին ազատ տեղերը", type: "last" },
    ].filter(Boolean)

    const ratingText =
        typeof t.rating === "number" ? t.rating.toFixed(1) : "—"

    const priceText =
        typeof t.price_amd === "number"
            ? t.price_amd.toLocaleString("hy-AM")
            : t.price_amd

    const isBig = variant === "big"

    return (
        <div
            className={`flex gap-3 ${isBig
                ? "flex-col md:flex-row md:items-center md:justify-between"
                : "flex-col"
                }`}
        >
            <div className="flex-1 space-y-2">
                {badges.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-medium text-slate-600">
                        {badges.map((badge) => {
                            let Icon = CircleDot
                            let classes =
                                "border-slate-200/80 bg-white/95 text-slate-700"
                            if (badge.type === "company") {
                                Icon = ShieldCheck
                                classes =
                                    "border-emerald-300 bg-emerald-50 text-emerald-800"
                            } else if (badge.type === "rating") {
                                Icon = Star
                                classes =
                                    "border-emerald-200 bg-white/95 text-emerald-700"
                            } else if (badge.type === "last") {
                                Icon = AlertTriangle
                                classes =
                                    "border-slate-300 bg-slate-50 text-slate-800"
                            }

                            return (
                                <span
                                    key={badge.label}
                                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${classes}`}
                                >
                                    <Icon className="h-3 w-3" />
                                    {badge.label}
                                </span>
                            )
                        })}
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1 shadow-sm">
                        <Clock className="h-4 w-4 text-emerald-700" />
                        <span>
                            <strong className="text-slate-900">
                                {t.departure_hhmm}
                            </strong>
                            <ChevronRight className="mx-1 inline h-3.5 w-3.5 text-slate-400" />
                            <strong className="text-slate-900">
                                {t.arrival_hhmm}
                            </strong>
                        </span>
                    </div>
                    {t.duration && (
                        <span className="rounded-full bg-slate-900/5 px-2.5 py-0.5 text-[11px] text-slate-500">
                            {t.duration}
                        </span>
                    )}
                </div>

                <div
                    className={`font-semibold text-slate-900 ${isBig ? "text-[17px] md:text-lg" : "text-[14px]"
                        }`}
                >
                    {t.from_addr} → {t.to_addr}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1">
                        <Car className="h-3.5 w-3.5 text-emerald-700" />{" "}
                        {t.type}
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <UsersIcon className="h-3.5 w-3.5 text-emerald-700" />{" "}
                        Ազատ՝ {freeSeats} / {t.seats_total}
                    </span>
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                        <Star className="h-3.5 w-3.5" /> {ratingText}
                    </span>
                </div>
            </div>

            <div
                className={`mt-1 flex flex-col items-end gap-1.5 text-right ${isBig ? "md:min-w-[180px]" : ""
                    }`}
            >
                <div className="text-[10px] uppercase tracking-wide text-emerald-600">
                    Մեկ ուղևորի համար
                </div>
                <div
                    className={
                        isBig
                            ? "text-xl font-semibold text-emerald-800"
                            : "text-lg font-semibold text-emerald-800"
                    }
                >
                    {priceText} AMD
                </div>
                {t.operator && (
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-1 text-[11px] text-slate-500">
                        <UserRound className="h-3.5 w-3.5 text-slate-400" />{" "}
                        {t.operator}
                    </div>
                )}
                <div className="mt-1 flex items-center gap-1.5">
                    <motion.button
                        type="button"
                        whileHover={{ y: -1, scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[rgb(34,211,238)] to-[rgb(45,212,191)] px-4 py-1.5 text-xs font-semibold text-white shadow-sm"
                    >
                        Մանրամասներ{" "}
                        <ChevronRight className="h-3.5 w-3.5" />
                    </motion.button>
                    {isBig && (
                        <button
                            type="button"
                            className="hidden md:inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 text-[11px] font-medium text-slate-600 hover:border-emerald-200 hover:text-emerald-700"
                        >
                            Պահպանել
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
})
