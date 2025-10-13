import React from "react";
import { Link } from "@inertiajs/react";

export default function SelectCompany({ companies }) {
    return (
        <div className="max-w-3xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-4">Ընտրել ընկերություն</h1>
            <div className="grid gap-3">
                {companies.map(c=>(
                    <Link key={c.id}
                          href={route('company.show', c.id)}
                          className="rounded-xl border bg-white p-4 hover:bg-black/5">
                        <div className="font-semibold">{c.name}</div>
                        <div className="text-sm text-black/60">Կարգավիճակ՝ {c.status}</div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
