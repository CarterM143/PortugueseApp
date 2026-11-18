// Units 6–10 (A1 core). Same item format as content.js: [pt, en, opts].

export const UNITS_6_10 = [
  {
    n: 6, title: 'Dias e horas', subtitle: 'Days and telling the time',
    items: [
      ['segunda-feira', 'Monday', { accept: ['segunda'], lesson: 'u6-days' }],
      ['terça-feira', 'Tuesday', { accept: ['terça'] }],
      ['quarta-feira', 'Wednesday', { accept: ['quarta'] }],
      ['quinta-feira', 'Thursday', { accept: ['quinta'] }],
      ['sexta-feira', 'Friday', { accept: ['sexta'] }],
      ['sábado', 'Saturday'],
      ['domingo', 'Sunday'],
      ['o fim de semana', 'the weekend', { accept: ['o fim-de-semana'], note: 'Spelled fim de semana since the 1990 spelling reform. You will still see fim-de-semana.' }],
      ['a semana', 'the week'],
      ['hoje', 'today'],
      ['amanhã', 'tomorrow'],
      ['ontem', 'yesterday'],
      ['depois de amanhã', 'the day after tomorrow'],
      ['que dia é hoje?', 'what day is it today?'],
      ['hoje é sexta-feira', 'today is Friday', { accept: ['hoje é sexta'] }],
      ['na segunda-feira', 'on Monday', { accept: ['na segunda'], note: 'em + a = na' }],
      ['ao sábado', 'on Saturdays', { accept: ['aos sábados'], note: 'ao / aos + day = every week.' }],
      ['todos os dias', 'every day'],
      ['que horas são?', 'what time is it?', { lesson: 'u6-time' }],
      ['é uma hora', "it's one o'clock", { accept: ['é uma'] }],
      ['são duas horas', "it's two o'clock", { accept: ['são duas'] }],
      ['são três e meia', "it's half past three", { accept: ['são três horas e meia'] }],
      ['são quatro e um quarto', "it's quarter past four", { accept: ['são quatro e quinze'] }],
      ['são dez menos um quarto', "it's quarter to ten", { accept: ['é um quarto para as dez'], note: 'You will also hear "um quarto para as dez".' }],
      ['é meio-dia', "it's midday"],
      ['é meia-noite', "it's midnight"],
      ['a que horas?', 'at what time?'],
      ['às oito', "at eight o'clock", { accept: ['às oito horas'], note: 'a + as = às' }],
      ['à uma', "at one o'clock", { accept: ['à uma hora'] }],
      ['de manhã', 'in the morning'],
      ['à tarde', 'in the afternoon'],
      ['à noite', 'in the evening / at night'],
      ['agora', 'now'],
      ['cedo', 'early'],
      ['estou atrasado', "I'm late", { accept: ['estou atrasada'], note: 'A woman says estou atrasada.' }],
    ],
    lessons: [
      {
        id: 'u6-days', title: 'Days of the week',
        body: `<p>Monday to Friday are counted: <b>segunda</b> (second), <b>terça</b> (third), <b>quarta</b>, <b>quinta</b>, <b>sexta</b>, then <b>sábado</b> and <b>domingo</b>.</p>
<p>The <i>-feira</i> is often dropped in speech: <i>Até segunda!</i></p>
<p>Days are written with a small letter. <b>na</b> segunda-feira = on (this) Monday. <b>à</b> segunda / <b>às</b> segundas = on Mondays (every week).</p>`,
      },
      {
        id: 'u6-time', title: 'Telling the time',
        body: `<p>One o'clock is singular, the rest are plural:</p>
<ul><li><b>É</b> uma hora. · <b>É</b> meio-dia. · <b>É</b> meia-noite.</li><li><b>São</b> duas horas. · <b>São</b> dez e meia.</li></ul>
<p>Add minutes with <b>e</b>, take them away with <b>menos</b>: <i>três e um quarto</i> (3:15), <i>dez menos um quarto</i> (9:45).</p>
<p>"At" a time is <b>à</b> uma, <b>às</b> duas, <b>às</b> oito.</p>
<p>Timetables use the 24-hour clock: <i>às dezoito e trinta</i> (18:30).</p>`,
      },
    ],
  },

  {
    n: 7, title: 'Como é?', subtitle: 'Describing things: ser and estar',
    items: [
      ['estou cansado', "I'm tired", { accept: ['estou cansada'], lesson: 'u7-ser-estar' }],
      ['estou contente', "I'm happy (right now)"],
      ['estou doente', "I'm ill"],
      ['estou ocupado', "I'm busy", { accept: ['estou ocupada'] }],
      ['estou nervoso', "I'm nervous", { accept: ['estou nervosa'] }],
      ['estou com fome', "I'm hungry", { accept: ['tenho fome'] }],
      ['estou com sede', "I'm thirsty", { accept: ['tenho sede'] }],
      ['estás bem?', 'are you OK? (informal)'],
      ['o café está frio', 'the coffee is cold'],
      ['a sopa está quente', 'the soup is hot'],
      ['onde está o Pedro?', 'where is Pedro?', { note: 'People and things that move: estar.' }],
      ['onde fica a estação?', 'where is the station?', { note: 'Buildings and places: ficar (or é).' }],
      ['ele é alto', 'he is tall', { lesson: 'u7-agreement' }],
      ['ela é baixa', 'she is short'],
      ['é simpático', "he's nice / friendly", { accept: ['é simpática'] }],
      ['bonito', 'pretty / beautiful', { accept: ['bonita'] }],
      ['feio', 'ugly', { accept: ['feia'] }],
      ['grande', 'big'],
      ['pequeno', 'small', { accept: ['pequena'] }],
      ['novo', 'new', { accept: ['nova'] }],
      ['velho', 'old', { accept: ['velha'] }],
      ['caro', 'expensive', { accept: ['cara'] }],
      ['barato', 'cheap', { accept: ['barata'] }],
      ['fácil', 'easy'],
      ['difícil', 'difficult'],
      ['bom', 'good', { accept: ['boa'], note: 'Feminine: boa.' }],
      ['mau', 'bad', { accept: ['má'], note: 'Feminine: má.' }],
      ['giro', 'cute / nice-looking', { accept: ['gira'], note: 'Very Portuguese. Que giro! = How cute! / How nice!' }],
      ['a casa é bonita', 'the house is pretty'],
      ['como é a tua casa?', 'what is your house like?'],
      ['muito', 'very / a lot'],
      ['um pouco', 'a little'],
      ['bastante', 'quite / fairly'],
      ['demasiado', 'too / too much'],
    ],
    lessons: [
      {
        id: 'u7-ser-estar', title: 'Ser or estar?',
        body: `<p>Both mean "to be".</p>
<ul><li><b>ser</b>: what something <b>is</b>. Identity, nationality, job, character, what it is like. <i>Ele é alto. A casa é bonita.</i></li>
<li><b>estar</b>: how something <b>is right now</b>. Feelings, states, where it is. <i>Estou cansado. O café está frio.</i></li></ul>
<table class="conj"><tr><td>eu</td><td><b>estou</b></td></tr><tr><td>tu</td><td><b>estás</b></td></tr><tr><td>ele / ela / você</td><td><b>está</b></td></tr><tr><td>nós</td><td><b>estamos</b></td></tr><tr><td>eles / elas</td><td><b>estão</b></td></tr></table>
<p>Hunger and thirst: <i>estou com fome</i> or <i>tenho fome</i>. Both are fine.</p>`,
      },
      {
        id: 'u7-agreement', title: 'Adjectives agree',
        body: `<p>Adjectives match the noun's gender and number, and usually come <b>after</b> it:</p>
<ul><li>o carro <b>novo</b> · a casa <b>nova</b></li><li>os carros <b>novos</b> · as casas <b>novas</b></li></ul>
<p>Words ending in <b>-e</b> or a consonant often don't change for gender: <i>grande, fácil, contente</i>.</p>`,
      },
    ],
  },

  {
    n: 8, title: 'O dia a dia', subtitle: 'Daily routine and present-tense verbs',
    items: [
      ['falar', 'to speak', { lesson: 'u8-ar' }],
      ['falo', 'I speak'],
      ['falas', 'you speak (tu)'],
      ['fala', 'he / she speaks, you speak (você)'],
      ['falamos', 'we speak'],
      ['falam', 'they speak'],
      ['trabalhar', 'to work'],
      ['estudar', 'to study'],
      ['morar', 'to live (somewhere)'],
      ['comer', 'to eat', { lesson: 'u8-er-ir' }],
      ['beber', 'to drink'],
      ['bebo água', 'I drink water'],
      ['escrever', 'to write'],
      ['ler', 'to read'],
      ['abrir', 'to open'],
      ['partir', 'to leave / to break'],
      ['acordo às sete', 'I wake up at seven'],
      ['levanto-me às sete e meia', 'I get up at half past seven', { lesson: 'u8-reflexive' }],
      ['tomo banho', 'I have a shower'],
      ['visto-me', 'I get dressed'],
      ['tomo o pequeno-almoço', 'I have breakfast'],
      ['saio de casa às oito', 'I leave home at eight', { note: 'sair (to go out) is irregular: saio.' }],
      ['chego ao trabalho', 'I arrive at work'],
      ['almoço ao meio-dia', 'I have lunch at midday'],
      ['janto às oito', 'I have dinner at eight'],
      ['durmo bem', 'I sleep well', { note: 'dormir is irregular in the eu form: durmo.' }],
      ['deito-me tarde', 'I go to bed late'],
      ['normalmente', 'usually'],
      ['às vezes', 'sometimes'],
      ['sempre', 'always'],
      ['nunca', 'never'],
      ['não trabalho ao domingo', "I don't work on Sundays"],
    ],
    lessons: [
      {
        id: 'u8-ar', title: 'Present tense: -ar verbs',
        body: `<p>Most verbs end in <b>-ar</b>. Drop the -ar and add the ending:</p>
<table class="conj"><tr><td>eu</td><td>fal<b>o</b></td></tr><tr><td>tu</td><td>fal<b>as</b></td></tr><tr><td>ele / ela / você</td><td>fal<b>a</b></td></tr><tr><td>nós</td><td>fal<b>amos</b></td></tr><tr><td>eles / elas</td><td>fal<b>am</b></td></tr></table>
<p>The same pattern works for <i>trabalhar, estudar, morar, jantar, chegar…</i></p>`,
      },
      {
        id: 'u8-er-ir', title: 'Present tense: -er and -ir verbs',
        body: `<table class="conj"><tr><td></td><td><b>comer</b></td><td><b>partir</b></td></tr>
<tr><td>eu</td><td>com<b>o</b></td><td>part<b>o</b></td></tr><tr><td>tu</td><td>com<b>es</b></td><td>part<b>es</b></td></tr>
<tr><td>ele / ela</td><td>com<b>e</b></td><td>part<b>e</b></td></tr><tr><td>nós</td><td>com<b>emos</b></td><td>part<b>imos</b></td></tr>
<tr><td>eles / elas</td><td>com<b>em</b></td><td>part<b>em</b></td></tr></table>
<p>Only the nós form tells -er and -ir apart.</p>`,
      },
      {
        id: 'u8-reflexive', title: 'Levanto-me: "myself" verbs',
        body: `<p>Some routine verbs take a little pronoun: <i>levantar<b>-se</b></i> (to get up), <i>deitar<b>-se</b></i> (to go to bed), <i>vestir<b>-se</b></i> (to get dressed).</p>
<p>In Portugal it goes <b>after</b> the verb in normal statements: <i>Levanto<b>-me</b> às sete.</i></p>
<p>After <b>não</b> and question words it moves in front: <i>Não <b>me</b> levanto cedo.</i></p>`,
      },
    ],
  },

  {
    n: 9, title: 'Na cidade', subtitle: 'Getting around: directions and transport',
    items: [
      ['vou a pé', "I'm going on foot", { lesson: 'u9-ir' }],
      ['vou de autocarro', 'I go by bus', { note: 'By transport: de. De comboio, de metro, de carro.' }],
      ['vais', 'you go (tu)'],
      ['vai', 'he / she goes, you go (você)'],
      ['vamos', "we go / let's go"],
      ['o autocarro', 'the bus', { note: 'Portugal: autocarro. Brazil: ônibus.' }],
      ['o comboio', 'the train', { note: 'Portugal: comboio. Brazil: trem.' }],
      ['o metro', 'the metro / underground'],
      ['o elétrico', 'the tram', { accept: ['o eléctrico'] }],
      ['o táxi', 'the taxi'],
      ['a paragem de autocarro', 'the bus stop', { note: 'Portugal: paragem. Brazil: ponto de ônibus.' }],
      ['a estação de comboios', 'the train station'],
      ['o aeroporto', 'the airport'],
      ['o bilhete', 'the ticket'],
      ['um bilhete para o Porto', 'a ticket to Porto'],
      ['ida e volta', 'return (there and back)'],
      ['a que horas parte o comboio?', 'what time does the train leave?'],
      ['onde posso apanhar o autocarro?', 'where can I catch the bus?', { note: 'Portugal: apanhar. Brazil: pegar.' }],
      ['a rua', 'the street', { lesson: 'u9-contractions' }],
      ['a praça', 'the square'],
      ['o centro', 'the centre'],
      ['à esquerda', 'on the left / to the left'],
      ['à direita', 'on the right / to the right'],
      ['sempre em frente', 'straight ahead'],
      ['vire à esquerda', 'turn left (polite)'],
      ['a primeira rua', 'the first street'],
      ['a segunda à direita', 'the second on the right'],
      ['perto', 'near / close by'],
      ['longe', 'far'],
      ['é longe?', 'is it far?'],
      ['fica perto daqui?', 'is it near here?', { note: 'de + aqui = daqui' }],
      ['ao lado do banco', 'next to the bank'],
      ['em frente da igreja', 'opposite the church', { accept: ['em frente à igreja'] }],
      ['estou perdido', "I'm lost", { accept: ['estou perdida'] }],
    ],
    lessons: [
      {
        id: 'u9-ir', title: 'Ir: "to go"',
        body: `<table class="conj"><tr><td>eu</td><td><b>vou</b></td></tr><tr><td>tu</td><td><b>vais</b></td></tr><tr><td>ele / ela / você</td><td><b>vai</b></td></tr><tr><td>nós</td><td><b>vamos</b></td></tr><tr><td>eles / elas</td><td><b>vão</b></td></tr></table>
<p>Going <b>to</b> a place: <i>vou <b>a</b> Lisboa</i>, <i>vou <b>ao</b> centro</i> (a + o). How you travel: <i>vou <b>de</b> comboio</i>, but <i>vou <b>a</b> pé</i> (on foot).</p>
<p><b>Vamos!</b> also means "Let's go!"</p>`,
      },
      {
        id: 'u9-contractions', title: 'Little words join up',
        body: `<p>Prepositions merge with <i>o / a / os / as</i>:</p>
<table class="conj"><tr><td>a + o</td><td><b>ao</b></td><td>a + a</td><td><b>à</b></td></tr>
<tr><td>de + o</td><td><b>do</b></td><td>de + a</td><td><b>da</b></td></tr>
<tr><td>em + o</td><td><b>no</b></td><td>em + a</td><td><b>na</b></td></tr></table>
<p><i>Ao lado <b>do</b> banco. Vire <b>à</b> direita. Moro <b>na</b> Rua Augusta.</i></p>`,
      },
    ],
  },

  {
    n: 10, title: 'Às compras', subtitle: 'Shopping for food',
    items: [
      ['o mercado', 'the market'],
      ['o supermercado', 'the supermarket'],
      ['a padaria', 'the bakery'],
      ['o talho', "the butcher's", { note: 'Portugal: talho. Brazil: açougue.' }],
      ['o pão', 'the bread'],
      ['o leite', 'the milk'],
      ['o queijo', 'the cheese'],
      ['o fiambre', 'the ham (cooked)', { note: 'fiambre is cooked ham; presunto is cured ham.' }],
      ['a manteiga', 'the butter'],
      ['os ovos', 'the eggs'],
      ['o arroz', 'the rice'],
      ['a carne', 'the meat'],
      ['o peixe', 'the fish'],
      ['o frango', 'the chicken'],
      ['a fruta', 'the fruit'],
      ['as maçãs', 'the apples'],
      ['as laranjas', 'the oranges'],
      ['as batatas', 'the potatoes'],
      ['os legumes', 'the vegetables'],
      ['tem pão?', 'do you have bread?'],
      ['um quilo de tomates', 'a kilo of tomatoes', { lesson: 'u10-quantities' }],
      ['meio quilo de queijo', 'half a kilo of cheese'],
      ['uma garrafa de água', 'a bottle of water'],
      ['um pacote de leite', 'a carton of milk'],
      ['quanto é o quilo?', 'how much is it per kilo?'],
      ['queria este', "I'd like this one", { accept: ['queria esta'], lesson: 'u10-este' }],
      ['esse', 'that one (near you)', { accept: ['essa'] }],
      ['aquele', 'that one (over there)', { accept: ['aquela'] }],
      ['um saco, por favor', 'a bag, please'],
      ['só isso, obrigado', 'just that, thanks', { accept: ['só isso, obrigada'] }],
      ['está aberto', "it's open", { accept: ['está aberta'] }],
      ['está fechado', "it's closed", { accept: ['está fechada'] }],
      ['a caixa', 'the checkout / till'],
      ['o troco', 'the change (money)'],
    ],
    lessons: [
      {
        id: 'u10-quantities', title: 'Quantities: de',
        body: `<p>Amount + <b>de</b> + thing, with no article:</p>
<ul><li>um quilo <b>de</b> tomates</li><li>meio quilo <b>de</b> queijo</li><li>uma garrafa <b>de</b> água · um pacote <b>de</b> leite</li></ul>
<p>Half is <b>meio</b> before a masculine word and <b>meia</b> before a feminine one: <i>meia dúzia de ovos</i> (half a dozen eggs).</p>`,
      },
      {
        id: 'u10-este', title: 'This, that, that over there',
        body: `<p>Portuguese has three distances:</p>
<ul><li><b>este / esta</b>: this, near me</li><li><b>esse / essa</b>: that, near you</li><li><b>aquele / aquela</b>: that, over there</li></ul>
<p>In a shop: <i>Queria <b>este</b>.</i> (pointing at it) · <i><b>Esse</b> não, <b>aquele</b>.</i></p>`,
      },
    ],
  },
];
