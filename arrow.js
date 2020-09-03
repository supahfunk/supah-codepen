global.THREE = require("three")
require("three/examples/js/controls/OrbitControls")
const canvasSketch = require("canvas-sketch")
const { mapRange, lerp } = require('canvas-sketch-util/math')


/*------------------------------
Settings
------------------------------*/
const settings = {
  animate: true,
  context: "webgl",
  duration: 10,
  fps: 30,
}

let mouse = { 
  x: window.innerWidth / 2, 
  y: window.innerHeight / 2, 
  click: 0,
}
let rotation = {
  x: 0,
  y: 0,
  z: 0,
}

const sketch = ({ context }) => {
  const renderer = new THREE.WebGLRenderer({
    canvas: context.canvas
  })

  // WebGL background color
  renderer.setClearColor("#eeeeee", 1)

  // Setup a camera
  const camera = new THREE.PerspectiveCamera(60, 1, 0.01, 100)
  camera.position.set(0, 0, 
    mapRange(window.innerWidth, 375, 2560, 5, 1.5)
  )
  camera.lookAt(new THREE.Vector3())

  // Setup camera controller
  // const controls = new THREE.OrbitControls(camera, context.canvas)

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

  const texture = new THREE.TextureLoader().load('https://raw.githubusercontent.com/supahfunk/supah-codepen/master/breathe.png?v=4')
  const texture2 = new THREE.TextureLoader().load('https://raw.githubusercontent.com/supahfunk/supah-codepen/master/release.png?v=4')
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture2.wrapS = THREE.RepeatWrapping
  texture2.wrapT = THREE.RepeatWrapping


  /*------------------------------
  Vertex
  ------------------------------*/
  const vertex = /* glsl */`
    precision highp float;
    varying vec2 vUv;
    varying vec3 vPos;
    varying vec3 vNormal;

    uniform float uTime;

    #define PI 3.14159265

  
    mat4 rotation3d(vec3 axis, float angle) {
      axis = normalize(axis);
      float s = sin(angle);
      float c = cos(angle);
      float oc = 1.0 - c;

      return mat4(
        oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
        oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
        oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
        0.0,                                0.0,                                0.0,                                1.0
      );
    }


    vec3 rotate(vec3 v, vec3 axis, float angle) {
      return (rotation3d(axis, angle) * vec4(v, 1.0)).xyz;
    }


    void main() {
      vec3 pos = position;
      vUv = uv;

      pos.y *= 2.;
      pos.x *= 0.3;


      float length = 2.5;
      float start = -1. - length;
      float end = 1. + length;
      float rotations = 3.;

      // Animazione OK
      // float time = sin(uTime * 2. * PI) * 0.5 + 0.5;
      // time *= 4.;
      // float y = smoothstep(start + time, start + length + abs(time), pos.y);


      float time = mod(uTime, .5);
      
      time *= 10.;
      float y = smoothstep(start + time, start + length + time, pos.y);

      if (uTime >= .5) {
        y -= 1.;
      }


      float theta = -y * PI * rotations;
      float c = cos( theta);
      float s = sin( theta);
      mat3 twistY = mat3(
        c, 0, s,
        0, 1, 0,
        -s, 0, c
      );
      
      pos *= twistY;

      vNormal = normal * twistY * vec3(modelViewMatrix);
      vPos = pos;

      // Movement
      time = uTime * 5.;
      pos.x += sin(pos.y * 3. + time * 2. * PI) * 0.02;

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
    uniform sampler2D uTexture1;
    uniform sampler2D uTexture2;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform float uFront;
    uniform float uPosition;
    uniform float uRotation;

    #define PI 3.14159265

    vec2 rotateUV(vec2 uv, float rotation)
    {
        float mid = 0.5;
        return vec2(
            cos(rotation) * (uv.x - mid) + sin(rotation) * (uv.y - mid) + mid,
            cos(rotation) * (uv.y - mid) - sin(rotation) * (uv.x - mid) + mid
        );
    }

    void main() {
      vec2 uv = vUv;
      
      vec3 light = vec3(0., 10., -10.);
      float intensity = 1.;
      light = normalize(light) * intensity;

      vec3 normal = vNormal;
      normal += uv.x;

      float dProd = max(0.0, dot(normal, light));
  
      vec3 col = mix(uColor1, uColor2, uv.y);

      col = mix(col, vec3(dProd), 0.1);

      // Luci
      col +=  smoothstep(1.0, 0.98, uv.x) * vPos.z * (1. - uFront) * .5;


      // Texture
      uv = rotateUV(uv, PI * uRotation);
      // uv.x *= 2.03;
      uv.x -= .25;
      uv.x *= 2.;
      uv.y = smoothstep(0.05, 0.95, uv.y) * uFront;

      uv.x = clamp(uv.x, 0., 1.);


      // uv.x -=  uv.y * 0.1;

      col += 1. - vec3(texture2D(uTexture1, uv).rgb);


      // arrow
      float arrowLength = 10.;
      float y = vUv.x * 2. - 1.;
      float arrow = abs(y) + vUv.y * arrowLength;
      arrow = smoothstep(0.99, 1., arrow);

      // float arrow2 = abs(y) - (vUv.y - 1.) * arrowLength;
      float arrow2 = 1. - (abs(y) + (vUv.y - 1.) * arrowLength);
      arrow *= smoothstep(0.95, 1., arrow2);

      if (arrow < 0.9) discard;



      gl_FragColor = vec4(col, 1.);
    }
  `

  
  /*------------------------------
  Material Shader
  ------------------------------*/
  let materialShader
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0. },
      uTexture1: { value: texture2 },
      uTexture2: { value: texture },
      uColor1: { value: new THREE.Vector3(0.980, 0.437, 0.000) },
      uColor2: { value: new THREE.Vector3(1.000, 0.644, 0.000) },
      uPosition: { value: 0.01},
      uFront: { value: 1 },
      uRotation: { value: 0.5 },
    },
    fragmentShader: fragment,
    vertexShader: vertex,
    side: THREE.FrontSide,
    transparent: true,
  })
  const material2 = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0. },
      uTexture1: { value: texture },
      uTexture2: { value: texture2 },
      uColor1: { value: new THREE.Vector3(0.000, 0.207, 0.591) },
      uColor2: { value: new THREE.Vector3(0.000, 0.304, 0.806) },
      uPosition: { value: -0.02},
      uFront: { value: -1 },
      uRotation: { value: 0.5 },
    },
    fragmentShader: fragment,
    vertexShader: vertex,
    side: THREE.BackSide,
    transparent: true,
  })


  const mesh = new THREE.Mesh(planeGeometry, material)
  const mesh2 = new THREE.Mesh(planeGeometry, material2)

  const group = new THREE.Group()
  scene.add(group)

  mesh.rotation.z = -Math.PI * .5
  mesh2.rotation.z = -Math.PI * .5

  group.add(mesh)
  group.add(mesh2)





  /*------------------------------
  Plane Vertex
  ------------------------------*/
  const planeVertex = /* glsl */`
    precision highp float;
    varying vec2 vUv;

    void main() {
      vUv = uv;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.);
      gl_Position = projectionMatrix * mvPosition;
    }
  `

  /*------------------------------
  Plane Fragment
  ------------------------------*/
  const planeFragment = /* glsl */`
    precision highp float;
    varying vec2 vUv;

    void main() {
      vec2 uv = vUv;
      uv -= 0.5;
      float d = 1. - length(uv);
      vec3 col1 = vec3(0.683, 0.810, 0.976);
      vec3 col2 = vec3(0.94, 0.94, 0.994);
      vec3 col = mix(col1, col2, d);
      gl_FragColor = vec4(col, 1.);
    }
  `

  
  /*------------------------------
  Plane Material Shader
  ------------------------------*/
  const planeMaterial = new THREE.ShaderMaterial({
    fragmentShader: planeFragment,
    vertexShader: planeVertex,
    side: THREE.FrontSide,
    transparent: true,
  })

  const planeGeo = new THREE.PlaneGeometry(10, 10, 1, 1)
  const plane = new THREE.Mesh(planeGeo, planeMaterial)
  plane.position.z = -4
  // scene.add(plane)



  const handleMouse = e => {
    mouse.x = e.clientX || e.touches[0].clientX
    mouse.y = e.clientY || e.touches[0].clientY
  }


  const handleClick = (e) => {
    mouse.click = e.type === 'mousedown' || e.type === 'touchstart' ? -1 : 0
  }

  window.addEventListener('mousemove', handleMouse)
  window.addEventListener('touchmove', handleMouse)

  document.addEventListener('mousedown', handleClick)
  document.addEventListener('mouseup', handleClick)
  window.addEventListener('touchend', handleClick)
  window.addEventListener('touchstart', (e) => {
    handleMouse(e)
    handleClick(e)
  })


  const easeInOutQuad = t => t<.5 ? 2*t*t : -1+(4-2*t)*t
  const easeOutCubic = t => (--t)*t*t+1

  const easeInOutQuint = t => t<.5 ? 16*t*t*t*t*t : 1+16*(--t)*t*t*t*t




  return {
    resize({ pixelRatio, viewportWidth, viewportHeight }) {
      renderer.setPixelRatio(pixelRatio)
      renderer.setSize(viewportWidth, viewportHeight, false)
      camera.aspect = viewportWidth / viewportHeight
      camera.updateProjectionMatrix()
    },
    render({ time, playhead }) {
      if (material) {
        material.uniforms.uTime.value = playhead
        material2.uniforms.uTime.value = playhead
      }

      rotation.x = lerp(
        rotation.x,
        mapRange(mouse.y, 0, window.innerHeight, -Math.PI * .5, Math.PI * .5),
        0.03
      )
      rotation.y = lerp(
        rotation.y,
        mapRange(mouse.x, 0, window.innerWidth, -Math.PI * 0.5, Math.PI * 0.5),
        0.03
      )

      rotation.z = lerp(
        rotation.z,
        mouse.click,
        0.1
      )

      group.rotation.x = rotation.x
      group.rotation.y = rotation.y
      group.position.z = rotation.z

      // controls.update()
      renderer.render(scene, camera)
    },
    unload() {
      // controls.dispose()
      renderer.dispose()
    }
  }
}

canvasSketch(sketch, settings)
