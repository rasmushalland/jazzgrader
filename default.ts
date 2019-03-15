type PositionedPhrase = Readonly<{ text: string, pos: number }>;
type ParsedPhrase = Readonly<{
    text: string,
    words: string[],
    pos: number,
}>;


interface String {
    startsWith(x: string): boolean;
    normalize(nf: string): string;
}

function parsePhrase(p: PositionedPhrase): ParsedPhrase {
    const words: string[] = [];
    p.text.replace(/(\w+)/g, (s, ...rest) => {
        words.push(removeDiacritics(s.toLocaleLowerCase()));
        return 'oo';
    });
    return {
        text: p.text,
        words: words,
        pos: p.pos,
    };
}

function findPhrasesInRefText(text: string): PositionedPhrase[] {
    // using .split does not give us the match position. Not that we need it
    // for the reference text, but we do need it for the user input.

    // This is a bit clumsy: we want one item per blank-line-separated
    // sequence of text lines. regex could be shorter, but it resisted...
    const lines: { text: string, pos: number }[] = [];
    let lastlfidx = -1;
    let iter = 0;
    while (true) {
        iter++;
        if (iter >= 500)
            throw new Error('iter...');
        const nextidx = text.indexOf('\n', lastlfidx + 1);
        if (nextidx == -1) {
            if (lastlfidx + 2 < text.length) {
                lines.push({ text: text.substr(lastlfidx + 1), pos: lastlfidx + 1 });
            }
            break;
        }
        else {
            lines.push({ text: text.substr(lastlfidx + 1, nextidx - (lastlfidx + 1)), pos: lastlfidx + 1 });
            lastlfidx = nextidx;
        }
    }


    // Identify the line sequences and join them.
    let cursectlines: { text: string, pos: number }[] | null = null;
    const sections: { text: string, pos: number }[] = [];
    const drainToSectionIfNotEmpty = () => {
        if (cursectlines) {
            var sectext = cursectlines.map(l => l.text).join('\n').trim();
            // Some ref texts do not end in period or other punctiation. Let us try to 
            // help by making it do so.
            if (sectext.length && sectext[sectext.length-1].match(/\w/))
                sectext += '.';
            sections.push({ text: sectext, pos: cursectlines[0].pos });
        }
        cursectlines = null;
    }
    for (let index = 0; index < lines.length; index++) {
        const line = lines[index];
        const empty = line.text.match(/^\s*$/);
        if (empty) {
            drainToSectionIfNotEmpty();
        } else {
            if (cursectlines === null) {
                cursectlines = [];
            }
            cursectlines.push(line);
        }
    }
    drainToSectionIfNotEmpty();

    return sections.map(r => ({
        text: r.text.replace(/\s+/g, ' '),
        pos: r.pos
    }));
}

function findPhrasesInUserInput(text: string): PositionedPhrase[] {
    let parts: PositionedPhrase[] = [];
    // this regex is made for some random text (typescript manual piece), so
    // it might need some modifications.
    text.replace(/(\b[A-Z].+?(?:\.|\?))/gms, (s, ...rest) => {
        const pos = rest[1] as number;
        parts.push({ text: s, pos });
        return 'Q';
    });

    return parts.map(r => ({
        text: r.text.replace(/\s+/g, ' '),
        pos: r.pos
    }));
}

function searchSentStartBack(text: string, pos: number): number {
    const period = 46;
    for (let idx = pos; idx >= 0; idx--) {
        const ch = text.charCodeAt(idx);
        if (ch === period) {
            const isboundary = idx > 0 && text[idx - 1].match(/\w/);
            if (isboundary) {
                // Look a bit forward to see if we can find some non-whitespace.
                let idxf = idx + 1;
                for (; idxf <= idx; idxf++) {
                    if (!text[idxf].match(/\s/))
                        break;
                }
                return Math.min(idxf + 1, pos);
            }

        }
        else if (ch === 10) {
            return Math.min(idx + 1, pos);
        }
    }
    return 0;

}
function getSearchSentStartFwd(text: string, pos: number): number {
    const period = 46;
    for (let idx = pos + 1; idx < text.length; idx++) {
        const ch = text.charCodeAt(idx);
        if (ch == period && idx > pos && text[idx - 1].match(/\w/))
            return idx + 1;
        if (ch == 13 || ch === 10)
            return idx;
    }
    return pos;
}


function tryGetComplNum(wx: string): number | 'maybe' | null {
    const arr = wx.match(/^p(\d*)$/);
    if (!arr)
        return null;
    const [_, numstr] = arr;
    // If the user is typing 'p' in order to select a completion, we don't want
    // the completion list to go away just because the number has not yet been
    // entered.
    if (numstr === '')
        return 'maybe';
    return parseInt(numstr, 10);
}

