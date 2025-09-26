import { useContext, createContext } from "react"
import type { PeerConnectionContextType } from "../state/PeerConnectionContext"

export const PeerConnectionContext = createContext<PeerConnectionContextType | undefined>(undefined)

export const usePeerConnection = (): PeerConnectionContextType => {
    const context = useContext(PeerConnectionContext);
    if (!context) {
    throw new Error('usePeerConnection must be used within a PeerConnectionProvider')
  }
  return context
}