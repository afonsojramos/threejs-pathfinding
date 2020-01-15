import * as THREE from "three";
import Stats from "three/examples/jsm/libs/stats.module.js";
import { GUI } from "three/examples/jsm/libs/dat.gui.module.js";
import {
  Scene,
  Renderer,
  PerspectiveCamera,
  WebGLRenderer,
  PlaneGeometry,
  MeshBasicMaterial,
  Vector3,
  Vector2
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import ModelLoader from "./modelLoader";
import Grid from "./grid";
import InputController from "./inputController";
import Soldier from "./soldier";
import TWEEN from "@tweenjs/tween.js";
import Pathfinder from "./pathfinder";

var scene: Scene;
var renderer: WebGLRenderer;
var camera: PerspectiveCamera;
var stats;
var model, skeleton, mixer, clock;
var crossFadeControls = [];
var idleAction, walkAction, runAction;
var idleWeight, walkWeight, runWeight;
var actions, settings;
var singleStepMode = false;
var sizeOfNextStep = 0;
var mouse = new THREE.Vector2();
var inputController: InputController;
var models: Array<Soldier> = Array();

init();

function init() {
  var container = document.getElementById("container");
  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.set(8, 16, -24);
  camera.lookAt(0, 1, 0);
  clock = new THREE.Clock();
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xa0a0a0);
  //scene.fog = new THREE.Fog(0xa0a0a0, 10, 50);
  var hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444);
  hemiLight.position.set(0, 20, 0);
  scene.add(hemiLight);
  var dirLight = new THREE.DirectionalLight(0xffffff);
  dirLight.position.set(-3, 10, -10);
  dirLight.castShadow = true;
  dirLight.shadow.camera.top = 2;
  dirLight.shadow.camera.bottom = -2;
  dirLight.shadow.camera.left = -2;
  dirLight.shadow.camera.right = 2;
  dirLight.shadow.camera.near = 0.1;
  dirLight.shadow.camera.far = 40;
  scene.add(dirLight);
  //scene.add( new CameraHelper( light.shadow.camera ) );
  // ground
  var mesh = new THREE.Mesh(
    new THREE.PlaneBufferGeometry(100, 100),
    new THREE.MeshPhongMaterial({ color: 0x999999, depthWrite: false })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  scene.add(mesh);

  gridSize = 20;
  addGrid();

  var sold = new Soldier();
  sold.init(scene, (soldier: Soldier) => {
    scene.add(soldier.model);
    scene.add(soldier.skeleton);
    models.push(soldier);
    inputController.initSold(soldier);
  });

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.gammaFactor = 2.2;
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  addOrbitControl();

  inputController = new InputController(grid, scene);

  stats = Stats();

  document.addEventListener("mousemove", onDocumentMouseMove, false);
  document.addEventListener("mousedown", onDocumentMouseDown, false);
  document.addEventListener("keydown", onDocumentKeyDown, false);
  window.addEventListener("resize", onWindowResize, false);
  animate();
}

function addOrbitControl() {
  var controls = new OrbitControls(camera, renderer.domElement);
  controls.maxPolarAngle = Math.PI * 0.5;
  //controls.minDistance = 1000;
  //controls.maxDistance = 5000;
}

var grid: Grid;
var gridSize: number = 20;

function addGrid() {
  grid = new Grid(gridSize, 1);
  scene.add(grid.treeObj);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

var elapsedTime: number = 0;

function animate() {
  // Render loop
  requestAnimationFrame(animate);

  var delta = clock.getDelta();
  elapsedTime += delta;

  //update all objects
  TWEEN.update();
  models.forEach(model => {
    model.update(delta);
  });

  stats.update();
  mouseInteract();
  renderer.render(scene, camera);
}

function onDocumentKeyDown(event) {
  var keyCode = event.which;
  if (keyCode == 74) {
    models[0].setTarget(new Vector3(0, 0, 2));
  }
}

function onDocumentMouseMove(event) {
  // calculate mouse position in normalized device coordinates
  // (-1 to +1) for both components
  event.preventDefault();

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function mouseInteract() {
  inputController.mouseInteract(mouse, camera);
}

function onDocumentMouseDown(event) {
  inputController.onMouseDown(mouse, camera, event);
}
