# GPU Architecture Assets

Architecture assets are source-backed JSON files used by the visualization layer.

Each file should include:

- `sources`: canonical references for the architecture facts.
- `chip`: die-level details such as process, transistor count, SM count, and compute capability.
- `executionModel`: CUDA-facing scheduling limits such as warp size, threads per SM, and register limits.
- `streamingMultiprocessor`: SM-local execution and storage details.
- `memorySystem`: CUDA memory spaces mapped to physical architecture pieces.
- `features`: named architectural features with learner-friendly explanations.
- `visualHierarchy`: explorable scene nodes for the 3D map.
- `learningPath`: suggested order for the visual walkthrough.

Prefer NVIDIA whitepapers, CUDA documentation, vendor architecture guides, and reputable die or microarchitecture analysis sources.
