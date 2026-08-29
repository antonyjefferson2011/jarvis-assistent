// ============================================
// J.A.R.V.I.S. - Assistente Avançado
// ============================================

// ============================================
// CONFIGURAÇÕES
// ============================================

// Mistral AI
const MISTRAL_API_KEY = "0k7vwPq3YQ2lq29J1dcxciBwyxE5QBV5";
const MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions";
const MISTRAL_MODEL = "mistral-small-latest";

// APIs Externas
const WEATHER_API_KEY = "b25c59171a3445ceaf6182554262105";
const NEWS_API_KEY = "509da2e5def74a41a7c33c90134c071a";

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================

let reconhecimentoVoz = null;
let estaOuvindo = false;
let historico = [];

// Elementos DOM
const chat = document.getElementById('chat');
const userInput = document.getElementById('user-input');
const statusIndicator = document.getElementById('status-indicator');
const micBtn = document.getElementById('mic-btn');

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

function adicionarMensagem(tipo, texto) {
    const div = document.createElement('div');
    div.className = `message ${tipo}`;
    
    let textoFormatado = texto;
    if (texto.includes('```')) {
        textoFormatado = texto.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
            return `<pre><code>${code.trim()}</code></pre>`;
        });
    }
    
    div.innerHTML = `
        <div class="avatar">${tipo === 'bot' ? '⚡' : '◆'}</div>
        <div class="bubble">${textoFormatado.replace(/\n/g, '<br>')}</div>
    `;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
}

// ============================================
// 1. CLIMA EM TEMPO REAL
// ============================================

async function buscarClima(cidade) {
    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cidade)}&appid=${WEATHER_API_KEY}&units=metric&lang=pt_br`;
        const response = await fetch(url);
        const dados = await response.json();
        
        if (dados.cod === '404') {
            return `❌ Cidade "${cidade}" não encontrada.`;
        }
        
        const temp = Math.round(dados.main.temp);
        const sensacao = Math.round(dados.main.feels_like);
        const descricao = dados.weather[0].description;
        const umidade = dados.main.humidity;
        const vento = Math.round(dados.wind.speed * 3.6); // m/s para km/h
        const icone = dados.weather[0].icon;
        
        return `
🌤️ **Clima em ${cidade.toUpperCase()}**

🌡️ Temperatura: ${temp}°C (sensação ${sensacao}°C)
📝 ${descricao}
💧 Umidade: ${umidade}%
💨 Vento: ${vento} km/h

🔄 Atualizado em: ${new Date().toLocaleTimeString('pt-BR')}
        `;
    } catch (error) {
        return `❌ Erro ao buscar clima: ${error.message}`;
    }
}

// ============================================
// 2. NOTÍCIAS EM TEMPO REAL
// ============================================

async function buscarNoticias(termo) {
    try {
        const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(termo)}&language=pt&sortBy=publishedAt&pageSize=5&apiKey=${NEWS_API_KEY}`;
        const response = await fetch(url);
        const dados = await response.json();
        
        if (dados.status === 'error') {
            return `❌ Erro: ${dados.message}`;
        }
        
        if (dados.totalResults === 0) {
            return `📰 Nenhuma notícia encontrada sobre "${termo}".`;
        }
        
        let resposta = `📰 **Notícias sobre "${termo}"**\n\n`;
        for (let i = 0; i < Math.min(dados.articles.length, 5); i++) {
            const artigo = dados.articles[i];
            const titulo = artigo.title || 'Sem título';
            const fonte = artigo.source.name || 'Fonte desconhecida';
            const data = new Date(artigo.publishedAt).toLocaleDateString('pt-BR');
            const url = artigo.url || '#';
            
            resposta += `${i+1}. **${titulo}**\n`;
            resposta += `   📰 ${fonte} • 📅 ${data}\n`;
            resposta += `   🔗 [Leia mais](${url})\n\n`;
        }
        
        return resposta;
    } catch (error) {
        return `❌ Erro ao buscar notícias: ${error.message}`;
    }
}

// ============================================
// 3. PESQUISA NA WIKIPEDIA
// ============================================

