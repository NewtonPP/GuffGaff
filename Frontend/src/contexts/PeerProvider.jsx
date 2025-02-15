import React, { useContext, useMemo, useState } from 'react';
import { createContext } from 'react';
import { socketContext } from './SocketProvider';

export const peerContext = createContext();

const PeerProvider = ({ children }) => {
  const [pc, setPc] = useState(
    new RTCPeerConnection({
      iceServers: [
        {
          urls: [
            "stun:stun.l.google.com:19302",
            "stun:global.stun.twilio.com:3478",
          ],
        },
      ],
    })
  );

  const socket = useContext(socketContext)

  const CreateOffer = async () => {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    return offer;
  };

  const CreateAnswer = async (offer) => {
    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    return answer;
  };

  const resetPeerConnection = () => {
    if (pc) {
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.close();
    }
    
    const newPc = new RTCPeerConnection({
      iceServers: [
        {
          urls: [
            "stun:stun.l.google.com:19302",
            "stun:global.stun.twilio.com:3478",
          ],
        },
      ],
    });
  
    setPc(newPc);
    return newPc;
  };
  

  return (
    <peerContext.Provider value={{ pc, CreateAnswer, CreateOffer, resetPeerConnection }}>
      {children}
    </peerContext.Provider>
  );
};

export default PeerProvider;