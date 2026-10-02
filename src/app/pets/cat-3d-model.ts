import * as THREE from 'three';
import { COAT_COLORS, dirtOpacity } from './pet-appearance';
import { PET_REACTIONS } from './pet-reaction';
import { PetVisualState } from './pet-visual-state';

/** Procedural prototype. A future GLB rig can implement this same visual interface. */
export interface CatVisual {
  root: THREE.Group;
  update(state: PetVisualState, seconds: number): void;
  dispose(): void;
}

export function createCatVisual(): CatVisual {
  const root = new THREE.Group();
  const rig = new THREE.Group();
  root.add(rig);
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  function geometry<T extends THREE.BufferGeometry>(value: T): T {
    geometries.add(value);
    return value;
  }
  function material(color: string): THREE.MeshStandardMaterial {
    const result = new THREE.MeshStandardMaterial({ color, roughness: 0.86 });
    materials.add(result);
    return result;
  }
  const coat = material('#dcad79');
  const accent = material('#bc8556');
  const cream = material('#fff0ce');
  const pink = material('#dc9690');
  const ink = material('#49372e');
  const pupil = material('#201e21');
  const white = material('#ffffff');
  const dirt = material('#6b5446');
  dirt.transparent = true;
  dirt.depthWrite = false;
  dirt.polygonOffset = true;
  dirt.polygonOffsetFactor = -1;
  dirt.polygonOffsetUnits = -1;
  const bubbleMaterial = material('#caeaf4');
  bubbleMaterial.transparent = true;
  bubbleMaterial.opacity = 0.55;
  const sphere = geometry(new THREE.SphereGeometry(1, 28, 20));
  function ball(parent: THREE.Object3D, mat: THREE.Material, position: number[], scale: number[]): THREE.Mesh {
    const mesh = new THREE.Mesh(sphere, mat);
    mesh.position.set(position[0]!, position[1]!, position[2]!);
    mesh.scale.set(scale[0]!, scale[1]!, scale[2]!);
    parent.add(mesh);
    return mesh;
  }
  function tube(parent: THREE.Object3D, points: number[][], radius: number, mat: THREE.Material): THREE.Mesh {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
    const mesh = new THREE.Mesh(geometry(new THREE.TubeGeometry(curve, 24, radius, 8, false)), mat);
    parent.add(mesh);
    return mesh;
  }
  const torso = ball(rig, coat, [0, 0.78, -0.28], [0.6, 0.67, 0.7]);
  ball(torso, cream, [0, -0.02, 0.88], [0.6, 0.7, 0.16]);
  const haunches = [-1, 1].map((side) => ball(rig, coat, [side * 0.43, 0.43, -0.57], [0.34, 0.43, 0.41]));
  const legs = [-1, 1].flatMap((side) =>
    [true, false].map((front) => {
      const joint = new THREE.Group();
      joint.position.set(side * (front ? 0.4 : 0.46), 0.48, front ? 0.36 : -0.61);
      rig.add(joint);
      ball(joint, coat, [0, -0.15, 0], [0.19, 0.32, 0.19]);
      ball(joint, coat, [0, -0.33, 0.12], [0.25, 0.15, 0.32]);
      for (const toe of [-0.08, 0.08]) {
        tube(
          joint,
          [
            [toe, -0.38, 0.39],
            [toe, -0.32, 0.42],
            [toe, -0.27, 0.39]
          ],
          0.008,
          accent
        );
      }
      return { joint, front, side };
    })
  );
  const head = new THREE.Group();
  rig.add(head);
  const skull = ball(head, coat, [0, 0, 0], [0.77, 0.61, 0.56]);
  // Rounded triangular ears, with actual depth, remain readable in profile.
  const earShape = new THREE.Shape();
  earShape.moveTo(-0.23, -0.17);
  earShape.quadraticCurveTo(-0.22, 0.02, -0.13, 0.48);
  earShape.quadraticCurveTo(-0.1, 0.57, -0.03, 0.49);
  earShape.lineTo(0.26, -0.08);
  earShape.quadraticCurveTo(0.08, -0.22, -0.23, -0.17);
  const earGeometry = geometry(
    new THREE.ExtrudeGeometry(earShape, {
      depth: 0.12,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.055,
      bevelThickness: 0.07,
      curveSegments: 10
    })
  );
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(earGeometry, coat);
    ear.position.set(side * 0.49, 0.4, -0.06);
    ear.scale.set(-side, 0.7, 1);
    head.add(ear);
    const inner = new THREE.Mesh(earGeometry, pink);
    inner.position.set(-0.01, 0.04, 0.16);
    inner.scale.set(0.6, 0.65, 0.18);
    ear.add(inner);
  }
  ball(head, cream, [-0.17, -0.23, 0.48], [0.25, 0.18, 0.17]);
  ball(head, cream, [0.17, -0.23, 0.48], [0.25, 0.18, 0.17]);
  const noseShape = new THREE.Shape();
  noseShape.moveTo(-0.09, 0.04);
  noseShape.quadraticCurveTo(0, 0.09, 0.09, 0.04);
  noseShape.quadraticCurveTo(0.08, 0, 0, -0.065);
  noseShape.closePath();
  const nose = new THREE.Mesh(
    geometry(
      new THREE.ExtrudeGeometry(noseShape, {
        depth: 0.025,
        bevelEnabled: true,
        bevelSize: 0.018,
        bevelThickness: 0.015,
        bevelSegments: 2,
        steps: 1
      })
    ),
    pink
  );
  nose.position.set(0, -0.16, 0.66);
  head.add(nose);
  tube(
    head,
    [
      [0, -0.23, 0.662],
      [0, -0.3, 0.656]
    ],
    0.014,
    ink
  );
  for (const side of [-1, 1]) {
    tube(
      head,
      [
        [0, -0.3, 0.65],
        [side * 0.08, -0.33, 0.637],
        [side * 0.17, -0.29, 0.615]
      ],
      0.013,
      ink
    );
    for (let i = 0; i < 2; i++)
      tube(
        head,
        [
          [side * 0.3, -0.22 - i * 0.09, 0.55],
          [side * 0.58, -0.18 - i * 0.13, 0.57],
          [side * 0.84, -0.14 - i * 0.17, 0.49]
        ],
        0.007,
        ink
      );
  }
  const eyes = [-1, 1].map((side) => {
    const group = new THREE.Group();
    group.position.set(side * 0.3, 0.065, 0.47);
    group.rotation.y = side * 0.18;
    head.add(group);
    ball(group, cream, [0, 0, 0], [0.225, 0.175, 0.09]);
    const iris = ball(group, pupil, [0, -0.015, 0.078], [0.112, 0.14, 0.032]);
    ball(iris, white, [-0.32, 0.43, 0.85], [0.28, 0.23, 0.22]);
    const closed = tube(
      group,
      [
        [-0.18, 0, 0.1],
        [0, -0.035, 0.115],
        [0.18, 0, 0.1]
      ],
      0.018,
      ink
    );
    closed.visible = false;
    const brow = tube(
      head,
      [
        [side * 0.13, 0.28, 0.52],
        [side * 0.3, 0.31, 0.52],
        [side * 0.46, 0.28, 0.46]
      ],
      0.025,
      accent
    );
    return { group, iris, closed, brow, side };
  });
  const tail = new THREE.Group();
  tail.position.set(0.08, 0.63, -0.86);
  rig.add(tail);
  const tailPoints = [
    [0, 0, 0],
    [0.05, 0.4, -0.08],
    [0.14, 0.9, -0.07],
    [0.09, 1.22, 0.02],
    [-0.17, 1.33, 0.12],
    [-0.48, 1.28, 0.17]
  ];
  tube(tail, tailPoints, 0.115, coat);
  ball(tail, coat, tailPoints[tailPoints.length - 1]!, [0.115, 0.115, 0.115]);

  const dirtMarks: THREE.Mesh[] = [];
  // Surface marks follow their ellipsoid, including its scale and pose.
  function mark(surface: THREE.Mesh, phi: number, theta: number, size: number[], mat: THREE.Material): THREE.Mesh {
    const normal = new THREE.Vector3(Math.sin(theta) * Math.sin(phi), Math.cos(theta), Math.sin(theta) * Math.cos(phi));
    const rotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    const shape = geometry(new THREE.CircleGeometry(1, 24));
    const vertices = shape.getAttribute('position');
    const point = new THREE.Vector3();
    for (let i = 0; i < vertices.count; i++) {
      point
        .set(vertices.getX(i) * size[0]!, vertices.getY(i) * size[1]!, 1)
        .normalize()
        .multiplyScalar(1.006)
        .applyQuaternion(rotation);
      vertices.setXYZ(i, point.x, point.y, point.z);
    }
    shape.computeVertexNormals();
    const patch = new THREE.Mesh(shape, mat);
    surface.add(patch);
    return patch;
  }
  const patterned: { mesh: THREE.Mesh; pattern: 'spots' | 'stripes' }[] = [];
  for (const surface of [skull, torso]) {
    for (let i = 0; i < 9; i++) {
      // Keep the central face free so markings do not obscure the eyes.
      const phi = 0.85 + i * 0.59;
      patterned.push({
        mesh: mark(surface, phi, 0.85 + (i % 3) * 0.65, [0.13, 0.11, 0.045], accent),
        pattern: 'spots'
      });
      if (i < 6)
        patterned.push({ mesh: mark(surface, 0.8 + i * 0.91, 1.2, [0.075, 0.33, 0.04], accent), pattern: 'stripes' });
    }
    for (let i = 0; i < 7; i++) dirtMarks.push(mark(surface, i * 0.95, 1 + (i % 3) * 0.46, [0.12, 0.09, 0.05], dirt));
  }
  // Small forehead stripes and tail bands are part of the selected coat pattern.
  for (const x of [-0.2, 0, 0.2]) {
    const mesh = mark(skull, x, 0.54, [0.045, 0.17, 0.04], accent);
    patterned.push({ mesh, pattern: 'stripes' });
  }
  const tailCurve = new THREE.CatmullRomCurve3(
    tailPoints.map((p) => new THREE.Vector3(...(p as [number, number, number])))
  );
  for (let i = 1; i < 6; i++) {
    const points = [0, 1, 2].map((j) => tailCurve.getPoint(i / 7 + j * 0.013).toArray());
    patterned.push({ mesh: tube(tail, points, 0.119, accent), pattern: 'stripes' });
  }
  const bubbles = new THREE.Group();
  rig.add(bubbles);
  for (let i = 0; i < 5; i++)
    ball(
      bubbles,
      bubbleMaterial,
      [Math.cos(i * 1.8) * 0.95, 0.5 + i * 0.27, 0.5],
      [0.07 + i * 0.01, 0.07 + i * 0.01, 0.07 + i * 0.01]
    );
  const hearts = new THREE.Group();
  rig.add(hearts);
  const heartShape = new THREE.Shape();
  heartShape.moveTo(0, -0.12);
  heartShape.bezierCurveTo(-0.35, 0.1, -0.12, 0.29, 0, 0.13);
  heartShape.bezierCurveTo(0.12, 0.29, 0.35, 0.1, 0, -0.12);
  const heartGeometry = geometry(
    new THREE.ExtrudeGeometry(heartShape, { depth: 0.035, bevelEnabled: false, curveSegments: 10 })
  );
  for (const side of [-1, 1]) {
    const heart = new THREE.Mesh(heartGeometry, pink);
    heart.position.set(side * 1.04, 1.55, 0.3);
    heart.scale.setScalar(0.7);
    hearts.add(heart);
  }
  const hand = new THREE.Group();
  head.add(hand);
  const skin = material('#f1c7a4');
  ball(hand, skin, [0, 0, 0], [0.24, 0.075, 0.17]);
  for (let i = 0; i < 4; i++) ball(hand, skin, [-0.16 + i * 0.09, -0.025, 0.12], [0.055, 0.055, 0.16]);
  ball(hand, skin, [0.23, 0, -0.06], [0.19, 0.06, 0.1]);
  // Soft contact shadow avoids an extra shadow-map pass for each gallery card.
  const shadowMaterial = new THREE.MeshBasicMaterial({
    color: '#544134',
    transparent: true,
    opacity: 0.12,
    depthWrite: false
  });
  materials.add(shadowMaterial);
  const shadow = new THREE.Mesh(geometry(new THREE.CircleGeometry(1, 48)), shadowMaterial);
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(0.87, 1.13, 1);
  shadow.position.y = -0.018;
  root.add(shadow);

  return {
    root,
    update(state, seconds) {
      const palette = COAT_COLORS.find((c) => c.id === state.appearance.color) ?? COAT_COLORS[0]!;
      coat.color.set(palette.swatch);
      accent.color.set(palette.accent);
      for (const entry of patterned) entry.mesh.visible = state.appearance.pattern === entry.pattern;
      dirt.opacity = dirtOpacity(state.cleanliness) * 0.65;
      for (const mesh of dirtMarks) mesh.visible = dirt.opacity > 0;
      const t = seconds;
      const mood = state.reaction ? PET_REACTIONS[state.reaction].mood : state.mood;
      const petting = !state.sleeping && state.interaction === 'petting';
      const prowl = !state.sleeping && state.pose === 'prowl';
      const walk = !state.sleeping && state.pose === 'walk';
      const joyful = !state.sleeping && !prowl && !walk && mood === 'joyful' && (!state.calmJoy || !!state.reaction);
      const breath = Math.sin(t * 1.8);
      const hop = joyful && state.reaction !== 'content' ? Math.max(0, Math.sin(t * 3.2)) * 0.14 : 0;
      root.rotation.y = THREE.MathUtils.degToRad(state.yaw);
      rig.position.y = hop;
      rig.position.z = prowl ? -0.23 : 0;
      rig.rotation.set(0, 0, mood === 'irritated' && !state.sleeping ? Math.sin(t * 5) * 0.025 : 0);
      torso.position.set(0, state.sleeping ? 0.4 : prowl ? 0.7 : 0.78, prowl ? -0.33 : -0.28);
      torso.rotation.x = prowl ? 0.32 : 0;
      torso.scale.set(0.6, (state.sleeping ? 0.34 : prowl ? 0.5 : 0.67) * (1 + breath * 0.012), prowl ? 0.85 : 0.7);
      head.scale.setScalar(state.sleeping ? 0.84 : 1);
      head.position.set(0, state.sleeping ? 0.53 : prowl ? 0.64 : 1.38, state.sleeping ? 0.52 : prowl ? 0.86 : 0.4);
      head.rotation.set(
        state.sleeping ? -0.12 : prowl ? -0.04 : mood === 'upset' ? 0.15 : 0,
        mood === 'thoughtful' && !state.sleeping && !prowl ? Math.sin(t * 0.8) * 0.16 : 0,
        petting ? Math.sin(t * 2) * 0.1 : mood === 'upset' ? 0.1 : 0
      );
      if (!state.sleeping && !prowl) head.position.y += breath * 0.017 + (joyful ? Math.sin(t * 3.2) * 0.025 : 0);
      if (prowl) {
        head.position.x = Math.sin(t * 2.8) * 0.025;
        torso.rotation.z = Math.sin(t * 2.8) * 0.018;
      } else torso.rotation.z = 0;
      haunches.forEach((mesh, i) => {
        mesh.position.set((i ? 1 : -1) * 0.43, state.sleeping ? 0.27 : prowl ? 0.63 : 0.43, -0.57);
        mesh.scale.y = state.sleeping ? 0.27 : prowl ? 0.54 : 0.43;
      });
      for (const { joint, front, side } of legs) {
        joint.position.y = state.sleeping ? 0.27 : prowl && !front ? 0.54 : 0.48;
        joint.position.z = front ? (prowl ? 1.06 : 0.36) : -0.61;
        joint.scale.y = state.sleeping || (prowl && front) ? 0.5 : 1;
        joint.position.y = prowl && front ? 0.24 : joint.position.y;
        joint.rotation.x = walk ? Math.sin(t * 5 + (front ? 0 : Math.PI) + (side > 0 ? Math.PI : 0)) * 0.38 : 0;
        if (mood === 'angry' && front && side < 0 && !state.sleeping && !prowl && !walk)
          joint.position.y += Math.max(0, Math.sin(t * 5)) * 0.1;
      }
      tail.position.y = state.sleeping ? 0.22 : prowl ? 0.78 : 0.63;
      tail.scale.setScalar(state.sleeping ? 0.55 : 1);
      tail.rotation.set(
        state.sleeping ? -1.1 : 0.08,
        Math.sin(t * (prowl ? 2.7 : joyful ? 4 : 1.5)) * 0.25,
        state.sleeping ? -0.65 : Math.sin(t * 2) * 0.08
      );
      const blink = Math.sin(t * 1.12) > 0.992;
      for (const eye of eyes) {
        const shut = state.sleeping || petting || blink;
        eye.group.children[0]!.visible = !shut;
        eye.iris.visible = !shut;
        eye.closed.visible = shut;
        eye.group.scale.y = prowl ? 0.53 : mood === 'angry' || mood === 'irritated' ? 0.7 : 1;
        eye.group.rotation.z = prowl || mood === 'angry' ? -eye.side * 0.14 : 0;
        eye.iris.position.x = mood === 'thoughtful' ? Math.sin(t * 0.8) * 0.035 : 0;
        eye.brow.rotation.z = mood === 'upset' ? eye.side * 0.12 : 0;
      }
      bubbles.visible = state.reaction === 'clean' && !state.sleeping;
      bubbles.position.y = Math.sin(t * 2) * 0.12;
      hearts.visible = petting || (state.reaction === 'content' && !state.sleeping);
      hearts.position.y = Math.sin(t * 2) * 0.08;
      hand.visible = petting;
      hand.position.set(0.15 + Math.sin(t * 2) * 0.17, 0.6, 0.16);
      hand.rotation.z = -0.12 + Math.sin(t * 2) * 0.08;
      shadow.scale.set(0.87 - hop * 0.4, 1.13 - hop * 0.3, 1);
    },
    dispose() {
      geometries.forEach((value) => value.dispose());
      materials.forEach((value) => value.dispose());
      root.clear();
    }
  };
}
