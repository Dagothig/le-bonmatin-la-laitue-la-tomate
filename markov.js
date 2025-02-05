function getWords(part) {
    return part.split(" ").filter(word => word);
}

const commandsRegexp = /\\shake(<.*>)?|\\{|\\}|\\\^|\\.\[.\]|"|>/g;
const punctuationRegexp = /[,\.\!\?:]+/g;
const endsWithPunctuation = /[,\.\!\?:]$/;

module.exports = async function $markov(lines) {
    const words = lines.flatMap(line => {
        line = line.replaceAll(commandsRegexp, "");
        if (!line.match(endsWithPunctuation)) {
            line += ".";
        }

        const result = [];
        let lastIndex = 0;
        for (const match of line.matchAll(punctuationRegexp)) {
            const sep = match[0];
            const part = line.substring(lastIndex, match.index);
            lastIndex = match.index + sep.length;
            result.push(...getWords(part), sep);
        };
        if (!result.length) {
            result.push(...getWords(line));
        }
        return result;
    });

    const occurences = {};
    for (const word of words) {
        occurences[word] = {}
    }

    let previous = ".";
    for (const word of words) {
        occurences[previous][word] = (occurences[previous][word] || 0) + 1;
        previous = word;
    }

    const markov = Object.fromEntries(Object.entries(occurences).map(([word, choices]) => {
        const out = { sum: 0, choices: [] };
        for (const subword in choices) {
            const occurence = choices[subword];
            out.sum += occurence;
            out.choices.push({ word: subword, value: out.sum - 1 });
        }
        return [word, out];
    }));

    return markov;
}
