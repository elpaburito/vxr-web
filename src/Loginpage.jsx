import { useState } from "react";
import { FaEye, FaEyeSlash, FaArrowLeft, FaTimes } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="w-[100%] h-screen flex items-center justify-center relative" 
         style={{ 
           background: 'linear-gradient(to bottom right, #ffffff, #b17979)'
         }}>

      {/* Back Button */}
      <div 
        onClick={() => navigate("/")}
        className="absolute top-[5%] left-[5%] flex items-center text-black cursor-pointer hover:opacity-80 transition z-10"
      >
        <FaArrowLeft className="mr-2" />
        Back to Home
      </div>

      {/* Login Card */}
      <div className="w-[30%] min-w-[350px] bg-white/20 backdrop-blur-lg p-[5%] rounded-2xl shadow-2xl flex flex-col items-center"
      style={{ 
           background: 'linear-gradient(to bottom right, #EC6138, #FF8E9E)'
         }}>

        {/* Title */}
        <h1 className="text-white text-[36px] font-bold drop-shadow-lg mb-[2%]">
          Log in to your account
        </h1>

        <p className="text-white/90 text-[14px] mb-[8%]">
          New to ViewxRent? 
          <span 
            onClick={() => setShowSignupModal(true)}
            className="underline cursor-pointer ml-1 hover:opacity-80 transition"
          >
            Create an account
          </span>
        </p>

        {/* Email */}
        <div className="w-[100%] mb-[5%]">
          <p className="text-white text-[14px] mb-[2%]">
            Email address
          </p>
          <input
            type="email"
            placeholder="Enter your email"
            className="w-[100%] h-[45px] bg-white rounded-lg px-[4%] shadow-md outline-none"
          />
        </div>

        {/* Password */}
        <div className="w-[100%] mb-[6%]">
          <div className="flex justify-between text-white text-[14px] mb-[2%]">
            <p>Password</p>
            <p className="cursor-pointer hover:underline">
              Forgot password?
            </p>
          </div>

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              className="w-[100%] h-[45px] bg-white rounded-lg px-[4%] shadow-md outline-none"
            />

            {/* Eye Icon */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-[4%] top-[30%] text-gray-600 text-[18px]"
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
        </div>

        {/* Login Button - Updated to navigate to HomePage2 */}
        <button 
          onClick={() => navigate("/home2")}
          className="w-[90%] h-[45px] bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 mt-6"
        >
          Log in
        </button>
      </div>

      {/* Sign Up Modal */}
      {showSignupModal && (
        <>
          {/* Modal Overlay */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm z-20"
            onClick={() => setShowSignupModal(false)}
          ></div>
          
          {/* Modal Content */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[500px] bg-white rounded-2xl shadow-2xl z-30 p-8 ">
            
            {/* Close Button */}
            <button 
              onClick={() => setShowSignupModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition"
            >
              <FaTimes size={20} />
            </button>

            {/* Modal Header */}
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Create an Account</h2>
            <p className="text-gray-600 mb-6">
              Sign up to find your next rental home and at the same time be a host.
            </p>

            {/* Sign Up Form */}
            <form className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  className="w-full h-[45px] border border-gray-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  defaultValue="name@examplejabowz.com"
                  className="w-full h-[45px] border border-gray-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className="w-full h-[45px] border border-gray-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    className="w-full h-[45px] border border-gray-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                  >
                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1">Phone Number</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg text-gray-600">
                    +63
                  </span>
                  <input
                    type="tel"
                    placeholder="Phone number"
                    className="flex-1 h-[45px] border border-gray-300 rounded-r-lg px-4 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
              </div>

              {/* Create Account Button */}
              <button
                type="submit"
                className="w-[100%] h-[50px] bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 mt-6"
              >
                Create Account
              </button>

              {/* Login Link */}
              <p className="text-center text-gray-600 mt-4">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setShowSignupModal(false);
                  }}
                  className="text-orange-500 font-semibold hover:underline focus:outline-none"
                >
                  Login
                </button>
              </p>
            </form>
          </div>
        </>
      )}
    </div>
  );
}