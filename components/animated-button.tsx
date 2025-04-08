"use client"

import type React from "react"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface AnimatedButtonProps {
  children: React.ReactNode
  className?: string
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  asChild?: boolean
  onClick?: () => void
  disabled?: boolean
  type?: "button" | "submit" | "reset"
}

export function AnimatedButton({
  children,
  className,
  variant = "default",
  size = "default",
  asChild = false,
  onClick,
  disabled = false,
  type = "button",
  ...props
}: AnimatedButtonProps) {
  const isPrimary = variant === "default" && !className?.includes("bg-")

  return (
    <motion.div
      whileHover={{ scale: disabled ? 1 : 1.03 }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      className="inline-block"
    >
      <Button
        variant={variant}
        size={size}
        asChild={asChild}
        onClick={onClick}
        disabled={disabled}
        type={type}
        className={cn(
          "transition-all duration-300",
          isPrimary && "bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90",
          className,
        )}
        {...props}
      >
        {children}
      </Button>
    </motion.div>
  )
}

