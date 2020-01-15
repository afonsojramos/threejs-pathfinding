import { Mesh, Vector3, Material } from "three";

export default class Cell {
  x: number;
  y: number;
  isObstacle: boolean;
  mesh: Mesh;
  worldCoords: Vector3;
  cube: Mesh;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  getWorldCoords(): Vector3 {
    return new Vector3(
      this.mesh.position.x,
      this.mesh.position.y,
      -this.mesh.position.z
    );
  }

  setObstacle(cube: Mesh): Mesh {
    if (this.isObstacle && this.cube != null) {
      this.isObstacle = false;
      this.cube.geometry.dispose();
      var mat: Material = <Material>this.cube.material;
      mat.dispose();
      return this.cube;
    } else {
      this.isObstacle = true;
      this.cube = cube;

      //TODO fast programming - remove hardcoded coords
      var woldCoords = this.mesh.position
        .clone()
        .sub(new Vector3(10, -0.5, 10));
      cube.position.set(woldCoords.x, woldCoords.y, woldCoords.z);
    }
  }
}
