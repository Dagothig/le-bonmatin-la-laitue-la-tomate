const fs = require("fs");
const { spawnSync } = require("child_process");

const text = fs.readFileSync("README.md").toString();
const todos = Array
    .from(text.matchAll(/(_\w+)\r?\n((>.*\r?\n)+)/mg))
    .map(match => [match[1], match[2].replace(/[>\\\r\n]/g, "").trim()]);

for (const [file, content] of todos) {
    const fp = "./audio/se/" + file + ".ogg";
    if (!fs.existsSync(fp)) {
        console.log("Generating for " + file);
        console.log(content);
        const espeak = spawnSync("espeak", ["-v", "fr-fr", "-w", "tmp.wav", content]);
        const ffmpeg = spawnSync("ffmpeg", ["-i", "tmp.wav", "-y", fp]);
    }
}
