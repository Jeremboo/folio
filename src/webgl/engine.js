import {
  Raycaster
} from 'three';

import Webgl from './core/Webgl';
import Physic from './core/Physic';
import assetsController from './core/assetController';

import CubeWave from './objects/CubeWave';
import CubeExplosion from './objects/CubeExplosion';
import Lights from './objects/Lights';
import Plane from './objects/Plane';

import {
  HAS_TOUCH, CUBE_SCALE_MAX,
  PADDING_LEFT, PADDING_TOP,
} from '../props';

// INTERACTION
const EMPTY_ARRAY = [];

export default class Engine {
  constructor () {
    this.webgl = false;
    this.physic = false;

    this.helper = false;

    // Objects
    this.plane = false;
    this.lights = false;
    this.mouseRaycaster = new Raycaster();
    this.currentCubeWave = false;

    // utils
    this.cubeWavePosition = { x: 0, y: 0 };

    this.resize = this.resize.bind(this);
    this.showProject = this.showProject.bind(this);
    this.hideProject = this.hideProject.bind(this);
    this.handleMoveEvent = this.handleMoveEvent.bind(this);
    this.handleUpEvent = this.handleUpEvent.bind(this);
    this.handleDownEvent = this.handleDownEvent.bind(this);
  }

  resize (w, h) {
    if (this.webgl) {
      this.webgl.resize(w, h);
      // Update the plane
      this.plane.resize(this.webgl.cameraWidth, this.webgl.cameraHeight);

      // Update physic
      this.physic.resize(this.webgl.cameraWidth * 0.5, this.webgl.cameraHeight * 0.5);

      // Update the cube position
      this.cubeWavePosition = {
        x: this.webgl.camera.right - ((this.webgl.cameraWidth / w) * PADDING_LEFT) - (CUBE_SCALE_MAX * 0.5),
        y: this.webgl.camera.bottom + ((this.webgl.cameraHeight / h) * PADDING_TOP) + (CUBE_SCALE_MAX * 0.5),
      };
    }
  }

  /**
   * * *******************
   * * INITS
   * * *******************
   */
  async init(canvas, w, h) {
    await this.initWebgl(canvas, w, h);
    await this.loadGenericAssets();

    // ! FREEEZE ZONE
    if (process.env.NODE_ENV !== 'production') {
      // CREATE FAKE DATA HERE
    }

    // Init the scene, set initial values
    this.initScene();
    // ! FREEEZE ZONE END

    // Add interation
    this.initEventHandlers();
  }

  /**
   * Create the webgl and manage if it is not supported.
   * @return {Promise} [description]
   */
  initWebgl (canvas, w, h) {
    return new Promise((resolve, reject) => {
      try {
        // Init webgl
        this.webgl = new Webgl(canvas, w, h);

        if (process.env.NODE_ENV !== 'production') {
          this.helper = require('./core/helper').default;
        }

        // Init physic
        this.physic = new Physic(
          this.webgl.cameraWiidth * 0.5,
          this.webgl.cameraHeight * 0.5
        );

        resolve();
      } catch (e) {
        this.webgl = false;
        console.error('error', e);
        reject('ERROR engine.initWebgl(): Webgl is not supported');
      }
    });
  }

  loadGenericAssets (onProgress) {
    return assetsController.loadStartingPack(onProgress);
  }

  /**
   * Init for the first time the complete scene
   * - add all elements here
   * - add lights
   * - move camera
   * - ...
   */
  initScene () {
    // ##########################
    // CONTROLLERS

    // ##########################
    // ITEMS

    // Add lights
    this.lights = new Lights(
      this.webgl.camera.top,
      this.webgl.camera.left,
    );
    this.webgl.add(this.lights);

    this.plane = new Plane(
      this.webgl.camera.right * 2,
      this.webgl.camera.top * 2,
    );
    this.webgl.add(this.plane);

    // ##############
    // HELPERS
    if (process.env.NODE_ENV !== 'production') {
      // Helper objects (light debuf or others)
      // GUI
      // this.webgl.add(this.helper.addDirectionalLightHelper(this.lights.directionalLight));
      // this.helper.addVector3(this.lights.directionalLight.position, { range: 15, name: 'dirlight' });
      // this.helper.add(this.lights.directionalLight.shadow.camera, 'left', -10, 10).onChange(() => {
      //   this.lights.directionalLight.shadow.camera.updateProjectionMatrix();
      // });
      // this.helper.add(this.lights.directionalLight.shadow.camera, 'right', -10, 10).onChange(() => {
      //   this.lights.directionalLight.shadow.camera.updateProjectionMatrix();
      // });
    }

    // ##############
    // FIRST OBJECT RENDERER
    // Render complex objects during one frame to compute them now and limit the freeze next time.

    // Compute one cubeW to limit lag ??
    // const cubeW = new CubeWave(
    //   this.cubeWavePosition.x,
    //   this.cubeWavePosition.y,
    //   CUBE_SCALE_MAX,
    // );
    // this.webgl.add(cubeW);
    // this.physic.addCubes(cubeW.children);
    // cubeW.show();
    // this.physic.removeCubes(cubeW.children);
    // this.webgl.remove(cubeW);

    this.webgl.computeMeshes([]);
  }

