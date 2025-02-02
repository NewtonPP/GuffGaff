import React, { useContext, useEffect, useState, useCallback } from "react";
import { socketContext } from "../contexts/SocketProvider";
import { peerContext } from "../contexts/PeerProvider";
import ReactPlayer from "react-player";
import { FaHourglassStart } from "react-icons/fa";
import { IoIosSend } from "react-icons/io";

const Chat = () => {
  const { socket } = useContext(socketContext);
  const { pc, CreateAnswer, CreateOffer } = useContext(peerContext);

  const [myStream, setMyStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [RemoteUser, setRemoteUser] = useState(null);

  const [Messages, setMessages] = useState([]);
  const [sendingMessage, setSendingMessage] = useState("");

  const [isStarted, setIsStarted] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [isNegotiating, setIsNegotiating] = useState(false);

  // Access the user's camera and microphone
  useEffect(() => {
    const AccessCamera = async () => {
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

    AccessCamera();
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
  const HandleStart = async () => {
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

    socket.on("createOffer", handleCreateOffer);
    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("negoNeeded", handleNegoNeeded);
    socket.on("negoFinal", handleNegoDone);

    return () => {
      socket.off("createOffer", handleCreateOffer);
      socket.off("offer", handleOffer);
      socket.off("answer", handleAnswer);
      socket.off("negoNeeded", handleNegoNeeded);
      socket.off("negoDone", handleNegoDone);
    };
  }, [socket, pc, CreateOffer, CreateAnswer]);

  // Handle negotiation needed
  const HandleNegoNeeded = useCallback(async () => {
    if (isNegotiating) {
      console.log("Negotiation already in progress");
      return;
    }

    setIsNegotiating(true);

    try {
      const offer = await CreateOffer();
      await pc.setLocalDescription(offer);
      console.log("NegotiationSent");
      socket.emit("negoNeeded", { offer, user2: RemoteUser });
    } catch (error) {
      console.error("Error during negotiation:", error);
    } finally {
      setIsNegotiating(false);
    }
  }, [CreateOffer, RemoteUser, socket, pc, isNegotiating]);

  useEffect(() => {
    pc.addEventListener("negotiationneeded", HandleNegoNeeded);
    return () => {
      pc.removeEventListener("negotiationneeded", HandleNegoNeeded);
    };
  }, [pc, HandleNegoNeeded]);

  // Handle sending messages
  const HandleMessages = (e) => {
    if (sendingMessage.trim() === "") return;

    setMessages((prev) => [...prev, { user: socket.id, message: sendingMessage, state: "sent" }]);
    socket.emit("newMessage", { sendingMessage, RemoteUser });
    setSendingMessage("");
  };

  useEffect(() => {
    const handleNewMessage = ({ sendingMessage, RemoteUser }) => {
      setMessages((prev) => [...prev, { user: RemoteUser, message: sendingMessage, state: "received" }]);
    };

    socket.on("newMessage", handleNewMessage);

    return () => {
      socket.off("newMessage", handleNewMessage);
    };
  }, [socket]);

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
                <p className="text-white">Camera Permission required to START the chat</p>
              )}
            </div>

            <div className="h-[300px] w-[400px] bg-black rounded-lg shadow-lg flex items-center justify-center">
              {remoteStream ? (
                <ReactPlayer playing muted height="100%" width="100%" url={remoteStream} />
              ) : isStarted && !remoteStream ? (
                <p className="text-white">Searching for user</p>
              ) : isNewUser ? (
                <p className="text-white">New User Joined</p>
              ) : (
                <p className="text-white">Press Start to begin</p>
              )}
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
              onKeyPress={(e) => e.key === "Enter" && HandleMessages()}
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