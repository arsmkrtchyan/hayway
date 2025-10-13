// resources/js/Pages/Driver/ScanCheckin.jsx
import React, {useEffect, useRef, useState} from "react";
import {Html5QrcodeScanner} from "html5-qrcode";
import { CheckCircle2, XCircle } from "lucide-react";

export default function ScanCheckin() {
    const [res, setRes] = useState(null);
    const [busy, setBusy] = useState(false);
    const hostId = useRef(`qr-${Math.random().toString(36).slice(2)}`);
    const csrf = document.querySelector('meta[name="csrf-token"]')?.content;
    useEffect(()=>{
        const scanner = new Html5QrcodeScanner(hostId.current, { fps: 10, qrbox: 250 }, false);
        scanner.render(async (text)=> {
            if (busy) return;
            setBusy(true);
            try {
                const r = await fetch('/api/driver/checkin-verify', {
                    method:'POST',
                    headers:{
                        'Content-Type':'application/json',
                        'Accept':'application/json',
                        'X-CSRF-TOKEN': csrf || ''
                    },
                    credentials:'same-origin',
                    body: JSON.stringify({ token: text })
                });

                const d = await r.json();
                setRes(d);
            } catch { setRes({ok:false, err:'network'}); }
            finally { setBusy(false); }
        }, ()=>{ /* ignore */ });
        return ()=> scanner.clear();
    }, [busy]);

    return (
        <div className="p-6">
            <div id={hostId.current} />
            {res && res.ok && (
                <div className="mt-4 flex items-center text-green-600 gap-2">
                    <CheckCircle2 /> Подтверждено
                </div>
            )}
            {res && !res.ok && (
                <div className="mt-4 flex items-center text-red-600 gap-2">
                    <XCircle /> Ошибка: {res.err}
                </div>
            )}
        </div>
    );
}