function hideResults() {
    const reslist = document.getElementById('options');
    if (!(reslist instanceof HTMLOListElement))
        throw new Error('options is not an OL.');
    while (true) {
        if (!reslist.firstElementChild)
            break;
        reslist.firstElementChild.remove();
    }
}
function setupTextarea() {
    const tax = document.getElementById('ta1');
    if (!(tax instanceof HTMLTextAreaElement))
        throw new Error('ta1 not found.');
    const ta = tax;

    function updateCharCountinfo() {
        // Update the character count info.
        const charcntinp = document.getElementById('charcntinp')!;
        if (!(charcntinp instanceof HTMLInputElement))
            throw new Error('charcntinp');
        const usertext = ta.value;
        charcntinp.value = usertext.length.toString();
    }

    updateCharCountinfo();
    const pdb = findPhrasesInRefText(reftextraw).map(sent => parsePhrase(sent));
    ta.addEventListener('blur', () => {
        hideResults();
    });
    ta.addEventListener('input', () => {
        const usertext = ta.value;
        updateCharCountinfo();

        // Find the phrase that the cursor is in.
        const cursorpos = ta.selectionStart;
        const ps = searchSentStartBack(usertext, cursorpos);
        const pe = getSearchSentStartFwd(usertext, cursorpos);
        const mp: PositionedPhrase = { text: usertext.substr(ps, pe - ps), pos: ps };
        const editp = parsePhrase(mp);
        if (editp.words.length === 0) {
            hideResults();
            return;
        }

        // Find matching phrases in the reference text.
        const matches: ParsedPhrase[] = [];
        for (const refp of pdb) {
            let match = true;
            for (let editidx = 0, refidx = 0; editidx < editp.words.length; editidx++ , refidx++) {
                if (editidx >= refp.words.length) {
                    break;
                }
                if (editp.words[editidx] !== refp.words[refidx]) {
                    const isprefix = refp.words[refidx].startsWith(editp.words[editidx]);
                    const iscompletionreq = tryGetComplNum(editp.words[editidx]) !== null;
                    const canmatch = (isprefix && editidx >= editp.words.length - 2) || iscompletionreq;
                    if (!canmatch) {
                        match = false;
                    }
                }
            }
            if (match)
                matches.push(refp);
        }

        // Transform matches to list entries.
        hideResults();
        const reslist = document.getElementById('options');
        if (!(reslist instanceof HTMLOListElement))
            throw new Error('options is not an OL.');
        const complnums = editp.words
            .map(w => tryGetComplNum(w))
            .filter(cn => cn !== null && cn !== 'maybe');
        if (complnums.length) {
            const n = complnums[0] as number - 1;
            if (n < matches.length) {
                const replacement = matches[n].text + '.';
                const curtext = ta.value;
                const ofs = editp.pos;
                const before = curtext.substr(0, ofs);
                const after = curtext.substr(ofs + editp.text.length);
                const newtext = before + replacement + after;
                ta.value = newtext;
                ta.selectionStart = before.length + replacement.length - 1;
                ta.selectionEnd = before.length + replacement.length - 1;
                updateCharCountinfo();
            }
            else
                console.log(`Match #${n + 1} does not exist.`);
        } else {
            for (let idx = 0; idx < Math.min(matches.length, 9); idx++) {
                const li = document.createElement('li');
                li.innerText = matches[idx].text;
                reslist.appendChild(li);
            }
        }
    });
}

setTimeout(() => {
    if (document.getElementById('ta1'))
        setupTextarea();
    const pplist = findPhrasesInRefText(reftextraw).map(sent => parsePhrase(sent));
    console.log(pplist);
}, 1000);

function removeDiacritics(str: string): string {
    const s1 = str.normalize('NFD');
    if (s1.length === str.length)
        return str;
    const arr: string[] = [];
    for (let idx = 0; idx < s1.length; idx++) {
        const ch = s1.charCodeAt(idx);
        const isdia = ch >= 0x300 && ch <= 0x36f;
        if (!isdia) {
            arr.push(s1.substr(idx, 1));
        }

    }
    return arr.join('');
}





