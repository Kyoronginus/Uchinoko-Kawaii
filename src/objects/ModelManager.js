import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
/**
 * Unified manager for all 3D models in the scene - both untextured models and signposts
 * Uses consistent physics behavior with configurable mass (high mass = immovable like signposts)
 */
export class ModelManager {
    constructor(scene, physicsManager = null, loadingManager = null) {
        this.scene = scene
        this.physics = physicsManager
        // this.gltfLoader = new GLTFLoader(loadingManager)
        this.gltfLoader = new GLTFLoader()
        const dracoLoader = new DRACOLoader()
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/')
        this.gltfLoader.setDRACOLoader(dracoLoader)
        this.textureLoader = new THREE.TextureLoader()
        this.models = []

        // Unified model configurations
        this.items = [
            // Untextured models (letters/text) - low mass, movable
            {
                modelPath: '/letters_3D/V.glb',
                position: new THREE.Vector3(-2, 0, 4),
                rotation: new THREE.Euler(0, 0, 0),
                scale: new THREE.Vector3(2.5, 2.5, 2.5),
                type: 'untextured',
                enableCollision: true,
                enablePhysics: true,
                mass: 2,
                friction: 0.6,
                physicsShape: 'box',
                interactionCallback: null, // Will be set during loading
            },
            {
                modelPath: '/letters_3D/E.glb',
                position: new THREE.Vector3(-1, 0, 4),
                rotation: new THREE.Euler(0, 0, 0),
                scale: new THREE.Vector3(2.5, 2.5, 2.5),
                type: 'untextured',
                enableCollision: true,
                enablePhysics: true,
                mass: 2,
                friction: 0.6,
                physicsShape: 'box',
                interactionCallback: null, // Will be set during loading
            },
            {
                modelPath: '/letters_3D/N.glb',
                position: new THREE.Vector3(0, 0, 4),
                rotation: new THREE.Euler(0, 0, 0),
                scale: new THREE.Vector3(2.5, 2.5, 2.5),
                type: 'untextured',
                enableCollision: true,
                enablePhysics: true,
                mass: 2,
                friction: 0.6,
                physicsShape: 'box',
                interactionCallback: null, // Will be set during loading
            },
            {
                modelPath: '/letters_3D/N.glb',
                position: new THREE.Vector3(1.1, 0, 4),
                rotation: new THREE.Euler(0, 0, 0),
                scale: new THREE.Vector3(2.5, 2.5, 2.5),
                type: 'untextured',
                enableCollision: true,
                enablePhysics: true,
                mass: 2,
                friction: 0.6,
                physicsShape: 'box',
                interactionCallback: null, // Will be set during loading
            },
            {
                modelPath: '/letters_3D/A.glb',
                position: new THREE.Vector3(2.3, 0, 4),
                rotation: new THREE.Euler(0, 0, 0),
                scale: new THREE.Vector3(2.5, 2.5, 2.5),
                type: 'untextured',
                enableCollision: true,
                enablePhysics: true,
                mass: 2,
                friction: 0.6,
                physicsShape: 'box',
                interactionCallback: null, // Will be set during loading
            },
            {
                modelPath: '/letters_3D/VENNA_TEXT.glb',
                position: new THREE.Vector3(-20, 7, -15),
                rotation: new THREE.Euler(3 * Math.PI / 2, 0, 0),
                scale: new THREE.Vector3(3, 3, 3),
                type: 'untextured',
                enableCollision: true,
                enablePhysics: true,
                physicsShape: 'box',
                mass: 200,
                interactionCallback: null, // Will be set during loading
            },
            // Signposts - very high mass, effectively immovable
            {
                // modelPath: '/signpost_compressed.glb',
                // screenshotPath: '/project_ss/oc_2.png',
                // position: new THREE.Vector3(10, 0, 5),
                // rotation: new THREE.Euler(0, 3 * Math.PI / 2, 0),
                // scale: new THREE.Vector3(2, 2, 2),
                // type: 'signpost',
                // enableCollision: true,
                // enablePhysics: true,
                // mass: 10000, // Very high mass = effectively immovable
                // friction: 0.8,
                // physicsShape: 'box',
                // Signpost-specific properties
                // zoneWidth: 4,
                // zoneDepth: 4,
                // url: 'https://example.com/project_a',
                // name: 'Visit ColorAnalyzer'
            },
            {
                modelPath: '/signpost_compressed.glb',
                screenshotPath: '/project_ss/header.png',
                position: new THREE.Vector3(-10, 0, 5),
                rotation: new THREE.Euler(0, 3 * Math.PI / 2, 0),
                scale: new THREE.Vector3(1.5, 1.5, 1.5),
                type: 'signpost',
                enableCollision: true,
                enablePhysics: true,
                mass: 10000, // Very high mass = effectively immovable
                friction: 0.8,
                physicsShape: 'box',
                // Signpost-specific properties
                // zoneWidth: 4,
                // zoneDepth: 4,
                // url: 'https://fibonacci-spiral-detecti-bf743.web.app/',
                // name: 'Hi!'
            },

            // WASD
            {
                modelPath: '/letters_3D/W.glb',
                position: new THREE.Vector3(-3.7, 0, 11.5),
                rotation: new THREE.Euler(0, 0, 0),
                scale: new THREE.Vector3(1.3, 1.3, 1.3),
                type: 'untextured',
                enableCollision: true,
                enablePhysics: true,
                physicsShape: 'sphere',
                mass: 0.3,
                interactionCallback: null, // Will be set during loading
            },
            {
                modelPath: '/letters_3D/A.glb',
                position: new THREE.Vector3(-4.7, 1, 12.5),
                rotation: new THREE.Euler(3 / 2 * Math.PI, 0, 0),
                scale: new THREE.Vector3(1.3, 1.3, 1.3),
                type: 'untextured',
                enableCollision: true,
                enablePhysics: true,
                physicsShape: 'sphere',
                mass: 0.3,
                interactionCallback: null, // Will be set during loading
            },
            {
                modelPath: '/letters_3D/S.glb',
                position: new THREE.Vector3(-3.7, 0, 12.5),
                rotation: new THREE.Euler(0, 0, 0),
                scale: new THREE.Vector3(1.3, 1.3, 1.3),
                type: 'untextured',
                enableCollision: true,
                enablePhysics: true,
                physicsShape: 'sphere',
                mass: 0.3,
                interactionCallback: null, // Will be set during loading
            },
            {
                modelPath: '/letters_3D/D.glb',
                position: new THREE.Vector3(-2.7, 0, 12.5),
                rotation: new THREE.Euler(0, 0, 0),
                scale: new THREE.Vector3(1.3, 1.3, 1.3),
                type: 'untextured',
                enableCollision: true,
                enablePhysics: true,
                physicsShape: 'sphere',
                mass: 0.3,
                interactionCallback: null, // Will be set during loading
            }, {
                modelPath: '/letters_3D/R.glb',
                position: new THREE.Vector3(-2.7, 0, 14.1),
                rotation: new THREE.Euler(0, 0, 0),
                scale: new THREE.Vector3(1.3, 1.3, 1.3),
                type: 'untextured',
                enableCollision: true,
                enablePhysics: true,
                physicsShape: 'sphere',
                mass: 0.3,
                interactionCallback: null, // Will be set during loading
            },


            //beveled_cube
            {
                modelPath: '/beveled_cube.glb',
                position: new THREE.Vector3(9, 0, 12.5),
                rotation: new THREE.Euler(0, 3 * Math.PI / 5, 0),
                scale: new THREE.Vector3(4, 4, 4),
                type: 'untextured',
                enableCollision: true,
                enablePhysics: true,
                physicsShape: 'box',
                mass: 0.3,
                interactionCallback: null, // Will be set during loading
            },
            {
                modelPath: '/beveled_cube_yellow.glb',
                position: new THREE.Vector3(8.8, 5, 12.5),
                rotation: new THREE.Euler(0, 7 * Math.PI / 5, 0),
                scale: new THREE.Vector3(3.6, 3.6, 3.6),
                type: 'untextured',
                enableCollision: true,
                enablePhysics: true,
                physicsShape: 'box',
                mass: 0.3,
                interactionCallback: null, // Will be set during loading
            },
            {
                modelPath: '/beveled_cube_pink.glb',
                position: new THREE.Vector3(-9, 0.1, 10.5),
                rotation: new THREE.Euler(0, 7 * Math.PI / 5, 0),
                scale: new THREE.Vector3(3.6, 3.6, 3.6),
                type: 'untextured',
                enableCollision: true,
                enablePhysics: true,
                physicsShape: 'box',
                mass: 3,
                interactionCallback: null, // Will be set during loading
            },
            {
                modelPath: '/beveled_cube.glb',
                position: new THREE.Vector3(-5, 0.11, 6),
                rotation: new THREE.Euler(0, 7 * Math.PI / 5, 0),
                scale: new THREE.Vector3(1, 1, 1),
                type: 'untextured',
                enableCollision: true,
                enablePhysics: true,
                physicsShape: 'box',
                mass: 3,
                interactionCallback: null, // Will be set during sloading
            },
            //foundation_acrylic_stand
            {
                modelPath: '/foundation_chibi_acrylic_stand.glb',
                position: new THREE.Vector3(0, 5, -12.5),
                rotation: new THREE.Euler(0, 0, 0),
                scale: new THREE.Vector3(3, 3, 3),
                type: 'untextured',
                enableCollision: true,
                enablePhysics: true,
                physicsShape: 'box',
                mass: 300,
                interactionCallback: null, // Will be set during loading
            },
            // trees
            {
                modelPath: '/Tree.glb',
                position: new THREE.Vector3(-5, 0.1, 3),
                rotation: new THREE.Euler(0, 0, 0),
                scale: new THREE.Vector3(1, 1, 1),
                type: 'untextured',
                enableCollision: true,
                enablePhysics: true,
                physicsShape: 'box',
                mass: 300,
                interactionCallback: null, // Will be set during loading
            },
            {
                modelPath: '/Tree.glb',
                position: new THREE.Vector3(5, 0.1, 3),
                rotation: new THREE.Euler(0, 1 * Math.PI / 2, 0),
                scale: new THREE.Vector3(1, 1, 1),
                type: 'untextured',
                enableCollision: true,
                enablePhysics: true,
                physicsShape: 'box',
                mass: 300,
                interactionCallback: null, // Will be set during loading
            },
            {
                modelPath: '/Tree.glb',
                position: new THREE.Vector3(4, 0.1, -1),
                rotation: new THREE.Euler(0, 2 * Math.PI / 2, 0),
                scale: new THREE.Vector3(0.90, 0.90, 0.90),
                type: 'untextured',
                enableCollision: true,
                enablePhysics: true,
                mass: 300
            },
            {
                modelPath: '/Tree.glb',
                position: new THREE.Vector3(-4, 0.1, 0),
                rotation: new THREE.Euler(0, 3 * Math.PI / 2, 0),
                scale: new THREE.Vector3(0.90, 0.90, 0.90),
                type: 'untextured',
                enableCollision: true,
                enablePhysics: true,
                physicsShape: 'box',
                mass: 300,
                interactionCallback: null, // Will be set during loading
            },
            //stones
            {
                modelPath: '/Stone_1.glb',
                position: new THREE.Vector3(4, 0.1, 4),
                rotation: new THREE.Euler(0, 3 * Math.PI / 2, 0),
                scale: new THREE.Vector3(0.5, 0.5, 0.5),
                type: 'untextured',
                enableCollision: true,
                enablePhysics: true,
                physicsShape: 'box',
                mass: 30,
                interactionCallback: null, // Will be set during loading
            },
            {
                modelPath: '/Stone_2.glb',
                position: new THREE.Vector3(4.3, 0.1, 5),
                rotation: new THREE.Euler(0, 7 * Math.PI / 2, 0),
                scale: new THREE.Vector3(0.3, 0.3, 0.3),
                type: 'untextured',
                enableCollision: true,
                enablePhysics: true,
                physicsShape: 'box',
                mass: 30,
                interactionCallback: null, // Will be set during loading
            },
            {
                modelPath: '/Stone_2.glb',
                position: new THREE.Vector3(-4.3, 0.1, 4),
                rotation: new THREE.Euler(0, 9 * Math.PI / 2, 0),
                scale: new THREE.Vector3(0.3, 0.3, 0.3),
                type: 'untextured',
                enableCollision: true,
                enablePhysics: true,
                physicsShape: 'box',
                mass: 30,
                interactionCallback: null, // Will be set during loading
            },
            //tiles_mainpath
            {
                modelPath: '/Tile.glb',
                position: new THREE.Vector3(0.1, 0.1, 2),
                rotation: new THREE.Euler(0, 0, 0),
                scale: new THREE.Vector3(0.7, 0.7, 0.7),
                type: 'untextured',
                physicsShape: 'box',
                mass: 30
            },
            {
                modelPath: '/Tile.glb',
                position: new THREE.Vector3(-0.3, 0.1, 0),
                rotation: new THREE.Euler(0, 0, 0),
                scale: new THREE.Vector3(0.7, 0.7, 0.7),
                type: 'untextured',
                physicsShape: 'box',
                mass: 30
            },
            {
                modelPath: '/Tile.glb',
                position: new THREE.Vector3(0.3, 0.1, -2),
                rotation: new THREE.Euler(0, 0, 0),
                scale: new THREE.Vector3(0.7, 0.7, 0.7),
                type: 'untextured',
                physicsShape: 'box',
                mass: 30
            },
            {
                modelPath: '/Tile_cracked_1.glb',
                position: new THREE.Vector3(-0.1, 0.1, -4),
                rotation: new THREE.Euler(0, 0, 0),
                scale: new THREE.Vector3(0.7, 0.7, 0.7),
                type: 'untextured',
                physicsShape: 'box',
                mass: 30
            },
            {
                modelPath: '/Tile.glb',
                position: new THREE.Vector3(0.4, 0.1, -6),
                rotation: new THREE.Euler(0, 0, 0),
                scale: new THREE.Vector3(0.7, 0.7, 0.7),
                type: 'untextured',
                physicsShape: 'box',
                mass: 30
            },
            //tiles_gallery
            {
                modelPath: '/Tile.glb',
                position: new THREE.Vector3(8, 0.1, -13),
                rotation: new THREE.Euler(0, 0, 0),
                scale: new THREE.Vector3(0.7, 0.7, 0.7),
                type: 'untextured',
                physicsShape: 'box',
                mass: 30
            },
            {
                modelPath: '/Tile.glb',
                position: new THREE.Vector3(10, 0.1, -13.5),
                rotation: new THREE.Euler(0, 0.1, 0),
                scale: new THREE.Vector3(0.7, 0.7, 0.7),
                type: 'untextured',
                physicsShape: 'box',
                mass: 30
            },
            {
                modelPath: '/Tile.glb',
                position: new THREE.Vector3(12, 0.1, -12.7),
                rotation: new THREE.Euler(0, 0, 0),
                scale: new THREE.Vector3(0.7, 0.7, 0.7),
                type: 'untextured',
                physicsShape: 'box',
                mass: 30
            },
            {
                modelPath: '/Tile_cracked_1.glb',
                position: new THREE.Vector3(14, 0.1, -13.1),
                rotation: new THREE.Euler(0, 0, 0),
                scale: new THREE.Vector3(0.7, 0.7, 0.7),
                type: 'untextured',
                physicsShape: 'box',
                mass: 30
            },
            {
                modelPath: '/Tile_cracked_1.glb',
                position: new THREE.Vector3(16, 0.1, -13.1),
                rotation: new THREE.Euler(0, 0.91 / 2 * Math.PI, 0),
                scale: new THREE.Vector3(0.7, 0.7, 0.7),
                type: 'untextured',
                physicsShape: 'box',
                mass: 30
            },
            //Stones_gallery
            {
                modelPath: '/Stone_2.glb',
                position: new THREE.Vector3(16, 0.1, -14.3),
                rotation: new THREE.Euler(0, 9 * Math.PI / 2, 0),
                scale: new THREE.Vector3(0.3, 0.3, 0.3),
                type: 'untextured',
                enableCollision: true,
                enablePhysics: true,
                physicsShape: 'box',
                mass: 30,
                interactionCallback: null, // Will be set during loading
            },
            {
                modelPath: '/Stone_1.glb',
                position: new THREE.Vector3(7, 0.1, -14.3),
                rotation: new THREE.Euler(0, 9 * Math.PI / 2, 0),
                scale: new THREE.Vector3(0.3, 0.3, 0.3),
                type: 'untextured',
                enableCollision: true,
                enablePhysics: true,
                physicsShape: 'box',
                mass: 30,
                interactionCallback: null, // Will be set during loading
            },

            //Panel_gallery
            {
                modelPath: '/Panel_gallery.glb',
                position: new THREE.Vector3(3, 3, -7),
                rotation: new THREE.Euler(0, 0.8 / 2 * Math.PI, 0.8 / 2 * Math.PI),
                scale: new THREE.Vector3(1.2, 1.2, 1.2),
                type: 'untextured',
                physicsShape: 'box',
                enableCollision: true,
                enablePhysics: true,
                mass: 30
            },
            {
                modelPath: '/Panel_creator.glb',
                position: new THREE.Vector3(-3, 3, -7),
                rotation: new THREE.Euler(0, -0.8 / 2 * Math.PI, -0.8 / 2 * Math.PI),
                scale: new THREE.Vector3(1.2, 1.2, 1.2),
                type: 'untextured',
                physicsShape: 'box',
                enableCollision: true,
                enablePhysics: true,
                mass: 30
            },
            //directions
            {
                modelPath: '/left.glb',
                position: new THREE.Vector3(-3, 4, -6),
                rotation: new THREE.Euler(0, -0.9 / 2 * Math.PI, -0.8 / 2 * Math.PI),
                scale: new THREE.Vector3(1.8, 1.8, 1.8),
                type: 'untextured',
                physicsShape: 'box',
                enableCollision: true,
                enablePhysics: true,
                mass: 59
            },
            //directions
            {
                modelPath: '/left.glb',
                position: new THREE.Vector3(3, 4, -6),
                rotation: new THREE.Euler(0, 0.9 / 2 * Math.PI, 0.8 / 2 * Math.PI),
                scale: new THREE.Vector3(1.8, 1.8, 1.8),
                type: 'untextured',
                physicsShape: 'box',
                enableCollision: true,
                enablePhysics: true,
                mass: 59
            }
        ];

        this.gallery_items = [
            {
                modelPath: 'board_A4_portrait.glb',
                position: new THREE.Vector3(20, 0.3, -15),
                rotation: new THREE.Euler(0, 2 / 2 * Math.PI, 0),
                scale: new THREE.Vector3(2.5, 2.5, 2.5),
                type: 'screen',
                screenshotPath: '/venna_art/Illustration15.webp',
                enableCollision: true,
                enablePhysics: true,
                mass: 300,
                friction: 0.6,
                physicsShape: 'box',
                interactionCallback: null
            },
            {
                modelPath: 'board_A4_portrait.glb',
                position: new THREE.Vector3(28, -0.3, -15),
                rotation: new THREE.Euler(0, 2 / 2 * Math.PI, 0),
                scale: new THREE.Vector3(2.5, 2.5, 2.5),
                type: 'screen',
                screenshotPath: '/venna_art/Illustration22.webp',
                enableCollision: true,
                enablePhysics: true,
                mass: 300,
                friction: 0.6,
                physicsShape: 'box',
                interactionCallback: null
            },
            {
                modelPath: 'board_A4_portrait.glb',
                position: new THREE.Vector3(36, -0.3, -15),
                rotation: new THREE.Euler(0, 2 / 2 * Math.PI, 0),
                scale: new THREE.Vector3(2.5, 2.5, 2.5),
                type: 'screen',
                screenshotPath: '/venna_art/Illustration48.webp',
                enableCollision: true,
                enablePhysics: true,
                mass: 300,
                friction: 0.6,
                physicsShape: 'box',
                interactionCallback: null
            },
            {
                modelPath: 'board_A4_portrait.glb',
                position: new THREE.Vector3(44, -0.3, -15),
                rotation: new THREE.Euler(0, 2 / 2 * Math.PI, 0),
                scale: new THREE.Vector3(2.5, 2.5, 2.5),
                type: 'screen',
                screenshotPath: 'venna_art/Illustration139.clipbu.pngbu.webp',
                enableCollision: true,
                enablePhysics: true,
                mass: 300,
                friction: 0.6,
                physicsShape: 'box',
                interactionCallback: null
            },
            {
                modelPath: 'board_A4_portrait.glb',
                position: new THREE.Vector3(52, -0.3, -15),
                rotation: new THREE.Euler(0, 2 / 2 * Math.PI, 0),
                scale: new THREE.Vector3(2.5, 2.5, 2.5),
                type: 'screen',
                screenshotPath: 'venna_art/Illustration173.webp',
                enableCollision: true,
                enablePhysics: true,
                mass: 300,
                friction: 0.6,
                physicsShape: 'box',
                interactionCallback: null
            },
            {
                modelPath: 'board_A4_portrait.glb',
                position: new THREE.Vector3(52, -0.3, -25),
                rotation: new THREE.Euler(0, 2 / 2 * Math.PI, 0),
                scale: new THREE.Vector3(2.5, 2.5, 2.5),
                type: 'screen',
                screenshotPath: 'venna_art/Illustration157a.webp',
                enableCollision: true,
                enablePhysics: true,
                mass: 300,
                friction: 0.6,
                physicsShape: 'box',
                interactionCallback: null
            },
            {
                modelPath: 'board_A4_portrait.glb',
                position: new THREE.Vector3(44, -0.3, -25),
                rotation: new THREE.Euler(0, 2 / 2 * Math.PI, 0),
                scale: new THREE.Vector3(2.5, 2.5, 2.5),
                type: 'screen',
                screenshotPath: 'venna_art/Illustration184.webp',
                enableCollision: true,
                enablePhysics: true,
                mass: 300,
                friction: 0.6,
                physicsShape: 'box',
                interactionCallback: null
            },
            {
                modelPath: 'board_A4_portrait.glb',
                position: new THREE.Vector3(36, -0.3, -25),
                rotation: new THREE.Euler(0, 2 / 2 * Math.PI, 0),
                scale: new THREE.Vector3(2.5, 2.5, 2.5),
                type: 'screen',
                screenshotPath: 'venna_art/Illustration35.webp',
                enableCollision: true,
                enablePhysics: true,
                mass: 300,
                friction: 0.6,
                physicsShape: 'box',
                interactionCallback: null
            },
            {
                modelPath: 'board_A4_portrait.glb',
                position: new THREE.Vector3(28, -0.3, -25),
                rotation: new THREE.Euler(0, 2 / 2 * Math.PI, 0),
                scale: new THREE.Vector3(2.5, 2.5, 2.5),
                type: 'screen',
                screenshotPath: 'venna_art/Illustration32.webp',
                enableCollision: true,
                enablePhysics: true,
                mass: 300,
                friction: 0.6,
                physicsShape: 'box',
                interactionCallback: null
            },
            {
                modelPath: 'board_A4_portrait.glb',
                position: new THREE.Vector3(20, -0.3, -25),
                rotation: new THREE.Euler(0, 2 / 2 * Math.PI, 0),
                scale: new THREE.Vector3(2.5, 2.5, 2.5),
                type: 'screen',
                screenshotPath: 'venna_art/Illustration191.webp',
                enableCollision: true,
                enablePhysics: true,
                mass: 300,
                friction: 0.6,
                physicsShape: 'box',
                interactionCallback: null
            },
            {
                modelPath: 'board_A4_portrait.glb',
                position: new THREE.Vector3(20, -0.3, -35),
                rotation: new THREE.Euler(0, 2 / 2 * Math.PI, 0),
                scale: new THREE.Vector3(2.5, 2.5, 2.5),
                type: 'screen',
                screenshotPath: 'venna_art/Illustration49.webp',
                enableCollision: true,
                enablePhysics: true,
                mass: 300,
                friction: 0.6,
                physicsShape: 'box',
                interactionCallback: null
            },
            // {
            //     modelPath: 'foundation_acrylic_stand.glb',
            //     position: new THREE.Vector3(16, -0.3, -7),
            //     rotation: new THREE.Euler(0, 0, 0),
            //     scale: new THREE.Vector3(1, 1, 1),
            //     type: 'screen',
            //     screenshotPath: '/venna_art/Illustration139.clipbu.pngbu.png',
            //     enableCollision: true,
            //     enablePhysics: true,
            //     mass: 4,
            //     friction: 0.000001,
            //     physicsShape: 'box',
            //     interactionCallback: null
            // },


        ];

        this.creator_items = [
            {
                modelPath: '/social_media_github.glb',
                position: new THREE.Vector3(-14, 0, -7),
                rotation: new THREE.Euler(0, -0.3 * Math.PI / 2, 0),
                scale: new THREE.Vector3(2, 2, 2),
                type: 'statue',
                enableCollision: true,
                enablePhysics: true,
                mass: 10000,
                friction: 0.8,
                physicsShape: 'box',
                // Statue-specific zone properties (same as signpost)
                zoneWidth: 2,
                zoneDepth: 1,
                url: 'https://github.com/Kyoronginus',
                name: 'Github'
            },
            {
                modelPath: '/social_media_patreon.glb',
                position: new THREE.Vector3(-22, 0, -7),
                rotation: new THREE.Euler(0, 24.3 * Math.PI / 2, 0),
                scale: new THREE.Vector3(1, 1, 1),
                type: 'statue',
                enableCollision: true,
                enablePhysics: true,
                mass: 10,
                friction: 0.8,
                physicsShape: 'box',
                // Statue-specific zone properties (same as signpost)
                zoneWidth: 4,
                zoneDepth: 4,
                url: 'https://www.patreon.com/c/Kyoronginus',
                name: 'Patreon'
            },
            {
                modelPath: '/social_media_x.glb',
                position: new THREE.Vector3(-18, 0, -7),
                rotation: new THREE.Euler(0, 1.7 * Math.PI / 2, 0),
                scale: new THREE.Vector3(2.5, 2.5, 2.5),
                type: 'statue',
                enableCollision: true,
                enablePhysics: true,
                mass: 10,
                friction: 0.8,
                physicsShape: 'box',
                // Statue-specific zone properties (same as signpost)
                zoneWidth: 1,
                zoneDepth: 1,
                url: 'https://x.com/kyoro_ina',
                name: 'X'
            },
            {
                modelPath: '/social_media_pixiv.glb',
                position: new THREE.Vector3(-26, 0, -7),
                rotation: new THREE.Euler(0, 3.1 * Math.PI / 2, 0),
                scale: new THREE.Vector3(0.8, 0.8, 0.8),
                type: 'statue',
                enableCollision: true,
                enablePhysics: true,
                mass: 10,
                friction: 0.8,
                physicsShape: 'box',
                // Statue-specific zone properties (same as signpost)
                zoneWidth: 4,
                zoneDepth: 2,
                url: 'https://www.pixiv.net/users/34124210',
                name: 'pixiv'
            },
            {
                modelPath: '/fibonacci_logo.glb',
                position: new THREE.Vector3(-22, 0, 1),
                rotation: new THREE.Euler(0, 3.1 * Math.PI / 2, 0),
                scale: new THREE.Vector3(1, 1, 1),
                type: 'statue',
                enableCollision: true,
                enablePhysics: true,
                mass: 10,
                friction: 0.8,
                physicsShape: 'box',
                // Statue-specific zone properties (same as signpost)
                zoneWidth: 4,
                zoneDepth: 2,
                url: 'https://fibonacci-spiral-detecti-bf743.web.app/',
                name: 'Fibonacci Spiral Detection'
            },
            {
                modelPath: '/social_media_placeholder.glb',
                position: new THREE.Vector3(-18, 0, 1),
                rotation: new THREE.Euler(0, 3.1 * Math.PI / 2, 0),
                scale: new THREE.Vector3(1.5, 1.5, 1.5),
                type: 'statue',
                enableCollision: true,
                enablePhysics: true,
                mass: 1000,
                friction: 0.8,
                physicsShape: 'box',
                // Statue-specific zone properties (same as signpost)
                zoneWidth: 4,
                zoneDepth: 2,
                url: 'https://coloranalyzer-648561351861.us-central1.run.app/',
                name: 'Color Analyzer'
            },
        ]

        this.playground_items = [
            {
                modelPath: 'ball.glb',
                position: new THREE.Vector3(20, 0.3, 3),
                rotation: new THREE.Euler(0, 2 / 2 * Math.PI, 0),
                scale: new THREE.Vector3(1, 1, 1),
                type: 'box',
                enableCollision: true,
                enablePhysics: true,
                mass: 3,
                friction: 1,
                physicsShape: 'sphere',
                interactionCallback: null
            },

            // acrylic 1
            {
                modelPath: 'acrylic_stand_2025_alt.glb',
                position: new THREE.Vector3(10.5, 0.3, 2.5),
                rotation: new THREE.Euler(-0.11 * Math.PI / 2, -0.15 * Math.PI, -0.11 * Math.PI / 2),
                scale: new THREE.Vector3(1, 1, 1),
                type: 'box',
                enableCollision: true,
                enablePhysics: true,
                mass: 30,
                friction: 0.01,
                physicsShape: 'box',
                interactionCallback: null
            },
            {
                modelPath: 'beveled_cube.glb',
                position: new THREE.Vector3(11, 0.3, 2),
                rotation: new THREE.Euler(0, -0.5 / 2 * Math.PI, 0),
                scale: new THREE.Vector3(3, 1, 1),
                type: 'box',
                enableCollision: true,
                enablePhysics: true,
                mass: 30,
                friction: 0.8,
                physicsShape: 'box',
                interactionCallback: null
            },
            {
                modelPath: 'beveled_cube.glb',
                position: new THREE.Vector3(11, 1, 2),
                rotation: new THREE.Euler(0, -0.5 / 2 * Math.PI, 0),
                scale: new THREE.Vector3(2.3, 1, 1),
                type: 'box',
                enableCollision: true,
                enablePhysics: true,
                mass: 30,
                friction: 0.8,
                physicsShape: 'box',
                interactionCallback: null
            },
            {
                modelPath: 'beveled_cube.glb',
                position: new THREE.Vector3(10.9, 2, 2),
                rotation: new THREE.Euler(0, -0.56 / 2 * Math.PI, 0),
                scale: new THREE.Vector3(1.7, 1, 1),
                type: 'box',
                enableCollision: true,
                enablePhysics: true,
                mass: 30,
                friction: 0.8,
                physicsShape: 'box',
                interactionCallback: null
            },
            {
                modelPath: 'beveled_cube.glb',
                position: new THREE.Vector3(10.9, 3, 2),
                rotation: new THREE.Euler(0, -0.49 / 2 * Math.PI, 0),
                scale: new THREE.Vector3(1.7, 1, 1),
                type: 'box',
                enableCollision: true,
                enablePhysics: true,
                mass: 30,
                friction: 0.8,
                physicsShape: 'box',
                interactionCallback: null
            },
            {
                modelPath: 'beveled_cube.glb',
                position: new THREE.Vector3(12, 0.3, 3),
                rotation: new THREE.Euler(0, 0.49 / 2 * Math.PI, 0),
                scale: new THREE.Vector3(1.4, 1, 1),
                type: 'box',
                enableCollision: true,
                enablePhysics: true,
                mass: 30,
                friction: 0.8,
                physicsShape: 'box',
                interactionCallback: null
            },
            //acrylic 2
            {
                modelPath: 'foundation.glb',
                position: new THREE.Vector3(16.2, 0.3, 2.7),
                rotation: new THREE.Euler(0, -0.18 * Math.PI, 0),
                scale: new THREE.Vector3(1, 1, 1),
                type: 'box',
                enableCollision: true,
                enablePhysics: true,
                mass: 30,
                friction: 0.01,
                physicsShape: 'box',
                interactionCallback: null
            },
            {
                modelPath: 'beveled_cube.glb',
                position: new THREE.Vector3(17, 0.3, 2),
                rotation: new THREE.Euler(0, -0.5 / 2 * Math.PI, 0),
                scale: new THREE.Vector3(3, 1, 1),
                type: 'box',
                enableCollision: true,
                enablePhysics: true,
                mass: 30,
                friction: 0.8,
                physicsShape: 'box',
                interactionCallback: null
            },
            {
                modelPath: 'beveled_cube.glb',
                position: new THREE.Vector3(17, 1, 2),
                rotation: new THREE.Euler(0, -0.5 / 2 * Math.PI, 0),
                scale: new THREE.Vector3(2.3, 1, 1),
                type: 'box',
                enableCollision: true,
                enablePhysics: true,
                mass: 30,
                friction: 0.8,
                physicsShape: 'box',
                interactionCallback: null
            },
            {
                modelPath: 'beveled_cube.glb',
                position: new THREE.Vector3(16.9, 2, 2),
                rotation: new THREE.Euler(0, -0.56 / 2 * Math.PI, 0),
                scale: new THREE.Vector3(1.7, 1, 1),
                type: 'box',
                enableCollision: true,
                enablePhysics: true,
                mass: 30,
                friction: 0.8,
                physicsShape: 'box',
                interactionCallback: null
            },
            {
                modelPath: 'beveled_cube.glb',
                position: new THREE.Vector3(16.9, 3, 2),
                rotation: new THREE.Euler(0, -0.49 / 2 * Math.PI, 0),
                scale: new THREE.Vector3(1.7, 1, 1),
                type: 'box',
                enableCollision: true,
                enablePhysics: true,
                mass: 30,
                friction: 0.8,
                physicsShape: 'box',
                interactionCallback: null
            },
            {
                modelPath: 'beveled_cube.glb',
                position: new THREE.Vector3(18, 0.3, 3),
                rotation: new THREE.Euler(0, 0.49 / 2 * Math.PI, 0),
                scale: new THREE.Vector3(1.4, 1, 1),
                type: 'box',
                enableCollision: true,
                enablePhysics: true,
                mass: 30,
                friction: 0.8,
                physicsShape: 'box',
                interactionCallback: null
            },
        ]
    }

