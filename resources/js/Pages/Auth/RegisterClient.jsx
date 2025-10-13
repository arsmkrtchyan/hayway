//
// import React, { useMemo, useState } from "react";
// import { Head, Link, useForm, usePage } from "@inertiajs/react";
// import { motion } from "framer-motion";
// import {
//     Car, Mail, Lock, User2, Eye, EyeOff,
//     ShieldCheck, CheckCircle2, XCircle
// } from "lucide-react";
//
// const r = (name, fallback) =>
//     typeof route === "function" ? route(name) : fallback;
//
// export default function RegisterClient() {
//     const metaCsrf = document.querySelector('meta[name="csrf-token"]')?.content || "";
//     const { csrf_token } = usePage().props || {};
//
//     const [showPass, setShowPass] = useState(false);
//     const [showPass2, setShowPass2] = useState(false);
//     const [localMsg, setLocalMsg] = useState("");
//
//     const { data, setData, post, processing, errors, reset } = useForm({
//         name: "",
//         email: "",
//         password: "",
//         password_confirmation: "",
//         _token: csrf_token || metaCsrf,
//     });
//
//     const passScore = useMemo(() => scorePassword(data.password), [data.password]);
//     const canSubmit = useMemo(() => {
//         const emailOk = /\S+@\S+\.[\w-]{2,}/i.test(data.email);
//         const nameOk = data.name.trim().length >= 2;
//         const passOk =
//             data.password.length >= 6 &&
//             data.password === data.password_confirmation;
//         return emailOk && nameOk && passOk && !processing;
//     }, [data, processing]);
//
//     function submit(e) {
//         e.preventDefault();
//         setLocalMsg("");
//         post(r("register.client", "/register/client"), {
//             headers: metaCsrf ? { "X-CSRF-TOKEN": metaCsrf } : {},
//             onSuccess: () => {
//                 setLocalMsg("Գրանցումը հաջողվեց 🎉");
//                 reset("password", "password_confirmation");
//             },
//         });
//     }
//
//     return (
//         <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-zinc-950 via-amber-900/20 to-amber-500/10">
//             <Head title="Գրանցում (հաճախորդ)" />
//
//             {/* фоновые акценты */}
//             <motion.div
//                 className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-amber-500/20 blur-3xl"
//                 animate={{ opacity: [0.5, 0.9, 0.5] }}
//                 transition={{ repeat: Infinity, duration: 8 }}
//             />
//             <motion.div
//                 className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-yellow-300/10 blur-3xl"
//                 animate={{ opacity: [0.3, 0.7, 0.3] }}
//                 transition={{ repeat: Infinity, duration: 10 }}
//             />
//
//             {/* «дорога» */}
//             <div className="absolute inset-x-0 top-10 select-none">
//                 <motion.div
//                     className="mx-auto flex max-w-6xl items-center gap-3 px-6"
//                     initial={{ x: "-110%" }}
//                     animate={{ x: ["-110%", "110%"] }}
//                     transition={{ repeat: Infinity, duration: 18, ease: "linear" }}
//                 >
//                     <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-amber-400/80 to-transparent" />
//                     <div className="relative">
//                         <div className="absolute -inset-3 rounded-2xl bg-amber-400/30 blur-xl" />
//                         <div className="relative flex items-center gap-2 rounded-2xl border border-amber-300/50 bg-amber-500 text-zinc-900 px-4 py-2 shadow-2xl">
//                             <Car className="h-5 w-5" />
//                             <span className="font-semibold tracking-wide">TAXI</span>
//                         </div>
//                     </div>
//                     <div className="h-[2px] flex-1 bg-gradient-to-l from-transparent via-amber-400/80 to-transparent" />
//                 </motion.div>
//             </div>
//
//             {/* контент */}
//             <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-16">
//                 <div className="mx-auto w-[96%] max-w-lg">
//                     {/* бренд */}
//                     <div className="mb-6 flex items-center gap-3">
//                         <div className="relative">
//                             <div className="absolute -inset-1 rounded-xl bg-amber-400/30 blur-lg" />
//                             <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-yellow-400 text-zinc-900 shadow-lg">
//                                 <User2 className="h-6 w-6" />
//                             </div>
//                         </div>
//                         <div>
//                             <div className="text-xl font-bold tracking-tight text-white">Poputi Taxi</div>
//                             <div className="text-xs uppercase tracking-wider text-amber-200/80">
//                                 Հաճախորդի գրանցում
//                             </div>
//                         </div>
//                     </div>
//
//                     {/* карточка */}
//                     <motion.div
//                         layout
//                         initial={{ opacity: 0, y: 24 }}
//                         animate={{ opacity: 1, y: 0 }}
//                         transition={{ type: "spring", stiffness: 420, damping: 30, mass: 0.6 }}
//                         className="relative overflow-hidden rounded-3xl border border-white/5 bg-zinc-900/70 p-6 shadow-2xl backdrop-blur-xl md:p-8"
//                     >
//                         <div className="mb-6">
//                             <h1 className="text-2xl font-semibold tracking-tight text-white">
//                                 Ստեղծել հաշիվ
//                             </h1>
//                             <p className="mt-1 text-sm text-zinc-200/90">
//                                 Լրացրեք դաշտերը՝ շարունակելու համար
//                             </p>
//                             {localMsg && (
//                                 <div className="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-200">
//                                     {localMsg}
//                                 </div>
//                             )}
//                         </div>
//
//                         <form onSubmit={submit} className="space-y-5">
//                             <Field
//                                 id="name"
//                                 label="Անուն"
//                                 icon={<User2 className="h-5 w-5 text-amber-200" />}
//                                 value={data.name}
//                                 onChange={(v) => setData("name", v)}
//                                 error={errors.name}
//                                 placeholder="Անուն Ազգանուն"
//                             />
//
//                             <Field
//                                 id="email"
//                                 label="Էլ․ հասցե"
//                                 type="email"
//                                 icon={<Mail className="h-5 w-5 text-amber-200" />}
//                                 value={data.email}
//                                 onChange={(v) => setData("email", v)}
//                                 error={errors.email}
//                                 placeholder="name@example.com"
//                             />
//
//                             {/* пароль */}
//                             <div>
//                                 <div className="mb-1 flex items-center justify-between">
//                                     <label htmlFor="password" className="block text-sm text-zinc-200">
//                                         Գաղտնաբառ
//                                     </label>
//                                     <button
//                                         type="button"
//                                         onClick={() => setShowPass((v) => !v)}
//                                         className="rounded-lg px-2 py-1 text-xs text-amber-200/90 transition hover:bg-amber-400/10"
//                                     >
//                                         {showPass ? "Թաքցնել" : "Ցույց տալ"}
//                                     </button>
//                                 </div>
//                                 <div className="relative">
//                                     <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-70">
//                                         <Lock className="h-5 w-5 text-amber-200" />
//                                     </div>
//                                     <input
//                                         id="password"
//                                         type={showPass ? "text" : "password"}
//                                         value={data.password}
//                                         onChange={(e) => setData("password", e.target.value)}
//                                         placeholder="••••••••"
//                                         autoComplete="new-password"
//                                         className="w-full rounded-2xl border border-white/5 bg-zinc-900/60 px-11 py-3.5 text-white placeholder-zinc-400 outline-none ring-0 transition focus:border-amber-400/60 focus:bg-zinc-900/70 focus:ring-2 focus:ring-amber-400/40"
//                                     />
//                                 </div>
//                                 {(errors.password || errors.password_confirmation) && (
//                                     <p className="mt-1 text-sm text-rose-300">
//                                         {errors.password || errors.password_confirmation}
//                                     </p>
//                                 )}
//                                 <PasswordMeter score={passScore} />
//                             </div>
//
//                             {/* повтор пароля */}
//                             <div>
//                                 <div className="mb-1 flex items-center justify-between">
//                                     <label
//                                         htmlFor="password_confirmation"
//                                         className="block text-sm text-zinc-200"
//                                     >
//                                         Կրկնել գաղտնաբառը
//                                     </label>
//                                     {data.password_confirmation && (data.password === data.password_confirmation ? (
//                                         <span className="inline-flex items-center gap-1 text-xs text-emerald-300">
//                       <CheckCircle2 className="h-4 w-4" /> համընկնում կա
//                     </span>
//                                     ) : (
//                                         <span className="inline-flex items-center gap-1 text-xs text-rose-300">
//                       <XCircle className="h-4 w-4" /> չի համընկնում
//                     </span>
//                                     ))}
//                                 </div>
//                                 <div className="relative">
//                                     <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-70">
//                                         <Lock className="h-5 w-5 text-amber-200" />
//                                     </div>
//                                     <input
//                                         id="password_confirmation"
//                                         type={showPass2 ? "text" : "password"}
//                                         value={data.password_confirmation}
//                                         onChange={(e) => setData("password_confirmation", e.target.value)}
//                                         placeholder="••••••••"
//                                         autoComplete="new-password"
//                                         className="w-full rounded-2xl border border-white/5 bg-zinc-900/60 px-11 py-3.5 text-white placeholder-zinc-400 outline-none ring-0 transition focus:border-amber-400/60 focus:bg-zinc-900/70 focus:ring-2 focus:ring-amber-400/40"
//                                     />
//                                     <button
//                                         type="button"
//                                         onClick={() => setShowPass2((v) => !v)}
//                                         aria-label="toggle password"
//                                         className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-amber-200/90 transition hover:bg-amber-400/10"
//                                     >
//                                         {showPass2 ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
//                                     </button>
//                                 </div>
//                             </div>
//
//                             {/* submit */}
//                             <button
//                                 type="submit"
//                                 disabled={!canSubmit}
//                                 className="group relative inline-flex w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 px-6 py-3.5 font-semibold text-zinc-900 shadow-2xl transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
//                             >
//                 <span
//                     className="absolute inset-0 -z-10 opacity-0 blur-xl transition group-hover:opacity-60"
//                     style={{
//                         background:
//                             "radial-gradient(70% 70% at 50% 50%, rgba(255,255,255,0.7), transparent)",
//                     }}
//                 />
//                                 {processing ? (
//                                     <span className="flex items-center gap-2">
//                     <Spinner /> Գրանցում…
//                   </span>
//                                 ) : (
//                                     <span className="flex items-center gap-2">
//                     <ShieldCheck className="h-5 w-5" /> Ստեղծել հաշիվ
//                   </span>
//                                 )}
//                             </button>
//
//                             <p className="text-center text-sm text-zinc-300/80">
//                                 Արդեն ունե՞ք հաշիվ —{" "}
//                                 <Link
//                                     href={r("login", "/login")}
//                                     className="text-amber-200/90 underline underline-offset-4 hover:text-amber-100"
//                                 >
//                                     Մուտք
//                                 </Link>
//                             </p>
//                         </form>
//                     </motion.div>
//
//                     <div className="mt-6 text-center text-xs text-zinc-400">
//                         © {new Date().getFullYear()} Poputi. Բոլոր իրավունքները պաշտպանված են.
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// }
//
// /* ---------- UI helpers ---------- */
// function Field({ id, label, icon, value, onChange, error, type = "text", placeholder = "" }) {
//     return (
//         <div>
//             <label htmlFor={id} className="mb-1 block text-sm text-zinc-200">
//                 {label}
//             </label>
//             <div className="relative">
//                 <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-70">
//                     {icon}
//                 </div>
//                 <input
//                     id={id}
//                     type={type}
//                     value={value}
//                     onChange={(e) => onChange(e.target.value)}
//                     placeholder={placeholder}
//                     className="w-full rounded-2xl border border-white/5 bg-zinc-900/60 px-11 py-3.5 text-white placeholder-zinc-400 outline-none ring-0 transition focus:border-amber-400/60 focus:bg-zinc-900/70 focus:ring-2 focus:ring-amber-400/40"
//                 />
//             </div>
//             {error && <p className="mt-1 text-sm text-rose-300">{error}</p>}
//         </div>
//     );
// }
//
// function PasswordMeter({ score }) {
//     const steps = [0, 1, 2, 3];
//     return (
//         <div className="mt-3">
//             <div className="mb-1 flex items-center justify-between text-xs text-zinc-400">
//                 <span>Անվտանգություն</span>
//                 <span>{scoreLabel(score)}</span>
//             </div>
//             <div className="grid grid-cols-4 gap-1">
//                 {steps.map((s) => (
//                     <div key={s} className={`h-1.5 rounded ${score > s ? "bg-emerald-400" : "bg-white/10"}`} />
//                 ))}
//             </div>
//             <ul className="mt-2 list-disc pl-4 text-xs text-zinc-400">
//                 <li>Առնվազն 6 նշան</li>
//                 <li>Թվեր և տառեր խառը</li>
//                 <li>Խուսափեք կրկնվող բառերից</li>
//             </ul>
//         </div>
//     );
// }
//
// function scorePassword(pw) {
//     let s = 0;
//     if (!pw) return 0;
//     if (pw.length >= 6) s++;
//     if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
//     if (/\d/.test(pw)) s++;
//     if (/[^A-Za-z0-9]/.test(pw)) s++;
//     return Math.min(s, 4);
// }
// function scoreLabel(score) {
//     return { 0: "թույլ", 1: "ցածր", 2: "միջին", 3: "լավ", 4: "ուժեղ" }[score] || "";
// }
// function Spinner() {
//     return (
//         <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-900/30 border-t-zinc-900" />
//     );
// }
import React, { useMemo, useState } from "react";
import { Head, Link, useForm, usePage } from "@inertiajs/react";
import { motion } from "framer-motion";
import {
    Car, Mail, Lock, User2, Eye, EyeOff,
    ShieldCheck, CheckCircle2, XCircle
} from "lucide-react";

