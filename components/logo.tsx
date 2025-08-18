import { cn } from "@/lib/utils"
import Image from "next/image"

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
      <Image
        src="/icon-512.png"
        alt="Mirro App Icon"
        fill
        className="rounded-xl object-contain"
        priority
      />
    </div>
  )
}
