import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const STATUS_COLORS = {
  ok:      0x22c55e,
  warn:    0xf59e0b,
  fail:    0xef4444,
  pending: 0x4b5563,
}

// Definizione base di tutti i pezzi del modello
// ogni pezzo ha un id univoco, un subsystem di appartenenza e la geometria
const BASE_PARTS = [
  { partId: 'structure_body',   subsystem: 'structure',   type: 'box',      w:1.8,  h:2.6,  d:1.4,  x:0,    y:0,    z:0    },
  { partId: 'optical_tube',     subsystem: 'optical',     type: 'cylinder', r1:0.35,r2:0.42,h:1.8,  x:0,    y:2.2,  z:0    },
  { partId: 'optical_baffle',   subsystem: 'optical',     type: 'cylinder', r1:0.42,r2:0.42,h:0.1,  x:0,    y:3.15, z:0    },
  { partId: 'thermal_panel',    subsystem: 'thermal',     type: 'box',      w:1.82, h:0.12, d:1.42, x:0,    y:0.9,  z:0    },
  { partId: 'thermal_radiator', subsystem: 'thermal',     type: 'box',      w:0.08, h:1.2,  d:1.42, x:0.96, y:0.2,  z:0    },
  { partId: 'mechanical_base',  subsystem: 'mechanical',  type: 'box',      w:1.84, h:0.14, d:1.44, x:0,    y:-1.2, z:0    },
  { partId: 'solar_right',      subsystem: 'solar',       type: 'box',      w:2.4,  h:0.06, d:1.0,  x:2.1,  y:0.3,  z:0    },
  { partId: 'solar_left',       subsystem: 'solar',       type: 'box',      w:2.4,  h:0.06, d:1.0,  x:-2.1, y:0.3,  z:0    },
  { partId: 'solar_conn_right', subsystem: 'solar',       type: 'box',      w:0.3,  h:0.1,  d:0.3,  x:0.9,  y:0.3,  z:0    },
  { partId: 'solar_conn_left',  subsystem: 'solar',       type: 'box',      w:0.3,  h:0.1,  d:0.3,  x:-0.9, y:0.3,  z:0    },
  { partId: 'startracker_body', subsystem: 'startracker', type: 'sphere',   r:0.2,           x:0.75, y:-0.9, z:0.72 },
  { partId: 'startracker_stem', subsystem: 'startracker', type: 'cylinder', r1:0.08,r2:0.08,h:0.3,  x:0.75, y:-0.6, z:0.72 },
  { partId: 'dataproc_box',     subsystem: 'dataproc',    type: 'box',      w:0.9,  h:0.28, d:0.9,  x:0,    y:-0.7, z:0    },
]

// Mappa parole chiave → partId per rimozione/modifica
const KEYWORD_TO_PART = {
  'solar_right':   'solar_right',
  'solar_left':    'solar_left',
  'right solar':   'solar_right',
  'left solar':    'solar_left',
  'right panel':   'solar_right',
  'left panel':    'solar_left',
  'solar panel':   'solar_right',  // default rimuove destra
  'one solar':     'solar_right',
  'optical tube':  'optical_tube',
  'baffle':        'optical_baffle',
  'radiator':      'thermal_radiator',
  'star tracker':  'startracker_body',
}

function resolveRemovedParts(geometryChanges) {
  const removed = new Set()
  geometryChanges.forEach(c => {
    if (c.operation === 'remove' || c.operation === 'hide') {
      // cerca per partId diretto
      if (c.part_id) {
        removed.add(c.part_id)
      }
      // cerca per subsystem + side
      else if (c.subsystem === 'solar') {
        if (c.side === 'right' || c.direction === 'right') removed.add('solar_right')
        else if (c.side === 'left' || c.direction === 'left') removed.add('solar_left')
        else {
          // "one solar" → rimuovi destra
          removed.add('solar_right')
          removed.add('solar_conn_right')
        }
      }
      // cerca per keyword nella description
      else if (c.description) {
        const desc = c.description.toLowerCase()
        Object.entries(KEYWORD_TO_PART).forEach(([kw, pid]) => {
          if (desc.includes(kw)) removed.add(pid)
        })
      }
    }
  })
  return removed
}

function applyGeometryChange(part, change) {
  if (!change) return part
  const p  = { ...part }
  const sf = change.scale_factor || 1.0
  const dim = change.dimension || 'all'
  const dir = change.direction

  if (dim === 'all') {
    if (p.type === 'box')      { p.w *= sf; p.h *= sf; p.d *= sf }
    if (p.type === 'cylinder') { p.r1 *= sf; p.r2 *= sf; p.h *= sf }
    if (p.type === 'sphere')   { p.r *= sf }
  } else if (dim === 'height') {
    const oldH = p.h || p.r * 2
    const newH = oldH * sf
    const delta = newH - oldH
    if (p.type === 'box')      p.h = newH
    if (p.type === 'cylinder') p.h = newH
    if (dir === 'down')     p.y -= delta / 2
    else if (dir === 'up')  p.y += delta / 2
  } else if (dim === 'width') {
    if (p.type === 'box') p.w *= sf
  } else if (dim === 'depth') {
    if (p.type === 'box') p.d *= sf
  } else if (dim === 'radius') {
    if (p.type === 'cylinder') { p.r1 *= sf; p.r2 *= sf }
    if (p.type === 'sphere')   p.r *= sf
  }

  return p
}

