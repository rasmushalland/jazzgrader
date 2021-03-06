"use strict";
function parsePhrase(p) {
    const words = [];
    p.text.replace(/(\w+)/gu, (s, ...rest) => {
        words.push(removeDiacritics(s.toLocaleLowerCase()));
        return 'oo';
    });
    return {
        text: p.text,
        words: words,
    };
}
function findPhrasesInRefText(text) {
    const lines = [];
    let lastlfidx = -1;
    let iter = 0;
    while (true) {
        iter++;
        if (iter >= 5000)
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
    let cursectlines = null;
    const sections = [];
    const drainToSectionIfNotEmpty = () => {
        if (cursectlines) {
            var sectext = cursectlines.map(l => l.text).join('\n').trim();
            if (sectext.length && sectext[sectext.length - 1].match(/\w/))
                sectext += '.';
            sections.push({ text: sectext, pos: cursectlines[0].pos });
        }
        cursectlines = null;
    };
    for (let index = 0; index < lines.length; index++) {
        const line = lines[index];
        const empty = line.text.match(/^\s*$/);
        if (empty) {
            drainToSectionIfNotEmpty();
        }
        else {
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
function findPhrasesInUserInput(text) {
    let parts = [];
    text.replace(/(\b[A-Z].+?(?:\.|\?))/gm, (s, ...rest) => {
        const pos = rest[1];
        parts.push({ text: s, pos });
        return 'Q';
    });
    return parts.map(r => ({
        text: r.text.replace(/\s+/g, ' '),
        pos: r.pos
    }));
}
function searchSentStartBack(text, pos) {
    const stops = ['.', '!', '?'].map(s => s.charCodeAt(0));
    for (let idx = pos; idx >= 0; idx--) {
        const ch = text.charCodeAt(idx);
        if (stops.indexOf(ch) !== -1) {
            const isboundary = idx > 0 && text[idx - 1].match(/\w/);
            if (isboundary) {
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
function getSearchSentStartFwd(text, pos) {
    const stops = ['.', '!', '?'].map(s => s.charCodeAt(0));
    for (let idx = pos + 1; idx < text.length; idx++) {
        const ch = text.charCodeAt(idx);
        if (stops.indexOf(ch) !== -1 && idx > pos && text[idx - 1].match(/\w/))
            return idx + 1;
        if (ch == 13 || ch === 10)
            return idx;
    }
    return pos;
}
function tryGetComplNum(wx) {
    const arr = wx.match(/^p(\d*)$/);
    if (!arr)
        return null;
    const [_, numstr] = arr;
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
function findMatches_wordsubsequence(query, pdb) {
    const matches = [];
    for (const refp of pdb) {
        let match = true;
        let startrefidx = 0;
        for (let idxq = 0; idxq < query.words.length; idxq++) {
            const wquery = query.words[idxq];
            let wmatch = false;
            for (let idxref = startrefidx; idxref < refp.words.length; idxref++) {
                const wref = refp.words[idxref];
                startrefidx = idxref;
                const isprefix = wref.startsWith(wquery);
                const iscompletionreq = tryGetComplNum(wquery) !== null;
                if (isprefix || (iscompletionreq && idxq !== 0)) {
                    wmatch = true;
                    break;
                }
            }
            if (!wmatch) {
                match = false;
                break;
            }
        }
        if (match) {
            matches.push(refp);
        }
    }
    return matches;
}
function findMatches(query, pdb) {
    const rawmatches = [];
    for (const refp of pdb) {
        let match = true;
        for (let qidx = 0, refidx = 0; qidx < query.words.length; qidx++, refidx++) {
            if (qidx >= refp.words.length) {
                break;
            }
            if (query.words[qidx] !== refp.words[refidx]) {
                const isprefix = refp.words[refidx].startsWith(query.words[qidx]);
                const iscompletionreq = tryGetComplNum(query.words[qidx]) !== null;
                const canmatch = (isprefix && qidx >= query.words.length - 2) || (iscompletionreq && qidx !== 0);
                if (!canmatch) {
                    match = false;
                }
            }
        }
        if (match)
            rawmatches.push(refp);
    }
    rawmatches.push(...findMatches_wordsubsequence(query, pdb));
    const matches = [];
    const usedtexts = {};
    for (const m of rawmatches) {
        if (usedtexts[m.text])
            continue;
        usedtexts[m.text] = true;
        matches.push(m);
    }
    return rawmatches;
}
function copyTextAreaContentAndEnforceLineLength() {
    const ta = getTextArea();
    const text = ta.value;
    const res = breakIntolines(text);
    ta.value = res;
    ta.select();
    const range = document.createRange();
    range.selectNode(ta);
    window.getSelection().addRange(range);
    document.execCommand('copy');
}
function getTextArea() {
    const tax = document.getElementById('ta1');
    if (!(tax instanceof HTMLTextAreaElement))
        throw new Error('ta1 not found.');
    return tax;
}
function setupTextarea() {
    const ta = getTextArea();
    function updateCharCountInfo() {
        const charcntinp = document.getElementById('charcntinp');
        if (!(charcntinp instanceof HTMLInputElement))
            throw new Error('charcntinp');
        const usertext = ta.value;
        charcntinp.value = usertext.length.toString();
        if (usertext.length > 200)
            charcntinp.classList.add('char-limit-exeeded');
        else
            charcntinp.classList.remove('char-limit-exeeded');
    }
    updateCharCountInfo();
    const refTa = getRefTextarea();
    refTa.addEventListener('change', _ => {
        pdb = findPhrasesInRefText(getRefTextarea().value).map(sent => parsePhrase(sent));
    });
    let pdb = findPhrasesInRefText(getRefTextarea().value).map(sent => parsePhrase(sent));
    ta.addEventListener('blur', () => {
        hideResults();
    });
    ta.addEventListener('input', () => {
        const usertext = ta.value;
        updateCharCountInfo();
        const cursorpos = ta.selectionStart;
        const ps = searchSentStartBack(usertext, cursorpos);
        const pe = getSearchSentStartFwd(usertext, cursorpos);
        const mp = { text: usertext.substr(ps, pe - ps), pos: ps };
        const editp = parsePhrase(mp);
        const editp_pos = ps;
        if (editp.words.length === 0) {
            hideResults();
            return;
        }
        const matches = findMatches(editp, pdb);
        hideResults();
        const reslist = document.getElementById('options');
        if (!(reslist instanceof HTMLOListElement))
            throw new Error('options is not an OL.');
        const complnums = editp.words
            .map(w => tryGetComplNum(w))
            .filter(cn => cn !== null && cn !== 'maybe');
        if (complnums.length) {
            const refnum = complnums[0] - 1;
            if (refnum < matches.length) {
                const replacement = matches[refnum].text;
                const curtext = ta.value;
                const ofs = editp_pos;
                const before = curtext.substr(0, ofs);
                const after = curtext.substr(ofs + editp.text.length);
                const newtext = before + replacement + after;
                ta.value = newtext;
                ta.selectionStart = before.length + replacement.length;
                ta.selectionEnd = before.length + replacement.length;
                updateCharCountInfo();
            }
            else
                console.log(`Match #${refnum + 1} does not exist.`);
        }
        else {
            for (let idx = 0; idx < Math.min(matches.length, 9); idx++) {
                const li = document.createElement('li');
                li.innerText = matches[idx].text;
                reslist.appendChild(li);
            }
        }
    });
}
setTimeout(() => {
    getRefTextarea().value = stdRefText;
    if (document.getElementById('ta1'))
        setupTextarea();
}, 1000);
function getRefTextarea() {
    const refTa = document.getElementById('refTextTa');
    if (!(refTa instanceof HTMLTextAreaElement))
        throw new Error('ref TA not found.');
    return refTa;
}
function toggleShowRefTextTextarea() {
    const ta = getRefTextarea();
    console.log('ta', ta);
    ta.style.display = getComputedStyle(ta).display != 'none' ? 'none' : 'unset';
}
function removeDiacritics(str) {
    const s1 = str.normalize('NFD');
    if (s1.length === str.length)
        return str;
    const arr = [];
    for (let idx = 0; idx < s1.length; idx++) {
        const ch = s1.charCodeAt(idx);
        const isdia = ch >= 0x300 && ch <= 0x36f;
        if (!isdia) {
            arr.push(s1.substr(idx, 1));
        }
    }
    return arr.join('');
}
function breakIntolines(text, lineLength) {
    const text2 = text.replace('\r\n', '\n');
    const lines = text2.split(/\n/g);
    const resarr = [];
    const ml = lineLength || 45;
    if (ml < 15) {
        throw new Error('Max line length must at least be 15.');
    }
    else if (ml >= 150) {
        throw new Error('Max line length must be less than 150.');
    }
    for (const il of lines) {
        let rest = il.trim();
        while (rest.length > ml) {
            let brokeAtSpace = false;
            for (let idx = ml; idx >= 0; idx--) {
                const isspace = rest[idx] === ' ';
                if (isspace) {
                    const fst = rest.substr(0, idx);
                    resarr.push(fst.trim());
                    rest = rest.substr(idx);
                    brokeAtSpace = true;
                    break;
                }
            }
            if (!brokeAtSpace) {
                throw new Error('untested');
                const len = ml - 3;
                const fst = rest.substr(0, len) + '-';
                resarr.push(fst.trim());
                rest = rest.substr(len);
            }
        }
        resarr.push(rest.trim());
    }
    return resarr.join('\n').trim();
}
const stdRefText = `
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



`;
if ('QUnit' in window) {
    QUnit.test("ref text splits at blank lines", ass => {
        const input = `
The first one.
second line of the first.
 
more to come, this one without capital letter and trailing period

 `.replace('\r\n', '\n');
        const dump = findPhrasesInRefText(input).map(part => part.text);
        ass.equal(dump, [
            "The first one. second line of the first.",
            "more to come, this one without capital letter and trailing period.",
        ]);
    });
    QUnit.test('Find start of sentence, looking backwards', ass => {
        function getSearchSentStartBack(text) {
            const cursorpos = text.indexOf('Q');
            if (cursorpos === -1)
                throw new Error('Didn\'t find cursor indicator Q.');
            const ps = searchSentStartBack(text, cursorpos);
            const pe = getSearchSentStartFwd(text, cursorpos);
            return text.substr(ps, pe - ps);
        }
        ass.equal(getSearchSentStartBack('The sentence iQs this.'), 'The sentence iQs this.');
        ass.equal(getSearchSentStartBack('Sentence before. The sentence iQs this.'), 'The sentence iQs this.');
        ass.equal(getSearchSentStartBack('Sentence before! The sentence iQs this.'), 'The sentence iQs this.');
        ass.equal(getSearchSentStartBack('Sentence before? The sentence iQs this.'), 'The sentence iQs this.');
        ass.equal(getSearchSentStartBack(`Sentence before. 
The sentence iQs this.`), 'The sentence iQs this.');
        ass.equal(getSearchSentStartBack(`Sentence before. 
the sentence iQs this. More
`), 'the sentence iQs this.');
        ass.equal(getSearchSentStartBack(`Sentence before. 
the sentence iQs this. More
`), 'the sentence iQs this.');
    });
    const ppx = text => {
        return parsePhrase({ text, pos: 0 });
    };
    QUnit.test('parsePhrase, basic', ass => {
        ass.equal(ppx('the').words.join(','), 'the');
        ass.equal(ppx('the bee').words.join(','), 'the,bee');
    });
    QUnit.test('parsePhrase, numeric suffix', ass => {
        ass.equal(ppx('the p2').words.join(','), 'the,p2');
    });
    QUnit.test('parsePhrase, diacritics', ass => {
        ass.equal(ppx('también').words.join(','), 'tambien');
    });
    QUnit.test('match, subsequence, entire word', ass => {
        let matches = findMatches_wordsubsequence(ppx('the bee'), [ppx('the bee is'), ppx('the shark is')]).map(match => match.text);
        ass.deepEqual(matches, ['the bee is']);
        matches = findMatches_wordsubsequence(ppx('the bee'), [ppx('the yellow bee')]).map(match => match.text);
        ass.deepEqual(matches, ['the yellow bee']);
    });
    QUnit.test('match, subsequence, entire word', ass => {
        let matches = findMatches_wordsubsequence(ppx('the bee'), [ppx('bee the')]).map(match => match.text);
        ass.deepEqual(matches, [], 'The words are in different order.');
    });
    QUnit.test('match, subsequence, word prefix', ass => {
        let matches = findMatches_wordsubsequence(ppx('th be'), [ppx('the bee')]).map(match => match.text);
        ass.deepEqual(matches, ['the bee']);
        matches = findMatches_wordsubsequence(ppx('the be'), [ppx('the yellow bee')]).map(match => match.text);
        ass.deepEqual(matches, ['the yellow bee']);
    });
    QUnit.test('match, removeDiacritics', ass => {
        let matches = findMatches_wordsubsequence(ppx('tambien'), [ppx('también')]).map(match => match.text);
        ass.deepEqual(matches, ['también']);
    });
    QUnit.test("break into lines, first", ass => {
        ass.equal(breakIntolines(`
Participation in class is a must if you want to improve speaking
        
         `), `Participation in class is a must if you want to improve
speaking`);
    });
}
//# sourceMappingURL=out.js.map