    /**
     * Initialize and load all models
     */
    async loadAllModels() {
        // Filter out any misconfigured items without a valid modelPath
        const allItemsRaw = [...this.items, ...this.gallery_items, ...this.creator_items, ...this.playground_items];
        const allItems = allItemsRaw.filter(it => it && typeof it.modelPath === 'string' && it.modelPath.length > 0)
        const skipped = allItemsRaw.length - allItems.length
        if (skipped > 0) {
            console.warn(`Skipping ${skipped} item(s) without a valid modelPath`)
        }
        const loadPromises = allItems.map(item => this.loadModel(item));
        try {
            await Promise.all(loadPromises);
            console.log(`Successfully loaded ${this.models.length} models`);
        } catch (error) {
            console.error('Error loading models:', error);
        }
    }

    /**
     * Load a single model and prepare it for rendering
     * @param {Object} item - Configuration object
     * @returns {Promise<THREE.Object3D>} Resolves with the loaded model root
     */
    loadModel(item) {
        return new Promise((resolve, reject) => {
            this.gltfLoader.load(
                item.modelPath,
                async (gltf) => {
                    const root = gltf.scene

                    const objectsToRemove = [];
                    root.traverse((child) => {
                        // The 'visible' property is set to false if render visibility was off in Blender
                        if (!child.visible) {
                            objectsToRemove.push(child);
                        }
                    });

                    // Remove the collected objects from the scene
                    objectsToRemove.forEach((child) => {
                        child.removeFromParent();
                    });

                    // Apply transform
                    this.applyTransformation(root, item)

                    // Apply materials based on type
                    if (item.type === 'untextured') {
                        this.applyBasicMaterials(root, item)
                    } else if (item.type === 'signpost') {
                        await this.applySignpostMaterials(root, item)
                    } else if (item.type === 'acrylic') {
                        this.applyAcrylicMaterials(root, item)
                    } else if (item.type === 'screen') {
                        await this.applyScreenMaterials(root, item)
                    } else if (item.type === 'statue') {
                        // statues can share signpost-like material behavior if needed
                        // Currently no special material handling; keep model materials
                    }

                    // Configure shadows
                    this.configureShadows(root, item)

                    // Set interaction callback based on type
                    if (item.type === 'untextured' && !item.interactionCallback) {
                        item.interactionCallback = this.createTextInteractionCallback()
                    }

                    // Setup physics
                    const physicsData = this.setupPhysics(root, item)

                    // Add to scene and track
                    this.scene.add(root)
                    this.models.push({
                        mesh: root,
                        item,
                        physics: physicsData
                    })

                    console.log(`Loaded ${item.type} model: ${item.modelPath}`)
                    resolve(root)
                },
                (progress) => {
                    if (progress.total > 0) {
                        console.log(`Loading ${item.modelPath}: ${(progress.loaded / progress.total * 100).toFixed(1)}%`)
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
     * Apply basic materials for untextured models
     */
    applyBasicMaterials(root, item) {
        // Untexturedモデルの場合、Blenderで設定したマテリアルをそのまま活かします。
        // ここでは、そのマテリアルが正しく光に反応するようにプロパティを調整するだけです。

        root.traverse((child) => {
            if (child.isMesh && child.material) {
                // Blenderから来たマテリアルが配列の場合も考慮
                const materials = Array.isArray(child.material) ? child.material : [child.material];

                materials.forEach(material => {
                    // もしマテリアルに色設定があれば、それを尊重する
                    // なければ、デフォルト色を設定
                    if (!material.color) {
                        material.color = new THREE.Color(0xffffff);
                    }
                    // その他のプロパティも必要に応じて調整可能
                    // material.opacity = 0.8; 
                });
            }
        });
    }
    /**
     * Apply signpost materials (with screenshot texture)
     */
    async applySignpostMaterials(root, item) {
        if (!item.screenshotPath) return

        try {
            const texture = await this.loadTexture(item.screenshotPath)
            this.configureTexture(texture)
            this.applyTextureToScreen(root, texture)
        } catch (error) {
            console.error(`Failed to load screenshot for signpost: ${item.screenshotPath}`, error)
        }
    }



    async applyScreenMaterials(root, item) {
        if (!item.screenshotPath) return

        try {
            const texture = await this.loadTexture(item.screenshotPath)

            texture.magFilter = THREE.NearestFilter
            texture.minFilter = THREE.NearestFilter
            texture.wrapS = THREE.ClampToEdgeWrapping
            texture.wrapT = THREE.ClampToEdgeWrapping
            texture.repeat.x = -1;

            // Rotate texture 90 degrees clockwise to correct orientation
            texture.center.set(0.5, 0.5)
            texture.rotation = Math.PI / 2

            root.traverse((child) => {
                const substring = 'M_Screen'
                if (child.isMesh && child.material && child.material.name.includes(substring)) {
                    child.material = new THREE.MeshBasicMaterial({ map: texture });
                    texture.needsUpdate = true;
                }
            });
        } catch (error) {
            console.error(`Failed to load screenshot for screen: ${item.screenshotPath}`, error)
        }
    }



    /**
     * Applies the character texture to the acrylic stand model and configures its
     * material for sharp, cutout transparency.
     * @param {THREE.Object3D} root - The root of the loaded GLTF scene.
     * @param {object} item - The configuration object containing the screenshotPath.
     */
    async applyAcrylicMaterials(root, item) {
        // Exit if there's no texture path defined
        if (!item.screenshotPath) return;

        try {
            // Load the texture from the provided path
            const texture = await this.loadTexture(item.screenshotPath);

            // Apply standard texture configurations (flipping, encoding, etc.)
            this.configureTexture(texture);

            // Traverse the model to find the mesh and its material
            root.traverse((child) => {
                if (child.isMesh) {
                    // Get the material from the mesh
                    const material = child.material;

                    // --- This is the key part for acrylic stands ---

                    // 1. Apply the loaded texture to the material's color map
                    material.map = texture;

                    // 2. Enable transparency
                    // This tells Three.js to respect the alpha channel.
                    material.transparent = true;

                    // 3. Set an alpha test threshold for clean cutouts
                    // This will make any pixel with an alpha value below 0.5 completely invisible.
                    // It's perfect for sharp-edged transparency like character cutouts
                    // and avoids transparency sorting issues.
                    // material.alphaTest = 0.5;

                    // 4. Let Three.js know the material needs to be updated
                    material.needsUpdate = true;
                }
            });

        } catch (error) {
            console.error(`Failed to apply acrylic material for: ${item.screenshotPath}`, error);
        }
    }

    /**
     * Load texture as Promise
     */
    loadTexture(path) {
        return new Promise((resolve, reject) => {
            this.textureLoader.load(path, resolve, undefined, reject)
        })
    }

    /**
     * Configure texture for pixel-art style
     */
    configureTexture(texture) {
        // Pixel art texture settings
        texture.magFilter = THREE.NearestFilter
        texture.minFilter = THREE.NearestFilter
        texture.wrapS = THREE.RepeatWrapping; // 水平方向の繰り返しを有効に
        texture.repeat.x = -1;
        texture.wrapT = THREE.ClampToEdgeWrapping // 繰り返しを無効に
    }
    /**
         * Apply texture to screen material
         */
    applyTextureToScreen(signpost, texture) {
        signpost.traverse((child) => {
            if (child.isMesh && child.material && child.material.name === 'M_Screen') {
                child.material = new THREE.MeshBasicMaterial({ map: texture });
                // テクスチャの上下反転を修正
                // texture.flipY = false;
                texture.needsUpdate = true; // テクスチャの更新をThree.jsに通知
            }
        });
    }
    /**
     * Configure shadow properties
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
     */
    setupPhysics(root, item) {
        if (!this.physics || (!item.enableCollision && !item.enablePhysics)) {
            return null
        }

        // Build options from item
        const physicsOptions = {
            type: item.static ? 'static' : 'dynamic',
            shape: item.physicsShape || 'box',
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
     */
    checkCollisions(characterPosition, proposedPosition) {
        const result = {
            collision: false,
            correctedPosition: proposedPosition.clone(),
            interactions: []
        }

        for (const modelEntry of this.models) {
            if (!modelEntry.physics || !modelEntry.physics.enabled) {
                continue
            }

            const physics = modelEntry.physics
            const distance = proposedPosition.distanceTo(modelEntry.mesh.position)

            // Simple sphere collision for now
            const collisionRadius = 2.0
            if (distance < collisionRadius) {
                result.collision = true

                // Simple collision response - push character away
                const pushDirection = proposedPosition.clone().sub(modelEntry.mesh.position).normalize()
                result.correctedPosition = modelEntry.mesh.position.clone().add(pushDirection.multiplyScalar(collisionRadius))

                // Handle interaction
                if (physics.interactionCallback) {
                    const currentTime = Date.now()
                    if (currentTime - physics.lastInteractionTime > 1000) { // 1 second cooldown
                        result.interactions.push({
                            model: modelEntry.mesh,
                            item: modelEntry.item,
                            callback: physics.interactionCallback
                        })
                        physics.lastInteractionTime = currentTime
                    }
                }

                // Handle signpost/statue-specific interactions
                if (modelEntry.item && (modelEntry.item.type === 'signpost' || modelEntry.item.type === 'statue')) {
                    this.handleSignpostInteraction(modelEntry.item)
                }

                break // Only handle first collision
            }
        }

        return result
    }

    /**
     * Update physics for all physics-enabled models (called each frame)
     */
    updatePhysics(deltaTime) {
        for (const modelEntry of this.models) {
            if (modelEntry.physics && modelEntry.physics.physics) {
                // Add any physics updates here (e.g., animations, floating effects)
            }
        }
    }

    /**
     * Create interaction callback for text models
     */
    createTextInteractionCallback() {
        return (character, model, item) => {
            console.log(`Character touched the text model: ${item.modelPath}`)

            // Example: Make the text glow briefly
            model.traverse((child) => {
                if (child.isMesh && child.material) {
                    const originalEmissive = child.material.emissive.clone()
                    child.material.emissive.setHex(0x444444)

                    setTimeout(() => {
                        child.material.emissive.copy(originalEmissive)
                    }, 500)
                }
            })
        }
    }

    /**
     * Handle signpost interaction (open URL)
     */
    handleSignpostInteraction(item) {
        if ((item.type === 'signpost' || item.type === 'statue') && item.url) {
            console.log(`Opening ${item.type} URL: ${item.name} -> ${item.url}`)
            window.open(item.url, '_blank')
        }
    }

    /**
     * Get all models of a specific type
     */
    getModelsByType(type) {
        return this.models.filter(modelEntry => modelEntry.item.type === type)
    }

    /**
     * Get model by index
     */
    getModel(index) {
        return this.models[index] || null
    }

    /**
     * Get total number of models
     */
    getModelCount() {
        return this.models.length
    }

    /**
     * Dispose of all resources
     */
    dispose() {
        this.models.forEach(modelEntry => {
            this.scene.remove(modelEntry.mesh)

            // Dispose of geometries and materials
            modelEntry.mesh.traverse((child) => {
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

        this.models = []
        console.log('ModelManager disposed')
    }
}
