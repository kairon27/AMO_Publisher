(function() {
  // === КОНФІГУРАЦІЯ ===
  // Заміни ці значення на свої з Dashboard -> Project Settings -> API
  const CONFIG = {
    VAPID_PUBLIC_KEY: 'BGMl6-SFHl1VHSSarEeUufF04WJLic_zBV2o3a_5amCiQLj0vqdBrITulD7PPQMCQ_Eqg6pc1t0kVWzvdrH0ZW4', // Той самий, що в env.VAPID_PUBLIC_KEY
    SUPABASE_URL: 'https://makcazualfwdlmkiebnw.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ha2NhenVhbGZ3ZGxta2llYm53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NDkyOTEsImV4cCI6MjA4MTAyNTI5MX0.zsJL04dO1Kwf7BiXvSHFtnGkja_Ji64lhqDxiGJgdiw' // Ключ "anon public" з налаштувань API
  };

  // Дефолтні налаштування (якщо в базі для сайту нічого немає)
  let settings = {
    delay_seconds: 5,
    auto_show: true,
    prompt_title: 'Хочете отримувати новини?',
    prompt_text: 'Підпишіться на сповіщення, щоб не пропустити важливі оновлення та акції.',
    accept_btn_text: 'Дозволити',
    deny_btn_text: 'Пізніше',
    btn_color: '#007bff',
    bg_color: '#ffffff',
    text_color: '#333333',
    position: 'top-center'
  };

  // === 1. ЗАВАНТАЖЕННЯ НАЛАШТУВАНЬ ===
  async function loadSettings() {
    try {
      const hostname = window.location.hostname;
      // Шукаємо налаштування для поточного домену
      const res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/push_settings?site_domain=eq.${hostname}&select=*`, {
        headers: {
          'apikey': CONFIG.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`
        }
      });
      const data = await res.json();
      if (data && data.length > 0) {
        // Об'єднуємо дефолтні налаштування з тими, що прийшли з бази
        settings = { ...settings, ...data[0] };
        console.log('Push settings loaded:', settings);
      }
    } catch (e) {
      console.warn('Failed to load push settings, using defaults.', e);
    }
  }

  // === 2. ГЕНЕРАЦІЯ СТИЛІВ ПОЗИЦІЇ ===
  function getPositionStyles(pos) {
    const base = 'position: fixed; z-index: 999999; margin: 20px;';
    
    switch (pos) {
        case 'top-left': 
            return `${base} top: 0; left: 0;`;
        case 'top-right': 
            return `${base} top: 0; right: 0;`;
        case 'bottom-left': 
            return `${base} bottom: 0; left: 0;`;
        case 'bottom-right': 
            return `${base} bottom: 0; right: 0;`;
        case 'bottom-center': 
            return `${base} bottom: 0; left: 50%; transform: translateX(-50%);`;
        case 'center': 
            return `${base} top: 50%; left: 50%; transform: translate(-50%, -50%);`;
        case 'top-center': 
        default: 
            return `${base} top: 0; left: 50%; transform: translateX(-50%);`;
    }
  }

  // === 3. ПОКАЗ ВІКНА (UI) ===
  function showModal() {
    // Перевірка: чи не відмовився юзер нещодавно (24 години)
    if (localStorage.getItem('push_denied_time')) {
        const deniedTime = parseInt(localStorage.getItem('push_denied_time'));
        if (Date.now() - deniedTime < 24 * 60 * 60 * 1000) return;
    }

    const modalId = 'ejtas-push-modal';
    if (document.getElementById(modalId)) return;

    // Створення стилів
    const styleId = 'ejtas-push-styles';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        // CSS з анімацією появи
        style.innerHTML = `
            #${modalId} {
                background: ${settings.bg_color}; 
                padding: 24px; 
                border-radius: 12px;
                box-shadow: 0 8px 30px rgba(0,0,0,0.15); 
                width: 320px; 
                max-width: 90vw;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                border: 1px solid rgba(0,0,0,0.05);
                animation: ejtas-fade-in 0.4s ease-out;
                ${getPositionStyles(settings.position)}
            }
            @keyframes ejtas-fade-in { 
                from { opacity: 0; transform: ${settings.position.includes('center') ? 'translateX(-50%)' : ''} scale(0.95); } 
                to { opacity: 1; transform: ${settings.position.includes('center') ? 'translateX(-50%)' : ''} scale(1); } 
            }
            #${modalId} h3 { margin: 0 0 8px; font-size: 18px; font-weight: 700; color: ${settings.text_color}; line-height: 1.3; }
            #${modalId} p { margin: 0 0 20px; font-size: 14px; line-height: 1.5; color: ${settings.text_color}; opacity: 0.8; }
            .ejtas-btn-group { display: flex; gap: 12px; justify-content: flex-end; }
            .ejtas-btn { padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer; font-weight: 600; font-size: 14px; transition: opacity 0.2s; }
            .ejtas-btn-primary { background: ${settings.btn_color}; color: white; }
            .ejtas-btn-secondary { background: rgba(0,0,0,0.05); color: ${settings.text_color}; }
            .ejtas-btn:hover { opacity: 0.85; }
        `;
        document.head.appendChild(style);
    }

    // Створення HTML елемента
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

    // Обробка подій кнопок
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

  // === 4. ЛОГІКА ПІДПИСКИ (Service Worker) ===
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
      // Реєстрація SW (має бути в корені сайту)
      const registration = await navigator.serviceWorker.register('/sw.js');
      
      // Запит на підписку у браузера
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(CONFIG.VAPID_PUBLIC_KEY)
      });
      
      console.log('Subscribed:', subscription);

      // Відправка токена в Supabase
      await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/web_push_tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': CONFIG.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
          'Prefer': 'return=minimal' // Не повертати результат, щоб зекономити трафік
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys_p256dh: subscription.toJSON().keys.p256dh,
          keys_auth: subscription.toJSON().keys.auth,
          source_site: window.location.hostname
        })
      });

      // Опціонально: можна показати "Дякуємо"
      // alert('Дякуємо! Ви підписані.');

    } catch (err) {
      console.error('Subscription error:', err);
      if (Notification.permission === 'denied') {
        alert('Щоб отримувати новини, розблокуйте сповіщення в налаштуваннях браузера.');
      }
    }
  }

  // === 5. ІНІЦІАЛІЗАЦІЯ ===
  async function init() {
    await loadSettings();
    
    // Якщо браузер підтримує SW
    if ('serviceWorker' in navigator) {
        // Перевіряємо, чи вже є активна підписка
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
            const sub = await reg.pushManager.getSubscription();
            if (sub) {
                console.log('User already subscribed');
                return; // Вже підписаний -> не показуємо вікно
            }
        }
    }
    
    // Якщо не підписаний, автопоказ увімкнено і права не заблоковані
    if (settings.auto_show && Notification.permission !== 'denied') {
        setTimeout(showModal, settings.delay_seconds * 1000);
    }
  }
  
  // === 6. ТРЕКІНГ КЛІКІВ ===
  // Запускається автоматично при завантаженні сторінки
  (function trackClick() {
    const params = new URLSearchParams(window.location.search);
    const campaignId = params.get('campaign_id');
    
    // Якщо в URL є ID кампанії і ми ще не рахували цей клік
    if (campaignId && !sessionStorage.getItem('push_click_' + campaignId)) {
       console.log('Tracking push click:', campaignId);
       
       // Виклик RPC функції в Supabase
       fetch(`${CONFIG.SUPABASE_URL}/rest/v1/rpc/increment_campaign_click`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': CONFIG.SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ campaign_uuid: campaignId })
       }).catch(console.error);

       // Запам'ятовуємо в сесії, щоб F5 не накручував лічильник
       sessionStorage.setItem('push_click_' + campaignId, 'true');
    }
  })();

  // Запуск скрипта
  window.addEventListener('load', init);

})();
