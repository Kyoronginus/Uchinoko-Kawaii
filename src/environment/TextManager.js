import * as THREE from 'three'

/**
 * Create a pixel-perfect text texture optimized for HD-2D rendering
 * @param {string} text - The text to render
 * @param {Object} options - Configuration options
 * @returns {THREE.CanvasTexture} - The generated texture
 */
function createTextTexture(text, options = {}) {
    const {
        font = '16px Silkscreen',
        color = '#FFFFFF',
        backgroundColor = 'rgba(0, 0, 0, 0)',
        padding = 8,
        pixelRatio = 2, // Higher resolution for crisp text
        outline = false,
        outlineColor = '#000000',
        outlineWidth = 1
    } = options;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    // Disable antialiasing for pixel-perfect text
    context.imageSmoothingEnabled = false;
    context.webkitImageSmoothingEnabled = false;
    context.mozImageSmoothingEnabled = false;
    context.msImageSmoothingEnabled = false;

    // Set font and measure text
    context.font = font;
    const textMetrics = context.measureText(text);
    const textWidth = Math.ceil(textMetrics.width);
    const fontSize = parseInt(font.match(/\d+/)[0]);
    const textHeight = fontSize;

    // Calculate canvas size with padding and pixel ratio
    const canvasWidth = Math.ceil((textWidth + padding * 2) * pixelRatio);
    const canvasHeight = Math.ceil((textHeight + padding * 2) * pixelRatio);

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Scale context for high DPI
    context.scale(pixelRatio, pixelRatio);

    // Reapply settings after canvas resize
    context.imageSmoothingEnabled = false;
    context.font = font;
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    // Draw background
    if (backgroundColor !== 'rgba(0, 0, 0, 0)') {
        context.fillStyle = backgroundColor;
        context.fillRect(0, 0, canvasWidth / pixelRatio, canvasHeight / pixelRatio);
    }

    const centerX = (canvasWidth / pixelRatio) / 2;
    const centerY = (canvasHeight / pixelRatio) / 2;

    // Draw outline if enabled
    if (outline) {
        context.strokeStyle = outlineColor;
        context.lineWidth = outlineWidth;
        context.strokeText(text, centerX, centerY);
    }

    // Draw main text
    context.fillStyle = color;
    context.fillText(text, centerX, centerY);

    // Create texture with proper settings for pixel art
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.generateMipmaps = false;
    // texture.flipY = false;

    return texture;
}
export class TextManager {
    constructor(scene) {
        this.scene = scene;
        this.textMeshes = [];
        this.fontLoaded = false;

        // Default configuration for HD-2D text
        this.defaultConfig = {
            font: '16px Silkscreen',
            color: '#FFFFFF',
            backgroundColor: 'rgba(0, 0, 0, 0)',
            padding: 8,
            pixelRatio: 2,
            outline: false,
            outlineColor: '#000000',
            outlineWidth: 1,
            scale: 3, // World scale for text meshes
            yOffset: 0.01 // Slight elevation above floor
        };

        this.loadFont();
    }

    /**
     * Load the Silkscreen font and wait for it to be ready
     */
    async loadFont() {
        try {
            // Check if font is already loaded
            if (document.fonts.check('16px Silkscreen')) {
                this.fontLoaded = true;
                console.log('Silkscreen font already loaded');
                return;
            }

            // Wait for font to load
            await document.fonts.load('16px Silkscreen');
            this.fontLoaded = true;
            console.log('Silkscreen font loaded successfully');
        } catch (error) {
            console.warn('Failed to load Silkscreen font, falling back to monospace:', error);
            this.defaultConfig.font = '16px monospace';
            this.fontLoaded = true;
        }
    }

    /**
     * Create welcome text on the floor
     */
    createWelcomeText() {
        const welcomeTextTexture = createTextTexture('', {
            font: '20px Silkscreen',
            color: '#FFFFFF',
            // outline: false,
            // outlineColor: '#ffffffff',
            // outlineWidth: 0,
            pixelRatio: 3
        });

        const textMesh = this.createTextMesh(welcomeTextTexture, {
            position: { x: 0, y: 0.01, z: 10 },
            scale: 4
        });

        this.textMeshes.push({
            mesh: textMesh,
            id: 'welcome',
            type: 'floor'
        });

        console.log('Welcome text created');
    }

