const fs = require("fs/promises");
const os = require("os");
const { spawnSync } = require("child_process");

const CODES = {
    PLUGIN: 356,
    SE: 250,
    TEXT: 401
}

async function genTODOFile(file, content) {
    console.log("Missing file for TODO");
    console.log("  " + file);
    console.log("  > " + content);
    const fp = "./audio/se/" + file + ".ogg";
    const espeak = spawnSync("espeak", ["-v", "fr-fr", "-w", "tmp.wav", content]);
    const ffmpeg = spawnSync("ffmpeg", ["-i", "tmp.wav", "-y", fp]);
}

(async () => {
    const audioFiles = Object.fromEntries(
        (await fs.readdir("audio/se"))
        .map(f => [f, true]));

    const readmeText = (await fs.readFile("README.md")).toString();
    const todos = Array
        .from(readmeText.matchAll(/(_\w+)\r?\n((>.*\r?\n)+)/mg))
        .map(match => [match[1], match[2].replace(/[>\\\r\n]/g, "").trim()]);

    await Promise.all(todos.map(([file, content]) =>
        audioFiles[file + ".ogg"] || (
            audioFiles[file + ".ogg"] = true,
            genTODOFile(file, content))));

    const readmeSectionsMatches = Array.from(readmeText.matchAll(/#+ (.*)/g));
    const readmeSections = readmeSectionsMatches.map((match, i) => ({
        header: match[1],
        lines: readmeText
            .substring(match.index, readmeSectionsMatches[i + 1]?.index ?? readmeText.length)
            .split(/\r?\n/)
    }));

    // Trim sections.
    for (const section of readmeSections) {
        for (let i = section.lines.length - 1; i >= 0; i--) {
            if (section.lines[i].trim() === "") {
                section.lines.pop();
            } else {
                break;
            }
        }
    }

    const sectionsByName = Object.fromEntries(readmeSections.map(section =>
        [section.header, section]));

    const data = await  fs.readdir("data");
    const maps = data.filter(f => f.startsWith("Map"));
    await Promise.all(maps.map(async map => {
        const string = (await fs.readFile("data/" + map)).toString();
        const json = JSON.parse(string);
        await Promise.all(
            (json.events ?? [])
            .flatMap(event => event?.pages ?? [])
            .flatMap(page =>
                page?.list?.flatMap(async (item, i) => {
                    let file;
                    if (item.code === CODES.PLUGIN && item.parameters?.[0].startsWith("se "))
                        file = item.parameters[0].substring(3);
                    else if (item.code === CODES.SE)
                        file = item.parameters[0].name;
                    if (file && !audioFiles[file + ".ogg"]) {
                        const [, name, description] = file.match(/_([A-ZÔÈÉÊË][a-zôèéêë]*)(\w+)/) ?? [];
                        // Self + Image + 4 lines per box => 6
                        const contentItems = page?.list?.slice(i, i + 6).filter(item => item?.code === CODES.TEXT);
                        const contentLines = contentItems?.length ?
                            contentItems.map(item => item?.parameters?.[0]) :
                            [description];
                        await genTODOFile(file, contentLines.join("\n"));
                        section = sectionsByName[name];
                        if (!section) {
                            section = sectionsByName[name] =
                            {
                                header: name,
                                lines: ["### " + name]
                            };
                            readmeSections.splice(readmeSections.findIndex(s => s.header === "SFX"), 0, section);
                        }
                        section.lines.push(
                            "",
                            file,
                            ...contentLines.map((l, i) =>
                                "> " + l + ((i === contentLines.length - 1) ? "" : "\\")));
                    }
                })));
    }));

    await fs.writeFile("README.md", readmeSections.map(s => s.lines.join(os.EOL)).join(os.EOL + os.EOL));
})()
