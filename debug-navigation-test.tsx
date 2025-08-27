"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export default function NavigationTest() {
  const router = useRouter()

  const testNavigation = () => {
    console.log('Testing navigation...')
    try {
      router.push('/feed')
      console.log('Navigation successful')
    } catch (error) {
      console.error('Navigation failed:', error)
    }
  }

  return (
    <div className="p-4 bg-gray-900 text-white">
      <h2 className="text-xl mb-4">Navigation Test</h2>
      <Button onClick={testNavigation} className="bg-blue-500 hover:bg-blue-600">
        Test Navigation to Feed
      </Button>
      <Button 
        onClick={() => router.back()} 
        className="ml-2 bg-green-500 hover:bg-green-600"
      >
        Go Back
      </Button>
    </div>
  )
}