(function() {
  console.log('🔌 EJTAS Push System Initializing...');

  // === КОНФІГУРАЦІЯ (Заміни на свої реальні дані перед комітом) ===
  const CONFIG = {
    VAPID_PUBLIC_KEY: 'BGMl6-SFHl1VHSSarEeUufF04WJLic_zBV2o3a_5amCiQLj0vqdBrITulD7PPQMCQ_Eqg6pc1t0kVWzvdrH0ZW4', // Той самий, що в env.VAPID_PUBLIC_KEY
    SUPABASE_URL: 'https://makcazualfwdlmkiebnw.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ha2NhenVhbGZ3ZGxta2llYm53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NDkyOTEsImV4cCI6MjA4MTAyNTI5MX0.zsJL04dO1Kwf7BiXvSHFtnGkja_Ji64lhqDxiGJgdiw' // Ключ "anon public" з налаштувань API

  };
  // =============================================================

  // Функція для конвертації ключа
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Код Service Worker, який ми створимо віртуально
  // Це дозволяє не змушувати юзера заливати файл, АЛЕ це працює тільки якщо політика безпеки дозволяє Blob URL
  const swCode = `
    self.addEventListener('push', function(event) {
      const payload = event.data ? event.data.json() : {};
      const title = payload.title || 'Нове сповіщення';
      const options = {
        body: payload.body || 'Натисніть для деталей',
        icon: payload.icon || 'https://via.placeholder.com/128',
        data: { url: payload.url || '/' }
      };
      event.waitUntil(self.registration.showNotification(title, options));
    });

    self.addEventListener('notificationclick', function(event) {
      event.notification.close();
      event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
          const url = event.notification.data.url;
          for (let i = 0; i < clientList.length; i++) {
            let client = clientList[i];
            if (client.url === url && 'focus' in client) return client.focus();
          }
          if (clients.openWindow) return clients.openWindow(url);
        })
      );
    });
  `;

  async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    // Створюємо Blob з кодом воркера
    const blob = new Blob([swCode], { type: 'application/javascript' });
    const swUrl = URL.createObjectURL(blob);

    try {
      const registration = await navigator.serviceWorker.register(swUrl);
      console.log('✅ Service Worker зареєстровано (Virtual Mode)');
      return registration;
    } catch (error) {
      console.warn('⚠️ Не вдалося зареєструвати віртуальний SW. Шукаємо /sw.js в корені...', error);
      // Фолбек: якщо Blob заблоковано, пробуємо знайти стандартний файл
      return await navigator.serviceWorker.register('/sw.js');
    }
  }

  async function subscribe() {
    try {
      const registration = await registerServiceWorker();
      if (!registration) return;

      await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(CONFIG.VAPID_PUBLIC_KEY)
      });

      console.log('🔔 Підписано:', subscription);

      // Зберігаємо в базу
      const subData = JSON.parse(JSON.stringify(subscription));
      
      await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/web_push_tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': CONFIG.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          endpoint: subData.endpoint,
          keys_p256dh: subData.keys.p256dh,
          keys_auth: subData.keys.auth,
          source_site: window.location.hostname
        })
      });

      console.log('💾 Токен збережено в базі!');

    } catch (err) {
      console.error('❌ Помилка підписки:', err);
    }
  }

  // Запускаємо логіку після завантаження сторінки
  window.addEventListener('load', () => {
    // Можна додати перевірку: if (Notification.permission !== 'denied')
    subscribe();
  });

})();
