import * as THREE from 'three'

/**
 * ProximityInteractionManager
 * 
 * Manages proximity-based interactions with objects that have URLs.
 * Continuously detects the nearest interactive object and displays popups
 * based on distance rather than zone triggers.
 * 
 * Features:
 * - Distance-based detection (no zones)
 * - Automatic popup display for nearest URL-enabled object
 * - Smooth transitions between objects
 * - Visual proximity indicators (optional)
 * - Configurable interaction distance
 */
export class ProximityInteractionManager {
    constructor(interactiveObjects = [], scene = null, options = {}) {
        // Array of { mesh, item } where item has url and name properties
        this.interactiveObjects = interactiveObjects
        this.scene = scene
        
        // Configuration options
        this.interactionDistance = options.interactionDistance || 3.5
        this.showVisualizers = options.showVisualizers !== undefined ? options.showVisualizers : false
        this.visualizerColor = options.visualizerColor || 0x00ffff
        this.visualizerOpacity = options.visualizerOpacity || 0.3
        
        // State tracking
        this.nearestObject = null
        this.currentDistance = Infinity
        
        // UI elements
        this.popupContainer = null
        this.popupLink = null
        
        // Visual indicators
        this.visualizers = []
        
        // Debug
        this._frameCount = 0
        
        console.log('ProximityInteractionManager initialized with', interactiveObjects.length, 'interactive objects')
        this.logInteractiveObjects()
        
        this.setupUI()
        
        if (this.scene && this.showVisualizers) {
            this.createVisualizers()
        }
    }
    
    /**
     * Log information about interactive objects for debugging
     */
    logInteractiveObjects() {
        console.log('=== Interactive Objects Debug ===')
        this.interactiveObjects.forEach((entry, i) => {
            const meshPos = entry.mesh
                ? `(${entry.mesh.position.x.toFixed(1)}, ${entry.mesh.position.y.toFixed(1)}, ${entry.mesh.position.z.toFixed(1)})`
                : 'NO MESH'
            console.log(`  [${i}] ${entry.item.name}`, {
                type: entry.item.type,
                meshPos: meshPos,
                url: entry.item.url,
                hasMesh: !!entry.mesh,
                hasUrl: !!entry.item.url,
                hasName: !!entry.item.name,
                willCreateVisualizer: !!(entry.mesh && entry.item.url && entry.item.name)
            })
        })
        console.log('=================================')
    }
    
    /**
     * Initialize UI elements for displaying popup
     */
    setupUI() {
        this.popupContainer = document.getElementById('project-link-container')
        if (this.popupContainer) {
            this.popupLink = this.popupContainer.querySelector('a')
        }
        
        if (!this.popupContainer || !this.popupLink) {
            console.warn('Popup UI elements not found (looking for #project-link-container)')
        }
    }
    
    /**
     * Create visual proximity indicators around interactive objects
     */
    createVisualizers() {
        if (!this.scene) return

        console.log('🎨 Creating proximity visualizers...')
        let createdCount = 0

        for (const entry of this.interactiveObjects) {
            const item = entry.item
            const mesh = entry.mesh

            // Skip objects without required properties
            if (!mesh || !item.url || !item.name) {
                console.log(`  ⏭️ Skipping "${item.name || 'unnamed'}": mesh=${!!mesh}, url=${!!item.url}, name=${!!item.name}`)
                continue
            }
            
            // Create ring indicator at interaction distance
            const ringGeometry = new THREE.RingGeometry(
                this.interactionDistance - 0.1,
                this.interactionDistance,
                32
            )
            
            const ringMaterial = new THREE.MeshBasicMaterial({
                color: this.visualizerColor,
                transparent: true,
                opacity: this.visualizerOpacity,
                side: THREE.DoubleSide
            })
            
            const ring = new THREE.Mesh(ringGeometry, ringMaterial)
            ring.position.copy(mesh.position)
            ring.position.y = 0.05
            ring.rotation.x = -Math.PI / 2
            
            this.scene.add(ring)
            this.visualizers.push(ring)
            
            // Create filled circle indicator
            const fillGeometry = new THREE.CircleGeometry(this.interactionDistance, 32)
            const fillMaterial = new THREE.MeshBasicMaterial({
                color: this.visualizerColor,
                transparent: true,
                opacity: this.visualizerOpacity * 0.33,
                side: THREE.DoubleSide
            })
            
            const fill = new THREE.Mesh(fillGeometry, fillMaterial)
            fill.position.copy(mesh.position)
            fill.position.y = 0.04
            fill.rotation.x = -Math.PI / 2
            
            this.scene.add(fill)
            this.visualizers.push(fill)

            createdCount++
            console.log(`  ✅ Created visualizer for "${item.name}" at (${mesh.position.x.toFixed(2)}, ${mesh.position.y.toFixed(2)}, ${mesh.position.z.toFixed(2)}) with radius ${this.interactionDistance}`)
        }

        console.log(`🎨 Created ${this.visualizers.length} visualizer meshes for ${createdCount} objects`)
    }
    
    /**
     * Remove all visual indicators from the scene
     */
    removeVisualizers() {
        if (!this.scene) return
        
        for (const visualizer of this.visualizers) {
            this.scene.remove(visualizer)
            if (visualizer.geometry) visualizer.geometry.dispose()
            if (visualizer.material) visualizer.material.dispose()
        }
        
        this.visualizers = []
        console.log('Removed all proximity visualizers')
    }
    
