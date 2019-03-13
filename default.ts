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


function findPhrases(text: string): PositionedPhrase[] {
    let parts: PositionedPhrase[] = [];
    // this regex is made for some random text (typescript manual piece),
    // so it might need some modifications.
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
    const ta = document.getElementById('ta1');
    if (!(ta instanceof HTMLTextAreaElement))
        throw new Error('ta1 not found.');

    const pdb = findPhrases(rawtext).map(sent => parsePhrase(sent));
    ta.addEventListener('blur', evt => {
        hideResults();
    });
    ta.addEventListener('input', evt => {
        const phrases = findPhrases(ta.value || '');
        const cursorpos = ta.selectionStart;
        const matchingPhrases = phrases.filter(p => p.pos <= cursorpos && p.pos + p.text.length > cursorpos);
        if (matchingPhrases.length === 0) {
            hideResults();
            return;
        }
        const mp = matchingPhrases[0];
        const editp = parsePhrase(mp);

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
                    if (!isprefix && !iscompletionreq) {
                        match = false;
                    }
                }
            }
            if (match)
                matches.push(refp);
        }

        // console.log('match count', matches.length);
        // console.log('matches', matches.map(m => m.text));

        // Transform matches to list entries.
        hideResults();
        const reslist = document.getElementById('options');
        if (!(reslist instanceof HTMLOListElement))
            throw new Error('options is not an OL.');
        const complnums = editp.words
            .map(w => tryGetComplNum(w))
            .filter(cn => cn !== null && cn !== 'maybe');
        if (complnums.length) {
            console.log('complnums', complnums);
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
    setupTextarea();
    const pplist = findPhrases(rawtext).map(sent => parsePhrase(sent));
    console.debug(pplist);
}, 1000);

function removeDiacritics(str: string): string {
    const s1 = str.normalize('NFD');
    if (s1.length === str.length)
        return str;
    const arr : string[] = [];
    for (let idx = 0; idx < s1.length; idx++)
    {
        const ch = s1.charCodeAt(idx);
        const isdia = ch >= 0x300 && ch <= 0x36f;
        if(!isdia){
            arr.push(s1.substr(idx, 1));
        }

    }
    return arr.join('');
}



