struct Uniforms {
    mvp: mat4x4f,
    palette: array<vec3f, 4>,
    time: f32,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@group(1) @binding(0) var mySampler: sampler;
@group(1) @binding(1) var myTexture: texture_2d<f32>;

struct VertexOutput {
    @builtin(position) pos: vec4f,
    @location(0) uv: vec2f,
};

@vertex
fn vs(
    @builtin(vertex_index) vertex_index: u32,
) -> VertexOutput {
    var pos = array<vec2f, 6>(
        vec2f(-1.0, 1.0),
        vec2f(-1.0, -1.0),
        vec2f(1.0, -1.0),
        vec2f(-1.0, 1.0),
        vec2f(1.0, -1.0),
        vec2f(1.0, 1.0)
    );

    let p = pos[vertex_index];

    var out: VertexOutput;
    out.pos = vec4f(p, 0.0, 1.0);
    out.uv = vec2f((p.x + 1.0) * 0.5, (1.0 - p.y) * 0.5);

    return out;
}

@fragment
fn fs(in: VertexOutput) -> @location(0) vec4f {
    let sample = textureSample(myTexture, mySampler, in.uv);

    var index = min(3u, u32(floor(sample.r * 4.0)));
    let c = f32(index) / 3.;

    return vec4f(vec3f(c), 1.0);
}
