# 🛡️ VibeCheck — Sentiment Shield Browser Extension

A customizable sentiment filter for your social media feed.

**VibeCheck** automatically analyzes post content using NLP and hides negative, toxic, or aggressive posts behind a blur overlay.

> **Notes:**  
> **1. Since it uses local analysis (if API Key not added), it might show overlay for normal content as well, will be improved on demand.**
> 2. Feature to add supported platforms isn't added yet, enjoy 4 supported platforms for now.
> 3. For now, it supports Claude only, OpenAI API Key is just a placeholder for now, it will be added on demand.

---

## Features

- **Real-time DOM scanning** — detects new posts as you scroll
- **7 emotion categories** — Anger, Toxicity, Aggression, Negativity, Sadness, Fear, Spam
- **Blur overlay with "Reveal Anyway"** button
- **Sensitivity control** — Low / Medium / High thresholds
- **Whitelist** — specific users always show through
- **Stats dashboard** — see how many posts were analyzed, blocked, and revealed
- **Claude AI integration** — optional API key for deeper analysis; works without one via local heuristics
- **Supported platforms:** Twitter/X, Reddit, LinkedIn, Facebook

---

## Installation

### Direct download:
**If not available in store:**
- **Click [VibeCheck](https://github.com/thecybro/VibeCheck/releases/download/v1.0.0/VibeCheck.crx)**

---

## Configuration

Click the **VibeCheck** icon in your toolbar to open the dashboard:

### Filters Tab
- Toggle which emotions to block (Anger, Toxicity, etc.)
- Set sensitivity: **Low** (only extreme content), **Medium** (balanced), **High** (catches more)

### Whitelist Tab
- Add usernames or display names — their posts always appear unfiltered

### Settings Tab
- **AI API Key (optional):** Paste API Key of the AI you use for AI-powered analysis. Without a key, **VibeCheck** uses fast local pattern matching.

> ***Note:*** **VibeCheck** doesn't send your API Key anywhere and it runs locally.


---

## How It Works

1. **Content Script** monitors the DOM using a `MutationObserver`
2. New posts are detected, text is extracted using platform-specific selectors
3. Text is sent to the **Background Service Worker** for analysis
4. With an API key → `Claude Haiku` (my favourite) or your favourite AI analyzes sentiment and returns emotion scores (only supports claude for now)
5. Without an API key → Local keyword heuristics provide instant analysis
6. If a blocked emotion exceeds the sensitivity threshold → blur overlay is applied
7. User can click **"Reveal Anyway"** to dismiss the overlay

---

## File Structure

```
VibeCheck/
├── manifest.json          # Extension config (Manifest V3)
├── popup.html             # Settings dashboard UI
├── popup.js               # Dashboard logic
├── icons/                 # Extension icons
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── previews/                # Extension previews
│   ├── filters.png
│   ├── overlay.png
│   ├── settings.png
│   └── whitelist.png
└── src/
    ├── background.js      # Service worker (analysis engine)
    ├── content.js         # DOM scanner & overlay injector
    ├── patterns.json      # Library of trigger words
    └── overlay.css        # Blur overlay styles
```

---

## 🔒 Privacy

- No data is ever stored or transmitted without your consent
- Text is only sent to API provider if you provide your own API key
- The extension only activates on supported social media domains
- All analysis results are cached locally for performance

---
## Extending VibeCheck (until the ui option is added)

To add a new platform, add a selector config to `PLATFORM_CONFIG` in `src/content.js` and add the domain to `host_permissions` and `content_scripts.matches` in `manifest.json`. 
