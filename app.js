/**
 * FutureForge AI — Frontend application
 * Pure vanilla JS; no dependencies beyond Bootstrap 5 + marked.js
 */

/* ── DOM refs ─────────────────────────────────────────────────────────── */
const chatMessages   = document.getElementById('chatMessages');
const userInput      = document.getElementById('userInput');
const sendBtn        = document.getElementById('sendBtn');
const resetBtn       = document.getElementById('resetBtn');
const clearChatBtn   = document.getElementById('clearChatBtn');
const exportBtn      = document.getElementById('exportBtn');
const statusBadge    = document.getElementById('statusBadge');
const typingStatus   = document.getElementById('typingStatus');
const charCount      = document.getElementById('charCount');
const progressBar    = document.getElementById('profileProgressBar');
const progressPct    = document.getElementById('progressPct');
const themeToggle    = document.getElementById('themeToggle');
const appToast       = document.getElementById('appToast');
const toastBody      = document.getElementById('toastBody');

const MAX_CHARS = 1000;

/* ── Profile progress state ────────────────────────────────────────────── */
const profileItems = {
  interests: { id: 'pi-interests', label: 'Interests',     done: false },
  skill:     { id: 'pi-skill',     label: 'Skill Level',   done: false },
  goals:     { id: 'pi-goals',     label: 'Career Goals',  done: false },
  style:     { id: 'pi-style',     label: 'Learning Style',done: false },
  time:      { id: 'pi-time',      label: 'Time Budget',   done: false },
};

/* Keywords the AI uses that indicate it has captured that profile item */
const profileSignals = {
  interests: [
    'what area', 'interests', 'excited about', 'topics', 'domains', 'web dev',
    'ai', 'machine learning', 'cybersecurity', 'mobile', 'data science', 'cloud',
  ],
  skill: [
    'skill level', 'experience', 'beginner', 'intermediate', 'advanced',
    'know python', 'some coding', 'complete beginner',
  ],
  goals: [
    'career goal', 'target role', 'want to become', 'dream', 'ml engineer',
    'frontend developer', 'cloud architect', 'freelance',
  ],
  style: [
    'learning style', 'learn best', 'videos', 'hands-on', 'books',
    'structured courses', 'projects', 'reading',
  ],
  time: [
    'hours per week', 'time budget', 'hours a week', 'schedule',
    'how many hours', 'per week', 'weekly',
  ],
};

/* Detect roadmap delivery in assistant response */
function detectProfileUpdates(text) {
  const lower = text.toLowerCase();
  let updated = false;
  for (const [key, signals] of Object.entries(profileSignals)) {
    if (!profileItems[key].done && signals.some(s => lower.includes(s))) {
      profileItems[key].done = true;
      updated = true;
    }
  }
  /* If a full roadmap is returned, mark everything done */
  if (lower.includes('personalised roadmap') || lower.includes('recommended courses')) {
    Object.values(profileItems).forEach(p => { p.done = true; });
    updated = true;
  }
  if (updated) renderProgress();
}

function renderProgress() {
  let done = 0;
  for (const [, item] of Object.entries(profileItems)) {
    const el = document.getElementById(item.id);
    if (!el) continue;
    if (item.done) {
      el.classList.add('done');
      el.querySelector('i').className = 'bi bi-check-circle-fill text-success me-2';
      el.querySelector('span').classList.remove('text-muted');
      done++;
    }
  }
  const pct = Math.round((done / 5) * 100);
  progressBar.style.width = pct + '%';
  progressBar.setAttribute('aria-valuenow', pct);
  progressPct.textContent = pct + '%';
}

/* ── Marked.js configuration ────────────────────────────────────────────── */
marked.setOptions({
  breaks: true,
  gfm: true,
});

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function now() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function showToast(msg, variant = 'info') {
  toastBody.textContent = msg;
  appToast.className = `toast ff-toast align-items-center border-${variant === 'error' ? 'danger' : 'secondary'}`;
  const toast = new bootstrap.Toast(appToast, { delay: 3500 });
  toast.show();
}

