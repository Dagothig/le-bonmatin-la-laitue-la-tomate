function getWordsForPart(part) {
    return part.split(" ").filter(word => word);
}

const commandsRegexp = /\\shake(<.*>)?|\\{|\\}|\\\^|\\.\[.\]|"|>/g;
const punctuationRegexp = /[\,\.\!\?\:]+/g;
const endsWithPunctuation = /[\,\.\!\?\:]$/;

function getWords(lines) {
    return lines.flatMap(line => {
        line = line.toLowerCase().replaceAll(commandsRegexp, "");
        if (!line.match(endsWithPunctuation)) {
            line += ".";
        }

        const result = [];
        let lastIndex = 0;
        for (const match of line.matchAll(punctuationRegexp)) {
            const sep = match[0];
            const part = line.substring(lastIndex, match.index);
            lastIndex = match.index + sep.length;
            result.push(...getWordsForPart(part), sep);
        };
        if (!result.length) {
            result.push(...getWordsForPart(line));
        }
        return result;
    });
}

function markov(words) {
    const occurences = {};
    const backOccurences = {};
    for (const word of words) {
        occurences[word] = {};
        backOccurences[word] = {};
    }

    let previous = ".";
    for (const word of words) {
        occurences[previous][word] = (occurences[previous][word] || 0) + 1;
        previous = word;
    }

    for (const word in occurences) {
        for (const subword in occurences[word]) {
            backOccurences[subword][word] = (backOccurences[subword][word] || 0) + occurences[word][subword];
        }
    }

    const markov = Object.fromEntries(Object.entries(occurences).map(([word, choices]) => {
        const choicesKey = 1;
        const valueKey = 0;
        const backChoicesKey = 3;
        const backValueKey = 2;
        const out = [0, [], 0, []];
        for (const subword in choices) {
            const occurence = choices[subword];
            out[valueKey] += occurence;
            out[choicesKey].push([out[valueKey] - 1, subword]);
        }
        for (const subword in backOccurences[word]) {
            const occurence = backOccurences[word][subword];
            out[backValueKey] += occurence;
            out[backChoicesKey].push([out[backValueKey] - 1, subword]);
        }
        return [word, out];
    }));

    return markov;
}

module.exports = {
    getWords,
    markov,
    commandsRegexp,
    punctuationRegexp,
    endsWithPunctuation
};
