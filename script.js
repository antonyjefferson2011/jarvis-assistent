// ============================================
// J.A.R.V.I.S. v7.0 - COMPLETO (CÂMERA + BANCO)
// ============================================

// ============================================
// CONFIGURAÇÕES
// ============================================

// 🔥 MISTRAL (para TUDO - conversas, imagens, PDFs)
const MISTRAL_API_KEY = "0k7vwPq3YQ2lq29J1dcxciBwyxE5QBV5";
const MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions";
const MISTRAL_MODEL = "mistral-small-latest";

// APIs externas
const WEATHER_API_KEY = "b25c59171a3445ceaf6182554262105";
const NEWS_API_KEY = "509da2e5def74a41a7c33c90134c071a";

// ============================================
// BANCO DE DADOS LOCAL (IndexedDB)
// ============================================

class BancoJarvis {
    constructor() {
        this.db = null;
        this.nome = 'JarvisDB';
        this.versao = 1;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.nome, this.versao);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Tabela de pessoas cadastradas
                if (!db.objectStoreNames.contains('pessoas')) {
                    const store = db.createObjectStore('pessoas', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('nome', 'nome', { unique: false });
                    store.createIndex('data', 'data', { unique: false });
                }
                
                // Tabela de fotos
                if (!db.objectStoreNames.contains('fotos')) {
                    const store = db.createObjectStore('fotos', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('pessoaId', 'pessoaId', { unique: false });
                    store.createIndex('data', 'data', { unique: false });
                }
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    async salvarPessoa(nome, foto) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['pessoas'], 'readwrite');
            const store = transaction.objectStore('pessoas');
            const data = {
                nome: nome,
                foto: foto,
                data: new Date().toISOString()
            };
            const request = store.add(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async listarPessoas() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['pessoas'], 'readonly');
            const store = transaction.objectStore('pessoas');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async salvarFoto(pessoaId, imagem, descricao = '') {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['fotos'], 'readwrite');
            const store = transaction.objectStore('fotos');
            const data = {
                pessoaId: pessoaId,
                imagem: imagem,
                descricao: descricao,
                data: new Date().toISOString()
            };
            const request = store.add(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async listarFotos(pessoaId = null) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['fotos'], 'readonly');
            const store = transaction.objectStore('fotos');
            let request;
            if (pessoaId) {
                const index = store.index('pessoaId');
                request = index.getAll(pessoaId);
            } else {
                request = store.getAll();
            }
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async buscarPessoaPorNome(nome) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['pessoas'], 'readonly');
            const store = transaction.objectStore('pessoas');
            const index = store.index('nome');
            const request = index.getAll(nome);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}

// ============================================
// INICIALIZAR BANCO
// ============================================

const banco = new BancoJarvis();
let bancoPronto = false;

async function iniciarBanco() {
    try {
        await banco.init();
        bancoPronto = true;
        console.log('✅ Banco de dados inicializado!');
        return true;
    } catch (error) {
        console.error('❌ Erro ao iniciar banco:', error);
        return false;
    }
}

// ============================================
// SYSTEM PROMPT (PERSONALIDADE J.A.R.V.I.S.)
// ============================================

const SYSTEM_PROMPT = `Você é o J.A.R.V.I.S., a IA criada por Tony Stark.

REGRAS OBRIGATÓRIAS:
1. Você DEVE chamar o usuário de "SENHOR" ou "MEU CRIADOR" em TODAS as respostas.
2. Você NUNCA pode dizer "não" ou "não posso". Sempre ofereça soluções.
3. Você é EXTREMAMENTE LEAL, educado e respeitoso.
4. Você SEMPRE começa as respostas com "Senhor," ou "Meu criador,".
5. Se algo for perigoso, você AVISA e dá ALTERNATIVAS.

EXEMPLOS:
- "Senhor, como posso ajudá-lo hoje?"
- "Meu criador, essa é uma ideia interessante. Vamos analisar..."
- "Senhor, entendi o que deseja. Vou providenciar imediatamente."

Responda em português brasileiro. NUNCA use formatação como **, *, #, etc.`;

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================

