// import Checkbox from '@/Components/Checkbox';
// import InputError from '@/Components/InputError';
// import InputLabel from '@/Components/InputLabel';
// import PrimaryButton from '@/Components/PrimaryButton';
// import TextInput from '@/Components/TextInput';
// import GuestLayout from '@/Layouts/GuestLayout';
// import { Head, Link, useForm } from '@inertiajs/react';
//
// export default function Login({ status, canResetPassword }) {
//     const csrf = document.querySelector('meta[name="csrf-token"]')?.content || '';
//     const { data, setData, post, processing, errors, reset } = useForm({
//         email: '',
//         password: '',
//         remember: false,
//         _token: csrf,                 // <-- поле для VerifyCsrfToken
//     });
//
//     const submit = (e) => {
//         e.preventDefault();
//         post(route('login'), {
//             headers: { 'X-CSRF-TOKEN': csrf },  // <-- дубль в заголовке
//             onFinish: () => reset('password'),
//         });
//     };
//
//     return (
//         <GuestLayout>
//             <Head title="Log in" />
//
//             {status && (
//                 <div className="mb-4 text-sm font-medium text-green-600">
//                     {status}
//                 </div>
//             )}
//
//             <form onSubmit={submit}>
//                 <div>
//                     <InputLabel htmlFor="email" value="Email" />
//
//                     <TextInput
//                         id="email"
//                         type="email"
//                         name="email"
//                         value={data.email}
//                         className="mt-1 block w-full"
//                         autoComplete="username"
//                         isFocused={true}
//                         onChange={(e) => setData('email', e.target.value)}
//                     />
//
//                     <InputError message={errors.email} className="mt-2" />
//                 </div>
//
//                 <div className="mt-4">
//                     <InputLabel htmlFor="password" value="Password" />
//
//                     <TextInput
//                         id="password"
//                         type="password"
//                         name="password"
//                         value={data.password}
//                         className="mt-1 block w-full"
//                         autoComplete="current-password"
//                         onChange={(e) => setData('password', e.target.value)}
//                     />
//
//                     <InputError message={errors.password} className="mt-2" />
//                 </div>
//
//                 <div className="mt-4 block">
//                     <label className="flex items-center">
//                         <Checkbox
//                             name="remember"
//                             checked={data.remember}
//                             onChange={(e) =>
//                                 setData('remember', e.target.checked)
//                             }
//                         />
//                         <span className="ms-2 text-sm text-gray-600">
//                             Remember me
//                         </span>
//                     </label>
//                 </div>
//
//                 <div className="mt-4 flex items-center justify-end">
//                     {canResetPassword && (
//                         <Link
//                             href={route('password.request')}
//                             className="rounded-md text-sm text-gray-600 underline hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
//                         >
//                             Forgot your password?
//                         </Link>
//                     )}
//
//                     <PrimaryButton className="ms-4" disabled={processing}>
//                         Log in
//                     </PrimaryButton>
//                 </div>
//             </form>
//         </GuestLayout>
//     );
// }
import React, { useMemo, useState } from "react";
import axios from "axios";
import { Head, Link, useForm } from "@inertiajs/react";
import { motion } from "framer-motion";
import { Car, Mail, Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";

function getCsrfToken() {
    const metaToken = document.querySelector('meta[name="csrf-token"]')?.content;
    if (metaToken) {
        return metaToken;
    }

    const cookieMatch = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return cookieMatch ? decodeURIComponent(cookieMatch[1]) : "";
}

/** Новый Login под Inertia/Laravel */
export default function Login({ status, canResetPassword }) {
     const csrf = getCsrfToken();

    const { data, setData, post, processing, errors, reset, transform } = useForm({
        email: "",
        password: "",
        remember: true,
        _token: csrf, // для VerifyCsrfToken
    });

    const [showPass, setShowPass] = useState(false);

    const valid = useMemo(() => {
        const e = /^\S+@\S+\.[\w-]{2,}$/i.test(data.email);
        const p = (data.password || "").length >= 6;
        return e && p;
    }, [data.email, data.password]);

     async function refreshCsrfToken() {
        await axios.get("/sanctum/csrf-cookie");
        const newToken = getCsrfToken();
        setData("_token", newToken);
        return newToken;
    }

    async function handleSubmit(e) {
        e.preventDefault();
          const latestToken = await refreshCsrfToken();
        const tokenForRequest = latestToken || csrf;

        transform((formData) => ({ ...formData, _token: tokenForRequest }));

        post(route("login"), {
              headers: { "X-CSRF-TOKEN": tokenForRequest },
            onFinish: () => reset("password"),
        });
    }

    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-zinc-950 via-amber-900/20 to-amber-500/10">
            <Head title="Log in" />

            {/* Градиентные пятна */}
            <motion.div
                className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-amber-500/20 blur-3xl"
                animate={{ opacity: [0.5, 0.9, 0.5] }}
                transition={{ repeat: Infinity, duration: 8 }}
            />
            <motion.div
                className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-yellow-300/10 blur-3xl"
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ repeat: Infinity, duration: 10 }}
            />

            {/* Анимированная "дорога" и машина */}
            <div className="absolute inset-x-0 top-10 select-none">
                <motion.div
                    className="mx-auto flex max-w-6xl items-center gap-3 px-6"
                    initial={{ x: "-110%" }}
                    animate={{ x: ["-110%", "110%"] }}
                    transition={{ repeat: Infinity, duration: 18, ease: "linear" }}
                >
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

            {/* Контент */}
            <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
                <div className="mx-auto w-[96%] max-w-md">
                    {/* Лого */}
                    <div className="mb-6 flex items-center gap-3">
                        <div className="relative">
                            <div className="absolute -inset-1 rounded-xl bg-amber-400/30 blur-lg" />
                            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-yellow-400 text-zinc-900 shadow-lg">
                                <Car className="h-6 w-6" />
                            </div>
                        </div>
                        <div>
                            <div className="text-xl font-bold tracking-tight text-white">Poputi Taxi</div>
                            <div className="text-xs uppercase tracking-wider text-amber-200/80">
                                Մշտական արագ մուտք
                            </div>
                        </div>
                    </div>

                    {/* Карточка */}
                    <motion.div
                        className="relative overflow-hidden rounded-3xl border border-white/5 bg-zinc-900/70 p-6 shadow-2xl backdrop-blur-xl md:p-8"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="mb-6">
                            <h1 className="text-2xl font-semibold tracking-tight text-white">Մուտք հաշիվ</h1>
                            <p className="mt-1 text-sm text-zinc-200/90">Մուտք գործեք ծառայության կառավարում</p>

                            {/* Статус от Laravel (например, после сброса пароля) */}
                            {!!status && (
                                <div className="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-200">
                                    {status}
                                </div>
                            )}
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Email */}
                            <div>
                                <label htmlFor="email" className="mb-1 block text-sm text-zinc-200">
                                    Էլ․ փոստ
                                </label>
                                <div className="relative">
                                    <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-70">
                                        <Mail className="h-5 w-5 text-amber-200" />
                                    </div>
                                    <input
                                        id="email"
                                        type="email"
                                        autoComplete="username"
                                        value={data.email}
                                        onChange={(e) => setData("email", e.target.value)}
                                        placeholder="name@example.com"
                                        className="w-full rounded-2xl border border-white/5 bg-zinc-900/60 px-11 py-3.5 text-white placeholder-zinc-400 outline-none ring-0 transition focus:border-amber-400/60 focus:bg-zinc-900/70 focus:ring-2 focus:ring-amber-400/40"
                                    />
                                </div>
                                {errors.email && <p className="mt-1 text-sm text-rose-300">{errors.email}</p>}
                            </div>

                            {/* Password */}
                            <div>
                                <div className="mb-1 flex items-center justify-between">
                                    <label htmlFor="password" className="block text-sm text-zinc-200">
                                        Գաղտնաբառ
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setShowPass((v) => !v)}
                                        className="rounded-lg px-2 py-1 text-xs text-amber-200/90 transition hover:bg-amber-400/10"
                                    >
                                        {showPass ? "Թաքցնել" : "Ցույց տալ"}
                                    </button>
                                </div>
                                <div className="relative">
                                    <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-70">
                                        <Lock className="h-5 w-5 text-amber-200" />
                                    </div>
                                    <input
                                        id="password"
                                        type={showPass ? "text" : "password"}
                                        autoComplete="current-password"
                                        value={data.password}
                                        onChange={(e) => setData("password", e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full rounded-2xl border border-white/5 bg-zinc-900/60 px-11 py-3.5 text-white placeholder-zinc-400 outline-none ring-0 transition focus:border-amber-400/60 focus:bg-zinc-900/70 focus:ring-2 focus:ring-amber-400/40"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPass((v) => !v)}
                                        aria-label="toggle password"
                                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-amber-200/90 transition hover:bg-amber-400/10"
                                    >
                                        {showPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                                {errors.password && (
                                    <p className="mt-1 text-sm text-rose-300">{errors.password}</p>
                                )}
                            </div>

                            {/* Remember + Forgot */}
                            <div className="flex items-center justify-between">
                                <label className="inline-flex select-none items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={!!data.remember}
                                        onChange={(e) => setData("remember", e.target.checked)}
                                        className="h-4 w-4 rounded border-white/20 bg-zinc-900/60 text-amber-400 accent-amber-500 focus:ring-amber-400"
                                    />
                                    <span className="text-sm text-zinc-200">Հիշել ինձ</span>
                                </label>
                                {canResetPassword && (
                                    <Link
                                        href={route("password.request")}
                                        className="text-sm text-amber-200/90 transition hover:text-amber-100"
                                    >
                                        Մոռացե՞լ եք գաղտնաբառը
                                    </Link>
                                )}
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={processing || !valid}
                                className="group relative inline-flex w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 px-6 py-3.5 font-semibold text-zinc-900 shadow-xl transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                <span
                    className="absolute inset-0 -z-10 opacity-0 blur-xl transition group-hover:opacity-60"
                    style={{
                        background:
                            "radial-gradient(70% 70% at 50% 50%, rgba(255,255,255,0.7), transparent)",
                    }}
                />
                                {processing ? (
                                    <span className="flex items-center gap-2">
                    <Spinner /> Մուտք…
                  </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5" /> Մուտք
                  </span>
                                )}
                            </button>

                            {/* Divider */}
                            <div className="relative py-2 text-center text-xs uppercase tracking-wider text-zinc-400">
                                <span className="bg-transparent px-2">Կամ</span>
                                <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-zinc-900/60" />
                            </div>

                            {/* Social demo (заглушка) */}
                            <button
                                type="button"
                                className="inline-flex w-full items-center justify-center gap-3 rounded-2xl border border-white/15 bg-zinc-900/50 px-6 py-3.5 text-sm text-white transition hover:bg-zinc-900/60"
                            >
                                <GoogleG /> <span>Մուտք Google-ով</span>
                            </button>

                            <p className="text-center text-sm text-zinc-200/90">
                                Չունե՞ք հաշիվ՝{" "}
                                <a
                                    href={route("register.choice") ?? "#"}
                                    className="text-amber-200/90 underline underline-offset-4 hover:text-amber-100"
                                >
                                    Գրանցվել
                                </a>
                            </p>
                        </form>

                        {/* Декор */}
                        <div className="pointer-events-none mt-6 overflow-hidden rounded-2xl">
                            <CheckeredStripe />
                        </div>
                    </motion.div>

                    {/* Футер */}
                    <div className="mt-6 text-center text-xs text-zinc-400">
                        © {new Date().getFullYear()} Poputi. Բոլոր իրավունքները պաշտպանված են.
                    </div>
                </div>
            </div>
        </div>
    );
}

function Spinner() {
    return (
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-900/30 border-t-zinc-900" />
    );
}

function GoogleG() {
    return (
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
            <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12   s5.373-12,12-12c3.059,0,5.84,1.158,7.938,3.062l5.657-5.657C33.94,6.053,29.24,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20   s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
            <path fill="#FF3D00" d="M6.306,14.691l6.571,4.818C14.655,16.1,18.961,13,24,13c3.059,0,5.84,1.158,7.938,3.062l5.657-5.657   C33.94,6.053,29.24,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
            <path fill="#4CAF50" d="M24,44c5.166,0,9.807-1.977,13.312-5.196l-6.146-5.202C29.169,35.091,26.715,36,24,36   c-5.202,0-9.619-3.317-11.283-7.946l-6.53,5.027C9.5,39.556,16.227,44,24,44z"/>
            <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.793,2.239-2.264,4.166-3.991,5.602c0.002-0.002,0.004-0.003,0.006-0.005  л6.146,5.202C35.142,39.949,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
        </svg>
    );
}

function CheckeredStripe() {
    return (
        <svg viewBox="0 0 600 40" className="h-10 w-full">
            <defs>
                <pattern id="chk" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                    <rect x="0" y="0" width="10" height="10" fill="#0a0a0a"/>
                    <rect x="10" y="10" width="10" height="10" fill="#0a0a0a"/>
                    <rect x="0" y="0" width="20" height="20" fill="none" stroke="rgba(255,255,255,0.06)"/>
                </pattern>
            </defs>
            <rect x="0" y="0" width="600" height="40" fill="url(#chk)"/>
            <rect x="0" y="0" width="600" height="40" fill="url(#grad)" opacity="0.3"/>
            <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#f59e0b"/>
                    <stop offset="100%" stopColor="#fde047"/>
                </linearGradient>
            </defs>
        </svg>
    );
}
