import { useContext, createContext } from "react"
import type { MediaContextType } from "../state/MediaContext"

export const MediaContext = createContext<MediaContextType | undefined>(undefined)

export const useMedia = (): MediaContextType => {
  const context = useContext(MediaContext)
  if (!context) {
    throw new Error('useMedia must be used within a MediaProvider')
  }
  return context
}