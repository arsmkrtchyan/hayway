// import React, { useEffect, useState } from "react";
// import { Link, router } from "@inertiajs/react";
// import dayjs from "dayjs";
// import DriverLayout from "@/Layouts/DriverLayout";

// export default function MyTrips({ trips = [] }) {
//     return (
//         <DriverLayout current="my-trips">
//             <h1 className="mb-4 text-3xl font-extrabold text-slate-900">Իմ ուղևորությունները</h1>
//             <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
//                 <div className="grid gap-3 md:grid-cols-2">
//                     {trips.map((t) => (
//                         <TripItem key={t.id} t={t} />
//                     ))}
//                     {trips.length === 0 && <div className="text-slate-500">Դեռ չկան</div>}
//                 </div>
//             </section>
//         </DriverLayout>
//     );
// }

// function TripItem({ t }) {
//     const hasPending = (t.pending_requests_count || 0) > 0;

//     const [amenities, setAmenities] = useState(Array.isArray(t.amenities) ? t.amenities : []);
//     useEffect(() => {
//         let cancelled = false;
//         (async () => {
//             if (Array.isArray(t.amenities) && t.amenities.length) return;
//             try {
//                 const r = await fetch(`/driver/trip/${t.id}/amenities`, { headers: { Accept: "application/json" } });
//                 if (!r.ok) return;
//                 const d = await r.json();
//                 if (!cancelled) {
//                     const nameMap = new Map((d.categories || []).flatMap((c) => (c.amenities || [])).map((a) => [a.id, a.name]));
//                     setAmenities((d.selected_ids || []).map((id) => ({ id, name: nameMap.get(id) || String(id) })));
//                 }
//             } catch (_) {}
//         })();
//         return () => {
//             cancelled = true;
//         };
//     }, [t.id, t.amenities]);

//     const amenityNames = amenities.map((a) => a.name);

//     const openTrip = () => router.visit(`/driver/trip/${t.id}`);

//     return (
//         <div onClick={openTrip} className="relative cursor-pointer rounded-2xl border border-slate-200 p-4 transition hover:bg-slate-50">
//             {hasPending && (
//                 <span className="absolute right-3 top-3 rounded-full bg-rose-600 px-2 py-0.5 text-[11px] font-semibold text-white">
//           {t.pending_requests_count} հայտ
//         </span>
//             )}

//             <div className="text-sm text-slate-600">
//                 {t.from_addr} → {t.to_addr}
//             </div>
//             <div className="font-semibold text-slate-900">{t.departure_at ? dayjs(t.departure_at).format("YYYY-MM-DD HH:mm") : "—"}</div>
//             <div className="text-sm text-slate-700">
//                 Գին․ {t.price_amd} AMD · Տեղեր՝ {t.seats_taken || 0}/{t.seats_total || 0}
//             </div>

//             <div className="mt-1 text-xs text-slate-600">
//                 {t.driver_state === "en_route" && <>Սկսված է՝ {t.driver_started_at ? dayjs(t.driver_started_at).format("YYYY-MM-DD HH:mm") : "—"}</>}
//                 {t.driver_state === "done" && <>Ավարտված է՝ {t.driver_finished_at ? dayjs(t.driver_finished_at).format("YYYY-MM-DD HH:mm") : "—"}</>}
//                 {(!t.driver_state || t.driver_state === "assigned") && <>Վիճակ՝ նշանակված</>}
//             </div>

//             <div className="mt-2 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
//                 {amenityNames.length > 0 ? (
//                     amenityNames.map((n, i) => (
//                         <span key={i} className="rounded-lg bg-emerald-50 px-2 py-1 text-xs text-emerald-700 ring-1 ring-emerald-200">
//               {n}
//             </span>
//                     ))
//                 ) : (
//                     <span className="text-xs text-slate-500">Հարմարություններ չկան</span>
//                 )}
//             </div>

//             <div className="mt-3 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
//                 {t.status !== "archived" && (
//                     <button onClick={() => router.post(`/driver/trip/${t.id}/archive`)} className="rounded border border-slate-300 bg-white px-3 py-1.5 text-slate-800 hover:bg-slate-100">
//                         Արխիվացնել
//                     </button>
//                 )}
//                 <button onClick={() => router.post(`/driver/trip/${t.id}/fake-request`)} className="rounded bg-cyan-600 px-3 py-1.5 text-white">
//                     Թեստային հայտ
//                 </button>
//                 {t.driver_state !== "done" &&
//                     (t.driver_state === "en_route" ? (
//                         <button onClick={() => router.post(`/driver/trip/${t.id}/finish`)} className="rounded bg-emerald-600 px-3 py-1.5 text-white">
//                             Ավարտել
//                         </button>
//                     ) : (
//                         <button onClick={() => router.post(`/driver/trip/${t.id}/start`)} className="rounded bg-blue-600 px-3 py-1.5 text-white">
//                             Սկսել
//                         </button>
//                     ))}
//                 <Link href={`/driver/trip/${t.id}`} className="rounded border border-slate-300 bg-white px-3 py-1.5 text-slate-900 hover:bg-slate-100">
//                     Բացել
//                 </Link>
//             </div>
//         </div>
//     );
// }
import React, { useEffect, useState } from "react";
import { Link, router } from "@inertiajs/react";
import dayjs from "dayjs";
import DriverLayout from "@/Layouts/DriverLayout";

