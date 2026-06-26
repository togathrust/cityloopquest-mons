// pwa-installer.js - Gestion avancée de l'installation PWA

class PWAInstaller {
    constructor() {
        this.deferredPrompt = null;
        this.installPrompt = null;
        this.isInstalled = false;
        this.init();
    }

    init() {
        // Ne PAS initialiser sur index.html (géré par le splashscreen)
        if (window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/')) {
            return;
        }
        
        
        // Détecter iOS Safari
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
        this.isIOS = isIOS && isSafari;
        
        if (this.isIOS) {
        }
        
        // Détecter si l'app est déjà installée
        this.checkIfInstalled();
        
        // Vérification périodique de l'état d'installation
        this.startInstallationMonitoring();
        
        // Vérifier l'état lors du focus de la page (retour depuis une autre app)
        window.addEventListener('focus', () => {
            this.checkIfInstalled();
        });
        
        // Écouter l'événement beforeinstallprompt (non supporté sur iOS)
        if (!this.isIOS) {
            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                this.deferredPrompt = e;
                this.showInstallPrompt();
            });
        }

        // Écouter l'événement appinstalled
        window.addEventListener('appinstalled', (evt) => {
            this.isInstalled = true;
            localStorage.setItem('pwa-installed', 'true');
            this.hideInstallPrompt();
            this.hideInstallButton();
            this.showInstallationSuccess();
        });

        // Écouter les changements de display-mode
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(display-mode: standalone)');
            mediaQuery.addEventListener('change', (e) => {
                this.isInstalled = e.matches;
                
                if (e.matches) {
                    // App installée ou lancée depuis l'icône
                    localStorage.setItem('pwa-installed', 'true');
                    this.hideInstallButton();
                    this.hideInstallPrompt();
                } else {
                    // App désinstallée ou retour au navigateur
                    localStorage.removeItem('pwa-installed');
                    this.isInstalled = false;
                    this.showInstallButton();
                    
                    // Vérifier si on peut proposer l'installation
                    if (this.deferredPrompt && !this.isIOS) {
                        this.showInstallPrompt();
                    }
                }
            });
        }
    }

    checkIfInstalled() {
        // Vérifier si l'app est en mode standalone (méthode principale)
        if (window.matchMedia('(display-mode: standalone)').matches) {
            this.isInstalled = true;
            this.hideInstallButton();
            // Mettre à jour localStorage pour confirmer l'installation
            localStorage.setItem('pwa-installed', 'true');
            return;
        }

        // Vérifier si l'app est installée via d'autres méthodes (iOS)
        if (window.navigator.standalone === true) {
            this.isInstalled = true;
            this.hideInstallButton();
            localStorage.setItem('pwa-installed', 'true');
            return;
        }

        // Si l'app n'est PAS en mode standalone, elle n'est pas installée
        // Nettoyer localStorage si l'app a été désinstallée
        if (localStorage.getItem('pwa-installed') === 'true') {
            localStorage.removeItem('pwa-installed');
        }
        
        this.isInstalled = false;
        this.showInstallButton();
    }
    
    showInstallButton() {
        // Sur index.html, le bouton est géré par le splashscreen
        // Cette méthode n'est appelée que pour les prompts d'installation
        const pwaInstallBtn = document.getElementById('pwa-install-btn');
        if (pwaInstallBtn) {
            pwaInstallBtn.style.display = 'inline-block';
        }
        
        // Si on a un prompt d'installation différé, l'afficher
        if (this.deferredPrompt && !this.isInstalled && !this.isIOS) {
            this.showInstallPrompt();
        }
    }
    
    hideInstallButton() {
        const pwaInstallBtn = document.getElementById('pwa-install-btn');
        if (pwaInstallBtn) {
            pwaInstallBtn.style.display = 'none';
        }
    }

    showInstallPrompt() {
        // Créer le prompt d'installation s'il n'existe pas
        if (!this.installPrompt) {
            this.createInstallPrompt();
        }

        // Afficher le prompt immédiatement pour une meilleure UX
        if (this.installPrompt) {
            this.installPrompt.style.display = 'block';
            
            // Ajouter une animation d'entrée
            this.installPrompt.style.animation = 'slideUp 0.5s ease-out';
        }
    }

    createInstallPrompt() {
        // Créer le prompt d'installation
        this.installPrompt = document.createElement('div');
        this.installPrompt.className = 'pwa-install-prompt';
        this.installPrompt.innerHTML = `
            <div class="pwa-install-content">
                <div class="pwa-install-icon"><img src="images/partager_ios.png" alt="Installer" style="height:2em;width:auto;"></div>
                <div class="pwa-install-text">
                    <h3><span data-translate="install_title">Installer l'application</span></h3>
                    <p><span data-translate="install_message">Installez CityLoop Quest Mons pour une meilleure expérience</span></p>
                </div>
                <div class="pwa-install-buttons">
                    <button id="pwa-prompt-install-btn" class="pwa-install-btn"><span data-translate="install_button">Installer l'application et redémarrer à partir de l'app installée - cliquer ici</span></button>
                    <button id="pwa-dismiss-btn" class="pwa-dismiss-btn">Plus tard</button>
                </div>
            </div>
        `;

        // Ajouter les styles
        this.addInstallPromptStyles();

        // Ajouter les événements
        this.installPrompt.querySelector('#pwa-prompt-install-btn').addEventListener('click', () => {
            this.installApp();
        });

        this.installPrompt.querySelector('#pwa-dismiss-btn').addEventListener('click', () => {
            this.hideInstallPrompt();
        });

        // Ajouter au DOM
        document.body.appendChild(this.installPrompt);
        
        // Appliquer les traductions si le manager est disponible
        if (window.translationManager && typeof window.translationManager.applyTranslations === 'function') {
            window.translationManager.applyTranslations();
        }
    }

    startInstallationMonitoring() {
        // Vérifier l'état d'installation toutes les 5 secondes
        setInterval(() => {
            const isCurrentlyStandalone = window.matchMedia('(display-mode: standalone)').matches;
            const isCurrentlyIOSStandalone = window.navigator.standalone === true;
            
            // Si l'état a changé depuis la dernière vérification
            if (this.isInstalled !== (isCurrentlyStandalone || isCurrentlyIOSStandalone)) {
                this.checkIfInstalled();
            }
        }, 5000);
    }

    addInstallPromptStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .pwa-install-prompt {
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, #b30000, #8b0000);
                color: white;
                padding: 20px;
                border-radius: 15px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                z-index: 10000;
                display: none;
                font-family: Arial, sans-serif;
                max-width: 90vw;
                width: 350px;
                border: 2px solid #fff;
            }

            .pwa-install-content {
                display: flex;
                align-items: center;
                gap: 15px;
            }

            .pwa-install-icon {
                font-size: 2em;
                flex-shrink: 0;
            }

            .pwa-install-text {
                flex: 1;
            }

            .pwa-install-text h3 {
                margin: 0 0 5px 0;
                font-size: 1.1em;
            }

            .pwa-install-text p {
                margin: 0;
                font-size: 0.9em;
                opacity: 0.9;
            }

            .pwa-install-buttons {
                display: flex;
                gap: 10px;
                margin-top: 15px;
            }

            .pwa-install-btn, .pwa-dismiss-btn {
                padding: 12px 20px;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-weight: bold;
                transition: all 0.2s;
                flex: 1;
                min-width: 120px;
            }

            .pwa-install-btn {
                background: #4CAF50;
                color: white;
                margin-right: 10px;
                font-size: 0.9em;
                line-height: 1.2;
            }

            .pwa-install-btn:hover {
                background: #45a049;
                transform: translateY(-2px);
            }

            .pwa-dismiss-btn {
                background: #f8f9fa;
                color: #666;
                border: 1px solid #ddd;
                font-size: 0.9em;
            }

            .pwa-dismiss-btn:hover {
                background: #e9ecef;
            }

            @keyframes slideUp {
                from {
                    transform: translateX(-50%) translateY(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(-50%) translateY(0);
                    opacity: 1;
                }
            }

            @media (max-width: 480px) {
                .pwa-install-prompt {
                    bottom: 10px;
                    left: 10px;
                    right: 10px;
                    transform: none;
                    width: auto;
                }
            }
        `;
        document.head.appendChild(style);
    }

    async installApp() {
        // Détecter iOS Safari
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
        
        if (isIOS && isSafari) {
            this.showIOSInstallInstructions();
            return;
        }
        
        if (this.deferredPrompt) {
            try {
                this.deferredPrompt.prompt();
                const { outcome } = await this.deferredPrompt.userChoice;
                
                if (outcome === 'accepted') {
                    this.isInstalled = true;
                    localStorage.setItem('pwa-installed', 'true');
                    this.hideInstallPrompt();
                    this.showInstallationSuccess();
                }
                
                this.deferredPrompt = null;
            } catch (error) {
                console.error('🚀 Erreur lors de l\'installation:', error);
            }
        } else {
            // Fallback pour les navigateurs qui ne supportent pas beforeinstallprompt
            this.showManualInstallInstructions();
        }
    }

    hideInstallPrompt() {
        if (this.installPrompt) {
            this.installPrompt.style.display = 'none';
        }
    }

    showInstallationSuccess() {
        const successMessage = document.createElement('div');
        successMessage.className = 'pwa-success-message';
        successMessage.innerHTML = `
            <div class="pwa-success-content">
                <div class="pwa-success-icon">✅</div>
                <div class="pwa-success-text">
                    <h3>Installation réussie !</h3>
                    <p>L'application a été installée avec succès.</p>
                </div>
            </div>
        `;

        // Ajouter les styles pour le message de succès
        const style = document.createElement('style');
        style.textContent = `
            .pwa-success-message {
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: #4CAF50;
                color: white;
                padding: 15px 20px;
                border-radius: 10px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                z-index: 10001;
                font-family: Arial, sans-serif;
                animation: slideDown 0.5s ease-out;
            }

            .pwa-success-content {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .pwa-success-icon {
                font-size: 1.5em;
            }

            @keyframes slideDown {
                from {
                    transform: translateX(-50%) translateY(-100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(-50%) translateY(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(successMessage);

        // Supprimer le message après 3 secondes
        setTimeout(() => {
            if (successMessage.parentNode) {
                successMessage.parentNode.removeChild(successMessage);
            }
        }, 3000);
    }

    showManualInstallInstructions() {
        const instructions = document.createElement('div');
        instructions.className = 'pwa-manual-instructions';
        instructions.innerHTML = `
            <div class="pwa-manual-content">
                <h3><img src="images/partager_ios.png" alt="Installer" style="height:1.3em;vertical-align:-0.2em;margin-right:5px;"> <span data-translate="install_title">Installation de l'application</span></h3>
                <p><span data-translate="install_intro">Pour installer CityLoop Quest Mons sur votre appareil :</span></p>
                <div class="install-steps">
                    <div class="step">
                        <div class="step-icon">🔍</div>
                        <div class="step-text">
                            <strong>1. <span data-translate="step1">Trouvez l'icône d'installation ou confirmez l'installation automatique</span></strong><br>
                            <span class="browser-specific" id="browser-instructions">Chargement...</span>
                        </div>
                    </div>
                    <div class="step">
                        <div class="step-icon">👆</div>
                        <div class="step-text">
                            <strong>2. <span data-translate="step2">Appuyez sur "Installer" ou "Ajouter"</span></strong>
                        </div>
                    </div>
                    <div class="step">
                        <div class="step-icon">✅</div>
                        <div class="step-text">
                            <strong>3. <span data-translate="step3">Confirmez l'installation</span></strong>
                        </div>
                    </div>
                </div>
                <div class="install-benefits">
                    <h4><span data-translate="benefits_title">Avantages de l'installation :</span></h4>
                    <ul>
                        <li><span data-translate="benefit1">🎯 Accès rapide depuis l'écran d'accueil</span></li>
                        <li><span data-translate="benefit2">🚀 Performance optimisée</span></li>
                        <li><span data-translate="benefit3">🔔 Notifications push (si activées)</span></li>
                    </ul>
                </div>
            </div>
        `;

        // Ajouter les styles
        const style = document.createElement('style');
        style.textContent = `
            .pwa-manual-instructions {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                color: #333;
                padding: 25px;
                border-radius: 15px;
                box-shadow: 0 12px 40px rgba(0,0,0,0.4);
                z-index: 10002;
                font-family: Arial, sans-serif;
                max-width: 90vw;
                width: 450px;
                max-height: 80vh;
                overflow-y: auto;
            }

            .pwa-manual-content h3 {
                margin: 0 0 20px 0;
                color: #b30000;
                font-size: 1.3em;
                text-align: center;
            }

            .install-steps {
                margin: 20px 0;
            }

            .step {
                display: flex;
                align-items: flex-start;
                gap: 15px;
                margin: 15px 0;
                padding: 10px;
                background: #f8f9fa;
                border-radius: 8px;
            }

            .step-icon {
                font-size: 1.5em;
                flex-shrink: 0;
                margin-top: 2px;
            }

            .step-text {
                flex: 1;
                line-height: 1.4;
            }

            .browser-specific {
                color: #666;
                font-size: 0.9em;
                margin-top: 5px;
                display: block;
            }

            .install-benefits {
                margin: 20px 0;
                padding: 15px;
                background: #e8f5e8;
                border-radius: 8px;
                border-left: 4px solid #4CAF50;
            }

            .install-benefits h4 {
                margin: 0 0 10px 0;
                color: #2e7d32;
            }

            .install-benefits ul {
                margin: 10px 0;
                padding-left: 20px;
            }

            .install-benefits li {
                margin: 5px 0;
                color: #555;
            }

            .pwa-manual-content button {
                background: #b30000;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                cursor: pointer;
                margin-top: 20px;
                font-weight: bold;
                font-size: 1.1em;
                width: 100%;
                transition: background 0.2s;
            }

            .pwa-manual-content button:hover {
                background: #8b0000;
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(instructions);
        
        // Appliquer les traductions si le manager est disponible
        if (window.translationManager && typeof window.translationManager.applyTranslations === 'function') {
            window.translationManager.applyTranslations();
        }
        
        // Détecter le navigateur et afficher les bonnes instructions
        this.updateBrowserInstructions();
    }

    showIOSInstallInstructions() {
        const instructions = document.createElement('div');
        instructions.className = 'pwa-manual-instructions ios-instructions';
        instructions.innerHTML = `
            <div class="pwa-manual-content">
                <h3>🍎 <span data-translate="ios_title">Installation sur iPhone/iPad</span></h3>
                <p><span data-translate="ios_intro">Pour installer CityLoop Quest Mons sur votre appareil iOS :</span></p>
                <div class="install-steps">
                    <div class="step">
                        <div class="step-icon">📤</div>
                        <div class="step-text">
                            <strong>1. <span data-translate="ios_step1">Appuyez sur le bouton "Partager"</span></strong><br>
                            <span class="ios-detail"><span data-translate="ios_step1_detail">Trouvez le bouton carré avec une flèche vers le haut dans la barre d'outils Safari</span></span>
                        </div>
                    </div>
                    <div class="step">
                        <div class="step-icon">🏠</div>
                        <div class="step-text">
                            <strong>2. <span data-translate="ios_step2_alt">Sélectionnez "Sur l'écran d'accueil"</span></strong><br>
                            <span class="ios-detail"><span data-translate="ios_step2_detail_alt">Faites défiler dans le menu et appuyez sur cette option. Si l'option n'est pas disponible, sélectionnez "En voir plus", l'option apparaîtra.</span></span>
                        </div>
                    </div>
                    <div class="step">
                        <div class="step-icon">➕</div>
                        <div class="step-text">
                            <strong>3. <span data-translate="ios_step3">Appuyez sur "Ajouter"</span></strong><br>
                            <span class="ios-detail"><span data-translate="ios_step3_detail">Confirmez l'ajout de l'application</span></span>
                        </div>
                    </div>
                    <div class="step">
                        <div class="step-icon">🚀</div>
                        <div class="step-text">
                            <strong>4. <span data-translate="ios_step4">Fermez le navigateur et démarrez l'app à partir de l'icône.</span></strong>
                        </div>
                    </div>
                </div>
                <div class="ios-tips">
                    <h4>💡 <span data-translate="ios_tips_title">Conseils :</span></h4>
                    <ul>
                        <li><span data-translate="ios_tip1">L'application apparaîtra sur votre écran d'accueil</span></li>
                        <li><span data-translate="ios_tip2">Vous pouvez la déplacer et organiser comme les autres apps</span></li>
                        <li><span data-translate="ios_tip3">L'application ne fonctionnera pas hors ligne</span></li>
                    </ul>
                </div>
            </div>
        `;

        // Ajouter les styles spécifiques iOS
        const style = document.createElement('style');
        style.textContent = `
            .ios-instructions {
                background: linear-gradient(135deg, #f8f9fa, #e9ecef);
                border: 2px solid #007AFF;
            }

            .ios-instructions .pwa-manual-content h3 {
                color: #007AFF;
            }

            .ios-detail {
                color: #666;
                font-size: 0.85em;
                margin-top: 5px;
                display: block;
                font-style: italic;
            }

            .ios-tips {
                margin: 20px 0;
                padding: 15px;
                background: #e3f2fd;
                border-radius: 8px;
                border-left: 4px solid #007AFF;
            }

            .ios-tips h4 {
                margin: 0 0 10px 0;
                color: #1565c0;
            }

            .ios-tips ul {
                margin: 10px 0;
                padding-left: 20px;
            }

            .ios-tips li {
                margin: 5px 0;
                color: #424242;
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(instructions);
        
        // Appliquer les traductions si le manager est disponible
        if (window.translationManager && typeof window.translationManager.applyTranslations === 'function') {
            window.translationManager.applyTranslations();
        }
    }
    
    updateBrowserInstructions() {
        const browserInstructions = document.getElementById('browser-instructions');
        if (!browserInstructions) return;
        
        const userAgent = navigator.userAgent;
        let instructions = '';
        
        if (userAgent.includes('Chrome') || userAgent.includes('Edg')) {
            instructions = 'Cherchez l\'icône <img src="images/partager_ios.png" alt="Installer" style="height:1.3em;vertical-align:-0.2em;"> ou "Installer" dans la barre d\'adresse (en haut à droite)';
        } else if (userAgent.includes('Safari') && userAgent.includes('Mobile')) {
            instructions = 'Appuyez sur le bouton "Partager" (📤) puis "Sur l\'écran d\'accueil"';
        } else if (userAgent.includes('Firefox')) {
            instructions = 'Cherchez l\'icône <img src="images/partager_ios.png" alt="Installer" style="height:1.3em;vertical-align:-0.2em;"> ou "Installer" dans la barre d\'adresse';
        } else if (userAgent.includes('SamsungBrowser')) {
            instructions = 'Appuyez sur Menu (⋮) puis "Ajouter à l\'écran d\'accueil"';
        } else {
            instructions = 'Cherchez l\'icône d\'installation dans la barre d\'adresse ou le menu du navigateur';
        }
        
        browserInstructions.textContent = instructions;
    }
}

// Initialiser l'installateur PWA
let pwaInstaller;
document.addEventListener('DOMContentLoaded', () => {
    pwaInstaller = new PWAInstaller();
});

// Exposer globalement pour le débogage
window.PWAInstaller = PWAInstaller;

// Fonctions utilitaires pour les tests
window.showInstallPrompt = () => {
    if (pwaInstaller) {
        pwaInstaller.showInstallPrompt();
    }
};

window.showManualInstructions = () => {
    if (pwaInstaller) {
        pwaInstaller.showManualInstallInstructions();
    }
}; 