// ============================================
// J.A.R.V.I.S. - Assistente Avançado com Mistral
// ============================================

const API_KEY = "0k7vwPq3YQ2lq29J1dcxciBwyxE5QBV5";
const API_URL = "https://api.mistral.ai/v1/chat/completions";
const MODEL = "mistral-small-latest";

let reconhecimentoVoz = null;
let estaOuvindo = false;
let historico = [];
let comandosPersonalizados = [];

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
        <div class="avatar">${tipo === 'bot' ? '⍟' : '◆'}</div>
        <div class="bubble">${textoFormatado.replace(/\n/g, '<br>')}</div>
    `;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
}

// ============================================
// ABRIR QUALQUER SITE
// ============================================

function abrirSite(comando) {
    // Remove "abrir" do comando
    let site = comando.replace(/^abrir\s*/i, '').trim();
    
    // Lista de sites populares
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
        'pinterest': 'https://pinterest.com',
        'tiktok': 'https://tiktok.com',
        'mercadolivre': 'https://mercadolivre.com.br',
        'magazineluiza': 'https://magazineluiza.com.br',
        'americanas': 'https://americanas.com',
        'submarino': 'https://submarino.com.br',
        'shoptime': 'https://shoptime.com.br',
        'casasbahia': 'https://casasbahia.com.br',
        'pontofrio': 'https://pontofrio.com.br',
        'extra': 'https://extra.com.br',
        'carrefour': 'https://carrefour.com.br',
        'pão de açúcar': 'https://www.paodeacucar.com',
        'ifood': 'https://ifood.com.br',
        'rappi': 'https://rappi.com.br',
        'uber': 'https://uber.com',
        '99': 'https://99app.com',
        'inDrive': 'https://indrive.com'
    };

    // Verifica se é um site conhecido
    for (let [nome, url] of Object.entries(sites)) {
        if (site.includes(nome)) {
            window.open(url, '_blank');
            return `✅ Abrindo ${nome}...`;
        }
    }

    // Se não for conhecido, tenta abrir como URL
    if (site.includes('.')) {
        let url = site;
        if (!url.startsWith('http')) {
            url = 'https://' + url;
        }
        window.open(url, '_blank');
        return `✅ Abrindo ${site}...`;
    }

    // Se não for site conhecido nem URL, pesquisa no Google
    window.open(`https://www.google.com/search?q=${encodeURIComponent(site)}`, '_blank');
    return `🔍 Pesquisando "${site}" no Google...`;
}

// ============================================
// PESQUISAR NA INTERNET
// ============================================

function pesquisarInternet(comando) {
    let query = comando.replace(/^pesquisar\s*/i, '').replace(/^pesquisa\s*/i, '').trim();
    if (!query) {
        return '❓ O que você quer pesquisar?';
    }
    window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
    return `🔍 Pesquisando "${query}"...`;
}

// ============================================
// CHAMAR MISTRAL (COM COMANDOS PERSONALIZADOS)
// ============================================

async function chamarMistral(pergunta) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    { 
                        role: 'system', 
                        content: `Você é o J.A.R.V.I.S., um assistente pessoal extremamente inteligente e útil. 
                        Responda em português brasileiro. Seja conciso mas completo. 
                        Você pode abrir sites, pesquisar na internet, criar lembretes, mostrar a hora e muito mais.
                        Se o usuário pedir para abrir um site, diga "abrir [site]".
                        Se o usuário pedir para pesquisar algo, diga "pesquisar [assunto]".
                        Seja proativo e sugira coisas úteis quando apropriado.` 
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

        const resposta = data.choices[0].message.content;
        
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
// EXECUTAR COMANDO (INTELIGENTE)
// ============================================

async function executarComando(comando) {
    const cmd = comando.toLowerCase().trim();
    adicionarMensagem('user', cmd);
    
    // ============================================
    // 1. COMANDOS DE ABRIR SITES
    // ============================================
    
    if (cmd.includes('abrir')) {
        const resultado = abrirSite(cmd);
        adicionarMensagem('bot', resultado);
        return;
    }
    
    // ============================================
    // 2. COMANDOS DE PESQUISA
    // ============================================
    
    if (cmd.includes('pesquisar') || cmd.includes('pesquisa')) {
        const resultado = pesquisarInternet(cmd);
        adicionarMensagem('bot', resultado);
        return;
    }
    
    // ============================================
    // 3. HORA
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
    // 4. LEMBRETE
    // ============================================
    
    if (cmd.includes('lembrete')) {
        const texto = cmd.replace('lembrete', '').trim() || 'sem descrição';
        enviarNotificacao('📌 Lembrete', `Não se esqueça: ${texto}`);
        adicionarMensagem('bot', `✅ Lembrete salvo: "${texto}"`);
        return;
    }
    
    // ============================================
    // 5. AJUDA (DINÂMICA)
    // ============================================
    
    if (cmd.includes('ajuda') || cmd.includes('comandos') || cmd.includes('o que você faz')) {
        adicionarMensagem('bot', `
📋 **Comandos disponíveis:**

🌐 **Abrir sites:**
  "abrir youtube", "abrir google", "abrir gmail", "abrir twitter"
  "abrir instagram", "abrir facebook", "abrir spotify"
  "abrir [qualquer site]" - Abre qualquer site que você pedir

🔍 **Pesquisar:**
  "pesquisar [assunto]" - Pesquisa no Google
  "pesquisa [assunto]" - Pesquisa no Google

📌 **Lembretes:**
  "lembrete [texto]" - Cria um lembrete

🕐 **Hora:**
  "hora", "que horas são" - Mostra a hora

💬 **Perguntas:**
  Qualquer pergunta que você fizer, eu uso IA para responder!

🌐 **Navegação:**
  Posso abrir qualquer site que você pedir!
  Posso pesquisar qualquer coisa na internet!
  Posso te ajudar com tarefas do dia a dia!

💡 **Dica:** Seja específico nas perguntas para melhores respostas.
        `);
        return;
    }
    
    // ============================================
    // 6. TUDO QUE NÃO É COMANDO LOCAL VAI PRA IA
    // ============================================
    
    // Mostra que está pensando
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message bot';
    loadingDiv.id = 'loading-msg';
    loadingDiv.innerHTML = `
        <div class="avatar">⍟</div>
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

console.log('⍟ J.A.R.V.I.S. v3.0 iniciado com Mistral AI!');