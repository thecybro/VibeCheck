let patterns = null;
async function loadPatterns() {
  const response = await fetch(chrome.runtime.getURL('src/patterns.json'));
  patterns = await response.json();
}

loadPatterns();

// User PREFERENCES only — synced across devices, small, rarely written
const DEFAULT_SETTINGS = {
  enabled: true,
  apiKey: '',
  blockedEmotions: {
    anger: true,
    toxicity: true,
    sadness: false,
    fear: false,
    negativity: true,
    aggression: true,
    spam: false
  },
  whitelist: [],
  sensitivity: 'medium'
};

const DEFAULT_STATS = { blocked: 0, analyzed: 0, revealed: 0 };

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get('vibecheck_settings', (result) => {
    if (!result.vibecheck_settings) {
      chrome.storage.sync.set({ vibecheck_settings: DEFAULT_SETTINGS });
    }
  });
  chrome.storage.local.get('vibecheck_stats', (result) => {
    if (!result.vibecheck_stats) {
      chrome.storage.local.set({ vibecheck_stats: DEFAULT_STATS });
    }
  });
});

const analysisCache = new Map();
const CACHE_MAX_SIZE = 500;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ANALYZE_TEXT') {
    handleAnalysis(message.text, message.author, sendResponse);
    return true;
  }

  if (message.type === 'GET_SETTINGS') {
    // Return settings + stats merged, so popup gets everything in one call
    chrome.storage.sync.get('vibecheck_settings', (syncResult) => {
      chrome.storage.local.get('vibecheck_stats', (localResult) => {
        const settings = syncResult.vibecheck_settings || DEFAULT_SETTINGS;
        const stats = localResult.vibecheck_stats || DEFAULT_STATS;
        sendResponse({ ...settings, stats });
      });
    });
    return true;
  }

  if (message.type === 'UPDATE_STATS') {
    updateStats(message.statType);
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'RESET_STATS') {
    chrome.storage.local.set({ vibecheck_stats: DEFAULT_STATS });
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'SAVE_SETTINGS') {
    // Popup sends the pure settings object (no stats inside)
    const { stats: _dropped, ...pureSettings } = message.settings;
    chrome.storage.sync.set({ vibecheck_settings: pureSettings });
    sendResponse({ success: true });
    return true;
  }
});

async function handleAnalysis(text, author, sendResponse) {
  let settings = null; 
  try {
    settings = await getSettings();

    if (!settings.enabled) {
      sendResponse({ blocked: false, reason: 'Extension disabled' });
      return;
    }

    if (author && settings.whitelist.some(w =>
      w.toLowerCase() === author.toLowerCase()
    )) {
      sendResponse({ blocked: false, reason: 'Whitelisted user' });
      return;
    }

    const cacheKey = text.substring(0, 100);
    if (analysisCache.has(cacheKey)) {
      const cached = analysisCache.get(cacheKey);
      sendResponse(evaluateResult(cached, settings));
      return;
    }

    const apiKey = settings.apiKey;
    if (!apiKey) {
      const result = localAnalysis(text);
      cacheResult(cacheKey, result);
      sendResponse(evaluateResult(result, settings));
      return;
    }

    const result = await analyzeWithAI(text, apiKey);
    cacheResult(cacheKey, result);
    sendResponse(evaluateResult(result, settings));

  } catch (error) {
    console.error('VibeCheck analysis error:', error);
    if (settings && patterns) {
      const result = localAnalysis(text);
      sendResponse(evaluateResult(result, settings));
    } else {
      sendResponse({ blocked: false, reason: 'Analysis unavailable' });
    }
  }
}

async function analyzeWithAI(text, apiKey) {
  console.log('Using API key:', JSON.stringify(apiKey));

  const prompt = `Analyze the emotional tone and content of this social media post. Return ONLY a JSON object with no markdown, no explanation:

  Post: "${text.substring(0, 500)}"

  Return this exact JSON structure:
  {
    "emotions": {
      "anger": 0-100,
      "toxicity": 0-100,
      "sadness": 0-100,
      "fear": 0-100,
      "negativity": 0-100,
      "aggression": 0-100,
      "spam": 0-100
    },
    "overall": "positive|neutral|negative",
    "dominant": "the single most prominent emotion/quality",
    "confidence": 0-100
  }`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
  const errBody = await response.json();
  console.error('Anthropic API error:', response.status, JSON.stringify(errBody));
  throw new Error('API request failed');
}

  const data = await response.json();
  const rawText = data.content[0].text;

  try {
    return JSON.parse(rawText.replace(/```json|```/g, '').trim());
  } catch {
    return localAnalysis(text);
  }
}

// If API Key is not given
function localAnalysis(text) {
  if (!patterns) return { emotions: {}, overall: 'neutral', dominant: 'neutral', confidence: 0 };
  
  const lower = text.toLowerCase();
  const emotions = {};
  for (const [emotion, words] of Object.entries(patterns)) {
    // Score from 1 match: 1 hit = 40, 2 = 65, 3+ = 100. Real posts rarely spam keywords.
    const matches = words.filter(w => lower.includes(w)).length;
    emotions[emotion] = matches === 0 ? 0 : Math.min(100, 25 + matches * 25);
  }

  const maxScore = Math.max(...Object.values(emotions));
  const dominant = Object.entries(emotions).find(([, v]) => v === maxScore)?.[0] || 'neutral';
  // Correct direction: high score = negative, low score = neutral/positive
  const overall = maxScore >= 65 ? 'negative' : maxScore >= 40 ? 'neutral' : 'positive';

  return { emotions, overall, dominant, confidence: 70 };
}

function evaluateResult(result, settings) {
  const sensitivity = { low: 70, medium: 50, high: 30 }[settings.sensitivity] || 50;
  const blocked = settings.blockedEmotions;

  for (const [emotion, score] of Object.entries(result.emotions || {})) {
    if (blocked[emotion] && score >= sensitivity) {
      return {
        blocked: true,
        emotion: emotion,
        score: score,
        overall: result.overall,
        dominant: result.dominant
      };
    }
  }

  return { blocked: false, overall: result.overall };
}

function cacheResult(key, result) {
  if (analysisCache.size >= CACHE_MAX_SIZE) {
    const firstKey = analysisCache.keys().next().value;
    analysisCache.delete(firstKey);
  }
  analysisCache.set(key, result);
}

function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get('vibecheck_settings', (result) => {
      resolve(result.vibecheck_settings || DEFAULT_SETTINGS);
    });
  });
}

function updateStats(statType) {
  chrome.storage.local.get('vibecheck_stats', (result) => {
    const stats = result.vibecheck_stats || DEFAULT_STATS;
    if (stats[statType] !== undefined) {
      stats[statType]++;
      chrome.storage.local.set({ vibecheck_stats: stats });
    }
  });
}