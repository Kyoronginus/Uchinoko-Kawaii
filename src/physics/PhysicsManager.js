import * as THREE from 'three'
import * as CANNON from 'cannon-es'

export class PhysicsManager {
    constructor() {
        this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) })
        this.world.broadphase = new CANNON.SAPBroadphase(this.world)
        this.world.allowSleep = true

        // Default material/contact
        this.defaultMaterial = new CANNON.Material('default')
        const contact = new CANNON.ContactMaterial(this.defaultMaterial, this.defaultMaterial, {
            friction: 0.3,
            restitution: 0.1
        })
        this.world.addContactMaterial(contact)

        // Maps for syncing
        this.bodyToMesh = new Map()
        this.meshToBody = new Map()

        // Ground plane (optional). Comment out if you have a floor collider from GLB.
        const groundBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane(), material: this.defaultMaterial })
        // Rotate plane so it's horizontal (Cannon planes face along +Z by default)
        groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
        this.world.addBody(groundBody)
    }

    createMaterial(friction = 0.3, restitution = 0.1) {
        const mat = new CANNON.Material('mat_' + Math.random().toString(36).slice(2))
        // Material vs default
        const cd = new CANNON.ContactMaterial(mat, this.defaultMaterial, { friction, restitution })
        this.world.addContactMaterial(cd)
        // Material vs same material
        const cs = new CANNON.ContactMaterial(mat, mat, { friction, restitution })
        this.world.addContactMaterial(cs)
        return mat
    }

    createBoxShapeFromObject(object3d) {
        const box = new THREE.Box3().setFromObject(object3d)
        const size = box.getSize(new THREE.Vector3())
        const halfExtents = new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2)
        const shape = new CANNON.Box(halfExtents)
        const center = box.getCenter(new THREE.Vector3())
        return { shape, center }
    }

    createSphereShapeFromObject(object3d) {
        const box = new THREE.Box3().setFromObject(object3d)
        const size = box.getSize(new THREE.Vector3())
        const radius = Math.max(size.x, size.y, size.z) / 2
        const shape = new CANNON.Sphere(radius)
        const center = box.getCenter(new THREE.Vector3())
        return { shape, center }
    }

    addBodyForMesh(mesh, options = {}) {
        const {
            type = 'dynamic', // 'static' | 'dynamic'
            shape = 'box',    // 'box' | 'sphere'
            mass = 3,
            friction = 0.3,
            restitution = 0.1,
            linearDamping = 0.2,
            angularDamping = 0.4
        } = options
        const builder = shape === 'sphere' ? this.createSphereShapeFromObject(mesh) : this.createBoxShapeFromObject(mesh)
        const { shape: cannonShape, center } = builder

        const material = this.createMaterial(friction, restitution)

        const body = new CANNON.Body({
            mass: type === 'static' ? 0 : mass,
            material,
            shape: cannonShape
        })

        // ★★★★★ ここからが最重要 ★★★★★
        // 物理ボディの中心位置を、見た目の中心位置から、高さの半分だけ下にずらす
        if (shape === 'box') {
            const halfHeight = cannonShape.halfExtents.y;
            body.position.set(center.x, center.y - halfHeight, center.z);
        } else { // 'sphere'の場合は中心が基点でOK
            body.position.set(center.x, center.y, center.z)
        }
        // ★★★★★ ここまで ★★★★★

        body.linearDamping = linearDamping
        body.angularDamping = angularDamping

        // Add to world and maps
        this.world.addBody(body)
        this.bodyToMesh.set(body, mesh)
        this.meshToBody.set(mesh, body)

        return body
    }

    addCharacterBody(position = new THREE.Vector3(0, 1, 0), radius = 0.5, mass = 1) {
        const shape = new CANNON.Sphere(radius)
        const material = this.createMaterial(0.4, 0.0)
        const body = new CANNON.Body({ mass, shape, material })
        body.position.set(position.x, position.y, position.z)
        body.linearDamping = 0.9
        body.angularDamping = 1.0
        this.world.addBody(body)
        return body
    }

    getBodyForMesh(mesh) {
        return this.meshToBody.get(mesh)
    }

    getMeshForBody(body) {
        return this.bodyToMesh.get(body)
    }

    step(deltaTime, fixedTimeStep = 1 / 60) {
        this.world.step(fixedTimeStep, deltaTime)

        // Sync all meshes with their bodies
        this.bodyToMesh.forEach((mesh, body) => {

            mesh.position.set(body.position.x, body.position.y, body.position.z)

            // ✅ If the body is dynamic (mass > 0), sync its rotation
            if (body.mass > 0) {
                mesh.quaternion.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w)
            }
        })
    }
}

