import {describe, it, expect, beforeEach, afterEach} from "vitest";
import {WebSocket} from "ws";
import {startServer, type RunningServer} from "./createServer.js";
import type {ClientMessage, ServerMessage} from "../../shared/types.js";

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
type MessageOfType<T extends ServerMessage["type"]> = Extract<ServerMessage, {type: T}>;

type TestClient = {
    id: string;
    send: (message: ClientMessage) => void;
    sendRaw: (text:string) => void;
    next: <T extends ServerMessage["type"]>(type: T) => Promise<MessageOfType<T>>;
    has: (type: ServerMessage["type"]) => boolean;
    close: () => void;
};

async function connect(port: number): Promise<TestClient>
{
    const ws = new WebSocket(`ws://localhost:${port}`);
    const unrequestedMessages: ServerMessage[] = [];
    const messageRequests: {type: string; resolve: (message: ServerMessage) => void}[] = [];

    ws.on("message", (data) => {
        const message: ServerMessage = JSON.parse(data.toString());
        const index = messageRequests.findIndex(
            (i) => i.type === message.type);
        if(index >= 0) {
            const [request] = messageRequests.splice(index, 1);
            request?.resolve(message);
        }else {
            unrequestedMessages.push(message);
        }
    });

    function next<T extends ServerMessage["type"]>(type: T): Promise<MessageOfType<T>>
    {
        const index = unrequestedMessages.findIndex((m) => m.type === type);
        if(index >= 0) {
            const [message] = unrequestedMessages.splice(index, 1);
            return Promise.resolve(message as MessageOfType<T>);
        }
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() =>
                reject(new Error(`timed out waiting for "${type}"`)), 2000);

            messageRequests.push({type, resolve: (message) => {
                clearTimeout(timer);
                resolve(message as MessageOfType<T>);
                }});
        });
    }

    await new Promise<void>((resolve) =>
        ws.once("open", () => resolve()));
    const welcome = await next("welcome");

    return {
        id: welcome.id,
        send: (message)=> ws.send(JSON.stringify(message)),
        sendRaw: (text) => ws.send(text),
        next,
        has: (type) => unrequestedMessages.some((m) => m.type === type),
        close: () => ws.close(),
    };
}

let server!: RunningServer;
let clients: TestClient[] = [];

async function connectClient(): Promise<TestClient>
{
    const client = await connect(server.port);
    clients.push(client);
    return client;
}
async function twoClientsInRoom(room: string): Promise<[TestClient, TestClient]>
{
    const client1 = await connectClient();
    const client2 = await connectClient();
    client1.send({type:"join", room, name: "One", createRoom: true});
    await client1.next("joined");
    client2.send({type:"join", room, name: "Two", createRoom: false});
    await client2.next("joined");
    await client1.next("peer-joined");
    return [client1, client2];
}

beforeEach(async () => {
    server = await startServer(0);
    clients = [];
});
afterEach(async () => {
    for(const client of clients) client.close();
    await server.close();
});

describe("signaling server", () => {
    it("lets a client create a room", async () => {
        const client1 = await connectClient();
        client1.send({type: "join", room: "room1", name: "One", createRoom: true});

        const joined = await client1.next("joined");
        expect(joined.room).toBe("room1");
        expect(joined.peers).toEqual([]);
    });

    it("tells both sides when a second client joins", async () => {
        const client1 = await connectClient();
        const client2 = await connectClient();
        client1.send({type: "join", room: "room1", name: "One", createRoom: true});
        await client1.next("joined");

        client2.send({type: "join", room: "room1", name: "Two"});
        const joined = await client2.next("joined");
        expect(joined.peers).toEqual([{id: client1.id, name: "One"}]);

        const peerJoined = await client1.next("peer-joined");
        expect(peerJoined).toEqual({type: "peer-joined", id: client2.id, name: "Two"});
    });

    it("relays an offer with the sender's id", async () => {
        const [client1, client2] = await twoClientsInRoom("room1");

        client1.send({type: "offer", to: client2.id, sdp: "fake-sdp"});

        const offer = await client2.next("offer");
        expect(offer).toEqual({type: "offer", from: client1.id, sdp: "fake-sdp"});
    });

    it("rejects joining a room that does not exist", async () => {
        const client1 = await connectClient();
        client1.send({type: "join", room: "nope", name: "One"});

        const reply = await client1.next("room-not-found");
        expect(reply.room).toBe("nope");
    });

    it("tells the others when someone leaves", async () => {
        const [client1, client2] = await twoClientsInRoom("room1");

        client2.send({type: "leave"});

        const left = await client1.next("peer-left");
        expect(left.id).toBe(client2.id);
    });

    it("ignores invalid messages and keeps working", async () => {
        const client1 = await connectClient();
        client1.sendRaw("not json at all");
        client1.sendRaw(JSON.stringify({type: "join", room: "room1"}));
        client1.sendRaw(JSON.stringify({type: "hack"}));

        client1.send({type: "join", room: "room1", name: "One", createRoom: true});

        const joined = await client1.next("joined");
        expect(joined.room).toBe("room1");
    });

    it("does not relay messages between different rooms", async () => {
        const ana = await connectClient();
        const ben = await connectClient();
        ana.send({type: "join", room: "room1", name: "Ana", createRoom: true});
        await ana.next("joined");
        ben.send({type: "join", room: "room2", name: "Ben", createRoom: true});
        await ben.next("joined");

        ana.send({type: "offer", to: ben.id, sdp: "fake-sdp"});
        await wait(100);

        expect(ben.has("offer")).toBe(false);
    });

    it("removes a room when its last person leaves", async () => {
        const ana = await connectClient();
        ana.send({type: "join", room: "room1", name: "Ana", createRoom: true});
        await ana.next("joined");

        ana.send({type: "leave"});
        await wait(100);

        const ben = await connectClient();
        ben.send({type: "join", room: "room1", name: "Ben"});
        const reply = await ben.next("room-not-found");
        expect(reply.room).toBe("room1");
    });
});