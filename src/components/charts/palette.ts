// Validated colour-blind-safe categorical palette (see dataviz skill validator).
// Slot 1 is brand azure; slots 2-4 are drawn from the skill's validated
// default ramp so lightness varies across series, not just hue.
// All adjacent/all-pairs CVD and lightness-band checks pass in both modes.
export const CHART_COLORS_LIGHT = ['#0057B7', '#eb6834', '#1baf7a', '#eda100'] as const;
export const CHART_COLORS_DARK = ['#3987e5', '#d95926', '#199e70', '#c98500'] as const;

export const CHART_INK_LIGHT = { primary: '#111418', secondary: '#6b7280', grid: '#e6e5e0' };
export const CHART_INK_DARK = { primary: '#f3f4f6', secondary: '#9aa1ac', grid: '#2b2f36' };

export function isDarkMode(): boolean {
  const stamp = document.documentElement.getAttribute('data-theme');
  if (stamp === 'dark') return true;
  if (stamp === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function chartPalette() {
  const dark = isDarkMode();
  return {
    colors: dark ? CHART_COLORS_DARK : CHART_COLORS_LIGHT,
    ink: dark ? CHART_INK_DARK : CHART_INK_LIGHT,
  };
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
