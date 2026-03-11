// Track which posts we've already sent for classification
// Without this, MutationObserver would send the same post multiple times
const processedPosts = new Set<string>()

let postCounter = 0

function getPostId(element: Element): string {
    // If we already assigned an ID to this element, reuse it
    if ((element as HTMLElement).dataset.vcId){
        return (element as HTMLElement).dataset.vcId!
    }
    // Oterwise assign a new unique ID and store it on the element
    const id = `vc-${postCounter++}`
    ;(element as HTMLElement).dataset.vcId = id

    return id
}

function extractText(element: Element): string {
    // Twitter puts tweet text inside this specific element
    const textEl = element.querySelector('[data-testid="tweetText"]')
    if (!textEl) return ""
    
    return textEl.textContent?.trim() ?? ""
}

function processPost(element: Element): void {
    const postId = getPostId(element)
    
    // Skip if we've already processed this post
    if (processedPosts.has(postId)) return
    processedPosts.add(postId)

    const text = extractText(element)
    
    // Skip if no text or too short to classify
    if (!text || text.length < 10) return

    console.log(`[VibeCheck] Sending for classification: "${text.slice(0, 50)}"`)

    // Send to background worker
    chrome.runtime.sendMessage({
        type: "CLASSIFY_POST",
        postId,
        text
    })
}

// Listen for results coming back from background worker
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "CLASSIFICATION_RESULT" && message.shouldBlock) {
        console.log(`[VibeCheck] Should block post (${message.postId}): ${message.text.slice(0,50)} \n Reason, ${message.reason}`)
        // We'll add the blur overlay here in the next step
    }
})

// Process tweets already on the page
document.querySelectorAll('[data-testid="tweet"]').forEach(processPost)

// Watch for new tweets added after page load
const observer = new MutationObserver(() => {
    document.querySelectorAll('[data-testid="tweet"]').forEach(processPost)
})

observer.observe(document.body, {
    childList: true,  // watch for added/removed elements
    subtree: true     // watch the entire document tree
})

console.log("[VibeCheck] Twitter content script loaded")