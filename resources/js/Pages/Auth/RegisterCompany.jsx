// import React, { useState } from 'react';
// import { useForm, Link } from '@inertiajs/react';
//
//
// export default function RegisterCompany(){
//     const { data, setData, post, processing, errors, transform } = useForm({
//         name:'', email:'', password:'', password_confirmation:'', company_name:'', logo:null
//     });
//     const [prevLogo, setPrevLogo] = useState(null);
//     function submit(e){
//         e.preventDefault();
//         transform((d)=>{ const f=new FormData(); Object.entries(d).forEach(([k,v])=>f.append(k,v)); return f; });
//         post('/register/company');
//     }
//     return (
//         <div className="max-w-2xl mx-auto py-12 px-4">
//             <h1 className="text-2xl font-bold mb-4">Регистрация таксопарка</h1>
//             <form onSubmit={submit} className="grid md:grid-cols-2 gap-4">
//                 <Input label="Контактное имя" value={data.name} onChange={v=>setData('name',v)} error={errors.name}/>
//                 <Input label="Email" type="email" value={data.email} onChange={v=>setData('email',v)} error={errors.email}/>
//                 <Input label="Пароль" type="password" value={data.password} onChange={v=>setData('password',v)} error={errors.password}/>
//                 <Input label="Повтор пароля" type="password" value={data.password_confirmation} onChange={v=>setData('password_confirmation',v)} />
//                 <Input label="Название компании" value={data.company_name} onChange={v=>setData('company_name',v)} error={errors.company_name}/>
//                 <File label="Логотип (опционально)" accept="image/*" onChange={(f)=>{ setData('logo',f); setPrevLogo(URL.createObjectURL(f)); }} preview={prevLogo}/>
//                 <div className="md:col-span-2">
//                     <button disabled={processing} className="w-full rounded-xl bg-black text-white py-2">Отправить на проверку</button>
//                     <div className="text-sm text-slate-600 mt-2">Доступ появится после email‑верификации и одобрения админом.</div>
//                     <div className="text-sm text-slate-600">Уже есть аккаунт? <Link href="/login" className="text-blue-600">Войти</Link></div>
//                 </div>
//             </form>
//         </div>
//     );
// }
//
//
// function Input({label,error,...p}){ return (
//     <label className="block text-sm">
//         <div className="mb-1 text-slate-600">{label}</div>
//         <input {...p} onChange={e=>p.onChange(e.target.value)} className="w-full rounded-xl border px-3 py-2"/>
//         {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
//     </label>
// );}
// function File({label,accept,onChange,preview}){ return (
//     <label className="block text-sm">
//         <div className="mb-1 text-slate-600">{label}</div>
//         <input type="file" accept={accept} onChange={e=>onChange(e.target.files[0])} className="w-full"/>
//         {preview && <img src={preview} alt="preview" className="mt-2 h-24 object-cover rounded-lg border"/>}
//     </label>
// );}
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Head, Link, useForm, usePage } from "@inertiajs/react";
import { motion } from "framer-motion";
import {
    Building2, User2, Mail, Lock, UploadCloud, X, ShieldCheck, Eye, EyeOff
} from "lucide-react";

const r = (name, fallback) => (typeof route === "function" ? route(name) : fallback);