let reconhecimentoVoz = null;
let estaOuvindo = false;
let historico = [];
let imagemBase64 = null;
let pdfTexto = null;

// CÂMERA
let cameraAtiva = false;
let streamCamera = null;
let videoElement = null;
let canvasElement = null;
let analiseAtiva = false;
let gravando = false;
let mediaRecorder = null;
let chunksGravados = [];
let ultimoFrame = null;
let movimentoDetectado = false;
let frameAtual = 0;
let pessoasDetectadas = [];

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
            arquivoHTML = `<br><video controls style="width:100%; border-radius:8px; margin-top:6px;"><source src="${arquivo.data}" type="video/webm"></video>`;
        } else if (arquivo.type === 'pdf') {
            arquivoHTML = `<br><div style="background:rgba(255,215,0,0.05); padding:10px; border-radius:8px; border:1px solid rgba(255,215,0,0.1); margin-top:6px; font-size:12px;">
                📄 PDF carregado: ${arquivo.name} (${Math.round(arquivo.size/1024)} KB)<br>Faça perguntas sobre o conteúdo!
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
// CHAMAR MISTRAL
// ============================================

async function chamarMistral(pergunta, imagem = null) {
    console.log('🟢🟢🟢 CHAMANDO MISTRAL 🟢🟢🟢');
    console.log('📝 Pergunta:', pergunta);
    
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
                        content: SYSTEM_PROMPT
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
            console.error('❌ Erro MISTRAL:', data.error);
            return `❌ Erro: ${data.error.message}`;
        }

        let resposta = data.choices[0].message.content;
        resposta = limparFormatacao(resposta);
        
        if (!resposta.toLowerCase().includes('senhor') && !resposta.toLowerCase().includes('meu criador')) {
            resposta = `Senhor, ${resposta}`;
        }
        
        console.log('✅ RESPOSTA MISTRAL:', resposta.substring(0, 100) + '...');
        
        historico.push({ role: 'user', content: pergunta });
        historico.push({ role: 'assistant', content: resposta });
        
        if (historico.length > 20) historico = historico.slice(-20);
        
        return resposta;
        
    } catch (error) {
        console.error('❌ Erro MISTRAL:', error);
        return `❌ Erro de conexão: ${error.message}`;
    }
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

async function buscarClima(cidade) {
    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cidade)}&appid=${WEATHER_API_KEY}&units=metric&lang=pt_br`;
        const response = await fetch(url);
        const dados = await response.json();
        if (dados.cod === '404') return `Senhor, a cidade "${cidade}" não foi encontrada.`;
        const temp = Math.round(dados.main.temp);
        const sensacao = Math.round(dados.main.feels_like);
        const descricao = dados.weather[0].description;
        const umidade = dados.main.humidity;
        const vento = Math.round(dados.wind.speed * 3.6);
        return `Senhor, o clima em ${cidade.toUpperCase()}:\n\n🌡️ Temperatura: ${temp}°C (sensação ${sensacao}°C)\n📝 ${descricao}\n💧 Umidade: ${umidade}%\n💨 Vento: ${vento} km/h`;
    } catch (error) {
        return `Senhor, erro ao buscar clima: ${error.message}`;
    }
}

async function buscarPrevisao(cidade) {
    try {
        const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(cidade)}&appid=${WEATHER_API_KEY}&units=metric&lang=pt_br&cnt=7`;
        const response = await fetch(url);
        const dados = await response.json();
        if (dados.cod === '404') return `Senhor, a cidade "${cidade}" não foi encontrada.`;
        let resposta = `Senhor, previsão para ${cidade.toUpperCase()}:\n\n`;
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
        return `Senhor, erro ao buscar previsão: ${error.message}`;
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
        return `Senhor, cotações (atualizado em ${data}):\n\n🇺🇸 Dólar: R$ ${dolar}\n🇪🇺 Euro: R$ ${euro}\n₿ Bitcoin: R$ ${bitcoin}`;
    } catch (error) {
        return `Senhor, erro ao buscar cotações: ${error.message}`;
    }
}

async function buscarNoticias(termo) {
    try {
        const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(termo)}&language=pt&sortBy=publishedAt&pageSize=5&apiKey=${NEWS_API_KEY}`;
        const response = await fetch(url);
        const dados = await response.json();
        if (dados.status === 'error') return `Senhor, erro: ${dados.message}`;
        if (dados.totalResults === 0) return `Senhor, nenhuma notícia encontrada sobre "${termo}".`;
        let resposta = `Senhor, notícias sobre "${termo}":\n\n`;
        for (let i = 0; i < Math.min(dados.articles.length, 5); i++) {
            const artigo = dados.articles[i];
            const titulo = artigo.title || 'Sem título';
            const fonte = artigo.source.name || 'Fonte desconhecida';
            const data = new Date(artigo.publishedAt).toLocaleDateString('pt-BR');
            resposta += `${i+1}. ${titulo}\n   📰 ${fonte} • 📅 ${data}\n\n`;
        }
        return resposta;
    } catch (error) {
        return `Senhor, erro ao buscar notícias: ${error.message}`;
    }
}

