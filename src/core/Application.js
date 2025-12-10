import * as THREE from "three";
import {
  setupExampleText,
  setupCreatorText,
  setupGalleryText,
} from "../environment/texts/floorText.js";
import { CameraController } from "../controllers/CameraController.js";
import { HD2DRenderer } from "../rendering/HD2DRenderer.js";
import { PixelCharacter } from "../characters/PixelCharacter.js";
import { ModelManager } from "../objects/ModelManager.js";
import { LightingManager } from "../lighting/LightingManager.js";
import { ProximityInteractionManager } from "../interaction/ProximityInteractionManager.js";
import { EnvironmentManager } from "../environment/EnvironmentManager.js";
import { TextManager } from "../environment/TextManager.js";
import { PhysicsManager } from "../physics/PhysicsManager.js";
import { LoadingUI } from "../ui/LoadingUI.js";
import { cameraAngleZones } from "../config/CameraZones.js";

export class Application {
  constructor() {
    // UI
    this.loadingUI = new LoadingUI();
    this.loadingUI.onStart(() => this.startLoop());

    // Loading Manager
    this.loadingManager = THREE.DefaultLoadingManager;
    this.setupLoadingManager();

    // Canvas
    this.canvas = document.querySelector("canvas.webgl");

    // Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xffffff, 50, 100);

    // Sizes
    this.sizes = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      45,
      this.sizes.width / this.sizes.height,
      0.1,
      100
    );
    this.camera.position.set(0, 12, 12);

    // Character
    this.character = new PixelCharacter(
      "/default_standing.png",
      this.scene,
      this.camera
    );

    // Camera Controller
    this.cameraController = new CameraController(this.camera, this.character);
    this.cameraController.setZones(cameraAngleZones);

    // Renderer
    this.hd2dRenderer = new HD2DRenderer(
      this.canvas,
      this.sizes,
      this.scene,
      this.camera
    );

    // Managers
    this.physicsManager = new PhysicsManager();
    this.modelManager = new ModelManager(this.scene, this.physicsManager);
    this.lightingManager = new LightingManager(this.scene);
    this.environmentManager = new EnvironmentManager(this.scene);
    this.textManager = new TextManager(this.scene);
    this.proximityManager = null;

    // Connect physics
    this.character.setPhysicsManager(this.physicsManager);

    // Resize
    window.addEventListener("resize", () => this.resize());
  }

  setupLoadingManager() {
    this.loadingManager.onLoad = () => {
      console.log("Scene loaded");
      this.loadingUI.showStartButton();
    };
    this.loadingManager.onProgress = (itemUrl, itemsLoaded, itemsTotal) => {
      const progress = itemsTotal > 0 ? itemsLoaded / itemsTotal : 0;
      this.loadingUI.updateProgress(progress);
      console.log(
        `load progress: ${Math.round(
          progress * 100
        )}% (${itemsLoaded}/${itemsTotal}) - ${itemUrl}`
      );
    };
    this.loadingManager.onError = (url) => {
      console.error("load error:", url);
    };
  }

  async init() {
    try {
      this.textManager.createWelcomeText();
      this.lightingManager.setupLighting();
      await this.environmentManager.setupEnvironment();
      await this.modelManager.loadAllModels();

      // Debug: Log loaded models
      console.log("All loaded models by type:");
      const allModels = this.modelManager.models;
      const modelsByType = {};
      allModels.forEach((entry) => {
        const type = entry.item.type || "unknown";
        if (!modelsByType[type]) modelsByType[type] = [];
        modelsByType[type].push(entry.item.name || entry.item.modelPath);
      });
      Object.keys(modelsByType).forEach((type) => {
        console.log(`  ${type}: ${modelsByType[type].length} models`);
        modelsByType[type].forEach((name) => console.log(`    - ${name}`));
      });

      // Create character physics body and keep it in sync
      this.character.physicsBody = this.physicsManager.addCharacterBody(
        this.character.getPosition(),
        0.5,
        1
      );
      this.physicsManager.setCharacterBody(this.character.physicsBody);

      // Initialize proximity interaction manager
      const signpostModels = this.modelManager.getModelsByType("signpost");
      const statueModels = this.modelManager.getModelsByType("statue");
      const interactiveObjects = [...signpostModels, ...statueModels];

      this.proximityManager = new ProximityInteractionManager(
        interactiveObjects,
        this.scene,
        {
          interactionDistance: 3.5,
          showVisualizers: false,
          visualizerColor: 0x00ffff,
          visualizerOpacity: 0.3,
        }
      );

      // Setup floor texts
      setupExampleText(this.environmentManager);
      setupCreatorText(this.environmentManager);
      setupGalleryText(this.environmentManager);

      console.log("Scene initialization complete");
    } catch (error) {
      console.error("Error initializing scene:", error);
    }
  }

  resize() {
    this.sizes.width = window.innerWidth;
    this.sizes.height = window.innerHeight;

    this.camera.aspect = this.sizes.width / this.sizes.height;
    this.camera.updateProjectionMatrix();

    this.hd2dRenderer.setSize(this.sizes.width, this.sizes.height);
  }

  startLoop() {
    this.animate();
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const distance = this.character
      .getPosition()
      .distanceTo(this.camera.position);
    this.hd2dRenderer.setFocusDistance(distance);
    const deltaTime = 1 / 60;

    this.character.update();

    // Drive the character's physics body from input
    if (this.character.physicsBody) {
      // Set horizontal velocity from input
      const desiredVel = this.character.getDesiredVelocity
        ? this.character.getDesiredVelocity()
        : new THREE.Vector3();
      this.character.physicsBody.velocity.x = desiredVel.x;
      this.character.physicsBody.velocity.z = desiredVel.z;
      // Keep character upright
      this.character.physicsBody.position.y = Math.max(
        this.character.physicsBody.position.y,
        0.9
      );
    }

    // Apply character repulsion
    if (
      this.physicsManager.applyCharacterRepulsion &&
      this.character.physicsBody
    ) {
      this.physicsManager.applyCharacterRepulsion(this.character.physicsBody);
    }

    this.physicsManager.step(deltaTime);

    // Sync character position from physics
    if (this.character.physicsBody && this.character.sprite) {
      const p = this.character.physicsBody.position;
      this.character.position.set(p.x, p.y, p.z);
      this.character.sprite.position.copy(this.character.position);
    }

    // Update proximity
    if (this.proximityManager) {
      this.proximityManager.update(this.character.getPosition());
    }

    // Update camera and render
    this.cameraController.update();
    this.hd2dRenderer.render(this.scene, this.camera);
  }
}