async function pesquisarWikipedia(termo) {
    try {
        // Busca artigos na Wikipedia
        const url = `https://pt.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(termo)}&format=json&origin=*`;
        const response = await fetch(url);
        const dados = await response.json();
        
        const resultados = dados.query.search;
        if (!resultados || resultados.length === 0) {
            return `🔍 Nenhum resultado encontrado para "${termo}" na Wikipedia.`;
        }
        
        const primeiro = resultados[0];
        const titulo = primeiro.title;
        const snippet = primeiro.snippet.replace(/<[^>]*>/g, '');
        
        // Busca o conteúdo completo
        const urlConteudo = `https://pt.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&titles=${encodeURIComponent(titulo)}&format=json&origin=*`;
        const responseConteudo = await fetch(urlConteudo);
        const dadosConteudo = await responseConteudo.json();
        
        const pages = dadosConteudo.query.pages;
        const pageId = Object.keys(pages)[0];
        if (pageId === '-1') {
            return `📄 **${titulo}**\n\n${snippet}...\n\n[Leia mais](https://pt.wikipedia.org/wiki/${encodeURIComponent(titulo)})`;
        }
        
        const conteudo = pages[pageId].extract || snippet;
        const resumo = conteudo.split('\n').slice(0, 4).join('\n');
        
        return `📄 **${titulo}**\n\n${resumo}\n\n🔗 [Leia mais na Wikipedia](https://pt.wikipedia.org/wiki/${encodeURIComponent(titulo)})`;
        
    } catch (error) {
        return `❌ Erro ao pesquisar: ${error.message}`;
    }
}

// ============================================
// 4. ABRIR SITES
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
        'whatsapp': 'https://web.whatsapp.com',
        'telegram': 'https://web.telegram.org',
        'discord': 'https://discord.com',
        'twitch': 'https://twitch.tv',
        'mercadolivre': 'https://mercadolivre.com.br',
        'magazineluiza': 'https://magazineluiza.com.br',
        'americanas': 'https://americanas.com',
        'ifood': 'https://ifood.com.br',
        'uber': 'https://uber.com'
    };

    for (let [nome, url] of Object.entries(sites)) {
        if (site.includes(nome)) {
            window.open(url, '_blank');
            return `✅ Abrindo ${nome}...`;
        }
    }

    if (site.includes('.')) {
        let url = site;
        if (!url.startsWith('http')) {
            url = 'https://' + url;
        }
        window.open(url, '_blank');
        return `✅ Abrindo ${site}...`;
    }

    window.open(`https://www.google.com/search?q=${encodeURIComponent(site)}`, '_blank');
    return `🔍 Pesquisando "${site}" no Google...`;
}

// ============================================
// LIMPAR FORMATACAO DA IA (remove **, __, etc)
// ============================================

function limparFormatacao(texto) {
    // Remove **negrito**
    texto = texto.replace(/\*\*(.*?)\*\*/g, '$1');
    // Remove __italico__
    texto = texto.replace(/__(.*?)__/g, '$1');
    // Remove *italico*
    texto = texto.replace(/\*(.*?)\*/g, '$1');
    // Remove `codigo`
    texto = texto.replace(/`(.*?)`/g, '$1');
    // Remove # cabecalhos
    texto = texto.replace(/^#+\s*/gm, '');
    // Remove links [texto](url)
    texto = texto.replace(/\[(.*?)\]\(.*?\)/g, '$1');
    return texto;
}

// ============================================
// 5. CHAMAR MISTRAL IA
// ============================================

async function chamarMistral(pergunta) {
    try {
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
                        content: `Você é o J.A.R.V.I.S., um assistente pessoal extremamente inteligente e útil. 
                        Responda em português brasileiro. Seja conciso mas completo. 
                        NÃO use formatação como **negrito**, *italico*, __sublinhado__ ou # cabeçalhos.
                        Responda apenas em texto puro, sem asteriscos ou caracteres especiais de formatação.` 
                    },
                    ...historico.slice(-5),
                    { role: 'user', content: pergunta }
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
        
        // 🔥 LIMPA A FORMATAÇÃO ANTES DE SALVAR
        resposta = limparFormatacao(resposta);
        
        historico.push({ role: 'user', content: pergunta });
        historico.push({ role: 'assistant', content: resposta });
        
        if (historico.length > 20) {
            historico = historico.slice(-20);
        }
        
        return resposta;
        
    } catch (error) {
        return `❌ Erro de conexão: ${error.message}`;
    }
}

// ============================================
// 6. EXECUTAR COMANDO (PRINCIPAL)
// ============================================

