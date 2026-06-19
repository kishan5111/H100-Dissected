import architecture from "@/assets/architectures/nvidia-h100-hopper.json";
import { ScrollHardwareMap } from "@/components/scroll-hardware-map";
import type { ArchitectureAsset } from "@/lib/architecture";

export default function Home() {
  return <ScrollHardwareMap architecture={architecture as ArchitectureAsset} />;
}