function createMesh(part, color) {
  const mat = new THREE.MeshLambertMaterial({ color })
  let geometry

  if (part.type === 'box') {
    geometry = new THREE.BoxGeometry(part.w, part.h, part.d)
  } else if (part.type === 'cylinder') {
    geometry = new THREE.CylinderGeometry(part.r1, part.r2, part.h, 32)
  } else if (part.type === 'sphere') {
    geometry = new THREE.SphereGeometry(part.r, 16, 16)
  }

  const mesh = new THREE.Mesh(geometry, mat)
  mesh.position.set(part.x, part.y, part.z)
  mesh.userData.id = part.subsystem
  return mesh
}

export default function PayloadViewer3D({ subsystems, onHover, geometryChanges = [] }) {
  const mountRef = useRef(null)
  const stateRef = useRef({
    renderer: null,
    scene: null,
    camera: null,
    group: null,
    meshMap: {},
    animId: null,
    isDragging: false,
    prevMouse: { x: 0, y: 0 },
    rotX: 0.3,
    rotY: 0.4,
  })

  function buildGroup(geoChanges) {
    const s = stateRef.current
    if (s.group) {
      s.scene.remove(s.group)
      s.group = null
      s.meshMap = {}
    }

    const group   = new THREE.Group()
    const removed = resolveRemovedParts(geoChanges)

    // mappa subsystem → change per scale
    const scaleBySubsystem = {}
    geoChanges.forEach(c => {
      if (!c.operation || c.operation === 'scale' || c.operation === 'resize') {
        if (c.subsystem) scaleBySubsystem[c.subsystem] = c
      }
    })

    BASE_PARTS.forEach(part => {
      // salta parti rimosse
      if (removed.has(part.partId)) return

      // applica scala se presente
      const change   = scaleBySubsystem[part.subsystem]
      const finalPart = change ? applyGeometryChange(part, change) : part

      const status = subsystems?.[part.subsystem]?.status
      const color  = STATUS_COLORS[status] ?? STATUS_COLORS.pending
      const mesh   = createMesh(finalPart, color)
      group.add(mesh)

      if (!s.meshMap[part.subsystem]) s.meshMap[part.subsystem] = []
      s.meshMap[part.subsystem].push(mesh)
    })

    s.group = group
    s.scene.add(group)
  }

  useEffect(() => {
    const el = mountRef.current
    if (!el) return
    const s  = stateRef.current
    const W  = el.clientWidth
    const H  = el.clientHeight

    s.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    s.renderer.setSize(W, H)
    s.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    s.renderer.setClearColor(0x000000, 0)
    el.appendChild(s.renderer.domElement)

    s.scene  = new THREE.Scene()
    s.camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100)
    s.camera.position.set(0, 1.5, 7)
    s.camera.lookAt(0, 0, 0)

    s.scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const dir1 = new THREE.DirectionalLight(0xffffff, 0.9)
    dir1.position.set(4, 6, 5)
    s.scene.add(dir1)
    const dir2 = new THREE.DirectionalLight(0x8888ff, 0.3)
    dir2.position.set(-4, -2, -4)
    s.scene.add(dir2)

    buildGroup([])

    const raycaster = new THREE.Raycaster()
    const mouse     = new THREE.Vector2()

    function onMouseMove(e) {
      const rect = el.getBoundingClientRect()
      mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1
      mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1

      if (s.isDragging) {
        s.rotY += (e.clientX - s.prevMouse.x) * 0.008
        s.rotX += (e.clientY - s.prevMouse.y) * 0.008
        s.rotX  = Math.max(-1.2, Math.min(1.2, s.rotX))
        s.prevMouse = { x: e.clientX, y: e.clientY }
      }

      if (s.group) {
        raycaster.setFromCamera(mouse, s.camera)
        const hits = raycaster.intersectObjects(s.group.children)
        if (hits.length && onHover) onHover(hits[0].object.userData.id)
        else if (onHover) onHover(null)
      }
    }

    function onMouseDown(e) {
      s.isDragging = true
      s.prevMouse  = { x: e.clientX, y: e.clientY }
      el.style.cursor = 'grabbing'
    }
    function onMouseUp() {
      s.isDragging = false
      el.style.cursor = 'grab'
    }

    el.addEventListener('mousemove', onMouseMove)
    el.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mouseup', onMouseUp)

    function animate() {
      s.animId = requestAnimationFrame(animate)
      s.rotY  += 0.003
      if (s.group) {
        s.group.rotation.x = s.rotX
        s.group.rotation.y = s.rotY
      }
      s.renderer.render(s.scene, s.camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(s.animId)
      el.removeEventListener('mousemove', onMouseMove)
      el.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      s.renderer.dispose()
      if (el.contains(s.renderer.domElement)) el.removeChild(s.renderer.domElement)
    }
  }, [])

  // aggiorna colori
  useEffect(() => {
    const s = stateRef.current
    if (!s.meshMap || !subsystems) return
    Object.entries(subsystems).forEach(([id, data]) => {
      const meshes = s.meshMap[id] || []
      const color  = STATUS_COLORS[data.status] ?? STATUS_COLORS.pending
      meshes.forEach(m => m.material.color.setHex(color))
    })
  }, [subsystems])

  // ricostruisce geometrie
  useEffect(() => {
    const s = stateRef.current
    if (!s.scene) return
    buildGroup(geometryChanges)
    if (subsystems) {
      Object.entries(subsystems).forEach(([id, data]) => {
        const meshes = s.meshMap[id] || []
        const color  = STATUS_COLORS[data.status] ?? STATUS_COLORS.pending
        meshes.forEach(m => m.material.color.setHex(color))
      })
    }
  }, [geometryChanges])

  return (
    <div ref={mountRef} className="w-full h-full" style={{ cursor: 'grab' }} />
  )
}