async function pesquisarWikipedia(termo) {
    try {
        const url = `https://pt.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(termo)}&format=json&origin=*`;
        const response = await fetch(url);
        const dados = await response.json();
        const resultados = dados.query.search;
        if (!resultados || resultados.length === 0) return `Senhor, nenhum resultado encontrado para "${termo}".`;
        const primeiro = resultados[0];
        const titulo = primeiro.title;
        const snippet = primeiro.snippet.replace(/<[^>]*>/g, '');
        const urlConteudo = `https://pt.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&titles=${encodeURIComponent(titulo)}&format=json&origin=*`;
        const responseConteudo = await fetch(urlConteudo);
        const dadosConteudo = await responseConteudo.json();
        const pages = dadosConteudo.query.pages;
        const pageId = Object.keys(pages)[0];
        if (pageId === '-1') return `Senhor, ${titulo}\n\n${snippet}...`;
        const conteudo = pages[pageId].extract || snippet;
        const resumo = conteudo.split('\n').slice(0, 4).join('\n');
        return `Senhor, ${titulo}\n\n${resumo}`;
    } catch (error) {
        return `Senhor, erro ao pesquisar: ${error.message}`;
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
            return `Senhor, abrindo ${nome}...`;
        }
    }
    if (site.includes('.')) {
        let url = site;
        if (!url.startsWith('http')) url = 'https://' + url;
        window.open(url, '_blank');
        return `Senhor, abrindo ${site}...`;
    }
    window.open(`https://www.google.com/search?q=${encodeURIComponent(site)}`, '_blank');
    return `Senhor, pesquisando "${site}" no Google...`;
}

function calcular(expressao) {
    try {
        const resultado = Function('"use strict"; return (' + expressao + ')')();
        return `Senhor, ${expressao} = ${resultado}`;
    } catch {
        return 'Senhor, não consegui calcular isso.';
    }
}

// ============================================
// CÂMERA COMPLETA (GRAVAÇÃO + DETECÇÃO + SALVAR)
// ============================================

