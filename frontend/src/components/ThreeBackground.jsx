import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const AIOrb = () => {
  const orbRef = useRef();
  const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  useFrame((state) => {
    if (orbRef.current && !isReducedMotion) {
      orbRef.current.rotation.x = state.clock.getElapsedTime() * 0.2;
      orbRef.current.rotation.y = state.clock.getElapsedTime() * 0.3;
    }
  });

  return (
    <mesh ref={orbRef} position={[0, 0, -2]}>
      <sphereGeometry args={[2.5, 64, 64]} />
      <meshPhysicalMaterial
        color="#06B6D4"
        emissive="#6366F1"
        emissiveIntensity={0.2}
        roughness={0.1}
        metalness={0.8}
        transmission={0.9} // Glass-like
        transparent={true}
        opacity={0.9}
        clearcoat={1.0}
        wireframe={true} // Add a cool wireframe look to make it stand out
      />
    </mesh>
  );
};

const FloatingParticles = ({ count = 600 }) => {
  const points = useRef();
  const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  const particlesPosition = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30; // x
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20; // y
      positions[i * 3 + 2] = (Math.random() - 0.5) * 15 - 5; // z
    }
    return positions;
  }, [count]);

  useFrame((state) => {
    if (points.current && !isReducedMotion) {
      points.current.rotation.y = state.clock.getElapsedTime() * 0.05;
      points.current.position.y = Math.sin(state.clock.getElapsedTime() * 0.2) * 0.5;
    }
  });

  return (
    <points ref={points} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particlesPosition.length / 3}
          array={particlesPosition}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#A855F7"
        size={0.15} // Increased size so they are highly visible
        transparent={true}
        opacity={0.8}
        sizeAttenuation={true}
        depthWrite={false}
      />
    </points>
  );
};

const NeuralNetwork = ({ count = 60 }) => {
  const group = useRef();
  const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const { positions, linePositions } = useMemo(() => {
    const pos = [];
    for (let i = 0; i < count; i++) {
      pos.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 8 - 4
        )
      );
    }
    
    const lines = [];
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        if (pos[i].distanceTo(pos[j]) < 4) {
          lines.push(pos[i], pos[j]);
        }
      }
    }
    
    const linePositions = new Float32Array(lines.length * 3);
    lines.forEach((v, i) => {
      linePositions[i * 3] = v.x;
      linePositions[i * 3 + 1] = v.y;
      linePositions[i * 3 + 2] = v.z;
    });
    
    const nodePositions = new Float32Array(pos.length * 3);
    pos.forEach((v, i) => {
      nodePositions[i * 3] = v.x;
      nodePositions[i * 3 + 1] = v.y;
      nodePositions[i * 3 + 2] = v.z;
    });

    return { positions: nodePositions, linePositions };
  }, [count]);

  useFrame((state) => {
    if (group.current && !isReducedMotion) {
      group.current.rotation.x = state.clock.getElapsedTime() * 0.02;
      group.current.rotation.y = state.clock.getElapsedTime() * 0.03;
    }
  });

  return (
    <group ref={group}>
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={positions.length / 3}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial color="#06B6D4" size={0.2} transparent opacity={0.9} depthWrite={false} />
      </points>
      {linePositions.length > 0 && (
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={linePositions.length / 3}
              array={linePositions}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#6366F1" transparent opacity={0.3} depthWrite={false} />
        </lineSegments>
      )}
    </group>
  );
};

const CameraRig = () => {
  const { camera } = useThree();
  const vec = new THREE.Vector3();
  const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  // Custom mouse tracking since canvas has pointer-events: none
  const mouse = useRef({ x: 0, y: 0 });
  
  useEffect(() => {
    const handleMouseMove = (e) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useFrame(() => {
    if (isReducedMotion) return;
    vec.set(mouse.current.x * 2, mouse.current.y * 2, 8);
    camera.position.lerp(vec, 0.05);
    camera.lookAt(0, 0, -2);
  });
  
  return null;
};

const Scene = () => {
  const isMobile = window.innerWidth < 768;
  const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
  
  const particleCount = isMobile ? 150 : isTablet ? 300 : 800;
  const networkCount = isMobile ? 25 : isTablet ? 40 : 80;
  
  return (
    <>
      <color attach="background" args={['#0B0F19']} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 10]} intensity={2} color="#6366F1" />
      <pointLight position={[-5, -5, 5]} intensity={2} color="#A855F7" />
      
      {/* Reduced fog density so things are more visible */}
      <fog attach="fog" args={['#0B0F19', 8, 30]} />

      <AIOrb />
      <FloatingParticles count={particleCount} />
      
      {!isMobile && <NeuralNetwork count={networkCount} />}
      {!isMobile && <CameraRig />}
    </>
  );
};

const ThreeBackground = () => {
  return (
    <div className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
      <Canvas
        camera={{ position: [0, 0, 8], fov: 45 }}
        dpr={[1, 2]}
        gl={{ alpha: false, antialias: true }}
      >
        <Scene />
      </Canvas>
    </div>
  );
};

export default ThreeBackground;
