import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuArrowRight, LuPlay } from "react-icons/lu";

import Logo from "../components/Logo";
import Reveal from "../components/Reveal";

const SERVER_URL = import.meta.env.VITE_SOCKET_URL;

// Real occupancy from the signalling server's /health endpoint — null
// whenever the server can't be reached, so we never invent a number.
const useOnlineCount = () => {
  const [online, setOnline] = useState(null);

  useEffect(() => {
    if (!SERVER_URL) return;

    let alive = true;
    const controller = new AbortController();

    const poll = async () => {
      try {
        const response = await fetch(`${SERVER_URL}/health`, {
          signal: controller.signal,
        });
        const data = await response.json();
        if (alive) {
          setOnline(typeof data.connected === "number" ? data.connected : null);
        }
      } catch {
        if (alive) setOnline(null);
      }
    };

    poll();
    const timer = setInterval(poll, 15000);

    return () => {
      alive = false;
      controller.abort();
      clearInterval(timer);
    };
  }, []);

  return online;
};

/* ------------------------------------------------------------------ */

const OnlineLine = ({ online, className = "" }) => (
  <span className={`inline-flex items-center gap-2.5 text-[0.85rem] text-cream-400 ${className}`}>
    <span className="relative grid h-2 w-2 place-items-center">
      {online !== null && online > 0 && (
        <span className="absolute h-2 w-2 animate-pulse-ring rounded-full bg-sage-400" />
      )}
      <span
        className={`h-2 w-2 rounded-full ${
          online === null ? "bg-cream-500" : online === 0 ? "bg-ochre-400" : "bg-sage-400"
        }`}
      />
    </span>
    {online === null ? (
      <>Waking the server&hellip;</>
    ) : online === 0 ? (
      <>Quiet right now &mdash; be the first one in</>
    ) : (
      <>
        <span className="text-cream-200">{online}</span>
        {online === 1 ? " person" : " people"} here right now
      </>
    )}
  </span>
);

// Hand-drawn underline. The path is deliberately uneven — a straight rule
// would read as a border, this reads as a pen stroke.
const Underline = ({ className = "" }) => (
  <svg
    viewBox="0 0 300 16"
    fill="none"
    preserveAspectRatio="none"
    aria-hidden="true"
    className={`absolute -bottom-1 left-0 h-[0.5em] w-full ${className}`}
  >
    <path
      d="M3 10.5c34-4.2 71.8-6.4 113.5-6.6 41.7-.2 83.9 1.6 126.5 5.4 18 1.6 34 3.4 54 5.7"
      stroke="var(--color-clay-500)"
      strokeWidth="4"
      strokeLinecap="round"
      className="animate-draw"
      style={{ strokeDasharray: 320 }}
    />
  </svg>
);

const Label = ({ children, className = "" }) => (
  <span
    className={`text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-clay-400 ${className}`}
  >
    {children}
  </span>
);

/* The hero's centrepiece: a stylised call, built entirely from CSS. */
const CallCard = () => (
  <div className="relative mx-auto w-full max-w-[27rem]">
    <div className="card animate-float relative overflow-hidden p-2.5 shadow-[0_30px_70px_-25px_rgba(0,0,0,0.85)]">
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-bark-950">
        {/* warm, low-key light rather than a neon mesh */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_18%,#4a2f22,transparent_62%),radial-gradient(ellipse_at_50%_100%,#2a1d17,transparent_70%)]" />

        {/* abstract figure, lit from above */}
        <div className="absolute left-1/2 top-[24%] h-[5.5rem] w-[5.5rem] -translate-x-1/2 rounded-full bg-gradient-to-b from-clay-300/80 to-clay-500/50 blur-[1px]" />
        <div className="absolute left-1/2 top-[57%] h-36 w-52 -translate-x-1/2 rounded-[50%] bg-gradient-to-b from-clay-600/55 to-transparent blur-md" />

        <div className="grain absolute inset-0" />

        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-md bg-bark-950/70 px-2 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.12em] text-sage-400">
          <span className="h-1.5 w-1.5 rounded-full bg-sage-400" />
          Live
        </span>

        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-end gap-[3px]">
          {[0, 0.18, 0.34, 0.1, 0.44, 0.26, 0.06].map((delay, i) => (
            <span
              key={i}
              className="animate-bar h-6 w-[3px] origin-bottom rounded-full bg-cream-100/80"
              style={{ animationDelay: `${delay}s` }}
            />
          ))}
        </div>

        <div className="absolute bottom-3 right-3 h-14 w-20 overflow-hidden rounded-md border border-cream-100/20 bg-bark-850">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,#5a3a26,transparent_65%)]" />
          <div className="absolute left-1/2 top-[28%] h-5 w-5 -translate-x-1/2 rounded-full bg-ochre-300/70" />
          <div className="absolute left-1/2 top-[62%] h-8 w-12 -translate-x-1/2 rounded-[50%] bg-ochre-400/40 blur-[3px]" />
        </div>
      </div>

      <div className="flex items-center justify-between px-1.5 pb-0.5 pt-2.5">
        <span className="text-[0.7rem] text-cream-500">Talking for 4 minutes</span>
        <div className="flex gap-1.5">
          <span className="h-6 w-6 rounded-md bg-cream-100/[0.07]" />
          <span className="h-6 w-6 rounded-md bg-cream-100/[0.07]" />
          <span className="h-6 w-6 rounded-md bg-clay-500" />
        </div>
      </div>
    </div>

    {/* placed by hand, not on a grid */}
    <div className="absolute -left-4 top-[28%] -rotate-2 rounded-lg rounded-bl-sm border border-cream-100/10 bg-bark-800 px-3 py-1.5 text-[0.85rem] text-cream-200 shadow-lg sm:-left-12">
      where are you from?
    </div>
    <div className="absolute -right-3 bottom-[24%] rotate-1 rounded-lg rounded-br-sm bg-clay-500 px-3 py-1.5 text-[0.85rem] text-cream-50 shadow-lg sm:-right-10">
      kathmandu — you?
    </div>
  </div>
);

