import * as THREE from 'three'

export class PixelCharacter {
    constructor(textureUrl, scene) {
        this.scene = scene
        this.position = new THREE.Vector3(0, 1, 0)
        this.moveSpeed = 0.1
        this.isMoving = false
        
        // キャラクターの向き
        this.direction = 'down' // down, up, left, right
        
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
            switch(event.code) {
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
            switch(event.code) {
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
        const velocity = new THREE.Vector3()
        this.isMoving = false
        
        if (this.keys.w) {
            velocity.z -= this.moveSpeed
            this.isMoving = true
        }
        if (this.keys.s) {
            velocity.z += this.moveSpeed
            this.isMoving = true
        }
        if (this.keys.a) {
            velocity.x -= this.moveSpeed
            this.isMoving = true
        }
        if (this.keys.d) {
            velocity.x += this.moveSpeed
            this.isMoving = true
        }
        
        // キャラクター位置更新
        this.position.add(velocity)
        if (this.sprite) {
            this.sprite.position.copy(this.position)
        }
        
        // 将来のアニメーション用
        if (this.isMoving) {
            this.playWalkAnimation()
        } else {
            this.playIdleAnimation()
        }
    }
    
    // 将来のアニメーション用メソッド
    playWalkAnimation() {
        // TODO: 歩行アニメーション実装
        // スプライトシートを使用してフレームを切り替え
    }
    
    playIdleAnimation() {
        // TODO: 待機アニメーション実装
    }
    
    // カメラがキャラクターを追従するための位置取得
    getPosition() {
        return this.position.clone()
    }
}