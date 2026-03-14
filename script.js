
'use strict';

/* ── API constants ───────────────────────────────────────────
   Using the unified gen.pollinations.ai endpoint per API docs
──────────────────────────────────────────────────────────── */
const GEN_BASE   = 'https://gen.pollinations.ai';
const TEXT_URL   = `${GEN_BASE}/v1/chat/completions`;   // OpenAI-compat POST
const IMAGE_BASE = `${GEN_BASE}/image`;                 // GET /{prompt}
const KEY_URL    = `${GEN_BASE}/account/key`;           // Validate key

const TEXT_MODEL  = 'gemini-fast';  // Gemini 2.5 Flash Lite — free tier, fast
const IMAGE_MODEL = 'flux';
const IMAGE_W = 1152;
const IMAGE_H = 896;

/* ── Random example pool ─────────────────────────────────── */
const RANDOM_EXAMPLES = [
  '🐱☕🌧️🏠🕯️',      '🚀🌕👽🪐🌌',      '🏍️🍜🌆🌃⚡',
  '🧙‍♂️🔮🌲✨🦉',     '🐉🏔️⚡🌊💥',      '🦄🌈🌸🎡✨',
  '🦁🏜️🌅🌾🦅',      '🐺🌲🌕❄️🌌',      '🐳🌊🌅🪸☀️',
  '🦋🌺🍄🌿💫',       '🦊🍂🏕️🌙⭐',      '🐘🌋🌅🦒🌾',
  '🦈🌊🌑🪸💧',       '🦖🌋🌿⛈️💥',      '🧜‍♀️🌊💎🐠🌅',
  '🧚🌺🍄✨🦋',       '🧛🏰🌑🌫️⭐',      '🧝🌲🏹🌙⭐',
  '👸🏰💎👑✨',        '🤖🌆⚡🔮🌃',       '🛸🌌🪐👽☄️',
  '🧑‍🚀🌍🚀⭐💫',     '☄️🌋💥🌑🌪️',      '🔭🌠🪐🌌💜',
  '🎸🔥🌃🎷🌧️',      '🍕🍺🎆🎉🌃',       '🕵️🌧️🌃🚗🌫️',
  '🚂💨🌾🌅☁️',       '⛵🌊🌅🦅☀️',       '🐱☕📖🕯️🌧️',
  '🧁🌸☕📸🌤️',       '🐶🏕️🌲⭐🔥',       '🍵⛩️🌸🗻🌸',
  '🦁🍜🌃🔮💥',       '🐉☕🌆🧙‍♂️⚡',     '🤖🌲🦋🔮🌌',
  '🐳🚀🌕🎸💫',       '🏍️🌋🌅🦅🔥',      '🧜‍♀️🌌🪐💎🌊',
];

/* ── Gemini system prompt for emoji interpretation ───────── */
const SYSTEM_PROMPT = `You are an expert AI image prompt engineer specializing in creating vivid, cinematic image generation prompts from emoji sequences.

When given a sequence of emojis, you must:
1. Interpret EVERY emoji — do not skip any
2. Read the sequence as a visual narrative: subject(s) → action/interaction → environment → atmosphere → mood
3. Compose a single, rich, flowing paragraph that describes a specific, painterly scene
4. Include concrete visual details: lighting quality, time of day, colors, textures, scale, perspective
5. End with appropriate style and quality tags that match the mood of the scene
6. NEVER use generic filler phrases like "vibrant detailed illustration" as the only descriptor — be specific to the emojis

Rules:
- Output ONLY the image prompt — no preamble, no explanations, no quotes
- Minimum 60 words, maximum 120 words
- Always include specific lighting (e.g. "golden hour backlight", "cold moonlight", "neon reflections on wet pavement")
- Always include an art style that fits the scene (e.g. "hyperrealistic digital painting", "Studio Ghibli anime style", "dark fantasy oil painting", "cyberpunk concept art")
- Make the scene feel alive and specific — not generic`;

/* ── DOM refs ────────────────────────────────────────────── */
const keyModal    = document.getElementById('key-modal');
const keyInput    = document.getElementById('key-input');
const keyToggle   = document.getElementById('key-toggle');
const keyStatus   = document.getElementById('key-status');
const modalCancel = document.getElementById('modal-cancel');
const modalSave   = document.getElementById('modal-save');
const keyBar      = document.getElementById('key-bar');
const btnChangeKey= document.getElementById('btn-change-key');

