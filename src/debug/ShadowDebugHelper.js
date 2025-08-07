import * as THREE from 'three'

export class ShadowDebugHelper {
    constructor(scene, camera) {
        this.scene = scene
        this.camera = camera
        this.debugObjects = []
        this.enabled = false
    }

    /**
     * Enable or disable shadow debugging
     * @param {boolean} enabled - Whether to show debug helpers
     */
    setEnabled(enabled) {
        this.enabled = enabled
        this.debugObjects.forEach(obj => {
            obj.visible = enabled
        })
    }

    /**
     * Add debug visualization for shadow casting objects
     * @param {THREE.Light} light - The shadow casting light
     */
    addLightHelper(light) {
        if (light.isDirectionalLight && light.castShadow) {
            // Create shadow camera helper
            const helper = new THREE.CameraHelper(light.shadow.camera)
            helper.visible = this.enabled
            this.scene.add(helper)
            this.debugObjects.push(helper)

            // Create light direction helper
            const lightHelper = new THREE.DirectionalLightHelper(light, 5)
            lightHelper.visible = this.enabled
            this.scene.add(lightHelper)
            this.debugObjects.push(lightHelper)

            console.log('Added shadow debug helpers for directional light')
        }
    }

    /**
     * Add debug visualization for shadow receiving surfaces
     * @param {THREE.Mesh} mesh - The shadow receiving mesh
     * @param {number} color - Debug color (default: green)
     */
    addShadowReceiver(mesh, color = 0x00ff00) {
        const wireframe = new THREE.WireframeGeometry(mesh.geometry)
        const material = new THREE.LineBasicMaterial({ 
            color: color,
            transparent: true,
            opacity: 0.3
        })
        const wireframeMesh = new THREE.LineSegments(wireframe, material)
        
        wireframeMesh.position.copy(mesh.position)
        wireframeMesh.rotation.copy(mesh.rotation)
        wireframeMesh.scale.copy(mesh.scale)
        wireframeMesh.visible = this.enabled

        this.scene.add(wireframeMesh)
        this.debugObjects.push(wireframeMesh)

        console.log('Added shadow receiver debug helper')
    }

    /**
     * Add debug visualization for shadow casting objects
     * @param {THREE.Mesh} mesh - The shadow casting mesh
     * @param {number} color - Debug color (default: red)
     */
    addShadowCaster(mesh, color = 0xff0000) {
        const wireframe = new THREE.WireframeGeometry(mesh.geometry)
        const material = new THREE.LineBasicMaterial({ 
            color: color,
            transparent: true,
            opacity: 0.5
        })
        const wireframeMesh = new THREE.LineSegments(wireframe, material)
        
        wireframeMesh.position.copy(mesh.position)
        wireframeMesh.rotation.copy(mesh.rotation)
        wireframeMesh.scale.copy(mesh.scale)
        wireframeMesh.visible = this.enabled

        this.scene.add(wireframeMesh)
        this.debugObjects.push(wireframeMesh)

        console.log('Added shadow caster debug helper')
    }

    /**
     * Create a visual representation of shadow casting areas
     * @param {Array} positions - Array of {x, z} positions where shadows should appear
     */
    addShadowMarkers(positions) {
        positions.forEach((pos, index) => {
            const geometry = new THREE.RingGeometry(0.5, 1, 8)
            const material = new THREE.MeshBasicMaterial({
                color: 0xffff00,
                transparent: true,
                opacity: 0.3,
                side: THREE.DoubleSide
            })
            
            const marker = new THREE.Mesh(geometry, material)
            marker.position.set(pos.x, 0.005, pos.z)
            marker.rotation.x = -Math.PI / 2
            marker.visible = this.enabled
            
            this.scene.add(marker)
            this.debugObjects.push(marker)
        })

        console.log(`Added ${positions.length} shadow markers`)
    }

    /**
     * Log shadow configuration information
     * @param {THREE.Scene} scene - The scene to analyze
     */
    logShadowInfo(scene) {
        console.log('=== Shadow System Debug Info ===')
        
        // Find lights
        const lights = []
        scene.traverse((child) => {
            if (child.isLight) {
                lights.push(child)
            }
        })

        console.log(`Found ${lights.length} lights:`)
        lights.forEach((light, index) => {
            console.log(`  Light ${index}: ${light.type}, castShadow: ${light.castShadow}`)
            if (light.castShadow && light.shadow) {
                console.log(`    Shadow map size: ${light.shadow.mapSize.width}x${light.shadow.mapSize.height}`)
                console.log(`    Shadow bias: ${light.shadow.bias}`)
                console.log(`    Shadow camera bounds: ${light.shadow.camera.left} to ${light.shadow.camera.right}`)
            }
        })

        // Find shadow casters
        const shadowCasters = []
        const shadowReceivers = []
        scene.traverse((child) => {
            if (child.isMesh) {
                if (child.castShadow) shadowCasters.push(child)
                if (child.receiveShadow) shadowReceivers.push(child)
            }
        })

        console.log(`Found ${shadowCasters.length} shadow casting objects`)
        console.log(`Found ${shadowReceivers.length} shadow receiving objects`)

        // Check renderer shadow settings
        const renderer = this.scene.userData.renderer
        if (renderer) {
            console.log(`Renderer shadow map enabled: ${renderer.shadowMap.enabled}`)
            console.log(`Renderer shadow map type: ${renderer.shadowMap.type}`)
        }

        console.log('=== End Shadow Debug Info ===')
    }

    /**
     * Test shadow casting by creating a simple test object
     * @param {THREE.Vector3} position - Position for the test object
     */
    createShadowTest(position = new THREE.Vector3(0, 2, 0)) {
        // Create a simple cube that should cast a shadow
        const geometry = new THREE.BoxGeometry(1, 1, 1)
        const material = new THREE.MeshLambertMaterial({ color: 0xff0000 })
        const testCube = new THREE.Mesh(geometry, material)
        
        testCube.position.copy(position)
        testCube.castShadow = true
        testCube.receiveShadow = true
        
        this.scene.add(testCube)
        this.debugObjects.push(testCube)
        
        console.log('Created shadow test cube at', position)
        return testCube
    }

    /**
     * Clean up all debug objects
     */
    dispose() {
        this.debugObjects.forEach(obj => {
            this.scene.remove(obj)
            if (obj.geometry) obj.geometry.dispose()
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(mat => mat.dispose())
                } else {
                    obj.material.dispose()
                }
            }
        })
        
        this.debugObjects = []
        console.log('Shadow debug helper disposed')
    }

    /**
     * Toggle debug mode on/off
     */
    toggle() {
        this.setEnabled(!this.enabled)
        console.log(`Shadow debug mode: ${this.enabled ? 'ON' : 'OFF'}`)
    }
}
