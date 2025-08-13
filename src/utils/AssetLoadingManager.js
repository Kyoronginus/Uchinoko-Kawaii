import * as THREE from 'three'

/**
 * Enhanced asset loading manager that wraps Three.js LoadingManager
 * with a professional loading screen and progress tracking
 */
export class AssetLoadingManager {
    constructor() {
        // Create Three.js LoadingManager
        this.loadingManager = new THREE.LoadingManager()
        
        // Loading state
        this.isLoading = true
        this.loadedItems = 0
        this.totalItems = 0
        this.loadingProgress = 0
        
        // Callbacks
        this.onCompleteCallbacks = []
        this.onProgressCallbacks = []
        this.onErrorCallbacks = []
        
        // Setup Three.js loading manager events
        this.setupLoadingManager()
        
        // Create and show loading screen
        this.createLoadingScreen()
        
        console.log('AssetLoadingManager initialized')
    }

    setupLoadingManager() {
        // Called when loading starts
        this.loadingManager.onStart = (url, itemsLoaded, itemsTotal) => {
            console.log('Started loading file: ' + url)
            console.log('Loaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.')
            this.totalItems = itemsTotal
            this.updateProgress(itemsLoaded, itemsTotal)
        }

        // Called when each item loads
        this.loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
            console.log('Loading file: ' + url)
            console.log('Loaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.')
            this.loadedItems = itemsLoaded
            this.totalItems = itemsTotal
            this.updateProgress(itemsLoaded, itemsTotal)
        }

        // Called when all items are loaded
        this.loadingManager.onLoad = () => {
            console.log('All assets loaded!')
            this.completeLoading()
        }

