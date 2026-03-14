/*
  Emojis Come to Life – script.js
  March 2026 · Built for fun in Dong Nai, VN 🇻🇳

  Uses Pollinations "Bring Your Own Pollen" — your API key is
  stored only in your browser's localStorage, never sent anywhere
  except directly to Pollinations.ai. Get a free key in 10s:
  → https://enter.pollinations.ai
*/

// ── "Bring Your Own Pollen" key management ────────────────
// Retrieves key from localStorage, or prompts the user once.
// Key is saved in-browser only — never leaves your device.
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

// Allow resetting the key (e.g. if user wants to change it)
function forgetApiKey() {
  localStorage.removeItem('pollinationsApiKey');
}

/* ── Pollinations API config ─────────────────────────────── */
const POLLINATIONS_BASE = 'https://image.pollinations.ai/prompt';
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

/* ── Emoji → rich scene descriptors ────────────────────────
   Each value is a vivid phrase used in image generation prompts.
   Role tags drive narrative assembly:
     [S] = subject/character   [E] = environment/setting
     [A] = atmosphere/weather  [O] = object/prop
     [M] = mood/tone modifier
─────────────────────────────────────────────────────────── */
const EMOJI_MAP = {

  // ── Nature: flora ──────────────────────────────────────
  '🌸': { r:'E', d:'drifting cherry blossom petals blanketing the ground' },
  '🌺': { r:'E', d:'vivid tropical hibiscus flowers in full bloom' },
  '🌻': { r:'E', d:'towering sunflower fields stretching to the horizon' },
  '🌹': { r:'O', d:'a single perfect crimson rose with dewdrops' },
  '🌷': { r:'E', d:'rows of pastel tulips in a Dutch garden' },
  '🌿': { r:'E', d:'lush emerald greenery and dense fern undergrowth' },
  '🍀': { r:'O', d:'a lucky four-leaf clover glinting in morning light' },
  '🌲': { r:'E', d:'ancient towering pine trees with snow-dusted branches' },
  '🌳': { r:'E', d:'a massive sprawling oak tree with gnarled roots' },
  '🌴': { r:'E', d:'tall swaying palm trees along a tropical coastline' },
  '🎋': { r:'E', d:'tall bamboo groves with shafts of golden light filtering through' },
  '🍂': { r:'A', d:'swirling amber and crimson autumn leaves caught in the wind' },
  '🍁': { r:'A', d:'vivid maple leaves in fiery reds and oranges' },
  '🌾': { r:'E', d:'rippling golden wheat fields under a vast open sky' },
  '🍄': { r:'O', d:'giant glowing bioluminescent mushrooms dotting the forest floor' },
  '🪸': { r:'E', d:'vibrant coral reef teeming with life and color' },
  '🪷': { r:'O', d:'an elegant lotus flower floating on still water' },

  // ── Nature: weather & sky ──────────────────────────────
  '❄️': { r:'A', d:'thick snowflakes drifting silently through freezing air' },
  '🌨️': { r:'A', d:'a heavy snowfall blanketing everything in white' },
  '⛄': { r:'O', d:'a cheerful snowman built in a winter landscape' },
  '🌧️': { r:'A', d:'heavy dramatic rain hammering the ground, deep puddle reflections' },
  '⛈️': { r:'A', d:'a violent thunderstorm with crashing lightning and torrential rain' },
  '🌈': { r:'A', d:'a vivid double rainbow arching across the sky after the storm' },
  '☀️': { r:'A', d:'blazing golden sunshine with dramatic god-rays cutting through clouds' },
  '🌤️': { r:'A', d:'soft partly cloudy sky with warm glowing light' },
  '🌙': { r:'A', d:'a luminous crescent moon hanging low over the scene' },
  '🌕': { r:'A', d:'an enormous glowing full moon dominating the night sky' },
  '🌑': { r:'A', d:'a pitch-black new moon casting deep mysterious shadows' },
  '⭐': { r:'A', d:'thousands of glittering stars filling the night sky' },
  '🌟': { r:'A', d:'a brilliant star bursting with golden light rays' },
  '✨': { r:'M', d:'shimmering magical sparkles and light particles floating in the air' },
  '💫': { r:'M', d:'swirling cosmic stardust and ethereal light trails' },
  '🌠': { r:'A', d:'streaking meteor showers across a deep purple night sky' },
  '🌌': { r:'E', d:'a breathtaking cosmic nebula with swirling galaxies and purple-blue clouds' },

  // ── Nature: landscape & geography ──────────────────────
  '🌊': { r:'E', d:'enormous crashing ocean waves surging with white foam and turquoise depth' },
  '🏔️': { r:'E', d:'jagged snow-capped mountain peaks piercing through low clouds' },
  '⛰️': { r:'E', d:'rugged rocky mountain range silhouetted against the sky' },
  '🗻': { r:'E', d:'the iconic cone of Mount Fuji dusted in snow' },
  '🌋': { r:'E', d:'an erupting volcano spewing rivers of molten lava and ash clouds' },
  '🏜️': { r:'E', d:'sweeping sun-scorched desert dunes with heat shimmer on the horizon' },
  '🏝️': { r:'E', d:'a secluded tropical island with crystal clear turquoise waters' },
  '🏞️': { r:'E', d:'a serene national park with a mirror-still lake reflecting mountains' },
  '🌁': { r:'A', d:'thick mysterious fog rolling through a gorge, muffling all sound' },
  '🌄': { r:'A', d:'a golden sunrise blazing over mountain ridges with dramatic light rays' },
  '🌅': { r:'A', d:'a fiery orange and pink sunset melting into the ocean horizon' },
  '🌃': { r:'E', d:'a dazzling city at night with neon reflections on rain-slicked streets' },
  '🌆': { r:'E', d:'a glowing cityscape at dusk, skyscrapers lit with warm amber light' },
  '🌇': { r:'E', d:'a city skyline silhouetted in the last rays of a vivid sunset' },
  '🌉': { r:'E', d:'a grand suspension bridge strung with lights over dark flowing water' },
  '🏙️': { r:'E', d:'a gleaming modern city skyline of glass and steel towers' },
  '🌿': { r:'E', d:'dense tropical jungle with cascading vines and emerald light' },
  '🕳️': { r:'E', d:'a mysterious swirling void or dark portal opening in reality' },

  // ── Animals ────────────────────────────────────────────
  '🐱': { r:'S', d:'a sleek curious cat with bright eyes and twitching whiskers' },
  '🐈': { r:'S', d:'an elegant tabby cat prowling gracefully' },
  '🐶': { r:'S', d:'an energetic fluffy dog with a wagging tail and bright eyes' },
  '🐺': { r:'S', d:'a lone silver wolf standing proud on a rocky outcrop howling at the moon' },
  '🦊': { r:'S', d:'a cunning red fox with a bushy tail, eyes gleaming with intelligence' },
  '🐻': { r:'S', d:'a massive grizzly bear standing on its hind legs, fur bristling' },
  '🐼': { r:'S', d:'a round fluffy giant panda sitting peacefully among bamboo' },
  '🦁': { r:'S', d:'a regal lion with a full golden mane, commanding gaze surveying the savanna' },
  '🐯': { r:'S', d:'a powerful Bengal tiger crouching low with intense amber eyes' },
  '🐘': { r:'S', d:'a giant elephant with enormous tusks, skin textured like ancient stone' },
  '🦒': { r:'S', d:'a tall giraffe elegantly striding across a sun-baked plain' },
  '🦓': { r:'S', d:'a zebra standing in tall golden grass, striking black and white stripes' },
  '🦄': { r:'S', d:'a mythical unicorn with a spiraling iridescent horn and flowing mane' },
  '🐉': { r:'S', d:'a massive fire-breathing dragon with scaled crimson wings spread wide' },
  '🐲': { r:'S', d:'a great Eastern dragon coiling through clouds, scales glistening like jade' },
  '🦅': { r:'S', d:'a bald eagle with talons outstretched diving at tremendous speed' },
  '🦉': { r:'S', d:'a great horned owl with piercing golden eyes perched in the moonlight' },
  '🦋': { r:'S', d:'an enormous iridescent butterfly with wings like stained glass' },
  '🐦': { r:'S', d:'a flock of birds swirling in a vast murmuration against the sky' },
  '🦜': { r:'S', d:'a vivid scarlet macaw with electric blue and gold wing feathers' },
  '🦚': { r:'S', d:'a peacock displaying its extraordinary jewel-toned fan of a tail' },
  '🐬': { r:'S', d:'a sleek dolphin leaping joyfully through shimmering waves' },
  '🐳': { r:'S', d:'a colossal humpback whale breaching the ocean surface in an explosion of spray' },
  '🦈': { r:'S', d:'a great white shark slicing through dark deep water, fins cutting the surface' },
  '🐙': { r:'S', d:'a giant octopus with curling tentacles illuminated by deep-sea bioluminescence' },
  '🦑': { r:'S', d:'a colossal squid rising from the abyss, tentacles reaching for the surface' },
  '🐢': { r:'S', d:'an ancient leatherback sea turtle gliding serenely through sunlit ocean depths' },
  '🦀': { r:'S', d:'a giant bright red crab on a rocky shoreline surrounded by crashing surf' },
  '🐍': { r:'S', d:'a massive serpent coiled around ancient stone ruins, scales glistening' },
  '🦎': { r:'S', d:'a vivid chameleon shifting colors dramatically on a mossy branch' },
  '🦖': { r:'S', d:'a towering T-Rex stomping through a prehistoric jungle under a stormy sky' },
  '🦕': { r:'S', d:'a long-necked brachiosaurus wading through a primordial misty swamp' },
  '🐠': { r:'S', d:'a dazzling clownfish weaving through anemones in a coral reef paradise' },
  '🦁': { r:'S', d:'a majestic lion king surveying its territory from a sun-drenched rocky bluff' },
  '🐝': { r:'S', d:'a close-up of a golden bee covered in pollen on a flower' },
  '🦟': { r:'M', d:'an eerie swarm filling the murky air with buzzing menace' },
  '🐺': { r:'S', d:'a pack of wolves moving as shadows through a moonlit snow forest' },

  // ── Food & drink ───────────────────────────────────────
  '☕': { r:'O', d:'a steaming cup of rich dark coffee on a rustic wooden table' },
  '🍵': { r:'O', d:'a delicate porcelain bowl of matcha green tea with rising steam' },
  '🧋': { r:'O', d:'a tall colorful bubble tea with tapioca pearls and a wide straw' },
  '🍺': { r:'O', d:'a frothy golden pint of beer in a dimly lit tavern' },
  '🍷': { r:'O', d:'a deep red wine swirling in a crystal glass catching the candlelight' },
  '🥃': { r:'O', d:'a glass of amber whiskey on the rocks with smoky reflections' },
  '🍹': { r:'O', d:'a tropical cocktail with a paper umbrella at a beach bar' },
  '🍕': { r:'O', d:'a perfectly charred wood-fired pizza with molten cheese and fresh basil' },
  '🍜': { r:'O', d:'a steaming bowl of rich ramen noodles with toppings, broth gleaming' },
  '🍣': { r:'O', d:'an artful arrangement of glistening sushi on a slate board' },
  '🍱': { r:'O', d:'an elegant Japanese bento box with compartments of colorful food' },
  '🍩': { r:'O', d:'a glazed donut with rainbow sprinkles and a perfect caramel sheen' },
  '🍰': { r:'O', d:'a towering multi-layered cake with elaborate frosting and decorations' },
  '🧁': { r:'O', d:'a frosted cupcake with swirling buttercream and edible glitter' },
  '🍫': { r:'O', d:'dark glossy chocolate melting and flowing in rich ribbons' },
  '🍓': { r:'O', d:'plump ripe strawberries glistening with dew drops' },
  '🍎': { r:'O', d:'a shiny red apple with a perfect reflection of light on its skin' },
  '🥑': { r:'O', d:'a halved avocado revealing its creamy green flesh and smooth seed' },
  '🌮': { r:'O', d:'stuffed street tacos overflowing with colorful toppings' },
  '🥘': { r:'O', d:'a bubbling hearty stew in a cast iron pot over open flames' },

  // ── Buildings & places ─────────────────────────────────
  '🏰': { r:'E', d:'a towering Gothic fairy-tale castle with spires reaching into storm clouds' },
  '🏯': { r:'E', d:'a magnificent ancient Japanese feudal castle surrounded by cherry blossoms' },
  '⛩️': { r:'E', d:'a vermilion Torii gate standing alone in a misty mountain forest' },
  '🗼': { r:'E', d:'the iconic Eiffel Tower illuminated in the Parisian night' },
  '🗽': { r:'E', d:'the Statue of Liberty standing tall against a dramatic sky' },
  '🏛️': { r:'E', d:'a grand ancient marble temple with soaring Corinthian columns' },
  '⛪': { r:'E', d:'a stone cathedral with ornate stained glass and towering bell towers' },
  '🕌': { r:'E', d:'a majestic mosque with golden domes and soaring minarets' },
  '🏗️': { r:'E', d:'a massive construction site with cranes against a city skyline' },
  '🏚️': { r:'E', d:'an abandoned decrepit house reclaimed by creeping vines and nature' },
  '🏠': { r:'E', d:'a cozy cottage with warm light glowing from the windows' },
  '🏕️': { r:'E', d:'a wilderness campsite with a crackling fire under a star-filled sky' },
  '🏖️': { r:'E', d:'a pristine white sand beach with crystal blue waves and swaying palms' },
  '🏟️': { r:'E', d:'a vast stadium packed with roaring crowds under floodlights' },

  // ── Space & sci-fi ─────────────────────────────────────
  '🚀': { r:'S', d:'a sleek futuristic rocket ship blazing through the cosmos on a trail of fire' },
  '🛸': { r:'S', d:'a glowing alien spacecraft hovering silently, emitting beams of light' },
  '🪐': { r:'E', d:'a ringed gas giant planet looming enormous in a star-speckled sky' },
  '👽': { r:'S', d:'a wide-eyed extraterrestrial being with an otherworldly calm expression' },
  '🌌': { r:'E', d:'a dazzling spiral galaxy with luminous nebula clouds in deep purple and blue' },
  '☄️': { r:'A', d:'a blazing comet trailing fire across the sky, heading for impact' },
  '🛰️': { r:'O', d:'a complex space station orbiting high above the cloud-covered Earth' },
  '🔭': { r:'O', d:'an observatory telescope pointed at a stunning celestial phenomenon' },
  '👩‍🚀': { r:'S', d:'an astronaut in a white spacesuit floating free in the infinite black of space' },
  '🌍': { r:'E', d:'the beautiful blue planet Earth glowing from orbit against deep black space' },

  // ── Transport & vehicles ───────────────────────────────
  '🏍️': { r:'S', d:'a powerful chrome and black motorcycle with headlights blazing' },
  '🚗': { r:'S', d:'a sleek sports car tearing through city streets leaving light trails' },
  '🚂': { r:'S', d:'a roaring steam locomotive charging through the countryside at full speed' },
  '✈️': { r:'S', d:'a commercial jet banking through dramatic golden clouds at altitude' },
  '⛵': { r:'S', d:'a wooden sailing yacht heeling gracefully across wind-whipped seas' },
  '🚢': { r:'S', d:'a massive ocean liner sailing through a vast and stormy Atlantic' },
  '🚁': { r:'S', d:'a helicopter hovering over a sprawling cityscape at golden hour' },
  '🛺': { r:'S', d:'a colorful auto-rickshaw weaving through chaotic vibrant city traffic' },
  '🛻': { r:'S', d:'a rugged off-road truck climbing a sheer muddy mountain trail' },
  '🚲': { r:'O', d:'a vintage bicycle leaning against a sunlit cobblestone alley wall' },

  // ── People & characters ────────────────────────────────
  '🧙‍♂️': { r:'S', d:'an ancient wizard with flowing silver robes and a long staff crackling with arcane power' },
  '🧙‍♀️': { r:'S', d:'a powerful sorceress in dark robes, hands glowing with supernatural energy' },
  '🧝': { r:'S', d:'a lithe forest elf with pointed ears and piercing green eyes in ancient woodland armor' },
  '🧚': { r:'S', d:'a tiny luminous fairy with gossamer wings leaving a trail of golden dust' },
  '🧜': { r:'S', d:'a beautiful mermaid with an iridescent tail breaking the ocean surface at dusk' },
  '🧜‍♀️': { r:'S', d:'a ethereal mermaid queen with flowing hair and a shimmering scaled tail' },
  '🧛': { r:'S', d:'a pale vampire in an elegant cape emerging from shadows with crimson eyes' },
  '🤖': { r:'S', d:'a sleek humanoid robot with glowing circuits and reflective chrome plating' },
  '🥷': { r:'S', d:'a shadow ninja in all black perched on a rooftop in the moonlight' },
  '👸': { r:'S', d:'a regal princess in an elaborate jeweled gown in a grand throne room' },
  '🤴': { r:'S', d:'a noble prince in royal armor standing before a vast kingdom' },
  '🧟': { r:'S', d:'a horde of undead zombies shambling through a fog-choked ruined city' },
  '👻': { r:'S', d:'a translucent ghost drifting through cobwebbed moonlit corridors' },
  '🎅': { r:'S', d:'a jolly Santa Claus soaring across a winter night sky in his sleigh' },
  '🧑‍🎤': { r:'S', d:'a rock star on stage under blinding spotlights, crowd going wild' },
  '🧑‍🚀': { r:'S', d:'an astronaut on the lunar surface, blue Earth reflected in the visor' },
  '🕵️': { r:'S', d:'a trenchcoated detective in a rainy noir cityscape under a lone streetlamp' },
  '🧘': { r:'S', d:'a meditating figure floating in lotus position surrounded by glowing energy' },
  '🏄': { r:'S', d:'a surfer riding the crest of a towering translucent green wave' },
  '🧗': { r:'S', d:'a climber clinging to a sheer cliff face above clouds with nothing below' },
  '🏹': { r:'O', d:'a glowing enchanted arrow drawn back in a silver bow' },

  // ── Fantasy & magic objects ────────────────────────────
  '🔮': { r:'O', d:'a glowing crystal ball swirling with visions of other worlds inside' },
  '⚗️': { r:'O', d:'a cluttered alchemist laboratory with bubbling colorful potions and arcane instruments' },
  '🗡️': { r:'O', d:'an ancient enchanted sword with runes glowing along the blade' },
  '🛡️': { r:'O', d:'an ornately crafted shield engraved with a legendary heraldic emblem' },
  '💎': { r:'O', d:'enormous precious gemstones catching light into rainbow refractions' },
  '👑': { r:'O', d:'a bejeweled royal crown resting on a velvet throne' },
  '🔑': { r:'O', d:'a massive ancient iron key floating and radiating golden light' },
  '🕯️': { r:'O', d:'dozens of flickering candles illuminating dusty ancient stone walls' },
  '📜': { r:'O', d:'a crumbling ancient scroll covered in glowing mystical runes' },
  '🗺️': { r:'O', d:'a weathered treasure map with a glowing trail leading to an X' },
  '🪄': { r:'O', d:'a magic wand shooting arcs of sparkling colorful light' },
  '⚔️': { r:'O', d:'two crossed gleaming battle swords embedded in an ancient stone altar' },
  '🧿': { r:'O', d:'a glowing sapphire evil eye amulet pulsing with protective energy' },
  '🏺': { r:'O', d:'ancient ornate ceramic urns and artifacts in torchlit underground ruins' },

  // ── Music & art ────────────────────────────────────────
  '🎸': { r:'O', d:'an electric guitar erupting with visible sound waves on a concert stage' },
  '🎹': { r:'O', d:'a grand piano in a candlelit concert hall, keys seemingly playing themselves' },
  '🎻': { r:'O', d:'a violin under a bow, the music visualized as glowing golden waves' },
  '🥁': { r:'O', d:'a massive drum kit surrounded by the energy of a live performance' },
  '🎺': { r:'O', d:'a gleaming brass trumpet belting out sound depicted as rings of light' },
  '🎷': { r:'O', d:'a saxophone in a smoky jazz club, music curling like blue cigarette smoke' },
  '🎨': { r:'O', d:'a painters palette and brushes creating a masterpiece that comes alive' },
  '🖼️': { r:'O', d:'a luminous painting in an ornate golden frame that seems to glow from within' },
  '🎭': { r:'M', d:'a theatrical dramatic atmosphere with masks of comedy and tragedy' },
  '🎪': { r:'E', d:'a vibrant traveling circus under a big top tent blazing with colored lights' },
  '🎡': { r:'E', d:'a giant illuminated Ferris wheel against a twilight carnival sky' },
  '🎆': { r:'A', d:'enormous fireworks bursting in a cascade of gold and silver over a city' },

  // ── Atmosphere & energy ────────────────────────────────
  '💥': { r:'A', d:'a tremendous explosion of raw kinetic energy, shockwaves rippling outward' },
  '⚡': { r:'A', d:'jagged lightning bolts splitting the dark sky, illuminating everything in white' },
  '🔥': { r:'A', d:'roaring walls of fire with deep orange and blue cores, ash drifting upward' },
  '💨': { r:'A', d:'howling cyclonic winds bending trees and scattering debris' },
  '🌪️': { r:'A', d:'a massive dark tornado churning across the landscape, destroying everything in its path' },
  '🌫️': { r:'A', d:'thick mysterious fog rolling in from the sea, obscuring all but silhouettes' },
  '🌬️': { r:'A', d:'freezing arctic wind carrying ice crystals through pale desolate air' },
  '💧': { r:'A', d:'crystalline water droplets suspended in slow motion, refracting prism light' },
  '🫧': { r:'M', d:'shimmering soap bubbles and iridescent spheres floating upward in a beam of light' },
  '❤️': { r:'M', d:'a warm rose-gold glow of love and tender emotion suffusing everything' },
  '💜': { r:'M', d:'a mysterious deep violet aura of mysticism and ancient power' },
  '🖤': { r:'M', d:'a brooding dark and dramatic gothic atmosphere draped in deep shadow' },
  '🌈': { r:'A', d:'a stunning full double rainbow arching high above the landscape' },
  '☁️': { r:'A', d:'dramatic towering cumulonimbus clouds backlit by hidden sunlight' },
};

