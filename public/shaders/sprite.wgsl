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
    flipped: f32,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@group(1) @binding(0) var sprite_sampler: sampler;
@group(1) @binding(1) var spritesheet_texture: texture_2d<f32>;
@group(1) @binding(2) var splash_texture: texture_2d<f32>;
@group(1) @binding(3) var text_texture: texture_2d<f32>;
@group(1) @binding(4) var<storage, read> sprites: array<SpriteRect>;

struct VertexOutput {
    @builtin(position) pos: vec4f,
    @location(0) uv: vec2f,
    @location(1) palette: vec4f,
    @location(2) texture_id: f32,
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
    var sprite = sprites[instance_index];
    var dimensions = sprite.size;

    // a hack for the background lol
    if dimensions.x == 1f && dimensions.y == 1f {
        dimensions.x *= 160.0f;
        dimensions.y *= 144.0f;
    }

    let quad_index = array<u32, 6>(0u, 2u, 1u, 2u, 3u, 1u)[vertex_index];

    let uv = vec2f(f32(quad_index & 1u), f32((quad_index >> 1u) & 1u));

    var size = uniforms.spritesheet_size;
    if sprite.texture_id > 0 {
        size = uniforms.text_size;
    }

    let tex_uv = vec2f(select(uv.x, 1.0 - uv.x, sprite.flipped > 0.5), uv.y);
    let sprite_uv = (sprite.offset + (tex_uv * sprite.size)) / size;

    let uv2 = vec2f(
        uv.x * dimensions.x,
        uv.y * dimensions.y,
    ) + sprite.pos;

    var offset = BASES[0u] * uv2;

    let world_pos = offset;

    var out: VertexOutput;
    // out.pos = uniforms.mvp * rot2D(uniforms.time * .2) * vec4f(world_pos, 1.0);
    out.pos = uniforms.mvp * vec4f(world_pos, 1.0);
    out.uv = sprite_uv;
    out.palette = sprite.palette;
    out.texture_id = sprite.texture_id;

    return out;
}

@fragment
fn fs(in: VertexOutput) -> @location(0) vec4f {
    var uv = in.uv;

    let sample1 = textureSample(spritesheet_texture, sprite_sampler, uv);
    let sample2 = textureSample(splash_texture, sprite_sampler, uv);
    let sample3 = textureSample(text_texture, sprite_sampler, uv);
    var sample = sample1;
    if in.texture_id == 1. {
        sample = sample3;
    }
    if in.texture_id == 2. {
        sample = sample2;
    }

    var index = min(3u, u32(floor(sample.r * 4.0)));

    if sample.r <= .06 { index = 0; }
	else if sample.r <= .25 { index = 1; }
	else if sample.r <= .75 { index = 2; }
	else { index = 3; }

    index = u32(in.palette[index]);

    return vec4f(vec3f(f32(index) / 3.), sample.a);
}
