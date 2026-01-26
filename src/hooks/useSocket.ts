import { createContext, useContext } from "react";
// import { socket } from "../services/socket";
import type { Socket } from "socket.io-client";

export const SocketContext = createContext<Socket | null>(null);
export const useSocket = () => {

    const socket = useContext(SocketContext);
    if (!socket) {
        throw new Error("useSocket must be used within a SocketProvider with a valid socket.");
    }
    return socket;
}