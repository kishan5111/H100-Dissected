export type SourceRef = {
  id: string;
  title: string;
  publisher: string;
  url: string;
  accessed: string;
};

export type ArchitectureAsset = {
  id: string;
  name: string;
  vendor: string;
  architecture: string;
  gpuCodename: string;
  releaseContext: string;
  sources: SourceRef[];
  chip: {
    process: string;
    transistors: string;
    dieArea: string;
    computeCapability: string;
    enabledSmCount?: number;
    fullGpuSmCount: number;
    a100EnabledSmCount: number;
    notes: string;
    sourceIds: string[];
  };
  floorplan: {
    representation: string;
    fullGpcs: number;
    fullTpcsPerGpc: number;
    fullSmsPerTpc: number;
    fullTpcsTotal: number;
    activeGpcs: number;
    disabledGpcs: number;
    tpcsPerActiveGpc: number[];
    tpcDistributionNote: string;
    activeTpcsTotal: number;
    smsPerTpc: number;
    activeSmsPerGpc: number[];
    activeSmsTotal: number;
    fullGa100SmsTotal: number;
    hbm2Stacks: number;
    disabledHbm2Stacks: number;
    physicalHbmSites: number;
    hbmPlacement: string;
    memoryControllers: number;
    memoryControllerWidth: string;
    sourceIds: string[];
  };
  executionModel: {
    threadsPerWarp: number;
    maxWarpsPerSm: number;
    maxThreadsPerSm: number;
    maxThreadBlocksPerSm: number;
    maxThreadBlockSize: number;
    maxRegistersPerSm32Bit: number;
    maxRegistersPerBlock: number;
    maxRegistersPerThread: number;
    cudaConnection: string;
    sourceIds: string[];
  };
  streamingMultiprocessor: {
    name: string;
    smPartitionsPerSm: number;
    warpSchedulersPerSm: number;
    fp32CudaCoresPerSm: number;
    fp64CoresPerSm: number;
    int32CoresPerSm: number;
    textureUnitsPerSm: number;
    tensorCoresPerSm: number;
    l1AndSharedMemoryCapacity: string;
    maxConfigurableSharedMemory: string;
    smRegisterFile: string;
    importantFeatures: string[];
    layoutNote: string;
    cudaConnection: string;
    sourceIds: string[];
  };
  memorySystem: {
    deviceMemory: string;
    memoryBandwidth: string;
    l2Cache: string;
    l2Architecture: string;
    cudaMemorySpaces: Array<{
      name: string;
      physicalLocation: string;
      visualMetaphor: string;
      performanceMeaning: string;
    }>;
    sourceIds: string[];
  };
};
