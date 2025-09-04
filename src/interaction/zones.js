import * as THREE from 'three';

export const projectZones = [
    {
        id: 'projectA',
        name: 'カラーアナライザー',
        description: '画像から主要な色を抽出し、カラーパレットを生成するWebツールです。ReactとCanvas APIを使用して開発しました。',
        url: 'https://example.com/project_a',
        thumbnail: '/project_ss/project_a_thumb.png',
        position: new THREE.Vector3(10, 0.05, 5), // 四角の中心位置
        zoneWidth: 4,  // 判定エリアの幅
        zoneDepth: 4   // 判定エリアの奥行き
    },
    {
        id: 'projectB',
        name: 'プロジェクトB',
        description: 'これはプロジェクトBの説明文です。',
        url: 'https://example.com/project_b',
        thumbnail: '/project_ss/project_b_thumb.png',
        position: new THREE.Vector3(-10, 0.05, 5),
        zoneWidth: 4,
        zoneDepth: 4
    }
];