/* ------------------------------------------------------------------ */

const Nav = ({ onStart }) => (
  <header className="absolute inset-x-0 top-0 z-50">
    <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-6">
      <Logo />

      <nav className="hidden items-center gap-8 text-[0.9rem] text-cream-300 md:flex">
        {[
          ["Why", "#why"],
          ["How it works", "#how"],
          ["Privacy", "#privacy"],
        ].map(([label, href]) => (
          <a key={href} href={href} className="transition-colors hover:text-cream-50">
            {label}
          </a>
        ))}
      </nav>

      <button
        onClick={onStart}
        className="group inline-flex items-center gap-2 text-[0.9rem] font-medium text-cream-100 transition-colors hover:text-clay-300"
      >
        Start
        <LuArrowRight className="transition-transform group-hover:translate-x-0.5" />
      </button>
    </div>
  </header>
);

const Hero = ({ onStart, online }) => (
  <section className="relative px-6 pb-28 pt-36 sm:pt-44">
    <div className="mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-[1.1fr_0.9fr]">
      <div>
        <h1 className="animate-rise text-[clamp(2.7rem,6.4vw,4.5rem)] font-semibold leading-[1.02] text-cream-50">
          Somewhere out there,
          <br />
          someone&rsquo;s{" "}
          <span className="relative inline-block whitespace-nowrap">
            waiting to talk
            <Underline />
          </span>
          .
        </h1>

        <p
          className="animate-rise mt-8 max-w-md text-[1.05rem] leading-[1.7] text-cream-300"
          style={{ animationDelay: "120ms" }}
        >
          Guffgaff puts you face to face with one stranger at a time. No sign-up,
          no profile, nothing kept afterwards. Press start and see who you get.
        </p>

        <div
          className="animate-rise mt-10 flex flex-wrap items-center gap-3"
          style={{ animationDelay: "220ms" }}
        >
          <button onClick={onStart} className="btn-primary">
            <LuPlay className="text-[0.95em]" />
            Start chatting
          </button>
          <a href="#how" className="btn-ghost">
            How it works
          </a>
        </div>

        <div className="animate-rise mt-8" style={{ animationDelay: "300ms" }}>
          <OnlineLine online={online} />
        </div>
      </div>

      <div className="animate-rise lg:pt-8" style={{ animationDelay: "180ms" }}>
        <CallCard />
      </div>
    </div>
  </section>
);

