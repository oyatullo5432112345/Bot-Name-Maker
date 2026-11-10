import { useRef, useState, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";

// ── 3D Kitob ──────────────────────────────────────────────────────────
function Book3D({ book, position, onClick }: { book: any; position: [number, number, number]; onClick: () => void }) {
  const [hovered, setHover] = useState(false);
  const groupRef = useRef<THREE.Group>(null);

  const color = book.my_borrow?.quiz_passed ? "#1EA896" : "#E8B04B";

  useFrame(() => {
    if (groupRef.current) {
      const targetZ = hovered ? 0.2 : 0;
      groupRef.current.position.z += (targetZ - groupRef.current.position.z) * 0.15;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
      >
        <boxGeometry args={[0.8, 1.2, 0.15]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      {hovered && (
        <Html center position={[0, 0.8, 0]} distanceFactor={6}>
          <div style={{ background: "rgba(13,20,48,0.95)", color: "#F3EEE2", padding: "4px 8px", borderRadius: 6, fontSize: 12, whiteSpace: "nowrap", border: "1px solid #E8B04B", fontWeight: 700 }}>
            {book.title}
          </div>
        </Html>
      )}
    </group>
  );
}

// ── Javon ─────────────────────────────────────────────────────────────
function Shelf() {
  return (
    <group position={[0, -1.5, 0]}>
      <mesh receiveShadow position={[0, 0, 0]}>
        <boxGeometry args={[10, 0.1, 2]} />
        <meshStandardMaterial color="#2A1E3F" roughness={0.8} />
      </mesh>
      <mesh receiveShadow position={[0, 2, -1]}>
        <boxGeometry args={[10, 4, 0.1]} />
        <meshStandardMaterial color="#1A1330" roughness={0.9} />
      </mesh>
      <mesh receiveShadow position={[-5, 2, 0]}>
        <boxGeometry args={[0.1, 4, 2]} />
        <meshStandardMaterial color="#1A1330" roughness={0.9} />
      </mesh>
      <mesh receiveShadow position={[5, 2, 0]}>
        <boxGeometry args={[0.1, 4, 2]} />
        <meshStandardMaterial color="#1A1330" roughness={0.9} />
      </mesh>
    </group>
  );
}

// ── Asosiy 3D ─────────────────────────────────────────────────────────
export default function BookShelf3D({ books, onSelect }: { books: any[]; onSelect: (book: any) => void }) {
  return (
    <div style={{ position: "relative", width: "100%", height: "60vh", background: "#0E1230" }}>
      <Canvas
        camera={{ position: [0, 1, 6], fov: 50 }}
        dpr={[1, 1.5]}
        shadows={false}
        gl={{ antialias: false, powerPreference: "high-performance" }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={0.8} />
          <pointLight position={[-5, 5, -5]} intensity={0.5} color="#E8B04B" />

          <Shelf />

          {books.map((book, i) => (
            <Book3D
              key={book.id}
              book={book}
              position={[-4 + (i % 8) * 1.1, -0.8, 0.5]}
              onClick={() => onSelect(book)}
            />
          ))}

          <OrbitControls
            enablePan={false}
            enableZoom={true}
            minDistance={4}
            maxDistance={10}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI / 2.2}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
