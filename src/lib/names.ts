/* "Fisher's Quality Products" reads as "Fisher's" in a credit line. */
export function shortBuilderName(name: string): string {
  return name.replace(/\s+(Quality Products|Furniture|Woodworking|Woodcraft|LLC|Inc\.?)$/i, '');
}

/* "Fisher's" stays as it is; "Old Town Oak" becomes "Old Town Oak's". */
export function possessive(name: string): string {
  return /['’]s$/i.test(name) || /s$/i.test(name) ? `${name.replace(/'/g, '’')}${/['’]s$/i.test(name) ? '' : '’'}` : `${name}’s`;
}

const FINISH_NAMES: Readonly<Record<string, string>> = {
  mx: 'MX',
  sealy: 'Seely',
  "michael's cherry": 'Michaels Cherry',
};

export function finishDisplayName(name: string): string {
  return FINISH_NAMES[name.trim().toLowerCase()] ?? name;
}
