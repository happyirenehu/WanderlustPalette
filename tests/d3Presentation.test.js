import fs from 'fs';
import path from 'path';

const homeSource = fs.readFileSync(path.join(__dirname, '..', 'screens', 'HomeScreen.js'), 'utf8');
const signatureSource = fs.readFileSync(path.join(__dirname, '..', 'screens', 'SignatureScreen.js'), 'utf8');

describe('D3 presentation boundaries', () => {
  test('Journey atmosphere is local and cannot persist a global palette theme', () => {
    expect(homeSource).not.toContain('@wanderlust_palette/active_theme');
    expect(homeSource).not.toContain('onSelectTheme');
    expect(signatureSource).not.toContain('onSelectTheme');
    expect(homeSource).toContain('getContrastColor(localAccent)');
    expect(homeSource).toContain('backgroundColor: localAccent');
  });

  test('Journey cards preserve an image-first cover presentation with a palette fallback', () => {
    expect(homeSource).toContain('renderJourneyCover(journey, styles.image)');
    expect(homeSource).toContain('styles.journeyPaletteCover');
  });
});
