/*
  Emojis Come to Life – script.js
  March 2026 · Built for fun

  Uses Pollinations.ai to turn emoji strings into vivid image prompts, then generates images with the "Flux" model.
*/

// ── key management ────────────────
function getApiKey() {
  let key = localStorage.getItem('pollinationsApiKey');
  if (key) return key;

  key = prompt(
    '🌸 Welcome to Emojis Come to Life!\n\n' +
    'To generate images you need a free Pollinations API key.\n' +
    'Takes ~10 seconds to grab one:\n' +
    '→ https://enter.pollinations.ai\n\n' +
    'Paste your key below (saved in your browser only, never shared):'
  );

  if (key && key.trim()) {
    localStorage.setItem('pollinationsApiKey', key.trim());
    return key.trim();
  }

  alert('No key provided — image generation disabled 😿\nRefresh the page to try again.');
  return null;
}

function forgetApiKey() {
  localStorage.removeItem('pollinationsApiKey');
}

/* ── Pollinations API config ─────────────────────────────── */
const POLLINATIONS_BASE = 'https://gen.pollinations.ai/image/models';
const IMAGE_WIDTH  = 1152;
const IMAGE_HEIGHT = 896;

/* ── DOM refs ────────────────────────────────────────────── */
const emojiInput    = document.getElementById('emoji-input');
const btnGenerate   = document.getElementById('btn-generate');
const btnRandom     = document.getElementById('btn-random');
const btnRemix      = document.getElementById('btn-remix');
const btnAgain      = document.getElementById('btn-again');
const btnCopy       = document.getElementById('btn-copy');
const resultCard    = document.getElementById('result-card');
const loadingState  = document.getElementById('loading-state');
const imageWrapper  = document.getElementById('image-wrapper');
const resultImg     = document.getElementById('result-img');
const resultMeta    = document.getElementById('result-meta');
const promptPreview = document.getElementById('prompt-preview');
const errorBanner   = document.getElementById('error-banner');
const chips         = document.querySelectorAll('.chip');

/* ── Emoji → meaning dictionary ──────────────────────────── */
const EMOJI_MAP = {
  // Nature
  '🌸': 'cherry blossoms', '🌺': 'hibiscus flowers', '🌻': 'sunflowers',
  '🌹': 'roses', '🌷': 'tulips', '🌿': 'lush greenery', '🍀': 'four-leaf clovers',
  '🌲': 'towering pine trees', '🌳': 'ancient oak trees', '🌴': 'swaying palm trees',
  '🍂': 'autumn leaves', '❄️': 'snowflakes', '🌨️': 'snow flurries',
  '⛄': 'snowman', '🌧️': 'dramatic rain', '⛈️': 'thunderstorm',
  '🌈': 'radiant rainbow', '☀️': 'brilliant sunshine', '🌙': 'crescent moon',
  '⭐': 'glowing stars', '🌟': 'sparkling stars', '✨': 'magical sparkles',
  '💫': 'swirling stardust', '🌊': 'crashing ocean waves', '🏔️': 'snow-capped mountains',
  '🌋': 'erupting volcano', '🏜️': 'vast desert dunes', '🌾': 'golden wheat fields',
  '🍄': 'whimsical mushrooms', '🌌': 'cosmic galaxy nebula',

  // Animals
  '🐱': 'adorable cat', '🐶': 'fluffy dog', '🦁': 'majestic lion',
  '🐯': 'fierce tiger', '🐺': 'lone wolf', '🦊': 'clever fox',
  '🐻': 'bear', '🐼': 'panda bear', '🦄': 'magical unicorn',
  '🐉': 'mighty dragon', '🦅': 'soaring eagle', '🦋': 'colorful butterfly',
  '🐬': 'playful dolphin', '🐳': 'majestic whale', '🦈': 'shark',
  '🐙': 'mysterious octopus', '🦑': 'giant squid', '🐢': 'ancient sea turtle',
  '🦎': 'gecko lizard', '🐍': 'serpent', '🦉': 'wise owl',
  '🦚': 'vibrant peacock', '🦜': 'colorful parrot', '🐦': 'bird',
  '🐝': 'busy bee', '🦋': 'delicate butterfly', '🐠': 'tropical fish',

  // Food & drink
  '☕': 'steaming coffee', '🍵': 'green tea ceremony', '🧋': 'bubble tea',
  '🍺': 'frothy beer', '🍷': 'red wine', '🍹': 'tropical cocktail',
  '🍕': 'pizza', '🍜': 'steaming noodles', '🍣': 'sushi',
  '🍩': 'glazed donut', '🍰': 'layered cake', '🧁': 'frosted cupcake',
  '🍫': 'chocolate', '🍓': 'fresh strawberries', '🥑': 'avocado',
  '🌮': 'tacos', '🥘': 'hearty stew', '🍱': 'bento box',

  // Places & scenes
  '🏙️': 'gleaming city skyline', '🌆': 'city at dusk',
  '🌃': 'city at night with neon lights', '🌉': 'illuminated bridge over water',
  '🏖️': 'sunny beach', '🏕️': 'cozy campsite', '🏰': 'fairy-tale castle',
  '⛩️': 'Shinto shrine gate', '🗼': 'Eiffel tower', '🗽': 'Statue of Liberty',
  '🏯': 'ancient Japanese castle', '🌁': 'foggy bridge', '🌄': 'sunrise over mountains',
  '🌅': 'golden sunset over water', '🌠': 'shooting stars over landscape',

  // Space
  '🚀': 'sleek rocket ship', '🛸': 'glowing UFO', '🌕': 'full moon',
  '🪐': 'Saturn with rings', '👽': 'friendly alien', '🌌': 'galaxy',
  '🌑': 'dark moon', '☄️': 'blazing comet', '🛰️': 'satellite',

  // Activities & transport
  '🏍️': 'motorcycle', '🚗': 'speeding car', '✈️': 'jet airplane',
  '⛵': 'sailboat', '🚂': 'steam locomotive', '🚀': 'rocket',
  '🏄': 'surfer', '🧗': 'rock climber', '🧘': 'meditating figure',
  '🎸': 'electric guitar', '🎹': 'grand piano', '🎻': 'violin',
  '🎨': 'artist painting', '📸': 'camera', '🔭': 'telescope',

  // Fantasy & magic
  '🧙‍♂️': 'wise wizard', '🧙‍♀️': 'sorceress', '🧝': 'forest elf',
  '🧚': 'tiny fairy', '🧜': 'mermaid', '🧛': 'vampire',
  '🔮': 'glowing crystal ball', '⚗️': 'alchemist lab', '🗡️': 'enchanted sword',
  '🛡️': 'ornate shield', '🏹': 'golden bow and arrow', '💎': 'precious gems',
  '👑': 'royal crown', '🔑': 'ancient key', '🕯️': 'flickering candles',
  '📜': 'ancient scroll', '🗺️': 'treasure map',

  // Atmosphere / mood
  '💥': 'explosion of energy', '⚡': 'lightning bolts', '🔥': 'roaring flames',
  '💨': 'swirling wind', '🌪️': 'tornado', '🌫️': 'mysterious fog',
  '🌬️': 'icy wind', '💧': 'water droplets', '🫧': 'rising bubbles',
};