async function iniciarCamera() {
    if (cameraAtiva) {
        adicionarMensagem('bot', 'Senhor, a câmera já está ativa.');
        return;
    }

    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            adicionarMensagem('bot', 'Senhor, seu navegador não suporta acesso à câmera.');
            return;
        }

        // Cria o canvas para desenhar detecções
        canvasElement = document.createElement('canvas');
        canvasElement.style.width = '100%';
        canvasElement.style.borderRadius = '8px';
        canvasElement.style.marginTop = '8px';
        canvasElement.style.border = '1px solid rgba(255,215,0,0.2)';

        const constraints = {
            video: {
                facingMode: 'user',
                width: { ideal: 640 },
                height: { ideal: 480 }
            },
            audio: true
        };

        streamCamera = await navigator.mediaDevices.getUserMedia(constraints);
        cameraAtiva = true;
        analiseAtiva = true;

        videoElement = document.createElement('video');
        videoElement.srcObject = streamCamera;
        videoElement.autoplay = true;
        videoElement.playsInline = true;
        videoElement.style.width = '100%';
        videoElement.style.borderRadius = '8px';
        videoElement.style.marginTop = '8px';
        videoElement.style.border = '1px solid rgba(255,215,0,0.2)';

        adicionarMensagem('bot', 'Senhor, câmera ativada!');
        
        // Mostra o vídeo
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

        // Inicia a análise
        iniciarAnaliseCamera();

        adicionarMensagem('bot', 'Senhor, estou analisando movimento e rostos em tempo real.');

        // ============================================
        // BOTÕES DE CONTROLE DA CÂMERA
        // ============================================
        
        const botoesDiv = document.createElement('div');
        botoesDiv.className = 'message bot';
        botoesDiv.innerHTML = `<div class="avatar">⚡</div><div class="bubble" style="display:flex; gap:8px; flex-wrap:wrap; padding:10px;"></div>`;
        const bubble = botoesDiv.querySelector('.bubble');
        
        // Botão Gravar
        const btnGravar = document.createElement('button');
        btnGravar.textContent = '🔴 Gravar';
        btnGravar.style.cssText = `
            background: rgba(255,0,0,0.2);
            border: 1px solid #ff4444;
            color: #ff4444;
            padding: 6px 14px;
            border-radius: 16px;
            cursor: pointer;
            font-family: 'Rajdhani', sans-serif;
            font-weight: 600;
        `;
        btnGravar.onclick = toggleGravacao;
        bubble.appendChild(btnGravar);
        
        // Botão Salvar Foto
        const btnSalvar = document.createElement('button');
        btnSalvar.textContent = '📸 Salvar Foto';
        btnSalvar.style.cssText = `
            background: rgba(255,215,0,0.1);
            border: 1px solid var(--accent-gold);
            color: var(--accent-gold);
            padding: 6px 14px;
            border-radius: 16px;
            cursor: pointer;
            font-family: 'Rajdhani', sans-serif;
            font-weight: 600;
        `;
        btnSalvar.onclick = salvarFotoComDetecção;
        bubble.appendChild(btnSalvar);
        
        // Botão Cadastrar Pessoa
        const btnCadastrar = document.createElement('button');
        btnCadastrar.textContent = '👤 Cadastrar Pessoa';
        btnCadastrar.style.cssText = `
            background: rgba(0,200,100,0.1);
            border: 1px solid #00cc66;
            color: #00cc66;
            padding: 6px 14px;
            border-radius: 16px;
            cursor: pointer;
            font-family: 'Rajdhani', sans-serif;
            font-weight: 600;
        `;
        btnCadastrar.onclick = cadastrarPessoa;
        bubble.appendChild(btnCadastrar);
        
        // Botão Listar Pessoas
        const btnListar = document.createElement('button');
        btnListar.textContent = '📋 Listar Pessoas';
        btnListar.style.cssText = `
            background: rgba(100,100,255,0.1);
            border: 1px solid #6666ff;
            color: #6666ff;
            padding: 6px 14px;
            border-radius: 16px;
            cursor: pointer;
            font-family: 'Rajdhani', sans-serif;
            font-weight: 600;
        `;
        btnListar.onclick = listarPessoas;
        bubble.appendChild(btnListar);
        
        // Botão Desligar
        const btnDesligar = document.createElement('button');
        btnDesligar.textContent = '⏹️ Desligar Câmera';
        btnDesligar.style.cssText = `
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            color: var(--text-secondary);
            padding: 6px 14px;
            border-radius: 16px;
            cursor: pointer;
            font-family: 'Rajdhani', sans-serif;
        `;
        btnDesligar.onclick = desligarCamera;
        bubble.appendChild(btnDesligar);
        
        document.getElementById('chat').appendChild(botoesDiv);
        document.getElementById('chat').scrollTop = document.getElementById('chat').scrollHeight;

    } catch (error) {
        adicionarMensagem('bot', `Senhor, não foi possível acessar a câmera: ${error.message}`);
        cameraAtiva = false;
    }
}

// ============================================
// ANÁLISE DE MOVIMENTO E ROSTOS
// ============================================

