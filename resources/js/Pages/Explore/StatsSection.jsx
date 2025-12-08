// resources/js/Pages/Client/ExploreSections/StatsSection.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

const R = 46;
const CIRCLE_LENGTH = 2 * Math.PI * R;
const VALUE_ANIM_DURATION = 1600;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

const getProgress = (stat) => {
    if (stat.id === "monthly-trips") return 100;
    if (stat.type === "percent") return Math.max(0, Math.min(100, stat.value));
    if (stat.type === "rating") {
        const max = stat.max || 5;
        const percent = (stat.value / max) * 100;
        return Math.max(0, Math.min(100, percent));
    }
    if (stat.type === "absolute") {
        if (!stat.max) return 100;
        const percent = (stat.value / stat.max) * 100;
        return Math.max(0, Math.min(100, percent));
    }
    return 100;
};

function AnimatedValue({ stat, isActive }) {
    const spanRef = useRef(null);

    useEffect(() => {
        if (!spanRef.current) return;
        if (!isActive) {
            spanRef.current.textContent = stat.type === "rating" ? "0.0" : "0";
            return;
        }

        const { type, value } = stat;
        const start = performance.now();
        let frameId;

        const tick = (now) => {
            const t = Math.min(1, (now - start) / VALUE_ANIM_DURATION);
            const eased = easeOutCubic(t);
            let text = "0";

            if (type === "absolute") {
                const current = Math.round(value * eased);
                text = current.toLocaleString("hy-AM");
            } else if (type === "percent") {
                const current = Math.round(value * eased);
                text = String(current);
            } else if (type === "rating") {
                const current = value * eased;
                text = current.toFixed(1);
            }

            if (spanRef.current) {
                spanRef.current.textContent = text;
            }
            if (t < 1) frameId = requestAnimationFrame(tick);
        };

        frameId = requestAnimationFrame(tick);
        return () => frameId && cancelAnimationFrame(frameId);
    }, [stat, isActive]);

    const initialText = stat.type === "rating" ? "0.0" : "0";

    return (
        <span className="text-2xl font-extrabold text-emerald-800" ref={spanRef}>
            {initialText}
        </span>
    );
}

const buildStats = (stats) => {
    const avgRating = Number.isFinite(stats?.avg_rating) ? stats.avg_rating : 0;
    const driverRating = Number.isFinite(stats?.driver_rating) ? stats.driver_rating : avgRating;
    const passengerRating = Number.isFinite(stats?.passenger_rating) ? stats.passenger_rating : avgRating;
    const trips30 = Number.isFinite(stats?.trips_30d) ? stats.trips_30d : 0;
    const acceptRate = Number.isFinite(stats?.accept_rate) ? stats.accept_rate : 0;
    const totalReviews = Number.isFinite(stats?.total_reviews) ? stats.total_reviews : 0;
    const reviewsLabel = totalReviews.toLocaleString("hy-AM");

    return [
        {
            id: "drivers-rating",
            label: "Վարորդների միջին վարկանիշ",
            value: driverRating,
            unit: "/5",
            description: `Հաշվարկված ուղևորների արձագանքներից (${reviewsLabel} կարծիք)։`,
            type: "rating",
            max: 5,
        },
        {
            id: "monthly-trips",
            label: "Ուղևորություններ վերջին 30 օրում",
            value: trips30,
            unit: "",
            description: "Բոլոր հրապարակված ուղևորությունները ըստ departure_at դաշտի։",
            type: "absolute",
        },
        {
            id: "accept-rate",
            label: "Հաստատման տոկոս",
            value: acceptRate,
            unit: "%",
            description: "Ընդունված ride request-ների մասնաբաժինը վերջին 30 օրում։",
            type: "percent",
        },
        {
            id: "passengers-rating",
            label: "Ուղևորների միջին գնահատական",
            value: passengerRating,
            unit: "/5",
            description: "Վարորդների արձագանքներից ձևավորված գնահատական։",
            type: "rating",
            max: 5,
        },
    ];
};

export default function StatsSection({ stats }) {
    const data = useMemo(() => buildStats(stats || {}), [stats]);
    const [isAnimated, setIsAnimated] = useState(false);
    const sectionRef = useRef(null);

    useEffect(() => {
        const el = sectionRef.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.target === el) {
                        setIsAnimated(entry.isIntersecting);
                    }
                });
            },
            { threshold: 0.35 },
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <section ref={sectionRef} className="mt-16 mb-20" id="stats-section">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.5 }} className="text-2xl font-extrabold text-slate-900">
                    Պլատֆորմի հիմնական ցուցանիշներ
                </motion.h2>

                <motion.p initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.45, delay: 0.05 }} className="mt-1 text-sm text-slate-600">
                    Ցուցիչները հաշվարկվում են backend-ի իրական տվյալների հիման վրա (վերջին 30 օր)։
                </motion.p>

                <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }} className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {data.map((stat) => {
                        const progress = isAnimated ? getProgress(stat) : 0;
                        const dashoffset = CIRCLE_LENGTH - (CIRCLE_LENGTH * progress) / 100;

                        return (
                            <motion.div
                                key={stat.id}
                                variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
                                className="flex flex-col items-center rounded-2xl border border-emerald-100 bg-white/90 p-4 text-center shadow-sm shadow-cyan-100/80"
                            >
                                <div className="relative mb-3 h-28 w-28">
                                    <svg viewBox="0 0 120 120" className="h-full w-full">
                                        <defs>
                                            <linearGradient id="stat-circle-grad" x1="0" x2="1" y1="0" y2="1">
                                                <stop offset="0%" stopColor="#22d3ee" />
                                                <stop offset="100%" stopColor="#2dd4bf" />
                                            </linearGradient>
                                        </defs>
                                    <circle cx="60" cy="60" r={R} stroke="#e2e8f0" strokeWidth="10" fill="none" />
                                        <circle
                                            cx="60"
                                            cy="60"
                                            r={R}
                                            stroke="url(#stat-circle-grad)"
                                            strokeWidth="10"
                                            fill="none"
                                            strokeLinecap="round"
                                            strokeDasharray={CIRCLE_LENGTH}
                                            strokeDashoffset={dashoffset}
                                            className="origin-center -rotate-90 transition-[stroke-dashoffset] duration-[1600ms] ease-[cubic-bezier(0.22,0.61,0.36,1)] [filter:drop-shadow(0_0_10px_rgba(45,212,191,0.7))]"
                                        />
                                    </svg>
                                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                                        <AnimatedValue stat={stat} isActive={isAnimated} />
                                        {stat.unit && <span className="text-xs font-semibold text-slate-500">{stat.unit}</span>}
                                    </div>
                                </div>
                                <div className="text-sm font-semibold text-slate-900">{stat.label}</div>
                                <div className="mt-1 text-xs text-slate-600">{stat.description}</div>
                            </motion.div>
                        );
                    })}
                </motion.div>
            </div>
        </section>
    );
}
