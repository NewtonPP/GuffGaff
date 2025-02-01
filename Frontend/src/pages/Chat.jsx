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

  // Function to start the connection
  const HandleStart = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    setMyStream(stream);
    socket.emit("start");
  };

  useEffect(() => {
    socket.on("createOffer", async ({ ROOM_ID, user2 }) => {
      setRemoteUser(user2);
      const offer = await CreateOffer();
      console.log("Created Offer", offer);
      socket.emit("offer", { offer, user2 });
    });

    socket.on("offer", async ({ offer, From }) => {
      setRemoteUser(From);
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
      socket.emit("negoDone", { answer, To: From });
    } catch (error) {
      console.log("Error Handling NegotiationIncoming");
    }
  };

  const HandleNegoDone = async ({ answer }) => {
    try {
      pc.setRemoteDescription(answer);
    } catch (error) {
      console.error("Error finalizing negotiation:", error);
    }
  };

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
              <p className="text-white">Waiting for Video...</p>
            )}
          </div>

          <div className="h-[300px] w-[400px] bg-black rounded-lg shadow-lg flex items-center justify-center">
            {remoteStream ? (
              <ReactPlayer playing muted height="100%" width="100%" url={remoteStream} />
            ) : (
              <p className="text-white">Waiting for Remote Video...</p>
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
            <div className="bg-gray-700 h-[90%] w-full">

            </div>
            <div className="flex items-center justify-center gap-2 mt-2">
              <input className="w-[80%] h-10 bg-slate-300 px-4 rounded-xl" placeholder="Send Message"></input>
              <button className="h-10 w-10 bg-slate-300 rounded-full flex items-center justify-center"><IoIosSend /></button>
            </div>
      </div>


    </div>
    </>
  );
};

export default Chat;
