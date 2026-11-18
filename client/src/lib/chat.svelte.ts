export type ChatMessage = {userId: string, name: string, text: string};

export const chat = $state({
    messages: [] as ChatMessage[],
    text: "",
});

export function addMessage(userId: string, name: string, text: string) {
    chat.messages.push({ userId, name, text });
}

export function sendChat(sendToPeers: (txt: string) => void)
{
    const text = chat.text.trim();
    if(!text) return;

    sendToPeers(text);
    addMessage("me", "Me", text);
    chat.text = "";
}
export function resetChat(){
    chat.messages = [];
    chat.text = "";
}