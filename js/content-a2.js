// Units 11–20 (A1+ to A2). Same item format as content.js: [pt, en, opts].

export const UNITS_11_20 = [
  {
    n: 11, title: 'O que estás a fazer?', subtitle: 'Right now, and free time',
    items: [
      ['o que estás a fazer?', 'what are you doing? (informal)', { lesson: 'u11-estar-a' }],
      ['estou a trabalhar', "I'm working"],
      ['estou a cozinhar', "I'm cooking"],
      ['estou a ver televisão', "I'm watching TV", { accept: ['estou a ver tv', 'estou a ver a televisão'] }],
      ['estou a ler um livro', "I'm reading a book"],
      ['estou a ouvir música', "I'm listening to music"],
      ['estou a falar com a minha mãe', "I'm talking to my mother"],
      ['estou a pensar', "I'm thinking"],
      ['ela está a dormir', "she's sleeping"],
      ['eles estão a jogar futebol', "they're playing football"],
      ['estamos a almoçar', "we're having lunch"],
      ['estás a ouvir?', 'are you listening?'],
      ['estou à espera do autocarro', "I'm waiting for the bus", { note: 'à espera de = waiting for.' }],
      ['agora não posso', "I can't right now"],
      ['ainda estou a trabalhar', "I'm still working", { lesson: 'u11-ainda-ja' }],
      ['já', 'already / right away'],
      ['ainda não', 'not yet'],
      ['neste momento', 'at the moment'],
      ['o tempo livre', 'free time'],
      ['nadar', 'to swim'],
      ['correr', 'to run'],
      ['passear', 'to go for a walk'],
      ['jogar', 'to play (a game or sport)', { note: 'jogar for games and sport, tocar for instruments.' }],
      ['tocar guitarra', 'to play the guitar'],
      ['dançar', 'to dance'],
      ['cantar', 'to sing'],
      ['tirar fotografias', 'to take photos'],
      ['ir ao cinema', 'to go to the cinema'],
      ['sair com amigos', 'to go out with friends'],
      ['o que fazes no tempo livre?', 'what do you do in your free time?'],
    ],
    lessons: [
      {
        id: 'u11-estar-a', title: 'Estar a + verb, in full',
        body: `<p>For something happening now, use <b>estar a</b> + the basic verb:</p>
<table class="conj"><tr><td>eu</td><td><b>estou a</b> trabalhar</td></tr><tr><td>tu</td><td><b>estás a</b> trabalhar</td></tr>
<tr><td>ele / ela / você</td><td><b>está a</b> trabalhar</td></tr><tr><td>nós</td><td><b>estamos a</b> trabalhar</td></tr>
<tr><td>eles / elas</td><td><b>estão a</b> trabalhar</td></tr></table>
<p>Brazil says <i>estou trabalhando</i>. In Portugal that sounds Brazilian (or from the south, the Alentejo).</p>`,
      },
      {
        id: 'u11-ainda-ja', title: 'Ainda and já',
        body: `<ul><li><b>ainda</b> = still: <i>Ainda estou a trabalhar.</i></li><li><b>ainda não</b> = not yet: <i>Ainda não.</i></li>
<li><b>já</b> = already, or right away: <i>Já está!</i> (Done!) · <i>Já vou!</i> (Coming!)</li></ul>`,
      },
    ],
  },

  {
    n: 12, title: 'Verbos essenciais', subtitle: 'Ter, fazer, querer, poder, vir',
    items: [
      ['tenho', 'I have', { lesson: 'u12-ter' }],
      ['tens', 'you have (tu)'],
      ['tem', 'he / she has, you have (você)'],
      ['temos', 'we have'],
      ['têm', 'they have', { id: 'u12-tem-eles', note: 'têm (they) has a hat; tem (he / she) does not. Têm sounds doubled: "tãi-ãi".' }],
      ['tenho de ir', 'I have to go', { accept: ['tenho que ir'], note: 'Portugal prefers ter de. Ter que is also heard.' }],
      ['tens de provar', 'you have to try it'],
      ['tenho pressa', "I'm in a hurry"],
      ['tenho frio', "I'm cold"],
      ['tenho calor', "I'm hot"],
      ['tenho medo', "I'm scared"],
      ['tenho sono', "I'm sleepy"],
      ['tens razão', "you're right"],
      ['faço', 'I do / I make', { lesson: 'u12-fazer' }],
      ['fazes', 'you do / you make (tu)'],
      ['faz', 'he / she does / makes'],
      ['fazemos', 'we do / we make'],
      ['fazem', 'they do / they make'],
      ['faço o jantar', 'I make dinner'],
      ['faço anos amanhã', "it's my birthday tomorrow", { note: 'fazer anos = to have a birthday.' }],
      ['faz favor', 'excuse me (to get attention) / please', { note: 'Very common in Portugal, e.g. to call a waiter.' }],
      ['quero', 'I want', { lesson: 'u12-querer-poder' }],
      ['queres?', 'do you want? (tu)'],
      ['não quero', "I don't want to"],
      ['posso', 'I can / may I'],
      ['podes', 'you can (tu)'],
      ['pode', 'he / she can, you can (você)'],
      ['posso entrar?', 'may I come in?'],
      ['não posso', "I can't"],
      ['venho de Lisboa', 'I come from Lisbon'],
      ['vens comigo?', 'are you coming with me?'],
      ['vou ao cinema', "I'm going to the cinema"],
      ['vamos embora', "let's go / let's leave"],
    ],
    lessons: [
      {
        id: 'u12-ter', title: 'Ter: "to have"',
        body: `<table class="conj"><tr><td>eu</td><td><b>tenho</b></td></tr><tr><td>tu</td><td><b>tens</b></td></tr><tr><td>ele / ela / você</td><td><b>tem</b></td></tr><tr><td>nós</td><td><b>temos</b></td></tr><tr><td>eles / elas</td><td><b>têm</b></td></tr></table>
<p>Portuguese "has" feelings that English "is": <i>tenho frio</i> (I'm cold), <i>tenho medo</i> (I'm scared), <i>tens razão</i> (you're right).</p>
<p><b>ter de</b> + verb = to have to: <i>Tenho de ir.</i></p>`,
      },
      {
        id: 'u12-fazer', title: 'Fazer: "to do / to make"',
        body: `<table class="conj"><tr><td>eu</td><td><b>faço</b></td></tr><tr><td>tu</td><td><b>fazes</b></td></tr><tr><td>ele / ela / você</td><td><b>faz</b></td></tr><tr><td>nós</td><td><b>fazemos</b></td></tr><tr><td>eles / elas</td><td><b>fazem</b></td></tr></table>
<p>Useful phrases: <i>fazer anos</i> (to have a birthday), <i>faz favor</i> (excuse me / please).</p>`,
      },
      {
        id: 'u12-querer-poder', title: 'Querer and poder',
        body: `<table class="conj"><tr><td></td><td><b>querer</b> (want)</td><td><b>poder</b> (can)</td></tr>
<tr><td>eu</td><td>quero</td><td>posso</td></tr><tr><td>tu</td><td>queres</td><td>podes</td></tr>
<tr><td>ele / ela</td><td>quer</td><td>pode</td></tr><tr><td>nós</td><td>queremos</td><td>podemos</td></tr>
<tr><td>eles / elas</td><td>querem</td><td>podem</td></tr></table>
<p>Both go straight before another verb: <i>Queres ir? Posso entrar?</i></p>
<p>To order, <i>queria</i> is politer than <i>quero</i>.</p>`,
      },
    ],
  },

  {
    n: 13, title: 'Gostos', subtitle: 'Likes, dislikes and hobbies',
    items: [
      ['gosto de café', 'I like coffee', { lesson: 'u13-gostar' }],
      ['gosto muito de ler', 'I really like reading'],
      ['não gosto de peixe', "I don't like fish"],
      ['gostas de música?', 'do you like music?'],
      ['gosto do Porto', 'I like Porto', { note: 'de + o = do' }],
      ['gosto da praia', 'I like the beach'],
      ['gosto mais de gatos do que de cães', 'I like cats more than dogs'],
      ['adoro viajar', 'I love travelling', { note: 'adorar for things and activities; amar is for people.' }],
      ['odeio acordar cedo', 'I hate waking up early'],
      ['prefiro chá', 'I prefer tea', { lesson: 'u13-preferir' }],
      ['preferes vinho ou cerveja?', 'do you prefer wine or beer?'],
      ['o meu preferido', 'my favourite', { accept: ['a minha preferida', 'o meu favorito', 'a minha favorita'] }],
      ['qual é a tua comida preferida?', 'what is your favourite food?'],
      ['eu também', 'me too'],
      ['eu também não', 'me neither', { accept: ['nem eu'] }],
      ['também', 'also / too'],
      ['a música', 'the music'],
      ['o desporto', 'sport', { note: 'Portugal: desporto. Brazil: esporte.' }],
      ['o futebol', 'football'],
      ['a praia', 'the beach'],
      ['os filmes', 'films / movies'],
      ['viajar', 'to travel'],
      ['cozinhar', 'to cook'],
      ['fazer caminhadas', 'to go hiking'],
      ['ir ao ginásio', 'to go to the gym'],
      ['o cão', 'the dog', { note: 'Portugal: cão. Brazil: cachorro.' }],
      ['o gato', 'the cat'],
      ['que fixe!', 'cool! / great!', { note: 'fixe is everyday Portuguese for "cool".' }],
      ['que pena!', 'what a pity!'],
      ['interessante', 'interesting'],
      ['aborrecido', 'boring', { accept: ['aborrecida'], note: 'Also chato (boring / annoying).' }],
      ['divertido', 'fun', { accept: ['divertida'] }],
    ],
    lessons: [
      {
        id: 'u13-gostar', title: 'Gostar DE',
        body: `<p>You always "like <b>of</b>" something: <b>gostar de</b>.</p>
<ul><li><i>Gosto <b>de</b> café.</i> · <i>Gosto <b>de</b> ler.</i></li><li>With the article it merges: <i>Gosto <b>do</b> Porto</i> (de + o), <i>Gosto <b>da</b> praia</i> (de + a).</li></ul>
<p>Short answers: <i>Gostas? — Gosto!</i> / <i>Não gosto.</i> (Just repeat the verb; "sim" alone sounds odd.)</p>`,
      },
      {
        id: 'u13-preferir', title: 'Prefiro',
        body: `<p><b>preferir</b> changes its vowel in the eu form: <b>prefiro</b>, prefere<b>s</b>, prefere, preferimos, preferem.</p>
<p><i>Preferes vinho ou cerveja? — Prefiro vinho.</i></p>
<p>Compare with <b>mais… do que</b>: <i>Gosto mais de gatos do que de cães.</i></p>`,
      },
    ],
  },

  {
    n: 14, title: 'Ontem', subtitle: 'Talking about the past',
    items: [
      ['ontem trabalhei muito', 'yesterday I worked a lot', { lesson: 'u14-past-ar' }],
      ['falei com a minha mãe', 'I spoke to my mother'],
      ['falaste', 'you spoke (tu)'],
      ['falou', 'he / she spoke, you spoke (você)'],
      ['falámos', 'we spoke', { note: 'Portugal writes falámos (past) and falamos (present).' }],
      ['falaram', 'they spoke'],
      ['comprei um livro', 'I bought a book'],
      ['jantei fora', 'I had dinner out'],
      ['comi bacalhau', 'I ate salt cod', { lesson: 'u14-past-er-ir' }],
      ['bebi demasiado', 'I drank too much'],
      ['saí com amigos', 'I went out with friends'],
      ['dormi mal', 'I slept badly'],
      ['percebeste?', 'did you understand?'],
      ['vi um filme', 'I watched a film', { note: 'ver → vi (I saw).' }],
      ['fui ao Porto', 'I went to Porto', { lesson: 'u14-irregular' }],
      ['foste', 'you went / you were (tu)'],
      ['foi muito bom', 'it was very good'],
      ['fomos à praia', 'we went to the beach'],
      ['tive um dia difícil', 'I had a hard day'],
      ['estive em casa', 'I was at home'],
      ['o que fizeste?', 'what did you do?'],
      ['já estiveste em Portugal?', 'have you ever been to Portugal?'],
      ['já comeste?', 'have you eaten yet?', { note: 'Portugal uses the simple past where English says "have you…".' }],
      ['ainda não comi', "I haven't eaten yet"],
      ['como foi?', 'how was it?'],
      ['correu bem', 'it went well'],
      ['ontem à noite', 'last night'],
      ['esta manhã', 'this morning'],
      ['anteontem', 'the day before yesterday'],
      ['há dois dias', 'two days ago'],
      ['a semana passada', 'last week', { accept: ['na semana passada'] }],
      ['o fim de semana passado', 'last weekend', { accept: ['no fim de semana passado'] }],
      ['o ano passado', 'last year', { accept: ['no ano passado'] }],
    ],
    lessons: [
      {
        id: 'u14-past-ar', title: 'The past (pretérito perfeito): -ar verbs',
        body: `<p>For finished actions: "I spoke", "I bought".</p>
<table class="conj"><tr><td>eu</td><td>fal<b>ei</b></td></tr><tr><td>tu</td><td>fal<b>aste</b></td></tr><tr><td>ele / ela / você</td><td>fal<b>ou</b></td></tr><tr><td>nós</td><td>fal<b>ámos</b></td></tr><tr><td>eles / elas</td><td>fal<b>aram</b></td></tr></table>
<p>Watch the spelling: <i>chegar → cheguei</i>, <i>ficar → fiquei</i>, <i>almoçar → almocei</i>.</p>`,
      },
      {
        id: 'u14-past-er-ir', title: 'The past: -er and -ir verbs',
        body: `<table class="conj"><tr><td></td><td><b>comer</b></td><td><b>partir</b></td></tr>
<tr><td>eu</td><td>com<b>i</b></td><td>part<b>i</b></td></tr><tr><td>tu</td><td>com<b>este</b></td><td>part<b>iste</b></td></tr>
<tr><td>ele / ela</td><td>com<b>eu</b></td><td>part<b>iu</b></td></tr><tr><td>nós</td><td>com<b>emos</b></td><td>part<b>imos</b></td></tr>
<tr><td>eles / elas</td><td>com<b>eram</b></td><td>part<b>iram</b></td></tr></table>
<p>"Have you… yet?" uses this simple past with <b>já</b>: <i>Já comeste? — Ainda não.</i></p>`,
      },
      {
        id: 'u14-irregular', title: 'Four irregular pasts',
        body: `<table class="conj"><tr><td></td><td>ser / ir</td><td>ter</td><td>estar</td><td>fazer</td></tr>
<tr><td>eu</td><td><b>fui</b></td><td><b>tive</b></td><td><b>estive</b></td><td><b>fiz</b></td></tr>
<tr><td>tu</td><td>foste</td><td>tiveste</td><td>estiveste</td><td>fizeste</td></tr>
<tr><td>ele / ela</td><td>foi</td><td>teve</td><td>esteve</td><td>fez</td></tr>
<tr><td>nós</td><td>fomos</td><td>tivemos</td><td>estivemos</td><td>fizemos</td></tr>
<tr><td>eles / elas</td><td>foram</td><td>tiveram</td><td>estiveram</td><td>fizeram</td></tr></table>
<p><b>ser</b> and <b>ir</b> share one past: <i>fui</i> = "I was" or "I went". The context tells you which.</p>`,
      },
    ],
  },

  {
    n: 15, title: 'Planos', subtitle: 'Plans and invitations',
    items: [
      ['vou trabalhar amanhã', "I'm going to work tomorrow", { lesson: 'u15-going-to' }],
      ['vou visitar a minha avó', "I'm going to visit my grandmother"],
      ['vais sair hoje à noite?', 'are you going out tonight?'],
      ['vamos jantar fora', "we're going to eat out"],
      ['ela vai ligar-me', "she's going to call me", { note: 'ligar = to phone (Portugal).' }],
      ['vão chegar tarde', "they're going to arrive late"],
      ['o que vais fazer no fim de semana?', 'what are you doing at the weekend?'],
      ['não vou fazer nada', "I'm not going to do anything"],
      ['queres ir ao cinema?', 'do you want to go to the cinema?', { lesson: 'u15-invite' }],
      ['queres tomar um café?', 'do you want to get a coffee?'],
      ['boa ideia!', 'good idea!'],
      ['claro!', 'of course!'],
      ['pode ser', 'sure / could be', { note: 'A soft "yes" in Portugal.' }],
      ['combinado!', 'deal! / agreed!'],
      ['não posso, desculpa', "I can't, sorry"],
      ['tenho outros planos', 'I have other plans'],
      ['fica para a próxima', 'maybe next time', { note: 'Literally "it stays for the next one".' }],
      ['a que horas nos encontramos?', 'what time shall we meet?'],
      ['onde nos encontramos?', 'where shall we meet?'],
      ['encontramo-nos às oito', "let's meet at eight", { note: 'encontramos + nos → encontramo-nos (the s drops).' }],
      ['até sábado!', 'see you on Saturday!'],
      ['amanhã de manhã', 'tomorrow morning'],
      ['logo à noite', 'tonight (later today)'],
      ['daqui a uma hora', 'in an hour'],
      ['na próxima semana', 'next week', { accept: ['para a semana'], note: 'Also very common: para a semana.' }],
      ['no próximo mês', 'next month', { accept: ['para o mês'] }],
      ['talvez', 'maybe'],
      ['as férias', 'the holidays', { note: 'Always plural: as férias.' }],
      ['vou de férias em agosto', "I'm going on holiday in August"],
    ],
    lessons: [
      {
        id: 'u15-going-to', title: 'Vou + verb: "going to"',
        body: `<p>The everyday future is <b>ir</b> + the basic verb, just like "going to":</p>
<p><i><b>Vou</b> trabalhar. <b>Vais</b> sair? <b>Vamos</b> jantar fora. Eles <b>vão</b> chegar tarde.</i></p>
<p>To say "going to go", Portuguese usually just says <i>vou</i>: <i>Amanhã vou a Sintra.</i></p>
<p>Pronouns join the second verb: <i>Ela vai ligar<b>-me</b>.</i></p>`,
      },
      {
        id: 'u15-invite', title: 'Inviting, accepting, saying no',
        body: `<ul><li>Invite: <i>Queres…? · Vamos…? · Apetece-te…?</i> (Do you fancy…?)</li>
<li>Yes: <i>Claro! · Boa ideia! · Pode ser. · Combinado!</i></li>
<li>No, kindly: <i>Não posso, desculpa. Tenho outros planos. Fica para a próxima!</i></li></ul>`,
      },
    ],
  },

  {
    n: 16, title: 'A saúde', subtitle: 'Health, the body, the pharmacy',
    items: [
      ['a cabeça', 'the head'],
      ['a garganta', 'the throat'],
      ['o estômago', 'the stomach'],
      ['as costas', 'the back (of the body)', { note: 'Always plural: as costas.' }],
      ['o braço', 'the arm'],
      ['a perna', 'the leg'],
      ['o pé', 'the foot'],
      ['a mão', 'the hand'],
      ['os olhos', 'the eyes'],
      ['o dente', 'the tooth'],
      ['dói-me a cabeça', 'I have a headache', { lesson: 'u16-doer', note: 'Literally "the head hurts me".' }],
      ['dói-me a garganta', 'I have a sore throat'],
      ['doem-me as costas', 'my back hurts', { note: 'Plural thing → doem.' }],
      ['onde lhe dói?', 'where does it hurt? (polite)'],
      ['sinto-me mal', 'I feel ill', { lesson: 'u16-sentir' }],
      ['sinto-me melhor', 'I feel better'],
      ['estou constipado', 'I have a cold', { accept: ['estou constipada'], note: 'Careful: constipado means "has a cold", not constipated!' }],
      ['tenho febre', 'I have a fever'],
      ['tenho tosse', 'I have a cough'],
      ['tenho gripe', 'I have the flu'],
      ['a farmácia', 'the pharmacy'],
      ['o médico', 'the doctor', { accept: ['a médica'] }],
      ['o centro de saúde', 'the health centre (GP)'],
      ['o hospital', 'the hospital'],
      ['os comprimidos', 'the tablets / pills'],
      ['tem alguma coisa para a tosse?', 'do you have something for a cough?'],
      ['três vezes por dia', 'three times a day'],
      ['sou alérgico à penicilina', "I'm allergic to penicillin", { accept: ['sou alérgica à penicilina'] }],
      ['preciso de um médico', 'I need a doctor'],
      ['socorro!', 'help!'],
      ['ligue para o cento e doze', 'call 112 (emergency)', { accept: ['ligue para o 112'], note: '112 is the emergency number in Portugal.' }],
      ['as melhoras!', 'get well soon!'],
    ],
    lessons: [
      {
        id: 'u16-doer', title: 'Dói-me: "it hurts me"',
        body: `<p>In Portuguese the body part does the hurting:</p>
<ul><li><b>Dói-me</b> a cabeça. (One thing hurts.)</li><li><b>Doem-me</b> as costas. (Plural thing.)</li></ul>
<p>Asking someone else: <i>Onde <b>lhe</b> dói?</i> (polite) · <i>Onde <b>te</b> dói?</i> (tu)</p>
<p>You can also say <i>Tenho dores de cabeça</i> (I have a headache).</p>`,
      },
      {
        id: 'u16-sentir', title: 'Sinto-me: "I feel"',
        body: `<p><b>sentir-se</b> = to feel. The eu form changes its vowel: <b>sinto</b>.</p>
<p><i>Sinto-me mal. Sinto-me melhor. Como se sente?</i> (How do you feel? polite)</p>`,
      },
    ],
  },

  {
    n: 17, title: 'A casa', subtitle: 'Home: rooms, furniture, where things are',
    items: [
      ['o apartamento', 'the flat / apartment'],
      ['o quarto', 'the bedroom', { note: 'quarto also means "quarter".' }],
      ['a sala', 'the living room', { accept: ['a sala de estar'] }],
      ['a cozinha', 'the kitchen'],
      ['a casa de banho', 'the bathroom'],
      ['o jardim', 'the garden'],
      ['a varanda', 'the balcony'],
      ['a janela', 'the window'],
      ['a porta', 'the door'],
      ['a cama', 'the bed'],
      ['a mesa', 'the table'],
      ['a cadeira', 'the chair'],
      ['o sofá', 'the sofa'],
      ['o frigorífico', 'the fridge', { note: 'Portugal: frigorífico. Brazil: geladeira.' }],
      ['o fogão', 'the cooker / stove'],
      ['a máquina de lavar', 'the washing machine'],
      ['o armário', 'the cupboard / wardrobe'],
      ['as chaves', 'the keys'],
      ['há um quarto', 'there is one bedroom', { lesson: 'u17-ha' }],
      ['há dois quartos', 'there are two bedrooms'],
      ['não há elevador', "there's no lift"],
      ['o rés-do-chão', 'the ground floor', { note: 'Portugal: rés-do-chão (r/c). Brazil: térreo.' }],
      ['o primeiro andar', 'the first floor'],
      ['moro num terceiro andar', 'I live on a third floor'],
      ['em cima da mesa', 'on the table', { lesson: 'u17-where' }],
      ['debaixo da cama', 'under the bed'],
      ['dentro do armário', 'inside the cupboard'],
      ['atrás da porta', 'behind the door'],
      ['onde estão as chaves?', 'where are the keys?'],
      ['a renda', 'the rent', { note: 'Portugal: renda. Brazil: aluguel.' }],
      ['arrendar um apartamento', 'to rent a flat', { accept: ['alugar um apartamento'] }],
      ['arrumar a casa', 'to tidy the house'],
      ['limpar', 'to clean'],
    ],
    lessons: [
      {
        id: 'u17-ha', title: 'Há: "there is / there are"',
        body: `<p><b>Há</b> never changes:</p>
<ul><li><b>Há</b> um quarto. (There is one bedroom.)</li><li><b>Há</b> dois quartos. (There are two bedrooms.)</li><li><b>Não há</b> elevador. (There's no lift.)</li></ul>
<p>Questions too: <i>Há multibanco aqui perto?</i></p>`,
      },
      {
        id: 'u17-where', title: 'Where things are',
        body: `<p>These place words take <b>de</b>, which merges with the article:</p>
<ul><li><b>em cima de</b>: on top of → em cima <b>da</b> mesa</li><li><b>debaixo de</b>: under → debaixo <b>da</b> cama</li>
<li><b>dentro de</b>: inside → dentro <b>do</b> armário</li><li><b>atrás de</b>: behind → atrás <b>da</b> porta</li><li><b>ao lado de</b>: next to</li></ul>`,
      },
    ],
  },

  {
    n: 18, title: 'No restaurante', subtitle: 'Eating out',
    items: [
      ['uma mesa para dois, por favor', 'a table for two, please'],
      ['tenho uma reserva', 'I have a reservation'],
      ['o empregado', 'the waiter', { accept: ['a empregada'] }],
      ['o prato do dia', 'the dish of the day'],
      ['a entrada', 'the starter'],
      ['o prato principal', 'the main course'],
      ['a sobremesa', 'the dessert'],
      ['o couvert', 'bread and nibbles (charged)', { note: 'The bread, olives and butter brought to your table are not free. You can send them back.' }],
      ['o que recomenda?', 'what do you recommend?', { lesson: 'u18-order' }],
      ['para mim, o bacalhau', 'the salt cod for me'],
      ['eu queria o bife', "I'd like the steak", { accept: ['queria o bife'] }],
      ['bem passado', 'well done (meat)'],
      ['mal passado', 'rare (meat)'],
      ['sem cebola', 'without onion'],
      ['sou vegetariano', "I'm vegetarian", { accept: ['sou vegetariana'] }],
      ['tem pratos vegetarianos?', 'do you have vegetarian dishes?'],
      ['peixe grelhado', 'grilled fish'],
      ['o vinho da casa', 'the house wine'],
      ['um jarro de água', 'a jug of water'],
      ['pode trazer mais pão?', 'could you bring more bread?', { lesson: 'u18-pode' }],
      ['pode trazer a conta?', 'could you bring the bill?'],
      ['o sal', 'the salt'],
      ['o garfo', 'the fork'],
      ['a faca', 'the knife'],
      ['a colher', 'the spoon'],
      ['o guardanapo', 'the napkin'],
      ['o copo', 'the glass'],
      ['bom apetite!', 'enjoy your meal!'],
      ['saúde!', 'cheers!'],
      ['estava delicioso', 'it was delicious'],
      ['o serviço está incluído?', 'is service included?'],
      ['a gorjeta', 'the tip (money)'],
    ],
    lessons: [
      {
        id: 'u18-order', title: 'Ordering a meal',
        body: `<ul><li>Ask: <i>O que recomenda? · Qual é o prato do dia?</i></li>
<li>Order: <i>Eu queria… · Para mim, … · Para ela, …</i></li>
<li>Meat: <i>mal passado</i> (rare), <i>médio</i> (medium), <i>bem passado</i> (well done).</li></ul>
<p>Waiters often bring <b>o couvert</b> (bread, olives) before you order. It's charged, so say <i>Não, obrigado</i> if you don't want it.</p>`,
      },
      {
        id: 'u18-pode', title: 'Pode…? Polite requests',
        body: `<p><b>Pode</b> + verb = "could you…?" (polite):</p>
<p><i>Pode trazer a conta? · Pode repetir? · Pode falar mais devagar?</i></p>
<p>With friends use <b>podes</b>: <i>Podes passar o sal?</i></p>`,
      },
    ],
  },

  {
    n: 19, title: 'O tempo', subtitle: 'Weather, seasons, months and dates',
    items: [
      ['como está o tempo?', "what's the weather like?", { lesson: 'u19-weather' }],
      ['está sol', "it's sunny", { accept: ['faz sol'] }],
      ['está calor', "it's hot (weather)", { accept: ['faz calor'] }],
      ['está frio', "it's cold (weather)", { accept: ['faz frio'] }],
      ['está a chover', "it's raining"],
      ['está vento', "it's windy", { accept: ['faz vento'] }],
      ['está nublado', "it's cloudy"],
      ['está bom tempo', 'the weather is nice', { accept: ['faz bom tempo'] }],
      ['está mau tempo', 'the weather is bad', { accept: ['faz mau tempo'] }],
      ['vai chover amanhã', "it's going to rain tomorrow"],
      ['o guarda-chuva', 'the umbrella'],
      ['estão vinte graus', "it's twenty degrees"],
      ['a primavera', 'spring'],
      ['o verão', 'summer'],
      ['o outono', 'autumn'],
      ['o inverno', 'winter'],
      ['janeiro', 'January', { lesson: 'u19-months' }],
      ['fevereiro', 'February'],
      ['março', 'March'],
      ['abril', 'April'],
      ['maio', 'May'],
      ['junho', 'June'],
      ['julho', 'July'],
      ['agosto', 'August'],
      ['setembro', 'September'],
      ['outubro', 'October'],
      ['novembro', 'November'],
      ['dezembro', 'December'],
      ['em julho', 'in July'],
      ['no dia cinco de maio', 'on the fifth of May', { accept: ['a cinco de maio'] }],
      ['quando é o teu aniversário?', 'when is your birthday?'],
      ['o meu aniversário é a dez de março', 'my birthday is on the tenth of March', { accept: ['o meu aniversário é no dia dez de março'] }],
    ],
    lessons: [
      {
        id: 'u19-weather', title: 'Talking about the weather',
        body: `<p>Portugal mostly uses <b>estar</b> for the weather right now: <i>Está sol. Está frio. Está a chover.</i></p>
<p><b>fazer</b> also works: <i>Faz calor.</i></p>
<p>Temperature: <i>Estão vinte graus.</i> (plural, like the time)</p>
<p>Forecasts use <b>vai</b> + verb: <i>Vai chover amanhã.</i></p>`,
      },
      {
        id: 'u19-months', title: 'Months and dates',
        body: `<p>Months are written with a small letter: <i>janeiro, fevereiro, março…</i></p>
<ul><li>in a month: <b>em</b> julho</li><li>a date: <b>no dia</b> cinco <b>de</b> maio, or just <b>a</b> cinco de maio</li></ul>
<p>Dates use plain numbers (<i>cinco</i>, not "fifth"). The first is often <i>primeiro</i> or <i>um</i>: <i>a um de janeiro</i>.</p>`,
      },
    ],
  },

  {
    n: 20, title: 'Ao telefone', subtitle: 'Phone calls, messages and appointments',
    items: [
      ['estou?', 'hello? (answering the phone)', { accept: ['está?', 'sim?', 'está lá?'], lesson: 'u20-phone' }],
      ['quem fala?', "who's speaking?"],
      ['é o João', "it's João (speaking)", { accept: ['fala o João'] }],
      ['posso falar com a Marta?', 'can I speak to Marta?'],
      ['um momento, por favor', 'one moment, please'],
      ['ela não está', "she's not in"],
      ['quer deixar recado?', 'would you like to leave a message?'],
      ['ligo mais tarde', "I'll call back later"],
      ['ligar', 'to call / to phone'],
      ['o telemóvel', 'the mobile phone', { note: 'Portugal: telemóvel. Brazil: celular.' }],
      ['o número de telefone', 'the phone number'],
      ['qual é o seu número?', 'what is your number? (polite)'],
      ['a mensagem', 'the (text) message'],
      ['mando-te uma mensagem', "I'll send you a message"],
      ['não tenho rede', "I've got no signal"],
      ['não se ouve bem', "I can't hear you well"],
      ['queria marcar uma consulta', "I'd like to make an appointment", { lesson: 'u20-booking' }],
      ['tem vaga na terça-feira?', 'do you have a slot on Tuesday?', { accept: ['tem vaga na terça?'] }],
      ['pode ser às dez?', 'could it be at ten?'],
      ['qual é o seu nome?', 'what is your name? (formal)'],
      ['pode soletrar?', 'can you spell it?'],
      ['a morada', 'the (home) address', { note: 'Portugal: morada. Endereço is mostly for email and web.' }],
      ['o email', 'the email', { accept: ['o e-mail'] }],
      ['preciso de cancelar', 'I need to cancel'],
      ['queria mudar a hora', "I'd like to change the time"],
      ['fica marcado', "it's booked", { accept: ['fica marcada'] }],
      ['obrigado pela ajuda', 'thanks for the help', { accept: ['obrigada pela ajuda'] }],
      ['com os melhores cumprimentos', 'kind regards (in emails)'],
      ['falamos depois', 'talk later'],
      ['beijinhos', 'love / kisses (to friends)', { note: 'Very common to end calls and messages with friends and family.' }],
      ['até já', 'see you in a minute'],
    ],
    lessons: [
      {
        id: 'u20-phone', title: 'On the phone in Portugal',
        body: `<p>People answer with <b>Estou?</b> ("I'm here?"), <b>Sim?</b> or <b>Está lá?</b>. <i>Alô</i> is Brazilian.</p>
<ul><li>Who is it: <i>Quem fala?</i> · <i>É o João.</i></li><li>Asking for someone: <i>Posso falar com a Marta?</i></li><li>Not there: <i>Ela não está. Quer deixar recado?</i></li></ul>`,
      },
      {
        id: 'u20-booking', title: 'Booking an appointment',
        body: `<p><b>marcar</b> = to book / to schedule. A doctor's or hairdresser's appointment is <i>uma consulta</i> or <i>uma marcação</i>.</p>
<p><i>Queria marcar uma consulta. Tem vaga na terça? Pode ser às dez?</i> · <i>Fica marcado.</i> (It's booked.)</p>
<p>To change it: <i>Queria mudar a hora</i> / <i>Preciso de cancelar</i>.</p>`,
      },
    ],
  },
];
