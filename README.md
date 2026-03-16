# 🛡️ [VibeCheck]((https://github.com/thecybro/VibeCheck/archive/refs/heads/main.zip)): Sentiment Shield

> A Chrome extension that automatically detects and filters negative, toxic, or emotionally harmful content from your social media feeds in real time: powered by a local NLP model, no data ever leaves your machine.

---

## How It Works

VibeCheck runs a full NLP pipeline entirely on your machine:

1. A **content script** monitors your feed using `MutationObserver`, detecting new posts as you scroll
2. Post text is extracted using platform-specific DOM selectors and sent to the **background service worker**
3. The background worker forwards the text to a **local FastAPI server** running a fine-tuned transformer model
4. The model (`SamLowe/roberta-base-go_emotions`) classifies the text across 28 emotion categories
5. Detected emotions are mapped to VibeCheck's 4 categories: `anger`, `toxicity`, `fear`, `sadness`
6. If a blocked emotion exceeds the user's sensitivity threshold a **blur overlay** is applied
7. The user can click **"Reveal Anyway"** to dismiss the overlay at any time

---

## Tech Stack

| Layer | Technology |
|---|---|
| Extension | Chrome Manifest V3, TypeScript, Vite + CRXJS |
| ML Backend | Python, FastAPI, Uvicorn |
| NLP Model | `SamLowe/roberta-base-go_emotions` (HuggingFace Transformers) |
| Storage | `chrome.storage.sync` (settings), `chrome.storage.local` (stats) |

---

## Features

- **Real-time post detection** via `MutationObserver` with debouncing
- **4 emotion categories:** Anger, Toxicity, Fear, Sadness: each individually toggleable
- **Blur overlay** with smooth animation and "Reveal Anyway" button
- **Sensitivity control:** Low / Medium / High confidence thresholds
- **Master toggle:** instantly pause protection without changing your settings
- **Whitelist:** specific users always show through unfiltered
- **Live stats dashboard:** posts analyzed, blocked, and revealed
- **Supported platforms:** Twitter/X, Reddit, LinkedIn

---
## Installation

> Note: If you want to run the model locally, you should download the model and follow all steps given below, if not, just follow step ( 1 & 3 ) and you are good to go!


