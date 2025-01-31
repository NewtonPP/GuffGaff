import React from 'react'
import { useContext } from 'react'
import { socketContext } from '../contexts/SocketProvider'
import { peerContext } from '../contexts/PeerProvider'
import { useEffect } from 'react'
import { useState } from 'react'

import ReactPlayer from "react-player"
const Chat = () => {
  const {socket} = useContext(socketContext)
  const {pc, CreateAnswer, CreateOffer} = useContext(peerContext)

  const [myStream, setMyStream] = useState()
  const [remoteStream, setRemoteStream] = useState()

  const [RemoteUser, setRemoteUser] = useState()
//Function to start the connection
const HandleStart = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({audio:true, video:true})
  setMyStream(stream)
  socket.emit("start")
}

useEffect(() => {
socket.on("createOffer", async ({ROOM_ID,  user2}) => {
  setRemoteUser(user2)
  const offer = await CreateOffer()
  console.log("Created Offer", offer)
  socket.emit("offer", {offer, user2 })
})

socket.on("offer", async ({offer, From}) => {
  setRemoteUser(From)
  const answer = await CreateAnswer(offer)
  console.log("Received offer", offer)
  socket.emit("answer",{answer, To:From}) 
})

socket.on("answer", ({answer}) => {
  console.log("Received answer", answer)
  pc.setRemoteDescription(answer)
})

socket.on("negoNeeded",HandleIncomingNego)
socket.on("negoFinal",HandleNegoDone)
return () => {
  socket.off("start")
  socket.off("createOffer")
  socket.off("offer")
  socket.off("answer")
  socket.off("negoNeeded", HandleIncomingNego)
  socket.off("negoDone", HandleNegoDone)
}

},[socket]) 


//This function is to send stream to the other user
const SendStream = () =>{
for(const track of myStream.getTracks()){
  pc.addTrack(track, myStream)
  console.log("Sending streams")
}
}

//The following function listens to the track
useEffect(()=>{
  pc.addEventListener("track", async (ev) => {
    const RemoteStream = ev.streams
    console.log("Got Tracks")
    setRemoteStream(RemoteStream[0])
  })
},[])

const HandleNegoNeeded = async () =>{
  const offer = await CreateOffer()
  socket.emit("negoNeeded", {offer, user2:RemoteUser})
}

useEffect(()=>{
  pc.addEventListener("negotiationneeded", HandleNegoNeeded)
  return () => {
    pc.removeEventListener("negotiationneeded", HandleNegoNeeded)
  }
},[HandleNegoNeeded])

const HandleIncomingNego = async({offer, From}) =>{
  try {
    const answer = await CreateAnswer(offer)
  socket.emit("negoDone", {answer, To:From})
  } catch (error) {
    console.log("Error Handling NegotiationIncoming")
  }
}

const HandleNegoDone = async({answer}) =>{
  try {
    pc.setRemoteDescription(answer)
  } catch (error) {
    console.error("Error finalizing negotiation:", error);
  }
}

console.log(remoteStream)
console.log(myStream)
  return (
    <div>
      <button onClick={HandleStart}>Start</button>
      <button onClick={SendStream}>Send Stream</button>
      <div>
      {myStream && (
              <>
                <h1>My Stream</h1>
                <ReactPlayer
                  playing
                  muted
                  height="100px"
                  width="200px"
                  url={myStream}
                />
              </>
            )}
            {remoteStream && (
              <>
                <h1>Remote Stream</h1>
                <ReactPlayer
                  playing
                  muted
                  height="100px"
                  width="200px"
                  url={remoteStream}
                />
              </>
            )}
      </div>
    </div>
  )
}

export default Chat