    /**
     * Create a text mesh from a texture
     * @param {THREE.Texture} texture - The text texture
     * @param {Object} options - Positioning and scaling options
     * @returns {THREE.Mesh} - The created text mesh
     */
    createTextMesh(texture, options = {}) {
        const {
            position = { x: 0, y: 0.01, z: 0 },
            rotation = { x: -Math.PI / 2, y: 0, z: 0 },
            scale = this.defaultConfig.scale,
            receiveShadow = true,
            castShadow = false
        } = options;

        // Create material with proper settings for HD-2D
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.1,
            side: THREE.DoubleSide
        });

        // Calculate aspect ratio and create geometry
        const aspectRatio = texture.image.width / texture.image.height;
        const geometry = new THREE.PlaneGeometry(scale * aspectRatio, scale);

        const mesh = new THREE.Mesh(geometry, material);

        // Apply transformations
        mesh.position.set(position.x, position.y, position.z);
        mesh.rotation.set(rotation.x, rotation.y, rotation.z);
        mesh.receiveShadow = receiveShadow;
        mesh.castShadow = castShadow;

        this.scene.add(mesh);
        return mesh;
    }

    /**
     * Add floor text at a specific position
     * @param {string} text - The text to display
     * @param {Object} position - World position {x, y, z}
     * @param {Object} options - Text styling options
     * @returns {string} - Unique ID for the text
     */
    addFloorText(text, position, options = {}) {
        const config = { ...this.defaultConfig, ...options };
        const texture = createTextTexture(text, config);

        const mesh = this.createTextMesh(texture, {
            position: { x: position.x, y: position.y || config.yOffset, z: position.z },
            scale: config.scale
        });

        const id = `floor_text_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

        this.textMeshes.push({
            mesh: mesh,
            id: id,
            type: 'floor',
            text: text,
            position: position
        });

        return id;
    }

    /**
     * Update existing text
     * @param {string} id - Text ID to update
     * @param {string} newText - New text content
     * @param {Object} options - New styling options
     */
    updateText(id, newText, options = {}) {
        const textObj = this.textMeshes.find(t => t.id === id);
        if (!textObj) {
            console.warn(`Text with ID ${id} not found`);
            return;
        }

        // Create new texture
        const config = { ...this.defaultConfig, ...options };
        const newTexture = createTextTexture(newText, config);

        // Update material
        textObj.mesh.material.map.dispose(); // Clean up old texture
        textObj.mesh.material.map = newTexture;
        textObj.mesh.material.needsUpdate = true;

        // Update geometry if aspect ratio changed
        const newAspectRatio = newTexture.image.width / newTexture.image.height;
        const currentGeometry = textObj.mesh.geometry;
        const newGeometry = new THREE.PlaneGeometry(
            config.scale * newAspectRatio,
            config.scale
        );

        currentGeometry.dispose();
        textObj.mesh.geometry = newGeometry;

        textObj.text = newText;
    }

    /**
     * Remove text by ID
     * @param {string} id - Text ID to remove
     */
    removeText(id) {
        const index = this.textMeshes.findIndex(t => t.id === id);
        if (index === -1) {
            console.warn(`Text with ID ${id} not found`);
            return;
        }

        const textObj = this.textMeshes[index];

        // Clean up resources
        this.scene.remove(textObj.mesh);
        textObj.mesh.geometry.dispose();
        textObj.mesh.material.map.dispose();
        textObj.mesh.material.dispose();

        this.textMeshes.splice(index, 1);
    }

    /**
     * Get all text objects
     * @returns {Array} - Array of text objects
     */
    getAllTexts() {
        return this.textMeshes.map(t => ({
            id: t.id,
            type: t.type,
            text: t.text,
            position: t.position
        }));
    }

    /**
     * Dispose of all text resources
     */
    dispose() {
        this.textMeshes.forEach(textObj => {
            this.scene.remove(textObj.mesh);
            textObj.mesh.geometry.dispose();
            textObj.mesh.material.map.dispose();
            textObj.mesh.material.dispose();
        });

        this.textMeshes = [];
        console.log('TextManager disposed');
    }
}