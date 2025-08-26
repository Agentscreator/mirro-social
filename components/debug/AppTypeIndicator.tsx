"use client"

import { useEffect, useState } from "react"
import { isNativeApp, isMobileDevice, isIOSDevice, isAndroidDevice } from "@/lib/mobile-utils"

export function AppTypeIndicator() {
  const [appInfo, setAppInfo] = useState({
    isNative: false,
    isMobile: false,
    isIOS: false,
    isAndroid: false,
    userAgent: '',
    capacitor: false
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAppInfo({
        isNative: isNativeApp(),
        isMobile: isMobileDevice(),
        isIOS: isIOSDevice(),
        isAndroid: isAndroidDevice(),
        userAgent: navigator.userAgent,
        capacitor: !!(window as any).Capacitor
      })
    }
  }, [])

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <div className="fixed top-0 left-0 z-[9999] bg-black/90 text-white text-xs p-2 max-w-xs">
      <div>Native: {appInfo.isNative ? '✅' : '❌'}</div>
      <div>Mobile: {appInfo.isMobile ? '✅' : '❌'}</div>
      <div>iOS: {appInfo.isIOS ? '✅' : '❌'}</div>
      <div>Android: {appInfo.isAndroid ? '✅' : '❌'}</div>
      <div>Capacitor: {appInfo.capacitor ? '✅' : '❌'}</div>
      <div className="text-[10px] mt-1 opacity-70">
        {appInfo.userAgent.substring(0, 50)}...
      </div>
    </div>
  )
}