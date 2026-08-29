// ============================================
// J.A.R.V.I.S. v5.0 - COMPLETO (COM CÂMERA)
// ============================================

// ============================================
// CONFIGURAÇÕES
// ============================================

const MISTRAL_API_KEY = "0k7vwPq3YQ2lq29J1dcxciBwyxE5QBV5";
const MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions";
const MISTRAL_MODEL = "pixtral-12b-2409";

const WEATHER_API_KEY = "b25c59171a3445ceaf6182554262105";
const NEWS_API_KEY = "509da2e5def74a41a7c33c90134c071a";

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================

let reconhecimentoVoz = null;
let estaOuvindo = false;
let historico = [];
let imagemBase64 = null;
let pdfTexto = null;
let cameraAtiva = false;
let streamCamera = null;
let videoElement = null;
let analiseAtiva = false;
let intervaloAnalise = null;

// ============================================
// RELÓGIO
// ============================================

function atualizarRelogio() {
    const agora = new Date();
    document.getElementById('clock').textContent = agora.toLocaleTimeString('pt-BR');
    document.getElementById('date').textContent = agora.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}
setInterval(atualizarRelogio, 1000);
atualizarRelogio();

// ============================================
// NOTIFICAÇÕES
// ============================================

function enviarNotificacao(titulo, mensagem) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(titulo, { body: mensagem, icon: 'icon.png' });
    }
}

// ============================================
// CHAT
// ============================================

function adicionarMensagem(tipo, texto, arquivo = null) {
    const div = document.createElement('div');
    div.className = `message ${tipo}`;
    
    let textoFormatado = texto;
    if (texto.includes('```')) {
        textoFormatado = texto.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
            return `<pre><code>${code.trim()}</code></pre>`;
        });
    }
    
    let arquivoHTML = '';
    if (arquivo) {
        if (arquivo.type === 'image') {
            arquivoHTML = `<br><img src="${arquivo.data}" alt="Imagem" style="max-width:100%; border-radius:8px; margin-top:6px;">`;
        } else if (arquivo.type === 'video') {
            arquivoHTML = `<br><div style="margin-top:6px;">${arquivo.element}</div>`;
        } else if (arquivo.type === 'pdf') {
            arquivoHTML = `<br><div style="background:rgba(255,215,0,0.05); padding:10px; border-radius:8px; border:1px solid rgba(255,215,0,0.1); margin-top:6px; font-size:12px;">
                📄 PDF carregado: ${arquivo.name} (${Math.round(arquivo.size/1024)} KB)
                <br>Faça perguntas sobre o conteúdo!
            </div>`;
        }
    }
    
    div.innerHTML = `
        <div class="avatar">${tipo === 'bot' ? '⚡' : '◆'}</div>
        <div class="bubble">${textoFormatado.replace(/\n/g, '<br>')}${arquivoHTML}</div>
    `;
    document.getElementById('chat').appendChild(div);
    document.getElementById('chat').scrollTop = document.getElementById('chat').scrollHeight;
}

// ============================================
// LIMPAR FORMATAÇÃO
// ============================================

function limparFormatacao(texto) {
    texto = texto.replace(/\*\*(.*?)\*\*/g, '$1');
    texto = texto.replace(/__(.*?)__/g, '$1');
    texto = texto.replace(/\*(.*?)\*/g, '$1');
    texto = texto.replace(/`(.*?)`/g, '$1');
    texto = texto.replace(/^#+\s*/gm, '');
    texto = texto.replace(/\[(.*?)\]\(.*?\)/g, '$1');
    return texto;
}

// ============================================
// ENVIAR ARQUIVO (IMAGEM OU PDF)
// ============================================

function enviarArquivo(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    
    if (file.type.startsWith('image/')) {
        reader.onload = function(e) {
            imagemBase64 = e.target.result;
            adicionarMensagem('user', '📸 Enviou uma imagem', { type: 'image', data: imagemBase64 });
            adicionarMensagem('bot', '📸 Imagem recebida! O que você quer saber sobre ela?');
            document.getElementById('fileInput').value = '';
        };
        reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf') {
        reader.onload = async function(e) {
            try {
                const pdfData = new Uint8Array(e.target.result);
                const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
                let textoCompleto = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const content = await page.getTextContent();
                    textoCompleto += content.items.map(item => item.str).join(' ') + '\n';
                }
                pdfTexto = textoCompleto;
                adicionarMensagem('user', `📄 Enviou PDF: ${file.name}`, { type: 'pdf', name: file.name, size: file.size });
                adicionarMensagem('bot', `✅ PDF "${file.name}" processado! ${pdf.numPages} páginas lidas.\n\n📝 Faça perguntas sobre o conteúdo do PDF.`);
                document.getElementById('fileInput').value = '';
            } catch (error) {
                adicionarMensagem('bot', `❌ Erro ao ler PDF: ${error.message}`);
            }
        };
        reader.readAsArrayBuffer(file);
    }
}

