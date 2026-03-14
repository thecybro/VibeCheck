
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

            const Stats = (result.vibecheck_stats ?? {blocked: 0, analyzed: 0, revealed: 0}) as {analyzed: number, blocked: number, revealed: number}

            const stats = {...Stats, revealed: Stats.revealed + 1}

            chrome.storage.local.set({vibecheck_stats: stats})
        })

    })
    
    element.appendChild(overlay)

}

// Listen for results coming back from background worker
    chrome.runtime.onMessage.addListener((message) => {

        if (message.type === "CLASSIFICATION_RESULT" && message.shouldBlock) {

            const threshold = message.threshold;
            const confidence = message.confidence;

            console.log(`!!!![VibeCheck] Blocking post (${message.postId}): ${message.text.slice(0,30)} \n Emotion: "${message.emotion}"\nThreshold: ${threshold}\nConfidence: ${confidence}% !!!!`)
            applyOverLay(message.postId, message.emotion, message.confidence)

             chrome.storage.local.get("vibecheck_stats", (result) => {
                const Stats = (result.vibecheck_stats ?? {blocked: 0, analyzed: 0, revealed: 0}) as {analyzed: number, blocked: number, revealed: number}

                const stats = {...Stats, blocked: Stats.blocked + 1}

                chrome.storage.local.set({vibecheck_stats: stats})
            })

        }
    })


export function sendForClassification(element: Element, text: string, username: string): void {

    const postId = getPostId(element)
    
    // Skip if we've already processed this post
    if (processedPosts.has(postId)) return
    processedPosts.add(postId)

    chrome.storage.sync.get('vibecheck_settings', (result) => {
        const settings = result.vibecheck_settings as {enabled: boolean, whitelist: string[]} | undefined
        if (!settings?.enabled) return
        
        // console.log(`[VibeCheck] Username: "${username}", Whitelist: ${JSON.stringify(settings.whitelist)}`)

     if (username && settings.whitelist?.includes(username)) {
        console.log(`[VibeCheck] Skipping whitelisted user: ${username}`)
        return
    }

    // Send to background worker
    chrome.runtime.sendMessage({
        type: "CLASSIFY_POST",
        postId,
        text
    })
})
}