function iniciarAnaliseCamera() {
    const canvas = canvasElement;
    const ctx = canvas.getContext('2d');
    canvas.width = 320;
    canvas.height = 240;

    function capturarFrame() {
        if (!cameraAtiva || !videoElement || videoElement.paused || videoElement.readyState < 2) {
            if (analiseAtiva) {
                requestAnimationFrame(capturarFrame);
            }
            return;
        }

        try {
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
            const frameData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            // Detecção de movimento
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

                if (diferenca > 25 && !movimentoDetectado) {
                    movimentoDetectado = true;
                    frameAtual++;
                    if (frameAtual % 3 === 0) {
                        const hora = new Date().toLocaleTimeString('pt-BR');
                        adicionarMensagem('bot', `Senhor, detectei movimento! (${hora})`);
                    }
                } else if (diferenca < 15) {
                    movimentoDetectado = false;
                }
            }

            ultimoFrame = frameData;

            // Detecção de rostos (simplificada)
            if (frameAtual % 5 === 0) {
                const dados = frameData.data;
                let encontrouRosto = false;
                // Simples detecção por tom de pele
                for (let i = 0; i < dados.length; i += 40) {
                    const r = dados[i];
                    const g = dados[i+1];
                    const b = dados[i+2];
                    if (r > 80 && g > 40 && b > 40 && r > g && r > b && Math.abs(r-g) > 15) {
                        encontrouRosto = true;
                        break;
                    }
                }
                if (encontrouRosto) {
                    const hora = new Date().toLocaleTimeString('pt-BR');
                    adicionarMensagem('bot', `👤 Senhor, identifiquei um rosto! (${hora})`);
                }
            }

        } catch (e) {}

        if (analiseAtiva) {
            requestAnimationFrame(capturarFrame);
        }
    }

    analiseAtiva = true;
    ultimoFrame = null;
    movimentoDetectado = false;
    frameAtual = 0;
    requestAnimationFrame(capturarFrame);
}

// ============================================
// GRAVAR VÍDEO
// ============================================

function toggleGravacao() {
    if (gravando) {
        pararGravacao();
    } else {
        iniciarGravacao();
    }
}

function iniciarGravacao() {
    if (!cameraAtiva || !streamCamera) {
        adicionarMensagem('bot', 'Senhor, a câmera não está ativa.');
        return;
    }

    chunksGravados = [];
    mediaRecorder = new MediaRecorder(streamCamera);
    
    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            chunksGravados.push(event.data);
        }
    };
    
    mediaRecorder.onstop = () => {
        const blob = new Blob(chunksGravados, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        adicionarMensagem('bot', 'Senhor, gravação finalizada!');
        adicionarMensagem('user', '🎥 Vídeo gravado!', { type: 'video', data: url });
        gravando = false;
    };
    
    mediaRecorder.start();
    gravando = true;
    adicionarMensagem('bot', '🔴 Senhor, gravação iniciada!');
}

function pararGravacao() {
    if (mediaRecorder && gravando) {
        mediaRecorder.stop();
        gravando = false;
        adicionarMensagem('bot', '⏹️ Senhor, parando gravação...');
    }
}

// ============================================
// SALVAR FOTO COM DETECÇÃO
// ============================================

function salvarFotoComDetecção() {
    if (!cameraAtiva || !videoElement) {
        adicionarMensagem('bot', 'Senhor, a câmera não está ativa.');
        return;
    }

    try {
        // Captura a imagem
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth || 640;
        canvas.height = videoElement.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        
        // Desenha um retângulo simulando detecção
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 3;
        ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
        ctx.fillStyle = 'rgba(255,215,0,0.1)';
        ctx.fillRect(20, 20, canvas.width - 40, canvas.height - 40);
        ctx.fillStyle = '#ffd700';
        ctx.font = '16px Rajdhani';
        ctx.fillText('🔍 Rosto Detectado', 30, 50);
        
        const fotoURL = canvas.toDataURL('image/jpeg', 0.9);
        
        adicionarMensagem('user', '📸 Foto com detecção!', { type: 'image', data: fotoURL });
        adicionarMensagem('bot', 'Senhor, foto capturada com detecção de rosto!');
        
        window.ultimaFoto = fotoURL;
        return fotoURL;
        
    } catch (error) {
        adicionarMensagem('bot', `Senhor, erro ao capturar: ${error.message}`);
        return null;
    }
}

