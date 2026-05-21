// orientation-handler.js - Gestion intelligente de l'orientation OPTIMISÉE iOS SAFARI

class OrientationHandler {
    constructor() {
        this.orientationMessage = null;
        this.lastOrientation = null;
        this.init();
    }

    init() {
        // Créer le message d'orientation s'il n'existe pas
        this.createOrientationMessage();
        
        // MESSAGE D'ORIENTATION SUPPRIMÉ
        // Plus d'écouteurs d'orientation nécessaires
    }

    createOrientationMessage() {
        // MESSAGE D'ORIENTATION SUPPRIMÉ
        // Plus besoin de forcer l'orientation sur iOS Safari
        return;
    }
    
    // MÉTHODES SUPPRIMÉES : Plus besoin de traductions et styles pour l'orientation

    handleOrientationChange() {
        // MESSAGE D'ORIENTATION SUPPRIMÉ
        // Plus de logique d'orientation nécessaire
        return;
    }

    // MÉTHODES SUPPRIMÉES : CSS gère maintenant l'orientation sur iOS Safari
    // Plus besoin de détection JavaScript qui ne fonctionne pas
    
    showDebugInfo(message) {
        // Créer ou mettre à jour l'info de débogage visuelle
        let debugInfo = document.getElementById('debug-info');
        if (!debugInfo) {
            debugInfo = document.createElement('div');
            debugInfo.id = 'debug-info';
            debugInfo.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 10px;
                border-radius: 5px;
                font-size: 12px;
                z-index: 1000001;
                max-width: 200px;
                word-wrap: break-word;
            `;
            document.body.appendChild(debugInfo);
        }
        
        // Mettre à jour le message
        debugInfo.textContent = message;
        
        // Masquer après 3 secondes
        setTimeout(() => {
            if (debugInfo) {
                debugInfo.style.opacity = '0';
                setTimeout(() => {
                    if (debugInfo) debugInfo.remove();
                }, 500);
            }
        }, 3000);
    }
}

// Initialiser le gestionnaire d'orientation
let orientationHandler;
document.addEventListener('DOMContentLoaded', () => {
    orientationHandler = new OrientationHandler();
});

// Exposer globalement pour le débogage
window.OrientationHandler = OrientationHandler; 