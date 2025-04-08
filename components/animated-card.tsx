"use client"

import type React from "react"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface AnimatedCardProps {
  children: React.ReactNode
  className?: string
  headerClassName?: string
  contentClassName?: string
  footerClassName?: string
  delay?: number
}

export function AnimatedCard({
  children,
  className,
  delay = 0,
  ...props
}: AnimatedCardProps & React.ComponentProps<typeof Card>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -5, boxShadow: "0 10px 30px -15px rgba(0, 255, 191, 0.2)" }}
      className="transition-all duration-300"
    >
      <Card className={cn("bg-[#1A1A1A] border-gray-800 overflow-hidden", className)} {...props}>
        {children}
      </Card>
    </motion.div>
  )
}

export function AnimatedCardHeader({ children, className, ...props }: React.ComponentProps<typeof CardHeader>) {
  return (
    <CardHeader className={cn("pb-2", className)} {...props}>
      {children}
    </CardHeader>
  )
}

export function AnimatedCardContent({ children, className, ...props }: React.ComponentProps<typeof CardContent>) {
  return (
    <CardContent className={cn("pb-2", className)} {...props}>
      {children}
    </CardContent>
  )
}

export function AnimatedCardFooter({ children, className, ...props }: React.ComponentProps<typeof CardFooter>) {
  return (
    <CardFooter className={cn("", className)} {...props}>
      {children}
    </CardFooter>
  )
}

export { CardTitle, CardDescription }

