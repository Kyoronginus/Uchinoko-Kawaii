import * as THREE from 'three'
import { CameraController } from './controllers/CameraController.js'
import { HD2DRenderer } from './rendering/HD2DRenderer.js'
import { PixelCharacter } from './characters/PixelCharacter.js'
import { ModelManager } from './objects/ModelManager.js'
import { LightingManager } from './lighting/LightingManager.js'
import { ProjectZoneManager } from './interaction/ProjectZoneManager.js'
import { EnvironmentManager } from './environment/EnvironmentManager.js'
import { TextManager } from './environment/TextManager.js';
import { PhysicsManager } from './physics/PhysicsManager.js'

const loadingOverlay = document.getElementById('loading-overlay');
const progressBarFill = document.getElementById('progress-bar-fill');
const startButton = document.getElementById('start-button');
// ★★★★★ 1. DefaultLoadingManager を使用（全ローダーを自動追跡） ★★★★★ s
const loadingManager = THREE.DefaultLoadingManager

// 完了時の処理（全アセットが読み込み終わったら）
loadingManager.onLoad = () => {
    console.log('✅ すべてのアセットのロードが完了しました');
    if (progressBarFill) progressBarFill.style.width = '100%';
    setTimeout(() => {
        if (startButton) {
            startButton.style.display = 'block';
            startButton.style.opacity = '1';
        }
    }, 500);
}
// 進捗中の処理
loadingManager.onProgress = (itemUrl, itemsLoaded, itemsTotal) => {
    const progress = itemsTotal > 0 ? (itemsLoaded / itemsTotal) : 0;
    if (progressBarFill) progressBarFill.style.width = `${progress * 100}%`;
    console.log(`📦 ロード進捗: ${Math.round(progress * 100)}% (${itemsLoaded}/${itemsTotal}) - ${itemUrl}`);
}
// エラー時の処理
loadingManager.onError = (url) => {
    console.error('❌ アセットのロードに失敗:', url);
}
// ★★★★★ ここまで ★★★★★


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

// ピクセルキャラクター作成
const character = new PixelCharacter('/default_standing.png', scene, camera)

