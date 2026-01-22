import { createContext, useContext } from "react";
import { socket } from "../services/socket";


export const SocketContext = createContext(socket);
export const useSocket = () => useContext(SocketContext);