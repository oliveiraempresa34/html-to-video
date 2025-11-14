const fs = require("fs");
const puppeteer = require("puppeteer");
const { exec } = require("child_process");

// Criar pasta /videos se não existir
if (!fs.existsSync("videos")) {
    fs.mkdirSync("videos");
}

function gerarNumerosUnicos(qtd, min, max) {
    const nums = new Set();
    while (nums.size < qtd) {
        nums.add(Math.floor(Math.random() * (max - min + 1)) + min);
    }
    return [...nums];
}

async function gerarVideo(id) {
    console.log(`🔧 Preparando vídeo ${id}...`);

    const numeros = gerarNumerosUnicos(4, 1, 26);

    let html = fs.readFileSync("template.html", "utf8");

    numeros.forEach((num, i) => {
        html = html.replace(`{numero${i + 1}}`, num);
    });

    const temp = `temp_${id}.html`;
    fs.writeFileSync(temp, html);

    // Abrir Chrome visível para o Windows reconhecer a janela
    const browser = await puppeteer.launch({
        headless: false,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--window-size=1080,1920",
            `--app=file://${process.cwd()}/${temp}` // evita múltiplas abas
        ]
    });

    const pages = await browser.pages();
    const page = pages[0]; // usa somente a primeira aba
    await page.setViewport({ width: 1080, height: 1920 });

    const videoPath = `videos/video_${id}.mp4`;

    console.log(`🎥 Gravando vídeo ${id}...`);

    const ffmpeg = exec(
        `ffmpeg -y -f gdigrab -framerate 30 -offset_x 0 -offset_y 0 -video_size 1080x1920 -i title="Chrome" -vcodec libx264 -preset ultrafast -pix_fmt yuv420p -t 24 "${videoPath}"`
    );

    await new Promise((resolve) => ffmpeg.on("close", resolve));

    await browser.close();
    fs.unlinkSync(temp);

    console.log(`✅ Vídeo salvo: ${videoPath}`);
}

(async () => {
    for (let i = 1; i <= 1; i++) {
        await gerarVideo(i);
    }
})();
