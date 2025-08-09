import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

/**
 * Manager for loading and placing GLTF models that don't require textures or custom materials.
 * - Follows the same architectural pattern as SignpostManager
 * - Uses MeshBasicMaterial for flat/basic rendering (unlit)
 * - Includes special handling for the "m_screen" model type (no shadows)
 */
export class UntexturedModelManager {
    constructor(scene, physicsManager = null) {
        this.scene = scene
        this.physics = physicsManager
        this.characterBody = null
        this.gltfLoader = new GLTFLoader()
        this.models = []

        this.items = [
            {
                modelPath: '/letters_3D/V.glb',
                position: new THREE.Vector3(-2, 0, 9),
                rotation: new THREE.Euler(0, 0, 0),
                scale: new THREE.Vector3(2.5, 2.5, 2.5),
                type: 'generic',
                enableCollision: true,
                enablePhysics: true,
                interactionCallback: this.createTextInteractionCallback(),
            },
            {
                modelPath: '/letters_3D/E.glb',
                position: new THREE.Vector3(-1, 0, 9),
                rotation: new THREE.Euler(0, 0, 0),
                scale: new THREE.Vector3(2.5, 2.5, 2.5),
                type: 'generic',
                enableCollision: true,
                enablePhysics: true,
                interactionCallback: this.createTextInteractionCallback(),
            },
            {
                modelPath: '/letters_3D/N.glb',
                position: new THREE.Vector3(0, 0, 9),
                rotation: new THREE.Euler(0, 0, 0),
                scale: new THREE.Vector3(2.5, 2.5, 2.5),
                type: 'generic',
                enableCollision: true,
                enablePhysics: true,
                interactionCallback: this.createTextInteractionCallback(),
            },
            {
                modelPath: '/letters_3D/N.glb',
                position: new THREE.Vector3(1, 0, 9),
                rotation: new THREE.Euler(0, 0, 0),
                scale: new THREE.Vector3(2.5, 2.5, 2.5),
                type: 'generic',
                enableCollision: true,
                enablePhysics: true,
                interactionCallback: this.createTextInteractionCallback(),
            },
            //wasd
            {
                modelPath: '/letters_3D/W.glb',
                position: new THREE.Vector3(-3.7, 0, 11.5),
                rotation: new THREE.Euler(0, 0, 0),
                scale: new THREE.Vector3(1.5, 1.5, 1.5),
                type: 'generic',
                enableCollision: true,
                enablePhysics: true,
                interactionCallback: this.createTextInteractionCallback(),
            },
            {
                modelPath: '/letters_3D/A.glb',
                position: new THREE.Vector3(-3.7, 0, 12),
                rotation: new THREE.Euler(0, 0, 0),
                scale: new THREE.Vector3(1.5, 1.5, 1.5),
                type: 'generic',
                enableCollision: true,
                enablePhysics: true,
                interactionCallback: this.createTextInteractionCallback(),
            },
            {
                modelPath: '/letters_3D/A.glb',
                position: new THREE.Vector3(2, 0, 9),
                rotation: new THREE.Euler(0, 0, 0),
                scale: new THREE.Vector3(2.5, 2.5, 2.5),
                type: 'generic',
                mass : 50000,
                enableCollision: true,
                enablePhysics: true,
                interactionCallback: this.createTextInteractionCallback(),
            },
            {
                modelPath: '/letters_3D/VENNA_TEXT.glb',
                position: new THREE.Vector3(0, 5, -4),
                rotation: new THREE.Euler(0, 0, 0),
                scale: new THREE.Vector3(4, 4, 4),
                type: 'generic',
                physicsShape: 'sphere',
                mass: 3,
                enableCollision: true,
                enablePhysics: true,
                // collisionRadius: 2.0,
                interactionCallback: this.createTextInteractionCallback(),
                // color: 0xffffff
            },
        ]
    }

    /**
     * Initialize and load all configured items
     */
    async loadAllModels() {
        const loadPromises = this.items.map(item => this.loadModel(item))
        try {
            await Promise.all(loadPromises)
            console.log(`Successfully loaded ${this.models.length} untextured models`)
        } catch (error) {
            console.error('Error loading untextured models:', error)
        }
    }

