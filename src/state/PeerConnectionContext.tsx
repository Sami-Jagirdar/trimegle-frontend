import React, {useState, type ReactNode } from 'react'
import { PeerConnectionContext } from '../hooks/usePeerConnection';

type PeerMap = {
  [peerId: string]: RTCPeerConnection;
};

export interface PeerConnectionContextType {
  peerConnections: PeerMap;
  addPeerConnection: (peerId: string, config?: RTCConfiguration) => RTCPeerConnection;
  removePeerConnection: (peerId: string) => void;
  addTrackToAll: (track: MediaStreamTrack, stream: MediaStream) => void;
};

interface PeerConnectionProps {
    children: ReactNode
}

export const PeerConnectionProvider: React.FC<PeerConnectionProps> = ({children}) => {
    
    const [peerConnections, setPeerConnections] = useState<PeerMap>({});

    const addPeerConnection = (peerId: string, config?: RTCConfiguration) => {
        const pc = new RTCPeerConnection(config);
        setPeerConnections(prev => ({ ...prev, [peerId]: pc }));
        return pc;
    };

    const removePeerConnection = (peerId: string) => {
        setPeerConnections(prev => {
        const { [peerId]: pc, ...rest } = prev;
        pc?.close();
        return rest;
        });
    };

    // Adds users local stream to each peer connection established
    const addTrackToAll = (track: MediaStreamTrack, stream: MediaStream) => {
        Object.values(peerConnections).forEach(pc => {
        pc.addTrack(track, stream);
        });
    };


    const value = {
        peerConnections,
        addPeerConnection,
        removePeerConnection,
        addTrackToAll
    }

    return (
        <PeerConnectionContext.Provider value={value}>
            {children}
        </PeerConnectionContext.Provider>
    )

}