import * as THREE from 'three'

export class ProjectZoneManager {
    constructor(projects) {
        this.projects = projects
        this.activeZone = null
        this.linkContainer = null
        this.linkElement = null

        this.setupUI()
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
     * Update interaction zones based on character position
     * @param {THREE.Vector3} characterPosition - Current character position
     */
    update(characterPosition) {
        let inAnyZone = false

        for (const project of this.projects) {
            const isInside = this.isCharacterInZone(characterPosition, project)

            if (isInside) {
                inAnyZone = true
                if (this.activeZone !== project) {
                    this.enterZone(project)
                }
                break // Only one zone can be active at a time
            }
        }

        if (!inAnyZone && this.activeZone) {
            this.exitZone()
        }
    }

    /**
     * Check if character is inside a project zone
     * @param {THREE.Vector3} characterPosition - Character position
     * @param {Object} project - Project configuration with zone properties
     * @returns {boolean} - True if character is in zone
     */
    // In src/interaction/ProjectZoneManager.js

    isCharacterInZone(characterPosition, project, signpostMesh) {
        if (!signpostMesh) return false;

        // Create an inverse matrix of the signpost's world transformation
        const inverseMatrix = new THREE.Matrix4();
        inverseMatrix.copy(signpostMesh.matrixWorld).invert();

        // Transform the character's world position into the signpost's local space
        const localCharPos = characterPosition.clone().applyMatrix4(inverseMatrix);

        const halfWidth = project.zoneWidth / 2;
        const halfDepth = project.zoneDepth / 2;

        // Now, perform a simple AABB check in the signpost's local space
        return (
            localCharPos.x > -halfWidth &&
            localCharPos.x < halfWidth &&
            localCharPos.z > -halfDepth &&
            localCharPos.z < halfDepth
        );
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
        return this.projects.map(project => ({
            name: project.name,
            position: project.position,
            width: project.zoneWidth,
            depth: project.zoneDepth,
            url: project.url
        }))
    }

    /**
     * Add visual debug helpers for zones (optional)
     * @param {THREE.Scene} scene - Three.js scene
     * @param {boolean} visible - Whether helpers should be visible
     */
    addDebugHelpers(scene, visible = false) {
        this.debugHelpers = []

        this.projects.forEach((project, index) => {
            // Create a wireframe box to visualize the zone
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
            helper.position.copy(project.position)
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
    updateProjects(newProjects) {
        this.projects = newProjects

        // Exit current zone if it no longer exists
        if (this.activeZone) {
            const stillExists = newProjects.some(project => project === this.activeZone)
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

        this.projects = []
        this.linkContainer = null
        this.linkElement = null

        console.log('ProjectZoneManager disposed')
    }
}