const emojiInput  = document.getElementById('emoji-input');
const btnGenerate = document.getElementById('btn-generate');
const btnRandom   = document.getElementById('btn-random');
const btnRemix    = document.getElementById('btn-remix');
const btnAgain    = document.getElementById('btn-again');
const btnCopy     = document.getElementById('btn-copy');
const chips       = document.querySelectorAll('.chip');

const errorBanner  = document.getElementById('error-banner');
const resultCard   = document.getElementById('result-card');
const loadingState = document.getElementById('loading-state');
const imageWrapper = document.getElementById('image-wrapper');
const resultImg    = document.getElementById('result-img');
const resultMeta   = document.getElementById('result-meta');
const promptPreview= document.getElementById('prompt-preview');

const dot1 = document.getElementById('dot-1');
const dot2 = document.getElementById('dot-2');
const lbl1 = document.getElementById('lbl-1');
const lbl2 = document.getElementById('lbl-2');
const brewText = document.getElementById('brew-text');
const brewSub  = document.getElementById('brew-sub');
// Optional authorize UI: build auth link to enter.pollinations.ai
const authorizeBtn = document.getElementById('authorizeBtn');

/* ── State ───────────────────────────────────────────────── */
let isGenerating = false;
let currentPrompt = '';

/* ══════════════════════════════════════════════════════════
   BYOP KEY MANAGEMENT
   ══════════════════════════════════════════════════════════ */

function getSavedKey() {
  return localStorage.getItem('pollinationsKey') || null;
}

function saveKey(key) {
  localStorage.setItem('pollinationsKey', key.trim());
}

function clearKey() {
  localStorage.removeItem('pollinationsKey');
}

/* Validate a key against the /account/key endpoint.
   Returns { valid: bool, info: string } */
async function validateKey(key) {
  try {
    const res = await fetch(KEY_URL, {
      headers: { 'Authorization': `Bearer ${key}` },
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const label = data.label || data.name || key.slice(0, 10) + '…';
      return { valid: true, info: `✅ Connected as: ${label}` };
    }
    if (res.status === 401 || res.status === 403) {
      return { valid: false, info: '❌ Invalid key — please check and try again.' };
    }
    // Other errors (e.g. 429) — still let it through
    return { valid: true, info: '⚠️ Could not verify key but will try anyway.' };
  } catch {
    // Network error — still let it through, it may work
    return { valid: true, info: '⚠️ Could not reach validation endpoint. Proceeding anyway.' };
  }
}

/* Handle redirect fragment from https://enter.pollinations.ai
   Example: https://myapp.com#api_key=sk_abc123xyz
   We capture the key from the fragment, save it locally, and clear the fragment. */
function handleRedirectFragment() {
  const frag = window.location.hash || '';
  if (!frag) return null;
  const params = new URLSearchParams(frag.slice(1));
  const apiKey = params.get('api_key') || params.get('key') || params.get('sk');
  if (apiKey) {
    saveKey(apiKey);
    // Clear fragment to avoid leaking the secret in history
    try { history.replaceState(null, '', location.pathname + location.search); } catch {}
    setKeyStatus('✅ Received key from enter.pollinations.ai — connected.', 'ok');
    hideKeyModal(); showKeyBar();
    return apiKey;
  }
  return null;
}

/* Build and start the authorize flow at enter.pollinations.ai
   Optionally include a publishable app key (pk_) so the consent screen shows app info. */
function startAuthorizeFlow() {
  const base = 'https://enter.pollinations.ai/authorize';
  const params = new URLSearchParams({ redirect_url: location.href });
  // We no longer include an app_key input in the modal — simple redirect.
  const url = `${base}?${params.toString()}`;
  window.location.href = url;
}

/* Show the modal (optionally force-shown even if key exists) */
function showKeyModal(force = false) {
  const existing = getSavedKey();
  if (existing && !force) {
    // Key already saved — show the status bar instead
    showKeyBar();
    return;
  }
  keyModal.classList.remove('hidden');
  keyInput.value = '';
  setKeyStatus('', '');
  modalSave.disabled = true;
  keyInput.focus();
}

function hideKeyModal() {
  keyModal.classList.add('hidden');
}

function showKeyBar() {
  keyBar.classList.remove('hidden');
}

function setKeyStatus(msg, type) {
  if (!msg) { keyStatus.classList.add('hidden'); return; }
  keyStatus.textContent = msg;
  keyStatus.className = `key-status ${type}`;
  keyStatus.classList.remove('hidden');
}

/* ── Modal event handlers ────────────────────────────────── */

// Enable save button once something is typed
keyInput.addEventListener('input', () => {
  modalSave.disabled = keyInput.value.trim().length < 8;
  setKeyStatus('', '');
});

// Toggle password visibility
keyToggle.addEventListener('click', () => {
  const isPassword = keyInput.type === 'password';
  keyInput.type = isPassword ? 'text' : 'password';
  keyToggle.textContent = isPassword ? '🙈' : '👁';
});

// Cancel — only hides if a key is already saved
modalCancel.addEventListener('click', () => {
  if (getSavedKey()) {
    hideKeyModal();
  } else {
    setKeyStatus('⚠️ You need a key to generate images. Get one free at enter.pollinations.ai', 'warn');
  }
});

// Save: validate then store
modalSave.addEventListener('click', async () => {
  const rawKey = keyInput.value.trim();
  if (!rawKey) return;

  modalSave.disabled = true;
  setKeyStatus('Validating key…', 'loading');

  const { valid, info } = await validateKey(rawKey);
  setKeyStatus(info, valid ? 'ok' : 'err');

  if (valid) {
    saveKey(rawKey);
    setTimeout(() => {
      hideKeyModal();
      showKeyBar();
    }, 900);
  } else {
    modalSave.disabled = false;
  }
});

// Enter key in input triggers save
keyInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !modalSave.disabled) modalSave.click();
});

