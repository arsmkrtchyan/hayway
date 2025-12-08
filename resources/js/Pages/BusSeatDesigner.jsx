// BusSeatDesigner.jsx
import React, { useState, useMemo } from "react";
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

// ==== STYLES =======================================================

const styles = {
  root: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "radial-gradient(circle at top, #e0f2fe 0%, #eef2ff 45%, #f9fafb 100%)",
    padding: "24px",
    fontFamily:
      "system-ui,-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif",
    color: "#0f172a",
    boxSizing: "border-box",
  },
  card: {
    width: "100%",
    maxWidth: 1120,
    borderRadius: 24,
    padding: 24,
    background:
      "linear-gradient(135deg, rgba(37, 99, 235, 0.06), rgba(59, 130, 246, 0.03))",
    boxShadow:
      "0 24px 60px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(148, 163, 184, 0.3)",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1.6fr)",
    gap: 24,
  },
  leftPanel: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  rightPanel: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: "-0.03em",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.18em",
    padding: "2px 8px",
    borderRadius: 999,
    background: "rgba(22, 163, 74, 0.1)",
    color: "#16a34a",
    border: "1px solid rgba(22,163,74,0.35)",
  },
  label: {
    fontSize: 12,
    fontWeight: 500,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.12em",
  },
  controlRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  controlInput: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  inputBase: {
    width: "100%",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 13,
    border: "1px solid rgba(148, 163, 184, 0.8)",
    background: "rgba(248, 250, 252, 0.9)",
    outline: "none",
  },
  slider: {
    width: "100%",
  },
  pillsRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  pillButton: (active) => ({
    fontSize: 12,
    borderRadius: 999,
    padding: "6px 12px",
    border: active
      ? "1px solid rgba(37, 99, 235, 0.9)"
      : "1px solid rgba(148, 163, 184, 0.8)",
    background: active
      ? "linear-gradient(135deg, #2563eb, #1d4ed8)"
      : "rgba(255,255,255,0.75)",
    color: active ? "#eff6ff" : "#0f172a",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    boxShadow: active
      ? "0 10px 25px rgba(37, 99, 235, 0.35)"
      : "0 4px 12px rgba(148, 163, 184, 0.25)",
    transition: "transform 0.15s ease, box-shadow 0.15s ease",
  }),
  legendRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    fontSize: 11,
    marginTop: 4,
  },
  legendItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "3px 8px",
    borderRadius: 999,
    background: "rgba(15,23,42,0.03)",
    border: "1px dashed rgba(148,163,184,0.6)",
  },
  legendDot: (bg) => ({
    width: 10,
    height: 10,
    borderRadius: 999,
    background: bg,
    boxShadow: "0 0 0 1px rgba(15,23,42,0.25)",
  }),
  busShell: {
    position: "relative",
    borderRadius: 28,
    padding: 14,
    background:
      "radial-gradient(circle at 0% 0%, rgba(37,99,235,0.25), transparent 58%), rgba(15,23,42,0.96)",
    boxShadow:
      "0 26px 60px rgba(15, 23, 42, 0.75), 0 0 0 1px rgba(37, 99, 235, 0.35)",
    color: "#e5e7eb",
    overflow: "hidden",
  },
  busHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    fontSize: 12,
    opacity: 0.85,
  },
  busBody: {
    borderRadius: 20,
    padding: 10,
    background:
      "linear-gradient(145deg, rgba(15,23,42,0.98), rgba(15,23,42,0.94))",
    boxShadow:
      "inset 0 0 0 1px rgba(148,163,184,0.35), inset 0 10px 16px rgba(15, 23, 42, 0.9)",
  },
  busGrid: {
    display: "grid",
    gap: 8,
    alignItems: "stretch",
  },
  busFooter: {
    marginTop: 10,
    display: "flex",
    justifyContent: "space-between",
    fontSize: 11,
    opacity: 0.7,
  },
  seatBase: {
    position: "relative",
    borderRadius: 12,
    padding: 6,
    fontSize: 11,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    cursor: "grab",
    userSelect: "none",
    boxShadow: "0 10px 18px rgba(15,23,42,0.45)",
    border: "1px solid rgba(148,163,184,0.9)",
  },
  seatPassenger: {
    background:
      "linear-gradient(145deg,#eff6ff,#dbeafe,#bfdbfe,#93c5fd,#60a5fa)",
    color: "#1e293b",
  },
  seatDriver: {
    background:
      "linear-gradient(145deg,#f97316,#facc15,#eab308,#f97316,#ea580c)",
    color: "#111827",
    border: "1px solid rgba(248,250,252,0.85)",
    boxShadow: "0 12px 22px rgba(248, 113, 22, 0.6)",
  },
  seatAisle: {
    background:
      "repeating-linear-gradient(135deg, #020617 0, #020617 4px, #111827 4px, #111827 8px)",
    color: "#94a3b8",
    border: "1px dashed rgba(148,163,184,0.9)",
    boxShadow: "0 6px 10px rgba(15,23,42,0.7)",
  },
  seatLabel: {
    fontWeight: 600,
  },
  seatSub: {
    fontSize: 9,
    opacity: 0.75,
  },
  statsCard: {
    marginTop: 10,
    borderRadius: 14,
    padding: 10,
    background: "rgba(15,23,42,0.88)",
    border: "1px solid rgba(37,99,235,0.65)",
    fontSize: 11,
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
  },
  statColumn: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  statValue: {
    fontSize: 15,
    fontWeight: 700,
  },
  statLabel: {
    fontSize: 11,
    opacity: 0.75,
  },
  seatDetails: {
    borderRadius: 16,
    padding: 12,
    background: "rgba(255,255,255,0.85)",
    border: "1px solid rgba(148,163,184,0.85)",
    fontSize: 12,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
};

