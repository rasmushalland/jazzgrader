/// <reference path="default.ts"/>
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
            "more to come, this one without capital letter and trailing period",
        ]);

        //         const dump = findPhrases(input).map(part => '>> ' + part.text + '<<').join('\r\n');
        //         ass.equal(dump, `
        // >> The first one. second line of the first.<<
        // >> more to come, this one without capital letter and trailing period<<
        // `.trim().replace('\r\n', '\n'));

    });
}
