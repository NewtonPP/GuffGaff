# GuffGaff

Random 1-to-1 video + text chat. Two strangers get paired; when one leaves, the
other is put straight back into the queue and matched with whoever is waiting.

- `Backend/` — Express + Socket.IO signalling server (matchmaking only; media
  flows peer-to-peer over WebRTC and never touches the server).
- `Frontend/` — React + Vite client.

## Configuration

Every URL lives in an env file, so switching environments means switching files,
not editing code.

| | Local | Production |
|---|---|---|
| Frontend config | `Frontend/.env.development` | `Frontend/.env.production` |
| Backend config | `Backend/.env.development` | `Backend/.env.production` |
| Client → server | `http://localhost:4000` | `https://guffgaff-4y84.onrender.com` |
| Allowed origins | `http://localhost:5173` | `https://guffandgaff.netlify.app` |

Vite picks its file from the mode: `npm run dev` reads `.env.development`,
`npm run build` reads `.env.production`. The backend picks its file from
`NODE_ENV`, which the `dev` and `start` scripts set for you.

Precedence, highest first: real environment variables (this is how Render
injects `PORT`) → `.env.local` → `.env.<environment>` → `.env`. Use
`Backend/.env` for personal overrides; it is gitignored.

`Frontend/.env.example` and `Backend/.env.example` document every variable.

### Changing a deployment URL

Edit the matching `.env.production` on both sides — the client's
`VITE_SOCKET_URL` and the server's `CLIENT_ORIGINS` — then rebuild the frontend.
Nothing else references a host name.

On Render, set `CLIENT_ORIGINS` in the dashboard rather than relying on the
committed file; leave `PORT` unset so Render can inject its own.

## Running locally

```bash
# terminal 1
cd Backend && npm install && npm run dev      # http://localhost:4000

# terminal 2
cd Frontend && npm install && npm run dev     # http://localhost:5173
```

Open the app in two separate browser profiles (or one normal and one private
window) and press Start in both. Two tabs of the same profile will fight over
the camera.

`GET /health` on the backend reports live socket, queue, and room counts.

## Socket protocol

| Direction | Event | Payload |
|---|---|---|
| client → server | `start` | — join the queue |
| client → server | `end` | — hang up and leave the queue |
| client → server | `signal` | `{ description }` or `{ candidate }` |
| client → server | `message` | `{ text }` |
| server → client | `waiting` | — queued, no partner yet |
| server → client | `matched` | `{ roomId, partnerId, initiator }` |
| server → client | `signal` | `{ from, description, candidate }` |
| server → client | `message` | `{ from, text }` |
| server → client | `partnerLeft` | `{ reason }` |

`signal` and `message` are routed through the server-side room, so a socket can
only ever reach the partner it was actually paired with — not an arbitrary id it
supplies.
