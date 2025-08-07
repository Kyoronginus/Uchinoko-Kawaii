import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { TextManager } from './TextManager.js'

export class EnvironmentManager {
    constructor(scene) {
        this.scene = scene
        this.gltfLoader = new GLTFLoader()
        this.environmentObjects = {}
        this.textManager = new TextManager(scene)

        // Environment configurations
        this.config = {
            floor: {
                modelPath: '/floor.glb',
                meshName: 'Plane',
                position: { x: 0, y: 0, z: 0 },
                receiveShadow: true,
                castShadow: false
            },
            background: {
                color: 0xffffff
            },
            fallbackFloor: {
                size: { width: 20, height: 20 },
                color: 0x8B4513,
                opacity: 0.8,
                receiveShadow: true
            }
        }
    }

    /**
     * Initialize all environment elements
     */
    async setupEnvironment() {
        this.setBackgroundColor()
        await this.loadFloor()

        console.log('Environment setup complete')
    }

    /**
     * Set the scene background color
     */
    setBackgroundColor() {
        this.scene.background = new THREE.Color(this.config.background.color)
        console.log('Background color set')
    }

    /**
     * Load the floor mesh from GLTF file
     */
    async loadFloor() {
        try {
            const gltf = await this.loadGLTF(this.config.floor.modelPath)
            console.log('GLTF loaded successfully:', gltf)

            const floorMesh = gltf.scene.children.find(
                child => child.name === this.config.floor.meshName
            )

            if (floorMesh) {
                this.setupFloorMesh(floorMesh)
                console.log('Floor mesh loaded and configured')
            } else {
                console.log('Specific floor mesh not found, using entire scene')
                this.setupFloorScene(gltf.scene)
            }
        } catch (error) {
            console.error('Error loading floor mesh:', error)
            console.log('Falling back to procedural floor')
            this.createFallbackFloor()
        }
    }

    /**
     * Load GLTF file as a Promise
     * @param {string} path - Path to GLTF file
     * @returns {Promise} - Promise that resolves with GLTF data
     */
    loadGLTF(path) {
        return new Promise((resolve, reject) => {
            this.gltfLoader.load(
                path,
                resolve,
                (progress) => {
                    console.log(`Loading floor: ${(progress.loaded / progress.total * 100).toFixed(1)}%`)
                },
                reject
            )
        })
    }

    /**
     * Setup individual floor mesh
     * @param {THREE.Mesh} floorMesh - The floor mesh
     */
    setupFloorMesh(floorMesh) {
        const config = this.config.floor

        // Set position
        floorMesh.position.set(config.position.x, config.position.y, config.position.z)

        // Configure shadows for all child meshes
        floorMesh.traverse((child) => {
            if (child.isMesh) {
                child.receiveShadow = config.receiveShadow
                child.castShadow = config.castShadow
            }
        })

        this.scene.add(floorMesh)
        this.environmentObjects.floor = floorMesh
    }

    /**
     * Setup entire GLTF scene as floor
     * @param {THREE.Group} scene - The GLTF scene
     */
    setupFloorScene(scene) {
        const config = this.config.floor

        console.log('Available children:', scene.children.map(child => child.name))

        // Configure shadows for all meshes in the scene
        scene.traverse((child) => {
            if (child.isMesh) {
                child.receiveShadow = config.receiveShadow
                child.castShadow = config.castShadow
            }
        })

        this.scene.add(scene)
        this.environmentObjects.floor = scene
    }

    /**
     * Create a fallback procedural floor
     */
    createFallbackFloor() {
        const config = this.config.fallbackFloor

        const floorGeometry = new THREE.PlaneGeometry(config.size.width, config.size.height)
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: config.color,
            roughness: 0.1,//表面の粗さ（1に近いほどマット）
            metalness: 0.9 // 金属っぽさ
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial)
        floor.rotation.x = -Math.PI / 2 // Lay flat
        floor.receiveShadow = config.receiveShadow

        this.scene.add(floor)
        this.environmentObjects.fallbackFloor = floor

