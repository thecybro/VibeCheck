import {sendForClassification} from './shared'
import './overlay.css'

const SELECTOR = '.feed-shared-update-v2'
const POST_SELECTOR = '.update-components-text'

function extractText(element: Element): string {
    const textEl = element.querySelector(POST_SELECTOR)
    if (!textEl) return ""
    return textEl.textContent?.trim() ?? ""
}

function extractUsername(element: Element): string {
    return element
        .querySelector('.update-components-actor__title span[aria-hidden="true"]')
        ?.textContent?.trim() ?? ''
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

