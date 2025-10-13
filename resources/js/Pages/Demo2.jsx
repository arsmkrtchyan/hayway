import React, {useEffect, useMemo, useState} from "react";
import {AnimatePresence, motion} from "framer-motion";
import {Plus, Search, Clock, Users, CreditCard, BadgeDollarSign, LayoutGrid, Rows, ChevronRight, X, CheckCircle, Undo2, RefreshCw} from "lucide-react";
import dayjs from "dayjs";

function rng(seed=1){let t=seed;return()=>((t=Math.imul(48271,t)%2147483647)-1)/2147483646}
const fmt = (n)=>new Intl.NumberFormat("hy-AM").format(n||0);

function makeOrders(n=18, seed=1){
    const r=rng(seed); const arr=[];
    const sts=['open','matched','closed','cancelled','expired'];
    for(let i=0;i<n;i++){
        const desired = Math.random()<0.7 ? Math.round(1500+r()*6000) : null;
        const from=dayjs().add(Math.round(r()*48),"hour");
        const to=from.add(1+Math.round(r()*6),"hour");
        arr.push({
            id:i+1, client_user_id: 10+Math.floor(r()*5),
            from:{addr:["Երևան","Աբովյան","Գюмրի","Աշտարակ"][Math.floor(r()*4)]+"-"+(10+Math.floor(r()*90))},
            to:{addr:["Զվարթնոց","Դիլիջան","Վանաձոր","Սեւան"][Math.floor(r()*4)]+"-"+(10+Math.floor(r()*90))},
            when:{from: from.toISOString(), to: to.toISOString()},
            seats: 1+Math.floor(r()*4),
            payment: Math.random()<0.5?"cash":"card",
            desired_price_amd: desired,
            status: sts[Math.floor(r()*sts.length)],
            created_at: dayjs().subtract(Math.round(r()*1440),"minute").toISOString()
        });
    }
    return arr;
}