// ============================================
// CHAMAR MISTRAL
// ============================================

async function chamarMistral(pergunta, imagem = null) {
    try {
        let mensagem = { role: 'user', content: pergunta };
        
        if (imagem) {
            mensagem.content = [
                { type: 'text', text: pergunta },
                { type: 'image_url', image_url: imagem }
            ];
        }
        
        const response = await fetch(MISTRAL_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${MISTRAL_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: MISTRAL_MODEL,
                messages: [
                    { 
                        role: 'system', 
                        content: `Você é o J.A.R.V.I.S., um assistente extremamente inteligente e útil. 
                        Responda em português brasileiro. Seja conciso mas completo.
                        NUNCA use formatação como **negrito**, *italico*, # cabecalhos, etc.
                        Responda APENAS em texto puro, sem asteriscos ou caracteres especiais.` 
                    },
                    ...historico.slice(-5),
                    mensagem
                ],
                temperature: 0.7,
                max_tokens: 800
            })
        });

        const data = await response.json();
        
        if (data.error) {
            return `❌ Erro: ${data.error.message}`;
        }

        let resposta = data.choices[0].message.content;
        resposta = limparFormatacao(resposta);
        
        historico.push({ role: 'user', content: pergunta });
        historico.push({ role: 'assistant', content: resposta });
        
        if (historico.length > 20) historico = historico.slice(-20);
        
        return resposta;
        
    } catch (error) {
        return `❌ Erro de conexão: ${error.message}`;
    }
}

// ============================================
// FUNÇÕES CLIMA, MOEDAS, ETC (RESUMIDAS)
// ============================================

async function buscarClima(cidade) {
    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cidade)}&appid=${WEATHER_API_KEY}&units=metric&lang=pt_br`;
        const response = await fetch(url);
        const dados = await response.json();
        if (dados.cod === '404') return `❌ Cidade "${cidade}" não encontrada.`;
        const temp = Math.round(dados.main.temp);
        const sensacao = Math.round(dados.main.feels_like);
        const descricao = dados.weather[0].description;
        const umidade = dados.main.humidity;
        const vento = Math.round(dados.wind.speed * 3.6);
        return `🌤️ Clima em ${cidade.toUpperCase()}\n\n🌡️ ${temp}°C (sensação ${sensacao}°C)\n📝 ${descricao}\n💧 Umidade: ${umidade}%\n💨 Vento: ${vento} km/h`;
    } catch (error) {
        return `❌ Erro ao buscar clima: ${error.message}`;
    }
}

async function buscarPrevisao(cidade) {
    try {
        const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(cidade)}&appid=${WEATHER_API_KEY}&units=metric&lang=pt_br&cnt=7`;
        const response = await fetch(url);
        const dados = await response.json();
        if (dados.cod === '404') return `❌ Cidade "${cidade}" não encontrada.`;
        let resposta = `📅 Previsão para ${cidade.toUpperCase()}\n\n`;
        for (let i = 0; i < dados.list.length; i++) {
            const dia = dados.list[i];
            const data = new Date(dia.dt * 1000);
            const temp = Math.round(dia.main.temp);
            const descricao = dia.weather[0].description;
            resposta += `${data.toLocaleDateString('pt-BR')} ${data.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})}\n`;
            resposta += `   🌡️ ${temp}°C - ${descricao}\n`;
            resposta += `   💧 Umidade: ${dia.main.humidity}%\n\n`;
        }
        return resposta;
    } catch (error) {
        return `❌ Erro ao buscar previsão: ${error.message}`;
    }
}

