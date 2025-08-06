import * as THREE from 'three'

export class PixelCharacter {
    constructor(textureUrl, scene) {
        this.scene = scene
        this.position = new THREE.Vector3(0, 1, 0)
        this.moveSpeed = 0.05
        this.isMoving = false

        // キャラクターの向き
        this.direction = 'down' // down, up, left, right

        // Animation properties
        this.clock = new THREE.Clock()
        this.idleTimer = 0; // 5秒放置を数えるタイマーは必要
        this.animationTime = 0; // ★歩行・放置アニメーション共用のタイマー

        this.isSpecialIdle = false;
        this.idleFrames = [];
        this.walkFrames = [];

        // フレームの再生時間
        this.idleFrameDuration = 0.8;
        this.walkFrameDuration = 0.20; // 少し速くしました


        // Walking animation sequence - start with walking frame 1
        this.walkAnimationSequence = [1, 0, 2, 0] // walk1 -> default -> walk2 -> default
        this.walkSequenceIndex = 0
        this.animations = {
            down: { frames: [], sequence: [1, 0, 2, 0], duration: 0.20 },
            up: { frames: [], sequence: [1, 0, 2, 0], duration: 0.20 }, // Placeholder
            left: { frames: [], sequence: [1, 0, 2, 0], duration: 0.20 },
            right: { frames: [], sequence: [1, 0, 2, 0], duration: 0.20 }
        };
        // Store the default texture
        this.defaultTexture = null

        this.loadIdleFrames() // Load sleepy frames
        this.loadWalkFrames() // Load walking frames
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
                // Note: Sprites cannot cast shadows in Three.js, so we'll create a shadow plane
                this.scene.add(this.sprite)

                // Create a shadow-casting plane for the character
                this.createCharacterShadowCaster()

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

        // Create shadow caster for fallback character too
        this.createCharacterShadowCaster()

        this.scene.add(this.sprite)
    }

    createCharacterShadowCaster() {
        // Create an invisible plane that casts shadows to simulate sprite shadows
        const shadowGeometry = new THREE.PlaneGeometry(1.5, 2) // Match character size
        const shadowMaterial = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0, // Completely invisible
            alphaTest: 0.1
        })

        this.shadowCaster = new THREE.Mesh(shadowGeometry, shadowMaterial)
        this.shadowCaster.castShadow = true
        this.shadowCaster.receiveShadow = false
        this.shadowCaster.position.copy(this.position)

        this.scene.add(this.shadowCaster)
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

    update() {
        const deltaTime = this.clock.getDelta();
        const wasMoving = this.isMoving; // 前回のフレームで動いていたか
        const velocity = new THREE.Vector3()
        this.isMoving = (this.keys.w || this.keys.a || this.keys.s || this.keys.d)

        if (this.isMoving) {
            // --- 動いている場合 ---
            this.idleTimer = 0;
            this.isSpecialIdle = false;

            // 停止状態から動き始めた瞬間にタイマーをリセット
            if (!wasMoving) {
                this.animationTime = 0;
            }

            this.animationTime += deltaTime;
            this.playWalkAnimation();
            // Movement logic
            if (this.keys.w) velocity.z -= this.moveSpeed
            if (this.keys.s) velocity.z += this.moveSpeed
            if (this.keys.a) velocity.x -= this.moveSpeed
            if (this.keys.d) velocity.x += this.moveSpeed

        } else {
            // --- 停止している場合 ---

            // 動きから停止した瞬間にタイマーをリセット
            if (wasMoving) {
                this.animationTime = 0;
                this.resetToStanding();
            }

            this.idleTimer += deltaTime;
            if (this.idleTimer >= 3 && !this.isSpecialIdle) {
                this.isSpecialIdle = true;
                this.animationTime = 0; // うたたねアニメ開始時にタイマーをリセット
            }

            if (this.isSpecialIdle) {
                this.animationTime += deltaTime;
                this.playIdleAnimation();
            }
        }

        // Update character position
        this.position.add(velocity)
        if (this.sprite) {
            this.sprite.position.copy(this.position)
        }

        // Update shadow caster position
        if (this.shadowCaster) {
            this.shadowCaster.position.copy(this.position)
        }
    }

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

    // Replace your loadWalkFrames method with this
    loadWalkFrames() {
        const textureLoader = new THREE.TextureLoader();
        const directions = ['down', 'up', 'left', 'right']; // Add 'up' when you have it

        const frameFiles = {
            down: [
                '/front_walking/default_standing.png',
                '/front_walking/front_walking_1.png',
                '/front_walking/front_walking_2.png'
            ],
            // For now, up will use the same sprites as down
            up: [
                '/up_walking/default_standing.png',
                '/up_walking/up_walking_1.png',
                '/up_walking/up_walking_2.png'

            ],
            left: [
                '/left_walking/standing_left.png',
                '/left_walking/left_walking_1.png',
                '/left_walking/left_walking_2.png'
            ],
            right: [
                '/right_walking/standing_right.png',
                '/right_walking/right_walking_1.png',
                '/right_walking/right_walking_2.png'
            ]
        };

        for (const dir of directions) {
            if (frameFiles[dir]) {
                frameFiles[dir].forEach(url => {
                    const texture = textureLoader.load(url);
                    texture.magFilter = THREE.NearestFilter;
                    texture.minFilter = THREE.NearestFilter;
                    this.animations[dir].frames.push(texture);
                });
            }
        }
    }

    // Replace playWalkAnimation
    // Replace your playWalkAnimation method with this
    playWalkAnimation() {
        const currentAnim = this.animations[this.direction];
        if (!this.sprite || !currentAnim || currentAnim.frames.length === 0) return;

        // Calculate which frame to show based on the current animation's sequence
        const sequenceIndex = Math.floor(this.animationTime / currentAnim.duration) % currentAnim.sequence.length;
        const frameIndex = currentAnim.sequence[sequenceIndex];

        // Change the sprite's texture to the new frame
        this.sprite.material.map = currentAnim.frames[frameIndex];
    }
    resetToStanding() {
        if (!this.sprite) return

        // Reset walking animation sequence
        this.walkSequenceIndex = 0
        this.walkFrameTimer = 0

        // Set to default standing texture
        if (this.defaultTexture) {
            this.sprite.material.map = this.defaultTexture
        } else if (this.walkFrames.length > 0) {
            this.sprite.material.map = this.walkFrames[0] // Use first frame as fallback
        }
    }

    // Replace playIdleAnimation
    playIdleAnimation() {
        if (!this.sprite || this.idleFrames.length === 0) return;

        // 経過時間から現在のフレームを計算
        const frameIndex = Math.floor(this.animationTime / this.idleFrameDuration) % this.idleFrames.length;

        this.sprite.material.map = this.idleFrames[frameIndex];
    }

    // カメラがキャラクターを追従するための位置取得
    getPosition() {
        return this.position.clone()
    }
}
