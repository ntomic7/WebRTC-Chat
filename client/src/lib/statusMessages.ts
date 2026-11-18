import type {ServerMessage} from "../../../shared/types";

export function updateStatus(message: ServerMessage): string
{
    if (message.type === "joined") {
        return (message.peers.length === 0) ? "Waiting for someone to join.."
            : "Connecting..";
    }
    return "";
}

export function refreshStatus(length: number): string
{
    return (length === 0) ? "Waiting for someone to join.." :
        `Connected to (${length} other ${length === 1 ? "person" : "people"})`;
}