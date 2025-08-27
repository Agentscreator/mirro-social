"use client"

import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"

export function NavigationDebug() {
  const router = useRouter()
  const pathname = usePathname()
  const [testResults, setTestResults] = useState<string[]>([])

  const addResult = (result: string) => {
    setTestResults(prev => [...prev.slice(-4), result])
  }

  const testNavigation = async (path: string) => {
    try {
      addResult(`Attempting navigation to ${path}...`)
      router.push(path)
      addResult(`✅ Navigation to ${path} initiated`)
    } catch (error) {
      addResult(`❌ Navigation failed: ${error}`)
    }
  }

  const forceNavigation = (path: string) => {
    addResult(`🔄 Force navigating to ${path}...`)
    window.location.href = path
  }

  useEffect(() => {
    addResult(`Current path: ${pathname}`)
  }, [pathname])

  return (
    <div className="fixed top-4 left-4 z-50 bg-black/80 text-white p-4 rounded-lg backdrop-blur-sm max-w-sm">
      <h3 className="text-sm font-bold mb-2">Navigation Debug</h3>
      <div className="text-xs mb-3 space-y-1">
        {testResults.map((result, i) => (
          <div key={i}>{result}</div>
        ))}
      </div>
      <div className="space-y-2">
        <div className="flex gap-2">
          <Button 
            size="sm" 
            onClick={() => testNavigation('/feed')}
            className="text-xs"
          >
            Feed
          </Button>
          <Button 
            size="sm" 
            onClick={() => testNavigation('/messages')}
            className="text-xs"
          >
            Messages
          </Button>
        </div>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => forceNavigation('/feed')}
            className="text-xs"
          >
            Force Feed
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => forceNavigation('/messages')}
            className="text-xs"
          >
            Force Messages
          </Button>
        </div>
        <Button 
          size="sm" 
          variant="destructive"
          onClick={() => window.location.reload()}
          className="text-xs w-full"
        >
          Reload Page
        </Button>
      </div>
    </div>
  )
}