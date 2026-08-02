<script setup lang="ts">
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'

/* ================================================================
 *  手势识别常量
 * ================================================================ */

const CONSECUTIVE_FRAMES = 5
const CONFIDENCE_THRESHOLD = 0.7

/* ================================================================
 *  粒子系统常量
 * ================================================================ */

const PARTICLE_COUNT = 500
const PARTICLE_BASE_SIZE = 4
const LERP_SPEED = 0.06
const SCATTER_DISTANCE = 1.5
const PARTICLE_COLOR = '255, 255, 255'

/* ================================================================
 *  MediaPipe 手部关键点索引
 * ================================================================ */

const WRIST = 0
const THUMB_TIP = 4
const THUMB_IP = 3
const THUMB_MCP = 2
const INDEX_TIP = 8
const INDEX_PIP = 6
const INDEX_MCP = 5
const MIDDLE_TIP = 12
const MIDDLE_PIP = 10
const MIDDLE_MCP = 9
const RING_TIP = 16
const RING_PIP = 14
const RING_MCP = 13
const PINKY_TIP = 20
const PINKY_PIP = 18
const PINKY_MCP = 17

/* ================================================================
 *  加载状态
 * ================================================================ */

type LoadPhase = 'idle' | 'downloading_wasm' | 'downloading_model' | 'starting_camera' | 'ready' | 'error'
const loadPhase = ref<LoadPhase>('idle')
const loadProgress = ref(0)
const loadMessage = ref('')
const errorMessage = ref('')

/* ================================================================
 *  Refs
 * ================================================================ */

const videoRef = ref<HTMLVideoElement>()
const canvasRef = ref<HTMLCanvasElement>()
const containerRef = ref<HTMLDivElement>()

let handLandmarker: HandLandmarker | null = null
let animationFrameId: number | null = null
let stream: MediaStream | null = null

let candidateGesture: number | null = null
let gestureFrameCount = 0
let displayedNumber: number | null = null

let particles: Array<{ x: number; y: number; targetX: number; targetY: number; size: number; opacity: number }> = []
let particleMode: 'scatter' | 'gather' = 'scatter'

/* ================================================================
 *  工具函数
 * ================================================================ */

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

/* ================================================================
 *  手指伸直判定
 * ================================================================ */

function isFingerStraight(landmarks: any[], tipIdx: number, pipIdx: number, mcpIdx: number) {
  const mcp = landmarks[mcpIdx]
  const pip = landmarks[pipIdx]
  const tip = landmarks[tipIdx]

  const v1x = pip.x - mcp.x
  const v1y = pip.y - mcp.y
  const v2x = tip.x - pip.x
  const v2y = tip.y - pip.y

  const mag1 = Math.sqrt(v1x * v1x + v1y * v1y)
  const mag2 = Math.sqrt(v2x * v2x + v2y * v2y)

  if (mag1 === 0 || mag2 === 0) return false

  const cosAngle = (v1x * v2x + v1y * v2y) / (mag1 * mag2)
  return cosAngle > 0.7
}

function isThumbStraight(landmarks: any[]) {
  return isFingerStraight(landmarks, THUMB_TIP, THUMB_IP, THUMB_MCP)
}

/* ================================================================
 *  手势识别
 * ================================================================ */

function recognizeGesture(landmarks: any[]): number | null {
  const indexStraight = isFingerStraight(landmarks, INDEX_TIP, INDEX_PIP, INDEX_MCP)
  const middleStraight = isFingerStraight(landmarks, MIDDLE_TIP, MIDDLE_PIP, MIDDLE_MCP)
  const ringStraight = isFingerStraight(landmarks, RING_TIP, RING_PIP, RING_MCP)
  const pinkyStraight = isFingerStraight(landmarks, PINKY_TIP, PINKY_PIP, PINKY_MCP)
  const thumbStraight = isThumbStraight(landmarks)

  if (indexStraight && middleStraight && ringStraight && pinkyStraight && thumbStraight) return 5
  if (indexStraight && middleStraight && ringStraight && pinkyStraight && !thumbStraight) return 4
  if (indexStraight && middleStraight && ringStraight && !pinkyStraight && !thumbStraight) return 3
  if (indexStraight && middleStraight && !ringStraight && !pinkyStraight && !thumbStraight) return 2
  if (indexStraight && !middleStraight && !ringStraight && !pinkyStraight && !thumbStraight) return 1

  return null
}

