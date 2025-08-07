import * as THREE from 'three'

export class PixelCharacter {
    constructor(textureUrl, scene, camera = null) {
        this.scene = scene
        this.camera = camera
        this.position = new THREE.Vector3(0, 1, 0) // キャラクターの基準Y位置
        this.moveSpeed = 0.05
        this.isMoving = false
        this.direction = 'down'

        // Animation properties
        this.clock = new THREE.Clock()
        this.idleTimer = 0
        this.animationTime = 0
        this.isSpecialIdle = false
        this.idleFrames = []
        this.animations = {
            down: { frames: [], sequence: [1, 0, 2, 0], duration: 0.20 },
            up: { frames: [], sequence: [1, 0, 2, 0], duration: 0.20 },
            left: { frames: [], sequence: [1, 0, 2, 0], duration: 0.20 },
            right: { frames: [], sequence: [1, 0, 2, 0], duration: 0.20 }
        };
        this.idleFrameDuration = 0.8
        this.defaultTexture = null

        this.loadIdleFrames()
        this.loadWalkFrames()
        this.setupCharacterSprite(textureUrl)
        this.setupMovement()
    }

    setupCharacterSprite(textureUrl) {
        const textureLoader = new THREE.TextureLoader()
        textureLoader.load(textureUrl, (texture) => {
            texture.magFilter = THREE.NearestFilter
            texture.minFilter = THREE.NearestFilter
            this.defaultTexture = texture

            // ★ 見た目用のマテリアル (影を受け取れるようにLambertを使用)
            const spriteMaterial = new THREE.MeshLambertMaterial({
                map: texture,
                transparent: true,
                alphaTest: 0.5,
                side: THREE.DoubleSide
            });

            this.sprite = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), spriteMaterial);
            this.sprite.receiveShadow = true; // ✅ 他のオブジェクトからの影を自分に表示する
            this.sprite.castShadow = true;    // ✅ 自分自身が影を落とす

            // ★★★★★ ここからが最重要 ★★★★★
            // 影の形をテクスチャの透明度に応じて切り抜くための、特殊なマテリアルを設定
            this.sprite.customDepthMaterial = new THREE.MeshDepthMaterial({
                depthPacking: THREE.RGBADepthPacking,
                map: texture,
                alphaTest: 0.5 // この値より透明なピクセルは影の計算から除外される
            });
            // ★★★★★ ここまで ★★★★★

            this.scene.add(this.sprite)
            console.log('Character sprite loaded successfully')
        })
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

        // Use MeshBasicMaterial for fallback character to receive shadows
        const spriteMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.1,
            side: THREE.DoubleSide
        })

        // Use Mesh instead of Sprite for shadow receiving
        this.sprite = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), spriteMaterial)
        this.sprite.position.copy(this.position)
        this.sprite.receiveShadow = true // Allow fallback character to receive shadows

        // Create shadow caster for fallback character too
        this.createCharacterShadowCaster()

        this.scene.add(this.sprite)
    }

    createCharacterShadowCaster() {
        const shadowGeometry = new THREE.PlaneGeometry(2, 2);

        // ★ 影を落とす役のマテリアル：alphaMapが使えるStandardMaterialが最適
        const shadowMaterial = new THREE.MeshStandardMaterial({
            alphaMap: this.defaultTexture, // 影の形をテクスチャで決める
            alphaTest: 0.5,                // 透明部分を切り抜くしきい値
            transparent: true,
            opacity: 0                      // 完全に透明にする
        });

        this.shadowCaster = new THREE.Mesh(shadowGeometry, shadowMaterial);
        this.shadowCaster.castShadow = true;     // ✅ 影を落とす設定
        this.shadowCaster.receiveShadow = false; // 影は受け取らない

        this.scene.add(this.shadowCaster);
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
        // ... (既存の移動・アニメーションのロジックは変更なし) ...
        const deltaTime = this.clock.getDelta();
        const wasMoving = this.isMoving;
        const velocity = new THREE.Vector3()
        this.isMoving = (this.keys.w || this.keys.a || this.keys.s || this.keys.d)

        if (this.isMoving) {
            this.idleTimer = 0;
            this.isSpecialIdle = false;
            if (!wasMoving) { this.animationTime = 0; }
            this.animationTime += deltaTime;
            this.playWalkAnimation();
            if (this.keys.w) velocity.z -= this.moveSpeed
            if (this.keys.s) velocity.z += this.moveSpeed
            if (this.keys.a) velocity.x -= this.moveSpeed
            if (this.keys.d) velocity.x += this.moveSpeed
        } else {
            if (wasMoving) {
                this.animationTime = 0;
                this.resetToStanding();
            }
            this.idleTimer += deltaTime;
            if (this.idleTimer >= 3 && !this.isSpecialIdle) {
                this.isSpecialIdle = true;
                this.animationTime = 0;
            }
            if (this.isSpecialIdle) {
                this.animationTime += deltaTime;
                this.playIdleAnimation();
            }
        }

        this.position.add(velocity);

        // 見えるスプライトの位置を更新
        if (this.sprite) {
            this.sprite.position.copy(this.position);
            if (this.camera) { this.sprite.quaternion.copy(this.camera.quaternion); }
        }

        // ★ shadowCasterの位置とテクスチャを同期させる（最重要）
        if (this.shadowCaster) {
            // 位置を同期（Yは地面の高さに設定して影のズレを防ぐ）
            this.shadowCaster.position.set(this.position.x, 0.01, this.position.z);
            if (this.camera) { this.shadowCaster.quaternion.copy(this.camera.quaternion); }

            // 現在のアニメーションフレームをalphaMapに設定して、影の形を更新
            if (this.sprite && this.sprite.material.map) {
                this.shadowCaster.material.alphaMap = this.sprite.material.map;
            }
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

    playWalkAnimation() {
        const currentAnim = this.animations[this.direction];
        if (!this.sprite || !currentAnim || currentAnim.frames.length === 0) return;

        const sequenceIndex = Math.floor(this.animationTime / currentAnim.duration) % currentAnim.sequence.length;
        const frameIndex = currentAnim.sequence[sequenceIndex];
        const newTexture = currentAnim.frames[frameIndex];

        // ✅ 見た目と影、両方のテクスチャを同時に更新する
        this.sprite.material.map = newTexture;
        this.sprite.customDepthMaterial.map = newTexture;
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