export default function RegisterCompany() {
    const metaCsrf = document.querySelector('meta[name="csrf-token"]')?.content || "";
    const { csrf_token } = usePage().props || {};

    const [showPass, setShowPass] = useState(false);
    const [showPass2, setShowPass2] = useState(false);
    const [logoPrev, setLogoPrev] = useState("");

    const { data, setData, post, processing, errors, reset } = useForm({
        name: "", email: "", password: "", password_confirmation: "",
        company_name: "", logo: null,
        _token: csrf_token || metaCsrf,
    });

    // превью + очистка objectURL
    useEffect(() => () => { if (logoPrev) URL.revokeObjectURL(logoPrev); }, [logoPrev]);

    const canSubmit = useMemo(() => {
        const emailOk = /\S+@\S+\.[\w-]{2,}/i.test(data.email);
        const nameOk = data.name.trim().length >= 2;
        const companyOk = data.company_name.trim().length >= 2;
        const passOk = data.password.length >= 6 && data.password === data.password_confirmation;
        return emailOk && nameOk && companyOk && passOk && !processing;
    }, [data, processing]);

    function pickLogo(file) {
        if (!file) return;
        setData("logo", file);
        const url = URL.createObjectURL(file);
        if (logoPrev) URL.revokeObjectURL(logoPrev);
        setLogoPrev(url);
    }
    function clearLogo() {
        setData("logo", null);
        if (logoPrev) URL.revokeObjectURL(logoPrev);
        setLogoPrev("");
    }

    function submit(e) {
        e.preventDefault();
        post(r("register.company", "/register/company"), {
            headers: metaCsrf ? { "X-CSRF-TOKEN": metaCsrf } : {},
            forceFormData: true, // важен для файлов
            onSuccess: () => reset("password", "password_confirmation"),
        });
    }

    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-zinc-950 via-amber-900/20 to-amber-500/10">
            <Head title="Գրանցում (տաքսոպարկ)" />

            {/* фоновые акценты */}
            <motion.div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-amber-500/20 blur-3xl"
                        animate={{ opacity: [0.5, 0.9, 0.5] }} transition={{ repeat: Infinity, duration: 8 }} />
            <motion.div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-yellow-300/10 blur-3xl"
                        animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ repeat: Infinity, duration: 10 }} />

            {/* бегущая «дорога» */}
            <div className="absolute inset-x-0 top-10 select-none">
                <motion.div className="mx-auto flex max-w-6xl items-center gap-3 px-6"
                            initial={{ x: "-110%" }} animate={{ x: ["-110%", "110%"] }}
                            transition={{ repeat: Infinity, duration: 18, ease: "linear" }}>
                    <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-amber-400/80 to-transparent" />
                    <div className="relative">
                        <div className="absolute -inset-3 rounded-2xl bg-amber-400/30 blur-xl" />
                        <div className="relative flex items-center gap-2 rounded-2xl border border-amber-300/50 bg-amber-500 px-4 py-2 text-zinc-900 shadow-2xl">
                            <Building2 className="h-5 w-5" />
                            <span className="font-semibold tracking-wide">FLEET</span>
                        </div>
                    </div>
                    <div className="h-[2px] flex-1 bg-gradient-to-l from-transparent via-amber-400/80 to-transparent" />
                </motion.div>
            </div>

            {/* контент */}
            <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-16">
                <div className="mx-auto w-[96%] max-w-4xl">
                    {/* бренд */}
                    <div className="mb-6 flex items-center gap-3">
                        <div className="relative">
                            <div className="absolute -inset-1 rounded-xl bg-amber-400/30 blur-lg" />
                            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-yellow-400 text-zinc-900 shadow-lg">
                                <Building2 className="h-6 w-6" />
                            </div>
                        </div>
                        <div>
                            <div className="text-xl font-bold tracking-tight text-white">Poputi Taxi</div>
                            <div className="text-xs uppercase tracking-wider text-amber-200/80">Տաքսոպարկի գրանցում</div>
                        </div>
                    </div>

                    {/* карточка */}
                    <motion.div layout initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ type: "spring", stiffness: 420, damping: 30, mass: 0.6 }}
                                className="relative overflow-hidden rounded-3xl border border-white/5 bg-zinc-900/70 p-6 shadow-2xl backdrop-blur-xl md:p-8">

                        <form onSubmit={submit} className="grid gap-5 md:grid-cols-2">
                            {/* левая колонка */}
                            <div className="space-y-5">
                                <Field id="name" label="Կոնտակտային անուն"
                                       icon={<User2 className="h-5 w-5 text-amber-200" />}
                                       value={data.name} onChange={(v)=>setData("name", v)}
                                       error={errors.name} placeholder="Անուն Ազգանուն" />

                                <Field id="email" label="Էլ․ հասցե" type="email"
                                       icon={<Mail className="h-5 w-5 text-amber-200" />}
                                       value={data.email} onChange={(v)=>setData("email", v)}
                                       error={errors.email} placeholder="name@company.com" />

                                {/* пароль */}
                                <div>
                                    <div className="mb-1 flex items-center justify-between">
                                        <label htmlFor="password" className="block text-sm text-zinc-200">Գաղտնաբառ</label>
                                        <button type="button" onClick={()=>setShowPass(s=>!s)}
                                                className="rounded-lg px-2 py-1 text-xs text-amber-200/90 transition hover:bg-amber-400/10">
                                            {showPass ? "Թաքցնել" : "Ցույց տալ"}
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-70">
                                            <Lock className="h-5 w-5 text-amber-200" />
                                        </div>
                                        <input id="password" type={showPass ? "text" : "password"}
                                               value={data.password} onChange={(e)=>setData("password", e.target.value)}
                                               placeholder="••••••••" autoComplete="new-password"
                                               className="w-full rounded-2xl border border-white/5 bg-zinc-900/60 px-11 py-3.5 text-white placeholder-zinc-400 outline-none ring-0 transition focus:border-amber-400/60 focus:bg-zinc-900/70 focus:ring-2 focus:ring-amber-400/40" />
                                    </div>
                                    {errors.password && <p className="mt-1 text-sm text-rose-300">{errors.password}</p>}
                                </div>

                                {/* подтверждение */}
                                <div>
                                    <div className="mb-1 flex items-center justify-between">
                                        <label htmlFor="password_confirmation" className="block text-sm text-zinc-200">Կրկնել գաղտնաբառը</label>
                                        <button type="button" onClick={()=>setShowPass2(s=>!s)}
                                                className="rounded-lg px-2 py-1 text-xs text-amber-200/90 transition hover:bg-amber-400/10">
                                            {showPass2 ? "Թաքցնել" : "Ցույց տալ"}
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-70">
                                            <Lock className="h-5 w-5 text-amber-200" />
                                        </div>
                                        <input id="password_confirmation" type={showPass2 ? "text" : "password"}
                                               value={data.password_confirmation} onChange={(e)=>setData("password_confirmation", e.target.value)}
                                               placeholder="••••••••" autoComplete="new-password"
                                               className="w-full rounded-2xl border border-white/5 bg-zinc-900/60 px-11 py-3.5 text-white placeholder-zinc-400 outline-none ring-0 transition focus:border-amber-400/60 focus:bg-zinc-900/70 focus:ring-2 focus:ring-amber-400/40" />
                                    </div>
                                    {errors.password_confirmation && <p className="mt-1 text-sm text-rose-300">{errors.password_confirmation}</p>}
                                </div>
                            </div>

                            {/* правая колонка */}
                            <div className="space-y-5">
                                <Field id="company_name" label="Ընկերության անվանում"
                                       icon={<Building2 className="h-5 w-5 text-amber-200" />}
                                       value={data.company_name} onChange={(v)=>setData("company_name", v)}
                                       error={errors.company_name} placeholder="SmartSec LLC" />

                                <LogoDropZone
                                    label="Լոգո (ոչ պարտադիր)"
                                    hint="Մինչև 2MB, JPG/PNG/WebP/SVG"
                                    preview={logoPrev}
                                    onPick={(f)=>pickLogo(f)}
                                    onClear={clearLogo}
                                    error={errors.logo}
                                />
                            </div>

                            <div className="md:col-span-2">
                                <button type="submit" disabled={!canSubmit}
                                        className="group relative inline-flex w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 px-6 py-3.5 font-semibold text-zinc-900 shadow-xl transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60">
                  <span className="absolute inset-0 -z-10 opacity-0 blur-xl transition group-hover:opacity-60"
                        style={{ background: "radial-gradient(70% 70% at 50% 50%, rgba(255,255,255,0.7), transparent)" }} />
                                    {processing ? "Ուղարկում…" : (
                                        <span className="inline-flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5" /> Ուղարկել հաստատում
                    </span>
                                    )}
                                </button>

                                <p className="mt-3 text-center text-sm text-zinc-300/80">
                                    Արդեն ունե՞ք հաշիվ —{" "}
                                    <Link href={r("login", "/login")}
                                          className="text-amber-200/90 underline underline-offset-4 hover:text-amber-100">
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

