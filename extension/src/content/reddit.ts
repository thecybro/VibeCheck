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
    const text = extractText(element)
    
    const username = extractUsername(element)

    chrome.storage.local.get('vibecheck_stats', (result) => {
        const Stats = (result.vibecheck_stats ?? {blocked: 0, analyzed: 0, revealed: 0}) as {blocked: number, analyzed: number, revealed: number}

        const stats = {... Stats, analyzed: Stats.analyzed + 1}

        chrome.storage.local.set({vibecheck_stats: stats})
    })

    sendForClassification(element, text, username)
}

document.querySelectorAll(SELECTOR).forEach(processPost)

let debounceTimer: ReturnType<typeof setTimeout>

const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
        document.querySelectorAll(SELECTOR).forEach(processPost)
    }, 100)
})

observer.observe(document.body, {
    childList: true,  
    subtree: true     
})