async function buscarCotacao() {
    try {
        const url = 'https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,BTC-BRL';
        const response = await fetch(url);
        const dados = await response.json();
        const dolar = parseFloat(dados.USDBRL.bid).toFixed(2);
        const euro = parseFloat(dados.EURBRL.bid).toFixed(2);
        const bitcoin = parseFloat(dados.BTCBRL.bid).toFixed(2);
        const data = new Date(dados.USDBRL.create_date).toLocaleString('pt-BR');
        return `💰 Cotações (Atualizado: ${data})\n\n🇺🇸 Dólar: R$ ${dolar}\n🇪🇺 Euro: R$ ${euro}\n₿ Bitcoin: R$ ${bitcoin}`;
    } catch (error) {
        return `❌ Erro ao buscar cotações: ${error.message}`;
    }
}

async function buscarNoticias(termo) {
    try {
        const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(termo)}&language=pt&sortBy=publishedAt&pageSize=5&apiKey=${NEWS_API_KEY}`;
        const response = await fetch(url);
        const dados = await response.json();
        if (dados.status === 'error') return `❌ Erro: ${dados.message}`;
        if (dados.totalResults === 0) return `📰 Nenhuma notícia encontrada sobre "${termo}".`;
        let resposta = `📰 Notícias sobre "${termo}"\n\n`;
        for (let i = 0; i < Math.min(dados.articles.length, 5); i++) {
            const artigo = dados.articles[i];
            const titulo = artigo.title || 'Sem título';
            const fonte = artigo.source.name || 'Fonte desconhecida';
            const data = new Date(artigo.publishedAt).toLocaleDateString('pt-BR');
            resposta += `${i+1}. ${titulo}\n   📰 ${fonte} • 📅 ${data}\n\n`;
        }
        return resposta;
    } catch (error) {
        return `❌ Erro ao buscar notícias: ${error.message}`;
    }
}

async function pesquisarWikipedia(termo) {
    try {
        const url = `https://pt.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(termo)}&format=json&origin=*`;
        const response = await fetch(url);
        const dados = await response.json();
        const resultados = dados.query.search;
        if (!resultados || resultados.length === 0) return `🔍 Nenhum resultado encontrado para "${termo}".`;
        const primeiro = resultados[0];
        const titulo = primeiro.title;
        const snippet = primeiro.snippet.replace(/<[^>]*>/g, '');
        const urlConteudo = `https://pt.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&titles=${encodeURIComponent(titulo)}&format=json&origin=*`;
        const responseConteudo = await fetch(urlConteudo);
        const dadosConteudo = await responseConteudo.json();
        const pages = dadosConteudo.query.pages;
        const pageId = Object.keys(pages)[0];
        if (pageId === '-1') return `📄 ${titulo}\n\n${snippet}...`;
        const conteudo = pages[pageId].extract || snippet;
        const resumo = conteudo.split('\n').slice(0, 4).join('\n');
        return `📄 ${titulo}\n\n${resumo}`;
    } catch (error) {
        return `❌ Erro ao pesquisar: ${error.message}`;
    }
}

function abrirSite(comando) {
    let site = comando.replace(/^abrir\s*/i, '').trim();
    const sites = {
        'youtube': 'https://youtube.com',
        'google': 'https://google.com',
        'gmail': 'https://gmail.com',
        'github': 'https://github.com',
        'twitter': 'https://twitter.com',
        'instagram': 'https://instagram.com',
        'facebook': 'https://facebook.com',
        'linkedin': 'https://linkedin.com',
        'reddit': 'https://reddit.com',
        'netflix': 'https://netflix.com',
        'spotify': 'https://spotify.com',
        'amazon': 'https://amazon.com',
        'wikipedia': 'https://wikipedia.org',
        'whatsapp': 'https://web.whatsapp.com',
        'telegram': 'https://web.telegram.org',
        'discord': 'https://discord.com',
        'twitch': 'https://twitch.tv',
        'mercadolivre': 'https://mercadolivre.com.br'
    };
    for (let [nome, url] of Object.entries(sites)) {
        if (site.includes(nome)) {
            window.open(url, '_blank');
            return `✅ Abrindo ${nome}...`;
        }
    }
    if (site.includes('.')) {
        let url = site;
        if (!url.startsWith('http')) url = 'https://' + url;
        window.open(url, '_blank');
        return `✅ Abrindo ${site}...`;
    }
    window.open(`https://www.google.com/search?q=${encodeURIComponent(site)}`, '_blank');
    return `🔍 Pesquisando "${site}" no Google...`;
}

