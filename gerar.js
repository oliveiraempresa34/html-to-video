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

    const videoPath = `videos/video_${id}.mp4`;
    const videoPathAbsolute = `${process.cwd()}\\videos\\video_${id}.mp4`;

    // Dimensões do vídeo - formato 9:16 (Stories/Reels)
    // Ajustado para 810x1440 para caber em telas ultrawide (1440p altura)
    const videoWidth = 810;
    const videoHeight = 1440;

    console.log(`🌐 Abrindo navegador (${videoWidth}x${videoHeight})...`);

    // Abrir Chrome visível em modo kiosk (tela cheia da janela)
    const browser = await puppeteer.launch({
        headless: false,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            `--window-size=${videoWidth},${videoHeight}`,
            "--window-position=0,0",
            "--force-device-scale-factor=1",
            "--disable-gpu",
            `--app=file://${process.cwd()}/${temp}`
        ]
    });

    const pages = await browser.pages();
    const page = pages[0]; // usa somente a primeira aba
    await page.setViewport({ width: videoWidth, height: videoHeight });

    // Aguardar a página carregar completamente
    await page.waitForSelector('.chat-container', { timeout: 10000 });

    console.log(`⏳ Aguardando 3 segundos para o navegador estabilizar...`);
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log(`🎥 Iniciando gravação do vídeo ${id}...`);
    console.log(`   Capturando região: ${videoWidth}x${videoHeight} a partir de (0,0)`);

    // Iniciar ffmpeg capturando região específica do desktop
    const ffmpeg = exec(
        `ffmpeg -y -f gdigrab -framerate 30 -offset_x 0 -offset_y 0 -video_size ${videoWidth}x${videoHeight} -i desktop -vcodec libx264 -preset ultrafast -pix_fmt yuv420p -t 24 "${videoPathAbsolute}"`,
        (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ Erro no FFmpeg: ${error.message}`);
                console.error(stderr);
                return;
            }
            if (stderr && stderr.includes("error")) {
                console.error(`⚠️ FFmpeg stderr: ${stderr}`);
            }
        }
    );

    // Aguardar o ffmpeg terminar (24 segundos + margem)
    await new Promise((resolve) => {
        ffmpeg.on("close", (code) => {
            console.log(`📹 FFmpeg finalizou com código: ${code}`);
            resolve();
        });
    });

    console.log(`🔒 Fechando navegador...`);
    await browser.close();

    // Aguardar um pouco antes de deletar o arquivo temp
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (fs.existsSync(temp)) {
        fs.unlinkSync(temp);
    }

    // Verificar se o vídeo foi realmente criado
    if (fs.existsSync(videoPath)) {
        const stats = fs.statSync(videoPath);
        console.log(`✅ Vídeo salvo: ${videoPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    } else {
        console.error(`❌ ERRO: Vídeo não foi criado em ${videoPath}`);
        console.error(`   Verifique se o FFmpeg está instalado: https://ffmpeg.org/download.html`);
    }
}

(async () => {
    for (let i = 1; i <= 1; i++) {
        await gerarVideo(i);
    }
})();
