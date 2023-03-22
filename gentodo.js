const fs = require("fs/promises");
const { spawnSync } = require("child_process");

async function readTODOs() {
    const text = (await fs.readFile("README.md")).toString();
    const todos = Array
        .from(text.matchAll(/(_\w+)\r?\n((>.*\r?\n)+)/mg))
        .map(match => [match[1], match[2].replace(/[>\\\r\n]/g, "").trim()]);

    await Promise.all(todos.map(async ([file, content]) => {
        const fp = "./audio/se/" + file + ".ogg";
        if (!(await fs.access(fp))) {
            console.log("Generating for " + file);
            console.log(content);
            const espeak = spawnSync("espeak", ["-v", "fr-fr", "-w", "tmp.wav", content]);
            const ffmpeg = spawnSync("ffmpeg", ["-i", "tmp.wav", "-y", fp]);
        }
    }));

    for (const [file, content] of todos) {

    }
}

readTODOs();
