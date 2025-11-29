import * as THREE from 'three'
import { CameraController } from './controllers/CameraController.js'
import { HD2DRenderer } from './rendering/HD2DRenderer.js'
import { PixelCharacter } from './characters/PixelCharacter.js'
import { ModelManager } from './objects/ModelManager.js'
import { LightingManager } from './lighting/LightingManager.js'
import { ProximityInteractionManager } from './interaction/ProximityInteractionManager.js'
import { EnvironmentManager } from './environment/EnvironmentManager.js'
import { TextManager } from './environment/TextManager.js';
import { PhysicsManager } from './physics/PhysicsManager.js'

const loadingOverlay = document.getElementById('loading-overlay');
const progressBarFill = document.getElementById('progress-bar-fill');
const startButton = document.getElementById('start-button');
const loadingManager = THREE.DefaultLoadingManager

loadingManager.onLoad = () => {
    console.log('Scene loaded');
    if (progressBarFill) progressBarFill.style.width = '100%';
    setTimeout(() => {
        if (startButton) {
            startButton.style.display = 'block';
            startButton.style.opacity = '1';
        }
    }, 500);
}
loadingManager.onProgress = (itemUrl, itemsLoaded, itemsTotal) => {
    const progress = itemsTotal > 0 ? (itemsLoaded / itemsTotal) : 0;
    if (progressBarFill) progressBarFill.style.width = `${progress * 100}%`;
    console.log(`load progress: ${Math.round(progress * 100)}% (${itemsLoaded}/${itemsTotal}) - ${itemUrl}`);
}
loadingManager.onError = (url) => {
    console.error('load error:', url);
}



// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()
scene.fog = new THREE.Fog(0xffffff, 50, 100) // Atmospheric fog for depth

// Sizes
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

// Camera
const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.1, 100)
camera.position.set(0, 12, 12)

// character
const character = new PixelCharacter('/default_standing.png', scene, camera)

// Camera Controller (character follow mode)
const cameraController = new CameraController(camera, character)
const cameraAngleZones = [

    // look above for standee
    {
        // zone range
        box: new THREE.Box3(
            new THREE.Vector3(-1, -Infinity, -9), 
            new THREE.Vector3(1, Infinity, -7)
        ),
        // this zone entered when the new camera angle
        angle: {
            // for gallery
            followDistance: new THREE.Vector3(0, 3, 8), 
            lookAtOffset: new THREE.Vector3(0, 3, 0) 
        }
    },
    // Gallery
    {
        // zone range
        box: new THREE.Box3(
            new THREE.Vector3(8, -Infinity, -30), // min
            new THREE.Vector3(68, Infinity, -10)
        ),
        // this zone entered when the new camera angle
        angle: {
            // for gallery
            followDistance: new THREE.Vector3(0, 3, 8), 
            lookAtOffset: new THREE.Vector3(0, 3, 0) 
        }
    },
    // Creator
    {
        // zone range
        box: new THREE.Box3(
            new THREE.Vector3(-28, -Infinity, -40), 
            new THREE.Vector3(-3, Infinity, 5)
        ),
        // this zone entered when the new camera angle
        angle: {
            // for gallery
            followDistance: new THREE.Vector3(0, 13, 8), 
            lookAtOffset: new THREE.Vector3(0, 3, 0) 
        }
    },
    // Playground
    {
        // zone range
        box: new THREE.Box3(
            new THREE.Vector3(18, -Infinity, 0), 
            new THREE.Vector3(40, Infinity, 20)
        ),
        // this zone entered when the new camera angle
        angle: {
            // for gallery
            followDistance: new THREE.Vector3(0, 2, 8), 
            lookAtOffset: new THREE.Vector3(0, 1, 0) 
        }
    },
];
let currentAngleZone = null;


// HD-2D Renderer
const hd2dRenderer = new HD2DRenderer(canvas, sizes, scene, camera)

