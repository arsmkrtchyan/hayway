import React, { useState } from "react";
import { Head, Link } from "@inertiajs/react";
import { motion, AnimatePresence } from "framer-motion";
import { Car, User2, Building2, ShieldPlus, ChevronRight } from "lucide-react";

/** Emerald/Cyan Light Theme — RegisterChoice (только UI, бэкенд/роуты не трогаем) */

const ROLES = [
    {
        key: "client",
        title: "Հաճախորդ",
        desc: "Արագ մեկնարկ՝ ամրագրումներ և պրոֆիլ",
        colorFrom: "from-emerald-400",
        colorTo: "to-cyan-400",
        Icon: User2,
        bullets: ["Անձնային տվյալներ", "Հեռախոսահամար + հաստատում", "Քաղաք և հասցե"],
    },
    {
        key: "driver",
        title: "Վարորդ",
        desc: "Լուսանկարների վերբեռնում, հաստատման սպասում",
        colorFrom: "from-teal-400",
        colorTo: "to-emerald-300",
        Icon: Car,
        bullets: ["Վարորդական իրավունք", "Մեքենայի տվյալներ", "Լուսանկարներ և սելֆի", "Անվտանգության ստուգում"],
    },
    {
        key: "company",
        title: "Տաքսոպարկ",
        desc: "Ընկերության գրանցում և աշխատակիցների կառավարում",
        colorFrom: "from-cyan-400",
        colorTo: "to-teal-300",
        Icon: Building2,
        bullets: ["Իրավաբանական տվյալներ", "Պայմանագրեր և վերահսկում", "Գործառնական կարգավորումներ"],
    },
];

// безопасно строим URL (работает и с Ziggy, и без него)
const roleRoute = (key) => {
    const map = {
        client: typeof route === "function" ? route("register.client") : "/register/client",
        driver: typeof route === "function" ? route("register.driver") : "/register/driver",
        company: typeof route === "function" ? route("register.company") : "/register/company",
    };
    return map[key];
};