        console.log('Fallback floor created')
    }

    /**
     * Update background color
     * @param {number} color - New background color (hex)
     */
    setBackground(color) {
        this.scene.background = new THREE.Color(color)
        this.config.background.color = color
    }

    /**
     * Get environment object by name
     * @param {string} name - Name of the environment object
     * @returns {THREE.Object3D|null} - The environment object or null
     */
    getEnvironmentObject(name) {
        return this.environmentObjects[name] || null
    }

    /**
     * Add a custom environment object
     * @param {string} name - Name identifier
     * @param {THREE.Object3D} object - The object to add
     */
    addEnvironmentObject(name, object) {
        this.environmentObjects[name] = object
        this.scene.add(object)
        console.log(`Added environment object: ${name}`)
    }

    /**
     * Remove an environment object
     * @param {string} name - Name of the object to remove
     */
    removeEnvironmentObject(name) {
        const object = this.environmentObjects[name]
        if (object) {
            this.scene.remove(object)
            delete this.environmentObjects[name]
            console.log(`Removed environment object: ${name}`)
        }
    }

    /**
     * Update floor shadow receiving
     * @param {boolean} receiveShadow - Whether floor should receive shadows
     */
    setFloorShadowReceiving(receiveShadow) {
        const floor = this.environmentObjects.floor || this.environmentObjects.fallbackFloor

        if (floor) {
            floor.traverse((child) => {
                if (child.isMesh) {
                    child.receiveShadow = receiveShadow
                }
            })

            this.config.floor.receiveShadow = receiveShadow
            this.config.fallbackFloor.receiveShadow = receiveShadow
        }
    }

    /**
     * Add text to the floor at a specific position
     * @param {string} text - The text to display
     * @param {Object} position - World position {x, z} (y will be auto-calculated)
     * @param {Object} options - Text styling options
     * @returns {string} - Unique ID for the text
     */
    addFloorText(text, position, options = {}) {
        return this.textManager.addFloorText(text, {
            x: position.x,
            y: 0.01, // Slightly above floor
            z: position.z
        }, options)
    }

    /**
     * Update existing floor text
     * @param {string} id - Text ID to update
     * @param {string} newText - New text content
     * @param {Object} options - New styling options
     */
    updateFloorText(id, newText, options = {}) {
        this.textManager.updateText(id, newText, options)
    }

    /**
     * Remove floor text
     * @param {string} id - Text ID to remove
     */
    removeFloorText(id) {
        this.textManager.removeText(id)
    }

    /**
     * Get the TextManager instance for advanced text operations
     * @returns {TextManager} - The text manager instance
     */
    getTextManager() {
        return this.textManager
    }

    /**
     * Get current environment configuration
     * @returns {Object} - Current configuration
     */
    getConfig() {
        return { ...this.config }
    }

    /**
     * Update environment configuration
     * @param {Object} newConfig - New configuration object
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig }

        // Apply background color if changed
        if (newConfig.background?.color) {
            this.setBackground(newConfig.background.color)
        }

        // Update floor shadow settings if changed
        if (newConfig.floor?.receiveShadow !== undefined ||
            newConfig.fallbackFloor?.receiveShadow !== undefined) {
            this.setFloorShadowReceiving(
                newConfig.floor?.receiveShadow ??
                newConfig.fallbackFloor?.receiveShadow ??
                this.config.floor.receiveShadow
            )
        }
    }

    /**
     * Dispose of all environment resources
     */
    dispose() {
        Object.keys(this.environmentObjects).forEach(name => {
            const object = this.environmentObjects[name]
            this.scene.remove(object)

            // Dispose of geometries and materials
            object.traverse((child) => {
                if (child.geometry) child.geometry.dispose()
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(material => material.dispose())
                    } else {
                        child.material.dispose()
                    }
                }
            })
        })

        this.environmentObjects = {}

        // Dispose of text manager
        if (this.textManager) {
            this.textManager.dispose()
        }

        console.log('Environment disposed')
    }
}
