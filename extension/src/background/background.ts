// Background worker, the only file that can talk to our python API, 
// and the only file that can talk to the browser's extension API.

console.log("[VibeCheck] Background worker loaded")

const DEFAULT_SETTINGS = {
  enabled: true,
  apiKey: '',
  blockedEmotions: {
    anger: true,
    fear: true,
    sadness: false,
    toxicity: false,
    // negativity: true,
    // aggression: true,
    // spam: false
  } as Record<string, boolean>,

  whitelist: [] as string[],

  stats: { blocked: 0, analyzed: 0, revealed: 0 },
  sensitivity: 'high'
};

type Settings = typeof DEFAULT_SETTINGS

let cachedSettings: Settings = DEFAULT_SETTINGS

// Load settings once at startup
chrome.storage.sync.get('vibecheck_settings', (result) => {
    cachedSettings = result.vibecheck_settings as Settings ?? DEFAULT_SETTINGS
    console.log("[VibeCheck] Settings loaded:", cachedSettings)
})

// Keep cache fresh whenever popup changes something
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes.vibecheck_settings) {
        cachedSettings = changes.vibecheck_settings.newValue as Settings
        console.log("[VibeCheck] Settings updated:", cachedSettings)
    }
})

chrome.runtime.onMessage.addListener((message, sender) => {

    if (!cachedSettings.enabled) return true

    if (message.type === "CLASSIFY_POST") {
        // We must tell chrome that:
        // We are doing asynchronous work, so keep this channel open

        fetch("http://localhost:8000/classify", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({text: message.text, sensitivity: cachedSettings.sensitivity})
        })
        .then(res => res.json())
        .then(data => {

            const userWantsToBlock = cachedSettings.blockedEmotions[data.emotion]
            const block = data.blocked && userWantsToBlock

            if (sender.tab?.id){
                chrome.tabs.sendMessage(sender.tab.id, {
                    type: "CLASSIFICATION_RESULT",
                    postId: message.postId,
                    text: message.text,
                    shouldBlock: block,
                    emotion: data.emotion,
                    threshold: data.threshold,
                    score: data.raw_score,
                    confidence: data.confidence
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