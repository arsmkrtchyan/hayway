// resources/js/Pages/Client/ExploreSections/ReviewsSection.jsx
import React, { useEffect, useMemo, useRef, useState, memo } from "react";
import { Star, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const REVIEWS = [
    {
        id: 1,
        name: "Դեմո ուղևոր Ա.",
        role: "Ուղևոր",
        city: "Դեմո քաղաք",
        rating: 4.9,
        date: "2024-08-15",
        text: "Սա demo արձագանք է՝ UI-ն փորձարկելու համար, ոչ թե իրական ուղևորության պատմություն։",
        avatarBg: "from-emerald-400 to-cyan-500",
    },
    {
        id: 2,
        name: "Դեմո ուղևոր Բ.",
        role: "Ուղևոր",
        city: "Demo քաղաք",
        rating: 4.7,
        date: "2024-08-12",
        text: "Placeholder տեքստ, որպեսզի ցույց տանք, թե ինչպես են կարծիքները հերթափոխվում քարտերում։",
        avatarBg: "from-sky-400 to-indigo-500",
    },
    {
        id: 3,
        name: "Դեմո ուղևոր Գ.",
        role: "Ուղևոր",
        city: "Դեմո քաղաք",
        rating: 4.8,
        date: "2024-08-05",
        text: "Գրավոր կարծիք՝ ստեղծված բացառապես նախատիպի համար և չունի իրական տվյալ։",
        avatarBg: "from-fuchsia-500 to-rose-500",
    },
    {
        id: 4,
        name: "Դեմո վարորդ Դ.",
        role: "Վարորդ",
        city: "Demo քաղաք",
        rating: 5.0,
        date: "2024-07-28",
        text: "Վարորդի demo արձագանք՝ նկարագրական նպատակներով, առանց իրական ուղևորի։",
        avatarBg: "from-amber-400 to-orange-500",
    },
    {
        id: 5,
        name: "Դեմո ուղևոր Ե.",
        role: "Ուղևոր",
        city: "Demo քաղաք",
        rating: 4.6,
        date: "2024-07-20",
        text: "Demo feedback՝ ցույց տալու UI-ի copy և աստղերի վիզուալը։",
        avatarBg: "from-teal-400 to-emerald-500",
    },
    {
        id: 6,
        name: "Դեմո օգտատեր Զ.",
        role: "Ուղևոր",
        city: "Demo քաղաք",
        rating: 4.8,
        date: "2024-07-10",
        text: "Սա placeholder է, իրական ֆիդբեք չի պարունակում։",
        avatarBg: "from-cyan-400 to-blue-500",
    },
];

const TOTAL_REVIEWS = 180;
const AVG_RATING = 4.9;
const SLOTS = 3;
const STAR_COUNT = 5;
const STARS = Array.from({ length: STAR_COUNT });
const AVATAR_GRADIENTS = ["from-emerald-400 to-cyan-500", "from-sky-400 to-indigo-500", "from-fuchsia-500 to-rose-500", "from-amber-400 to-orange-500"];

const cardTransition = { duration: 0.6, ease: [0.22, 0.61, 0.36, 1] };
const headerTransition = { duration: 0.45, ease: [0.16, 1, 0.3, 1] };

function getDisplayRating(raw) {
    const normalized = Math.min(5, Math.max(0, raw || 0));
    return Math.round(normalized * 2) / 2;
}

const ReviewsGrid = memo(function ReviewsGrid({ reviews }) {
    return (
        <div className="mt-5 grid gap-4 md:auto-rows-fr md:grid-cols-3">
            {reviews.map((r) => {
                const displayRating = getDisplayRating(r.rating);
                const fullStars = Math.floor(displayRating);
                const hasHalfStar = displayRating - fullStars === 0.5;

                return (
                    <AnimatePresence key={r.__slot} mode="wait" initial={false}>
                        <motion.div
                            key={r.id}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -16 }}
                            transition={cardTransition}
                            className="flex h-full flex-col rounded-2xl border border-cyan-200/60 bg-white p-3 text-left shadow-sm shadow-cyan-100/40 transition-transform duration-150 hover:-translate-y-1"
                        >
                            <div className="mb-1.5 flex items-start justify-between gap-2">
                                <div className="flex items-center gap-1 text-[11px]">
                                    {STARS.map((_, i) => {
                                        const index = i + 1;
                                        let type = "empty";
                                        if (index <= fullStars) type = "full";
                                        else if (index === fullStars + 1 && hasHalfStar) type = "half";

                                        return (
                                            <div key={index} className="relative h-3 w-3">
                                                <Star className="h-3 w-3 text-amber-200" />
                                                {type === "full" && <Star className="absolute inset-0 h-3 w-3 fill-amber-300 text-amber-300" />}
                                                {type === "half" && (
                                                    <div className="absolute left-0 top-0 h-full w-1/2 overflow-hidden">
                                                        <Star className="h-3 w-3 fill-amber-300 text-amber-300" />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                    <span className="ml-1 text-[10px] text-slate-500">({displayRating.toFixed(1)}/5)</span>
                                </div>
                                <div className="text-[10px] text-slate-400">{r.date}</div>
                            </div>

                            <p className="flex-1 text-[12px] leading-relaxed text-slate-800">“{r.text}”</p>

                            <div className="mt-2.5 flex items-center gap-3">
                                <div className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr ${r.avatarBg} text-[11px] font-semibold text-white shadow-md shadow-cyan-300/40`}>{r.name.charAt(0)}</div>
                                <div>
                                    <div className="text-[12px] font-semibold text-slate-900">{r.name}</div>
                                    <div className="text-[11px] text-slate-500">
                                        {r.role} · {r.city}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                );
            })}
        </div>
    );
});

export default function ReviewsSection() {
    const [feedback, setFeedback] = useState("");
    const [feedbackRating, setFeedbackRating] = useState(0);
    const [sending, setSending] = useState(false);
    const [uiMode, setUiMode] = useState("normal");
    const thanksTimerRef = useRef(null);

    const [slotIndices, setSlotIndices] = useState(() => {
        const count = Math.min(SLOTS, REVIEWS.length || 0);
        return Array.from({ length: count }, (_, i) => i);
    });

    const nextIndexRef = useRef(SLOTS);
    const slotPointerRef = useRef(0);

    useEffect(
        () => () => {
            if (thanksTimerRef.current) clearTimeout(thanksTimerRef.current);
        },
        [],
    );

    useEffect(() => {
        if (REVIEWS.length <= SLOTS) return;

        const intervalId = setInterval(() => {
            setSlotIndices((prev) => {
                if (REVIEWS.length <= prev.length) return prev;
                const slotsCount = prev.length;
                const nextSlot = slotPointerRef.current % slotsCount;
                const used = new Set(prev);
                let nextIndex = nextIndexRef.current % REVIEWS.length;
                let guard = 0;
                while (used.has(nextIndex) && guard < REVIEWS.length) {
                    nextIndex = (nextIndex + 1) % REVIEWS.length;
                    guard++;
                }
                const newIndices = [...prev];
                newIndices[nextSlot] = nextIndex;
                nextIndexRef.current = (nextIndex + 1) % REVIEWS.length;
                slotPointerRef.current = (nextSlot + 1) % slotsCount;
                return newIndices;
            });
        }, 5000);

        return () => clearInterval(intervalId);
    }, []);

    const visibleSlots = useMemo(
        () =>
            slotIndices
                .map((reviewIndex, slot) => {
                    const r = REVIEWS[reviewIndex];
                    if (!r) return null;
                    return { ...r, __slot: slot };
                })
                .filter(Boolean),
        [slotIndices],
    );

    const submitFeedback = () => {
        const text = feedback.trim();
        const ratingInt = Math.min(5, Math.max(1, Math.floor(feedbackRating)));
        if (!text || sending || ratingInt < 1) return;

        if (thanksTimerRef.current) {
            clearTimeout(thanksTimerRef.current);
            thanksTimerRef.current = null;
        }
        setSending(true);

        thanksTimerRef.current = setTimeout(() => {
            setSending(false);
            setFeedback("");
            setFeedbackRating(0);
            setUiMode("thanks");
            thanksTimerRef.current = setTimeout(() => {
                setUiMode("normal");
                thanksTimerRef.current = null;
            }, 3500);
        }, 700);
    };

    const handleFeedbackSubmit = (e) => {
        e.preventDefault();
        submitFeedback();
    };

    return (
        <section className="mt-16 mb-20" id="reviews-section">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                <div className="relative overflow-hidden rounded-[32px] border border-cyan-200/80 bg-gradient-to-br from-sky-50 via-cyan-50 to-emerald-50 shadow-xl">
                    <div className="relative px-5 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-10">
                        <div className="flex flex-col gap-2">
                            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">Հաճախորդների կարծիքներ</h2>
                            <p className="text-2xl font-extrabold text-slate-900 sm:text-3xl">Ինչպես են HayWay-ով ճանապարհորդում ուղևորներն ու վարորդները</p>
                            <p className="max-w-xl text-sm text-cyan-900/75">Demo բլոկ է՝ placeholder իրական տվյալների համար. Արձագանքները գեներացված են UI նախատիպի համար և չեն ներկայացնում իրական ուղևորներ։</p>
                        </div>

                        <div className="mt-5 rounded-[26px] border border-cyan-100 bg-white px-4 py-4 shadow-md sm:px-5 sm:py-5">
                            <div className="relative min-h-[160px]">
                                <AnimatePresence mode="wait">
                                    {uiMode === "normal" ? (
                                        <motion.div
                                            key="stats"
                                            initial={{ opacity: 0, y: 8, scale: 0.98 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -8, scale: 0.98 }}
                                            transition={headerTransition}
                                            className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
                                        >
                                            <div>
                                                <div className="text-[28px] font-extrabold text-cyan-700 sm:text-[32px]">{TOTAL_REVIEWS.toLocaleString("hy-AM")}+</div>
                                                <div className="mt-0.5 text-xs font-semibold text-slate-600">Կարծիքներ HayWay պլատֆորմի մասին</div>
                                                <div className="mt-1 max-w-md text-[13px] text-slate-600">Ուղևորներն ու վարորդները կիսվում են իրենց փորձով՝ անվտանգության, հարմարության և գների թափանցիկության մասին։</div>
                                                <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-[11px] text-cyan-800">
                                                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                                    <span className="font-semibold">Միջին գնահատականը՝ {getDisplayRating(AVG_RATING).toFixed(1)} / 5</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <div className="flex -space-x-2">
                                                    {AVATAR_GRADIENTS.map((bg, i) => (
                                                        <div key={bg} className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gradient-to-tr ${bg} text-[11px] font-semibold text-white shadow-md shadow-cyan-400/40`}>
                                                            {i + 1}
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="text-[11px] text-slate-700">
                                                    <div className="font-semibold">5,000+ demo օգտատեր</div>
                                                    <div className="text-[10px] text-slate-500">սիմուլացված ցուցիչ է՝ UI-ն ներկայանալու համար։</div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="thanks"
                                            initial={{ opacity: 0, y: 8, scale: 0.98 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -8, scale: 0.98 }}
                                            transition={headerTransition}
                                            className="flex justify-center"
                                        >
                                            <div className="flex max-w-2xl items-start gap-4 rounded-3xl border border-emerald-300 bg-emerald-50 px-5 py-4 shadow-md sm:px-6 sm:py-5">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md">
                                                    <Check className="h-6 w-6" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-emerald-900 sm:text-[15px]">Շնորհակալություն, ձեր կարծիքը կարևոր է մեզ համար։</p>
                                                    <p className="mt-1 text-[11px] text-emerald-700/95 sm:text-[12px]">Ձեր արձագանքը օգնում է մեզ ավելի լավ հասկանալ ուղևորների և վարորդների սպասումները, որպեսզի բարելավենք ճանապարհի հարմարությունն ու անվտանգության մակարդակը։</p>
                                                    <p className="mt-1.5 text-[11px] text-emerald-700/90">HayWay թիմը պարբերաբար վերլուծում է ստացած կարծիքները և դրանց հիման վրա կատարելագործում հավելվածի ֆունկցիոնալը, սերվերային մասի արագագործությունը և ընդհանուր օգտագործողի փորձը։</p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <ReviewsGrid reviews={visibleSlots} />

                            <div className="mt-6 rounded-2xl border border-dashed border-cyan-300/70 bg-cyan-50 p-3">
                                <form onSubmit={handleFeedbackSubmit}>
                                    <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-semibold text-cyan-900">Քո գնահատականը</span>
                                            <div className="flex items-center gap-1">
                                                {STARS.map((_, i) => {
                                                    const value = i + 1;
                                                    const isActive = feedbackRating >= value;
                                                    return (
                                                        <button key={value} type="button" onClick={() => setFeedbackRating(value)} className="flex h-5 w-5 items-center justify-center">
                                                            <Star className={`h-5 w-5 ${isActive ? "fill-amber-300 text-amber-300" : "text-amber-200"}`} />
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            {feedbackRating > 0 && <span className="text-[11px] text-slate-500">{feedbackRating}/5</span>}
                                        </div>
                                        <span className="text-[10px] text-slate-400">Ընտրիր գնահատականը 1-ից 5 աստղ</span>
                                    </div>

                                    <p className="mb-1 text-[11px] font-semibold text-cyan-900">Քո փորձը HayWay-ի հետ</p>
                                    <textarea
                                        rows={2}
                                        className="w-full resize-none rounded-2xl border border-cyan-300 bg-white px-3 py-2 text-[12px] text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/80"
                                        placeholder="Գրիր, թե ինչպես անցավ քո ուղևորությունը HayWay-ով"
                                        value={feedback}
                                        onChange={(e) => setFeedback(e.target.value)}
                                        disabled={sending}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && !e.shiftKey) {
                                                e.preventDefault();
                                                submitFeedback();
                                            }
                                        }}
                                    />

                                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                        <button
                                            type="submit"
                                            disabled={sending || !feedback.trim() || feedbackRating < 1}
                                            className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#22d3ee] to-[#2dd4bf] px-4 py-2 text-[12px] font-semibold text-white shadow-md transition hover:brightness-110 disabled:opacity-60 sm:w-auto"
                                        >
                                            {sending ? "Ուղարկվում է…" : "Ուղարկել կարծիքը"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
