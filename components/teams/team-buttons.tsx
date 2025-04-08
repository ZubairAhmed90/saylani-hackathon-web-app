"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PlusCircle, UserPlus } from "lucide-react"

export function CreateTeamButton() {
  return (
    <Button asChild className="bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90">
      <Link href="/dashboard/teams/create">
        <PlusCircle className="mr-2 h-4 w-4" />
        Create Team
      </Link>
    </Button>
  )
}

export function JoinTeamButton() {
  return (
    <Button asChild variant="outline" className="border-gray-700 hover:bg-gray-800">
      <Link href="/dashboard/teams/join">
        <UserPlus className="mr-2 h-4 w-4" />
        Join Team
      </Link>
    </Button>
  )
}

