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
import { TopNav, Button, Card, Section, Logo } from "./components/vxr";

function App() {
  const navigate = useNavigate();

  const features = [
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
  ];

  const stats = [
    { n: "10K+", l: "Renters" },
    { n: "3.2K", l: "Verified homes" },
    { n: "4.9★", l: "Avg. rating" },
  ];

  return (
    <div className="min-h-screen w-full bg-vxr-bg text-vxr-text overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-[520px] h-[520px] rounded-full bg-vxr-gradient opacity-25 blur-3xl" />
        <div className="absolute top-1/3 -left-40 w-[480px] h-[480px] rounded-full bg-vxr-accent-soft opacity-70 blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 w-[420px] h-[420px] rounded-full bg-vxr-gradient-soft opacity-50 blur-3xl" />
      </div>

      <TopNav
        items={[
          { id: "features", label: "Features" },
          { id: "how", label: "How it works" },
          { id: "about", label: "About" },
        ]}
        onNav={(id) => {
          if (id === "home") navigate("/");
          else {
            const el = document.getElementById(id);
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }
        }}
        onSignIn={() => navigate("/login")}
        onSignUp={() => navigate("/login")}
      />

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 pt-16 lg:pt-24 pb-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-vxr-surface border border-vxr-border rounded-full px-4 py-1.5 shadow-vxr-sm mb-6">
              <Sparkles size={14} className="text-vxr-accent" />
              <span className="text-xs font-body font-semibold text-vxr-text-sub tracking-wide">
                Now serving 10,000+ renters
              </span>
            </div>

            <h1 className="font-display text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight leading-[1.05] text-vxr-text">
              Rental living,
              <br />
              <span className="bg-vxr-gradient-text bg-clip-text text-transparent">
                reimagined.
              </span>
            </h1>

            <p className="mt-6 font-body text-lg text-vxr-text-sub max-w-xl leading-relaxed">
              Discover, compare, and secure rental homes in minutes. Connect
              directly with verified landlords and manage your entire journey
              from one elegant platform.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Button
                size="lg"
                iconRight={ArrowRight}
                onClick={() => navigate("/login")}
              >
                Start renting now
              </Button>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => navigate("/login")}
              >
                Become a host
              </Button>
            </div>

            <div className="mt-14 grid grid-cols-3 gap-6 max-w-lg">
              {stats.map((s) => (
                <div key={s.l}>
                  <div className="font-display text-2xl font-extrabold text-vxr-text">
                    {s.n}
                  </div>
                  <div className="text-[11px] uppercase tracking-wider text-vxr-text-sub mt-0.5">
                    {s.l}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — visual stack */}
          <div className="relative h-[500px] lg:h-[580px] hidden lg:block">
            <div className="absolute top-4 right-0 w-[380px] bg-vxr-surface rounded-vxr-xl border border-vxr-border shadow-vxr-lg overflow-hidden rotate-[2deg] hover:rotate-0 transition-transform duration-500">
              <div className="relative h-56 bg-vxr-gradient">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80')] bg-cover bg-center mix-blend-overlay opacity-80" />
                <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/95 backdrop-blur flex items-center justify-center shadow-vxr-sm">
                  <Heart size={16} className="text-vxr-accent" />
                </div>
                <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur rounded-full px-3 py-1 text-[11px] font-body font-bold text-vxr-text shadow-vxr-sm">
                  Featured
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-display font-bold text-vxr-text">
                      Skyline Loft · Makati
                    </h3>
                    <div className="flex items-center gap-1 mt-1 text-xs text-vxr-text-sub">
                      <MapPin size={12} />
                      Poblacion, Metro Manila
                    </div>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-xs font-bold text-vxr-text">
                    <Star size={13} className="text-vxr-accent" fill="#FF7043" />
                    4.92
                  </div>
                </div>
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <span className="font-display text-xl font-extrabold text-vxr-accent">
                      ₱28,500
                    </span>
                    <span className="text-xs text-vxr-text-sub ml-1">/month</span>
                  </div>
                  <button className="text-xs font-body font-semibold text-vxr-accent hover:underline">
                    View details →
                  </button>
                </div>
              </div>
            </div>

            <div className="absolute bottom-8 left-0 w-[300px] rounded-vxr-xl bg-vxr-surface border border-vxr-border shadow-vxr-lg p-5 -rotate-[3deg] hover:rotate-0 transition-transform duration-500">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-vxr-md bg-vxr-gradient shadow-vxr-cta flex items-center justify-center">
                  <Home size={20} className="text-white" />
                </div>
                <div>
                  <div className="font-display font-bold text-sm text-vxr-text">
                    New match found
                  </div>
                  <div className="text-xs text-vxr-text-sub">
                    2BR condo · under ₱25K
                  </div>
                </div>
              </div>
              <div className="mt-4 h-1.5 w-full bg-vxr-surface2 rounded-full overflow-hidden">
                <div className="h-full w-4/5 bg-vxr-gradient rounded-full" />
              </div>
              <div className="mt-2 text-[11px] text-vxr-text-sub">
                80% match based on your filters
              </div>
            </div>

            <div className="absolute top-0 left-12 bg-vxr-surface rounded-vxr-xl border border-vxr-border shadow-vxr-lg px-4 py-3 flex items-center gap-3 rotate-[-4deg]">
              <div className="w-8 h-8 rounded-full bg-vxr-success-soft flex items-center justify-center">
                <ShieldCheck size={16} className="text-vxr-success" />
              </div>
              <div>
                <div className="text-xs font-display font-bold text-vxr-text">
                  Verified landlord
                </div>
                <div className="text-[10px] text-vxr-text-sub">ID confirmed</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-6 lg:px-10 py-20">
        <Section
          eyebrow="Why ViewxRent"
          title="Built for the way you live today."
          subtitle="Every detail designed to make finding and managing your next home feel effortless."
        />

        <div className="mt-10 grid md:grid-cols-3 gap-6">
          {features.map((f) => (
            <Card key={f.title} className="p-7 hover:shadow-vxr-lg transition-shadow">
              <div className="w-13 h-13 rounded-vxr-md bg-vxr-gradient shadow-vxr-cta flex items-center justify-center" style={{ width: 52, height: 52 }}>
                <f.icon size={22} className="text-white" />
              </div>
              <h3 className="mt-6 font-display text-xl font-extrabold text-vxr-text tracking-tight">
                {f.title}
              </h3>
              <p className="mt-2 font-body text-vxr-text-sub leading-relaxed">
                {f.desc}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 pb-24">
        <div className="relative overflow-hidden rounded-vxr-sheet bg-vxr-gradient px-10 py-16 lg:px-16 lg:py-20 shadow-vxr-cta">
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-white/10 blur-3xl" />

          <div className="relative grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="font-display text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Ready to find your
                <br />
                next home?
              </h2>
              <p className="mt-4 font-body text-white/90 text-lg max-w-md">
                Join thousands of renters and hosts building a better rental
                experience on ViewxRent.
              </p>
            </div>
            <div className="flex flex-wrap gap-4 lg:justify-end">
              <button
                onClick={() => navigate("/login")}
                className="inline-flex items-center gap-2 bg-white text-vxr-accent font-display font-bold px-7 py-3.5 rounded-vxr shadow-vxr-lg hover:shadow-vxr-md hover:-translate-y-0.5 transition-all"
              >
                Create account
                <ArrowRight size={16} />
              </button>
              <button
                onClick={() => navigate("/login")}
                className="inline-flex items-center gap-2 border border-white/60 text-white font-display font-bold px-7 py-3.5 rounded-vxr hover:bg-white/10 transition-all"
              >
                Sign in
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 lg:px-10 py-10 border-t border-vxr-border">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo size={28} />
          <p className="font-body text-sm text-vxr-text-sub">
            © 2026 ViewxRent. All rights reserved.
          </p>
          <div className="flex items-center gap-6 font-body text-sm text-vxr-text-sub">
            <a href="#" className="hover:text-vxr-text transition-colors">Privacy</a>
            <a href="#" className="hover:text-vxr-text transition-colors">Terms</a>
            <a href="#" className="hover:text-vxr-text transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