/* ── Semantic role category sets ────────────────────────────
   Used by buildPrompt to classify each emoji for smart narrative assembly
─────────────────────────────────────────────────────────── */
const ROLE = { S:'S', E:'E', A:'A', O:'O', M:'M' };

/* ── Random example pool — 70 combos, weird to epic ─────── */
const RANDOM_EXAMPLES = [
  // Epic creature drama
  '🐉🏔️⚡🌊💥🌩️',
  '🦁🏜️🌅🦅🔥☀️',
  '🐺🌲🌕❄️🌌⭐',
  '🦖🌋🌿⛈️💥🌪️',
  '🦈🌊🌑🪸💧🌫️',
  '🐘🌾🌅🦒🌤️🌈',
  '🦅🏔️❄️🌤️⭐💨',
  // Fantasy quests
  '🧙‍♂️🏰🔮🌲⚡✨',
  '🧜‍♀️🌊💎🌙🪸🐠',
  '🧝🌲🏹🌙⭐🌿',
  '👸🏰💎👑✨🌹',
  '🧛🏚️🌑🌫️💀🦇',
  '🔮⚗️📜🕯️🏺🌙',
  '🧚🌺🍄✨🌸💫',
  // Space & sci-fi
  '🚀🪐👽🌌☄️💫',
  '🛸🌍⚡🌌🌑🌠',
  '🧑‍🚀🌕🚀⭐🌌💥',
  '🔭🌠🪐🌌💜☄️',
  '🤖🌆⚡🔮🌧️💨',
  // Urban & noir
  '🏍️🌃🌧️⚡🌆💨',
  '🕵️🌧️🌃🚗🌫️🔦',
  '🚗🌃🔥💨🌆⚡',
  '🥷🌃🗡️💨🌙🌫️',
  // Cozy & dreamy
  '🐱☕🌧️🕯️📖🏠',
  '🐻🍂🏕️🌙⭐🔥',
  '🦊🌸🍵📜🌙🌿',
  '🐶🏕️🌲⭐🔥🌌',
  // Japanese aesthetic
  '⛩️🌸🗻🎋🌙🦢',
  '🏯🌸🌧️⛩️🌙🎆',
  '🍣🌸🌊⛩️🗻✨',
  // Nature power
  '🌋🌊⚡🌪️💥☄️',
  '🌊🐳🌅🌈☀️💫',
  '🦋🌺🌈🌸☀️💫',
  '🌿🌲🌙🦉🌫️⭐',
  '🏞️🌄🦅🌲☀️💨',
  // Concert & music
  '🎸🔥🌃🎷💥🎆',
  '🥁🌪️🎸⚡🌩️💥',
  '🎹🕯️🌧️🎻🌙💜',
  // Weird mashups
  '🦁🍜🌃🔮💥⚡',
  '🐉☕🌆🧙‍♂️⚡🌧️',
  '🤖🌲🦋🔮🌌💜',
  '🐳🚀🌕🎸💫⭐',
  '🏍️🌋🌅🦅🔥💨',
  '🧜‍♀️🌌🪐💎🌊✨',
  '🦚⛩️🌸🌙💫🌿',
  '🦓🌋⚡💥🌅🔥',
  '🐊🏺⚡🌴☄️💥',
  '🧟🏚️🌑🌫️💀⚡',
  '👻🕯️🏰🌙🌫️🖤',
  // Surreal / unexpected
  '🎡🌙🎆🦋💫✨',
  '🐝🌸🌈☀️🌺💫',
  '🍕🌋🎸💥🔥⚡',
  '🧁🤖🌈⚡😈💥',
  '🦄💀🌃🔥⚡🌑',
  '🎪🌈🦋🎡💫🎆',
  '🦩🌅🌊🏖️☀️🌺',
  '🐙🌊🌑💎⚡🌌',
  '🍫🌋🔥⚡💥🌑',
  '🎭🌃🌫️🕯️🌙🖤',
  '🏄🌊⛈️⚡💥🌪️',
  '🧘🌌💫⭐🌙✨',
  '🚂💨🌅☁️🔥⭐',
  '⛵🌊🌅🦅☀️🌈',
  '🎅❄️🌌⭐🌨️✨',
  '🕌🌙⭐💫🌸🌌',
  '🗽⛈️🌊⚡🌌💥',
  '🦜🌴🍹🌅🌺☀️',
];