        // Called when there's an error
        this.loadingManager.onError = (url) => {
            console.error('There was an error loading ' + url)
            this.onErrorCallbacks.forEach(callback => callback(url))
        }
    }

    createLoadingScreen() {
        // Create loading screen HTML
        const loadingScreen = document.createElement('div')
        loadingScreen.id = 'asset-loading-screen'
        loadingScreen.innerHTML = `
            <div class="loading-container">
                <div class="loading-header">
                    <h1 class="loading-title">VENNA</h1>
                    <p class="loading-subtitle">HD-2D Experience</p>
                </div>
                
                <div class="loading-progress-section">
                    <div class="progress-bar-container">
                        <div class="progress-bar">
                            <div class="progress-fill" id="progress-fill"></div>
                        </div>
                        <div class="progress-text">
                            <span id="progress-percentage">0%</span>
                            <span id="progress-status">Initializing...</span>
                        </div>
                    </div>
                </div>
                
                <div class="loading-info">
                    <p id="loading-message">Preparing your 3D experience...</p>
                    <div class="loading-spinner"></div>
                </div>
            </div>
        `

        // Add CSS styles
        const style = document.createElement('style')
        style.textContent = `
            #asset-loading-screen {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                color: white;
                opacity: 1;
                transition: opacity 0.8s ease-out;
            }

            .loading-container {
                text-align: center;
                max-width: 500px;
                padding: 3rem;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 20px;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            }

            .loading-header {
                margin-bottom: 3rem;
            }

            .loading-title {
                font-size: 3.5rem;
                font-weight: 700;
                margin: 0;
                background: linear-gradient(45deg, #64b5f6, #42a5f5, #2196f3);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                letter-spacing: 0.3em;
                text-shadow: 0 0 30px rgba(33, 150, 243, 0.5);
            }

            .loading-subtitle {
                font-size: 1.3rem;
                margin: 1rem 0 0 0;
                opacity: 0.8;
                font-weight: 300;
                letter-spacing: 0.1em;
            }

            .loading-progress-section {
                margin: 2.5rem 0;
            }

            .progress-bar-container {
                margin-bottom: 1.5rem;
            }

            .progress-bar {
                width: 100%;
                height: 6px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 3px;
                overflow: hidden;
                margin-bottom: 1rem;
                position: relative;
            }

            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #2196f3, #64b5f6, #42a5f5);
                width: 0%;
                transition: width 0.4s ease;
                border-radius: 3px;
                position: relative;
                overflow: hidden;
            }

            .progress-fill::after {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
                animation: shimmer 2s infinite;
            }

            @keyframes shimmer {
                0% { left: -100%; }
                100% { left: 100%; }
            }

            .progress-text {
                display: flex;
                justify-content: space-between;
                font-size: 0.95rem;
                opacity: 0.9;
                font-weight: 500;
            }

            .loading-info {
                margin-top: 2rem;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 1.5rem;
            }

            #loading-message {
                margin: 0;
                font-size: 1rem;
                opacity: 0.8;
                font-weight: 400;
            }

            .loading-spinner {
                width: 40px;
                height: 40px;
                border: 3px solid rgba(255, 255, 255, 0.1);
                border-top: 3px solid #2196f3;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .loading-screen-hidden {
                opacity: 0;
                pointer-events: none;
            }

            /* Responsive design */
            @media (max-width: 768px) {
                .loading-container {
                    max-width: 90%;
                    padding: 2rem;
                }
                
                .loading-title {
                    font-size: 2.5rem;
                }
                
                .loading-subtitle {
                    font-size: 1.1rem;
                }
            }
        `

        document.head.appendChild(style)
        document.body.appendChild(loadingScreen)

        // Store references
        this.loadingScreen = loadingScreen
        this.progressFill = document.getElementById('progress-fill')
        this.progressPercentage = document.getElementById('progress-percentage')
        this.progressStatus = document.getElementById('progress-status')
        this.loadingMessage = document.getElementById('loading-message')

        // Loading messages that rotate
        this.loadingMessages = [
            "Loading 3D models...",
            "Preparing textures...",
            "Setting up physics...",
            "Initializing lighting...",
            "Creating interactive elements...",
            "Optimizing performance...",
            "Almost ready..."
        ]
        this.currentMessageIndex = 0
        this.startMessageRotation()
    }

    startMessageRotation() {
        this.messageInterval = setInterval(() => {
            if (this.isLoading && this.loadingMessage) {
                this.currentMessageIndex = (this.currentMessageIndex + 1) % this.loadingMessages.length
                this.loadingMessage.textContent = this.loadingMessages[this.currentMessageIndex]
            }
        }, 2500)
    }

    updateProgress(itemsLoaded, itemsTotal) {
        this.loadedItems = itemsLoaded
        this.totalItems = itemsTotal
        this.loadingProgress = itemsTotal > 0 ? (itemsLoaded / itemsTotal) * 100 : 0

        // Update UI
        if (this.progressFill) {
            this.progressFill.style.width = `${this.loadingProgress}%`
        }
        if (this.progressPercentage) {
            this.progressPercentage.textContent = `${Math.round(this.loadingProgress)}%`
        }
        if (this.progressStatus) {
            this.progressStatus.textContent = `${itemsLoaded}/${itemsTotal} assets`
        }

        // Notify callbacks
        this.onProgressCallbacks.forEach(callback => callback(this.loadingProgress, itemsLoaded, itemsTotal))
    }

    completeLoading() {
        this.isLoading = false
        this.loadingProgress = 100
        
        // Clear message rotation
        if (this.messageInterval) {
            clearInterval(this.messageInterval)
        }

        // Update final UI state
        if (this.progressFill) this.progressFill.style.width = '100%'
        if (this.progressPercentage) this.progressPercentage.textContent = '100%'
        if (this.loadingMessage) this.loadingMessage.textContent = 'Loading complete!'

        // Wait a moment then hide loading screen
        setTimeout(() => {
            this.hideLoadingScreen()
            this.onCompleteCallbacks.forEach(callback => callback())
        }, 800)
    }

    hideLoadingScreen() {
        if (this.loadingScreen) {
            this.loadingScreen.classList.add('loading-screen-hidden')
            
            // Remove from DOM after transition
            setTimeout(() => {
                if (this.loadingScreen && this.loadingScreen.parentNode) {
                    this.loadingScreen.parentNode.removeChild(this.loadingScreen)
                }
            }, 800)
        }
        
        console.log('Loading screen hidden')
    }

    // Public API methods
    onComplete(callback) {
        this.onCompleteCallbacks.push(callback)
    }

    onProgress(callback) {
        this.onProgressCallbacks.push(callback)
    }

    onError(callback) {
        this.onErrorCallbacks.push(callback)
    }

    // Get the Three.js LoadingManager instance
    getLoadingManager() {
        return this.loadingManager
    }

    // Force complete (for testing)
    forceComplete() {
        console.warn('Force completing loading process')
        this.completeLoading()
    }
}
