// "Para ela": the Reveal Day pack. Words for her, for her family, and for the big reveal.
// Mixed into the daily new words (one in three) while the pack is switched on.
// Same item format as the units: [pt, en, opts].

export const HER_PACK = {
  key: 'her',
  title: 'Para ela',
  subtitle: 'For her, her family, and Reveal Day',
  items: [
    // Everyday affection
    ['meu amor', 'my love'],
    ['querida', 'darling (to a woman)', { note: 'To a man: querido.' }],
    ['a minha namorada', 'my girlfriend'],
    ['amo-te', 'I love you', { lesson: 'her-te-ti', note: 'The pronoun goes after the verb, like chamo-me. "Te amo" is Brazilian.' }],
    ['gosto muito de ti', 'I really like you / I care about you a lot'],
    ['tenho saudades tuas', 'I miss you', { accept: ['tenho saudades de ti'], note: 'Saudade: the famous Portuguese longing for someone.' }],
    ['penso muito em ti', 'I think about you a lot'],
    ['és linda', "you're beautiful"],
    ['estás tão gira', 'you look so pretty', { note: 'Giro / gira (cute, pretty, nice) is very Portugal.' }],
    ['fazes-me feliz', 'you make me happy'],
    ['estás bem, querida?', 'are you OK, darling?'],
    ['tu és tudo para mim', "you're everything to me"],
    ['dorme bem', 'sleep well'],
    ['sonhos cor-de-rosa', 'sweet dreams (literally: pink dreams)'],
    ['um beijinho', 'a little kiss (to sign off)'],
    ['vamos sair esta noite?', 'shall we go out tonight?'],
    // Her family
    ['os teus pais', 'your parents', { lesson: 'her-family' }],
    ['a tua mãe', 'your mum'],
    ['o teu pai', 'your dad'],
    ['a tua família', 'your family'],
    ['muito prazer em conhecê-la', 'lovely to meet you (to a woman, polite)', { accept: ['muito prazer em conhecê-lo'], note: 'To a man: conhecê-lo.' }],
    ['obrigado pelo convite', 'thank you for inviting me', { accept: ['obrigada pelo convite'] }],
    ['a sua casa é muito bonita', 'your home is lovely (polite)'],
    ['está tudo delicioso', 'everything is delicious'],
    ['a senhora cozinha muito bem', 'you cook really well (polite, to an older woman)'],
    ['posso ajudar?', 'can I help?'],
    ['só um bocadinho, por favor', 'just a little, please'],
    ['já estou satisfeito, obrigado', "I'm full, thank you", { accept: ['já estou satisfeita, obrigada', 'já estou satisfeito', 'estou satisfeito, obrigado'], note: 'Satisfeito is the polite way. "Estou cheio" (I\'m stuffed) is casual.' }],
    ['desculpe, ainda estou a aprender', "sorry, I'm still learning"],
    // Reveal Day
    ['tenho uma surpresa para ti', 'I have a surprise for you', { lesson: 'her-reveal' }],
    ['ando a aprender português às escondidas', "I've been learning Portuguese in secret"],
    ['fiz isto por ti', 'I did this for you'],
    ['não disse nada a ninguém', "I didn't tell anyone"],
    ['queria falar contigo na tua língua', 'I wanted to talk to you in your language'],
    ['ainda falo mal, mas estou a melhorar', "I still speak badly, but I'm getting better"],
    ['ficaste surpreendida?', 'were you surprised? (to a woman)'],
    ['agora posso falar com a tua família', 'now I can talk to your family'],
  ],
  lessons: [
    {
      id: 'her-te-ti', title: 'Te, ti and contigo',
      body: `<p>"You" changes shape depending on its job:</p>
<ul><li><b>te</b> after a verb: <i>amo-te</i> (I love you), <i>ligo-te</i> (I'll call you)</li>
<li><b>ti</b> after a little word like <i>de, para, por, em</i>: <i>gosto de ti</i>, <i>penso em ti</i>, <i>para ti</i></li>
<li><b>contigo</b> means "with you": <i>quero estar contigo</i></li></ul>
<p>In Portugal the pronoun goes <b>after</b> the verb in normal sentences: <i>amo-te</i>, not <i>te amo</i> (that's Brazilian).</p>`,
    },
    {
      id: 'her-family', title: 'Meeting her family',
      body: `<p>Be polite with her parents until they invite you to be casual:</p>
<ul><li>Call them <b>o senhor / a senhora</b>, or just leave out "you": <i>Como está?</i></li>
<li><b>teu / tua</b> is "your" to her. <b>seu / sua</b> is the polite "your": <i>a sua casa</i>.</li>
<li>When they say <i>trata-me por tu</i>, you can switch to tu.</li></ul>
<p>Food matters. Compliment it, and accept a little more: <i>só um bocadinho</i>.</p>`,
    },
    {
      id: 'her-reveal', title: 'Saying what you\'ve been doing',
      body: `<p><b>andar a</b> + verb means something you've been doing lately:</p>
<ul><li><i>ando a aprender português</i>: I've been learning Portuguese</li>
<li><i>às escondidas</i>: in secret</li></ul>
<p>The past tense from unit 14 does the rest: <i>fiz</i> (I did), <i>disse</i> (I said), <i>ficaste</i> (you were / became).</p>`,
    },
  ],
};