    /**
     * Load a single model and prepare it for basic rendering (no textures)
     * @param {Object} item - Configuration object
     * @returns {Promise<THREE.Object3D>} Resolves with the loaded model root
     */
    loadModel(item) {
        return new Promise((resolve, reject) => {
            this.gltfLoader.load(
                item.modelPath,
                (gltf) => {
                    const root = gltf.scene

                    // Apply transform
                    this.applyTransformation(root, item)

                    // Replace materials with unlit basic materials (capture flags first)
                    this.applyBasicMaterials(root, item)

                    // Configure shadows after materials are assigned
                    this.configureShadows(root, item)

                    // Setup collision and physics if enabled
                    const collisionData = this.setupCollisionAndPhysics(root, item)

                    // Add to scene and track
                    this.scene.add(root)
                    this.models.push({
                        mesh: root,
                        item,
                        collision: collisionData
                    })

                    console.log(`Loaded untextured model: ${item.modelPath} (${item.type || 'generic'})`)
                    resolve(root)
                },
                (progress) => {
                    if (progress.total > 0) {
                        console.log(`Loading untextured model ${item.modelPath}: ${(progress.loaded / progress.total * 100).toFixed(1)}%`)
                    }
                },
                (error) => {
                    console.error(`Failed to load model: ${item.modelPath}`, error)
                    reject(error)
                }
            )
        })
    }

    /**
     * Apply position, rotation, and scale
     */
    applyTransformation(object3d, item) {
        if (item.position) object3d.position.copy(item.position)
        if (item.rotation) object3d.rotation.copy(item.rotation)
        if (item.scale) object3d.scale.copy(item.scale)
    }

