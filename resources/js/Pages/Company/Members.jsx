
// resources/js/Pages/Company/Members.jsx
import React, { useMemo, useState } from "react";
import { Link, router } from "@inertiajs/react";
import CompanyLayout from "./Layout";
import dayjs from "dayjs";

/** безопасный резолвер: сначала пробуем primary, если нет — fallback */
function r(primary, fallback, ...params) {
    try { return route(primary, params); } catch (e) { return route(fallback, params); }
}

const palette = {
    emerald: "text-emerald-900",
    cyan: "text-cyan-800",
    card: "rounded-2xl border border-white/20 bg-white/70 shadow-sm backdrop-blur",
    glass: "bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60",
    gradBtn:
        "bg-gradient-to-r from-emerald-600 to-cyan-600 text-white hover:from-emerald-500 hover:to-cyan-500",
};

export default function Members({ company, members = [], can = {} }) {
    const [q, setQ] = useState("");
    const [role, setRole] = useState("all");      // all|owner|manager|dispatcher|driver
    const [status, setStatus] = useState("all");  // all|active|suspended

    const filtered = useMemo(() => {
        return members.filter((m) => {
            const matchQ =
                !q ||
                (m.name?.toLowerCase()?.includes(q.toLowerCase())) ||
                (m.email?.toLowerCase()?.includes(q.toLowerCase()));
            const matchRole = role === "all" || m.role === role;
            const matchStatus = status === "all" || (m.status || "active") === status;
            return matchQ && matchRole && matchStatus;
        });
    }, [members, q, role, status]);

    return (
        <CompanyLayout company={company} current="drivers">
            {/* Header */}
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-emerald-800">Անձնակազմ</h1>
                    <div className="text-sm text-slate-600">
                        Ընդամենը՝ <b>{members.length}</b>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Link
                        href={r("company.trips.index", "company.trips.index", company.id)}
                        className="rounded-xl border border-white/30 bg-white/70 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white"
                    >
                        Երթուղիներ
                    </Link>
                </div>
            </div>

            {/* Filters + KPIs */}
            <section className="mb-6 grid gap-4 lg:grid-cols-3">
                <div className={`${palette.card} p-4 lg:col-span-2`}>
                    <div className="mb-3 grid gap-3 md:grid-cols-3">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600">Որոնում</label>
                            <input
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="Անուն կամ email"
                                className="w-full rounded-xl border px-3 py-2"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600">Դեր</label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="w-full rounded-xl border px-3 py-2"
                            >
                                <option value="all">Բոլորը</option>
                                <option value="owner">Owner</option>
                                <option value="manager">Manager</option>
                                <option value="dispatcher">Dispatcher</option>
                                <option value="driver">Driver</option>
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600">Կարգավիճակ</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full rounded-xl border px-3 py-2"
                            >
                                <option value="all">Բոլորը</option>
                                <option value="active">Ակտիվ</option>
                                <option value="suspended">Կանգնեցված</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                        <Kpi title="Owner / Manager" value={`${members.filter(m=>m.role==='owner').length} / ${members.filter(m=>m.role==='manager').length}`} />
                        <Kpi title="Dispatcher" value={members.filter(m=>m.role==='dispatcher').length} />
                        <Kpi title="Driver" value={members.filter(m=>m.role==='driver').length} />
                    </div>
                </div>

                <div className={`${palette.card} p-4`}>
                    <h3 className="mb-2 font-semibold text-emerald-900">Ավելացնել անձնակազմ</h3>
                    <div className="grid gap-2">
                        <OpenNewModal company={company} can={can} />
                        <AttachExisting company={company} can={can} />
                    </div>
                </div>
            </section>

            {/* Table */}
            <section className={`${palette.card} overflow-x-auto p-4`}>
                <table className="w-full text-sm">
                    <thead>
                    <tr className="text-left text-slate-600">
                        <th className="py-2">Օգտատեր</th>
                        <th className="py-2">Email</th>
                        <th className="py-2">Դեր</th>
                        <th className="py-2">Կարգավիճակ</th>
                        <th className="py-2">Ավելացնող</th>
                        <th className="py-2">Ամսաթիվ</th>
                        <th className="py-2 text-right">Գործողություններ</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filtered.map((m) => (
                        <Row key={m.id} company={company} m={m} can={can} />
                    ))}
                    {filtered.length === 0 && (
                        <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-500">
                                Արդյունք չի գտնվել
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </section>
        </CompanyLayout>
    );
}

/* Row */
function Row({ company, m, can }) {
    const isOwner = m.role === "owner";
    const suspended = (m.status || "active") === "suspended";

    const changeRole = (newRole) => {
        if (newRole === m.role) return;
        const url = r(
            "company.members.updateRole",
            "companies.members.updateRole",
            company.id,
            m.id
        );
        router.put(url, { role: newRole }, { preserveScroll: true });
    };

    const toggleStatus = () => {
        if (isOwner) return;
        const url = suspended
            ? r("company.members.activate", "companies.members.activate", company.id, m.id)
            : r("company.members.suspend", "companies.members.suspend", company.id, m.id);
        router.put(url, {}, { preserveScroll: true });
    };

    const remove = () => {
        if (isOwner) return;
        if (!confirm("Վստա՞հ եք, որ ցանկանում եք հեռացնել այս օգտատիրոջը ընկերությունից։")) return;
        const url = r(
            "company.members.destroy",
            "companies.members.destroy",
            company.id,
            m.id
        );
        router.delete(url, { preserveScroll: true });
    };

    return (
        <tr className="border-t border-white/40">
            <td className="py-2">
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-200 to-cyan-200 text-sm font-semibold text-emerald-900">
                        {(m.name || m.email || "?").slice(0,1).toUpperCase()}
                    </div>
                    <div className="leading-tight">
                        <div className="font-medium">{m.name || "—"}</div>
                        {m.notes && <div className="text-xs text-slate-500">{m.notes}</div>}
                    </div>
                </div>
            </td>
            <td className="py-2">{m.email || "—"}</td>
            <td className="py-2">
                <div className="flex items-center gap-2">
                    <RoleBadge role={m.role} />
                    {!isOwner && (
                        <select
                            className="rounded-lg border px-2 py-1 text-xs"
                            defaultValue={m.role}
                            onChange={(e) => changeRole(e.target.value)}
                        >
                            <option value="driver">Driver</option>
                            <option value="dispatcher">Dispatcher</option>
                            <option value="manager" disabled={!can?.create_manager}>Manager</option>
                            <option value="owner" disabled>Owner</option>
                        </select>
                    )}
                </div>
            </td>
            <td className="py-2">
                <StatusBadge status={m.status || "active"} />
            </td>
            <td className="py-2 text-slate-600">#{m.added_by_user_id ?? "—"}</td>
            <td className="py-2 text-slate-600">{m.joined_at ? dayjs(m.joined_at).format("YYYY-MM-DD") : "—"}</td>
            <td className="py-2">
                <div className="flex items-center justify-end gap-2">
                    {!isOwner && (
                        <button
                            onClick={toggleStatus}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${suspended ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"}`}
                        >
                            {suspended ? "Ակտիվացնել" : "Կանգնեցնել"}
                        </button>
                    )}
                    {!isOwner && (
                        <button
                            onClick={remove}
                            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white"
                        >
                            Հեռացնել
                        </button>
                    )}
                </div>
            </td>
        </tr>
    );
}

/* New member */
function OpenNewModal({ company, can }) {
    const [form, setForm] = useState({
        name: "", email: "", password: "", role: "driver", notes: "",
    });

    const submit = (e) => {
        e.preventDefault();
        const url = r("company.members.storeNew", "companies.members.storeNew", company.id);
        router.post(url, form, { preserveScroll: true });
    };

    return (
        <details className="rounded-xl border bg-white/70 [&_summary]:cursor-pointer">
            <summary className="px-3 py-2 text-sm font-medium">+ Ստեղծել նոր օգտատեր</summary>
            <form onSubmit={submit} className="grid gap-3 p-3 pt-0">
                <Input label="Անուն Ազգանուն" value={form.name} onChange={(v)=>setForm(s=>({...s,name:v}))} />
                <Input label="Էլ․ փոստ" value={form.email} onChange={(v)=>setForm(s=>({...s,email:v}))} />
                <Input type="password" label="Գաղտնաբառ" value={form.password} onChange={(v)=>setForm(s=>({...s,password:v}))} />
                <div className="grid grid-cols-2 gap-3">
                    <label className="block text-sm">
                        <div className="mb-1 text-black/70">Դեր</div>
                        <select
                            value={form.role}
                            onChange={(e)=>setForm(s=>({...s,role:e.target.value}))}
                            className="w-full rounded-xl border px-3 py-2"
                        >
                            <option value="driver">Driver</option>
                            <option value="dispatcher">Dispatcher</option>
                            <option value="manager" disabled={!can?.create_manager}>Manager</option>
                        </select>
                    </label>
                    <Input label="Նշումներ (ըստ ցանկության)" value={form.notes} onChange={(v)=>setForm(s=>({...s,notes:v}))} />
                </div>
                <button className={`rounded-xl px-4 py-2 text-sm font-semibold ${palette.gradBtn}`}>
                    Պահպանել
                </button>
                <div className="text-xs text-slate-500">Կուղարկվի email հաստատման նամակ։</div>
            </form>
        </details>
    );
}

/* Attach existing */
function AttachExisting({ company, can }) {
    const [form, setForm] = useState({ user_id: "", role: "driver", notes: "" });

    const submit = (e) => {
        e.preventDefault();
        const url = r("company.members.attach", "companies.members.attach", company.id);
        router.post(url, form, { preserveScroll: true });
    };

    return (
        <details className="rounded-xl border bg-white/70 [&_summary]:cursor-pointer">
            <summary className="px-3 py-2 text-sm font-medium">⇢ Կցել առկա օգտատեր</summary>
            <form onSubmit={submit} className="grid gap-3 p-3 pt-0">
                <div className="grid grid-cols-2 gap-3">
                    <Input
                        label="User ID"
                        value={form.user_id}
                        onChange={(v)=>setForm(s=>({...s,user_id:v}))}
                        placeholder="օր.՝ 42"
                    />
                    <label className="block text-sm">
                        <div className="mb-1 text-black/70">Դեր</div>
                        <select
                            value={form.role}
                            onChange={(e)=>setForm(s=>({...s,role:e.target.value}))}
                            className="w-full rounded-xl border px-3 py-2"
                        >
                            <option value="driver">Driver</option>
                            <option value="dispatcher">Dispatcher</option>
                            <option value="manager" disabled={!can?.create_manager}>Manager</option>
                        </select>
                    </label>
                </div>
                <Input label="Նշումներ (ըստ ցանկության)" value={form.notes} onChange={(v)=>setForm(s=>({...s,notes:v}))} />
                <button className={`rounded-xl px-4 py-2 text-sm font-semibold ${palette.gradBtn}`}>
                    Կցել
                </button>
                <div className="text-xs text-slate-500">Եթե պետք — позже прикрутим поиск по email/тел.</div>
            </form>
        </details>
    );
}

/* UI atoms */
function Kpi({ title, value }) {
    return (
        <div className={`${palette.card} flex items-center justify-between p-3`}>
            <div className="text-xs font-semibold text-slate-600">{title}</div>
            <div className="text-lg font-bold text-emerald-900">{value ?? "—"}</div>
        </div>
    );
}

function RoleBadge({ role }) {
    const map = {
        owner:      "bg-gradient-to-r from-emerald-600 to-cyan-600 text-white",
        manager:    "bg-emerald-100 text-emerald-800",
        dispatcher: "bg-teal-100 text-teal-800",
        driver:     "bg-cyan-100 text-cyan-800",
    };
    return (
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${map[role] || "bg-slate-100 text-slate-700"}`}>
            {role}
        </span>
    );
}

function StatusBadge({ status }) {
    const map = {
        active:    "bg-emerald-100 text-emerald-700",
        suspended: "bg-amber-100 text-amber-700",
    };
    return (
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${map[status] || "bg-slate-100 text-slate-700"}`}>
            {status}
        </span>
    );
}

function Input({ label, value, onChange, type="text", placeholder }) {
    return (
        <label className="block text-sm">
            <div className="mb-1 text-black/70">{label}</div>
            <input
                type={type}
                value={value}
                placeholder={placeholder}
                onChange={(e)=>onChange(e.target.value)}
                className="w-full rounded-xl border px-3 py-2"
            />
        </label>
    );
}
