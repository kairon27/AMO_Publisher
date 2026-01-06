(function() {
  const CONFIG = {
    // ВСТАВ СВОЇ КЛЮЧІ ТУТ
    VAPID_PUBLIC_KEY: 'BGMl6-SFHl1VHSSarEeUufF04WJLic_zBV2o3a_5amCiQLj0vqdBrITulD7PPQMCQ_Eqg6pc1t0kVWzvdrH0ZW4', // Той самий, що в env.VAPID_PUBLIC_KEY
    SUPABASE_URL: 'https://makcazualfwdlmkiebnw.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ha2NhenVhbGZ3ZGxta2llYm53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NDkyOTEsImV4cCI6MjA4MTAyNTI5MX0.zsJL04dO1Kwf7BiXvSHFtnGkja_Ji64lhqDxiGJgdiw' // Ключ "anon public" з налаштувань API

  };

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
      box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      cursor: pointer;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s;
    }
    .ejtas-push-btn:hover { transform: scale(1.1); }
    .ejtas-push-btn svg { width: 24px; height: 24px; fill: white; }
    .ejtas-hidden { display: none !important; }
  `;

  // Додаємо стилі на сторінку
  const styleSheet = document.createElement("style");
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);

  function createButton() {
    const btn = document.createElement('div');
    btn.className = 'ejtas-push-btn';
    btn.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"/>
      </svg>
    `;
    btn.onclick = requestSubscription;
    document.body.appendChild(btn);
    return btn;
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

  async function requestSubscription() {
    if (!('serviceWorker' in navigator)) return alert('Ваш браузер не підтримує сповіщення');

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('SW зареєстровано');

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(CONFIG.VAPID_PUBLIC_KEY)
      });

      console.log('Підписано!', subscription);
      
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

      alert('Дякуємо! Ви підписані на сповіщення.');
      document.querySelector('.ejtas-push-btn').classList.add('ejtas-hidden'); // Ховаємо кнопку

    } catch (err) {
      console.error('Помилка:', err);
      if (Notification.permission === 'denied') {
        alert('Ви заблокували сповіщення. Будь ласка, увімкніть їх у налаштуваннях браузера (значок замка біля адреси сайту).');
      } else {
        alert('Не вдалося підписатися. Спробуйте пізніше.');
      }
    }
  }

  // Перевіряємо, чи юзер вже підписаний
  async function checkSubscription() {
    if (!('serviceWorker' in navigator)) return;
    
    // Реєструємо SW навіть просто для перевірки
    const reg = await navigator.serviceWorker.register('/sw.js');
    const sub = await reg.pushManager.getSubscription();
    
    if (!sub && Notification.permission !== 'denied') {
      // Якщо не підписаний і не заблокував -> показуємо кнопку
      createButton();
    } else {
      console.log('Користувач вже підписаний або заблокував сповіщення.');
    }
  }

  window.addEventListener('load', checkSubscription);

})();