    /**
     * Replace all mesh materials with MeshBasicMaterial (no textures)
     * Honors an optional per-item flat color. If none, uses white.
     * Also preserves a flag if original material/name indicated an M_Screen part.
     */
    applyBasicMaterials(root, item) {
        const color = (item && typeof item.color !== 'undefined') ? item.color : 0xffffff

        root.traverse((child) => {
            if (child.isMesh) {
                // Mark screen-like parts before disposing original materials
                const hadScreenMaterial = !!(child.material && typeof child.material.name === 'string' && /m[_ ]?screen/i.test(child.material.name))
                const hadScreenName = !!(child.name && /m[_ ]?screen/i.test(child.name))
                if (hadScreenMaterial || hadScreenName) {
                    child.userData.isScreenPart = true
                }

                // Dispose old materials to prevent leaks
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose && m.dispose())
                    } else {
                        child.material.dispose && child.material.dispose()
                    }
                }
                child.material = new THREE.MeshLambertMaterial({ color })
            }
        })
    }

    /**
     * Configure shadow properties.
     * - All meshes receive shadows by default (receiveShadow = true)
     * - Shadow casting is disabled for 'm_screen' models and screen parts
     */
    configureShadows(root, item) {
        const modelIsMScreen = (item && item.type === 'm_screen')
        root.traverse((child) => {
            if (child.isMesh) {
                const meshIsScreenPart = !!child.userData.isScreenPart || (child.name && /m[_ ]?screen/i.test(child.name))
                const disableCasting = modelIsMScreen || meshIsScreenPart

                // Always allow receiving shadows
                child.receiveShadow = true
                // Only disable casting for screen-type models/parts
                child.castShadow = !disableCasting
            }
        })
    }

    /**
     * Setup physics for a model using cannon-es via PhysicsManager
     * @param {THREE.Object3D} root - The model root
     * @param {Object} item - Configuration object
     * @returns {Object} Physics data for this model
     */
    setupCollisionAndPhysics(root, item) {
        if (!this.physics || (!item.enableCollision && !item.enablePhysics)) {
            return null
        }

        // Build options from item
        const physicsOptions = {
            type: item.static ? 'static' : 'dynamic',
            shape: item.physicsShape || 'box', // 'box' | 'sphere'
            mass: typeof item.mass === 'number' ? item.mass : 1,
            friction: typeof item.friction === 'number' ? item.friction : 0.3,
            restitution: typeof item.restitution === 'number' ? item.restitution : 0.1,
            linearDamping: typeof item.linearDamping === 'number' ? item.linearDamping : 0.2,
            angularDamping: typeof item.angularDamping === 'number' ? item.angularDamping : 0.4
        }

        const body = this.physics.addBodyForMesh(root, physicsOptions)

        const data = {
            enabled: true,
            physics: true,
            body,
            interactionCallback: item.interactionCallback || null,
            lastInteractionTime: 0
        }

        // Attach to userData
        root.userData.physics = data
        return data
    }

    /**
     * Check collision between character position and all collision-enabled models
     * @param {THREE.Vector3} characterPosition - Current character position
     * @param {THREE.Vector3} proposedPosition - Where character wants to move
     * @returns {Object} Collision result with corrected position and interaction data
     */
    checkCollisions(characterPosition, proposedPosition) {
        const result = {
            collision: false,
            correctedPosition: proposedPosition.clone(),
            interactions: []
        }

        for (const modelEntry of this.models) {
            if (!modelEntry.collision || !modelEntry.collision.enabled) {
                continue
            }

            const collision = modelEntry.collision
            const distance = proposedPosition.distanceTo(collision.center)

            // Check for collision (character radius + object radius)
            const characterRadius = 0.5 // Approximate character collision radius
            const totalRadius = characterRadius + collision.radius

            if (distance < totalRadius) {
                result.collision = true

                // Calculate push-back direction
                const pushDirection = proposedPosition.clone().sub(collision.center).normalize()

                // If direction is zero (character exactly on center), use a default direction
                if (pushDirection.length() === 0) {
                    pushDirection.set(1, 0, 0) // Push to the right
                }

                // Calculate corrected position
                const correctedPos = collision.center.clone().add(
                    pushDirection.multiplyScalar(totalRadius + 0.1) // Small buffer
                )

                // Only update Y if character is on ground level
                correctedPos.y = proposedPosition.y

                result.correctedPosition = correctedPos

                // Handle physics interactions
                if (collision.physics && collision.interactionCallback) {
                    const currentTime = Date.now()
                    // Prevent spam interactions (500ms cooldown)
                    if (currentTime - collision.lastInteractionTime > 500) {
                        result.interactions.push({
                            model: modelEntry.mesh,
                            item: modelEntry.item,
                            callback: collision.interactionCallback
                        })
                        collision.lastInteractionTime = currentTime
                    }
                }

                // For now, handle one collision at a time
                break
            }
        }

        return result
    }

    /**
     * Get all models with collision enabled
     * @returns {Array} Array of collision-enabled model entries
     */
    getCollisionModels() {
        return this.models.filter(entry => entry.collision && entry.collision.enabled)
    }

    /**
     * Update physics for all physics-enabled models (called each frame)
     * @param {number} deltaTime - Time since last frame
     */
    updatePhysics(deltaTime) {
        for (const modelEntry of this.models) {
            if (modelEntry.collision && modelEntry.collision.physics) {
                // Add any physics updates here (e.g., animations, floating effects)
                // For now, this is a placeholder for future physics features
            }
        }
    }

    /**
     * Create a sample interaction callback for text models
     * @returns {Function} Interaction callback function
     */
    createTextInteractionCallback() {
        return (character, model, item) => {
            console.log(`Character touched the text model: ${item.modelPath}`);

            // Example: Make the text glow briefly
            model.traverse((child) => {
                if (child.isMesh && child.material) {
                    const originalColor = child.material.color.getHex()
                    child.material.color.setHex(0x00ff00) // Green glow

                    // Reset color after 500ms
                    setTimeout(() => {
                        child.material.color.setHex(originalColor)
                    }, 500)
                }
            })
        }
    }

    /**
     * Get all loaded models
     * @returns {Array} Array of all model entries
     */
    getAllModels() {
        return this.models;
    }

    /**
     * Get all configuration items
     */
    getItems() {
        return this.items;
    }

    /**
     * Add and immediately load a new item
     * @param {Object} itemConfig
     */
    addItem(itemConfig) {
        this.items.push(itemConfig);
        return this.loadModel(itemConfig);
    }

    /**
     * Remove a loaded model by index
     */
    removeModel(index) {
        if (index >= 0 && index < this.models.length) {
            const entry = this.models[index];
            this.scene.remove(entry.mesh);
            this.models.splice(index, 1);
            this.items.splice(index, 1);
        }
    }

    /**
     * Get model count
     */
    getModelCount() {
        return this.models.length;
    }

    /**
     * Dispose all model resources
     */
    dispose() {
        this.models.forEach(entry => {
            this.scene.remove(entry.mesh);
            entry.mesh.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose && m.dispose());
                    } else {
                        child.material.dispose && child.material.dispose();
                    }
                }
            });
        });
        this.models = [];
        this.items = [];
    }
}

