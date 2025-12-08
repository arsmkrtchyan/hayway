// resources/js/Pages/Explore/PopularRoutesSection.jsx

import React from "react"
import { motion } from "framer-motion"
import {
    MapPin,
    Car,
    Users as UsersIcon,
    Clock,
    ChevronRight,
} from "lucide-react"

// === STATIC DATA ===
const POPULAR_ROUTES = [
    {
        id: "evn-gyu",
        from: "Երևան",
        to: "Գյումրի",
        tripsPerDay: 26,
        avgPriceAmd: 3500,
        avgDuration: "1ժ 40ր",
        demandLabel: "Շատ բարձր պահանջարկ",
        highlight: true,
    },
    {
        id: "evn-vnz",
        from: "Երևան",
        to: "Վանաձոր",
        tripsPerDay: 18,
        avgPriceAmd: 3000,
        avgDuration: "1ժ 50ր",
        demandLabel: "Բարձր պահանջարկ",
        highlight: false,
    },
    {
        id: "evn-svn",
        from: "Երևան",
        to: "Սևան",
        tripsPerDay: 15,
        avgPriceAmd: 2500,
        avgDuration: "1ժ 10ր",
        demandLabel: "Հանրաճանաչ հանգստյան օրերին",
        highlight: false,
    },
    {
        id: "gyu-evn",
        from: "Գյումրի",
        to: "Երևան",
        tripsPerDay: 20,
        avgPriceAmd: 3500,
        avgDuration: "1ժ 40ր",
        demandLabel: "Վերադարձի ամենաշատ ուղևորությունը",
        highlight: false,
    },
]

// === SUBCOMPONENT ===

function PopularRouteCard({ route, index }) {
    const {
        id,
        from,
        to,
        tripsPerDay,
        avgPriceAmd,
        avgDuration,
        demandLabel,
        highlight,
    } = route

    const cardBorder = highlight
        ? "border-emerald-300/80 shadow-[0_18px_40px_rgba(45,212,191,0.35)]"
        : "border-slate-200"

    const demandPillClass = highlight
        ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow"
        : "bg-emerald-50 text-emerald-700"

    return (
        <motion.article
            key={id}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{
                duration: 0.45,
                delay: index * 0.05,
                ease: [0.22, 0.61, 0.36, 1],
            }}
            className={`flex h-full flex-col rounded-2xl border bg-white/95 p-4 shadow-sm backdrop-blur-sm transition hover:-translate-y-1 hover:shadow-xl ${cardBorder}`}
        >
            {/* Վերևի մաս — զբաղեցնում է ամբողջ ազատ տեղը */}
            <div className="flex-1 flex flex-col">
                <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                            <Car className="h-3.5 w-3.5" />
                            <span>Միջքաղաքային ուղևորություն</span>
                        </div>
                        <div className="mt-1 text-base font-bold text-slate-900">
                            {from}{" "}
                            <ChevronRight className="mx-1 inline h-4 w-4 text-slate-400" />
                            {to}
                        </div>
                    </div>

                    <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold ${demandPillClass}`}
                    >
                        {demandLabel}
                    </span>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1">
                        <Clock className="h-3.5 w-3.5 text-emerald-600" />
                        Միջին տևողությունը՝{" "}
                        <span className="font-semibold text-slate-900">
                            {avgDuration}
                        </span>
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1">
                        <UsersIcon className="h-3.5 w-3.5 text-emerald-600" />
                        Մինչև{" "}
                        <span className="font-semibold text-slate-900">
                            {tripsPerDay}
                        </span>{" "}
                        ուղևորություն օրական
                    </span>
                </div>
            </div>

            {/* Ներքևի մաս — միշտ նույն բարձրության վրա, բոլոր քարտերի համար */}
            <div className="mt-3 flex items-end justify-between">
                <div>
                    <div className="text-[11px] text-slate-500">
                        Միջին գինը մեկ ուղևորի համար
                    </div>
                    <div className="text-xl font-extrabold text-emerald-700">
                        {avgPriceAmd.toLocaleString("hy-AM")} AMD
                    </div>
                </div>

                <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[rgb(34,211,238)] to-[rgb(45,212,191)] px-3 py-1.5 text-[11px] font-semibold text-white shadow-[0_10px_22px_rgba(34,211,238,0.65)]"
                >
                    Տեսնել ուղևորությունները
                    <ChevronRight className="h-3 w-3" />
                </button>
            </div>
        </motion.article>
    )
}

// === MAIN SECTION ===

export default function PopularRoutesSection() {
    return (
        <section className="mt-14">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h2 className="text-2xl font-extrabold text-slate-900">
                            Ամենաշատ պահանջվող ուղղությունները
                        </h2>
                        <p className="mt-1 text-sm text-slate-600">
                            Այս ցուցակը demo է․ ապագայում կլցվի իրական տվյալներով backend-ից՝ ըստ
                            հայտերի և ուղևորությունների քանակի։
                        </p>
                    </div>

                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-600 sm:mt-0">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shadow-sm shadow-emerald-200/70">
                            <MapPin className="h-3 w-3" />
                        </div>
                        <span>
                            Ցույց ենք տալիս ամենաշատ օգտագործվող միջքաղաքային ուղղությունները
                            HayWay-ում։
                        </span>
                    </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {POPULAR_ROUTES.map((route, index) => (
                        <PopularRouteCard key={route.id} route={route} index={index} />
                    ))}
                </div>
            </div>
        </section>
    )
}
