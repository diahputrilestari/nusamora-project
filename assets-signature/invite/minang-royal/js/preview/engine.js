import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { buildWorld, FOG_COLOR, FOG_DENSITY } from '../components/environment/world.js';
import { buildSky } from '../components/environment/builders/landscape.js';
import { CinematicDirector } from '../components/camera/CinematicDirector.js';
import { SceneController } from '../components/experience/sceneController.js';
import { CinematicGradeShader } from '../components/transitions/gradeShader.js';
import { AudioEngine } from '../components/audio/AudioEngine.js';
import { experienceStore } from '../stores/experience.js';
import { warmTextures } from '../utils/gpuWarmup.js';
import { isDirectorMode, startDirectorMode } from '../components/camera/DirectorMode.js';
export async function startEngine(container, cfg, q) {
    const store = experienceStore.getState();
    const renderer = new THREE.WebGLRenderer({ antialias: q.tier !== 'low', powerPreference: 'high-performance', stencil: false });
    let dpr = Math.min(window.devicePixelRatio, q.maxDpr);
    renderer.setPixelRatio(dpr);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.83;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = q.shadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(FOG_COLOR);
    scene.fog = new THREE.FogExp2(FOG_COLOR, FOG_DENSITY);
    const camera = new THREE.PerspectiveCamera(38, container.clientWidth / container.clientHeight, 0.1, 1600);
    camera.position.set(0, 2.2, 30);
    const world = await buildWorld(cfg, q, (p, label) => store.setProgress(p * 0.9, label));
    scene.add(world.root);
    // image-based light from the sky dome so gold, water and satin reflect the sunset
    store.setProgress(0.92, 'Warming up the lights');
    await new Promise((r) => requestAnimationFrame(r));
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    const envSky = buildSky().object;
    envSky.scale.setScalar(0.05); // keep inside the PMREM cube camera's far plane
    envScene.add(envSky);
    const env = pmrem.fromScene(envScene, 0.02).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.75;
    pmrem.dispose();
    // post-processing chain
    const composer = new EffectComposer(renderer);
    composer.setPixelRatio(dpr);
    composer.setSize(container.clientWidth, container.clientHeight);
    composer.addPass(new RenderPass(scene, camera));
    let bokeh = null;
    if (q.dof) {
        bokeh = new BokehPass(scene, camera, { focus: 10, aperture: 0.00011, maxblur: 0.0055 });
        composer.addPass(bokeh);
    }
    const bloomScale = q.mobile ? 0.5 : 1;
    const bloom = new UnrealBloomPass(new THREE.Vector2(container.clientWidth * bloomScale, container.clientHeight * bloomScale), 0.3, 0.55, 1.0);
    bloom.enabled = q.bloom;
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    const grade = new ShaderPass(CinematicGradeShader);
    grade.uniforms.uGrain.value = q.mobile ? 0.025 : 0.035;
    composer.addPass(grade);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const director = new CinematicDirector(camera, { mobile: q.mobile || q.portrait, reducedMotion: reduced });
    const audio = new AudioEngine(cfg.audio.musicUrl, cfg.audio.musicVolume, cfg.audio.ambience);
    const controller = new SceneController(world, director, audio);
    controller.setFadeHandler((on) => new Promise((res) => {
        flash(on ? 1 : 0, on ? 0.45 : 1.2);
        setTimeout(res, on ? 480 : 0);
    }));
    // warm the GPU: compile every program now instead of hitching mid-flight
    store.setProgress(0.97, 'Composing the first frame');
    renderer.compile(scene, camera);
    warmTextures(renderer, scene);
    director.update(0);
    composer.render();
    // input → parallax
    const onPointer = (e) => {
        director.setParallax((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
    };
    const onOrient = (e) => {
        if (e.gamma == null || e.beta == null)
            return;
        director.setParallax(e.gamma / 25, (e.beta - 50) / 30);
    };
    window.addEventListener('pointermove', onPointer);
    window.addEventListener('deviceorientation', onOrient);
    const resize = () => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        composer.setSize(w, h);
        bloom.resolution.set(w * bloomScale, h * bloomScale);
        director.setMobile(q.mobile || h > w);
    };
    window.addEventListener('resize', resize);
    // fade animation for the opening transition
    let fadeFrom = 0;
    let fadeTo = 0;
    let fadeT = 1;
    let fadeDur = 1;
    const flash = (to, seconds) => {
        fadeFrom = grade.uniforms.uFade.value;
        fadeTo = to;
        fadeT = 0;
        fadeDur = seconds;
    };
    // adaptive quality: step down quickly if we can't hold ~45 fps
    // order: depth of field → resolution (to 0.75× on phones) → shadows → bloom
    let acc = 0;
    let frames = 0;
    let downgrades = 0;
    const minDpr = q.mobile ? 0.75 : 1;
    const adapt = (dt) => {
        acc += dt;
        frames++;
        if (frames < 50)
            return;
        const avg = acc / frames;
        acc = 0;
        frames = 0;
        if (avg <= 1 / 45 || downgrades >= 10)
            return;
        downgrades++;
        if (bokeh && bokeh.enabled)
            bokeh.enabled = false;
        else if (dpr > minDpr + 0.01) {
            dpr = Math.max(minDpr, dpr * 0.82);
            renderer.setPixelRatio(dpr);
            composer.setPixelRatio(dpr);
            resize();
        }
        else if (renderer.shadowMap.enabled) {
            renderer.shadowMap.enabled = false;
            scene.traverse((o) => {
                const m = o.material;
                if (m)
                    m.needsUpdate = true;
            });
        }
        else if (bloom.enabled)
            bloom.enabled = false;
    };
    const clock = new THREE.Clock();
    let running = true;
    let raf = 0;
    let elapsed = 0;
    // #director: free-camera authoring tool for new themes
    const tool = isDirectorMode()
        ? startDirectorMode({ camera, canvas: renderer.domElement, world, director, controller })
        : null;
    const loop = () => {
        raf = requestAnimationFrame(loop);
        if (!running)
            return;
        const dt = Math.min(clock.getDelta(), 0.05);
        elapsed += dt;
        world.update(elapsed, dt, camera);
        tool?.update(dt);
        if (!tool?.free) {
            director.update(dt);
            controller.update(dt);
        }
        renderer.toneMappingExposure = controller.exposure;
        if (bokeh)
            bokeh.uniforms.focus.value = controller.focusDistance(camera);
        grade.uniforms.uTime.value = elapsed;
        if (fadeT < 1) {
            fadeT = Math.min(1, fadeT + dt / fadeDur);
            const e = fadeT * fadeT * (3 - 2 * fadeT);
            grade.uniforms.uFade.value = fadeFrom + (fadeTo - fadeFrom) * e;
        }
        composer.render(dt);
        adapt(dt);
    };
    loop();
    const onVis = () => {
        running = !document.hidden;
        clock.getDelta();
        audio.setSuspended(document.hidden);
    };
    document.addEventListener('visibilitychange', onVis);
    store.setProgress(1, 'Ready');
    return {
        audio,
        controller,
        director,
        world,
        flash,
        dispose: () => {
            cancelAnimationFrame(raf);
            tool?.dispose();
            window.removeEventListener('pointermove', onPointer);
            window.removeEventListener('deviceorientation', onOrient);
            window.removeEventListener('resize', resize);
            document.removeEventListener('visibilitychange', onVis);
            controller.dispose();
            director.dispose();
            audio.dispose();
            world.dispose();
            env.dispose();
            composer.dispose();
            renderer.dispose();
            renderer.domElement.remove();
        },
    };
}