const reftextraw = `
Good job, keep on working


*********** being so organized.

¡Bastante bien!
Sigue trabajando y siendo tan organizado.



it was a pleasure to have you in my class.
focus while listening, i know you can do it better

Don't forget to practice grammar, I know you can improve

If you improve grammar your writing will improve too.

Terrific job, continue like that.

You need to work harder on listening.

Practice vocabulary.

You need to organise your ideas before writing

Practice spelling.

Organise your ideas to provide coherence to your writing

Work group is important, don't be shy

Participation in class is a must if you want to improve speaking

Pair work is important to share your ideas in the class

I enjoy your participation, thank you for sharing your thoughts

Assignments are important to check your understanding, don't skip them

Be more active in class

Practice pronunciation, don't be afraid of speaking in class

Terrific job, congratulations

Very well done!

Keep it up

You need to work harder

It is important to participate in class

You need to improve your notebook

You seriously need to work hard on your
reading skills.
Read as many times as you need to understand
the meaning, don't guess, read!



You seriously need to work harder if
you want to learn.
you have the skill and capacity, just work
to get the results.

You seriously need to work harder if
you want to learn.
Listening and vocabulary are your biggest
problems right now, and it'll depend on you to
work as hard as possible in order to improve
and strengthen those areas.
you have the skill and capacity, just work
to get the results.

You definitely need to work harder on your
listening skills.
Check grammar, if you improve grammar
all your skills will improve


You definitely need to work harder on your listening skills.
Check vocabulary, to improve you need to work on each word, not simply memorizing it, but understanding its meaning, not just its translation.

Definitivamente necesitas trabajar más duro en tus habilidades de escucha.
Verifique el vocabulario, para mejorar la necesidad de trabajar en cada palabra, no solo memorizarla, sino comprender su significado, no solo su traducción.



You have serious problems at all levels,
you need to work really hard
if you don’t want to fail this course.
You'll also need to use the STUDY ROOM
in order to practice and improve.

Tienes problemas serios en todos los niveles,
necesitas trabajar muy duro si no quieres fallar
en este curso.
También necesitarás usar la SALA DE ESTUDIOS
para practicar y mejorar.


You must improve your grammar skills. There are mistakes such as:------
that at this level you shouldn’t have.
It is very important that you pay attention, work and practice every day.

GRAMMAR!
You must improve your grammar skills.
you have problems understanding structures
that at this level you shouldn’t have.

There are several weaknesses that you need to
fix before going to the next level.

You must improve your grammar skills.
you have problems understanding structures
that at this level you shouldn’t have.
It is very important that you pay attention,
arrive on time, present all the assignments,
ask questions in class, participate, work and
practice every day.


you most work more carefully and consciously on the vocabulary section.
Being able to speak is nice, but the meaning of those words is more important

I know you can do it!


You must work on pronunciation

You must work on spelling

You must work on intonation

Pay attention in class to understand better 

The workbook assignments are designed to help you with the structures and you mustn't skip them.

Punctuality is a beautiful virtue, don't be late

Your constant absences are costing you precious points

Check spelling, you need to improve

Check grammar

Grammar and vocabulary are easy to
improve, just keep an organized notebook
and your notes will be enough to remember.

Check grammar, if you improve grammar
your understanding levels in reading will
improve too.

Verifica la gramática, si mejoras la gramática,
tus niveles de comprensión en la lectura
también mejorarán.

Check grammar, if you improve grammar your understanding levels in reading will improve too. Keeping an organized notebook would help you recalling concepts and grammar structures.

focus more when reading,
you have the skills and the attitude to improve.

Enfócate más cuando lees, tienes las habilidades
y la actitud para mejorar.

You have proven the will and interest to
pass. keep on working hard like this!



WELL DONE!
try to focus more during the listening, i know
you can improve.

Don't forget to practice new words in order to remember them better

You need to pay attention while reading, don't guess, read and infer if needed.
,..................................
Necesita poner atención en clase, es importante que haga preguntas cuando no entienda algo.

Es primordial que mantenga un cuaderno de avance organizado y al día para poder seguir con las unidades de modo correlativo

La puntualidad es necesaria, de lo contrario se perjudican en el avance.

El vocabulario debe ser reforzado de forma constante en casa

Necesita activar la escritura, poner atención.

Es importante reforzar la pronunciación

Debe presentar atención en clase, se distrae con mucha facilidad

Los permisos para el baño son y deben ser medidas de urgencia, no rituales de cada clase, pues se perjudica el avance y correlación de la unidad.

El trabajo de….. es bastante bueno, participa bien, demuestra predisposición y solidaridad.

Trabaja de manera excepcional, participa y colabora en clase, el cuaderno de avance es ejemplar, la pronunciación muy acorde al nivel.

El cuaderno de avance es ejemplar, organizado y pulcro. Se recomienda el mismo empeño en participación en clase

Lamentablemente la gramàtica no ha mejorado y por lo tanto, las otras areas tambien se ven afectadas.
El vocabulario tampoco ha sido practicado y la producción escrita es bastante pobre.



`