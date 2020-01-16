import Grid from "./grid";
import {
  Vector2,
  MeshLambertMaterial,
  Raycaster,
  ImageUtils,
  Scene,
  Mesh,
  BoxGeometry
} from "three";
import Pathfinder from "./pathfinder";
import Soldier from "./soldier";

export default class InputController {
  constructor(grid: Grid, scene: Scene) {
    this.grid = grid;
    this.scene = scene;
    this.raycaster = new Raycaster();
    this.pathfinder = new Pathfinder();
  }

  //mouse interaction
  soldier: Soldier;
  pathfinder: Pathfinder;
  grid: Grid;
  scene: Scene;
  raycaster: THREE.Raycaster;
  INTERSECTED;

  initSold(sold: Soldier): void {
    this.soldier = sold;
  }

  mouseInteract(mouse, camera): void {
    this.raycaster.setFromCamera(mouse, camera);

    var intersects = this.raycaster.intersectObjects(
      this.grid.treeObj.children
    );
    if (intersects.length > 0) {
      if (this.INTERSECTED != intersects[0].object) {
        //if(this.INTERSECTED) this.INTERSECTED.material.color.set(0x000000);
        //if (INTERSECTED) INTERSECTED.material.color.set(INTERSECTED.currentColor);
        this.INTERSECTED = intersects[0].object;
        //console.log(this.INTERSECTED);
        this.INTERSECTED.currentColor = this.INTERSECTED.material.color;
        //this.INTERSECTED.material.color.set(0xff0000);
      }
    } else {
      if (this.INTERSECTED) this.INTERSECTED.material.color.set(0x000000);
      this.INTERSECTED = null;
    }
  }

  firstClick = true;

  onMouseDown(mouse, camera, event): void {
    if (event.which == 1) {
      this.onLeftClick(mouse, camera);
    } else if (event.which == 3) {
      this.onRightClick(mouse, camera);
    }
  }

  onLeftClick(mouse, camera): void {
    this.raycaster.setFromCamera(mouse, camera);

    var intersects = this.raycaster.intersectObjects(
      this.grid.treeObj.children
    );
    if (intersects.length > 0) {
      var vec2: Vector2 = new Vector2(
        intersects[0].point.x,
        intersects[0].point.z
      );
      var griDvec2 = this.grid.toGridCoords(vec2);
      console.log(vec2);

      var soldGridCoords = this.grid.toGridCoordsVec3(
        this.soldier.model.position
      );
      var startCell = this.grid.cellGrid[soldGridCoords.x][soldGridCoords.y];
      var endCell = this.grid.cellGrid[griDvec2.x][griDvec2.y];
      var path = this.pathfinder.aStar(startCell, endCell, this.grid);
      this.soldier.setPath(path);
    }
  }

  onRightClick(mouse, camera): void {
    var intersects = this.raycaster.intersectObjects(
      this.grid.treeObj.children
    );
    if (intersects.length > 0) {
      var vec2: Vector2 = new Vector2(
        intersects[0].point.x,
        intersects[0].point.z
      );
      var griDvec2 = this.grid.toGridCoords(vec2);

      var cell = this.grid.cellGrid[griDvec2.x][griDvec2.y];
      if (!cell.isObstacle) {
        var cube = this.createCube();
        cell.setObstacle(cube);
      } else {
        var cube = cell.setObstacle(null);
        this.scene.remove(cube);
      }
    }
  }

  createCube(): Mesh {
    var geometry = new BoxGeometry(1, 1, 1);
    var material = new MeshLambertMaterial({
      map: ImageUtils.loadTexture("/resources/crate.jpg")
    });
    var cube = new Mesh(geometry, material);
    this.scene.add(cube);
    return cube;
  }
}
