// 引擎常数。星球/波形常数被 planet.js 着色器与 scene.js 的 JS 复算共用——只在这里改。
window.MB = window.MB || {};
(function () {
  const params = new URLSearchParams(location.search);
  const DEFAULT_N = 192;
  const CHUNK = 48;
  let N = parseInt(params.get("n") || DEFAULT_N, 10);
  N = Math.max(96, Math.min(288, Math.round(N / CHUNK) * CHUNK));
  const R = 110;
  const CELL = R * Math.PI / 2 / N;          // 面中心处一个地表体素的边长（世界单位）

  MB.CONFIG = {
    DEFAULT_N, N, CHUNK, R, CELL,
    VOX: CELL,                 // 径向一格 = 切向一格：地表体素是正方体
    CUBE: CELL * 1.03,         // 略放大，盖住等角映射在面边缘的缩小量，杜绝漏缝
    UNIT: 0.62,                // 造物统一体素单位：全星球所有模型共用一个尺度
    // 地表律动（抒情曲：幅度克制，靠传播感而不是靠蹦）。单位：世界单位
    WAVE_AMP: 5.0, PULSE_AMP: 3.8, JIT_AMP: 0.45,
    CAMERA_START: 372, CAMERA_MIN: 126, CAMERA_MAX: 1100,
    ROTATION_PERIOD: 150,
    PIXEL_RATIO_CAP: 1.6,
    SEED: (window.MB_SCENE && MB_SCENE.seed) || 2005,
  };
  MB.CONFIG.VOXEL_COUNT = 6 * N * N;
})();
