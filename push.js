<script>
  (function() {
    // === НАЛАШТУВАННЯ ===
    const CONFIG = {
      VAPID_PUBLIC_KEY: 'BGMl6-SFHl1VHSSarEeUufF04WJLic_zBV2o3a_5amCiQLj0vqdBrITulD7PPQMCQ_Eqg6pc1t0kVWzvdrH0ZW4', // Той самий, що в env.VAPID_PUBLIC_KEY
      SUPABASE_URL: 'https://makcazualfwdlmkiebnw.supabase.co',
      SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ha2NhenVhbGZ3ZGxta2llYm53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NDkyOTEsImV4cCI6MjA4MTAyNTI5MX0.zsJL04dO1Kwf7BiXvSHFtnGkja_Ji64lhqDxiGJgdiw' // Ключ "anon public" з налаштувань API
    };
    // ====================

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

    async function subscribeUser() {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.log('Push messaging not supported');
        return;
      }

      try {
        // 1. Реєструємо Service Worker
        const registration = await navigator.serviceWorker.register('/sw.js');
        
        // 2. Чекаємо готовності
        await navigator.serviceWorker.ready;

        // 3. Підписуємось на пуші у браузера
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(CONFIG.VAPID_PUBLIC_KEY)
        });

        console.log('User is subscribed:', subscription);

        // 4. Відправляємо дані в Supabase (прямий запит в базу через REST API)
        const subData = JSON.parse(JSON.stringify(subscription));
        
        await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/web_push_tokens`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': CONFIG.SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
            'Prefer': 'return=minimal' // Не повертати результат, щоб зекономити трафік
          },
          body: JSON.stringify({
            endpoint: subData.endpoint,
            keys_p256dh: subData.keys.p256dh,
            keys_auth: subData.keys.auth,
            source_site: window.location.hostname // Автоматично записуємо домен сайту
          })
        });

        console.log('Subscription sent to server!');

      } catch (err) {
        console.error('Failed to subscribe:', err);
      }
    }

    // Автоматичний запуск при завантаженні (можна повісити на кнопку)
    // Браузер сам запитає дозвіл у користувача
    window.addEventListener('load', () => {
        // Тут можна додати перевірку: if (Notification.permission === 'default') ...
        subscribeUser(); 
    });

  })();
</script>
