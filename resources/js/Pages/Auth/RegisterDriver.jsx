// import React, { useState } from 'react';
// import { useForm, Link } from '@inertiajs/react';
//
//
// export default function RegisterDriver(){
//     const { data, setData, post, processing, errors, transform } = useForm({
//         name:'', email:'', password:'', password_confirmation:'', selfie:null, car_photo:null
//     });
//     const [prevSelfie, setPrevSelfie] = useState(null);
//     const [prevCar, setPrevCar] = useState(null);
//
//
//     function submit(e){
//         e.preventDefault();
//         transform((d)=>{ const f=new FormData(); Object.entries(d).forEach(([k,v])=>f.append(k,v)); return f; });
//         post('/register/driver',{ forceFormData: true });
//     }
//     return (
//         <div className="max-w-2xl mx-auto py-12 px-4">
//             <h1 className="text-2xl font-bold mb-4">Регистрация таксиста</h1>
//             <form onSubmit={submit} className="grid md:grid-cols-2 gap-4">
//                 <Input label="Имя" value={data.name} onChange={v=>setData('name',v)} error={errors.name}/>
//                 <Input label="Email" type="email" value={data.email} onChange={v=>setData('email',v)} error={errors.email}/>
//                 <Input label="Пароль" type="password" value={data.password} onChange={v=>setData('password',v)} error={errors.password}/>
//                 <Input label="Повтор пароля" type="password" value={data.password_confirmation} onChange={v=>setData('password_confirmation',v)} />
//
//
//                 <File label="Селфи (KYC)" accept="image/*" onChange={(f)=>{ setData('selfie',f); setPrevSelfie(URL.createObjectURL(f)); }} error={errors.selfie} preview={prevSelfie}/>
//                 <File label="Фото машины" accept="image/*" onChange={(f)=>{ setData('car_photo',f); setPrevCar(URL.createObjectURL(f)); }} error={errors.car_photo} preview={prevCar}/>
//
//
//                 <div className="md:col-span-2">
//                     <button disabled={processing} className="w-full rounded-xl bg-black text-white py-2">Отправить на проверку</button>
//                     <div className="text-sm text-slate-600 mt-2">После подтверждения email и проверки админом вы получите доступ.</div>
//                     <div className="text-sm text-slate-600">Уже есть аккаунт? <Link href="/login" className="text-blue-600">Войти</Link></div>
//                 </div>
//             </form>
//         </div>
//     );
// }
//
//
// function Input({label,error,...p}){
//     return (
//         <label className="block text-sm">
//             <div className="mb-1 text-slate-600">{label}</div>
//             <input {...p} onChange={e=>p.onChange(e.target.value)} className="w-full rounded-xl border px-3 py-2"/>
//             {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
//         </label>
//     );
// }
// function File({label,accept,onChange,preview,error}){
//     return (
//         <label className="block text-sm">
//             <div className="mb-1 text-slate-600">{label}</div>
//             <input type="file" accept={accept} onChange={e=>onChange(e.target.files[0])} className="w-full"/>
//             {preview && <img src={preview} alt="preview" className="mt-2 h-32 object-cover rounded-lg border"/>}
//             {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
//         </label>
//     );
// }
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Head, Link, useForm, usePage } from "@inertiajs/react";
import { motion } from "framer-motion";
import {
    Car, User2, Mail, Lock, Eye, EyeOff, ShieldCheck,
    CheckCircle2, XCircle, UploadCloud, X, Camera
} from "lucide-react";

const r = (name, fallback) => (typeof route === "function" ? route(name) : fallback);