  initEventHandlers() {
    window.addEventListener(HAS_TOUCH ? 'touchmove' : 'mousemove', this.handleMoveEvent);
    window.addEventListener(HAS_TOUCH ? 'touchstart' : 'mousedown', this.handleDownEvent);
    window.addEventListener(HAS_TOUCH ? 'touchend' : 'mouseup', this.handleUpEvent);
  }

  /**
   * * *******************
   * * START
   * * *******************
   */

  start() {
    this.webgl.start();
    this.physic.start();
  }

  stop() {
    this.webgl.stop();
    this.physic.stop();
  }

  /**
   * * *******************
   * * INTERACTIONS
   * * *******************
   */

  handleDownEvent(e) {
    if (HAS_TOUCH) {
      // Check if the touch intersect a cube on mobile
      const x = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      const y = e.clientY || (e.touches && e.touches[0].clientY) || 0;
      this.updateIntersectedCube(x, y);
    }
    this.physic.handleDownEvent();
  }

  handleUpEvent() {
    this.physic.handleUpEvent();
  }

  handleMoveEvent(e) {
    const x = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const y = e.clientY || (e.touches && e.touches[0].clientY) || 0;

    this.updateIntersectedCube(x, y);

    // transform mouse event to meter position
    this.physic.handleMoveEvent(
      (x * this.webgl.ratioWidth) - this.webgl.camera.right,
      this.webgl.camera.top - (y * this.webgl.ratioHeight),
    );
  }

  // Get the intersected cube at a pixel position
  updateIntersectedCube(x, y) {
    // Check the intersections between the mouse and a cube
    const normalizedPosition = this.webgl.getNormalizedPosFromScreen(x, y);
    this.mouseRaycaster.setFromCamera(normalizedPosition, this.webgl.camera);
    const intersects = this.mouseRaycaster.intersectObjects(this.currentCubeWave.children || EMPTY_ARRAY);

    // Handle interaction
    this.physic.updateCurrentIntersectCube(intersects[0]);
  }

  /**
   * * *******************
   * * PROJECTS
   * * *******************
   */
  async showProject(projectId) {
    // DEBUG
    // projectId = 'test';

    // TODO show loader if nothing is on the floor

    // Hide the current wave if she exist
    this.hideProject();

    // Show a normal project or scribble lab
    this.currentCubeWave = (projectId !== 'scribble-lab')
      ? this._addCubeWave(projectId)
      : this._addCubeExplosion()
    ;

    // TODO hide loader
  }

  /**
   * Hide current cube wave
   */
  hideProject() {
    if (this.currentCubeWave) this._removeCubeGroup(this.currentCubeWave);
    this.currentCubeWave = false;
  }

  /**
   * * *******************
   * * ADD / REMOVE
   * * *******************
   */
  // TODO done only one function for CubeWave and CubeExplosion

  _addCubeWave(projectId) {
    const newCubeWave = new CubeWave(
      this.cubeWavePosition.x,
      this.cubeWavePosition.y,
      CUBE_SCALE_MAX,
    );

    assetsController.loadAsset('projects', projectId).then((asset) => {
      // TODO check if the promise take more than 200ms
      this.webgl.add(newCubeWave);
      this.physic.addCubes(newCubeWave.children);
      setTimeout(() => {
        newCubeWave.setTexture(asset);
        newCubeWave.show();
      }, 300);
    });

    return newCubeWave;
  }

  _addCubeExplosion(x, y) {
    const cubeExplosion = new CubeExplosion(
      this.cubeWavePosition.x,
      this.cubeWavePosition.y,
    );
    this.webgl.add(cubeExplosion);

    assetsController.loadScribblePack((scribbleAsset) => {
      // Check is the currentCubeWave is still the cubeExplosion
      if (this.currentCubeWave.isExplosion) {
        const cube = this.currentCubeWave.addCube(scribbleAsset);
        this.physic.addCube(cube);
        cube.show();
      } else {
        assetsController.stopScribblePackLoading();
      }
    });

    return cubeExplosion;
  }

  /**
   * Hide and remove a grouped cubes on the scene
   * CubeWave & CubeExplosion
   */
  _removeCubeGroup(gc) {
    this.physic.removeCubes(gc.children); // TODO create separate world for each cubes to let the physic works
    gc.hide();
    setTimeout(() => {
      this.webgl.remove(gc);
    }, 1000);
  }
}