# 🛡️ VibeCheck — Sentiment Shield

> A Chrome extension that automatically detects and filters negative, toxic, or emotionally harmful content from your social media feeds in real time — powered by a local NLP model, no data ever leaves your machine.

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
- **4 emotion categories** — Anger, Toxicity, Fear, Sadness — each individually toggleable
- **Blur overlay** with smooth animation and "Reveal Anyway" button
- **Sensitivity control** — Low / Medium / High confidence thresholds
- **Master toggle** — instantly pause protection without changing your settings
- **Whitelist** — specific users always show through unfiltered
- **Live stats dashboard** — posts analyzed, blocked, and revealed
- **Supported platforms** — Twitter/X, Reddit, LinkedIn

---

## Installation

### What you need before starting (skip if yo ualready have these)
- **Python 3.10 or higher** — [Download here](https://www.python.org/downloads/) *(check "Add Python to PATH" during install)*
- **Node.js 18 or higher** — [Download here](https://nodejs.org/)
- **Google Chrome** browser
- **Git** — [Download here](https://git-scm.com/)

---

### Step 1 — Clone the repository

Open a terminal (Command Prompt or PowerShell on Windows) and run:

```bash
git clone https://github.com/thecybro/VibeCheck.git
cd VibeCheck
```

---

### Step 2 — Run the setup script

**Windows:**
```
Double-click setup.bat
```
Or from terminal:
```bash
setup.bat
```

This script will automatically:
- Check your Python installation
- Create a Python virtual environment
- Install all backend dependencies (FastAPI, PyTorch, Transformers)
- Download the NLP model (~330MB, one time only, cached locally after)
- Create a `start.bat` shortcut for launching the server

> First run takes 5-10 minutes depending on your internet speed. Subsequent runs are instant.

---

### Step 3 — Build the Chrome extension

```bash
cd extension
npm install
npm run build
```

This compiles the TypeScript source into a production-ready extension in `extension/dist/`.

---

### Step 4 — Load the extension in Chrome

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer Mode** using the toggle in the top-right corner
3. Click **"Load unpacked"**
4. Navigate to and select the `extension/dist` folder
5. The VibeCheck shield icon will appear in your Chrome toolbar

---

### Step 5 — Start the server

Every time you want to use VibeCheck, start the backend server first:

**Windows:**
```
Double-click start.bat
```

You will see:
```
Server is running at http://localhost:8000
Keep this window open while using VibeCheck.
```

> **Important:** Keep this terminal window open while browsing. The extension needs the server running to classify posts. You can minimise it — just do not close it.

---

### You are all set!

Open Twitter/X, Reddit, or LinkedIn and start scrolling. VibeCheck will automatically analyse posts and blur any that match your blocked emotion categories.

---

## Usage

Click the **VibeCheck icon** in your Chrome toolbar to open the dashboard.

### Filters Tab
- Toggle which emotions to block individually
- Set your sensitivity level:
  - **Low** — only flags content with 85%+ model confidence (fewer false positives)
  - **Medium** — balanced at 75% confidence (recommended)
  - **High** — flags anything above 60% confidence (catches more, may flag edge cases)

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
│
├── backend/
│   ├── main.py                  # FastAPI server + HuggingFace pipeline
│   └── venv/                    # Python virtual environment (auto-created)
│
├── extension/
│   ├── src/
│   │   ├── background/
│   │   │   └── background.ts    # Service worker — API calls, settings cache
│   │   ├── content/
│   │   │   ├── shared.ts        # Shared logic — overlay, classification, stats
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

VibeCheck is built to be easily extended. To add support for a new platform:

1. Create `extension/src/content/platformname.ts`
2. Add these imports at the top:
```typescript
import { sendForClassification } from './shared'
import './overlay.css'
```
3. Define three things specific to the platform:
   - `SELECTOR` — CSS selector that finds a post container element
   - `extractText(element)` — function that returns the post text content
   - `extractUsername(element)` — function that returns the author username
4. Add the MutationObserver (copy from any existing platform file)
5. Register the platform in `manifest.json`:
   - Add the domain to `host_permissions`
   - Add a new entry to `content_scripts` with the correct `matches` and `js` path

---

## Troubleshooting

**Extension not working or posts not being blurred**
Make sure `start.bat` is running and the server is active. Check that the emotion you expect to be blocked is toggled ON in the Filters tab. Try refreshing the page.

**Setup script fails at model download**
Check your internet connection. The model is ~330MB. If it fails midway, run `setup.bat` again — it will resume.

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

- **Text only** — images, videos, and memes are not analysed
- **English-first** — the model performs best on English text
- **Latency** — there is a 300-800ms delay before the overlay appears due to local CPU inference
- **Context** — very short captions without supporting context may occasionally be misclassified

---

## License

MIT