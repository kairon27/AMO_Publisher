(function() {
  // === КОНФІГУРАЦІЯ (ЗАМІНИ НА СВОЇ ДАНІ) ===
  const CONFIG = {
    VAPID_PUBLIC_KEY: 'BGMl6-SFHl1VHSSarEeUufF04WJLic_zBV2o3a_5amCiQLj0vqdBrITulD7PPQMCQ_Eqg6pc1t0kVWzvdrH0ZW4', // Той самий, що в env.VAPID_PUBLIC_KEY
    SUPABASE_URL: 'https://makcazualfwdlmkiebnw.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ha2NhenVhbGZ3ZGxta2llYm53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NDkyOTEsImV4cCI6MjA4MTAyNTI5MX0.zsJL04dO1Kwf7BiXvSHFtnGkja_Ji64lhqDxiGJgdiw' // Ключ "anon public" з налаштувань API

  };
  // ===========================================

  // Стилі для кнопки
  const styles = `
    .ejtas-push-btn {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 50px;
      height: 50px;
      background: #007bff;
      border-radius: 50%;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
      cursor: pointer;
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .ejtas-push-btn:hover { transform: scale(1.1); }
    .ejtas-push-btn svg { width: 24px; height: 24px; fill: white; }
    .ejtas-hidden { display: none !important; }
    .ejtas-pulse { animation: ejtas-pulse-animation 2s infinite; }
    @keyframes ejtas-pulse-animation {
      0% { box-shadow: 0 0 0 0 rgba(0, 123, 255, 0.7); }
      70% { box-shadow: 0 0 0 10px rgba(0, 123, 255, 0); }
      100% { box-shadow: 0 0 0 0 rgba(0, 123, 255, 0); }
    }
  `;

  // Додаємо CSS на сторінку
  const styleSheet = document.createElement("style");
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);

  function createButton() {
    // Якщо кнопка вже є, не створюємо дублікат
    if (document.querySelector('.ejtas-push-btn')) return;

    const btn = document.createElement('div');
    btn.className = 'ejtas-push-btn ejtas-pulse';
    btn.title = 'Підписатись на новини';
    btn.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"/>
      </svg>
    `;
    btn.onclick = requestSubscription;
    document.body.appendChild(btn);
  }

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

  // === ЛОГІКА ПІДПИСКИ ===
  async function requestSubscription() {
    if (!('serviceWorker' in navigator)) return alert('Ваш браузер не підтримує сповіщення');

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('SW зареєстровано');

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(CONFIG.VAPID_PUBLIC_KEY)
      });

      console.log('Підписано:', subscription);
      
      // Відправляємо в базу
      await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/web_push_tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': CONFIG.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys_p256dh: subscription.toJSON().keys.p256dh,
          keys_auth: subscription.toJSON().keys.auth,
          source_site: window.location.hostname
        })
      });

      alert('Дякуємо! Ви підписані на сповіщення.');
      const btn = document.querySelector('.ejtas-push-btn');
      if (btn) btn.classList.add('ejtas-hidden');

    } catch (err) {
      console.error('Помилка підписки:', err);
      if (Notification.permission === 'denied') {
        alert('Ви заблокували сповіщення. Будь ласка, натисніть на значок замка біля адреси сайту та дозвольте сповіщення.');
      }
    }
  }

  // === ЛОГІКА ПЕРЕВІРКИ ===
  async function checkSubscription() {
    if (!('serviceWorker' in navigator)) return;
    
    // Перевіряємо, чи юзер вже підписаний
    const reg = await navigator.serviceWorker.getRegistration();
    let sub = null;
    if (reg) {
      sub = await reg.pushManager.getSubscription();
    }
    
    // Якщо не підписаний і не заблокував -> показуємо кнопку
    if (!sub && Notification.permission !== 'denied') {
      createButton();
    }
  }

  // === ЛОГІКА ТРЕКІНГУ КЛІКІВ (ВАЖЛИВО) ===
  function trackClick() {
    const params = new URLSearchParams(window.location.search);
    const campaignId = params.get('campaign_id');
    
    // Якщо прийшли з пуша і ще не зарахували цей клік
    if (campaignId && !sessionStorage.getItem('push_click_' + campaignId)) {
      console.log('🚀 Push Click Detected:', campaignId);
      
      // Викликаємо RPC функцію для інкременту
      fetch(`${CONFIG.SUPABASE_URL}/rest/v1/rpc/increment_campaign_click`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': CONFIG.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ campaign_uuid: campaignId })
      }).then(() => {
          sessionStorage.setItem('push_click_' + campaignId, 'true');
      }).catch(console.error);
    }
  }

  // Запуск при завантаженні
  window.addEventListener('load', () => {
    checkSubscription();
    trackClick();
  });

})();
