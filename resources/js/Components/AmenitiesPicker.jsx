import React, { useEffect, useMemo, useState } from "react";

/**
 * props:
 *  - value: number[] (selected amenity ids)
 *  - onChange: (ids:number[]) => void
 *  - compact?: boolean (для узких карточек)
 */
export default function AmenitiesPicker({ value = [], onChange, compact = false }) {
    const [loading, setLoading] = useState(true);
    const [amenities, setAmenities] = useState([]); // [{id,name,slug,icon,category:{id,name,slug}}]
    const [error, setError] = useState("");

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                setLoading(true);
                setError("");
                const r = await fetch("/api/amenities?only_active=1", { headers: { Accept: "application/json" } });
                if (!alive) return;
                if (!r.ok) throw new Error("amenities load failed");
                const d = await r.json();
                // если это Laravel ResourceCollection
                const list = Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : [];
                setAmenities(list);
            } catch (e) {
                setError("Չհաջողվեց բեռնել «հարմարությունները»");
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, []);

    const byCat = useMemo(() => {
        const m = new Map();
        for (const a of amenities) {
            const c = a.category || { id: 0, name: "Այլ", slug: "other" };
            const key = c.id || 0;
            if (!m.has(key)) m.set(key, { cat: c, items: [] });
            m.get(key).items.push(a);
        }
        // сортировка по имени
        return [...m.values()].map(v => ({ ...v, items: v.items.sort((x,y)=>x.name.localeCompare(y.name)) }));
    }, [amenities]);

    const isOn = (id) => value.includes(id);
    const toggle = (id) => onChange(isOn(id) ? value.filter(v=>v!==id) : [...value, id]);

    const catAllOn = (catItems) => catItems.every(a=>isOn(a.id));
    const catSomeOn = (catItems) => !catAllOn(catItems) && catItems.some(a=>isOn(a.id));
    const toggleCat = (catItems) => {
        if (catAllOn(catItems)) {
            onChange(value.filter(v=>!catItems.some(a=>a.id===v)));
        } else {
            const ids = new Set(value);
            catItems.forEach(a=>ids.add(a.id));
            onChange([...ids]);
        }
    };

    if (loading) return <div className="text-sm text-black/60">Բեռնվում է…</div>;
    if (error) return <div className="text-sm text-rose-600">{error}</div>;
    if (byCat.length === 0) return <div className="text-sm text-black/60">Չկան հասանելի հարմարություններ</div>;

    return (
        <div className={`rounded-xl border ${compact?'p-2':'p-3'} border-black/10`}>
            <div className="mb-2 text-sm font-medium text-black">Հարմարություններ</div>

            <div className="space-y-3">
                {byCat.map(({ cat, items }) => (
                    <div key={cat.id ?? 0}>
                        <div className="mb-1 flex items-center justify-between">
                            <button
                                type="button"
                                onClick={() => toggleCat(items)}
                                className={`rounded-lg px-2 py-1 text-xs ${
                                    catAllOn(items) ? "bg-emerald-600 text-white"
                                        : catSomeOn(items) ? "bg-amber-500 text-white"
                                            : "bg-zinc-900 text-[#ffdd2c]"
                                }`}
                                title="Ընտրել կատեգորիան ամբողջությամբ / հանել"
                            >
                                {cat.name} — {catAllOn(items) ? "բոլորը ընտրված" : catSomeOn(items) ? "մասամբ" : "ոչ մեկը"}
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {items.map(a => (
                                <label key={a.id} className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-1.5 text-sm ${
                                    isOn(a.id) ? "border-black/20 bg-black/10" : "border-black/10 bg-white hover:bg-black/5"
                                }`}>
                                    <input
                                        type="checkbox"
                                        checked={isOn(a.id)}
                                        onChange={() => toggle(a.id)}
                                        className="accent-black"
                                    />
                                    <span className="text-black">{a.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
