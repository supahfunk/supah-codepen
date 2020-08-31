global.THREE = require("three")
require("three/examples/js/controls/OrbitControls")
const canvasSketch = require("canvas-sketch")


/*------------------------------
Settings
------------------------------*/
const settings = {
  animate: true,
  context: "webgl",
  duration: 3,
}

const sketch = ({ context }) => {
  const renderer = new THREE.WebGLRenderer({
    canvas: context.canvas
  })

  document.body.style.background = 'linear-gradient(-30deg, rgb(12 1 3), rgb(44 5 17), rgb(45 10 74))'

  // WebGL background color
  renderer.setClearColor("#260029", 0)

  // Setup a camera
  const camera = new THREE.PerspectiveCamera(60, 1, 0.01, 100)
  camera.position.set(0, 0, 4)
  camera.lookAt(new THREE.Vector3())

  // Setup camera controller
  const controls = new THREE.OrbitControls(camera, context.canvas)

  // Setup your scene
  const scene = new THREE.Scene()
  // Fog
  const color = 0x000000;
  const near = -1;
  const far = 9;
  scene.fog = new THREE.Fog(color, near, far);

  const ambient = new THREE.AmbientLight(0xcccccc)
  scene.add(ambient)

  const foreLight = new THREE.DirectionalLight(0xffffff, 0.5)
  foreLight.position.set(15, 15, 20)
  scene.add(foreLight)

  const backLight = new THREE.DirectionalLight(0xffffff, 0.5)
  backLight.position.set(-15, 15, 20)
  scene.add(backLight)

  // Setup a geometry
  const planeGeometry = new THREE.PlaneBufferGeometry(1, 1, 100, 100)

  const texture = new THREE.TextureLoader().load('https://raw.githubusercontent.com/supahfunk/supah-codepen/master/oval.png?v=2')
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping


  /*------------------------------
  Vertex
  ------------------------------*/
  const vertex = /* glsl */`
    precision highp float;
    varying vec2 vUv;
    varying vec3 vPos;
    varying vec3 vNormal;

    #define PI 3.14159265

    void main() {
      vec3 pos = position;
      vUv = uv;

      float theta = PI * 2. * position.y;
      float radius = 1.;

      pos.y = radius * cos(theta);
      pos.z = radius * sin(theta);
      pos.z = 1. - smoothstep(-0.9, 0.9, pos.z);


      vNormal = normalize(normalMatrix * pos);
      vPos = pos;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.);
      gl_Position = projectionMatrix * mvPosition;
    }
  `

/*------------------------------
Fragment
------------------------------*/
  const fragment = /* glsl */`
    precision highp float;
    varying vec2 vUv;
    varying vec3 vPos;
    varying vec3 vNormal;
    uniform float uTime;
    uniform sampler2D uTexture;

    #define pi 3.14159265

    void main() {
      vec2 uv = vUv;
      
      uv.y *= 3.;
      uv.y -= 0.3;
      uv.y -= uTime;


      float distort = smoothstep(1., .9, vPos.y - vPos.z * 0.1);
      distort += smoothstep(-1., -0.9, vPos.y + vPos.z * 0.1);
      uv.y += (.2 + distort) * 0.1;

      
      vec3 col = vec3(0., 0., 0.);
      vec4 t = texture2D(uTexture, uv);

      vec3 bg = vec3(0.327, 0.076, 0.657);
      vec3 front = vec3(0.908, 0.107, 0.334);

      col = 1. - t.rgb;


      col += smoothstep(-0.8, 1., vPos.y * 0.4);

      col *= mix(bg, front, smoothstep(0.6, 1., vPos.z));




      gl_FragColor = vec4(col, 1. - t.r * 0.3);
    }
  `

  
  /*------------------------------
  Material Shader
  ------------------------------*/
  let materialShader
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0. },
      uTexture: { value: texture }
    },
    fragmentShader: fragment,
    vertexShader: vertex,
    side: THREE.DoubleSide,
    transparent: true,
  })

  const mesh = new THREE.Mesh(planeGeometry, material)
  mesh.rotation.y = Math.PI * 0.15
  mesh.rotation.x = Math.PI * -0.02

  scene.add(mesh)

  window.addEventListener('mousemove', (e) => {
    const x = e.clientX
    const y = e.clientY
  })


  const easeInOutQuad = t => t<.5 ? 2*t*t : -1+(4-2*t)*t


  return {
    resize({ pixelRatio, viewportWidth, viewportHeight }) {
      renderer.setPixelRatio(pixelRatio)
      renderer.setSize(viewportWidth, viewportHeight, false)
      camera.aspect = viewportWidth / viewportHeight
      camera.updateProjectionMatrix()
    },
    render({ time, playhead }) {
      if (material) {
        material.uniforms.uTime.value = easeInOutQuad(playhead)
      }
      controls.update()
      renderer.render(scene, camera)
    },
    unload() {
      controls.dispose()
      renderer.dispose()
    }
  }
}

canvasSketch(sketch, settings)