### What you need before starting (skip if you already have these)
- **Python 3.10 or higher**: [Download here](https://www.python.org/downloads/)
  > ⚠️ During installation, check **"Add Python to PATH"**: this is important
- **Google Chrome** browser

---

### Step 1: Download VibeCheck

1. Click **"[Download ZIP](https://github.com/thecybro/VibeCheck/archive/refs/heads/main.zip)"**
2. Extract the ZIP file anywhere on your computer (e.g. Desktop)

---

### Step 2: Run the setup script

Open the extracted `VibeCheck` folder and **double-click `setup.bat`** (setup.bat is not needed if you don't want to run model locally)

A window will open and automatically:
- Check your Python installation
- Create a Python virtual environment
- Install all dependencies (FastAPI, PyTorch, Transformers)
- Download the NLP model (~330MB, one time only, cached after)

> ⏱️ First run takes 5–10 minutes depending on your internet speed. Just let it run: don't close the window.

When you see **"Setup Complete!"** you're ready to continue.

---

### Step 3: Load the extension in Chrome

1. Open Chrome and go to `chrome://extensions` in the address bar
2. Enable **Developer Mode** using the toggle in the top-right corner
3. Click **"Load unpacked"**
4. Navigate into the extracted `VibeCheck` folder → open `extension` → select the `dist` folder
5. The VibeCheck 🛡️ icon will appear in your Chrome toolbar

This only needs to be done once.

---

### Step 4: Start VibeCheck

If you chose **Yes** to auto-startup during setup, the server will start automatically every time Windows boots. You're done!

If you chose **No**, double-click `start.bat` in the VibeCheck folder each time you want to use VibeCheck.

> ⚠️ The server window must stay open while browsing. You can minimise it but do not close it.

---

### You're all set!

Open Twitter/X, Reddit, or LinkedIn and start scrolling. VibeCheck will automatically analyse posts and blur any that match your blocked emotion categories.

---

## Screenshots

<div align="center">
  <img src="https://github.com/thecybro/VibeCheck/blob/main/previews/popup.png" width="320" alt="VibeCheck Popup" />
  <img src="https://github.com/thecybro/VibeCheck/blob/main/previews/whitelist.png" width="320" alt="Whitelist" />
  <img src="https://github.com/thecybro/VibeCheck/blob/main/previews/overlay.png" width="320" alt="Blur Overlay" />
</div>

---

## Usage

Click the **VibeCheck icon** in your Chrome toolbar to open the dashboard.

### Filters Tab
- Toggle which emotions to block individually
- Set your sensitivity level:
  - **Low**: only flags content with 75%+ model confidence (fewer false positives)
  - **Medium**: balanced at 65% confidence (recommended)
  - **High**: flags anything above 45% confidence (catches more, may flag edge cases)

### Whitelist Tab
- Add usernames whose posts should always appear unfiltered
- Supports Twitter handles, Reddit usernames, and LinkedIn display names
- Type the username without @ and press Add or Enter

---

## Emotion Categories

VibeCheck uses the `SamLowe/roberta-base-go_emotions` model trained on the Google GoEmotions dataset (58,000 Reddit comments, 28 emotion labels). The model output is mapped to 4 actionable VibeCheck categories:

| VibeCheck Category | Mapped From | Blocked by Default |
|---|---|---|
| anger | anger | Yes |
| toxicity | disgust | Yes |
| fear | fear | No (user choice) |
| sadness | sadness | No (user choice) |
| safe | joy, admiration, amusement, approval, caring, curiosity, excitement, gratitude, love, optimism, pride, relief, surprise, neutral, and others | Never blocked |

---

## Project Structure

```
VibeCheck/
├── setup.bat                    # One-time setup script (Windows)
├── start.bat                    # Start the backend server
├── uninstall-startup.bat        # Remove VibeCheck from Windows auto-startup     
│
├── backend/
│   ├── main.py                  # FastAPI server + HuggingFace pipeline
│   └── venv/                    # Python virtual environment (auto-created)
│
├── extension/
│   ├── src/
│   │   ├── background/
│   │   │   └── background.ts    # Service worker: API calls, settings cache
│   │   ├── content/
│   │   │   ├── shared.ts        # Shared logic: overlay, classification, stats
│   │   │   ├── twitter.ts       # Twitter/X DOM selectors
│   │   │   ├── reddit.ts        # Reddit DOM selectors
│   │   │   ├── linkedin.ts      # LinkedIn DOM selectors
│   │   │   └── overlay.css      # Blur overlay styles
│   │   └── popup/
│   │       ├── popup.html       # Settings dashboard UI
│   │       ├── popup.ts         # Dashboard logic (TypeScript)
│   │       └── popup.css        # Dashboard styles
│   ├── manifest.json            # Chrome extension manifest (MV3)
│   ├── vite.config.ts           # Vite + CRXJS build config
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## Adding a New Platform

**VibeCheck** is built to be easily extended. To add support for a new platform:

1. Create `extension/src/content/platformname.ts`
2. Add these imports at the top:
```typescript
import { sendForClassification } from './shared'
import './overlay.css'
```
3. Define three things specific to the platform:
   - `SELECTOR`: CSS selector that finds a post container element
   - `extractText(element)`: function that returns the post text content
   - `extractUsername(element)`: function that returns the author username
4. Add the MutationObserver (copy from any existing platform file)
5. Register the platform in `manifest.json`:
   - Add the domain to `host_permissions`
   - Add a new entry to `content_scripts` with the correct `matches` and `js` path

---

## Troubleshooting

**Extension not working or posts not being blurred**
Make sure `start.bat` is running and the server is active. Check that the emotion you expect to be blocked is toggled ON in the Filters tab. Try refreshing the page.

**Setup script fails at model download**
Check your internet connection. The model is ~330MB. If it fails midway, run `setup.bat` again: it will resume.

**"Load unpacked" button is missing in Chrome**
Make sure Developer Mode is enabled (toggle in the top-right of `chrome://extensions`).

---

## Privacy

- All text classification runs entirely on your local machine
- No post content is ever sent to any external server
- The NLP model runs locally via your Python backend
- Settings and stats are stored locally in Chrome storage
- The extension only activates on its declared social media domains

---

## Known Limitations

- **Text only:** images, videos, and memes are not analysed
- **English-first:** the model performs best on English text
- **Latency:** there is a 300-800ms delay before the overlay appears due to local CPU inference
- **Context:** very short captions without supporting context may occasionally be misclassified

---

## License

MIT