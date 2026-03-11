// Background worker, the only file that can talk to our python API, 
// and the only file that can talk to the browser's extension API.

console.log("[VibeCheck] Background worker loaded")

chrome.runtime.onMessage.addListener((message, sender) => {

    if (message.type === "CLASSIFY_POST") {

        // We must tell chrome that:
        // We are doing asynchronous work, so keep this channel open

        fetch("http://localhost:8000/classify", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({text: message.text})
        })
        .then(res => res.json())
        .then(data => {
            if (sender.tab?.id){
                chrome.tabs.sendMessage(sender.tab.id, {
                    type: "CLASSIFICATION_RESULT",
                    postId: message.postId,
                    text: message.text,
                    shouldBlock: data.blocked,
                    reason: data.reason
                })
            }
        })
        .catch(err => {
        // Fail silently if API is down
        console.warn("[VibeCheck] API request failed:", err)
    })
        return true

    }
})

console.log("[VibeCheck] Background worker setup complete")