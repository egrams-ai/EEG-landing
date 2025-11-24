class LanguageManager {
    constructor() {
        this.supportedLangs = ['en', 'vi'];

        const queryLang = this.getLangFromQuery();
        const storedLang = this.getLangFromStorage();

        if (queryLang) {
            this.initialLangSource = 'query';
            this.currentLang = queryLang;
        } else if (storedLang) {
            this.initialLangSource = 'storage';
            this.currentLang = storedLang;
        } else {
            this.initialLangSource = 'auto';
            this.currentLang = 'en'; // temporary default, may change after geo lookup
        }
        this.canAutoSwitch = this.initialLangSource === 'auto';

        this.translations = translations; // Assumes translations is loaded globally
        this.init();
    }

    init() {
        this.setLanguage(this.currentLang);
        this.updateToggleButton();

        this.detectLanguageByIP();
    }

    getLangFromQuery() {
        const params = new URLSearchParams(window.location.search);
        const langParam = params.get('lang');
        if (langParam && this.supportedLangs.includes(langParam)) {
            return langParam;
        }
        return null;
    }

    getLangFromStorage() {
        const stored = localStorage.getItem('preferredLanguage');
        if (stored && this.supportedLangs.includes(stored)) {
            return stored;
        }
        return null;
    }

    updateUrlLangParam(lang) {
        const params = new URLSearchParams(window.location.search);
        params.set('lang', lang);
        const newUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
        window.history.replaceState({}, '', newUrl);
    }

    detectLanguageByIP() {
        fetch('https://ipwho.is/')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch IP info');
                }
                return response.json();
            })
            .then(data => {
                const { ip, country, country_code } = data;
                console.log(`[LanguageManager] IP lookup: ${ip} - ${country} (${country_code})`);

                const desiredLang = country_code === 'VN' ? 'vi' : 'en';

                if (desiredLang !== this.currentLang && this.canAutoSwitch) {
                    console.log('[LanguageManager] Auto switching language based on IP detection');
                    this.setLanguage(desiredLang);
                } else if (!this.canAutoSwitch) {
                    console.log(`[LanguageManager] Auto switch disabled (source: ${this.initialLangSource}). Current lang: ${this.currentLang}`);
                }
            })
            .catch(error => {
                console.warn('[LanguageManager] Unable to detect language via IP:', error);
            });
    }

    setLanguage(lang) {
        if (!this.translations[lang]) return;

        this.currentLang = lang;
        localStorage.setItem('preferredLanguage', lang);
        this.updateUrlLangParam(lang);

        // Update all elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.getTranslation(key);
            if (translation) {
                if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                    element.placeholder = translation;
                } else {
                    element.innerHTML = translation;
                }
            }
        });

        // Update HTML lang attribute
        document.documentElement.lang = lang;

        // Update page title
        const titleTranslation = this.getTranslation('page.title');
        if (titleTranslation) {
            document.title = titleTranslation;
        }

        this.updateToggleButton();
        this.updateLocalizedVideos();
    }

    getTranslation(key) {
        const langData = this.translations[this.currentLang];
        if (!langData) return null;
        return langData[key] || null;
    }

    toggleLanguage() {
        const newLang = this.currentLang === 'en' ? 'vi' : 'en';
        this.setLanguage(newLang);
    }

    updateToggleButton() {
        const btn = document.getElementById('langToggle');
        const flagElement = document.getElementById('langFlag');
        if (btn && flagElement) {
            // Update flag SVG based on current language
            // Show current language flag (EN shows US flag, VI shows VN flag)
            if (this.currentLang === 'en') {
                // US Flag
                flagElement.innerHTML = `
                    <svg width="24" height="18" viewBox="0 0 24 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="24" height="18" fill="#B22234"/>
                        <rect y="2" width="24" height="2" fill="#FFFFFF"/>
                        <rect y="6" width="24" height="2" fill="#FFFFFF"/>
                        <rect y="10" width="24" height="2" fill="#FFFFFF"/>
                        <rect y="14" width="24" height="2" fill="#FFFFFF"/>
                        <rect x="0" y="0" width="10" height="8" fill="#3C3B6E"/>
                        <circle cx="2.5" cy="2" r="0.4" fill="#FFFFFF"/>
                        <circle cx="5" cy="2" r="0.4" fill="#FFFFFF"/>
                        <circle cx="7.5" cy="2" r="0.4" fill="#FFFFFF"/>
                        <circle cx="2.5" cy="4" r="0.4" fill="#FFFFFF"/>
                        <circle cx="5" cy="4" r="0.4" fill="#FFFFFF"/>
                        <circle cx="7.5" cy="4" r="0.4" fill="#FFFFFF"/>
                        <circle cx="2.5" cy="6" r="0.4" fill="#FFFFFF"/>
                        <circle cx="5" cy="6" r="0.4" fill="#FFFFFF"/>
                        <circle cx="7.5" cy="6" r="0.4" fill="#FFFFFF"/>
                    </svg>
                `;
                btn.setAttribute('aria-label', 'Switch to Vietnamese');
            } else {
                // Vietnam Flag - Red background with yellow star
                flagElement.innerHTML = `
                    <svg width="24" height="18" viewBox="0 0 24 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="24" height="18" fill="#DA020E"/>
                        <path d="M12 4.5L13.176 7.854L16.5 8.09L13.854 10.146L14.528 13.5L12 11.854L9.472 13.5L10.146 10.146L7.5 8.09L10.824 7.854L12 4.5Z" fill="#FFD700"/>
                    </svg>
                `;
                btn.setAttribute('aria-label', 'Switch to English');
            }
        }
    }

    updateLocalizedVideos() {
        const videos = document.querySelectorAll('[data-video-en]');
        videos.forEach(video => {
            const targetSrc = this.currentLang === 'vi'
                ? video.getAttribute('data-video-vi')
                : video.getAttribute('data-video-en');

            if (targetSrc && video.getAttribute('src') !== targetSrc) {
                video.setAttribute('src', targetSrc);
            }
        });
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    window.languageManager = new LanguageManager();

    const toggleBtn = document.getElementById('langToggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.languageManager.toggleLanguage();
        });
    }
});