// Initialize managers
const physicsManager = new PhysicsManager()
const modelManager = new ModelManager(scene, physicsManager)

// Connect physics manager to character for grab functionality
character.setPhysicsManager(physicsManager)
const lightingManager = new LightingManager(scene)
const environmentManager = new EnvironmentManager(scene)
let proximityManager = null

const textManager = new TextManager(scene);
textManager.createWelcomeText();
async function initializeScene() {
    try {
        lightingManager.setupLighting()
        await environmentManager.setupEnvironment()
        await modelManager.loadAllModels()
        console.log('📦 All loaded models by type:')
        const allModels = modelManager.models
        const modelsByType = {}
        allModels.forEach(entry => {
            const type = entry.item.type || 'unknown'
            if (!modelsByType[type]) modelsByType[type] = []
            modelsByType[type].push(entry.item.name || entry.item.modelPath)
        })
        Object.keys(modelsByType).forEach(type => {
            console.log(`  ${type}: ${modelsByType[type].length} models`)
            modelsByType[type].forEach(name => console.log(`    - ${name}`))
        })

        // Create character physics body and keep it in sync
        character.physicsBody = physicsManager.addCharacterBody(character.getPosition(), 0.5, 1)

        // Set character body reference in physics manager for grab system
        physicsManager.setCharacterBody(character.physicsBody)

        // Initialize proximity interaction manager with loaded signpost and statue models
        const signpostModels = modelManager.getModelsByType('signpost')
        const statueModels = modelManager.getModelsByType('statue')

        console.log('🔍 Gathering interactive objects for ProximityInteractionManager:')
        console.log(`  - Signpost models: ${signpostModels.length}`)
        signpostModels.forEach((entry, i) => {
            console.log(`    [${i}] ${entry.item.name} (${entry.item.type}) - has URL: ${!!entry.item.url}`)
        })
        console.log(`  - Statue models: ${statueModels.length}`)
        statueModels.forEach((entry, i) => {
            console.log(`    [${i}] ${entry.item.name} (${entry.item.type}) - has URL: ${!!entry.item.url}`)
        })

        const interactiveObjects = [...signpostModels, ...statueModels]
        console.log(`  - Total interactive objects: ${interactiveObjects.length}`)

        proximityManager = new ProximityInteractionManager(interactiveObjects, scene, {
            interactionDistance: 3.5,
            showVisualizers: false,  // Visualizers disabled
            visualizerColor: 0x00ffff,
            visualizerOpacity: 0.3
        })

        // Add some example floor text
        setupExampleText()
        setupCreatorText()
        setupGalleryText()

        console.log('Scene initialization complete')
    } catch (error) {
        console.error('Error initializing scene:', error)
    }
}

// Setup example text on the floor
function setupExampleText() {
    // Add welcome text
    environmentManager.addFloorText('Uchinoko Kawaii',
        { x: 0, z: 10 },
        {
            font: '10px Silkscreen',
            color: '#FFFFFF',
            outline: false,
            outlineColor: '#000000',
            outlineWidth: 2,
            scale: 4
        }
    )

    // Add directional text
    environmentManager.addFloorText('Welcome!',
        { x: 0, z: 5 },
        {
            font: '16px Silkscreen',
            color: '#ffffffff',
            // outline: true,
            outlineColor: '#1cf7ffff',
            scale: 2
        }
    )

    // Add instructions
    environmentManager.addFloorText('Use        to move around',
        { x: 0, z: 12 },
        {
            font: '14px Silkscreen',
            color: '#ffffffff',
            // outline: true,
            outlineColor: '#ffffffff',
            scale: 2
        }
    )

    environmentManager.addFloorText('Press    to reset position',
        { x: 0, z: 14 },
        {
            font: '10px Silkscreen',
            color: '#ffffffff',
            // outline: true,
            outlineColor: '#ffffffff',
            scale: 2
        }
    )

    environmentManager.addFloorText('Use    to grab objects',
        { x: 0, z: 16 },
        {
            font: '10px Silkscreen',
            color: '#ffffffff',
            // outline: true,
            outlineColor: '#ffffffff',
            scale: 2
        }
    )
}

