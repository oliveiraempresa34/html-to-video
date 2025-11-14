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

    // Título único para a janela para o FFmpeg capturar
    const windowTitle = `VideoCapture_${id}_${Date.now()}`;

    console.log(`🌐 Abrindo navegador com título: ${windowTitle}...`);

    // Abrir Chrome visível para o Windows reconhecer a janela
    const browser = await puppeteer.launch({
        headless: false,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--window-size=1080,1920",
            "--window-position=0,0",
            `--app=file://${process.cwd()}/${temp}?title=${windowTitle}` // evita múltiplas abas
        ]
    });

    const pages = await browser.pages();
    const page = pages[0]; // usa somente a primeira aba
    await page.setViewport({ width: 1080, height: 1920 });

    // Aguardar a página carregar completamente
    await page.waitForSelector('.chat-container', { timeout: 10000 });

    // Definir título da janela via JavaScript
    await page.evaluate((title) => {
        document.title = title;
    }, windowTitle);

    console.log(`⏳ Aguardando 5 segundos para o navegador estabilizar e janela ser reconhecida...`);
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log(`🎥 Iniciando gravação do vídeo ${id} capturando janela "${windowTitle}"...`);

    // Iniciar ffmpeg capturando a janela específica com captura de erros
    const ffmpeg = exec(
        `ffmpeg -y -f gdigrab -framerate 30 -i title="${windowTitle}" -vcodec libx264 -preset ultrafast -pix_fmt yuv420p -t 24 "${videoPathAbsolute}"`,
        (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ Erro no FFmpeg: ${error.message}`);
                return;
            }
            if (stderr) {
                console.log(`📹 FFmpeg: ${stderr.substring(0, 200)}...`);
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
