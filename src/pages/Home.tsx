"use client"

import { useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "../components/ui/button"
import { Card } from "../components/ui/card"
import { Camera, CameraOff, Mic, MicOff } from "lucide-react"
import { useMedia } from "../hooks/useMedia"

export default function Home() {

  const videoRef = useRef<HTMLVideoElement>(null)
  const navigate = useNavigate()

  const {isCameraOn,
    isMicOn,
    stream,
    toggleCamera,
    toggleMic,
  } = useMedia();

  useEffect(() => {
    if ( (isCameraOn || isMicOn) && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, isCameraOn, isMicOn]);

  const joinRoom = () => {
    // Generate random room ID and navigate to room
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase()
    console.log(roomId);
    navigate(`/room/${roomId}`)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md space-y-8">
        {/* Logo Placeholder */}
        <div className="text-center">
          <div className="w-24 h-24 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl font-bold text-primary">Trimegle</span> {/* Temporary Logo */}
          </div>
          <h1 className="text-3xl font-bold text-foreground">Anonymous 3-Way Chat</h1>
          <p className="text-muted-foreground mt-2">Connect with two strangers in a private video room</p>
        </div>

        {/* Video Preview */}
        <Card className="p-6 space-y-4">
          <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
            {isCameraOn ? (
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <CameraOff className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Camera is off</p>
                </div>
              </div>
            )}
          </div>

          {/* Media Controls */}
          <div className="flex justify-center space-x-4">
            <Button
              variant={isCameraOn ? "default" : "default"}
              size="lg"
              onClick={toggleCamera}
              className="flex items-center space-x-2"
            >
              {isCameraOn ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
              <span>{isCameraOn ? "Camera On" : "Camera Off"}</span>
            </Button>

            <Button
              variant={isMicOn ? "default" : "default"}
              size="lg"
              onClick={toggleMic}
              className="flex items-center space-x-2"
            >
              {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              <span>{isMicOn ? "Mic On" : "Mic Off"}</span>
            </Button>
          </div>
        </Card>

        {/* Join Room Button */}
        <Button onClick={joinRoom} size="lg" className="w-full text-lg py-6">
          Join Random Room
        </Button>

        {/* Privacy Notice */}
        <p className="text-xs text-muted-foreground text-center">
          By joining, you agree to our terms. All chats are anonymous and not recorded.
        </p>
      </div>
    </div>
  )
}
