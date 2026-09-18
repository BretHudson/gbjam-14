struct FaceData {
    pos: vec3f,
    face: u32,
};

struct Uniforms {
    mvp: mat4x4f,
    palette: array<vec3f, 4>,
    time: f32,
};

struct SpriteRect {
    textureSize: vec2f,
    pos: vec2f,
    offset: vec2f,
    size: vec2f,
    palette: vec4f,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@group(1) @binding(0) var mySampler: sampler;
@group(1) @binding(1) var myTexture: texture_2d<f32>;
@group(1) @binding(2) var<storage, read> spriteUniforms: array<SpriteRect>;

struct VertexOutput {
    @builtin(position) pos: vec4f,
    @location(0) uv: vec2f,
    @location(1) palette: vec4f,
};

const SCALE: f32 = 120.0;

const BASES = array<mat2x3f, 1>(
    mat2x3f(vec3f(1.0, 0.0, 0.0), vec3f(0.0, 1.0, 0.0)),
);

fn rot2D(angle: f32) -> mat4x4<f32> {
    let c = cos(angle);
    let s = sin(angle);

    return mat4x4<f32>(
        vec4<f32>(c, -s, 0.0, 0.0),
        vec4<f32>(s, c, 0.0, 0.0),
        vec4<f32>(0.0, 0.0, 1.0, 0.0),
        vec4<f32>(0.0, 0.0, 0.0, 1.0),
    );
}

@vertex
fn vs(
    @builtin(vertex_index) vertex_index: u32,
    @builtin(instance_index) instance_index: u32,
) -> VertexOutput {
    let spriteUniform = spriteUniforms[instance_index];

    let quad_index = array<u32, 6>(0u, 2u, 1u, 2u, 3u, 1u)[vertex_index];

    let uv = vec2f(f32(quad_index & 1u), f32((quad_index >> 1u) & 1u));

    let spriteUv = (spriteUniform.offset + (uv * spriteUniform.size)) / spriteUniform.textureSize;

    let uv2 = vec2f(
        uv.x * spriteUniform.size.x,
        uv.y * spriteUniform.size.y,
    ) + spriteUniform.pos;

    var offset = BASES[0u] * uv2;

    let worldPos = offset;

    var out: VertexOutput;
    // out.pos = uniforms.mvp * rot2D(uniforms.time * .2) * vec4f(worldPos, 1.0);
    out.pos = uniforms.mvp * vec4f(worldPos, 1.0);
    out.uv = spriteUv;
    out.palette = spriteUniform.palette;

    return out;
}

@fragment
fn fs(in: VertexOutput) -> @location(0) vec4f {
    let sample = textureSample(myTexture, mySampler, in.uv);

    var index = min(3u, u32(floor(sample.r * 4.0)));

    if sample.r <= .06 { index = 0; }
	else if sample.r <= .25 { index = 1; }
	else if sample.r <= .75 { index = 2; }
	else { index = 3; }

    index = u32(in.palette[index]);

    return vec4f(vec3f(f32(index) / 3.), sample.a);
}
