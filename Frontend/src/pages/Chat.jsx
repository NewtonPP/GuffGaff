import React, { useContext, useEffect, useState } from "react";
import { socketContext } from "../contexts/SocketProvider";
import { peerContext } from "../contexts/PeerProvider";
import ReactPlayer from "react-player";
import { FaHourglassStart } from "react-icons/fa";
import { IoIosSend } from "react-icons/io";


const Chat = () => {
  const { socket } = useContext(socketContext);
  const { pc, CreateAnswer, CreateOffer } = useContext(peerContext);

  const [myStream, setMyStream] = useState();
  const [remoteStream, setRemoteStream] = useState();
  const [RemoteUser, setRemoteUser] = useState();

  const [Messages, setMessages] = useState([])
  const [sendingMessage, setSendingMessage] = useState("")

  const [isStarted, setIsStarted] = useState(false)
  const [isNewUser, setIsNewUser] = useState(false)

  useEffect(()=>{
    async function AccessCamera () {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setMyStream(stream);
    }

    AccessCamera()
  })

  // Function to start the connection
  const HandleStart = async () => {
    socket.emit("start");
  };

  useEffect(() => {
    socket.on("createOffer", async ({ ROOM_ID, user2 }) => {
      setRemoteUser(user2);
      setIsNewUser(true)
      const offer = await CreateOffer();
      console.log("Created Offer", offer);
      socket.emit("offer", { offer, user2 });
    });

    socket.on("offer", async ({ offer, From }) => {
      setRemoteUser(From);
      setIsNewUser(true)
      const answer = await CreateAnswer(offer);
      console.log("Received offer", offer);
      socket.emit("answer", { answer, To: From });
    });

    socket.on("answer", ({ answer }) => {
      console.log("Received answer", answer);
      pc.setRemoteDescription(answer);
    });

    socket.on("negoNeeded", HandleIncomingNego);
    socket.on("negoFinal", HandleNegoDone);

    return () => {
      socket.off("start");
      socket.off("createOffer");
      socket.off("offer");
      socket.off("answer");
      socket.off("negoNeeded", HandleIncomingNego);
      socket.off("negoDone", HandleNegoDone);
    };
  }, [socket]);

  // Function to send stream to the other user
  const SendStream = () => {
    for (const track of myStream.getTracks()) {
      pc.addTrack(track, myStream);
      console.log("Sending streams");
    }
  };

  // The following function listens to the track
  useEffect(() => {
    pc.addEventListener("track", async (ev) => {
      const RemoteStream = ev.streams;
      console.log("Got Tracks");
      setRemoteStream(RemoteStream[0]);
    });
  }, []);

  const HandleNegoNeeded = async () => {
    const offer = await CreateOffer();
    console.log("NegotiationSent")
    socket.emit("negoNeeded", { offer, user2: RemoteUser });
  };

  useEffect(() => {
    pc.addEventListener("negotiationneeded", HandleNegoNeeded);
    return () => {
      pc.removeEventListener("negotiationneeded", HandleNegoNeeded);
    };
  }, [HandleNegoNeeded]);

  const HandleIncomingNego = async ({ offer, From }) => {
    try {
      const answer = await CreateAnswer(offer);
      console.log("Incoming Nego")
      socket.emit("negoDone", { answer, To: From });
    } catch (error) {
      console.log("Error Handling NegotiationIncoming");
    }
  };

  const HandleNegoDone = async ({ answer }) => {
    try {
      pc.setRemoteDescription(answer);
      console.log("FinalNego")
    } catch (error) {
      console.error("Error finalizing negotiation:", error);
    }
  };


  //Hadle Messages from this part
  const HandleMessages = (e) =>{
    setMessages((prev)=>([...prev, {user:socket.id, message:sendingMessage, state:"sent"}]))
    socket.emit("newMessage", {sendingMessage, RemoteUser})
    setSendingMessage("")
  }

  useEffect(()=>{
    socket.on("newMessage", ({sendingMessage, RemoteUser}) => {
      console.log("This is remote user",RemoteUser)
      setMessages((prev)=>([...prev, {user:RemoteUser, message:sendingMessage, state:"received"}]))
       
    })

    return () => {
      socket.off("newMessage")
    }
  },[socket])
  
  return (
    <>
    <div className="h-screen w-full flex items-center justify-center">

      <div className="h-screen w-[70%] bg-gray-900 flex flex-col items-center justify-center gap-6 p-6">
        {/* Video Containers */}
        <div className="flex flex-wrap gap-6 items-center justify-center">
          <div className="h-[300px] w-[400px] bg-black rounded-lg shadow-lg flex items-center justify-center">
            {myStream ? (
              <ReactPlayer playing muted height="100%" width="100%" url={myStream} />
            ) : (
              <p className="text-white">Camera Permission required
              to START the chat</p>
            )}
          </div>

          <div className="h-[300px] w-[400px] bg-black rounded-lg shadow-lg flex items-center justify-center">
            {remoteStream ? (
              <ReactPlayer playing muted height="100%" width="100%" url={remoteStream} />
            ) : isStarted && !remoteStream ? (
              <p className="text-white">Searching for user</p>
            ):isNewUser ? (
              <p className="text-white">New User Joined</p>
            ):(<p className="text-white">Press Start to begin</p>)}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-6">
          <button
            onClick={HandleStart}
            className="flex items-center justify-center text-lg gap-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg shadow-md transition"
          >
            <FaHourglassStart />
            Start
          </button>

          <button
            onClick={SendStream}
            className="flex items-center justify-center text-lg gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg shadow-md transition"
          >
            <IoIosSend />
            Send Video
          </button>
        </div>
      </div>
        

      <div className="h-full w-[30%] bg-gray-900">
      {/* Messages Container */}
      <div className="bg-gray-700 h-[90%] w-full flex flex-col justify-end gap-1 overflow-y-auto p-2">
        {Messages.map((message, index) => (
          <div key={index} className={`flex ${message.state === "sent" ? "justify-end" : "justify-start"}`}>
            <span className={`p-2 rounded-xl text-white ${message.state === "sent" ? "bg-blue-500" : "bg-gray-500"}`}>
              {message.message}
            </span>
          </div>
        ))}
      </div>

      {/* Input Box */}
      <div className="flex items-center justify-between p-2 bg-gray-800">
        <input
          className="flex-grow h-10 bg-slate-300 px-4 rounded-xl outline-none"
          placeholder="Send Message"
          onChange={(e) => setSendingMessage(e.target.value)}
          value={sendingMessage}
        />
        <button
          className="h-10 w-10 bg-blue-500 text-white rounded-full flex items-center justify-center"
          onClick={HandleMessages}
        >
          <IoIosSend />
        </button>
     
    </div>
      </div>


    </div>
    </>
  );
};

export default Chat;
