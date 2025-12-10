import * as THREE from "three";

export class CameraController {
  constructor(camera, character = null) {
    this.camera = camera;
    this.character = character;
    this.defaultFollowDistance = new THREE.Vector3(0, 5, 12);
    this.defaultLookAtOffset = new THREE.Vector3(0, 1, 0);

    // ★ Current target follow settings (Initially same as default)
    this.targetFollowDistance = this.defaultFollowDistance.clone();
    this.targetLookAtOffset = this.defaultLookAtOffset.clone();
    // Current values (Values for smooth interpolation to target)
    this.currentFollowDistance = this.defaultFollowDistance.clone();
    this.currentLookAtOffset = this.defaultLookAtOffset.clone();
    this.smoothFactor = 0.01; // Smoothness of follow angle interpolation (0-1)

    this.mode = "default"; // default / gallery

    // for gallery
    // this.followDistance = new THREE.Vector3(0, 3, 8) // Relative position from character
    // this.lookAtOffset = new THREE.Vector3(0, 3, 0) // lookAt position offset

    // For project detail
    // this.followDistance = new THREE.Vector3(-8, 3, 5) // Relative position from character
    // this.lookAtOffset = new THREE.Vector3(0, 4, 0) // lookAt position offset

    // For free camera mode
    this.freeMode = !character;
    this.moveSpeed = 0.07;
    this.keys = {
      w: false,
      a: false,
      s: false,
      d: false,
    };

    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();

    if (this.freeMode) {
      this.setupEventListeners();
    }

    // Camera Zones
    this.zones = [];
    this.currentZone = null;
  }

  setCharacter(character) {
    this.character = character;
    this.freeMode = false;
  }

  setupEventListeners() {
    document.addEventListener("keydown", (event) => {
      if (!this.freeMode) return;

      switch (event.code) {
        case "KeyW":
          this.keys.w = true;
          break;
        case "KeyA":
          this.keys.a = true;
          break;
        case "KeyS":
          this.keys.s = true;
          break;
        case "KeyD":
          this.keys.d = true;
          break;
      }
    });

    document.addEventListener("keyup", (event) => {
      if (!this.freeMode) return;

      switch (event.code) {
        case "KeyW":
          this.keys.w = false;
          break;
        case "KeyA":
          this.keys.a = false;
          break;
        case "KeyS":
          this.keys.s = false;
          break;
        case "KeyD":
          this.keys.d = false;
          break;
      }
    });
  }

  setZones(zones) {
    this.zones = zones;
  }

  checkZones() {
    if (!this.character || !this.zones.length) return;
    const charPos = this.character.getPosition();
    let inAnyZone = false;
    for (const zone of this.zones) {
      if (zone.box.containsPoint(charPos)) {
        inAnyZone = true;
        if (this.currentZone !== zone) {
          this.currentZone = zone;
          this.setFollowAngle(zone.angle);
        }
        break;
      }
    }

    if (!inAnyZone && this.currentZone !== null) {
      this.currentZone = null;
      this.resetToDefaultAngle();
    }
  }

  update() {
    if (this.character && !this.freeMode) {
      this.checkZones();
      this.followCharacter();
    } else {
      this.updateFreeCamera();
    }
  }

  followCharacter() {
    const characterPos = this.character.getPosition();

    // Smoothly interpolate to target value
    this.currentFollowDistance.lerp(
      this.targetFollowDistance,
      this.smoothFactor
    );
    this.currentLookAtOffset.lerp(this.targetLookAtOffset, this.smoothFactor);

    // Calculate target camera position (use current value)
    const targetPosition = characterPos.clone().add(this.currentFollowDistance);

    // Smooth follow
    this.camera.position.lerp(targetPosition, 0.1);

    // Look at character (use current value)
    const lookAtTarget = characterPos.clone().add(this.currentLookAtOffset);
    this.camera.lookAt(lookAtTarget);
  }

  updateFreeCamera() {
    this.velocity.set(0, 0, 0);

    if (this.keys.w) {
      this.camera.getWorldDirection(this.direction);
      this.velocity.add(this.direction.multiplyScalar(this.moveSpeed));
    }
    if (this.keys.s) {
      this.camera.getWorldDirection(this.direction);
      this.velocity.add(this.direction.multiplyScalar(-this.moveSpeed));
    }
    if (this.keys.a) {
      this.camera.getWorldDirection(this.direction);
      this.direction.cross(this.camera.up);
      this.velocity.add(this.direction.multiplyScalar(-this.moveSpeed));
    }
    if (this.keys.d) {
      this.camera.getWorldDirection(this.direction);
      this.direction.cross(this.camera.up);
      this.velocity.add(this.direction.multiplyScalar(this.moveSpeed));
    }

    this.camera.position.add(this.velocity);
  }

  /**
   * Smoothly change camera follow angle to specified settings
   * @param {Object} angleConfig - Settings object including { followDistance, lookAtOffset }
   */
  setFollowAngle(angleConfig) {
    // Set new target values
    this.targetFollowDistance.copy(angleConfig.followDistance);
    this.targetLookAtOffset.copy(angleConfig.lookAtOffset);
  }

  /**
   * Smoothly reset camera follow angle to default settings
   */
  resetToDefaultAngle() {
    // Reset target values to default
    this.targetFollowDistance.copy(this.defaultFollowDistance);
    this.targetLookAtOffset.copy(this.defaultLookAtOffset);
  }
}
