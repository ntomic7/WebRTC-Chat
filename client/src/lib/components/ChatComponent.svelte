<script lang="ts">
    import {chat, sendChat} from "../chat.svelte";
    import {sendToPeers, session} from "../session.svelte";

    let chatList = $state<HTMLUListElement>();
    $effect(() => {
        if (chat.messages.length && chatList) {
            chatList.scrollTop = chatList.scrollHeight;
        }
    });
</script>

<aside class="chat-panel">
    <ul class="chat" bind:this={chatList}>
        {#each chat.messages as message}
            <li><b>{message.name}</b>: {message.text}</li>
        {:else}
            <li class="empty">No messages yet. Say hi!</li>
        {/each}
    </ul>
    <form
            class="chat-form"
            onsubmit={(event) => { event.preventDefault(); sendChat(sendToPeers); }}
    >
        <input
                bind:value={chat.text}
                placeholder={session.remoteStreams.length === 0 ? "Waiting for others to join…" : "Message"}
                disabled={session.remoteStreams.length === 0}
        />
        <button type="submit" disabled={session.remoteStreams.length === 0}>Send</button>
    </form>
</aside>