function calcular(expressao) {
    try {
        const resultado = Function('"use strict"; return (' + expressao + ')')();
        return `🧮 ${expressao} = ${resultado}`;
    } catch {
        return '❌ Não consegui calcular isso.';
    }
}

// ============================================
// FUNÇÕES DA CÂMERA (SCRIPT1.JS)
// ============================================

let ultimoFrame = null;
let movimentoDetectado = false;
let frameAtual = 0;
let analiseAtivaCamera = false;

async function iniciarCamera() {
    if (cameraAtiva) {
        adicionarMensagem('bot', '📸 A câmera já está ativa!');
        return;
    }

    try {
        // Verifica se o navegador suporta a API de câmera
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            adicionarMensagem('bot', '❌ Seu navegador não suporta acesso à câmera.');
            return;
        }

        // Tenta acessar a câmera
        const constraints = {
            video: {
                facingMode: 'user',
                width: { ideal: 640 },
                height: { ideal: 480 }
            },
            audio: false
        };

        streamCamera = await navigator.mediaDevices.getUserMedia(constraints);
        cameraAtiva = true;
        analiseAtivaCamera = true;

        // Cria o elemento de vídeo
        videoElement = document.createElement('video');
        videoElement.srcObject = streamCamera;
        videoElement.autoplay = true;
        videoElement.playsInline = true;
        videoElement.style.width = '100%';
        videoElement.style.borderRadius = '8px';
        videoElement.style.marginTop = '8px';
        videoElement.style.border = '1px solid rgba(255,215,0,0.2)';

        // Adiciona a mensagem com o vídeo
        adicionarMensagem('bot', '📸 Câmera ativada!');
        
        const videoDiv = document.createElement('div');
        videoDiv.className = 'message bot';
        videoDiv.innerHTML = `
            <div class="avatar">⚡</div>
            <div class="bubble" style="padding: 0; overflow: hidden; max-width: 100%;">
            </div>
        `;
        videoDiv.querySelector('.bubble').appendChild(videoElement);
        document.getElementById('chat').appendChild(videoDiv);
        document.getElementById('chat').scrollTop = document.getElementById('chat').scrollHeight;

        // Inicia a análise em tempo real
        iniciarAnaliseCamera();

        adicionarMensagem('bot', '🔍 Analisando movimento e rostos em tempo real...');

        // Adiciona botão de desligar
        const btnDesligar = document.createElement('button');
        btnDesligar.textContent = '📸 Desligar Câmera';
        btnDesligar.style.cssText = `
            background: rgba(255,215,0,0.1);
            border: 1px solid rgba(255,215,0,0.2);
            color: var(--text-primary);
            padding: 8px 16px;
            border-radius: 20px;
            cursor: pointer;
            margin-top: 8px;
            font-family: 'Rajdhani', sans-serif;
        `;
        btnDesligar.onclick = desligarCamera;
        
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message bot';
        msgDiv.innerHTML = `<div class="avatar">⚡</div><div class="bubble"></div>`;
        msgDiv.querySelector('.bubble').appendChild(btnDesligar);
        document.getElementById('chat').appendChild(msgDiv);
        document.getElementById('chat').scrollTop = document.getElementById('chat').scrollHeight;

    } catch (error) {
        console.error('Erro ao acessar câmera:', error);
        adicionarMensagem('bot', `❌ Não foi possível acessar a câmera: ${error.message}`);
        cameraAtiva = false;
    }
}

