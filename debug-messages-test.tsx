"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

// Simple test component to debug messages page issues
export default function DebugMessagesTest() {
  const router = useRouter()
  const [clickCount, setClickCount] = useState(0)

  const handleTestClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('Test click worked!', clickCount + 1)
    setClickCount(prev => prev + 1)
  }

  const handleNavigation = (path: string) => {
    console.log('Attempting navigation to:', path)
    try {
      router.push(path)
    } catch (error) {
      console.error('Navigation failed:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 p-4">
      <h1 className="text-white text-2xl mb-4">Messages Debug Test</h1>
      
      <div className="space-y-4">
        <button
          onClick={handleTestClick}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          type="button"
        >
          Test Click (Count: {clickCount})
        </button>

        <button
          onClick={() => handleNavigation('/feed')}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded ml-4"
          type="button"
        >
          Navigate to Feed
        </button>

        <button
          onClick={() => handleNavigation('/discover')}
          className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded ml-4"
          type="button"
        >
          Navigate to Discover
        </button>

        <div className="mt-8">
          <h2 className="text-white text-xl mb-4">Test Conversation Items</h2>
          
          {[1, 2, 3].map((id) => (
            <button
              key={id}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log(`Conversation ${id} clicked`)
                handleNavigation(`/messages/user${id}`)
              }}
              className="w-full px-4 py-3 mb-2 bg-gray-800 hover:bg-gray-700 text-white text-left rounded transition-colors"
              type="button"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                  {id}
                </div>
                <div>
                  <h3 className="font-semibold">Test User {id}</h3>
                  <p className="text-gray-400 text-sm">Test message {id}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}