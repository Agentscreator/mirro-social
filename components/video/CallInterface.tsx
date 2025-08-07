"use client"

import { useEffect, useState } from "react"
import {
  Call,
  CallControls,
  CallingState,
  SpeakerLayout,
  StreamCall,
  StreamTheme,
  useCallStateHooks,
} from "@stream-io/video-react-sdk"
import { Button } from "@/components/ui/button"
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff } from "lucide-react"

interface CallInterfaceProps {
  call: Call
  onClose: () => void
  isIncoming?: boolean
}

export function CallInterface({ call, onClose, isIncoming = false }: CallInterfaceProps) {
  const [hasJoined, setHasJoined] = useState(false)
  const { useCallCallingState } = useCallStateHooks()
  const callingState = useCallCallingState()

  useEffect(() => {
    if (callingState === CallingState.LEFT) {
      onClose()
    }
  }, [callingState, onClose])

  const handleAccept = async () => {
    try {
      await call.join()
      setHasJoined(true)
    } catch (error) {
      console.error("Error joining call:", error)
      onClose()
    }
  }

  const handleReject = async () => {
    try {
      await call.leave()
    } catch (error) {
      console.error("Error leaving call:", error)
    } finally {
      onClose()
    }
  }

  if (!hasJoined && isIncoming) {
    return (
      <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 text-center">
          <h3 className="text-2xl font-semibold text-gray-900 mb-4">Incoming {call.type} Call</h3>
          <div className="flex justify-center gap-4">
            <Button
              onClick={handleReject}
              className="bg-red-500 hover:bg-red-600 text-white rounded-full p-4 h-16 w-16"
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
            <Button
              onClick={handleAccept}
              className="bg-green-500 hover:bg-green-600 text-white rounded-full p-4 h-16 w-16"
            >
              <Phone className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/90 z-50">
      <StreamCall call={call}>
        <StreamTheme>
          <div className="h-full flex flex-col">
            <div className="flex-1 relative">
              <SpeakerLayout />
            </div>
            <div className="p-4 flex justify-center">
              <CallControls onLeave={() => call.leave()} />
            </div>
          </div>
        </StreamTheme>
      </StreamCall>
    </div>
  )
} 