import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export class SignpostManager {
    constructor(scene) {
        this.scene = scene
        this.gltfLoader = new GLTFLoader()
        this.textureLoader = new THREE.TextureLoader()
        this.signposts = []
        
        // Project data structure
        this.projects = [
            {
                // Signpost properties
                modelPath: '/signpost.glb',
                screenshotPath: '/project_ss/ColorAnalyzer.png',
                position: new THREE.Vector3(10, 0, 5),
                rotation: new THREE.Euler(0, 3 * Math.PI / 2, 0),
                scale: new THREE.Vector3(2, 2, 2),
                // Interaction zone properties
                zoneWidth: 4,
                zoneDepth: 4,
                url: 'https://example.com/project_a',
                name: 'Visit ColorAnalyzer'
            },
            {
                // Signpost properties
                modelPath: '/signpost.glb',
                screenshotPath: '/project_ss/header.png',
                position: new THREE.Vector3(-10, 0, 5),
                rotation: new THREE.Euler(0, 9 * Math.PI / 6, 0),
                scale: new THREE.Vector3(2, 2, 2),
                // Interaction zone properties
                zoneWidth: 4,
                zoneDepth: 4,
                url: 'https://fibonacci-spiral-detecti-bf743.web.app/',
                name: 'Visit Fibonacci Detection'
            }
        ]
    }

    /**
     * Initialize and load all signposts
     */
    async loadAllSignposts() {
        const loadPromises = this.projects.map(project => this.loadSignpost(project))
        
        try {
            await Promise.all(loadPromises)
            console.log(`Successfully loaded ${this.signposts.length} signposts`)
        } catch (error) {
            console.error('Error loading signposts:', error)
        }
    }

    /**
     * Load a single signpost with its screenshot texture
     * @param {Object} project - Project configuration object
     * @returns {Promise} - Promise that resolves when signpost is loaded
     */
    loadSignpost(project) {
        return new Promise((resolve, reject) => {
            // Load the signpost model
            this.gltfLoader.load(
                project.modelPath,
                (gltf) => {
                    const signpost = gltf.scene
                    
                    // Apply transformation
                    this.applyTransformation(signpost, project)
                    
                    // Load and apply screenshot texture
                    this.loadAndApplyTexture(signpost, project)
                        .then(() => {
                            // Configure shadows
                            this.configureShadows(signpost)
                            
                            // Add to scene and track
                            this.scene.add(signpost)
                            this.signposts.push({
                                mesh: signpost,
                                project: project
                            })
                            
                            console.log(`Loaded signpost: ${project.name}`)
                            resolve(signpost)
                        })
                        .catch(reject)
                },
                (progress) => {
                    console.log(`Loading signpost ${project.name}: ${(progress.loaded / progress.total * 100).toFixed(1)}%`)
                },
                (error) => {
                    console.error(`Failed to load signpost model: ${project.modelPath}`, error)
                    reject(error)
                }
            )
        })
    }

    /**
     * Apply position, rotation, and scale to signpost
     * @param {THREE.Object3D} signpost - The signpost mesh
     * @param {Object} project - Project configuration
     */
    applyTransformation(signpost, project) {
        signpost.position.copy(project.position)
        signpost.rotation.copy(project.rotation)
        signpost.scale.copy(project.scale)
    }

    /**
     * Load screenshot texture and apply it to the signpost screen
     * @param {THREE.Object3D} signpost - The signpost mesh
     * @param {Object} project - Project configuration
     * @returns {Promise} - Promise that resolves when texture is applied
     */
    loadAndApplyTexture(signpost, project) {
        return new Promise((resolve, reject) => {
            this.textureLoader.load(
                project.screenshotPath,
                (texture) => {
                    // Configure texture for pixel art style
                    this.configureTexture(texture)
                    
                    // Apply texture to screen material
                    this.applyTextureToScreen(signpost, texture)
                    
                    console.log(`Applied texture to signpost: ${project.screenshotPath}`)
                    resolve(texture)
                },
                (progress) => {
                    console.log(`Loading texture ${project.screenshotPath}: ${(progress.loaded / progress.total * 100).toFixed(1)}%`)
                },
                (error) => {
                    console.error(`Failed to load texture: ${project.screenshotPath}`, error)
                    reject(error)
                }
            )
        })
    }

    /**
     * Configure texture properties for pixel art style
     * @param {THREE.Texture} texture - The texture to configure
     */
    configureTexture(texture) {
        // Pixel art texture settings
        texture.magFilter = THREE.NearestFilter
        texture.minFilter = THREE.NearestFilter
        texture.wrapS = THREE.RepeatWrapping
        texture.wrapT = THREE.ClampToEdgeWrapping
        // texture.flipY = false
        
        // Fix horizontal flipping
        texture.repeat.x = -1
    }

    /**
     * Apply texture to the signpost screen material
     * @param {THREE.Object3D} signpost - The signpost mesh
     * @param {THREE.Texture} texture - The screenshot texture
     */
    applyTextureToScreen(signpost, texture) {
        signpost.traverse((child) => {
            if (child.isMesh && child.material && child.material.name === 'M_Screen') {
                // ✅ 古いマテリアルを破棄
                child.material.dispose(); 
                
                // ✅ 光の影響を無視する新しいマテリアルを作成
                child.material = new THREE.MeshBasicMaterial({
                    map: texture
                });
            }
        })
    }

    /**
     * Configure shadow properties for all signpost meshes
     * @param {THREE.Object3D} signpost - The signpost mesh
     */
    configureShadows(signpost) {
        signpost.traverse((child) => {
            if (child.isMesh) {
                // Default shadow settings for all meshes
                child.castShadow = true
                child.receiveShadow = true
                
                // Special handling for screen materials
                if (child.material && child.material.name === 'M_Screen') {
                    child.castShadow = false
                    child.receiveShadow = false
                }
            }
        })
    }

    /**
     * Get all projects data (for interaction zones)
     * @returns {Array} - Array of project configurations
     */
    getProjects() {
        return this.projects
    }

    /**
     * Add a new project/signpost
     * @param {Object} projectConfig - Project configuration object
     */
    addProject(projectConfig) {
        this.projects.push(projectConfig)
        return this.loadSignpost(projectConfig)
    }

    /**
     * Remove a signpost by index
     * @param {number} index - Index of the signpost to remove
     */
    removeSignpost(index) {
        if (index >= 0 && index < this.signposts.length) {
            const signpost = this.signposts[index]
            this.scene.remove(signpost.mesh)
            this.signposts.splice(index, 1)
            this.projects.splice(index, 1)
        }
    }

    /**
     * Get signpost count
     * @returns {number} - Number of loaded signposts
     */
    getSignpostCount() {
        return this.signposts.length
    }

    /**
     * Dispose of all signpost resources
     */
    dispose() {
        this.signposts.forEach(signpost => {
            this.scene.remove(signpost.mesh)
            
            // Dispose of geometries and materials
            signpost.mesh.traverse((child) => {
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
        
        this.signposts = []
        this.projects = []
    }
}
