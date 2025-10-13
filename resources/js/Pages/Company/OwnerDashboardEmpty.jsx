// resources/js/Pages/Company/OwnerDashboardEmpty.jsx
import React from "react";
import { Link } from "@inertiajs/react";

export default function OwnerDashboardEmpty(){
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f6fffd]">
            <div className="rounded-3xl border bg-white p-8 text-center max-w-md">
                <div className="text-2xl font-bold mb-2 text-emerald-600">Դեռ չկա ընկերություն</div>
                <div className="text-slate-600 mb-4">Սկսիր ստեղծելով ընկերություն՝ տեսնելու վահանակը։</div>
                <Link href={route('companies.create')}
                      className="inline-block rounded-xl bg-emerald-600 px-5 py-2 text-white">
                    Ստեղծել ընկերություն
                </Link>
            </div>
        </div>
    );
}
