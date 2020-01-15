import * as THREE from "three";
import Cell from "./cell";
import {
  Vector2,
  Material,
  MeshBasicMaterial,
  Vector3,
  MeshLambertMaterial,
  ImageUtils
} from "three";
import Pathfinder from "./pathfinder";

export default class Grid {
  treeObj: THREE.Object3D;
  size: number;
  cellSize: number;
  planeOffset: number;
  cellGrid: Array<Array<Cell>>;
  pathfinder: Pathfinder;

  constructor(size: number, cellSize: number) {
    this.size = size;
    this.cellSize = cellSize;
    this.treeObj = new THREE.Object3D();
    this.pathfinder = new Pathfinder();

    this.init();
    this.generateGrid();
  }

  init(): void {}

  generateGrid(): void {
    this.planeOffset = (this.size * this.cellSize) / 2;
    this.cellGrid = new Array(this.size);

    for (var i = 0; i < this.cellGrid.length; i++) {
      this.cellGrid[i] = new Array(this.size);
    }

    var geometry: THREE.PlaneGeometry = new THREE.PlaneGeometry(1, 1, 1);

    // Loop to initilize 2D array elements.
    for (var i = 0; i < this.size; i++) {
      for (var j = 0; j < this.size; j++) {
        var newCell = new Cell(i, j);

        var material: THREE.MeshPhongMaterial = new THREE.MeshPhongMaterial({
          map: ImageUtils.loadTexture("/resources/grass.png"),
          side: THREE.DoubleSide
        });
        var planeMesh = new THREE.Mesh(geometry, material);

        planeMesh.translateX(i * this.cellSize);
        planeMesh.translateZ(j * this.cellSize);
        planeMesh.rotation.x = -Math.PI / 2;

        this.treeObj.add(planeMesh);

        newCell.mesh = planeMesh;
        this.cellGrid[i][j] = newCell;
        this.cellGrid[i][j].worldCoords = this.toWorldCoords(new Vector2(i, j));
      }
    }

    this.treeObj.translateX(-this.planeOffset);
    this.treeObj.translateZ(-this.planeOffset);
  }

  toGridCoordsVec3(worldCoords: Vector3): Vector2 {
    return this.toGridCoords(new Vector2(worldCoords.x, worldCoords.z));
  }

  toGridCoords(worldCoords: Vector2): Vector2 {
    return new Vector2(
      Math.round(worldCoords.x / this.cellSize + this.planeOffset),
      Math.round(worldCoords.y / this.cellSize + this.planeOffset)
    );
  }

  toWorldCoords(gridCoords: Vector2): Vector3 {
    return new Vector3(
      gridCoords.x * this.cellSize - this.planeOffset,
      0,
      gridCoords.y * this.cellSize - this.planeOffset
    );
  }

  isValid(x: number, y: number): boolean {
    return this.inGrid(x, y) && !this.cellGrid[x][y].isObstacle;
  }

  inGrid(x: number, y: number): boolean {
    return x >= 0 && x < this.size && y >= 0 && y < this.size;
  }

  getNeighbors(cell: Cell, considerCorners: boolean = false): Array<Cell> {
    var neighbors: Array<Cell> = new Array<Cell>();

    for (var i = -1; i <= 1; i++) {
      for (var j = -1; j <= 1; j++) {
        if (i == 0 && j == 0) {
          continue;
        }
        if (!considerCorners && Math.abs(i) + Math.abs(j) > 1) {
          continue;
        }

        var x = cell.x + i;
        var y = cell.y + j;

        if (this.isValid(x, y)) {
          var gridCell = this.cellGrid[x][y];
          neighbors.push(gridCell);
        }
      }
    }

    return neighbors;
  }

  getCell(x: number, y: number): Cell {
    if (this.inGrid(x, y)) {
      return this.cellGrid[x][y];
    }
    return null;
  }

  clearColors(): void {
    /* this.cellGrid.forEach(row => 
            {
                row.forEach(c => {
                    c.mesh.material = new MeshLambertMaterial({ map: ImageUtils.loadTexture("/resources/grass.png") })
                })
            }) */
  }
}
