import { io } from "socket.io-client";

const URL = import.meta.env.VITE_SERVER_URL;
console.log(URL);

// TODO: have to include auth token eventually when auth is implemented
export const socket = io(URL, {
  autoConnect: false,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});
