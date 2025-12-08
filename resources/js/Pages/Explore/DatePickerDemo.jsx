// resources/js/Pages/Explore/DatePickerDemo.jsx

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const DAYS_OF_WEEK = ["Երկ", "Երք", "Չրք", "Հնգ", "Ուրբ", "Շբթ", "Կրկ"];

const isSameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const formatLabel = (date) => {
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
};

const buildDaysForMonth = (monthDate) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const startWeekday = (firstDay.getDay() + 6) % 7; // 0=Mon
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
        cells.push(new Date(year, month, d));
    }
    return cells;
};

export default function DatePickerDemo({ value, onChange }) {
    const [open, setOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(() => {
        const d = new Date();
        d.setDate(1);
        return d;
    });
    const [selected, setSelected] = useState(() => {
        if (!value) return null;
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    });
    const popRef = useRef(null);

    const today = new Date();
    const selectedLabel = selected ? formatLabel(selected) : value ? formatLabel(new Date(value)) : "ԴԴ․ՄՄ․ՏՏՏՏ";
    const monthLabel = useMemo(() => currentMonth.toLocaleDateString("hy-AM", { month: "long", year: "numeric" }), [currentMonth]);
    const days = useMemo(() => buildDaysForMonth(currentMonth), [currentMonth]);

    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (!popRef.current) return;
            if (!popRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    const goMonth = (delta) => {
        setCurrentMonth((prev) => {
            const d = new Date(prev);
            d.setMonth(d.getMonth() + delta);
            return d;
        });
    };

    const handleSelect = (day) => {
        if (!day) return;
        setSelected(day);
        setOpen(false);
        onChange?.(day.toISOString().slice(0, 10));
    };

    useEffect(() => {
        if (!value) {
            setSelected(null);
            return;
        }
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
            setSelected(parsed);
            setCurrentMonth(() => {
                const d = new Date(parsed);
                d.setDate(1);
                return d;
            });
        }
    }, [value]);

    return (
        <div className="relative">
            <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm transition hover:border-cyan-300 hover:shadow-md">
                <Calendar className="h-4 w-4 text-emerald-700" />
                <span className="text-xs font-semibold text-slate-700">{selectedLabel}</span>
            </button>

            <input type="hidden" name="date" value={selected ? selected.toISOString().slice(0, 10) : value || ""} />

            <AnimatePresence>
                {open && (
                    <motion.div
                        ref={popRef}
                        initial={{ opacity: 0, y: 6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.97 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="absolute left-0 top-full z-50 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl shadow-cyan-200/70"
                    >
                        <div className="mb-3 flex items-center justify-between">
                            <button type="button" onClick={() => goMonth(-1)} className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50">
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <div className="text-sm font-semibold capitalize text-slate-800">{monthLabel}</div>
                            <button type="button" onClick={() => goMonth(1)} className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50">
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-semibold uppercase">
                            {DAYS_OF_WEEK.map((d, idx) => {
                                const isWeekendHeader = idx === 5 || idx === 6;
                                return (
                                    <div key={d} className={isWeekendHeader ? "text-red-400" : "text-slate-400"}>
                                        {d}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
                            {days.map((day, idx) => {
                                const selectedDay = selected && day && isSameDay(day, selected);
                                const isTodayFlag = day && isSameDay(day, today);
                                const weekday = day ? day.getDay() : null;
                                const isWeekend = day && (weekday === 0 || weekday === 6);

                                let cls = "text-slate-700 hover:bg-slate-100 cursor-pointer";
                                if (!day) cls = "pointer-events-none text-transparent";
                                else if (selectedDay) cls = "bg-gradient-to-r from-[rgb(34,211,238)] to-[rgb(45,212,191)] text-white shadow cursor-pointer";
                                else if (isTodayFlag) cls = "border border-cyan-400 text-cyan-700 font-semibold bg-cyan-50 cursor-pointer";
                                else if (isWeekend) cls = "text-red-500 hover:bg-red-50 cursor-pointer";

                                return (
                                    <button key={idx} type="button" onClick={() => handleSelect(day)} className={`flex h-8 w-8 items-center justify-center rounded-full transition text-xs ${cls}`}>
                                        {day ? day.getDate() : ""}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
