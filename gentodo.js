const fs = require("fs/promises");
const os = require("os");
const { spawnSync } = require("child_process");

Object.assign(Array.prototype, {
    toObject() {
        return Object.fromEntries(this);
    }
});

const CODES = {
    PLUGIN: 356,
    SE: 250,
    TEXT: 101,
    TEXT_FOLLOWUP: 401,
    SCROLL_TEXT: 105,
    SCROLL_TEXT_FOLLOWUP: 405,
    SCRIPT: 355,
    SCRIPT_FOLLOWUP: 655
};

const SECTIONS_REGEX = /#+ +(\w+)[\r?\n]([^\#]*\r?\n?)+?/g;
const LINES_REGEX = /(\w+)\r?\n((?:>.*\\\r?\n)*(?:>.*\r?\n?))/g;
const MAP_REGEX = /Map\d{3}\.json/;
const SCRIPT_SE = /(?:playSe\(|aaa_se\(.*, *)\{ *"?'?name'?"?: *["'](\w+)['"]/;

const linesEqual = (a, b) =>
    (a ?? null) === (b ?? null) ||
    a?.length === b?.length &&
    a.every((al, i) => al === b[i]);

const linesMDToSectionsByName = text =>
    Array.from(text.matchAll(SECTIONS_REGEX))
    .map(([, sectionName, sectionText]) =>
        [sectionName,
            Array.from(sectionText.matchAll(LINES_REGEX))
            .map(([, lineName, lineText]) =>
                [lineName,
                    lineText
                    .split(/\\\r?\n/)
                    .map(s => s.substring(2).trim())])
            .toObject()
        ])
    .toObject();

const sectionsByNameToLinesMD = sectionsByName =>
    Object.entries(sectionsByName)
    .flatMap(([name, linesByName]) => [
        "### " + name,
        ...Object.entries(linesByName)
            .map(([line, text]) =>
                line + os.EOL + text.map(str => "> " + str).join("\\" + os.EOL))
    ])
    .join(os.EOL + os.EOL);

(async () => {
    const $audioFiles = fs.readdir("audio/se");
    const $knownLinesText = fs.readFile("Lignes.md");
    const $todosText = fs.readFile("LignesTODO.md");
    const $dataFiles = fs.readdir("data").then(data =>
        Promise.all(data
            .map(async f => [f, (await fs.readFile("data/" + f)).toString()])));

    const audioFiles = (await $audioFiles).map(f => [f, true]).toObject();

    const knownLinesText = (await $knownLinesText).toString();
    const knownLinesByName = linesMDToSectionsByName(knownLinesText);

    const todosText = (await $todosText).toString();
    const todosByName = linesMDToSectionsByName(todosText);

    const linesByName = {};

    const dataFiles = await $dataFiles;
    for (const [dataFile, text] of dataFiles) {
        const json = JSON.parse(text);
        if (dataFile.match(MAP_REGEX)) {
            (json.events ?? [])
            .flatMap(event => event?.pages ?? [])
            .forEach(page =>
                page?.list?.forEach((item, i) => {
                    let file;
                    if (item.code === CODES.PLUGIN && item.parameters?.[0].startsWith("se "))
                        file = item.parameters[0].substring(3);
                    else if (item.code === CODES.SE)
                        file = item.parameters[0].name;
                    else if (item.code === CODES.SCRIPT)
                    {
                        let scriptText = item.parameters[0] + "\n";
                        for (let j = i + 1; j < page.list.length; j++) {
                            const subitem = page.list[j];
                            if (subitem?.code === CODES.SCRIPT_FOLLOWUP) {
                                scriptText += subitem?.parameters[0] + "\n";
                                i = j;
                            } else {
                                break;
                            }
                        }
                        file = scriptText.match(SCRIPT_SE)?.[1];
                    }
                    if (!file) {
                        return [];
                    }

                    let [, name, description] = file.match(/_([A-ZÔÈÉÊË][a-zôèéêë]*)(\w+)/) ?? [];
                    if (!name) {
                        name = "SFX";
                        description = file;
                    }
                    // Self + Image + 4 lines per box => 6
                    const contentItems = [];
                    if ([CODES.TEXT, CODES.SCROLL_TEXT].includes(page.list[i + 1]?.code)) {
                        for (let j = i + 2; j < page.list.length; j++) {
                            const subitem = page.list[j];
                            if ([CODES.TEXT_FOLLOWUP, CODES.SCROLL_TEXT_FOLLOWUP].includes(subitem?.code))
                                contentItems.push(subitem);
                            else
                                break;
                        }
                    }
                    const contentLines = contentItems?.length ?
                        contentItems.map(item => item?.parameters?.[0]?.trim() ?? "") :
                        [description];

                    (linesByName[name] || (linesByName[name] = {}))[file] = contentLines;
                }));
        }
    }

    const missingAudioFiles = [];
    const obsoleteAudioFiles = [];

    for (const name in linesByName) {
        const knownLines = knownLinesByName[name] || (knownLinesByName[name] = {});
        const lines = linesByName[name];
        for (const line in lines) {
            const text = lines[line];
            const knownText = knownLines[line];
            if (!linesEqual(text, knownText)) {
                knownLines[line] = text;
            }
            // Assume audio was recorded before new system if it already exists and isn't a todo.
            if (!audioFiles[line + ".ogg"] ||
                todosByName[name]?.[line] && !linesEqual(knownText, todosByName[name][line])) {
                missingAudioFiles.push([line, text]);
                (todosByName[name] || (todosByName[name] = {}))[line] = text;
            }
        }
        for (const line in knownLines) {
            const knownText = knownLines[line];
            if (!linesEqual(knownText, lines[line])) {
                obsoleteAudioFiles.push([line]);
                delete knownLines[name]?.[line];
                delete todosByName[name]?.[line];
            }
        }
    }

    const newKnownLinesText = sectionsByNameToLinesMD(knownLinesByName);
    if (knownLinesText !== newKnownLinesText)
        await fs.writeFile("Lignes.md", newKnownLinesText);

    const newTodosText = sectionsByNameToLinesMD(todosByName);
    if (todosText !== newTodosText)
        await fs.writeFile("LignesTODO.md", newTodosText);

    for (const [file, content] of missingAudioFiles) {
        console.log("Generating file for TODO");
        console.log("  " + file);
        console.log("  > " + content);
        const fp = "./audio/se/" + file + ".ogg";
        const espeak = spawnSync("espeak", ["-v", "fr-fr", "-w", "tmp.wav", content]);
        const ffmpeg = spawnSync("ffmpeg", ["-i", "tmp.wav", "-y", fp]);
    }

    for (const [file] of obsoleteAudioFiles) {
        console.log("Obsolete audio clip");
        console.log("  " + file);
        await fs.unlink("audio/se/" + file + ".ogg");
    }
})();
