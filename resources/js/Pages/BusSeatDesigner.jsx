import React, { Suspense, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Float, OrbitControls } from "@react-three/drei";
import {
  animated,
  useSpring,
  useTransition,
  useTrail,
  config,
} from "@react-spring/web";

// Light one-page demo: VanArmComp-style with WebGL (react-three/fiber) + react-spring UI
// - Белый светлый дизайн (никакой тёмной темы)
// - Сверху вниз скролл: Hero с 3D, блоки услуг, процесс работы, контакт
// - Плавные анимации: header, hero, карточки, модальное окно
// - В центре – WebGL-сцена с "PC-тушкой" (корпус + плата) на светлом фоне

// Типы

const services = [
  {
    id: "gaming",
    title: "Gaming сборки",
    tag: "FPS / 144 Hz / RTX",
    description:
      "Максимум кадров, правильный баланс CPU+GPU и адекватный бюджет под реальные задачи.",
  },
  {
    id: "work",
    title: "Workstation",
    tag: "Render / 3D / Dev",
    description:
      "Станции под рендер, монтаж, 3D и разработку: упор на многопоточность и стабильность.",
  },
  {
    id: "office",
    title: "Офис и бизнес",
    tag: "Silent / Stable",
    description:
      "Тихие и надёжные машины для офисов, школ, студий и небольших команд.",
  },
];

const steps = [
  "Запрос и бриф",
  "Подбор конфигурации",
  "Сборка и тест",
  "Выдача и сопровождение",
];

// Примитивная 3D-сцена: корпус + плата + акцентные элементы

const PcBlock = () => {
  return (
    <Float speed={2.2} rotationIntensity={0.6} floatIntensity={1.2}>
      {/* Корпус */}
      <mesh castShadow receiveShadow position={[0, 0.2, 0]}>
        <boxGeometry args={[1.2, 1.8, 0.6]} />
        <meshStandardMaterial color="#e5edf7" metalness={0.1} roughness={0.3} />
      </mesh>

      {/* Передняя панель */}
      <mesh position={[0.6, 0.2, 0]}>
        <boxGeometry args={[0.02, 1.6, 0.56]} />
        <meshStandardMaterial color="#38bdf8" metalness={0.6} roughness={0.2} />
      </mesh>

      {/* Материнка */}
      <mesh position={[-0.25, 0.15, -0.24]}>
        <boxGeometry args={[0.7, 1, 0.04]} />
        <meshStandardMaterial color="#0f172a" metalness={0.3} roughness={0.4} />
      </mesh>

      {/* GPU */}
      <mesh position={[-0.25, -0.2, -0.18]}>
        <boxGeometry args={[0.7, 0.25, 0.1]} />
        <meshStandardMaterial color="#1d4ed8" metalness={0.5} roughness={0.25} />
      </mesh>

      {/* Подсветка */}
      <mesh position={[0, -0.7, 0]}>
        <boxGeometry args={[1.22, 0.06, 0.62]} />
        <meshStandardMaterial
          color="#a5f3fc"
          emissive="#7dd3fc"
          emissiveIntensity={1.2}
          roughness={0.2}
        />
      </mesh>
    </Float>
  );
};

// Сцена с освещением и камерой

const Scene = () => {
  return (
    <>
      <color attach="background" args={["#f8fafc"]} />
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[2, 4, 3]}
        intensity={1.3}
        castShadow
        color={"#e0f2fe"}
      />
      <PcBlock />
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        autoRotate
        autoRotateSpeed={0.8}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={(Math.PI * 3) / 4}
      />
    </>
  );
};

