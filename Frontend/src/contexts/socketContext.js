import { createContext, useContext } from "react";

export const socketContext = createContext(null);

export const useSocket = () => {
  const value = useContext(socketContext);
  if (!value) throw new Error("useSocket must be used inside <SocketProvider>");
  return value;
};
