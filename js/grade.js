// Forgiving answer marking for typed and tile answers.

const PUNCT = /[.,!?¿¡;:"“”«»'’()…]/g;
const ARTICLES = new Set(['o', 'a', 'os', 'as', 'um', 'uma']);

/** Lowercase, unify hyphens/spaces, drop punctuation. Keeps accents. */
export function normalize(s) {
  return (s || '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/[‐-―-]/g, ' ')
    .replace(PUNCT, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** normalize() and also remove accents/cedilla (ã → a, ç → c). */
export function stripAccents(s) {
  return normalize(s).normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC');
}

export function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

function typoAllowance(len) {
  if (len < 4) return 0;
  if (len <= 8) return 1;
  return 2;
}

function dropLeadingArticle(s) {
  const w = s.split(' ');
  return w.length > 1 && ARTICLES.has(w[0]) ? w.slice(1).join(' ') : s;
}

/**
 * Grade `input` against acceptable `answers`.
 * Returns { result: 'correct' | 'accent' | 'almost' | 'wrong', answer, reason }
 *  - correct: exact (ignoring case/punctuation)
 *  - accent:  right apart from accents → still counts as correct, with a note
 *  - almost:  small typo, or missing the article → partial credit
 */
export function grade(input, answers) {
  const inN = normalize(input);
  const inS = stripAccents(input);
  if (!inN) return { result: 'wrong', answer: answers[0], reason: 'empty' };

  for (const a of answers) if (normalize(a) === inN) return { result: 'correct', answer: a };
  for (const a of answers) if (stripAccents(a) === inS) return { result: 'accent', answer: a, reason: 'accent' };

  let best = null;
  for (const a of answers) {
    const aS = stripAccents(a);
    if (dropLeadingArticle(aS) === inS && aS !== inS) {
      return { result: 'almost', answer: a, reason: 'article' };
    }
    const dist = levenshtein(inS, aS);
    if (!best || dist < best.dist) best = { a, dist, aS };
  }
  if (best && best.dist <= typoAllowance(best.aS.length)) {
    return { result: 'almost', answer: best.a, reason: 'typo' };
  }
  return { result: 'wrong', answer: best ? best.a : answers[0] };
}

/**
 * Word-level diff for display: returns the answer's words, each flagged
 * ok=true if the learner produced it (ignoring accents) in the right order.
 */
export function diffWords(input, answer) {
  const A = normalize(answer).split(' ');
  const As = A.map((w) => stripAccents(w));
  const B = stripAccents(input).split(' ').filter(Boolean);
  // LCS table
  const L = Array.from({ length: A.length + 1 }, () => new Array(B.length + 1).fill(0));
  for (let i = A.length - 1; i >= 0; i--) {
    for (let j = B.length - 1; j >= 0; j--) {
      L[i][j] = As[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    }
  }
  const out = [];
  let i = 0, j = 0;
  while (i < A.length) {
    if (j < B.length && As[i] === B[j]) { out.push({ w: A[i], ok: true }); i++; j++; }
    else if (j < B.length && L[i][j + 1] >= L[i + 1][j]) { j++; }
    else { out.push({ w: A[i], ok: false }); i++; }
  }
  return out;
}

/** Rating for the scheduler from a marking result. */
export function ratingFor(result) {
  if (result === 'correct' || result === 'accent') return 3; // Good
  if (result === 'almost') return 2; // Hard
  return 1; // Again
}
