import { Facebook, Twitter, Instagram } from "lucide-react";

export default function Footer() {
  return (
    <footer style={{ background: "#0F1019" }} className="text-gray-400 pt-14 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-10 border-b border-white/10">

          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div
                style={{ background: "linear-gradient(135deg, #FF6B81, #FF9AA2)" }}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
              >
                <span className="text-white font-black text-lg">V</span>
              </div>
              <span
                className="text-white font-bold text-lg"
                style={{ fontFamily: "'Georgia', serif" }}
              >
                ViewxRent
              </span>
            </div>
            <p className="text-sm leading-relaxed text-gray-500">
              The community-driven rental marketplace connecting people with unique spaces and unforgettable experiences.
            </p>
            <div className="flex gap-3 mt-5">
              {[Facebook, Twitter, Instagram].map((Icon, i) => (
                <button
                  key={i}
                  className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <Icon size={14} className="text-gray-400" />
                </button>
              ))}
            </div>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4 tracking-wide">Company</h4>
            <ul className="space-y-3">
              {["About", "Careers", "Press", "Blog"].map((l) => (
                <li key={l}>
                  <a href="#" className="text-sm hover:text-white transition-colors">{l}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4 tracking-wide">Support</h4>
            <ul className="space-y-3">
              {["Help Center", "Safety Information", "Cancellation Option", "Report Issue"].map((l) => (
                <li key={l}>
                  <a href="#" className="text-sm hover:text-white transition-colors">{l}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Explore */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4 tracking-wide">Explore</h4>
            <ul className="space-y-3">
              {["Trece Martires", "Dasmariñas", "Pasig City", "Cavite", "Metro Manila"].map((l) => (
                <li key={l}>
                  <a href="#" className="text-sm hover:text-white transition-colors">{l}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-600">© 2025 ViewxRent. All rights reserved.</p>
          <div className="flex gap-5">
            <a href="#" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">Privacy Policy</a>
            <a href="#" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}