"use client"

import { useEffect, useState } from "react"

interface TypingAnimationProps {
  dots?: number
  speed?: number
}

export function TypingAnimation({ dots = 3, speed = 500 }: TypingAnimationProps) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCount((prev) => (prev + 1) % (dots + 1))
    }, speed)

    return () => clearInterval(interval)
  }, [dots, speed])

  return (
    <span className="inline-flex items-center">
      <span className="text-2xl font-light tracking-wider text-white drop-shadow-sm">
        Thinking
      </span>
      <span className="ml-2 text-blue-500">
        {Array(count)
          .fill(".")
          .map((dot, i) => (
            <span
              key={i}
              className="inline-block animate-pulse text-xl font-bold"
              style={{ animationDelay: `${i * 150}ms` }}
            >
              {dot}
            </span>
          ))}
      </span>
      <span className="inline-block w-6"></span>
    </span>
  )
}
