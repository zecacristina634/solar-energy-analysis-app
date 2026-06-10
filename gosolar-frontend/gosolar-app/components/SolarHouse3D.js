import React, { useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';


const CONFIG = {

  view: { height: 300 },

  camera: {
    fov: 40,                             
    position: { x: 4.5, y: 5, z: 7.6 }, 
    lookAt:   { x: 0.5,   y: 2, z: 0 },  
  },

  house: {
    width:  3.9,  
    height: 2.6,  
    depth:  2.2,  
  },

  windows: {
    y: 1.6,        
    offsetX: 1.0,  
  },

  door: {
    y: 0.39,      
  },

  roof: {
    halfWidth: 2, 
    peak:      0.9, 
    depth:     2.3, 
  },

  panel: {
    slopeFrac: 0.52, 
    width:  1.4,     
    depth:  0.78,    
    z:      0.05,    
  },

  chimney: {
    x: -1.2,   
    y: 3.15,   
    z: -0.25,  
    width:  0.22,
    height: 0.80,
  },

  sun: {
    position: { x: -1.8, y: 4, z: 1.5 }, 
    radius: 0.5,
  },

  pole: {
    x: 3,     
    z: -0.4,    
    top: 3.3,   
    height: 3.5,
  },

  wires: {
    attachY: 2.85, 
    sag1: 0.10,   
    sag2: 0.12,   
  },

  anim: {
    particleSpeed: 0.0035, 
    particlesPerWire: 5,   
  },

  colors: {
    bg:          0x0a1628, 
    ground:      0x1a2c44, 
    wall:        0x8899aa,
    roofDark:    0x4a5b6e,
    roofRidge:   0x3d4e61,
    door:        0x556677,
    doorFrame:   0x6b7d8f,
    windowFrame: 0x6b7d8f,
    windowGlass: 0xa8c4dd,
    chimney:     0x5a6b7c,
    chimneyTop:  0x4a5968,
    poleTrunk:   0x5a6a78,
    poleCross:   0x4d5d6b,
    insulator:   0x8fa0b0,
    wire:        0x6e7e8e,
  },
};



export default function SolarHouse3D({ isDark = true}) {
  const rafRef = useRef(null); 

  const colors = {
    ...CONFIG.colors,
    bg:     isDark ? 0x0a1628 : 0xdce8f5,
    ground: isDark ? 0x1a2c44 : 0xc5d8ed,
  };

  useEffect(() => {
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  const onContextCreate = (gl) => {
    const C = colors;

    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;

    const renderer = new Renderer({ gl });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;                 
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(C.bg);
    scene.fog = new THREE.Fog(C.bg, 11, 30); 

    const cam = CONFIG.camera;
    const camera = new THREE.PerspectiveCamera(cam.fov, width / height, 0.1, 100);
    camera.position.set(cam.position.x, cam.position.y, cam.position.z); 
    camera.lookAt(cam.lookAt.x, cam.lookAt.y, cam.lookAt.z);             

    scene.add(new THREE.AmbientLight(0xc8d8f0, 0.8));
    const sunLight = new THREE.DirectionalLight(0xeef2ff, 2.0);
    sunLight.position.set(5, 9, 4);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.camera.near = 0.5; sunLight.shadow.camera.far = 30;
    sunLight.shadow.camera.left = -8; sunLight.shadow.camera.right = 8;
    sunLight.shadow.camera.top = 8;  sunLight.shadow.camera.bottom = -8;
    scene.add(sunLight);
    const fill = new THREE.DirectionalLight(0x8899bb, 0.5);
    fill.position.set(-3, 2, -3);
    scene.add(fill);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshLambertMaterial({ color: C.ground })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const houseGroup = new THREE.Group();
    scene.add(houseGroup);

    const H = CONFIG.house;
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(H.width, H.height, H.depth), 
      new THREE.MeshLambertMaterial({ color: C.wall })
    );
    body.position.set(0, H.height / 2, 0); 
    body.castShadow = true; body.receiveShadow = true;
    houseGroup.add(body);

    const frontZ = H.depth / 2; 

    const D = CONFIG.door;
    const dframe = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.78, 0.04),
      new THREE.MeshLambertMaterial({ color: C.doorFrame })
    );
    dframe.position.set(0, D.y, frontZ + 0.01); 
    houseGroup.add(dframe);
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 1.6, 0.05),
      new THREE.MeshLambertMaterial({ color: C.door })
    );
    door.position.set(0, D.y - 0.02, frontZ + 0.02);
    houseGroup.add(door);

    function addWindow(x, y, z) {
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.9, 0.04),
        new THREE.MeshLambertMaterial({ color: C.windowFrame })
      );
      frame.position.set(x, y, z);
      houseGroup.add(frame);
      const glass = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.8, 0.03),
        new THREE.MeshLambertMaterial({ color: C.windowGlass, transparent: true, opacity: 0.6 })
      );
      glass.position.set(x, y, z + 0.01);
      houseGroup.add(glass);
      const glow = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.65, 0.01),
        new THREE.MeshBasicMaterial({ color: 0xddeeff, transparent: true, opacity: 0.15 })
      );
      glow.position.set(x, y, z + 0.015);
      houseGroup.add(glow);
      const hbar = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.035, 0.035), new THREE.MeshLambertMaterial({ color: C.windowFrame }));
      hbar.position.set(x, y, z + 0.012); houseGroup.add(hbar);
      const vbar = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.85, 0.035), new THREE.MeshLambertMaterial({ color: C.windowFrame }));
      vbar.position.set(x, y, z + 0.012); houseGroup.add(vbar);
    }
    const Wn = CONFIG.windows;
    addWindow(-Wn.offsetX, Wn.y, frontZ + 0.01); 
    addWindow( Wn.offsetX, Wn.y, frontZ + 0.01); 

    const R = CONFIG.roof;
    function makeRoofGeo() {
      const s = new THREE.Shape();
      s.moveTo(-R.halfWidth, 0);     
      s.lineTo( R.halfWidth, 0);
      s.lineTo( 0, R.peak);          
      s.closePath();
      return new THREE.ExtrudeGeometry(s, { depth: R.depth, bevelEnabled: false }); 
    }
    const roofBaseY = H.height;          
    const ridgeY = roofBaseY + R.peak;   

    const roof = new THREE.Mesh(makeRoofGeo(), new THREE.MeshLambertMaterial({ color: C.roofDark }));
    roof.position.set(0, roofBaseY, -R.depth / 2); 
    roof.castShadow = true;
    houseGroup.add(roof);

    for (let sgn = -1; sgn <= 1; sgn += 2) {
      const trim = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.06, R.depth + 0.06),
        new THREE.MeshLambertMaterial({ color: C.roofRidge })
      );
      trim.position.set(sgn * R.halfWidth, roofBaseY, 0);
      houseGroup.add(trim);
    }

    const ridge = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.08, R.depth + 0.06),
      new THREE.MeshLambertMaterial({ color: C.roofRidge })
    );
    ridge.position.set(0, ridgeY, 0);
    houseGroup.add(ridge);

    const Ch = CONFIG.chimney;
    const chimney = new THREE.Mesh(
      new THREE.BoxGeometry(Ch.width, Ch.height, Ch.width),
      new THREE.MeshLambertMaterial({ color: C.chimney })
    );
    chimney.position.set(Ch.x, Ch.y, Ch.z); 
    chimney.castShadow = true;
    houseGroup.add(chimney);
    const chimneyTop = new THREE.Mesh(
      new THREE.BoxGeometry(Ch.width + 0.06, 0.06, Ch.width + 0.06),
      new THREE.MeshLambertMaterial({ color: C.chimneyTop })
    );
    chimneyTop.position.set(Ch.x, Ch.y + Ch.height / 2 + 0.03, Ch.z);
    houseGroup.add(chimneyTop);

    const P = CONFIG.panel;
    const panelGroup = new THREE.Group();
    const roofAngle = Math.atan2(R.peak, R.halfWidth); 

    panelGroup.add(new THREE.Mesh(
      new THREE.BoxGeometry(P.width, 0.045, P.depth),  
      new THREE.MeshLambertMaterial({ color: 0x37474f })
    ));
    const panelGlass = new THREE.Mesh(
      new THREE.BoxGeometry(P.width - 0.08, 0.035, P.depth - 0.08),
      new THREE.MeshLambertMaterial({ color: 0x1a237e, transparent: true, opacity: 0.92 })
    );
    panelGlass.position.y = 0.02;
    panelGroup.add(panelGlass);

    for (let c = 0; c < 5; c++) {
      const cl = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.04, P.depth - 0.08), new THREE.MeshBasicMaterial({ color: 0x3949ab, transparent: true, opacity: 0.5 }));
      cl.position.set(-0.36 + c * 0.18, 0.028, 0); panelGroup.add(cl);
    }
    for (let r = 0; r < 3; r++) {
      const rl = new THREE.Mesh(new THREE.BoxGeometry(P.width - 0.08, 0.04, 0.004), new THREE.MeshBasicMaterial({ color: 0x3949ab, transparent: true, opacity: 0.5 }));
      rl.position.set(0, 0.028, -0.27 + r * 0.27); panelGroup.add(rl);
    }

    const sheen = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.025, 0.18),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15 })
    );
    sheen.position.set(-0.15, 0.045, -0.08);
    panelGroup.add(sheen);

    const panelX = R.halfWidth * P.slopeFrac;      
    const panelY = ridgeY - R.peak * P.slopeFrac;
    panelGroup.rotation.z = -roofAngle;            
    panelGroup.position.set(panelX, panelY + 0.04, P.z);
    houseGroup.add(panelGroup);

    const S = CONFIG.sun;
    const sunSphere = new THREE.Mesh(
      new THREE.SphereGeometry(S.radius, 20, 20),
      new THREE.MeshBasicMaterial({ color: 0xffd54f })
    );
    sunSphere.position.set(S.position.x, S.position.y, S.position.z); 
    scene.add(sunSphere);

    const rings = [];
    for (let ri = 0; ri < 3; ri++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.6 + ri * 0.17, 0.02, 8, 32),
        new THREE.MeshBasicMaterial({ color: 0xffca28, transparent: true, opacity: 0.22 - ri * 0.06 })
      );
      ring.position.copy(sunSphere.position);
      ring.rotation.x = 3;
      ring.rotation.y = 2.5;
      ring.userData.ri = ri;
      scene.add(ring); rings.push(ring);
    }
    
    const Po = CONFIG.pole;
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.07, Po.height, 8),
      new THREE.MeshLambertMaterial({ color: C.poleTrunk })
    );
    pole.position.set(Po.x, Po.height / 2, Po.z); 
    pole.castShadow = true;
    scene.add(pole);
    const crossbar = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.07, 0.07),
      new THREE.MeshLambertMaterial({ color: C.poleCross })
    );
    crossbar.position.set(Po.x, Po.top, Po.z); 
    scene.add(crossbar);
    for (let ii = -1; ii <= 1; ii++) {
      const ins = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.14, 6),
        new THREE.MeshLambertMaterial({ color: C.insulator })
      );
      ins.position.set(Po.x + ii * 0.45, Po.top - 0.1, Po.z);
      scene.add(ins);
    }

    const Wr = CONFIG.wires;
    const wireMat = new THREE.LineBasicMaterial({ color: C.wire });
    function catenary(x1, y1, z1, x2, y2, z2, sag) {
      const pts = [];
      for (let t = 0; t <= 1; t += 0.04) {
        pts.push(new THREE.Vector3(
          x1 + (x2 - x1) * t,
          y1 + (y2 - y1) * t - sag * Math.sin(Math.PI * t),
          z1 + (z2 - z1) * t
        ));
      }
      return pts;
    }
    const houseConnX = H.width / 2 - 0.2; 
    const wire1Pts = catenary(houseConnX, Wr.attachY, -0.15, Po.x - 0.35, Po.top - 0.1, Po.z, Wr.sag1);
    const wire2Pts = catenary(houseConnX, Wr.attachY,  0.15, Po.x + 0.45, Po.top - 0.1, Po.z, Wr.sag2);
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(wire1Pts), wireMat));
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(wire2Pts), wireMat));

    const A = CONFIG.anim;
    const pMat = new THREE.MeshBasicMaterial({ color: 0xce93d8 });
    const pGlow = new THREE.MeshBasicMaterial({ color: 0xe040fb, transparent: true, opacity: 0.4 });
    const gridP = [];
    function makeParticle(pathPts, offset) {
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), pMat);
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), pGlow.clone());
      core.add(glow);
      core.userData = { path: pathPts, t: offset };
      scene.add(core); gridP.push(core);
    }
    for (let i = 0; i < A.particlesPerWire; i++) makeParticle(wire1Pts, i / A.particlesPerWire);
    for (let i = 0; i < A.particlesPerWire; i++) makeParticle(wire2Pts, (i + 0.12) / A.particlesPerWire);

    function interpPath(pts, t) {
      t = ((t % 1) + 1) % 1;
      const idx = t * (pts.length - 1);
      const a = Math.floor(idx);
      const b = Math.min(a + 1, pts.length - 1);
      return new THREE.Vector3().lerpVectors(pts[a], pts[b], idx - a);
    }

    const clock = new THREE.Clock();
    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      sheen.material.opacity = 0.08 + 0.1 * Math.abs(Math.sin(t * 1.6));

      rings.forEach((r) => {
        const ri = r.userData.ri;
        r.scale.setScalar(1 + 0.05 * Math.sin(t * 1.8 + ri * 0.9));
        r.material.opacity = (0.18 - ri * 0.05) + 0.04 * Math.sin(t * 2.3 + ri);
      });

      gridP.forEach((p) => {
        p.userData.t = (p.userData.t + A.particleSpeed) % 1; 
        p.position.copy(interpPath(p.userData.path, p.userData.t));
        p.children[0].material.opacity = 0.2 + 0.2 * Math.sin(t * 3.5 + p.userData.t * 12);
      });

      renderer.render(scene, camera);
      gl.endFrameEXP(); 
    };
    animate();
  };

  return (
    <View style={[styles.container, { height: CONFIG.view.height }]}>
      <GLView style={styles.gl} onContextCreate={onContextCreate} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#0a1628',
    borderRadius: 20,
    overflow: 'hidden',
  },
  gl: { flex: 1 },
});