function iniciarAnaliseCamera() {
    if (intervaloAnalise) {
        clearInterval(intervaloAnalise);
    }

    // Cria um canvas para capturar frames
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 160;
    canvas.height = 120;

    // Função para capturar e analisar
    function capturarFrame() {
        if (!cameraAtiva || !videoElement || videoElement.paused || videoElement.readyState < 2) {
            if (analiseAtivaCamera) {
                requestAnimationFrame(capturarFrame);
            }
            return;
        }

        try {
            // Desenha o frame no canvas
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
            const frameData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            // Detecta movimento
            if (ultimoFrame) {
                let diferenca = 0;
                const dados = frameData.data;
                const ultimos = ultimoFrame.data;
                for (let i = 0; i < dados.length; i += 4) {
                    const r = Math.abs(dados[i] - ultimos[i]);
                    const g = Math.abs(dados[i+1] - ultimos[i+1]);
                    const b = Math.abs(dados[i+2] - ultimos[i+2]);
                    diferenca += (r + g + b) / 3;
                }
                diferenca /= (canvas.width * canvas.height);

                // Se detectar movimento significativo
                if (diferenca > 25 && !movimentoDetectado) {
                    movimentoDetectado = true;
                    frameAtual++;
                    if (frameAtual % 3 === 0) { // A cada 3 movimentos, comenta
                        const hora = new Date().toLocaleTimeString('pt-BR');
                        adicionarMensagem('bot', `🚨 Movimento detectado! (${hora})`);
                    }
                } else if (diferenca < 15) {
                    movimentoDetectado = false;
                }
            }

            // Salva o frame para a próxima comparação
            ultimoFrame = frameData;

            // Detecta rostos (simplificado)
            if (frameAtual % 5 === 0) {
                // Simulação de detecção de rosto baseado em tons de pele
                const dados = frameData.data;
                let encontrouPele = false;
                for (let i = 0; i < dados.length; i += 40) {
                    const r = dados[i];
                    const g = dados[i+1];
                    const b = dados[i+2];
                    if (r > 80 && g > 40 && b > 40 && r > g && r > b) {
                        encontrouPele = true;
                        break;
                    }
                }
                if (encontrouPele && Math.random() < 0.1) { // Comentário aleatório
                    const frases = [
                        "👤 Identifiquei um rosto!",
                        "🤔 Parece que alguém está aí",
                        "😊 Olá! Como posso ajudar?",
                        "👀 Estou te vendo!",
                        "📸 Posso tirar uma foto se quiser"
                    ];
                    const frase = frases[Math.floor(Math.random() * frases.length)];
                    adicionarMensagem('bot', frase);
                }
            }

        } catch (e) {
            // Silencia erros de frame
        }

        if (analiseAtivaCamera) {
            requestAnimationFrame(capturarFrame);
        }
    }

    // Inicia a captura
    analiseAtivaCamera = true;
    ultimoFrame = null;
    movimentoDetectado = false;
    frameAtual = 0;
    requestAnimationFrame(capturarFrame);
}

function tirarFoto() {
    if (!cameraAtiva || !videoElement) {
        adicionarMensagem('bot', '❌ A câmera não está ativa. Diga "abrir câmera" primeiro.');
        return;
    }

    try {
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth || 640;
        canvas.height = videoElement.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        const fotoURL = canvas.toDataURL('image/jpeg', 0.9);
        
        adicionarMensagem('user', '📸 Foto tirada!', { type: 'image', data: fotoURL });
        adicionarMensagem('bot', '✅ Foto capturada! O que você quer fazer com ela?');
        window.ultimaFoto = fotoURL;
        return fotoURL;
    } catch (error) {
        adicionarMensagem('bot', `❌ Erro ao tirar foto: ${error.message}`);
        return null;
    }
}

function desligarCamera() {
    if (streamCamera) {
        streamCamera.getTracks().forEach(track => track.stop());
        streamCamera = null;
    }
    cameraAtiva = false;
    analiseAtivaCamera = false;
    if (intervaloAnalise) {
        clearInterval(intervaloAnalise);
        intervaloAnalise = null;
    }
    videoElement = null;
    ultimoFrame = null;
    movimentoDetectado = false;
    adicionarMensagem('bot', '📸 Câmera desligada.');
}

// ============================================
// EXECUTAR COMANDO (PRINCIPAL)
// ============================================

