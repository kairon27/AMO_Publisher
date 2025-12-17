(function() {
    'use strict';

    const SUPABASE_URL = 'https://makcazualfwdlmkiebnw.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ha2NhenVhbGZ3ZGxta2llYm53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NDkyOTEsImV4cCI6MjA4MTAyNTI5MX0.zsJL04dO1Kwf7BiXvSHFtnGkja_Ji64lhqDxiGJgdiw';

    const scriptVersion = '4.7'; // Оптимізована версія
    console.log(`🚀 Popup Script Version: ${scriptVersion}`);

    // Глобальна змінна для локації
    let userLocationCache = {
        ip: null,
        country: 'Unknown',
        loaded: false
    };

    // ============================================
    // ДОПОМІЖНІ ФУНКЦІЇ (COOKIE)
    // ============================================
    function getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    function setCookie(name, value, days) {
        let expires = "";
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + (value || "") + expires + "; path=/";
    }

    // ============================================
    // ЗАВАНТАЖЕННЯ КОНФІГУРАЦІЇ
    // ============================================
    async function loadConfigFromSupabase() {
        try {
            const currentDomain = window.location.hostname;
            console.log('📡 Loading config for domain:', currentDomain);
            
            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/sites?domain=eq.${encodeURIComponent(currentDomain)}&enabled=eq.true&select=*`,
                {
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data && data.length > 0) {
                const site = data[0];
                return {
                    popupTitle: site.popup_title,
                    popupText: site.popup_text,
                    popupTitleColor: site.popup_title_color || '#1a202c',
                    popupTextColor: site.popup_text_color || '#4a5568',
                    buttonText: site.button_text || 'Subscribe',
                    buttonColor: site.button_color || '#4A5568',
                    buttonTextColor: site.button_text_color || '#FFFFFF',
                    buttonHoverColor: site.button_hover_color || '#2D3748',
                    closeBtnColor: site.close_btn_color || '#999999',
                    formBackgroundColor: site.form_background_color || '#F4F1ED',
                    imageUrl: site.image_url,
                    thankYouTitle: site.thank_you_title || 'Thank You!',
                    thankYouText: site.thank_you_text || 'You have successfully subscribed.',
                    popupDelaySeconds: site.popup_delay_seconds || 10,
                    cookieExpirationDays: site.cookie_expiration_days || 90,
                    privacyText: site.privacy_text,
                    privacyTextColor: site.privacy_text_color || '#999999',
                    reminderCookieDays: site.reminder_cookie_days || 0,
                    thankYouDelaySeconds: site.thank_you_delay_seconds || 3
                };
            } else {
                console.warn('⚠️ No popup configuration found for this domain');
                return null;
            }
        } catch (error) {
            console.error('❌ Error loading popup config:', error);
            return null;
        }
    }

    // ============================================
    // ФОНОВЕ ОТРИМАННЯ IP ТА КРАЇНИ
    // ============================================
    async function prefetchUserLocation() {
        console.log('🌍 Pre-fetching IP and country...');
        
        const fetchWithTimeout = async (url, options = {}, timeout = 2000) => {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeout);
            try {
                const response = await fetch(url, { ...options, signal: controller.signal });
                clearTimeout(id);
                return response;
            } catch (error) {
                clearTimeout(id);
                throw error;
            }
        };

        try {
            // 1. ipwho.is
            try {
                const response = await fetchWithTimeout('https://ipwho.is/');
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        userLocationCache = {
                            ip: data.ip,
                            country: data.country || 'Unknown',
                            loaded: true
                        };
                        return;
                    }
                }
            } catch (e) {}

            // 2. db-ip.com
            try {
                const response = await fetchWithTimeout('https://api.db-ip.com/v2/free/self');
                if (response.ok) {
                    const data = await response.json();
                    userLocationCache = {
                        ip: data.ipAddress,
                        country: data.countryName || 'Unknown',
                        loaded: true
                    };
                    return;
                }
            } catch (e) {}

            // 3. Cloudflare
            try {
                const response = await fetchWithTimeout('https://www.cloudflare.com/cdn-cgi/trace');
                if (response.ok) {
                    const text = await response.text();
                    const ipMatch = text.match(/ip=([\d\.a-f:]+)/i);
                    if (ipMatch) {
                        userLocationCache = {
                            ip: ipMatch[1],
                            country: 'Unknown',
                            loaded: true
                        };
                    }
                }
            } catch (e) {}

        } catch (error) {
            console.warn('❌ Location services failed or timed out');
        }
    }

    // ============================================
    // ЗБЕРЕЖЕННЯ EMAIL
    // ============================================
    async function saveEmailToSupabase(email, site, country, ipAddress) {
        const finalCountry = country || userLocationCache.country || 'Unknown';
        const finalIP = ipAddress || userLocationCache.ip || null;

        try {
            await fetch(`${SUPABASE_URL}/rest/v1/subscriptions`, {
                method: 'POST',
                keepalive: true,
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                    email: email,
                    site: site,
                    country: finalCountry,
                    user_agent: navigator.userAgent,
                    ip_address: finalIP
                })
            });
            return true;
        } catch (error) {
            console.error('❌ Error saving email:', error);
            return false;
        }
    }

    // ============================================
    // ІНІЦІАЛІЗАЦІЯ POPUP
    // ============================================
    function initializePopup(config) {
        function pushToDataLayer(eventName) {
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({
                'event': eventName,
                'popup_id': 'subscription_form_v1',
                'popup_title': config.popupTitle || 'Subscription'
            });
        }

        const styles = `
            @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');
            
            .popup-overlay {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background-color: rgba(0, 0, 0, 0.7); display: flex;
                justify-content: center; align-items: center; z-index: 2147483647;
                opacity: 0; visibility: hidden; transition: opacity 0.4s ease;
            }
            .popup-overlay.visible { opacity: 1; visibility: visible; }
            
            .popup-container {
                background-color: ${config.formBackgroundColor};
                border-radius: 8px; box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                width: 90%; max-width: 780px;
                font-family: 'Poppins', sans-serif;
                transform: scale(0.95); transition: transform 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
                position: relative;
            }
            .popup-overlay.visible .popup-container { transform: scale(1); }
            
            .popup-header {
                padding: 20px 30px;
                display: ${config.imageUrl ? 'block' : 'none'};
            }
            .popup-header-image { width: 100%; height: auto; }

            .popup-body { padding: 10px 40px 10px 40px; text-align: center; }

            .close-btn {
                position: absolute; top: 5px; right: 5px;
                font-size: 28px; color: ${config.closeBtnColor}; cursor: pointer; line-height: 1; font-weight: 300;
            }
            
            .popup-body h2 { font-size: 38px; font-weight: 700; color: ${config.popupTitleColor}; margin: 0 0 10px 0; line-height: 1; }
            .popup-body p { font-size: 16px; color: ${config.popupTextColor}; margin: 0 0 30px 0; }

            #subscription-form { display: flex; margin-bottom: 20px; }
            #email-input { flex-grow: 1; padding: 16px 20px; border: 1px solid #dcdcdc; border-radius: 8px; font-size: 16px; }
            #submit-button { margin-left: 10px; padding: 16px 35px; border: none; border-radius: 8px; background-color: ${config.buttonColor}; color: ${config.buttonTextColor}; font-size: 16px; font-weight: 600; cursor: pointer; transition: background-color 0.2s; }
            #submit-button:disabled { background-color: #ccc; cursor: not-allowed; }
            #submit-button:hover:not(:disabled) { background-color: ${config.buttonHoverColor}; }
            
            #thank-you-message { text-align: center; }

            @media (max-width: 600px) {
                .popup-body { padding: 10px 25px 30px 25px; }
                .popup-body h2 { font-size: 28px; }
                #subscription-form { flex-direction: column; }
                #submit-button { margin-left: 0; margin-top: 10px; }
            }
        `;

        const popupHTML = `
            <div class="popup-container">
                <span class="close-btn">&times;</span>
                <div class="popup-header">
                    <img src="${config.imageUrl || ''}" class="popup-header-image" alt="">
                </div>
                <div class="popup-body">
                    <div id="form-container">
                        <h2>${config.popupTitle}</h2>
                        <p>${config.popupText}</p>
                        <form id="subscription-form">
                            <input type="email" id="email-input" name="email" autocomplete="email" placeholder="Email" required>
                            <button type="submit" id="submit-button">${config.buttonText}</button>
                        </form>
                        ${config.privacyText ? `<p style="font-size: 11px; color: ${config.privacyTextColor}; margin-top: 12px; line-height: 1.3; text-align: center;">${config.privacyText}</p>` : ''}
                    </div>
                    <div id="thank-you-message" style="display: none;">
                        <h2>${config.thankYouTitle}</h2>
                        <p>${config.thankYouText}</p>
                    </div>
                </div>
            </div>
        `;

        const styleSheet = document.createElement("style");
        styleSheet.innerText = styles;
        document.head.appendChild(styleSheet);
        
        const popup = document.createElement('div');
        popup.id = 'subscription-popup';
        popup.className = 'popup-overlay';
        popup.innerHTML = popupHTML;
        document.body.appendChild(popup);

        const form = document.getElementById('subscription-form');
        const submitButton = document.getElementById('submit-button');
        const closeButton = popup.querySelector('.close-btn');
        const formContainer = document.getElementById('form-container');
        const thankYouMessage = document.getElementById('thank-you-message');
        
        const popupDelay = (parseInt(config.popupDelaySeconds, 10) || 10) * 1000;
        const cookieExpirationDays = parseInt(config.cookieExpirationDays, 10) || 90;
        const reminderCookieDays = parseInt(config.reminderCookieDays, 10) || 0;
        const thankYouDelay = (parseInt(config.thankYouDelaySeconds, 10) || 3) * 1000;
        const currentSite = window.location.hostname;
        const cookieName = `subscriptionPopupShown_${currentSite}`;

        function closePopup(isSubscribed) {
            popup.classList.remove('visible');
            if (isSubscribed) {
                setCookie(cookieName, 'subscribed', cookieExpirationDays);
            } else {
                if (reminderCookieDays > 0) {
                    setCookie(cookieName, 'reminder', reminderCookieDays);
                }
            }
        }

        setTimeout(() => {
            popup.classList.add('visible');
            pushToDataLayer('popup_view');
        }, popupDelay);
        
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            pushToDataLayer('popup_submit');

            const email = document.getElementById('email-input').value;
            submitButton.disabled = true;
            submitButton.textContent = '...';

            formContainer.style.display = 'none';
            thankYouMessage.style.display = 'block';

            saveEmailToSupabase(email, currentSite, userLocationCache.country, userLocationCache.ip);
            pushToDataLayer('generate_lead');

            setTimeout(() => closePopup(true), thankYouDelay);
        });

        closeButton.addEventListener('click', function() {
            const isSubscribed = thankYouMessage.style.display === 'block';
            closePopup(isSubscribed);
        });
    }

    // ============================================
    // ЗАПУСК СКРИПТА
    // ============================================
    (async function run() {
        const currentSite = window.location.hostname;
        const cookieName = `subscriptionPopupShown_${currentSite}`;
        
        // 🛑 ЕТАП 1: Перевірка куки
        // Якщо кука є, ми навіть не робимо запитів
        if (getCookie(cookieName)) {
            console.log('🍪 Cookie found (subscribed or hidden). Script stops here.');
            return; 
        }

        // 🚀 ЕТАП 2: Якщо куки немає - починаємо роботу
        
        // 2.1 Запускаємо пошук локації паралельно
        prefetchUserLocation();

        // 2.2 Вантажимо конфіг
        const config = await loadConfigFromSupabase();
        
        if (!config) {
            return;
        }
        
        // 2.3 Показуємо попап
        initializePopup(config);
    })();

})();
