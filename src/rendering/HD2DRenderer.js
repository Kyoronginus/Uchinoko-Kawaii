import * as THREE from 'three'

export class HD2DRenderer {
    constructor(canvas, sizes) {
        this.sizes = sizes
        
        // Main renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true, // Disable for pixel art look
            powerPreference: "high-performance"
        })
        
        this.renderer.setSize(sizes.width, sizes.height)
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        this.renderer.shadowMap.enabled = true
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
        this.renderer.outputColorSpace = THREE.SRGBColorSpace
        
        // HD-2D specific settings
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping
        this.renderer.toneMappingExposure = 1.2
        
        // Create render targets for post-processing
        this.setupRenderTargets()
        this.setupPostProcessing()
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
    
    setupPostProcessing() {
        // Pixel art upscaling shader
        this.pixelArtMaterial = new THREE.ShaderMaterial({
            uniforms: {
                tDiffuse: { value: null },
                resolution: { value: new THREE.Vector2(this.sizes.width, this.sizes.height) },
                pixelSize: { value: 2.0 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform vec2 resolution;
                uniform float pixelSize;
                varying vec2 vUv;
                
                void main() {
                    vec2 dxy = pixelSize / resolution;
                    vec2 coord = dxy * floor(vUv / dxy);
                    gl_FragColor = texture2D(tDiffuse, coord);
                }
            `
        })
        
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
        // Render scene to lower resolution target
        this.renderer.setRenderTarget(this.renderTarget)
        this.renderer.render(scene, camera)
        
        // Apply pixel art post-processing
        this.pixelArtMaterial.uniforms.tDiffuse.value = this.renderTarget.texture
        this.renderer.setRenderTarget(null)
        this.renderer.render(this.postProcessScene, this.postProcessCamera)
    }
    
    setSize(width, height) {
        this.sizes.width = width
        this.sizes.height = height
        
        this.renderer.setSize(width, height)
        
        const pixelRatio = 0.5
        this.renderTarget.setSize(width * pixelRatio, height * pixelRatio)
        
        this.pixelArtMaterial.uniforms.resolution.value.set(width, height)
    }
}