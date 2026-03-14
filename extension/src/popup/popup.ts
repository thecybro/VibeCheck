const DEFAULT_SETTINGS = {
  enabled: true,
  blockedEmotions: {
    anger: true,
    fear: true,
    sadness: false,
    toxicity: false,
  } as Record<string, boolean>,

  whitelist: [] as string[],

  stats: { blocked: 0, analyzed: 0, revealed: 0 },
  sensitivity: 'high'
};

const EMOTIONS = [
  { key: 'anger',      emoji: '😡', name: 'Anger',      desc: 'Hostile, furious, or outraged content' },
  { key: 'fear',       emoji: '😱', name: 'Fear',        desc: 'Alarming, panic-inducing posts' },
  { key: 'sadness',    emoji: '😢', name: 'Sadness',     desc: 'Distressing or depressive content' },
  { key: 'toxicity',   emoji: '☠️', name: 'Toxicity',   desc: 'Harmful, abusive, or hateful language' },
  // { key: 'aggression', emoji: '⚔️', name: 'Aggression', desc: 'Threatening or combative posts' },
  // { key: 'negativity', emoji: '🌧',  name: 'Negativity', desc: 'Pessimistic or doom-and-gloom content' },
  // { key: 'spam',       emoji: '📢', name: 'Spam',        desc: 'Promotional or repetitive content' }
];


type Settings = typeof DEFAULT_SETTINGS;
let settings: Settings | null = null;

async function init() {
  settings = await getSettings();
  renderEmotions();
  renderWhitelist();
  updateMasterToggle();
  updateStats();
  updateSensitivity();
}

function getSettings(): Promise<Settings> {
  return new Promise(resolve => {
    chrome.storage.sync.get('vibecheck_settings', result => {
      const saved = result.vibecheck_settings;
      if (saved) return resolve(saved as Settings);
      chrome.storage.sync.set({ vibecheck_settings: DEFAULT_SETTINGS });
      resolve(DEFAULT_SETTINGS);
    });
  });
}

function saveSettings() {
  if (!settings) return;
  const { stats: _dropped, ...pureSettings } = settings;
  chrome.storage.sync.set({ vibecheck_settings: pureSettings });
}

function renderEmotions() {
  if (!settings) return;
  const grid = document.getElementById('emotionGrid');
  if (!grid) return;
  grid.innerHTML = '';

  EMOTIONS.forEach(({ key, emoji, name, desc }) => {
    const isActive = settings!.blockedEmotions[key];
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

    const input = row.querySelector('input');
    input?.addEventListener('change', (e) => {
      if (!settings) return;
      settings.blockedEmotions[key] = (e.target as HTMLInputElement).checked;
      saveSettings();
    });

    grid.appendChild(row);
  });
}

function updateMasterToggle() {
  if (!settings) return;
  const toggle = document.getElementById('masterToggle') as HTMLInputElement;
  const status = document.getElementById('masterStatus');
  const desc = document.getElementById('masterDesc');
  if (!toggle || !status || !desc) return;
  toggle.checked = settings.enabled;
  status.textContent = settings.enabled ? 'Protection Active' : 'Protection Paused';
  desc.textContent = settings.enabled ? 'Scanning your feed in real-time' : 'Click to re-enable VibeCheck';
}

(document.getElementById('masterToggle') as HTMLInputElement)
  ?.addEventListener('change', (e) => {
    if (!settings) return;
    settings.enabled = (e.target as HTMLInputElement).checked;
    saveSettings();
    updateMasterToggle();
  });

function updateSensitivity() {
  if (!settings) return;
  document.querySelectorAll('.sens-btn').forEach(btn => {
    btn.classList.toggle('active', (btn as HTMLElement).dataset.level === settings!.sensitivity);
  });
}

document.querySelectorAll('.sens-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (!settings) return;
    settings.sensitivity = (btn as HTMLElement).dataset.level ?? 'medium';
    saveSettings();
    updateSensitivity();
  });
});

function updateStats() {
  chrome.storage.local.get('vibecheck_stats', (result) => {
    const stats = result.vibecheck_stats as {blocked: number, analyzed: number, revealed: number}
    
    if (stats){
      const blocked = document.getElementById("statBlocked");
      const analyzed = document.getElementById("statAnalyzed");
      const revealed = document.getElementById("statRevealed");

      if (blocked) blocked.textContent = String(stats.blocked || 0);
      if (analyzed) analyzed.textContent = String(stats.analyzed || 0);
      if (revealed) revealed.textContent = String(stats.revealed || 0);

      }

  })
}

document.getElementById('resetStatsBtn')?.addEventListener('click', () => {
  if (!settings) return;
  const zero = { blocked: 0, analyzed: 0, revealed: 0 };
  chrome.storage.local.set({ vibecheck_stats: zero });
  settings.stats = zero;
  updateStats();
});

function renderWhitelist() {
  if (!settings) return;
  const container = document.getElementById('whitelistTags');
  if (!container) return;
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
    tag.querySelector('.whitelist-tag-remove')?.addEventListener('click', () => {
      if (!settings) return;
      settings.whitelist.splice(i, 1);
      saveSettings();
      renderWhitelist();
    });
    container.appendChild(tag);
  });
}

document.getElementById('addWhitelistBtn')?.addEventListener('click', () => {
  if (!settings) return;
  const input = document.getElementById('whitelistInput') as HTMLInputElement;
  if (!input) return;
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

document.getElementById('whitelistInput')?.addEventListener('keydown', (e) => {
  if ((e as KeyboardEvent).key === 'Enter') {
    (document.getElementById('addWhitelistBtn') as HTMLButtonElement)?.click();
  }
});

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    const tabName = (tab as HTMLElement).dataset.tab;
    if (tabName) document.getElementById(`panel-${tabName}`)?.classList.add('active');
  });
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.vibecheck_stats) {
    const stats = changes.vibecheck_stats.newValue as {blocked: number, analyzed: number, revealed: number};
    if (stats) {
      const blocked = document.getElementById('statBlocked');
      const analyzed = document.getElementById('statAnalyzed');
      const revealed = document.getElementById('statRevealed');
      if (blocked) blocked.textContent = String(stats.blocked || 0);
      if (analyzed) analyzed.textContent = String(stats.analyzed || 0);
      if (revealed) revealed.textContent = String(stats.revealed || 0);
    }
  }
});

init();
