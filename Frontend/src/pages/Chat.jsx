import React, { useContext, useEffect, useState, useCallback } from "react";
import { socketContext } from "../contexts/SocketProvider";
import { peerContext } from "../contexts/PeerProvider";
import ReactPlayer from "react-player";

import { FaHourglassStart } from "react-icons/fa";
import { IoIosSend } from "react-icons/io";
import { MdCallEnd } from "react-icons/md";

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
  <div className="bg-gray-700 h-[90%] rounded-t-2xl w-full flex flex-col justify-end gap-1 overflow-y-auto p-2">
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
  const { pc, CreateAnswer, CreateOffer, resetPeerConnection } = useContext(peerContext);

  const [myStream, setMyStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [remoteUser, setRemoteUser] = useState(null);

  const [messages, setMessages] = useState([]);
  const [sendingMessage, setSendingMessage] = useState("");

  const [isStarted, setIsStarted] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [isNegotiating, setIsNegotiating] = useState(false);

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
        alert("Failed to access camera and microphone. Please allow permissions.");
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
      myStream.getTracks().forEach((track) => {
        pc.addTrack(track, myStream);
      });
    }
  }, [myStream, pc]);

  // Handle remote stream
  useEffect(() => {
    const handleTrackEvent = (ev) => {
      if (ev.streams && ev.streams.length > 0) {
        setRemoteStream(ev.streams[0]);
      }
    };

    pc.addEventListener("track", handleTrackEvent);

    return () => {
      pc.removeEventListener("track", handleTrackEvent);
    };
  }, [pc]);

  // Function to start the connection
  const handleStart = useCallback(async () => {
    try {
      setIsStarted(true);
      socket.emit("start");
    } catch (error) {
      console.error("Error starting connection:", error);
    }
  }, [socket]);

  // Handle socket events
  useEffect(() => {
    const handleCreateOffer = async ({ ROOM_ID, user2 }) => {
      setRemoteUser(user2);
      setIsNewUser(true);
      setIsStarted(false);

      try {
        const offer = await CreateOffer();
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
        const answer = await CreateAnswer(offer);
        socket.emit("answer", { answer, To: From });
      } catch (error) {
        console.error("Error handling offer:", error);
      }
    };

    const handleAnswer = async ({ answer }) => {
      try {
        await pc.setRemoteDescription(answer);
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
        socket.emit("negoDone", { answer, To: From });
      } catch (error) {
        console.error("Error handling incoming negotiation:", error);
      }
    };

    const handleNegoDone = async ({ answer }) => {
      try {
        await pc.setRemoteDescription(answer);
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
      setMessages([]);
    };

    const handleIceCandidate = async ({ candidate }) => {
      if (candidate && pc.remoteDescription) {
        await pc.addIceCandidate(candidate);
      }
    };
    

    socket.on("addIceCandidate", handleIceCandidate);
    socket.on("createOffer", handleCreateOffer);
    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("negoNeeded", handleNegoNeeded);
    socket.on("negoFinal", handleNegoDone);
    socket.on("disconnected", handleDisconnect);
    socket.on("end", handleEnd);

    return () => {
      socket.off("addIceCandidate", handleIceCandidate);
      socket.off("createOffer", handleCreateOffer);
      socket.off("offer", handleOffer);
      socket.off("answer", handleAnswer);
      socket.off("negoNeeded", handleNegoNeeded);
      socket.off("negoFinal", handleNegoDone);
      socket.off("disconnected", handleDisconnect);
      socket.off("end", handleEnd);
    };
  }, [socket, pc, CreateOffer, CreateAnswer]);

  // Handle negotiation needed
  const handleNegoNeeded = useCallback(async () => {
    if (isNegotiating) return;

    setIsNegotiating(true);

    try {
      const offer = await CreateOffer();
      await pc.setLocalDescription(offer);
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
  const handleMessages = useCallback(() => {
    if (sendingMessage.trim() === "" || !remoteUser) return;

    setMessages((prev) => [...prev, { user: socket.id, message: sendingMessage, state: "sent" }]);
    socket.emit("newMessage", { sendingMessage, remoteUser });
    setSendingMessage("");
  }, [sendingMessage, remoteUser, socket]);

  useEffect(() => {
    const handleNewMessage = ({ sendingMessage, remoteUser }) => {
      setMessages((prev) => [...prev, { user: remoteUser, message: sendingMessage, state: "received" }]);
    };
    socket.on("newMessage", handleNewMessage);

    return () => {
      socket.off("newMessage", handleNewMessage);
    };
  }, [socket]);

  // Handle ending the call
  const handleEndCall = useCallback(async () => {
    if (myStream) {
      myStream.getTracks().forEach((track) => track.stop());
    }
    if (pc) {
      pc.close();
    }

    socket.emit("end", { remoteUser });
    resetPeerConnection();

    // Reset all states
    setRemoteStream(null);
    setRemoteUser(null);
    setIsStarted(false);
    setIsNewUser(false);
    setMessages([]);

    // Reinitialize local stream
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setMyStream(stream);
      console.log(myStream)
    } catch (error) {
      console.error("Error accessing camera: ", error);
    }
  }, [myStream, pc, socket, remoteUser, resetPeerConnection]);

  // ICE Candidate Handling
  useEffect(() => {
    const handleIceCandidate = (e) => {
      if (e.candidate) {
        socket.emit("addIceCandidate", {
          candidate: e.candidate,
          remoteUser,
        });
      }
    };

    pc.onicecandidate = handleIceCandidate;

    return () => {
      pc.onicecandidate = null;
    };
  }, [pc, socket, remoteUser]);

  return (
    <div className="h-screen w-full flex items-center justify-center bg-gray-800">
      <div className="h-screen w-[90%] bg-gray-800 flex flex-col items-center justify-center gap-8 p-8 rounded-2xl shadow-xl">
        {/* Video Containers */}
        <div className="flex flex-wrap gap-8 items-center justify-center">
          <div className="h-[50%] w-[48%] bg-white bg-opacity-20 backdrop-blur-md flex justify-center items-center rounded-lg shadow-lg">
            <VideoPlayer stream={myStream} title="Camera Permission required to START the chat" />
          </div>
          <div className="h-[50%] w-[48%] bg-white bg-opacity-20 backdrop-blur-md flex justify-center items-center rounded-lg shadow-lg">
            <VideoPlayer
              stream={remoteStream}
              title={
                isStarted && !remoteStream
                  ? "Searching for user"
                  : isNewUser
                  ? "New User Joined"
                  : "Press Start to begin"
              }
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-8">
          {!isStarted && !remoteStream && !isNewUser && (
            <button
              onClick={handleStart}
              className="flex items-center justify-center text-lg gap-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-500 text-white px-8 py-4 rounded-xl shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105"
              aria-label="Start Chat"
            >
              <FaHourglassStart />
              Start
            </button>
          )}

          {(remoteStream || isStarted || isNewUser) && (
            <button
              onClick={handleEndCall}
              className="flex items-center justify-center text-lg gap-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-500 text-white px-8 py-4 rounded-xl shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105"
              aria-label="End Call"
            >
              <MdCallEnd />
              End
            </button>
          )}
        </div>
      </div>

      {/* Chat Box */}
      <div className="h-[85%] w-[26%] bg-gray-700 rounded-2xl shadow-2xl flex flex-col justify-between">
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