/* ── Core: emoji string → vivid, rich image-gen prompt ──────
   Strategy:
   1. Parse every emoji (not just first 4)
   2. Classify by semantic role: Subject / Environment / Atmosphere / Object / Mood
   3. Build a flowing, specific cinematic scene description using ALL elements
   4. Auto-detect visual style from dominant roles and pick matching quality tags
─────────────────────────────────────────────────────────── */
function buildPrompt(rawEmojis) {

  // Segment into individual grapheme clusters (handles ZWJ sequences like 🧙‍♂️)
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  const segments  = [...segmenter.segment(rawEmojis)]
    .map(s => s.segment.trim())
    .filter(Boolean);

  if (segments.length === 0) {
    return 'An eruption of iridescent abstract cosmic energy, swirling galaxies of impossible color and form, ' +
      'surreal dreamlike atmosphere, painterly brushwork, dynamic epic composition, intricate foreground detail, ' +
      'cinematic panoramic scale, award-winning concept art, deep rich saturated colors, 8k resolution';
  }

  // ── Resolve EVERY emoji — unknown ones get a creative per-emoji fallback ──
  // Nothing is ever dropped; every symbol contributes to the scene.
  const mapped = segments.map(e => {
    if (EMOJI_MAP[e]) return EMOJI_MAP[e];

    // Fallback by Unicode block so the description is at least category-appropriate
    const cp = e.codePointAt(0) || 0;
    if (cp >= 0x1F600 && cp <= 0x1F64F)
      return { r:'M', d:'a figure with a powerfully expressive and emotional presence' };
    if (cp >= 0x1F466 && cp <= 0x1F4FF)
      return { r:'O', d:'a symbolic glowing artifact radiating mysterious energy' };
    if (cp >= 0x1F900 && cp <= 0x1F9FF)
      return { r:'M', d:'a fantastical surreal element bending the laws of reality' };
    if (cp >= 0x2600  && cp <= 0x27FF)
      return { r:'A', d:'a mystical cosmic symbol pulsing with raw elemental power' };
    if (cp >= 0x1FA00 && cp <= 0x1FAFF)
      return { r:'O', d:'a strange otherworldly object crackling with vivid energy' };
    // Absolute fallback — still contributes to mood
    return { r:'M', d:'an inexplicable yet beautiful phenomenon shimmering with color' };
  });

  // ── Classify by role ──
  const subjects  = mapped.filter(e => e.r === 'S').map(e => e.d);
  const envs      = mapped.filter(e => e.r === 'E').map(e => e.d);
  const atmos     = mapped.filter(e => e.r === 'A').map(e => e.d);
  const moods     = mapped.filter(e => e.r === 'M').map(e => e.d);

  // ── Food/drink: never placed physically on subjects/vehicles ──
  // Treat as environmental context — they flavour the setting, not the subject.
  const allObjs   = mapped.filter(e => e.r === 'O').map(e => e.d);
  const foodDescs = mapped.filter(e => {
    if (e.r !== 'O') return false;
    return /coffee|tea|beer|wine|pizza|ramen|noodle|sushi|bento|donut|cake|cupcake|chocolate|strawberr|avocado|taco|stew|whiskey|cocktail|matcha|bubble tea|broth|bread|burger|pastry|chili|mushroom/.test(e.d);
  }).map(e => e.d);
  const propObjs  = allObjs.filter(d => !foodDescs.includes(d));

  // ── Assemble a rich narrative sentence ──
  const parts = [];

  // Opening — primary subject or first mapped element
  if (subjects.length > 0) {
    if (subjects.length === 1) {
      parts.push(capitalize(subjects[0]));
    } else {
      const [a, b, ...rest] = subjects;
      const together = rest.length > 0
        ? `${capitalize(a)}, ${b}, and ${rest.join(', ')}`
        : `${capitalize(a)} alongside ${b}`;
      parts.push(together);
    }
  } else {
    parts.push(capitalize(mapped[0].d));
  }

  // Setting / environment
  if (envs.length === 1) {
    parts.push(`set within ${envs[0]}`);
  } else if (envs.length === 2) {
    parts.push(`amid ${envs[0]} and ${envs[1]}`);
  } else if (envs.length >= 3) {
    parts.push(`surrounded by ${envs.slice(0, -1).join(', ')} and ${envs[envs.length - 1]}`);
  }

  // Non-food props / objects
  if (propObjs.length === 1) {
    parts.push(`featuring ${propObjs[0]}`);
  } else if (propObjs.length >= 2) {
    parts.push(`with ${propObjs.slice(0, -1).join(', ')} and ${propObjs[propObjs.length - 1]}`);
  }

  // Food & drink — woven into the environmental atmosphere, never placed ON subjects
  if (foodDescs.length === 1) {
    if (subjects.length > 0 && envs.length > 0) {
      parts.push(`the air thick with the aroma of ${foodDescs[0]}, visible as background detail in the scene`);
    } else if (subjects.length > 0) {
      parts.push(`in an environment richly detailed with ${foodDescs[0]} as a key atmospheric element`);
    } else {
      parts.push(`centered on ${foodDescs[0]} as the hero of the composition`);
    }
  } else if (foodDescs.length >= 2) {
    const foodList = foodDescs.slice(0, -1).join(', ') + ' and ' + foodDescs[foodDescs.length - 1];
    parts.push(`surrounded by the vibrant culinary atmosphere of ${foodList}, styled as environmental texture and backdrop detail`);
  }

  // Atmosphere / weather
  if (atmos.length === 1) {
    parts.push(`under ${atmos[0]}`);
  } else if (atmos.length >= 2) {
    parts.push(`while ${atmos.slice(0, -1).join(', ')} and ${atmos[atmos.length - 1]} fill the scene`);
  }

  // Mood / tone
  if (moods.length > 0) {
    parts.push(`infused with ${moods.join(' and ')}`);
  }

  const sceneSentence = parts.join(', ');

  // ── Auto-select style descriptor based on dominant roles ──
  const styleTag = detectStyle(subjects, envs, atmos, propObjs.concat(foodDescs), moods);

  // ── Quality booster — always substantial, Flux-optimised ──
  const quality = [
    'extremely detailed',
    'rich saturated colors',
    'cinematic dramatic lighting with deep shadows and brilliant highlights',
    'intricate textures and fine detail in every element',
    'professional concept art',
    'epic composition',
    'hyperrealistic rendering',
    '8k ultra high resolution',
    'award-winning digital illustration',
  ].join(', ');

  return `${sceneSentence}, ${styleTag}, ${quality}`;
}