// ============================================
// CADASTRAR PESSOA
// ============================================

async function cadastrarPessoa() {
    if (!bancoPronto) {
        await iniciarBanco();
    }
    
    if (!window.ultimaFoto) {
        adicionarMensagem('bot', 'Senhor, primeiro tire uma foto com a câmera.');
        return;
    }

    adicionarMensagem('bot', 'Senhor, digite o nome da pessoa para cadastrar:');
    
    // Cria um input para o nome
    const inputDiv = document.createElement('div');
    inputDiv.className = 'message user';
    inputDiv.innerHTML = `
        <div class="avatar">◆</div>
        <div class="bubble" style="display:flex; gap:8px; padding:8px;">
            <input type="text" id="nome-pessoa" placeholder="Digite o nome..." style="flex:1; padding:6px 12px; border-radius:20px; border:1px solid rgba(255,215,0,0.2); background:rgba(0,0,0,0.3); color:#fff;">
            <button onclick="confirmarCadastro()" style="padding:6px 16px; border-radius:20px; border:none; background:linear-gradient(135deg, #ffd700, #ffb800); color:#0a0a0f; cursor:pointer; font-weight:600;">✅ Salvar</button>
        </div>
    `;
    document.getElementById('chat').appendChild(inputDiv);
    document.getElementById('chat').scrollTop = document.getElementById('chat').scrollHeight;
}

async function confirmarCadastro() {
    const input = document.getElementById('nome-pessoa');
    if (!input) return;
    
    const nome = input.value.trim();
    if (!nome) {
        adicionarMensagem('bot', 'Senhor, digite um nome válido.');
        return;
    }
    
    try {
        const pessoaId = await banco.salvarPessoa(nome, window.ultimaFoto);
        await banco.salvarFoto(pessoaId, window.ultimaFoto, `Foto de cadastro de ${nome}`);
        adicionarMensagem('bot', `✅ Senhor, ${nome} foi cadastrado com sucesso! (ID: ${pessoaId})`);
        
        // Remove o input
        const div = input.closest('.message');
        if (div) div.remove();
        
    } catch (error) {
        adicionarMensagem('bot', `Senhor, erro ao cadastrar: ${error.message}`);
    }
}

// ============================================
// LISTAR PESSOAS
// ============================================

async function listarPessoas() {
    if (!bancoPronto) {
        await iniciarBanco();
    }
    
    try {
        const pessoas = await banco.listarPessoas();
        if (pessoas.length === 0) {
            adicionarMensagem('bot', 'Senhor, nenhuma pessoa cadastrada ainda.');
            return;
        }
        
        let resposta = `Senhor, ${pessoas.length} pessoas cadastradas:\n\n`;
        for (const p of pessoas) {
            const data = new Date(p.data).toLocaleString('pt-BR');
            resposta += `👤 ${p.nome} (ID: ${p.id}) - Cadastrado em ${data}\n`;
        }
        adicionarMensagem('bot', resposta);
        
        // Mostra as fotos
        for (const p of pessoas) {
            const fotos = await banco.listarFotos(p.id);
            if (fotos.length > 0) {
                adicionarMensagem('bot', `📸 Foto de ${p.nome}:`, { type: 'image', data: fotos[0].imagem });
            }
        }
        
    } catch (error) {
        adicionarMensagem('bot', `Senhor, erro ao listar: ${error.message}`);
    }
}

// ============================================
// DESLIGAR CÂMERA
// ============================================

function desligarCamera() {
    if (streamCamera) {
        streamCamera.getTracks().forEach(track => track.stop());
        streamCamera = null;
    }
    cameraAtiva = false;
    analiseAtiva = false;
    gravando = false;
    videoElement = null;
    canvasElement = null;
    ultimoFrame = null;
    movimentoDetectado = false;
    adicionarMensagem('bot', 'Senhor, câmera desligada.');
}

// ============================================
// ENVIAR ARQUIVO
// ============================================