// Change key button
btnChangeKey.addEventListener('click', () => {
  showKeyModal(true);
});

/* Init: show modal or bar based on saved key */
(function initKey() {
  // If user returned from enter.pollinations.ai with a key in the URL fragment,
  // capture it first (e.g. https://app.com#api_key=sk_...)
  try { handleRedirectFragment(); } catch(e) { /* ignore */ }

  if (getSavedKey()) {
    showKeyBar();
  } else {
    showKeyModal();
  }

  // Wire authorize button if present
  if (authorizeBtn) {
    authorizeBtn.addEventListener('click', (e) => {
      e.preventDefault(); startAuthorizeFlow();
    });
  }
})();

/* ══════════════════════════════════════════════════════════
   STEP 1 - TEXT API: emoji sequence -> image prompt
   POST https://gen.pollinations.ai/v1/chat/completions
   Model: gemini-fast
   Auth: Authorization: Bearer {key}
   ══════════════════════════════════════════════════════════ */
async function buildPromptWithGemini(emojiString, apiKey) {
  const body = {
    model: TEXT_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: `Convert this emoji sequence into a vivid image generation prompt: ${emojiString}` },
    ],
    max_tokens: 200,
    temperature: 1.0,
  };

  const res = await fetch(TEXT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err?.error?.message || `Text API error ${res.status}`;
    throw new Error(msg);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('gemini-fast returned an empty response');
  return text;
}

/* ══════════════════════════════════════════════════════════
   STEP 2 - IMAGE API: prompt -> image
   GET https://gen.pollinations.ai/image/{encoded_prompt}
   Model: flux
   Auth: ?key={key}  (query param - GET requests can't use headers)
   ══════════════════════════════════════════════════════════ */
function buildImageURL(prompt, seed, apiKey) {
  const params = new URLSearchParams({
    model:   IMAGE_MODEL,
    width:   IMAGE_W,
    height:  IMAGE_H,
    seed,
    nologo:  'true',
    private: 'false',
    key:     apiKey,
  });
  return `${IMAGE_BASE}/${encodeURIComponent(prompt)}?${params}`;
}

/* ══════════════════════════════════════════════════════════
   MAIN GENERATE FLOW
   ══════════════════════════════════════════════════════════ */
async function generate(customSeed) {
  if (isGenerating) return;

  const rawEmojis = emojiInput.value.trim();
  if (!rawEmojis) {
    showError('Please paste some emojis first! Try 🐱☕🌧️ or click an example above.');
    return;
  }

  const apiKey = getSavedKey();
  if (!apiKey) {
    showKeyModal(true);
    return;
  }

  // ── UI: start ──
  isGenerating = true;
  btnGenerate.disabled = true;
  clearError();
  showResultCard();
  showLoading(true);
  hideImageWrapper();
  hideResultMeta();
  setStep(1);

  try {
    // ── Step 1: Gemini text ──
    setBrewText('Interpreting emojis', 'Gemini is crafting a cinematic prompt 🧠');
    const aiPrompt = await buildPromptWithGemini(rawEmojis, apiKey);
    currentPrompt = aiPrompt;

    // ── Step 2: Flux image ──
    setStep(2);
    setBrewText('Painting your scene', 'Flux is rendering the image 🎨');
    const seed = customSeed ?? (Date.now() % 999_999);
    const imageURL = buildImageURL(aiPrompt, seed, apiKey);

    await loadImage(imageURL);

    // ── Success ──
    resultImg.src = imageURL;
    promptPreview.textContent = aiPrompt;
    showLoading(false);
    showImageWrapper();
    showResultMeta();

  } catch (err) {
    showLoading(false);
    handleGenerationError(err);
  } finally {
    isGenerating = false;
    btnGenerate.disabled = false;
  }
}

