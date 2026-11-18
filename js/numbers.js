// Numbers in European Portuguese words, for the Números game. Pure functions.
// Spelling follows Portugal: dezasseis, dezassete, dezanove; "e" between hundreds, tens and units.

const UNITS = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
  'dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezasseis', 'dezassete', 'dezoito', 'dezanove'];
const TENS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const HUNDREDS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
const FEM = { um: 'uma', dois: 'duas', duzentos: 'duzentas', trezentos: 'trezentas', quatrocentos: 'quatrocentas', quinhentos: 'quinhentas', seiscentos: 'seiscentas', setecentos: 'setecentas', oitocentos: 'oitocentas', novecentos: 'novecentas' };

function below1000(n) {
  if (n < 20) return UNITS[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? ` e ${UNITS[n % 10]}` : '');
  if (n === 100) return 'cem';
  return HUNDREDS[Math.floor(n / 100)] + (n % 100 ? ` e ${below1000(n % 100)}` : '');
}

/** 0 … 999 999 in words. feminine: for counting feminine nouns (uma, duas, duzentas…). */
export function numberToPt(n, { feminine = false } = {}) {
  if (!Number.isInteger(n) || n < 0 || n > 999999) throw new RangeError(`out of range: ${n}`);
  let words;
  if (n < 1000) words = below1000(n);
  else {
    const th = Math.floor(n / 1000);
    const rest = n % 1000;
    const head = th === 1 ? 'mil' : `${below1000(th)} mil`;
    // "e" joins the last group when it is under 100 or a round hundred: mil e cinco, mil e duzentos
    words = !rest ? head : `${head}${rest < 100 || rest % 100 === 0 ? ' e ' : ' '}${below1000(rest)}`;
  }
  if (feminine) words = words.split(' ').map((w) => FEM[w] || w).join(' ');
  return words;
}

/** A price as people say it: "três euros e cinquenta (cêntimos)". cents: 0 … 99 999 */
export function priceToPt(cents) {
  const e = Math.floor(cents / 100);
  const c = cents % 100;
  const euros = e === 0 ? '' : `${numberToPt(e)} ${e === 1 ? 'euro' : 'euros'}`;
  const cent = c === 0 ? '' : `${numberToPt(c)} ${c === 1 ? 'cêntimo' : 'cêntimos'}`;
  if (euros && cent) return `${euros} e ${cent}`;
  return euros || cent || 'zero euros';
}

/** Price as written: 3,50 € */
export const priceDigits = (cents) => `${Math.floor(cents / 100)},${String(cents % 100).padStart(2, '0')} €`;

/** A Portuguese mobile number, read in three groups of three: "novecentos e doze, …" */
export function phoneToPt(digits) {
  return digits.match(/\d{3}/g).map((g) => {
    // Leading zeros are read as digits: 045 → "zero quarenta e cinco"
    const lead = g.match(/^0+/)?.[0].length || 0;
    const rest = g.slice(lead);
    return [...Array(Math.min(lead, 3)).fill('zero'), ...(rest ? [numberToPt(Number(rest))] : [])].join(' ');
  }).join(', ');
}

/** Typed answer → comparable string: keeps digits, treats . and , alike, ignores €, spaces. */
export function normalizeNumberAnswer(s) {
  return String(s).replace(/[€\s]/g, '').replace('.', ',').replace(/^0+(?=\d)/, '').replace(/,(\d)$/, ',$10');
}