/* ================================================================
 *  手势平滑处理
 * ================================================================ */

function processGesture(gesture: number | null) {
  if (gesture === candidateGesture) {
    gestureFrameCount++
    if (gestureFrameCount >= CONSECUTIVE_FRAMES && gesture !== displayedNumber) {
      updateDisplay(gesture)
    }
  } else {
    candidateGesture = gesture
    gestureFrameCount = 1
  }

  if (gesture === null && gestureFrameCount >= CONSECUTIVE_FRAMES) {
    updateDisplay(null)
  }
}

/* ================================================================
 *  手部检测与选择
 * ================================================================ */

function getHandArea(landmarks: any[]) {
  let minX = 1, minY = 1, maxX = 0, maxY = 0
  for (const lm of landmarks) {
    if (lm.x < minX) minX = lm.x
    if (lm.y < minY) minY = lm.y
    if (lm.x > maxX) maxX = lm.x
    if (lm.y > maxY) maxY = lm.y
  }
  return (maxX - minX) * (maxY - minY)
}

function selectBestHand(results: any) {
  if (!results || !results.landmarks || results.landmarks.length === 0) return null

  const handednessList = results.handednesses || results.handedness
  if (!handednessList || handednessList.length === 0) return null

  let bestLandmarks: any[] | null = null
  let bestArea = 0

  for (let i = 0; i < results.landmarks.length; i++) {
    const handedness = handednessList[i]
    if (!handedness || !handedness[0]) continue

    const score = handedness[0].score
    if (score < CONFIDENCE_THRESHOLD) continue

    const area = getHandArea(results.landmarks[i])
    if (area > bestArea) {
      bestArea = area
      bestLandmarks = results.landmarks[i]
    }
  }

  return bestLandmarks
}

/* ================================================================
 *  粒子系统
 * ================================================================ */

function resizeParticleCanvas() {
  const canvas = canvasRef.value
  const container = containerRef.value
  if (!canvas || !container) return
  const rect = container.getBoundingClientRect()
  canvas.width = rect.width
  canvas.height = rect.height
}

function initParticles() {
  const canvas = canvasRef.value
  if (!canvas) return

  resizeParticleCanvas()

  particles = []
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const x = Math.random() * canvas.width
    const y = Math.random() * canvas.height
    particles.push({
      x, y,
      targetX: x,
      targetY: y,
      size: Math.random() * PARTICLE_BASE_SIZE + 1,
      opacity: 0.5 + Math.random() * 0.5
    })
  }
}

function generateTextTargets(number: number) {
  const canvas = canvasRef.value
  if (!canvas) return []

  const offWidth = 400
  const offHeight = 400
  const offCanvas = new OffscreenCanvas(offWidth, offHeight)
  const offCtx = offCanvas.getContext('2d')!

  offCtx.fillStyle = '#ffffff'
  offCtx.font = 'bold 260px Arial, Helvetica Neue, sans-serif'
  offCtx.textAlign = 'center'
  offCtx.textBaseline = 'middle'
  offCtx.fillText(String(number), offWidth / 2, offHeight / 2)

  const imageData = offCtx.getImageData(0, 0, offWidth, offHeight)
  const pixels = imageData.data

  const rawPoints: Array<{ x: number; y: number }> = []
  const step = 3
  for (let py = 0; py < offHeight; py += step) {
    for (let px = 0; px < offWidth; px += step) {
      const alpha = pixels[(py * offWidth + px) * 4 + 3]!
      if (alpha > 128) {
        rawPoints.push({ x: px, y: py })
      }
    }
  }

  if (rawPoints.length === 0) return []

  const scaleX = canvas.width / offWidth
  const scaleY = canvas.height / offHeight
  const scale = Math.min(scaleX, scaleY) * 0.9
  const offsetX = (canvas.width - offWidth * scale) / 2
  const offsetY = (canvas.height - offHeight * scale) / 2

  const targets = rawPoints.map(p => ({
    x: p.x * scale + offsetX,
    y: p.y * scale + offsetY
  }))

  return shuffleAndPick(targets, PARTICLE_COUNT)
}

