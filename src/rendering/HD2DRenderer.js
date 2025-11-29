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
        this.renderer.shadowMap.type = THREE.PCFShadowMap
        this.renderer.shadowMap.autoUpdate = true
        this.renderer.outputColorSpace = THREE.SRGBColorSpace

        // HD-2D specific settings
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping
        this.renderer.toneMappingExposure = 1.0

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

        // effect composer
        this.composer = new EffectComposer(this.renderer)
        this.composer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        this.composer.setSize(this.sizes.width, this.sizes.height)

        // rendering pass
        const renderPass = new RenderPass(scene, camera)
        this.composer.addPass(renderPass)

        //  bokeh pass
        this.bokehPass = new BokehPass(scene, camera, {
            focus: 12.0,        // Initial focus distance
            aperture: 0.0020,   // Aperture size (larger = more blur)
            maxblur: 0.004,    // Maximum blur amount (increased for more visible effect)
            width: this.sizes.width,
            height: this.sizes.height
        })
        this.composer.addPass(this.bokehPass)

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
        this.composer.render()
    }

    setSize(width, height) {
        this.sizes.width = width
        this.sizes.height = height

        this.renderer.setSize(width, height)

        // Update both render targets
        const pixelRatio = 0.5
        this.renderTarget.setSize(width * pixelRatio, height * pixelRatio)
        // this.composerRenderTarget.setSize(width, height)

        // Update composer size
        this.composer.setSize(width, height)

        // Update bokeh pass parameters
        this.bokehPass.setSize(width, height)

    }

    setFocusDistance(distance) {
        if (this.bokehPass) {
            this.bokehPass.uniforms.focus.value = distance
        }
    }

    setAperture(aperture) {
        if (this.bokehPass) {
            console.log('Aperture set to:', aperture)
            this.bokehPass.uniforms.aperture.value = aperture
        }
    }

    setMaxBlur(maxBlur) {
        if (this.bokehPass) {
            this.bokehPass.uniforms.maxblur.value = maxBlur
        }
    }

    getDOFParameters() {
        if (!this.bokehPass) return null

        return {
            focus: this.bokehPass.uniforms.focus.value,
            aperture: this.bokehPass.uniforms.aperture.value,
            maxblur: this.bokehPass.uniforms.maxblur.value
        }
    }

    setDOFEnabled(enabled) {
        if (this.bokehPass) {
            this.bokehPass.enabled = enabled
            console.log('DOF enabled:', enabled)
        }
    }

}