// ==== HELPERS ======================================================

function createInitialSeats() {
  // базовый мини-автобус: водитель + 3 ряда 2+2
  const total = 17;
  const seats = [];

  for (let i = 0; i < total; i++) {
    if (i === 0) {
      seats.push({
        id: "seat-1",
        type: "driver",
        label: "D",
      });
    } else {
      seats.push({
        id: `seat-${i + 1}`,
        type: "seat",
        label: `${i}`,
      });
    }
  }
  return seats;
}

function adjustSeatCount(prevSeats, newCountRaw) {
  const count = Math.min(64, Math.max(4, Number(newCountRaw) || 0));
  if (count === prevSeats.length) return prevSeats;

  if (count > prevSeats.length) {
    const start = prevSeats.length;
    const add = Array.from({ length: count - prevSeats.length }, (_, i) => ({
      id: `seat-${start + i + 1}`,
      type: "seat",
      label: `${start + i}`,
    }));
    return [...prevSeats, ...add];
  }

  return prevSeats.slice(0, count);
}

function applyPresetLayout(name, setSeats, setColumns, setSelectedSeatId) {
  if (name === "standard") {
    const total = 20;
    const cols = 4;
    const layout = [];

    for (let i = 0; i < total; i++) {
      if (i === 0) {
        layout.push({ id: "seat-1", type: "driver", label: "D" });
      } else {
        layout.push({
          id: `seat-${i + 1}`,
          type: "seat",
          label: `${i}`,
        });
      }
    }

    setColumns(cols);
    setSeats(layout);
    setSelectedSeatId("seat-1");
    return;
  }

  if (name === "front5") {
    // 5 мест в первом ряду, дальше ряды 2+проход+2
    const cols = 5;
    const total = 25;
    const layout = [];

    for (let i = 0; i < total; i++) {
      if (i === 0) {
        layout.push({ id: "seat-1", type: "driver", label: "D" });
        continue;
      }

      const colIndex = i % cols;

      // начиная со второго ряда (i >= cols)
      // делаем центральную колонку проходом
      if (i >= cols && colIndex === 2) {
        layout.push({
          id: `seat-${i + 1}`,
          type: "aisle",
          label: "",
        });
      } else {
        layout.push({
          id: `seat-${i + 1}`,
          type: "seat",
          label: `${i}`,
        });
      }
    }

    setColumns(cols);
    setSeats(layout);
    setSelectedSeatId("seat-1");
  }
}

