import { cn } from "@/lib/utils"

interface LogoProps {
  size?: "sm" | "md" | "lg"
  className?: string
}

export function Logo({ size = "md", className }: LogoProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  }

  return (
    <div className={cn("relative", sizeClasses[size], className)}>
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 shadow-lg" style={{ boxShadow: '0 0 20px rgba(59, 130, 246, 0.6), 0 0 40px rgba(147, 51, 234, 0.4)' }}>
        <svg viewBox="0 0 100 100" className="h-full w-full p-6">
          <g fill="white">
            {/* Center circle */}
            <circle cx="50" cy="50" r="4" />
            {/* Six spokes radiating from center */}
            <circle cx="50" cy="25" r="6" />
            <circle cx="71.65" cy="37.5" r="6" />
            <circle cx="71.65" cy="62.5" r="6" />
            <circle cx="50" cy="75" r="6" />
            <circle cx="28.35" cy="62.5" r="6" />
            <circle cx="28.35" cy="37.5" r="6" />
            {/* Connecting lines */}
            <rect x="48" y="29" width="4" height="17" />
            <rect x="48" y="54" width="4" height="17" />
            <rect x="54" y="48" width="13.65" height="4" transform="rotate(30 50 50)" />
            <rect x="32.35" y="48" width="13.65" height="4" transform="rotate(-30 50 50)" />
            <rect x="54" y="48" width="13.65" height="4" transform="rotate(-30 50 50)" />
            <rect x="32.35" y="48" width="13.65" height="4" transform="rotate(30 50 50)" />
          </g>
        </svg>
      </div>
    </div>
  )
}
