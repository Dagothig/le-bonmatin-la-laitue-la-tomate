const now = new Date();
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

    function readPageForLines(page) {
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
        });
    }

    const itemLocations = {};
    const mapTransfers = {};

    const dataFiles = await $dataFiles;
    for (const [dataFile, text] of dataFiles) {
        const json = JSON.parse(text);
        // Skip templates
        if (dataFile === "Map006.json") {
            continue;
        }
        const mapMatch = dataFile.match(MAP_REGEX);

        if (mapMatch) {
            (json.events ?? [])
            .flatMap(event => event?.pages ?? [])
            .forEach(readPageForLines);

            for (const event of json.events ?? []) {
                for (const page of event?.pages ?? []) {
                    for (const entry of page?.list ?? []) {
                        switch (entry?.code) {
                            case 126:
                                if (entry.parameters?.[0] === 1) {
                                    console.log("Chair on", dataFile, event.x, event.y);
                                }
                                if (entry.parameters?.[0] === 2) {
                                    console.log("Magic on", dataFile, event.x, event.y);
                                }
                                break;
                            case 201:
                                if (entry.parameters?.[0] === 0 &&
                                    entry.parameters.slice(0, 4).every(x => Number.isFinite(x))) {
                                    const sourceMapId = Number.parseInt(mapMatch[1]);
                                    const targetMapId = entry.parameters[1];
                                    const transfersForTarget = mapTransfers[targetMapId] = mapTransfers[targetMapId] || {};
                                    transfersForTarget[]
                                    if (mapTransfers[targetMapId]) {

                                    } else {
                                        mapTransfers[targetMapId] = {
                                            map: Number.parseInt(mapMatch[1]),
                                            x: event.x,
                                            y: event.y,
                                            count: 1
                                        };
                                    }
                                    console.log(
                                        "Travel from", dataFile, event.x, event.y,
                                        "to", entry.parameters?.[1], entry.parameters?.[2], entry.parameters?.[3])
                                }
                        }
                    }
                }
            }
        } else if (dataFile === "Troops.json") {
            json
            .flatMap(troop => troop?.pages ?? [])
            .forEach(readPageForLines);
        }

        const newText = JSON.stringify(json, null, 2);
        if (newText !== text) {
            console.log("Formatting", dataFile);
            await fs.writeFile("data/" + dataFile, newText);
        }
    }

    const missingAudioFiles = [];
    const obsoleteAudioFiles = [];

    for (const name in linesByName) {
        const knownLines = knownLinesByName[name] || (knownLinesByName[name] = {});
        const lines = linesByName[name];
        for (const line in lines) {
            const text = lines[line];
            let knownText = knownLines[line];
            if (!linesEqual(text, knownText)) {
                knownLines[line] = knownText = text;
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
                delete knownLines[line];
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
        console.log("Generated " + file);
        console.log("  > " + content);
        const fp = "./audio/se/" + file + ".ogg";
        const espeak = spawnSync("espeak", ["-v", "fr-fr", "-w", "tmp.wav", content.join(" ")]);
        const ffmpeg = spawnSync("ffmpeg", ["-i", "tmp.wav", "-y", fp]);
    }

    for (const [file] of obsoleteAudioFiles) {
        console.log("Removed " + file);
        await fs.unlink("audio/se/" + file + ".ogg");
    }

    console.log(
        "Grosso merdo",
        Object
        .values(knownLinesByName)
        .flatMap(byLine =>
            Object.values(byLine).flat())
        .join(" ")
        .split(/[,\.' ]+/)
        .filter(s => s.match(/.*[A-Za-z].*/))
        .length,
        "mots en " + (new Date() - now) + "ms");
})();