/* ── Random example pool ─────────────────────────────────── */
const RANDOM_EXAMPLES = [
  '🐱☕🌧️🏠', '🚀🌕👽🌌', '🏍️🍜🌆🌃',
  '🧙‍♂️🔮🌲✨', '🐉🏔️⚡🌊', '🦄🌈🌸🎠',
  '🦊🍂🏕️🌙', '🐳🌊🌅🐚', '🧜‍♀️🌊💎🐠',
  '🎸🔥🌃🎶', '⛩️🌸🗻🎋', '🤖🌆⚡🔮',
  '🦁🏜️🌅🌾', '🧚🌺🍄✨', '🛸🌌🪐👽',
  '🍕🍺🎉🎆', '📸🌄🏔️☕', '🧁🌸☕📖',
];

/* ── Core: emoji string → vivid natural language prompt ──── */
function buildPrompt(rawEmojis) {
  // Extract individual grapheme clusters (handles multi-codepoint emoji like 🧙‍♂️)
  const segments = [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(rawEmojis)]
    .map(s => s.segment.trim())
    .filter(Boolean);

  if (segments.length === 0) {
    return 'A burst of colorful abstract magic and joy, vibrant and dreamy, swirling iridescent energy, cinematic lighting, masterpiece';
  }

  // Map each emoji to a description (fallback: keep emoji name if known via regex)
  const descriptions = segments.map(emoji => {
    if (EMOJI_MAP[emoji]) return EMOJI_MAP[emoji];
    // Try to get Unicode name as fallback
    return null;
  }).filter(Boolean);

  if (descriptions.length === 0) {
    return 'A magical abstract scene full of wonder and colorful energy, cinematic lighting, vibrant detailed illustration, masterpiece';
  }

  // ── Compose scene narrative ──
  // Strategy: treat first elem as subject, rest as environment/context
  let narrative = '';

  if (descriptions.length === 1) {
    narrative = `A breathtaking scene featuring ${descriptions[0]}, incredibly detailed and atmospheric`;

  } else if (descriptions.length === 2) {
    narrative = `${capitalize(descriptions[0])} with ${descriptions[1]}, magical and atmospheric`;

  } else if (descriptions.length === 3) {
    narrative = `${capitalize(descriptions[0])} in a scene with ${descriptions[1]}, set against ${descriptions[2]}`;

  } else {
    // 4+ emojis: build a flowing scene description
    const subject  = descriptions[0];
    const action   = descriptions[1];
    const setting  = descriptions[2];
    const mood     = descriptions.slice(3).join(' and ');
    narrative = `${capitalize(subject)} with ${action}, surrounded by ${setting}, with ${mood}`;
  }

  // Append universal quality boosters for Flux
  const qualityBoost = [
    'vibrant detailed illustration',
    'whimsical magical atmosphere',
    'cinematic dramatic lighting',
    'rich saturated colors',
    'ultra detailed',
    'masterpiece',
    '8k resolution',
    'professional digital art',
  ].join(', ');

  return `${narrative}, ${qualityBoost}`;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/* ── Build Pollinations image URL ────────────────────────── */
function buildImageURL(prompt, seed, apiKey) {
  const encoded = encodeURIComponent(prompt);
  const params = new URLSearchParams({
    model:   'flux',
    width:   IMAGE_WIDTH,
    height:  IMAGE_HEIGHT,
    seed:    seed,
    enhance: 'true',
    safe:    'true',
    nologo:  'true',
    key:     apiKey,   // "Bring Your Own Pollen" — key from localStorage
  });

  return `${POLLINATIONS_BASE}/${encoded}?${params.toString()}`;
}

/* ── State ───────────────────────────────────────────────── */
let currentPrompt = '';
let isGenerating  = false;

/* ── Main generate function ─────────────────────────────── */
async function generate(customSeed) {
  if (isGenerating) return;

  const raw = emojiInput.value.trim();
  if (!raw) {
    showError('Please paste some emojis first! Try 🐱☕🌧️ or click one of the example buttons.');
    return;
  }

  // Retrieve (or prompt for) the API key via "Bring Your Own Pollen"
  const apiKey = getApiKey();
  if (!apiKey) return; // user cancelled the prompt

  clearError();
  isGenerating = true;

  // Build prompt
  currentPrompt = buildPrompt(raw);
  const seed = customSeed ?? (Date.now() % 999999);
  const imageURL = buildImageURL(currentPrompt, seed, apiKey);

  // Show UI states
  btnGenerate.disabled = true;
  showResultCard();
  showLoading(true);
  hideImageWrapper();
  hideResultMeta();

  // Load image via Image() object so we can handle onload/onerror cleanly
  const img = new Image();
  img.decoding = 'async';

  const timeout = setTimeout(() => {
    if (isGenerating) {
      img.src = ''; // cancel
      finishGeneration(false, 'The request timed out (>60s). Pollinations may be busy — try again!');
    }
  }, 60_000);

  img.onload = () => {
    clearTimeout(timeout);
    resultImg.src = imageURL;
    promptPreview.textContent = currentPrompt.length > 220
      ? currentPrompt.slice(0, 220) + '…'
      : currentPrompt;
    finishGeneration(true);
  };

  img.onerror = () => {
    clearTimeout(timeout);
    const msg =
      'Image generation failed — this could be a rate limit (429), an invalid key, or a temporary Pollinations outage.<br>' +
      'If your key seems wrong, <button class="btn btn-ghost btn-sm" onclick="forgetApiKey();location.reload()">🔑 Reset API key</button> and try again.';
    finishGeneration(false, msg);
  };

  // Start loading
  img.src = imageURL;
}

function finishGeneration(success, errorMsg) {
  isGenerating = false;
  btnGenerate.disabled = false;
  showLoading(false);

  if (success) {
    showImageWrapper();
    showResultMeta();
  } else {
    showError(errorMsg);
    // Hide result card if nothing to show
    if (!resultImg.src || resultImg.src === window.location.href) {
      resultCard.classList.add('hidden');
    }
  }
}

/* ── UI helpers ──────────────────────────────────────────── */
function showResultCard() { resultCard.classList.remove('hidden'); }

function showLoading(on) {
  loadingState.classList.toggle('hidden', !on);
}
function showImageWrapper() {
  imageWrapper.classList.remove('hidden');
}
function hideImageWrapper() {
  imageWrapper.classList.add('hidden');
}
function showResultMeta() {
  resultMeta.classList.remove('hidden');
}
function hideResultMeta() {
  resultMeta.classList.add('hidden');
}

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
    const response = await fetch(resultImg.src);
    const blob = await response.blob();
    await navigator.clipboard.write([
      new ClipboardItem({ [blob.type]: blob })
    ]);
    const orig = btnCopy.textContent;
    btnCopy.textContent = '✅ Copied!';
    setTimeout(() => { btnCopy.textContent = orig; }, 2000);
  } catch {
    // Fallback: open in new tab
    window.open(resultImg.src, '_blank');
  }
}

/* ── Event listeners ─────────────────────────────────────── */
btnGenerate.addEventListener('click', () => generate());

btnRandom.addEventListener('click', () => {
  const pick = RANDOM_EXAMPLES[Math.floor(Math.random() * RANDOM_EXAMPLES.length)];
  emojiInput.value = pick;
  emojiInput.focus();
  clearError();
});

// Remix = same prompt, new random seed
btnRemix.addEventListener('click', () => {
  generate(Math.floor(Math.random() * 999999));
});

// Generate Again = same seed from current timestamp
btnAgain.addEventListener('click', () => generate());

btnCopy.addEventListener('click', copyImage);

// Example chips
chips.forEach(chip => {
  chip.addEventListener('click', () => {
    emojiInput.value = chip.dataset.emojis;
    emojiInput.focus();
    clearError();
  });
});

// Allow Enter key (shift+enter = newline) in textarea to trigger generate
emojiInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    generate();
  }
});

// Auto-clear error on input
emojiInput.addEventListener('input', clearError);