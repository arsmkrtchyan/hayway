// resources/js/Layouts/ClientLayout.jsx

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  CarFront,
  MessageCircle,
  BarChart3,
  MapPin,
  HelpCircle,
} from "lucide-react"

import HayWayLogo from "@/assets/hayway-logo.webp"
import GooglePlayBadgeImg from "@/assets/google-play-badge.WebP"
import AppStoreBadgeImg from "@/assets/app-store-badge.WebP"

import FacebookLogo from "@/assets/facebook-logo.png"
import InstagramLogo from "@/assets/instagram-logo.png"
import TikTokLogo from "@/assets/tiktok-logo.png"

// === APP BADGE COMPONENTS ===

function GooglePlayBadge() {
  return (
    <img
      src={GooglePlayBadgeImg}
      alt="Get it on Google Play"
      className="h-10 w-auto select-none"
      loading="lazy"
      decoding="async"
    />
  )
}

function AppStoreBadge() {
  return (
    <img
      src={AppStoreBadgeImg}
      alt="Download on the App Store"
      className="h-10 w-auto select-none"
      loading="lazy"
      decoding="async"
    />
  )
}

// === STATIC CONSTANTS ===

const currentYear = new Date().getFullYear()

const LOGO_TEXT = "HAYWAY"
const LOGO_LETTERS = LOGO_TEXT.split("")
const LOGO_CENTER_INDEX = (LOGO_LETTERS.length - 1) / 2

const RATING = 4.8
const MAX_RATING = 5
const RADIUS = 40
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const RATING_FRACTION = RATING / MAX_RATING
const STROKE_DASH_OFFSET = CIRCUMFERENCE * (1 - RATING_FRACTION)

// Header menu – section-ների key-երը պարտադիր պետք է համընկնեն էջի id-երին
const SECTION_LINKS = [

  {
    key: "popular-routes-section",   // ⬅ հենց սա ենք փոխում
    label: "Ուղևորություններ",
    icon: CarFront,
  },
  {
    key: "stats-section",
    label: "Վիճակագրություն",
    icon: BarChart3,
  },
  {
    key: "reviews-section",
    label: "Կարծիքներ",
    icon: MessageCircle,
  },

]

// === SUBCOMPONENTS ===

function LogoBrand() {
  return (
    <div className="relative flex items-center gap-3">
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, delay: 0.05, ease: "easeOut" }}
        whileHover={{
          scale: 1.05,
          y: -1,
          boxShadow: "0 0 26px rgba(34,211,238,0.95)",
        }}
        className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-emerald-400 to-sky-400 shadow-[0_0_18px_rgba(34,211,238,0.7)]"
      >
        <img
          src={HayWayLogo}
          alt="HayWay logo"
          className="h-7 w-7 rounded-xl object-cover"
          width={28}
          height={28}
          loading="eager"
          decoding="async"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.15, ease: "easeOut" }}
        className="flex flex-col leading-tight"
      >
        <div className="flex text-sm font-semibold uppercase tracking-[0.22em] text-slate-900">
          {LOGO_LETTERS.map((char, index) => {
            const offsetX = -(index - LOGO_CENTER_INDEX) * 10
            return (
              <motion.span
                key={index}
                initial={{ x: offsetX, opacity: 0, scale: 0.9 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                transition={{
                  delay: 0.18 + index * 0.05,
                  type: "spring",
                  stiffness: 380,
                  damping: 30,
                }}
                className="inline-block"
              >
                {char}
              </motion.span>
            )
          })}
        </div>
        <span className="mt-0.5 text-[11px] text-slate-500">
          Inter-city Taxi Platform
        </span>
      </motion.div>
    </div>
  )
}

