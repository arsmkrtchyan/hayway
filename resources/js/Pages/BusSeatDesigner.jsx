// BusLayoutDemo.jsx
import React, { useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";

// === LIGHT COLORS (никаких чёрных фонов) =========================

const COLORS = {
  pageBg: "linear-gradient(135deg,#e0f2fe,#faf5ff,#fefce8)",
  textMain: "#0f172a",
  textMuted: "#6b7280",
  accent: "#2563eb",
  accentSoft: "#bfdbfe",
  borderSoft: "#cbd5f5",
  busBody: "#ffffff",
  busOutline: "#e5e7eb",
  seatPassengerFrom: "#dbeafe",
  seatPassengerTo: "#60a5fa",
  seatDriverFrom: "#fed7aa",
  seatDriverTo: "#fb923c",
  aisleBg: "#f1f5f9",
};

// === DATA MODEL ===================================================
// Один массив cells, далее режем его на строки по 5 колонок.
// cell: { id, type: "driver" | "seat" | "aisle", label }

const COLUMNS = 5; // 2 места слева + проход + 2 справа

function createInitialCellsFront5(rowsCount = 5) {
  const cells = [];
  let seatNumber = 1;

  for (let r = 0; r < rowsCount; r++) {
    for (let c = 0; c < COLUMNS; c++) {
      const id = `cell-${r}-${c}`;

      // Первый ряд: 5 мест, левое — водитель
      if (r === 0) {
        const isDriver = c === 0;
        cells.push({
          id,
          type: isDriver ? "driver" : "seat",
          label: isDriver ? "D" : String(seatNumber++),
        });
      } else {
        // Остальные ряды: 2 + проход + 2
        if (c === 2) {
          cells.push({
            id,
            type: "aisle",
            label: "",
          });
        } else {
          cells.push({
            id,
            type: "seat",
            label: String(seatNumber++),
          });
        }
      }
    }
  }

  return cells;
}

function computeNextSeatNumber(cells) {
  let max = 0;
  for (const cell of cells) {
    if (cell.type === "seat") {
      const n = parseInt(cell.label, 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }
  return max + 1;
}

function createPassengerRow(rowIndex, startSeatNumber) {
  const newCells = [];
  let seatNumber = startSeatNumber;

  for (let c = 0; c < COLUMNS; c++) {
    const id = `cell-${rowIndex}-${c}`;
    if (c === 2) {
      newCells.push({
        id,
        type: "aisle",
        label: "",
      });
    } else {
      newCells.push({
        id,
        type: "seat",
        label: String(seatNumber++),
      });
    }
  }

  return { newCells, nextSeatNumber: seatNumber };
}

// === SORTABLE SEAT ================================================

function SortableSeat({ cell, onClick, rowIndex, colIndex }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: cell.id });

  const baseStyle = {
    width: 44,
    height: 44,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    userSelect: "none",
    borderWidth: 1,
    borderStyle: "solid",
    fontSize: 12,
    fontWeight: 600,
    cursor: cell.type === "driver" ? "default" : "grab",
    boxSizing: "border-box",
  };

  let bg = `linear-gradient(135deg,${COLORS.seatPassengerFrom},${COLORS.seatPassengerTo})`;
  let color = COLORS.textMain;
  let borderColor = COLORS.borderSoft;
  let subtitle = `R${rowIndex + 1} · C${colIndex + 1}`;

  if (cell.type === "driver") {
    bg = `linear-gradient(135deg,${COLORS.seatDriverFrom},${COLORS.seatDriverTo})`;
    borderColor = "#fed7aa";
    subtitle = "Driver";
  } else if (cell.type === "aisle") {
    bg =
      "repeating-linear-gradient(135deg,#e5e7eb 0,#e5e7eb 4px,#f9fafb 4px,#f9fafb 8px)";
    color = COLORS.textMuted;
    borderColor = "#d1d5db";
    subtitle = "Aisle";
  }

  const style = {
    ...baseStyle,
    background: bg,
    color,
    borderColor,
    opacity: isDragging ? 0.85 : 1,
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <motion.button
      ref={setNodeRef}
      type="button"
      style={style}
      {...attributes}
      {...listeners}
      whileHover={{ y: -3, scale: 1.03 }}
      whileTap={{ scale: 0.96 }}
      onClick={() => onClick(cell)}
    >
      <div style={{ lineHeight: 1 }}>
        <div>{cell.type === "aisle" ? "·" : cell.label}</div>
        <div
          style={{
            fontSize: 9,
            fontWeight: 400,
            color: cell.type === "aisle" ? COLORS.textMuted : "#64748b",
          }}
        >
          {subtitle}
        </div>
      </div>
    </motion.button>
  );
}

// === MAIN DEMO COMPONENT ==========================================

export default function BusLayoutDemo() {
  const [cells, setCells] = useState(() => createInitialCellsFront5(5));
  const [selectedPreset, setSelectedPreset] = useState("front5");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    })
  );

  // Разрезаем 1D-массив на строки по 5 колонок
  const rows = useMemo(() => {
    const result = [];
    for (let i = 0; i < cells.length; i += COLUMNS) {
      result.push(cells.slice(i, i + COLUMNS));
    }
    return result;
  }, [cells]);

  const seatCount = cells.filter((c) => c.type === "seat").length;
  const aisleCount = cells.filter((c) => c.type === "aisle").length;

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setCells((prev) => {
      const oldIndex = prev.findIndex((c) => c.id === active.id);
      const newIndex = prev.findIndex((c) => c.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  function handleCellClick(cell) {
    if (cell.type === "driver") return;

    setCells((prev) =>
      prev.map((c) =>
        c.id === cell.id
          ? {
              ...c,
              type: c.type === "seat" ? "aisle" : "seat",
              label:
                c.type === "seat"
                  ? ""
                  : String(computeNextSeatNumber(prev)), // даём новый номер, если из aisle делаем seat
            }
          : c
      )
    );
  }

  function resetFront5() {
    setCells(createInitialCellsFront5(5));
    setSelectedPreset("front5");
  }

  function handleAddRow() {
    setCells((prev) => {
      const currentRows = Math.ceil(prev.length / COLUMNS);
      const nextSeat = computeNextSeatNumber(prev);
      const { newCells } = createPassengerRow(currentRows, nextSeat);
      return [...prev, ...newCells];
    });
  }

  function handleRemoveRow() {
    setCells((prev) => {
      if (prev.length <= COLUMNS) return prev; // не даём убрать первый ряд
      return prev.slice(0, prev.length - COLUMNS);
    });
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 24,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: COLORS.pageBg,
        boxSizing: "border-box",
        fontFamily:
          "system-ui,-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif",
        color: COLORS.textMain,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1120,
          borderRadius: 24,
          padding: 20,
          background:
            "linear-gradient(135deg,rgba(255,255,255,0.98),rgba(239,246,255,0.95))",
          boxShadow:
            "0 22px 60px rgba(148,163,184,0.45), 0 0 0 1px rgba(148,163,184,0.4)",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1.4fr)",
          gap: 20,
          boxSizing: "border-box",
        }}
      >
        {/* LEFT: controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: "-0.03em",
              }}
            >
              Autobus Layout Editor
            </div>
            <div
              style={{
                marginTop: 4,
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: "0.16em",
                color: COLORS.textMuted,
              }}
            >
              taxi · shuttle · bus
            </div>
            <p
              style={{
                marginTop: 8,
                fontSize: 13,
                color: COLORS.textMuted,
              }}
            >
              Первый ряд — 5 мест (включая водителя). Дальше ряды&nbsp;
              <b>2 места + проход + 2 места</b>. Можно добавлять/убирать ряды,
              перетаскивать места и превращать место в проход и обратно.
            </p>
          </div>

          <div
            style={{
              borderRadius: 16,
              padding: 12,
              background:
                "linear-gradient(135deg,rgba(219,234,254,0.7),rgba(239,246,255,0.9))",
              border: `1px solid ${COLORS.borderSoft}`,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                color: COLORS.textMuted,
              }}
            >
              Presets
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={resetFront5}
                style={{
                  borderRadius: 999,
                  border:
                    selectedPreset === "front5"
                      ? `1px solid ${COLORS.accent}`
                      : `1px solid ${COLORS.borderSoft}`,
                  padding: "6px 12px",
                  fontSize: 12,
                  background:
                    selectedPreset === "front5"
                      ? `linear-gradient(135deg,#2563eb,#3b82f6)`
                      : "#ffffff",
                  color: selectedPreset === "front5" ? "#eff6ff" : COLORS.textMain,
                  boxShadow:
                    selectedPreset === "front5"
                      ? "0 10px 24px rgba(37,99,235,0.45)"
                      : "0 4px 10px rgba(148,163,184,0.35)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Front-5 + aisle (default)
              </button>
            </div>
            <div
              style={{
                display: "flex",
                gap: 10,
                marginTop: 4,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={handleAddRow}
                style={{
                  borderRadius: 999,
                  padding: "6px 12px",
                  fontSize: 12,
                  border: `1px solid ${COLORS.accent}`,
                  background:
                    "linear-gradient(135deg,#dbeafe,#bfdbfe,#93c5fd)",
                  color: COLORS.textMain,
                  cursor: "pointer",
                }}
              >
                + Add row behind
              </button>
              <button
                type="button"
                onClick={handleRemoveRow}
                style={{
                  borderRadius: 999,
                  padding: "6px 12px",
                  fontSize: 12,
                  border: `1px solid ${COLORS.borderSoft}`,
                  background: "#ffffff",
                  color: COLORS.textMuted,
                  cursor: "pointer",
                }}
              >
                − Remove last row
              </button>
            </div>
            <div style={{ fontSize: 11, color: COLORS.textMuted }}>
              При добавлении ряда места нумеруются автоматически. Клик по месту
              → превращаем в проход. Клик по проходу → обратно в место.
            </div>
          </div>

          <div
            style={{
              borderRadius: 16,
              padding: 12,
              background: "#ffffff",
              border: `1px dashed ${COLORS.borderSoft}`,
              fontSize: 11,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div
              style={{
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                color: COLORS.textMuted,
              }}
            >
              Legend
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 8px",
                  borderRadius: 999,
                  background: "#eff6ff",
                  border: `1px solid ${COLORS.borderSoft}`,
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: `linear-gradient(135deg,${COLORS.seatPassengerFrom},${COLORS.seatPassengerTo})`,
                  }}
                />
                Passenger seat
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 8px",
                  borderRadius: 999,
                  background: "#fffbeb",
                  border: "1px solid #fed7aa",
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: `linear-gradient(135deg,${COLORS.seatDriverFrom},${COLORS.seatDriverTo})`,
                  }}
                />
                Driver
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 8px",
                  borderRadius: 999,
                  background: COLORS.aisleBg,
                  border: "1px dashed #d1d5db",
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background:
                      "repeating-linear-gradient(135deg,#e5e7eb 0,#e5e7eb 4px,#f9fafb 4px,#f9fafb 8px)",
                  }}
                />
                Aisle / stepping place
              </span>
            </div>
            <div style={{ marginTop: 6 }}>
              <b>Idea для backend:</b>{" "}
              <code style={{ fontSize: 11 }}>
                seats: Cell[] → JSON (row, col, type)
              </code>{" "}
              и хранить схему автобуса в Laravel для каждой машины.
            </div>
          </div>

          <div
            style={{
              borderRadius: 14,
              padding: 10,
              background: "#ffffff",
              border: `1px solid ${COLORS.borderSoft}`,
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
            }}
          >
            <div>
              Seats: <b>{seatCount}</b>
            </div>
            <div>
              Aisle cells: <b>{aisleCount}</b>
            </div>
            <div>
              Rows: <b>{rows.length}</b>
            </div>
          </div>
        </div>

        {/* RIGHT: bus visual */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{
              position: "relative",
              borderRadius: 28,
              padding: 18,
              background: COLORS.busBody,
              boxShadow:
                "0 18px 40px rgba(148,163,184,0.6), 0 0 0 1px rgba(209,213,219,0.9)",
              boxSizing: "border-box",
            }}
          >
            {/* "Кузов" автобуса */}
            <div
              style={{
                borderRadius: 24,
                border: `1px solid ${COLORS.busOutline}`,
                padding: 12,
                background:
                  "linear-gradient(180deg,#f9fafb,#ffffff,#eff6ff)",
                boxShadow:
                  "inset 0 8px 12px rgba(148,163,184,0.15), inset 0 -4px 10px rgba(148,163,184,0.15)",
              }}
            >
              {/* Перед автобуса */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                  fontSize: 11,
                  color: COLORS.textMuted,
                }}
              >
                <span>Front · windshield</span>
                <span>Drag seats · click to toggle aisle</span>
              </div>

              {/* Область сидений */}
              <div
                style={{
                  borderRadius: 20,
                  padding: 10,
                  background:
                    "linear-gradient(135deg,#e5e7eb,#f9fafb,#e0f2fe)",
                  border: `1px solid ${COLORS.busOutline}`,
                }}
              >
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={cells.map((c) => c.id)}
                    strategy={rectSortingStrategy}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
                    >
                      {rows.map((row, rIndex) => (
                        <div
                          key={`row-${rIndex}`}
                          style={{
                            display: "grid",
                            gridTemplateColumns: `repeat(${COLUMNS}, minmax(0, 1fr))`,
                            gap: 8,
                            alignItems: "center",
                          }}
                        >
                          {row.map((cell, cIndex) => (
                            <SortableSeat
                              key={cell.id}
                              cell={cell}
                              rowIndex={rIndex}
                              colIndex={cIndex}
                              onClick={handleCellClick}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>

              {/* Зад автобуса */}
              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11,
                  color: COLORS.textMuted,
                }}
              >
                <span>Rear · luggage zone</span>
                <span>Use layout per vehicle in taxi CRM</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
