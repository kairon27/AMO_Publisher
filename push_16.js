(function() {
  const VERSION = '7.0 (Image Support + Smart Tracking)';
  
  const CONFIG = {
    VAPID_PUBLIC_KEY: 'BED2dODWjc_xMJJnWluz4wG4rP4cQOQRXIAgqXht5JmAyPjGvd8ydM4oD1t5ebyhdkr003a0dAXXNaCSM057T6A', 
    SUPABASE_URL: 'https://makcazualfwdlmkiebnw.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ha2NhenVhbGZ3ZGxta2llYm53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NDkyOTEsImV4cCI6MjA4MTAyNTI5MX0.zsJL04dO1Kwf7BiXvSHFtnGkja_Ji64lhqDxiGJgdiw'
  };

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

  async function loadSettings() {
    try {
      const hostname = window.location.hostname;
      const res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/push_settings?site_domain=eq.${hostname}&select=*`, {
        headers: { 'apikey': CONFIG.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) settings = { ...settings, ...data[0] };
      }
    } catch (e) {}
  }

  function getPositionStyles(pos) {
    const base = 'position: fixed; z-index: 999999; margin: 20px;';
    switch (pos) {
        case 'top-left': return `${base} top: 0; left: 0;`;
        case 'top-right': return `${base} top: 0; right: 0;`;
        case 'bottom-left': return `${base} bottom: 0; left: 0;`;
        case 'bottom-right': return `${base} bottom: 0; right: 0;`;
        case 'bottom-center': return `${base} bottom: 0; left: 50%; transform: translateX(-50%);`;
        case 'center': return `${base} top: 50%; left: 50%; transform: translate(-50%, -50%);`;
        case 'top-center': default: return `${base} top: 0; left: 50%; transform: translateX(-50%);`;
    }
  }

  function showModal() {
    if (localStorage.getItem('push_block_until')) {
        const until = parseInt(localStorage.getItem('push_block_until'));
        if (Date.now() < until) return;
    }
    if (document.getElementById('ejtas-push-modal')) return;

    if (!document.getElementById('ejtas-push-styles')) {
        const style = document.createElement('style');
        style.id = 'ejtas-push-styles';
        style.innerHTML = `
            #ejtas-push-modal {
                background: ${settings.bg_color}; padding: 24px; border-radius: 12px;
                box-shadow: 0 8px 30px rgba(0,0,0,0.15); width: 320px; max-width: 90vw;
                font-family: -apple-system, sans-serif; border: 1px solid rgba(0,0,0,0.05);
                animation: ejtas-fade-in 0.4s ease-out; ${getPositionStyles(settings.position)}
            }
            @keyframes ejtas-fade-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
            #ejtas-push-modal h3 { margin: 0 0 8px; font-size: 18px; font-weight: 700; color: ${settings.text_color}; }
            #ejtas-push-modal p { margin: 0 0 20px; font-size: 14px; color: ${settings.text_color}; opacity: 0.8; }
            .ejtas-btn-group { display: flex; gap: 12px; justify-content: flex-end; }
            .ejtas-btn { padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer; font-weight: 600; }
            .ejtas-btn-primary { background: ${settings.btn_color}; color: white; }
            .ejtas-btn-secondary { background: rgba(0,0,0,0.05); color: ${settings.text_color}; }
        `;
        document.head.appendChild(style);
    }

    const modal = document.createElement('div');
    modal.id = 'ejtas-push-modal';
    modal.innerHTML = `
        <h3>${settings.prompt_title}</h3>
        <p>${settings.prompt_text}</p>
        <div class="ejtas-btn-group">
            <button class="ejtas-btn ejtas-btn-secondary" id="ejtas-deny">${settings.deny_btn_text}</button>
            <button class="ejtas-btn ejtas-btn-primary" id="ejtas-accept">${settings.accept_btn_text}</button>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('ejtas-accept').onclick = () => { requestSubscription(); closeModal(); };
    document.getElementById('ejtas-deny').onclick = () => { 
        closeModal(); 
        localStorage.setItem('push_block_until', Date.now() + (24 * 60 * 60 * 1000)); 
    };
  }
  function closeModal() { const el = document.getElementById('ejtas-push-modal'); if(el) el.remove(); }

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) { outputArray[i] = rawData.charCodeAt(i); }
    return outputArray;
  }

  async function detectCountry() {
      try {
          const res = await fetch('https://ipapi.co/json/');
          if (res.ok) {
              const data = await res.json();
              return data.country_name || 'Unknown';
          }
      } catch (e) { return 'Unknown'; }
      return 'Unknown';
  }

  async function requestSubscription() {
    if (!('serviceWorker' in navigator)) return;
    try {
      const registration = await navigator.serviceWorker.register('/sw_1.js');
      await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(CONFIG.VAPID_PUBLIC_KEY)
      });
      const country = await detectCountry();
      await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/web_push_tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': CONFIG.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`, 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys_p256dh: subscription.toJSON().keys.p256dh,
          keys_auth: subscription.toJSON().keys.auth,
          source_site: window.location.hostname,
          country: country,
          browser_data: { user_agent: navigator.userAgent, language: navigator.language }
        })
      });
      console.log(`✅ [Push] Subscribed.`);
    } catch (err) {
      localStorage.setItem('push_block_until', Date.now() + (7 * 24 * 60 * 60 * 1000));
    }
  }

  async function init() {
    await loadSettings();
    if ('serviceWorker' in navigator) {
        try {
            const reg = await navigator.serviceWorker.getRegistration();
            if (reg) {
                const sub = await reg.pushManager.getSubscription();
                if (sub) return;
            }
        } catch (e) {}
    }
    if (settings.auto_show && Notification.permission !== 'denied') {
        setTimeout(showModal, settings.delay_seconds * 1000);
    }
  }
  
  // === SMART CLICK TRACKING (NO DOUBLES) ===
  (function trackClick() {
    const params = new URLSearchParams(window.location.search);
    const cId = params.get('campaign_id');
    const isSwTracked = params.get('tracked') === 'sw'; // Перевірка мітки від SW
    
    // Якщо є ID кампанії, але немає мітки "tracked=sw", значить SW не спрацював
    if (cId && !isSwTracked && !sessionStorage.getItem('pc_tracked_' + cId)) {
       
       console.log(`📊 [Push] Backup tracking initiated (SW didn't fire).`);
       
       setTimeout(() => {
           fetch(`${CONFIG.SUPABASE_URL}/rest/v1/rpc/increment_campaign_click`, {
              method: 'POST', 
              headers: { 'Content-Type': 'application/json', 'apikey': CONFIG.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}` },
              body: JSON.stringify({ campaign_uuid: cId })
           }).catch(console.error);
           
           sessionStorage.setItem('pc_tracked_' + cId, '1');
       }, 1500);
    } else if (cId && isSwTracked) {
        console.log(`✅ [Push] Click already tracked by Service Worker.`);
        sessionStorage.setItem('pc_tracked_' + cId, '1');
    }
  })();

  window.addEventListener('load', init);
})();