export default function RegisterChoice() {
    const [picked, setPicked] = useState(null);
    const selectedRole = ROLES.find((x) => x.key === picked) || null;

    const choose = (key) => {
        if (picked === key) window.location.href = roleRoute(key);
        else setPicked(key);
    };

    return (
        <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(80%_60%_at_50%_-10%,#e6fff5,transparent),linear-gradient(to_bottom_right,#f8fafc,#ecfdf5)] text-slate-900">
            <Head title="Register" />

            {/* мягкие изумрудные «пятна» */}
            <motion.div
                className="pointer-events-none absolute -top-24 left-1/3 h-80 w-80 rounded-full bg-emerald-300/30 blur-3xl"
                animate={{ opacity: [0.2, 0.7, 0.2] }}
                transition={{ repeat: Infinity, duration: 9 }}
            />
            <motion.div
                className="pointer-events-none absolute -bottom-24 right-1/4 h-96 w-96 rounded-full bg-cyan-300/25 blur-3xl"
                animate={{ opacity: [0.15, 0.6, 0.15] }}
                transition={{ repeat: Infinity, duration: 11 }}
            />

            <div className="relative z-10 mx-auto max-w-6xl px-4 pb-16 pt-16">
                {/* бренд */}
                <div className="mb-8 flex items-center gap-3">
                    <div className="relative">
                        <div className="absolute -inset-1 rounded-xl bg-emerald-400/30 blur-lg" />
                        <div className="relative grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-400 text-white shadow-lg">
                            <Car className="h-6 w-6" />
                        </div>
                    </div>
                    <div>
                        <div className="text-xl font-bold tracking-tight">Taxi Platform</div>
                        <div className="text-xs uppercase tracking-wider text-emerald-700/80">Գրանցում</div>
                    </div>
                </div>

                {/* заголовок */}
                <div className="mb-10">
                    <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Ընտրեք հաշվի տեսակը</h1>
                    <p className="mt-2 text-sm text-slate-600">Սեղմեք քարտիկներից մեկը՝ շարունակելու համար</p>
                </div>

                {/* карточки ролей */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    {ROLES.map((r) => (
                        <Card key={r.key} role={r} active={picked === r.key} onClick={() => choose(r.key)} />
                    ))}
                </div>

                {/* детали выбранной роли */}
                <AnimatePresence initial={false} mode="wait">
                    {selectedRole && (
                        <motion.div
                            layout
                            key={selectedRole.key}
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            transition={{ layout: { duration: 0.25 }, type: "spring", stiffness: 420, damping: 30, mass: 0.6 }}
                            className="mt-8 overflow-hidden rounded-3xl border border-emerald-200/60 bg-white p-6 shadow-xl md:p-8"
                        >
                            <Details role={selectedRole} />
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="pointer-events-none mt-10 overflow-hidden rounded-2xl">
                    <CheckeredStripe />
                </div>
            </div>
        </div>
    );
}

function Card({ role, active, onClick }) {
    const { title, desc, colorFrom, colorTo, Icon } = role;
    return (
        <motion.button
            layout
            type="button"
            onClick={onClick}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.35, layout: { duration: 0.25 } }}
            className="group relative block w-full overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-xl outline-none transition hover:-translate-y-0.5 hover:shadow-2xl focus-visible:ring-2 focus-visible:ring-emerald-400/40 md:p-6"
        >
            {/* мягкая подсветка при hover/active */}
            <div
                className={`pointer-events-none absolute -inset-px rounded-[22px] bg-gradient-to-r ${colorFrom} ${colorTo} ${
                    active ? "opacity-20" : "opacity-0"
                } blur-md transition duration-500 group-hover:opacity-15`}
            />
            <div className="relative mb-4 flex items-center gap-2">
                <div className="relative">
                    <div className="absolute -inset-2 rounded-xl bg-emerald-200/40 blur" />
                    <div className="relative grid h-10 w-10 place-items-center rounded-xl bg-emerald-50">
                        <Icon className="h-6 w-6 text-emerald-600" />
                    </div>
                </div>
                <span className="text-xs uppercase tracking-wider text-emerald-700/80">Գրանցում</span>
            </div>
            <h3 className="relative text-xl font-bold md:text-2xl">{title}</h3>
            <p className="relative mt-2 text-sm leading-relaxed text-slate-600">{desc}</p>
            <div className="relative mt-5 inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 transition group-hover:bg-emerald-100">
                <ShieldPlus className="h-4 w-4" /> Սկսել գրանցումը
            </div>
        </motion.button>
    );
}

function Details({ role }) {
    const { key, title, bullets } = role;
    const href = roleRoute(key);

    return (
        <div className="grid items-start gap-6 md:grid-cols-[1.2fr_1fr]">
            <div>
                <h2 className="text-xl font-semibold md:text-2xl">{title} — քայլեր</h2>
                <ul className="mt-4 space-y-2">
                    {bullets.map((b, i) => (
                        <li key={i} className="flex items-center gap-2 text-slate-700">
                            <ChevronRight className="h-4 w-4 text-emerald-600" /> {b}
                        </li>
                    ))}
                </ul>
            </div>
            <div>
                <Link
                    href={href}
                    className="group relative inline-flex w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-400 px-6 py-3.5 font-semibold text-white shadow-2xl transition hover:brightness-95 active:scale-[0.99]"
                >
          <span
              className="absolute inset-0 -z-10 opacity-40 blur-xl"
              style={{ background: "radial-gradient(70% 70% at 50% 50%, rgba(255,255,255,0.7), transparent)" }}
          />
                    Շարունակել
                </Link>
                <p className="mt-3 text-center text-xs text-slate-500">* Ընտրեք քարտը, հետո «Շարունակել»</p>
            </div>
        </div>
    );
}

function CheckeredStripe() {
    return (
        <svg viewBox="0 0 600 40" className="h-10 w-full">
            <defs>
                <pattern id="chk-emerald" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                    <rect x="0" y="0" width="10" height="10" fill="#10b981" opacity="0.18" />
                    <rect x="10" y="10" width="10" height="10" fill="#10b981" opacity="0.18" />
                    <rect x="0" y="0" width="20" height="20" fill="none" stroke="rgba(16,185,129,0.18)" />
                </pattern>
                <linearGradient id="grad-emerald" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
            </defs>
            <rect x="0" y="0" width="600" height="40" fill="url(#chk-emerald)" />
            <rect x="0" y="0" width="600" height="40" fill="url(#grad-emerald)" opacity="0.20" />
        </svg>
    );
}
