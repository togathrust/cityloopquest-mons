// Gestionnaire de traductions pour CityLoop Quest Mons
class TranslationManager {
    constructor() {
        this.currentLanguage = 'fr'; // Langue par défaut
        this.translations = {};
        this.isLoaded = false;
    }

    // Charger les traductions depuis le fichier JSON
    async loadTranslations() {
        try {
            // Charger les traductions principales
            const response = await fetch('translations/translations.json');
            this.translations = await response.json();
            
            // Charger les traductions d'installation (optionnel)
            try {
                const installResponse = await fetch('translations/translations_install.json');
                const installTranslations = await installResponse.json();
                
                // Fusionner les traductions d'installation
                for (const lang in installTranslations) {
                    if (this.translations[lang]) {
                        this.translations[lang] = { ...this.translations[lang], ...installTranslations[lang] };
                    } else {
                        this.translations[lang] = installTranslations[lang];
                    }
                }
            } catch (installError) {
                console.warn('Impossible de charger les traductions d\'installation:', installError);
            }
            
            // Charger les traductions montois (optionnel)
            try {
                const montoisResponse = await fetch('translations/translations_montois.json');
                const montoisTranslations = await montoisResponse.json();
                
                // Fusionner les traductions montois
                for (const lang in montoisTranslations) {
                    if (this.translations[lang]) {
                        this.translations[lang] = { ...this.translations[lang], ...montoisTranslations[lang] };
                    } else {
                        this.translations[lang] = montoisTranslations[lang];
                    }
                }
            } catch (montoisError) {
                console.warn('Impossible de charger les traductions montois:', montoisError);
            }
            
            this.isLoaded = true;
        } catch (error) {
            console.error('❌ Erreur lors du chargement des traductions principales:', error);
            this.isLoaded = false;
        }
    }

    // Définir la langue courante
    setLanguage(lang) {
        
        if (this.translations[lang]) {
            this.currentLanguage = lang;
            localStorage.setItem('selectedLanguage', lang);
            this.applyTranslations();
        } else {
            console.warn('⚠️ Langue non disponible:', lang);
            console.warn('⚠️ Langues disponibles:', Object.keys(this.translations));
        }
    }

    // Obtenir la langue courante
    getCurrentLanguage() {
        return this.currentLanguage;
    }

    // Traduire une clé
    translate(key) {
        if (!this.isLoaded) {
            console.warn('⚠️ TranslationManager pas encore chargé pour la clé:', key);
            return key; // Retourner la clé si pas de traduction
        }
        
        if (!this.translations[this.currentLanguage]) {
            console.warn('⚠️ Langue non disponible:', this.currentLanguage, 'pour la clé:', key);
            return key; // Retourner la clé si pas de traduction
        }
        
        const keys = key.split('.');
        let value = this.translations[this.currentLanguage];
        
        for (const k of keys) {
            if (value && value[k]) {
                value = value[k];
            } else {
                console.warn('⚠️ Clé de traduction non trouvée:', key, 'dans la langue:', this.currentLanguage);
                return key; // Retourner la clé si pas trouvé
            }
        }
        
        return value;
    }

    // Appliquer les traductions à la page courante
    applyTranslations() {
        if (!this.isLoaded) {
            console.warn('⚠️ TranslationManager pas encore chargé, impossible d\'appliquer les traductions');
            return;
        }


        // Traduire les éléments avec l'attribut data-translate
        const elements = document.querySelectorAll('[data-translate]');
        
        elements.forEach(element => {
            const key = element.getAttribute('data-translate');
            const translation = this.translate(key);
            if (translation !== key) {
                // Si la clé contient du HTML ou si c'est le splash screen, utiliser innerHTML
                if (key === 'splash_waiting' || /<.*?>/.test(translation)) {
                    element.innerHTML = translation;
                    if (element.id === 'splash-text') {
                    }
                } else {
                    element.textContent = translation;
                }
            } else {
                console.warn(`⚠️ Traduction manquante pour ${key}`);
            }
        });

        // Traduire les éléments avec l'attribut data-translate-html
        const htmlElements = document.querySelectorAll('[data-translate-html]');
        
        htmlElements.forEach(element => {
            const key = element.getAttribute('data-translate-html');
            const translation = this.translate(key);
            if (translation !== key) {
                element.innerHTML = translation;
            } else {
                console.warn(`⚠️ Traduction HTML manquante pour ${key}`);
            }
        });
    }

    // Initialiser le gestionnaire de traductions
    async init() {
        await this.loadTranslations();
        
        if (!this.isLoaded) {
            console.error('❌ Échec du chargement des traductions, impossible de continuer');
            return;
        }
        
        // Récupérer la langue sauvegardée
        const savedLanguage = localStorage.getItem('selectedLanguage');
        
        if (savedLanguage && this.translations[savedLanguage]) {
            this.currentLanguage = savedLanguage;
        } else {
            // Si aucune langue n'est sélectionnée, utiliser le français par défaut
            this.currentLanguage = 'fr';
            localStorage.setItem('selectedLanguage', 'fr');
        }
        
        // Appliquer les traductions
        this.applyTranslations();
        
        // Notifier le changement de langue pour synchroniser le sélecteur
        document.dispatchEvent(new CustomEvent('languageChanged', { 
            detail: { language: this.currentLanguage } 
        }));
        
        // Forcer la mise à jour du splash screen spécifiquement
        const splashText = document.getElementById('splash-text');
        if (splashText) {
            const translation = this.translate('splash_waiting');
            if (translation !== 'splash_waiting') {
                splashText.innerHTML = translation;
            }
        }
        
    }
}

// Créer une instance globale
window.translationManager = new TranslationManager();

// Initialiser automatiquement quand le DOM est chargé
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Ne pas initialiser sur la page de sélection de langue pour éviter les blocages
        const currentPath = window.location.pathname || window.location.href || '';
        if (currentPath.includes('language-selection.html') || 
            currentPath.includes('language-selection')) {
            // Sur la page de sélection de langue, on initialise seulement si nécessaire
            // mais on ne bloque pas l'affichage en cas d'erreur
            return;
        }
        
        // Vérifier si une langue est passée dans l'URL
        const urlParams = new URLSearchParams(window.location.search);
        const langFromUrl = urlParams.get('lang');
        
        if (langFromUrl) {
            // Forcer la langue avant l'initialisation
            window.translationManager.currentLanguage = langFromUrl;
            localStorage.setItem('selectedLanguage', langFromUrl);
        }
        
        // Initialiser avec protection contre les erreurs
        if (window.translationManager && typeof window.translationManager.init === 'function') {
            window.translationManager.init().catch(err => {
                console.error('Erreur lors de l\'initialisation du translationManager:', err);
                // Ne pas bloquer l'exécution en cas d'erreur
            });
        }
    } catch (error) {
        console.error('Erreur dans DOMContentLoaded du translationManager:', error);
        // Ne pas bloquer l'exécution en cas d'erreur
    }
}); 