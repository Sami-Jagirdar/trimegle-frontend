"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "../components/ui/button"
import { Card } from "../components/ui/card"
import { Input } from "../components/ui/input"
import { ScrollArea } from "../components/ui/scroll-area"
import { CameraOff, Send, LogOut } from "lucide-react"
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
  const socket = useSocket()!;
  const {peerConnections, addPeerConnection, removePeerConnection, isIceConfigLoaded} = usePeerConnection();
  const pendingCandidatesRef = useRef<{ [peerId: string]: RTCIceCandidateInit[] }>({});
  const [remoteStreams, setRemoteStreams] = useState<{ [peerId: string]: MediaStream }>({});
  const [roomId, setRoomId] = useState<string | null>(null);
  const hasJoinedRef = useRef(false);

  const peerConnectionsRef = useRef(peerConnections);

  // Keep the ref in sync with state
  useEffect(() => {
    peerConnectionsRef.current = peerConnections;
  }, [peerConnections]);

  // Used for cleanup on unmount
  const roomIdRef = useRef<string | null>(null);
  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);


  const {isCameraOn,
      isMicOn,
      stream,
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


  const setupPeerConnection = (pc: RTCPeerConnection, peerId: string) => {
    // 1. Set up onTrack handlers 
    pc.ontrack = (event) => {
      console.log("Received remote track from:", peerId);
      setRemoteStreams((prev) => ({
        ...prev,
        [peerId]: event.streams[0],
      }));
      setParticipantCount(prev => prev + 1);
    };

    // 2. Set up ICE candidate handlers
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Sending ICE candidate to:", peerId);
        socket.emit("ice-candidate", { to: peerId, candidate: event.candidate });
      }
    };

    // 3. Set up connection state handlers
    pc.onconnectionstatechange = () => {
      console.log(`Peer ${peerId} connection state:`, pc.connectionState);

      if (pc.connectionState === "failed") {
        console.warn(`Connection with peer ${peerId} failed. Attempting to restart ICE...`);
        setTimeout(() => {
          if (pc.connectionState === "failed") {
            console.error(`Connection still failed after 5s. Restarting ICE...`);
            pc.restartIce();
          } else {
            console.log(`Connection recovered, no restart needed`);
          }
        }, 5000);
      } else if (pc.connectionState === "disconnected") {
        console.warn(`Peer ${peerId} disconnected.`);
        setTimeout(() => {
          if (pc.connectionState === "disconnected") {
            handlePeerDisconnection(peerId);
          }
        }, 5000)
      } else if (pc.connectionState === "closed") {
        console.log(`Peer ${peerId} connection closed.`);
        handlePeerDisconnection(peerId);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[${peerId}] ICE connection state: ${pc.iceConnectionState}`);
      
      if (pc.iceConnectionState === 'failed') {
        setTimeout(() => {
          if (pc.iceConnectionState === "failed") {
            console.error(`Connection still failed after 5s. Restarting ICE...`);
            pc.restartIce();
          } else {
            console.log(`Connection recovered, no restart needed`);
          }
        }, 5000);
      }
    };

    pc.onicecandidateerror = (event) => {
      console.error(`[${peerId}] ICE candidate error:`, {
        errorCode: event.errorCode,
        errorText: event.errorText,
        url: event.url,
      });
    };

    // 4. Add local tracks
    if (stream) {
      stream.getTracks().forEach(track => {
        console.log(`[${peerId}] Adding ${track.kind} track`);
        pc.addTrack(track, stream);
      });
    }
  };

  const handlePeerDisconnection = (peerId: string) => {
    console.log(`[${peerId}] Cleaning up disconnected peer`);

    setRemoteStreams((prev) => {
      const { [peerId]: removed, ...rest } = prev;
      console.log(`[${removed}] Removed remote stream`);
      return rest;
    });

    setParticipantCount(prev => Math.max(1, prev - 1));
    removePeerConnection(peerId);
    delete pendingCandidatesRef.current[peerId];
  };

  const addQueuedCandidates = async (peerId: string, pc: RTCPeerConnection) => {
    const queuedCandidates = pendingCandidatesRef.current[peerId] || [];
    
    if (queuedCandidates.length > 0) {
      console.log(`[${peerId}] Adding ${queuedCandidates.length} queued ICE candidates`);
      
      for (const candidate of queuedCandidates) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error(`[${peerId}] Error adding queued ICE candidate:`, err);
        }
      }
      
      // Clear the queue
      pendingCandidatesRef.current[peerId] = [];
    }
  };


  // Set up socket listeners first, BEFORE joining
  useEffect(() => {
    if (!socket || !isIceConfigLoaded) return;

    // Listen for offers from other peers
    const handleOffer = async ({ from, sdp }: { from: string, sdp: RTCSessionDescriptionInit }) => {
      console.log("Received offer from:", from);

      try {
        // 1. Create Peer Connection
        const pc = addPeerConnection(from);

        // 2. Set up handlers
        setupPeerConnection(pc, from);

        // 3. Set Remote Description
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));

        // 4. Add any queued ICE candidates
        await addQueuedCandidates(from, pc);

        // 5. Create and send Answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        console.log("Sending answer to:", from);
        socket.emit("answer", { to: from, sdp: answer });
      } catch (error) {
        console.error("Error handling offer from:", from, error);
        handlePeerDisconnection(from);
      }
      
    };

    // Listen for answers from peers we sent offers to
    const handleAnswer = async ({ from, sdp }: { from: string, sdp: RTCSessionDescriptionInit }) => {
      console.log(`[${from}] Received answer`);
      const pc = peerConnectionsRef.current[from];
      
      if (!pc) {
        console.error(`[${from}] No peer connection found`);
        return;
      }

      try {
        // Check signaling state before setting remote description
        if (pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          console.log(`[${from}] Remote description set`);
          
          // Add any queued ICE candidates
          await addQueuedCandidates(from, pc);
        } else {
          console.warn(`[${from}] Cannot set remote description, current state: ${pc.signalingState}`);
        }
      } catch (error) {
        console.error(`[${from}] Error handling answer:`, error);
      }
    };

    // Listen for ICE candidates
    const handleIceCandidate = async ({ from, candidate }: { from: string, candidate: RTCIceCandidateInit }) => {
      const pc = peerConnectionsRef.current[from];
      if (!pc) {
        console.warn(`[${from}] Received ICE candidate but no peer connection exists yet`);

        if (!pendingCandidatesRef.current[from]) {
          pendingCandidatesRef.current[from] = [];
        }
        pendingCandidatesRef.current[from].push(candidate);
        return;
      }

      // If remote description is not set yet, queue the candidate
      if (!pc.remoteDescription) {
        console.log(`[${from}] Queuing ICE candidate (remote description not set)`);
        if (!pendingCandidatesRef.current[from]) {
          pendingCandidatesRef.current[from] = [];
        }
        pendingCandidatesRef.current[from].push(candidate);
        return;
      }

      // Add candidate immediately if remote description is set
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        console.log(`[${from}] Added ICE candidate from: ${from}`);
      } catch (err) {
        console.error(`[${from}] Error adding ICE candidate:`, err);
        if (!pendingCandidatesRef.current[from]) {
          pendingCandidatesRef.current[from] = [];
        }
        pendingCandidatesRef.current[from].push(candidate);
      }
    };

    // Handle peer disconnection
    const handlePeerDisconnected = ({ socketId }: { socketId: string }) => {
      console.log(`[${socketId}] Peer disconnected from server`);
      handlePeerDisconnection(socketId);
    };

    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleIceCandidate);
    socket.on("peer-disconnected", handlePeerDisconnected);


    return () => {
      socket.off("offer", handleOffer);
      socket.off("answer", handleAnswer);
      socket.off("ice-candidate", handleIceCandidate);
      socket.off("peer-disconnected", handlePeerDisconnected);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, stream, peerConnections, addPeerConnection, removePeerConnection, isIceConfigLoaded]);


  // Join room AFTER listeners are set up
  useEffect(() => {
    if (!socket || !isIceConfigLoaded || hasJoinedRef.current) return;
    
    hasJoinedRef.current = true;
    console.log("Joining room...");
    
    socket.emit("join", async ({ members, roomId }: { members: string[], roomId: string }) => {
      console.log("Joined room with existing members:", members);
      setRoomId(roomId);

      // Create offers to all existing members
      for (const peerId of members) {
          try {
            console.log("Creating offer for existing member:", peerId);

            // 1. Create Peer Connection
            const pc = addPeerConnection(peerId);

            // 2. Set up handlers
            setupPeerConnection(pc, peerId);

            // 3. Create and send Offer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            console.log("Sending offer to:", peerId);
            socket.emit("offer", { to: peerId, sdp: offer });
          } catch (error) {
            console.error("Error creating offer for:", peerId, error);
            handlePeerDisconnection(peerId);
          }
        
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, isIceConfigLoaded]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(peerConnections).forEach(pc => pc.close());
      if (socket && roomIdRef.current) {
        socket.emit("leave", { roomId: roomIdRef.current, userId: socket.id });
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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