(function() {
    'use strict';

    const SUPABASE_URL = 'https://makcazualfwdlmkiebnw.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ha2NhenVhbGZ3ZGxta2llYm53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NDkyOTEsImV4cCI6MjA4MTAyNTI5MX0.zsJL04dO1Kwf7BiXvSHFtnGkja_Ji64lhqDxiGJgdiw';

    const scriptVersion = '4.5';
    console.log(`🚀 Popup Script Version: ${scriptVersion}`);

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
                console.log('✅ Config loaded successfully');
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
    // ОТРИМАННЯ IP ТА КРАЇНИ (З ТАЙМАУТОМ)
    // ============================================
    async function getIPAndCountry(timeoutMs = 3000) {
        console.log('🌍 Fetching IP and country...');
        let ipAddress = null;
        let country = 'Unknown';

        // Promise з таймаутом
        const timeout = new Promise((resolve) => {
            setTimeout(() => {
                console.log('⏱️ IP fetch timeout reached');
                resolve({ ipAddress: null, country: 'Unknown' });
            }, timeoutMs);
        });

        const fetchIP = (async () => {
            // Спроба 1: ipapi.co
            try {
                const response = await fetch('https://ipapi.co/json/');
                if (response.ok) {
                    const data = await response.json();
                    ipAddress = data.ip || null;
                    country = data.country_name || 'Unknown';
                    console.log('✅ ipapi.co success:', { ipAddress, country });
                    return { ipAddress, country };
                }
            } catch (error) {
                console.warn('⚠️ ipapi.co failed:', error.message);
            }

            // Спроба 2: Cloudflare Trace
            try {
                const response = await fetch('https://www.cloudflare.com/cdn-cgi/trace');
                if (response.ok) {
                    const text = await response.text();
                    const ipMatch = text.match(/ip=([\d\.a-f:]+)/i);
                    if (ipMatch) {
                        ipAddress = ipMatch[1];
                        console.log('✅ Cloudflare success:', { ipAddress });
                        return { ipAddress, country };
                    }
                }
            } catch (error) {
                console.warn('⚠️ Cloudflare failed:', error.message);
            }

            console.log('❌ All IP services failed');
            return { ipAddress: null, country: 'Unknown' };
        })();

        return Promise.race([fetchIP, timeout]);
    }

    // ============================================
    // ЗБЕРЕЖЕННЯ EMAIL В SUPABASE (ОДИН ЗАПИТ)
    // ============================================
    async function saveEmailToSupabase(email, site, country, ipAddress) {
        console.log('💾 Saving to Supabase:', { email, site, country, ipAddress });
        
        try {
            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/subscriptions`,
                {
                    method: 'POST',
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({
                        email: email,
                        site: site,
                        country: country || 'Unknown',
                        user_agent: navigator.userAgent,
                        ip_address: ipAddress
                    })
                }
            );

            if (response.ok) {
                console.log('✅ Email saved successfully');
                return true;
            } else {
                const errorText = await response.text();
                console.error('❌ Failed to save email:', errorText);
                return false;
            }
        } catch (error) {
            console.error('❌ Error saving email:', error);
            return false;
        }
    }

    // ============================================
    // ГОЛОВНА ФУНКЦІЯ ІНІЦІАЛІЗАЦІЇ
    // ============================================
    function initializePopup(config) {
        function pushToDataLayer(eventName) {
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({
                'event': eventName,
                'popup_id': 'subscription_form_v1',
                'popup_title': config.popupTitle || 'Subscription'
            });
            console.log(`📊 DataLayer Push: ${eventName}`);
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
            .popup-header-image {
                width: 100%; height: auto;
            }

            .popup-body {
                padding: 10px 40px 10px 40px;
                text-align: center;
            }

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
                            <input 
                                type="email" 
                                id="email-input" 
                                name="email" 
                                autocomplete="email" 
                                placeholder="Email" 
                                required
                            >
                            <button type="submit" id="submit-button">${config.buttonText}</button>
                        </form>
                        ${config.privacyText ? `
                            <p style="font-size: 11px; color: ${config.privacyTextColor}; margin-top: 12px; line-height: 1.3; text-align: center;">
                                ${config.privacyText}
                            </p>
                        ` : ''}
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

        function setCookie(name, value, days) {
            let expires = "";
            if (days) {
                const date = new Date();
                date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
                expires = "; expires=" + date.toUTCString();
            }
            document.cookie = name + "=" + (value || "") + expires + "; path=/";
        }

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

        if (!getCookie(cookieName)) {
            setTimeout(() => {
                popup.classList.add('visible');
                pushToDataLayer('popup_view');
            }, popupDelay);
        }
        
        // ============================================
        // ОБРОБКА SUBMIT (ГІБРИДНИЙ ПІДХІД)
        // ============================================
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            console.log('📝 Form submitted');
            pushToDataLayer('popup_submit');

            const email = document.getElementById('email-input').value;
            submitButton.disabled = true;

            // Одразу стартуємо отримання IP (макс 500мс очікування)
            const ipPromise = getIPAndCountry(500);

            // Показуємо "дякую" через 100мс (щоб UX був плавний)
            setTimeout(() => {
                formContainer.style.display = 'none';
                thankYouMessage.style.display = 'block';
                setTimeout(() => closePopup(true), thankYouDelay);
            }, 100);

            // Чекаємо на IP і зберігаємо
            ipPromise.then(({ ipAddress, country }) => {
                console.log('🎯 Final data:', { email, site: currentSite, ipAddress, country });
                
                return saveEmailToSupabase(email, currentSite, country, ipAddress);
            }).then((saved) => {
                if (saved) {
                    pushToDataLayer('generate_lead');
                }
            }).catch((error) => {
                console.error('❌ Subscription error:', error);
            });
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
        const config = await loadConfigFromSupabase();
        
        if (!config) {
            console.log('❌ No popup configuration available for this domain');
            return;
        }
        
        initializePopup(config);
    })();

})();
