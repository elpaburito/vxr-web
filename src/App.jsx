import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Home,
  MapPin,
  Star,
  Heart,
} from "lucide-react";

function App() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-[#FFF7F3] text-slate-900 overflow-x-hidden">
      {/* Ambient gradient background blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-[520px] h-[520px] rounded-full bg-gradient-to-br from-[#EC6138] to-[#FF8E9E] opacity-30 blur-3xl" />
        <div className="absolute top-1/3 -left-40 w-[480px] h-[480px] rounded-full bg-gradient-to-tr from-[#FF8E9E] to-[#FFB199] opacity-25 blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 w-[420px] h-[420px] rounded-full bg-gradient-to-tl from-[#EC6138] to-[#FFD2B3] opacity-20 blur-3xl" />
      </div>

      {/* Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/60 border-b border-white/50">
        <nav className="max-w-7xl mx-auto px-6 lg:px-10 h-20 flex items-center justify-between">
          <div
            onClick={() => navigate("/")}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#EC6138] to-[#FF8E9E] flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-orange-500/30 group-hover:shadow-orange-500/50 transition-shadow">
                V
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-gradient-to-br from-[#FF8E9E] to-[#EC6138] ring-2 ring-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              ViewxRent
            </span>
          </div>

          <div className="hidden md:flex items-center gap-10">
            <a
              href="#features"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Features
            </a>
            <a
              href="#how"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              How it works
            </a>
            <a
              href="#about"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              About
            </a>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/login")}
              className="hidden sm:inline-flex text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors px-4 py-2"
            >
              Sign in
            </button>
            <button
              onClick={() => navigate("/login")}
              className="inline-flex items-center gap-1.5 bg-slate-900 text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-lg shadow-slate-900/20 hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-900/25 transition-all"
            >
              Get started
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 pt-16 lg:pt-24 pb-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — copy */}
          <div>
            <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur border border-orange-100 rounded-full px-4 py-1.5 shadow-sm mb-6">
              <Sparkles className="w-3.5 h-3.5 text-[#EC6138]" />
              <span className="text-xs font-semibold text-slate-700 tracking-wide">
                Now serving 10,000+ renters
              </span>
            </div>

            <h1 className="text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-[1.05] text-slate-900">
              Rental living,
              <br />
              <span className="bg-gradient-to-r from-[#EC6138] to-[#FF8E9E] bg-clip-text text-transparent">
                reimagined.
              </span>
            </h1>

            <p className="mt-6 text-lg text-slate-600 max-w-xl leading-relaxed">
              Discover, compare, and secure rental homes in minutes. Connect
              directly with verified landlords and manage your entire journey
              from one elegant platform.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <button
                onClick={() => navigate("/login")}
                className="group inline-flex items-center gap-2 bg-gradient-to-r from-[#EC6138] to-[#FF8E9E] text-white font-semibold px-7 py-3.5 rounded-full shadow-xl shadow-orange-500/30 hover:shadow-2xl hover:shadow-orange-500/40 hover:-translate-y-0.5 transition-all"
              >
                Start renting now
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => navigate("/login")}
                className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-800 font-semibold px-7 py-3.5 rounded-full shadow-sm hover:border-slate-300 hover:shadow-md transition-all"
              >
                Become a host
              </button>
            </div>

            {/* Stats strip */}
            <div className="mt-14 grid grid-cols-3 gap-6 max-w-lg">
              {[
                { n: "10K+", l: "Renters" },
                { n: "3.2K", l: "Verified homes" },
                { n: "4.9★", l: "Avg. rating" },
              ].map((s) => (
                <div key={s.l}>
                  <div className="text-2xl font-bold text-slate-900">{s.n}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — visual stack */}
          <div className="relative h-[500px] lg:h-[580px] hidden lg:block">
            {/* Main preview card */}
            <div className="absolute top-4 right-0 w-[380px] rounded-3xl overflow-hidden bg-white shadow-2xl shadow-slate-900/10 rotate-[2deg] hover:rotate-0 transition-transform duration-500">
              <div className="relative h-56 bg-gradient-to-br from-[#EC6138] to-[#FF8E9E]">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80')] bg-cover bg-center mix-blend-overlay opacity-80" />
                <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow">
                  <Heart className="w-4 h-4 text-[#EC6138]" />
                </div>
                <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur rounded-full px-3 py-1 text-xs font-semibold text-slate-900 shadow">
                  Featured
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-slate-900">
                      Skyline Loft · Makati
                    </h3>
                    <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                      <MapPin className="w-3 h-3" />
                      Poblacion, Metro Manila
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-slate-900">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    4.92
                  </div>
                </div>
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <span className="text-xl font-bold text-slate-900">
                      ₱28,500
                    </span>
                    <span className="text-xs text-slate-500 ml-1">/month</span>
                  </div>
                  <button className="text-xs font-semibold text-[#EC6138] hover:underline">
                    View details →
                  </button>
                </div>
              </div>
            </div>

            {/* Secondary card */}
            <div className="absolute bottom-8 left-0 w-[300px] rounded-2xl bg-white shadow-xl shadow-slate-900/10 p-5 -rotate-[3deg] hover:rotate-0 transition-transform duration-500">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF8E9E] to-[#EC6138] flex items-center justify-center">
                  <Home className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-sm text-slate-900">
                    New match found
                  </div>
                  <div className="text-xs text-slate-500">
                    2BR condo · under ₱25K
                  </div>
                </div>
              </div>
              <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full w-4/5 bg-gradient-to-r from-[#EC6138] to-[#FF8E9E] rounded-full" />
              </div>
              <div className="mt-2 text-[11px] text-slate-500">
                80% match based on your filters
              </div>
            </div>

            {/* Floating badge */}
            <div className="absolute top-0 left-12 bg-white rounded-2xl shadow-lg shadow-slate-900/10 px-4 py-3 flex items-center gap-3 rotate-[-4deg]">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-900">
                  Verified landlord
                </div>
                <div className="text-[10px] text-slate-500">ID confirmed</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-6 lg:px-10 py-20">
        <div className="max-w-2xl">
          <div className="text-sm font-semibold text-[#EC6138] tracking-wide uppercase">
            Why ViewxRent
          </div>
          <h2 className="mt-3 text-4xl lg:text-5xl font-bold tracking-tight text-slate-900">
            Built for the way you live today.
          </h2>
          <p className="mt-4 text-slate-600 text-lg">
            Every detail designed to make finding and managing your next home
            feel effortless.
          </p>
        </div>

        <div className="mt-14 grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Search,
              title: "Smart discovery",
              desc: "Filter by neighborhood, budget, and lifestyle. Our search learns what you love.",
            },
            {
              icon: ShieldCheck,
              title: "Verified listings",
              desc: "Every landlord is ID-verified. No ghost listings, no surprises at move-in.",
            },
            {
              icon: Sparkles,
              title: "Seamless experience",
              desc: "Apply, chat, and manage payments in one place — on web or mobile.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="group p-8 rounded-3xl bg-white border border-slate-100 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-500/5 transition-all"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#EC6138] to-[#FF8E9E] flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-110 transition-transform">
                <f.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="mt-6 text-xl font-bold text-slate-900">
                {f.title}
              </h3>
              <p className="mt-2 text-slate-600 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 pb-24">
        <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#EC6138] via-[#F17A5A] to-[#FF8E9E] px-10 py-16 lg:px-16 lg:py-20 shadow-2xl shadow-orange-500/30">
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-white/10 blur-3xl" />

          <div className="relative grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
                Ready to find your
                <br />
                next home?
              </h2>
              <p className="mt-4 text-white/90 text-lg max-w-md">
                Join thousands of renters and hosts building a better rental
                experience on ViewxRent.
              </p>
            </div>
            <div className="flex flex-wrap gap-4 lg:justify-end">
              <button
                onClick={() => navigate("/login")}
                className="inline-flex items-center gap-2 bg-white text-[#EC6138] font-semibold px-7 py-3.5 rounded-full shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all"
              >
                Create account
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate("/login")}
                className="inline-flex items-center gap-2 border border-white/60 text-white font-semibold px-7 py-3.5 rounded-full hover:bg-white/10 transition-all"
              >
                Sign in
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 lg:px-10 py-10 border-t border-slate-200/60">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#EC6138] to-[#FF8E9E] flex items-center justify-center text-white font-bold text-xs">
              V
            </div>
            <span className="text-sm font-semibold text-slate-700">
              ViewxRent
            </span>
          </div>
          <p className="text-sm text-slate-500">
            © 2026 ViewxRent. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <a href="#" className="hover:text-slate-900 transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-slate-900 transition-colors">
              Terms
            </a>
            <a href="#" className="hover:text-slate-900 transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
