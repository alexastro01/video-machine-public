import { useLayoutEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import {
  DepthTexture,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  UnsignedShortType,
  Vector2,
  WebGLRenderTarget,
} from "three";
// Rendering-only pass. Animation values come from the Remotion frame, never a render clock.
export function DepthFocus({
  focus,
  amount,
}: {
  focus: number;
  amount: number;
}) {
  const { gl, size } = useThree(),
    values = useRef({ focus, amount });
  useLayoutEffect(() => {
    values.current = { focus, amount };
  }, [focus, amount]);
  useLayoutEffect(() => {
    const target = new WebGLRenderTarget(size.width, size.height, {
      depthBuffer: true,
    });
    target.texture.colorSpace = SRGBColorSpace;
    target.depthTexture = new DepthTexture(
      size.width,
      size.height,
      UnsignedShortType,
    );
    const material = new ShaderMaterial({
      toneMapped: false,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        picture: { value: target.texture },
        depth: { value: target.depthTexture },
        pixel: { value: new Vector2(1 / size.width, 1 / size.height) },
        focus: { value: 0 },
        amount: { value: 0 },
        near: { value: 0.1 },
        far: { value: 90 },
      },
      vertexShader:
        "varying vec2 uvPass; void main(){uvPass=uv;gl_Position=vec4(position.xy,0.,1.);}",
      fragmentShader:
        `varying vec2 uvPass;uniform sampler2D picture;uniform sampler2D depth;uniform vec2 pixel;uniform float focus;uniform float amount;uniform float near;uniform float far;
      void main(){float d=texture2D(depth,uvPass).x;float z=near*far/(far-(far-near)*d);float radius=clamp((abs(z-focus)-0.8)*amount,0.,2.4);vec3 c=texture2D(picture,uvPass).rgb*0.28;
      for(int i=0;i<8;i++){float a=float(i)*0.785398; c+=texture2D(picture,uvPass+vec2(cos(a),sin(a))*pixel*radius).rgb*0.09;}gl_FragColor=vec4(c,1.); #include <colorspace_fragment> }`
          .replace("#include", "\n#include")
          .replace("fragment> }", "fragment>\n}"),
    });
    const scene = new Scene(),
      geometry = new PlaneGeometry(2, 2),
      quad = new Mesh(geometry, material),
      camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    scene.add(quad);
    const original = gl.render.bind(gl);
    gl.render = (source, sourceCamera) => {
      if (source === scene) {
        original(source, sourceCamera);
        return;
      }
      material.uniforms.focus.value = values.current.focus;
      material.uniforms.amount.value = values.current.amount;
      const prior = gl.getRenderTarget();
      gl.setRenderTarget(target);
      original(source, sourceCamera);
      gl.setRenderTarget(prior);
      original(scene, camera);
    };
    return () => {
      gl.render = original;
      target.dispose();
      target.depthTexture?.dispose();
      material.dispose();
      geometry.dispose();
    };
  }, [gl, size.width, size.height]);
  return null;
}
