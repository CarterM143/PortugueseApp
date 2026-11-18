// Course content: European Portuguese (pt-PT), units 1–5 + ear training.
// Units 6–10 live in content-a1.js and 11–20 in content-a2.js.
//
// Item fields:
//   pt      the Portuguese (what you learn to produce)
//   en      meaning shown to the learner
//   accept  other Portuguese answers that also count as right
//   note    short tip shown when the item is introduced / reviewed
//   lesson  id of a grammar lesson to show before this item is first introduced
//
// IDs are derived from unit + Portuguese text, so editing `pt` resets that item's progress.

import { UNITS_6_10 } from './content-a1.js';
import { UNITS_11_20 } from './content-a2.js';

function slug(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function unit(n, title, subtitle, items, lessons = []) {
  return {
    n, title, subtitle, lessons,
    items: items.map(([pt, en, opts = {}]) => ({
      id: `u${n}-${slug(pt)}`, kind: 'vocab', unit: n, pt, en, accept: [], ...opts,
    })),
  };
}

export const UNITS = [
  unit(1, 'Olá!', 'Greetings and politeness', [
    ['olá', 'hello', { lesson: 'u1-you' }],
    ['bom dia', 'good morning'],
    ['boa tarde', 'good afternoon'],
    ['boa noite', 'good evening / good night'],
    ['adeus', 'goodbye'],
    ['até logo', 'see you later'],
    ['até amanhã', 'see you tomorrow'],
    ['tchau', 'bye (casual)', { accept: ['xau', 'chau'] }],
    ['por favor', 'please'],
    ['obrigado', 'thank you', { accept: ['obrigada'], lesson: 'u1-obrigado', note: 'Men say obrigado, women say obrigada.' }],
    ['muito obrigado', 'thank you very much', { accept: ['muito obrigada'] }],
    ['de nada', "you're welcome"],
    ['desculpe', 'sorry / excuse me (polite)', { accept: ['desculpa'], note: 'Desculpa is the informal (tu) version.' }],
    ['com licença', 'excuse me (to get past)'],
    ['sim', 'yes'],
    ['não', 'no', { note: 'The ão is nasal — say "ow" through your nose.' }],
    ['tudo bem?', "how's it going? / all good?"],
    ['tudo bem, obrigado', 'all good, thanks', { accept: ['tudo bem, obrigada'] }],
    ['como está?', 'how are you? (polite)'],
    ['como estás?', 'how are you? (informal)'],
    ['estou bem', "I'm fine"],
    ['mais ou menos', 'so-so'],
    ['e tu?', 'and you? (informal)'],
    ['e você?', 'and you? (polite)', { accept: ['e o senhor?', 'e a senhora?'] }],
    ['pode repetir, por favor?', 'can you repeat that, please?'],
    ['mais devagar, por favor', 'more slowly, please'],
    ['não percebo', "I don't understand", { note: 'Portugal says perceber. Brazil says entender.' }],
    ['fala inglês?', 'do you speak English? (polite)'],
    ['não sei', "I don't know"],
    ['com certeza', 'certainly / of course'],
  ], [
    {
      id: 'u1-you', title: 'Three ways to say "you"',
      body: `<p>Portugal has three levels of "you":</p>
<ul><li><b>tu</b>: friends, family, children. <i>Como estás?</i></li>
<li><b>você</b>: neutral, but it can sound blunt said directly to someone.</li>
<li><b>o senhor / a senhora</b>: polite, for older people and in shops.</li></ul>
<p>Tip: Portuguese people often just <b>drop the pronoun</b>: <i>Como está?</i> is polite and always safe.</p>`,
    },
    {
      id: 'u1-obrigado', title: 'Obrigado or obrigada?',
      body: `<p><i>Obrigado</i> literally means "obliged", so it matches <b>the person speaking</b>:</p>
<ul><li>a man says <b>obrigado</b></li><li>a woman says <b>obrigada</b></li></ul>
<p>Both are accepted in this app.</p>`,
    },
  ]),

  unit(2, 'Apresentações', 'Introducing yourself', [
    ['eu', 'I'],
    ['tu', 'you (informal)'],
    ['você', 'you (polite)'],
    ['ele', 'he'],
    ['ela', 'she'],
    ['nós', 'we'],
    ['eles', 'they (male or mixed)'],
    ['elas', 'they (all female)'],
    ['sou', 'I am', { lesson: 'u2-ser' }],
    ['és', 'you are (tu)'],
    ['é', 'he / she is, you are (você)'],
    ['somos', 'we are'],
    ['são', 'they are'],
    ['como se chama?', "what's your name? (polite)", { lesson: 'u2-chamo-me' }],
    ['como te chamas?', "what's your name? (informal)"],
    ['chamo-me Ana', 'my name is Ana', { accept: ['eu chamo-me Ana'] }],
    ['muito prazer', 'nice to meet you', { accept: ['prazer'] }],
    ['de onde é?', 'where are you from? (polite)'],
    ['de onde és?', 'where are you from? (informal)'],
    ['sou de Lisboa', "I'm from Lisbon", { accept: ['eu sou de Lisboa'] }],
    ['sou inglês', "I'm English", { accept: ['sou inglesa', 'eu sou inglês', 'eu sou inglesa'], note: 'A woman says sou inglesa.' }],
    ['sou português', "I'm Portuguese", { accept: ['sou portuguesa'], note: 'A woman says sou portuguesa.' }],
    ['onde mora?', 'where do you live? (polite)'],
    ['moro em Lisboa', 'I live in Lisbon', { accept: ['eu moro em Lisboa'] }],
    ['moro no Porto', 'I live in Porto', { accept: ['eu moro no Porto'], note: 'em + o = no. The city is "o Porto".' }],
    ['o que faz?', 'what do you do? (job, polite)'],
    ['sou estudante', "I'm a student", { accept: ['eu sou estudante'] }],
    ['trabalho num escritório', 'I work in an office', { note: 'em + um = num' }],
    ['falo um pouco de português', 'I speak a little Portuguese'],
    ['estou a aprender português', "I'm learning Portuguese", { lesson: 'u2-estar-a' }],
    ['este é o meu amigo', 'this is my friend (male)'],
    ['esta é a minha amiga', 'this is my friend (female)'],
  ], [
    {
      id: 'u2-ser', title: 'Ser: "to be" (who or what you are)',
      body: `<table class="conj"><tr><td>eu</td><td><b>sou</b></td><td>I am</td></tr>
<tr><td>tu</td><td><b>és</b></td><td>you are</td></tr>
<tr><td>ele / ela / você</td><td><b>é</b></td><td>he / she is, you are</td></tr>
<tr><td>nós</td><td><b>somos</b></td><td>we are</td></tr>
<tr><td>eles / elas</td><td><b>são</b></td><td>they are</td></tr></table>
<p>Use <b>ser</b> for identity: name, nationality, job. <i>Sou estudante.</i></p>
<p>The pronoun is often dropped, because the verb already says who: <i>Sou de Lisboa.</i></p>`,
    },
    {
      id: 'u2-chamo-me', title: 'Chamo-me: the pronoun goes after the verb',
      body: `<p>To say your name, you say "I call myself": <b>Chamo-me Ana.</b></p>
<p>In Portugal the little pronoun (<i>me, te, se</i>) normally goes <b>after</b> the verb, joined with a hyphen.</p>
<p>In questions with a question word it moves in front: <i>Como <b>te</b> chamas?</i> · <i>Como <b>se</b> chama?</i></p>
<p>You'll hear <i>Me chamo</i> in Brazilian media, but in Portugal it sounds wrong.</p>`,
    },
    {
      id: 'u2-estar-a', title: 'Estar a + verb: "I am doing"',
      body: `<p>For something happening right now, Portugal uses <b>estar a</b> + the basic verb:</p>
<p><i>Estou a aprender português.</i> I'm learning Portuguese.</p>
<p>(Brazil says <i>estou aprendendo</i>. Avoid that form in Portugal.)</p>`,
    },
  ]),

  unit(3, 'Números e preços', 'Numbers and prices', [
    ['um', '1', { accept: ['uma'], lesson: 'u3-gender-numbers', note: 'um café, uma água' }],
    ['dois', '2', { accept: ['duas'], note: 'dois cafés, duas águas' }],
    ['três', '3'],
    ['quatro', '4'],
    ['cinco', '5'],
    ['seis', '6'],
    ['sete', '7'],
    ['oito', '8'],
    ['nove', '9'],
    ['dez', '10'],
    ['onze', '11'],
    ['doze', '12'],
    ['treze', '13'],
    ['catorze', '14', { accept: ['quatorze'] }],
    ['quinze', '15'],
    ['dezasseis', '16', { lesson: 'u3-teens', note: 'Portugal: dezasseis. Brazil: dezesseis.' }],
    ['dezassete', '17'],
    ['dezoito', '18'],
    ['dezanove', '19'],
    ['vinte', '20'],
    ['vinte e um', '21'],
    ['trinta', '30'],
    ['quarenta', '40'],
    ['cinquenta', '50'],
    ['cem', '100'],
    ['quanto custa?', 'how much does it cost?', { lesson: 'u3-prices' }],
    ['quanto é?', 'how much is it? (the total)'],
    ['são cinco euros', "that's five euros"],
    ['é um euro', "it's one euro"],
    ['cinco euros e cinquenta', 'five euros fifty (€5.50)'],
    ['a conta, por favor', 'the bill, please'],
    ['posso pagar com cartão?', 'can I pay by card?'],
    ['quantos anos tem?', 'how old are you? (polite)'],
    ['tenho trinta anos', "I'm thirty (years old)", { note: 'Literally "I have thirty years".' }],
  ], [
    {
      id: 'u3-gender-numbers', title: 'One and two change with gender',
      body: `<p>Only these two numbers have masculine and feminine forms:</p>
<ul><li><b>um</b> café · <b>uma</b> água</li><li><b>dois</b> cafés · <b>duas</b> águas</li></ul>`,
    },
    {
      id: 'u3-teens', title: 'Sixteen to nineteen',
      body: `<p>These are "ten-and-six" and so on, spelled the <b>Portugal</b> way:</p>
<p><b>dezasseis, dezassete, dezoito, dezanove</b></p>
<p>Brazil writes <i>dezesseis, dezessete, dezenove</i>.</p>`,
    },
    {
      id: 'u3-prices', title: 'Prices',
      body: `<p>Portugal writes prices with a comma: <b>5,50 €</b>.</p>
<p>Say it as <i>cinco euros e cinquenta</i>. "Cêntimos" is usually left out.</p>`,
    },
  ]),

  unit(4, 'No café', 'At the café', [
    ['um café', 'an espresso (coffee)', { accept: ['uma bica'], lesson: 'u4-queria', note: 'In Portugal "um café" means a short espresso.' }],
    ['uma bica', 'an espresso (Lisbon word)', { accept: ['um café'] }],
    ['um galão', 'a milky coffee in a glass'],
    ['uma meia de leite', 'a white coffee in a cup'],
    ['um chá', 'a tea'],
    ['uma água', 'a water', { lesson: 'u4-gender' }],
    ['com gás', 'sparkling (with gas)'],
    ['sem gás', 'still (without gas)'],
    ['um sumo de laranja', 'an orange juice', { note: 'Portugal says sumo. Brazil says suco.' }],
    ['uma cerveja', 'a beer'],
    ['uma imperial', 'a small draught beer (Lisbon)'],
    ['um copo de vinho tinto', 'a glass of red wine'],
    ['um pastel de nata', 'a custard tart'],
    ['uma torrada', 'a thick slice of buttered toast'],
    ['uma tosta mista', 'a toasted ham and cheese sandwich'],
    ['uma sandes', 'a sandwich', { note: 'Portugal says sandes. Brazil says sanduíche.' }],
    ['queria um café, por favor', "I'd like a coffee, please"],
    ['para mim, um chá', 'a tea for me'],
    ['mais alguma coisa?', 'anything else?'],
    ['é tudo, obrigado', "that's all, thanks", { accept: ['é tudo, obrigada'] }],
    ['para levar', 'to take away'],
    ['para comer aqui', 'to eat here'],
    ['com açúcar', 'with sugar'],
    ['sem açúcar', 'without sugar'],
    ['o pequeno-almoço', 'breakfast', { note: 'Portugal only. Brazil says café da manhã.' }],
    ['o almoço', 'lunch'],
    ['o jantar', 'dinner'],
    ['a ementa', 'the menu', { accept: ['o menu'], note: 'Portugal: ementa. Brazil: cardápio.' }],
    ['onde é a casa de banho?', "where's the toilet?", { note: 'Portugal: casa de banho. Brazil: banheiro.' }],
    ['está ótimo', "it's great / it's delicious", { accept: ['está óptimo'] }],
  ], [
    {
      id: 'u4-queria', title: 'Queria: "I\'d like"',
      body: `<p>To order politely in Portugal, say <b>Queria…</b>:</p>
<p><i>Queria um galão, por favor.</i></p>
<p>Literally it means "I wanted", but it's the standard polite way to ask. You'll also hear <i>Para mim, …</i> ("for me, …").</p>`,
    },
    {
      id: 'u4-gender', title: 'Every noun has a gender',
      body: `<p>Learn each noun <b>with its article</b>:</p>
<ul><li>masculine: <b>o</b> / <b>um</b> café</li><li>feminine: <b>a</b> / <b>uma</b> água</li></ul>
<p>Most words ending in <b>-o</b> are masculine and most ending in <b>-a</b> are feminine, but not all (<i>o dia</i>, "the day").</p>`,
    },
  ]),

  unit(5, 'A família', 'Family', [
    ['a família', 'the family'],
    ['o pai', 'the father'],
    ['a mãe', 'the mother', { note: 'ãe is nasal, a bit like "my" through your nose.' }],
    ['os pais', 'the parents', { note: 'pais (parents) ≠ país (country).' }],
    ['o filho', 'the son'],
    ['a filha', 'the daughter'],
    ['os filhos', 'the children (sons and daughters)'],
    ['o irmão', 'the brother'],
    ['a irmã', 'the sister'],
    ['os irmãos', 'the brothers / siblings'],
    ['o avô', 'the grandfather', { lesson: 'u5-avo', note: 'avô has a closed "oh" sound.' }],
    ['a avó', 'the grandmother', { note: 'avó has an open "aw" sound.' }],
    ['os avós', 'the grandparents'],
    ['o marido', 'the husband'],
    ['a mulher', 'the wife / the woman', { accept: ['a esposa'] }],
    ['o namorado', 'the boyfriend'],
    ['a namorada', 'the girlfriend'],
    ['o tio', 'the uncle'],
    ['a tia', 'the aunt'],
    ['o primo', 'the cousin (male)'],
    ['a prima', 'the cousin (female)'],
    ['o bebé', 'the baby', { note: 'Portugal: bebé. Brazil: bebê.' }],
    ['o meu pai', 'my father', { lesson: 'u5-meu' }],
    ['a minha mãe', 'my mother'],
    ['os meus irmãos', 'my brothers / my siblings'],
    ['tens irmãos?', 'do you have brothers or sisters? (informal)'],
    ['tenho um irmão e uma irmã', 'I have a brother and a sister'],
    ['não tenho filhos', "I don't have children"],
    ['o meu pai chama-se João', 'my father is called João'],
    ['a minha mãe é professora', 'my mother is a teacher', { note: 'No "a" before jobs: é professora.' }],
    ['somos quatro', 'there are four of us'],
    ['é casado?', 'are you married? (polite, to a man)', { accept: ['é casada?'] }],
    ['sou solteiro', "I'm single", { accept: ['sou solteira'], note: 'A woman says sou solteira.' }],
  ], [
    {
      id: 'u5-meu', title: 'My: o meu, a minha',
      body: `<p>"My" agrees with <b>the thing owned</b>, not with you:</p>
<ul><li><b>o meu</b> pai · <b>os meus</b> irmãos</li><li><b>a minha</b> mãe · <b>as minhas</b> irmãs</li></ul>
<p>In Portugal you normally keep the article: <i><b>o</b> meu pai</i>.</p>`,
    },
    {
      id: 'u5-avo', title: 'Avô or avó?',
      body: `<p>The accent marks change the vowel sound:</p>
<ul><li><b>avô</b> (ô is a closed "oh"): grandfather</li><li><b>avó</b> (ó is an open "aw"): grandmother</li></ul>
<p>Listen closely to the difference. You'll practise it in ear training too.</p>`,
    },
  ]),

  ...[...UNITS_6_10, ...UNITS_11_20].map((u) => unit(u.n, u.title, u.subtitle, u.items, u.lessons)),
];

/** CEFR level a unit aims at (shown on the units screen and used by the tutor). */
export const levelOf = (n) => (n <= 10 ? 'A1' : 'A2');

// ---- Ear training (perception) ----
// pair:   hear one of two similar words, pick which one
// stress: hear a word, tap the stressed syllable

const pair = (a, aEn, b, bEn, note) => ({
  id: `ear-${slug(a)}-${slug(b)}`, kind: 'pair', unit: 0,
  a: { pt: a, en: aEn }, b: { pt: b, en: bEn }, note,
  pt: `${a} / ${b}`, en: `${aEn} / ${bEn}`,
});

const stress = (syl, idx, en) => ({
  id: `stress-${slug(syl.join(''))}`, kind: 'stress', unit: 0,
  syl, stress: idx, pt: syl.join(''), en,
});

export const EAR = [
  pair('avô', 'grandfather', 'avó', 'grandmother', 'ô is closed ("oh"); ó is open ("aw").'),
  pair('pais', 'parents', 'país', 'country', 'país has two syllables, pa-ÍS.'),
  pair('esta', 'this', 'está', 'is', 'esta has stress on E; está on TÁ.'),
  pair('mas', 'but', 'mais', 'more', 'mais has an "eye" sound: "my-sh".'),
  pair('pão', 'bread', 'pau', 'stick', 'pão is nasal; pau is not.'),
  pair('mão', 'hand', 'mau', 'bad', 'mão is nasal; mau is not.'),
  pair('novo', 'new (m.)', 'nova', 'new (f.)', 'novo: closed o, ending "oo". nova: open o, ending "uh".'),
  pair('bebe', 'drinks', 'bebé', 'baby', 'bebe: stress on the first syllable. bebé: on the last.'),
  pair('três', 'three', 'treze', 'thirteen'),
  pair('dois', 'two', 'doze', 'twelve'),
  pair('dezasseis', 'sixteen', 'dezassete', 'seventeen'),
  pair('sabia', 'knew', 'sábia', 'wise (f.)', 'Same letters, different stress: sa-BI-a vs SÁ-bia.'),
  stress(['ca', 'fé'], 1, 'coffee'),
  stress(['o', 'bri', 'ga', 'do'], 2, 'thank you'),
  stress(['pe', 'que', 'no'], 1, 'small'),
  stress(['te', 'le', 'mó', 'vel'], 2, 'mobile phone'),
  stress(['a', 'ma', 'nhã'], 2, 'tomorrow'),
  stress(['au', 'to', 'car', 'ro'], 2, 'bus'),
  stress(['Por', 'tu', 'gal'], 2, 'Portugal'),
  stress(['a', 'çú', 'car'], 1, 'sugar'),
  stress(['mé', 'di', 'co'], 0, 'doctor'),
  stress(['fá', 'cil'], 0, 'easy'),
  stress(['ra', 'pa', 'ri', 'ga'], 2, 'girl'),
  stress(['Lis', 'bo', 'a'], 1, 'Lisbon'),
];

export const ALL_ITEMS = [...UNITS.flatMap((u) => u.items), ...EAR];
export const ITEM_BY_ID = new Map(ALL_ITEMS.map((i) => [i.id, i]));
export const LESSON_BY_ID = new Map(UNITS.flatMap((u) => u.lessons).map((l) => [l.id, l]));
