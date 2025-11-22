import React from "react";
import { useForm } from "@inertiajs/react";
import DriverLayout from "@/Layouts/DriverLayout";

export default function Car({ vehicle }) {
    const { data, setData, post, processing, errors, transform } = useForm({
        brand: vehicle?.brand ?? "",
        model: vehicle?.model ?? "",
        seats: vehicle?.seats ?? 4,
        color: vehicle?.color ?? "#10b981",
        plate: vehicle?.plate ?? "",
        photo: null,
    });

    function submit(e) {
        e.preventDefault();
        transform((d) => {
            const f = new FormData();
            Object.entries(d).forEach(([k, v]) => f.append(k, v));
            return f;
        });
        post("/driver/vehicle", { preserveScroll: true });
        }


         return (
        <DriverLayout current="car">
            <h1 className="mb-4 text-3xl font-extrabold text-slate-900">Իմ մեքենան</h1>
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
                <form onSubmit={submit} className="grid gap-3 md:grid-cols-3">
                    <Input label="Մարքա" value={data.brand} onChange={(v) => setData("brand", v)} error={errors.brand} />
                    <Input label="Մոդել" value={data.model} onChange={(v) => setData("model", v)} error={errors.model} />
                    <Input type="number" label="Տեղերի քանակ (ուղևոր)" value={data.seats} onChange={(v) => setData("seats", v)} error={errors.seats} />
                    <Input label="Գույն (hex)" value={data.color} onChange={(v) => setData("color", v)} />
                    <Input label="Պետ. համար" value={data.plate} onChange={(v) => setData("plate", v)} />
                    <File label="Լուսանկար" onChange={(f) => setData("photo", f)} />
                    <div className="md:col-span-3 flex justify-end">
                        <button
                            disabled={processing}
                            className="rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2 font-semibold text-white shadow hover:brightness-95"
                        >
                            Պահպանել
                        </button>
                           </div>
                </form>
            </section>
        </DriverLayout>
    );
}

function Input({ label, error, ...p }) {
    return (
        <label className="block text-sm">
            <div className="mb-1 text-slate-700">{label}</div>
            <input {...p} onChange={(e) => p.onChange(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-emerald-500" />
            {error && <div className="mt-1 text-xs text-rose-600">{error}</div>}
        </label>
    );
    }
function File({ label, onChange }) {
    return (
        <label className="block text-sm">
            <div className="mb-1 text-slate-700">{label}</div>
            <input type="file" accept="image/*" onChange={(e) => onChange(e.target.files[0])} className="w-full" />
               </label>
    );
}