import * as THREE from 'three'

export class CameraController {
    constructor(camera, character = null) {
        this.camera = camera
        this.character = character
        this.followDistance = new THREE.Vector3(0, 5, 12) // キャラクターからの相対位置
        this.lookAtOffset = new THREE.Vector3(0, 1, 0) // 見る位置のオフセット

        // For project detail
        // this.followDistance = new THREE.Vector3(-8, 3, 5) // キャラクターからの相対位置
        // this.lookAtOffset = new THREE.Vector3(0, 4, 0) // 見る位置のオフセット
        
        // フリーカメラモード用
        this.freeMode = !character
        this.moveSpeed = 0.07
        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false
        }
        
        this.velocity = new THREE.Vector3()
        this.direction = new THREE.Vector3()
        
        if (this.freeMode) {
            this.setupEventListeners()
        }
    }
    
    setCharacter(character) {
        this.character = character
        this.freeMode = false
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (event) => {
            if (!this.freeMode) return
            
            switch(event.code) {
                case 'KeyW':
                    this.keys.w = true
                    break
                case 'KeyA':
                    this.keys.a = true
                    break
                case 'KeyS':
                    this.keys.s = true
                    break
                case 'KeyD':
                    this.keys.d = true
                    break
            }
        })
        
        document.addEventListener('keyup', (event) => {
            if (!this.freeMode) return
            
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
        if (this.character && !this.freeMode) {
            this.followCharacter()
        } else {
            this.updateFreeCamera()
        }
    }
    
    followCharacter() {
        const characterPos = this.character.getPosition()
        
        // カメラの目標位置を計算
        const targetPosition = characterPos.clone().add(this.followDistance)
        
        // スムーズな追従
        this.camera.position.lerp(targetPosition, 0.1)
        
        // キャラクターを見る
        const lookAtTarget = characterPos.clone().add(this.lookAtOffset)
        this.camera.lookAt(lookAtTarget)
    }
    
    updateFreeCamera() {
        this.velocity.set(0, 0, 0)
        
        if (this.keys.w) {
            this.camera.getWorldDirection(this.direction)
            this.velocity.add(this.direction.multiplyScalar(this.moveSpeed))
        }
        if (this.keys.s) {
            this.camera.getWorldDirection(this.direction)
            this.velocity.add(this.direction.multiplyScalar(-this.moveSpeed))
        }
        if (this.keys.a) {
            this.camera.getWorldDirection(this.direction)
            this.direction.cross(this.camera.up)
            this.velocity.add(this.direction.multiplyScalar(-this.moveSpeed))
        }
        if (this.keys.d) {
            this.camera.getWorldDirection(this.direction)
            this.direction.cross(this.camera.up)
            this.velocity.add(this.direction.multiplyScalar(this.moveSpeed))
        }
        
        this.camera.position.add(this.velocity)
    }
}
