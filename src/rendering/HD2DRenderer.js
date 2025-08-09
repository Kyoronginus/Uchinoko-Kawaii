import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js'

export class HD2DRenderer {
    constructor(canvas, sizes, scene, camera) {
        this.sizes = sizes

        // Main renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            // antialias: true, // Disable for pixel art look
            powerPreference: "high-performance"
        })

        this.renderer.setSize(sizes.width, sizes.height)
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

        // Configure shadows for pixel art style
        this.renderer.shadowMap.enabled = true
        this.renderer.shadowMap.type = THREE.PCFShadowMap // Crisp shadows for pixel art
        this.renderer.shadowMap.autoUpdate = true
        this.renderer.outputColorSpace = THREE.SRGBColorSpace

        // HD-2D specific settings
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping
        this.renderer.toneMappingExposure = 1.2

        // Create render targets for post-processing
        this.setupRenderTargets()
        this.setupPostProcessing(scene, camera)
    }

    setupRenderTargets() {
        // Lower resolution render target for pixel art effect
        const pixelRatio = 0.5 // Adjust for more/less pixelation

        this.renderTarget = new THREE.WebGLRenderTarget(
            this.sizes.width * pixelRatio,
            this.sizes.height * pixelRatio,
            {
                minFilter: THREE.NearestFilter,
                magFilter: THREE.NearestFilter,
                format: THREE.RGBAFormat
            }
        )
    }

    setupPostProcessing(scene, camera) {
        // Create a full-resolution render target for the composer
        this.composerRenderTarget = new THREE.WebGLRenderTarget(
            this.sizes.width,
            this.sizes.height,
            {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                format: THREE.RGBAFormat,
                depthTexture: new THREE.DepthTexture(),
                depthBuffer: true,
                stencilBuffer: false
            }
        )

        // 1. Effect Composerのセットアップ (full resolution for DOF)
        this.composer = new EffectComposer(this.renderer, this.composerRenderTarget)
        this.composer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        this.composer.setSize(this.sizes.width, this.sizes.height)

        // 2. 通常のレンダリングパスを追加
        const renderPass = new RenderPass(scene, camera)
        this.composer.addPass(renderPass)

        // 3. 被写界深度（Bokeh）パスを追加
        this.bokehPass = new BokehPass(scene, camera, {
            focus: 12.0,        // Initial focus distance
            aperture: 0.005,   // Aperture size (larger = more blur)
            maxblur: 0.004,    // Maximum blur amount (increased for more visible effect)
            width: this.sizes.width,
            height: this.sizes.height
        })
        this.composer.addPass(this.bokehPass)

        // Pixel art upscaling shader
        // this.pixelArtMaterial = new THREE.ShaderMaterial({
        //     uniforms: {
        //         tDiffuse: { value: null },
        //         resolution: { value: new THREE.Vector2(this.sizes.width, this.sizes.height) },
        //         pixelSize: { value: 1.0 }
        //     },
        //     vertexShader: `
        //         varying vec2 vUv;
        //         void main() {
        //             vUv = uv;
        //             gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        //         }
        //     `,
        //     fragmentShader: `
        //         uniform sampler2D tDiffuse;
        //         uniform vec2 resolution;
        //         uniform float pixelSize;
        //         varying vec2 vUv;
                
        //         void main() {
        //             vec2 dxy = pixelSize / resolution;
        //             vec2 coord = dxy * floor(vUv / dxy);
        //             gl_FragColor = texture2D(tDiffuse, coord);
        //         }
        //     `
        // })

        // Full screen quad for post-processing
        this.postProcessQuad = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2),
            this.pixelArtMaterial
        )

        this.postProcessScene = new THREE.Scene()
        this.postProcessScene.add(this.postProcessQuad)

        this.postProcessCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    }

    render(scene, camera) {
        // 1. EffectComposerで、被写界深度を含むエフェクトをレンダリング
        this.composer.render()

        // 2. ポストプロセッシングの結果を、ピクセルアート化シェーダーに渡す
        this.pixelArtMaterial.uniforms.tDiffuse.value = this.composer.readBuffer.texture
        
        // 3. 最終結果をスクリーンに描画
        this.renderer.setRenderTarget(null)
        this.renderer.render(this.postProcessScene, this.postProcessCamera)
    }

    setSize(width, height) {
        this.sizes.width = width
        this.sizes.height = height

        this.renderer.setSize(width, height)

        // Update both render targets
        const pixelRatio = 0.5
        this.renderTarget.setSize(width * pixelRatio, height * pixelRatio)
        this.composerRenderTarget.setSize(width, height)

        // Update composer size
        this.composer.setSize(width, height)

        // Update bokeh pass parameters
        this.bokehPass.setSize(width, height)

        this.pixelArtMaterial.uniforms.resolution.value.set(width, height)
    }

    /**
     * Set the focus distance for depth-of-field effect
     * @param {number} distance - Focus distance from camera
     */
    setFocusDistance(distance) {
        if (this.bokehPass) {
            this.bokehPass.uniforms.focus.value = distance
            // Debug logging (remove in production)
            if (Math.random() < 0.01) { // Log occasionally to avoid spam
                console.log('DOF focus distance updated:', distance.toFixed(2))
            }
        }
    }

    /**
     * Set the aperture size (controls blur intensity)
     * @param {number} aperture - Aperture size (smaller = more blur)
     */
    setAperture(aperture) {
        if (this.bokehPass) {
            console.log('Aperture set to:', aperture)
            this.bokehPass.uniforms.aperture.value = aperture
        }
    }

    /**
     * Set the maximum blur amount
     * @param {number} maxBlur - Maximum blur amount
     */
    setMaxBlur(maxBlur) {
        if (this.bokehPass) {
            this.bokehPass.uniforms.maxblur.value = maxBlur
        }
    }

    /**
     * Get current DOF parameters
     * @returns {Object} Current DOF settings
     */
    getDOFParameters() {
        if (!this.bokehPass) return null

        return {
            focus: this.bokehPass.uniforms.focus.value,
            aperture: this.bokehPass.uniforms.aperture.value,
            maxblur: this.bokehPass.uniforms.maxblur.value
        }
    }

    /**
     * Enable or disable depth-of-field effect
     * @param {boolean} enabled - Whether DOF should be enabled
     */
    setDOFEnabled(enabled) {
        if (this.bokehPass) {
            this.bokehPass.enabled = enabled
            console.log('DOF enabled:', enabled)
        }
    }

}