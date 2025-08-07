import * as THREE from 'three'
import { CameraController } from './controllers/CameraController.js'
import { HD2DRenderer } from './rendering/HD2DRenderer.js'
import { PixelCharacter } from './characters/PixelCharacter.js'
import { SignpostManager } from './objects/SignpostManager.js'
import { LightingManager } from './lighting/LightingManager.js'
import { ProjectZoneManager } from './interaction/ProjectZoneManager.js'
import { EnvironmentManager } from './environment/EnvironmentManager.js'
import { TextManager } from './environment/TextManager.js';
// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()
scene.fog = new THREE.Fog(0xffffff, 20, 40) // Atmospheric fog for depth

// Sizes
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

// Camera
const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.1, 100)
camera.position.set(0, 12, 12)

// ピクセルキャラクター作成
const character = new PixelCharacter('/default_standing.png', scene, camera)

// Camera Controller (キャラクター追従モード)
const cameraController = new CameraController(camera, character)

// HD-2D Renderer
const hd2dRenderer = new HD2DRenderer(canvas, sizes)

// Initialize managers
const signpostManager = new SignpostManager(scene)
const lightingManager = new LightingManager(scene)
const environmentManager = new EnvironmentManager(scene)

// Project zone manager will be initialized after signposts are loaded
let projectZoneManager = null
const textManager = new TextManager(scene);
textManager.createWelcomeText();
// Initialize the scene asynchronously
async function initializeScene() {
    try {
        // Setup lighting
        lightingManager.setupLighting()

        // Setup environment (floor, background, etc.)
        await environmentManager.setupEnvironment()

        // Load all signposts
        await signpostManager.loadAllSignposts()

        // Initialize project zone manager with loaded projects
        projectZoneManager = new ProjectZoneManager(signpostManager.getProjects())

        // Add some example floor text
        setupExampleText()

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
    environmentManager.addFloorText('← Projects →',
        { x: 0, z: 5 },
        {
            font: '16px Silkscreen',
            color: '#ffffffff',
            outline: true,
            outlineColor: '#1cf7ffff',
            scale: 2
        }
    )

    // Add instructions
    environmentManager.addFloorText('Use WASD to move around',
        { x: 0, z: 12 },
        {
            font: '14px Silkscreen',
            color: '#ffffffff',
            // outline: true,
            outlineColor: '#ffffffff',
            scale: 2
        }
    )
}

// Start scene initialization
initializeScene()

// Floor and environment loading is now handled by EnvironmentManager

// Lighting and background are now handled by LightingManager and EnvironmentManager

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // Update character
    character.update()

    // Update project zones if manager is initialized
    if (projectZoneManager) {
        const charPos = character.getPosition();
        projectZoneManager.update(charPos);
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

animate()
