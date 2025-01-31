import React from 'react'
import { useMemo } from 'react';
import { createContext } from 'react'

export const peerContext = createContext();

const PeerProvider = ({children}) => {

    const pc = useMemo(() => 
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
    ,[])

    const CreateOffer = async () => {
    const offer = await pc.createOffer()
    pc.setLocalDescription(offer)
    return offer
    }

    const CreateAnswer = async (offer) =>{
        await pc.setRemoteDescription(offer)
        const answer = await pc.createAnswer()
       await pc.setLocalDescription(answer)
        return answer
    }


  return (
  <peerContext.Provider value={{pc, CreateAnswer, CreateOffer}}>
    {children}
  </peerContext.Provider>
  )
}

export default PeerProvider