/** Helper to support Ziggy and plain URLs */
const r = (name, fallback) => (typeof route === "function" ? route(name) : fallback);

export default function RegisterClient() {
    const metaCsrf = document.querySelector('meta[name="csrf-token"]')?.content || "";
    const { csrf_token } = usePage().props || {};

    const [showPass, setShowPass] = useState(false);
    const [showPass2, setShowPass2] = useState(false);
    const [localMsg, setLocalMsg] = useState("");
    const [preview, setPreview] = useState(null);

    const { data, setData, post, processing, errors, reset, transform } = useForm({
        name: "",
        email: "",
        password: "",
        password_confirmation: "",
        avatar: null, // <— обычный файл (фото)
        _token: csrf_token || metaCsrf,
    });

    const passScore = useMemo(() => scorePassword(data.password), [data.password]);
    const canSubmit = useMemo(() => {
        const emailOk = /\S+@\S+\.[\w-]{2,}/i.test(data.email);
        const nameOk = data.name.trim().length >= 2;
        const passOk = data.password.length >= 6 && data.password === data.password_confirmation;
        return emailOk && nameOk && passOk && !processing;
    }, [data, processing]);

    function onAvatarChange(e){
        const f = e.target.files?.[0];
        if (!f) { setData("avatar", null); setPreview(null); return; }
        setData("avatar", f);
        setPreview(URL.createObjectURL(f));
    }

    function submit(e) {
        e.preventDefault();
        setLocalMsg("");
        // Multipart для загрузки файла
        transform(d => {
            const f = new FormData();
            Object.entries(d).forEach(([k, v]) => {
                if (v !== null && v !== undefined) f.append(k, v);
            });
            return f;
        });
        post(r("register.client", "/register/client"), {
            headers: metaCsrf ? { "X-CSRF-TOKEN": metaCsrf } : {},
            onSuccess: () => {
                setLocalMsg("Գրանցումը հաջողվեց 🎉");
                reset("password", "password_confirmation", "avatar");
                setPreview(null);
            },
        });
    }

    return (
        <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(80%_60%_at_50%_-10%,#e6fff5,transparent),linear-gradient(to_bottom_right,#f8fafc,#ecfdf5)] text-slate-900">
            <Head title="Գրանցում (հաճախորդ)" />
            {/* soft mint blobs */}
            <motion.div className="pointer-events-none absolute -top-24 left-1/3 h-80 w-80 rounded-full bg-emerald-300/30 blur-3xl"
                        animate={{ opacity: [0.2, 0.7, 0.2] }} transition={{ repeat: Infinity, duration: 9 }}/>
            <motion.div className="pointer-events-none absolute -bottom-24 right-1/4 h-96 w-96 rounded-full bg-cyan-300/25 blur-3xl"
                        animate={{ opacity: [0.15, 0.6, 0.15] }} transition={{ repeat: Infinity, duration: 11 }}/>

            <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-16">
                <div className="mx-auto w-[96%] max-w-lg">
                    {/* brand */}
                    <div className="mb-6 flex items-center gap-3">
                        <div className="relative">
                            <div className="absolute -inset-1 rounded-xl bg-emerald-400/30 blur-lg" />
                            <div className="relative grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-400 text-white shadow-lg">
                                <Car className="h-6 w-6" />
                            </div>
                        </div>
                        <div>
                            <div className="text-xl font-bold tracking-tight">Taxi Platform</div>
                            <div className="text-xs uppercase tracking-wider text-emerald-700/80">Հաճախորդի գրանցում</div>
                        </div>
                    </div>

                    {/* card */}
                    <motion.div
                        layout
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 420, damping: 30, mass: 0.6 }}
                        className="relative overflow-hidden rounded-3xl border border-emerald-200/60 bg-white p-6 shadow-xl md:p-8"
                    >
                        <div className="mb-6">
                            <h1 className="text-2xl font-semibold tracking-tight">Ստեղծել հաշիվ</h1>
                            <p className="mt-1 text-sm text-slate-600">Լրացրեք դաշտերը՝ շարունակելու համար</p>
                            {localMsg && (
                                <div className="mt-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
                                    {localMsg}
                                </div>
                            )}
                        </div>

                        <form onSubmit={submit} className="space-y-5" encType="multipart/form-data">
                            {/* name */}
                            <Field
                                id="name"
                                label="Անուն"
                                icon={<User2 className="h-5 w-5 text-emerald-600" />}
                                value={data.name}
                                onChange={(v) => setData("name", v)}
                                error={errors.name}
                                placeholder="Անուն Ազգանուն"
                            />

                            {/* avatar file */}
                            <div>
                                <label htmlFor="avatar" className="mb-1 block text-sm text-slate-800">Ավատար (լուսանկար)</label>
                                <div className="flex items-center gap-3">
                                    <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50">
                                        {preview ? (
                                            <img src={preview} alt="preview" className="h-full w-full object-cover" />
                                        ) : (
                                            <span className="text-sm text-emerald-700">No photo</span>
                                        )}
                                    </div>
                                    <input
                                        id="avatar"
                                        type="file"
                                        accept="image/*"
                                        onChange={onAvatarChange}
                                        className="block w-full text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-emerald-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:brightness-95"
                                    />
                                </div>
                                {errors.avatar && <p className="mt-1 text-sm text-rose-600">{errors.avatar}</p>}
                                <p className="mt-1 text-xs text-slate-500">Մինչև ~5MB, JPG/PNG/WebP</p>
                            </div>

                            <Field
                                id="email"
                                label="Էլ․ հասցե"
                                type="email"
                                icon={<Mail className="h-5 w-5 text-emerald-600" />}
                                value={data.email}
                                onChange={(v) => setData("email", v)}
                                error={errors.email}
                                placeholder="name@example.com"
                            />

                            {/* password */}
                            <div>
                                <div className="mb-1 flex items-center justify-between">
                                    <label htmlFor="password" className="block text-sm text-slate-800">Գաղտնաբառ</label>
                                    <button
                                        type="button"
                                        onClick={() => setShowPass((v) => !v)}
                                        className="rounded-lg px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50"
                                    >
                                        {showPass ? "Թաքցնել" : "Ցույց տալ"}
                                    </button>
                                </div>
                                <div className="relative">
                                    <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                                        <Lock className="h-5 w-5 text-emerald-600" />
                                    </div>
                                    <input
                                        id="password"
                                        type={showPass ? "text" : "password"}
                                        value={data.password}
                                        onChange={(e) => setData("password", e.target.value)}
                                        placeholder="••••••••"
                                        autoComplete="new-password"
                                        className="w-full rounded-2xl border border-slate-300 bg-white px-11 py-3.5 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                                    />
                                </div>
                                {(errors.password || errors.password_confirmation) && (
                                    <p className="mt-1 text-sm text-rose-600">
                                        {errors.password || errors.password_confirmation}
                                    </p>
                                )}
                                <PasswordMeter score={passScore} />
                            </div>

                            {/* confirm */}
                            <div>
                                <div className="mb-1 flex items-center justify-between">
                                    <label htmlFor="password_confirmation" className="block text-sm text-slate-800">
                                        Կրկնել գաղտնաբառը
                                    </label>
                                    {data.password_confirmation && (data.password === data.password_confirmation ? (
                                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" /> համընկնում կա
                    </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-xs text-rose-600">
                      <XCircle className="h-4 w-4" /> չի համընկնում
                    </span>
                                    ))}
                                </div>
                                <div className="relative">
                                    <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                                        <Lock className="h-5 w-5 text-emerald-600" />
                                    </div>
                                    <input
                                        id="password_confirmation"
                                        type={showPass2 ? "text" : "password"}
                                        value={data.password_confirmation}
                                        onChange={(e) => setData("password_confirmation", e.target.value)}
                                        placeholder="••••••••"
                                        autoComplete="new-password"
                                        className="w-full rounded-2xl border border-slate-300 bg-white px-11 py-3.5 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPass2((v) => !v)}
                                        aria-label="toggle password"
                                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-emerald-700 hover:bg-emerald-50"
                                    >
                                        {showPass2 ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>

                            {/* submit */}
                            <button
                                type="submit"
                                disabled={!canSubmit}
                                className="group relative inline-flex w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-400 px-6 py-3.5 font-semibold text-white shadow-2xl transition hover:brightness-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {processing ? (
                                    <span className="flex items-center gap-2"><Spinner /> Գրանցում…</span>
                                ) : (
                                    <span className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Ստեղծել հաշիվ</span>
                                )}
                            </button>

                            <p className="text-center text-sm text-slate-600">
                                Արդեն ունե՞ք հաշիվ —{" "}
                                <Link href={r("login", "/login")} className="text-emerald-700 underline underline-offset-4 hover:text-emerald-800">
                                    Մուտք
                                </Link>
                            </p>
                        </form>
                    </motion.div>

                    <div className="mt-6 text-center text-xs text-slate-500">
                        © {new Date().getFullYear()} Poputi. Բոլոր իրավունքները պաշտպանված են.
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ---------- UI helpers ---------- */
function Field({ id, label, icon, value, onChange, error, type = "text", placeholder = "" }) {
    return (
        <div>
            <label htmlFor={id} className="mb-1 block text-sm text-slate-800">{label}</label>
            <div className="relative">
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">{icon}</div>
                <input
                    id={id}
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-11 py-3.5 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
            </div>
            {error && <p className="mt-1 text-sm text-rose-600">{error}</p>}
        </div>
    );
}

function PasswordMeter({ score }) {
    const steps = [0, 1, 2, 3];
    return (
        <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                <span>Անվտանգություն</span>
                <span>{scoreLabel(score)}</span>
            </div>
            <div className="grid grid-cols-4 gap-1">
                {steps.map((s) => (
                    <div key={s} className={`h-1.5 rounded ${score > s ? "bg-emerald-500" : "bg-slate-200"}`} />
                ))}
            </div>
            <ul className="mt-2 list-disc pl-4 text-xs text-slate-500">
                <li>Առնվազն 6 նշան</li>
                <li>Թվեր և տառեր խառը</li>
                <li>Խուսափեք կրկնվող բառերից</li>
            </ul>
        </div>
    );
}

function scorePassword(pw) {
    let s = 0;
    if (!pw) return 0;
    if (pw.length >= 6) s++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
    if (/\d/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return Math.min(s, 4);
}
function scoreLabel(score) {
    return { 0: "թույլ", 1: "ցածր", 2: "միջին", 3: "լավ", 4: "ուժեղ" }[score] || "";
}
function Spinner() {
    return <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />;
}
