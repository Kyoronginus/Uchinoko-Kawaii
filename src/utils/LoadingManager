import * as THREE from 'three'

/**
 * Comprehensive loading manager that tracks all asset loading
 * and provides a unified loading screen experience
 */
export class LoadingManager {
    constructor() {
        // Create Three.js LoadingManager to track all asset loading
        this.threeLoadingManager = new THREE.LoadingManager()
        
        // Loading state
        this.isLoading = true
        this.loadedAssets = 0
        this.totalAssets = 0
        this.loadingProgress = 0
        this.loadingStages = []
        this.currentStage = 0
        
        // Callbacks
        this.onProgressCallbacks = []
        this.onCompleteCallbacks = []
        this.onStageCompleteCallbacks = []
        
        // Setup Three.js loading manager events
        this.setupThreeLoadingManager()
        
        // Create loading screen
        this.createLoadingScreen()
        
        console.log('LoadingManager initialized')
    }

    setupThreeLoadingManager() {
        this.threeLoadingManager.onStart = (url, itemsLoaded, itemsTotal) => {
            console.log('Started loading:', url)
            this.totalAssets = itemsTotal
            this.updateProgress()
        }

        this.threeLoadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
            console.log('Loading progress:', url, `${itemsLoaded}/${itemsTotal}`)
            this.loadedAssets = itemsLoaded
            this.totalAssets = itemsTotal
            this.updateProgress()
        }

        this.threeLoadingManager.onLoad = () => {
            console.log('All Three.js assets loaded')
            this.completeLoading()
        }

