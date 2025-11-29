import * as THREE from "three";
import * as CANNON from "cannon-es";
import { ConvexHull } from "three/examples/jsm/math/ConvexHull.js";

export class PhysicsManager {
  constructor() {
    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.allowSleep = true;

    // Default material/contact
    this.defaultMaterial = new CANNON.Material("default");
    const contact = new CANNON.ContactMaterial(
      this.defaultMaterial,
      this.defaultMaterial,
      {
        friction: 0.3,
        restitution: 0.1,
      }
    );
    this.world.addContactMaterial(contact);

    // Maps for syncing
    this.bodyToMesh = new Map();
    this.meshToBody = new Map();

    // Character repulsion ("personal space bubble") defaults
    this.characterRepulsion = {
      enabled: true,
      detectionScale: 0.71, // detection radius = scale * character sphere radius
      strength: 0.8, // push factor (larger = stronger)
      activationSpeed: 0.6, // only apply when character horizontal speed is below this
      horizontalOnly: true, // push in XZ plane only
      maxPushPerStep: 1, // clamp push magnitude per frame
    };
    // Temp vectors to avoid allocations
    this._tmpVec3A = new CANNON.Vec3();
    this._tmpVec3B = new CANNON.Vec3();

    // Grab/Carry system
    this.grabSystem = {
      isGrabbing: false,
      grabbedBody: null,
      grabConstraint: null,
      grabDistance: 0.5, // Distance in front of character to hold object
      grabHeight: 2, // Height above character center to hold object
      maxGrabDistance: 2.5, // Maximum distance to detect grabbable objects
      grabForce: 800, // Constraint force for holding objects
      characterBody: null, // Reference to character body for collision filtering
      originalCharacterMass: null, // Store original character mass for restoration
    };

    // Ground plane (optional). Comment out if you have a floor collider from GLB.
    const groundBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Plane(),
      material: this.defaultMaterial,
    });
    // Rotate plane so it's horizontal (Cannon planes face along +Z by default)
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.world.addBody(groundBody);
  }

  createMaterial(friction = 0.3, restitution = 0.1) {
    const mat = new CANNON.Material(
      "mat_" + Math.random().toString(36).slice(2)
    );
    // Material vs default
    const cd = new CANNON.ContactMaterial(mat, this.defaultMaterial, {
      friction,
      restitution,
    });
    this.world.addContactMaterial(cd);
    // Material vs same material
    const cs = new CANNON.ContactMaterial(mat, mat, { friction, restitution });
    this.world.addContactMaterial(cs);
    return mat;
  }

  createBoxShapeFromObject(object3d) {
    const box = new THREE.Box3().setFromObject(object3d);
    const size = box.getSize(new THREE.Vector3());
    const halfExtents = new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2);
    const shape = new CANNON.Box(halfExtents);
    const center = box.getCenter(new THREE.Vector3());
    return { shape, center };
  }

  createSphereShapeFromObject(object3d) {
    const box = new THREE.Box3().setFromObject(object3d);
    const size = box.getSize(new THREE.Vector3());
    const radius = Math.max(size.x, size.y, size.z) / 2;
    const shape = new CANNON.Sphere(radius);
    const center = box.getCenter(new THREE.Vector3());
    return { shape, center };
  }

  // Build a Cannon.Trimesh from a THREE.Object3D hierarchy (accurate collider)
  createTrimeshShapeFromObject(object3d) {
    const vertices = [];
    const indices = [];
    const rootInv = new THREE.Matrix4().copy(object3d.matrixWorld).invert();
    const temp = new THREE.Matrix4();
    let vertexOffset = 0;

    object3d.updateWorldMatrix(true, true);
    object3d.traverse((child) => {
      if (!child.isMesh || !child.geometry) return;
      const geom = child.geometry;
      const posAttr = geom.attributes && geom.attributes.position;
      if (!posAttr) return;

      // Compute transform from child local into root local
      temp.multiplyMatrices(rootInv, child.matrixWorld);

      // Push transformed vertices (respect root scale)
      for (let i = 0; i < posAttr.count; i++) {
        const v = new THREE.Vector3(
          posAttr.getX(i),
          posAttr.getY(i),
          posAttr.getZ(i)
        ).applyMatrix4(temp);
        v.multiply(object3d.scale);
        vertices.push(v.x, v.y, v.z);
      }

      // Use indices if available, otherwise assume non-indexed triangles
      if (geom.index) {
        const idx = geom.index.array;
        for (let i = 0; i < idx.length; i++) {
          indices.push(idx[i] + vertexOffset);
        }
      } else {
        for (let i = 0; i < posAttr.count; i++) {
          indices.push(vertexOffset + i);
        }
      }
      vertexOffset += posAttr.count;
    });

    if (vertices.length === 0 || indices.length === 0) {
      // Fallback tiny box if no geometry
      return new CANNON.Box(new CANNON.Vec3(0.01, 0.01, 0.01));
    }

    const indexArray =
      vertices.length / 3 < 65535
        ? new Uint16Array(indices)
        : new Uint32Array(indices);
    return new CANNON.Trimesh(new Float32Array(vertices), indexArray);
  }

  // Build a ConvexPolyhedron from a THREE.Object3D hierarchy (convex hull collider)
  createConvexHullShapeFromObject(object3d) {
    const points = [];
    const rootInv = new THREE.Matrix4().copy(object3d.matrixWorld).invert();
    const temp = new THREE.Matrix4();

    object3d.updateWorldMatrix(true, true);
    object3d.traverse((child) => {
      if (!child.isMesh || !child.geometry) return;
      const geom = child.geometry;
      const posAttr = geom.attributes && geom.attributes.position;
      if (!posAttr) return;

      temp.multiplyMatrices(rootInv, child.matrixWorld);
      for (let i = 0; i < posAttr.count; i++) {
        const v = new THREE.Vector3(
          posAttr.getX(i),
          posAttr.getY(i),
          posAttr.getZ(i)
        ).applyMatrix4(temp);
        v.multiply(object3d.scale);
        points.push(v);
      }
    });

    if (points.length === 0) {
      return new CANNON.Box(new CANNON.Vec3(0.01, 0.01, 0.01));
    }

    const hull = new ConvexHull().setFromPoints(points);

    // Collect unique vertices and faces from the hull
    const cannonVertices = [];
    const vertexIndexMap = new Map();
    const faces = [];

    for (const face of hull.faces) {
      const faceIndices = [];
      let edge = face.edge;
      do {
        const headPoint = edge.head().point;
        const key = headPoint.x + "," + headPoint.y + "," + headPoint.z;
        let idx = vertexIndexMap.get(key);
        if (idx === undefined) {
          idx = cannonVertices.length;
          vertexIndexMap.set(key, idx);
          cannonVertices.push(
            new CANNON.Vec3(headPoint.x, headPoint.y, headPoint.z)
          );
        }
        faceIndices.push(idx);
        edge = edge.next;
      } while (edge !== face.edge);
      if (faceIndices.length >= 3) faces.push(faceIndices);
    }

    if (cannonVertices.length < 4 || faces.length === 0) {
      // Not enough data to build a convex polyhedron
      return new CANNON.Box(new CANNON.Vec3(0.01, 0.01, 0.01));
    }

    return new CANNON.ConvexPolyhedron({ vertices: cannonVertices, faces });
  }

  addBodyForMesh(mesh, options = {}) {
    const {
      type = "dynamic",
      shape = "box",
      mass = 1,
      friction = 0.3,
      restitution = 0.1,
      linearDamping = 0.2,
      angularDamping = 0.4,
    } = options;

    // 1. モデルの現在の回転を一時的に保存
    const initialQuaternion = mesh.quaternion.clone();

    // 2. 回転をリセットして、モデル本来の形の当たり判定を計算
    mesh.quaternion.set(0, 0, 0, 1);
    mesh.updateWorldMatrix(true, true); // 行列を更新

    const box = new THREE.Box3().setFromObject(mesh);
    const size = box.getSize(new THREE.Vector3());
    const halfExtents = new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2);

    // 3. モデルの回転を元に戻す
    mesh.quaternion.copy(initialQuaternion);
    mesh.updateWorldMatrix(true, true);

    // 4. 'shape'オプションに応じて、正しい当たり判定の形状を作成
    // 注意: Cannon-ES は Box vs Trimesh の衝突が未実装。
    // → 静的(static)は Trimesh を使って高精度、動的(dynamic)は ConvexHull を使って安定な衝突を実現します。
    let cannonShape;
    let sphereRadius = 0;
    if (shape === "sphere") {
      sphereRadius = Math.max(size.x, size.y, size.z) / 2;
      cannonShape = new CANNON.Sphere(sphereRadius);
    } else if (
      shape === "mesh" ||
      shape === "trimesh" ||
      shape === "convex" ||
      shape === "hull"
    ) {
      if (type === "static") {
        cannonShape = this.createTrimeshShapeFromObject(mesh);
      } else {
        cannonShape = this.createConvexHullShapeFromObject(mesh);
      }
    } else {
      // default to 'box'
      const halfExtentsBox = new CANNON.Vec3(
        size.x / 2,
        size.y / 2,
        size.z / 2
      );
      cannonShape = new CANNON.Box(halfExtentsBox);
    }
    // ★★★★★ ここまで ★★★★★

    const material = this.createMaterial(friction, restitution);

    const body = new CANNON.Body({
      mass: type === "static" ? 0 : mass,
      material,
      shape: cannonShape,
    });

    // 4. 見た目の位置と、保存しておいた正しい回転を物理ボディに適用
    body.position.copy(mesh.position);
    body.quaternion.copy(mesh.quaternion); // ✅ 回転を直接コピー

    // 位置補正: Box/Sphere のみ底面が地面に乗るようにYを補正。Mesh/Trimesh/Convexは補正しない（形状が実寸で一致）。
    if (shape === "sphere") {
      body.position.y += sphereRadius;
    } else if (shape === "box") {
      body.position.y += halfExtents.y;
    }

    body.linearDamping = linearDamping;
    body.angularDamping = angularDamping;

    this.world.addBody(body);
    this.bodyToMesh.set(body, mesh);
    this.meshToBody.set(mesh, body);

    return body;
  }

  addCharacterBody(
    position = new THREE.Vector3(0, 1, 0),
    radius = 0.5,
    mass = 45
  ) {
    const shape = new CANNON.Sphere(radius);
    const material = this.createMaterial(0.4, 0.0);
    const body = new CANNON.Body({ mass, shape, material });
    body.position.set(position.x, position.y, position.z);
    body.linearDamping = 0.9;
    body.angularDamping = 1.0;
    this.world.addBody(body);
    return body;
  }

  getBodyForMesh(mesh) {
    return this.meshToBody.get(mesh);
  }

  getMeshForBody(body) {
    return this.bodyToMesh.get(body);
  }

  step(deltaTime, fixedTimeStep = 1 / 60) {
    this.world.step(fixedTimeStep, deltaTime);

    // Sync all meshes with their bodies
    this.bodyToMesh.forEach((mesh, body) => {
      mesh.position.set(body.position.x, body.position.y, body.position.z);
      // If the body is dynamic (mass > 0), sync its rotation
      if (body.mass > 0) {
        mesh.quaternion.set(
          body.quaternion.x,
          body.quaternion.y,
          body.quaternion.z,
          body.quaternion.w
        );
      }
    });
  }

  /**
   * Apply secondary detection hitbox repulsion for the character sphere.
   * @param {CANNON.Body} characterBody
   */
  applyCharacterRepulsion(characterBody) {
    if (
      !this.characterRepulsion ||
      !this.characterRepulsion.enabled ||
      !characterBody
    )
      return;
    const shape = characterBody.shapes[0];
    if (!(shape instanceof CANNON.Sphere)) return;

    const radius = shape.radius;
    const bubbleRadius =
      radius * (this.characterRepulsion.detectionScale || 1.2);

    // Only when moving slowly: compute horizontal speed
    const vx = characterBody.velocity.x,
      vz = characterBody.velocity.z;
    const horizontalSpeed = Math.hypot(vx, vz);
    if (horizontalSpeed > this.characterRepulsion.activationSpeed) return;

    const charPos = characterBody.position;
    const tmpA = this._tmpVec3A;
    const tmpB = this._tmpVec3B;

    // Check against all other bodies
    for (const body of this.world.bodies) {
      if (body === characterBody) continue;
      if (
        body.mass === 0 &&
        body.shapes.length &&
        body.shapes[0] instanceof CANNON.Plane
      )
        continue;

      // Skip bodies that have character repulsion disabled (e.g., A4 gallery boards)
      if (body.userData && body.userData.disableCharacterRepulsion) continue;

      // Skip currently grabbed object to prevent repulsion while carrying
      if (this.grabSystem.isGrabbing && body === this.grabSystem.grabbedBody)
        continue;

      // Approximate body position by its world center of mass
      const otherPos = body.position;

      // Vector from other to character
      tmpA.set(
        charPos.x - otherPos.x,
        charPos.y - otherPos.y,
        charPos.z - otherPos.z
      );
      let dist = tmpA.length();
      if (dist === 0) dist = 0.0001;

      // Estimate other body's "radius" for detection.
      // Use its bounding radius if available, else a minimal value.
      const otherRadius = body.boundingRadius || 0.5;
      const detectionDistance = bubbleRadius + otherRadius;

      // If inside detection bubble, push out proportionally to penetration
      const penetration = detectionDistance - dist;
      if (penetration > 0) {
        // Normalized push direction
        tmpA.scale(1 / dist, tmpA);
        if (this.characterRepulsion.horizontalOnly) {
          // remove vertical component
          tmpA.y = 0;
          const lenXZ = Math.hypot(tmpA.x, tmpA.z) || 1e-4;
          tmpA.x /= lenXZ;
          tmpA.z /= lenXZ;
        }
        // Push magnitude proportionate to penetration
        const pushMag = Math.min(
          this.characterRepulsion.strength * penetration,
          this.characterRepulsion.maxPushPerStep
        );
        tmpB.set(tmpA.x * pushMag, tmpA.y * pushMag, tmpA.z * pushMag);

        // Apply as a small velocity adjustment (gentle nudge)
        characterBody.velocity.x += tmpB.x;
        characterBody.velocity.y += tmpB.y;
        characterBody.velocity.z += tmpB.z;
      }
    }
  }

  /**
   * Set the character body reference for grab system collision filtering
   * @param {CANNON.Body} characterBody
   */
  setCharacterBody(characterBody) {
    this.grabSystem.characterBody = characterBody;
  }

  /**
   * Try to grab the nearest object in front of the character
   * @param {CANNON.Body} characterBody - The character's physics body
   * @param {THREE.Vector3} characterDirection - Direction the character is facing
   * @returns {boolean} - True if an object was grabbed or released
   */
  tryGrab(characterBody, characterDirection = new THREE.Vector3(0, 0, -1)) {
    if (this.grabSystem.isGrabbing) {
      // Release with throw in the facing direction
      this.releaseGrab(characterDirection);
      return true;
    }

    const charPos = characterBody.position;
    const grabDistance = this.grabSystem.maxGrabDistance;

    // Find the closest grabbable body in front of the character
    let closestBody = null;
    let closestDistance = Infinity;

    for (const body of this.world.bodies) {
      // Skip character, static bodies, ground plane, and A4 boards
      if (body === characterBody || body.mass === 0) continue;
      if (body.userData && body.userData.disableCharacterRepulsion) continue;

      // Only allow grabbing objects under 3kg
      if (body.mass >= 3) continue;

      // Check if body is within grab range
      const toBody = new CANNON.Vec3();
      body.position.vsub(charPos, toBody);
      const distance = toBody.length();

      if (distance > grabDistance) continue;

      // Check if roughly in front direction (dot product > 0.2 for ~80 degree cone)
      toBody.normalize();
      const dot = toBody.dot(
        new CANNON.Vec3(
          characterDirection.x,
          characterDirection.y,
          characterDirection.z
        )
      );

      if (dot > 0.2 && distance < closestDistance) {
        closestDistance = distance;
        closestBody = body;
      }
    }

    if (closestBody) {
      this.grabObject(characterBody, closestBody);
      return true;
    }

    return false;
  }

  /**
   * Grab a specific object
   * @param {CANNON.Body} characterBody
   * @param {CANNON.Body} targetBody
   */
  grabObject(characterBody, targetBody) {
    if (this.grabSystem.isGrabbing) {
      this.releaseGrab();
    }

    // Calculate grab position (in front of and above character)
    const grabOffset = new CANNON.Vec3(
      0,
      this.grabSystem.grabHeight,
      -this.grabSystem.grabDistance
    );

    // Create a point-to-point constraint to hold the object
    const constraint = new CANNON.PointToPointConstraint(
      characterBody,
      grabOffset,
      targetBody,
      new CANNON.Vec3(0, 0, 0)
    );

    // Configure constraint properties
    constraint.collideConnected = false; // Don't collide grabbed object with character

    // Increase character mass temporarily to prevent sinking when carrying heavy objects
    const originalCharacterMass = characterBody.mass;
    characterBody.mass = Math.max(originalCharacterMass, targetBody.mass * 1.5);

    this.world.addConstraint(constraint);

    // Store grab state
    this.grabSystem.isGrabbing = true;
    this.grabSystem.grabbedBody = targetBody;
    this.grabSystem.grabConstraint = constraint;
    this.grabSystem.originalCharacterMass = originalCharacterMass;

    // Adjust grabbed object's physics properties for better carrying
    targetBody.linearDamping = 0.95; // More damping for stability
    targetBody.angularDamping = 0.95;

    // Prevent the grabbed object from sleeping while held
    // This ensures it continues to follow the character even when stationary
    targetBody.allowSleep = false;
    targetBody.wakeUp(); // Wake up the body if it was already sleeping

    // Add visual feedback - subtle glow
    const mesh = this.getMeshForBody(targetBody);
    if (mesh) {
      mesh.userData.originalEmissive =
        mesh.material?.emissive?.clone() || new THREE.Color(0x000000);
      if (mesh.material && mesh.material.emissive) {
        mesh.material.emissive.setHex(0x004400); // Subtle green glow
      }
    }

    console.log("Grabbed object:", mesh?.name || "unnamed object");
  }

  /**
   * Release the currently grabbed object with throw mechanics
   * @param {THREE.Vector3} throwDirection - Direction to throw the object (optional)
   */
  releaseGrab(throwDirection = null) {
    if (!this.grabSystem.isGrabbing) return;

    const grabbedBody = this.grabSystem.grabbedBody;
    const characterBody = this.grabSystem.characterBody;

    // Remove constraint
    if (this.grabSystem.grabConstraint) {
      this.world.removeConstraint(this.grabSystem.grabConstraint);
    }

    // Restore character's original mass
    if (characterBody && this.grabSystem.originalCharacterMass) {
      characterBody.mass = this.grabSystem.originalCharacterMass;
    }

    // Apply throw impulse if direction is provided
    if (grabbedBody && throwDirection) {
      const throwForce = 20.0; // Horizontal throw force
      const upwardForce = 8.0; // Slight upward arc
      // Apply throw velocity
      grabbedBody.velocity.x += throwDirection.x * throwForce;
      grabbedBody.velocity.y += upwardForce;
      grabbedBody.velocity.z += throwDirection.z * throwForce;

      // Add slight angular velocity for realistic tumbling
      grabbedBody.angularVelocity.x += (Math.random() - 0.5) * 2;
      grabbedBody.angularVelocity.y += (Math.random() - 0.5) * 2;
      grabbedBody.angularVelocity.z += (Math.random() - 0.5) * 2;
    }

    // Restore original physics properties
    if (grabbedBody) {
      grabbedBody.linearDamping = 0.2;
      grabbedBody.angularDamping = 0.4;

      // Re-enable sleeping for the released object
      grabbedBody.allowSleep = true;

      // Restore original visual state
      const mesh = this.getMeshForBody(grabbedBody);
      if (
        mesh &&
        mesh.userData.originalEmissive &&
        mesh.material &&
        mesh.material.emissive
      ) {
        mesh.material.emissive.copy(mesh.userData.originalEmissive);
        delete mesh.userData.originalEmissive;
      }
    }

    console.log(
      "Released object:",
      this.getMeshForBody(grabbedBody)?.name || "unnamed object"
    );

    // Clear grab state
    this.grabSystem.isGrabbing = false;
    this.grabSystem.grabbedBody = null;
    this.grabSystem.grabConstraint = null;
    this.grabSystem.originalCharacterMass = null;
  }

  /**
   * Update grab system - call this each frame
   * @param {CANNON.Body} characterBody
   */
  updateGrabSystem(characterBody) {
    // Ensure character stays above ground level (prevent sinking)
    const minCharacterHeight = 0.9; // Character sphere radius + small buffer
    if (characterBody.position.y < minCharacterHeight) {
      characterBody.position.y = minCharacterHeight;
      // Dampen downward velocity to prevent bouncing
      if (characterBody.velocity.y < 0) {
        characterBody.velocity.y *= 0.1;
      }
    }

    if (!this.grabSystem.isGrabbing || !this.grabSystem.grabbedBody) return;

    // Keep both character and grabbed object awake to ensure smooth following
    // This prevents physics bodies from sleeping when stationary
    characterBody.wakeUp();
    this.grabSystem.grabbedBody.wakeUp();

    // Check if grabbed object is too far away (safety check)
    const charPos = characterBody.position;
    const objPos = this.grabSystem.grabbedBody.position;
    const distance = charPos.distanceTo(objPos);

    if (distance > this.grabSystem.maxGrabDistance * 2) {
      console.log("Object too far, releasing grab");
      this.releaseGrab();
    }
  }

  /**
   * Check if currently grabbing an object
   * @returns {boolean}
   */
  isGrabbing() {
    return this.grabSystem.isGrabbing;
  }

  /**
   * Get the currently grabbed body
   * @returns {CANNON.Body|null}
   */
  getGrabbedBody() {
    return this.grabSystem.grabbedBody;
  }
}
