import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  LuArrowLeft,
  LuMessageSquare,
  LuMic,
  LuMicOff,
  LuPhoneOff,
  LuPlay,
  LuRadio,
  LuSend,
  LuSkipForward,
  LuVideo,
  LuVideoOff,
  LuX,
} from "react-icons/lu";

import { useSocket } from "../contexts/socketContext";
import { usePeer } from "../contexts/peerContext";
import Logo from "../components/Logo";

const STATUS = {
  idle: { label: "Not connected", tone: "text-graphite-500", dot: "bg-graphite-400" },
  searching: { label: "Looking for someone", tone: "text-taupe-500", dot: "bg-taupe-500" },
  connecting: { label: "Connecting", tone: "text-sage-600", dot: "bg-sage-400" },
  connected: { label: "Connected", tone: "text-sage-700", dot: "bg-sage-500" },
};

/* ------------------------------------------------------------------ *
 * Presentation
 * ------------------------------------------------------------------ */

const VideoSurface = ({ stream, muted, mirrored, className = "" }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.srcObject = stream ?? null;
    if (stream) {
      video.play().catch((error) => {
        console.error("Unable to play stream:", error);
      });
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      className={`h-full w-full object-cover ${mirrored ? "-scale-x-100" : ""} ${
        stream ? "" : "hidden"
      } ${className}`}
    />
  );
};

const StatusPill = ({ status }) => {
  const { label, tone, dot } = STATUS[status];
  const animated = status === "searching" || status === "connecting";

  return (
    <span className="inline-flex items-center gap-2.5 rounded-full border border-sand-300 bg-sand-50 py-1.5 pl-3 pr-4 text-[0.8rem] shadow-[0_1px_2px_rgba(30,32,28,0.04)]">
      <span className="relative grid h-2 w-2 place-items-center">
        {animated && <span className={`absolute h-2 w-2 animate-pulse-ring rounded-full ${dot}`} />}
        <span className={`h-2 w-2 rounded-full ${dot}`} />
      </span>
      <span className={`font-semibold ${tone}`}>{label}</span>
    </span>
  );
};

