"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { ArchitectureAsset } from "@/lib/architecture";

type Props = {
  architecture: ArchitectureAsset;
};

type LayerId = "intro" | "package" | "die" | "sm-internal" | "dl-flow";
type LayerCopy = {
  badge: string | number;
  body: string;
  facts: Array<{ label: string; value: string | number }>;
  software?: string;
};
type LayerMotion = {
  enterScale?: number;
  exitScale?: number;
  enterX?: number;
  enterY?: number;
  exitX?: number;
  exitY?: number;
  origin?: string;
};
type TooltipSide = "top" | "bottom" | "left" | "right";
type TooltipState = {
  title: string;
  body: string;
  x: number;
  y: number;
} | null;
type TooltipContextValue = {
  show: (tooltip: TooltipState) => void;
  hide: () => void;
};

const TooltipContext = createContext<TooltipContextValue | null>(null);

const layers: Array<{ id: LayerId; title: string; subtitle: string }> = [
  {
    id: "intro",
    title: "NVIDIA H100",
    subtitle: "Scroll to dissect Hopper architecture"
  },
  {
    id: "package",
    title: "Package",
    subtitle: "GH100 die, HBM sites, package memory pads"
  },
  {
    id: "die",
    title: "Compute Hierarchy",
    subtitle: "H100: 8 GPCs, 66 active TPCs, 132 active SMs"
  },
  {
    id: "sm-internal",
    title: "SM Internal",
    subtitle: "Schedulers, register file, shared memory/L1, scalar cores, Tensor Cores"
  },
  {
    id: "dl-flow",
    title: "Software Mapping",
    subtitle: "CUDA/Triton execution hierarchy mapped onto H100 compute and memory"
  }
];
const checkpointDistanceVh = 180;
const scrollHeightVh = 100 + (layers.length - 1) * checkpointDistanceVh;

export function ScrollHardwareMap({ architecture }: Props) {
  const [targetProgress, setTargetProgress] = useState(0);
  const [progress, setProgress] = useState(0);
  const activeIndex = Math.min(layers.length - 1, Math.round(progress * (layers.length - 1)));
  const activeLayer = layers[activeIndex];

  useEffect(() => {
    function onScroll() {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setTargetProgress(max > 0 ? window.scrollY / max : 0);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const previousSnap = root.style.scrollSnapType;
    const previousBehavior = root.style.scrollBehavior;

    root.style.scrollSnapType = "y mandatory";
    root.style.scrollBehavior = "smooth";

    return () => {
      root.style.scrollSnapType = previousSnap;
      root.style.scrollBehavior = previousBehavior;
    };
  }, []);

  useEffect(() => {
    let frame = 0;
    function tick() {
      setProgress((current) => {
        const next = current + (targetProgress - current) * 0.075;
        return Math.abs(targetProgress - next) < 0.002 ? targetProgress : next;
      });
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [targetProgress]);

  function jumpToLayer(index: number) {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const y = layers.length === 1 ? 0 : (index / (layers.length - 1)) * max;
    window.scrollTo({ top: y, behavior: "smooth" });
  }

  return (
    <TooltipProvider>
      <main className="relative bg-[#070808] text-[#e2e5e4]" style={{ height: `${scrollHeightVh}vh` }}>
        <section className="fixed inset-0">
          <div className="relative h-full overflow-hidden bg-[#070808]">
            <div
              className="absolute left-4 right-4 top-4 z-20 border border-[#202627] bg-[#080a0a]/72 px-4 py-2 backdrop-blur transition-opacity duration-300"
              style={{ opacity: activeLayer.id === "intro" ? 0 : 1, pointerEvents: activeLayer.id === "intro" ? "none" : "auto" }}
            >
              <div className="flex items-center justify-between gap-5">
                <div className="min-w-0">
                  <div className="mt-0.5 flex min-w-0 items-baseline gap-3">
                    <h2 className="shrink-0 text-sm font-semibold text-white">{activeLayer.title}</h2>
                    <p className="hidden truncate text-xs text-[#9aa5a2] sm:block">{activeLayer.subtitle}</p>
                  </div>
                </div>
                <CheckpointRail progress={progress} activeIndex={activeIndex} onJump={jumpToLayer} />
              </div>
            </div>

            <div className="hidden h-full md:block">
              <HardwareViewport architecture={architecture} progress={progress} />
            </div>
            <div className="h-full md:hidden">
              <MobileHardwareViewport architecture={architecture} progress={progress} />
            </div>
          </div>
          <MinimalInfo architecture={architecture} activeLayer={activeLayer.id} />
        </section>
        <div className="pointer-events-none absolute inset-x-0 top-0">
          {layers.map((layer, index) => (
            <div
              key={layer.id}
              className="scroll-mt-0"
              style={{
                height: index === layers.length - 1 ? "100vh" : `${checkpointDistanceVh}vh`,
                scrollSnapAlign: "start",
                scrollSnapStop: "always"
              }}
            />
          ))}
        </div>
      </main>
    </TooltipProvider>
  );
}

function TooltipProvider({ children }: { children: ReactNode }) {
  const [tooltip, setTooltip] = useState<TooltipState>(null);

  return (
    <TooltipContext.Provider value={{ show: setTooltip, hide: () => setTooltip(null) }}>
      {children}
      {tooltip ? <FixedTooltip tooltip={tooltip} /> : null}
    </TooltipContext.Provider>
  );
}

function FixedTooltip({ tooltip }: { tooltip: NonNullable<TooltipState> }) {
  const left = Math.min(window.innerWidth - 332, Math.max(16, tooltip.x + 14));
  const top = Math.min(window.innerHeight - 218, Math.max(16, tooltip.y + 14));

  return (
    <div
      data-testid="fixed-tooltip"
      className="pointer-events-none fixed z-[100] w-80 border border-[#334044] bg-[#080b0c]/96 p-3 text-left shadow-[0_18px_45px_rgba(0,0,0,0.55)] backdrop-blur"
      style={{ left, top }}
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#9aa5a2]">{tooltip.title}</div>
      <p className="mt-2 whitespace-pre-line text-xs leading-5 text-[#d0d7d4]">{tooltip.body}</p>
    </div>
  );
}

function HardwareViewport({ architecture, progress }: { architecture: ArchitectureAsset; progress: number }) {
  const introStyle = layerInteractionStyle(progress, 0, { enterScale: 1, exitScale: 1.06, origin: "50% 50%" });
  const packageStyle = layerInteractionStyle(progress, 1, {
    enterScale: 0.94,
    exitScale: 1.28,
    exitX: -1,
    exitY: -2,
    origin: "50% 50%"
  });
  const dieStyle = layerInteractionStyle(progress, 2, {
    enterScale: 0.78,
    exitScale: 1.24,
    enterY: 4,
    exitX: -9,
    exitY: -4,
    origin: "45% 42%"
  });
  const smInternalStyle = layerInteractionStyle(progress, 3, {
    enterScale: 0.78,
    exitScale: 1.18,
    enterX: 8,
    enterY: 3,
    exitX: -8,
    exitY: -3,
    origin: "32% 70%"
  });
  const softwareMappingStyle = layerInteractionStyle(progress, 4, {
    enterScale: 0.78,
    enterX: 7,
    enterY: 4,
    origin: "47% 62%"
  });

  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 will-change-opacity" style={introStyle}>
        <IntroLayer architecture={architecture} />
      </div>

      <div className="absolute inset-0 flex items-center justify-center px-2 sm:px-4">
        <div className="relative aspect-[1.35] w-[min(99vw,calc((100vh-16px)*1.35))] max-w-none">
        <div
          className="absolute inset-0 will-change-opacity"
          style={packageStyle}
        >
          <PackageLayer architecture={architecture} />
        </div>

        <div
          className="absolute inset-0 will-change-opacity"
          style={dieStyle}
        >
          <DieLayer architecture={architecture} />
        </div>

        <div className="absolute inset-0 will-change-opacity" style={smInternalStyle}>
          <SmInternalLayer architecture={architecture} />
        </div>

        <div className="absolute inset-0 will-change-opacity" style={softwareMappingStyle}>
          <SoftwareMappingLayer architecture={architecture} />
        </div>
        </div>
      </div>
    </div>
  );
}

function MobileHardwareViewport({ architecture, progress }: { architecture: ArchitectureAsset; progress: number }) {
  const styles = layers.map((_, index) => layerInteractionStyle(progress, index, {
    enterScale: 0.96,
    exitScale: 1.04,
    enterY: 2,
    exitY: -2,
    origin: "50% 50%"
  }));

  return (
    <div className="absolute inset-x-0 bottom-0 top-[68px]">
      <div className="absolute inset-0 will-change-opacity" style={styles[0]}>
        <MobileIntro architecture={architecture} />
      </div>
      <div className="absolute inset-0 will-change-opacity" style={styles[1]}>
        <MobilePackage architecture={architecture} />
      </div>
      <div className="absolute inset-0 will-change-opacity" style={styles[2]}>
        <MobileComputeHierarchy architecture={architecture} />
      </div>
      <div className="absolute inset-0 will-change-opacity" style={styles[3]}>
        <MobileSm architecture={architecture} />
      </div>
      <div className="absolute inset-0 will-change-opacity" style={styles[4]}>
        <MobileSoftwareMapping architecture={architecture} />
      </div>
    </div>
  );
}

function MobileFrame({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center px-4 pb-5">
      <section className="max-h-full w-full overflow-hidden border border-[#314043] bg-[#0a0f10] shadow-[0_28px_80px_rgba(0,0,0,0.6)]">
        <header className="border-b border-[#263235] px-4 py-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#7f8d89]">{eyebrow}</p>
          <h3 className="mt-1 text-base font-semibold text-[#edf2f0]">{title}</h3>
        </header>
        <div className="p-3">{children}</div>
      </section>
    </div>
  );
}

function MobileIntro({ architecture }: { architecture: ArchitectureAsset }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#899793]">{architecture.architecture} architecture</p>
      <h1 className="mt-4 text-5xl font-semibold leading-none text-[#eef3f1]">NVIDIA H100</h1>
      <p className="mt-4 max-w-xs text-sm leading-6 text-[#aab5b1]">Scroll to dissect the package, compute hierarchy, one SM, and the CUDA/Triton execution model.</p>
      <div className="mt-8 grid w-full max-w-xs grid-cols-3 border-y border-[#293537] py-4">
        <MobileMetric label="Transistors" value={architecture.chip.transistors} />
        <MobileMetric label="Process" value={architecture.chip.process} />
        <MobileMetric label="SMs" value={architecture.floorplan.activeSmsTotal} />
      </div>
    </div>
  );
}

function MobileMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="px-1 text-center">
      <div className="font-mono text-[8px] uppercase tracking-[0.08em] text-[#74817d]">{label}</div>
      <div className="mt-1 text-xs font-semibold text-[#e0e7e4]">{value}</div>
    </div>
  );
}

