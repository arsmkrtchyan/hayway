// resources/js/Pages/Explore/ReviewsSection.jsx
import { useEffect, useMemo, useRef, useState, memo } from "react";
import { useForm, usePage } from "@inertiajs/react";
import { Star, Check } from "lucide-react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";

const SLOTS = 3;
const STAR_COUNT = 5;
const STARS = Array.from({ length: STAR_COUNT });
const GRADIENTS = [
    "from-emerald-400 to-cyan-500",
    "from-sky-400 to-indigo-500",
    "from-fuchsia-500 to-rose-500",
    "from-amber-400 to-orange-500",
    "from-teal-400 to-emerald-500",
    "from-cyan-400 to-blue-500",
];

const cardTransition = { duration: 0.6, ease: [0.22, 0.61, 0.36, 1] };
const headerTransition = { duration: 0.45, ease: [0.16, 1, 0.3, 1] };
const card3d = {
    initial: { opacity: 0, rotateY: -24, y: 18, z: 40, scale: 0.96 },
    animate: { opacity: 1, rotateY: 0, y: 0, z: 0, scale: 1 },
    exit: { opacity: 0, rotateY: 18, y: -12, z: -60, scale: 0.94 },
};

const roleLabel = (role) => {
    switch (role) {
        case "driver":
            return "Վարորդ";
        case "company":
            return "Ընկերություն";
        case "admin":
            return "Ադմին";
        default:
            return "Ուղևոր";
    }
};

const getInitial = (value) => (value || "H").trim().charAt(0).toUpperCase() || "H";

const getDisplayRating = (raw) => {
    const normalized = Math.min(5, Math.max(0, raw || 0));
    return Math.round(normalized * 2) / 2;
};

const getReviewKey = (review, fallback = 0) => {
    if (!review) return `empty-${fallback}`;
    if (review.id !== undefined && review.id !== null) return `review-${review.id}`;
    if (review.user?.id && review.date) return `user-${review.user.id}-${review.date}`;
    if (review.date) return `date-${review.date}-${fallback}`;
    const snippet = (review.comment || "").slice(0, 18);
    return `slot-${fallback}-${snippet || "text"}`;
};