/* Load an image URL, resolve on load, reject on error/timeout */
function loadImage(url, timeoutMs = 90_000) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = setTimeout(() => {
      img.src = '';
      reject(new Error('Image generation timed out (>90s). Pollinations may be busy — please try again.'));
    }, timeoutMs);

    img.onload  = () => { clearTimeout(timer); resolve(img); };
    img.onerror = () => { clearTimeout(timer); reject(new Error('Image failed to load. Check your key or try again.')); };
    img.src = url;
  });
}

/* Classify and show a helpful error message */
function handleGenerationError(err) {
  const msg = err?.message || String(err);

  if (/401|unauthorized|invalid.*key/i.test(msg)) {
    showError(
      '🔑 Authentication failed — your key may be invalid or expired. ' +
      '<button class="btn btn-ghost btn-sm" onclick="clearKey();showKeyModal(true)">Re-enter key</button>'
    );
  } else if (/402|payment|insufficient|budget/i.test(msg)) {
    showError('💸 Insufficient Pollen balance. Top up at <a href="https://enter.pollinations.ai" target="_blank">enter.pollinations.ai</a>.');
  } else if (/429|rate.?limit/i.test(msg)) {
    showError('⏱ Rate limit hit. Wait a moment and try again.');
  } else if (/timeout/i.test(msg)) {
    showError('⏳ ' + msg);
  } else {
    showError('⚠️ ' + (msg || 'Unknown error. Please try again.'));
  }

  // Hide result card if nothing to show
  if (!resultImg.src || resultImg.src === window.location.href) {
    resultCard.classList.add('hidden');
  }
}

/* ── Step indicator helpers ──────────────────────────────── */
function setStep(n) {
  dot1.className = 'step-dot ' + (n === 1 ? 'active' : 'done');
  lbl1.className = 'step-lbl ' + (n === 1 ? 'active' : 'done');
  dot2.className = 'step-dot ' + (n === 2 ? 'active' : '');
  lbl2.className = 'step-lbl ' + (n === 2 ? 'active' : '');
}

function setBrewText(main, sub) {
  brewText.innerHTML = `${main}<span class="dots"></span>`;
  brewSub.textContent = sub;
}

/* ── UI state helpers ────────────────────────────────────── */
function showResultCard()  { resultCard.classList.remove('hidden'); }
function showLoading(on)   { loadingState.classList.toggle('hidden', !on); }
function showImageWrapper(){ imageWrapper.classList.remove('hidden'); }
function hideImageWrapper(){ imageWrapper.classList.add('hidden'); }
function showResultMeta()  { resultMeta.classList.remove('hidden'); }
function hideResultMeta()  { resultMeta.classList.add('hidden'); }

function showError(html) {
  errorBanner.innerHTML = html;
  errorBanner.classList.remove('hidden');
  errorBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function clearError() {
  errorBanner.innerHTML = '';
  errorBanner.classList.add('hidden');
}

/* ── Copy image ──────────────────────────────────────────── */
async function copyImage() {
  try {
    const res  = await fetch(resultImg.src);
    const blob = await res.blob();
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    const orig = btnCopy.textContent;
    btnCopy.textContent = '✅ Copied!';
    setTimeout(() => { btnCopy.textContent = orig; }, 2000);
  } catch {
    window.open(resultImg.src, '_blank');
  }
}

/* ── Button / chip event listeners ──────────────────────── */
btnGenerate.addEventListener('click', () => generate());

btnRandom.addEventListener('click', () => {
  const pick = RANDOM_EXAMPLES[Math.floor(Math.random() * RANDOM_EXAMPLES.length)];
  emojiInput.value = pick;
  emojiInput.focus();
  clearError();
});

btnRemix.addEventListener('click', () => generate(Math.floor(Math.random() * 999_999)));
btnAgain.addEventListener('click', () => generate());
btnCopy.addEventListener('click', copyImage);

chips.forEach(c => {
  c.addEventListener('click', () => {
    emojiInput.value = c.dataset.emojis;
    emojiInput.focus();
    clearError();
  });
});

emojiInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); generate(); }
});

emojiInput.addEventListener('input', clearError);
