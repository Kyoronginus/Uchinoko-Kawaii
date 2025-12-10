import * as THREE from "three";

export const cameraAngleZones = [
  // look above for standee
  {
    // zone range
    box: new THREE.Box3(
      new THREE.Vector3(-1, -Infinity, -9),
      new THREE.Vector3(1, Infinity, -7)
    ),
    // this zone entered when the new camera angle
    angle: {
      // for gallery
      followDistance: new THREE.Vector3(0, 3, 8),
      lookAtOffset: new THREE.Vector3(0, 3, 0),
    },
  },
  // Gallery
  {
    // zone range
    box: new THREE.Box3(
      new THREE.Vector3(8, -Infinity, -30), // min
      new THREE.Vector3(68, Infinity, -10)
    ),
    // this zone entered when the new camera angle
    angle: {
      // for gallery
      followDistance: new THREE.Vector3(0, 3, 8),
      lookAtOffset: new THREE.Vector3(0, 3, 0),
    },
  },
  // Creator
  {
    // zone range
    box: new THREE.Box3(
      new THREE.Vector3(-28, -Infinity, -40),
      new THREE.Vector3(-3, Infinity, 5)
    ),
    // this zone entered when the new camera angle
    angle: {
      // for gallery
      followDistance: new THREE.Vector3(0, 13, 8),
      lookAtOffset: new THREE.Vector3(0, 3, 0),
    },
  },
  // Playground
  {
    // zone range
    box: new THREE.Box3(
      new THREE.Vector3(18, -Infinity, 0),
      new THREE.Vector3(40, Infinity, 20)
    ),
    // this zone entered when the new camera angle
    angle: {
      // for gallery
      followDistance: new THREE.Vector3(0, 2, 8),
      lookAtOffset: new THREE.Vector3(0, 1, 0),
    },
  },
];
