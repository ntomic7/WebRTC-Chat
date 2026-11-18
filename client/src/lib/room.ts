export function getRoomFromUrl(url: string): string{
    const params = new URLSearchParams(url);
    const roomUrl = params.get("room");

    return new URLSearchParams(url).get("room") ?? "";
}

export function setRoomUrl(url: string, room: string) {
    const newUrl = new URL(url);
    newUrl.searchParams.set("room", room);
    history.replaceState(null, "", newUrl);
}

export async function copyRoomLink() {
    await navigator.clipboard.writeText(window.location.href);
}

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
export function generateRoomId(length = 8): string {
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    let id = "";
    for (const b of bytes) {
        id += ALPHABET[b % ALPHABET.length];
    }
    return id;
}