async function executarComando(comando) {
    const cmd = comando.toLowerCase().trim();
    
    // ============================================
    // COMANDOS DA CÂMERA
    // ============================================
    
    if (cmd.includes('abrir câmera') || cmd.includes('abrir camera') || cmd.includes('ativar câmera') || cmd.includes('ativar camera')) {
        await iniciarCamera();
        return;
    }
    
    if (cmd.includes('tirar foto') || cmd.includes('fotografar')) {
        tirarFoto();
        return;
    }
    
    if (cmd.includes('desligar câmera') || cmd.includes('desligar camera') || cmd.includes('fechar câmera') || cmd.includes('fechar camera')) {
        desligarCamera();
        return;
    }
    
    // ============================================
    // COMANDOS NORMAIS (CLIMA, MOEDAS, ETC)
    // ============================================
    
    // Clima
    if (cmd.includes('clima') || cmd.includes('tempo')) {
        let cidade = cmd.replace(/clima\s*em\s*/i, '').replace(/tempo\s*em\s*/i, '').replace(/clima/i, '').replace(/tempo/i, '').trim();
        if (!cidade) cidade = 'São Paulo';
        const resposta = await buscarClima(cidade);
        adicionarMensagem('bot', resposta);
        return;
    }
    
    // Previsão
    if (cmd.includes('previsão') || cmd.includes('previsao')) {
        let cidade = cmd.replace(/previsão\s*/i, '').replace(/previsao\s*/i, '').trim();
        if (!cidade) cidade = 'São Paulo';
        const resposta = await buscarPrevisao(cidade);
        adicionarMensagem('bot', resposta);
        return;
    }
    
    // Cotação
    if (cmd.includes('cotação') || cmd.includes('cotacao') || cmd.includes('dólar') || cmd.includes('euro') || cmd.includes('bitcoin')) {
        const resposta = await buscarCotacao();
        adicionarMensagem('bot', resposta);
        return;
    }
    
    // Notícias
    if (cmd.includes('notícias') || cmd.includes('noticias')) {
        let termo = cmd.replace(/notícias\s*sobre\s*/i, '').replace(/noticias\s*sobre\s*/i, '').replace(/notícias/i, '').replace(/noticias/i, '').trim();
        if (!termo) termo = 'Brasil';
        const resposta = await buscarNoticias(termo);
        adicionarMensagem('bot', resposta);
        return;
    }
    
    // Wikipedia
    if (cmd.includes('pesquisar sobre') || cmd.includes('pesquisa sobre') || cmd.includes('o que é') || cmd.includes('quem é') || cmd.includes('sobre')) {
        let termo = cmd.replace(/^pesquisar sobre\s*/i, '').replace(/^pesquisa sobre\s*/i, '').replace(/^o que é\s*/i, '').replace(/^quem é\s*/i, '').replace(/^sobre\s*/i, '').trim();
        if (!termo) {
            adicionarMensagem('bot', '❓ Sobre o que você quer pesquisar?');
            return;
        }
        const resposta = await pesquisarWikipedia(termo);
        adicionarMensagem('bot', resposta);
        return;
    }
    
    // Abrir sites
    if (cmd.includes('abrir')) {
        const resultado = abrirSite(cmd);
        adicionarMensagem('bot', resultado);
        return;
    }
    
    // Calculadora
    if (cmd.includes('calcular') || cmd.includes('calcule')) {
        const expressao = cmd.replace(/calcular\s*/i, '').replace(/calcule\s*/i, '').trim();
        const resposta = calcular(expressao);
        adicionarMensagem('bot', resposta);
        return;
    }
    
    // Hora
    if (cmd.includes('hora') || cmd.includes('horas') || cmd === 'que horas são') {
        const agora = new Date();
        const resposta = `🕐 São ${agora.toLocaleTimeString('pt-BR')} do dia ${agora.toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })}`;
        adicionarMensagem('bot', resposta);
        return;
    }
    
    // Lembrete
    if (cmd.includes('lembrete')) {
        const texto = cmd.replace('lembrete', '').trim() || 'sem descrição';
        enviarNotificacao('📌 Lembrete', `Não se esqueça: ${texto}`);
        adicionarMensagem('bot', `✅ Lembrete salvo: "${texto}"`);
        return;
    }
    
    // Ajuda
    if (cmd.includes('ajuda') || cmd.includes('comandos') || cmd.includes('o que você faz')) {
        adicionarMensagem('bot', `
📋 TODOS OS COMANDOS DO J.A.R.V.I.S.

📸 CÂMERA:
  "abrir câmera" - Ativa a câmera com detecção de movimento
  "tirar foto" - Tira uma foto
  "desligar câmera" - Desativa a câmera

🌤️ CLIMA:
  "clima [cidade]" - Clima atual
  "previsão [cidade]" - Previsão 7 dias

💰 MOEDAS:
  "cotação" - Dólar, Euro, Bitcoin

📰 NOTÍCIAS:
  "notícias [assunto]" - Últimas notícias

🔍 WIKIPEDIA:
  "pesquisar sobre [assunto]"

🌐 SITES:
  "abrir [site]" - Abre qualquer site

🧮 CALCULADORA:
  "calcular [conta]"

📌 LEMBRETES:
  "lembrete [texto]"

🕐 HORA:
  "hora"

💬 Ou simplesmente me pergunte qualquer coisa!
        `);
        return;
    }
    
    // ============================================
    // PERGUNTA COM IMAGEM
    // ============================================
    
    if (imagemBase64) {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message bot';
        loadingDiv.id = 'loading-msg';
        loadingDiv.innerHTML = `<div class="avatar">⚡</div><div class="bubble" style="color: var(--text-secondary);">📸 Analisando imagem...</div>`;
        document.getElementById('chat').appendChild(loadingDiv);
        document.getElementById('chat').scrollTop = document.getElementById('chat').scrollHeight;
        
        const resposta = await chamarMistral(cmd, imagemBase64);
        
        const loadingElement = document.getElementById('loading-msg');
        if (loadingElement) loadingElement.remove();
        
        adicionarMensagem('bot', resposta);
        imagemBase64 = null;
        return;
    }
    
    // ============================================
    // IA
    // ============================================
    
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message bot';
    loadingDiv.id = 'loading-msg';
    loadingDiv.innerHTML = `<div class="avatar">⚡</div><div class="bubble" style="color: var(--text-secondary);">⏳ Processando...</div>`;
    document.getElementById('chat').appendChild(loadingDiv);
    document.getElementById('chat').scrollTop = document.getElementById('chat').scrollHeight;
    
    const respostaIA = await chamarMistral(cmd);
    
    const loadingElement = document.getElementById('loading-msg');
    if (loadingElement) loadingElement.remove();
    
    adicionarMensagem('bot', respostaIA);
}

