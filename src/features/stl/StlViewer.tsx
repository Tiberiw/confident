import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { Upload } from "lucide-react";
import { Alert, Button, buttonClass, Spinner, tokens } from "@/ui";

type Stage = { load: (data: ArrayBuffer) => void };

/** Interactive viewer for .stl dental models (rotate, pan, zoom). */
export default function StlViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Stage | null>(null);
  const [status, setStatus] = useState<"empty" | "loading" | "ready" | "error">("empty");
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      setStatus("error");
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(tokens.page);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
    camera.position.set(0, 0, 160);
    scene.add(new THREE.AmbientLight("white", 0.7));
    const key = new THREE.DirectionalLight("white", 0.9);
    key.position.set(60, 80, 100);
    scene.add(key);
    const fill = new THREE.DirectionalLight("white", 0.4);
    fill.position.set(-60, -40, -80);
    scene.add(fill);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = mount;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    let frame = 0;
    const tick = () => {
      controls.update();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(tick);
    };
    tick();

    const material = new THREE.MeshStandardMaterial({ color: tokens.brand, metalness: 0.05, roughness: 0.55 });
    let mesh: THREE.Mesh | null = null;
    const loader = new STLLoader();

    stageRef.current = {
      load(data) {
        const geometry = loader.parse(data);
        geometry.computeBoundingBox();
        geometry.center();
        const size = new THREE.Vector3();
        geometry.boundingBox!.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        if (mesh) {
          scene.remove(mesh);
          mesh.geometry.dispose();
        }
        mesh = new THREE.Mesh(geometry, material);
        mesh.scale.setScalar(100 / maxDim);
        scene.add(mesh);
        controls.reset();
      },
    };

    return () => {
      stageRef.current = null;
      cancelAnimationFrame(frame);
      ro.disconnect();
      controls.dispose();
      mesh?.geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  const show = async (name: string, read: () => Promise<ArrayBuffer>) => {
    setStatus("loading");
    setFileName(name);
    try {
      stageRef.current?.load(await read());
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  };

  const loadSample = () =>
    show("Sample tooth", async () => {
      const res = await fetch("/samples/tooth.stl");
      if (!res.ok) throw new Error("Sample not found");
      return res.arrayBuffer();
    });

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className={buttonClass("secondary", "md", "cursor-pointer focus-within:ring-2 focus-within:ring-brand/40")}>
          <Upload size={16} aria-hidden />
          Choose .stl file
          <input
            type="file"
            accept=".stl"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void show(f.name, () => f.arrayBuffer());
              e.target.value = "";
            }}
          />
        </label>
        <Button variant="ghost" onClick={() => void loadSample()}>
          Load sample
        </Button>
        {status === "ready" && <span className="ml-auto truncate text-sm text-muted">{fileName}</span>}
      </div>
      {status === "error" && <Alert tone="error">This model couldn't be displayed. Check that it's a valid .stl file.</Alert>}
      <div className="relative h-[60vh] min-h-72 overflow-hidden rounded border border-line">
        <div ref={mountRef} className="absolute inset-0" />
        {status !== "ready" && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 text-center">
            {status === "loading" ? (
              <Spinner className="h-5 w-5 text-brand" />
            ) : (
              <>
                <p className="font-medium">No model loaded</p>
                <p className="max-w-xs text-sm text-muted">Choose an .stl scan, or load the sample tooth. Drag to rotate, right-drag to pan, scroll to zoom.</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
