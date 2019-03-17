"use strict";
function parsePhrase(p) {
    var words = [];
    p.text.replace(/([\p{Alphabetic}\p{Mark}\p{Decimal_Number}\p{Connector_Punctuation}\p{Join_Control}]+)/gu, function (s) {
        var rest = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            rest[_i - 1] = arguments[_i];
        }
        words.push(removeDiacritics(s.toLocaleLowerCase()));
        return 'oo';
    });
    return {
        text: p.text,
        words: words
    };
}
function findPhrasesInRefText(text) {
    var lines = [];
    var lastlfidx = -1;
    var iter = 0;
    while (true) {
        iter++;
        if (iter >= 500)
            throw new Error('iter...');
        var nextidx = text.indexOf('\n', lastlfidx + 1);
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
    var cursectlines = null;
    var sections = [];
    var drainToSectionIfNotEmpty = function () {
        if (cursectlines) {
            var sectext = cursectlines.map(function (l) { return l.text; }).join('\n').trim();
            if (sectext.length && sectext[sectext.length - 1].match(/\w/))
                sectext += '.';
            sections.push({ text: sectext, pos: cursectlines[0].pos });
        }
        cursectlines = null;
    };
    for (var index = 0; index < lines.length; index++) {
        var line = lines[index];
        var empty = line.text.match(/^\s*$/);
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
    return sections.map(function (r) { return ({
        text: r.text.replace(/\s+/g, ' '),
        pos: r.pos
    }); });
}
function findPhrasesInUserInput(text) {
    var parts = [];
    text.replace(/(\b[A-Z].+?(?:\.|\?))/gms, function (s) {
        var rest = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            rest[_i - 1] = arguments[_i];
        }
        var pos = rest[1];
        parts.push({ text: s, pos: pos });
        return 'Q';
    });
    return parts.map(function (r) { return ({
        text: r.text.replace(/\s+/g, ' '),
        pos: r.pos
    }); });
}
function searchSentStartBack(text, pos) {
    var stops = ['.', '!', '?'].map(function (s) { return s.charCodeAt(0); });
    for (var idx = pos; idx >= 0; idx--) {
        var ch = text.charCodeAt(idx);
        if (stops.indexOf(ch) !== -1) {
            var isboundary = idx > 0 && text[idx - 1].match(/\w/);
            if (isboundary) {
                var idxf = idx + 1;
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
    var stops = ['.', '!', '?'].map(function (s) { return s.charCodeAt(0); });
    for (var idx = pos + 1; idx < text.length; idx++) {
        var ch = text.charCodeAt(idx);
        if (stops.indexOf(ch) !== -1 && idx > pos && text[idx - 1].match(/\w/))
            return idx + 1;
        if (ch == 13 || ch === 10)
            return idx;
    }
    return pos;
}
function tryGetComplNum(wx) {
    var arr = wx.match(/^p(\d*)$/);
    if (!arr)
        return null;
    var _ = arr[0], numstr = arr[1];
    if (numstr === '')
        return 'maybe';
    return parseInt(numstr, 10);
}
function hideResults() {
    var reslist = document.getElementById('options');
    if (!(reslist instanceof HTMLOListElement))
        throw new Error('options is not an OL.');
    while (true) {
        if (!reslist.firstElementChild)
            break;
        reslist.firstElementChild.remove();
    }
}
function findMatches_wordsubsequence(query, pdb) {
    var matches = [];
    for (var _i = 0, pdb_1 = pdb; _i < pdb_1.length; _i++) {
        var refp = pdb_1[_i];
        var match = true;
        var startrefidx = 0;
        for (var idxq = 0; idxq < query.words.length; idxq++) {
            var wquery = query.words[idxq];
            var wmatch = false;
            for (var idxref = startrefidx; idxref < refp.words.length; idxref++) {
                var wref = refp.words[idxref];
                startrefidx = idxref;
                var isprefix = wref.startsWith(wquery);
                var iscompletionreq = tryGetComplNum(wquery) !== null;
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
    var rawmatches = [];
    for (var _i = 0, pdb_2 = pdb; _i < pdb_2.length; _i++) {
        var refp = pdb_2[_i];
        var match = true;
        for (var qidx = 0, refidx = 0; qidx < query.words.length; qidx++, refidx++) {
            if (qidx >= refp.words.length) {
                break;
            }
            if (query.words[qidx] !== refp.words[refidx]) {
                var isprefix = refp.words[refidx].startsWith(query.words[qidx]);
                var iscompletionreq = tryGetComplNum(query.words[qidx]) !== null;
                var canmatch = (isprefix && qidx >= query.words.length - 2) || (iscompletionreq && qidx !== 0);
                if (!canmatch) {
                    match = false;
                }
            }
        }
        if (match)
            rawmatches.push(refp);
    }
    rawmatches.push.apply(rawmatches, findMatches_wordsubsequence(query, pdb));
    var matches = [];
    var usedtexts = {};
    for (var _a = 0, rawmatches_1 = rawmatches; _a < rawmatches_1.length; _a++) {
        var m = rawmatches_1[_a];
        if (usedtexts[m.text])
            continue;
        usedtexts[m.text] = true;
        matches.push(m);
    }
    return rawmatches;
}
function setupTextarea() {
    var tax = document.getElementById('ta1');
    if (!(tax instanceof HTMLTextAreaElement))
        throw new Error('ta1 not found.');
    var ta = tax;
    function updateCharCountInfo() {
        var charcntinp = document.getElementById('charcntinp');
        if (!(charcntinp instanceof HTMLInputElement))
            throw new Error('charcntinp');
        var usertext = ta.value;
        charcntinp.value = usertext.length.toString();
        if (usertext.length > 200)
            charcntinp.classList.add('char-limit-exeeded');
        else
            charcntinp.classList.remove('char-limit-exeeded');
    }
    updateCharCountInfo();
    var refTa = getRefTextarea();
    refTa.addEventListener('change', function (_) {
        pdb = findPhrasesInRefText(getRefTextarea().value).map(function (sent) { return parsePhrase(sent); });
    });
    var pdb = findPhrasesInRefText(getRefTextarea().value).map(function (sent) { return parsePhrase(sent); });
    ta.addEventListener('blur', function () {
        hideResults();
    });
    ta.addEventListener('input', function () {
        var usertext = ta.value;
        updateCharCountInfo();
        var cursorpos = ta.selectionStart;
        var ps = searchSentStartBack(usertext, cursorpos);
        var pe = getSearchSentStartFwd(usertext, cursorpos);
        var mp = { text: usertext.substr(ps, pe - ps), pos: ps };
        var editp = parsePhrase(mp);
        var editp_pos = ps;
        if (editp.words.length === 0) {
            hideResults();
            return;
        }
        var matches = findMatches(editp, pdb);
        hideResults();
        var reslist = document.getElementById('options');
        if (!(reslist instanceof HTMLOListElement))
            throw new Error('options is not an OL.');
        var complnums = editp.words
            .map(function (w) { return tryGetComplNum(w); })
            .filter(function (cn) { return cn !== null && cn !== 'maybe'; });
        if (complnums.length) {
            var refnum = complnums[0] - 1;
            if (refnum < matches.length) {
                var replacement = matches[refnum].text;
                var curtext = ta.value;
                var ofs = editp_pos;
                var before = curtext.substr(0, ofs);
                var after = curtext.substr(ofs + editp.text.length);
                var newtext = before + replacement + after;
                ta.value = newtext;
                ta.selectionStart = before.length + replacement.length;
                ta.selectionEnd = before.length + replacement.length;
                updateCharCountInfo();
            }
            else
                console.log("Match #" + (refnum + 1) + " does not exist.");
        }
        else {
            for (var idx = 0; idx < Math.min(matches.length, 9); idx++) {
                var li = document.createElement('li');
                li.innerText = matches[idx].text;
                reslist.appendChild(li);
            }
        }
    });
}
setTimeout(function () {
    getRefTextarea().value = stdRefText;
    if (document.getElementById('ta1'))
        setupTextarea();
}, 1000);
function getRefTextarea() {
    var refTa = document.getElementById('refTextTa');
    if (!(refTa instanceof HTMLTextAreaElement))
        throw new Error('ref TA not found.');
    return refTa;
}
function toggleShowRefTextTextarea() {
    var ta = getRefTextarea();
    console.log('ta', ta);
    ta.style.display = getComputedStyle(ta).display != 'none' ? 'none' : 'unset';
}
function removeDiacritics(str) {
    var s1 = str.normalize('NFD');
    if (s1.length === str.length)
        return str;
    var arr = [];
    for (var idx = 0; idx < s1.length; idx++) {
        var ch = s1.charCodeAt(idx);
        var isdia = ch >= 0x300 && ch <= 0x36f;
        if (!isdia) {
            arr.push(s1.substr(idx, 1));
        }
    }
    return arr.join('');
}
var stdRefText = "\nGood job, keep on working\n\n\n*********** being so organized.\n\n\u00A1Bastante bien!\nSigue trabajando y siendo tan organizado.\n\n\n\nit was a pleasure to have you in my class.\nfocus while listening, i know you can do it better\n\nDon't forget to practice grammar, I know you can improve\n\nIf you improve grammar your writing will improve too.\n\nTerrific job, continue like that.\n\nYou need to work harder on listening.\n\nPractice vocabulary.\n\nYou need to organise your ideas before writing\n\nPractice spelling.\n\nOrganise your ideas to provide coherence to your writing\n\nWork group is important, don't be shy\n\nParticipation in class is a must if you want to improve speaking\n\nPair work is important to share your ideas in the class\n\nI enjoy your participation, thank you for sharing your thoughts\n\nAssignments are important to check your understanding, don't skip them\n\nBe more active in class\n\nPractice pronunciation, don't be afraid of speaking in class\n\nTerrific job, congratulations\n\nVery well done!\n\nKeep it up\n\nYou need to work harder\n\nIt is important to participate in class\n\nYou need to improve your notebook\n\nYou seriously need to work hard on your\nreading skills.\nRead as many times as you need to understand\nthe meaning, don't guess, read!\n\n\n\nYou seriously need to work harder if\nyou want to learn.\nyou have the skill and capacity, just work\nto get the results.\n\nYou seriously need to work harder if\nyou want to learn.\nListening and vocabulary are your biggest\nproblems right now, and it'll depend on you to\nwork as hard as possible in order to improve\nand strengthen those areas.\nyou have the skill and capacity, just work\nto get the results.\n\nYou definitely need to work harder on your\nlistening skills.\nCheck grammar, if you improve grammar\nall your skills will improve\n\n\nYou definitely need to work harder on your listening skills.\nCheck vocabulary, to improve you need to work on each word, not simply memorizing it, but understanding its meaning, not just its translation.\n\nDefinitivamente necesitas trabajar m\u00E1s duro en tus habilidades de escucha.\nVerifique el vocabulario, para mejorar la necesidad de trabajar en cada palabra, no solo memorizarla, sino comprender su significado, no solo su traducci\u00F3n.\n\n\n\nYou have serious problems at all levels,\nyou need to work really hard\nif you don\u2019t want to fail this course.\nYou'll also need to use the STUDY ROOM\nin order to practice and improve.\n\nTienes problemas serios en todos los niveles,\nnecesitas trabajar muy duro si no quieres fallar\nen este curso.\nTambi\u00E9n necesitar\u00E1s usar la SALA DE ESTUDIOS\npara practicar y mejorar.\n\n\nYou must improve your grammar skills. There are mistakes such as:------\nthat at this level you shouldn\u2019t have.\nIt is very important that you pay attention, work and practice every day.\n\nGRAMMAR!\nYou must improve your grammar skills.\nyou have problems understanding structures\nthat at this level you shouldn\u2019t have.\n\nThere are several weaknesses that you need to\nfix before going to the next level.\n\nYou must improve your grammar skills.\nyou have problems understanding structures\nthat at this level you shouldn\u2019t have.\nIt is very important that you pay attention,\narrive on time, present all the assignments,\nask questions in class, participate, work and\npractice every day.\n\n\nyou most work more carefully and consciously on the vocabulary section.\nBeing able to speak is nice, but the meaning of those words is more important\n\nI know you can do it!\n\n\nYou must work on pronunciation\n\nYou must work on spelling\n\nYou must work on intonation\n\nPay attention in class to understand better \n\nThe workbook assignments are designed to help you with the structures and you mustn't skip them.\n\nPunctuality is a beautiful virtue, don't be late\n\nYour constant absences are costing you precious points\n\nCheck spelling, you need to improve\n\nCheck grammar\n\nGrammar and vocabulary are easy to\nimprove, just keep an organized notebook\nand your notes will be enough to remember.\n\nCheck grammar, if you improve grammar\nyour understanding levels in reading will\nimprove too.\n\nVerifica la gram\u00E1tica, si mejoras la gram\u00E1tica,\ntus niveles de comprensi\u00F3n en la lectura\ntambi\u00E9n mejorar\u00E1n.\n\nCheck grammar, if you improve grammar your understanding levels in reading will improve too. Keeping an organized notebook would help you recalling concepts and grammar structures.\n\nfocus more when reading,\nyou have the skills and the attitude to improve.\n\nEnf\u00F3cate m\u00E1s cuando lees, tienes las habilidades\ny la actitud para mejorar.\n\nYou have proven the will and interest to\npass. keep on working hard like this!\n\n\n\nWELL DONE!\ntry to focus more during the listening, i know\nyou can improve.\n\nDon't forget to practice new words in order to remember them better\n\nYou need to pay attention while reading, don't guess, read and infer if needed.\n,..................................\nNecesita poner atenci\u00F3n en clase, es importante que haga preguntas cuando no entienda algo.\n\nEs primordial que mantenga un cuaderno de avance organizado y al d\u00EDa para poder seguir con las unidades de modo correlativo\n\nLa puntualidad es necesaria, de lo contrario se perjudican en el avance.\n\nEl vocabulario debe ser reforzado de forma constante en casa\n\nNecesita activar la escritura, poner atenci\u00F3n.\n\nEs importante reforzar la pronunciaci\u00F3n\n\nDebe presentar atenci\u00F3n en clase, se distrae con mucha facilidad\n\nLos permisos para el ba\u00F1o son y deben ser medidas de urgencia, no rituales de cada clase, pues se perjudica el avance y correlaci\u00F3n de la unidad.\n\nEl trabajo de\u2026.. es bastante bueno, participa bien, demuestra predisposici\u00F3n y solidaridad.\n\nTrabaja de manera excepcional, participa y colabora en clase, el cuaderno de avance es ejemplar, la pronunciaci\u00F3n muy acorde al nivel.\n\nEl cuaderno de avance es ejemplar, organizado y pulcro. Se recomienda el mismo empe\u00F1o en participaci\u00F3n en clase\n\nLamentablemente la gram\u00E0tica no ha mejorado y por lo tanto, las otras areas tambien se ven afectadas.\nEl vocabulario tampoco ha sido practicado y la producci\u00F3n escrita es bastante pobre.\n\n\n\n";
if ('QUnit' in window) {
    QUnit.test("ref text splits at blank lines", function (ass) {
        var input = "\nThe first one.\nsecond line of the first.\n \nmore to come, this one without capital letter and trailing period\n\n ".replace('\r\n', '\n');
        var dump = findPhrasesInRefText(input).map(function (part) { return part.text; });
        ass.equal(dump, [
            "The first one. second line of the first.",
            "more to come, this one without capital letter and trailing period.",
        ]);
    });
    QUnit.test('Find start of sentence, looking backwards', function (ass) {
        function getSearchSentStartBack(text) {
            var cursorpos = text.indexOf('Q');
            if (cursorpos === -1)
                throw new Error('Didn\'t find cursor indicator Q.');
            var ps = searchSentStartBack(text, cursorpos);
            var pe = getSearchSentStartFwd(text, cursorpos);
            return text.substr(ps, pe - ps);
        }
        ass.equal(getSearchSentStartBack('The sentence iQs this.'), 'The sentence iQs this.');
        ass.equal(getSearchSentStartBack('Sentence before. The sentence iQs this.'), 'The sentence iQs this.');
        ass.equal(getSearchSentStartBack('Sentence before! The sentence iQs this.'), 'The sentence iQs this.');
        ass.equal(getSearchSentStartBack('Sentence before? The sentence iQs this.'), 'The sentence iQs this.');
        ass.equal(getSearchSentStartBack("Sentence before. \nThe sentence iQs this."), 'The sentence iQs this.');
        ass.equal(getSearchSentStartBack("Sentence before. \nthe sentence iQs this. More\n"), 'the sentence iQs this.');
        ass.equal(getSearchSentStartBack("Sentence before. \nthe sentence iQs this. More\n"), 'the sentence iQs this.');
    });
    var ppx_1 = function (text) {
        return parsePhrase({ text: text, pos: 0 });
    };
    QUnit.test('parsePhrase, basic', function (ass) {
        ass.equal(ppx_1('the').words.join(','), 'the');
        ass.equal(ppx_1('the bee').words.join(','), 'the,bee');
    });
    QUnit.test('parsePhrase, numeric suffix', function (ass) {
        ass.equal(ppx_1('the p2').words.join(','), 'the,p2');
    });
    QUnit.test('parsePhrase, diacritics', function (ass) {
        ass.equal(ppx_1('también').words.join(','), 'tambien');
    });
    QUnit.test('match, subsequence, entire word', function (ass) {
        var matches = findMatches_wordsubsequence(ppx_1('the bee'), [ppx_1('the bee is'), ppx_1('the shark is')]).map(function (match) { return match.text; });
        ass.deepEqual(matches, ['the bee is']);
        matches = findMatches_wordsubsequence(ppx_1('the bee'), [ppx_1('the yellow bee')]).map(function (match) { return match.text; });
        ass.deepEqual(matches, ['the yellow bee']);
    });
    QUnit.test('match, subsequence, entire word', function (ass) {
        var matches = findMatches_wordsubsequence(ppx_1('the bee'), [ppx_1('bee the')]).map(function (match) { return match.text; });
        ass.deepEqual(matches, [], 'The words are in different order.');
    });
    QUnit.test('match, subsequence, word prefix', function (ass) {
        var matches = findMatches_wordsubsequence(ppx_1('th be'), [ppx_1('the bee')]).map(function (match) { return match.text; });
        ass.deepEqual(matches, ['the bee']);
        matches = findMatches_wordsubsequence(ppx_1('the be'), [ppx_1('the yellow bee')]).map(function (match) { return match.text; });
        ass.deepEqual(matches, ['the yellow bee']);
    });
    QUnit.test('match, removeDiacritics', function (ass) {
        var matches = findMatches_wordsubsequence(ppx_1('tambien'), [ppx_1('también')]).map(function (match) { return match.text; });
        ass.deepEqual(matches, ['también']);
    });
}
//# sourceMappingURL=out.js.map