// What fills the remote tile before a partner's video arrives.
const StageOverlay = ({ status, mediaError, onStart, canStart }) => {
  if (status === "connected") return null;

  if (status === "searching" || status === "connecting") {
    const searching = status === "searching";
    return (
      <div className="absolute inset-0 grid place-items-center px-6 text-center">
        <div>
          <div className="relative mx-auto grid h-24 w-24 place-items-center">
            {[0, 0.8, 1.6].map((delay) => (
              <span
                key={delay}
                className={`absolute h-16 w-16 animate-pulse-ring rounded-full border ${
                  searching ? "border-taupe-300/70" : "border-sage-300/70"
                }`}
                style={{ animationDelay: `${delay}s` }}
              />
            ))}
            <span
              className={`relative grid h-16 w-16 place-items-center rounded-full bg-graphite-900 ring-1 ring-sand-50/15 ${
                searching ? "text-taupe-300" : "text-sage-300"
              }`}
            >
              <LuRadio className="text-xl" />
            </span>
          </div>

          <p className="mt-7 font-display text-xl font-extrabold tracking-[-0.02em] text-sand-50">
            {searching ? "Looking for someone…" : "Connecting…"}
          </p>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-sand-300">
            {searching
              ? "You're in the queue. The moment somebody else presses start, you'll both land here."
              : "Shaking hands with your partner's browser. This usually takes a second or two."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 grid place-items-center px-6 text-center">
      <div>
        <h2 className="font-display text-[clamp(1.5rem,3vw,2rem)] font-extrabold text-sand-50">
          Ready when you are
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-sand-300">
          {mediaError ??
            "Press start and we'll pair you with the next person in the queue."}
        </p>
        <button onClick={onStart} disabled={!canStart} className="btn-primary mt-7">
          <LuPlay />
          Start chatting
        </button>
      </div>
    </div>
  );
};

const ControlButton = ({ icon: Icon, label, onClick, active = true, tone = "neutral", disabled }) => {
  const tones = {
    neutral: active
      ? "border-sand-300 bg-sand-200 text-graphite-800 hover:bg-sand-300"
      : "border-rose-600/30 bg-rose-500 text-sand-50 hover:bg-rose-400",
    danger:
      "border-rose-600/30 bg-rose-500 text-sand-50 hover:bg-rose-400 shadow-lg shadow-rose-500/25",
    accent: "border-sand-300 bg-sand-200 text-graphite-800 hover:bg-sage-600 hover:text-sand-50",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={tone === "neutral" ? active : undefined}
      className={`grid h-12 w-12 place-items-center rounded-full border text-lg transition-all duration-200 hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-40 ${tones[tone]}`}
    >
      <Icon />
    </button>
  );
};

const MessageList = ({ messages, status }) => {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  return (
    <div className="flex-1 space-y-2.5 overflow-y-auto px-4 py-4">
      {messages.length === 0 && (
        <div className="grid h-full place-items-center px-4 text-center">
          <div>
            <LuMessageSquare className="mx-auto text-2xl text-sand-400" />
            <p className="mt-3 text-sm text-graphite-400">
              {status === "connected"
                ? "Say hello — messages here disappear when the call ends."
                : "Messages will show up once you're paired."}
            </p>
          </div>
        </div>
      )}

      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.mine ? "justify-end" : "justify-start"}`}
        >
          <span
            className={`max-w-[85%] break-words rounded-2xl px-3.5 py-2 text-[0.9rem] font-medium leading-snug ${
              message.mine
                ? "rounded-br-md bg-sage-600 text-sand-50"
                : "rounded-bl-md border border-sand-300 bg-sand-200 text-graphite-700"
            }`}
          >
            {message.text}
          </span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
};

const Composer = ({ draft, setDraft, onSend, disabled }) => (
  <div className="border-t border-sand-200 p-3">
    <div className="flex items-center gap-2 rounded-full border border-sand-300 bg-sand-100 py-1.5 pl-4 pr-1.5 transition-colors focus-within:border-sage-400 focus-within:bg-sand-50">
      <input
        className="min-w-0 flex-1 bg-transparent py-1.5 text-[0.92rem] font-medium text-graphite-800 outline-none placeholder:font-normal placeholder:text-graphite-400 disabled:cursor-not-allowed"
        placeholder={disabled ? "Connect to start chatting" : "Type a message…"}
        value={draft}
        disabled={disabled}
        maxLength={2000}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSend();
        }}
      />
      <button
        onClick={onSend}
        disabled={disabled || !draft.trim()}
        aria-label="Send message"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sage-600 text-sand-50 transition-colors hover:bg-sage-500 disabled:pointer-events-none disabled:opacity-35"
      >
        <LuSend className="text-[0.95rem]" />
      </button>
    </div>
  </div>
);

/* ------------------------------------------------------------------ *
 * Container
 * ------------------------------------------------------------------ */

const Chat = () => {
  const { socket } = useSocket();
  const { pcRef, createPeerConnection, closePeerConnection } = usePeer();

  const [myStream, setMyStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [partnerId, setPartnerId] = useState(null);
  const [status, setStatus] = useState("idle");
  const [mediaError, setMediaError] = useState(null);

  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [unread, setUnread] = useState(0);

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);

  const myStreamRef = useRef(null);
  const partnerIdRef = useRef(null);
  const chatOpenRef = useRef(false);

  // Perfect-negotiation bookkeeping: both peers add tracks, so both can try to
  // negotiate at once. The polite peer yields when that happens.
  const politeRef = useRef(false);
  const makingOfferRef = useRef(false);
  const ignoreOfferRef = useRef(false);

  // Candidates that arrive before setRemoteDescription must be buffered, not
  // dropped, or the connection silently fails to establish.
  const pendingCandidatesRef = useRef([]);

  // True while the user wants to be matched, so losing a partner rolls
  // straight back into the queue instead of stranding them.
  const autoSearchRef = useRef(false);

  const messageIdRef = useRef(0);
  const nextMessageId = () => {
    messageIdRef.current += 1;
    return messageIdRef.current;
  };

  // -- Local media ----------------------------------------------------------

  useEffect(() => {
    let cancelled = false;
    let acquired = null;

    const enableMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        acquired = stream;

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        myStreamRef.current = stream;
        setMyStream(stream);
      } catch (error) {
        console.error("Error accessing camera:", error);
        if (!cancelled) {
          setMediaError(
            "Camera and microphone access is required. Allow permissions and reload the page."
          );
        }
      }
    };

    enableMedia();

    return () => {
      cancelled = true;
      // The old cleanup closed over `myStream` from the first render, which was
      // always null, so the camera was never released.
      acquired?.getTracks().forEach((track) => track.stop());
      myStreamRef.current = null;
    };
  }, []);

  // Enabling/disabling a track is local-only — no renegotiation needed.
  const toggleMic = useCallback(() => {
    const tracks = myStreamRef.current?.getAudioTracks() ?? [];
    if (tracks.length === 0) return;

    const next = !tracks[0].enabled;
    tracks.forEach((track) => (track.enabled = next));
    setMicOn(next);
  }, []);

  const toggleCam = useCallback(() => {
    const tracks = myStreamRef.current?.getVideoTracks() ?? [];
    if (tracks.length === 0) return;

    const next = !tracks[0].enabled;
    tracks.forEach((track) => (track.enabled = next));
    setCamOn(next);
  }, []);

  // -- Session lifecycle ----------------------------------------------------

  const resetSession = useCallback(() => {
    closePeerConnection();

    partnerIdRef.current = null;
    pendingCandidatesRef.current = [];
    makingOfferRef.current = false;
    ignoreOfferRef.current = false;
    politeRef.current = false;

    setPartnerId(null);
    setRemoteStream(null);
    setMessages([]);
    setDraft("");
    setUnread(0);
  }, [closePeerConnection]);

  // Called whenever the current partner goes away, for any reason.
  const findNextPartner = useCallback(() => {
    resetSession();

    if (autoSearchRef.current) {
      setStatus("searching");
      socket.emit("start");
    } else {
      setStatus("idle");
    }
  }, [resetSession, socket]);

  const setupConnection = useCallback(
    (partner, initiator) => {
      const pc = createPeerConnection();

      partnerIdRef.current = partner;
      politeRef.current = !initiator;
      pendingCandidatesRef.current = [];
      makingOfferRef.current = false;
      ignoreOfferRef.current = false;

      pc.ontrack = ({ streams: [stream] }) => {
        if (stream) setRemoteStream(stream);
      };

      pc.onicecandidate = ({ candidate }) => {
        if (candidate) socket.emit("signal", { candidate });
      };

      pc.onconnectionstatechange = () => {
        // A late event from a connection we already replaced.
        if (pcRef.current !== pc) return;

        if (pc.connectionState === "connected") setStatus("connected");

        // Only "failed" is terminal; "disconnected" is often transient and
        // recovers on its own, so tearing down there dropped good calls.
        if (pc.connectionState === "failed") {
          socket.emit("end");
          findNextPartner();
        }
      };

      pc.onnegotiationneeded = async () => {
        if (pcRef.current !== pc || !partnerIdRef.current) return;

        try {
          makingOfferRef.current = true;
          await pc.setLocalDescription();
          socket.emit("signal", { description: pc.localDescription });
        } catch (error) {
          console.error("Error creating offer:", error);
        } finally {
          makingOfferRef.current = false;
        }
      };

      // Tracks are added synchronously here, on the connection we just made —
      // never on a stale one left behind by a reset.
      const stream = myStreamRef.current;
      if (stream) {
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      }

      return pc;
    },
    [createPeerConnection, findNextPartner, pcRef, socket]
  );

  // -- Signalling -----------------------------------------------------------

  useEffect(() => {
    const flushPendingCandidates = async (pc) => {
      const pending = pendingCandidatesRef.current;
      pendingCandidatesRef.current = [];

      for (const candidate of pending) {
        try {
          await pc.addIceCandidate(candidate);
        } catch (error) {
          console.error("Error adding buffered ICE candidate:", error);
        }
      }
    };

    const handleMatched = ({ partnerId: partner, initiator }) => {
      setStatus("connecting");
      setRemoteStream(null);
      setMessages([]);
      setUnread(0);
      setPartnerId(partner);
      setupConnection(partner, initiator);
    };

    const handleWaiting = () => {
      if (autoSearchRef.current) setStatus("searching");
    };

    const handleSignal = async ({ from, description, candidate }) => {
      const pc = pcRef.current;
      if (!pc || from !== partnerIdRef.current) return;

      try {
        if (description) {
          const offerCollision =
            description.type === "offer" &&
            (makingOfferRef.current || pc.signalingState !== "stable");

          ignoreOfferRef.current = !politeRef.current && offerCollision;
          if (ignoreOfferRef.current) return;

          await pc.setRemoteDescription(description);
          await flushPendingCandidates(pc);

          if (description.type === "offer") {
            await pc.setLocalDescription();
            socket.emit("signal", { description: pc.localDescription });
          }
          return;
        }

        if (candidate) {
          if (!pc.remoteDescription) {
            pendingCandidatesRef.current.push(candidate);
            return;
          }

          try {
            await pc.addIceCandidate(candidate);
          } catch (error) {
            if (!ignoreOfferRef.current) {
              console.error("Error adding ICE candidate:", error);
            }
          }
        }
      } catch (error) {
        console.error("Signalling error:", error);
      }
    };

    const handlePartnerLeft = () => {
      findNextPartner();
    };

    const handleMessage = ({ text }) => {
      setMessages((prev) => [...prev, { id: nextMessageId(), text, mine: false }]);
      if (!chatOpenRef.current) setUnread((count) => count + 1);
    };

    // Server restarts and network blips land here.
    const handleSocketDisconnect = () => {
      resetSession();
      setStatus(autoSearchRef.current ? "searching" : "idle");
    };

    const handleSocketConnect = () => {
      if (autoSearchRef.current) socket.emit("start");
    };

    socket.on("matched", handleMatched);
    socket.on("waiting", handleWaiting);
    socket.on("signal", handleSignal);
    socket.on("partnerLeft", handlePartnerLeft);
    socket.on("message", handleMessage);
    socket.on("connect", handleSocketConnect);
    socket.on("disconnect", handleSocketDisconnect);

    return () => {
      socket.off("matched", handleMatched);
      socket.off("waiting", handleWaiting);
      socket.off("signal", handleSignal);
      socket.off("partnerLeft", handlePartnerLeft);
      socket.off("message", handleMessage);
      socket.off("connect", handleSocketConnect);
      socket.off("disconnect", handleSocketDisconnect);
    };
  }, [socket, pcRef, setupConnection, findNextPartner, resetSession]);

  // Leaving the page must hang up, or the partner waits on a ghost.
  useEffect(() => {
    return () => {
      autoSearchRef.current = false;
      socket.emit("end");
      closePeerConnection();
    };
  }, [socket, closePeerConnection]);

  // -- Actions --------------------------------------------------------------

  const handleStart = useCallback(() => {
    if (!myStreamRef.current) {
      setMediaError("Camera and microphone access is required before starting.");
      return;
    }

    autoSearchRef.current = true;
    setStatus("searching");
    socket.emit("start");
  }, [socket]);

  // Hang up on this partner but stay in the queue for the next one.
  const handleSkip = useCallback(() => {
    autoSearchRef.current = true;
    socket.emit("end");
    resetSession();
    setStatus("searching");
    socket.emit("start");
  }, [socket, resetSession]);

  const handleEndCall = useCallback(() => {
    autoSearchRef.current = false;
    socket.emit("end");
    resetSession();
    setStatus("idle");
  }, [socket, resetSession]);

  const handleSend = useCallback(() => {
    const text = draft.trim();
    if (!text || !partnerIdRef.current) return;

    socket.emit("message", { text });
    setMessages((prev) => [...prev, { id: nextMessageId(), text, mine: true }]);
    setDraft("");
  }, [draft, socket]);

  const openChat = (open) => {
    chatOpenRef.current = open;
    setChatOpen(open);
    if (open) setUnread(0);
  };

  // -- Render ---------------------------------------------------------------

  const isIdle = status === "idle";
  const isConnected = status === "connected";

  return (
    <div className="grain relative flex h-[100dvh] flex-col overflow-hidden bg-sand-100">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="wash -top-56 left-[6%] h-[30rem] w-[38rem] bg-sage-300/45" />
      </div>

      {/* ---- top bar ---- */}
      <header className="relative z-20 flex shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            aria-label="Back to home"
            className="grid h-9 w-9 place-items-center rounded-full border border-sand-300 bg-sand-50 text-graphite-600 transition-colors hover:border-sage-400 hover:text-sage-700"
          >
            <LuArrowLeft />
          </Link>
          <span className="hidden sm:contents">
            <Logo />
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {partnerId && isConnected && (
            <span className="hidden rounded-full border border-sand-300 bg-sand-50 px-3 py-1.5 font-mono text-[0.72rem] text-graphite-500 sm:inline">
              {partnerId.slice(0, 8)}
            </span>
          )}
          <StatusPill status={status} />
        </div>
      </header>

      {/* ---- main ---- */}
      <main className="relative z-10 grid min-h-0 flex-1 gap-4 px-4 pb-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_23rem]">
        {/* stage */}
        <section className="relative min-h-0">
          <div
            className={`card relative h-full overflow-hidden p-0 ${
              isConnected ? "border-sage-400" : ""
            }`}
          >
            <div className="absolute inset-0 bg-graphite-950">
              <VideoSurface stream={remoteStream} muted={false} />
              <StageOverlay
                status={status}
                mediaError={mediaError}
                onStart={handleStart}
                canStart={Boolean(myStream)}
              />
            </div>

            {/* self view */}
            <div className="absolute bottom-24 left-4 z-20 h-24 w-32 overflow-hidden rounded-xl border border-sand-50/20 bg-graphite-900 shadow-2xl sm:bottom-28 sm:left-6 sm:h-32 sm:w-44">
              <VideoSurface stream={myStream} muted mirrored />
              {(!myStream || !camOn) && (
                <div className="absolute inset-0 grid place-items-center text-sand-400">
                  <LuVideoOff />
                </div>
              )}
              <span className="absolute bottom-1.5 left-2 font-display text-[0.65rem] font-bold uppercase tracking-[0.12em] text-sand-200">
                You
              </span>
              {!micOn && (
                <span className="absolute bottom-1.5 right-2 grid h-5 w-5 place-items-center rounded-full bg-rose-500 text-[0.6rem] text-sand-50">
                  <LuMicOff />
                </span>
              )}
            </div>

            {/* control dock */}
            <div className="absolute inset-x-0 bottom-0 z-20 flex justify-center bg-gradient-to-t from-graphite-950/90 via-graphite-950/55 to-transparent px-4 pb-5 pt-14">
              <div className="flex items-center gap-2.5 rounded-full border border-sand-300 bg-sand-50/92 p-2 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.6)] backdrop-blur-xl">
                <ControlButton
                  icon={micOn ? LuMic : LuMicOff}
                  label={micOn ? "Mute microphone" : "Unmute microphone"}
                  onClick={toggleMic}
                  active={micOn}
                  disabled={!myStream}
                />
                <ControlButton
                  icon={camOn ? LuVideo : LuVideoOff}
                  label={camOn ? "Turn camera off" : "Turn camera on"}
                  onClick={toggleCam}
                  active={camOn}
                  disabled={!myStream}
                />

                <span className="mx-0.5 h-8 w-px bg-sand-300" />

                {isIdle ? (
                  <button
                    onClick={handleStart}
                    disabled={!myStream}
                    className="btn-primary h-12 rounded-full px-6 py-0 text-[0.92rem]"
                  >
                    <LuPlay />
                    Start
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleSkip}
                      disabled={!isConnected}
                      title="Next person"
                      className="inline-flex h-12 items-center gap-2 rounded-full border border-sand-300 bg-sand-200 px-5 font-display text-[0.92rem] font-bold text-graphite-800 transition-all hover:-translate-y-0.5 hover:bg-sand-300 disabled:pointer-events-none disabled:opacity-40"
                    >
                      <LuSkipForward />
                      Next
                    </button>
                    <ControlButton
                      icon={LuPhoneOff}
                      label="End call"
                      onClick={handleEndCall}
                      tone="danger"
                    />
                  </>
                )}

                <span className="mx-0.5 h-8 w-px bg-sand-300 lg:hidden" />

                <button
                  onClick={() => openChat(true)}
                  aria-label="Open chat"
                  className="relative grid h-12 w-12 place-items-center rounded-full border border-sand-300 bg-sand-200 text-lg text-graphite-800 transition-all hover:-translate-y-0.5 hover:bg-sand-300 lg:hidden"
                >
                  <LuMessageSquare />
                  {unread > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[0.65rem] font-bold text-sand-50">
                      {unread}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* chat panel — always present on lg, a sheet below it */}
        <aside
          className={`card z-30 flex flex-col overflow-hidden max-lg:fixed max-lg:inset-x-4 max-lg:bottom-4 max-lg:top-20 max-lg:transition-all max-lg:duration-300 lg:relative ${
            chatOpen
              ? "max-lg:pointer-events-auto max-lg:translate-y-0 max-lg:opacity-100"
              : "max-lg:pointer-events-none max-lg:translate-y-6 max-lg:opacity-0"
          }`}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-sand-200 px-4 py-3">
            <div>
              <h2 className="font-display text-[0.95rem] font-extrabold">Chat</h2>
              <p className="text-[0.72rem] font-medium text-graphite-400">
                {isConnected ? "Cleared when the call ends" : "Not connected"}
              </p>
            </div>
            <button
              onClick={() => openChat(false)}
              aria-label="Close chat"
              className="grid h-8 w-8 place-items-center rounded-full text-graphite-500 transition-colors hover:bg-sand-200 hover:text-graphite-900 lg:hidden"
            >
              <LuX />
            </button>
          </div>

          <MessageList messages={messages} status={status} />
          <Composer
            draft={draft}
            setDraft={setDraft}
            onSend={handleSend}
            disabled={!isConnected}
          />
        </aside>
      </main>
    </div>
  );
};

export default Chat;
