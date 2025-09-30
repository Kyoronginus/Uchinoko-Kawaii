import * as THREE from 'three'

/**
 * @deprecated This class has been replaced by ProximityInteractionManager
 * Please use ProximityInteractionManager instead for proximity-based URL interactions.
 * This file is kept for backward compatibility but may be removed in future versions.
 */
export class ProjectZoneManager {
    constructor(projectEntries, scene = null) {
        console.warn('⚠️ ProjectZoneManager is deprecated. Please use ProximityInteractionManager instead.')
        // Expect array of { mesh, item }
        this.projectEntries = projectEntries
        this.activeZone = null
        this.linkContainer = null
        this.linkElement = null
        this.scene = scene
        this.zoneVisualizers = [] // Store zone visualizer meshes

        console.log('ProjectZoneManager initialized with', projectEntries.length, 'entries')
        projectEntries.forEach((entry, i) => {
            const meshPos = entry.mesh ? `(${entry.mesh.position.x.toFixed(1)}, ${entry.mesh.position.y.toFixed(1)}, ${entry.mesh.position.z.toFixed(1)})` : 'NO MESH'
            console.log(`  Entry ${i}: ${entry.item.name}`, {
                configPos: `(${entry.item.position.x}, ${entry.item.position.z})`,
                meshPos: meshPos,
                url: entry.item.url,
                hasMesh: !!entry.mesh,
                hasUrl: !!entry.item.url,
                hasName: !!entry.item.name
            })
        })

        this.setupUI()

        // Add visual indicators if scene is provided
        if (this.scene) {
            // this.addZoneVisualizers()
        }
    }

    /**
     * Initialize UI elements for project links
     */
    setupUI() {
        this.linkContainer = document.getElementById('project-link-container')
        if (this.linkContainer) {
            this.linkElement = this.linkContainer.querySelector('a')
        }

        if (!this.linkContainer || !this.linkElement) {
            console.warn('Project link UI elements not found')
        }
    }

    /**
     * Add visual indicators for project zones
     * Shows circular proximity ranges for distance-based detection
     */
    addZoneVisualizers() {
        if (!this.scene) return

        const interactionDistance = 3.5 // Match the distance threshold in update()

        for (const entry of this.projectEntries) {
            const project = entry.item
            const mesh = entry.mesh

            if (!mesh || !project.url || !project.name) continue

            // Create a circular ring geometry for the zone indicator
            const circleGeometry = new THREE.RingGeometry(
                interactionDistance - 0.1, // Inner radius (slightly smaller for ring effect)
                interactionDistance,        // Outer radius
                32                          // Segments for smooth circle
            )

            const circleMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ffff, // Cyan color for project zones
                transparent: true,
                opacity: 0.3,
                side: THREE.DoubleSide
            })

            const circleRing = new THREE.Mesh(circleGeometry, circleMaterial)

            // Position the visualizer at the mesh position
            circleRing.position.copy(mesh.position)
            circleRing.position.y = 0.05 // Slightly above the floor
            circleRing.rotation.x = -Math.PI / 2 // Lay flat on ground

            this.scene.add(circleRing)
            this.zoneVisualizers.push(circleRing)

