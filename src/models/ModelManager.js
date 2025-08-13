constructor(scene, loadingManager = null) {
    this.scene = scene
    this.loadingManager = loadingManager || THREE.DefaultLoadingManager
    
    // すべてのローダーに統一されたloadingManagerを設定
    this.gltfLoader = new GLTFLoader(this.loadingManager)
    this.textureLoader = new THREE.TextureLoader(this.loadingManager)
    
    // ... 他の初期化コード
}