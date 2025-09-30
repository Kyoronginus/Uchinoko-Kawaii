import * as THREE from 'three'

/**
 * GrabbedObjectScaleZoneManager
 * - Manages zones that scale grabbed objects when the character enters them
 * - Only affects objects currently being held by the character
 * - Provides visual floor indicators for zone boundaries
 * - Supports smooth scaling with limits
 */
export class GrabbedObjectScaleZoneManager {
    /**
     * @param {Object} params
     * @param {Array} params.zones Array of zone definitions
     * @param {import('../physics/PhysicsManager').PhysicsManager} physicsManager
     */
    constructor({ zones = [] } = {}, physicsManager = null) {
        this.physics = physicsManager
        this.zones = zones.map(z => ({
            ...z,
            speed: typeof z.speed === 'number' ? z.speed : 2.0,
            minScale: typeof z.minScale === 'number' ? z.minScale : 0.5,
            maxScale: typeof z.maxScale === 'number' ? z.maxScale : 3.0,
            _floorIndicator: null,
        }))

        // Track original scales per mesh for reset functionality
        this._originalScaleMap = new WeakMap()

        // Temp vectors for calculations
        this._tmp = {
            min: new THREE.Vector3(),
            max: new THREE.Vector3(),
            pos: new THREE.Vector3(),
            half: new THREE.Vector3(),
        }
    }

    /**
     * Check if a point is inside an AABB zone
     */
    isInsideAABB(point, center, size) {
        this._tmp.half.copy(size).multiplyScalar(0.5)
        this._tmp.min.copy(center).sub(this._tmp.half)
        this._tmp.max.copy(center).add(this._tmp.half)
        
        return (
            point.x >= this._tmp.min.x && point.x <= this._tmp.max.x &&
            point.y >= this._tmp.min.y && point.y <= this._tmp.max.y &&
            point.z >= this._tmp.min.z && point.z <= this._tmp.max.z
        )
    }

    /**
     * Update zones each frame - only affects grabbed objects
     * @param {THREE.Vector3} characterPosition - Character's world position
     * @param {number} deltaTime - Frame delta time
     */
    update(characterPosition, deltaTime) {
        if (!this.physics || deltaTime <= 0) return

        // Only process if character is grabbing something
        if (!this.physics.isGrabbing()) return

        const grabbedBody = this.physics.getGrabbedBody()
        if (!grabbedBody) return

        const grabbedMesh = this.physics.getMeshForBody(grabbedBody)
        if (!grabbedMesh) return

        // Check which zone the character is in
        for (const zone of this.zones) {
            if (this.isInsideAABB(characterPosition, zone.center, zone.size)) {
                this.applyScaling(grabbedMesh, zone, deltaTime)
                break // Only apply one zone at a time
            }
        }
    }

    /**
     * Apply scaling to the grabbed object
     */
    applyScaling(mesh, zone, deltaTime) {
        // Store original scale if not already stored
        if (!this._originalScaleMap.has(mesh)) {
            this._originalScaleMap.set(mesh, mesh.scale.clone())
        }

        const originalScale = this._originalScaleMap.get(mesh)
        const currentScale = mesh.scale

        // Calculate incremental scale change based on zone mode
        let scaleDirection = 1
        if (zone.mode === 'enlarge') {
            scaleDirection = 1 // Grow larger
        } else if (zone.mode === 'shrink') {
            scaleDirection = -1 // Grow smaller
        } else {
            return // Unknown mode
        }

        // Calculate gradual scale increment (much smaller steps for smoother scaling)
        const scaleIncrement = zone.speed * deltaTime * 0.5 * scaleDirection // Reduced speed for smoother effect

        // Apply incremental scaling
        const newScale = new THREE.Vector3(
            currentScale.x + (scaleIncrement * originalScale.x),
            currentScale.y + (scaleIncrement * originalScale.y),
            currentScale.z + (scaleIncrement * originalScale.z)
        )

        // Apply scale limits based on original scale
        newScale.x = THREE.MathUtils.clamp(newScale.x, originalScale.x * zone.minScale, originalScale.x * zone.maxScale)
        newScale.y = THREE.MathUtils.clamp(newScale.y, originalScale.y * zone.minScale, originalScale.y * zone.maxScale)
        newScale.z = THREE.MathUtils.clamp(newScale.z, originalScale.z * zone.minScale, originalScale.z * zone.maxScale)

        // Apply scale if there's a significant change
        const threshold = 1e-4
        if (Math.abs(newScale.x - currentScale.x) > threshold ||
            Math.abs(newScale.y - currentScale.y) > threshold ||
            Math.abs(newScale.z - currentScale.z) > threshold) {

            mesh.scale.copy(newScale)
            mesh.updateMatrixWorld(true)

            // Update physics body to match new scale (less frequently for performance)
            if (this.physics && this.physics.rebuildShapeForMesh) {
                // Only rebuild physics every few frames to avoid performance issues
                if (!mesh._lastPhysicsUpdate) mesh._lastPhysicsUpdate = 0
                if (Date.now() - mesh._lastPhysicsUpdate > 100) { // Update physics every 100ms
                    this.physics.rebuildShapeForMesh(mesh)
                    mesh._lastPhysicsUpdate = Date.now()
                }
            }
        }
    }

    /**
     * Add white bordered rectangle indicators for zones
     */
    addFloorIndicators(scene) {
        if (!scene) return

        for (const zone of this.zones) {
            // Create white bordered rectangle using EdgesGeometry for clean lines
            const planeGeometry = new THREE.PlaneGeometry(zone.size.x, zone.size.z)
            const edges = new THREE.EdgesGeometry(planeGeometry)

            // Create white border lines
            const borderMaterial = new THREE.LineBasicMaterial({
                color: 0xffffff,
                linewidth: 2,
                transparent: true,
                opacity: 0.9
            })

            const borderLines = new THREE.LineSegments(edges, borderMaterial)
            borderLines.position.set(zone.center.x, 0.02, zone.center.z) // Slightly above floor
            borderLines.rotation.x = -Math.PI / 2 // Rotate to lie flat on floor

            scene.add(borderLines)
            zone._floorIndicator = borderLines

            // Add a subtle colored fill to indicate zone type
            const fillMaterial = new THREE.MeshBasicMaterial({
                color: zone.mode === 'enlarge' ? 0x00ff00 : 0xff4444,
                transparent: true,
                opacity: 0.1,
                side: THREE.DoubleSide
            })

            const fillPlane = new THREE.Mesh(planeGeometry.clone(), fillMaterial)
            fillPlane.position.set(zone.center.x, 0.01, zone.center.z) // Slightly below border
            fillPlane.rotation.x = -Math.PI / 2

            scene.add(fillPlane)
            zone._fillIndicator = fillPlane

            // Clean up geometry
            planeGeometry.dispose()
        }
    }

    /**
     * Set visibility of floor indicators
     */
    setIndicatorsVisible(visible) {
        for (const zone of this.zones) {
            if (zone._floorIndicator) {
                zone._floorIndicator.visible = visible
            }
            if (zone._fillIndicator) {
                zone._fillIndicator.visible = visible
            }
        }
    }

    /**
     * Clean up resources
     */
    dispose() {
        for (const zone of this.zones) {
            if (zone._floorIndicator) {
                zone._floorIndicator.geometry.dispose()
                zone._floorIndicator.material.dispose()
            }
            if (zone._fillIndicator) {
                zone._fillIndicator.geometry.dispose()
                zone._fillIndicator.material.dispose()
            }
        }
    }
}
