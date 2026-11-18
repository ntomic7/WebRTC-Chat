import type {ClientMessage, ServerMessage} from "../../../shared/types";

export type Socket = {
    send: (message: ClientMessage) => void;
    close: () => void;
};

export function createSocket(url: string, onMessage: (message: ServerMessage) =>
    Promise<void> | void, onClose: () => void): Socket
{
    const ws = new WebSocket(url);
    let closedByUs = false;

    let queue = Promise.resolve();
    ws.onmessage = (event) => {
        const message: ServerMessage = JSON.parse(event.data);
        queue = queue.then(() => onMessage(message)).catch(console.error);
    };
    ws.onclose = () => {
        if(!closedByUs) onClose();
    }

    return {
        send: (message) => {
            if (ws.readyState === WebSocket.OPEN)
                ws.send(JSON.stringify(message));
        },
        close: () => {closedByUs = true; ws.close();},
    };
}