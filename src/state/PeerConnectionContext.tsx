import React, {useEffect, useRef, useState, type ReactNode } from 'react'
import { PeerConnectionContext } from '../hooks/usePeerConnection';

type PeerMap = {
  [peerId: string]: RTCPeerConnection;
};

export interface PeerConnectionContextType {
  peerConnections: PeerMap;
  addPeerConnection: (peerId: string, config?: RTCConfiguration) => RTCPeerConnection;
  removePeerConnection: (peerId: string) => void;
  addTrackToAll: (track: MediaStreamTrack, stream: MediaStream) => void;
  isIceConfigLoaded?: boolean;
};

interface PeerConnectionProps {
    children: ReactNode
}

interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

interface IceConfigResponse {
    iceServers: IceServer[];
}

export const PeerConnectionProvider: React.FC<PeerConnectionProps> = ({children}) => {
    
    const [peerConnections, setPeerConnections] = useState<PeerMap>({});
    const [iceConfig, setIceConfig] = useState<RTCConfiguration | null>(null);
    const [isIceConfigLoaded, setIsIceConfigLoaded] = useState(false);
    const configFetchAttempted = useRef(false);

    useEffect(() => {
        const fetchIceConfig = async () => {
            if (configFetchAttempted.current) return;
            configFetchAttempted.current = true;

            try {
                const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/ice-config`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                if (!response.ok) {
                    throw new Error(`Error fetching ICE config: ${response.status}`);
                }

                const data: IceConfigResponse = await response.json();
                const config: RTCConfiguration = {
                    iceServers: data.iceServers,
                    iceCandidatePoolSize: 10,
                    iceTransportPolicy: 'all', // 'relay' to force TURN for testing
                };

                setIceConfig(config);
                setIsIceConfigLoaded(true);
                console.log('Fetched ICE configuration:', config);

            } catch (error) {
                console.error('Failed to fetch ICE configuration:', error);
                const fallbackConfig: RTCConfiguration = {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' },
                    ],
                    iceCandidatePoolSize: 10,
                };
                
                setIceConfig(fallbackConfig);
                setIsIceConfigLoaded(true);
                console.warn('Using fallback STUN-only configuration');
            }
    
        };
        fetchIceConfig();
    }, []);

    const addPeerConnection = (peerId: string) => {
        const pc = new RTCPeerConnection(iceConfig || undefined);

        // Logging a bunch of things for debugging
        pc.onconnectionstatechange = () => {
            console.log(`Peer ${peerId} connection state:`, pc.connectionState);
        };

        pc.oniceconnectionstatechange = () => {
            console.log(`Peer ${peerId} ICE connection state:`, pc.iceConnectionState);
            
            if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
                pc.getStats().then(stats => {
                    stats.forEach(report => {
                        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                            const localCandidate = stats.get(report.localCandidateId);
                            const remoteCandidate = stats.get(report.remoteCandidateId);
                            
                            if (localCandidate?.candidateType === 'relay' || remoteCandidate?.candidateType === 'relay') {
                                console.log(`✓ Peer ${peerId} connected via TURN (relay)`);
                            } else {
                                console.log(`✓ Peer ${peerId} connected via ${localCandidate?.candidateType || 'unknown'}`);
                            }
                        }
                    });
                });
            }
        };

        pc.onicegatheringstatechange = () => {
            console.log(`Peer ${peerId} ICE gathering state:`, pc.iceGatheringState);
        };

        setPeerConnections(prev => ({ ...prev, [peerId]: pc }));
        return pc;
    };

    const removePeerConnection = (peerId: string) => {
        setPeerConnections(prev => {
            const { [peerId]: pc, ...rest } = prev;
            if (pc) {
                pc.close();
                console.log(`Closed peer connection for ${peerId}`);
            }
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
        addTrackToAll,
        isIceConfigLoaded,
    }

    return (
        <PeerConnectionContext.Provider value={value}>
            {children}
        </PeerConnectionContext.Provider>
    )

}