        this.threeLoadingManager.onError = (url) => {
            console.error('Error loading asset:', url)
        }
    }

    createLoadingScreen() {
        // Create loading screen HTML
        const loadingScreen = document.createElement('div')
        loadingScreen.id = 'loading-screen'
        loadingScreen.innerHTML = `
            <div class="loading-container">
                <div class="loading-logo">
                    <h1>VENNA</h1>
                    <p>HD-2D Experience</p>
                </div>
                <div class="loading-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" id="progress-fill"></div>
                    </div>
                    <div class="progress-text">
                        <span id="progress-percentage">0%</span>
                        <span id="progress-stage">Initializing...</span>
                    </div>
                </div>
                <div class="loading-tips">
                    <p id="loading-tip">Preparing your 3D experience...</p>
                </div>
            </div>
        `

        // Add CSS styles
        const style = document.createElement('style')
        style.textContent = `
            #loading-screen {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999;
                font-family: 'Arial', sans-serif;
                color: white;
                transition: opacity 0.5s ease-out;
            }

            .loading-container {
                text-align: center;
                max-width: 400px;
                padding: 2rem;
            }

            .loading-logo h1 {
                font-size: 3rem;
                margin: 0;
                font-weight: bold;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
                letter-spacing: 0.2em;
            }

            .loading-logo p {
                font-size: 1.2rem;
                margin: 0.5rem 0 2rem 0;
                opacity: 0.8;
            }

            .loading-progress {
                margin: 2rem 0;
            }

            .progress-bar {
                width: 100%;
                height: 8px;
                background: rgba(255,255,255,0.2);
                border-radius: 4px;
                overflow: hidden;
                margin-bottom: 1rem;
            }

            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #4CAF50, #8BC34A);
                width: 0%;
                transition: width 0.3s ease;
                border-radius: 4px;
            }

            .progress-text {
                display: flex;
                justify-content: space-between;
                font-size: 0.9rem;
                opacity: 0.9;
            }

            .loading-tips {
                margin-top: 2rem;
                font-size: 0.9rem;
                opacity: 0.7;
                min-height: 1.5rem;
            }

            #loading-tip {
                margin: 0;
                animation: fadeInOut 3s ease-in-out infinite;
            }

            @keyframes fadeInOut {
                0%, 100% { opacity: 0.7; }
                50% { opacity: 1; }
            }

            .loading-screen-hidden {
                opacity: 0;
                pointer-events: none;
            }
        `

        document.head.appendChild(style)
        document.body.appendChild(loadingScreen)

        // Store references
        this.loadingScreen = loadingScreen
        this.progressFill = document.getElementById('progress-fill')
        this.progressPercentage = document.getElementById('progress-percentage')
        this.progressStage = document.getElementById('progress-stage')
        this.loadingTip = document.getElementById('loading-tip')

        // Loading tips
        this.loadingTips = [
            "Preparing your 3D experience...",
            "Loading character models...",
            "Setting up physics simulation...",
            "Initializing lighting system...",
            "Creating interactive elements...",
            "Optimizing performance...",
            "Almost ready..."
        ]
        this.currentTipIndex = 0
        this.startTipRotation()
    }

    startTipRotation() {
        setInterval(() => {
            if (this.isLoading) {
                this.currentTipIndex = (this.currentTipIndex + 1) % this.loadingTips.length
                this.loadingTip.textContent = this.loadingTips[this.currentTipIndex]
            }
        }, 2000)
    }

    addStage(name, description) {
        this.loadingStages.push({ name, description, completed: false })
        return this.loadingStages.length - 1
    }

    completeStage(stageIndex) {
        if (this.loadingStages[stageIndex]) {
            this.loadingStages[stageIndex].completed = true
            this.onStageCompleteCallbacks.forEach(callback => callback(stageIndex, this.loadingStages[stageIndex]))
            this.updateStageDisplay()
        }
    }

    updateStageDisplay() {
        const completedStages = this.loadingStages.filter(stage => stage.completed).length
        const totalStages = this.loadingStages.length
        
        if (totalStages > 0) {
            const stageProgress = (completedStages / totalStages) * 100
            this.progressStage.textContent = `Stage ${completedStages}/${totalStages}: ${this.loadingStages[this.currentStage]?.name || 'Loading...'}`
        }
    }

    updateProgress() {
        // Calculate overall progress (combine Three.js loading + stages)
        const assetProgress = this.totalAssets > 0 ? (this.loadedAssets / this.totalAssets) * 70 : 0 // 70% for assets
        const stageProgress = this.loadingStages.length > 0 ? 
            (this.loadingStages.filter(s => s.completed).length / this.loadingStages.length) * 30 : 0 // 30% for stages
        
        this.loadingProgress = Math.min(100, assetProgress + stageProgress)
        
        // Update UI
        this.progressFill.style.width = `${this.loadingProgress}%`
        this.progressPercentage.textContent = `${Math.round(this.loadingProgress)}%`
        
        // Notify callbacks
        this.onProgressCallbacks.forEach(callback => callback(this.loadingProgress))
    }

    completeLoading() {
        this.isLoading = false
        this.loadingProgress = 100
        this.updateProgress()
        
        // Wait a moment then hide loading screen
        setTimeout(() => {
            this.hideLoadingScreen()
            this.onCompleteCallbacks.forEach(callback => callback())
        }, 500)
    }

    hideLoadingScreen() {
        this.loadingScreen.classList.add('loading-screen-hidden')
        
        // Remove from DOM after transition
        setTimeout(() => {
            if (this.loadingScreen.parentNode) {
                this.loadingScreen.parentNode.removeChild(this.loadingScreen)
            }
        }, 500)
        
        console.log('Loading screen hidden')
    }

    // Event listeners
    onProgress(callback) {
        this.onProgressCallbacks.push(callback)
    }

    onComplete(callback) {
        this.onCompleteCallbacks.push(callback)
    }

    onStageComplete(callback) {
        this.onStageCompleteCallbacks.push(callback)
    }

    // Get the Three.js LoadingManager instance for use with loaders
    getThreeLoadingManager() {
        return this.threeLoadingManager
    }
    /**
     * Force complete loading (for testing or emergency situations)
     */
    forceComplete() {
        console.warn('Force completing loading process')
        this.completeLoading()
    }
}
