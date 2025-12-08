// resources/js/Pages/Explore/Explore.jsx
import React, { useRef, useState, useEffect, Suspense } from "react"

import ClientLayout from "@/Layouts/ClientLayout.jsx"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  MapPin,
  Users as UsersIcon,
  Map as MapIcon,
} from "lucide-react"

import DatePickerDemo from "@/Pages/Explore/DatePickerDemo.jsx"
import TripsResultsSection from "@/Pages/Explore/TripsResultsSection.jsx"

// lazy-чанки սեկտորների համար
const AboutSection = React.lazy(() => import("@/Pages/Explore/AboutSection.jsx"))
const PopularRoutesSection = React.lazy(
  () => import("@/Pages/Explore/PopularRoutesSection.jsx"),
)
const ReviewsSection = React.lazy(
  () => import("@/Pages/Explore/ReviewsSection.jsx"),
)
const StatsSection = React.lazy(() => import("@/Pages/Explore/StatsSection.jsx"))

const TRIPS_MOCK = [
  {
    id: 1,
    from_addr: "Երևան, Մաշտոց 1",
    to_addr: "Գյումրի, Կենտրոն",
    departure_hhmm: "08:30",
    arrival_hhmm: "10:10",
    duration: "1ժ 40ր",
    type: "Company",
    seats_total: 4,
    seats_taken: 1,
    rating: 4.8,
    price_amd: 3500,
    operator: "HayWay",
  },
  {
    id: 2,
    from_addr: "Երևան, Տիգրան Մեծ",
    to_addr: "Վանաձոր, Շահոմյան",
    departure_hhmm: "09:10",
    arrival_hhmm: "11:00",
    duration: "1ժ 50ր",
    type: "Rideshare",
    seats_total: 3,
    seats_taken: 2,
    rating: 4.6,
    price_amd: 3000,
    operator: "Aram",
  },
  {
    id: 3,
    from_addr: "Գյումրի, Վարդանանց",
    to_addr: "Երևան, Զեյթուն",
    departure_hhmm: "12:00",
    arrival_hhmm: "13:40",
    duration: "1ժ 40ր",
    type: "Company",
    seats_total: 4,
    seats_taken: 0,
    rating: 4.9,
    price_amd: 3500,
    operator: "HayWay",
  },
  {
    id: 4,
    from_addr: "Երևան, Աջափնյակ",
    to_addr: "Սևան, Կենտրոն",
    departure_hhmm: "15:20",
    arrival_hhmm: "16:30",
    duration: "1ժ 10ր",
    type: "Rideshare",
    seats_total: 4,
    seats_taken: 3,
    rating: 4.4,
    price_amd: 2500,
    operator: "Lilit",
  },
]

export default function Explore() {
  const [showResults, setShowResults] = useState(false)
  const [headerCollapsed, setHeaderCollapsed] = useState(false)

  const stageRef = useRef(null)
  const heroRef = useRef(null)

  const handleSearch = () => {
    if (!showResults) {
      setShowResults(true)
    }
    if (stageRef.current) {
      stageRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    }
  }

  // Scroll listener – hero search vs header
  useEffect(() => {
    const onScroll = () => {
      if (!heroRef.current) return

      const rect = heroRef.current.getBoundingClientRect()
      const headerHeight = 110 // մոտավոր header-ի բարձրությունը

      const shouldCollapse = rect.top <= headerHeight
      setHeaderCollapsed((prev) =>
        prev === shouldCollapse ? prev : shouldCollapse,
      )
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()

    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <ClientLayout current="trips" headerCollapsed={headerCollapsed}>
      {/* Hero search – sticky */}
      <TopSearchBar
        onSearch={handleSearch}
        heroRef={heroRef}
        headerCollapsed={headerCollapsed}
      />

      {/* Գլխավոր բլոկ */}
      <div
        ref={stageRef}
        id="trips-section"
        className="relative z-0 mt-10 scroll-mt-32"
      >
        <AnimatePresence mode="wait">
          {!showResults ? (
            <motion.div
              key="presearch"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4 }}
              className="-mx-4 sm:-mx-6 lg:-mx-8"
            >
              {/* Վերնագիր հատված */}
              <section className="relative scroll-mt-32">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                  <div className="overflow-hidden rounded-3xl border border-cyan-100 bg-white/90 px-6 py-6 shadow-[0_18px_55px_rgba(34,197,235,0.28)] backdrop-blur-xl sm:px-8 sm:py-8">
                    <h1 className="text-center text-[clamp(22px,6vw,40px)] font-extrabold text-slate-900">
                      Գտի՛ր ուղևորություն՝ արագ և հարմար
                    </h1>

                    <p className="mt-2 text-center text-sm text-slate-700">
                      Մուտքագրի՛ր քաղաքները, համեմատի՛ր գները, տես վարորդի
                      վարկանիշը և ընտրի՛ր ամենահարմար տարբերակը HayWay
                      պլատֆորմով։
                    </p>

                    <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-[11px]">
                      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-900">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Ավելի մատչելի, քան classic տաքսիի ծառայությունները
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 px-3 py-1 text-cyan-900">
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                        Real-time հայտեր վարորդներից և ուղևորներից
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              <Suspense fallback={null}>
                <section
                  id="about-section"
                  className="scroll-mt-32"
                >
                  <AboutSection />
                </section>

                <section
                  id="popular-routes-section"
                  className="scroll-mt-32"
                >
                  <PopularRoutesSection />
                </section>

                <section
                  id="reviews-section"
                  className="scroll-mt-32"
                >
                  <ReviewsSection />
                </section>

                <section
                  id="stats-section"
                  className="scroll-mt-32"
                >
                  <StatsSection />
                </section>


              </Suspense>
            </motion.div>
          ) : (
            <section
              id="results-inner"
              className="scroll-mt-32"
            >
              <TripsResultsSection trips={TRIPS_MOCK} />
            </section>
          )}
        </AnimatePresence>
      </div>
    </ClientLayout>
  )
}

