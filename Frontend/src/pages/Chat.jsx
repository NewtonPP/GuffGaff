import React, { useContext, useEffect, useState, useCallback } from "react";
import { socketContext } from "../contexts/SocketProvider";
import { peerContext } from "../contexts/PeerProvider";
import ReactPlayer from "react-player";

import { FaHourglassStart } from "react-icons/fa";
import { IoIosSend } from "react-icons/io";
import { MdCallEnd } from "react-icons/md";
import { GrNext } from "react-icons/gr";

// Subcomponents for better modularity
const VideoPlayer = ({ stream, title }) => (
  <div className="h-[300px] w-[400px] bg-black rounded-lg shadow-lg flex items-center justify-center">
    {stream ? (
      <ReactPlayer playing muted height="100%" width="100%" url={stream} controls />
    ) : (
      <p className="text-white">{title}</p>
    )}
  </div>
);

const MessageList = ({ messages }) => (
  <div className="bg-gray-700 h-[90%] w-full flex flex-col justify-end gap-1 overflow-y-auto p-2">
    {messages.map((message, index) => (
      <div key={index} className={`flex ${message.state === "sent" ? "justify-end" : "justify-start"}`}>
        <span className={`p-2 rounded-xl text-white ${message.state === "sent" ? "bg-blue-500" : "bg-gray-500"}`}>
          {message.message}
        </span>
      </div>
    ))}
  </div>
);

const InputBox = ({ sendingMessage, setSendingMessage, handleMessages }) => (
  <div className="flex items-center justify-between p-2 bg-gray-800">
    <input
      className="flex-grow h-10 bg-slate-300 px-4 rounded-xl outline-none"
      placeholder="Send Message"
      onChange={(e) => setSendingMessage(e.target.value)}
      value={sendingMessage}
      onKeyPress={(e) => e.key === "Enter" && handleMessages()}
    />
    <button
      className="h-10 w-10 bg-blue-500 text-white rounded-full flex items-center justify-center"
      onClick={handleMessages}
      aria-label="Send Message"
    >
      <IoIosSend />
    </button>
  </div>
);

