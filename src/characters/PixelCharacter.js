import * as THREE from 'three'

export class PixelCharacter {
    constructor(textureUrl, scene, camera = null, loadingManager = null) {
        this.scene = scene
        this.camera = camera
        this.loadingManager = loadingManager || THREE.DefaultLoadingManager
        this.position = new THREE.Vector3(0, 0.1, 8)
        this.initialPosition = new THREE.Vector3(0,0.1,8);
        this.moveSpeed = 4
        this.isMoving = false
        this.direction = 'down'
        this.collisionManager = null // Will be set by external code
        this.physicsBody = null // Physics body reference
        this.physicsManager = null // Physics manager reference for grab system
        this.lastGrabKeyState = false // Track G key state for toggle behavior
        this.wasGrabbing = false // Track previous grab state to detect changes

        // Animation properties
        this.clock = new THREE.Clock()
        this.idleTimer = 0
        this.animationTime = 0
        this.isSpecialIdle = false
        this.idleFrames = []
        this.animations = {
            // Normal walking animations
            down: { frames: [], sequence: [1, 0, 2, 0], duration: 0.20 },
            up: { frames: [], sequence: [1, 0, 2, 0], duration: 0.20 },
            left: { frames: [], sequence: [1, 0, 2, 0], duration: 0.20 },
            right: { frames: [], sequence: [1, 0, 2, 0], duration: 0.20 },
            // Grabbing walking animations
            grabbing_down: { frames: [], sequence: [1, 0, 2, 0], duration: 0.25 },
            grabbing_up: { frames: [], sequence: [1, 0, 2, 0], duration: 0.25 },
            grabbing_left: { frames: [], sequence: [1, 0, 2, 0], duration: 0.25 },
            grabbing_right: { frames: [], sequence: [1, 0, 2, 0], duration: 0.25 }
        };
        this.idleFrameDuration = 0.8
        this.defaultTexture = null

        this.loadIdleFrames()
        this.loadWalkFrames()
        this.loadGrabbingFrames()
        this.setupCharacterSprite(textureUrl)
        this.setupMovement()
    }

    /**
     * Set the physics manager reference for grab functionality
     * @param {PhysicsManager} physicsManager
     */
    setPhysicsManager(physicsManager) {
        this.physicsManager = physicsManager
    }

