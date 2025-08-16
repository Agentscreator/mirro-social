"use client"

import type React from "react"
import { WatchNavigation } from "./watch-navigation"
import { cn } from "@/lib/utils"

interface WatchLayoutProps {
  children: React.ReactNode
  className?: string
  showNavigation?: boolean
}

export function WatchLayout({ 
  children, 
  className,
  showNavigation = true 
}: WatchLayoutProps) {
  return (
    <div className="watch:block hidden">
      <div className={cn(
        "watch-container watch-full-height watch-scroll",
        className
      )}>
        {children}
      </div>
      
      {showNavigation && <WatchNavigation />}
    </div>
  )
}

// Watch-optimized components
export function WatchCard({ 
  children, 
  className 
}: { 
  children: React.ReactNode
  className?: string 
}) {
  return (
    <div className={cn("watch-card", className)}>
      {children}
    </div>
  )
}

export function WatchButton({ 
  children, 
  onClick, 
  variant = "default",
  className 
}: { 
  children: React.ReactNode
  onClick?: () => void
  variant?: "default" | "primary" | "secondary"
  className?: string 
}) {
  const baseClasses = "watch-btn"
  const variantClasses = {
    default: "bg-gray-600 text-white hover:bg-gray-500",
    primary: "bg-blue-600 text-white hover:bg-blue-500",
    secondary: "bg-transparent border border-gray-400 text-gray-300 hover:bg-gray-700"
  }
  
  return (
    <button 
      onClick={onClick}
      className={cn(baseClasses, variantClasses[variant], className)}
    >
      {children}
    </button>
  )
}

export function WatchInput({ 
  placeholder, 
  value, 
  onChange, 
  type = "text",
  className 
}: { 
  placeholder?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  type?: string
  className?: string 
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={cn("watch-input", className)}
    />
  )
}

export function WatchTitle({ 
  children, 
  className 
}: { 
  children: React.ReactNode
  className?: string 
}) {
  return (
    <h1 className={cn("watch-title text-white", className)}>
      {children}
    </h1>
  )
}

export function WatchSubtitle({ 
  children, 
  className 
}: { 
  children: React.ReactNode
  className?: string 
}) {
  return (
    <p className={cn("watch-subtitle text-gray-300", className)}>
      {children}
    </p>
  )
}

export function WatchAvatar({ 
  src, 
  alt, 
  size = "default",
  className 
}: { 
  src: string
  alt: string
  size?: "default" | "large"
  className?: string 
}) {
  return (
    <img
      src={src}
      alt={alt}
      className={cn(
        "watch-avatar",
        size === "large" && "watch-avatar-lg",
        className
      )}
    />
  )
}

export function WatchStatusDot({ 
  status,
  className 
}: { 
  status: "online" | "offline" | "busy"
  className?: string 
}) {
  return (
    <span className={cn(
      "watch-status-dot",
      status === "online" && "watch-status-online",
      status === "offline" && "watch-status-offline",
      status === "busy" && "watch-status-busy",
      className
    )} />
  )
}

export function WatchModal({ 
  isOpen, 
  onClose, 
  children 
}: { 
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode 
}) {
  if (!isOpen) return null
  
  return (
    <div className="watch-modal" onClick={onClose}>
      <div className="watch-modal-content" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}