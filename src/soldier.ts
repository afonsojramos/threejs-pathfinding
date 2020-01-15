import {
  Object3D,
  SkeletonHelper,
  AnimationMixer,
  Vector3,
  Matrix4,
  Raycaster,
  Scene,
  LineBasicMaterial,
  Geometry,
  Line,
  Vector2,
  ImageUtils,
  MeshLambertMaterial
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { GUI } from "three/examples/jsm/libs/dat.gui.module.js";
import Cell from "./cell";

export default class Soldier {
  model: Object3D;
  skeleton;
  mixer: AnimationMixer;
  idleAction;
  walkAction;
  runAction;
  idleWeight: number;
  walkWeight: number;
  runWeight: number;
  actions;
  loader: GLTFLoader;
  settings;
  crossFadeControls = [];
  singleStepMode = false;
  sizeOfNextStep = 0;
  scene: Scene;

  //movement
  currentPosition: Vector3 = new Vector3(0, 0, 0);
  velocity: Vector3 = new Vector3(0, 0, 0);
  maxVelocity: number = 3;
  maxForce: number = 0.1;
  target: Vector3 = new Vector3(0, 0, 0);
  currentFacing: Vector3 = new Vector3(0, 0, 1);
  elapsedTime: number = 0;
  targetDistance: number;
  //path follow
  currentPath: Array<Cell> = new Array<Cell>();
  currentIndex: number = 1;
  targetRadius: number = 0.5;
  slowRadius: number = 1;
  lastTarget: Vector3 = new Vector3(0, 0, 0);
  //avoid
  maxSeeAhead: number = 1.5;
  maxAvoidance: number = 0.5;
  raycaster: Raycaster;

  constructor() {}

  init(scene: Scene, onComplete: (solder) => void) {
    this.scene = scene;
    this.raycaster = new Raycaster();
    this.loader = new GLTFLoader();
    this.loader.load("resources/Soldier.glb", gltf =>
      this.loadModel(gltf, this, onComplete)
    );
  }

  loadModel(gltf, sold, onComplete) {
    sold.model = gltf.scene;

    sold.model.traverse(function(object) {
      if (object.isMesh) object.castShadow = true;
    });
    sold.skeleton = new SkeletonHelper(sold.model);
    sold.skeleton.visible = false;

    var animations = gltf.animations;
    sold.mixer = new AnimationMixer(sold.model);
    sold.idleAction = sold.mixer.clipAction(animations[0]);
    sold.walkAction = sold.mixer.clipAction(animations[3]);
    sold.runAction = sold.mixer.clipAction(animations[1]);
    sold.actions = [sold.idleAction, sold.walkAction, sold.runAction];

    sold.showModel(true);
    sold.createSettings();
    sold.activateAllActions();
    sold.setAnimations(0);
    // this.createDebugLine();

    onComplete(this);
  }

  setPosition(newPos: Vector2) {
    this.currentPosition = new Vector3(newPos.x, 0, newPos.y);
  }

  setPath(path: Array<Cell>): void {
    if (path == null || path.length == 0) {
      return;
    }

    this.currentPath = path;
    this.currentIndex = 1;
    this.followNextTarget();
    this.lastTarget = path[path.length - 1].worldCoords;
    // Path highlight
    path.forEach(cell => {
      var material: MeshLambertMaterial = <MeshLambertMaterial>(
        cell.mesh.material
      );
      material.color.set(0xffff0d);
    });
  }

  followNextTarget(): void {
    if (
      this.currentPath == null ||
      this.currentIndex >= this.currentPath.length
    ) {
      return;
    }

    this.setTarget(this.currentPath[this.currentIndex].worldCoords);
    this.currentIndex++;
  }

  onTargetReached: (sold: Soldier) => void = () => {
    console.log("target reached");
  };

  targetReached(): void {
    console.log(this.currentPath);

    this.currentPath.map(cell => {
      var material: MeshLambertMaterial = <MeshLambertMaterial>(
        cell.mesh.material
      );
      material.color.set(0xffffff);
    });
    this.onTargetReached(this);
  }

  changeRotation() {
    var current = this.currentFacing.clone();
    var targetRot = this.target
      .clone()
      .sub(this.currentPosition)
      .normalize()
      .multiplyScalar(-1);

    if (current.distanceTo(targetRot) < 0.1) {
      return;
    }

    this.currentFacing.add(
      targetRot
        .sub(current)
        .normalize()
        .multiplyScalar(0.1)
    );
    var mx = new Matrix4().lookAt(
      this.currentFacing,
      new Vector3(0, 0, 0),
      new Vector3(0, 1, 0)
    );
    this.model.quaternion.setFromRotationMatrix(mx);
  }

  setTarget(target: Vector3): void {
    //set the target
    this.target = target;
    this.targetDistance = target.distanceTo(this.currentPosition);
  }

  getIdleValue(normalizedValue: number): number {
    normalizedValue *= Math.PI / 2;
    return -Math.sin(normalizedValue) + 1;
  }

  getWalkValue(normalizedValue: number): number {
    normalizedValue *= Math.PI / 2;
    return Math.sin(normalizedValue * 2);
  }

  getRunValue(normalizedValue: number): number {
    normalizedValue *= Math.PI / 2;
    return Math.sin(normalizedValue);
  }

  movementUpdate(deltaTime) {
    if (this.currentPosition.clone().distanceTo(this.target) < 0.1) {
      //target reached
      if (this.target == this.lastTarget) {
        this.lastTarget = null;
        this.targetReached();
      }
      return;
    }

    this.changeRotation();

    var desiredVelocity = this.target.clone().sub(this.currentPosition);
    var slowDownDistance = this.lastTarget
      .clone()
      .sub(this.currentPosition)
      .length();

    //slowing down
    if (slowDownDistance < this.slowRadius) {
      desiredVelocity
        .normalize()
        .multiplyScalar(this.maxVelocity)
        .multiplyScalar(slowDownDistance / this.slowRadius);
    } else {
      desiredVelocity.normalize().multiplyScalar(this.maxVelocity);
    }

    //steering + avoidance
    var steering = desiredVelocity.clone().sub(this.velocity);
    steering.add(this.collisionAvoidance());

    steering = steering.clampLength(0, this.maxForce);
    this.velocity = this.velocity
      .clone()
      .add(steering)
      .clampLength(0, this.maxVelocity);

    //===SET POSITION===
    this.currentPosition.add(this.velocity.clone().multiplyScalar(deltaTime));
    this.model.position.set(
      this.currentPosition.x,
      this.currentPosition.y,
      this.currentPosition.z
    );
    //==================

    var currentDistance = this.currentPosition.distanceTo(this.target);

    var normalizedSpeed = this.velocity.length() / this.maxVelocity;
    //console.log(normalizedDistance)
    this.setAnimations(normalizedSpeed);

    //target reached
    if (currentDistance < this.targetRadius) {
      this.followNextTarget();
      return;
    }
  }

  collisionAvoidance(): Vector3 {
    var ahead = this.currentFacing.clone().multiplyScalar(-1);
    var start = this.currentPosition.clone().add(new Vector3(0, 0.3, 0));

    this.raycaster.set(start, ahead);
    this.raycaster.far = this.maxSeeAhead;

    var avoidance = new Vector3(0, 0, 0);
    var intersects = this.raycaster.intersectObjects(this.scene.children);
    {
      if (intersects.length > 0) {
        //TODO prevent debug intersect
        if (intersects[0].object != this.line) {
          console.log("hit");
          avoidance = ahead.clone().sub(intersects[0].object.position);
          avoidance.normalize();
          avoidance.multiplyScalar(this.maxAvoidance);
          avoidance.y = 0;
        }
      }
    }

    return avoidance;
  }

  line;
  createDebugLine() {
    var material = new LineBasicMaterial({ color: 0x0000ff });

    var geometry = new Geometry();
    geometry.vertices.push(new Vector3(0, 0, 0));
    geometry.vertices.push(new Vector3(0, 1, 0));

    this.line = new Line(geometry, material);
    this.scene.add(this.line);
  }

  updateDebugLine(start: Vector3, end: Vector3) {
    this.line.geometry.vertices = [];
    this.line.geometry.vertices.push(start);
    this.line.geometry.vertices.push(end);

    this.line.geometry.verticesNeedUpdate = true;
  }

  setAnimations(value: number) {
    this.setWeight(this.idleAction, this.getIdleValue(value));
    this.setWeight(this.walkAction, this.getWalkValue(value));
    this.setWeight(this.runAction, this.getRunValue(value));
  }

  update(deltaTime): void {
    this.movementUpdate(deltaTime);

    // Get the time elapsed since the last frame, used for mixer update (if not in single step mode)
    var mixerUpdateDelta = deltaTime;
    // If in single step mode, make one step and then do nothing (until the user clicks again)
    if (this.singleStepMode) {
      mixerUpdateDelta = this.sizeOfNextStep;
      this.sizeOfNextStep = 0;
    }
    // Update the animation mixer, the stats panel, and render this frame
    this.mixer.update(mixerUpdateDelta);
  }

  createSettings() {
    this.settings = {
      "modify idle weight": 0.0,
      "modify walk weight": 1.0,
      "modify run weight": 0.0,
      "modify time scale": 1.0
    };
  }

  createPanel() {
    var panel = new GUI({ width: 310 });
    var folder5 = panel.addFolder("Blend Weights");
    var folder6 = panel.addFolder("General Speed");

    this.createSettings();

    folder5
      .add(this.settings, "modify idle weight", 0.0, 1.0, 0.01)
      .listen()
      .onChange(function(weight) {
        this.setWeight(this.idleAction, weight);
      });
    folder5
      .add(this.settings, "modify walk weight", 0.0, 1.0, 0.01)
      .listen()
      .onChange(function(weight) {
        this.setWeight(this.walkAction, weight);
      });
    folder5
      .add(this.settings, "modify run weight", 0.0, 1.0, 0.01)
      .listen()
      .onChange(function(weight) {
        this.setWeight(this.runAction, weight);
      });
    folder6
      .add(this.settings, "modify time scale", 0.0, 1.5, 0.01)
      .onChange(this.modifyTimeScale);
    folder5.open();
    folder6.open();
    this.crossFadeControls.forEach(function(control) {
      control.classList1 =
        control.domElement.parentElement.parentElement.classList;
      control.classList2 = control.domElement.previousElementSibling.classList;
      control.setDisabled = function() {
        control.classList1.add("no-pointer-events");
        control.classList2.add("control-disabled");
      };
      control.setEnabled = function() {
        control.classList1.remove("no-pointer-events");
        control.classList2.remove("control-disabled");
      };
    });
  }

  showModel(visibility) {
    this.model.visible = visibility;
  }

  showSkeleton(visibility) {
    this.skeleton.visible = visibility;
  }

  modifyTimeScale(speed) {
    this.mixer.timeScale = speed;
  }

  deactivateAllActions() {
    this.actions.forEach(function(action) {
      action.stop();
    });
  }

  activateAllActions() {
    this.setWeight(this.idleAction, this.settings["modify idle weight"]);
    this.setWeight(this.walkAction, this.settings["modify walk weight"]);
    this.setWeight(this.runAction, this.settings["modify run weight"]);
    this.actions.forEach(function(action) {
      action.play();
    });
  }

  pauseContinue() {
    if (this.singleStepMode) {
      this.singleStepMode = false;
      this.unPauseAllActions();
    } else {
      if (this.idleAction.paused) {
        this.unPauseAllActions();
      } else {
        this.pauseAllActions();
      }
    }
  }

  pauseAllActions() {
    this.actions.forEach(function(action) {
      action.paused = true;
    });
  }

  unPauseAllActions() {
    this.actions.forEach(function(action) {
      action.paused = false;
    });
  }

  toSingleStepMode() {
    this.unPauseAllActions();
    this.singleStepMode = true;
    this.sizeOfNextStep = this.settings["modify step size"];
  }

  prepareCrossFade(startAction, endAction, defaultDuration) {
    // Switch default / custom crossfade duration (according to the user's choice)
    var duration = this.setCrossFadeDuration(defaultDuration);
    // Make sure that we don't go on in singleStepMode, and that all actions are unpaused
    this.singleStepMode = false;
    this.unPauseAllActions();
    // If the current action is 'idle' (duration 4 sec), execute the crossfade immediately;
    // else wait until the current action has finished its current loop
    if (startAction === this.idleAction) {
      this.executeCrossFade(startAction, endAction, duration);
    } else {
      this.synchronizeCrossFade(startAction, endAction, duration);
    }
  }

  setCrossFadeDuration(defaultDuration) {
    // Switch default crossfade duration <-> custom crossfade duration
    if (this.settings["use default duration"]) {
      return defaultDuration;
    } else {
      return this.settings["set custom duration"];
    }
  }

  synchronizeCrossFade(startAction, endAction, duration) {
    var sold = this;
    this.mixer.addEventListener("loop", onLoopFinished);
    function onLoopFinished(event) {
      if (event.action === startAction) {
        sold.mixer.removeEventListener("loop", onLoopFinished);
        sold.executeCrossFade(startAction, endAction, duration);
      }
    }
  }

  executeCrossFade(startAction, endAction, duration) {
    // Not only the start action, but also the end action must get a weight of 1 before fading
    // (concerning the start action this is already guaranteed in this place)
    this.setWeight(endAction, 1);
    endAction.time = 0;
    // Crossfade with warping - you can also try without warping by setting the third parameter to false
    startAction.crossFadeTo(endAction, duration, true);
  }

  // This function is needed, since animationAction.crossFadeTo() disables its start action and sets
  // the start action's timeScale to ((start animation's duration) / (end animation's duration))
  setWeight(action, weight) {
    action.enabled = true;
    action.setEffectiveTimeScale(1);
    action.setEffectiveWeight(weight);
  }

  // Called by the render loop
  updateWeightSliders() {
    this.settings["modify idle weight"] = this.idleWeight;
    this.settings["modify walk weight"] = this.walkWeight;
    this.settings["modify run weight"] = this.runWeight;
  }

  // Called by the render loop
  updateCrossFadeControls() {
    this.crossFadeControls.forEach(function(control) {
      control.setDisabled();
    });
    if (
      this.idleWeight === 1 &&
      this.walkWeight === 0 &&
      this.runWeight === 0
    ) {
      this.crossFadeControls[1].setEnabled();
    }
    if (
      this.idleWeight === 0 &&
      this.walkWeight === 1 &&
      this.runWeight === 0
    ) {
      this.crossFadeControls[0].setEnabled();
      this.crossFadeControls[2].setEnabled();
    }
    if (
      this.idleWeight === 0 &&
      this.walkWeight === 0 &&
      this.runWeight === 1
    ) {
      this.crossFadeControls[3].setEnabled();
    }
  }
}
