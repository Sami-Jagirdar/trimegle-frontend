"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "../components/ui/button"
import { Card } from "../components/ui/card"
import { Input } from "../components/ui/input"
import { ScrollArea } from "../components/ui/scroll-area"
import { Camera, CameraOff, Mic, MicOff, Send, LogOut } from "lucide-react"
import { useMedia } from "../hooks/useMedia"
import { usePeerConnection } from "../hooks/usePeerConnection"
import { useSocket } from "../hooks/useSocket"

interface Message {
  id: string
  text: string
  timestamp: Date
  sender: "you" | "user2" | "user3"
}

export default function Room() {
  const navigate = useNavigate()
  const socket = useSocket();
  const {peerConnections, addPeerConnection} = usePeerConnection();
  const [remoteStreams, setRemoteStreams] = useState<{ [peerId: string]: MediaStream }>({});
  const hasJoinedRef = useRef(false);

  const {isCameraOn,
      isMicOn,
      stream,
      toggleCamera,
      toggleMic,
  } = useMedia();
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [participantCount, setParticipantCount] = useState(1)

  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
      if ( (isCameraOn || isMicOn) && videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    }, [stream, isCameraOn, isMicOn]);

  // Set up socket listeners first, BEFORE joining
  useEffect(() => {
    if (!socket) return;

    // Listen for offers from other peers
    const handleOffer = async ({ from, sdp }: { from: string, sdp: RTCSessionDescriptionInit }) => {
      console.log("Received offer from:", from);
      
      const pc = addPeerConnection(from);
      
      // Add local tracks
      if (stream) {
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });
      }
      
      // Handle remote tracks
      pc.ontrack = (event) => {
        console.log("Received remote track from:", from);
        setRemoteStreams((prev) => ({
          ...prev,
          [from]: event.streams[0],
        }));
        setParticipantCount(prev => prev + 1);
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("Sending ICE candidate to:", from);
          socket.emit("ice-candidate", { to: from, candidate: event.candidate });
        }
      };

      // Set remote description and create answer
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      console.log("Sending answer to:", from);
      socket.emit("answer", { to: from, sdp: answer });
    };

    // Listen for answers from peers we sent offers to
    const handleAnswer = async ({ from, sdp }: { from: string, sdp: RTCSessionDescriptionInit }) => {
      console.log("Received answer from:", from);
      const pc = peerConnections[from];
      
      if (!pc) {
        console.error("No peer connection found for:", from);
        return;
      }

      // Check the signaling state before setting remote description
      console.log("PC signaling state:", pc.signalingState);
      
      if (pc.signalingState === "have-local-offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        console.log("Remote description set successfully");
      } else {
        console.warn("Cannot set remote description, current state:", pc.signalingState);
      }
    };

    // Listen for ICE candidates
    const handleIceCandidate = async ({ from, candidate }: { from: string, candidate: RTCIceCandidateInit }) => {
      const pc = peerConnections[from];
      if (pc && candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          console.log("Added ICE candidate from:", from);
        } catch (err) {
          console.error("Error adding ICE candidate:", err);
        }
      }
    };

    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleIceCandidate);

    return () => {
      socket.off("offer", handleOffer);
      socket.off("answer", handleAnswer);
      socket.off("ice-candidate", handleIceCandidate);
    };
  }, [socket, stream, peerConnections, addPeerConnection]);

  // Join room AFTER listeners are set up
  useEffect(() => {
    if (!socket || hasJoinedRef.current) return;
    
    hasJoinedRef.current = true;
    console.log("Emitting join event...");
    
    socket.emit("join", async ({ members }: { members: string[] }) => {
      console.log("Joined room with existing members:", members);
      
      // Create offers to all existing members
      for (const peerId of members) {
        console.log("Creating offer for existing member:", peerId);
        const pc = addPeerConnection(peerId);

        // Add local tracks
        if (stream) {
          stream.getTracks().forEach(track => {
            pc.addTrack(track, stream);
          });
        }

        // Handle remote tracks
        pc.ontrack = (event) => {
          console.log("Received remote track from:", peerId);
          setRemoteStreams(prev => ({
            ...prev,
            [peerId]: event.streams[0],
          }));
          setParticipantCount(prev => prev + 1);
        };

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            console.log("Sending ICE candidate to:", peerId);
            socket.emit("ice-candidate", { to: peerId, candidate: event.candidate });
          }
        };

        // Create and send offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        console.log("Sending offer to:", peerId);
        socket.emit("offer", { to: peerId, sdp: offer });
      }
    });
  }, [socket, stream, addPeerConnection]);

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
    // Close all peer connections
    Object.values(peerConnections).forEach(pc => pc.close());
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
            <h1 className="text-2xl font-bold text-foreground">Room</h1>
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

              {Object.entries(remoteStreams).map(([peerId, remoteStream]) => (
                <Card key={peerId} className="p-4">
                  <div className="aspect-video bg-muted rounded-lg overflow-hidden relative mb-3">
                    {remoteStream ? (
                      <video
                        autoPlay
                        playsInline
                        ref={(el) => {
                          if (el) el.srcObject = remoteStream;
                        }}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <p className="text-sm text-muted-foreground">
                          Waiting for participant...
                        </p>
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                      Participant {peerId.substring(0, 8)}
                    </div>
                  </div>
                </Card>
              ))}

              {/* Placeholder for third participant */}
              {Object.keys(remoteStreams).length < 2 && (
                <Card className="p-4">
                  <div className="aspect-video bg-muted rounded-lg overflow-hidden relative mb-3 flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">Waiting for participant...</p>
                  </div>
                </Card>
              )}
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