const Why = () => {
  const points = [
    {
      title: "You are never left hanging",
      body: "The queue does not stall. The second your partner closes their tab, you are handed to whoever is waiting next — no refresh, no reconnect, no dead end.",
    },
    {
      title: "Your video never reaches us",
      body: "Picture and sound travel straight from your browser to theirs. Our server does the introduction and then steps out of the room.",
    },
    {
      title: "Type when talking is too much",
      body: "There is a text line beside the call for names, links, and the things easier written than said. It empties the moment the call ends.",
    },
    {
      title: "No feed deciding who you deserve",
      body: "No filters, no ranking, no profile to optimise. Just whoever happened to press start at the same moment as you.",
    },
  ];

  return (
    <section id="why" className="relative scroll-mt-24 px-6 py-24">
      <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-[minmax(0,21rem)_1fr] lg:gap-20">
        <div className="self-start lg:sticky lg:top-24">
          <Reveal>
            <Label>Why Guffgaff</Label>
            <h2 className="mt-5 text-[clamp(1.9rem,3.8vw,2.8rem)] leading-[1.1] text-cream-50">
              Built for the good kind of small talk
            </h2>
            <p className="mt-5 leading-[1.7] text-cream-400">
              Every decision points the same way: get you talking to a real
              person quickly, then stay out of the conversation.
            </p>
          </Reveal>
        </div>

        <div>
          {points.map((point, i) => (
            <Reveal
              key={point.title}
              delay={i * 70}
              className={`flex gap-6 py-8 sm:gap-10 ${i > 0 ? "rule" : ""}`}
            >
              <span className="mt-1 shrink-0 font-display text-[0.95rem] text-clay-400">
                0{i + 1}
              </span>
              <div>
                <h3 className="text-[1.3rem] leading-snug text-cream-50">{point.title}</h3>
                <p className="mt-3 max-w-xl leading-[1.7] text-cream-400">{point.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

const How = () => {
  const steps = [
    {
      title: "Allow camera and mic",
      body: "One browser prompt. Your camera stays on your own machine until you are actually paired with somebody.",
    },
    {
      title: "Press start",
      body: "You join the queue. The instant somebody else does the same, you both land in a room together.",
    },
    {
      title: "Talk, or move on",
      body: "Stay as long as it is good. Hit Next and you are back at the front of the queue straight away.",
    },
  ];

  return (
    <section id="how" className="relative scroll-mt-24 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <Reveal className="max-w-xl">
          <Label>How it works</Label>
          <h2 className="mt-5 text-[clamp(1.9rem,3.8vw,2.8rem)] leading-[1.1] text-cream-50">
            Three steps, about ten seconds
          </h2>
        </Reveal>

        <div className="mt-16 grid gap-10 sm:grid-cols-3 sm:gap-8">
          {steps.map((step, i) => (
            <Reveal key={step.title} delay={i * 90} className="rule pt-7">
              <span className="font-display text-[2.6rem] font-normal leading-none text-clay-500">
                {i + 1}
              </span>
              <h3 className="mt-5 text-[1.25rem] text-cream-50">{step.title}</h3>
              <p className="mt-3 leading-[1.7] text-cream-400">{step.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

const Privacy = () => (
  <section id="privacy" className="relative scroll-mt-24 px-6 py-24">
    <div className="mx-auto max-w-6xl">
      <Reveal className="card grain relative overflow-hidden px-8 py-14 sm:px-14">
        <div className="warmth -left-20 top-0 h-72 w-96 bg-clay-600/20" />

        <div className="relative grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-20">
          <div>
            <Label>Privacy</Label>
            <h2 className="mt-5 text-[clamp(1.9rem,3.8vw,2.7rem)] leading-[1.1] text-cream-50">
              There is nothing here to leak
            </h2>
            <p className="mt-5 max-w-md leading-[1.7] text-cream-300">
              Guffgaff has no database, no accounts and no recording. The server
              keeps a list of who is waiting, in memory, and forgets you the
              moment your tab closes.
            </p>
          </div>

          <ul className="self-center">
            {[
              ["Nothing is stored", "There is no database, so there is nothing to hand over."],
              ["Nothing is recorded", "Media goes browser to browser and is never captured."],
              ["Nothing to sign up for", "No email, no password, no profile to maintain."],
            ].map(([title, body], i) => (
              <li key={title} className={`py-5 ${i > 0 ? "rule" : ""}`}>
                <p className="font-medium text-cream-100">{title}</p>
                <p className="mt-1.5 text-[0.92rem] leading-relaxed text-cream-400">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </div>
  </section>
);

const FinalCta = ({ onStart, online }) => (
  <section className="relative px-6 pb-28 pt-10">
    <Reveal className="mx-auto max-w-2xl text-center">
      <h2 className="text-[clamp(2rem,4.6vw,3.1rem)] leading-[1.08] text-cream-50">
        Someone pressed start
        <br />a second before you did.
      </h2>
      <p className="mx-auto mt-6 max-w-sm leading-[1.7] text-cream-400">
        A camera, a click, and whoever happens to be on the other side.
      </p>

      <div className="mt-9 flex flex-col items-center gap-5">
        <button onClick={onStart} className="btn-primary">
          <LuPlay className="text-[0.95em]" />
          Start chatting
        </button>
        <OnlineLine online={online} />
      </div>
    </Reveal>
  </section>
);

const Footer = () => (
  <footer className="rule relative px-6 py-10">
    <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 text-[0.88rem] text-cream-500 sm:flex-row">
      <Logo />
      <p>Built with WebRTC. Be kind to whoever you meet.</p>
      <nav className="flex gap-6">
        <a href="#why" className="transition-colors hover:text-cream-200">Why</a>
        <a href="#how" className="transition-colors hover:text-cream-200">How</a>
        <a href="#privacy" className="transition-colors hover:text-cream-200">Privacy</a>
      </nav>
    </div>
  </footer>
);

/* ------------------------------------------------------------------ */

const Home = () => {
  const navigate = useNavigate();
  const online = useOnlineCount();
  const goToChat = () => navigate("/chat");

  return (
    <div className="grain relative min-h-screen overflow-x-clip bg-bark-950">
      {/* one warm pool of light behind the hero, and nothing else */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[46rem] overflow-hidden" aria-hidden="true">
        <div className="warmth -top-56 left-[-10%] h-[34rem] w-[46rem] bg-clay-600/22" />
        <div className="warmth -top-32 right-[-5%] h-[26rem] w-[30rem] bg-ochre-400/[0.07]" />
      </div>

      <Nav onStart={goToChat} />

      <main className="relative">
        <Hero onStart={goToChat} online={online} />
        <Why />
        <How />
        <Privacy />
        <FinalCta onStart={goToChat} online={online} />
      </main>

      <Footer />
    </div>
  );
};

export default Home;
