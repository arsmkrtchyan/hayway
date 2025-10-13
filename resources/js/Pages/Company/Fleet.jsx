
import React, { useMemo, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import CompanyLayout from "./Layout";

/** Утилиты темы */
const cls = {
    card: "rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70 shadow-sm",
    title: "text-lg font-semibold",
    sub: "text-sm text-slate-600",
    label: "mb-1 text-sm font-medium text-slate-700",
    input:
        "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200",
    button:
        "inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow hover:from-emerald-500 hover:to-cyan-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40",
    buttonGhost:
        "inline-flex items-center justify-center rounded-xl border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-emerald-400 hover:text-emerald-700",
    chip:
        "inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200",
};

export default function Fleet({ company, vehicles, drivers = [] }) {
    const { props } = usePage();
    const [submitting, setSubmitting] = useState(false);

    const [form, setForm] = useState({
        brand: "",
        model: "",
        plate: "",
        color: "#10b981", // emerald-500
        seats: 4,
        user_id: "", // ответственный водитель (опционально)
    });

    const driverOptions = useMemo(
        () => drivers.map((d) => ({ v: String(d.id), t: d.name })),
        [drivers]
    );

    function submit(e) {
        e.preventDefault();

        // простая фронтовая валидация
        if (!form.brand.trim() || !form.model.trim()) {
            alert("Մուտքագրիր «Մարկա» և «Մոդել»");
            return;
        }
        const seats = Number(form.seats);
        if (!Number.isFinite(seats) || seats < 1 || seats > 8) {
            alert("Տեղերի թիվը 1..8 միջակայքում");
            return;
        }

        setSubmitting(true);
        router.post(route("company.fleet.store", company.id), form, {
            preserveScroll: true,
            onFinish: () => setSubmitting(false),
            onSuccess: () =>
                setForm((s) => ({ ...s, brand: "", model: "", plate: "", seats: 4 })), // color/user_id оставим
        });
    }

    function removeVehicle(id) {
        if (!confirm("Վստա՞հ եք, որ ցանկանում եք ջնջել մեքենան։")) return;
        router.delete(route("company.fleet.destroy", [company.id, id]), {
            preserveScroll: true,
        });
    }

    return (
        <CompanyLayout company={company} current="fleet">
            <h1 className="mb-4 text-2xl font-bold">Ֆլոտ</h1>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* ФОРМА СОЗДАНИЯ */}
                <form onSubmit={submit} className={`${cls.card} p-4`}>
                    <div className={cls.title}>Ավելացնել մեքենա</div>
                    <div className="mt-3 grid gap-3">
                        <Input
                            label="Մարկա"
                            value={form.brand}
                            onChange={(v) => setForm((s) => ({ ...s, brand: v }))}
                            placeholder="օր.՝ Toyota"
                        />
                        <Input
                            label="Մոդել"
                            value={form.model}
                            onChange={(v) => setForm((s) => ({ ...s, model: v }))}
                            placeholder="օր.՝ Camry"
                        />

                        <div className="grid grid-cols-2 gap-3">
                            <Input
                                label="Պետ․ համար"
                                value={form.plate}
                                onChange={(v) => setForm((s) => ({ ...s, plate: v.toUpperCase() }))}
                                placeholder="օր.՝ 11 AA 111"
                            />
                            <ColorField
                                label="Գույն"
                                value={form.color}
                                onChange={(v) => setForm((s) => ({ ...s, color: v }))}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <NumberField
                                label="Տեղերի թիվ"
                                min={1}
                                max={8}
                                value={form.seats}
                                onChange={(v) =>
                                    setForm((s) => ({ ...s, seats: clamp(Number(v) || 4, 1, 8) }))
                                }
                            />

                            {/* Ответственный водитель — опционально (появляется, если пришёл drivers) */}
                            {driverOptions.length > 0 ? (
                                <Select
                                    label="Պատասխանատու վարորդ (կամ դիսպետչեր)"
                                    value={form.user_id}
                                    onChange={(v) => setForm((s) => ({ ...s, user_id: v }))}
                                    options={[{ v: "", t: "— Չնշել —" }, ...driverOptions]}
                                />
                            ) : (
                                <div className="self-end text-xs text-slate-500">
                                    Պատասխանատուն կարող է չնշվել — ըստ կանխադրվածի կդառնա ստեղծողը։
                                </div>
                            )}
                        </div>

                        <button disabled={submitting} className={`${cls.button} w-full`}>
                            {submitting ? "Պահպանում..." : "Պահպանել"}
                        </button>
                        <div className="text-xs text-slate-500">
                            Հուշում․ «Գույնը» կարող ես ընտրել կոճակից կամ գրել #hex։
                        </div>
                    </div>
                </form>

                {/* СПИСОК АВТО */}
                <div className="grid gap-3">
                    <div className={`${cls.card} p-4`}>
                        <div className={cls.title}>Մեքենաների ցուցակ</div>
                        <div className="mt-3 grid gap-3">
                            {vehicles.map((v) => (
                                <VehicleRow key={v.id} v={v} onRemove={() => removeVehicle(v.id)} />
                            ))}
                            {vehicles.length === 0 && (
                                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
                                    Դատարկ է
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </CompanyLayout>
    );
}

/** Рядок авто */
function VehicleRow({ v, onRemove }) {
    const color = v.color || "#10b981";
    const seats = v.seats ?? "—";
    const who = v.user?.name ? `· պատասխանատու՝ ${v.user.name}` : "";

    return (
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white/80 p-3 shadow-sm">
            <div className="flex items-center gap-3">
                <div
                    className="h-10 w-10 rounded-lg border border-slate-200 shadow-inner"
                    style={{ background: color }}
                    title={color}
                />
                <div>
                    <div className="font-semibold">
                        {v.brand} {v.model} {v.plate ? `· ${v.plate}` : ""}
                    </div>
                    <div className="text-sm text-slate-600">
                        Տեղեր՝ {seats} {who}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                {v.status && (
                    <span className={cls.chip}>
            <Dot color="#10b981" />
                        {v.status === "active" ? "Ակտիվ" : v.status}
          </span>
                )}
                <button onClick={onRemove} className={cls.buttonGhost}>
                    Ջնջել
                </button>
            </div>
        </div>
    );
}

/* ——— базовые UI ——— */

function Input({ label, value, onChange, placeholder = "" }) {
    return (
        <label className="block text-sm">
            <div className={cls.label}>{label}</div>
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className={cls.input}
            />
        </label>
    );
}

function NumberField({ label, value, onChange, min = 0, max = 999 }) {
    return (
        <label className="block text-sm">
            <div className={cls.label}>{label}</div>
            <input
                type="number"
                min={min}
                max={max}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={cls.input}
            />
        </label>
    );
}

function ColorField({ label, value, onChange }) {
    return (
        <label className="block text-sm">
            <div className={cls.label}>{label}</div>
            <div className="flex items-center gap-2">
                <input
                    type="color"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="h-10 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-0"
                />
                <input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className={cls.input}
                    placeholder="#10b981"
                />
            </div>
        </label>
    );
}

function Select({ label, value, onChange, options }) {
    return (
        <label className="block text-sm">
            <div className={cls.label}>{label}</div>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={cls.input}
            >
                {options.map((o) => (
                    <option key={o.v} value={o.v}>
                        {o.t}
                    </option>
                ))}
            </select>
        </label>
    );
}

function Dot({ color = "#10b981" }) {
    return (
        <span
            className="inline-block h-2.5 w-2.5 rounded-full ring-2 ring-white/70"
            style={{ background: color }}
        />
    );
}

function clamp(n, a, b) {
    return Math.max(a, Math.min(n, b));
}