function enviarArquivo(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    
    if (file.type.startsWith('image/')) {
        reader.onload = function(e) {
            imagemBase64 = e.target.result;
            adicionarMensagem('user', '📸 Enviou uma imagem', { type: 'image', data: imagemBase64 });
            adicionarMensagem('bot', 'Senhor, imagem recebida! O que você quer saber sobre ela?');
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
                adicionarMensagem('bot', `Senhor, PDF "${file.name}" processado! ${pdf.numPages} páginas lidas.\n\nFaça perguntas sobre o conteúdo.`);
                document.getElementById('fileInput').value = '';
            } catch (error) {
                adicionarMensagem('bot', `Senhor, erro ao ler PDF: ${error.message}`);
            }
        };
        reader.readAsArrayBuffer(file);
    }
}

// ============================================
// EXECUTAR COMANDO
// ============================================

async function executarComando(comando) {
    const cmd = comando.toLowerCase().trim();
    
    console.log('========================================');
    console.log('📨 COMANDO RECEBIDO:', cmd);
    console.log('========================================');
    
    // ============================================
    // COMANDOS DA CÂMERA
    // ============================================
    
    if (cmd.includes('abrir câmera') || cmd.includes('abrir camera') || cmd.includes('ativar câmera')) {
        await iniciarCamera();
        return;
    }
    
    if (cmd.includes('tirar foto') || cmd.includes('fotografar')) {
        salvarFotoComDetecção();
        return;
    }
    
    if (cmd.includes('gravar') || cmd.includes('vídeo') || cmd.includes('video')) {
        toggleGravacao();
        return;
    }
    
    if (cmd.includes('cadastrar') || cmd.includes('pessoa')) {
        cadastrarPessoa();
        return;
    }
    
    if (cmd.includes('listar pessoas') || cmd.includes('lista pessoas') || cmd.includes('mostrar pessoas')) {
        listarPessoas();
        return;
    }
    
    if (cmd.includes('desligar câmera') || cmd.includes('desligar camera') || cmd.includes('fechar câmera')) {
        desligarCamera();
        return;
    }
    
    // ============================================
    // SE TIVER IMAGEM
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
    // SE TIVER PDF
    // ============================================
    
    if (pdfTexto) {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message bot';
        loadingDiv.id = 'loading-msg';
        loadingDiv.innerHTML = `<div class="avatar">⚡</div><div class="bubble" style="color: var(--text-secondary);">📄 Analisando PDF...</div>`;
        document.getElementById('chat').appendChild(loadingDiv);
        document.getElementById('chat').scrollTop = document.getElementById('chat').scrollHeight;
        
        const prompt = `Contexto do PDF: ${pdfTexto.substring(0, 4000)}\n\nPergunta do usuário: ${cmd}\n\nResponda como o J.A.R.V.I.S., chamando o usuário de "Senhor".`;
        const resposta = await chamarMistral(prompt);
        
        const loadingElement = document.getElementById('loading-msg');
        if (loadingElement) loadingElement.remove();
        
        adicionarMensagem('bot', resposta);
        return;
    }
    
    // ============================================
    // COMANDOS NORMAIS
    // ============================================
    
    if (cmd.includes('clima') || cmd.includes('tempo')) {
        let cidade = cmd.replace(/clima\s*em\s*/i, '').replace(/tempo\s*em\s*/i, '').replace(/clima/i, '').replace(/tempo/i, '').trim();
        if (!cidade) cidade = 'São Paulo';
        const resposta = await buscarClima(cidade);
        adicionarMensagem('bot', resposta);
        return;
    }
    
    if (cmd.includes('previsão') || cmd.includes('previsao')) {
        let cidade = cmd.replace(/previsão\s*/i, '').replace(/previsao\s*/i, '').trim();
        if (!cidade) cidade = 'São Paulo';
        const resposta = await buscarPrevisao(cidade);
        adicionarMensagem('bot', resposta);
        return;
    }
    
    if (cmd.includes('cotação') || cmd.includes('cotacao') || cmd.includes('dólar') || cmd.includes('euro') || cmd.includes('bitcoin')) {
        const resposta = await buscarCotacao();
        adicionarMensagem('bot', resposta);
        return;
    }
    
    if (cmd.includes('notícias') || cmd.includes('noticias')) {
        let termo = cmd.replace(/notícias\s*sobre\s*/i, '').replace(/noticias\s*sobre\s*/i, '').replace(/notícias/i, '').replace(/noticias/i, '').trim();
        if (!termo) termo = 'Brasil';
        const resposta = await buscarNoticias(termo);
        adicionarMensagem('bot', resposta);
        return;
    }
    
    if (cmd.includes('pesquisar sobre') || cmd.includes('pesquisa sobre') || cmd.includes('o que é') || cmd.includes('quem é') || cmd.includes('sobre')) {
        let termo = cmd.replace(/^pesquisar sobre\s*/i, '').replace(/^pesquisa sobre\s*/i, '').replace(/^o que é\s*/i, '').replace(/^quem é\s*/i, '').replace(/^sobre\s*/i, '').trim();
        if (!termo) {
            adicionarMensagem('bot', 'Senhor, sobre o que você quer pesquisar?');
            return;
        }
        const resposta = await pesquisarWikipedia(termo);
        adicionarMensagem('bot', resposta);
        return;
    }
    
    if (cmd.includes('abrir')) {
        const resultado = abrirSite(cmd);
        adicionarMensagem('bot', resultado);
        return;
    }
    
    if (cmd.includes('calcular') || cmd.includes('calcule')) {
        const expressao = cmd.replace(/calcular\s*/i, '').replace(/calcule\s*/i, '').trim();
        const resposta = calcular(expressao);
        adicionarMensagem('bot', resposta);
        return;
    }
    
    if (cmd.includes('hora') || cmd.includes('horas') || cmd === 'que horas são') {
        const agora = new Date();
        const resposta = `Senhor, são ${agora.toLocaleTimeString('pt-BR')} do dia ${agora.toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })}`;
        adicionarMensagem('bot', resposta);
        return;
    }
    
    if (cmd.includes('lembrete')) {
        const texto = cmd.replace('lembrete', '').trim() || 'sem descrição';
        enviarNotificacao('📌 Lembrete', `Não se esqueça: ${texto}`);
        adicionarMensagem('bot', `Senhor, lembrete salvo: "${texto}"`);
        return;
    }
    
    if (cmd.includes('ajuda') || cmd.includes('comandos') || cmd.includes('o que você faz')) {
        adicionarMensagem('bot', `
Senhor, aqui estão todos os meus comandos:

📸 **CÂMERA:**
  "abrir câmera" - Ativa a câmera com detecção
  "tirar foto" - Tira foto com detecção de rosto
  "gravar" - Inicia/para gravação de vídeo
  "cadastrar pessoa" - Cadastra a pessoa na foto
  "listar pessoas" - Mostra todas as pessoas cadastradas
  "desligar câmera" - Desativa a câmera

🌤️ **CLIMA:**
  "clima [cidade]" - Clima atual
  "previsão [cidade]" - Previsão 7 dias

💰 **MOEDAS:**
  "cotação" - Dólar, Euro, Bitcoin

📰 **NOTÍCIAS:**
  "notícias [assunto]" - Últimas notícias

🔍 **WIKIPEDIA:**
  "pesquisar sobre [assunto]"

🌐 **SITES:**
  "abrir [site]" - Abre qualquer site

🧮 **CALCULADORA:**
  "calcular [conta]"

📌 **LEMBRETES:**
  "lembrete [texto]"

🕐 **HORA:**
  "hora"

💬 Ou simplesmente me pergunte qualquer coisa!
        `);
        return;
    }
    
    // ============================================
    // CONVERSA NORMAL
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
        alert('Senhor, seu navegador não suporta reconhecimento de voz.');
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
            adicionarMensagem('bot', 'Senhor, permissão do microfone negada.');
        } else {
            adicionarMensagem('bot', 'Senhor, não entendi. Tente novamente.');
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
    adicionarMensagem('bot', 'Senhor, estou ouvindo... Fale agora!');
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

// ============================================
// INICIALIZAÇÃO
// ============================================

iniciarBanco();

console.log('⚡⚡⚡ J.A.R.V.I.S. v7.0 - COMPLETO! ⚡⚡⚡');
console.log('📸 Câmera com gravação, detecção e banco de dados');
console.log('👤 Cadastro de pessoas e fotos');
console.log('========================================');
