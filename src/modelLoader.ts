import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export default class AnimatedModel {
  loader: GLTFLoader = new GLTFLoader();

  constructor(path: string, onComplete) {
    this.loader.load(path, onComplete);
  }
}