/* === TopSearchBar – sticky HeroSearchForm === */

function TopSearchBar({ onSearch, heroRef, headerCollapsed }) {
  const topClass = headerCollapsed
    ? "top-4 sm:top-5 lg:top-6"
    : "top-24 sm:top-28 lg:top-32"

  return (
    <section
      ref={heroRef}
      id="hero-section"
      className="relative mt-4 -mx-4 scroll-mt-32 sm:-mx-6 lg:-mx-8"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className={`sticky z-30 transition-all duration-300 ${topClass}`}
        >
          <HeroSearchForm onSearch={onSearch} />
        </div>
      </div>
    </section>
  )
}

function HeroSearchForm({ onSearch }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSearch?.()
      }}
      className="flex w-full flex-wrap items-stretch gap-3 rounded-3xl border border-emerald-100 bg-white/95 px-4 py-4 shadow-[0_10px_30px_rgba(34,197,235,0.18)] backdrop-blur"
    >
      {/* FROM + TO */}
      <div className="flex min-w-0 flex-1 items-stretch gap-3">
        {/* FROM */}
        <div className="flex h-14 min-w-[180px] flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 shadow-sm">
          <MapPin className="h-4 w-4 text-emerald-700" />
          <input
            id="from"
            name="from"
            className="w-full border-none bg-transparent text-sm placeholder-slate-400 focus:outline-none"
            placeholder="Մեկնարկային կետ"
            readOnly
            defaultValue="Երևան"
          />
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-500 text-white shadow-md shadow-sky-400/50 transition hover:bg-sky-600"
            aria-label="Քարտեզ"
          >
            <MapIcon className="h-4 w-4" />
          </button>
        </div>

        {/* TO */}
        <div className="flex h-14 min-w-[180px] flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 shadow-sm">
          <MapPin className="h-4 w-4 text-emerald-700" />
          <input
            id="to"
            name="to"
            className="w-full border-none bg-transparent text-sm placeholder-slate-400 focus:outline-none"
            placeholder="Վերջնակետ"
            readOnly
            defaultValue="Գյումրի"
          />
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-500 text-white shadow-md shadow-sky-400/50 transition hover:bg-sky-600"
            aria-label="Քարտեզ"
          >
            <MapIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* DATE + PASSENGERS + SEARCH */}
      <div className="flex flex-wrap items-stretch gap-3">
        {/* DatePicker */}
        <div className="flex h-14 items-center">
          <DatePickerDemo />
        </div>

        {/* Passengers */}
        <div className="flex h-14 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 shadow-sm">
          <UsersIcon className="h-4 w-4 text-emerald-700" />
          <span className="text-sm font-semibold">2</span>
        </div>

        {/* Search button */}
        <button
          type="submit"
          className="inline-flex h-14 items-center gap-2 rounded-2xl bg-gradient-to-r from-[rgb(34,211,238)] to-[rgb(45,212,191)] px-6 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(45,212,191,0.6)]"
        >
          <Search className="h-4 w-4" />
          Որոնել
        </button>
      </div>
    </form>
  )
}