export default function RegisterDriver() {
    const metaCsrf = document.querySelector('meta[name="csrf-token"]')?.content || "";
    const { csrf_token } = usePage().props || {};

    const [showPass, setShowPass] = useState(false);
    const [showPass2, setShowPass2] = useState(false);
    const [selfiePrev, setSelfiePrev] = useState("");
    const [carPrev, setCarPrev] = useState("");
    const [localMsg, setLocalMsg] = useState("");

    const { data, setData, post, processing, errors, reset } = useForm({
        name: "",
        email: "",
        password: "",
        password_confirmation: "",
        selfie: null,       // файл-селфи
        car_photo: null,    // фото машины
        _token: csrf_token || metaCsrf,
    });

    const passScore = useMemo(() => scorePassword(data.password), [data.password]);
    const canSubmit = useMemo(() => {
        const emailOk = /\S+@\S+\.[\w-]{2,}/i.test(data.email);
        const nameOk = (data.name || "").trim().length >= 2;
        const passOk = data.password.length >= 6 && data.password === data.password_confirmation;
        const filesOk = !!data.selfie && !!data.car_photo;
        return emailOk && nameOk && passOk && filesOk && !processing;
    }, [data, processing]);

    useEffect(() => {
        return () => {
            if (selfiePrev) URL.revokeObjectURL(selfiePrev);
            if (carPrev) URL.revokeObjectURL(carPrev);
        };
    }, [selfiePrev, carPrev]);

    function pickSelfie(f) {
        if (!f) return;
        setData("selfie", f);
        const url = URL.createObjectURL(f);
        if (selfiePrev) URL.revokeObjectURL(selfiePrev);
        setSelfiePrev(url);
    }
    function clearSelfie() {
        setData("selfie", null);
        if (selfiePrev) URL.revokeObjectURL(selfiePrev);
        setSelfiePrev("");
    }
    function pickCar(f) {
        if (!f) return;
        setData("car_photo", f);
        const url = URL.createObjectURL(f);
        if (carPrev) URL.revokeObjectURL(carPrev);
        setCarPrev(url);
    }
    function clearCar() {
        setData("car_photo", null);
        if (carPrev) URL.revokeObjectURL(carPrev);
        setCarPrev("");
    }

    function submit(e) {
        e.preventDefault();
        setLocalMsg("");
        post(r("register.driver", "/register/driver"), {
            headers: metaCsrf ? { "X-CSRF-TOKEN": metaCsrf } : {},
            forceFormData: true, // важный флаг для файлов
            onSuccess: () => {
                setLocalMsg("Հայտը ուղարկվեց․ սպասեք ադմինի հաստատմանը");
                reset("password", "password_confirmation");
            },
        });
    }

    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-zinc-950 via-amber-900/20 to-amber-500/10">
            <Head title="Գրանցում (վարորդ)" />

            {/* фон */}
            <motion.div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-amber-500/20 blur-3xl" animate={{ opacity: [0.5, 0.9, 0.5] }} transition={{ repeat: Infinity, duration: 8 }} />
            <motion.div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-yellow-300/10 blur-3xl" animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ repeat: Infinity, duration: 10 }} />
            <div className="absolute inset-x-0 top-10 select-none">
                <motion.div className="mx-auto flex max-w-6xl items-center gap-3 px-6" initial={{ x: "-110%" }} animate={{ x: ["-110%", "110%"] }} transition={{ repeat: Infinity, duration: 18, ease: "linear" }}>
                    <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-amber-400/80 to-transparent" />
                    <div className="relative">
                        <div className="absolute -inset-3 rounded-2xl bg-amber-400/30 blur-xl" />
                        <div className="relative flex items-center gap-2 rounded-2xl border border-amber-300/50 bg-amber-500 text-zinc-900 px-4 py-2 shadow-2xl">
                            <Car className="h-5 w-5" />
                            <span className="font-semibold tracking-wide">TAXI</span>
                        </div>
                    </div>
                    <div className="h-[2px] flex-1 bg-gradient-to-l from-transparent via-amber-400/80 to-transparent" />
                </motion.div>
            </div>

            {/* контент */}
            <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-16">
                <div className="mx-auto w-[96%] max-w-4xl">
                    {/* шапка */}
                    <div className="mb-6 flex items-center gap-3">
                        <div className="relative">
                            <div className="absolute -inset-1 rounded-xl bg-amber-400/30 blur-lg" />
                            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-yellow-400 text-zinc-900 shadow-lg">
                                <Camera className="h-6 w-6" />
                            </div>
                        </div>
                        <div>
                            <div className="text-xl font-bold tracking-tight text-white">Poputi Taxi</div>
                            <div className="text-xs uppercase tracking-wider text-amber-200/80">Վարորդի գրանցում</div>
                        </div>
                    </div>

                    <motion.div
                        layout
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 420, damping: 30, mass: 0.6 }}
                        className="relative overflow-hidden rounded-3xl border border-white/5 bg-zinc-900/70 p-6 shadow-2xl backdrop-blur-xl md:p-8"
                    >
                        {localMsg && (
                            <div className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-200">
                                {localMsg}
                            </div>
                        )}

                        <form onSubmit={submit} className="grid gap-5 md:grid-cols-2">
                            {/* левая колонка */}
                            <div className="space-y-5">
                                <Field
                                    id="name"
                                    label="Անուն"
                                    icon={<User2 className="h-5 w-5 text-amber-200" />}
                                    value={data.name}
                                    onChange={(v) => setData("name", v)}
                                    error={errors.name}
                                    placeholder="Անուն Ազգանուն"
                                />
                                <Field
                                    id="email"
                                    label="Էլ․ հասցե"
                                    type="email"
                                    icon={<Mail className="h-5 w-5 text-amber-200" />}
                                    value={data.email}
                                    onChange={(v) => setData("email", v)}
                                    error={errors.email}
                                    placeholder="name@example.com"
                                />

                                {/* пароль */}
                                <div>
                                    <div className="mb-1 flex items-center justify-between">
                                        <label htmlFor="password" className="block text-sm text-zinc-200">Գաղտնաբառ</label>
                                        <button type="button" onClick={() => setShowPass((v) => !v)} className="rounded-lg px-2 py-1 text-xs text-amber-200/90 transition hover:bg-amber-400/10">
                                            {showPass ? "Թաքցնել" : "Ցույց տալ"}
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-70"><Lock className="h-5 w-5 text-amber-200" /></div>
                                        <input
                                            id="password"
                                            type={showPass ? "text" : "password"}
                                            value={data.password}
                                            onChange={(e) => setData("password", e.target.value)}
                                            placeholder="••••••••"
                                            autoComplete="new-password"
                                            className="w-full rounded-2xl border border-white/5 bg-zinc-900/60 px-11 py-3.5 text-white placeholder-zinc-400 outline-none ring-0 transition focus:border-amber-400/60 focus:bg-zinc-900/70 focus:ring-2 focus:ring-amber-400/40"
                                        />
                                    </div>
                                    {(errors.password || errors.password_confirmation) && (
                                        <p className="mt-1 text-sm text-rose-300">{errors.password || errors.password_confirmation}</p>
                                    )}
                                    <PasswordMeter score={passScore} />
                                </div>

                                {/* подтверждение */}
                                <div>
                                    <div className="mb-1 flex items-center justify-between">
                                        <label htmlFor="password_confirmation" className="block text-sm text-zinc-200">Կրկնել գաղտնաբառը</label>
                                        {data.password_confirmation && (data.password === data.password_confirmation ? (
                                            <span className="inline-flex items-center gap-1 text-xs text-emerald-300"><CheckCircle2 className="h-4 w-4" /> համընկնում կա</span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-xs text-rose-300"><XCircle className="h-4 w-4" /> չի համընկնում</span>
                                        ))}
                                    </div>
                                    <div className="relative">
                                        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-70"><Lock className="h-5 w-5 text-amber-200" /></div>
                                        <input
                                            id="password_confirmation"
                                            type={showPass2 ? "text" : "password"}
                                            value={data.password_confirmation}
                                            onChange={(e) => setData("password_confirmation", e.target.value)}
                                            placeholder="••••••••"
                                            autoComplete="new-password"
                                            className="w-full rounded-2xl border border-white/5 bg-zinc-900/60 px-11 py-3.5 text-white placeholder-zinc-400 outline-none ring-0 transition focus:border-amber-400/60 focus:bg-zinc-900/70 focus:ring-2 focus:ring-amber-400/40"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPass2((v) => !v)}
                                            aria-label="toggle password"
                                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-amber-200/90 transition hover:bg-amber-400/10"
                                        >
                                            {showPass2 ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* правая колонка — файлы */}
                            <div className="space-y-5">
                                <DropZone
                                    label="Սելֆի (KYC)"
                                    hint="Մինչեւ 4MB, JPG/PNG/WebP"
                                    preview={selfiePrev}
                                    onPick={(f) => pickSelfie(f)}
                                    onClear={clearSelfie}
                                    error={errors.selfie}
                                />
                                <DropZone
                                    label="Մեքենայի լուսանկար"
                                    hint="Մինչեւ 4MB, JPG/PNG/WebP"
                                    preview={carPrev}
                                    onPick={(f) => pickCar(f)}
                                    onClear={clearCar}
                                    error={errors.car_photo}
                                />
                            </div>

                            {/* кнопки */}
                            <div className="md:col-span-2">
                                <button
                                    type="submit"
                                    disabled={!canSubmit}
                                    className="group relative inline-flex w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 px-6 py-3.5 font-semibold text-zinc-900 shadow-xl transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                  <span
                      className="absolute inset-0 -z-10 opacity-0 blur-xl transition group-hover:opacity-60"
                      style={{ background: "radial-gradient(70% 70% at 50% 50%, rgba(255,255,255,0.7), transparent)" }}
                  />
                                    {processing ? (
                                        <span className="flex items-center gap-2"><Spinner /> Ուղարկում…</span>
                                    ) : (
                                        <span className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Ուղարկել հաստատում</span>
                                    )}
                                </button>

                                <p className="mt-3 text-center text-sm text-zinc-300/80">
                                    Արդեն ունե՞ք հաշիվ —{" "}
                                    <Link href={r("login", "/login")} className="text-amber-200/90 underline underline-offset-4 hover:text-amber-100">
                                        Մուտք
                                    </Link>
                                </p>
                            </div>
                        </form>
                    </motion.div>

                    <div className="mt-6 text-center text-xs text-zinc-400">
                        © {new Date().getFullYear()} Poputi. Բոլոր իրավունքները պաշտպանված են.
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ------- helpers ------- */
function Field({ id, label, icon, value, onChange, error, type = "text", placeholder = "" }) {
    return (
        <div>
            <label htmlFor={id} className="mb-1 block text-sm text-zinc-200">{label}</label>
            <div className="relative">
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-70">{icon}</div>
                <input
                    id={id}
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full rounded-2xl border border-white/5 bg-zinc-900/60 px-11 py-3.5 text-white placeholder-zinc-400 outline-none ring-0 transition focus:border-amber-400/60 focus:bg-zinc-900/70 focus:ring-2 focus:ring-amber-400/40"
                />
            </div>
            {error && <p className="mt-1 text-sm text-rose-300">{error}</p>}
        </div>
    );
}

