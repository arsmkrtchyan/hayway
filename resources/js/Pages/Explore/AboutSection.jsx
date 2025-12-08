// resources/js/Pages/Explore/AboutSection.jsx

import React from "react";
import { ShieldCheck, Clock, Map as MapIcon, Star } from "lucide-react";

const FEATURE_ITEMS = [
    {
        icon: ShieldCheck,
        title: "Անվտանգություն",
        text: "Վարորդների ստուգում, ուղևորների գնահատականներ և feedback.",
        extra: "Վարորդների անձնական տվյալների ստուգում, մեքենայի փաստաթղթերի վավերացում և support 24/7․",
    },
    {
        icon: Clock,
        title: "Արագություն",
        text: "Որոնում real-time ցուցադրությամբ և արագ հայտավորում.",
        extra: "Smart match դեպի ամենամոտ վարորդ, push notification-ներ և ուղու live թարմացում քարտեզի վրա։",
    },
    {
        icon: MapIcon,
        title: "Ճանապարհ",
        text: "Հարմար երթուղի և meet-point առաջարկներ.",
        extra: "Խելացի meet-point ընտրություն, միջանկյալ կանգառներ և ուղու օպտիմալացում ըստ ժամանակի ու գնի։",
    },
    {
        icon: Star,
        title: "Վարկանիշներ",
        text: "Թափանցիկ գնահատում՝ review-ներով և պատմությամբ.",
        extra: "Վարորդի և ուղևորի պատմություն, review-ների ֆիլտր և խնդիրների արագ լուծում support թիմի կողմից։",
    },
];

const STARS = Array.from({ length: 5 });

function Stars({ rating }) {
    const safe = Math.max(0, Math.min(5, Number.isFinite(rating) ? rating : 0));

    return (
        <div className="flex items-center gap-1 text-amber-400">
            {STARS.map((_, i) => {
                const fill = Math.min(1, Math.max(0, safe - i));
                const clip = `${(1 - fill) * 100}%`;

                return (
                    <span key={i} className="relative inline-flex h-4 w-4">
                        <Star className="absolute inset-0 h-4 w-4 text-amber-200" />
                        <Star className="absolute inset-0 h-4 w-4 text-amber-400" style={{ clipPath: `inset(0 ${clip} 0 0)` }} />
                    </span>
                );
            })}
        </div>
    );
}

function AboutSection({ rating, reviewsCount }) {
    const avgRating = Number.isFinite(rating) ? rating : 4.8;
    const totalReviews = Number.isFinite(reviewsCount) ? Math.max(0, reviewsCount) : 0;
    const totalReviewsLabel = totalReviews.toLocaleString("hy-AM");

    return (
        <section className="mt-16 mb-10">
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
                <h2 className="text-2xl font-extrabold text-slate-900">Ինչու HayWay</h2>
                <p className="mt-1 text-sm text-slate-600">Պլատֆորմ, որը միավորում է տաքսիի արագությունը և համատեղ ուղևորության գինը։</p>

                <div className="mt-6">
                    <div className="relative overflow-hidden rounded-[32px] border border-cyan-100 bg-white/95 px-6 py-6 shadow-[0_22px_55px_rgba(34,197,235,0.28)] backdrop-blur-xl sm:px-8 sm:py-7">
                        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.22),transparent_55%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.18),transparent_55%)]" />

                        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-start">
                            <div className="flex-1 space-y-2">
                                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-600">Հարմար, անվտանգ ճանապարհորդություն</p>
                                <p className="text-lg font-semibold text-slate-900 sm:text-xl">Գտի՛ր մեքենա Հայաստանի քաղաքների միջև՝ մի քանի սեղմումով։</p>
                                <p className="max-w-xl text-[13px] leading-relaxed text-slate-600">
                                    HayWay-ը օգնում է արագ գտնել ուղևորություն, ընտրել meet-point, տեսնել վարորդի վարկանիշները և կիսել ճանապարհի արժեքը մյուս ուղևորների հետ։
                                </p>
                            </div>

                            <div className="flex shrink-0 items-center gap-4 md:flex-col md:items-end">
                                <div className="text-right">
                                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ընդհանուր գնահատական</div>
                                    <div className="mt-1 flex items-baseline justify-end gap-1">
                                        <span className="text-2xl font-extrabold text-slate-900">{avgRating.toFixed(1)}</span>
                                        <span className="text-sm text-slate-500">/5</span>
                                    </div>
                                    <div className="text-[11px] text-slate-500">Հիմնված {totalReviewsLabel} գնահատականի վրա</div>
                                </div>

                                <Stars rating={avgRating} />
                            </div>
                        </div>

                        <div className="relative z-10 mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {FEATURE_ITEMS.map(({ icon: Icon, title, text, extra }) => (
                                <article key={title} className="group flex h-full flex-col rounded-2xl border border-cyan-100 bg-cyan-50/80 p-4 text-left shadow-sm transition hover:border-emerald-300 hover:bg-white hover:shadow-[0_18px_40px_rgba(34,197,235,0.45)]">
                                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-400 to-cyan-400 text-white shadow-[0_0_16px_rgba(34,211,238,0.75)]">
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    <h3 className="mt-3 text-sm font-semibold text-slate-900">{title}</h3>
                                    <p className="mt-1 text-[13px] text-slate-700">{text}</p>
                                    <p className="mt-1 text-[11px] leading-snug text-slate-500">{extra}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default AboutSection;
