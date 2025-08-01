import * as THREE from 'three'

export class PixelCharacter {
    constructor(textureUrl, scene) {
        this.scene = scene
        this.position = new THREE.Vector3(0, 1, 0)
        this.moveSpeed = 0.07
        this.isMoving = false

        // キャラクターの向き
        this.direction = 'down' // down, up, left, right

        // Animation properties
        this.clock = new THREE.Clock()
        this.idleTimer = 0
        this.isSpecialIdle = false // Is the "sleepy" animation playing?
        this.idleFrames = [] // To store sleepy animation textures
        this.currentFrame = 0
        this.frameTimer = 0
        this.frameDuration = 0.8 // How long each sleepy frame lasts (in seconds)

        // Store the default texture
        this.defaultTexture = null

        this.loadIdleFrames() // Load sleepy frames
        this.setupCharacterSprite(textureUrl)
        this.setupMovement()
    }

    setupCharacterSprite(textureUrl) {
        // テクスチャローダー
        const textureLoader = new THREE.TextureLoader()

        textureLoader.load(
            textureUrl,
            (texture) => {
                // ピクセルアート用の設定
                texture.magFilter = THREE.NearestFilter
                texture.minFilter = THREE.NearestFilter
                texture.wrapS = THREE.ClampToEdgeWrapping
                texture.wrapT = THREE.ClampToEdgeWrapping


                this.defaultTexture = texture // Store the default texture
                // スプライト作成
                const spriteMaterial = new THREE.SpriteMaterial({
                    map: texture,
                    transparent: true,
                    alphaTest: 0.1
                })

                this.sprite = new THREE.Sprite(spriteMaterial)
                this.sprite.scale.set(2, 2, 1) // キャラクターサイズ調整
                this.sprite.position.copy(this.position)

                this.scene.add(this.sprite)
                console.log('Character sprite loaded successfully')
            },
            undefined,
            (error) => {
                console.error('Error loading character texture:', error)
                this.createFallbackCharacter()
            }
        )
    }

    createFallbackCharacter() {
        // フォールバック：シンプルな色付きスプライト
        const canvas = document.createElement('canvas')
        canvas.width = 32
        canvas.height = 32
        const ctx = canvas.getContext('2d')

        // シンプルなピクセルキャラクター描画
        ctx.fillStyle = '#ff6b6b'
        ctx.fillRect(8, 4, 16, 12) // 頭
        ctx.fillStyle = '#4ecdc4'
        ctx.fillRect(6, 16, 20, 16) // 体

        const texture = new THREE.CanvasTexture(canvas)
        texture.magFilter = THREE.NearestFilter
        texture.minFilter = THREE.NearestFilter

        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true
        })

        this.sprite = new THREE.Sprite(spriteMaterial)
        this.sprite.scale.set(2, 2, 1)
        this.sprite.position.copy(this.position)

        this.scene.add(this.sprite)
    }

    setupMovement() {
        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false
        }

        document.addEventListener('keydown', (event) => {
            switch (event.code) {
                case 'KeyW':
                    this.keys.w = true
                    this.direction = 'up'
                    break
                case 'KeyA':
                    this.keys.a = true
                    this.direction = 'left'
                    break
                case 'KeyS':
                    this.keys.s = true
                    this.direction = 'down'
                    break
                case 'KeyD':
                    this.keys.d = true
                    this.direction = 'right'
                    break
            }
        })

        document.addEventListener('keyup', (event) => {
            switch (event.code) {
                case 'KeyW':
                    this.keys.w = false
                    break
                case 'KeyA':
                    this.keys.a = false
                    break
                case 'KeyS':
                    this.keys.s = false
                    break
                case 'KeyD':
                    this.keys.d = false
                    break
            }
        })
    }

    // Replace your existing update method with this
    update() {
        const deltaTime = this.clock.getDelta() // Time since last frame
        const velocity = new THREE.Vector3()
        this.isMoving = (this.keys.w || this.keys.a || this.keys.s || this.keys.d)

        if (this.isMoving) {
            // --- If Moving ---
            this.idleTimer = 0 // Reset idle timer
            this.isSpecialIdle = false // Not in special idle anymore

            // Reset to default texture if it's not already set
            if (this.sprite && this.sprite.material.map !== this.defaultTexture) {
                this.sprite.material.map = this.defaultTexture
            }

            // Movement logic
            if (this.keys.w) velocity.z -= this.moveSpeed
            if (this.keys.s) velocity.z += this.moveSpeed
            if (this.keys.a) velocity.x -= this.moveSpeed
            if (this.keys.d) velocity.x += this.moveSpeed

        } else {
            // --- If Not Moving ---
            this.idleTimer += deltaTime // Increment idle timer

            if (this.idleTimer >= 5) {
                this.isSpecialIdle = true // Start special idle animation
            }

            if (this.isSpecialIdle) {
                this.playIdleAnimation(deltaTime) // Play the sleepy animation
            }
        }

        // Update character position
        this.position.add(velocity)
        if (this.sprite) {
            this.sprite.position.copy(this.position)
        }
    }

    // Add this new method to the PixelCharacter class
    loadIdleFrames() {
        const textureLoader = new THREE.TextureLoader()
        const frameUrls = [
            '/idle_sleep/standing_front_sleep_1.png',
            '/idle_sleep/standing_front_sleep_2.png',
            '/idle_sleep/standing_front_sleep_3.png'
        ]

        frameUrls.forEach(url => {
            const texture = textureLoader.load(url)
            texture.magFilter = THREE.NearestFilter
            texture.minFilter = THREE.NearestFilter
            this.idleFrames.push(texture)
        })
    }



    // 将来のアニメーション用メソッド
    playWalkAnimation() {
        // TODO: 歩行アニメーション実装
        // スプライトシートを使用してフレームを切り替え
    }

    playIdleAnimation(deltaTime) {
    if (!this.sprite || this.idleFrames.length === 0) return

    this.frameTimer += deltaTime

    if (this.frameTimer >= this.frameDuration) {
        this.frameTimer = 0 // Reset frame timer
        
        // Move to the next frame, and loop back to the start if at the end
        this.currentFrame = (this.currentFrame + 1) % this.idleFrames.length
        
        // Change the sprite's texture to the new frame
        this.sprite.material.map = this.idleFrames[this.currentFrame]
    }
}

    // カメラがキャラクターを追従するための位置取得
    getPosition() {
        return this.position.clone()
    }
}