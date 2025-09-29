import * as THREE from 'three'

/**
 * ScaleZoneManager
 * - Axis-aligned box zones in world space that apply gradual scale changes to meshes inside them
 * - Supports "grow" (towards targetScale) and "reset" (towards original per-mesh scale)
 * - Optionally updates physics colliders via PhysicsManager.rebuildShapeForMesh
 * - Can target a specific mesh, or all physics-enabled meshes if no explicit target provided
 * - Can render visible helpers for zones
 */
export class ScaleZoneManager {
  /**
   * @param {Object} params
   * @param {Array} params.zones Array of zone definitions
   *   Zone = {
   *     name: string,
   *     center: THREE.Vector3,
   *     size: THREE.Vector3, // full extents (width,height,depth)
   *     target?: THREE.Object3D, // specific mesh/group to scale; if omitted, applies to all physics meshes
   *     mode: 'grow'|'reset', // grow = scale towards targetScale, reset = scale towards originalScale
   *     targetScale?: THREE.Vector3, // required for mode 'grow'
   *     speed?: number, // scale change per second (default 1.0)
   *     affectPhysics?: boolean // default true
   *   }
   * @param {import('../physics/PhysicsManager').PhysicsManager} physicsManager
   */
  constructor({ zones = [] } = {}, physicsManager = null) {
    this.physics = physicsManager
    this.zones = zones.map(z => ({
      ...z,
      speed: typeof z.speed === 'number' ? z.speed : 1.0,
      affectPhysics: z.affectPhysics !== false,
      _debugHelper: null,
    }))

    // Track original scales per mesh so reset is per-object
    this._originalScaleMap = new WeakMap()

    this._tmp = {
      min: new THREE.Vector3(),
      max: new THREE.Vector3(),
      pos: new THREE.Vector3(),
    }
  }

  /**
   * Axis-aligned AABB contains test in world space
   */
  isInsideAABB(point, center, size) {
    const half = this._tmp.half || (this._tmp.half = new THREE.Vector3())
    half.copy(size).multiplyScalar(0.5)
    const min = this._tmp.min.copy(center).sub(half)
    const max = this._tmp.max.copy(center).add(half)
    return (
      point.x >= min.x && point.x <= max.x &&
      point.y >= min.y && point.y <= max.y &&
      point.z >= min.z && point.z <= max.z
    )
  }

  /**
   * Iterate target meshes for a zone
   */
  *getTargetsForZone(z) {
    if (z.target) return [z.target]
    if (this.physics && this.physics.bodyToMesh) {
      return Array.from(this.physics.bodyToMesh.values())
    }
    return []
  }

  /**
   * Update zones each frame
   * Can be called as update(dt) or update(_actorPos, dt) for back-compat
   */
  update(arg1, arg2) {
    const dt = typeof arg1 === 'number' ? arg1 : (typeof arg2 === 'number' ? arg2 : 0)
    if (dt <= 0) return

    for (const z of this.zones) {
      const targets = this.getTargetsForZone(z)
      if (!targets.length) continue

      for (const target of targets) {
        // Compute world position of target (object origin)
        const p = target.getWorldPosition(this._tmp.pos)
        if (!this.isInsideAABB(p, z.center, z.size)) continue

        // Establish original scale for this specific target if not set
        if (!this._originalScaleMap.has(target)) {
          this._originalScaleMap.set(target, target.scale.clone())
        }
        const originalScale = this._originalScaleMap.get(target)

        const from = target.scale
        const to = (z.mode === 'grow') ? (z.targetScale || from) : originalScale

        // Smoothly move from -> to
        const step = 1 - Math.exp(-z.speed * dt)
        const nx = THREE.MathUtils.lerp(from.x, to.x, step)
        const ny = THREE.MathUtils.lerp(from.y, to.y, step)
        const nz = THREE.MathUtils.lerp(from.z, to.z, step)

        // Only apply and rebuild if changed notably
        if (Math.abs(nx - from.x) > 1e-4 || Math.abs(ny - from.y) > 1e-4 || Math.abs(nz - from.z) > 1e-4) {
          target.scale.set(nx, ny, nz)
          target.updateMatrixWorld(true)
          if (this.physics && z.affectPhysics) {
            this.physics.rebuildShapeForMesh(target)
          }
        }
      }
    }
  }

  /**
   * Add visible debug helpers for zones
   */
  addDebugHelpers(scene, visible = true) {
    if (!scene) return
    for (const z of this.zones) {
      const geom = new THREE.BoxGeometry(z.size.x, z.size.y, z.size.z)
      const mat = new THREE.MeshBasicMaterial({
        color: z.mode === 'grow' ? 0x00ff00 : 0xff0000,
        wireframe: true,
        transparent: true,
        opacity: 0.5
      })
      const helper = new THREE.Mesh(geom, mat)
      helper.position.copy(z.center)
      helper.visible = visible
      scene.add(helper)
      z._debugHelper = helper
    }
  }

  setDebugHelpersVisible(visible) {
    for (const z of this.zones) {
      if (z._debugHelper) z._debugHelper.visible = visible
    }
  }
}