const App = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalService, setModalService] = useState(null);

  // Header анимация (лёгкая тень/blur при загрузке)
  const headerSpring = useSpring({
    from: { opacity: 0, transform: "translate3d(0,-8px,0)" },
    to: { opacity: 1, transform: "translate3d(0,0,0)" },
    config: config.gentle,
  });

  // Hero текст
  const heroSpring = useSpring({
    from: { opacity: 0, y: 30 },
    to: { opacity: 1, y: 0 },
    delay: 120,
    config: config.gentle,
  });

  // Hero бейдж – лёгкая пульсация
  const badgeSpring = useSpring({
    from: { scale: 0.98 },
    to: { scale: 1 },
    loop: { reverse: true },
    config: { tension: 120, friction: 10 },
  });

  // Trail для карточек услуг
  const servicesTrail = useTrail(services.length, {
    from: { opacity: 0, y: 18, scale: 0.98 },
    to: { opacity: 1, y: 0, scale: 1 },
    delay: 260,
    config: config.stiff,
  });

  // Trail для шагов процесса
  const stepsTrail = useTrail(steps.length, {
    from: { opacity: 0, x: -16 },
    to: { opacity: 1, x: 0 },
    delay: 380,
    config: config.gentle,
  });

  // Модалка
  const modalTransition = useTransition(modalOpen, {
    from: { opacity: 0, y: 40 },
    enter: { opacity: 1, y: 0 },
    leave: { opacity: 0, y: 10 },
    config: config.stiff,
  });

  const openServiceModal = (service) => {
    setModalService(service);
    setModalOpen(true);
  };

  const openQuickModal = () => {
    setModalService(null);
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900">
      {/* HEADER */}
      <animated.header
        style={headerSpring}
        className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur"
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-400 text-xs font-bold text-white shadow-sm">
              VA
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight">VanArmComp</p>
              <p className="text-[11px] text-slate-500">Custom PC · Service · Business</p>
            </div>
          </div>

          <div className="hidden items-center gap-6 text-[11px] font-medium text-slate-600 md:flex">
            <a href="#hero" className="hover:text-slate-900">
              Главная
            </a>
            <a href="#services" className="hover:text-slate-900">
              Услуги
            </a>
            <a href="#process" className="hover:text-slate-900">
              Процесс
            </a>
            <a href="#contact" className="hover:text-slate-900">
              Контакт
            </a>
          </div>

          <button
            onClick={openQuickModal}
            className="hidden rounded-full bg-sky-500 px-4 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-sky-400 md:inline-flex"
          >
            Быстрый запрос
          </button>
        </div>
      </animated.header>

      {/* MAIN */}
      <main className="mx-auto flex max-w-6xl flex-col gap-16 px-4 pb-20 pt-8 md:px-8 md:pt-10">
        {/* HERO + WEBGL */}
        <section
          id="hero"
          className="grid gap-10 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.1fr)] md:items-center"
        >
          <animated.div
            style={{
              opacity: heroSpring.opacity,
              transform: heroSpring.y.to((y) => `translate3d(0, ${y}px, 0)`),
            }}
            className="space-y-7"
          >
            <animated.div
              style={{ transform: badgeSpring.scale.to((s) => `scale(${s})`) }}
              className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white/90 px-3 py-1 text-[11px] font-medium text-slate-600 shadow-sm"
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-100 text-[10px] font-semibold text-sky-600">
                ●
              </span>
              <span>WebGL + react-spring · VanArmComp demo layout</span>
            </animated.div>

            <h1 className="text-balance text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-[2.6rem]">
              3D-превью корпуса
              <span className="bg-gradient-to-r from-sky-500 to-emerald-500 bg-clip-text text-transparent">
                {" "}
                и живой интерфейс для
              </span>{" "}
              сборки и сервиса ПК.
            </h1>

            <p className="max-w-xl text-sm leading-relaxed text-slate-600 sm:text-[0.95rem]">
              WebGL-сцена показывает условную "тушку" компьютера, а справа и ниже – плавный
              интерфейс: услуги, процесс и контакт. Всё на светлом фоне, без тёмной темы.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={openQuickModal}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 via-sky-400 to-emerald-400 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-transform hover:translate-y-[1px] hover:brightness-105"
              >
                Оставить запрос
                <span className="text-base">↗</span>
              </button>
              <button
                onClick={() => {
                  const el = document.getElementById("services");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Смотреть услуги
                <span className="text-base">↓</span>
              </button>
              <div className="flex items-center gap-3 text-[11px] text-slate-500">
                <div className="flex -space-x-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-[10px] font-semibold text-sky-600">
                    R3F
                  </div>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-[10px] font-semibold text-emerald-600">
                    RS
                  </div>
                </div>
                <span>react-three/fiber + @react-spring/web</span>
              </div>
            </div>
          </animated.div>

          {/* WebGL card */}
          <div className="flex h-[320px] items-stretch md:h-[380px]">
            <div className="relative flex w-full items-stretch overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_0_0,rgba(59,130,246,0.12),transparent_55%),radial-gradient(circle_at_100%_100%,rgba(16,185,129,0.12),transparent_60%)]" />
              <div className="relative h-full w-full">
                <Canvas
                  shadows
                  camera={{ position: [2.2, 1.9, 3.2], fov: 45 }}
                  className="h-full w-full"
                >
                  <Suspense fallback={null}>
                    <Scene />
                  </Suspense>
                </Canvas>
              </div>
            </div>
          </div>
        </section>

        {/* SERVICES */}
        <section id="services" className="space-y-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Услуги</h2>
              <p className="max-w-xl text-sm text-slate-600">
                Три базовые линии: gaming, рабочие станции и офис/бизнес. Каждую карточку можно
                раскрыть через модальное окно.
              </p>
            </div>
            <p className="text-[11px] text-slate-500">
              Клик по карточке откроет анимированное окно с описанием.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {servicesTrail.map((styles, index) => {
              const service = services[index];
              return (
                <animated.button
                  key={service.id}
                  style={{
                    opacity: styles.opacity,
                    transform: styles.y.to((y) => `translate3d(0, ${y}px, 0)`),
                  }}
                  onClick={() => openServiceModal(service)}
                  className="group flex flex-col items-stretch rounded-2xl border border-slate-200 bg-white/90 p-4 text-left shadow-sm ring-sky-100/60 transition-transform hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(15,23,42,0.08)]"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{service.title}</p>
                      <p className="text-[11px] text-slate-500">{service.tag}</p>
                    </div>
                    <span className="rounded-full bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-600 group-hover:bg-sky-50 group-hover:text-sky-700">
                      Подробнее
                    </span>
                  </div>
                  <p className="text-[11px] leading-snug text-slate-600">
                    {service.description}
                  </p>
                </animated.button>
              );
            })}
          </div>
        </section>

        {/* PROCESS */}
        <section id="process" className="space-y-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Как всё происходит</h2>
              <p className="max-w-xl text-sm text-slate-600">
                Четыре шага: от заявки до сопровождения. Линейка шагов скроллится вместе со страницей
                и мягко проявляется.
              </p>
            </div>
          </div>

          <div className="relative border-l border-dashed border-slate-200 pl-4 sm:pl-6">
            {stepsTrail.map((styles, index) => {
              const step = steps[index];
              const isLast = index === steps.length - 1;
              return (
                <animated.div
                  key={step}
                  style={{
                    opacity: styles.opacity,
                    transform: styles.x.to((x) => `translate3d(${x}px, 0, 0)`),
                  }}
                  className="relative mb-6 last:mb-0"
                >
                  <div className="absolute -left-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-[10px] font-semibold text-white shadow-sm sm:-left-3">
                    {index + 1}
                  </div>
                  {!isLast && (
                    <div className="absolute -left-[1px] top-5 h-6 w-[2px] bg-gradient-to-b from-sky-500/40 to-transparent sm:-left-[3px]" />
                  )}
                  <div className="ml-3 rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm sm:ml-5">
                    <p className="text-xs font-semibold text-slate-900">{step}</p>
                    <p className="mt-1 text-[11px] leading-snug text-slate-600">
                      Описание каждого шага можно детализировать под реальный процесс VanArmComp.
                    </p>
                  </div>
                </animated.div>
              );
            })}
          </div>
        </section>

        {/* CONTACT */}
        <section id="contact" className="grid gap-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.1fr)]">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">Контакт</h2>
            <p className="max-w-xl text-sm text-slate-600">
              Блок для реальной формы VanArmComp. Сейчас – демо-поля, которые можно связать с
              бекендом или Telegram-ботом.
            </p>
            <ul className="space-y-1.5 text-[11px] text-slate-600">
              <li>· Цель: игры, работа, рендер, офис, студия.</li>
              <li>· Бюджет, сроки и есть ли уже какие-то комплектующие.</li>
              <li>· Предпочтения по тишине, корпусу и подсветке.</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm">
            <p className="mb-3 text-xs font-semibold text-slate-900">Быстрый бриф</p>
            <div className="space-y-3 text-[11px]">
              <div className="space-y-1">
                <label className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
                  Имя и контакт
                </label>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] outline-none transition-colors focus:border-sky-400 focus:bg-white"
                  placeholder="Имя + телефон / Telegram"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
                  Задача и бюджет
                </label>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] outline-none transition-colors focus:border-sky-400 focus:bg-white"
                  placeholder="Например: gaming 1080p, 700–900$"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
                  Детали
                </label>
                <textarea
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] outline-none transition-colors focus:border-sky-400 focus:bg-white"
                  placeholder="Что уже есть, на чём сейчас работаете, пожелания по корпусу и шуму."
                />
              </div>
              <button
                onClick={openQuickModal}
                className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-full bg-sky-500 px-4 py-2.5 text-[11px] font-semibold text-white shadow-md hover:bg-sky-400"
              >
                Отправить демо-запрос (открыть модалку)
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* MODAL */}
      {modalTransition((styles, show) =>
        show ? (
          <animated.div
            style={{ opacity: styles.opacity }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/15 backdrop-blur-sm"
            onClick={closeModal}
          >
            <animated.div
              style={{
                transform: styles.y.to((y) => `translate3d(0, ${y}px, 0)`),
              }}
              className="mx-4 w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.24)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-900">
                    {modalService ? modalService.title : "Быстрый запрос"}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-600">
                    {modalService
                      ? modalService.description
                      : "В реальном сайте форма отсюда уходит в CRM, Telegram или почту. Сейчас это демо с плавной анимацией."}
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-200"
                >
                  Закрыть
                </button>
              </div>

              {!modalService && (
                <div className="grid gap-3 text-[11px] sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
                      Как связаться
                    </label>
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] outline-none transition-colors focus:border-sky-400 focus:bg-white"
                      placeholder="Телефон / Telegram / email"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
                      Тип запроса
                    </label>
                    <select className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] outline-none focus:border-sky-400 focus:bg-white">
                      <option>Новая сборка</option>
                      <option>Сервис/чистка</option>
                      <option>Корпоративный</option>
                      <option>Другое</option>
                    </select>
                  </div>
                </div>
              )}

              <p className="mt-4 text-[10px] text-slate-500">
                Здесь можно добавить чекбоксы согласия, источник лида (сайт, реклама, рекомендация)
                и связать всё с настоящим VanArmComp-бекендом.
              </p>
            </animated.div>
          </animated.div>
        ) : null
      )}
    </div>
  );
};

export default App;
