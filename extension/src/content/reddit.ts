// Track which posts we've already sent for classification
// Without this, MutationObserver would send the same post multiple times

import {sendForClassification} from './shared'
import './overlay.css'

const SELECTOR = 'article'
const POST_SELECTOR = 'shreddit-post'

function extractText(element: Element): string {
    const post = element.querySelector(POST_SELECTOR)
    if (!post) return ""
    const title = post.getAttribute('post-title') ?? ""
    const body = post.textContent?.trim() ?? ""
    return `${title} ${body}`.trim()
}

function extractUsername(element: Element): string {
    return element.querySelector('shreddit-post')?.getAttribute('author') ?? ''
}

function processPost(element: Element): void {
    chrome.storage.local.get('vibecheck_stats', (result) => {
        const Stats = (result.vibecheck_stats ?? {blocked: 0, analyzed: 0, revealed: 0}) as {blocked: number, analyzed: number, revealed: number}

        const stats = {... Stats, analyzed: Stats.analyzed + 1}

        chrome.storage.local.set({vibecheck_stats: stats})

        const text = extractText(element)
        
        const username = extractUsername(element)

        sendForClassification(element, text, username)
        
        // console.log(`Total analyzed count: ${stats.analyzed}`)
    })
}

// Process tweets already on the page
document.querySelectorAll(SELECTOR).forEach(processPost)

let debounceTimer: ReturnType<typeof setTimeout>

const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
        document.querySelectorAll(SELECTOR).forEach(processPost)
    }, 100)
})

observer.observe(document.body, {
    childList: true,  // watch for added/removed elements
    subtree: true     // watch the entire document tree
})

console.log("[VibeCheck] Reddit content script loaded")