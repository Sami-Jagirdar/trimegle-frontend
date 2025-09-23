import React, {useState, useRef, type ReactNode } from 'react'
import { MediaContext } from '../hooks/useMedia'

export interface MediaContextType {
  isCameraOn: boolean
  isMicOn: boolean
  stream: MediaStream | null
  toggleCamera: () => Promise<void>
  toggleMic: () => Promise<void>
  cleanupStream: () => void
}

interface MediaProviderProps {
  children: ReactNode
}

export const MediaProvider: React.FC<MediaProviderProps> = ({ children }) => {
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [isMicOn, setIsMicOn] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const cleanupStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop()
      })
      streamRef.current = null
      setStream(null)
    }
  }

  const toggleCamera = async () => {
    if (isCameraOn) {
      // Turn off camera - stop video tracks only
      if (streamRef.current) {
        streamRef.current.getVideoTracks().forEach((track) => {
          track.stop()
        })
        
        // If no audio tracks remain, cleanup entire stream
        const audioTracks = streamRef.current.getAudioTracks()
        if (audioTracks.length === 0) {
          streamRef.current = null
          setStream(null)
        } else {
          // Create new stream with only audio tracks
          const newStream = new MediaStream(audioTracks)
          streamRef.current = newStream
          setStream(newStream)
        }
      }
      setIsCameraOn(false)
    } else {
      // Turn on camera
      try {
        const constraints = {
          video: true,
          audio: isMicOn && !streamRef.current?.getAudioTracks().length
        }
        
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
        
        if (streamRef.current && isMicOn) {
          // Add video track to existing stream with audio
          const videoTrack = mediaStream.getVideoTracks()[0]
          streamRef.current.addTrack(videoTrack)
          // Stop the temporary audio track from new stream since we already have audio
          mediaStream.getAudioTracks().forEach(track => track.stop())
          setStream(streamRef.current)
        } else {
          // Use the new stream entirely
          streamRef.current = mediaStream
          setStream(mediaStream)
        }
        
        setIsCameraOn(true)
      } catch (error) {
        console.error('Error accessing camera:', error)
      }
    }
    console.log(stream, streamRef, isCameraOn);
  }

  const toggleMic = async () => {
    if (isMicOn) {
      // Turn off mic - stop audio tracks only
      if (streamRef.current) {
        streamRef.current.getAudioTracks().forEach((track) => {
          track.stop()
        })
        
        // If no video tracks remain, cleanup entire stream
        const videoTracks = streamRef.current.getVideoTracks()
        if (videoTracks.length === 0) {
          streamRef.current = null
          setStream(null)
        } else {
          // Create new stream with only video tracks
          const newStream = new MediaStream(videoTracks)
          streamRef.current = newStream
          setStream(newStream)
        }
      }
      setIsMicOn(false)
    } else {
      // Turn on mic
      try {
        const constraints = {
          audio: true,
          video: isCameraOn && !streamRef.current?.getVideoTracks().length
        }
        
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
        
        if (streamRef.current && isCameraOn) {
          // Add audio track to existing stream with video
          const audioTrack = mediaStream.getAudioTracks()[0]
          streamRef.current.addTrack(audioTrack)
          // Stop the temporary video track from new stream since we already have video
          mediaStream.getVideoTracks().forEach(track => track.stop())
          setStream(streamRef.current)
        } else {
          // Use the new stream entirely
          streamRef.current = mediaStream
          setStream(mediaStream)
        }
        
        setIsMicOn(true)
      } catch (error) {
        console.error('Error accessing microphone:', error)
      }
    }
  }

  const value = {
    isCameraOn,
    isMicOn,
    stream,
    toggleCamera,
    toggleMic,
    cleanupStream
  }

  return (
    <MediaContext.Provider value={value}>
      {children}
    </MediaContext.Provider>
  )
}