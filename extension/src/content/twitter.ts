// Track which posts we've already sent for classification
// Without this, MutationObserver would send the same post multiple times

import './overlay.css'

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
    if (!text || text.length < 30) return

    console.log(`[VibeCheck] Sending for classification: "${text.slice(0, 50)}"`)

    // Send to background worker
    chrome.runtime.sendMessage({
        type: "CLASSIFY_POST",
        postId,
        text
    })

    chrome.storage.local.get('vibecheck_stats', (result) => {
        const Stats = (result.vibecheck_stats ?? {blocked: 0, analyzed: 0, revealed: 0}) as {blocked: number, analyzed: number, revealed: number}

        const stats = {... Stats, analyzed: Stats.analyzed + 1}

        chrome.storage.local.set({vibecheck_stats: stats})

        console.log(`Total analyzed count: ${stats.analyzed}`)
    })
}

// Listen for results coming back from background worker
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "CLASSIFICATION_RESULT" && message.shouldBlock) {

    chrome.storage.local.get("vibecheck_stats", (result) => {
        const Stats = (result.vibecheck_stats ?? {blocked: 0, analyzed: 0, revealed: 0}) as {analyzed: number, blocked: number, revealed: number}

        const stats = {...Stats, blocked: Stats.blocked + 1}

        chrome.storage.local.set({vibecheck_stats: stats})

        console.log(`Total blocked count: ${stats.blocked}`)
    })
        console.log(`!!!![VibeCheck] Blocking post (${message.postId}): ${message.text.slice(0,50)} \n Emotion: "${message.emotion}" !!!!`)
        applyOverLay(message.postId, message.emotion, message.confidence)
    }
})

function applyOverLay(postId: string, emotion: string, confidence: string): void {
    // Finding the tweet using its defined postId attribute
    const element = document.querySelector(`[data-vc-id="${postId}"]`) as HTMLElement

    if (!element) return

    element.classList.add('vibecheck-blurred')
    element.style.position = 'relative'

    // Create overlay
    const overlay = document.createElement("div")
    overlay.className = "vibecheck-overlay"

    overlay.innerHTML = `
        <div class="vibecheck-overlay">
        <div class="vibecheck-overlay-inner">
        <div class="vibecheck-icon">🛡️</div>
        <div class="vibecheck-title">VibeCheck</div>
        <div class="vibecheck-reason">Potentially Negative Content Detected</div>
        <div class="vibecheck-emotion-tag">${emotion}</div>
        <div class="vibecheck-bar-wrap">
          <div class="vibecheck-bar" style="width:${confidence}%"></div>
        </div>
        <div class="vibecheck-score">${confidence}% ${emotion}</div>
        <button class="vibecheck-reveal-btn">Reveal Anyway</button>
      </div>
      </div>
    `;

    // For the show anyway action
    overlay.querySelector(".vibecheck-reveal-btn")?.addEventListener("click", (e) => {
        e.stopPropagation();
        overlay.classList.add('vibecheck-revealed');
        const post = overlay.parentElement;
        if (post) post.classList.remove('vibecheck-blurred');
        setTimeout(() => overlay.remove(), 400);

        chrome.storage.local.get("vibecheck_stats", (result) => {

            const Stats = (result.vibecheck_stats ?? {blocked: 0, analyzed: 0, revaled: 0}) as {analyzed: number, blocked: number, revealed: number}

            const stats = {...Stats, revealed: Stats.revealed + 1}

            chrome.storage.local.set({vibecheck_stats: stats})
            console.log(`Total revealed count: ${stats.revealed}`)
        })

    })
    
    element.appendChild(overlay)

}

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