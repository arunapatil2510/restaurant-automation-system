/**
 * RESTOSMART Culinary Placeholder Generator
 * Provides graceful, themed vector placeholders when dish images are missing or fail to load.
 * Avoids misrepresenting dishes with unrelated food photographs.
 */

const CATEGORY_THEMES = {
  starters: {
    gradient: ['#1e140a', '#3d2314', '#e76f51'],
    icon: '🍲',
    label: 'Starters & Appetizers'
  },
  maincourse: {
    gradient: ['#141914', '#1b382b', '#2a9d8f'],
    icon: '🍛',
    label: 'Main Course'
  },
  biryani: {
    gradient: ['#231508', '#42240c', '#e9c46a'],
    icon: '🍚',
    label: 'Biryani & Rice'
  },
  beverages: {
    gradient: ['#121820', '#1b2838', '#457b9d'],
    icon: '☕',
    label: 'Beverages'
  },
  desserts: {
    gradient: ['#220d19', '#3f182d', '#e63946'],
    icon: '🍨',
    label: 'Desserts & Sweets'
  },
  default: {
    gradient: ['#18181b', '#27272a', '#3f3f46'],
    icon: '🍽️',
    label: 'RESTOSMART Special'
  }
};

/**
 * Generate a high-contrast, elegant SVG data URI for a dish
 * @param {string} dishName - Name of the dish
 * @param {string} categorySlug - Category identifier
 * @param {string} type - 'veg' or 'nonveg'
 * @returns {string} SVG Data URI
 */
export const getCulinaryPlaceholder = (dishName = 'Delicious Dish', categorySlug = 'default', type = 'veg') => {
  const theme = CATEGORY_THEMES[categorySlug?.toLowerCase()] || CATEGORY_THEMES.default;
  const isVeg = type?.toLowerCase() === 'veg';
  const badgeColor = isVeg ? '#22c55e' : '#ef4444';
  const badgeText = isVeg ? 'VEG' : 'NON-VEG';
  const sanitizedName = String(dishName).replace(/[<>&"]/g, '');
  const [c1, c2, accent] = theme.gradient;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%" height="100%">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${c1}" />
        <stop offset="60%" stop-color="${c2}" />
        <stop offset="100%" stop-color="${c1}" />
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="40%" r="50%">
        <stop offset="0%" stop-color="${accent}" stop-opacity="0.25" />
        <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
      </radialGradient>
      <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
        <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1" />
      </pattern>
    </defs>

    <rect width="600" height="400" fill="url(#bg)" />
    <rect width="600" height="400" fill="url(#glow)" />
    <rect width="600" height="400" fill="url(#grid)" />

    <!-- Center category icon circle -->
    <circle cx="300" cy="150" r="54" fill="rgba(0,0,0,0.4)" stroke="${accent}" stroke-width="2" stroke-opacity="0.4" />
    <text x="300" y="165" font-size="44" text-anchor="middle" dominant-baseline="middle">${theme.icon}</text>

    <!-- Dietary Type Indicator -->
    <g transform="translate(300, 230)">
      <rect x="-42" y="-12" width="84" height="24" rx="12" fill="rgba(0,0,0,0.5)" stroke="${badgeColor}" stroke-width="1.5" />
      <circle cx="-24" cy="0" r="4.5" fill="${badgeColor}" />
      <text x="6" y="4" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" letter-spacing="0.5" text-anchor="middle">${badgeText}</text>
    </g>

    <!-- Dish Title -->
    <text x="300" y="280" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="700" text-anchor="middle">
      ${sanitizedName.length > 28 ? sanitizedName.substring(0, 26) + '...' : sanitizedName}
    </text>

    <!-- Subtitle / Brand -->
    <text x="300" y="315" fill="rgba(255,255,255,0.6)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="500" letter-spacing="1" text-anchor="middle">
      ${theme.label.toUpperCase()} • RESTOSMART
    </text>

    <!-- Subtle bottom decorative line -->
    <line x1="220" y1="340" x2="380" y2="340" stroke="${accent}" stroke-width="2" stroke-opacity="0.6" stroke-linecap="round" />
  </svg>`;

  return `data:image/svg+xml;utf-8,${encodeURIComponent(svg)}`;
};

/**
 * Handle image loading failure by replacing src with culinary placeholder
 */
export const handleDishImageError = (event, dish = {}) => {
  if (!event || !event.target) return;
  event.target.onerror = null;
  event.target.src = getCulinaryPlaceholder(dish.name, dish.categorySlug, dish.type);
};
