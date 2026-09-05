import { useCallback, useEffect, useMemo, useRef } from "react";

import { peerContext } from "./peerContext";

const {
  VITE_STUN_URLS,
  VITE_TURN_URLS,
  VITE_TURN_USERNAME,
  VITE_TURN_CREDENTIAL,
} = import.meta.env;

const splitUrls = (value) =>
  (value || "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);

const buildIceServers = () => {
  const stunUrls = splitUrls(VITE_STUN_URLS);
  const turnUrls = splitUrls(VITE_TURN_URLS);
  const servers = [];

  if (stunUrls.length > 0) servers.push({ urls: stunUrls });

  // Optional: STUN alone fails behind symmetric NAT, so a TURN relay can be
  // configured per environment without touching this file.
  if (turnUrls.length > 0) {
    servers.push({
      urls: turnUrls,
      username: VITE_TURN_USERNAME,
      credential: VITE_TURN_CREDENTIAL,
    });
  }

  return servers;
};

const PeerProvider = ({ children }) => {
  const pcRef = useRef(null);

  const closePeerConnection = useCallback(() => {
    const pc = pcRef.current;
    pcRef.current = null;
    if (!pc) return;

    pc.ontrack = null;
    pc.onicecandidate = null;
    pc.onnegotiationneeded = null;
    pc.onconnectionstatechange = null;

    try {
      pc.close();
    } catch (error) {
      console.error("Error closing peer connection:", error);
    }
  }, []);

  // Always returns a brand-new connection and stores it in the ref
  // synchronously, so callers never end up negotiating on a closed connection
  // the way a `useState` peer connection allowed.
  const createPeerConnection = useCallback(() => {
    closePeerConnection();

    const pc = new RTCPeerConnection({ iceServers: buildIceServers() });
    pcRef.current = pc;
    return pc;
  }, [closePeerConnection]);

  useEffect(() => closePeerConnection, [closePeerConnection]);

  const value = useMemo(
    () => ({ pcRef, createPeerConnection, closePeerConnection }),
    [createPeerConnection, closePeerConnection]
  );

  return <peerContext.Provider value={value}>{children}</peerContext.Provider>;
};

export default PeerProvider;