async function executarComando(comando) {
    const cmd = comando.toLowerCase().trim();
    adicionarMensagem('user', cmd);
    
    // ============================================
    // COMANDO: CLIMA
    // ============================================
    
    if (cmd.includes('clima') || cmd.includes('tempo')) {
        let cidade = cmd.replace(/clima\s*em\s*/i, '').replace(/tempo\s*em\s*/i, '').replace(/clima/i, '').replace(/tempo/i, '').trim();
        if (!cidade) {
            cidade = 'São Paulo';
        }
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message bot';
        loadingDiv.id = 'loading-msg';
        loadingDiv.innerHTML = `<div class="avatar">⚡</div><div class="bubble" style="color: var(--text-secondary);">🌤️ Buscando clima para ${cidade}...</div>`;
        chat.appendChild(loadingDiv);
        chat.scrollTop = chat.scrollHeight;
        
        const resposta = await buscarClima(cidade);
        
        const loadingElement = document.getElementById('loading-msg');
        if (loadingElement) loadingElement.remove();
        
        adicionarMensagem('bot', resposta);
        return;
    }
    
    // ============================================
    // COMANDO: NOTÍCIAS
    // ============================================
    
    if (cmd.includes('notícias') || cmd.includes('noticias')) {
        let termo = cmd.replace(/notícias\s*sobre\s*/i, '').replace(/noticias\s*sobre\s*/i, '').replace(/notícias/i, '').replace(/noticias/i, '').trim();
        if (!termo) {
            termo = 'Brasil';
        }
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message bot';
        loadingDiv.id = 'loading-msg';
        loadingDiv.innerHTML = `<div class="avatar">⚡</div><div class="bubble" style="color: var(--text-secondary);">📰 Buscando notícias sobre ${termo}...</div>`;
        chat.appendChild(loadingDiv);
        chat.scrollTop = chat.scrollHeight;
        
        const resposta = await buscarNoticias(termo);
        
        const loadingElement = document.getElementById('loading-msg');
        if (loadingElement) loadingElement.remove();
        
        adicionarMensagem('bot', resposta);
        return;
    }
    
    // ============================================
    // COMANDO: PESQUISA NA WIKIPEDIA
    // ============================================
    
    if (cmd.includes('pesquisar sobre') || cmd.includes('pesquisa sobre') || cmd.includes('o que é') || cmd.includes('quem é') || cmd.includes('sobre')) {
        let termo = cmd
            .replace(/^pesquisar sobre\s*/i, '')
            .replace(/^pesquisa sobre\s*/i, '')
            .replace(/^o que é\s*/i, '')
            .replace(/^quem é\s*/i, '')
            .replace(/^sobre\s*/i, '')
            .trim();
        
        if (!termo) {
            adicionarMensagem('bot', '❓ Sobre o que você quer pesquisar?');
            return;
        }
        
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message bot';
        loadingDiv.id = 'loading-msg';
        loadingDiv.innerHTML = `<div class="avatar">⚡</div><div class="bubble" style="color: var(--text-secondary);">🔍 Pesquisando "${termo}"...</div>`;
        chat.appendChild(loadingDiv);
        chat.scrollTop = chat.scrollHeight;
        
        const resposta = await pesquisarWikipedia(termo);
        
        const loadingElement = document.getElementById('loading-msg');
        if (loadingElement) loadingElement.remove();
        
        adicionarMensagem('bot', resposta);
        return;
    }
    
    // ============================================
    // COMANDO: ABRIR SITES
    // ============================================
    
    if (cmd.includes('abrir')) {
        const resultado = abrirSite(cmd);
        adicionarMensagem('bot', resultado);
        return;
    }
    
    // ============================================
    // COMANDO: HORA
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
    // COMANDO: LEMBRETE
    // ============================================
    
    if (cmd.includes('lembrete')) {
        const texto = cmd.replace('lembrete', '').trim() || 'sem descrição';
        enviarNotificacao('📌 Lembrete', `Não se esqueça: ${texto}`);
        adicionarMensagem('bot', `✅ Lembrete salvo: "${texto}"`);
        return;
    }
    
    // ============================================
    // COMANDO: AJUDA
    // ============================================
    
    if (cmd.includes('ajuda') || cmd.includes('comandos') || cmd.includes('o que você faz')) {
        adicionarMensagem('bot', `
📋 **Comandos disponíveis:**

🌤️ **Clima:**
  "clima [cidade]" - Mostra o clima
  "tempo [cidade]" - Mostra o clima

📰 **Notícias:**
  "notícias [assunto]" - Últimas notícias
  "noticias [assunto]" - Últimas notícias

🔍 **Pesquisar:**
  "pesquisar sobre [assunto]" - Pesquisa na Wikipedia
  "o que é [assunto]" - Pesquisa na Wikipedia
  "quem é [assunto]" - Pesquisa na Wikipedia

🌐 **Abrir sites:**
  "abrir [site]" - Abre qualquer site

📌 **Lembretes:**
  "lembrete [texto]" - Cria um lembrete

🕐 **Hora:**
  "hora" - Mostra a hora

💬 **Perguntas:**
  Qualquer pergunta que você fizer, eu uso IA para responder!
        `);
        return;
    }
    
    // ============================================
    // 7. IA (MISTRAL) - TUDO QUE NÃO É COMANDO LOCAL
    // ============================================
    
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message bot';
    loadingDiv.id = 'loading-msg';
    loadingDiv.innerHTML = `
        <div class="avatar">⚡</div>
        <div class="bubble" style="color: var(--text-secondary);">⏳ Processando...</div>
    `;
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
// PWA - SERVICE WORKER
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

console.log('⚡ J.A.R.V.I.S. v3.0 iniciado com Mistral AI + Clima + Notícias + Wikipedia!');
