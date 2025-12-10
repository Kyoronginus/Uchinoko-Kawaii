import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { items } from "../config/models/items.js";
import { galleryItems } from "../config/models/gallery.js";
import { creatorItems } from "../config/models/creator.js";
import {
  playgroundItems,
  playgroundThroughableItems,
} from "../config/models/playground.js";

/**
 * Unified manager for all 3D models in the scene - both untextured models and signposts
 * Uses consistent physics behavior with configurable mass (high mass = immovable like signposts)
 */
export class ModelManager {
  constructor(scene, physicsManager = null, loadingManager = null) {
    this.scene = scene;
    this.physics = physicsManager;
    // this.gltfLoader = new GLTFLoader(loadingManager)
    this.gltfLoader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
    this.gltfLoader.setDRACOLoader(dracoLoader);
    this.textureLoader = new THREE.TextureLoader();
    this.models = [];

    // Unified model configurations
    this.items = items;
    this.gallery_items = galleryItems;
    this.creator_items = creatorItems;
    this.playground_items = playgroundItems;
    this.playground_throughable_items = playgroundThroughableItems;
  }

  /**
   * Initialize and load all models
   */
  async loadAllModels() {
    // Filter out any misconfigured items without a valid modelPath
    const allItemsRaw = [
      ...this.items,
      ...this.gallery_items,
      ...this.creator_items,
      ...this.playground_items,
      ...this.playground_throughable_items,
    ];
    const allItems = allItemsRaw.filter(
      (it) => it && typeof it.modelPath === "string" && it.modelPath.length > 0
    );
    const skipped = allItemsRaw.length - allItems.length;
    if (skipped > 0) {
      console.warn(`Skipping ${skipped} item(s) without a valid modelPath`);
    }
    const loadPromises = allItems.map((item) => this.loadModel(item));
    try {
      await Promise.all(loadPromises);
      console.log(`Successfully loaded ${this.models.length} models`);
    } catch (error) {
      console.error("Error loading models:", error);
    }
  }

