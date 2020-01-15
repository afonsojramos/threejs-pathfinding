import Cell from "./cell";
import Grid from "./grid";

export default class Pathfinder {
  aStar(start: Cell, goal: Cell, grid: Grid): Array<Cell> {
    var openSet: Array<Cell> = new Array<Cell>();
    openSet.push(start);

    var cameFrom: Map<Cell, Cell> = new Map<Cell, Cell>();

    var gScore: Map<Cell, number> = new Map<Cell, number>();
    gScore.set(start, 0);

    var fScore: Map<Cell, number> = new Map<Cell, number>();
    fScore.set(start, this.heuristic(start, start));

    while (openSet.length > 0) {
      openSet.sort((a, b) => fScore.get(a) - fScore.get(b));
      var current: Cell = openSet[0];
      if (current === goal) {
        return this.reconstructPath(cameFrom, current);
      }

      //remove first (current element)
      openSet.shift();

      grid.getNeighbors(current, true).forEach(neighbor => {
        var tentativeScore =
          gScore.get(current) + this.distance(current, neighbor);
        var neighborGScore = gScore.has(neighbor)
          ? gScore.get(neighbor)
          : Number.MAX_VALUE;

        if (tentativeScore < neighborGScore) {
          cameFrom.set(neighbor, current);
          gScore.set(neighbor, tentativeScore);
          fScore.set(
            neighbor,
            gScore.get(neighbor) + this.heuristic(start, neighbor)
          );
          if (!openSet.includes(neighbor)) {
            openSet.push(neighbor);
          }
        }
      });
    }

    return null;
  }

  reconstructPath(cameFrom: Map<Cell, Cell>, lastCell: Cell): Array<Cell> {
    var totalPath: Array<Cell> = new Array<Cell>();
    totalPath.push(lastCell);

    while (cameFrom.has(lastCell)) {
      lastCell = cameFrom.get(lastCell);
      totalPath.push(lastCell);
    }

    totalPath.reverse();
    return totalPath;
  }

  distance(start: Cell, destination: Cell): number {
    return Math.sqrt(
      (start.x - destination.x) * (start.x - destination.x) +
        (start.y - destination.y) * (start.y - destination.y)
    );
  }

  heuristic(start: Cell, destination: Cell): number {
    return this.distance(start, destination);
  }
}