/* ── Message rendering ──────────────────────────────────────────────────── */
function appendMessage(role, content) {
  const isUser = role === 'user';
  const isError = role === 'error';

  const wrapper = document.createElement('div');
  wrapper.className = `ff-msg ${role}`;

  /* Mini avatar */
  const avatarEl = document.createElement('div');
  avatarEl.className = 'ff-msg-avatar';
  avatarEl.innerHTML = isUser
    ? '<i class="bi bi-person-fill"></i>'
    : '<i class="bi bi-robot"></i>';

  /* Bubble */
  const bubble = document.createElement('div');
  bubble.className = 'ff-bubble';

  if (isUser || isError) {
    bubble.textContent = content;
  } else {
    /* Render markdown for assistant messages */
    bubble.innerHTML = marked.parse(content);
  }

  /* Timestamp */
  const meta = document.createElement('span');
  meta.className = 'ff-msg-meta';
  meta.textContent = now();

  const inner = document.createElement('div');
  inner.style.maxWidth = '100%';
  inner.appendChild(bubble);
  inner.appendChild(meta);

  if (isUser) {
    wrapper.appendChild(inner);
    wrapper.appendChild(avatarEl);
  } else {
    wrapper.appendChild(avatarEl);
    wrapper.appendChild(inner);
  }

  chatMessages.appendChild(wrapper);
  scrollToBottom();
  return wrapper;
}

function addTypingIndicator() {
  const wrapper = document.createElement('div');
  wrapper.className = 'ff-msg assistant';
  wrapper.id = 'typingIndicator';

  const avatarEl = document.createElement('div');
  avatarEl.className = 'ff-msg-avatar';
  avatarEl.innerHTML = '<i class="bi bi-robot"></i>';

  const bubble = document.createElement('div');
  bubble.className = 'ff-bubble';
  bubble.innerHTML = '<div class="ff-typing"><span></span><span></span><span></span></div>';

  wrapper.appendChild(avatarEl);
  wrapper.appendChild(bubble);
  chatMessages.appendChild(wrapper);
  scrollToBottom();
}

function removeTypingIndicator() {
  const el = document.getElementById('typingIndicator');
  if (el) el.remove();
}

function scrollToBottom() {
  chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
}

/* ── API calls ──────────────────────────────────────────────────────────── */
async function sendMessage(text) {
  if (!text.trim()) return;

  setLoading(true);
  appendMessage('user', text);
  userInput.value = '';
  updateCharCount();
  addTypingIndicator();
  typingStatus.textContent = 'Thinking…';

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text }),
    });

    const data = await res.json();
    removeTypingIndicator();

    if (!res.ok || data.error) {
      appendMessage('error', '⚠ ' + (data.error || 'Something went wrong. Please try again.'));
    } else {
      appendMessage('assistant', data.reply);
      detectProfileUpdates(data.reply);
    }
  } catch (err) {
    removeTypingIndicator();
    appendMessage('error', '⚠ Network error — please check your connection.');
  } finally {
    setLoading(false);
    typingStatus.textContent = 'Powered by IBM Granite';
    userInput.focus();
  }
}

async function resetConversation() {
  try {
    await fetch('/api/reset', { method: 'POST' });
  } catch (_) { /* silent */ }

  chatMessages.innerHTML = '';
  Object.values(profileItems).forEach(p => { p.done = false; });
  renderProgress();
  typingStatus.textContent = 'Powered by IBM Granite';

  /* Re-trigger greeting by sending a silent first message */
  setTimeout(() => sendMessage('hello'), 300);
  showToast('Conversation reset — starting fresh!');
}

/* ── Status check ──────────────────────────────────────────────────────── */
async function checkStatus() {
  try {
    const res  = await fetch('/api/status');
    const data = await res.json();
    if (data.configured) {
      statusBadge.textContent = '● Ready';
      statusBadge.classList.add('ready');
      statusBadge.classList.remove('error');
    } else {
      statusBadge.textContent = '● Unconfigured';
      statusBadge.classList.add('error');
      statusBadge.classList.remove('ready');
    }
  } catch (_) {
    statusBadge.textContent = '● Offline';
    statusBadge.classList.add('error');
  }
}