            // Add a semi-transparent filled circle
            const fillGeometry = new THREE.CircleGeometry(interactionDistance, 32)
            const fillMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ffff, // Cyan
                transparent: true,
                opacity: 0.1,
                side: THREE.DoubleSide
            })

            const fillCircle = new THREE.Mesh(fillGeometry, fillMaterial)
            fillCircle.position.copy(mesh.position)
            fillCircle.position.y = 0.04 // Slightly below the ring
            fillCircle.rotation.x = -Math.PI / 2

            // this.scene.add(fillCircle)s
            // this.zoneVisualizers.push(fillCircle)

            console.log(`Added circular zone visualizer for ${project.name} at (${mesh.position.x.toFixed(2)}, ${mesh.position.z.toFixed(2)}) with radius ${interactionDistance}`)
        }

        console.log(`Created ${this.zoneVisualizers.length} zone visualizers (${this.zoneVisualizers.length / 2} circles)`)
    }

    /**
     * Remove all zone visualizers from the scene
     */
    removeZoneVisualizers() {
        if (!this.scene) return

        for (const visualizer of this.zoneVisualizers) {
            this.scene.remove(visualizer)
            if (visualizer.geometry) visualizer.geometry.dispose()
            if (visualizer.material) visualizer.material.dispose()
        }

        this.zoneVisualizers = []
    }

    /**
     * Update interaction zones based on character position
     * @param {THREE.Vector3} characterPosition - Current character position
     */
    update(characterPosition) {
        // Find the nearest project within interaction range
        // Uses simple distance-based detection instead of complex local space transformations
        let nearestProject = null
        let nearestDistance = Infinity
        const interactionDistance = 3.5 // Distance threshold for triggering popup

        // Debug: Log character position every 60 frames (about once per second)
        if (!this._frameCount) this._frameCount = 0
        this._frameCount++
        if (this._frameCount % 60 === 0) {
            console.log(`Character position: (${characterPosition.x.toFixed(1)}, ${characterPosition.y.toFixed(1)}, ${characterPosition.z.toFixed(1)}) | Checking ${this.projectEntries.length} projects`)
        }

        for (const entry of this.projectEntries) {
            const project = entry.item
            const mesh = entry.mesh

            // Skip if no mesh or missing required properties
            if (!mesh) {
                if (this._frameCount % 120 === 0) {
                    console.warn(`No mesh for project: ${project.name}`)
                }
                continue
            }

            if (!project.url || !project.name) {
                if (this._frameCount % 120 === 0) {
                    console.warn(`Missing url or name for project:`, project)
                }
                continue
            }

            // Calculate distance from character to mesh (ignoring Y axis for 2D distance)
            const charPos2D = new THREE.Vector2(characterPosition.x, characterPosition.z)
            const meshPos2D = new THREE.Vector2(mesh.position.x, mesh.position.z)
            const distance = charPos2D.distanceTo(meshPos2D)

            // Debug log when character is close
            if (distance < 15) {
                console.log(`Distance to ${project.name}: ${distance.toFixed(2)} units (char: ${characterPosition.x.toFixed(1)}, ${characterPosition.z.toFixed(1)} | mesh: ${mesh.position.x.toFixed(1)}, ${mesh.position.z.toFixed(1)})`)
            }

            // Check if this is the nearest project within range
            if (distance < interactionDistance && distance < nearestDistance) {
                nearestDistance = distance
                nearestProject = project
            }
        }

        // Update active zone based on nearest project
        if (nearestProject) {
            if (this.activeZone !== nearestProject) {
                console.log(`✅ Entering zone: ${nearestProject.name} (distance: ${nearestDistance.toFixed(2)})`)
                this.enterZone(nearestProject)
            }
        } else {
            if (this.activeZone) {
                this.exitZone()
            }
        }
    }


    /**
     * Handle entering a project zone
     * @param {Object} project - Project configuration
     */
    enterZone(project) {
        this.activeZone = project

        if (this.linkElement && this.linkContainer) {
            this.linkElement.href = project.url
            this.linkElement.textContent = project.name
            this.linkContainer.classList.remove('hidden')
        }

        console.log(`Entered project zone: ${project.name}`)

        // Dispatch custom event for other systems to listen to
        this.dispatchZoneEvent('zoneEnter', project)
    }

    /**
     * Handle exiting a project zone
     */
    exitZone() {
        const previousZone = this.activeZone
        this.activeZone = null

        if (this.linkContainer) {
            this.linkContainer.classList.add('hidden')
        }

        console.log(`Exited project zone: ${previousZone?.name || 'unknown'}`)

        // Dispatch custom event
        this.dispatchZoneEvent('zoneExit', previousZone)
    }

    /**
     * Dispatch custom zone events
     * @param {string} eventType - Type of event ('zoneEnter' or 'zoneExit')
     * @param {Object} project - Project data
     */
    dispatchZoneEvent(eventType, project) {
        const event = new CustomEvent(eventType, {
            detail: {
                project: project,
                activeZone: this.activeZone
            }
        })

        window.dispatchEvent(event)
    }

    /**
     * Get the currently active zone
     * @returns {Object|null} - Active project zone or null
     */
    getActiveZone() {
        return this.activeZone
    }

    /**
     * Check if character is in any zone
     * @returns {boolean} - True if in any zone
     */
    isInAnyZone() {
        return this.activeZone !== null
    }

    /**
     * Get all project zones for debugging
     * @returns {Array} - Array of project configurations
     */
    getZones() {
        return this.projectEntries.map(entry => ({
            name: entry.item.name,
            position: entry.mesh.position,
            width: entry.item.zoneWidth,
            depth: entry.item.zoneDepth,
            url: entry.item.url
        }))
    }

    /**
     * Add visual debug helpers for zones (optional)
     * @param {THREE.Scene} scene - Three.js scene
     * @param {boolean} visible - Whether helpers should be visible
     */
    addDebugHelpers(scene, visible = false) {
        this.debugHelpers = []

        this.projectEntries.forEach((entry) => {
            const project = entry.item
            const mesh = entry.mesh

            const geometry = new THREE.BoxGeometry(
                project.zoneWidth,
                0.1,
                project.zoneDepth
            )

            const material = new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                wireframe: true,
                transparent: true,
                opacity: 0.3
            })

            const helper = new THREE.Mesh(geometry, material)
            helper.position.copy(mesh.position)
            helper.position.y = 0.05 // Slightly above ground
            helper.visible = visible

            scene.add(helper)
            this.debugHelpers.push(helper)
        })

        console.log(`Added ${this.debugHelpers.length} zone debug helpers`)
    }

    /**
     * Toggle visibility of debug helpers
     * @param {boolean} visible - Whether helpers should be visible
     */
    setDebugHelpersVisible(visible) {
        if (this.debugHelpers) {
            this.debugHelpers.forEach(helper => {
                helper.visible = visible
            })
        }
    }

    /**
     * Update projects array (useful when signposts are added/removed)
     * @param {Array} newProjects - Updated projects array
     */
    updateProjects(newEntries) {
        this.projectEntries = newEntries

        if (this.activeZone) {
            const stillExists = newEntries.some(entry => entry.item === this.activeZone)
            if (!stillExists) {
                this.exitZone()
            }
        }
    }

    /**
     * Force exit from current zone (useful for cleanup)
     */
    forceExit() {
        if (this.activeZone) {
            this.exitZone()
        }
    }

    /**
     * Dispose of zone manager resources
     * @param {THREE.Scene} scene - Three.js scene (for removing debug helpers)
     */
    dispose(scene) {
        this.forceExit()

        if (this.debugHelpers && scene) {
            this.debugHelpers.forEach(helper => {
                scene.remove(helper)
                helper.geometry.dispose()
                helper.material.dispose()
            })
            this.debugHelpers = []
        }

        this.projectEntries = []
        this.linkContainer = null
        this.linkElement = null

        console.log('ProjectZoneManager disposed')
    }
}
