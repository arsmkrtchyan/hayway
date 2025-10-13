// resources/js/Pages/Client/ShowCheckinQR.jsx
import React, {useEffect, useState} from "react";
import QRCode from "react-qr-code";

export default function ShowCheckinQR({ rideRequestId }) {
    const [data, setData] = useState(null);
    const [left, setLeft] = useState(0);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState(null);

    async function getTicket() {
        setLoading(true); setErr(null);
        try {
            const csrf = document.querySelector('meta[name="csrf-token"]')?.content;
            const r = await fetch(`/api/client/ride-requests/${rideRequestId}/checkin-ticket`, {
                method:'POST',
                headers:{ 'Accept':'application/json', 'X-CSRF-TOKEN': csrf || '' },
                credentials:'same-origin'
            });
            const d = await r.json();
            if(!r.ok || !d.ok) throw new Error(d.err || 'error');
            setData(d); setLeft(d.expiresIn);
        } catch(e) { setErr(e.message); }
        finally { setLoading(false); }
    }

    useEffect(()=>{ getTicket(); }, []);
    useEffect(()=>{ if(!data) return;
        const id = setInterval(()=> setLeft(s=> s>0 ? s-1 : 0), 1000);
        return ()=> clearInterval(id);
    }, [data]);

    const expired = left<=0;

    return (
        <div className="p-6 flex flex-col items-center gap-3">
            {data && <QRCode value={data.qr} size={224} />}
            <div className={`text-sm ${expired?'text-red-600':'text-gray-600'}`}>
                {data ? `Осталось: ${left}s` : '—'}
            </div>
            <button onClick={getTicket} disabled={loading}
                    className="px-4 py-2 rounded-2xl bg-black text-white disabled:opacity-50">
                {loading ? '…' : (data ? 'Обновить QR' : 'Сгенерировать QR')}
            </button>
            {err && <div className="text-red-600 text-sm">Ошибка: {err}</div>}
        </div>
    );
}