/* ── UI helpers ─────────────────────────────────────────────────────────── */
function setLoading(loading) {
  sendBtn.disabled  = loading;
  userInput.disabled = loading;
  sendBtn.innerHTML = loading
    ? '<span class="spinner-border spinner-border-sm" role="status"></span>'
    : '<i class="bi bi-send-fill"></i>';
}

function updateCharCount() {
  const len = userInput.value.length;
  charCount.textContent = `${len} / ${MAX_CHARS}`;
  charCount.style.color = len > MAX_CHARS * 0.9
    ? 'var(--ff-warning)'
    : 'var(--ff-muted)';
}

function autoResize() {
  userInput.style.height = 'auto';
  userInput.style.height = Math.min(userInput.scrollHeight, 140) + 'px';
}

/* ── Theme toggle ──────────────────────────────────────────────────────── */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-bs-theme', theme);
  localStorage.setItem('ff-theme', theme);
  themeToggle.innerHTML = theme === 'dark'
    ? '<i class="bi bi-sun-fill"></i>'
    : '<i class="bi bi-moon-fill"></i>';
}

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-bs-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

/* ── Export ─────────────────────────────────────────────────────────────── */
exportBtn.addEventListener('click', () => {
  const messages = chatMessages.querySelectorAll('.ff-msg');
  if (!messages.length) { showToast('Nothing to export yet.', 'error'); return; }

  const lines = ['# FutureForge AI — Career Roadmap Export', ''];
  messages.forEach(msg => {
    const role   = msg.classList.contains('user') ? 'You' : 'FutureForge AI';
    const bubble = msg.querySelector('.ff-bubble');
    if (bubble) lines.push(`**${role}:** ${bubble.innerText}\n`);
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'futureforge-roadmap.md';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Roadmap exported as Markdown!');
});

/* ── Clear display only (keeps server session) ─────────────────────────── */
clearChatBtn.addEventListener('click', () => {
  chatMessages.innerHTML = '';
  showToast('Display cleared.');
});

/* ── Quick prompts ──────────────────────────────────────────────────────── */
document.querySelectorAll('.ff-quick-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const prompt = btn.getAttribute('data-prompt');
    if (prompt) {
      userInput.value = prompt;
      updateCharCount();
      autoResize();
      userInput.focus();
    }
  });
});

/* ── Input events ───────────────────────────────────────────────────────── */
userInput.addEventListener('input', () => {
  updateCharCount();
  autoResize();
  if (userInput.value.length > MAX_CHARS) {
    userInput.value = userInput.value.slice(0, MAX_CHARS);
    updateCharCount();
  }
});

userInput.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    const val = userInput.value.trim();
    if (val) sendMessage(val);
  }
  /* Enter alone (without Shift) also sends on desktop */
  if (e.key === 'Enter' && !e.shiftKey && window.innerWidth > 768) {
    e.preventDefault();
    const val = userInput.value.trim();
    if (val) sendMessage(val);
  }
});

sendBtn.addEventListener('click', () => {
  const val = userInput.value.trim();
  if (val) sendMessage(val);
});

resetBtn.addEventListener('click', () => {
  if (confirm('Start a new conversation? Current history will be cleared.')) {
    resetConversation();
  }
});

/* ── Boot ───────────────────────────────────────────────────────────────── */
(function init() {
  /* Restore saved theme */
  const savedTheme = localStorage.getItem('ff-theme') || 'dark';
  applyTheme(savedTheme);

  /* Check API status */
  checkStatus();

  /* Load existing conversation from server session or greet */
  fetch('/api/status')
    .then(r => r.json())
    .then(data => {
      if (data.configured) {
        /* Fire a greeting message automatically */
        sendMessage('hello');
      } else {
        appendMessage('error',
          '⚠ IBM credentials not configured. Copy .env.example to .env, add your ' +
          'IBM_API_KEY and WATSONX_PROJECT_ID, then restart the server.'
        );
      }
    })
    .catch(() => {
      appendMessage('error', '⚠ Could not connect to the server. Is Flask running?');
    });
})();