function MobilePackage({ architecture }: { architecture: ArchitectureAsset }) {
  return (
    <MobileFrame eyebrow="Layer 1 / Package" title="GH100 die with HBM3">
      <div className="relative mx-auto aspect-square w-[min(100%,330px)] border border-[#3a4645] bg-[#151b1b] p-5">
        <div className="grid h-full grid-cols-[52px_1fr_52px] grid-rows-3 gap-3">
          {[0, 1, 2, 3, 4, 5].map((site) => (
            <div
              key={site}
              className={`flex items-center justify-center border font-mono text-[9px] ${site === 5 ? "border-[#333a39] bg-[#202525] text-[#65706d]" : "border-[#6c7673] bg-[#444d4a] text-[#e0e5e3]"} ${site < 3 ? "col-start-1" : "col-start-3"}`}
              style={{ gridRow: (site % 3) + 1 }}
            >
              {site === 5 ? "SITE" : `HBM${site + 1}`}
            </div>
          ))}
          <div className="col-start-2 row-span-3 row-start-1 flex flex-col items-center justify-center border border-[#69736f] bg-[radial-gradient(circle_at_40%_32%,#65706b,#293431_58%,#111716)] px-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,.16)]">
            <span className="font-mono text-xs font-semibold text-white">GH100</span>
            <span className="mt-1 font-mono text-[9px] text-[#c2cbc7]">{architecture.chip.dieArea}</span>
          </div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 border border-[#283436] bg-[#0d1415] py-3">
        <MobileMetric label="Memory" value="80 GB" />
        <MobileMetric label="Type" value="HBM3" />
        <MobileMetric label="Bandwidth" value={architecture.memorySystem.memoryBandwidth} />
      </div>
    </MobileFrame>
  );
}

function MobileComputeHierarchy({ architecture }: { architecture: ArchitectureAsset }) {
  return (
    <MobileFrame eyebrow="Layer 2 / Physical compute" title="GPU → GPC → TPC → SM">
      <div className="grid grid-cols-4 gap-1.5">
        {architecture.floorplan.activeSmsPerGpc.map((sms, index) => (
          <div key={index} className="border border-[#436064] bg-[#101d1f] p-2 text-center">
            <div className="font-mono text-[9px] font-semibold text-[#d7e2df]">GPC {index + 1}</div>
            <div className="mt-1 font-mono text-[8px] text-[#899995]">{sms / 2} TPC</div>
            <div className="mt-0.5 font-mono text-[8px] text-[#b7c5c1]">{sms} SM</div>
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2">
        <MobileHierarchyBox label="1 GPC" detail="8 or 9 TPC" />
        <span className="text-[#697572]">→</span>
        <MobileHierarchyBox label="1 TPC" detail="2 SM" />
        <span className="text-[#697572]">→</span>
        <MobileHierarchyBox label="1 SM" detail="execution" />
      </div>
      <div className="mt-3 border border-[#4a5b58] bg-[#192321] px-3 py-2">
        <div className="flex items-center justify-between font-mono text-[9px] uppercase text-[#d9e2df]">
          <span>Shared L2 cache</span>
          <span>{architecture.memorySystem.l2Cache}</span>
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-[#98a5a1]">H100 exposes {architecture.floorplan.activeGpcs} GPCs, {architecture.floorplan.activeTpcsTotal} TPCs, and {architecture.floorplan.activeSmsTotal} SMs. CUDA schedules blocks to SMs, not directly to GPCs or TPCs.</p>
    </MobileFrame>
  );
}

function MobileHierarchyBox({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="border border-[#334447] bg-[#0e1718] px-2 py-3 text-center">
      <div className="font-mono text-[9px] font-semibold text-[#e0e7e4]">{label}</div>
      <div className="mt-1 font-mono text-[8px] text-[#84918d]">{detail}</div>
    </div>
  );
}

function MobileSm({ architecture }: { architecture: ArchitectureAsset }) {
  const sm = architecture.streamingMultiprocessor;
  return (
    <MobileFrame eyebrow="Layer 3 / One streaming multiprocessor" title="H100 SM: four scheduler partitions">
      <div className="border border-[#4b6062] bg-[#263739] px-3 py-2 text-center font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-[#e2ece9]">
        SM-wide L1 instruction cache
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {Array.from({ length: sm.smPartitionsPerSm }).map((_, index) => (
          <div key={index} className="border border-[#314548] bg-[#0d1617] p-2">
            <div className="flex items-center justify-between font-mono text-[8px] uppercase text-[#8f9c98]">
              <span>Partition {index + 1}</span>
              <span>1 scheduler</span>
            </div>
            <div className="mt-2 border border-[#7b6134] bg-[#362612] px-2 py-1.5 text-center font-mono text-[8px] font-semibold text-[#f3e5cd]">Warp scheduler + dispatch</div>
            <div className="mt-1.5 border border-[#356064] bg-[#17383b] px-2 py-1.5 text-center font-mono text-[8px] text-[#dceae7]">Register file: 16,384 × 32-bit</div>
            <div className="mt-1.5 grid grid-cols-2 gap-1">
              <MobileUnit label="32 FP32" tone="fp" />
              <MobileUnit label="16 INT32" tone="int" />
              <MobileUnit label="16 FP64" tone="fp64" />
              <MobileUnit label="1 Tensor" tone="tensor" />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 border border-[#4d625b] bg-[#263a34] px-3 py-2 text-center font-mono text-[9px] font-semibold uppercase text-[#e1e9e5]">
        256 KB combined L1 data cache / shared memory
      </div>
      <p className="mt-2 text-[11px] leading-4 text-[#8f9c98]">Per SM: {sm.fp32CudaCoresPerSm} FP32, {sm.int32CoresPerSm} INT32, {sm.fp64CoresPerSm} FP64 and {sm.tensorCoresPerSm} Tensor Cores.</p>
    </MobileFrame>
  );
}

function MobileUnit({ label, tone }: { label: string; tone: "fp" | "int" | "fp64" | "tensor" }) {
  const toneClass = {
    fp: "border-[#5c6637] bg-[#32391d]",
    int: "border-[#4a604e] bg-[#263529]",
    fp64: "border-[#665d3d] bg-[#38321f]",
    tensor: "border-[#766a3b] bg-[#40391f]"
  }[tone];
  return <div className={`border px-1 py-2 text-center font-mono text-[8px] text-[#e0e6e2] ${toneClass}`}>{label}</div>;
}

function MobileSoftwareMapping({ architecture }: { architecture: ArchitectureAsset }) {
  const steps = [
    ["PyTorch", "z = x + y", "launches or compiles a GPU kernel"],
    ["Grid", "many programs / blocks", `distributed across ${architecture.floorplan.activeSmsTotal} SMs`],
    ["Program / block", "one data tile", "resides on one SM"],
    ["Warp", "32 CUDA threads", "issued by a warp scheduler"],
    ["Thread / lane", "load → add → store", "uses registers and execution lanes"]
  ];

  return (
    <MobileFrame eyebrow="Layer 4 / Programming model" title="Software → hardware mapping">
      <div className="space-y-1.5">
        {steps.map(([label, software, hardware], index) => (
          <div key={label}>
            <div className="grid grid-cols-[0.8fr_1fr] gap-2 border border-[#324447] bg-[#0f191a] p-2.5">
              <div>
                <div className="font-mono text-[9px] font-semibold uppercase text-[#dbe4e1]">{label}</div>
                <div className="mt-1 font-mono text-[8px] text-[#8d9a96]">{software}</div>
              </div>
              <div className="border-l border-[#344345] pl-2 font-mono text-[8px] leading-4 text-[#b9c4c0]">{hardware}</div>
            </div>
            {index < steps.length - 1 ? <div className="mx-auto h-2 w-px bg-[#596663]" /> : null}
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-4 gap-1">
        {[
          ["Registers", "thread"],
          ["Shared/L1", "SM"],
          ["L2", "GPU"],
          ["HBM3", "device"]
        ].map(([label, scope]) => (
          <div key={label} className="border border-[#3b4d4e] bg-[#151e1e] px-1 py-2 text-center">
            <div className="font-mono text-[8px] font-semibold text-[#dce4e1]">{label}</div>
            <div className="mt-1 font-mono text-[7px] uppercase text-[#788682]">{scope}</div>
          </div>
        ))}
      </div>
    </MobileFrame>
  );
}

function IntroLayer({ architecture }: { architecture: ArchitectureAsset }) {
  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_45%_42%,#152324_0%,#0b1011_48%,#050606_100%)]">
        <EtchOverlay opacity={0.16} />
        <div className="absolute inset-x-[8%] top-[18%] flex flex-col items-center text-center">
          <div className="font-mono text-xs font-semibold uppercase tracking-[0.28em] text-[#8d9a97]">
            {architecture.architecture} Architecture
          </div>
          <h2 className="mt-5 text-[clamp(72px,12vw,176px)] font-semibold leading-none tracking-normal text-[#eef3f1]">
            {architecture.name.replace(" Tensor Core GPU", "")}
          </h2>
          <div className="mt-7 h-px w-72 bg-[linear-gradient(90deg,#aebbb7,transparent)]" />
          <p className="mt-7 max-w-3xl text-2xl leading-9 text-[#aeb8b5]">
            Scroll to dissect
          </p>
        </div>
        <div className="absolute bottom-[11%] left-1/2 grid w-[min(100%-32px,900px)] -translate-x-1/2 grid-cols-2 gap-4 lg:grid-cols-4">
          <IntroFact label="Transistors" value={architecture.chip.transistors} />
          <IntroFact label="Die area" value={architecture.chip.dieArea} />
          <IntroFact label="Process" value={architecture.chip.process} />
          <IntroFact label="Active SMs" value={architecture.floorplan.activeSmsTotal} />
        </div>
      </div>
    </div>
  );
}

function IntroFact({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-44 border border-[#2c383a] bg-[#0e1415]/78 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#7f8b95]">{label}</div>
      <div className="mt-2 text-lg font-semibold text-[#e2e7e5]">{value}</div>
    </div>
  );
}

function PackageLayer({ architecture }: { architecture: ArchitectureAsset }) {
  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-[1.5%] border border-[#314846] bg-[radial-gradient(circle_at_42%_35%,#1d5655_0%,#153f40_45%,#102d2e_100%)] shadow-[0_40px_120px_rgba(0,0,0,0.68),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-18px_42px_rgba(0,0,0,0.28)]">
        <SubstrateGrid />
        <div className="absolute left-[10%] right-[10%] top-[7%] bottom-[7%] border border-[#252d30] bg-[linear-gradient(135deg,#171d20_0%,#0f1315_55%,#0b0e0f_100%)] shadow-[0_20px_70px_rgba(0,0,0,0.58),inset_0_1px_0_rgba(255,255,255,0.06)]">
          <MemoryPads side="top" />
          <MemoryPads side="bottom" />

          <HardwareHotspot
            className="absolute left-[32%] top-[13%] h-[74%] w-[36%]"
            title={`${architecture.gpuCodename} die`}
            body={`GPU silicon die: ${architecture.chip.dieArea}, ${architecture.chip.process}, ${architecture.chip.transistors}. ${architecture.name.split(" ")[1]} exposes ${architecture.floorplan.activeSmsTotal} of ${architecture.chip.fullGpuSmCount} ${architecture.gpuCodename} SMs.`}
          >
            <SiliconDie architecture={architecture} />
          </HardwareHotspot>

          <HbmSite x="15%" y="12%" active label="HBM3" architecture={architecture} />
          <HbmSite x="15%" y="38%" active label="HBM3" architecture={architecture} />
          <HbmSite x="15%" y="64%" active label="HBM3" architecture={architecture} />
          <HbmSite x="70%" y="12%" active label="HBM3" architecture={architecture} />
          <HbmSite x="70%" y="38%" active label="HBM3" architecture={architecture} />
          <HbmSite x="70%" y="64%" active={false} label="OFF" architecture={architecture} />
        </div>
      </div>
    </div>
  );
}

function DieLayer({ architecture }: { architecture: ArchitectureAsset }) {
  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-[6%] overflow-hidden border border-[#30393b] bg-[radial-gradient(circle_at_48%_36%,#1a2426_0%,#101516_48%,#090b0c_100%)] shadow-[0_42px_130px_rgba(0,0,0,0.68),inset_0_1px_0_rgba(255,255,255,0.07),inset_0_-26px_70px_rgba(0,0,0,0.38)]">
        <EtchOverlay opacity={0.26} />
        <div className="absolute left-[7%] right-[7%] top-[8%] h-[4%] border border-[#68736f] bg-[#191f20] text-center font-mono text-[10px] uppercase tracking-[0.14em] text-[#d8e1de]">
          <span className="flex h-full items-center justify-center">{architecture.gpuCodename} / {architecture.architecture} GPU die</span>
        </div>
        <div className="absolute left-[7%] right-[7%] top-[13%] h-[4%] border border-[#655d50] bg-[#342c22] text-center font-mono text-[10px] uppercase tracking-[0.14em] text-[#e3d5c3]">
          <span className="flex h-full items-center justify-center">host / NVLink / PCIe interface</span>
        </div>
        <MemoryControllerColumn side="left" architecture={architecture} />
        <MemoryControllerColumn side="right" architecture={architecture} />
        <div className="absolute left-[12%] right-[12%] top-[20%] bottom-[8%] z-20 grid grid-rows-[1fr_7%_1fr] gap-3">
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <GpcBlock key={index} index={index} architecture={architecture} />
            ))}
          </div>
          <L2CacheRow architecture={architecture} />
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, offset) => (
              <GpcBlock key={offset + 4} index={offset + 4} architecture={architecture} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function GpcBlock({ index, architecture }: { index: number; architecture: ArchitectureAsset }) {
            const isEnabledGpc = index < architecture.floorplan.activeGpcs;
            const tpcCount = isEnabledGpc ? architecture.floorplan.tpcsPerActiveGpc[index] : 0;
            const smCount = isEnabledGpc ? architecture.floorplan.activeSmsPerGpc[index] : 0;
            const isFullGpc = tpcCount === architecture.floorplan.fullTpcsPerGpc;

  return (
            <div
              className={`relative z-10 border p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),inset_0_-16px_26px_rgba(0,0,0,0.22),0_12px_30px_rgba(0,0,0,0.25)] ${
                isEnabledGpc
                  ? "border-[#365158] bg-[linear-gradient(135deg,#162c31_0%,#102126_58%,#0d181b_100%)]"
                  : "border-[#242b2c] bg-[#0b0f10] opacity-60"
              }`}
            >
              <div className="absolute inset-0 opacity-25" style={{ backgroundImage: "linear-gradient(rgba(182,204,200,.22) 1px, transparent 1px), linear-gradient(90deg, rgba(182,204,200,.16) 1px, transparent 1px)", backgroundSize: "22px 18px" }} />
              <div className="relative flex justify-between font-mono text-[10px] text-[#b9c6c2]">
                <HardwareHotspot
                  className="relative -ml-1 -mt-1 px-1 py-1"
                  title={`GPC ${index + 1}`}
                  body={isEnabledGpc ? `${architecture.name.split(" ")[1]}-enabled GPC: ${tpcCount}/${architecture.floorplan.fullTpcsPerGpc} TPCs and ${smCount}/${architecture.floorplan.fullTpcsPerGpc * architecture.floorplan.fullSmsPerTpc} SMs. ${isFullGpc ? "Full GPC." : "Partial GPC: one TPC slot is disabled, so 2 SMs are not exposed."}` : `Disabled/unexposed GPC slot. Full ${architecture.gpuCodename} has ${architecture.floorplan.fullGpcs} GPC slots.`}
                  tooltipSide={index > 3 ? "top" : "bottom"}
                >
                  <span>GPC {index + 1}</span>
                </HardwareHotspot>
                <span>{isEnabledGpc ? `${tpcCount} TPC / ${smCount} SM` : "off"}</span>
              </div>
              <div className="relative mt-3 grid h-[calc(100%-34px)] grid-cols-3 grid-rows-3 gap-1.5">
                {Array.from({ length: architecture.floorplan.fullTpcsPerGpc }).map((_, cell) => (
                  <TpcCell
                    key={cell}
                    index={cell}
                    active={cell < tpcCount}
                    smsPerTpc={architecture.floorplan.fullSmsPerTpc}
                    gpcIndex={index}
                    gpuCodename={architecture.gpuCodename}
                    tooltipSide={index > 3 ? "top" : "bottom"}
                  />
                ))}
              </div>
            </div>
  );
}

function L2CacheRow({ architecture }: { architecture: ArchitectureAsset }) {
  return (
    <HardwareHotspot
      className="relative flex h-full items-center justify-center border border-[#6f7b77]/85 bg-[linear-gradient(90deg,#293331,#52605b,#293331)] shadow-[0_0_24px_rgba(142,158,151,0.16),inset_0_1px_0_rgba(255,255,255,0.13),inset_0_0_32px_rgba(170,186,178,0.12)]"
      title="Shared L2 cache"
      body={`${architecture.memorySystem.l2Cache} shared on-chip L2 cache. It caches traffic between SMs and HBM memory controllers. This outline is schematic, not exact die-mask placement.`}
      tooltipSide="top"
    >
      <div className="text-center font-mono text-[11px] uppercase tracking-[0.16em] text-[#e0e8e5]">
        {architecture.memorySystem.l2Cache} shared L2 cache
      </div>
    </HardwareHotspot>
  );
}

function MemoryControllerColumn({ side, architecture }: { side: "left" | "right"; architecture: ArchitectureAsset }) {
  const controllersPerSide = architecture.floorplan.memoryControllers / 2;

  return (
    <div className={`absolute top-[20%] bottom-[8%] ${side === "left" ? "left-[3%]" : "right-[3%]"} grid w-[6%] grid-rows-5 gap-3`}>
      {Array.from({ length: controllersPerSide }).map((_, index) => {
        const id = side === "left" ? index : index + controllersPerSide;

        return (
          <HardwareHotspot
            key={id}
            className="relative flex items-center justify-center border border-[#695f50] bg-[linear-gradient(135deg,#6d6458,#2a2d2e)] shadow-[inset_0_1px_0_rgba(255,255,255,0.13),0_8px_18px_rgba(0,0,0,0.28)]"
            title={`Memory controller ${id + 1}`}
            body={`One of ${architecture.floorplan.memoryControllers} active ${architecture.floorplan.memoryControllerWidth} memory-controller blocks connecting ${architecture.gpuCodename} memory traffic toward HBM.`}
            tooltipSide={side === "left" ? "right" : "left"}
          >
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#e0d8c8]/85 [writing-mode:vertical-rl]">MC{id + 1}</span>
          </HardwareHotspot>
        );
      })}
    </div>
  );
}

function TpcCell({ index, active, smsPerTpc, gpcIndex, gpuCodename, tooltipSide }: { index: number; active: boolean; smsPerTpc: number; gpcIndex: number; gpuCodename: string; tooltipSide: TooltipSide }) {
  if (!active) {
    return (
      <div className="grid min-h-0 grid-cols-2 gap-1 border border-[#202728] bg-[#080b0c] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        {Array.from({ length: smsPerTpc }).map((_, sm) => (
          <DieSmMini key={sm} active={false} label={sm === 0 ? "off" : ""} />
        ))}
      </div>
    );
  }

  return (
    <HardwareHotspot
      className="grid min-h-0 grid-rows-[13px_1fr] gap-1 border border-[#4f777c]/80 bg-[linear-gradient(135deg,#0d1c1f,#081113)] p-1.5 shadow-[0_0_10px_rgba(34,83,89,0.18),inset_0_1px_0_rgba(255,255,255,0.08)]"
      title={`TPC ${index + 1}`}
      body={`Texture Processing Cluster inside GPC ${gpcIndex + 1}. On ${gpuCodename}, each TPC contains ${smsPerTpc} SMs. For deep learning, the SMs and Tensor Cores are the important part; raster/RT details are skipped.`}
      tooltipSide={tooltipSide}
    >
      <span className="font-mono text-[7px] uppercase tracking-[0.08em] text-[#b8cac8]">TPC {index + 1}</span>
      <span className="grid min-h-0 grid-cols-2 gap-1">
        {Array.from({ length: smsPerTpc }).map((_, sm) => (
          <DieSmMini key={sm} active label={`SM${sm + 1}`} />
        ))}
      </span>
    </HardwareHotspot>
  );
}

function DieSmMini({ active, label }: { active: boolean; label?: string }) {
  if (!active) {
    return <span className="min-h-0 border border-[#202728] bg-[#050708] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]" />;
  }

  return (
    <span className="relative flex min-h-0 items-center justify-center border border-[#4f6f72]/80 bg-[linear-gradient(180deg,#29484c,#173237)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_1px_4px_rgba(0,0,0,0.24)]">
      {label ? <span className="font-mono text-[7px] uppercase tracking-[0.08em] text-[#d0dad7]">{label}</span> : null}
    </span>
  );
}

function HardwareHotspot({ className, title, body, children, style, tooltipSide = "bottom" }: { className: string; title: string; body: string; children: ReactNode; style?: CSSProperties; tooltipSide?: TooltipSide }) {
  const positioning = className.includes("absolute") ? "" : "relative";
  const tooltip = useContext(TooltipContext);

  return (
    <div
      className={`${positioning} hover:z-50 ${className}`}
      style={style}
      onMouseEnter={(event) => tooltip?.show({ title, body, x: event.clientX, y: event.clientY })}
      onMouseMove={(event) => tooltip?.show({ title, body, x: event.clientX, y: event.clientY })}
      onMouseLeave={() => tooltip?.hide()}
      data-tooltip-side={tooltipSide}
    >
      {children}
    </div>
  );
}

function SiliconDie({ architecture }: { architecture: ArchitectureAsset }) {
  return (
    <div className="relative h-full w-full overflow-hidden border border-[#68736f]/55 bg-[radial-gradient(circle_at_38%_28%,#6d7772_0%,#384440_34%,#192321_72%,#0a0e0e_100%)] shadow-[0_18px_50px_rgba(0,0,0,0.58),inset_0_1px_0_rgba(255,255,255,0.16),inset_0_-18px_34px_rgba(0,0,0,0.36)]">
      <div
        className="absolute inset-0 opacity-28"
        style={{
          backgroundImage:
            "linear-gradient(rgba(214,224,220,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(214,224,220,.07) 1px, transparent 1px)",
          backgroundSize: "16px 16px"
        }}
      />
      <div className="absolute inset-[7%] bg-[radial-gradient(circle_at_52%_45%,rgba(175,190,184,.16),rgba(88,105,101,.1)_42%,rgba(20,29,31,.06)_70%)] shadow-[inset_0_0_34px_rgba(0,0,0,0.3)]" />
      <div className="absolute inset-[13%] opacity-14" style={{ backgroundImage: "linear-gradient(90deg,transparent,rgba(210,221,217,.22),transparent)", backgroundSize: "100% 1px" }} />
      <div className="absolute left-3 top-3 border border-[#9ca6a2]/40 bg-[#111718]/82 px-2 py-1 font-mono text-[10px] text-[#d7dedb]">
        {architecture.gpuCodename} / {architecture.chip.dieArea}
      </div>
    </div>
  );
}

function SmInternalLayer({ architecture }: { architecture: ArchitectureAsset }) {
  const sm = architecture.streamingMultiprocessor;

  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-[5%] overflow-hidden border border-[#30383a] bg-[radial-gradient(circle_at_48%_38%,#192123_0%,#0e1213_56%,#070909_100%)] shadow-[0_44px_130px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.06)]">
        <EtchOverlay opacity={0.18} />
        <div className="absolute left-[4%] top-[5%] h-[90%] w-[92%] border border-[#354345] bg-[linear-gradient(135deg,#101617,#080b0c)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <div className="grid h-full grid-rows-[34px_30px_1fr_34px_30px] gap-2.5">
            <div className="flex items-center justify-between gap-4 border-b border-[#263334] pb-2">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#aab5b2]">{sm.name}</div>
              <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#7f8d89]">
                {sm.smPartitionsPerSm} partitions / {sm.fp32CudaCoresPerSm} FP32 / {sm.int32CoresPerSm} INT32 / {sm.fp64CoresPerSm} FP64 / {sm.tensorCoresPerSm} Tensor
              </div>
            </div>
            <HardwareHotspot
              className="flex items-center justify-center border border-[#4c6264] bg-[linear-gradient(90deg,#223134,#405052,#223134)] font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#dbe5e2] shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]"
              title="L1 instruction cache"
              body="Instruction cache feeding the four scheduler partitions in the SM."
            >
              SM-wide L1 Instruction Cache
            </HardwareHotspot>
            <div className="grid min-h-0 grid-cols-2 grid-rows-2 gap-3">
              {Array.from({ length: sm.smPartitionsPerSm }).map((_, index) => (
                <SmPartition key={index} index={index} architecture={architecture} />
              ))}
            </div>
            <HardwareHotspot
              className="flex items-center justify-center border border-[#4d625b] bg-[linear-gradient(90deg,#1e2c29,#4b5f56,#1e2c29)] px-3 text-center font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#e0e9e4] shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]"
              title="L1 data cache / shared memory"
              body={`${sm.l1AndSharedMemoryCapacity}. CUDA shared memory is programmer-managed storage inside this SM-local block; L1 is hardware-managed cache.`}
            >
              256 KB L1 Data Cache / Shared Memory
            </HardwareHotspot>
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: sm.textureUnitsPerSm }).map((_, index) => (
                <HardwareHotspot
                  key={index}
                  className="flex items-center justify-center border border-[#344f65] bg-[linear-gradient(180deg,#233d52,#162838)] font-mono text-[9px] font-semibold uppercase tracking-[0.13em] text-[#cad8df]"
                  title={`Texture unit ${index + 1}`}
                  body={`${sm.textureUnitsPerSm} texture units per SM are documented for H100. They are shown because they are physical SM hardware, even though this visualization focuses on compute/deep-learning paths.`}
                >
                  TEX
                </HardwareHotspot>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SmPartition({ index, architecture }: { index: number; architecture: ArchitectureAsset }) {
  const sm = architecture.streamingMultiprocessor;
  const partitionCount = sm.smPartitionsPerSm;
  const fp32PerPartition = sm.fp32CudaCoresPerSm / partitionCount;
  const int32PerPartition = sm.int32CoresPerSm / partitionCount;
  const fp64PerPartition = sm.fp64CoresPerSm / partitionCount;
  const tensorPerPartition = sm.tensorCoresPerSm / partitionCount;
  const registersPerPartition = architecture.executionModel.maxRegistersPerSm32Bit / partitionCount;

  return (
    <div className="grid min-h-0 grid-rows-[18px_1fr_23px] gap-2 border border-[#304245] bg-[linear-gradient(135deg,#111b1d,#090f10)] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_10px_28px_rgba(0,0,0,0.26)]">
      <HardwareHotspot
        className="flex min-h-0 items-center justify-between font-mono text-[9px] uppercase tracking-[0.08em] text-[#aab6b2]"
        title={`SM partition ${index + 1}`}
        body={`One of ${partitionCount} scheduler partitions inside the H100 SM. Per partition: ${fp32PerPartition} FP32 CUDA cores, ${int32PerPartition} INT32 cores, ${fp64PerPartition} FP64 cores, and ${tensorPerPartition} Tensor Core.`}
      >
        <span>Partition {index + 1}</span>
        <span>{fp32PerPartition} FP32 / {int32PerPartition} INT / {fp64PerPartition} FP64</span>
      </HardwareHotspot>
      <div className="grid min-h-0 grid-cols-[0.74fr_1.8fr_0.82fr] gap-2">
        <div className="grid min-h-0 grid-rows-[1fr_1fr_1fr] gap-1.5">
          <SmBar title="L0 instruction cache" body="Partition-local instruction cache feeding this scheduler/dispatch path." tone="icache">L0 Instruction Cache</SmBar>
          <SmBar title="Warp scheduler" body={`Yes, this is real hardware. H100 exposes ${sm.warpSchedulersPerSm} warp schedulers per SM, shown as one scheduler lane per partition. It selects ready 32-thread warp instructions.`} tone="scheduler">Warp Scheduler</SmBar>
          <SmBar title="Dispatch unit" body="Dispatch sends issued warp instructions to FP, INT, Tensor, memory, or special-function execution paths." tone="dispatch">Dispatch Unit</SmBar>
        </div>
        <div className="grid min-h-0 grid-rows-[38px_1fr] gap-1.5">
          <SmBar title="Register file slice" body={`${sm.smRegisterFile} total; shown split into ${partitionCount} slices of ${registersPerPartition.toLocaleString()} 32-bit registers for readability.`} tone="register">
            Register File<br />{registersPerPartition.toLocaleString()} x 32-bit
          </SmBar>
          <div className="grid min-h-0 grid-cols-[1fr_1fr_1.25fr] gap-1.5">
            <CoreGrid count={fp64PerPartition} label="FP64" tone="fp64" tooltip={`${fp64PerPartition} FP64 cores in this partition, ${sm.fp64CoresPerSm} per SM.`} columns={2} />
            <CoreGrid count={int32PerPartition} label="INT32" tone="int" tooltip={`${int32PerPartition} INT32 cores in this partition, ${sm.int32CoresPerSm} per SM. Integer units handle address math and integer instructions.`} columns={2} />
            <CoreGrid count={fp32PerPartition} label="FP32" tone="fp32" tooltip={`${fp32PerPartition} FP32 CUDA cores in this partition, ${sm.fp32CudaCoresPerSm} per SM.`} columns={4} />
          </div>
        </div>
        <div className="grid min-h-0 grid-rows-[1fr_0.55fr] gap-1.5">
          <TensorCoreBlock count={tensorPerPartition} smTensorCount={sm.tensorCoresPerSm} />
          <SmBar title="SFU path" body="Special Function Units execute operations such as transcendental approximations. Public H100 material does not expose an exact transistor-mask placement here." tone="sfu">SFU</SmBar>
        </div>
      </div>
      <div className="grid grid-cols-8 gap-1">
        {Array.from({ length: 8 }).map((_, unitIndex) => (
          <SmBar key={unitIndex} title="Load/store path" body="Load/store hardware moves data between registers, shared memory/L1, L2, and HBM through the memory path." tone="ldst">LD/ST</SmBar>
        ))}
      </div>
    </div>
  );
}

function SmBar({ children, title, body, tone }: { children: ReactNode; title: string; body: string; tone: "icache" | "scheduler" | "dispatch" | "register" | "sfu" | "ldst" }) {
  const toneClass = {
    icache: "border-[#4b6264] bg-[linear-gradient(180deg,#304b4f,#1b2f32)] text-[#dbe8e6]",
    scheduler: "border-[#8b6b38] bg-[linear-gradient(180deg,#836027,#392815)] text-[#fff1dc]",
    dispatch: "border-[#765035] bg-[linear-gradient(180deg,#704326,#351b10)] text-[#ffe9dc]",
    register: "border-[#3a6466] bg-[linear-gradient(180deg,#255356,#143639)] text-[#e4f2ef]",
    sfu: "border-[#68473d] bg-[linear-gradient(180deg,#6b3c32,#351c18)] text-[#f2ded8]",
    ldst: "border-[#654239] bg-[linear-gradient(180deg,#57312a,#26120f)] text-[#ead8d2]"
  }[tone];

  return (
    <HardwareHotspot
      className={`flex min-h-0 items-center justify-center border px-1 text-center font-mono text-[9px] font-semibold uppercase leading-[1.08] tracking-[0.02em] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] ${toneClass}`}
      title={title}
      body={body}
    >
      {children}
    </HardwareHotspot>
  );
}

function CoreGrid({ count, label, tone, tooltip, columns }: { count: number; label: string; tone: "fp32" | "int" | "fp64"; tooltip: string; columns: 2 | 4 }) {
  const color = {
    fp32: "border-[#5b6634] bg-[linear-gradient(180deg,#8b9351,#454f24)]",
    int: "border-[#4a5f4b] bg-[linear-gradient(180deg,#6b7d61,#354532)]",
    fp64: "border-[#5b5437] bg-[linear-gradient(180deg,#756b43,#38351f)]"
  }[tone];

  return (
    <HardwareHotspot
      className="grid min-h-0 grid-rows-[13px_1fr] border border-[#253839] bg-[#081011] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
      title={`${count} ${label} cores`}
      body={tooltip}
    >
      <div className="text-center font-mono text-[8px] font-semibold uppercase tracking-[0.05em] text-[#b8c4bf]">{label}</div>
      <div className={`grid min-h-0 gap-px ${columns === 4 ? "grid-cols-4" : "grid-cols-2"}`}>
        {Array.from({ length: count }).map((_, index) => (
          <span key={index} className={`flex min-h-0 items-center justify-center border ${color} text-[0] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]`} />
        ))}
      </div>
    </HardwareHotspot>
  );
}

function TensorCoreBlock({ count, smTensorCount }: { count: number; smTensorCount: number }) {
  return (
    <HardwareHotspot
      className="relative min-h-0 overflow-hidden border border-[#7a6f3c] bg-[linear-gradient(180deg,#6f6539,#37311d)] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
      title="Tensor Core"
      body={`${count} Tensor Core in this partition, ${smTensorCount} per H100 SM. This is the matrix engine used by deep-learning MMA operations.`}
    >
      <div className="grid h-full grid-cols-4 grid-rows-6 gap-px opacity-45">
        {Array.from({ length: 24 }).map((_, index) => (
          <span key={index} className="border border-[#403919] bg-[#95864a]" />
        ))}
      </div>
      <span className="absolute inset-0 flex items-center justify-center px-1 text-center font-mono text-[9px] font-bold uppercase leading-[1.05] text-[#fff2cc]">
        Tensor Core
      </span>
    </HardwareHotspot>
  );
}

function SoftwareMappingLayer({ architecture }: { architecture: ArchitectureAsset }) {
  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-[5%] overflow-hidden border border-[#2f3839] bg-[radial-gradient(circle_at_47%_36%,#181f20_0%,#0d1112_58%,#060707_100%)] shadow-[0_44px_130px_rgba(0,0,0,0.72),inset_0_1px_0_rgba(255,255,255,0.06)]">
        <EtchOverlay opacity={0.16} />
        <div className="absolute left-[5%] top-[7%] h-[86%] w-[90%] border border-[#374d50] bg-[linear-gradient(135deg,#101617,#090d0e)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <div className="flex items-center justify-between gap-4">
            <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#aab5b2]">CUDA / Triton to H100 hardware</div>
            <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#7f8d89]">
              GPU &gt; {architecture.floorplan.activeGpcs} GPC &gt; {architecture.floorplan.activeTpcsTotal} TPC &gt; {architecture.floorplan.activeSmsTotal} SM
            </div>
          </div>

          <ExampleTrace />

          <div className="mt-3 grid h-[calc(100%-82px)] grid-rows-[1fr_0.42fr] gap-4">
            <div className="grid min-h-0 grid-cols-[1fr_0.72fr_1fr] gap-4">
              <SoftwareHierarchy architecture={architecture} />
              <MappingRules architecture={architecture} />
              <HardwareHierarchy architecture={architecture} />
            </div>
            <MemoryHierarchy architecture={architecture} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ExampleTrace() {
  const steps = [
    ["PyTorch", "z = x + y"],
    ["Triton launch", "add_kernel[grid](...)"],
    ["Program", "pid = tl.program_id(0)"],
    ["Data", "load -> add -> store"]
  ];

  return (
    <div className="mt-3 grid h-9 grid-cols-4 gap-2">
      {steps.map(([label, code], index) => (
        <div key={label} className="relative flex min-w-0 items-center gap-2 border border-[#2d3d40] bg-[#0a1011] px-3">
          <span className="shrink-0 font-mono text-[8px] uppercase tracking-[0.08em] text-[#788682]">{label}</span>
          <code className="min-w-0 truncate font-mono text-[9px] text-[#d4ddda]">{code}</code>
          {index < steps.length - 1 ? <span className="absolute -right-[7px] top-1/2 z-10 h-px w-[7px] bg-[#65716d]" /> : null}
        </div>
      ))}
    </div>
  );
}

function SoftwareHierarchy({ architecture }: { architecture: ArchitectureAsset }) {
  return (
    <div className="grid min-h-0 grid-rows-[22px_1fr] gap-3 border border-[#344345] bg-[linear-gradient(135deg,#0b1112,#10191a)] p-4">
      <SectionLabel label="software / launch model" />
      <div className="grid min-h-0 grid-rows-5 gap-2">
        <HierarchyNode label="PyTorch operation" detail="tensor expression" example="z = x + y or compiled = torch.compile(fn)" tone="software" />
        <HierarchyNode label="Launch grid" detail="many programs / blocks" example="Triton: grid = (ceil_div(N, BLOCK_SIZE),)" tone="software" />
        <HierarchyNode label="Program / CUDA block" detail="one data tile" example="pid = tl.program_id(0); offsets = pid * BLOCK_SIZE + tl.arange(...)" tone="software" />
        <HierarchyNode label="Warp" detail={`${architecture.executionModel.threadsPerWarp} CUDA threads`} example="CUDA threads 0-31 form warp 0; Triton compiler creates warps for a program." tone="warp" />
        <HierarchyNode label="CUDA thread / Triton lane" detail="compiler-mapped values" example="CUDA: i = blockIdx.x * blockDim.x + threadIdx.x; Triton: offsets = block_start + tl.arange(...)" tone="thread" />
      </div>
    </div>
  );
}

function MappingRules({ architecture }: { architecture: ArchitectureAsset }) {
  const rules = [
    ["operation", "kernel launch"],
    ["grid", "distributed across GPU"],
    ["program / block", "scheduled to one SM"],
    ["warp", "issued by scheduler"],
    ["thread / lane", "execution + register state"]
  ];

  return (
    <div className="grid min-h-0 grid-rows-[22px_1fr] gap-3 border-y border-[#344345] bg-[#0a0f10] px-2 py-4">
      <SectionLabel label="mapping" />
      <div className="grid min-h-0 grid-rows-5 gap-2">
        {rules.map(([left, right], index) => (
          <HardwareHotspot
            key={left}
            className="grid min-h-0 grid-cols-[0.72fr_auto_1fr] items-center gap-2 px-1"
            title={`${left} -> ${right}`}
            body={mappingTooltip(index, architecture)}
          >
            <span className="text-right font-mono text-[8px] uppercase tracking-[0.05em] text-[#8c9894]">{left}</span>
            <span className="h-px w-7 bg-[#6e7a76]" />
            <span className="font-mono text-[8px] uppercase leading-[1.15] tracking-[0.05em] text-[#c7d0cd]">{right}</span>
          </HardwareHotspot>
        ))}
      </div>
    </div>
  );
}

function mappingTooltip(index: number, architecture: ArchitectureAsset) {
  return [
    "PyTorch eager execution launches an existing CUDA kernel for an operation. torch.compile can fuse operations and generate optimized kernels, often through TorchInductor/Triton on CUDA.\n\nExample: z = x + y launches elementwise GPU work; torch.compile may fuse this add with neighboring operations.",
    `A launch grid's independent Triton programs or CUDA blocks are distributed across the ${architecture.floorplan.activeSmsTotal} enabled SMs.\n\nExample: N=98,432 and BLOCK_SIZE=1,024 creates 97 Triton program instances.`,
    "A CUDA block stays on one SM for its lifetime. A Triton program describes one tile of work and is lowered by the compiler into GPU execution resources.\n\nExample: program pid=3 handles offsets 3,072 through 4,095 when BLOCK_SIZE=1,024.",
    `The SM partitions resident CUDA threads into ${architecture.executionModel.threadsPerWarp}-thread warps. A hardware warp scheduler chooses a ready warp.\n\nExample: a 256-thread CUDA block contains 8 warps.`,
    "Each active CUDA thread occupies one warp lane for an issued instruction and owns register state. Triton expresses vectors of values and the compiler maps them onto threads/lanes.\n\nExample: offsets = block_start + tl.arange(0, BLOCK_SIZE)."
  ][index];
}

function HierarchyNode({ label, detail, example, tone }: { label: string; detail: string; example?: string; tone: "software" | "warp" | "thread" }) {
  const toneClass = {
    software: "border-[#3e5b60] bg-[#122225]",
    warp: "border-[#75613c] bg-[#2b2113]",
    thread: "border-[#5a5f4b] bg-[#1c2118]"
  }[tone];

  return (
    <HardwareHotspot
      className={`grid min-h-0 grid-cols-[0.85fr_1fr] items-center gap-3 border px-3 py-2 ${toneClass}`}
      title={label}
      body={`${label}: ${detail}. This is part of the software execution model, not a separate physical chip block.${example ? `\n\nExample: ${example}` : ""}`}
    >
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[#dce5e2]">{label}</span>
      <span className="text-right font-mono text-[9px] uppercase tracking-[0.05em] text-[#9fa9a5]">{detail}</span>
    </HardwareHotspot>
  );
}

function HardwareHierarchy({ architecture }: { architecture: ArchitectureAsset }) {
  return (
    <div className="grid min-h-0 grid-rows-[22px_1fr] gap-3 border border-[#344345] bg-[linear-gradient(135deg,#10191a,#0b1112)] p-4">
      <SectionLabel label="hardware target / behavior" />
      <div className="grid min-h-0 grid-rows-5 gap-2">
        <HierarchyNode label="Compiled GPU kernel" detail="machine instructions" example="Loads x/y, performs FP32 add, then stores z." tone="software" />
        <HierarchyNode label="H100 GPU" detail={`${architecture.floorplan.activeSmsTotal} enabled SMs`} example="The 97 vector-add programs can run across whichever SMs are available." tone="software" />
        <HierarchyNode label="One SM" detail={`up to ${architecture.executionModel.maxThreadBlocksPerSm} resident blocks`} example="Several programs/blocks may be resident if register and shared-memory usage allows." tone="software" />
        <HierarchyNode label="Warp scheduler" detail={`${architecture.streamingMultiprocessor.warpSchedulersPerSm} per SM`} example="It issues a ready warp's load, FP32 add, or store instruction." tone="warp" />
        <HierarchyNode label="Execution lanes" detail="LD/ST + FP32 for vector add" example="tl.load uses load/store hardware; x + y uses FP32 execution lanes; tl.store writes results." tone="thread" />
      </div>
    </div>
  );
}

function MemoryHierarchy({ architecture }: { architecture: ArchitectureAsset }) {
  const levels = [
    {
      label: "Registers",
      scope: "thread state",
      detail: architecture.streamingMultiprocessor.smRegisterFile,
      example: "x, y, output and address temporaries after tl.load",
      tone: "register"
    },
    {
      label: "Shared memory / L1",
      scope: "one SM",
      detail: architecture.streamingMultiprocessor.l1AndSharedMemoryCapacity,
      example: "A tiled matmul stages reusable A/B tiles here; basic vector-add may not use shared memory.",
      tone: "shared"
    },
    {
      label: "L2 cache",
      scope: "all SMs",
      detail: architecture.memorySystem.l2Cache,
      example: "x and y cache lines may be reused here before another HBM3 request.",
      tone: "l2"
    },
    {
      label: "HBM3",
      scope: "device memory",
      detail: `${architecture.memorySystem.deviceMemory} / ${architecture.memorySystem.memoryBandwidth}`,
      example: "PyTorch CUDA tensors x, y and z physically reside in HBM3.",
      tone: "hbm"
    }
  ] as const;

  return (
    <div className="grid min-h-0 grid-rows-[20px_1fr] gap-2 border border-[#344345] bg-[#0a1011] p-3">
      <div className="flex items-center justify-between">
        <SectionLabel label="memory hierarchy" />
        <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-[#72807c]">lower latency / smaller capacity to higher latency / larger capacity</span>
      </div>
      <div className="grid min-h-0 grid-cols-4 gap-2">
        {levels.map((level, index) => (
          <MemoryLevel key={level.label} {...level} index={index} />
        ))}
      </div>
    </div>
  );
}

function MemoryLevel({ label, scope, detail, example, tone, index }: { label: string; scope: string; detail: string; example: string; tone: "register" | "shared" | "l2" | "hbm"; index: number }) {
  const toneClass = {
    register: "border-[#6c603d] bg-[#282112]",
    shared: "border-[#4f675d] bg-[#1a2924]",
    l2: "border-[#475f63] bg-[#172629]",
    hbm: "border-[#596361] bg-[#242c2b]"
  }[tone];

  return (
    <HardwareHotspot
      className={`relative grid min-h-0 grid-rows-[16px_1fr] border px-3 py-2 ${toneClass}`}
      title={label}
      body={`${label}: ${detail}. Scope: ${scope}.\n\nExample: ${example}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-[#dce5e2]">{label}</span>
        <span className="font-mono text-[8px] uppercase text-[#8e9a96]">{scope}</span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <span className="text-xs leading-4 text-[#aeb9b5]">{detail}</span>
        <span className="font-mono text-lg text-[#6f7b77]">0{index + 1}</span>
      </div>
    </HardwareHotspot>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9aa5a2]">{label}</div>;
}

function HbmSite({ x, y, active, label, architecture }: { x: string; y: string; active: boolean; label: string; architecture: ArchitectureAsset }) {
  return (
    <HardwareHotspot
      className={`absolute h-[21%] w-[15%] border shadow-[0_10px_24px_rgba(0,0,0,0.36)] ${active ? "border-[#737d7a] bg-[linear-gradient(135deg,#303838,#596260,#2b3132)]" : "border-[#383d3d] bg-[#242829]"}`}
      title={active ? "Active HBM stack" : "Inactive HBM site"}
      body={active ? `Physical HBM stack. ${architecture.name.split(" ")[1]} exposes ${architecture.memorySystem.deviceMemory} at ${architecture.memorySystem.memoryBandwidth}; active stacks act as one CUDA device-memory pool.` : `Physical HBM site shown inactive/unused in this ${architecture.name.split(" ")[1]} configuration.`}
      style={{ left: x, top: y }}
    >
      <div className={`absolute inset-[10%] ${active ? "bg-[linear-gradient(135deg,#737c78,#9aa19c,#5e6663)] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]" : "bg-[#1a1d1e]"}`} />
      <span className={`absolute left-1 top-1 font-mono text-[9px] ${active ? "text-[#d6dcda]" : "text-[#777f7d]"}`}>{label}</span>
    </HardwareHotspot>
  );
}

function MemoryPads({ side }: { side: "top" | "bottom" }) {
  return (
    <HardwareHotspot
      className={`absolute left-[23%] right-[23%] ${side === "top" ? "top-[8%]" : "bottom-[8%]"} flex justify-between`}
      title="Package signal pads"
      body="Package routing contacts around the die. They represent physical electrical paths on the package, not CUDA-visible memory blocks."
    >
      {Array.from({ length: 20 }).map((_, index) => (
        <span key={index} className="h-2 w-1.5 bg-[linear-gradient(180deg,#d1c4a8,#9e8f6d)]" />
      ))}
    </HardwareHotspot>
  );
}

function SubstrateGrid() {
  return (
    <div
      className="absolute inset-0 opacity-35"
      style={{
        backgroundImage:
          "linear-gradient(rgba(135,160,156,.16) 1px, transparent 1px), linear-gradient(90deg, rgba(135,160,156,.16) 1px, transparent 1px)",
        backgroundSize: "34px 34px"
      }}
    />
  );
}

function EtchOverlay({ opacity }: { opacity: number }) {
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        opacity,
        backgroundImage:
          "linear-gradient(0deg, rgba(200,213,210,.14) 1px, transparent 1px), linear-gradient(90deg, rgba(200,213,210,.09) 1px, transparent 1px)",
        backgroundSize: "42px 42px"
      }}
    />
  );
}

function CheckpointRail({ progress, activeIndex, onJump }: { progress: number; activeIndex: number; onJump: (index: number) => void }) {
  return (
    <div className="relative h-5 w-[min(46vw,520px)] shrink-0">
      <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-[#222829]" />
      <div className="absolute left-0 top-1/2 h-px -translate-y-1/2 bg-[#aebbb7]" style={{ width: `${progress * 100}%` }} />
      {layers.map((layer, index) => {
        const x = layers.length === 1 ? 0 : (index / (layers.length - 1)) * 100;
        const isActive = index === activeIndex;

        return (
          <button
            type="button"
            key={layer.id}
            onClick={() => onJump(index)}
            className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 border transition-colors ${
              isActive ? "border-[#e1e7e4] bg-[#c3cfcb]" : index < activeIndex ? "border-[#aebbb7] bg-[#6d7975]" : "border-[#3c4446] bg-[#101414]"
            }`}
            style={{ left: `${x}%` }}
            title={layer.title}
            aria-label={`Jump to ${layer.title}`}
          />
        );
      })}
    </div>
  );
}

function layerOpacity(progress: number, index: number) {
  const total = layers.length - 1;
  const center = total === 0 ? 0 : index / total;
  const step = total === 0 ? 1 : 1 / total;
  return Math.max(0, Math.min(1, 1 - Math.abs(progress - center) / (step * 0.72)));
}

function layerInteractionStyle(progress: number, index: number, motion: LayerMotion = {}) {
  const opacity = layerOpacity(progress, index);
  const total = layers.length - 1;
  const center = total === 0 ? 0 : index / total;
  const step = total === 0 ? 1 : 1 / total;
  const local = Math.max(-1, Math.min(1, (progress - center) / step));
  const enterScale = motion.enterScale ?? 0.92;
  const exitScale = motion.exitScale ?? 1.12;
  const scale = local < 0 ? mix(enterScale, 1, local + 1) : mix(1, exitScale, local);
  const x = local < 0 ? mix(motion.enterX ?? 0, 0, local + 1) : mix(0, motion.exitX ?? 0, local);
  const y = local < 0 ? mix(motion.enterY ?? 0, 0, local + 1) : mix(0, motion.exitY ?? 0, local);

  return {
    opacity,
    pointerEvents: opacity > 0.55 ? "auto" : "none",
    transform: `translate3d(${x}%, ${y}%, 0) scale(${scale})`,
    transformOrigin: motion.origin ?? "50% 50%"
  } as const;
}

function mix(from: number, to: number, amount: number) {
  return from + (to - from) * Math.max(0, Math.min(1, amount));
}

function MinimalInfo({ architecture, activeLayer }: { architecture: ArchitectureAsset; activeLayer: LayerId }) {
  const copy = getLayerCopy(architecture, activeLayer);
  const compact = activeLayer === "dl-flow";
  const hidden = activeLayer === "intro" || activeLayer === "die" || activeLayer === "sm-internal" || activeLayer === "dl-flow";

  return (
    <aside
      className={`absolute bottom-4 right-4 z-20 hidden w-[min(390px,calc(100vw-32px))] border border-[#253032] bg-[#080a0a]/78 backdrop-blur transition-opacity duration-300 md:block ${compact ? "p-3 text-sm" : "p-4"}`}
      style={{ opacity: hidden ? 0 : 1, pointerEvents: hidden ? "none" : "auto" }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7f8b95]">{layers.find((layer) => layer.id === activeLayer)?.title}</p>
          <h2 className="mt-1 text-lg font-semibold text-white">{architecture.gpuCodename} / {architecture.architecture}</h2>
        </div>
        <div className="font-mono text-xs text-[#aebbb7]">{copy.badge}</div>
      </div>
      <p className={`${compact ? "mt-3 text-xs leading-5" : "mt-4 text-sm leading-6"} text-[#aab4b0]`}>{copy.body}</p>
      <dl className={`${compact ? "mt-3 pt-2" : "mt-4 pt-3"} grid grid-cols-3 gap-2 border-t border-[#202829]`}>
        {copy.facts.map((fact) => (
          <div key={fact.label}>
            <dt className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#6f7d7a]">{fact.label}</dt>
            <dd className="mt-1 text-sm font-semibold text-[#e1e7e4]">{fact.value}</dd>
          </div>
        ))}
      </dl>
      {copy.software ? <p className={`${compact ? "mt-2 leading-4" : "mt-3 leading-5"} text-xs text-[#87928f]`}>{copy.software}</p> : null}
    </aside>
  );
}

function getLayerCopy(architecture: ArchitectureAsset, activeLayer: LayerId): LayerCopy {
  const copies = {
    intro: {
      badge: architecture.chip.transistors,
      body: `${architecture.name} uses the ${architecture.architecture} architecture and the ${architecture.gpuCodename} GPU die.`,
      facts: [
        { label: "Process", value: architecture.chip.process },
        { label: "Die", value: architecture.chip.dieArea },
        { label: "SMs", value: architecture.floorplan.activeSmsTotal }
      ]
    },
    package: {
      badge: `${architecture.memorySystem.deviceMemory}`,
      body: `Package: ${architecture.gpuCodename} die plus HBM sites. Active HBM stacks appear to CUDA as one device-memory pool.`,
      facts: [
        { label: "HBM", value: `${architecture.floorplan.hbm2Stacks} active` },
        { label: "BW", value: architecture.memorySystem.memoryBandwidth },
        { label: "Ctrls", value: architecture.floorplan.memoryControllers }
      ]
    },
    die: {
      badge: `${architecture.floorplan.activeSmsTotal} SM`,
      body: `Hardware hierarchy: GPC -> TPC -> SM. Full ${architecture.gpuCodename} has ${architecture.floorplan.fullGpcs} GPCs, ${architecture.floorplan.fullTpcsTotal} TPCs, and ${architecture.chip.fullGpuSmCount} SMs; ${architecture.name.split(" ")[1]} exposes ${architecture.floorplan.activeTpcsTotal} TPCs and ${architecture.floorplan.activeSmsTotal} SMs.`,
      facts: [
        { label: "GPCs", value: `${architecture.floorplan.activeGpcs}/${architecture.floorplan.fullGpcs}` },
        { label: "TPC", value: `${architecture.floorplan.activeTpcsTotal}/${architecture.floorplan.fullTpcsTotal}` },
        { label: "SMs", value: architecture.floorplan.activeSmsTotal }
      ]
    },
    "sm-internal": {
      badge: "1 SM",
      body: "SM: four partitions plus register file and shared/L1. Blocks/warps/threads run here, but are software scheduling units.",
      facts: [
        { label: "FP32", value: architecture.streamingMultiprocessor.fp32CudaCoresPerSm },
        { label: "INT32", value: architecture.streamingMultiprocessor.int32CoresPerSm },
        { label: "Tensor", value: architecture.streamingMultiprocessor.tensorCoresPerSm }
      ],
      software: `CUDA block -> SM. Warp -> ${architecture.executionModel.threadsPerWarp} threads. Thread -> registers + instructions.`
    },
    "dl-flow": {
      badge: "CUDA",
      body: "CUDA and Triton describe grids, blocks, warps, threads, and data tiles. Hardware schedules that work across GPCs, TPCs, and SMs while data moves through registers, shared/L1, L2, and HBM3.",
      facts: [
        { label: "SMs", value: architecture.floorplan.activeSmsTotal },
        { label: "Warp", value: architecture.executionModel.threadsPerWarp },
        { label: "L2", value: architecture.memorySystem.l2Cache }
      ],
      software: "A block stays on one SM; warps are scheduling groups; threads are not permanently assigned to visible physical cores."
    }
  } satisfies Record<LayerId, LayerCopy>;

  return copies[activeLayer];
}