  /**
   * Load a single model and prepare it for rendering
   * @param {Object} item - Configuration object
   * @returns {Promise<THREE.Object3D>} Resolves with the loaded model root
   */
  loadModel(item) {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        item.modelPath,
        async (gltf) => {
          const root = gltf.scene;

          const objectsToRemove = [];
          root.traverse((child) => {
            // The 'visible' property is set to false if render visibility was off in Blender
            if (!child.visible) {
              objectsToRemove.push(child);
            }
          });

          // Remove the collected objects from the scene
          objectsToRemove.forEach((child) => {
            child.removeFromParent();
          });

          // Apply transform
          this.applyTransformation(root, item);

          // Apply materials based on type
          if (item.type === "untextured") {
            this.applyBasicMaterials(root, item);
          } else if (item.type === "signpost") {
            await this.applySignpostMaterials(root, item);
          } else if (item.type === "acrylic") {
            this.applyAcrylicMaterials(root, item);
          } else if (item.type === "screen") {
            await this.applyScreenMaterials(root, item);
          } else if (item.type === "statue") {
            // statues can share signpost-like material behavior if needed
            // Currently no special material handling; keep model materials
          }

          // Configure shadows
          this.configureShadows(root, item);

          // Set interaction callback based on type
          if (item.type === "untextured" && !item.interactionCallback) {
            item.interactionCallback = this.createTextInteractionCallback();
          }

          // Setup physics
          const physicsData = this.setupPhysics(root, item);

          // Add to scene and track
          this.scene.add(root);
          this.models.push({
            mesh: root,
            item,
            physics: physicsData,
          });

          console.log(`Loaded ${item.type} model: ${item.modelPath}`);
          resolve(root);
        },
        (progress) => {
          if (progress.total > 0) {
            console.log(
              `Loading ${item.modelPath}: ${(
                (progress.loaded / progress.total) *
                100
              ).toFixed(1)}%`
            );
          }
        },
        (error) => {
          console.error(`Failed to load model: ${item.modelPath}`, error);
          reject(error);
        }
      );
    });
  }

  /**
   * Apply position, rotation, and scale
   */
  applyTransformation(object3d, item) {
    if (item.position) object3d.position.copy(item.position);
    if (item.rotation) object3d.rotation.copy(item.rotation);
    if (item.scale) object3d.scale.copy(item.scale);
  }

  /**
   * Apply basic materials for untextured models
   */
  applyBasicMaterials(root, item) {
    // For Untextured models, use the material set in Blender as is.
    // Here, just adjust properties so that the material reacts to light correctly.

    root.traverse((child) => {
      if (child.isMesh && child.material) {
        // Consider case where material from Blender is an array
        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material];

        materials.forEach((material) => {
          // If material has color setting, respect it
          // Otherwise, set default color
          if (!material.color) {
            material.color = new THREE.Color(0xffffff);
          }
          // Other properties can also be adjusted as needed
          // material.opacity = 0.8;
        });
      }
    });
  }
  /**
   * Apply signpost materials (with screenshot texture)
   */
  async applySignpostMaterials(root, item) {
    if (!item.screenshotPath) return;

    try {
      const texture = await this.loadTexture(item.screenshotPath);
      this.configureTexture(texture);
      this.applyTextureToScreen(root, texture);
    } catch (error) {
      console.error(
        `Failed to load screenshot for signpost: ${item.screenshotPath}`,
        error
      );
    }
  }

  async applyScreenMaterials(root, item) {
    if (!item.screenshotPath) return;

    try {
      const texture = await this.loadTexture(item.screenshotPath);

      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.repeat.x = -1;

      // Rotate texture 90 degrees clockwise to correct orientation
      texture.center.set(0.5, 0.5);
      texture.rotation = Math.PI / 2;

      root.traverse((child) => {
        const substring = "M_Screen";
        if (
          child.isMesh &&
          child.material &&
          child.material.name.includes(substring)
        ) {
          child.material = new THREE.MeshBasicMaterial({ map: texture });
          texture.needsUpdate = true;
        }
      });
    } catch (error) {
      console.error(
        `Failed to load screenshot for screen: ${item.screenshotPath}`,
        error
      );
    }
  }

  /**
   * Applies the character texture to the acrylic stand model and configures its
   * material for sharp, cutout transparency.
   * @param {THREE.Object3D} root - The root of the loaded GLTF scene.
   * @param {object} item - The configuration object containing the screenshotPath.
   */
  async applyAcrylicMaterials(root, item) {
    // Exit if there's no texture path defined
    if (!item.screenshotPath) return;

    try {
      // Load the texture from the provided path
      const texture = await this.loadTexture(item.screenshotPath);

      // Apply standard texture configurations (flipping, encoding, etc.)
      this.configureTexture(texture);

      // Traverse the model to find the mesh and its material
      root.traverse((child) => {
        if (child.isMesh) {
          // Get the material from the mesh
          const material = child.material;

          // --- This is the key part for acrylic stands ---

          // 1. Apply the loaded texture to the material's color map
          material.map = texture;

          // 2. Enable transparency
          // This tells Three.js to respect the alpha channel.
          material.transparent = true;

          // 3. Set an alpha test threshold for clean cutouts
          // This will make any pixel with an alpha value below 0.5 completely invisible.
          // It's perfect for sharp-edged transparency like character cutouts
          // and avoids transparency sorting issues.
          // material.alphaTest = 0.5;

          // 4. Let Three.js know the material needs to be updated
          material.needsUpdate = true;
        }
      });
    } catch (error) {
      console.error(
        `Failed to apply acrylic material for: ${item.screenshotPath}`,
        error
      );
    }
  }

  /**
   * Load texture as Promise
   */
  loadTexture(path) {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(path, resolve, undefined, reject);
    });
  }

  /**
   * Configure texture for pixel-art style
   */
  configureTexture(texture) {
    // Pixel art texture settings
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.wrapS = THREE.RepeatWrapping; // Enable horizontal repetition
    texture.repeat.x = -1;
    texture.wrapT = THREE.ClampToEdgeWrapping; // Disable repetition
  }
  /**
   * Apply texture to screen material
   */
  applyTextureToScreen(signpost, texture) {
    signpost.traverse((child) => {
      if (
        child.isMesh &&
        child.material &&
        child.material.name === "M_Screen"
      ) {
        child.material = new THREE.MeshBasicMaterial({ map: texture });
        // Fix texture vertical flip
        // texture.flipY = false;
        texture.needsUpdate = true; // Notify Three.js of texture update
      }
    });
  }
  /**
   * Configure shadow properties
   */
  configureShadows(root, item) {
    const modelIsMScreen = item && item.type === "m_screen";
    root.traverse((child) => {
      if (child.isMesh) {
        const meshIsScreenPart =
          !!child.userData.isScreenPart ||
          (child.name && /m[_ ]?screen/i.test(child.name));
        const disableCasting = modelIsMScreen || meshIsScreenPart;

        // Always allow receiving shadows
        child.receiveShadow = true;
        // Only disable casting for screen-type models/parts
        child.castShadow = !disableCasting;
      }
    });
  }

  /**
   * Setup physics for a model using cannon-es via PhysicsManager
   */
  setupPhysics(root, item) {
    if (!this.physics || (!item.enableCollision && !item.enablePhysics)) {
      return null;
    }

    // Build options from item
    const physicsOptions = {
      type: item.static ? "static" : "dynamic",
      shape: item.physicsShape || "box",
      mass: typeof item.mass === "number" ? item.mass : 1,
      friction: typeof item.friction === "number" ? item.friction : 0.3,
      restitution:
        typeof item.restitution === "number" ? item.restitution : 0.1,
      linearDamping:
        typeof item.linearDamping === "number" ? item.linearDamping : 0.2,
      angularDamping:
        typeof item.angularDamping === "number" ? item.angularDamping : 0.4,
    };

    const body = this.physics.addBodyForMesh(root, physicsOptions);

    const data = {
      enabled: true,
      physics: true,
      body,
      interactionCallback: item.interactionCallback || null,
      lastInteractionTime: 0,
    };

    // Mark A4 boards to disable character repulsion
    if (item.modelPath === "board_A4_portrait.glb") {
      body.userData = body.userData || {};
      body.userData.disableCharacterRepulsion = true;
      console.log(
        "A4 board physics body marked to disable character repulsion:",
        item.position
      );
    }

    // Attach to userData
    root.userData.physics = data;
    return data;
  }

  /**
   * Check collision between character position and all collision-enabled models
   */
  checkCollisions(characterPosition, proposedPosition) {
    const result = {
      collision: false,
      correctedPosition: proposedPosition.clone(),
      interactions: [],
    };

    for (const modelEntry of this.models) {
      if (!modelEntry.physics || !modelEntry.physics.enabled) {
        continue;
      }

      const physics = modelEntry.physics;
      const distance = proposedPosition.distanceTo(modelEntry.mesh.position);

      // Simple sphere collision for now
      const collisionRadius = 2.0;
      if (distance < collisionRadius) {
        result.collision = true;

        // Simple collision response - push character away
        const pushDirection = proposedPosition
          .clone()
          .sub(modelEntry.mesh.position)
          .normalize();
        result.correctedPosition = modelEntry.mesh.position
          .clone()
          .add(pushDirection.multiplyScalar(collisionRadius));

        // Handle interaction
        if (physics.interactionCallback) {
          const currentTime = Date.now();
          if (currentTime - physics.lastInteractionTime > 1000) {
            // 1 second cooldown
            result.interactions.push({
              model: modelEntry.mesh,
              item: modelEntry.item,
              callback: physics.interactionCallback,
            });
            physics.lastInteractionTime = currentTime;
          }
        }

        // Handle signpost/statue-specific interactions
        if (
          modelEntry.item &&
          (modelEntry.item.type === "signpost" ||
            modelEntry.item.type === "statue")
        ) {
          this.handleSignpostInteraction(modelEntry.item);
        }

        break; // Only handle first collision
      }
    }

    return result;
  }

  /**
   * Update physics for all physics-enabled models (called each frame)
   */
  updatePhysics(deltaTime) {
    for (const modelEntry of this.models) {
      if (modelEntry.physics && modelEntry.physics.physics) {
        // Add any physics updates here (e.g., animations, floating effects)
      }
    }
  }

  /**
   * Create interaction callback for text models
   */
  createTextInteractionCallback() {
    return (character, model, item) => {
      console.log(`Character touched the text model: ${item.modelPath}`);

      // Example: Make the text glow briefly
      model.traverse((child) => {
        if (child.isMesh && child.material) {
          const originalEmissive = child.material.emissive.clone();
          child.material.emissive.setHex(0x444444);

          setTimeout(() => {
            child.material.emissive.copy(originalEmissive);
          }, 500);
        }
      });
    };
  }

  /**
   * Handle signpost interaction (open URL)
   */
  handleSignpostInteraction(item) {
    if ((item.type === "signpost" || item.type === "statue") && item.url) {
      console.log(`Opening ${item.type} URL: ${item.name} -> ${item.url}`);
      window.open(item.url, "_blank");
    }
  }

  /**
   * Get all models of a specific type
   */
  getModelsByType(type) {
    return this.models.filter((modelEntry) => modelEntry.item.type === type);
  }

  /**
   * Get model by index
   */
  getModel(index) {
    return this.models[index] || null;
  }

  /**
   * Get total number of models
   */
  getModelCount() {
    return this.models.length;
  }

  /**
   * Dispose of all resources
   */
  dispose() {
    this.models.forEach((modelEntry) => {
      this.scene.remove(modelEntry.mesh);

      // Dispose of geometries and materials
      modelEntry.mesh.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((material) => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    });

    this.models = [];
    console.log("ModelManager disposed");
  }
}
