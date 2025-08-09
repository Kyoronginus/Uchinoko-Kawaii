import * as THREE from 'three'

export class LightingManager {
    constructor(scene) {
        this.scene = scene
        this.lights = {}
        
        // Default lighting configuration
        this.config = {
            ambient: {
                color: 0xffffff,
                intensity: 2
            },
            directional: {
                color: 0xffffff,
                intensity: 3.5,
                position: { x: 20, y: 10, z: 10 },
                castShadow: true,
                shadow: {
                    mapSize: { width: 256, height: 256 }, // Higher resolution for crisp shadows
                    camera: {
                        near: 0.1,
                        far: 100,
                        left: -50,
                        right: 50,
                        top: 50,
                        bottom: -50
                    },
                    bias: -0.010, // Reduced bias for sharper shadows
                    normalBias: 0.001 // Reduced normal bias
                }
            }
        }
    }

    /**
     * Initialize all lights in the scene
     */
    setupLighting() {
        this.createAmbientLight()
        this.createDirectionalLight()
        
        console.log('Lighting system initialized')
    }

    /**
     * Create and configure ambient light
     */
    createAmbientLight() {
        const ambientLight = new THREE.AmbientLight(
            this.config.ambient.color,
            this.config.ambient.intensity
        )
        
        this.lights.ambient = ambientLight
        this.scene.add(ambientLight)
        
        console.log('Ambient light created')
    }

    /**
     * Create and configure directional light with shadows
     */
    createDirectionalLight() {
        const directionalLight = new THREE.DirectionalLight(
            this.config.directional.color,
            this.config.directional.intensity
        )
        
        // Set position
        const pos = this.config.directional.position
        directionalLight.position.set(pos.x, pos.y, pos.z)
        
        // Enable shadow casting
        directionalLight.castShadow = this.config.directional.castShadow
        
        // Configure shadow properties
        this.configureShadows(directionalLight)
        
        this.lights.directional = directionalLight
        this.scene.add(directionalLight)
        
        console.log('Directional light created with shadows')
    }

    /**
     * Configure shadow properties for directional light
     * @param {THREE.DirectionalLight} light - The directional light
     */
    configureShadows(light) {
        const shadowConfig = this.config.directional.shadow
        
        // Shadow camera configuration
        light.shadow.camera.near = shadowConfig.camera.near
        light.shadow.camera.far = shadowConfig.camera.far
        light.shadow.camera.left = shadowConfig.camera.left
        light.shadow.camera.right = shadowConfig.camera.right
        light.shadow.camera.top = shadowConfig.camera.top
        light.shadow.camera.bottom = shadowConfig.camera.bottom
        
        // Shadow map quality settings
        light.shadow.mapSize.width = shadowConfig.mapSize.width
        light.shadow.mapSize.height = shadowConfig.mapSize.height
        light.shadow.bias = shadowConfig.bias
        light.shadow.normalBias = shadowConfig.normalBias
    }

    /**
     * Update ambient light intensity
     * @param {number} intensity - New intensity value
     */
    setAmbientIntensity(intensity) {
        if (this.lights.ambient) {
            this.lights.ambient.intensity = intensity
            this.config.ambient.intensity = intensity
        }
    }

    /**
     * Update directional light intensity
     * @param {number} intensity - New intensity value
     */
    setDirectionalIntensity(intensity) {
        if (this.lights.directional) {
            this.lights.directional.intensity = intensity
            this.config.directional.intensity = intensity
        }
    }

    /**
     * Update directional light position
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} z - Z position
     */
    setDirectionalPosition(x, y, z) {
        if (this.lights.directional) {
            this.lights.directional.position.set(x, y, z)
            this.config.directional.position = { x, y, z }
        }
    }

    /**
     * Toggle shadow casting for directional light
     * @param {boolean} enabled - Whether shadows should be enabled
     */
    setShadowsEnabled(enabled) {
        if (this.lights.directional) {
            this.lights.directional.castShadow = enabled
            this.config.directional.castShadow = enabled
        }
    }

    /**
     * Update shadow map resolution
     * @param {number} width - Shadow map width
     * @param {number} height - Shadow map height
     */
    setShadowMapSize(width, height) {
        if (this.lights.directional) {
            this.lights.directional.shadow.mapSize.width = width
            this.lights.directional.shadow.mapSize.height = height
            this.config.directional.shadow.mapSize = { width, height }
        }
    }

    /**
     * Add a custom light to the scene
     * @param {string} name - Name identifier for the light
     * @param {THREE.Light} light - The light object to add
     */
    addLight(name, light) {
        this.lights[name] = light
        this.scene.add(light)
        console.log(`Added custom light: ${name}`)
    }

    /**
     * Remove a light from the scene
     * @param {string} name - Name of the light to remove
     */
    removeLight(name) {
        if (this.lights[name]) {
            this.scene.remove(this.lights[name])
            delete this.lights[name]
            console.log(`Removed light: ${name}`)
        }
    }

    /**
     * Get a light by name
     * @param {string} name - Name of the light
     * @returns {THREE.Light|null} - The light object or null if not found
     */
    getLight(name) {
        return this.lights[name] || null
    }

    /**
     * Get current lighting configuration
     * @returns {Object} - Current lighting configuration
     */
    getConfig() {
        return { ...this.config }
    }

    /**
     * Update lighting configuration
     * @param {Object} newConfig - New configuration object
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig }
        
        // Reapply configuration to existing lights
        if (this.lights.ambient && newConfig.ambient) {
            this.lights.ambient.intensity = this.config.ambient.intensity
        }
        
        if (this.lights.directional && newConfig.directional) {
            const light = this.lights.directional
            light.intensity = this.config.directional.intensity
            
            if (newConfig.directional.position) {
                const pos = this.config.directional.position
                light.position.set(pos.x, pos.y, pos.z)
            }
            
            if (newConfig.directional.shadow) {
                this.configureShadows(light)
            }
        }
    }

    /**
     * Dispose of all lighting resources
     */
    dispose() {
        Object.keys(this.lights).forEach(name => {
            this.scene.remove(this.lights[name])
        })
        
        this.lights = {}
        console.log('Lighting system disposed')
    }
}
