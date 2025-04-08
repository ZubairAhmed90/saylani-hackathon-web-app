"use client"

import { motion } from "framer-motion"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Trophy } from "lucide-react"

interface LeaderboardItemProps {
  rank: number
  userName: string
  userAvatar?: string
  projectTitle: string
  hackathonTitle: string
  teamName?: string
  score: number
  isCurrentUser?: boolean
  delay?: number
}

export function LeaderboardItem({
  rank,
  userName,
  userAvatar,
  projectTitle,
  hackathonTitle,
  teamName,
  score,
  isCurrentUser = false,
  delay = 0,
}: LeaderboardItemProps) {
  const getInitials = (name: string) => {
    if (!name) return "??"
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  const getRankStyles = () => {
    if (rank === 1) return "bg-yellow-500/10 border border-yellow-500/30"
    if (rank === 2) return "bg-gray-400/10 border border-gray-400/30"
    if (rank === 3) return "bg-amber-600/10 border border-amber-600/30"
    return isCurrentUser ? "bg-[#00FFBF]/10 border border-[#00FFBF]/30" : "bg-black/30"
  }

  const getTrophyColor = () => {
    if (rank === 1) return "text-yellow-400"
    if (rank === 2) return "text-gray-400"
    if (rank === 3) return "text-amber-600"
    return "text-gray-400"
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: delay * 0.1 }}
      className={`flex items-center p-4 rounded-lg ${getRankStyles()}`}
    >
      <div className="flex items-center justify-center w-10 h-10 mr-4">
        {rank <= 3 ? (
          <Trophy className={`h-6 w-6 ${getTrophyColor()}`} />
        ) : (
          <span className="text-lg font-bold text-gray-400">{rank}</span>
        )}
      </div>

      <Avatar className="h-10 w-10 mr-4 border">
        {userAvatar ? <AvatarImage src={userAvatar} alt={userName} /> : null}
        <AvatarFallback>{getInitials(userName)}</AvatarFallback>
      </Avatar>

      <div className="flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-medium">{userName}</h3>
            <p className="text-sm text-gray-400">{projectTitle}</p>
          </div>
          <div className="flex items-center mt-2 sm:mt-0">
            {teamName && <Badge className="mr-2 bg-black/50">{teamName}</Badge>}
            <Badge className="mr-2 bg-black/50">{hackathonTitle}</Badge>
            <span className="text-lg font-bold text-[#00FFBF]">{score}</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

