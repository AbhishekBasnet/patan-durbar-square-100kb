// Geometry helpers that every architecture part, statue and prop is built from: a transform stack, boxes,
// prisms, lathes (shapes turned around an axis), sweeps and quads, all written into one growing vertex list.
// Vertex: position (3 floats), normal + baked ambient occlusion (4 snorm8), material id + variant (4 uint8).
// Depends on nothing.

export const bytesPerVertex = 20;

// A unit prism standing on y = 0 and reaching y = 1, with `sideCount` flat sides whose centres lie 1 unit
// from the axis (a 4-sided prism is the box from -1 to 1). The blockout blocks and houses taper it per instance.
export function createPrismMesh(sideCount) {
  const builder = new MeshBuilder();
  builder.addPrism(sideCount, 1, 1, 1, 1);
  const corners = new Float32Array(builder.vertexCount * 3);
  for (let index = 0; index < builder.vertexCount; index++) {
    corners[index * 3] = builder.positions[index * 3];
    corners[index * 3 + 1] = builder.positions[index * 3 + 1];
    corners[index * 3 + 2] = builder.positions[index * 3 + 2];
  }
  return corners;
}

export class MeshBuilder {
  constructor() {
    this.positions = [];
    this.normals = []; // x, y, z, occlusion (1 open sky, 0 fully shut in)
    this.materials = []; // material id, variant (0-255, a random tint per part), carving strength, spare
    this.matrix = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]; // 3x3 rotation-scale (column-major) + translation
    this.matrixStack = [];
    this.currentMaterial = 0;
    this.currentVariant = 0;
    this.currentCarving = 0;
    this.currentOcclusion = 1;
  }

  get vertexCount() {
    return this.positions.length / 3;
  }

  // ---- state
  material(materialId, variant = this.currentVariant, carving = 0) {
    this.currentMaterial = materialId;
    this.currentVariant = variant;
    this.currentCarving = carving;
    return this;
  }

  occlusion(amount) {
    this.currentOcclusion = amount;
    return this;
  }

  push() {
    this.matrixStack.push([...this.matrix]);
    return this;
  }

  pop() {
    this.matrix = this.matrixStack.pop();
    return this;
  }

  // Multiplies the current transform by a 3x4 matrix given as columns (a, b, c) and translation t.
  applyTransform(a0, a1, a2, b0, b1, b2, c0, c1, c2, t0, t1, t2) {
    const m = this.matrix;
    const column = (x, y, z) => [m[0] * x + m[3] * y + m[6] * z, m[1] * x + m[4] * y + m[7] * z, m[2] * x + m[5] * y + m[8] * z];
    const a = column(a0, a1, a2), b = column(b0, b1, b2), c = column(c0, c1, c2), t = column(t0, t1, t2);
    this.matrix = [...a, ...b, ...c, m[9] + t[0], m[10] + t[1], m[11] + t[2]];
    return this;
  }

  translate(x, y, z) {
    return this.applyTransform(1, 0, 0, 0, 1, 0, 0, 0, 1, x, y, z);
  }

  scale(x, y = x, z = x) {
    return this.applyTransform(x, 0, 0, 0, y, 0, 0, 0, z, 0, 0, 0);
  }

  // Turns about the vertical axis; a positive angle turns +x toward +z.
  rotateY(angle) {
    const cosine = Math.cos(angle), sine = Math.sin(angle);
    return this.applyTransform(cosine, 0, sine, 0, 1, 0, -sine, 0, cosine, 0, 0, 0);
  }

  // Tilts about the x axis; a positive angle turns +y toward +z.
  rotateX(angle) {
    const cosine = Math.cos(angle), sine = Math.sin(angle);
    return this.applyTransform(1, 0, 0, 0, cosine, sine, 0, -sine, cosine, 0, 0, 0);
  }

  // Tilts about the z axis; a positive angle turns +x toward +y.
  rotateZ(angle) {
    const cosine = Math.cos(angle), sine = Math.sin(angle);
    return this.applyTransform(cosine, sine, 0, -sine, cosine, 0, 0, 0, 1, 0, 0, 0);
  }

  // ---- vertices
  addVertex(x, y, z, normalX, normalY, normalZ) {
    const m = this.matrix;
    this.positions.push(m[0] * x + m[3] * y + m[6] * z + m[9], m[1] * x + m[4] * y + m[7] * z + m[10], m[2] * x + m[5] * y + m[8] * z + m[11]);
    // normals go through the inverse transpose (the cofactor matrix), so stretched shapes still light right
    const cofactorX = (m[4] * m[8] - m[5] * m[7]) * normalX + (m[5] * m[6] - m[3] * m[8]) * normalY + (m[3] * m[7] - m[4] * m[6]) * normalZ;
    const cofactorY = (m[2] * m[7] - m[1] * m[8]) * normalX + (m[0] * m[8] - m[2] * m[6]) * normalY + (m[1] * m[6] - m[0] * m[7]) * normalZ;
    const cofactorZ = (m[1] * m[5] - m[2] * m[4]) * normalX + (m[2] * m[3] - m[0] * m[5]) * normalY + (m[0] * m[4] - m[1] * m[3]) * normalZ;
    const length = Math.hypot(cofactorX, cofactorY, cofactorZ) || 1;
    this.normals.push(cofactorX / length, cofactorY / length, cofactorZ / length, this.currentOcclusion);
    this.materials.push(this.currentMaterial, this.currentVariant, this.currentCarving, 0);
  }

  // Mirroring transforms flip the winding; this keeps triangles facing outward.
  get isMirrored() {
    const m = this.matrix;
    return m[0] * (m[4] * m[8] - m[5] * m[7]) - m[3] * (m[1] * m[8] - m[2] * m[7]) + m[6] * (m[1] * m[5] - m[2] * m[4]) < 0;
  }

  // A flat triangle; corners counter-clockwise seen from the front.
  addTriangle(a, b, c) {
    if (this.isMirrored) [b, c] = [c, b];
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const normalX = uy * vz - uz * vy, normalY = uz * vx - ux * vz, normalZ = ux * vy - uy * vx;
    for (const corner of [a, b, c]) this.addVertex(corner[0], corner[1], corner[2], normalX, normalY, normalZ);
    return this;
  }

  addQuad(a, b, c, d) {
    return this.addTriangle(a, b, c).addTriangle(a, c, d);
  }

  // An axis-aligned box between two corners.
  addBox(x0, y0, z0, x1, y1, z1) {
    const p = (x, y, z) => [x ? x1 : x0, y ? y1 : y0, z ? z1 : z0];
    this.addQuad(p(0, 0, 1), p(1, 0, 1), p(1, 1, 1), p(0, 1, 1)); // south (+z)
    this.addQuad(p(1, 0, 0), p(0, 0, 0), p(0, 1, 0), p(1, 1, 0)); // north
    this.addQuad(p(1, 0, 1), p(1, 0, 0), p(1, 1, 0), p(1, 1, 1)); // east (+x)
    this.addQuad(p(0, 0, 0), p(0, 0, 1), p(0, 1, 1), p(0, 1, 0)); // west
    this.addQuad(p(0, 1, 1), p(1, 1, 1), p(1, 1, 0), p(0, 1, 0)); // top
    this.addQuad(p(0, 0, 0), p(1, 0, 0), p(1, 0, 1), p(0, 0, 1)); // bottom
    return this;
  }

  // A box centred on x and z, standing on y0.
  addCentredBox(halfX, y0, y1, halfZ) {
    return this.addBox(-halfX, y0, -halfZ, halfX, y1, halfZ);
  }

  // A prism with flat sides, `apothem` from the axis to each side's centre, tapering by topScale x/z.
  addPrism(sideCount, apothem, height, topScaleX = 1, topScaleZ = 1, withCaps = true) {
    const cornerRadius = apothem / Math.cos(Math.PI / sideCount);
    const corner = (index, y) => {
      const angle = (index + 0.5) * (2 * Math.PI / sideCount);
      const scaleX = y ? topScaleX : 1, scaleZ = y ? topScaleZ : 1;
      return [Math.cos(angle) * cornerRadius * scaleX, y, Math.sin(angle) * cornerRadius * scaleZ];
    };
    for (let side = 0; side < sideCount; side++) {
      const next = side + 1;
      this.addQuad(corner(next, 0), corner(side, 0), corner(side, height), corner(next, height));
      if (withCaps) {
        this.addTriangle([0, height, 0], corner(next, height), corner(side, height));
        this.addTriangle([0, 0, 0], corner(side, 0), corner(next, 0));
      }
    }
    return this;
  }

  // Turns a profile of [radius, y] points around the vertical axis, with smooth normals.
  // radiusAt(angle) optionally scales the radius around the turn (flutes, ribs, an oval section).
  addLathe(profile, segmentCount, radiusAt = null) {
    const ring = (pointIndex, segment) => {
      const angle = segment / segmentCount * 2 * Math.PI;
      const [radius, y] = profile[pointIndex];
      const scale = radiusAt ? radiusAt(angle) : 1;
      return [Math.cos(angle) * radius * scale, y, Math.sin(angle) * radius * scale];
    };
    const profileNormal = (pointIndex) => {
      const previous = profile[Math.max(0, pointIndex - 1)], next = profile[Math.min(profile.length - 1, pointIndex + 1)];
      const deltaRadius = next[0] - previous[0], deltaY = next[1] - previous[1];
      const length = Math.hypot(deltaRadius, deltaY) || 1;
      return [deltaY / length, -deltaRadius / length]; // outward, perpendicular to the profile
    };
    const mirrored = this.isMirrored;
    for (let pointIndex = 0; pointIndex < profile.length - 1; pointIndex++) {
      const normalA = profileNormal(pointIndex), normalB = profileNormal(pointIndex + 1);
      for (let segment = 0; segment < segmentCount; segment++) {
        const corners = [[pointIndex, segment, normalA], [pointIndex, segment + 1, normalA], [pointIndex + 1, segment + 1, normalB], [pointIndex + 1, segment, normalB]];
        const order = mirrored ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
        for (const cornerIndex of order) {
          const [point, seg, normal] = corners[cornerIndex];
          const position = ring(point, seg), angle = seg / segmentCount * 2 * Math.PI;
          this.addVertex(position[0], position[1], position[2], Math.cos(angle) * normal[0], normal[1], Math.sin(angle) * normal[0]);
        }
      }
    }
    return this;
  }

  // A rough sphere or ellipsoid of radius 1, centred on the origin (scale it first).
  addSphere(segmentCount = 8, ringCount = 5) {
    const profile = [];
    for (let ringIndex = 0; ringIndex <= ringCount; ringIndex++) {
      const angle = Math.PI * (ringIndex / ringCount - 0.5);
      profile.push([Math.cos(angle) + 1e-4, Math.sin(angle)]);
    }
    return this.addLathe(profile, segmentCount);
  }

  // A tube of `radius` along a polyline of [x, y, z] points (ropes, bell chains, wires).
  addTube(points, radius, sideCount = 4) {
    for (let index = 0; index < points.length - 1; index++) {
      const [ax, ay, az] = points[index], [bx, by, bz] = points[index + 1];
      const dx = bx - ax, dy = by - ay, dz = bz - az, length = Math.hypot(dx, dy, dz);
      // two directions across the segment
      let sideX = -dz, sideY = 0, sideZ = dx;
      if (Math.hypot(sideX, sideZ) < 1e-6) { sideX = 1; sideZ = 0; }
      const sideLength = Math.hypot(sideX, sideY, sideZ);
      sideX /= sideLength; sideZ /= sideLength;
      const upX = (dy * sideZ - dz * sideY) / length, upY = (dz * sideX - dx * sideZ) / length, upZ = (dx * sideY - dy * sideX) / length;
      const around = (point, side) => {
        const angle = side / sideCount * 2 * Math.PI, cosine = Math.cos(angle) * radius, sine = Math.sin(angle) * radius;
        return [point[0] + sideX * cosine + upX * sine, point[1] + sideY * cosine + upY * sine, point[2] + sideZ * cosine + upZ * sine];
      };
      for (let side = 0; side < sideCount; side++) {
        this.addQuad(around(points[index], side), around(points[index], side + 1), around(points[index + 1], side + 1), around(points[index + 1], side));
      }
    }
    return this;
  }

  // Appends another builder's finished vertices through the current transform (for parts built once and
  // placed many times, such as struts and bells).
  addMesh(other) {
    const mirrored = this.isMirrored;
    for (let triangle = 0; triangle < other.vertexCount; triangle += 3) {
      const order = mirrored ? [0, 2, 1] : [0, 1, 2];
      for (const corner of order) {
        const index = triangle + corner;
        const [x, y, z] = other.positions.slice(index * 3, index * 3 + 3);
        const [normalX, normalY, normalZ, occlusion] = other.normals.slice(index * 4, index * 4 + 4);
        const [materialId, variant, carving] = other.materials.slice(index * 4, index * 4 + 3);
        this.currentOcclusion = occlusion;
        this.currentMaterial = materialId; this.currentVariant = variant; this.currentCarving = carving;
        this.addVertex(x, y, z, normalX, normalY, normalZ);
      }
    }
    return this;
  }

  // Packs everything into the GPU vertex format.
  toVertexData() {
    const data = new ArrayBuffer(this.vertexCount * bytesPerVertex);
    const floats = new Float32Array(data), signedBytes = new Int8Array(data), bytes = new Uint8Array(data);
    for (let index = 0; index < this.vertexCount; index++) {
      const floatOffset = index * bytesPerVertex / 4, byteOffset = index * bytesPerVertex;
      floats[floatOffset] = this.positions[index * 3];
      floats[floatOffset + 1] = this.positions[index * 3 + 1];
      floats[floatOffset + 2] = this.positions[index * 3 + 2];
      for (let component = 0; component < 4; component++) {
        signedBytes[byteOffset + 12 + component] = Math.round(Math.max(-1, Math.min(1, this.normals[index * 4 + component])) * 127);
        bytes[byteOffset + 16 + component] = this.materials[index * 4 + component];
      }
    }
    return data;
  }
}
