export function pluralizeUkrainian(count: number, forms: [string, string, string]) {
    const n = Math.abs(count) % 100;
    const n1 = n % 10;
    if (n > 10 && n < 20) return forms[2];
    if (n1 === 1 && n !== 11) return forms[0];
    if (n1 > 1 && n1 < 5 && (n < 10 || n > 20)) return forms[1];
    return forms[2];
}
