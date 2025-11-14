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
    // Reduzido em 20%: 810x1440 → 648x1152
    const videoWidth = 648;
    const videoHeight = 1152;

    // Offset para capturar apenas a área do navegador (ajustar se necessário)
    // Considera barra de título do Windows (~30-40px)
    const captureOffsetX = 8; // Borda esquerda do Windows
    const captureOffsetY = 30; // Barra de título do Windows

    console.log(`🌐 Abrindo navegador (${videoWidth}x${videoHeight})...`);

    // Abrir Chrome visível com tamanho exato para captura
    const browser = await puppeteer.launch({
        headless: false,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            `--window-size=${videoWidth},${videoHeight}`,
            "--window-position=0,0",
            "--force-device-scale-factor=1",
            "--disable-gpu",
            "--disable-infobars",
            "--disable-features=TranslateUI",
            `--app=file://${process.cwd()}/${temp}`
        ]
    });

    const pages = await browser.pages();
    const page = pages[0]; // usa somente a primeira aba
    await page.setViewport({ width: videoWidth, height: videoHeight });

    // Aguardar a página carregar completamente
    await page.waitForSelector('.chat-container', { timeout: 10000 });

    console.log(`⏳ Aguardando 2 segundos para renderização inicial...`);
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log(`🎥 Iniciando gravação do vídeo ${id} por 25 segundos...`);
    console.log(`   Capturando região: ${videoWidth}x${videoHeight} a partir de (${captureOffsetX},${captureOffsetY})`);

    // Iniciar ffmpeg capturando apenas a área interna do navegador
    const ffmpeg = exec(
        `ffmpeg -y -f gdigrab -framerate 30 -offset_x ${captureOffsetX} -offset_y ${captureOffsetY} -video_size ${videoWidth}x${videoHeight} -i desktop -vcodec libx264 -preset ultrafast -pix_fmt yuv420p -t 25 "${videoPathAbsolute}"`,
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

    // Aguardar o ffmpeg terminar (25 segundos exatos + margem de segurança)
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
