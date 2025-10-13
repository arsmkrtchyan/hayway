import React, {useEffect, useRef, useState} from 'react';
import { router } from '@inertiajs/react';
import dayjs from 'dayjs';
import DriverLayout from '@/Layouts/DriverLayout';

export default function Room({ conversation, me, peer, initialMessages }) {
    const [msgs, setMsgs] = useState(initialMessages||[]);
    const [text, setText] = useState('');
    const [upload, setUpload] = useState(null); // {upload_id,url,mime,size}
    const [peerOnline, setPeerOnline] = useState(!!peer?.online);
    const [peerTyping, setPeerTyping] = useState(false);
    const [focused, setFocused] = useState(true);
    const listRef = useRef(null);
    const pollRef = useRef(null);
    const typingRef = useRef(null);

    // scroll to bottom
    useEffect(()=>{ listRef.current && (listRef.current.scrollTop = listRef.current.scrollHeight); }, []);

    // focus/blur controls polling interval
    useEffect(()=>{
        const onFocus=()=>setFocused(true), onBlur=()=>setFocused(false);
        window.addEventListener('focus', onFocus); window.addEventListener('blur', onBlur);
        return ()=>{ window.removeEventListener('focus', onFocus); window.removeEventListener('blur', onBlur); };
    },[]);

    function lastId(){ return msgs.length? msgs[msgs.length-1].id : 0; }

    // poll
    useEffect(()=>{
        const run = async ()=>{
            try{
                const r = await fetch(route('chats.api.poll',{conversation:conversation.id}) + `?since_id=${lastId()}`, { headers:{'Accept':'application/json'} });
                if(!r.ok) return;
                const d = await r.json();
                if (Array.isArray(d.messages) && d.messages.length) {
                    setMsgs(prev => [...prev, ...d.messages]);
                    // mark as read up to last
                    const maxId = d.messages[d.messages.length-1].id;
                    fetch(route('chats.api.read',{conversation:conversation.id}), {
                        method:'POST', headers:{'X-CSRF-TOKEN':document.querySelector('meta[name=csrf-token]').content},
                        body: new URLSearchParams({ last_visible_id: String(maxId) })
                    });
                    setTimeout(()=>{ listRef.current && (listRef.current.scrollTop = listRef.current.scrollHeight); }, 0);
                }
                setPeerOnline(!!d.peer?.online);
                setPeerTyping(!!d.peer?.typing);
            }catch(_){}
        };
        const int = setInterval(run, focused? 2500 : 20000);
        pollRef.current = int;
        return ()=> clearInterval(int);
    }, [focused, msgs.length]);

    // heartbeat
    useEffect(()=>{
        const send = ()=> fetch(route('chats.api.heartbeat',{conversation:conversation.id}), { method:'POST', headers:{'X-CSRF-TOKEN':document.querySelector('meta[name=csrf-token]').content} });
        send();
        const int = setInterval(send, 30000);
        return ()=> clearInterval(int);
    }, []);

    // typing
    function typing(){
        if (typingRef.current) clearTimeout(typingRef.current);
        fetch(route('chats.api.typing',{conversation:conversation.id}), {
            method:'POST', headers:{'X-CSRF-TOKEN':document.querySelector('meta[name=csrf-token]').content},
            body: new URLSearchParams({ is_typing: '1' })
        });
        typingRef.current = setTimeout(()=>{
            fetch(route('chats.api.typing',{conversation:conversation.id}), {
                method:'POST', headers:{'X-CSRF-TOKEN':document.querySelector('meta[name=csrf-token]').content},
                body: new URLSearchParams({ is_typing: '0' })
            });
        }, 4000);
    }

    async function onUploadFile(e){
        const file = e.target.files?.[0]; if(!file) return;
        const fd = new FormData(); fd.append('file', file);
        const r = await fetch(route('chats.api.upload'), { method:'POST', body:fd, headers:{'X-CSRF-TOKEN':document.querySelector('meta[name=csrf-token]').content} });
        if(!r.ok) return alert('Upload failed');
        const d = await r.json(); setUpload(d);
    }

    async function send(){
        if (!text.trim() && !upload) return;
        const client_mid = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
        const body = new URLSearchParams();
        body.set('client_mid', client_mid);
        if (text.trim()) body.set('body', text.trim());
        if (upload?.upload_id) body.set('upload_id', String(upload.upload_id));

        const r = await fetch(route('chats.api.send',{conversation:conversation.id}), {
            method:'POST', headers:{'X-CSRF-TOKEN':document.querySelector('meta[name=csrf-token]').content},
            body
        });
        if(!r.ok) return;
        setText(''); setUpload(null);
        // Быстрый локальный poll
        setTimeout(async ()=>{
            const rr = await fetch(route('chats.api.poll',{conversation:conversation.id}) + `?since_id=${lastId()}`, { headers:{'Accept':'application/json'} });
            if (rr.ok){ const d = await rr.json(); if (Array.isArray(d.messages) && d.messages.length) setMsgs(prev=>[...prev, ...d.messages]); }
            setTimeout(()=>{ listRef.current && (listRef.current.scrollTop = listRef.current.scrollHeight); }, 0);
        }, 200);
    }

    async function loadMore(){
        const before = msgs.length? msgs[0].id : 0;
        const r = await fetch(route('chats.api.history',{conversation:conversation.id}) + `?before_id=${before}&limit=30`, { headers:{'Accept':'application/json'} });
        if(!r.ok) return;
        const d = await r.json();
        if (Array.isArray(d.messages) && d.messages.length) {
            setMsgs(prev => [...d.messages, ...prev]);
            setTimeout(()=>{ if (listRef.current){ listRef.current.scrollTop = 10; } }, 0);
        }
    }

    return (
        <DriverLayout current="chats">
            <div className="flex h-[calc(100vh-120px)] flex-col p-4">
                <div className="mb-2 flex items-center justify-between">
                    <div className="text-lg font-semibold">Չաթ #{conversation.id}</div>
                    <div className="flex items-center gap-2 text-sm">
                        <span className={`h-2 w-2 rounded-full ${peerOnline?'bg-emerald-500':'bg-gray-300'}`} />
                        <span className="text-black/60">{peerOnline?'կապի մեջ է':'օֆլայն'}</span>
                        {peerTyping && <span className="ml-2 animate-pulse text-black/70">գրում է…</span>}
                    </div>
                </div>

                <div className="mb-2">
                    <button onClick={loadMore} className="rounded border px-3 py-1 text-sm">Բեռնավորել նախորդները</button>
                </div>

                <div ref={listRef} className="flex-1 overflow-y-auto rounded-xl border p-3">
                    {msgs.map(m=>(
                        <div key={m.id} className={`mb-2 max-w-[80%] rounded-2xl px-3 py-2 ${m.mine?'ml-auto bg-amber-100 text-amber-900':'bg-black/5 text-black'}`}>
                            {m.attachment && m.attachment.mime?.startsWith('image/') && (
                                <img src={m.attachment.url} alt="" className="mb-2 max-h-64 rounded-lg" />
                            )}
                            {m.attachment && !m.attachment.mime?.startsWith('image/') && (
                                <a href={m.attachment.url} target="_blank" className="mb-2 block underline">Ֆայլ ({m.attachment.mime})</a>
                            )}
                            {m.body && <div className="whitespace-pre-wrap break-words">{m.body}</div>}
                            <div className="mt-1 text-right text-[10px] text-black/50">{dayjs(m.created_at).format('HH:mm')}</div>
                        </div>
                    ))}
                </div>

                <div className="mt-3 flex items-center gap-2">
                    <input
                        className="flex-1 rounded-xl border px-3 py-2"
                        value={text}
                        onChange={e=>{ setText(e.target.value); typing(); }}
                        placeholder="Գրել հաղորդագրություն…"
                    />
                    <label className="cursor-pointer rounded border px-3 py-2 text-sm">
                        Ֆայլ
                        <input type="file" className="hidden" onChange={onUploadFile} />
                    </label>
                    {upload && <span className="text-xs text-black/60">կցված է</span>}
                    <button onClick={send} className="rounded bg-black px-4 py-2 font-semibold text-[#ffdd2c]">Ուղարկել</button>
                </div>
            </div>
        </DriverLayout>
    );
}
