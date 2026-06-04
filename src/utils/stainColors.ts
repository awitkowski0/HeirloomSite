const STAIN_COLORS: Record<string, string> = {
  natural: '#DEB887',
  slate: '#5A6064',
  smoke: '#3b3c36',
  cherry: '#651c14',
  driftwood: '#a39887',
  walnut: '#5C4033',
  ebony: '#3B3B3B',
  mahogany: '#4A2C2A',
  oak: '#B89B72',
  maple: '#DEB887',
  espresso: '#2C1E16',
  white: '#F5F5F0',
  grey: '#8C8C8C',
  gray: '#8C8C8C',
  black: '#2D2D2D',
  antique: '#8B7355',
  frost: '#E8E4DF',
  fruitwood: '#C4A265',
  harvest: '#9B7B3E',
  provincial: '#8B6F47',
  seely: '#C4956A',
  washington: '#A0928B',
  mx: '#9B8B7A',
};

export function getStainColor(name: string): string {
  const n = name.toLowerCase();
  for (const [key, color] of Object.entries(STAIN_COLORS)) {
    if (n.includes(key)) return color;
  }
  return '#8B4513';
}
