// ============================================
// J.A.R.V.I.S. v5.0 - TUDO EM UM
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
let mapaInicializado = false;
let playerAtivo = false;
let temaAtual = localStorage.getItem('jarvis-theme') || 'dark';
let contadorMensagens = parseInt(localStorage.getItem('jarvis-msg-count')) || 0;
let contadorComandos = parseInt(localStorage.getItem('jarvis-cmd-count')) || 0;
let dataInicio = localStorage.getItem('jarvis-start-time') || Date.now();

// Elementos DOM
const chat = document.getElementById('chat');
const userInput = document.getElementById('user-input');
const statusIndicator = document.getElementById('status-indicator');
const micBtn = document.getElementById('mic-btn');

// ============================================
// INICIALIZAÇÃO
// ============================================

function inicializar() {
    // Aplica tema salvo
    if (temaAtual === 'light') {
        document.body.classList.add('light-theme');
        document.getElementById('theme-toggle').textContent = '🌙';
    }
    
    // Atualiza estatísticas
    atualizarStats();
    
    // Inicia contador de tempo
    setInterval(atualizarStats, 30000);
    
    console.log('⚡ J.A.R.V.I.S. v5.0 iniciado!');
    console.log(`📊 ${contadorMensagens} mensagens, ${contadorComandos} comandos`);
}

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
// ESTATÍSTICAS
// ============================================

function atualizarStats() {
    document.getElementById('msg-count').textContent = `💬 ${contadorMensagens} mensagens`;
    document.getElementById('commands-used').textContent = `⚡ ${contadorComandos} comandos`;
    
    const agora = Date.now();
    const diff = Math.floor((agora - parseInt(dataInicio)) / 1000);
    const horas = Math.floor(diff / 3600);
    const minutos = Math.floor((diff % 3600) / 60);
    document.getElementById('session-time').textContent = `⏱️ ${horas}h ${minutos}m`;
}

function incrementarMensagem() {
    contadorMensagens++;
    localStorage.setItem('jarvis-msg-count', contadorMensagens);
    atualizarStats();
}

function incrementarComando() {
    contadorComandos++;
    localStorage.setItem('jarvis-cmd-count', contadorComandos);
    atualizarStats();
}

// ============================================
// TEMA
// ============================================

function toggleTheme() {
    if (temaAtual === 'dark') {
        document.body.classList.add('light-theme');
        document.getElementById('theme-toggle').textContent = '🌙';
        temaAtual = 'light';
    } else {
        document.body.classList.remove('light-theme');
        document.getElementById('theme-toggle').textContent = '🌓';
        temaAtual = 'dark';
    }
    localStorage.setItem('jarvis-theme', temaAtual);
}

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
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
    
    if (tipo === 'user') incrementarMensagem();
    if (tipo === 'bot') incrementarComando();
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

let pdfTexto = null;

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
// CHAMAR MISTRAL (COM VISÃO)
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
                        Você pode ver imagens, ler PDFs, abrir sites, buscar clima, moedas, e muito mais.
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
// 1. PREVISÃO DO TEMPO (7 DIAS)
// ============================================

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

// ============================================
// 2. COTAÇÃO DE MOEDAS
// ============================================

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

// ============================================
// 3. CONVERSOR DE UNIDADES
// ============================================

function converterUnidades(comando) {
    const cmd = comando.toLowerCase();
    
    // Temperatura
    if (cmd.includes('celsius') && cmd.includes('fahrenheit')) {
        const match = cmd.match(/(\d+(?:\.\d+)?)/);
        if (match) {
            const c = parseFloat(match[1]);
            const f = (c * 9/5) + 32;
            return `🌡️ ${c}°C = ${f.toFixed(1)}°F`;
        }
    }
    
    if (cmd.includes('fahrenheit') && cmd.includes('celsius')) {
        const match = cmd.match(/(\d+(?:\.\d+)?)/);
        if (match) {
            const f = parseFloat(match[1]);
            const c = (f - 32) * 5/9;
            return `🌡️ ${f}°F = ${c.toFixed(1)}°C`;
        }
    }
    
    // Reais para Dólar
    if (cmd.includes('real') && (cmd.includes('dólar') || cmd.includes('dolar'))) {
        const match = cmd.match(/(\d+(?:\.\d+)?)/);
        if (match) {
            const reais = parseFloat(match[1]);
            // Busca cotação em tempo real
            fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL')
                .then(r => r.json())
                .then(dados => {
                    const dolar = parseFloat(dados.USDBRL.bid);
                    const resultado = reais / dolar;
                    adicionarMensagem('bot', `💰 R$ ${reais.toFixed(2)} = US$ ${resultado.toFixed(2)}`);
                })
                .catch(() => adicionarMensagem('bot', '❌ Erro ao buscar cotação.'));
            return null;
        }
    }
    
    return '❓ Não entendi a conversão. Exemplo: "converter 30°C para Fahrenheit" ou "converter 50 reais para dólar"';
}

