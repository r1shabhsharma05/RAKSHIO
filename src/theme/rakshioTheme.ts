import { defineTheme } from '@astryxdesign/core/theme';
import { neutralTheme } from '@astryxdesign/theme-neutral/built';

// RAKSHIO theme: the Calm Mode palette, as an Astryx theme. The app's own
// CSS already speaks sky-blue (#0369a1 on #f0f9ff); the neutral theme made
// library primitives render warm-gray, so secondary buttons read as
// disabled and the screens looked like two products. This re-seats the
// accent on the Calm primary (HCT generates the scale, on-accent included)
// and tints surfaces to match — nothing else about the theme changes.
export const rakshioTheme = defineTheme({
  name: 'rakshio',
  extends: neutralTheme,
  color: { accent: '#0369a1', neutralStyle: 'cool', contrast: 'standard' },
  tokens: {
    '--color-background-surface': '#f0f9ff',
    '--color-background-card': '#ffffff',
  },
  components: {
    button: {
      // Secondary must look tappable, not disabled: Calm tint + dark text.
      'variant:secondary': {
        backgroundColor: '#e0f2fe',
        color: '#0c4a6e',
      },
    },
  },
});
