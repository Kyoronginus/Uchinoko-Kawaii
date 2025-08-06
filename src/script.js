import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { CameraController } from './controllers/CameraController.js'
import { HD2DRenderer } from './rendering/HD2DRenderer.js'
import { PixelCharacter } from './characters/PixelCharacter.js'

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
const character = new PixelCharacter('/default_standing.png', scene)

// Camera Controller (キャラクター追従モード)
const cameraController = new CameraController(camera, character)

// HD-2D Renderer
const hd2dRenderer = new HD2DRenderer(canvas, sizes)

// GLTF Loader for Blender mesh
const gltfLoader = new GLTFLoader()
const textureLoader = new THREE.TextureLoader();

const linkContainer = document.getElementById('project-link-container');
const linkElement = linkContainer.querySelector('a');
let activeZone = null;

// Unified Projects - combines signpost and interaction zone data
const projects = [
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
        screenshotPath: '/project_ss/Fibonacci_Detection.png',
        position: new THREE.Vector3(0, 0, 5),
        rotation: new THREE.Euler(0, 3 * Math.PI / 2, 0),
        scale: new THREE.Vector3(2, 2, 2),
        // Interaction zone properties
        zoneWidth: 4,
        zoneDepth: 4,
        url: 'https://fibonacci-spiral-detecti-bf743.web.app/',
        name: 'Visit Fibonacci Detection'
    }
];

projects.forEach(project => {
    // スクリーンショットのテクスチャを読み込む
    const screenshotTexture = textureLoader.load(project.screenshotPath);

    // 掲示板のモデルを読み込む
    gltfLoader.load(project.modelPath, (gltf) => {
        const signpost = gltf.scene;
        signpost.position.copy(project.position);
        signpost.rotation.copy(project.rotation);
        signpost.scale.copy(project.scale);



        // Load the texture
        textureLoader.load(project.screenshotPath, (texture) => {

            // ✅ ADD THESE TWO LINES TO FIX HORIZONTAL FLIPPING
            texture.wrapS = THREE.RepeatWrapping;
            texture.repeat.x = -1;

            // Apply the texture to the signpost
            signpost.traverse((child) => {
                if (child.isMesh && child.material.name === 'M_Screen') {
                    child.material.map = texture;
                    // child.material.emissive = new THREE.Color(0xffff00); // 発光させて明るく見せる
                    child.material.emissiveMap = screenshotTexture;
                }
            });
        });

        // Enable shadow casting for all meshes in the signpost
        signpost.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true
                child.receiveShadow = true

                // Apply screen texture if this is the screen material
                if (child.material.name === 'M_Screen') {
                    child.castShadow = false;
                    child.receiveShadow = false;
                    child.material.map = screenshotTexture;
                    child.material.emissiveMap = screenshotTexture;
                }
            }
        });

        scene.add(signpost);
    });
});

// Load floor mesh
gltfLoader.load(
    '/floor.glb', // Updated path - place file in public folder root
    (gltf) => {
        console.log('GLTF loaded successfully:', gltf)

        const floorMesh = gltf.scene.children.find(child => child.name === 'Plane')
        if (floorMesh) {
            console.log('Found HD2D_surface mesh')
            floorMesh.position.set(0, 0, 0)

            // Enable shadow receiving for all floor meshes
            floorMesh.traverse((child) => {
                if (child.isMesh) {
                    child.receiveShadow = true
                    child.castShadow = false // Floor shouldn't cast shadows
                }
            })

            scene.add(floorMesh)
        } else {
            console.log('HD2D_surface mesh not found, adding entire scene')
            console.log('Available children:', gltf.scene.children.map(child => child.name))

            // Enable shadows for all meshes in the scene as fallback
            gltf.scene.traverse((child) => {
                if (child.isMesh) {
                    child.receiveShadow = true
                }
            })
        }
        // scene.add(gltf.scene)
    },
    (progress) => {
        console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%')
    },
    (error) => {
        console.error('Error loading floor mesh:', error)
        console.log('Falling back to procedural floor')
        createFallbackFloor()
    }
)


// Fallback floor creation
function createFallbackFloor() {
    const floorGeometry = new THREE.PlaneGeometry(20, 20)
    const floorMaterial = new THREE.MeshLambertMaterial({
        color: 0x8B4513,
        transparent: true,
        opacity: 0.8
    })
    const floor = new THREE.Mesh(floorGeometry, floorMaterial)
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    scene.add(floor)
}

// Lighting setup
const ambientLight = new THREE.AmbientLight(0xffffff,2)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 3)
directionalLight.position.set(10, 10, 5)
directionalLight.castShadow = true

// Configure shadow camera for optimal coverage
directionalLight.shadow.camera.near = 0.1
directionalLight.shadow.camera.far = 100
directionalLight.shadow.camera.left = -20
directionalLight.shadow.camera.right = 20
directionalLight.shadow.camera.top = 20
directionalLight.shadow.camera.bottom = -20

// High quality shadow settings
directionalLight.shadow.mapSize.width = 128
directionalLight.shadow.mapSize.height = 128
directionalLight.shadow.bias = -0.0001 // Reduce shadow acne

scene.add(directionalLight)

//background color
scene.background = new THREE.Color(0xffffff);

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    const charPos = character.getPosition();
    let inAnyZone = false;

    for (const project of projects) {
        const isInside =
            charPos.x > project.position.x - project.zoneWidth / 2 &&
            charPos.x < project.position.x + project.zoneWidth / 2 &&
            charPos.z > project.position.z - project.zoneDepth / 2 &&
            charPos.z < project.position.z + project.zoneDepth / 2;

        if (isInside) {
            inAnyZone = true;
            if (activeZone !== project) {
                // 新しいゾーンに入った
                activeZone = project;
                linkElement.href = project.url;
                linkElement.textContent = project.name;
                linkContainer.classList.remove('hidden');
            }
            break; // 一つのゾーンにしか入れない前提
        }
    }

    if (!inAnyZone && activeZone) {
        // どのゾーンからも出た
        activeZone = null;
        linkContainer.classList.add('hidden');
    }
    character.update()
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
