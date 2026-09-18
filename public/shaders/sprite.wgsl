struct Uniforms {
    mvp: mat4x4f,
    palette: array<vec3f, 4>,
    spritesheet_size: vec2f,
    text_size: vec2f,
    time: f32,
};

struct SpriteRect {
    palette: vec4f,
    pos: vec2f,
    offset: vec2f,
    size: vec2f,
    texture_id: f32,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@group(1) @binding(0) var sprite_sampler: sampler;
@group(1) @binding(1) var spritesheet_texture: texture_2d<f32>;
@group(1) @binding(2) var text_texture: texture_2d<f32>;
@group(1) @binding(3) var<storage, read> sprites: array<SpriteRect>;

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
    let sprite = sprites[instance_index];

    let quad_index = array<u32, 6>(0u, 2u, 1u, 2u, 3u, 1u)[vertex_index];

    let uv = vec2f(f32(quad_index & 1u), f32((quad_index >> 1u) & 1u));

    var size = uniforms.spritesheet_size;
    if sprite.texture_id == 1 {
        size = uniforms.text_size;
    }
    let spriteUv = (sprite.offset + (uv * sprite.size)) / size;

    let uv2 = vec2f(
        uv.x * sprite.size.x,
        uv.y * sprite.size.y,
    ) + sprite.pos;

    var offset = BASES[0u] * uv2;

    let worldPos = offset;

    var out: VertexOutput;
    // out.pos = uniforms.mvp * rot2D(uniforms.time * .2) * vec4f(worldPos, 1.0);
    out.pos = uniforms.mvp * vec4f(worldPos, 1.0);
    out.uv = spriteUv;
    out.palette = sprite.palette;

    return out;
}

@fragment
fn fs(in: VertexOutput) -> @location(0) vec4f {
    let sample = textureSample(spritesheet_texture, sprite_sampler, in.uv);

    var index = min(3u, u32(floor(sample.r * 4.0)));

    if sample.r <= .06 { index = 0; }
	else if sample.r <= .25 { index = 1; }
	else if sample.r <= .75 { index = 2; }
	else { index = 3; }

    index = u32(in.palette[index]);

    return vec4f(vec3f(f32(index) / 3.), sample.a);
}
