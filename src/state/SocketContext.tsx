import React, { useEffect, useState } from "react";
import { SocketContext } from "../hooks/useSocket";
import { io, Socket } from "socket.io-client";

interface SocketProviderProps {
  children: React.ReactNode;
  token: string
}
const URL = import.meta.env.VITE_SERVER_URL;

export const SocketProvider: React.FC<SocketProviderProps> = ({ children, token }) => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {

    const newSocket = io(URL, {
      autoConnect: false,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ["websocket"],
      auth: {
        token: token
      }
    });

    newSocket.connect();

    newSocket.on("connect", () => {
      console.log("Connected:", newSocket.id);
    });

    newSocket.on("connect_error", (err) => {
      console.error("Connection error:", err.message);
      
      // Handle auth errors
      if (err.message === "Invalid authentication token") {
        localStorage.removeItem("authToken");
        window.location.href = "/login";
      }
    });

    newSocket.on("disconnect", (reason) => {
      console.log("Disconnected:", reason);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
};