function DropZone({ label, hint, preview, onPick, onClear, error }) {
    const inputRef = useRef(null);
    const [drag, setDrag] = useState(false);

    function onFile(e) {
        const f = e.target.files?.[0];
        if (f) onPick(f);
    }
    function onDrop(e) {
        e.preventDefault();
        setDrag(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onPick(f);
    }

    return (
        <div>
            <div className="mb-1 text-sm text-zinc-200">{label}</div>
            <div
                onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={onDrop}
                className={`relative flex min-h-36 items-center justify-center overflow-hidden rounded-2xl border ${drag ? "border-amber-300/60 bg-amber-300/5" : "border-white/10 bg-zinc-900/60"} p-4 transition`}
            >
                {!preview ? (
                    <button type="button" onClick={() => inputRef.current?.click()} className="flex flex-col items-center gap-2 text-zinc-300">
                        <UploadCloud className="h-6 w-6 text-amber-200" />
                        <span className="text-sm">Քաշեք նկարն այստեղ կամ սեղմեք</span>
                        <span className="text-xs text-zinc-400">{hint}</span>
                    </button>
                ) : (
                    <div className="relative w-full">
                        <img src={preview} alt="preview" className="h-48 w-full rounded-xl object-cover" />
                        <button type="button" onClick={onClear} className="absolute right-2 top-2 rounded-full bg-zinc-950/80 p-2 text-zinc-200 shadow hover:bg-zinc-950">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                )}
                <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
            </div>
            {error && <div className="mt-1 text-xs text-rose-300">{error}</div>}
        </div>
    );
}

function PasswordMeter({ score }) {
    const steps = [0, 1, 2, 3];
    return (
        <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-xs text-zinc-400">
                <span>Անվտանգություն</span>
                <span>{scoreLabel(score)}</span>
            </div>
            <div className="grid grid-cols-4 gap-1">
                {steps.map((s) => (
                    <div key={s} className={`h-1.5 rounded ${score > s ? "bg-emerald-400" : "bg-white/10"}`} />
                ))}
            </div>
        </div>
    );
}

function scorePassword(pw) {
    let s = 0; if (!pw) return 0;
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
    return <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-900/30 border-t-zinc-900" />;
}
