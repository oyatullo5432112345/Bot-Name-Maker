import { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, useProgress } from "@react-three/drei";
import * as THREE from "three";
import { Loader2, BookOpen } from "lucide-react";

const BG = "#0E1230";

function webglSupported(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

// ── 3D Kitob ──────────────────────────────────────────────────────────
function Book3D({ book, position, onClick }: { book: any; position: [number, number, number]; onClick: () => void }) {
  const [hovered, setHover] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);
  const color = book.my_borrow?.quiz_passed ? "#1EA896" : "#E8B04B";

  useFrame(() => {
    if (meshRef.current) {
      const targetZ = hovered ? 0.2 : 0;
      meshRef.current.position.z += (targetZ - meshRef.current.position.z) * 0.15;
    }
  });

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
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

// Yuklanish ko'rsatkichi — faqat haqiqatan yuklanayotganda ko'rinadi.
// (Avval u doim ekranni qoplab turardi — shuning uchun sahna qorayib qolardi.)
function Loader() {
  const { progress, loaded, total, active } = useProgress();
  if (!active) return null;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", background: BG, zIndex: 10, gap: 16 }}>
      <Loader2 className="animate-spin" color="#E8B04B" size={36} />
      <div style={{ color: "#E8B04B", fontSize: 16, fontWeight: 800 }}>Yuklanmoqda...</div>
      <div style={{ width: "70%", maxWidth: 360, height: 10, background: "rgba(255,255,255,0.1)", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg, #1EA896, #E8B04B)", transition: "width 0.2s" }} />
      </div>
      <div style={{ color: "rgba(243,238,226,0.7)", fontSize: 12, fontWeight: 600 }}>
        {Math.round(loaded)} / {Math.round(total)} ({Math.round(progress)}%)
      </div>
    </div>
  );
}

// 3D qo'llab-quvvatlanmasa — oddiy ro'yxat (kitoblar baribir ochiladi)
function FlatFallback({ books, onSelect }: { books: any[]; onSelect: (b: any) => void }) {
  return (
    <div style={{ background: BG, minHeight: "60vh", padding: 16, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12, alignContent: "start" }}>
      <div style={{ gridColumn: "1 / -1", color: "rgba(243,238,226,0.6)", fontSize: 12 }}>
        Bu qurilmada 3D ko'rinish qo'llab-quvvatlanmaydi. Kitoblar ro'yxati:
      </div>
      {books.map((b) => (
        <button
          key={b.id}
          onClick={() => onSelect(b)}
          style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 10, color: "#F3EEE2", textAlign: "left", cursor: "pointer" }}
        >
          <div style={{ aspectRatio: "3/4", borderRadius: 8, background: "#1B2150", display: "grid", placeItems: "center", marginBottom: 6, overflow: "hidden" }}>
            {b.cover_url ? <img src={b.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <BookOpen size={28} color="#E8B04B" />}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{b.title}</div>
        </button>
      ))}
    </div>
  );
}

// ── Asosiy 3D ─────────────────────────────────────────────────────────
export default function BookShelf3D({ books, onSelect }: { books: any[]; onSelect: (book: any) => void }) {
  const [supported] = useState(() => webglSupported());


  if (!supported) return <FlatFallback books={books} onSelect={onSelect} />;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: "60vh", background: BG }}>
      <Loader />
      <Canvas
        camera={{ position: [0, 1, 6], fov: 50 }}
        dpr={[1, 1.5]}
        shadows={false}
        gl={{ antialias: false, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.setClearColor(BG, 1);
        }}
      >
        <color attach="background" args={[BG]} />
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
      </Canvas>
    </div>
  );
}