function generateScatterTargets() {
  const canvas = canvasRef.value
  if (!canvas) return []

  const cx = canvas.width / 2
  const cy = canvas.height / 2
  const maxDist = Math.max(cx, cy) * SCATTER_DISTANCE

  const targets: Array<{ x: number; y: number }> = []
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.5
    const radius = maxDist * (0.5 + Math.random() * 0.5)
    targets.push({
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius
    })
  }
  return targets
}

function shuffleAndPick<T>(arr: T[], n: number): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!]
  }
  return result.slice(0, n)
}

function setParticleTargets(mode: 'gather' | 'scatter', number: number | null) {
  let targets
  if (mode === 'gather' && number !== null) {
    targets = generateTextTargets(number)
    if (targets.length === 0) {
      mode = 'scatter'
      targets = generateScatterTargets()
    }
  } else {
    targets = generateScatterTargets()
  }

  for (let i = 0; i < particles.length; i++) {
    if (i < targets.length) {
      particles[i]!.targetX = targets[i]!.x
      particles[i]!.targetY = targets[i]!.y
    } else {
      const canvas = canvasRef.value!
      particles[i]!.targetX = Math.random() * canvas.width
      particles[i]!.targetY = Math.random() * canvas.height
    }
  }

  particleMode = mode
}

function updateParticles() {
  for (const p of particles) {
    p.x += (p.targetX - p.x) * LERP_SPEED
    p.y += (p.targetY - p.y) * LERP_SPEED
  }
}

function renderParticles() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  for (const p of particles) {
    const dx = p.targetX - p.x
    const dy = p.targetY - p.y
    const distToTarget = Math.sqrt(dx * dx + dy * dy)
    const brightness = particleMode === 'gather'
      ? Math.max(0.3, 1 - distToTarget / 100)
      : Math.max(0.2, 0.8 - distToTarget / 200)

    const alpha = p.opacity * brightness
    ctx.fillStyle = `rgba(${PARTICLE_COLOR}, ${alpha.toFixed(2)})`
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size * brightness, 0, Math.PI * 2)
    ctx.fill()
  }
}

/* ================================================================
 *  UI 显示
 * ================================================================ */

function updateDisplay(number: number | null) {
  if (number === displayedNumber) return

  if (number === null) {
    setParticleTargets('scatter', null)
    displayedNumber = null
  } else {
    setParticleTargets('gather', number)
    displayedNumber = number
  }
}

/* ================================================================
 *  主循环
 * ================================================================ */

function predict() {
  const video = videoRef.value
  if (!handLandmarker || !video || video.readyState < 2) {
    animationFrameId = requestAnimationFrame(predict)
    return
  }

  const results = handLandmarker.detectForVideo(video, performance.now())
  const bestHand = selectBestHand(results)

  if (bestHand) {
    const gesture = recognizeGesture(bestHand)
    processGesture(gesture)
  } else {
    processGesture(null)
  }

  updateParticles()
  renderParticles()

  animationFrameId = requestAnimationFrame(predict)
}

/* ================================================================
 *  初始化（分阶段加载）
 * ================================================================ */

async function setupCamera() {
  stream = await navigator.mediaDevices.getUserMedia({
    video: {
      width: { ideal: 640 },
      height: { ideal: 480 },
      facingMode: 'user'
    }
  })
  const video = videoRef.value
  if (!video) return
  video.srcObject = stream
  await video.play()
}

async function loadHandLandmarker() {
  // 阶段 1：下载 WASM 运行时
  loadPhase.value = 'downloading_wasm'
  loadMessage.value = '正在下载识别引擎...'
  loadProgress.value = 10

  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'
  )

  // 阶段 2：下载手势识别模型
  loadPhase.value = 'downloading_model'
  loadMessage.value = '正在下载手势模型...'
  loadProgress.value = 40

  const landmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
      delegate: 'GPU'
    },
    runningMode: 'VIDEO',
    numHands: 2
  })

  loadProgress.value = 70
  return landmarker
}

async function init() {
  loadPhase.value = 'downloading_wasm'
  loadMessage.value = '正在下载识别引擎...'
  loadProgress.value = 0

  try {
    initParticles()
    window.addEventListener('resize', resizeParticleCanvas)

    // 1. 先下载 WASM + 模型
    handLandmarker = await loadHandLandmarker()

    // 2. 模型就绪后再打开摄像头
    loadPhase.value = 'starting_camera'
    loadMessage.value = '正在启动摄像头...'
    loadProgress.value = 85
    await setupCamera()

    // 3. 一切就绪
    loadPhase.value = 'ready'
    loadProgress.value = 100
    predict()
  } catch (error) {
    console.error('初始化失败:', error)
    loadPhase.value = 'error'
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      errorMessage.value = '网络连接失败，请检查网络后重试'
    } else {
      errorMessage.value = error instanceof Error ? error.message : '未知错误'
    }
  }
}

