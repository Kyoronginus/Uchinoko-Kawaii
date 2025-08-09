import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { TextManager } from './TextManager.js'
import { Delaunay } from 'd3-delaunay'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

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
            delaunay: {
                pointCount: 100,
                lineColor: '#23c8ffff', // Sky blue
                lineWidth: 0.2,
                backgroundColor: '#ffffff',
                opacity: 0.7,
                size: { width: 100, height: 100 }, // World space size
                position: { x: 0, y: 20, z: -30 } // Fixed position in world space
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
        // this.createDelaunaySky()
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
     * Create delaunay triangulation as a fixed world object (not following camera)
     */
    createDelaunaySky() {
        const config = this.config.delaunay
        const canvasSize = 2048 // Fixed canvas resolution for better quality

        // Generate random points within the canvas
        const points = Array.from({ length: config.pointCount }, () => [
            Math.random() * canvasSize,
            Math.random() * canvasSize
        ])

        const delaunay = Delaunay.from(points)

        // Create canvas for the triangulation
        const canvas = document.createElement('canvas')
        canvas.width = canvasSize
        canvas.height = canvasSize
        const context = canvas.getContext('2d')

        // Set background
        context.fillStyle = config.backgroundColor
        context.fillRect(0, 0, canvasSize, canvasSize)

        // Set line style (fix the typo and use config)
        context.strokeStyle = config.lineColor
        context.lineWidth = config.lineWidth

        // Draw triangles (fix the iteration - should be i += 3, not i += 9)
        for (let i = 0; i < delaunay.triangles.length; i += 3) {
            const p0 = points[delaunay.triangles[i]]
            const p1 = points[delaunay.triangles[i + 1]]
            const p2 = points[delaunay.triangles[i + 2]]

            context.beginPath()
            context.moveTo(p0[0], p0[1])
            context.lineTo(p1[0], p1[1])
            context.lineTo(p2[0], p2[1])
            context.closePath()
            context.stroke()
        }

        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas)
        texture.colorSpace = THREE.SRGBColorSpace
        texture.needsUpdate = true

        // Create a plane geometry for the background (fixed in world space)
        const geometry = new THREE.SphereGeometry(
            config.size.width, // Radius of the dome
            64, // Width segments
            32, // Height segments
            0, // phiStart
            Math.PI * 2, // phiLength
            0, // thetaStart
            // Math.PI / 2 // thetaLength (Math.PI / 2 で上半球になる)
        );
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: config.opacity,
            side: THREE.BackSide
        })

        const delaunayPlane = new THREE.Mesh(geometry, material)

        // Position the plane in world space (won't follow camera)
        delaunayPlane.position.set(
            config.position.x,
            config.position.y,
            config.position.z
        )

        // Make it face the camera initially but stay fixed in world space
        delaunayPlane.lookAt(0, 0, 0)

        // Add to scene as a world object
        this.scene.add(delaunayPlane)
        this.environmentObjects.delaunayBackground = delaunayPlane

        console.log('Delaunay triangulation background created as fixed world object')
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
     * Update Delaunay background configuration and recreate it
     * @param {Object} newConfig - New Delaunay configuration
     */
    updateDelaunayBackground(newConfig) {
        // Update configuration
        this.config.delaunay = { ...this.config.delaunay, ...newConfig }

        // Remove existing Delaunay background
        const existingDelaunay = this.environmentObjects.delaunayBackground
        if (existingDelaunay) {
            this.scene.remove(existingDelaunay)
            // Dispose of resources
            existingDelaunay.geometry.dispose()
            existingDelaunay.material.dispose()
            if (existingDelaunay.material.map) {
                existingDelaunay.material.map.dispose()
            }
            delete this.environmentObjects.delaunayBackground
        }

        // Recreate with new configuration
        this.createDelaunaySky()
        console.log('Delaunay background updated with new configuration')
    }

    /**
     * Set Delaunay background visibility
     * @param {boolean} visible - Whether the background should be visible
     */
    setDelaunayBackgroundVisibility(visible) {
        const delaunayBg = this.environmentObjects.delaunayBackground
        if (delaunayBg) {
            delaunayBg.visible = visible
        }
    }

    /**
     * Set Delaunay background opacity
     * @param {number} opacity - Opacity value (0-1)
     */
    setDelaunayBackgroundOpacity(opacity) {
        const delaunayBg = this.environmentObjects.delaunayBackground
        if (delaunayBg && delaunayBg.material) {
            delaunayBg.material.opacity = Math.max(0, Math.min(1, opacity))
            this.config.delaunay.opacity = delaunayBg.material.opacity
        }
    }

    /**
     * Move Delaunay background to a new position
     * @param {Object} position - New position {x, y, z}
     */
    moveDelaunayBackground(position) {
        const delaunayBg = this.environmentObjects.delaunayBackground
        if (delaunayBg) {
            delaunayBg.position.set(position.x, position.y, position.z)
            this.config.delaunay.position = { ...position }
        }
    }

    /**
     * Apply a preset style to the Delaunay background
     * @param {string} styleName - Name of the preset style
     */
    applyDelaunayStyle(styleName) {
        const styles = {
            'sky': {
                lineColor: '#87CEEB',
                backgroundColor: '#F0F8FF',
                opacity: 0.3,
                lineWidth: 1
            },
            'sunset': {
                lineColor: '#FF6B35',
                backgroundColor: '#FFE5B4',
                opacity: 0.4,
                lineWidth: 2
            },
            'night': {
                lineColor: '#4169E1',
                backgroundColor: '#191970',
                opacity: 0.5,
                lineWidth: 1
            },
            'minimal': {
                lineColor: '#D3D3D3',
                backgroundColor: '#FFFFFF',
                opacity: 0.2,
                lineWidth: 1
            },
            'vibrant': {
                lineColor: '#FF1493',
                backgroundColor: '#00FFFF',
                opacity: 0.6,
                lineWidth: 3
            }
        }

        const style = styles[styleName]
        if (style) {
            this.updateDelaunayBackground(style)
            console.log(`Applied Delaunay style: ${styleName}`)
        } else {
            console.warn(`Unknown Delaunay style: ${styleName}. Available styles:`, Object.keys(styles))
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
