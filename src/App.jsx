import React from "react";
import { useNavigate } from "react-router-dom";

function App() {
  const navigate = useNavigate();

  return (
    <div
      className="w-[100%] min-h-[100vh] flex flex-col relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #EC6138 0%, #FF8E9E 100%)",
      }}
    >
      {/* Decorative blurred circles for visual interest */}
      <div className="absolute top-[-10%] right-[-5%] w-[300px] h-[300px] rounded-full bg-white/10 blur-3xl"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-white/5 blur-3xl"></div>
      
      {/* Navbar - Premium glass morphism design */}
      <nav className="relative z-10 mx-[4%] mt-[1%] px-[3%] py-[0.8%] flex items-center justify-between bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 shadow-xl">
        
        {/* Logo with premium styling - CLICKABLE */}
        <div 
          onClick={() => navigate("/home")}
          className="flex items-center gap-[0.6rem] cursor-pointer hover:opacity-80 transition-opacity"
        >
          <div className="bg-white text-orange-500 w-[2.5rem] h-[2.5rem] rounded-xl flex items-center justify-center font-bold text-xl shadow-lg transform hover:rotate-3 transition-transform duration-300">
            V
          </div>
          <span className="text-white text-[1.3rem] font-semibold tracking-tight">ViewxRent</span>
        </div>

        {/* Navigation links with premium hover effect */}
        <div className="flex items-center gap-[3rem]">
          <a href="#" className="text-white/90 hover:text-white font-medium transition-all duration-300 relative group">
            Home
            <span className="absolute bottom-[-6px] left-1/2 transform -translate-x-1/2 w-0 h-[3px] bg-white rounded-full group-hover:w-full transition-all duration-300"></span>
          </a>
          <a href="#" className="text-white/90 hover:text-white font-medium transition-all duration-300 relative group">
            About us
            <span className="absolute bottom-[-6px] left-1/2 transform -translate-x-1/2 w-0 h-[3px] bg-white rounded-full group-hover:w-full transition-all duration-300"></span>
          </a>
        </div>

        {/* Premium Sign In button */}
        <button 
          onClick={() => navigate("/login")}
          className="bg-white text-orange-500 px-[2.2rem] py-[0.7rem] rounded-full text-[0.95rem] font-bold shadow-lg hover:shadow-2xl transform hover:scale-105 hover:-translate-y-0.5 transition-all duration-300 border-2 border-transparent hover:border-white/50"
        >
          Sign In
        </button>
      </nav>

      {/* Hero Section - with adjusted top margin for premium navbar */}
      <div className="flex flex-col items-center text-center text-white px-[4%] flex-grow justify-center relative z-10 mt-[-2%]">
        <div className="w-[90%] max-w-[1200px]">

          {/* Title with animated gradient (optional) */}
          <h1 className="text-[2.5rem] md:text-[3rem] lg:text-[3.75rem] font-bold leading-tight drop-shadow-lg">
            Find Rental Homes Made Easy
          </h1>

          {/* Description */}
          <p className="mt-[1.5rem] text-[1.125rem] md:text-[1.25rem] opacity-90">
            Browse, compare, and manage rental properties instantly — all in
            one secure web platform.
          </p>

          <p className="mt-[0.75rem] text-[1.125rem] md:text-[1.25rem] opacity-90">
            Search houses and apartments, connect directly with property
            owners, and manage listings effortlessly with real-time updates
            and verified information.
          </p>
        </div>

        {/* CTA Card */}
        <div className="mt-[4rem] w-[90%] max-w-[800px]">
          <div
            className="p-[8%] md:p-[6%] rounded-2xl shadow-2xl backdrop-blur-md border border-white/30 text-white"
            style={{
              background: "linear-gradient(to bottom right, #EC6138, #FF8E9E)",
            }}
          >
            <h2 className="text-[1.5rem] md:text-[1.875rem] font-semibold">
              Ready to start your journey?
            </h2>

            <p className="mt-[0.75rem] opacity-90 text-[1rem] md:text-[1.125rem]">
              Join thousands of hosts and renters creating memories together
              on ViewxRent.
            </p>

            {/* Buttons */}
            <div className="mt-[2rem] flex justify-center gap-[1.5rem] flex-wrap">
              <button 
                onClick={() => navigate("/login")}
                className="bg-white text-orange-600 px-[7%] py-[3%] md:px-[2rem] md:py-[0.75rem] rounded-lg font-semibold shadow hover:scale-105 transition whitespace-nowrap"
              >
                Start Renting Now
              </button>

              <button 
                onClick={() => navigate("/login")}
                className="border border-white px-[7%] py-[3%] md:px-[2rem] md:py-[0.75rem] rounded-lg hover:bg-white hover:text-orange-600 transition whitespace-nowrap"
              >
                Become a Host
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-white text-[0.875rem] py-[1.5rem] opacity-80 relative z-10">
        © 2026 ViewxRent. All rights reserved.
      </footer>
    </div>
  );
}

export default App;