# WebRTC Chat

A video chat app with a text chat. People create a new room or join one using an invite link.
Video, audio, and text messages go directly between their browsers using WebRTC.

## Features

- Video and audio calls in rooms, with one connection per person (mesh)
- Text chat over WebRTC data channels, so messages never touch the server
- Invite links, random room ids, and display names
- Mute and camera buttons, status messages for connection problems

## Tech stack
- **Client:** Svelte 5, TypeScript, Vite
- **Server:** Node.js, TypeScript, WebSockets
- **Tests:** Vitest (unit and integration)
- **Packaging:** Docker 
- **Hosting:** Render (server), Cloudflare (client) 

**Live demo:** [webrtc-chat.nataliatomic77.workers.dev](https://webrtc-chat.nataliatomic77.workers.dev)

The server runs on a free plan that sleeps when idle, so the first visit can take
up to a minute to wake up.


## Run it locally

Start the server (port 8080):

```bash
cd server
npm install
npm run dev
```

Start the client in a second terminal:

```bash
cd client
npm install
npm run dev
```

Open the address that Vite prints, start a call, and open the invite link in
a second tab or browser. The client connects to `ws://localhost:8080` by default.
To use another server, set `VITE_WS_URL` in `client/.env`.

To use the server in Docker instead, you need Docker Desktop running.
```
cd server
docker build -t webrtc-server .
docker run --rm -p 8080:8080 webrtc-server
```

## Tests

```
cd server
npm test
```

## Project structure
```
server/ signaling server (createServer.ts, validate.ts), its tests and a Dockerfile
client/ Svelte app (components in src/lib/components, call and chat logic in src/lib)
shared/ Client and Server message types used by both
```

## Design notes

- **Signaling:** the server only relays offers, answers and candidates. It checks that
  sender and receiver are in the same room, and it sets the `from` field itself
  instead of trusting the client.
- **Who calls whom:** the person who joins last sends an offer to everyone already in
    the room, so there is no confusion of who needs to send an offer.
- **Connections:** every person connects directly to every other person. That's simple and
  keeps video off the server, but it only works for small rooms (about 4 or 5 people).
- **Rooms:** they live in server memory and exist only while someone is inside. A
    join request says whether it creates a room, and an unknown room id is rejected.
- **Validation:** the server checks the shape and length of every incoming message,
  limits the message size, and ignores anything invalid, so one bad message can't
  crash it.
- **Message order:** the client handles server messages one at a time, in order, so a
  network candidate is never applied before the offer it belongs to.
- **Tests:** unit tests cover message validation, and integration tests start the real
  server and connect real WebSocket clients.

## Known limitations

- **No TURN server:** only a public STUN server is used, so people behind strict
  firewalls or some mobile networks may not be able to connect.
- **Free server:** the server sleeps after 15 minutes without traffic, and rooms are lost
  when it restarts.
- **One server instance only:** rooms are kept in that process's memory.
- **Connections don't scale:** only small rooms are possible. An SFU (a media server) would be the next step.
- **Rooms have no passwords:** Anyone with the invite link can join.