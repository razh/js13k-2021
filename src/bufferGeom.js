import { bufferAttr_copyVector3sArray } from './bufferAttr.js';

export var bufferGeom_fromGeom = geom => {
  var vertices = [];
  var colors = [];

  geom.faces.map(face => {
    vertices.push(
      geom.vertices[face.a],
      geom.vertices[face.b],
      geom.vertices[face.c],
    );

    var { color, vertexColors } = face;
    if (vertexColors.length === 3) {
      colors.push(...vertexColors);
    } else {
      colors.push(color, color, color);
    }
  });

  return {
    position: bufferAttr_copyVector3sArray(
      new Float32Array(vertices.length * 3),
      vertices,
    ),
    color: bufferAttr_copyVector3sArray(
      new Float32Array(colors.length * 3),
      colors,
    ),
  };
};