// ============================================
// 4. CALCULADORA
// ============================================

function calcular(expressao) {
    try {
        const resultado = Function('"use strict"; return (' + expressao + ')')();
        return `🧮 ${expressao} = ${resultado}`;
    } catch {
        return '❌ Não consegui calcular isso.';
    }
}

// ============================================
// 5. QR CODE
// ============================================

function gerarQRCode(texto) {
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(texto)}`;
    return `![QR Code](${url})\n\n🔗 QR Code gerado para: ${texto}`;
}

// ============================================
// 6. MAPA INTERATIVO (LEAFLET)
// ============================================

function criarMapa(localizacao) {
    const mapDiv = document.createElement('div');
    mapDiv.id = 'map-container';
    mapDiv.style.width = '100%';
    mapDiv.style.height = '250px';
    mapDiv.style.borderRadius = '8px';
    mapDiv.style.margin = '6px 0';
    mapDiv.style.border = '1px solid var(--border-color)';
    
    chat.appendChild(mapDiv);
    
    // Inicializa mapa
    const map = L.map('map-container').setView([-23.5505, -46.6333], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);
    
    // Marcação
    L.marker([-23.5505, -46.6333]).addTo(map)
        .bindPopup('📍 ' + localizacao)
        .openPopup();
    
    setTimeout(() => {
        map.invalidateSize();
    }, 100);
}

// ============================================
// 7. YOUTUBE PLAYER
// ============================================

function tocarMusica(termo) {
    const playerDiv = document.getElementById('youtube-player');
    const playerContainer = document.getElementById('music-player');
    const musicTitle = document.getElementById('music-title');
    
    playerContainer.style.display = 'block';
    musicTitle.textContent = `▶️ Tocando: ${termo}`;
    
    // Busca vídeo no YouTube
    fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=${encodeURIComponent(termo)}&type=video&key=AIzaSyDxQZcVQg0wE8T7Q9C5lY6V9XjVYVr1SqM`)
        .then(r => r.json())
        .then(dados => {
            if (dados.items && dados.items.length > 0) {
                const videoId = dados.items[0].id.videoId;
                playerDiv.innerHTML = `
                    <iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" 
                        frameborder="0" allow="autoplay; encrypted-media" allowfullscreen>
                    </iframe>
                `;
                playerAtivo = true;
            } else {
                playerDiv.innerHTML = '<p style="color: var(--text-secondary); font-size:12px;">❌ Nenhum vídeo encontrado.</p>';
            }
        })
        .catch(() => {
            playerDiv.innerHTML = '<p style="color: var(--text-secondary); font-size:12px;">❌ Erro ao buscar vídeo.</p>';
        });
}

function fecharPlayer() {
    document.getElementById('music-player').style.display = 'none';
    document.getElementById('youtube-player').innerHTML = '';
    playerAtivo = false;
}

// ============================================
// 8. PESQUISAR NA WIKIPEDIA
// ============================================

async function pesquisarWikipedia(termo) {
    try {
        const url = `https://pt.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(termo)}&format=json&origin=*`;
        const response = await fetch(url);
        const dados = await response.json();
        
        const resultados = dados.query.search;
        if (!resultados || resultados.length === 0) {
            return `🔍 Nenhum resultado encontrado para "${termo}".`;
        }
        
        const primeiro = resultados[0];
        const titulo = primeiro.title;
        const snippet = primeiro.snippet.replace(/<[^>]*>/g, '');
        
        const urlConteudo = `https://pt.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&titles=${encodeURIComponent(titulo)}&format=json&origin=*`;
        const responseConteudo = await fetch(urlConteudo);
        const dadosConteudo = await responseConteudo.json();
        
        const pages = dadosConteudo.query.pages;
        const pageId = Object.keys(pages)[0];
        if (pageId === '-1') {
            return `📄 ${titulo}\n\n${snippet}...`;
        }
        
        const conteudo = pages[pageId].extract || snippet;
        const resumo = conteudo.split('\n').slice(0, 4).join('\n');
        
        return `📄 ${titulo}\n\n${resumo}`;
        
    } catch (error) {
        return `❌ Erro ao pesquisar: ${error.message}`;
    }
}

// ============================================
// 9. BUSCAR NOTÍCIAS
// ============================================

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

// ============================================
// 10. ABRIR SITES
// ============================================

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
        'what
