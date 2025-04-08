"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { motion } from "framer-motion"
import Particles from "react-particles"
import { loadSlim } from "tsparticles-slim"
import type { Container, Engine } from "tsparticles-engine"

export default function HeroSection() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const particlesInit = async (engine: Engine) => {
    await loadSlim(engine)
  }

  const particlesLoaded = async (container: Container | undefined) => {
    // console.log("Particles loaded", container)
  }

  return (
    <div className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden">
      {/* Particles background - only loaded on client side */}
      {isClient && (
        <Particles
          id="tsparticles"
          init={particlesInit}
          loaded={particlesLoaded}
          className="absolute inset-0 -z-10"
          options={{
            background: {
              color: {
                value: "#000000",
              },
            },
            fpsLimit: 60,
            particles: {
              color: {
                value: "#00FFBF",
              },
              links: {
                color: "#00FFBF",
                distance: 150,
                enable: true,
                opacity: 0.2,
                width: 1,
              },
              move: {
                direction: "none",
                enable: true,
                outModes: {
                  default: "bounce",
                },
                random: false,
                speed: 1,
                straight: false,
              },
              number: {
                density: {
                  enable: true,
                  area: 800,
                },
                value: 80,
              },
              opacity: {
                value: 0.3,
              },
              shape: {
                type: "circle",
              },
              size: {
                value: { min: 1, max: 3 },
              },
            },
            detectRetina: true,
          }}
        />
      )}

      {/* Hero content */}
      <div className="z-10 text-center space-y-8 px-4 max-w-5xl mx-auto">
        {/* GeekCode Hackathon Platform in one line */}
        <motion.h1
          className="text-5xl md:text-7xl font-bold tracking-tight"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="text-primary">GeekCode</span>{" "}
          <span className="text-white">Hackathon Platform</span>
        </motion.h1>

        <motion.p
          className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Join the coding revolution. Participate in hackathons, collaborate with peers, and showcase your skills.
        </motion.p>

        {/* Buttons */}
        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center mt-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          {/* Explore Hackathons Button */}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              asChild
              size="lg"
              className="bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90 transition-all duration-300 text-lg px-8 py-6"
            >
              <Link href="/hackathons">
                Explore Hackathons <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </motion.div>

          {/* Join Now Button */}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="bg-[#1A1A1A] border-[#1A1A1A] hover:bg-[#1A1A1A]/90 hover:border-[#00FFBF] transition-all duration-300 text-lg px-8 py-6"
            >
              <Link href="/auth/signup">Join Now</Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>

      {/* Decorative elements */}
      <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-black to-transparent"></div>
    </div>
  )
}
