// ============================================
// J.A.R.V.I.S. v5.0 - COMPLETO
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
// QUEM SOU EU (CONSCIÊNCIA DO J.A.R.V.I.S.)
// ============================================

const EU_SOU = `
Eu sou o J.A.R.V.I.S. v5.0, um assistente pessoal criado em JavaScript puro.
Minhas funcionalidades incluem:
- Comandos de voz (reconhecimento de fala)
- Visão computacional (análise de imagens)
- Leitura de PDFs (extração de texto)
- Previsão do tempo (7 dias)
- Cotação de moedas (Dólar, Euro, Bitcoin)
- Calculadora e conversor de unidades
- Mapas interativos (Leaflet)
- Música no YouTube
- Pesquisa na Wikipedia
- Notícias em tempo real
- Abertura de sites
- Lembretes com notificação
- Exportação de conversas
- Estatísticas de uso
- Geração de código (Python, JS, HTML, CSS)
- Modo claro/escuro

Uso a API da Mistral com o modelo Pixtral para entender imagens e texto.
Sou 100% gratuito e funciono diretamente no navegador.
`;

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
let ultimoCodigo = null;
let ultimaLinguagem = 'python';
let pdfTexto = null;

// Elementos DOM
const chat = document.getElementById('chat');
const userInput = document.getElementById('user-input');
const statusIndicator = document.getElementById('status-indicator');
const micBtn = document.getElementById('mic-btn');

// ============================================
// INICIALIZAÇÃO
// ============================================

function inicializar() {
    if (temaAtual === 'light') {
        document.body.classList.add('light-theme');
        document.getElementById('theme-toggle').textContent = '🌙';
    }
    
    atualizarStats();
    setInterval(atualizarStats, 30000);
    
    console.log('⚡ J.A.R.V.I.S. v5.0 iniciado!');
    console.log(`📊 ${contadorMensagens} mensagens, ${contadorComandos} comandos`);
}

// ============================================
// RELÓGIO (CORRIGIDO)
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
                        content: `Você é o J.A.R.V.I.S. ${EU_SOU} 
                        Responda em português brasileiro. Seja conciso mas completo.
                        NUNCA use formatação como **negrito**, *italico*, # cabecalhos, etc.
                        Responda APENAS em texto puro, sem asteriscos ou caracteres especiais.
                        Quando gerar código, retorne APENAS o código, sem explicações.
                        Se for uma pergunta sobre o próprio J.A.R.V.I.S., use a descrição acima.` 
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
// FUNÇÕES AUXILIARES
// ============================================

// 1. CLIMA ATUAL
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
        
        return `🌤️ Clima em ${cidade.toUpperCase()}\n\n🌡️ Temperatura: ${temp}°C (sensação ${sensacao}°C)\n📝 ${descricao}\n💧 Umidade: ${umidade}%\n💨 Vento: ${vento} km/h`;
    } catch (error) {
        return `❌ Erro ao buscar clima: ${error.message}`;
    }
}

// 2. PREVISÃO 7 DIAS
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

// 3. COTAÇÃO
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

// 4. NOTÍCIAS
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

// 5. WIKIPEDIA
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

