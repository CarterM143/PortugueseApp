// Role-play scenarios for the conversation tutor (one per unit).
// `script` is the offline / no-API-key version: fixed tutor lines with expected answers.
//   task:     what the learner should say (English)
//   expect:   model answers (first one is shown when help is needed)
//   keywords: if any appears in the answer (accent-insensitive), it counts as on-topic

export const SCENARIOS = [
  {
    id: 'vizinha', unit: 1, emoji: '🏠', title: 'Meet your neighbour',
    setting: 'On the stairs of an apartment building in Lisbon, in the morning.',
    role: 'Dona Rosa, a friendly older neighbour. Use polite forms (a senhora / você) and expect them back.',
    goals: ['Greet her', 'Say how you are', 'Ask how she is', 'Say goodbye'],
    opening: { pt: 'Olá, bom dia!', en: 'Hello, good morning!' },
    script: [
      { tutor: { pt: 'Olá, bom dia!', en: 'Hello, good morning!' }, task: 'Say good morning back.',
        expect: ['bom dia!', 'olá, bom dia!'], keywords: ['bom dia'] },
      { tutor: { pt: 'Como está?', en: 'How are you?' }, task: "Say you're fine, thanks, and ask how she is (polite).",
        expect: ['estou bem, obrigado. e a senhora?', 'estou bem, obrigada. e você?', 'estou bem, e a senhora?'], keywords: ['estou bem', 'bem, obrigad'] },
      { tutor: { pt: 'Mais ou menos… Bem, até logo!', en: 'So-so… Well, see you later!' }, task: 'Say goodbye: see you later!',
        expect: ['até logo!', 'adeus, até logo!'], keywords: ['até logo', 'adeus', 'tchau', 'até amanhã'] },
    ],
    closing: { pt: 'Até logo! Bom dia!', en: 'See you later! Have a good day!' },
  },
  {
    id: 'intercambio', unit: 2, emoji: '🤝', title: 'Language exchange in Porto',
    setting: 'A language-exchange evening at a bar in Porto.',
    role: 'Pedro, a friendly student from Porto, about 25. Use tu.',
    goals: ['Say your name', 'Say where you are from', 'Say where you live', "Say you're learning Portuguese"],
    opening: { pt: 'Olá! Eu sou o Pedro. Como te chamas?', en: "Hi! I'm Pedro. What's your name?" },
    script: [
      { tutor: { pt: 'Olá! Eu sou o Pedro. Como te chamas?', en: "Hi! I'm Pedro. What's your name?" }, task: 'Tell him your name (Chamo-me …).',
        expect: ['chamo-me Ana.', 'olá, chamo-me Ana.'], keywords: ['chamo', 'o meu nome', 'sou o', 'sou a'] },
      { tutor: { pt: 'Muito prazer! De onde és?', en: 'Nice to meet you! Where are you from?' }, task: "Say nice to meet you, and where you're from (Sou de …).",
        expect: ['muito prazer! sou de Inglaterra.', 'prazer, sou de Londres.'], keywords: ['sou de', 'sou ingl', 'sou americ', 'prazer'] },
      { tutor: { pt: 'Fixe! E onde moras?', en: 'Cool! And where do you live?' }, task: 'Say you live in Lisbon.',
        expect: ['moro em Lisboa.', 'eu moro em Lisboa.'], keywords: ['moro'] },
      { tutor: { pt: 'Falas muito bem português!', en: 'You speak Portuguese really well!' }, task: "Say thanks, you're learning Portuguese.",
        expect: ['obrigado! estou a aprender português.', 'obrigada, estou a aprender português.'], keywords: ['aprender'] },
    ],
    closing: { pt: 'Boa! Então vamos falar mais. Até já!', en: "Great! Then let's talk more. See you in a bit!" },
  },
  {
    id: 'loja', unit: 3, emoji: '🛍️', title: 'Buying at a little shop',
    setting: 'A small souvenir shop in Lisbon. The learner wants to buy a postcard.',
    role: 'The shop assistant, polite (o senhor / a senhora). Prices in euros.',
    goals: ['Ask how much it costs', 'Understand the price', 'Ask to pay by card', 'Say thanks and goodbye'],
    opening: { pt: 'Bom dia! Diga, faz favor.', en: 'Good morning! Go ahead, please.' },
    script: [
      { tutor: { pt: 'Bom dia! Diga, faz favor.', en: 'Good morning! Go ahead, please.' }, task: 'Point at a postcard and ask how much it costs.',
        expect: ['quanto custa?', 'bom dia! quanto custa?'], keywords: ['quanto'] },
      { tutor: { pt: 'São dois euros e cinquenta.', en: "It's two euros fifty." }, task: 'Ask if you can pay by card.',
        expect: ['posso pagar com cartão?'], keywords: ['cartão', 'multibanco'] },
      { tutor: { pt: 'Pode, claro. Aqui tem.', en: 'You can, of course. Here you go.' }, task: 'Say thank you very much and goodbye.',
        expect: ['muito obrigado, adeus!', 'muito obrigada, adeus!'], keywords: ['obrigad'] },
    ],
    closing: { pt: 'De nada. Bom dia!', en: "You're welcome. Have a good day!" },
  },
  {
    id: 'pastelaria', unit: 4, emoji: '☕', title: 'Breakfast at a pastelaria',
    setting: 'A busy pastelaria (café-bakery) in Lisbon in the morning.',
    role: 'The waiter, quick but friendly. Polite forms. Offer typical Portuguese café items.',
    goals: ['Order a drink', 'Order something to eat', 'Say if it is to eat here or take away', 'Ask for the bill'],
    opening: { pt: 'Bom dia! O que deseja?', en: 'Good morning! What would you like?' },
    script: [
      { tutor: { pt: 'Bom dia! O que deseja?', en: 'Good morning! What would you like?' }, task: 'Order a coffee, please.',
        expect: ['queria um café, por favor.', 'uma bica, por favor.'], keywords: ['café', 'bica', 'galão', 'chá', 'meia de leite'] },
      { tutor: { pt: 'Muito bem. Mais alguma coisa?', en: 'Very good. Anything else?' }, task: 'Ask for a custard tart as well.',
        expect: ['e um pastel de nata, por favor.', 'queria um pastel de nata.'], keywords: ['pastel', 'torrada', 'tosta', 'sandes'] },
      { tutor: { pt: 'É para comer aqui ou para levar?', en: 'Is it to eat here or to take away?' }, task: 'Say: to eat here.',
        expect: ['para comer aqui.', 'é para comer aqui.'], keywords: ['aqui', 'levar'] },
      { tutor: { pt: 'Está tudo bem?', en: 'Is everything OK?' }, task: "Say it's great, and ask for the bill.",
        expect: ['está ótimo! a conta, por favor.', 'a conta, por favor.'], keywords: ['conta'] },
    ],
    closing: { pt: 'São três euros e vinte. Obrigado e bom dia!', en: "That's three euros twenty. Thanks, have a good day!" },
  },
  {
    id: 'familia', unit: 5, emoji: '👪', title: 'Talking about family',
    setting: 'Coffee with a new friend in a park in Lisbon.',
    role: 'Sofia, a new friend, about 35, warm and chatty. Use tu.',
    goals: ['Say if you have brothers or sisters', 'Say something about your parents', 'Ask about her family'],
    opening: { pt: 'Então, tens irmãos?', en: 'So, do you have brothers or sisters?' },
    script: [
      { tutor: { pt: 'Então, tens irmãos?', en: 'So, do you have brothers or sisters?' }, task: 'Say you have a brother and a sister.',
        expect: ['tenho um irmão e uma irmã.', 'sim, tenho um irmão e uma irmã.'], keywords: ['tenho', 'irm'] },
      { tutor: { pt: 'Que giro! E o teu pai, como se chama?', en: "How nice! And your dad, what's his name?" }, task: 'Say your father is called João.',
        expect: ['o meu pai chama-se João.', 'chama-se João.'], keywords: ['chama'] },
      { tutor: { pt: 'Eu não tenho irmãos, mas tenho uma filha.', en: "I don't have siblings, but I have a daughter." }, task: "Ask what her name is (Como se chama?).",
        expect: ['como se chama?', 'e como se chama?'], keywords: ['chama'] },
      { tutor: { pt: 'Chama-se Inês. Tem dois anos. Bem, tenho de ir. Até amanhã!', en: "She's called Inês. She's two. Well, I have to go. See you tomorrow!" }, task: 'Say: see you tomorrow!',
        expect: ['até amanhã!'], keywords: ['até', 'adeus', 'tchau'] },
    ],
    closing: { pt: 'Beijinhos! Até amanhã!', en: 'Kisses! See you tomorrow!' },
  },
];

export const SCENARIO_BY_ID = new Map(SCENARIOS.map((s) => [s.id, s]));
