import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { ConvexHull } from 'three/examples/jsm/math/ConvexHull.js'

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

        // Build a Cannon.Trimesh from a THREE.Object3D hierarchy (accurate collider)
        createTrimeshShapeFromObject(object3d) {
            const vertices = []
            const indices = []
            const rootInv = new THREE.Matrix4().copy(object3d.matrixWorld).invert()
            const temp = new THREE.Matrix4()
            let vertexOffset = 0

            object3d.updateWorldMatrix(true, true)
            object3d.traverse((child) => {
                if (!child.isMesh || !child.geometry) return
                const geom = child.geometry
                const posAttr = geom.attributes && geom.attributes.position
                if (!posAttr) return

                // Compute transform from child local into root local
                temp.multiplyMatrices(rootInv, child.matrixWorld)

                // Push transformed vertices (respect root scale)
                for (let i = 0; i < posAttr.count; i++) {
                    const v = new THREE.Vector3(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i)).applyMatrix4(temp)
                    v.multiply(object3d.scale)
                    vertices.push(v.x, v.y, v.z)
                }

                // Use indices if available, otherwise assume non-indexed triangles
                if (geom.index) {
                    const idx = geom.index.array
                    for (let i = 0; i < idx.length; i++) {
                        indices.push(idx[i] + vertexOffset)
                    }
                } else {
                    for (let i = 0; i < posAttr.count; i++) {
                        indices.push(vertexOffset + i)
                    }
                }
                vertexOffset += posAttr.count
            })

            if (vertices.length === 0 || indices.length === 0) {
                // Fallback tiny box if no geometry
                return new CANNON.Box(new CANNON.Vec3(0.01, 0.01, 0.01))
            }

            const indexArray = (vertices.length / 3) < 65535 ? new Uint16Array(indices) : new Uint32Array(indices)
            return new CANNON.Trimesh(new Float32Array(vertices), indexArray)
        }

        // Build a ConvexPolyhedron from a THREE.Object3D hierarchy (convex hull collider)
        createConvexHullShapeFromObject(object3d) {
            const points = []
            const rootInv = new THREE.Matrix4().copy(object3d.matrixWorld).invert()
            const temp = new THREE.Matrix4()

            object3d.updateWorldMatrix(true, true)
            object3d.traverse((child) => {
                if (!child.isMesh || !child.geometry) return
                const geom = child.geometry
                const posAttr = geom.attributes && geom.attributes.position
                if (!posAttr) return

                temp.multiplyMatrices(rootInv, child.matrixWorld)
                for (let i = 0; i < posAttr.count; i++) {
                    const v = new THREE.Vector3(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i)).applyMatrix4(temp)
                    v.multiply(object3d.scale)
                    points.push(v)
                }
            })

            if (points.length === 0) {
                return new CANNON.Box(new CANNON.Vec3(0.01, 0.01, 0.01))
            }

            const hull = new ConvexHull().setFromPoints(points)

            // Collect unique vertices and faces from the hull
            const cannonVertices = []
            const vertexIndexMap = new Map()
            const faces = []

            for (const face of hull.faces) {
                const faceIndices = []
                let edge = face.edge
                do {
                    const headPoint = edge.head().point
                    const key = headPoint.x + ',' + headPoint.y + ',' + headPoint.z
                    let idx = vertexIndexMap.get(key)
                    if (idx === undefined) {
                        idx = cannonVertices.length
                        vertexIndexMap.set(key, idx)
                        cannonVertices.push(new CANNON.Vec3(headPoint.x, headPoint.y, headPoint.z))
                    }
                    faceIndices.push(idx)
                    edge = edge.next
                } while (edge !== face.edge)
                if (faceIndices.length >= 3) faces.push(faceIndices)
            }

            if (cannonVertices.length < 4 || faces.length === 0) {
                // Not enough data to build a convex polyhedron
                return new CANNON.Box(new CANNON.Vec3(0.01, 0.01, 0.01))
            }

            return new CANNON.ConvexPolyhedron({ vertices: cannonVertices, faces })
        }


    // src/physics/PhysicsManager.js

    addBodyForMesh(mesh, options = {}) {
        const {
            type = 'dynamic',
            shape = 'box',
            mass = 1,
            friction = 0.3,
            restitution = 0.1,
            linearDamping = 0.2,
            angularDamping = 0.4
        } = options

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
        if (shape === 'sphere') {
            sphereRadius = Math.max(size.x, size.y, size.z) / 2;
            cannonShape = new CANNON.Sphere(sphereRadius);
        } else if (shape === 'mesh' || shape === 'trimesh' || shape === 'convex' || shape === 'hull') {
            if (type === 'static') {
                cannonShape = this.createTrimeshShapeFromObject(mesh)
            } else {
                cannonShape = this.createConvexHullShapeFromObject(mesh)
            }
        } else { // default to 'box'
            const halfExtentsBox = new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2);
            cannonShape = new CANNON.Box(halfExtentsBox);
        }
        // ★★★★★ ここまで ★★★★★

        const material = this.createMaterial(friction, restitution);

        const body = new CANNON.Body({
            mass: type === 'static' ? 0 : mass,
            material,
            shape: cannonShape
        });

        // 4. 見た目の位置と、保存しておいた正しい回転を物理ボディに適用
        body.position.copy(mesh.position);
        body.quaternion.copy(mesh.quaternion); // ✅ 回転を直接コピー

        // 位置補正: Box/Sphere のみ底面が地面に乗るようにYを補正。Mesh/Trimesh/Convexは補正しない（形状が実寸で一致）。
        if (shape === 'sphere') {
            body.position.y += sphereRadius;
        } else if (shape === 'box') {
            body.position.y += halfExtents.y;
        }

        body.linearDamping = linearDamping;
        body.angularDamping = angularDamping;

        this.world.addBody(body);
        this.bodyToMesh.set(body, mesh);
        this.meshToBody.set(mesh, body);

        return body;
    }

    addCharacterBody(position = new THREE.Vector3(0, 1, 0), radius = 0.5, mass = 45) {
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