/* ── Style auto-detector: picks evocative artistic direction ─ */
function detectStyle(subjects, envs, atmos, objects, moods) {
  const all = [...subjects, ...envs, ...atmos, ...objects, ...moods].join(' ');

  if (/dragon|wizard|sorcere|elf|fairy|mermaid|castle|unicorn|enchant|rune|magic|ghost|vampire/.test(all))
    return 'epic high fantasy oil painting style, dark and luminous like a Frank Frazetta masterpiece';

  if (/robot|neon|cyber|city at night|tesla|chrome|circuit|android|sci.fi/.test(all))
    return 'cyberpunk neon-noir aesthetic, rain-soaked reflective streets, blade runner atmosphere';

  if (/space|galaxy|nebula|rocket|planet|astronaut|comet|orbit|cosmos/.test(all))
    return 'deep space concept art, NASA-quality astrophotography blended with painterly illustration';

  if (/volcano|erupting|lava|lightning|tornado|explosion|thunder|storm/.test(all))
    return 'dramatic disaster epic painting, elemental fury at maximum intensity, Turner-esque drama';

  if (/ocean|wave|whale|mermaid|dolphin|coral|sea turtle|underwater/.test(all))
    return 'luminous aquatic illustration, sunlight refracted through water, National Geographic quality';

  if (/cat|dog|coffee|cozy|cottage|book|candle|rain/.test(all))
    return 'warm intimate illustration style, soft glowing light, painterly Studio Ghibli warmth';

  if (/japan|shrine|torii|mount fuji|bento|sushi|cherry blossom|bamboo/.test(all))
    return 'Japanese woodblock print meets modern anime illustration, delicate linework, Makoto Shinkai color palette';

  if (/desert|safari|lion|elephant|savanna|giraffe|zebra|dunes/.test(all))
    return 'sweeping wildlife photography realism, golden hour light, BBC Planet Earth cinematography';

  if (/concert|guitar|drum|music|festival|crowd|stage/.test(all))
    return 'high energy concert photography aesthetic, lens flare, smoke machines, electric atmosphere';

  if (/autumn|fog|wolf|owl|forest|night|moon/.test(all))
    return 'atmospheric dark fantasy illustration, muted earth tones with selective glowing color, N.C. Wyeth drama';

  // Default: lush rich illustration
  return 'lush painterly digital illustration with vibrant palette and masterful light and shadow';
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