// Camera Controller (キャラクター追従モード)
const cameraController = new CameraController(camera, character)
const cameraAngleZones = [

    //look above for standee
    {
        // ゾーンの範囲
        box: new THREE.Box3(
            new THREE.Vector3(-1, -Infinity, -9), // 最小座標
            new THREE.Vector3(1, Infinity, -7)       // 最大座標
        ),
        // このゾーンに入ったときの新しいカメラアングル
        angle: {
            // for gallery
            followDistance: new THREE.Vector3(0, 3, 8), // キャラクターからの相対位置
            lookAtOffset: new THREE.Vector3(0, 3, 0) // 見る位置のオフセット      // 少し上を見る
        }
    },
    //Gallery
    {
        // ゾーンの範囲
        box: new THREE.Box3(
            new THREE.Vector3(8, -Infinity, -30), // 最小座標
            new THREE.Vector3(68, Infinity, -10)       // 最大座標
        ),
        // このゾーンに入ったときの新しいカメラアングル
        angle: {
            // for gallery
            followDistance: new THREE.Vector3(0, 3, 8), // キャラクターからの相対位置
            lookAtOffset: new THREE.Vector3(0, 3, 0) // 見る位置のオフセット      // 少し上を見る
        }
    },
    // Creator
    {
        // ゾーンの範囲
        box: new THREE.Box3(
            new THREE.Vector3(-28, -Infinity, -40), // 最小座標
            new THREE.Vector3(-3, Infinity, 5)       // 最大座標
        ),
        // このゾーンに入ったときの新しいカメラアングル
        angle: {
            // for gallery
            followDistance: new THREE.Vector3(0, 13, 8), // キャラクターからの相対位置
            lookAtOffset: new THREE.Vector3(0, 3, 0) // 見る位置のオフセット      // 少し上を見る
        }
    },
    // Playground
    {
        // ゾーンの範囲
        box: new THREE.Box3(
            new THREE.Vector3(18, -Infinity, 0), // 最小座標
            new THREE.Vector3(40, Infinity, 20)       // 最大座標
        ),
        // このゾーンに入ったときの新しいカメラアングル
        angle: {
            // for gallery
            followDistance: new THREE.Vector3(0, 2, 8), // キャラクターからの相対位置
            lookAtOffset: new THREE.Vector3(0, 1, 0) // 見る位置のオフセット      // 少し上を見る
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

// // Create grab status indicator
// const grabStatusElement = document.createElement('div')
// grabStatusElement.style.position = 'fixed'
// grabStatusElement.style.top = '20px'
// grabStatusElement.style.left = '20px'
// grabStatusElement.style.color = 'white'
// grabStatusElement.style.fontFamily = 'monospace'
// grabStatusElement.style.fontSize = '14px'
// grabStatusElement.style.backgroundColor = 'rgba(0,0,0,0.7)'
// grabStatusElement.style.padding = '10px'
// grabStatusElement.style.borderRadius = '5px'
// grabStatusElement.style.zIndex = '1000'
// grabStatusElement.innerHTML = 'Press G to grab/release objects<br>WASD to move, R to reset'
// document.body.appendChild(grabStatusElement)
const lightingManager = new LightingManager(scene)
const environmentManager = new EnvironmentManager(scene)
let projectZoneManager = null

const textManager = new TextManager(scene);
textManager.createWelcomeText();
// Initialize the scene asynchronouslya
async function initializeScene() {
    try {
        // Setup lighting
        lightingManager.setupLighting()

        // Setup environment (floor, background, etc.)
        await environmentManager.setupEnvironment()

        // Load all models (both untextured models and signposts)
        await modelManager.loadAllModels()

        // Create character physics body and keep it in sync
        character.physicsBody = physicsManager.addCharacterBody(character.getPosition(), 0.5, 1)

        // Set character body reference in physics manager for grab system
        physicsManager.setCharacterBody(character.physicsBody)

        // Initialize project zone manager with loaded signpost and statue models
        const signpostModels = modelManager.getModelsByType('signpost')
        const statueModels = modelManager.getModelsByType('statue')
        const projectEntries = [...signpostModels, ...statueModels]
        projectZoneManager = new ProjectZoneManager(projectEntries)

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

// Floor and environment loading is now handled by EnvironmentManager

// Lighting and background are now handled by LightingManager and EnvironmentManager

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    // Update depth-of-field focus distance based on character position
    const distance = character.getPosition().distanceTo(camera.position);
    hd2dRenderer.setFocusDistance(distance);
    // Update character input and visuals (will set desired velocity)
    const deltaTime = 1 / 60; // Approximate delta time for 60fps
    character.update()


    const charPos = character.getPosition();
    let inAnyZone = false;

    // すべてのカメラゾーンをチェック
    for (const zone of cameraAngleZones) {
        if (zone.box.containsPoint(charPos)) {
            inAnyZone = true;
            if (currentAngleZone !== zone) {
                // 新しいゾーンに入ったので、カメラアングルを変更
                currentAngleZone = zone;
                cameraController.setFollowAngle(zone.angle);
            }
            break;
        }
    }

    // どのゾーンにも入っていない場合
    if (!inAnyZone && currentAngleZone !== null) {
        // デフォルトのアングルに戻す
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

    // Step physics and sync meshes

    // Apply character repulsion bubble after stepping if available
    if (physicsManager.applyCharacterRepulsion && character.physicsBody) {
        physicsManager.applyCharacterRepulsion(character.physicsBody)
    }

    // // Update grab system
    // if (character.physicsBody) {
    //     physicsManager.updateGrabSystem(character.physicsBody)

    //     // Update grab status display
    //     const isGrabbing = physicsManager.isGrabbing()
    //     const grabbedBody = physicsManager.getGrabbedBody()
    //     if (isGrabbing && grabbedBody) {
    //         const mesh = physicsManager.getMeshForBody(grabbedBody)
    //         const objectName = mesh?.name || 'object'
    //         grabStatusElement.innerHTML = `Press G to grab/release objects<br>WASD to move, R to reset<br><span style="color: #4f4;">Currently holding: ${objectName}</span>`
    //     } else {
    //         grabStatusElement.innerHTML = 'Press G to grab/release objects<br>WASD to move, R to reset'
    //     }
    // }

    physicsManager.step(deltaTime)

    // Sync character position from physics
    if (character.physicsBody && character.sprite) {
        const p = character.physicsBody.position
        character.position.set(p.x, p.y, p.z)
        character.sprite.position.copy(character.position)
    }

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

startButton.addEventListener('click', () => {
    console.log('🚀 3Dワールドを開始します');
    loadingOverlay.style.opacity = '0'; // フェードアウト
    setTimeout(() => {
        loadingOverlay.style.display = 'none'; // 完全に非表示に
        animate(); // ★ ここでアニメーションを開始
    }, 500);
});

// ★ 最初はanimate()を呼ばない（STARTボタンが押されるまで待機）
// animate() ← この行をコメントアウトまたは削除
