struct FaceData {
    pos: vec3f,
    face: u32,
};

struct Uniforms {
    mvp: mat4x4f,
    time: f32,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(1) @binding(0) var<storage, read> faces: array<FaceData>;

struct VertexOutput {
    @builtin(position) pos: vec4f,
    @location(0) color: vec3f,
};

const BASES = array<mat2x3f, 6>(
	// +X: (1, y, 1 - x)
    mat2x3f(vec3f(0.0, 0.0, -1.0), vec3f(0.0, 1.0, 0.0)),
	// -X: (0, y, x)
    mat2x3f(vec3f(0.0, 0.0, 1.0), vec3f(0.0, 1.0, 0.0)),
	// +Y: (x, 1, 1 - y)
    mat2x3f(vec3f(1.0, 0.0, 0.0), vec3f(0.0, 0.0, -1.0)),
	// -Y: (x, 0, y)
    mat2x3f(vec3f(1.0, 0.0, 0.0), vec3f(0.0, 0.0, 1.0)),
	// +Z: (x, y, 1)
    mat2x3f(vec3f(1.0, 0.0, 0.0), vec3f(0.0, 1.0, 0.0)),
	// -Z: (1 - x, y, 0)
    mat2x3f(vec3f(-1.0, 0.0, 0.0), vec3f(0.0, 1.0, 0.0)),
);

const ORIGINS = array<vec3f, 6>(
    vec3f(1.0, 0.0, 1.0),
    vec3f(0.0, 0.0, 0.0),
    vec3f(0.0, 1.0, 1.0),
    vec3f(0.0, 0.0, 0.0),
    vec3f(0.0, 0.0, 1.0),
    vec3f(1.0, 0.0, 0.0)
);

const COLORS = array<vec3f, 6>(
    vec3f(0.9, 0.4, 0.4),
    vec3f(0.8, 0.3, 0.3),
    vec3f(0.5, 0.9, 0.5),
    vec3f(0.3, 0.6, 0.3),
    vec3f(0.4, 0.6, 0.9),
    vec3f(0.3, 0.4, 0.7)
);

fn rotY(angle: f32) -> mat4x4<f32> {
    let c = cos(angle);
    let s = sin(angle);

    return mat4x4<f32>(
        vec4<f32>(c, 0.0, -s, 0.0),
        vec4<f32>(0.0, 1.0, 0.0, 0.0),
        vec4<f32>(s, 0.0, c, 0.0),
        vec4<f32>(0.0, 0.0, 0.0, 1.0),
    );
}

@vertex
fn vs(
    @builtin(vertex_index) vertex_index: u32,
    @builtin(instance_index) instance_index: u32,
) -> VertexOutput {
    let quad_index = array<u32, 6>(0u, 1u, 2u, 2u, 1u, 3u)[vertex_index];

    let uv = vec2f(f32(quad_index & 1u), f32((quad_index >> 1u) & 1u));

    let f = faces[instance_index];
    var offset = ORIGINS[f.face] + BASES[f.face] * uv;
    var normalColor = COLORS[f.face];

    let worldPos = f.pos + offset - 0.5;

    var out: VertexOutput;
    out.pos = uniforms.mvp * rotY(3.14159 / 4.) * vec4f(worldPos, 1.0);
    out.color = normalColor;

    return out;
}

@fragment
fn fs(in: VertexOutput) -> @location(0) vec4f {
    return vec4f(in.color, 1.0);
}
