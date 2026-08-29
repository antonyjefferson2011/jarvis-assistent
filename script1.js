// ============================================
// SCRIPT1.JS - VISÃO COMPUTACIONAL (CÂMERA)
// ============================================

// ============================================
// ACESSAR CÂMERA
// ============================================

let streamCamera = null;
let cameraAtiva = false;
let videoElement = null;

// Função para iniciar a câmera
async function iniciarCamera() {
    try {
        // Pede permissão para acessar a câmera
        streamCamera = await navigator.mediaDevices.getUserMedia({
            video: { 
                facingMode: 'user',  // 'user' = frontal, 'environment' = traseira
                width: { ideal: 640 },
                height: { ideal: 480 }
            },
            audio: false
        });
        
        cameraAtiva = true;
        
        // Cria um elemento de vídeo para mostrar o feed
        videoElement = document.createElement('video');
        videoElement.srcObject = streamCamera;
        videoElement.autoplay = true;
        videoElement.playsInline = true;
        videoElement.style.width = '100%';
        videoElement.style.borderRadius = '8px';
        videoElement.style.marginTop = '8px';
        videoElement.style.border = '1px solid rgba(255,215,0,0.2)';
        
        // Mostra no chat
        const div = document.createElement('div');
        div.className = 'message bot';
        div.innerHTML = `
            <div class="avatar">⚡</div>
            <div class="bubble">
                📸 Câmera ativada!<br>
                <span style="font-size:12px; color: var(--text-secondary);">
                    🔴 Analisando movimento e rostos...
                </span>
            </div>
        `;
        document.getElementById('chat').appendChild(div);
        
        // Adiciona o vídeo separadamente
        const videoDiv = document.createElement('div');
        videoDiv.className = 'message bot';
        videoDiv.innerHTML = `
            <div class="avatar">⚡</div>
            <div class="bubble" style="padding: 0; overflow: hidden;">
            </div>
        `;
        videoDiv.querySelector('.bubble').appendChild(videoElement);
        document.getElementById('chat').appendChild(videoDiv);
        
        // Inicia a detecção de movimento
        detectarMovimento();
        
        return true;
        
    } catch (error) {
        console.error('Erro ao acessar câmera:', error);
        adicionarMensagem('bot', `❌ Não foi possível acessar a câmera: ${error.message}`);
        return false;
    }
}

// ============================================
// DETECTAR MOVIMENTO (SIMPLIFICADO)
// ============================================

let ultimoFrame = null;
let movimentoDetectado = false;

function detectarMovimento() {
    if (!videoElement) return;
    
    // Usa um canvas para capturar frames
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 160;
    canvas.height = 120;
    
    function analisarFrame() {
        if (!cameraAtiva || !videoElement || videoElement.paused) {
            requestAnimationFrame(analisarFrame);
            return;
        }
        
        // Desenha o frame atual no canvas
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        const frameData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        if (ultimoFrame) {
            // Compara com o frame anterior
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
            
            // Se a diferença for grande, detectou movimento
            if (diferenca > 20) {
                if (!movimentoDetectado) {
                    movimentoDetectado = true;
                    adicionarMensagem('bot', '🚨 Movimento detectado!');
                }
            } else {
                movimentoDetectado = false;
            }
        }
        
        // Salva o frame atual para a próxima comparação
        ultimoFrame = frameData;
        
        requestAnimationFrame(analisarFrame);
    }
    
    analisarFrame();
}

// ============================================
// TIRAR FOTO
// ============================================

function tirarFoto() {
    if (!videoElement) {
        adicionarMensagem('bot', '❌ A câmera não está ativa. Diga "abrir câmera" primeiro.');
        return;
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth || 640;
    canvas.height = videoElement.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    
    const fotoURL = canvas.toDataURL('image/png');
    
    // Mostra no chat
    adicionarMensagem('user', '📸 Foto tirada!', { type: 'image', data: fotoURL });
    adicionarMensagem('bot', '✅ Foto capturada! O que você quer fazer com ela?');
    
    // Salva a imagem para análises futuras
    window.ultimaFoto = fotoURL;
    
    return fotoURL;
}

// ============================================
// DESLIGAR CÂMERA
// ============================================

function desligarCamera() {
    if (streamCamera) {
        streamCamera.getTracks().forEach(track => track.stop());
        cameraAtiva = false;
        videoElement = null;
        adicionarMensagem('bot', '📸 Câmera desligada.');
    }
}

// ============================================
// EXPORTA AS FUNÇÕES PARA O MAIN.JS
// ============================================

window.iniciarCamera = iniciarCamera;
window.desligarCamera = desligarCamera;
window.tirarFoto = tirarFoto;