    setupCharacterSprite(textureUrl) {
        const textureLoader = new THREE.TextureLoader(this.loadingManager) 
        textureLoader.load(textureUrl, (texture) => {
            texture.magFilter = THREE.NearestFilter
            texture.minFilter = THREE.NearestFilter
            this.defaultTexture = texture

            // material for sprite
            const spriteMaterial = new THREE.MeshLambertMaterial({
                map: texture,
                transparent: true,
                alphaTest: 0.5,
                side: THREE.DoubleSide
            });

            this.sprite = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), spriteMaterial);
            this.sprite.receiveShadow = true; 
            this.sprite.castShadow = true;  
            
            // custom depth material to cut out the shadow shape based on the texture's transparency
            this.sprite.customDepthMaterial = new THREE.MeshDepthMaterial({
                depthPacking: THREE.RGBADepthPacking,
                map: texture,
                alphaTest: 0.5 
            });

            this.scene.add(this.sprite)
            console.log('Character sprite loaded successfully')
        })
    }

    createCharacterShadowCaster() {
        const shadowGeometry = new THREE.PlaneGeometry(2, 2);

        const shadowMaterial = new THREE.MeshStandardMaterial({
            alphaMap: this.defaultTexture,
            alphaTest: 0.5,
            transparent: true,
            opacity: 0
        });

        this.shadowCaster = new THREE.Mesh(shadowGeometry, shadowMaterial);
        this.shadowCaster.castShadow = true;
        this.shadowCaster.receiveShadow = false;

        this.scene.add(this.shadowCaster);
    }

    setupMovement() {
        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false,
            g: false,
            space: false
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
                case 'KeyG':
                    this.keys.g = true
                    break
                case 'Space':
                    this.keys.space = true
                    break
            }
            if (event.code === 'KeyR') {
                this.resetPosition();
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
                case 'KeyG':
                    this.keys.g = false
                    break
                case 'Space':
                    this.keys.space = false
                    break
            }
        })
    }

    // ✅ resetPositionメソッドをクラスに追加
    /**
     * Resets the character to its initial position and stops all movement.
     */
    resetPosition() {
        if (this.physicsBody) {
            // 物理ボディの位置を初期位置に設定
            this.physicsBody.position.copy(this.initialPosition);

            // 慣性による動きを止めるために、速度を0にする
            this.physicsBody.velocity.set(0, 0, 0);
            this.physicsBody.angularVelocity.set(0, 0, 0);
            this.physicsBody.force.set(0, 0, 0);
            this.physicsBody.wakeUp();

            console.log('Character position reset.');
        }

        // アニメーションも待機状態に戻す
        // this.resetToStanding();
    }

    update() {
        const deltaTime = this.clock.getDelta();
        const wasMoving = this.isMoving;
        const velocity = new THREE.Vector3()
        this.isMoving = (this.keys.w || this.keys.a || this.keys.s || this.keys.d)

        // Check for grab state changes
        const isCurrentlyGrabbing = this.physicsManager && this.physicsManager.isGrabbing()
        const grabStateChanged = isCurrentlyGrabbing !== this.wasGrabbing
        this.wasGrabbing = isCurrentlyGrabbing

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
            // Update animation if grab state changed while standing still
            else if (grabStateChanged) {
                this.resetToStanding();
            }

            this.idleTimer += deltaTime;
            if (this.idleTimer >= 10 && !this.isSpecialIdle && !isCurrentlyGrabbing) {
                this.isSpecialIdle = true;
                this.animationTime = 0;
            }
            if (this.isSpecialIdle) {
                this.animationTime += deltaTime;
                this.playIdleAnimation();
            }
        }

        // Handle grab input (toggle on G key press)
        this.handleGrabInput()

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
    /**
     * Return desired velocity vector from input, to be applied to physics body
     */
    getDesiredVelocity() {
        const v = new THREE.Vector3()
        if (this.keys) {
            if (this.keys.w) v.z -= this.moveSpeed
            if (this.keys.s) v.z += this.moveSpeed
            if (this.keys.a) v.x -= this.moveSpeed
            if (this.keys.d) v.x += this.moveSpeed
        }
        return v
    }

    /**
     * Handle grab input - toggle grab/release on G key press
     */
    handleGrabInput() {
        if (!this.physicsManager || !this.physicsBody) return

        // Detect G key press (not held) or space key press
        const grabPressed = (this.keys.g || this.keys.space) && !this.lastGrabKeyState 
        this.lastGrabKeyState = this.keys.g || this.keys.space;

        if (grabPressed) {
            // Get character facing direction based on movement direction
            let facingDirection = new THREE.Vector3(0, 0, -1) // Default forward

            switch (this.direction) {
                case 'up':
                    facingDirection.set(0, 0, -1)
                    break
                case 'down':
                    facingDirection.set(0, 0, 1)
                    break
                case 'left':
                    facingDirection.set(-1, 0, 0)
                    break
                case 'right':
                    facingDirection.set(1, 0, 0)
                    break
            }

            // Try to grab or release
            const success = this.physicsManager.tryGrab(this.physicsBody, facingDirection)
            if (success) {
                console.log('Grab action performed')
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

    loadWalkFrames() {
        const textureLoader = new THREE.TextureLoader();
        const directions = ['down', 'up', 'left', 'right'];

        const frameFiles = {
            down: [
                '/front_walking/default_standing.png',
                '/front_walking/front_walking_1.png',
                '/front_walking/front_walking_2.png'
            ],
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

    loadGrabbingFrames() {
        const textureLoader = new THREE.TextureLoader();
        const directions = ['down', 'up', 'left', 'right'];

        const grabbingFrameFiles = {
            down: [
                'grabbing_walking/grabbing_front_walking/default_standing.png',
                'grabbing_walking/grabbing_front_walking/grabbing_front_walking_1.png',
                'grabbing_walking/grabbing_front_walking/grabbing_front_walking_2.png'
            ],
            up: [
                'grabbing_walking/grabbing_up_walking/default_standing.png',
                'grabbing_walking/grabbing_up_walking/grabbing_up_walking_1.png',
                'grabbing_walking/grabbing_up_walking/grabbing_up_walking_2.png'
            ],
            left: [
                'grabbing_walking/grabbing_left_walking/default_standing.png',
                'grabbing_walking/grabbing_left_walking/grabbing_left_walking_1.png',
                'grabbing_walking/grabbing_left_walking/grabbing_left_walking_2.png'
            ],
            right: [
                'grabbing_walking/grabbing_right_walking/default_standing.png',
                'grabbing_walking/grabbing_right_walking/grabbing_right_walking_1.png',
                'grabbing_walking/grabbing_right_walking/grabbing_right_walking_2.png'
            ]
        };

        // Load grabbing animation frames
        for (const dir of directions) {
            const grabbingKey = `grabbing_${dir}`;
            if (grabbingFrameFiles[dir]) {
                grabbingFrameFiles[dir].forEach(url => {
                    const texture = textureLoader.load(url);
                    texture.magFilter = THREE.NearestFilter;
                    texture.minFilter = THREE.NearestFilter;
                    this.animations[grabbingKey].frames.push(texture);
                });
            }
        }
    }

    playWalkAnimation() {
        // Determine which animation set to use based on grab state
        let animationKey = this.direction;

        // Check if character is currently grabbing an object
        if (this.physicsManager && this.physicsManager.isGrabbing()) {
            animationKey = `grabbing_${this.direction}`;
        }

        const currentAnim = this.animations[animationKey];
        if (!this.sprite || !currentAnim || currentAnim.frames.length === 0) {
            // Fallback to normal animation if grabbing animation doesn't exist
            const fallbackAnim = this.animations[this.direction];
            if (!fallbackAnim || fallbackAnim.frames.length === 0) return;

            const sequenceIndex = Math.floor(this.animationTime / fallbackAnim.duration) % fallbackAnim.sequence.length;
            const frameIndex = fallbackAnim.sequence[sequenceIndex];
            const newTexture = fallbackAnim.frames[frameIndex];

            this.sprite.material.map = newTexture;
            this.sprite.customDepthMaterial.map = newTexture;
            return;
        }

        const sequenceIndex = Math.floor(this.animationTime / currentAnim.duration) % currentAnim.sequence.length;
        const frameIndex = currentAnim.sequence[sequenceIndex];
        const newTexture = currentAnim.frames[frameIndex];

        // ✅ 見た目と影、両方のテクスチャを同時に更新する
        this.sprite.material.map = newTexture;
        this.sprite.customDepthMaterial.map = newTexture;
    }
resetToStanding() {
        if (!this.sprite) return;

        // アニメーションのタイマーをリセット
        this.animationTime = 0;

        // Determine which animation set to use based on grab state
        let animationKey = this.direction;
        if (this.physicsManager && this.physicsManager.isGrabbing()) {
            animationKey = `grabbing_${this.direction}`;
        }

        let currentAnim = this.animations[animationKey];

        // Fallback to normal animation if grabbing animation doesn't exist
        if (!currentAnim || currentAnim.frames.length === 0) {
            currentAnim = this.animations[this.direction];
        }

        // 最終的な向きに対応する立ち絵テクスチャを取得
        if (currentAnim && currentAnim.frames.length > 0) {
            // 各方向のアニメーションの最初のフレームを立ち絵とする
            const standingTexture = currentAnim.frames[0];

            // 見た目用のマテリアルを更新
            this.sprite.material.map = standingTexture;

            // 影の形も忘れずに更新する
            // customDepthMaterialを使っている場合
            if (this.sprite.customDepthMaterial) {
                this.sprite.customDepthMaterial.map = standingTexture;
            }
            // shadowCasterを使っている場合
            if (this.shadowCaster) {
                this.shadowCaster.material.alphaMap = standingTexture;
            }
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
