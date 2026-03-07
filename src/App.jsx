import { useState } from 'react'
import './App.css'
import './index.css'

export default function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
      <div className="bg-white p-10 rounded-2xl shadow-xl text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          Tailwind is Working 🎉
        </h1>
        <p className="text-gray-600 mb-6">  
          Your React + Tailwind setup is successful.
        </p>

        <button className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-700 transition">
          Click Me
        </button>
      </div>
    </div>
    
  )
}