// Rating popup – ուղղանկյուն քարտ user-ի տակ
function RatingPopup() {
  return (
    <motion.div
      key="ratingPopup"
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={{
        type: "spring",
        stiffness: 320,
        damping: 22,
      }}
      className="absolute top-full right-0 z-50 mt-3 w-72 rounded-2xl bg-white px-4 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.32)] ring-1 ring-cyan-100/80"
    >
      <div className="flex items-center gap-3">
        <svg className="h-14 w-14" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="transparent"
            strokeWidth="10"
            className="text-slate-200 stroke-current"
          />
          <motion.circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="transparent"
            strokeWidth="10"
            strokeLinecap="round"
            className="text-cyan-400 stroke-current"
            style={{
              strokeDasharray: CIRCUMFERENCE,
              strokeDashoffset: STROKE_DASH_OFFSET,
              filter: "drop-shadow(0 0 8px rgba(34,211,238,0.75))",
            }}
            initial={{ strokeDashoffset: CIRCUMFERENCE }}
            animate={{ strokeDashoffset: STROKE_DASH_OFFSET }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
          <text
            x="50"
            y="46"
            textAnchor="middle"
            alignmentBaseline="middle"
            fontSize="20"
            fontWeight="700"
            fill="#72edccff"
          >
            {RATING.toFixed(1)}
          </text>
          <text
            x="50"
            y="62"
            textAnchor="middle"
            alignmentBaseline="middle"
            fontSize="11"
            fontWeight="500"
            fill="#94a3b8"
          >
            /{MAX_RATING}
          </text>
        </svg>

        <div className="flex flex-col">
          <span className="text-xs font-semibold text-slate-800">
            Ուղևորի միջին գնահատականը
          </span>
          <span className="mt-1 text-[11px] leading-snug text-slate-500">
            Demo արժեք է, հետո կբեռնվի backend-ից ըստ իրական ուղևորությունների։
          </span>
        </div>
      </div>
    </motion.div>
  )
}

function Header({ current, user, headerCollapsed }) {
  const [showRating, setShowRating] = useState(false)

  const passengerName = user?.name || "Demo ուղևոր"
  const avatarUrl =
    user?.avatar || user?.avatar_url || "https://i.pravatar.cc/40?u=demo"

  // scroll helper – օգտագործում ենք scrollIntoView + Tailwind scroll-mt
  const scrollToId = (id) => {
    if (typeof document === "undefined") return
    const el = document.getElementById(id)
    if (!el) return

    el.scrollIntoView({
      behavior: "smooth",
      block: "start",
    })
  }

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex justify-center px-4 pt-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: -18, scale: 0.97 }}
        animate={
          headerCollapsed
            ? { opacity: 0, y: -120, scale: 0.95 }
            : { opacity: 1, y: 0, scale: 1 }
        }
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative flex w-full max-w-7xl flex-col gap-3 rounded-3xl border border-cyan-200/60 bg-white px-4 py-3 shadow-lg sm:px-6 sm:py-4 lg:px-8 lg:py-5 min-h-[68px] sm:min-h-[80px] lg:min-h-[88px]"
      >
        {/* ներքին «աուրա» */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-10 hidden w-40 bg-[radial-gradient(circle,_rgba(56,189,248,0.22)_0%,_transparent_60%)] blur-2xl sm:block"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-8 left-1/2 hidden h-20 w-56 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_rgba(59,130,246,0.32)_0%,_transparent_65%)] blur-2xl md:block"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-8 right-10 hidden h-16 w-40 rounded-full bg-[radial-gradient(circle,_rgba(45,212,191,0.26)_0%,_transparent_65%)] blur-2xl lg:block"
        />

        {/* Վերին շարք */}
        <div className="relative flex items-center justify-between gap-4">
          {/* Logo */}
          <LogoBrand />

          {/* Կենտրոնական menu – section-ների կոճակներ */}
          <nav className="hidden flex-1 justify-center sm:flex">
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.2, ease: "easeOut" }}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-1.5 py-1 text-[11px] shadow-sm ring-1 ring-slate-200/70 backdrop-blur"
            >
              {SECTION_LINKS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => scrollToId(key)}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium text-slate-700 transition-colors hover:bg-cyan-50 hover:text-cyan-800"
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{label}</span>
                </button>
              ))}
            </motion.div>
          </nav>

          {/* Աջ actions – Մուտք / user + rating popup */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.25, ease: "easeOut" }}
            className="flex items-center gap-2"
          >
            {/* Desktop (>= sm) */}
            <div className="hidden items-center gap-2 sm:flex">
              {!user && (
                <a
                  href="#login"
                  className="rounded-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-sky-400 px-5 py-2 text-xs font-semibold text-white shadow-[0_0_22px_rgba(34,197,235,0.9)]"
                >
                  Մուտք
                </a>
              )}

              {user && (
                <div
                  className="relative flex cursor-pointer select-none items-center gap-2"
                  onMouseEnter={() => setShowRating(true)}
                  onMouseLeave={() => setShowRating(false)}
                >
                  <img
                    src={avatarUrl}
                    alt={passengerName}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                  <div className="flex flex-col leading-tight">
                    <span className="max-w-[140px] truncate text-xs font-medium text-slate-800">
                      {passengerName}
                    </span>
                    <span className="text-[10px] text-emerald-600">
                      Ուղևորի գնահատական (demo)
                    </span>
                  </div>

                  <AnimatePresence>
                    {showRating && <RatingPopup />}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Mobile (< sm): Մուտք / user անուն */}
            <div className="flex items-center gap-1 sm:hidden">
              {!user && (
                <a
                  href="#login"
                  className="inline-flex items-center rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 px-3 py-1.5 text-[11px] font-semibold text-white shadow-[0_0_18px_rgba(45,212,191,0.8)]"
                >
                  Մուտք
                </a>
              )}

              {user && (
                <button className="max-w-[120px] truncate rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-800">
                  {passengerName}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="mb-2 mt-2 flex justify-center px-4 pb-1.5 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative w-full max-w-7xl overflow-hidden rounded-3xl border border-slate-200 bg-[radial-gradient(circle_at_top,_#e7f4ff_0%,_#f7fcff_45%,_#edf4ff_100%)] px-5 py-4 text-slate-900 shadow-[0_-10px_24px_rgba(148,163,184,0.45)] sm:px-7 sm:py-5 lg:px-8 lg:py-6"
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <section className="max-w-xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan-700">
              HAYWAY PLATFORM
            </p>
            <h2 className="mt-1.5 text-[21px] font-semibold leading-snug sm:text-[23px]">
              HayWay-ը օգնում է քեզ արագ գտնել ուղևորություն քաղաքից քաղաք։
            </h2>
            <p className="mt-2.5 text-[13px] text-slate-600">
              Միացրու վարորդներին և ուղևորներին մեկ հարթակում՝ ապահով
              ուղևորությունների, թափանցիկ գների և տարբեր վճարային տարբերակների
              միջոցով։
            </p>

            <div className="mt-4 inline-flex flex-wrap items-center gap-3 rounded-2xl bg-white/90 px-3 py-1.5 shadow-[0_10px_22px_rgba(148,163,184,0.35)] ring-1 ring-slate-200/70">
              <a
                href="#"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center"
              >
                <GooglePlayBadge />
              </a>

              <a
                href="#"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center"
              >
                <AppStoreBadge />
              </a>
            </div>
          </section>

          {/* Աջ երեք սյուն */}
          <section className="grid gap-4 text-sm sm:grid-cols-3 lg:gap-6">
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Platform
              </h3>
              <ul className="mt-2.5 space-y-2 text-[13px]">
                <li>
                  <a
                    href="#about"
                    className="text-slate-700 transition-colors hover:text-cyan-700"
                  >
                    Մեր մասին
                  </a>
                </li>
                <li>
                  <a
                    href="#how-it-works"
                    className="text-slate-700 transition-colors hover:text-cyan-700"
                  >
                    Ինչպես է աշխատում
                  </a>
                </li>
                <li>
                  <a
                    href="#pricing"
                    className="text-slate-700 transition-colors hover:text-cyan-700"
                  >
                    Գնացուցակներ
                  </a>
                </li>
                <li>
                  <a
                    href="#contact"
                    className="text-slate-700 transition-colors hover:text-cyan-700"
                  >
                    Կապ
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Resources
              </h3>
              <ul className="mt-2.5 space-y-2 text-[13px]">
                <li>
                  <a
                    href="#drivers"
                    className="text-slate-700 transition-colors hover:text-cyan-700"
                  >
                    Վարորդների համար
                  </a>
                </li>
                <li>
                  <a
                    href="#passengers"
                    className="text-slate-700 transition-colors hover:text-cyan-700"
                  >
                    Ուղևորների համար
                  </a>
                </li>
                <li>
                  <a
                    href="#faq"
                    className="text-slate-700 transition-colors hover:text-cyan-700"
                  >
                    FAQ
                  </a>
                </li>
                <li>
                  <a
                    href="#support"
                    className="text-slate-700 transition-colors hover:text-cyan-700"
                  >
                    Աջակցություն
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Legals
              </h3>
              <ul className="mt-2.5 space-y-2 text-[13px]">
                <li>
                  <a
                    href="#rules"
                    className="text-slate-700 transition-colors hover:text-cyan-700"
                  >
                    Կանոններ
                  </a>
                </li>
                <li>
                  <a
                    href="#terms"
                    className="text-slate-700 transition-colors hover:text-cyan-700"
                  >
                    Terms &amp; Conditions
                  </a>
                </li>
                <li>
                  <a
                    href="#privacy"
                    className="text-slate-700 transition-colors hover:text-cyan-700"
                  >
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a
                    href="#licensing"
                    className="text-slate-700 transition-colors hover:text-cyan-700"
                  >
                    Licensing
                  </a>
                </li>
              </ul>
            </div>
          </section>
        </div>

        {/* Ստորին գիծ + social icons */}
        <div className="mt-4 border-t border-slate-200 pt-2.5 text-[11px] text-slate-500 sm:flex sm:items-center sm:justify-between">
          <span>
            © {currentYear} HayWay · Ուղևորափոխադրումներ Հայաստանի ներսում
          </span>

          <div className="mt-2.5 flex items-center gap-3 sm:mt-0">
            <span className="text-[11px] text-slate-500">Follow us on:</span>

            <motion.a
              href="https://facebook.com"
              aria-label="Facebook"
              target="_blank"
              rel="noreferrer"
              whileHover={{ scale: 1.06, y: -1 }}
              whileTap={{ scale: 0.96 }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition-colors hover:border-cyan-400 hover:bg-cyan-50"
            >
              <img
                src={FacebookLogo}
                alt="Facebook"
                className="h-6 w-6 object-contain"
                loading="lazy"
                decoding="async"
              />
            </motion.a>

            <motion.a
              href="https://instagram.com"
              aria-label="Instagram"
              target="_blank"
              rel="noreferrer"
              whileHover={{ scale: 1.06, y: -1 }}
              whileTap={{ scale: 0.96 }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition-colors hover:border-cyan-400 hover:bg-cyan-50"
            >
              <img
                src={InstagramLogo}
                alt="Instagram"
                className="h-6 w-6 object-contain"
                loading="lazy"
                decoding="async"
              />
            </motion.a>

            <motion.a
              href="https://tiktok.com"
              aria-label="TikTok"
              target="_blank"
              rel="noreferrer"
              whileHover={{ scale: 1.06, y: -1 }}
              whileTap={{ scale: 0.96 }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition-colors hover:border-cyan-400 hover:bg-cyan-50"
            >
              <img
                src={TikTokLogo}
                alt="TikTok"
                className="h-6 w-6 object-contain"
                loading="lazy"
                decoding="async"
              />
            </motion.a>
          </div>
        </div>
      </motion.div>
    </footer>
  )
}

// === MAIN LAYOUT ===

export default function ClientLayout({
  children,
  current = "trips",
  // demo user, որ տեսնես avatar + անունը header-ում
  user = {
    id: 1,
    name: "Արսեն Մկրտչյան",
    avatar: "https://i.pravatar.cc/80?u=arsen-demo",
  },
  headerCollapsed = false,
}) {
  return (
    <div className="relative flex min-h-[100svh] w-full max-w-[100vw] flex-col overflow-x-hidden bg-[radial-gradient(circle_at_top,_#e0f7ff_0%,_#f5fffb_45%,_#e0f2fe_100%)] text-slate-900">
      {/* վերևի «աուրա» */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-40 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.22)_0%,_transparent_60%)] blur-xl"
      />

      <Header current={current} user={user} headerCollapsed={headerCollapsed} />

      {/* offset ֆիքսված header-ի համար */}
      <main className="relative z-0 w-full max-w-[100vw] flex-1 overflow-x-hidden px-4 pb-10 pt-32 sm:px-6 sm:pt-40 lg:px-8 lg:pt-44">
        {children}
      </main>

      {/* ներքևի «աուրա» */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-32 bg-[radial-gradient(circle_at_bottom,_rgba(45,212,191,0.22)_0%,_transparent_60%)] blur-xl"
      />

      <Footer />
    </div>
  )
}
