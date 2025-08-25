"use client"

import React from 'react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class SimpleErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    
    // Check for hydration errors (React error #310 is often hydration related)
    const isHydrationError = error.message.includes('Minified React error #310') || 
                            error.message.includes('hydration') ||
                            errorInfo.componentStack?.includes('hydration')
                            
    if (isHydrationError) {
      console.warn('Hydration error detected, may recover automatically on next render')
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-gray-100">
          <div className="text-center max-w-md">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-4">
              We encountered an error while loading this page. Please try refreshing or go back.
            </p>
            <div className="flex gap-3 justify-center">
              <Button 
                onClick={() => window.location.reload()}
                variant="default"
              >
                Refresh Page
              </Button>
              <Button 
                onClick={() => window.history.back()}
                variant="outline"
              >
                Go Back
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Simple functional wrapper
export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return <SimpleErrorBoundary>{children}</SimpleErrorBoundary>
}