export default function MyTrips({ trips = [] }) {
    return (
        <DriverLayout current="my-trips">
            <h1 className="mb-4 text-3xl font-extrabold text-slate-900">Իմ ուղևորությունները</h1>
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
                <div className="grid gap-3 md:grid-cols-2">
                    {trips.map((t) => (
                        <TripItem key={t.id} t={t} />
                    ))}
                    {trips.length === 0 && <div className="text-slate-500">Դեռ չկան</div>}
                </div>
            </section>
        </DriverLayout>
    );
}

function TripItem({ t }) {
    // рейс считается активным, только если он не done и не archived
    const isActiveTrip =
        t.driver_state !== "done" &&
        t.status !== "archived";

    // badge "N հայտ" показываем только для активных рейсов
    const hasPending =
        isActiveTrip && (t.pending_requests_count || 0) > 0;

    const [amenities, setAmenities] = useState(
        Array.isArray(t.amenities) ? t.amenities : []
    );

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (Array.isArray(t.amenities) && t.amenities.length) return;
            try {
                const r = await fetch(`/driver/trip/${t.id}/amenities`, {
                    headers: { Accept: "application/json" },
                });
                if (!r.ok) return;
                const d = await r.json();
                if (!cancelled) {
                    const nameMap = new Map(
                        (d.categories || [])
                            .flatMap((c) => c.amenities || [])
                            .map((a) => [a.id, a.name])
                    );
                    setAmenities(
                        (d.selected_ids || []).map((id) => ({
                            id,
                            name: nameMap.get(id) || String(id),
                        }))
                    );
                }
            } catch (_) {}
        })();
        return () => {
            cancelled = true;
        };
    }, [t.id, t.amenities]);

    const amenityNames = amenities.map((a) => a.name);

    const openTrip = () => router.visit(`/driver/trip/${t.id}`);

    return (
        <div
            onClick={openTrip}
            className="relative cursor-pointer rounded-2xl border border-slate-200 p-4 transition hover:bg-slate-50"
        >
            {hasPending && (
                <span className="absolute right-3 top-3 rounded-full bg-rose-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                    {t.pending_requests_count} հայտ
                </span>
            )}

            <div className="text-sm text-slate-600">
                {t.from_addr} → {t.to_addr}
            </div>
            <div className="font-semibold text-slate-900">
                {t.departure_at
                    ? dayjs(t.departure_at).format("YYYY-MM-DD HH:mm")
                    : "—"}
            </div>
            <div className="text-sm text-slate-700">
                Գին․ {t.price_amd} AMD · Տեղեր՝ {t.seats_taken || 0}/
                {t.seats_total || 0}
            </div>

            <div className="mt-1 text-xs text-slate-600">
                {t.driver_state === "en_route" && (
                    <>
                        Սկսված է՝{" "}
                        {t.driver_started_at
                            ? dayjs(t.driver_started_at).format(
                                  "YYYY-MM-DD HH:mm"
                              )
                            : "—"}
                    </>
                )}
                {t.driver_state === "done" && (
                    <>
                        Ավարտված է՝{" "}
                        {t.driver_finished_at
                            ? dayjs(t.driver_finished_at).format(
                                  "YYYY-MM-DD HH:mm"
                              )
                            : "—"}
                    </>
                )}
                {(!t.driver_state || t.driver_state === "assigned") && (
                    <>Վիճակ՝ նշանակված</>
                )}
            </div>

            <div
                className="mt-2 flex flex-wrap gap-2"
                onClick={(e) => e.stopPropagation()}
            >
                {amenityNames.length > 0 ? (
                    amenityNames.map((n, i) => (
                        <span
                            key={i}
                            className="rounded-lg bg-emerald-50 px-2 py-1 text-xs text-emerald-700 ring-1 ring-emerald-200"
                        >
                            {n}
                        </span>
                    ))
                ) : (
                    <span className="text-xs text-slate-500">
                        Հարմարություններ չկան
                    </span>
                )}
            </div>

            <div
                className="mt-3 flex flex-wrap gap-2"
                onClick={(e) => e.stopPropagation()}
            >
                {t.status !== "archived" && (
                    <button
                        onClick={() =>
                            router.post(`/driver/trip/${t.id}/archive`)
                        }
                        className="rounded border border-slate-300 bg-white px-3 py-1.5 text-slate-800 hover:bg-slate-100"
                    >
                        Արխիվացնել
                    </button>
                )}
                <button
                    onClick={() =>
                        router.post(`/driver/trip/${t.id}/fake-request`)
                    }
                    className="rounded bg-cyan-600 px-3 py-1.5 text-white"
                >
                    Թեստային հայտ
                </button>
                {t.driver_state !== "done" &&
                    (t.driver_state === "en_route" ? (
                        <button
                            onClick={() =>
                                router.post(`/driver/trip/${t.id}/finish`)
                            }
                            className="rounded bg-emerald-600 px-3 py-1.5 text-white"
                        >
                            Ավարտել
                        </button>
                    ) : (
                        <button
                            onClick={() =>
                                router.post(`/driver/trip/${t.id}/start`)
                            }
                            className="rounded bg-blue-600 px-3 py-1.5 text-white"
                        >
                            Սկսել
                        </button>
                    ))}
                <Link
                    href={`/driver/trip/${t.id}`}
                    className="rounded border border-slate-300 bg-white px-3 py-1.5 text-slate-900 hover:bg-slate-100"
                >
                    Բացել
                </Link>
            </div>
        </div>
    );
}
