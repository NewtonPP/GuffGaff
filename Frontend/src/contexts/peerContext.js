import { createContext, useContext } from "react";

export const peerContext = createContext(null);

export const usePeer = () => {
  const value = useContext(peerContext);
  if (!value) throw new Error("usePeer must be used inside <PeerProvider>");
  return value;
};
