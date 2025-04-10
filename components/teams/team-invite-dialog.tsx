"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Copy, Share2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import QRCode from "qrcode.react"

interface TeamInviteDialogProps {
  teamId: string
  teamName: string
  inviteCode: string
  showTrigger?: boolean
}

export default function TeamInviteDialog({ teamId, teamName, inviteCode, showTrigger = true }: TeamInviteDialogProps) {
  const [isOpen, setIsOpen] = useState(!showTrigger)
  const [inviteLink, setInviteLink] = useState("")
  const [qrValue, setQrValue] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    // Generate invite link with the code
    const baseUrl = window.location.origin
    const link = `${baseUrl}/dashboard/teams/join?code=${inviteCode}`
    setInviteLink(link)
    setQrValue(link)
  }, [inviteCode])

  const copyInviteCode = () => {
    navigator.clipboard.writeText(inviteCode)
    toast({
      title: "Copied!",
      description: "Invite code copied to clipboard",
    })
  }

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink)
    toast({
      title: "Copied!",
      description: "Invite link copied to clipboard",
    })
  }

  const copyTeamId = () => {
    navigator.clipboard.writeText(teamId)
    toast({
      title: "Copied!",
      description: "Team ID copied to clipboard",
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button variant="outline" className="border-gray-700 hover:bg-gray-800">
            <Share2 className="mr-2 h-4 w-4" />
            Invite Members
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="bg-[#121212] border-gray-800 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite to {teamName}</DialogTitle>
          <DialogDescription>Share any of these options to invite people to your team.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="code" className="w-full">
          <TabsList className="grid grid-cols-3 bg-black mb-4">
            <TabsTrigger value="code">Invite Code</TabsTrigger>
            <TabsTrigger value="link">Invite Link</TabsTrigger>
            <TabsTrigger value="qr">QR Code</TabsTrigger>
          </TabsList>
          <TabsContent value="code" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-code">Invite Code</Label>
              <div className="flex">
                <Input
                  id="invite-code"
                  readOnly
                  value={inviteCode}
                  className="bg-black border-gray-800 rounded-r-none font-mono text-center text-lg"
                />
                <Button
                  type="button"
                  onClick={copyInviteCode}
                  className="rounded-l-none bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-400">Share this code with people you want to invite to your team</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-id">Team ID (for manual join)</Label>
              <div className="flex">
                <Input
                  id="team-id"
                  readOnly
                  value={teamId}
                  className="bg-black border-gray-800 rounded-r-none font-mono text-sm"
                />
                <Button
                  type="button"
                  onClick={copyTeamId}
                  className="rounded-l-none bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </TabsContent>
          {/* <TabsContent value="link" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-link">Invite Link</Label>
              <div className="flex">
                <Input
                  id="invite-link"
                  readOnly
                  value={inviteLink}
                  className="bg-black border-gray-800 rounded-r-none"
                />
                <Button
                  type="button"
                  onClick={copyInviteLink}
                  className="rounded-l-none bg-[#00FFBF] text-black hover:bg-[#00FFBF]/90"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-400">Share this link with people you want to invite to your team</p>
            </div>
          </TabsContent> */}
          <TabsContent value="qr" className="flex flex-col items-center justify-center py-4 space-y-4">
            <div className="bg-white p-4 rounded-lg">
              <QRCode value={qrValue} size={200} level="H" />
            </div>
            <p className="text-sm text-gray-400 text-center">Scan this QR code to join the team directly</p>
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="w-full bg-black hover:bg-gray-900 border-none"
            onClick={() => setIsOpen(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