    /**
     * Update proximity detection based on character position
     * Call this every frame with the current character position
     * 
     * @param {THREE.Vector3} characterPosition - Current character position
     */
    update(characterPosition) {
        this._frameCount++
        
        // Find nearest interactive object within range
        let nearestObject = null
        let nearestDistance = Infinity
        
        // Debug logging (occasional)
        if (this._frameCount % 60 === 0) {
            console.log(`[Proximity] Character at (${characterPosition.x.toFixed(1)}, ${characterPosition.z.toFixed(1)}) | Checking ${this.interactiveObjects.length} objects`)
        }
        
        for (const entry of this.interactiveObjects) {
            const item = entry.item
            const mesh = entry.mesh
            
            // Skip invalid entries
            if (!mesh) {
                if (this._frameCount % 120 === 0) {
                    console.warn(`[Proximity] No mesh for object: ${item.name}`)
                }
                continue
            }
            
            if (!item.url || !item.name) {
                if (this._frameCount % 120 === 0) {
                    console.warn(`[Proximity] Missing url or name for object:`, item)
                }
                continue
            }
            
            // Calculate 2D distance (ignore Y axis)
            const charPos2D = new THREE.Vector2(characterPosition.x, characterPosition.z)
            const meshPos2D = new THREE.Vector2(mesh.position.x, mesh.position.z)
            const distance = charPos2D.distanceTo(meshPos2D)
            
            // Debug log when character is nearby
            if (distance < 15 && this._frameCount % 30 === 0) {
                console.log(`[Proximity] Distance to "${item.name}": ${distance.toFixed(2)} units`)
            }
            
            // Track nearest object within interaction range
            if (distance < this.interactionDistance && distance < nearestDistance) {
                nearestDistance = distance
                nearestObject = item
            }
        }
        
        // Update popup based on nearest object
        if (nearestObject) {
            if (this.nearestObject !== nearestObject) {
                console.log(`✅ [Proximity] Now near: "${nearestObject.name}" (distance: ${nearestDistance.toFixed(2)})`)
                this.showPopup(nearestObject, nearestDistance)
            }
            this.nearestObject = nearestObject
            this.currentDistance = nearestDistance
        } else {
            if (this.nearestObject) {
                console.log(`❌ [Proximity] Left interaction range`)
                this.hidePopup()
            }
            this.nearestObject = null
            this.currentDistance = Infinity
        }
    }
    
    /**
     * Show popup for the given object
     * @param {Object} item - Object with url and name properties
     * @param {number} distance - Distance to object
     */
    showPopup(item, distance) {
        if (!this.popupContainer || !this.popupLink) return
        
        this.popupLink.href = item.url
        this.popupLink.textContent = item.name
        this.popupContainer.classList.remove('hidden')
        
        // Dispatch custom event for other systems
        this.dispatchEvent('proximityEnter', item, distance)
    }
    
    /**
     * Hide the popup
     */
    hidePopup() {
        const previousObject = this.nearestObject
        
        if (this.popupContainer) {
            this.popupContainer.classList.add('hidden')
        }
        
        // Dispatch custom event
        this.dispatchEvent('proximityExit', previousObject, this.currentDistance)
    }
    
    /**
     * Dispatch custom events for other systems to listen to
     * @param {string} eventType - 'proximityEnter' or 'proximityExit'
     * @param {Object} item - Object data
     * @param {number} distance - Distance to object
     */
    dispatchEvent(eventType, item, distance) {
        const event = new CustomEvent(eventType, {
            detail: {
                object: item,
                distance: distance,
                nearestObject: this.nearestObject
            }
        })
        
        window.dispatchEvent(event)
    }
    
    /**
     * Get the currently nearest object
     * @returns {Object|null}
     */
    getNearestObject() {
        return this.nearestObject
    }
    
    /**
     * Get the distance to the nearest object
     * @returns {number}
     */
    getCurrentDistance() {
        return this.currentDistance
    }
    
    /**
     * Check if character is near any interactive object
     * @returns {boolean}
     */
    isNearAnyObject() {
        return this.nearestObject !== null
    }
    
    /**
     * Update the list of interactive objects
     * @param {Array} newObjects - New array of { mesh, item } objects
     */
    updateInteractiveObjects(newObjects) {
        this.interactiveObjects = newObjects
        
        // If current nearest object no longer exists, hide popup
        if (this.nearestObject) {
            const stillExists = newObjects.some(entry => entry.item === this.nearestObject)
            if (!stillExists) {
                this.hidePopup()
            }
        }
        
        // Recreate visualizers if enabled
        if (this.scene && this.showVisualizers) {
            this.removeVisualizers()
            this.createVisualizers()
        }
        
        console.log('Updated interactive objects list:', newObjects.length, 'objects')
    }
    
    /**
     * Set interaction distance
     * @param {number} distance - New interaction distance
     */
    setInteractionDistance(distance) {
        this.interactionDistance = distance
        
        // Recreate visualizers with new distance
        if (this.scene && this.showVisualizers) {
            this.removeVisualizers()
            this.createVisualizers()
        }
        
        console.log('Interaction distance updated to:', distance)
    }
    
    /**
     * Toggle visualizers on/off
     * @param {boolean} show - Whether to show visualizers
     */
    setVisualizersVisible(show) {
        if (show && !this.showVisualizers) {
            this.showVisualizers = true
            this.createVisualizers()
        } else if (!show && this.showVisualizers) {
            this.showVisualizers = false
            this.removeVisualizers()
        }
    }
    
    /**
     * Clean up resources
     */
    dispose() {
        this.hidePopup()
        this.removeVisualizers()
        
        this.interactiveObjects = []
        this.nearestObject = null
        this.popupContainer = null
        this.popupLink = null
        
        console.log('ProximityInteractionManager disposed')
    }
}