onMounted(() => {
  nextTick(() => init())
})

onUnmounted(() => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
  }
  if (stream) {
    stream.getTracks().forEach(track => track.stop())
  }
  window.removeEventListener('resize', resizeParticleCanvas)
  handLandmarker?.close()
})
</script>

<template>
  <div class="h-full w-full flex items-center justify-center">
    <main
      class="mac-window relative z-10 w-full h-full md:w-[70%] md:h-[80%] rounded-none md:rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(92,61,43,0.2)] dark:shadow-none dark:border dark:border-[rgba(255,255,255,0.08)]"
    >
      <div class="relative w-full h-full rounded-none md:rounded-[14px] bg-[rgb(250_250_250)] dark:bg-[#1a1c1e] overflow-hidden flex flex-col shadow-none md:shadow-xl dark:shadow-none">
        <!-- 窗口标题栏 -->
        <div class="title-bar h-7.5 relative items-center px-4 select-none hidden md:flex">
          <!-- 左上角三个按钮 -->
          <div class="absolute left-3.75 top-1/2 -translate-y-1/2">
            <MacWindowControls
              :show-close="true"
              :show-minimize="true"
              :show-maximize="true"
              :clickable="true"
              @close="navigateTo('/')"
            />
          </div>
          <!-- 标题 -->
          <span class="mx-auto text-[13px] text-[#555] dark:text-[#aaa]">手势识别</span>
        </div>

        <!-- 窗口内容区域 -->
        <div ref="containerRef" class="flex-1 relative bg-black mt-8 md:mt-0 overflow-hidden">
          <!-- 加载中 -->
          <div
            v-if="loadPhase !== 'ready'"
            class="absolute inset-0 z-30 flex flex-col items-center justify-center gap-6 bg-white dark:bg-black"
          >
            <!-- 错误状态 -->
            <template v-if="loadPhase === 'error'">
              <div class="w-14 h-14 rounded-full bg-[rgba(0,0,0,0.06)] dark:bg-[rgba(255,255,255,0.08)] flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(220,80,80,0.8)" stroke-width="1.5" stroke-linecap="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
              <p class="text-sm text-[#666] dark:text-white/60 m-0">{{ errorMessage || '加载失败' }}</p>
              <button
                class="px-5 py-2 rounded-lg border border-[#ddd] dark:border-white/20 bg-transparent text-sm text-[#555] dark:text-white/70 cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                @click="init()"
              >
                重试
              </button>
            </template>

            <!-- 加载中 -->
            <template v-else>
              <div class="relative w-12 h-12">
                <svg class="animate-spin w-12 h-12" viewBox="0 0 48 48">
                  <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(0,0,0,0.08)" stroke-width="3" class="dark:stroke-[rgba(255,255,255,0.1)]" />
                  <circle
                    cx="24" cy="24" r="20"
                    fill="none"
                    stroke="rgba(0,0,0,0.35)"
                    stroke-width="3"
                    stroke-linecap="round"
                    :stroke-dasharray="`${loadProgress * 1.26} 126`"
                    transform="rotate(-90 24 24)"
                    class="dark:stroke-[rgba(255,255,255,0.6)]"
                  />
                </svg>
                <span class="absolute inset-0 flex items-center justify-center text-xs text-[#999] dark:text-white/50 font-mono">{{ loadProgress }}%</span>
              </div>
              <p class="text-sm text-[#999] dark:text-white/50 m-0">{{ loadMessage }}</p>
            </template>
          </div>

          <!-- 摄像头视频（就绪后显示） -->
          <video
            v-show="loadPhase === 'ready'"
            ref="videoRef"
            autoplay
            playsinline
            muted
            class="absolute inset-0 w-full h-full object-cover"
            style="transform: scaleX(-1)"
          />

          <!-- 粒子画布 -->
          <canvas
            ref="canvasRef"
            class="absolute inset-0 z-10 pointer-events-none"
          />
        </div>
      </div>
    </main>
  </div>
</template>
