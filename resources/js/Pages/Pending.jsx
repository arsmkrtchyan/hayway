import React from 'react';
export default function Pending(){
    return (
        <div className="max-w-2xl mx-auto py-16 px-4">
            <div className="rounded-2xl border p-6 bg-amber-50">
                <h1 className="text-2xl font-bold mb-2">Профиль на проверке</h1>
                <p className="text-slate-700">Спасибо! Вы прошли email‑верификацию. Ваш профиль ожидает одобрения администратором. Обычно это занимает немного времени.</p>
            </div>
        </div>
    );
}
