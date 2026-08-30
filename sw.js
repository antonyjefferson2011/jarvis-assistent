const CACHE_NAME = 'jarvis-v7.0';

const ASSETS = [
    'index.html',
    'style.css',
    'script.js',
    'script1.js',
    'manifest.json',
    'icon.png'
];

// INSTALAÇÃO
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('✅ Cache atualizado para v7.0');
                return cache.addAll(ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// ATIVAÇÃO - FORÇA LIMPEZA DO CACHE ANTIGO
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        })
        .then(() => self.clients.claim())
    );
});

// FETCH - SEMPRE BUSCA DO SERVIDOR PRIMEIRO
self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request)
            .catch(() => caches.match(event.request))
    );
});