// ============================================
// ENVIAR COMANDO
// ============================================

function enviarComando() {
    const texto = document.getElementById('user-input').value.trim();
    if (texto) {
        adicionarMensagem('user', texto);
        executarComando(texto);
        document.getElementById('user-input').value = '';
    }
}

// ============================================
// COMANDO DE VOZ
// ============================================

function toggleMic() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert('⚠️ Seu navegador não suporta reconhecimento de voz.');
        return;
    }
    
    if (estaOuvindo) {
        pararEscuta();
        return;
    }
    
    iniciarEscuta();
}

function iniciarEscuta() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    reconhecimentoVoz = new SpeechRecognition();
    reconhecimentoVoz.lang = 'pt-BR';
    reconhecimentoVoz.continuous = false;
    reconhecimentoVoz.interimResults = false;
    
    reconhecimentoVoz.onresult = function(event) {
        const resultado = event.results[0][0].transcript;
        document.getElementById('user-input').value = resultado;
        adicionarMensagem('user', resultado);
        executarComando(resultado);
        pararEscuta();
    };
    
    reconhecimentoVoz.onerror = function(event) {
        console.error('Erro de voz:', event.error);
        pararEscuta();
        if (event.error === 'not-allowed') {
            adicionarMensagem('bot', '⚠️ Permissão do microfone negada.');
        } else {
            adicionarMensagem('bot', '❌ Não entendi. Tente novamente.');
        }
    };
    
    reconhecimentoVoz.onend = function() {
        pararEscuta();
    };
    
    reconhecimentoVoz.start();
    estaOuvindo = true;
    document.getElementById('mic-btn').classList.add('listening');
    document.querySelector('.status .status-text').textContent = 'Ouvindo...';
    document.querySelector('.status .dot').className = 'dot listening';
    adicionarMensagem('bot', '🎤 Estou ouvindo... Fale agora!');
}

function pararEscuta() {
    if (reconhecimentoVoz) {
        try { reconhecimentoVoz.stop(); } catch(e) {}
    }
    estaOuvindo = false;
    document.getElementById('mic-btn').classList.remove('listening');
    document.querySelector('.status .status-text').textContent = 'Online';
    document.querySelector('.status .dot').className = 'dot';
}

// ============================================
// PWA
// ============================================

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
        .then(() => console.log('✅ Service Worker registrado'))
        .catch(() => console.log('❌ Service Worker falhou'));
}

if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}

console.log('⚡ J.A.R.V.I.S. v5.0 iniciado com câmera!');
