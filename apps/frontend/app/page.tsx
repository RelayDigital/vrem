import { FadeWrapper } from "@/components/ui/FadeWrapper";
import Footer from "@/components/ui/Footer";
import { Compass, Clock, Layers3, Zap } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const onboardingLink = "https://calendly.com/dami-adetula/vrem-onboarding";

  return (
    <div className="min-h-svh bg-[#0b0b0b] text-[#f5f5f2]">
      <header className="fixed left-0 top-0 z-50 w-full bg-[#0b0b0b]/95 backdrop-blur">
        <div className="relative mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6 py-2 md:h-20 md:py-3">
          <div className="absolute left-6 top-1/2 -translate-y-1/2">
            <img
              src="/logos/vremLight.svg"
              alt="vREM"
              className="h-30 w-30 -translate-y-1 md:h-50 md:w-50 md:-translate-y-2 pt-2 md:pt-3"
            />
          </div>

          <div className="w-[120px] md:w-[200px]" />

          {/* <nav className="hidden items-center gap-8 text-sm text-white/70 md:flex">
            <span className="transition hover:text-white">Products</span>
            <span className="transition hover:text-white">Solutions</span>
            <span className="transition hover:text-white">Peer Stories</span>
            <span className="transition hover:text-white">Knowledge Hub</span>
            <span className="transition hover:text-white">Company</span>
          </nav> */}

          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="hidden h-10 items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 text-xs font-semibold uppercase tracking-widest text-white/70 transition hover:text-white md:inline-flex"
            >
              Login
            </Link>
            <a
              href={onboardingLink}
              className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              Book Onboarding
            </a>
          </div>
        </div>
      </header>


      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/40 to-transparent" />
        </div>

        <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center px-6 pb-24 pt-24 text-center md:pt-28">
            <div className="flex items-center justify-center gap-3 text-4xl font-semibold leading-tight text-white md:text-6xl animate-hero-fade">
            <span>Welcome</span>
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-300 to-teal-600 text-sm font-semibold text-black shadow-[0_12px_30px_rgba(16,185,129,0.35)] animate-float-slow">
            </span>
            <span>to the AI era</span>
            </div>
            <div className="mt-3 flex items-center justify-center gap-3 text-4xl font-semibold text-white md:text-6xl animate-hero-fade-delay-1">
            <span>of Real Estate Marketing</span>
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-300 to-rose-500 text-sm font-semibold text-black shadow-[0_12px_30px_rgba(251,146,60,0.35)] animate-float-slow">
            </span>
            </div>
            <p className="mt-6 max-w-2xl text-base text-white/60 md:text-lg animate-hero-fade-delay-2">
            Run your entire real estate media operation on one intelligent platform.
            </p>

            <div className="mt-16 flex w-full flex-col gap-16">
              <FadeWrapper>
                <div className="flex w-full flex-col items-center gap-8">
                  <h3 className="text-2xl font-semibold text-white md:text-5xl">
                    Book shoots instantly. No back-and-forth required.
                  </h3>
                  <img
                    src="/landingpage/packages.svg"
                    alt="Packages preview"
                    className="h-[46rem] w-full max-w-7xl object-contain"
                  />
                  <p className="text-sm text-white/60 md:text-base">
                    Agents book shoots in minutes with real-time availability and instant confirmation.
                  </p>
                </div>
              </FadeWrapper>
              <FadeWrapper>
                <div className="flex w-full flex-col items-center gap-8">
                  <h3 className="text-2xl font-semibold text-white md:text-5xl">
                    Track every shoot from assignment to delivery.
                  </h3>
                  <img
                    src="/landingpage/agentWorkspace.svg"
                    alt="Agent workspace preview"
                    className="h-[46rem] w-full max-w-7xl object-contain"
                  />
                  <p className="text-sm text-white/60 md:text-base">
                    Monitor workload, assignments, and delivery status without jumping between tools.
                  </p>
                </div>
              </FadeWrapper>
              <FadeWrapper>
                <div className="flex w-full flex-col items-center gap-8">
                  <h3 className="text-2xl font-semibold text-white md:text-5xl">
                    Designed for managers who need certainty.
                  </h3>
                  <img
                    src="/landingpage/teamChat.svg"
                    alt="Team chat preview"
                    className="h-[46rem] w-full max-w-7xl object-contain"
                  />
                  <p className="text-sm text-white/60 md:text-base">
                    A real-time project overview that keeps teams aligned and accountable.
                  </p>
                </div>
              </FadeWrapper>
              <FadeWrapper>
                <div className="flex w-full flex-col items-center gap-8">
                  <h3 className="text-2xl font-semibold text-white md:text-5xl">
                    Run your operation with confidence.
                  </h3>
                  <img
                    src="/landingpage/teamMockup.svg"
                    alt="Team mockup preview"
                    className="h-[46rem] w-full max-w-7xl object-contain"
                  />
                  <p className="text-sm text-white/60 md:text-base">
                    Full visibility into team performance, roles, and accountability as you grow.
                  </p>
                </div>
              </FadeWrapper>
              <FadeWrapper>
                <div className="flex w-full flex-col items-center gap-8">
                  <h3 className="text-2xl font-semibold text-white md:text-5xl">
                    Intelligence that works behind the scenes.
                  </h3>
                  <img
                    src="/landingpage/liveJobMap.png"
                    alt="Live job map preview"
                    className="h-[46rem] w-full max-w-7xl object-contain"
                  />
                  <p className="text-sm text-white/60 md:text-base">
                    Automated, AI-driven technician matching powered by real-time availability, performance history, and location data.
                  </p>
                </div>
              </FadeWrapper>
              <FadeWrapper>
                <div className="flex w-full flex-col items-center gap-8">
                  <h3 className="text-2xl font-semibold text-white md:text-5xl">
                    Your business, quantified.
                  </h3>
                  <img
                    src="/landingpage/stats.png"
                    alt="Stats preview"
                    className="h-[46rem] w-full max-w-7xl object-contain"
                  />
                  <p className="text-sm text-white/60 md:text-base">
                    Real-time visibility into performance, utilization, and results.
                  </p>
                </div>
              </FadeWrapper>
            </div>
        </main>
      </div>

      <FadeWrapper>
      <section className="mx-auto w-full max-w-7xl px-6 pb-28">
        <div className="relative rounded-[32px] border border-white/10 bg-gradient-to-br from-white/5 via-transparent to-white/5 p-10 md:p-14">
          <div className="pointer-events-none absolute inset-0 rounded-[32px] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_60%)]" />
          <div className="relative z-10">
            <h2 className="text-3xl font-semibold text-white md:text-5xl">
              And much, much more.
            </h2>
            <p className="mt-4 max-w-2xl text-sm text-white/60 md:text-base">
              Everything you need to run, scale, and optimize a modern real estate media operation—without stitching together tools.
            </p>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {[
                {
                  title: "Fewer delays, fewer exceptions",
                  hover:
                    "Automated workflows, falback logic, and real-time visibility reduce bottlenecks and manual intervention",
                  tilt: "-rotate-6",
                  Icon: Clock,
                },
                {
                  title: "Built to scale with your operation",
                  hover:
                    "From solo operators and freelancers to multi-market teams, the platform adapts without process breakdowns.",
                  tilt: "rotate-6",
                  Icon: Layers3,
                },
                {
                  title: "Less overhead, more output",
                  hover:
                    "Consolidated tools and automation eliminate busywork across scheduling, dispatch, and delivery.",
                  tilt: "rotate-3",
                  Icon: Zap,
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className={`group relative h-60 rounded-[28px] border border-white/10 bg-[#141414] p-6 text-left text-white shadow-[0_20px_40px_rgba(0,0,0,0.35)] transition hover:-translate-y-2 ${card.tilt}`}
                >
                  <div className="absolute inset-0 rounded-[28px] bg-gradient-to-br from-white/5 to-transparent opacity-80" />
                  <div className="relative z-10 flex h-full flex-col justify-between">
                    <div className="space-y-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80">
                        <card.Icon className="h-5 w-5" />
                      </span>
                      <p className="text-lg font-medium leading-snug text-white/90">
                        {card.title}
                      </p>
                    </div>
                    <span className="text-2xl text-white/60">+</span>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center rounded-[28px] bg-white text-black opacity-0 transition group-hover:opacity-100">
                    <div className="max-w-[14rem] text-center">
                      <span className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/5 text-black/80">
                        <card.Icon className="h-5 w-5" />
                      </span>
                      <p className="text-sm font-medium">{card.hover}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      </FadeWrapper>

      <FadeWrapper>
      <section className="mx-auto w-full max-w-7xl px-6 pb-28">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-center">
            <img
              src="/logos/vremLight.svg"
              alt="vREM"
              className="w-full max-w-6xl"
            />
          </div>

          <div className="text-left">
            <h2 className="text-3xl font-semibold text-white md:text-5xl">
              Built to run your operation, not just support it
            </h2>
            <p className="mt-4 text-sm text-white/60 md:text-base">
              At its core, vREM is an intelligent operations engine. It automates coordination across people, schedules, and jobs—using real-time data to keep work moving efficiently from booking to delivery.
            </p>
            <div className="mt-6 space-y-3 text-sm text-white/80">
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/20 text-xs">
                  ✓
                </span>
                Aligns agents, managers, and technicians in one system
              </div>
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/20 text-xs">
                  ✓
                </span>
                Clear accountability across every role
              </div>
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/20 text-xs">
                  ✓
                </span>
                Decisions driven by live data, not guesswork
              </div>
            </div>
            <a
              href={onboardingLink}
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/10">
                <Compass className="h-4 w-4" />
              </span>
              Discover the platform
            </a>
          </div>
        </div>
      </section>
      </FadeWrapper>

      <Footer></Footer>


      <div className="fixed bottom-6 right-6 z-50">
        <a
          href={onboardingLink}
          className="flex items-center gap-3 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black shadow-[0_20px_40px_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5 hover:bg-white/90"
        >
          Book Onboarding
        </a>
      </div>
    </div>
  );
}

