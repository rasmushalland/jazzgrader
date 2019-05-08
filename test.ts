/// <reference path="index.ts"/>
/// <reference path="qunit.d.ts"/>


// This file is only supposed to be used by test.html,
// but the simple tsconfig.json config builds it into the one out.js.
// So we also get loaded on the text entry page, and in that case we
// should not perform our tests.

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

        //         const dump = findPhrases(input).map(part => '>> ' + part.text + '<<').join('\r\n');
        //         ass.equal(dump, `
        // >> The first one. second line of the first.<<
        // >> more to come, this one without capital letter and trailing period<<
        // `.trim().replace('\r\n', '\n'));

    });
    QUnit.test('Find start of sentence, looking backwards', ass => {
        function getSearchSentStartBack(text: string): string {
            const cursorpos = text.indexOf('Q');
            if (cursorpos === -1)
                throw new Error('Didn\'t find cursor indicator Q.');
            const ps = searchSentStartBack(text, cursorpos);
            const pe = getSearchSentStartFwd(text, cursorpos);
            return text.substr(ps, pe - ps);
            // return text.substr(ps);
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

    const ppx: (text: string) => ParsedPhrase = text => {
        return parsePhrase({ text, pos: 0 });
    }

    QUnit.test('parsePhrase, basic', ass => {
        ass.equal(ppx('the').words.join(','), 'the');
        ass.equal(ppx('the bee').words.join(','), 'the,bee');
    });
    QUnit.test('parsePhrase, numeric suffix', ass => {
        // this is mainly to ensure that we recognize the completion request words as single words.
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
speaking
`);
    });
}
