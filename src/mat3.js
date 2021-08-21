export var mat3_create = () =>
  // prettier-ignore
  new Float32Array([
    1, 0, 0,
    0, 1, 0,
    0, 0, 1,
  ]);

export var mat3_setFromMatrix4 = (a, b) => {
  // prettier-ignore
  a.set([
    b[0], b[4], b[8],
    b[1], b[5], b[9],
    b[2], b[6], b[10],
  ]);

  return a;
};

export var mat3_invert = m => {
  var [n11, n21, n31, n12, n22, n32, n13, n23, n33] = m;

  var t11 = n33 * n22 - n32 * n23,
    t12 = n32 * n13 - n33 * n12,
    t13 = n23 * n12 - n22 * n13,
    det = n11 * t11 + n21 * t12 + n31 * t13;

  if (det === 0) return m.fill(0);

  var detInv = 1 / det;

  m.set([
    t11 * detInv,
    (n31 * n23 - n33 * n21) * detInv,
    (n32 * n21 - n31 * n22) * detInv,

    t12 * detInv,
    (n33 * n11 - n31 * n13) * detInv,
    (n31 * n12 - n32 * n11) * detInv,

    t13 * detInv,
    (n21 * n13 - n23 * n11) * detInv,
    (n22 * n11 - n21 * n12) * detInv,
  ]);

  return m;
};

export var mat3_transpose = m => {
  var tmp;

  tmp = m[1];
  m[1] = m[3];
  m[3] = tmp;

  tmp = m[2];
  m[2] = m[6];
  m[6] = tmp;

  tmp = m[5];
  m[5] = m[7];
  m[7] = tmp;

  return m;
};

export var mat3_getNormalMatrix = (a, b) =>
  mat3_transpose(mat3_invert(mat3_setFromMatrix4(a, b)));