export default function OrderDemo(){
    const [seed,setSeed]=useState(1);
    const [items,setItems]=useState(()=>makeOrders(20,seed));
    const [q,setQ]=useState("");
    const [view,setView]=useState("list"); // list|grid
    const [filterPay,setFilterPay]=useState("all");
    const [onlyWithPrice,setOnlyWithPrice]=useState(false);
    const [timeBucket,setTimeBucket]=useState("any"); // any|soon|today|tomorrow
    const [creating,setCreating]=useState(false);

    useEffect(()=>{ setItems(makeOrders(20,seed)); },[seed]);

    const stats = useMemo(()=>{
        const total=items.length;
        const open=items.filter(x=>x.status==="open").length;
        const matched=items.filter(x=>x.status==="matched").length;
        const avgDesired = (()=> {
            const arr=items.map(x=>x.desired_price_amd).filter(x=>typeof x==="number");
            return arr.length? Math.round(arr.reduce((a,b)=>a+b,0)/arr.length):0;
        })();
        const soon = items.filter(x=> dayjs(x.when?.from).diff(dayjs(),"hour")<=6).length;
        return {total,open,matched,avgDesired,soon};
    },[items]);

    const filtered = useMemo(()=>{
        let list=[...items];
        if(q){
            const qq=q.toLowerCase();
            list=list.filter(x=> (x.from?.addr||"").toLowerCase().includes(qq)||(x.to?.addr||"").toLowerCase().includes(qq));
        }
        if(filterPay!=="all") list=list.filter(x=>x.payment===filterPay);
        if(onlyWithPrice) list=list.filter(x=>typeof x.desired_price_amd==="number");
        if(timeBucket!=="any"){
            list=list.filter(x=>{
                const h = dayjs(x.when?.from).diff(dayjs(),"hour");
                if(timeBucket==="soon") return h<=6;
                if(timeBucket==="today") return dayjs(x.when?.from).isSame(dayjs(),"day");
                if(timeBucket==="tomorrow") return dayjs(x.when?.from).isSame(dayjs().add(1,"day"),"day");
                return true;
            });
        }
        return list.sort((a,b)=> dayjs(a.when?.from).valueOf() - dayjs(b.when?.from).valueOf());
    },[items,q,filterPay,onlyWithPrice,timeBucket]);

    const changeStatus=(id, status)=>{
        setItems(prev=>prev.map(x=>x.id===id?{...x,status}:x));
    };

    const addOrder=(payload)=>{
        const id = Math.max(0,...items.map(x=>x.id))+1;
        setItems(prev=>[{
            id, client_user_id: 1,
            from:{addr:payload.from}, to:{addr:payload.to},
            when:{from: payload.when_from, to: payload.when_to},
            seats: payload.seats, payment: payload.payment,
            desired_price_amd: payload.desired_price_amd ?? null,
            status: "open", created_at: dayjs().toISOString()
        },...prev]);
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
                    <div>
                        <div className="text-lg font-semibold text-slate-900">Դեմո հայտերի վահանակ</div>
                        <div className="text-xs text-slate-500">Всего: {stats.total} · Открытые: {stats.open} · В матче: {stats.matched} · Ср. хотелка: {fmt(stats.avgDesired)} AMD · Скоро: {stats.soon}</div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={()=>setCreating(true)} className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow hover:brightness-95"><Plus className="h-4 w-4"/> Добавить</button>
                        <button onClick={()=>setSeed(s=>s+1)} className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"><RefreshCw className="h-4 w-4"/> Обновить мок</button>
                    </div>
                </div>
            </div>

            <main className="mx-auto max-w-6xl px-4 py-6">
                <div className="mb-4 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 rounded-2xl border bg-white px-3 py-2 shadow-sm">
                        <Search className="h-4 w-4 text-emerald-600"/>
                        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Поиск адреса" className="w-56 border-none bg-transparent text-sm outline-none"/>
                    </div>
                    <div className="flex items-center gap-2 rounded-2xl border bg-white px-3 py-2 shadow-sm">
                        <CreditCard className="h-4 w-4 text-emerald-600"/>
                        <select value={filterPay} onChange={e=>setFilterPay(e.target.value)} className="border-none bg-transparent text-sm outline-none">
                            <option value="all">Любая оплата</option>
                            <option value="cash">Наличные</option>
                            <option value="card">Карта</option>
                        </select>
                        <span className="mx-2 h-5 w-px bg-slate-200"/>
                        <label className="flex items-center gap-2 text-sm text-slate-600">
                            <input type="checkbox" checked={onlyWithPrice} onChange={e=>setOnlyWithPrice(e.target.checked)}/>
                            Только с ценой
                        </label>
                    </div>
                    <div className="flex items-center gap-2 rounded-2xl border bg-white px-3 py-2 shadow-sm">
                        <Clock className="h-4 w-4 text-emerald-600"/>
                        <select value={timeBucket} onChange={e=>setTimeBucket(e.target.value)} className="border-none bg-transparent text-sm outline-none">
                            <option value="any">Любое время</option>
                            <option value="soon">Ближайшие 6ч</option>
                            <option value="today">Сегодня</option>
                            <option value="tomorrow">Завтра</option>
                        </select>
                    </div>
                    <div className="ml-auto flex items-center gap-2 rounded-2xl border bg-white px-3 py-2 shadow-sm">
                        <button onClick={()=>setView("list")} className={`rounded-full p-2 ${view==="list"?"bg-emerald-50 text-emerald-700":"text-slate-600 hover:bg-slate-50"}`}><Rows className="h-4 w-4"/></button>
                        <button onClick={()=>setView("grid")} className={`rounded-full p-2 ${view==="grid"?"bg-emerald-50 text-emerald-700":"text-slate-600 hover:bg-slate-50"}`}><LayoutGrid className="h-4 w-4"/></button>
                    </div>
                </div>

                <AnimatePresence mode="popLayout">
                    {filtered.length===0 ? (
                        <EmptyState key="empty"/>
                    ) : view==="list" ? (
                        <motion.div key="list" layout className="space-y-3">
                            {filtered.map(o=><OrderCard key={o.id} order={o} onStatus={changeStatus}/>)}
                        </motion.div>
                    ) : (
                        <motion.div key="grid" layout className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {filtered.map(o=><OrderCard key={o.id} order={o} onStatus={changeStatus}/>)}
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            <AnimatePresence>
                {creating && <CreateOrderModal onClose={()=>setCreating(false)} onCreate={(p)=>{setCreating(false); addOrder(p);}}/>}
            </AnimatePresence>
        </div>
    );
}

function OrderCard({order, onStatus}){
    const soon = dayjs(order.when?.from).diff(dayjs(),"hour")<=6;
    const statusMap = {
        open: "bg-emerald-50 text-emerald-700 border-emerald-200",
        matched: "bg-cyan-50 text-cyan-700 border-cyan-200",
        closed: "bg-slate-50 text-slate-700 border-slate-200",
        cancelled: "bg-rose-50 text-rose-700 border-rose-200",
        expired: "bg-amber-50 text-amber-700 border-amber-200",
    };

    return (
        <motion.article layout initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}}
                        className="rounded-3xl border bg-white p-4 shadow-sm">
            <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                <span>#{order.id}</span>
                <span>{dayjs(order.created_at).format("DD.MM HH:mm")}</span>
            </div>
            <div className="mb-1 text-lg font-semibold text-slate-900">
                {order.from?.addr || "A"} <ChevronRight className="mx-1 inline h-4 w-4 text-slate-400"/> {order.to?.addr || "B"}
            </div>
            <div className="mb-2 flex flex-wrap items-center gap-3 text-sm text-slate-600">
        <span className={`inline-flex items-center gap-1 ${soon?"text-amber-700":"text-slate-600"}`}>
          <Clock className="h-4 w-4 text-emerald-600"/> {dayjs(order.when?.from).format("DD.MM HH:mm")} – {dayjs(order.when?.to).format("DD.MM HH:mm")}
        </span>
                <span className="inline-flex items-center gap-1"><Users className="h-4 w-4 text-emerald-600"/> {order.seats} տեղ</span>
                <span className="inline-flex items-center gap-1"><BadgeDollarSign className="h-4 w-4 text-emerald-600"/>
                    {typeof order.desired_price_amd==="number" ? <b className="text-emerald-700">{fmt(order.desired_price_amd)} AMD</b> : <i className="text-slate-500">չի նշվել</i>}
        </span>
                <span className="inline-flex items-center gap-1"><CreditCard className="h-4 w-4 text-emerald-600"/> {order.payment||"—"}</span>
            </div>
            <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] ${statusMap[order.status]}`}>{order.status}</span>

            <div className="mt-3 flex flex-wrap gap-2">
                {order.status!=="cancelled" && order.status!=="closed" && (
                    <button onClick={()=>onStatus(order.id,"cancelled")} className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100">
                        <X className="h-3 w-3"/> Отменить
                    </button>
                )}
                {order.status!=="closed" && (
                    <button onClick={()=>onStatus(order.id,"closed")} className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100">
                        <CheckCircle className="h-3 w-3"/> Закрыть
                    </button>
                )}
                {order.status!=="open" && (
                    <button onClick={()=>onStatus(order.id,"open")} className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100">
                        <Undo2 className="h-3 w-3"/> Открыть снова
                    </button>
                )}
            </div>
        </motion.article>
    );
}

function CreateOrderModal({onClose,onCreate}){
    const [form,setForm]=useState({
        from:"Երևան, Կենտրոն", to:"Զվարթնոց",
        when_from: dayjs().add(6,"h").format("YYYY-MM-DDTHH:mm"),
        when_to:   dayjs().add(8,"h").format("YYYY-MM-DDTHH:mm"),
        seats:1, payment:"cash", desired_price_amd:2500
    });
    const update=(p)=>setForm(prev=>({...prev,...p}));
    const submit=(e)=>{ e.preventDefault(); onCreate({...form}); };

    return (
        <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}
                    initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
            <motion.div onClick={(e)=>e.stopPropagation()} initial={{y:24, opacity:0}} animate={{y:0, opacity:1}} exit={{y:12, opacity:0}}
                        className="w-full max-w-xl rounded-3xl border bg-white p-5 shadow-xl">
                <div className="mb-3 text-lg font-semibold text-slate-900">Новая заявка</div>
                <form onSubmit={submit} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <Input label="Откуда" value={form.from} onChange={v=>update({from:v})}/>
                        <Input label="Куда" value={form.to} onChange={v=>update({to:v})}/>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <Input label="Начало окна" type="datetime-local" value={form.when_from} onChange={v=>update({when_from:v})}/>
                        <Input label="Конец окна" type="datetime-local" value={form.when_to} onChange={v=>update({when_to:v})}/>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <Input label="Места" value={form.seats} onChange={v=>update({seats: Math.min(6,Math.max(1,+v||1))})}/>
                        <Select label="Оплата" value={form.payment} onChange={v=>update({payment:v})} options={[{v:"cash",t:"Наличные"},{v:"card",t:"Карта"}]}/>
                        <Input label="Желаемая цена (AMD)" value={form.desired_price_amd} onChange={v=>update({desired_price_amd: +v||0})}/>
                    </div>
                    <div className="rounded-2xl border p-3 text-sm">
                        Оценочная цена: <b className="text-emerald-700">{fmt(Math.round((form.desired_price_amd||2000)*0.95))}–{fmt(Math.round((form.desired_price_amd||2000)*1.15))} AMD</b>
                    </div>
                    <div className="mt-4 flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="rounded-full border px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">Отмена</button>
                        <button type="submit" className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow hover:brightness-95">Создать</button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}

function Input({label,value,onChange,type="text"}) {
    return (
        <label className="text-sm">
            <div className="mb-1 text-slate-600">{label}</div>
            <input type={type} value={value} onChange={e=>onChange(e.target.value)}
                   className="w-full rounded-2xl border px-3 py-2 outline-none focus:border-emerald-400"/>
        </label>
    );
}
function Select({label,value,onChange,options}) {
    return (
        <label className="text-sm">
            <div className="mb-1 text-slate-600">{label}</div>
            <select value={value} onChange={e=>onChange(e.target.value)}
                    className="w-full rounded-2xl border px-3 py-2 outline-none focus:border-emerald-400">
                {options.map(o=><option key={o.v} value={o.v}>{o.t}</option>)}
            </select>
        </label>
    );
}

function EmptyState(){
    return (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} className="grid place-items-center rounded-3xl border border-dashed border-emerald-300 bg-emerald-50/50 p-12 text-center">
            <div className="mb-3 text-3xl">🧭</div>
            <div className="text-lg font-semibold text-slate-900">Пока ничего не найдено</div>
            <div className="text-sm text-slate-600">Измените фильтры или добавьте новую заявку.</div>
        </motion.div>
    );
}