const ReviewsGrid = memo(function ReviewsGrid({ reviews }) {
    if (!reviews?.length) {
        return (
            <div className="mt-5 rounded-2xl border border-dashed border-cyan-200 bg-white/60 px-4 py-6 text-center text-sm text-slate-600">
                Առայժմ կարծիքներ չկան։ Դարձիր առաջինը, որը կգրի իր փորձը։
            </div>
        );
    }

    const slotCount = Math.min(SLOTS, reviews.length);
    const slots = Array.from({ length: slotCount }, (_, slot) => reviews.find((r) => r.__slot === slot) || null);

    return (
        <LayoutGroup>
            <div className="mt-5 grid gap-4 md:auto-rows-fr md:grid-cols-3" style={{ perspective: 1400 }}>
                {slots.map((slotReview, slot) => {
                    const displayRating = getDisplayRating(slotReview?.rating);
                    const fullStars = Math.floor(displayRating);
                    const hasHalfStar = displayRating - fullStars === 0.5;
                    const name = slotReview?.user?.name || "HayWay օգտատեր";
                    const avatarUrl = slotReview?.user?.avatar_url || null;
                    const subtitle = slotReview?.user?.role ? roleLabel(slotReview.user.role) : "Օգտատեր";
                    const avatarBg = GRADIENTS[(slotReview?.id ?? slotReview?.__index ?? slot) % GRADIENTS.length];
                    const date = slotReview?.date || "";
                    const cardKey = getReviewKey(slotReview, slotReview?.__index ?? slot);

                    return (
                        <AnimatePresence mode="wait" initial={false} key={slot}>
                            {slotReview && (
                                <motion.div
                                    key={cardKey}
                                    layout
                                    layoutId={cardKey}
                                    initial={card3d.initial}
                                    animate={card3d.animate}
                                    exit={card3d.exit}
                                    transition={{ ...cardTransition, layout: { type: "spring", stiffness: 340, damping: 32, mass: 0.72 } }}
                                    className="flex h-full flex-col rounded-2xl border border-cyan-200/60 bg-white p-3 text-left shadow-lg shadow-cyan-100/50 ring-1 ring-transparent transition-transform duration-200 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-cyan-100/70"
                                    style={{ transformStyle: "preserve-3d" }}
                                    whileHover={{ rotateX: -2, rotateY: 4, scale: 1.01 }}
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
                                        <div className="text-[10px] text-slate-400">{date}</div>
                                    </div>

                                    <p className="flex-1 text-[12px] leading-relaxed text-slate-800">“{slotReview.comment}”</p>

                                    <div className="mt-2.5 flex items-center gap-3">
                                        {avatarUrl ? (
                                            <img src={avatarUrl} alt={name} className="h-9 w-9 rounded-full object-cover shadow-md shadow-cyan-300/40" />
                                        ) : (
                                            <div className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr ${avatarBg} text-[11px] font-semibold text-white shadow-md shadow-cyan-300/40`}>{getInitial(name)}</div>
                                        )}
                                        <div>
                                            <div className="text-[12px] font-semibold text-slate-900">{name}</div>
                                            <div className="text-[11px] text-slate-500">{subtitle}</div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    );
                })}
            </div>
        </LayoutGroup>
    );
});

export default function ReviewsSection({ reviews = [], summary }) {
    const { auth } = usePage().props;
    const user = auth?.user;

    const { data, setData, post, processing, errors, reset, transform } = useForm({
        rating: 0,
        comment: "",
    });

    const [localReviews, setLocalReviews] = useState(() => (Array.isArray(reviews) ? reviews : []));
    const [localSummary, setLocalSummary] = useState(() => summary || { avg_rating: 0, total_reviews: 0, users_count: 0 });

    useEffect(() => {
        setLocalReviews(Array.isArray(reviews) ? reviews : []);
    }, [reviews]);

    useEffect(() => {
        setLocalSummary(summary || { avg_rating: 0, total_reviews: 0, users_count: 0 });
    }, [summary]);

    const [uiMode, setUiMode] = useState("normal");
    const thanksTimerRef = useRef(null);
    const [slotIndices, setSlotIndices] = useState([]);
    const nextReviewRef = useRef(0);
    const slotCycleRef = useRef(0);

    useEffect(
        () => () => {
            if (thanksTimerRef.current) clearTimeout(thanksTimerRef.current);
        },
        [],
    );

    useEffect(() => {
        const len = Array.isArray(localReviews) ? localReviews.length : 0;
        if (len === 0) {
            setSlotIndices([]);
            nextReviewRef.current = 0;
            slotCycleRef.current = 0;
            return;
        }
        const count = Math.min(SLOTS, len);
        const initial = Array.from({ length: count }, (_, i) => i % len);
        setSlotIndices(initial);
        nextReviewRef.current = count % len;
        slotCycleRef.current = 0;
    }, [localReviews]);

    useEffect(() => {
        const len = Array.isArray(localReviews) ? localReviews.length : 0;
        const count = Math.min(SLOTS, len);
        if (len <= 1 || count === 0) return;

        const intervalId = setInterval(() => {
            setSlotIndices((prev) => {
                if (!Array.isArray(prev) || prev.length === 0) return prev;
                const updated = [...prev];
                const targetSlot = slotCycleRef.current % updated.length;
                const nextIndex = nextReviewRef.current % len;
                updated[targetSlot] = nextIndex;
                slotCycleRef.current = (targetSlot + 1) % updated.length;
                nextReviewRef.current = (nextIndex + 1) % len;
                return updated;
            });
        }, 3600);

        return () => clearInterval(intervalId);
    }, [localReviews]);

    const visibleSlots = useMemo(() => {
        const len = Array.isArray(localReviews) ? localReviews.length : 0;
        if (len === 0 || !Array.isArray(slotIndices)) return [];
        return slotIndices
            .map((reviewIndex, slot) => {
                const r = localReviews?.[reviewIndex];
                if (!r) return null;
                return { ...r, __slot: slot, __index: reviewIndex };
            })
            .filter(Boolean);
    }, [slotIndices, localReviews]);

    const avgRating = getDisplayRating(localSummary?.avg_rating ?? 0);
    const totalReviews = Number.isFinite(localSummary?.total_reviews) ? localSummary.total_reviews : 0;
    const totalReviewsLabel = totalReviews.toLocaleString("hy-AM");
    const usersCount = Number.isFinite(localSummary?.users_count) ? localSummary.users_count : 0;
    const usersRounded = usersCount >= 10 ? Math.floor(usersCount / 10) * 10 : usersCount;
    const usersLabel = `${usersRounded}${usersCount >= 10 && usersRounded > 0 ? "+" : ""}`;

    const reviewerStack = useMemo(() => {
        if (Array.isArray(localReviews) && localReviews.length > 0) {
            return localReviews.slice(0, 4).map((r, idx) => ({
                key: r.id ?? idx,
                name: r.user?.name || "HayWay օգտատեր",
                avatar: r.user?.avatar_url || null,
                bg: GRADIENTS[(r.id ?? idx) % GRADIENTS.length],
            }));
        }
        return [];
    }, [localReviews]);

    const submitFeedback = () => {
        const text = (data.comment || "").trim();
        const ratingInt = Math.max(1, Math.min(5, Math.round(data.rating || 0)));
        if (!user || processing || ratingInt < 1 || !text) return;

        if (thanksTimerRef.current) {
            clearTimeout(thanksTimerRef.current);
            thanksTimerRef.current = null;
        }

        transform(() => ({
            rating: ratingInt,
            comment: text,
        }));

        post("/project-reviews", {
            preserveScroll: true,
            preserveState: true,
            replace: true,
            onSuccess: () => {
                const today = new Date().toISOString().slice(0, 10);
                const newReview = {
                    id: Date.now(),
                    rating: ratingInt,
                    comment: text,
                    date: today,
                    user: user
                        ? {
                            id: user.id,
                            name: user.name,
                            role: user.role,
                            avatar_url: user.avatar_path ? `/storage/${user.avatar_path}` : null,
                        }
                        : null,
                };
                setLocalReviews((prev) => [newReview, ...prev]);
                setActiveIndex(0);
                setLocalSummary((prev) => {
                    const count = Number.isFinite(prev?.total_reviews) ? prev.total_reviews : 0;
                    const avg = Number.isFinite(prev?.avg_rating) ? prev.avg_rating : 0;
                    const nextCount = count + 1;
                    const nextAvg = count >= 0 ? ((avg * count + ratingInt) / nextCount) : ratingInt;
                    return {
                        ...prev,
                        total_reviews: nextCount,
                        avg_rating: parseFloat(nextAvg.toFixed(2)),
                    };
                });
                reset();
                setUiMode("thanks");
                thanksTimerRef.current = setTimeout(() => {
                    setUiMode("normal");
                    thanksTimerRef.current = null;
                }, 3500);
            },
            onError: () => setUiMode("normal"),
        });
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
                            <p className="max-w-xl text-sm text-cyan-900/75">Կիսվեք ձեր փորձով՝ պլատֆորմի հարմարության, անվտանգութեան և սպասարկման մասին։ Այս բլոկում ցուցադրվում են իրական արձագանքներ և միջին գնահատականը։</p>
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
                                                <div className="text-[28px] font-extrabold text-cyan-700 sm:text-[32px]">{totalReviewsLabel}</div>
                                                <div className="mt-0.5 text-xs font-semibold text-slate-600">Կարծիքներ HayWay պլատֆորմի մասին</div>
                                                <div className="mt-1 max-w-md text-[13px] text-slate-600">
                                                    Վարկանիշը հաշվարկվում է մեկ ընդհանուր նախագծի համար, ոչ թե առանձին երթուղիների։ Յուրաքանչյուր օգտատեր կարող է թարմացնել իր գնահատականը։
                                                </div>
                                                <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-[11px] text-cyan-800">
                                                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                                    <span className="font-semibold">Միջին գնահատականը՝ {avgRating.toFixed(1)} / 5</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <div className="flex -space-x-2">
                                                    {reviewerStack.length > 0 ? (
                                                        reviewerStack.map((item, idx) =>
                                                            item.avatar ? (
                                                                <img
                                                                    key={item.key}
                                                                    src={item.avatar}
                                                                    alt={item.name}
                                                                    className="h-8 w-8 rounded-full border-2 border-white object-cover shadow-md shadow-cyan-400/40"
                                                                />
                                                            ) : (
                                                                <div
                                                                    key={item.key}
                                                                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gradient-to-tr ${item.bg} text-[11px] font-semibold text-white shadow-md shadow-cyan-400/40`}
                                                                    title={item.name}
                                                                >
                                                                    {getInitial(item.name)}
                                                                </div>
                                                            ),
                                                        )
                                                    ) : (
                                                        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gradient-to-tr from-emerald-400 to-cyan-500 text-[11px] font-semibold text-white shadow-md shadow-cyan-400/40">
                                                            HW
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-[11px] text-slate-700">
                                                    <div className="font-semibold">{usersLabel} օգտատեր</div>
                                                    <div className="text-[10px] text-slate-500">Գրանցված օգտատերեր HayWay-ում</div>
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
                                                    <p className="mt-1 text-[11px] text-emerald-700/95 sm:text-[12px]">Ձեր արձագանքը օգնում է բարելավել պլատֆորմի անվտանգությունն ու հարմարավետությունը։</p>
                                                    <p className="mt-1.5 text-[11px] text-emerald-700/90">Կարող եք ցանկացած պահին թարմացնել ձեր գնահատականը։</p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <ReviewsGrid reviews={visibleSlots} />

                            <div className="mt-6 rounded-2xl border border-dashed border-cyan-300/70 bg-cyan-50 p-3">
                                {!user && (
                                    <div className="mb-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
                                        Մուտք գործիր կամ գրանցվիր, որպեսզի գրես քո փորձը։
                                    </div>
                                )}
                                <form onSubmit={handleFeedbackSubmit}>
                                    <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-semibold text-cyan-900">Քո գնահատականը</span>
                                            <div className="flex items-center gap-1">
                                                {STARS.map((_, i) => {
                                                    const value = i + 1;
                                                    const isActive = data.rating >= value;
                                                    return (
                                                        <button
                                                            key={value}
                                                            type="button"
                                                            onClick={() => setData("rating", value)}
                                                            className="flex h-5 w-5 items-center justify-center"
                                                            disabled={!user}
                                                        >
                                                            <Star className={`h-5 w-5 ${isActive ? "fill-amber-300 text-amber-300" : "text-amber-200"}`} />
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            {data.rating > 0 && <span className="text-[11px] text-slate-500">{data.rating}/5</span>}
                                        </div>
                                        <span className="text-[10px] text-slate-400">Ընտրիր գնահատականը 1-ից 5 աստղ</span>
                                    </div>
                                    {errors.rating && <p className="mb-1 text-[11px] text-rose-600">{errors.rating}</p>}

                                    <p className="mb-1 text-[11px] font-semibold text-cyan-900">Քո փորձը HayWay-ի հետ</p>
                                    <textarea
                                        rows={2}
                                        className="w-full resize-none rounded-2xl border border-cyan-300 bg-white px-3 py-2 text-[12px] text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/80"
                                        placeholder="Գրիր, թե ինչպես անցավ քո ուղևորությունը HayWay-ով"
                                        value={data.comment}
                                        onChange={(e) => setData("comment", e.target.value)}
                                        disabled={processing || !user}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && !e.shiftKey) {
                                                e.preventDefault();
                                                submitFeedback();
                                            }
                                        }}
                                    />
                                    {errors.comment && <p className="mt-1 text-[11px] text-rose-600">{errors.comment}</p>}

                                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                        <button
                                            type="submit"
                                            disabled={!user || processing || !data.comment.trim() || data.rating < 1}
                                            className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#22d3ee] to-[#2dd4bf] px-4 py-2 text-[12px] font-semibold text-white shadow-md transition hover:brightness-110 disabled:opacity-60 sm:w-auto"
                                        >
                                            {!user ? "Մուտք գործիր՝ կարծիք թողնելու համար" : processing ? "Ուղարկվում է…" : "Ուղարկել կարծիքը"}
                                        </button>
                                        <span className="text-[10px] text-slate-500">Գնահատականը վերաբերում է պլատֆորմին, ոչ թե առանձին ուղևորության։</span>
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