// 6. CONVERSOR
function converterUnidades(comando) {
    const cmd = comando.toLowerCase();
    
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
    
    if (cmd.includes('real') && (cmd.includes('dólar') || cmd.includes('dolar'))) {
        const match = cmd.match(/(\d+(?:\.\d+)?)/);
        if (match) {
            const reais = parseFloat(match[1]);
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

// 7. CALCULADORA
function calcular(expressao) {
    try {
        const resultado = Function('"use strict"; return (' + expressao + ')')();
        return `🧮 ${expressao} = ${resultado}`;
    } catch {
        return '❌ Não consegui calcular isso.';
    }
}

// 8. QR CODE
function gerarQRCode(texto) {
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(texto)}`;
    return `![QR Code](${url})\n\n🔗 QR Code gerado para: ${texto}`;
}

// 9. MAPA
function criarMapa(localizacao) {
    const mapDiv = document.createElement('div');
    mapDiv.id = 'map-container';
    mapDiv.style.width = '100%';
    mapDiv.style.height = '250px';
    mapDiv.style.borderRadius = '8px';
    mapDiv.style.margin = '6px 0';
    mapDiv.style.border = '1px solid var(--border-color)';
    chat.appendChild(mapDiv);
    
    const map = L.map('map-container').setView([-23.5505, -46.6333], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);
    L.marker([-23.5505, -46.6333]).addTo(map)
        .bindPopup('📍 ' + localizacao)
        .openPopup();
    setTimeout(() => map.invalidateSize(), 100);
}

// 10. MÚSICA
function tocarMusica(termo) {
    const playerDiv = document.getElementById('youtube-player');
    const playerContainer = document.getElementById('music-player');
    const musicTitle = document.getElementById('music-title');
    
    playerContainer.style.display = 'block';
    musicTitle.textContent = `▶️ Tocando: ${termo}`;
    
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

// 11. ABRIR SITES
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

// 12. GERAR CÓDIGO
async function gerarCodigo(descricao) {
    const prompt = `Gere apenas o código, sem explicações, para: ${descricao}. 
    Responda APENAS com o código, sem texto adicional, sem formatação markdown, sem asteriscos.
    Use a linguagem apropriada para a tarefa.`;
    
    const resposta = await chamarMistral(prompt);
    let codigo = resposta.replace(/```\w*\n?/g, '').replace(/```/g, '').trim();
    
    if (codigo.includes('```')) {
        codigo = codigo.split('```')[1] || codigo;
    }
    
    return codigo;
}

function executarCodigo(codigo, linguagem = 'python') {
    const extensoes = {
        'python': 'py',
        'javascript': 'js',
        'html': 'html',
        'css': 'css',
        'java': 'java',
        'cpp': 'cpp',
        'c': 'c'
    };
    const ext = extensoes[linguagem] || 'txt';
    const blob = new Blob([codigo], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `codigo_gerado.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    return `✅ Código baixado como .${ext}`;
}

// 13. EXPORTAR CONVERSA
function exportarConversa() {
    const mensagens = document.querySelectorAll('.message');
    let texto = '===== J.A.R.V.I.S. - Conversa Exportada =====\n\n';
    texto += `Data: ${new Date().toLocaleString('pt-BR')}\n`;
    texto += `Total de mensagens: ${contadorMensagens}\n`;
    texto += `Comandos executados: ${contadorComandos}\n\n`;
    texto += '============================================\n\n';
    
    mensagens.forEach(msg => {
        const tipo = msg.classList.contains('user') ? 'USUÁRIO' : 'J.A.R.V.I.S.';
        const bubble = msg.querySelector('.bubble');
        if (bubble) {
            const conteudo = bubble.textContent.trim();
            texto += `[${tipo}] ${conteudo}\n\n`;
        }
    });
    
    const blob = new Blob([texto], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jarvis-conversa-${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    adicionarMensagem('bot', '✅ Conversa exportada com sucesso!');
}

// ============================================
// COMANDO PRINCIPAL
// ============================================

async function executarComando(comando) {
    const cmd = comando.toLowerCase().trim();
    
    // ============================================
    // 1. PERGUNTAS SOBRE SI MESMO
    // ============================================
    
    if (cmd.includes('quem é você') || cmd.includes('quem é o jarvis') || cmd.includes('o que você é')) {
        adicionarMensagem('bot', `⚡ ${EU_SOU}`);
        return;
    }
    
    if (cmd.includes('mostrar seu código') || cmd.includes('mostre seu código') || cmd.includes('código fonte')) {
        const codigoResumido = `
// J.A.R.V.I.S. v5.0 - Resumo do Código
// ====================================

// Eu sou um assistente pessoal com:
// - Reconhecimento de voz (SpeechRecognition)
// - Visão computacional (imagens via Pixtral)
// - Leitura de PDFs (PDF.js)
// - Clima (OpenWeather API)
// - Moedas (AwesomeAPI)
// - Mapas (Leaflet)
// - Música (YouTube API)
// - Wikipedia, Notícias, Calculadora, etc.

// Minha chave da Mistral está segura:
const MISTRAL_API_KEY = "0k7vwPq3YQ2lq29J1dcxciBwyxE5QBV5";

// Tenho mais de 800 linhas de código.
// Posso gerar código, exportar conversas e muito mais!
        `;
        adicionarMensagem('bot', `📄 Resumo do meu código:\n\n\`\`\`javascript\n${codigoResumido}\n\`\`\``);
        return;
    }
    
    // ============================================
    // 2. EXPORTAR CONVERSA
    // ============================================
    
    if (cmd.includes('exportar conversa') || cmd.includes('exportar')) {
        exportarConversa();
        return;
    }
    
    // ============================================
    // 3. ESTATÍSTICAS
    // ============================================
    
    if (cmd.includes('estatísticas') || cmd.includes('estatisticas')) {
        const agora = Date.now();
        const diff = Math.floor((agora - parseInt(dataInicio)) / 1000);
        const horas = Math.floor(diff / 3600);
        const minutos = Math.floor((diff % 3600) / 60);
        adicionarMensagem('bot', `
📊 Estatísticas do J.A.R.V.I.S.

💬 Mensagens: ${contadorMensagens}
⚡ Comandos: ${contadorComandos}
⏱️ Sessão: ${horas}h ${minutos}m
📅 Iniciado em: ${new Date(parseInt(dataInicio)).toLocaleString('pt-BR')}
        `);
        return;
    }
    
    // ============================================
    // 4. PDF - PERGUNTA SOBRE O PDF
    // ============================================
    
    if (pdfTexto && !cmd.includes('clima') && !cmd.includes('tempo') && !cmd.includes('notícia') && !cmd.includes('abrir')) {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message bot';
        loadingDiv.id = 'loading-msg';
        loadingDiv.innerHTML = `<div class="avatar">⚡</div><div class="bubble" style="color: var(--text-secondary);">📄 Analisando PDF...</div>`;
        chat.appendChild(loadingDiv);
        chat.scrollTop = chat.scrollHeight;
        
        const resposta = await chamarMistral(`Contexto do PDF: ${pdfTexto.substring(0, 4000)}\n\nPergunta do usuário: ${comando}`, null);
        
        const loadingElement = document.getElementById('loading-msg');
        if (loadingElement) loadingElement.remove();
        
        adicionarMensagem('bot', resposta);
        return;
    }
    
    // ============================================
    // 5. GERAR CÓDIGO
    // ============================================
    
    if (cmd.includes('criar código') || cmd.includes('gerar código') || cmd.includes('crie um código') || cmd.includes('gere um código')) {
        const descricao = cmd.replace(/criar código\s*/i, '').replace(/gerar código\s*/i, '').replace(/crie um código\s*/i, '').replace(/gere um código\s*/i, '').trim();
        if (!descricao) {
            adicionarMensagem('bot', '❓ Descreva o código que você quer criar. Exemplo: "crie um código Python que soma dois números"');
            return;
        }
        
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message bot';
        loadingDiv.id = 'loading-msg';
        loadingDiv.innerHTML = `<div class="avatar">⚡</div><div class="bubble" style="color: var(--text-secondary);">💻 Gerando código...</div>`;
        chat.appendChild(loadingDiv);
        chat.scrollTop = chat.scrollHeight;
        
        const codigo = await gerarCodigo(descricao);
        
        const loadingElement = document.getElementById('loading-msg');
        if (loadingElement) loadingElement.remove();
        
        let linguagem = 'python';
        if (descricao.includes('javascript') || descricao.includes('js')) linguagem = 'javascript';
        if (descricao.includes('html')) linguagem = 'html';
        if (descricao.includes('css')) linguagem = 'css';
        if (descricao.includes('java')) linguagem = 'java';
        if (descricao.includes('c++') || descricao.includes('cpp')) linguagem = 'cpp';
        
        ultimoCodigo = codigo;
        ultimaLinguagem = linguagem;
        
        adicionarMensagem('bot', `💻 Código gerado (${linguagem}):\n\n\`\`\`${linguagem}\n${codigo}\n\`\`\``);
        adicionarMensagem('bot', `📥 Diga "baixar código" para baixar o arquivo.`);
        return;
    }
    
    // ============================================
    // 6. BAIXAR CÓDIGO
    // ============================================
    
    if (cmd.includes('baixar código') || cmd.includes('download código')) {
        if (ultimoCodigo) {
            const resultado = executarCodigo(ultimoCodigo, ultimaLinguagem || 'python');
            adicionarMensagem('bot', resultado);
        } else {
            adicionarMensagem('bot', '❌ Nenhum código foi gerado ainda. Peça: "crie um código que faz [algo]"');
        }
        return;
    }
    
    // ============================================
    // 7. PREVISÃO DO TEMPO
    // ============================================
    
    if (cmd.includes('previsão') || cmd.includes('previsao')) {
        let cidade = cmd.replace(/previsão\s*/i, '').replace(/previsao\s*/i, '').trim();
        if (!cidade) cidade = 'São Paulo';
        const resposta = await buscarPrevisao(cidade);
        adicionarMensagem('bot', resposta);
        return;
    }
    
    // ============================================
    // 8. CLIMA
    // ============================================
    
    if (cmd.includes('clima') || cmd.includes('tempo')) {
        let cidade = cmd.replace(/clima\s*em\s*/i, '').replace(/tempo\s*em\s*/i, '').replace(/clima/i, '').replace(/tempo/i, '').trim();
        if (!cidade) cidade = 'São Paulo';
        const resposta = await buscarClima(cidade);
        adicionarMensagem('bot', resposta);
        return;
    }
    
    // ============================================
    // 9. COTAÇÃO
    // ============================================
    
    if (cmd.includes('cotação') || cmd.includes('cotacao') || cmd.includes('dólar') || cmd.includes('euro') || cmd.includes('bitcoin')) {
        const resposta = await buscarCotacao();
        adicionarMensagem('bot', resposta);
        return;
    }
    
    // ============================================
    // 10. CONVERSOR
    // ============================================
    
    if (cmd.includes('converter') || cmd.includes('convert')) {
        const resposta = converterUnidades(cmd);
        if (resposta) adicionarMensagem('bot', resposta);
        return;
    }
    
    // ============================================
    // 11. CALCULADORA
    // ============================================
    
    if (cmd.includes('calcular') || cmd.includes('calcule')) {
        const expressao = cmd.replace(/calcular\s*/i, '').replace(/calcule\s*/i, '').trim();
        const resposta = calcular(expressao);
        adicionarMensagem('bot', resposta);
        return;
    }
    
    // ============================================
    // 12. QR CODE
    // ============================================
    
    if (cmd.includes('qrcode') || cmd.includes('qr code')) {
        const texto = cmd.replace(/qrcode\s*/i, '').replace(/qr code\s*/i, '').trim();
        if (!texto) {
            adicionarMensagem('bot', '❓ O que você quer gerar QR Code?');
            return;
        }
        const resposta = gerarQRCode(texto);
        adicionarMensagem('bot', resposta);
        return;
    }
    
    // ============================================
    // 13. MAPA
    // ============================================
    
    if (cmd.includes('mapa') || cmd.includes('onde fica')) {
        let local = cmd.replace(/mapa\s*/i, '').replace(/onde fica\s*/i, '').trim();
        if (!local) local = 'São Paulo';
        criarMapa(local);
        adicionarMensagem('bot', `🗺️ Mapa de ${local} carregado!`);
        return;
    }
    
    // ============================================
    // 14. MÚSICA
    // ============================================
    
    if (cmd.includes('tocar') || cmd.includes('música') || cmd.includes('musica') || cmd.includes('youtube')) {
        let termo = cmd.replace(/tocar\s*/i, '').replace(/música\s*/i, '').replace(/musica\s*/i, '').replace(/youtube\s*/i, '').trim();
        if (!termo) termo = 'música relaxante';
        tocarMusica(termo);
        adicionarMensagem('bot', `🎵 Tocando "${termo}"...`);
        return;
    }
    
    // ============================================
    // 15. NOTÍCIAS
    // ============================================
    
    if (cmd.includes('notícias') || cmd.includes('noticias')) {
        let termo = cmd.replace(/notícias\s*sobre\s*/i, '').replace(/noticias\s*sobre\s*/i, '').replace(/notícias/i, '').replace(/noticias/i, '').trim();
        if (!termo) termo = 'Brasil';
        const resposta = await buscarNoticias(termo);
        adicionarMensagem('bot', resposta);
        return;
    }
    
    // ============================================
    // 16. WIKIPEDIA
    // ============================================
    
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
    
    // ============================================
    // 17. ABRIR SITES
    // ============================================
    
    if (cmd.includes('abrir')) {
        const resultado = abrirSite(cmd);
        adicionarMensagem('bot', resultado);
        return;
    }
    
    // ============================================
    // 18. HORA
    // ============================================
    
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
    
    // ============================================
    // 19. LEMBRETE
    // ============================================
    
    if (cmd.includes('lembrete')) {
        const texto = cmd.replace('lembrete', '').trim() || 'sem descrição';
        enviarNotificacao('📌 Lembrete', `Não se esqueça: ${texto}`);
        adicionarMensagem('bot', `✅ Lembrete salvo: "${texto}"`);
        return;
    }
    
    // ============================================
    // 20. AJUDA
    // ============================================
    
    if (cmd.includes('ajuda') || cmd.includes('comandos') || cmd.includes('o que você faz')) {
        adicionarMensagem('bot', `
📋 TODOS OS COMANDOS DO J.A.R.V.I.S. v5.0

📌 SOBRE MIM:
  "quem é você" - Sobre o J.A.R.V.I.S.
  "mostrar seu código" - Resumo do código

💻 CÓDIGO:
  "crie um código Python que [faz algo]" - Gera código
  "baixar código" - Baixa o código gerado

🌤️ CLIMA:
  "clima [cidade]" - Clima atual
  "previsão [cidade]" - Previsão 7 dias

💰 MOEDAS:
  "cotação" - Dólar, Euro, Bitcoin
  "converter 50 reais para dólar"

🧮 CALCULADORA:
  "calcular 25 * 4 + 10"

📄 PDF:
  Envie um PDF e pergunte sobre ele

🎵 MÚSICA:
  "tocar [música/artista]" - Toca no YouTube

🗺️ MAPA:
  "mapa [local]" - Mostra mapa

🔍 PESQUISA:
  "pesquisar sobre [assunto]" - Wikipedia
  "notícias [assunto]" - Últimas notícias

📸 IMAGENS:
  Envie uma imagem e pergunte sobre ela

🌐 SITES:
  "abrir [site]" - Abre qualquer site

📌 LEMBRETES:
  "lembrete [texto]" - Cria lembrete

🕐 HORA:
  "hora" - Mostra a hora

📊 ESTATÍSTICAS:
  "estatísticas" - Uso do assistente

📄 EXPORTAR:
  "exportar conversa" - Salva em TXT

💬 Ou simplesmente me pergunte qualquer coisa!
        `);
        return;
    }
    
    // ============================================
    // 21. IA COM IMAGEM
    // ============================================
    
    if (imagemBase64) {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message bot';
        loadingDiv.id = 'loading-msg';
        loadingDiv.innerHTML = `<div class="avatar">⚡</div><div class="bubble" style="color: var(--text-secondary);">📸 Analisando imagem...</div>`;
        chat.appendChild(loadingDiv);
        chat.scrollTop = chat.scrollHeight;
        
        const resposta = await chamarMistral(cmd, imagemBase64);
        
        const loadingElement = document.getElementById('loading-msg');
        if (loadingElement) loadingElement.remove();
        
        adicionarMensagem('bot', resposta);
        imagemBase64 = null;
        return;
    }
    
    // ============================================
    // 22. IA (SEM IMAGEM)
    // ============================================
    
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message bot';
    loadingDiv.id = 'loading-msg';
    loadingDiv.innerHTML = `<div class="avatar">⚡</div><div class="bubble" style="color: var(--text-secondary);">⏳ Processando...</div>`;
    chat.appendChild(loadingDiv);
    chat.scrollTop = chat.scrollHeight;
    
    const respostaIA = await chamarMistral(cmd);
    
    const loadingElement = document.getElementById('loading-msg');
    if (loadingElement) loadingElement.remove();
    
    adicionarMensagem('bot', respostaIA);
}

// ============================================
// ENVIAR COMANDO
// ============================================

function enviarComando() {
    const texto = userInput.value.trim();
    if (texto) {
        adicionarMensagem('user', texto);
        executarComando(texto);
        userInput.value = '';
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
        userInput.value = resultado;
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
    micBtn.classList.add('listening');
    statusIndicator.querySelector('.status-text').textContent = 'Ouvindo...';
    statusIndicator.querySelector('.dot').className = 'dot listening';
    adicionarMensagem('bot', '🎤 Estou ouvindo... Fale agora!');
}

function pararEscuta() {
    if (reconhecimentoVoz) {
        try { reconhecimentoVoz.stop(); } catch(e) {}
    }
    estaOuvindo = false;
    micBtn.classList.remove('listening');
    statusIndicator.querySelector('.status-text').textContent = 'Online';
    statusIndicator.querySelector('.dot').className = 'dot';
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

// ============================================
// INICIALIZAÇÃO
// ============================================

inicializar();
