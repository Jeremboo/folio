import {
  Scene, OrthographicCamera, WebGLRenderer,
  // PCFSoftShadowMap, BasicShadowMap
} from 'three';

import loop from '../../util/loop';
import { HAS_GPU } from '../../props';

export default class Webgl {
  constructor (canvas, w, h) {
    this.width = w;
    this.height = h;
    this.canvas = canvas;
    this.isStarted = false;

    // camera / scene
    this.scene = new Scene();

    // this.camera = new PerspectiveCamera(50, w / h, 1, 1000);
    // this._visibleHeightWithoutDist = 2 * Math.tan(radian(this.camera.fov) / 2); // 2 * Math.tan(this.vFOV / 2)
    this.camera = new OrthographicCamera(-5 * (w / h), 5 * (w / h), 5, -5, 1, 1000);
    this.camera.position.set(0, 0, 10);
    this.cameraWidth = this.camera.right * 2;
    this.cameraHeight = this.camera.top * 2;
    this.ratioWidth = this.cameraWidth / w;
    this.ratioHeight = this.cameraHeight / h;

    // renderer
    this.renderer = new WebGLRenderer({
      antialias: true, // HAS_GPU
      canvas
    });
    this.renderer.setPixelRatio(HAS_GPU && Math.min(1.6, window.devicePixelRatio) || 1);
    this.renderer.setClearColor(0xffffff, 1);
    // this.renderer.toneMapping = Uncharted2ToneMapping;
    // this.renderer.toneMappingExposure = 2.5;
    // this.renderer.toneMappingWhitePoint = 1.5;
    this.renderer.shadowMap.enabled = HAS_GPU;
    // this.renderer.shadowMap.type = BasicShadowMap; // default THREE.PCFShadowMap

    // Bind functions
    this.start = this.start.bind(this);
    this.stop = this.stop.bind(this);
    this.resize = this.resize.bind(this);
    this._update = this._update.bind(this);

    this.resize(this.width, this.height);
  }

  resize (w, h) {
    this.width = w;
    this.height = h;

    // Perspective camera
    // this.camera.aspect = this.width / this.height;
    // this.camera.updateProjectionMatrix();

    // Ortho camera
    this.camera.left = -5 * (w / h);
    this.camera.right = 5 * (w / h);
    this.camera.updateProjectionMatrix();
    this.cameraWidth = this.camera.right * 2;
    this.cameraHeight = this.camera.top * 2;
    this.ratioWidth = this.cameraWidth / w;
    this.ratioHeight = this.cameraHeight / h;

    this.renderer.setSize(this.width, this.height);
  }

  _update () {
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * * *******************
   * * LOOP
   * * *******************
   */
  start () {
    if (!this.isStarted) {
      this.isStarted = true;
      this._update(); // HACK first renderer
      loop.add('0000', this._update);
    }
  }
  stop () {
    if (this.isStarted) {
      this.isStarted = false;
      loop.remove('0000');
    }
  }

  /**
   * * *******************
   * * ADD / REMOVE
   * * *******************
   */
  add (mesh, _id) {
    const id = _id || mesh.uuid;
    if (!id) {
      console.log('ERROR: Webgl.add(): need an id');
      return;
    }
    this.scene.add(mesh);
    if (!mesh.update) return;
    loop.add(id, () => { mesh.update(); });
  }

  remove (mesh, id) {
    this.scene.remove(mesh);
    if (!mesh.update) return;
    loop.remove(id || mesh.uuid, () => { mesh.update(); });
  }

  /**
   * * *******************
   * * UTILS
   * * *******************
   */

  /**
   * Get the normalized pixel from webgl screen.
   */
  getNormalizedPosFromScreen(x, y) {
    return {
      x: ((x / this.width) * 2) - 1,
      y: -((y / this.height) * 2) + 1,
    };
  }

  // Set an array of Meshes in the scene to render them a first time.
  computeMeshes (meshes) {
    let i = 0;
    const l = meshes.length;
    for (i = 0; i < l; i++) {
      this.add(meshes[i]);
    }
    this._update();
    for (i = 0; i < l; i++) {
      this.remove(meshes[i]);
    }
    this._update();
  }
}
