(function() {
  const CONFIG = {
    // === ВСТАВ СВОЇ КЛЮЧІ ===
    VAPID_PUBLIC_KEY: 'BGMl6-SFHl1VHSSarEeUufF04WJLic_zBV2o3a_5amCiQLj0vqdBrITulD7PPQMCQ_Eqg6pc1t0kVWzvdrH0ZW4', // Той самий, що в env.VAPID_PUBLIC_KEY
    SUPABASE_URL: 'https://makcazualfwdlmkiebnw.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ha2NhenVhbGZ3ZGxta2llYm53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NDkyOTEsImV4cCI6MjA4MTAyNTI5MX0.zsJL04dO1Kwf7BiXvSHFtnGkja_Ji64lhqDxiGJgdiw' // Ключ "anon public" з налаштувань API

  };

  // Дефолтні налаштування (якщо в базі нічого немає)
  let settings = {
    delay_seconds: 5,
    auto_show: true,
    prompt_title: 'Хочете отримувати новини?',
    prompt_text: 'Підпишіться на сповіщення, щоб не пропустити важливі оновлення та акції.',
    accept_btn_text: 'Дозволити',
    deny_btn_text: 'Пізніше',
    btn_color: '#007bff'
  };

  // === 1. ЗАВАНТАЖЕННЯ НАЛАШТУВАНЬ ===
  async function loadSettings() {
    try {
      const hostname = window.location.hostname;
      const res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/push_settings?site_domain=eq.${hostname}&select=*`, {
        headers: {
          'apikey': CONFIG.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`
        }
      });
      const data = await res.json();
      if (data && data.length > 0) {
        console.log('Push Settings Loaded:', data[0]);
        settings = { ...settings, ...data[0] }; // Об'єднуємо з дефолтними
      }
    } catch (e) {
      console.warn('Failed to load push settings, using default.', e);
    }
  }

  // === 2. СТВОРЕННЯ UI (МОДАЛЬНЕ ВІКНО) ===
  function showModal() {
    if (localStorage.getItem('push_denied_time')) {
        // Якщо юзер відмовився, не показуємо добу (приклад логіки)
        const deniedTime = parseInt(localStorage.getItem('push_denied_time'));
        if (Date.now() - deniedTime < 24 * 60 * 60 * 1000) return;
    }

    const modalId = 'ejtas-push-modal';
    if (document.getElementById(modalId)) return;

    // Вставляємо стилі динамічно (щоб підхопити колір з settings)
    const styleId = 'ejtas-push-styles';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
            #${modalId} {
                position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
                background: white; padding: 20px; border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2); z-index: 999999;
                width: 90%; max-width: 400px; font-family: sans-serif;
                animation: ejtas-slide-down 0.5s ease-out;
                border: 1px solid #eee;
            }
            @keyframes ejtas-slide-down { from { top: -100px; opacity: 0; } to { top: 20px; opacity: 1; } }
            #${modalId} h3 { margin: 0 0 10px; font-size: 18px; color: #333; }
            #${modalId} p { margin: 0 0 20px; font-size: 14px; color: #666; line-height: 1.5; }
            .ejtas-btn-group { display: flex; gap: 10px; justify-content: flex-end; }
            .ejtas-btn { padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer; font-weight: 600; font-size: 14px; }
            .ejtas-btn-primary { background: ${settings.btn_color}; color: white; }
            .ejtas-btn-secondary { background: #f0f0f0; color: #333; }
            .ejtas-btn:hover { opacity: 0.9; }
        `;
        document.head.appendChild(style);
    }

    const modal = document.createElement('div');
    modal.id = modalId;
    modal.innerHTML = `
        <h3>${settings.prompt_title}</h3>
        <p>${settings.prompt_text}</p>
        <div class="ejtas-btn-group">
            <button class="ejtas-btn ejtas-btn-secondary" id="ejtas-deny">${settings.deny_btn_text}</button>
            <button class="ejtas-btn ejtas-btn-primary" id="ejtas-accept">${settings.accept_btn_text}</button>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('ejtas-accept').onclick = () => {
        requestSubscription();
        closeModal();
    };
    document.getElementById('ejtas-deny').onclick = () => {
        closeModal();
        localStorage.setItem('push_denied_time', Date.now());
    };
  }

  function closeModal() {
      const el = document.getElementById('ejtas-push-modal');
      if (el) el.remove();
  }

  // === 3. ЛОГІКА ПІДПИСКИ (Service Worker) ===
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) { outputArray[i] = rawData.charCodeAt(i); }
    return outputArray;
  }

  async function requestSubscription() {
    if (!('serviceWorker' in navigator)) return;
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(CONFIG.VAPID_PUBLIC_KEY)
      });
      
      // Зберігаємо в базу
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
      alert('Дякуємо! Ви успішно підписалися.');
    } catch (err) {
      console.error('Subscription error:', err);
      // Якщо юзер заблокував на рівні браузера
      if(Notification.permission === 'denied') alert('Будь ласка, розблокуйте сповіщення в налаштуваннях браузера.');
    }
  }

  // === 4. ІНІЦІАЛІЗАЦІЯ ===
  async function init() {
    await loadSettings();
    
    // Перевіряємо, чи вже підписаний
    if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
            const sub = await reg.pushManager.getSubscription();
            if (sub) return; // Вже підписаний - нічого не робимо
        }
    }
    
    // Якщо не підписаний і автопоказ увімкнено
    if (settings.auto_show && Notification.permission !== 'denied') {
        setTimeout(showModal, settings.delay_seconds * 1000);
    }
  }
  
  // Трекінг кліків (залишаємо без змін)
  (function trackClick() {
    const params = new URLSearchParams(window.location.search);
    const cId = params.get('campaign_id');
    if (cId && !sessionStorage.getItem('pc_'+cId)) {
       fetch(`${CONFIG.SUPABASE_URL}/rest/v1/rpc/increment_campaign_click`, {
          method:'POST', headers:{'Content-Type':'application/json','apikey':CONFIG.SUPABASE_ANON_KEY},
          body:JSON.stringify({campaign_uuid:cId})
       });
       sessionStorage.setItem('pc_'+cId,'1');
    }
  })();

  window.addEventListener('load', init);

})();