// https://www.theguardian.com/news/2019/mar/08/chicago-reparations-won-police-torture-school-curriculum
const rawtext = `
"What do you know about Jon Burge?” On the morning of 16 April 2018, Juanita
Douglas was asking her students a question she’d never asked in a classroom
before, not in 24 years of teaching in Chicago’s public schools. She’d been
preparing to ask the question for over a year, and she knew that for many of
her students the conversation that followed would be painful. Disorienting.
She didn’t like the idea of causing them pain. She didn’t want to make them
feel overwhelmed or lost. But she thought, or at least hoped, that in the end
the difficulty would be worth the trouble.



Lose yourself in a great story: Sign up for the long read email Read more It
was only second period. Several of Douglas’s students were visibly tired. A
few slumped forward, heads on their desks. Some were stealthily texting or
scrolling through Snapchat. Others were openly texting or scrolling through
Snapchat.

After a few seconds, Douglas repeated the question: “Do you know Jon Burge?”

A ragged chorus of noes and nopes and nahs.

“Tell me again what year you were born in,” said Douglas, who is 54 and likes
to playfully remind her students that they don’t know everything about the
world.

2000. 2001. 1999.

“OK,” she said. “Well … welcome to Chicago.”

Douglas switched off the lights and played a video. Who was Jon Burge? The
video supplied the answer. Burge was a former Chicago police department
detective and area commander. Between 1972 and 1991 he either directly
participated in or implicitly approved the torture of at least – and this is
an extremely conservative estimate – 118 Chicagoans. Burge and his
subordinates – known variously as the Midnight Crew, Burge’s Ass Kickers, and
the A-Team – beat their suspects, suffocated them, subjected them to mock
executions at gunpoint, raped them with sex toys, and hooked electroshock
machines up to their genitals, their gums, their fingers, their earlobes,
overwhelming their bodies with live voltage until they agreed: yes, they’d
done it, whatever they’d been accused of, they’d sign the confession.

The members of the Midnight Crew were predominately white men. Almost all of
their victims were black men from Chicago’s South and West Sides. Some had
committed the crimes to which they were forced to confess; many had not. The
cops in question called the electroshock machines “nigger boxes”.

The video cut to Darrell Cannon, one of the Midnight Crew’s victims. He spoke
about getting hauled by cops into a basement: “I wasn’t a human being to
them. I was just simply another subject of theirs. They had did this to many
others. But to them it was fun and games. You know, I was just, quote, a
nigger to them, that’s it. They kept using that word like that was my name.”

Text on the screen explained that Burge was fired in 1993, following a
lawsuit that forced the Chicago police to produce a report on his involvement
in “systematic torture”, written by its own office of professional standards.
After his firing, Burge moved to Apollo Beach, Florida, where he ran a
fishing business. In 2006, another internally commissioned report concluded
that he’d been a torture ringleader, but still no charges were brought;
Illinois’ five-year statute of limitations for police brutality charges had
by then expired. In 2008, FBI agents arrested Burge at his home, and creative
federal prosecutors charged him – not with torture, but with perjury. In a
2003 civil case, Burge had submitted a sworn statement in which he denied
ever taking part in torture. In 2010 a jury found him guilty.

As soon as the video ended and Douglas flipped the lights back on, her
students – most of whom were, like her, black – started talking. Their
confusion ricocheted around the room.

“How long did he get?”

“Four-and-a-half years.”

“He only got four-and-a-half years?”

“That’s what I’m saying.”

“I really feel some type of way about this.”

“Is he still alive?”

“I’ve got it on my phone.”

“He didn’t torture them alone. Why didn’t anyone else get charged?”

“I’ve got it on my phone. He’s still alive.”

“I’m just … angry.”

“He lives in Florida!”

“Didn’t no one hear the screams?”

Douglas’s students didn’t yet know it, but they were not the only Chicago
students wrestling with Jon Burge and the Midnight Crew last spring. In fact,
teachers and students at each of the city’s 644 public schools were figuring
out how to talk about the cops of the Midnight Crew. Teachers were going down
this path whether they wanted to or not. There was no choice: it was an
official requirement, codified in city law.

This classroom initiative is part of a historic, novel and perplexingly
under-covered development in the ever-more urgent search for solutions to the
cumulative harm inflicted on Americans – especially black Americans – in the
name of law and order. On 6 May 2015, in response to decades of local
activism, Chicago’s city council passed a resolution officially recognising
that Burge and his subordinates had engaged in torture, condemning that
torture, and offering his victims (or at least some of them) compensation for
their suffering.

The resolution is a singular document in American history. Torture
accountability – even basic torture honesty – has been a perennial nonstarter
in US politics. Reparations, especially those with a racial component, have
long been treated as, alternately: an incoherent absurdity; a frightening
threat; a nice-sounding but impractical rallying cry; or, more recently, in
the wake of the National Magazine Award-nominated essay in the Atlantic by
Ta-Nehisi Coates, as a worthy but still essentially utopian demand. But
within Chicago city limits, reparations for police torture isn’t just a
thought exercise, a rhetorical expression about what should exist in a better
world. It’s Chicago city council resolution SR2015-256: an official political
promise.

Jon Burge, the former Chicago police commander who led the ‘Midnight Crew’.
Jon Burge, the former Chicago police commander who led the ‘Midnight Crew’.
Photograph: Charles Rex Arbogast/AP If this is the first you’ve heard of all
this, you are hardly alone. Among locals of all races, and even among
national experts on torture and torture accountability, remarkably few are
familiar with the experiment unfolding right now in Chicago. If people know
anything about it, they likely know that it involved some money: a pool of
$5.5m from which certain victims of the Midnight Crew could receive up to
$100,000 each, regardless of whether their coerced confessions had been false
or not – regardless, that is, of whether, in the eyes of the law, they had
ultimately been judged guilty or innocent.

In addition to the cash payouts, SR2015-256 contained a handful of other
benefits for the victims, including free tuition at the city’s community
colleges and free access to a new psychological counselling centre. In
recognition of the fact that torture’s effects reach beyond the lives of
individual victims, these services were made available to all members of
survivors’ immediate families, and in some cases to their grandchildren.

The resolution also pledged the city to take two concrete steps to counteract
its decades-long tradition of trying to make the Burge story disappear.
First, Chicago officials would work with activists to erect a memorial to the
city’s police-torture survivors. Second, the city’s public schools would
henceforth be required to add “a lesson about the Burge case and its legacy”
to the official history curriculum for teenagers. To many of the activists
who fought for the reparations package, the curriculum was its most
meaningful component, precisely because of what it asked from the city: not
money, but time and talk, however awkward or uncomfortable that talk might
be.

The memorial design and site selection process is still under way. But last
August, city officials held a press conference to announce that, after two
years of development, the new curriculum – titled Reparations Won – was ready
for the children of Chicago.

Chicago is one of America’s most racially diverse cities, but also one of its
most racially segregated: a patchwork of different social and economic worlds
that know relatively little about each other. For this reason, my original
hope was to watch the curriculum being taught in schools all across the city.
What would lessons about the Midnight Crew look like in resource-starved
black schools on the South and West Sides? How would the same curriculum be
taught in predominantly Latino classrooms? (There are more Latino students
than students of any other racial background in Chicago schools.) What about
schools in the almost-suburbs – just inside the city line – that are
disproportionately populated by cops, firefighters and other city workers, in
classrooms full of their children and nephews and nieces?

Douglas was the only teacher out of dozens I asked who opened the doors of
her classroom to me. The curriculum was too important, she said, for its
rollout to go completely undocumented. Last spring, I spent 18 mornings in
her classroom at Lincoln Park high school, observing two back-to-back
sections of her black-history class as they worked through Reparations Won.

Chicago police detained thousands of black Americans at interrogation
facility Read more Before my first day, reading over the curriculum and
imagining myself in Douglas’s shoes, I felt overwhelmed by the visceral
intensity of the material alone. Once I was in her classroom, though, I
quickly realised the presence of another challenge, one that will surely be
obvious to any teacher. It was the problem of shared knowledge, and how
little of it Douglas could presume.

Most of her students were black, and some were Latino, Asian-American,
biracial, multiracial. Just one was white. Though Lincoln Park is a
prosperous North Side neighbourhood, most of them lived on the South or West
Side, where Chicago’s black population has historically been concentrated,
and came north every morning because the high school that used to be in their
neighbourhood is now closed. Some students had been to Black Lives Matter
protests. Others had never been to any protest of any kind in their lives.
Some students came to class wide awake, visibly enthusiastic, caffeinated.
Others showed up looking exhausted, or like they were counting down the hours
until the end of class, until lunch, until prom, until graduation. Some came
to school every day, and were already thinking about college. Some came now
and then, and were not sure they would graduate. Some had family members
whose lives had been deeply marked by interactions with Chicago’s cops and
courts and jails and prisons. Some had family members who were cops, or used
to be. It was Douglas’s job to teach them all.

The first few days were heavy on context: on white Chicago’s long history of
resistance to its black population; on Burge’s upbringing in the all-white
South Side neighbourhood of Deering, which, during his lifetime, became an
all-black neighbourhood; on the city’s intentional overcrowding of black
neighbourhoods and schools; on the escalation of the police “war on crime” in
black neighbourhoods; and, finally, on the first allegations against the
Midnight Crew, and how they were ignored by the very man with the most
immediate power to investigate the charges and punish the perpetrators,
then-Cook county state’s attorney Richard M Daley, who would go on to become
mayor.

On the fourth day, the class watched another video, this one detailing the
case of Ronald Kitchen, a Midnight Crew victim who, largely on the basis of
his tortured confession, was found guilty of murdering two women and three
children and sent to death row. Beginning in 1990, he spent 21 years before
his conviction was quashed and a judge declared him innocent.

The video featured footage from the 2011 deposition of Detective Michael
Kill, one of Kitchen’s torturers. In this footage, Kill is 70 and long
retired. (Kill died in 2018.) Wiry and full of contempt, he leans back in his
chair, as if keeping his distance from something that smells bad. Offscreen,
Kitchen’s lawyer asks Kill whether he made a practice of using the n-word in
his interrogations.

“Sure I did,” says Kill.

How often?

“I would say I used it as many times as I had to.”

But why?

“Well,” Kill says, his grimace intensifying, “how many inches of tape are in
your recorder?”

Kitchen’s lawyer asks him why he used the N-word so much.

Kill shakes his head, still grimacing. “Trying to explain police work to
you,” he says to the lawyer, “is like trying to explain physics to my
grandson – who is three years old.” He used the word, he explains, to make
suspects feel comfortable. To show them he understood their world, knew their
language. “You’re not there,” he says. “You haven’t been there. You don’t
understand it, OK? You have to live it.”

No, Kill says, he never beat Kitchen. Never tortured Kitchen. Why would he do
something like that, he asks rhetorically, and risk getting fired, losing his
pension? No, he knew nothing about anyone beating or torturing Ronald
Kitchen. Jon Burge was his boss, sure. But he hardly knew the guy. Couldn’t
really tell you anything about him.

A rally for victims of police torture in Chicago in 2006. A rally for victims
of police torture in Chicago in 2006. Photograph: Tim Boyle/Getty Images Many
of Douglas’s students were visibly upset by Kill: by what he was saying, by
how casually he was saying it, by his apparent disdain for the very idea that
anyone might think anything he’d done would require an explanation. “Can we
turn it off?” asked a boy seated next to me, quietly and plaintively. But the
longer the video went on, the more the kids started making fun of Kill: they
knew, after all, that the old man’s denials hadn’t carried the day; that the
state had set Kitchen free, that the city had settled his civil case for
$6.15m. They started laughing at Kill’s clipped speech, his old Chicago
accent, his pissy evasions. A Latina girl, one of Douglas’s most reliable
participants in class discussions, snickered and mimed taking a picture of
Kill’s scowling face on her phone, suggesting what a good meme it would make.
“When you know you got caught,” she said, laughing.

The next day, the class watched footage of Kitchen himself, filmed after he
was released from jail but before he won his settlement. Someone off-camera
asks him to describe his post-release life. Kitchen tells them he hardly
sleeps. That the mere sight of a Chicago police car sends him into a
full-body terror, which is why he’s had to leave Chicago, the only city he
ever knew. “It’s hard,” he says. “It’s hard, it’s hard. It’s like a dream to
me, sitting up here with you. It’s like, at any moment, this could get taken
away from me all over again.”

It had been easy, perhaps, to joke about Michael Kill: a caricature of an old
white villain on the wrong side of history. But there were no jokes to tell
about Ronald Kitchen. “Do you know how many of the police went to jail?”
asked a black girl toward the front of the class, referring to all the other
Midnight Crew members besides Burge. It wasn’t the first time one of
Douglas’s students had posed the question, and it wouldn’t be the last. Each
time, the answer was the same: zero.

After class that day, I stayed behind to look at what everyone had written on
their reflection sheets. Douglas collected these almost every day, and she
often let me look at them, wanting me to understand that the reactions I saw
during class were only part of the story. Many of her students rarely spoke
unless forced to. On their reflection sheets, however, freed from their worry
about how a roomful of their fellow teenagers would respond, these same
students would often write searching, poignant reflections, and pose deep
questions. On the day of the Kitchen video, their comments were particularly
painful to read:

“That could be me!”

“This affects how my life will be, because when I decide to create a family I
will constantly be in fear if my husband is safe or my children if I have a
son I have to fear he may get stopped by the police.”

“It could be my boyfriend, dad, cousins, etc.”

“This is stuff that I see in movies and may encourage if I don’t like the bad
guy, but it’s unimaginable to think about in real life.”

“This was like being a slave, but in the 90s.”

“My dad just got pulled over recently and he wasn’t tortured, but what if
this did happen to him?”

“My father was also framed with something he didn’t do. (He’s been in there
since I was 3 and is getting out in 2027.)”

The longer I spent in Douglas’s class, the more I came to feel that the
atmosphere in the room, as a group of young people made contact with the
Burge saga, was history itself – not the professional academic enterprise,
not the subject of polished books and articles, but the living tangle of
connections between past and present that is always available to us,
sometimes as inspiration or solace, sometimes a burden, most often both at
once. This sense of history, of course, will be central to any serious
attempt at reparations in America. At Lincoln Park high, I was watching
students dive into the living tangle – watching them pull out this strand,
that strand, and ask what they meant, where they belonged.

On 14 September 2017 – less than a month after the curriculum was unveiled –
the now-defunct local news site DNAinfo ran a story about a meeting between
parents, faculty and staff at Edison Park elementary, a school on Chicago’s
Northwest Side, where many cops live. All of the parents quoted in the
article were opposed to Reparations Won.

“You’re taking eighth graders and trying to mould their minds with material
that is highly confrontational and controversial,” said Angela McMillin, who
described herself as “infuriated, appalled and disgusted” by the curriculum.
McMillin wanted to opt her daughter, an eighth grader, out of the curriculum.

The school’s principal, Jeffrey Finelli, informed her that this would not be
possible. “It would be a little like saying, ‘I don’t like quadratic
equations, so I’m going to opt out of algebra,’” Finelli said.

Emily Skowronek, a social-studies teacher who would be teaching the
curriculum, was also present at the meeting. She promised, in the paraphrase
of Alex Nitkin, the DNAinfo reporter, to “leave the Burge episode squarely in
the past”. “There are a lot of bad apples in every profession,” Skowronek
said. “And we’ll try to portray that to our kids.”

I contacted McMillin and several other attendees of the Edison Park meeting,
hoping to learn more about their objections. Most people did not write or
call me back; of those who did, all refused to speak to me, even anonymously.
One person, explaining their refusal, wrote: “After the article came out from
DNA, the reaction was kind of like a lynch mob … people from other parts of
the city were really nasty and mean and not at all considerate of the huge
amount of parents that work for the police department in our area and parents
of students that attend our school. It was actually said how racist we were
that we were even questioning the curriculum.”

This, too, was history.

Between two different takeaways from the material at hand. Takeaway One
stressed the horror of it all, and the deeply systemic nature of that horror:
all the cops and prosecutors and judges and city officials (mayors!) who had
turned a deaf ear to the complaints of torture for so long, afraid of what
they would mean, if true, about their professions, their jobs, the
convictions they’d won, the sentences they’d passed down, the city they’d
made.

Douglas pushed Takeaway One because she wanted her students to understand the
truth of the world they lived in – but also, it was clear, because she wanted
them to be safe. More than once, she drew her students’ attention to the case
of Marcus Wiggins, a black 13-year-old tortured by the Midnight Crew. “Why
would they torture a 13-year-old? Why are they torturing a 13-year-old? I
need an answer.”

A Latino boy in the front row began to venture a response. “For suspected … ”

Douglas cut him off. “But why? I want you to look at everybody in this room.”

He hesitated. “Maybe … because they can. They’re using their authority.”

Douglas nodded, then pushed the point a step further. You might think of
yourself as kids, she told them, but that didn’t mean “they” would see you
that way too. This was why it was important for them to be careful. Important
not to joke around – not to act like kids – in the presence of cops.
Important not to assume that things work the way they’re supposed to work.

Of course, if Takeaway One was all there was, the curriculum would be an
extended meditation on the intolerable harshness of the world. No one
involved in its creation or implementation wanted that to be its only message
to Chicago’s teenagers. And so, Takeaway Two stressed the importance of
individual choices, even in the face of systemic injustice.

Celebrations outside a courthouse in Chicago after Jon Burge was convicted of
perjury and obstruction of justice in 2010. Celebrations outside a courthouse
in Chicago after Jon Burge was convicted of perjury and obstruction of
justice in 2010. Photograph: Chicago Tribune/MCT via Getty Images This was
why the curriculum was called Reparations Won: it was meant to be more than a
catalogue of woe. It was also a testament to the possibility of pushing back
and changing the world. There were all the activist groups who kept showing
up, year after year, decade after decade, asking for torture accountability.
One of these groups, We Charge Genocide, even sent a delegation of young
Chicagoans to Switzerland in 2014 to talk about Chicago police in front of
the United Nations committee against torture. (One member of that delegation,
Douglas told them, was a Lincoln Park alumnus – one of her former students.)
There were the lawyers who took the victims’ cases long before anyone had
even heard of the Midnight Crew. There was the county medical examiner who
insisted, despite police pressure, on making a formal record of the injuries
sustained by Andrew Wilson, Burge’s first accuser to get any traction in
court. There was the cop, or the multiple cops, who when they heard about the
lawyers bringing torture cases against the CPD, started anonymously mailing
them notes, feeding them names to dig into.

So many people deciding to do nothing – to keep their heads down and not
cause trouble, to not risk the danger of upsetting the system. So many people
deciding to do something – to insist on things being different.

Near the end of my time in Douglas’s class I was sent a recording of a recent
meeting about Reparations Won at Wildwood elementary, a predominantly white
school on the Northwest Side. The person who sent me the recording told me I
could use it however I wanted, as long as I didn’t identify them. Wildwood is
the neighbourhood immediately to the east of Edison Park. I’d heard of it for
the first time from Douglas, who, in a classroom discussion of Chicago
segregation, had recalled her first and only trip to Wildwood. One day in the
90s she drove her son there for a high school football training clinic. She
told her students how surprised she was by the leafy, suburban feel of the
neighbourhood. This was Chicago? But most shocking of all was the sight of
local teenagers showing up to the clinic on bikes – and leaving them on the
ground. Unlocked!

The recording I received starts with Mary Beth Cunat, the Wildwood principal,
laying out the evening’s format to the audience, which is obviously made up
of parents of her students. “I’m just nervous,” she says, and she sounds it.
There are multiple speakers, she explains; each will have their turn, and
then parents will have a chance to write their remaining questions and
concerns on Post-it notes. “We didn’t leave time for open-ended questions and
answers,” she says, but promises that the Post-it notes will be read.

A Wildwood history teacher reads a prepared statement about the value of
teaching difficult histories. Then he leaves, explaining that he has another
obligation to get to.

“There’s no police-bashing going on here,” says Cunat. “It’s focusing on a
very discrete episode in history.”

A representative of the Chicago Committee on Human Relations gives a bizarre
speech in which he explains the committee’s mandate to investigate
discrimination of all kinds in the city. He makes no mention of Jon Burge,
the Midnight Crew or Reparations Won.

Then a local police commander expresses his fundamental concern about the
curriculum: “You know, I think anyone who has been around children probably
realises that they don’t hear everything that we say. So that’s probably our
biggest concern. Even though they’re going to teach a curriculum – [the kids]
are going to hear what they want to hear. And I’m just afraid that some of
them might feel themselves empowered that maybe they don’t have to listen to
the police. You know, in a stressful situation. And maybe they should run
from the police. And they’d be endangering themselves … ”

His advice to Wildwood parents, however, is to accept that the curriculum is
happening, and do their best to make sure it is being implemented
responsibly.

The fourth speaker is explaining the meaning of “restorative justice”, when a
man in the audience interrupts. Won’t the curriculum, the man wonders, “be
teaching a false narrative? [Burge] hasn’t been convicted of anything in our
courts. So how can you teach that?”

Principal Cunat reassures the man that the curriculum does not say Burge was
convicted of torturing anyone – just perjury and obstruction of justice.

“And then all the ones that supposedly were victims – are they going to have
their rap sheets?” the same man asks. “Are they going to show these kids
that? Are they going to have both sides of the conversation?”

Cunat tells the man that, if he has a question, he should write it down.

“I’d rather sit here and we can all ask our questions and we can all know the
answers,” the man says. “Does anyone else agree with that?”

“If you want that kind of meeting,” says Cunat, “you are free to let me
know.”

“OK,” says the man. “We want that kind of meeting. We would rather have an
open discussion.”

“One of the reasons we don’t have an open conversation,” says Cunat, “is
because it ends up getting derailed … I really respect you. I care about you
a lot. I really feel like it could just become … this ad hoc stuff is not
very safe, in terms of my staff and in terms of what we’re trying to
accomplish.”

“But what are we trying to accomplish?” asks the man.

On 30 April, Douglas reminded her students that on the following day they
were not to come to the classroom, as usual, but instead to go to the
library, where they would have the chance to hear from Ronald Kitchen, who
had flown in from Philadelphia. In 24 hours they would be in the same room as
the man from the video. The man they’d heard Michael Kill lie about. Someone
for whom thinking about torture required no imagination at all, because he’d
lived it.

Douglas had recruited a few students to give Kitchen’s visit an air of
ceremony. They’d printed up programmes. One boy played some welcome music on
his guitar: an acoustic rendition of a song by Death, the black band from
Detroit that played punk before punk was really a thing. A girl read a poem
she’d written called What They Don’t Tell You about Black Boys. Another girl
read an introduction: “Mrs Douglas has been teaching us about the agonising
tortures of African American men. We welcome one to speak with us today.” She
turned away from her classmates and toward Kitchen, who was sitting on a
chair behind her. “I just want to say to you personally that your story will
never be forgotten.”

Kitchen nodded, taking in the scene in front of him. “I’m really touched,” he
said. “Sometimes I’m at a loss for words when I see a lot of young people
actually taking heed of what’s happened.”

He took a breath, then spoke for almost 20 minutes without notes. He talked
about how bogus the charges against him had been. He talked about
co-founding, with other Midnight Crew survivors, the Illinois Death Row 10,
the campaign that eventually won a moratorium on all Illinois executions,
since expanded into full abolition. He talked about completely losing touch
with his son, who was three when he was arrested. About how, whenever it was
time for someone to be executed, a guard would bring that person down the
hall, letting him stop at each cell along the way to say goodbye. He talked
about how, whenever he heard them coming, he would lie on his bed and pretend
to be asleep, because he couldn’t bear to face them. He talked about how
ashamed this made him feel, looking back. He talked about his mother, who
developed dementia while he was in prison and did not recognise him when he
was released.

Ronald Kitchen in 2009. Ronald Kitchen in 2009. Photograph: Richard A
Chapman/AP It wasn’t a practised speech. It wasn’t shaped to build to a
certain point or lesson or revelation. Kitchen talked about having been a
drug dealer. “It was never a secret,” he said. “Never has been: that was my
living.” That was true – Kitchen has always been upfront about his past – but
I could not remember Douglas’s class discussing it. I thought I could feel a
shift in the nature of the room’s collective attention, the cumulative effect
of several dozen teenage minds simultaneously switching gears to process the
same new variable. Kitchen didn’t dwell on it. He urged students to get
involved with activism – urged them to avoid the delusion that change was
impossible.

“I want to thank you all for allowing me to come sit here and talk to you
all,” he said, again looking almost dumbfounded by where he was – in a
Chicago history classroom – and what he was doing there. “I’m trying not to
tear up. I’m good at it. I’m good at holding my stuff in. I love that you
gave me so much attention. I never had this much attention. I really do
appreciate it. Thank you.”

There was a short Q&A session. The students sounded more formal than usual,
like they were trying to be their most mature, respectful, adult selves –
which, as often happens with children trying not to sound like children, had
the primary effect of evoking how young they remained.

“Are you able to sleep any better now?” a student asked. “I know that sleep
is, like, a big thing.”

“Actually, I don’t sleep,” said Kitchen, looking like he regretted having to
be the bearer of this bad news. “I’m still on penitentiary time, for real. I
eat like” – he mimed shovelling food into his mouth as fast as he could – “I
choke some food down. I’m still on penitentiary time. I have to catch myself,
when I’m at home: I hear the clink of them rattling the bars … I can’t really
sleep. I’ll get up and I’ll walk around my house. I’ll check the doors, peek
out of the curtains. Or I’ll sit up, listen to the radio, watch TV for hours.
I really don’t sleep.”

At Wildwood elementary, the new curriculum continued to prove contentious.
Then, in June, two weeks before the end of the school year, Mary Beth Cunat
stepped down as principal – the result, according to reports, of outrage from
parents following her decision to invite an “anti-police” speaker to a
Wildwood career day. I assumed, when I saw the headline, that the speaker in
question had to be a Midnight Crew survivor. I was wrong: it was a young
Chicago activist and musician named Ethan Viets-VanLear, whom Cunat had asked
to participate in the event at Wildwood. Viets-VanLear had been part of the
delegation that travelled to Geneva to talk about Chicago police brutality in
front of the UN. Asked by Wildwood students to explain his motivation, he
talked about the 2014 death of his friend Dominique “Damo” Franklin, Jr at
the hands of a Chicago police officer. Word of Viets-VanLear’s visit spread
to Wildwood parents, some of whom quickly scoured his social media pages for
anti-police sentiments and called for Cunat to be replaced. Both
Viets-VanLear and Cunat reported receiving numerous death threats.

Cunat wrote an apology to the entire school, saying she regretted inviting
Viets-VanLear. A few days later, an impromptu school-wide meeting was held
for students to receive a presentation on policing from Martin Preib,
vice-president of the Chicago Fraternal Order of Police – the local law
enforcement union – and Adrian Garcia, a detective with a child at Wildwood.
That afternoon, Cunat resigned. Fox News ran a story commemorating her
downfall. She is now a principal in Rockford, Illinois, a city 90 miles west
of Chicago.

In September, Jon Burge died. After being released from federal prison in
2014, he had moved back to Florida, where he lived off his police pension. In
2015, when SR2015-256 was signed, he was interviewed by Martin Preib for a
now-defunct blog called The Conviction Project. “I find it hard to believe,”
he said, “that the city’s political leadership could even contemplate giving
‘reparations’ to human vermin.”

After Burge’s death, Chicago’s Fraternal Order of Police issued a statement
saying that the organisation did “not believe the full story about the Burge
cases has ever been told … Hopefully, that story will be told in the coming
years.”

A few months earlier, during the summer, I stopped by the Humboldt Park
office of Joe Moreno, the Chicago city council representative who, working
with a coalition of activists and lawyers, first put the reparations
ordinance before the city council in 2013. I asked Moreno why he thought the
resolution had passed in the end – and not just passed but passed without a
single “nay” vote from any of the historic white ethnic enclaves (or “the
more autonomous Caucasian wards”, as Moreno referred to them). How had the
official legislative body of a city that had never been able to admit to
torture now swung all the way to reparations?

Moreno wanted to recognise that some council members had likely undergone a
genuine change of heart. Midnight Crew survivors had met with many of them
one-on-one, explaining what they wanted and why. Their lawyers had compiled
the facts, and the facts were simply too overwhelming.

But Moreno also suggested a more cynical theory. There was still plenty of
opposition – still plenty of people at city hall who thought, in his
paraphrase, “I don’t want to be for this, this is ridiculous, these guys are
all guilty and just want money”. But, he said, it had over time become “much
harder for them to be vocal on it that way”. It wasn’t that every alderperson
stopped doubting Burge’s victims, he said – but that some of them had made
the decision to just move on: to pass the ordinance “rather than fight”.

This dynamic had shaped how the ordinance was covered, Moreno argued. “Every
journalist, they savour so much the fight,” he said. Had there been a
protracted legislative battle between different Chicago constituencies, it
might have been covered more prominently. Instead, the ordinance – which, in
the scheme of city budgeting, cost relatively little – passed, and the story
lost much of its oxygen for the city’s journalists.



The simple idea that could transform US criminal justice Read more To the
extent this was anyone’s goal – and of course they would never say so if it
was – it may look as if their wish has been granted. All spring, I made sure
to check my “Chicago torture” and “Chicago torture curriculum” Google Alerts
daily, eager to see the stories that appeared. Now and then, Burge was
mentioned in yet another story about bad Chicago cops using torture or
blackmail to frame suspects, or about more potential Midnight Crew victims
getting their claims heard in court. But the school year ended, the summer
dragged on, and no stories about the curriculum appeared. (At least until
Burge’s death, when the New Yorker ran a story about the curriculum on its
website, and many of Burge’s obituaries also mentioned its existence.) I kept
telling people I met about reparations in Chicago, and they kept being
shocked that they didn’t already know about it.

In the short term, SR2015-256 has not made Chicago as a whole appreciably
more conscious of its own history. But not every major development in a
city’s (or a nation’s) consciousness of itself gets noticed as such upon its
arrival. Thousands of children all over Chicago have now talked about the
city in a new way, and thousands more will again next year, and again the
year after that. The impact of this is impossible to predict with any
specificity: there is no such thing as a utilitarian cost-benefit analysis of
starting to tell the truth, together, about what happened.
`