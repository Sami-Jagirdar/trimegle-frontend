import React, { useEffect } from "react";
import { socket } from "../lib/socket";
import { SocketContext } from "../hooks/useSocket";


export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    socket.connect();

    socket.on("connect", () => {
      console.log("Connected:", socket.id);
    });

    socket.on("disconnect", (reason) => {
      console.log("Disconnected:", reason);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
};
