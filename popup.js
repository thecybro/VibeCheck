const EMOTIONS = [
  { key: 'anger',      emoji: '😡', name: 'Anger',      desc: 'Hostile, furious, or outraged content' },
  { key: 'toxicity',   emoji: '☠️', name: 'Toxicity',   desc: 'Harmful, abusive, or hateful language' },
  { key: 'aggression', emoji: '⚔️', name: 'Aggression', desc: 'Threatening or combative posts' },
  { key: 'negativity', emoji: '🌧', name: 'Negativity',  desc: 'Pessimistic or doom-and-gloom content' },
  { key: 'sadness',    emoji: '😢', name: 'Sadness',     desc: 'Distressing or depressive content' },
  { key: 'fear',       emoji: '😱', name: 'Fear',        desc: 'Alarming, panic-inducing posts' },
  { key: 'spam',       emoji: '📢', name: 'Spam',        desc: 'Promotional or repetitive content' }
];

let settings = null;

async function init() {
  settings = await getSettings();
  renderEmotions();
  renderWhitelist();
  updateMasterToggle();
  updateStats();
  updateSensitivity();
  loadApiKey();
}

function getSettings() {
  return new Promise(resolve => {
    chrome.storage.sync.get('vibecheck_settings', result => {
      resolve(result.vibecheck_settings);
    });
  });
}

function saveSettings() {
  chrome.storage.sync.set({ vibecheck_settings: settings });
}

function renderEmotions() {
  const grid = document.getElementById('emotionGrid');
  grid.innerHTML = '';

  EMOTIONS.forEach(({ key, emoji, name, desc }) => {
    const isActive = settings.blockedEmotions[key];
    const row = document.createElement('div');
    row.className = 'emotion-row';
    row.innerHTML = `
      <span class="emotion-emoji">${emoji}</span>
      <div class="emotion-info">
        <div class="emotion-name">${name}</div>
        <div class="emotion-desc">${desc}</div>
      </div>
      <label class="toggle">
        <input type="checkbox" data-emotion="${key}" ${isActive ? 'checked' : ''} />
        <span class="toggle-track"></span>
      </label>
    `;

    row.querySelector('input').addEventListener('change', (e) => {
      settings.blockedEmotions[key] = e.target.checked;
      saveSettings();
    });

    grid.appendChild(row);
  });
}

function updateMasterToggle() {
  const toggle = document.getElementById('masterToggle');
  const status = document.getElementById('masterStatus');
  const desc = document.getElementById('masterDesc');
  toggle.checked = settings.enabled;
  status.textContent = settings.enabled ? 'Protection Active' : 'Protection Paused';
  desc.textContent = settings.enabled ? 'Scanning your feed in real-time' : 'Click to re-enable VibeCheck';
}

document.getElementById('masterToggle').addEventListener('change', (e) => {
  settings.enabled = e.target.checked;
  saveSettings();
  updateMasterToggle();
});

function updateSensitivity() {
  document.querySelectorAll('.sens-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.level === settings.sensitivity);
  });
}

document.querySelectorAll('.sens-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    settings.sensitivity = btn.dataset.level;
    saveSettings();
    updateSensitivity();
  });
});

function updateStats() {
  document.getElementById('statBlocked').textContent = settings.stats?.blocked || 0;
  document.getElementById('statAnalyzed').textContent = settings.stats?.analyzed || 0;
  document.getElementById('statRevealed').textContent = settings.stats?.revealed || 0;
}

document.getElementById('resetStatsBtn').addEventListener('click', () => {
  settings.stats = { blocked: 0, analyzed: 0, revealed: 0 };
  saveSettings();
  updateStats();
});

function renderWhitelist() {
  const container = document.getElementById('whitelistTags');
  const whitelist = settings.whitelist || [];

  if (!whitelist.length) {
    container.innerHTML = '<div class="empty-state">No users whitelisted yet.<br>Posts from whitelisted users always show.</div>';
    return;
  }

  container.innerHTML = '';
  whitelist.forEach((user, i) => {
    const tag = document.createElement('div');
    tag.className = 'whitelist-tag';
    tag.innerHTML = `
      <span>${user}</span>
      <span class="whitelist-tag-remove" data-index="${i}">×</span>
    `;
    tag.querySelector('.whitelist-tag-remove').addEventListener('click', () => {
      settings.whitelist.splice(i, 1);
      saveSettings();
      renderWhitelist();
    });
    container.appendChild(tag);
  });
}

document.getElementById('addWhitelistBtn').addEventListener('click', () => {
  const input = document.getElementById('whitelistInput');
  const val = input.value.trim().replace(/^@/, '');
  if (!val) return;
  if (!settings.whitelist) settings.whitelist = [];
  if (!settings.whitelist.includes(val)) {
    settings.whitelist.push(val);
    saveSettings();
    renderWhitelist();
  }
  input.value = '';
});

document.getElementById('whitelistInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('addWhitelistBtn').click();
});

function maskKey(key) {
  if (!key || key.length <= 8) return key;
  return key.slice(0, 4) + '•'.repeat(key.length - 8) + key.slice(-4);
}

function loadApiKey() {
  const input = document.getElementById('apiKeyInput');
  if (settings.apiKey) {
    input.value = maskKey(settings.apiKey);
    input.readOnly = true;
    input.dataset.saved = 'true';
    document.getElementById('saveApiBtn').textContent = 'Edit';
    document.getElementById('removeApiBtn').style.display = 'inline-block';
  }
}

document.getElementById('saveApiBtn').addEventListener('click', (e) => {
  const input = document.getElementById('apiKeyInput');
  const btn = document.getElementById('saveApiBtn');

  if (btn.textContent === 'Edit') {
    input.value = '';
    input.readOnly = false;
    input.focus();
    btn.textContent = 'Save';
    return;
  }

  const key = input.value.trim();
  console.log('Saving key:', JSON.stringify(key));
  if (!key || key.includes('•')) return;

  settings.apiKey = key;
  saveSettings();
  input.value = maskKey(key);
  input.readOnly = true;
  input.dataset.saved = 'true';
  btn.textContent = 'Edit';
  document.getElementById('removeApiBtn').style.display = 'inline-block';
  showStatus('API key saved!');
});

document.getElementById('removeApiBtn').addEventListener('click', () => {
  const input = document.getElementById('apiKeyInput');
  settings.apiKey = '';
  saveSettings();
  input.value = '';
  input.readOnly = false;
  input.dataset.saved = 'false';
  document.getElementById('saveApiBtn').textContent = 'Save';
  document.getElementById('removeApiBtn').style.display = 'none';
  showStatus('API key removed.');
});

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`panel-${tab.dataset.tab}`).classList.add('active');
  });
});

function showStatus(msg) {
  const el = document.getElementById('statusMsg');
  el.textContent = msg;
  el.style.opacity = '1';
  setTimeout(() => { el.style.opacity = '0'; }, 3000);
}

chrome.storage.onChanged.addListener((changes) => {
  if (changes.vibecheck_settings) {
    const newSettings = changes.vibecheck_settings.newValue;
    if (newSettings?.stats) {
      document.getElementById('statBlocked').textContent = newSettings.stats.blocked || 0;
      document.getElementById('statAnalyzed').textContent = newSettings.stats.analyzed || 0;
      document.getElementById('statRevealed').textContent = newSettings.stats.revealed || 0;
    }
  }
});

init();
