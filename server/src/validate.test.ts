import { describe, it, expect } from "vitest";
import { parseClientMessage } from "./validate.js";

const json = (value: unknown) => JSON.stringify(value);

describe("parseClientMessage", () => {
    describe("valid messages", () => {
        it("accepts a join message", () => {
            const result = parseClientMessage(
                json({ type: "join", room: "abc", name: "Ana", createRoom: true })
            );
            expect(result).toEqual({ type: "join", room: "abc", name: "Ana", createRoom: true });
        });

        it("defaults createRoom to false when it is missing", () => {
            const result = parseClientMessage(json({ type: "join", room: "abc", name: "Ana" }));
            expect(result).toEqual({ type: "join", room: "abc", name: "Ana", createRoom: false });
        });

        it("accepts an empty name", () => {
            const result = parseClientMessage(json({ type: "join", room: "abc", name: "" }));
            expect(result).not.toBeNull();
        });

        it("accepts a leave message", () => {
            expect(parseClientMessage(json({ type: "leave" }))).toEqual({ type: "leave" });
        });

        it("accepts an offer and keeps its type", () => {
            const message = { type: "offer", to: "peer-1", sdp: "v=0..." };
            expect(parseClientMessage(json(message))).toEqual(message);
        });

        it("accepts an answer and keeps its type", () => {
            const message = { type: "answer", to: "peer-1", sdp: "v=0..." };
            expect(parseClientMessage(json(message))).toEqual(message);
        });

        it("accepts a candidate", () => {
            const message = { type: "candidate", to: "peer-1", candidate: "{}" };
            expect(parseClientMessage(json(message))).toEqual(message);
        });

        it("drops fields that are not part of the message", () => {
            const result = parseClientMessage(json({ type: "leave", admin: true }));
            expect(result).toEqual({ type: "leave" });
        });
    });

    describe("invalid messages", () => {
        it.each([
            ["text that is not JSON", "not json at all"],
            ["the JSON value null", "null"],
            ["a JSON number", "42"],
            ["a JSON string", json("hello")],
            ["an unknown type", json({ type: "hack" })],
            ["a missing type", json({ room: "abc" })],
            ["a join without a name", json({ type: "join", room: "abc" })],
            ["a join without a room", json({ type: "join", name: "Ana" })],
            ["a join with an empty room", json({ type: "join", room: "", name: "Ana" })],
            ["a join with a number as room", json({ type: "join", room: 5, name: "Ana" })],
            ["an offer without a target", json({ type: "offer", sdp: "v=0..." })],
            ["an offer without an sdp", json({ type: "offer", to: "peer-1" })],
            ["a candidate without a target", json({ type: "candidate", candidate: "{}" })],
            ["a candidate with an empty string", json({ type: "candidate", to: "peer-1", candidate: "" })],
        ])("rejects %s", (_description, raw) => {
            expect(parseClientMessage(raw)).toBeNull();
        });

        it("rejects a room name that is too long", () => {
            const result = parseClientMessage(
                json({ type: "join", room: "x".repeat(101), name: "Ana" })
            );
            expect(result).toBeNull();
        });

        it("rejects an sdp that is too long", () => {
            const result = parseClientMessage(
                json({ type: "offer", to: "peer-1", sdp: "x".repeat(50001) })
            );
            expect(result).toBeNull();
        });
    });
});