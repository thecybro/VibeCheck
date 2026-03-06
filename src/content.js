(function () {
  'use strict';

  if (window.__vibeCheckLoaded) return;
  window.__vibeCheckLoaded = true;

  const PLATFORM_CONFIG = {
    'twitter.com': {
      postSelector: '[data-testid="tweet"]',
      textSelector: '[data-testid="tweetText"]',
      authorSelector: '[data-testid="User-Name"] span',
      feedSelector: '[data-testid="primaryColumn"]'
    },
    'x.com': {
      postSelector: '[data-testid="tweet"]',
      textSelector: '[data-testid="tweetText"]',
      authorSelector: '[data-testid="User-Name"] span',
      feedSelector: '[data-testid="primaryColumn"]'
    },
    'reddit.com': {
      postSelector: 'shreddit-post, [data-testid="post-container"], .Post',
      textSelector: '[data-click-id="text"], .RichTextJSON-root, h3',
      authorSelector: '[data-testid="post_author_link"], a[href*="/user/"]',
      feedSelector: '.ListingLayout-outerContainer, #SHORTCUT_FOCUSABLE_DIV'
    },
    'linkedin.com': {
      postSelector: '.feed-shared-update-v2, .occludable-update',
      textSelector: '.feed-shared-text, .update-components-text',
      authorSelector: '.feed-shared-actor__name, .update-components-actor__name',
      feedSelector: '.scaffold-finite-scroll__content'
    },
    'facebook.com': {
      postSelector: '[data-pagelet*="FeedUnit"], [role="article"]',
      textSelector: '[data-ad-preview="message"], [dir="auto"]',
      authorSelector: 'a[role="link"] strong',
      feedSelector: '[role="main"]'
    }
  };

  const hostname = window.location.hostname.replace('www.', '');
  const platform = Object.keys(PLATFORM_CONFIG).find(k => hostname.includes(k));
  if (!platform) return;

  const config = PLATFORM_CONFIG[platform];
  let settings = null;
  const processedPosts = new WeakSet();
  const pendingAnalysis = new Map();

  async function loadSettings() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
        settings = response;
        resolve(response);
      });
    });
  }

  function extractText(postEl) {
    const textEls = postEl.querySelectorAll(config.textSelector);
    if (!textEls.length) {
      return postEl.innerText?.substring(0, 600) || '';
    }
    return Array.from(textEls).map(el => el.innerText).join(' ').substring(0, 600);
  }

  function extractAuthor(postEl) {
    const authorEl = postEl.querySelector(config.authorSelector);
    return authorEl?.innerText?.split('\n')[0] || '';
  }

  function createOverlay(emotion, score) {
    const overlay = document.createElement('div');
    overlay.className = 'vibecheck-overlay';

    const emotionLabel = emotion.charAt(0).toUpperCase() + emotion.slice(1);
    const barWidth = Math.round(score);

    overlay.innerHTML = `
      <div class="vibecheck-overlay-inner">
        <div class="vibecheck-icon">🛡️</div>
        <div class="vibecheck-title">VibeCheck</div>
        <div class="vibecheck-reason">Potentially Negative Content Detected</div>
        <div class="vibecheck-emotion-tag">${emotionLabel}</div>
        <div class="vibecheck-bar-wrap">
          <div class="vibecheck-bar" style="width:${barWidth}%"></div>
        </div>
        <div class="vibecheck-score">${barWidth}% ${emotionLabel}</div>
        <button class="vibecheck-reveal-btn">Reveal Anyway</button>
      </div>
    `;

    overlay.querySelector('.vibecheck-reveal-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      overlay.classList.add('vibecheck-revealed');
      setTimeout(() => overlay.remove(), 400);
      chrome.runtime.sendMessage({ type: 'UPDATE_STATS', statType: 'revealed' });
    });

    return overlay;
  }

  function applyOverlay(postEl, result) {
    if (postEl.querySelector('.vibecheck-overlay')) return;

    const pos = window.getComputedStyle(postEl).position;
    if (pos === 'static') postEl.style.position = 'relative';

    const overlay = createOverlay(result.emotion, result.score);
    postEl.appendChild(overlay);

    postEl.classList.add('vibecheck-blurred');

    chrome.runtime.sendMessage({ type: 'UPDATE_STATS', statType: 'blocked' });
  }

  async function analyzePost(postEl) {
    if (!settings?.enabled) return;
    if (processedPosts.has(postEl)) return;
    processedPosts.add(postEl);

    const text = extractText(postEl);
    if (!text || text.trim().length < 10) return;

    const author = extractAuthor(postEl);

    // To not analyze the same text again
    const key = text.substring(0, 80);
    if (pendingAnalysis.has(key)) return;
    pendingAnalysis.set(key, true);

    chrome.runtime.sendMessage({ type: 'UPDATE_STATS', statType: 'analyzed' });

    chrome.runtime.sendMessage(
      { type: 'ANALYZE_TEXT', text, author },
      (response) => {
        pendingAnalysis.delete(key);
        if (chrome.runtime.lastError) return;
        if (response?.blocked) {
          applyOverlay(postEl, response);
        }
      }
    );
  }

  function scanPosts() {
    if (!settings?.enabled) return;
    const posts = document.querySelectorAll(config.postSelector);
    posts.forEach(post => analyzePost(post));
  }

  const observer = new MutationObserver((mutations) => {
    if (!settings?.enabled) return;
    let shouldScan = false;
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        shouldScan = true;
        break;
      }
    }
    if (shouldScan) {
      requestAnimationFrame(scanPosts);
    }
  });

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.vibecheck_settings) {
      settings = changes.vibecheck_settings.newValue;

      if (!settings.enabled) {
        document.querySelectorAll('.vibecheck-overlay').forEach(el => el.remove());
        document.querySelectorAll('.vibecheck-blurred').forEach(el => {
          el.classList.remove('vibecheck-blurred');
        });
      } else {
        processedPosts.forEach = undefined; 
        scanPosts();
      }
    }
  });

  loadSettings().then(() => {
    scanPosts();

    const feedEl = document.querySelector(config.feedSelector) || document.body;
    observer.observe(feedEl, {
      childList: true,
      subtree: true
    });
  });

})();