const Chat = () => {
  const { socket } = useContext(socketContext);
  const { pc, CreateAnswer, CreateOffer, resetPeerConnection} = useContext(peerContext);

  const [myStream, setMyStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [remoteUser, setRemoteUser] = useState(null);

  const [messages, setMessages] = useState([]);
  const [sendingMessage, setSendingMessage] = useState("");

  const [isStarted, setIsStarted] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [isNegotiating, setIsNegotiating] = useState(false);
  
  const [isNext, setIsNext] = useState(false)

  // Access the user's camera and microphone
  useEffect(() => {
    const accessCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        setMyStream(stream);
      } catch (error) {
        console.error("Error accessing camera: ", error);
      }
    };

    accessCamera();

    return () => {
      if (myStream) {
        myStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Add local stream to PeerConnection
  useEffect(() => {
    if (myStream && pc) {
      for (const track of myStream.getTracks()) {
        pc.addTrack(track, myStream);
        console.log("Added local track:", track);
      }
    }
  }, [myStream, pc]);

  // Handle remote stream
  useEffect(() => {
    const handleTrackEvent = (ev) => {
      if (ev.streams && ev.streams.length > 0) {
        console.log("Received remote stream:", ev.streams[0]);
        setRemoteStream(ev.streams[0]);
      }
    };

    pc.addEventListener("track", handleTrackEvent);

    return () => {
      pc.removeEventListener("track", handleTrackEvent);
    };
  }, [pc]);

  // Function to start the connection
  const handleStart = async () => {
    try {
      setIsStarted(true);
      socket.emit("start");
    } catch (error) {
      console.error("Error starting connection:", error);
    }
  };

  // Handle socket events
  useEffect(() => {
    const handleCreateOffer = async ({ ROOM_ID, user2 }) => {
      setRemoteUser(user2);
      setIsNewUser(true);
      setIsStarted(false);

      try {
        const offer = await CreateOffer();
        console.log("Created Offer", offer);
        socket.emit("offer", { offer, user2 });
      } catch (error) {
        console.error("Error creating offer:", error);
      }
    };

    const handleOffer = async ({ offer, From }) => {
      setRemoteUser(From);
      setIsNewUser(true);
      setIsStarted(false);

      try {
        console.log("Received offer", offer);
        const answer = await CreateAnswer(offer);
        socket.emit("answer", { answer, To: From });
      } catch (error) {
        console.error("Error handling offer:", error);
      }
    };

    const handleAnswer = async ({ answer }) => {
      try {
        await pc.setRemoteDescription(answer);
        console.log("Received answer", answer);
      } catch (error) {
        console.error("Error setting remote description:", error);
      }
    };

    const handleNegoNeeded = async ({ offer, From }) => {
      try {
        if (pc.signalingState !== "stable") {
          console.error("Cannot handle negotiation: Signaling state is not stable");
          return;
        }

        const answer = await CreateAnswer(offer);
        await pc.setLocalDescription(answer);
        console.log("Incoming Nego");
        socket.emit("negoDone", { answer, To: From });
      } catch (error) {
        console.error("Error handling incoming negotiation:", error);
      }
    };

    const handleNegoDone = async ({ answer }) => {
      try {
        await pc.setRemoteDescription(answer);
        console.log("FinalNego: Remote description set successfully");
      } catch (error) {
        console.error("Error finalizing negotiation:", error);
      }
    };

    const handleDisconnect = () => {
      alert("Other User Disconnected");

    };

    const handleEnd = () => {
    setRemoteStream(null);
    setRemoteUser(null);
    setIsStarted(true);
    setIsNewUser(false);
    setIsNext(false);
    setMessages([]);
    }

    const HandleNext = () =>{
      setRemoteStream(null);
      setRemoteUser(null);
      setIsStarted(true);
      setIsNewUser(false);
      setIsNext(false);
      setMessages([]);
      socket.emit("start")
    }

    socket.on("createOffer", handleCreateOffer);
    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("negoNeeded", handleNegoNeeded);
    socket.on("negoFinal", handleNegoDone);
    socket.on("disconnected", handleDisconnect);
    socket.on("end", handleEnd)
    socket.on("next",HandleNext)

    return () => {
      socket.off("createOffer", handleCreateOffer);
      socket.off("offer", handleOffer);
      socket.off("answer", handleAnswer);
      socket.off("negoNeeded", handleNegoNeeded);
      socket.off("negoDone", handleNegoDone);
      socket.off("disconnected", handleDisconnect);
      socket.off("next",HandleNext);
    };
  }, [socket, pc, CreateOffer, CreateAnswer]);

  // Handle negotiation needed
  const handleNegoNeeded = useCallback(async () => {
    if (isNegotiating) {
      console.log("Negotiation already in progress");
      return;
    }

    setIsNegotiating(true);

    try {
      const offer = await CreateOffer();
      await pc.setLocalDescription(offer);
      console.log("NegotiationSent");
      socket.emit("negoNeeded", { offer, user2: remoteUser });
    } catch (error) {
      console.error("Error during negotiation:", error);
    } finally {
      setIsNegotiating(false);
    }
  }, [CreateOffer, remoteUser, socket, pc, isNegotiating]);

  useEffect(() => {
    pc.addEventListener("negotiationneeded", handleNegoNeeded);
    return () => {
      pc.removeEventListener("negotiationneeded", handleNegoNeeded);
    };
  }, [pc, handleNegoNeeded]);

  // Handle sending messages
  const handleMessages = () => {
    if (sendingMessage.trim() === "" || !remoteUser) return;

    setMessages((prev) => ([...prev, { user: socket.id, message: sendingMessage, state: "sent" }]));
    socket.emit("newMessage", { sendingMessage, remoteUser });
    setSendingMessage("");
  };

  useEffect(() => {
    const handleNewMessage = ({ sendingMessage, remoteUser }) => {
      setMessages((prev) => ([...prev, { user: remoteUser, message: sendingMessage, state: "received" }]));
      console.log(sendingMessage)
    };
    socket.on("newMessage", handleNewMessage);

    return () => {
      socket.off("newMessage", handleNewMessage);
    };
  }, [socket]);

  // Handle ending the call
  const handleEndCall = () => {
    if (myStream) {
      myStream.getTracks().forEach((track) => track.stop());
    }
    if (pc) {
      pc.close();
    }

    socket.emit("end",({remoteUser}))
    resetPeerConnection()
    setRemoteStream(null);
    setRemoteUser(null);
    setIsStarted(false);
    setIsNewUser(false);
    setIsNext(false);
    setMessages([]);

    const accessCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        setMyStream(stream);
      } catch (error) {
        console.error("Error accessing camera: ", error);
      }
    };
    accessCamera();

  };

  // Handle finding a new user
  const handleNext = () => {
    // Logic to find a new user or reset the connection
    setIsStarted(false);
    setIsNewUser(false);
    setRemoteStream(null);
    setRemoteUser(null);
    setIsNext(true)
    socket.emit("next",{remoteUser});
  };

  return (
    <div className="h-screen w-full flex items-center justify-center">
      <div className="h-screen w-[70%] bg-gray-900 flex flex-col items-center justify-center gap-6 p-6">
        {/* Video Containers */}
        <div className="flex flex-wrap gap-6 items-center justify-center">
          <VideoPlayer stream={myStream} title="Camera Permission required to START the chat" />
          <VideoPlayer
            stream={remoteStream}
            title={
              isStarted && !remoteStream
                ? "Searching for user"
                : isNewUser 
                ? "New User Joined"
                : isNext
                ? "Searching for Next User"
                : "Press Start to begin"
            }
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-6">
          <button
            onClick={handleStart}
            className="flex items-center justify-center text-lg gap-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg shadow-md transition"
            aria-label="Start Chat"
          >
            <FaHourglassStart />
            Start
          </button>

          <button
            onClick={handleEndCall}
            className="flex items-center justify-center text-lg gap-2 bg-red-500 hover:bg-red-700 text-white px-6 py-3 rounded-lg shadow-md transition"
            aria-label="End Call"
          >
            <MdCallEnd />
            End
          </button>

          <button
            onClick={handleNext}
            className="flex items-center justify-center text-lg gap-2 bg-green-500 hover:bg-green-700 text-white px-6 py-3 rounded-lg shadow-md transition"
            aria-label="Next User"
          >
            <GrNext />
            Next
          </button>
        </div>
      </div>

      <div className="h-full w-[30%] bg-gray-900">
        <MessageList messages={messages} />
        <InputBox
          sendingMessage={sendingMessage}
          setSendingMessage={setSendingMessage}
          handleMessages={handleMessages}
        />
      </div>
    </div>
  );
};

export default Chat;