/* ——— helpers ——— */
function Field({ id, label, icon, value, onChange, error, type="text", placeholder="" }) {
    return (
        <div>
            <label htmlFor={id} className="mb-1 block text-sm text-zinc-200">{label}</label>
            <div className="relative">
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-70">{icon}</div>
                <input id={id} type={type} value={value} onChange={(e)=>onChange(e.target.value)}
                       placeholder={placeholder}
                       className="w-full rounded-2xl border border-white/5 bg-zinc-900/60 px-11 py-3.5 text-white placeholder-zinc-400 outline-none ring-0 transition focus:border-amber-400/60 focus:bg-zinc-900/70 focus:ring-2 focus:ring-amber-400/40" />
            </div>
            {error && <p className="mt-1 text-sm text-rose-300">{error}</p>}
        </div>
    );
}

function LogoDropZone({ label, hint, preview, onPick, onClear, error }) {
    const inputRef = useRef(null);
    const [drag, setDrag] = useState(false);

    function onFile(e){ const f = e.target.files?.[0]; if (f) onPick(f); }
    function onDrop(e){ e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) onPick(f); }

    return (
        <div>
            <div className="mb-1 text-sm text-zinc-200">{label}</div>
            <div onDragOver={(e)=>{e.preventDefault(); setDrag(true);}}
                 onDragLeave={()=>setDrag(false)} onDrop={onDrop}
                 className={`relative flex min-h-32 items-center justify-center overflow-hidden rounded-2xl border ${drag?'border-amber-300/60 bg-amber-300/5':'border-white/10 bg-zinc-900/60'} p-4 transition`}>
                {!preview ? (
                    <button type="button" onClick={()=>inputRef.current?.click()} className="flex flex-col items-center gap-2 text-zinc-300">
                        <UploadCloud className="h-6 w-6 text-amber-200" />
                        <span className="text-sm">Քաշեք լոգոն այստեղ կամ սեղմեք</span>
                        <span className="text-xs text-zinc-400">{hint}</span>
                    </button>
                ) : (
                    <div className="relative w-full">
                        <img src={preview} alt="logo-preview" className="h-28 w-full rounded-xl object-contain bg-zinc-950/60" />
                        <button type="button" onClick={onClear}
                                className="absolute right-2 top-2 rounded-full bg-zinc-950/80 p-2 text-zinc-200 shadow hover:bg-zinc-950">
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
