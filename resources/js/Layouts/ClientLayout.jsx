//
// import React from "react";
// import { Link, usePage } from "@inertiajs/react";
//
// export default function ClientLayout({ children, current = "trips" }) {
//     const user = usePage().props?.auth?.user;
//
//     const nav = [
//         { key: "trips", href: "/trips", label: "Ուղևորություններ" },
//         { key: "requests", href: "/my/requests", label: "Իմ հայտերը", auth: true },
//     ];
//
//     return (
//         <div className="min-h-screen bg-[#fffaf0] text-black">
//             <header className="sticky top-0 z-40 border-b border-black/10 bg-[#ffdd2c]">
//                 <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
//                     <Link href="/" className="flex items-center gap-2">
//                         <span className="inline-grid h-8 w-8 place-items-center rounded-lg bg-black font-black text-[#ffdd2c]">TX</span>
//                         <span className="font-extrabold tracking-wide text-black">Taxi Platform</span>
//                     </Link>
//
//                     <nav className="flex items-center gap-2">
//                         {nav.map((n) => (!n.auth || user) && (
//                             <Link
//                                 key={n.key}
//                                 href={n.href}
//                                 className={`rounded-lg px-3 py-1.5 text-sm ${current === n.key ? "bg-black text-[#ffdd2c]" : "text-black hover:bg-black/10"}`}
//                             >
//                                 {n.label}
//                             </Link>
//                         ))}
//
//                         {!user ? (
//                             <Link href={route("login")} className="rounded-lg bg-black px-3 py-1.5 text-sm text-[#ffdd2c]">
//                                 Մուտք
//                             </Link>
//                         ) : (
//                             <>
//                                 <span className="px-2 text-sm text-black/70">{user.name}</span>
//                                 <Link
//                                     href={route("logout")}
//                                     method="post"
//                                     as="button"
//                                     className="rounded-lg bg-black px-3 py-1.5 text-sm text-[#ffdd2c]"
//                                 >
//                                     Դուրս գալ
//                                 </Link>
//                             </>
//                         )}
//                     </nav>
//                 </div>
//             </header>
//
//             <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
//
//             <footer className="border-t border-black/10 py-2 text-center text-xs text-black/70">
//                 © {new Date().getFullYear()} Taxi Platform · Ուղևոր
//             </footer>
//         </div>
//     );
// }
import React from "react";
import { Link, usePage } from "@inertiajs/react";

export default function ClientLayout({ children, current = "trips" }) {
    const user = usePage().props?.auth?.user;

    const nav = [
        { key: "trips", href: "/trips", label: "Ուղևորություններ" },
        { key: "requests", href: "/my/requests", label: "Իմ հայտերը", auth: true },
    ];

    return (
        <div className="min-h-screen bg-[radial-gradient(70%_50%_at_50%_-10%,#ecfdf5,transparent),linear-gradient(to_bottom_right,#f8fafc,#ecfeff)] text-slate-900">
            <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
                    <Link href="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 font-black text-white">
              TX
            </span>
                        <span className="font-extrabold tracking-wide">Taxi Platform</span>
                    </Link>

                    <nav className="flex items-center gap-2">
                        {nav.map((n) =>
                            (!n.auth || user) ? (
                                <Link
                                    key={n.key}
                                    href={n.href}
                                    className={
                                        current === n.key
                                            ? "rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 px-3 py-1.5 text-sm font-medium text-white shadow"
                                            : "rounded-lg px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
                                    }
                                >
                                    {n.label}
                                </Link>
                            ) : null
                        )}

                        {!user ? (
                            <Link
                                href={route("login")}
                                className="rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 px-3 py-1.5 text-sm font-medium text-white shadow"
                            >
                                Մուտք
                            </Link>
                        ) : (
                            <>
                                <span className="px-2 text-sm text-slate-600">{user.name}</span>
                                <Link
                                    href={route("logout")}
                                    method="post"
                                    as="button"
                                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-100"
                                >
                                    Դուրս գալ
                                </Link>
                            </>
                        )}
                    </nav>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>

            <footer className="border-t border-slate-200 py-2 text-center text-xs text-slate-600">
                © {new Date().getFullYear()} Taxi Platform · Ուղևոր
            </footer>
        </div>
    );
}