// ==== SORTABLE SEAT ITEM ==========================================

function SortableSeat({ seat, columns, index, onClickSeat }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: seat.id });

  const row = Math.floor(index / columns) + 1;
  const col = (index % columns) + 1;

  const base = styles.seatBase;
  let typeStyle = styles.seatPassenger;
  if (seat.type === "driver") typeStyle = styles.seatDriver;
  if (seat.type === "aisle") typeStyle = styles.seatAisle;

  const style = {
    ...base,
    ...typeStyle,
    opacity: isDragging ? 0.9 : 1,
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: seat.type === "driver" ? "default" : "grab",
  };

  return (
    <motion.button
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      layout
      whileHover={{
        y: -2,
        boxShadow: "0 18px 26px rgba(15,23,42,0.65)",
      }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onClickSeat(seat)}
    >
      <div style={styles.seatLabel}>
        {seat.type === "driver" ? "Driver" : seat.label || "—"}
      </div>
      <div style={styles.seatSub}>
        {seat.type === "aisle"
          ? "Aisle"
          : `R{${row}} · C{${col}}`}
      </div>
    </motion.button>
  );
}

// ==== MAIN COMPONENT ==============================================

export default function BusSeatDesigner() {
  const [seats, setSeats] = useState(() => createInitialSeats());
  const [columns, setColumns] = useState(4);
  const [selectedSeatId, setSelectedSeatId] = useState("seat-1");
  const seatCount = seats.length;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    })
  );

  const selectedSeat = useMemo(
    () => seats.find((s) => s.id === selectedSeatId) || seats[0],
    [seats, selectedSeatId]
  );

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setSeats((prev) => {
      const oldIndex = prev.findIndex((item) => item.id === active.id);
      const newIndex = prev.findIndex((item) => item.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  function handleSeatClick(seat) {
    setSelectedSeatId(seat.id);

    if (seat.type === "driver") return;

    setSeats((prev) =>
      prev.map((s) =>
        s.id === seat.id
          ? {
              ...s,
              type: s.type === "seat" ? "aisle" : "seat",
            }
          : s
      )
    );
  }

  function handleSeatCountChange(value) {
    setSeats((prev) => adjustSeatCount(prev, value));
  }

  function handleColumnsChange(value) {
    const cols = Math.min(6, Math.max(2, Number(value) || 0));
    setColumns(cols);
  }

  const passengerCount = seats.filter((s) => s.type === "seat").length;
  const aisleCount = seats.filter((s) => s.type === "aisle").length;

  return (
    <div style={styles.root}>
      <div style={styles.card}>
        {/* LEFT PANEL: controls */}
        <div style={styles.leftPanel}>
          <div>
            <div style={styles.title}>
              Autobus Layout Designer
              <span style={styles.badge}>demo · taxi service</span>
            </div>
            <p style={{ fontSize: 13, color: "#4b5563", marginTop: 4 }}>
              Drag &amp; drop seats, добавляй новые ряды, отмечай проход
              одним кликом. Подходит как редактор салона для сервиса такси/
              shuttle.
            </p>
          </div>

          <div style={styles.controlRow}>
            <div style={styles.controlInput}>
              <span style={styles.label}>Total seats</span>
              <input
                type="range"
                min={4}
                max={64}
                value={seatCount}
                onChange={(e) => handleSeatCountChange(e.target.value)}
                style={styles.slider}
              />
              <input
                type="number"
                min={4}
                max={64}
                value={seatCount}
                onChange={(e) => handleSeatCountChange(e.target.value)}
                style={styles.inputBase}
              />
            </div>
            <div style={styles.controlInput}>
              <span style={styles.label}>Seats per row</span>
              <input
                type="range"
                min={2}
                max={6}
                value={columns}
                onChange={(e) => handleColumnsChange(e.target.value)}
                style={styles.slider}
              />
              <input
                type="number"
                min={2}
                max={6}
                value={columns}
                onChange={(e) => handleColumnsChange(e.target.value)}
                style={styles.inputBase}
              />
            </div>
          </div>

          <div>
            <span style={styles.label}>Presets</span>
            <div style={styles.pillsRow}>
              <button
                type="button"
                style={styles.pillButton(false)}
                onClick={() =>
                  applyPresetLayout(
                    "standard",
                    setSeats,
                    setColumns,
                    setSelectedSeatId
                  )
                }
              >
                Standard 2+2 mini-bus
              </button>
              <button
                type="button"
                style={styles.pillButton(false)}
                onClick={() =>
                  applyPresetLayout(
                    "front5",
                    setSeats,
                    setColumns,
                    setSelectedSeatId
                  )
                }
              >
                Front 5 + aisle
              </button>
            </div>
          </div>

          <div>
            <span style={styles.label}>Legend</span>
            <div style={styles.legendRow}>
              <span style={styles.legendItem}>
                <span style={styles.legendDot("#93c5fd")} />
                Passenger seat (click → aisle)
              </span>
              <span style={styles.legendItem}>
                <span style={styles.legendDot("#f97316")} />
                Driver seat
              </span>
              <span style={styles.legendItem}>
                <span style={styles.legendDot("#020617")} />
                Aisle / stepping place (click → seat)
              </span>
            </div>
          </div>

          {selectedSeat && (
            <div style={styles.seatDetails}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                Selected:{" "}
                {selectedSeat.type === "driver"
                  ? "Driver"
                  : selectedSeat.type === "aisle"
                  ? "Aisle"
                  : `Seat #${selectedSeat.label}`}
              </div>
              <div style={{ fontSize: 11, color: "#4b5563" }}>
                Тип можно использовать при сохранении в базе как:
                <code style={{ marginLeft: 4, fontSize: 11 }}>
                  bus_layout[row][col].type
                </code>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2,minmax(0,1fr))",
                  gap: 6,
                  marginTop: 4,
                }}
              >
                <div>
                  <div style={styles.statLabel}>Raw id</div>
                  <div style={styles.statValue}>{selectedSeat.id}</div>
                </div>
                <div>
                  <div style={styles.statLabel}>Type</div>
                  <div style={styles.statValue}>{selectedSeat.type}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: bus view */}
        <div style={styles.rightPanel}>
          <motion.div
            style={styles.busShell}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <div style={styles.busHeader}>
              <span>
                Autobus ·{" "}
                <span style={{ color: "#bfdbfe" }}>
                  {passengerCount} seats
                </span>
              </span>
              <span>Drag seats · Click to set aisle</span>
            </div>

            <div style={styles.busBody}>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={seats.map((s) => s.id)}
                  strategy={rectSortingStrategy}
                >
                  <div
                    style={{
                      ...styles.busGrid,
                      gridTemplateColumns: `repeat(${columns}, minmax(40px, 1fr))`,
                    }}
                  >
                    {seats.map((seat, index) => (
                      <SortableSeat
                        key={seat.id}
                        seat={seat}
                        index={index}
                        columns={columns}
                        onClickSeat={handleSeatClick}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>

            <div style={styles.statsCard}>
              <div style={styles.statColumn}>
                <span style={styles.statLabel}>Passenger seats</span>
                <span style={styles.statValue}>{passengerCount}</span>
              </div>
              <div style={styles.statColumn}>
                <span style={styles.statLabel}>Aisle cells</span>
                <span style={styles.statValue}>{aisleCount}</span>
              </div>
              <div style={styles.statColumn}>
                <span style={styles.statLabel}>Grid</span>
                <span style={styles.statValue}>
                  {columns} cols · ~
                  {Math.ceil(seatCount / columns)} rows
                </span>
              </div>
            </div>

            <div style={styles.busFooter}>
              <span>Use as admin editor → save JSON layout per route</span>
              <span>Perfect for shuttle / taxi bus mapping</span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
