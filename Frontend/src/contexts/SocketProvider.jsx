import { useEffect, useMemo } from "react";
import { io } from "socket.io-client";

import { socketContext } from "./socketContext";

// Vite inlines this at build time from .env.development / .env.production.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

if (!SOCKET_URL) {
  console.error(
    "VITE_SOCKET_URL is not set. Copy .env.example to .env.development and restart the dev server."
  );
}

const SocketProvider = ({ children }) => {
  // One socket per mount. Building it in the render body (as before) opened a
  // fresh connection on every render and leaked all but the last one.
  const socket = useMemo(
    () => io(SOCKET_URL, { autoConnect: false, reconnection: true }),
    []
  );

  useEffect(() => {
    socket.connect();
    return () => {
      socket.disconnect();
    };
  }, [socket]);

  const value = useMemo(() => ({ socket }), [socket]);

  return (
    <socketContext.Provider value={value}>{children}</socketContext.Provider>
  );
};

export default SocketProvider;