function setupCreatorText() {
    environmentManager.addFloorText('This site has been created by',
        { x: -20, z: -12 },
        {
            font: '10px Silkscreen',
            color: '#FFFFFF',
            outline: false,
            outlineColor: '#000000',
            outlineWidth: 2,
            scale: 2
        }
    )
    environmentManager.addFloorText('Kyoronginus',
        { x: -20, z: -10 },
        {
            font: '10px Silkscreen',
            color: '#FFFFFF',
            outline: false,
            outlineColor: '#000000',
            outlineWidth: 2,
            scale: 2
        }
    ),
        environmentManager.addFloorText('Visit my other projects',
            { x: -20, z: -2 },
            {
                font: '10px Silkscreen',
                color: '#FFFFFF',
                outline: false,
                outlineColor: '#000000',
                outlineWidth: 2,
                scale: 2
            }
        )
}

function setupGalleryText() {
    environmentManager.addFloorText('2023-2024',
        { x: 14, z: -25 },
        {
            font: '10px Silkscreen',
            color: '#FFFFFF',
            outline: false,
            outlineColor: '#000000',
            outlineWidth: 2,
            scale: 2
        }
    )
    environmentManager.addFloorText('2024-2025',
        { x: 14, z: -15 },
        {
            font: '10px Silkscreen',
            color: '#FFFFFF',
            outline: false,
            outlineColor: '#000000',
            outlineWidth: 2,
            scale: 2
        }
    )
}

// Start scene initialization
initializeScene()

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    const distance = character.getPosition().distanceTo(camera.position);
    hd2dRenderer.setFocusDistance(distance);
    const deltaTime = 1 / 60; 
    character.update()


    const charPos = character.getPosition();
    let inAnyZone = false;
    for (const zone of cameraAngleZones) {
        if (zone.box.containsPoint(charPos)) {
            inAnyZone = true;
            if (currentAngleZone !== zone) {
                currentAngleZone = zone;
                cameraController.setFollowAngle(zone.angle);
            }
            break;
        }
    }
    if (!inAnyZone && currentAngleZone !== null) {
        currentAngleZone = null;
        cameraController.resetToDefaultAngle();
    }



    // Drive the character's physics body from input
    if (character.physicsBody) {
        // Set horizontal velocity from input (use character.moveSpeed)
        const desiredVel = character.getDesiredVelocity ? character.getDesiredVelocity() : new THREE.Vector3()
        character.physicsBody.velocity.x = desiredVel.x
        character.physicsBody.velocity.z = desiredVel.z
        // Optional: keep character upright on ground plane
        character.physicsBody.position.y = Math.max(character.physicsBody.position.y, 0.9)
    }

    // Apply character repulsion bubble after stepping if available
    if (physicsManager.applyCharacterRepulsion && character.physicsBody) {
        physicsManager.applyCharacterRepulsion(character.physicsBody)
    }


    physicsManager.step(deltaTime)

    // Sync character position from physics
    if (character.physicsBody && character.sprite) {
        const p = character.physicsBody.position
        character.position.set(p.x, p.y, p.z)
        character.sprite.position.copy(character.position)
    }

    // Update proximity interactions if manager is initialized
    if (proximityManager) {
        const charPos = character.getPosition();
        proximityManager.update(charPos);
    }

    // Update camera and render
    cameraController.update()
    hd2dRenderer.render(scene, camera)
}

// Handle resize
window.addEventListener('resize', () => {
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    hd2dRenderer.setSize(sizes.width, sizes.height)
})

startButton.addEventListener('click', () => {
    console.log('Starting 3D world...');
    loadingOverlay.style.opacity = '0';
    setTimeout(() => {
        loadingOverlay.style.display = 'none';
        animate();
    }, 500);
});
