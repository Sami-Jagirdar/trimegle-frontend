"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Button } from "../components/ui/button"
import { Card } from "../components/ui/card"
import { Input } from "../components/ui/input"
import { ScrollArea } from "../components/ui/scroll-area"
import { Camera, CameraOff, Mic, MicOff, Send, LogOut } from "lucide-react"

interface Message {
  id: string
  text: string
  timestamp: Date
  sender: "you" | "user2" | "user3"
}

export default function Room() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()

  const [isCameraOn, setIsCameraOn] = useState(false)
  const [isMicOn, setIsMicOn] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [participantCount] = useState(1) // TODO: Just you for now

  const videoRef = useRef<HTMLVideoElement>(null)

  // Load persisted media settings
  useEffect(() => {
    const cameraEnabled = sessionStorage.getItem("cameraEnabled") === "true"
    const micEnabled = sessionStorage.getItem("micEnabled") === "true"

    setIsCameraOn(cameraEnabled)
    setIsMicOn(micEnabled)

    if (cameraEnabled) {
      initializeCamera()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const initializeCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: isMicOn,
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (error) {
      console.error("Error accessing camera:", error)
    }
  }

  const toggleCamera = async () => {
    if (isCameraOn) {
      if (stream) {
        stream.getVideoTracks().forEach((track) => track.stop())
      }
      setIsCameraOn(false)
    } else {
      await initializeCamera()
      setIsCameraOn(true)
    }
  }

  const toggleMic = () => {
    if (stream) {
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !isMicOn
      })
    }
    setIsMicOn(!isMicOn)
  }

  const sendMessage = () => {
    if (newMessage.trim()) {
      const message: Message = {
        id: Date.now().toString(),
        text: newMessage,
        timestamp: new Date(),
        sender: "you",
      }
      setMessages((prev) => [...prev, message])
      setNewMessage("")
    }
  }

  const leaveRoom = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
    }
    navigate("/")
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      sendMessage()
    }
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Room {roomId}</h1>
            <p className="text-muted-foreground">{participantCount}/3 participants</p>
          </div>
          <Button variant="outline" onClick={leaveRoom} className="flex items-center space-x-2 bg-transparent">
            <LogOut className="w-4 h-4" />
            <span>Leave Room</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Video Grid */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
              {/* Your Video */}
              <Card className="p-4">
                <div className="aspect-video bg-muted rounded-lg overflow-hidden relative mb-3">
                  {isCameraOn ? (
                    <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <CameraOff className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">You</div>
                </div>
              </Card>

              {/* Participant 2 Placeholder */}
              <Card className="p-4">
                <div className="aspect-video bg-muted rounded-lg overflow-hidden relative mb-3">
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-muted-foreground/20 rounded-full flex items-center justify-center mx-auto mb-2">
                        <span className="text-lg font-semibold text-muted-foreground">2</span>
                      </div>
                      <p className="text-sm text-muted-foreground">Waiting for participant...</p>
                    </div>
                  </div>
                  <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                    Participant 2
                  </div>
                </div>
              </Card>

              {/* Participant 3 Placeholder */}
              <Card className="p-4">
                <div className="aspect-video bg-muted-foreground/5 rounded-lg overflow-hidden relative mb-3">
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-muted-foreground/20 rounded-full flex items-center justify-center mx-auto mb-2">
                        <span className="text-lg font-semibold text-muted-foreground">3</span>
                      </div>
                      <p className="text-sm text-muted-foreground">Waiting for participant...</p>
                    </div>
                  </div>
                  <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                    Participant 3
                  </div>
                </div>
              </Card>
            </div>

            {/* Media Controls */}
            <div className="flex justify-center space-x-4">
              <Button
                variant={isCameraOn ? "default" : "outline"}
                onClick={toggleCamera}
                className="flex items-center space-x-2"
              >
                {isCameraOn ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
                <span>{isCameraOn ? "Camera On" : "Camera Off"}</span>
              </Button>

              <Button
                variant={isMicOn ? "default" : "outline"}
                onClick={toggleMic}
                className="flex items-center space-x-2"
              >
                {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                <span>{isMicOn ? "Mic On" : "Mic Off"}</span>
              </Button>
            </div>
          </div>

          {/* Chat Sidebar */}
          <div className="lg:col-span-1">
            <Card className="h-[600px] flex flex-col">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold text-foreground">Chat</h3>
              </div>

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {messages.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No messages yet. Start the conversation!
                    </p>
                  ) : (
                    messages.map((message) => (
                      <div key={message.id} className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-xs font-medium ${
                              message.sender === "you" ? "text-primary" : "text-muted-foreground"
                            }`}
                          >
                            {message.sender === "you" ? "You" : `Participant ${message.sender.slice(-1)}`}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-sm text-foreground bg-muted p-2 rounded-lg">{message.text}</p>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              <div className="p-4 border-t border-border">
                <div className="flex space-x-2">
                  <Input
                    value={newMessage}
                    onChange={(e: { target: { value: React.SetStateAction<string> } }) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    className="flex-1"
                  />
                  <Button onClick={sendMessage} size="sm">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
