import { createCanvasRenderer } from './escenaCanvas.js';
const root = document.querySelector('[data-cinema]');
if (root) initCinema(root);

async function initCinema(root) {
  const $ = q => root.querySelector(q);
  const viewport = $('[data-viewport]');
  const canvas = $('[data-battle-canvas]');
  const seek = $('[data-cinema-seek]');
  const play = $('[data-cinema-play]');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const duration = 108;
  const chapters = [
    { name: 'El llano', kicker: 'ANTES DEL COMBATE', title: 'Un llano.<br><em>Una casa.</em>', text: 'Entre los llanos y la serranía, una hacienda ganadera se convierte en un punto de resistencia.' },
    { name: 'La defensa', kicker: 'ESTRADA Y LOS DEFENSORES', title: 'Hacer del lugar<br><em>una defensa.</em>', text: 'La casa y los corrales protegen a los combatientes. Fusileros y flecheros se preparan para resistir.' },
    { name: 'El asalto', kicker: 'LA PRESIÓN SOBRE EL CORRAL', title: 'El ataque busca<br><em>una entrada.</em>', text: 'Tras varios rechazos, los filibusteros concentran el esfuerzo en el corral de madera. La distancia se acorta.' },
    { name: 'La pedrada', kicker: 'ANDRÉS CASTRO', title: 'Un instante.<br><em>Una decisión.</em>', text: 'Con el fusil sin cargar, Castro recurre a una piedra. Un gesto que queda en la memoria de una defensa colectiva.' },
    { name: 'El flanqueo', kicker: 'CISNE, SIERO Y FONSECA', title: 'El camino<br><em>por detrás.</em>', text: 'Las partidas salen al amparo del monte y la serranía. Su aparición por la retaguardia cambia el combate.' },
    { name: 'El desenlace', kicker: 'EL TROPEL Y LA RETIRADA', title: 'El llano<br><em>vuelve a respirar.</em>', text: 'El tropel de la caballada aumenta el desconcierto. Los atacantes se retiran. La Guerra Nacional todavía continúa.' }
  ];
  let position = 0, chapter = -1, playing = false, ready = false, inView = false;
  let lastFrame = 0, frame = 0, lastPaint = 0, renderWorld = null;
  const clock = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  const setPlaying = value => {
    playing = value && ready;
    play.setAttribute('aria-pressed', String(playing));
    play.setAttribute('aria-label', playing ? 'Pausar animación' : position >= duration ? 'Repetir animación' : 'Reproducir animación');
    $('[data-play-icon]').textContent = playing ? 'Ⅱ' : '▶';
    $('[data-play-label]').textContent = playing ? 'Pausar' : position >= duration ? 'Repetir' : 'Reproducir';
    root.dataset.playing = String(playing);
    schedule();
  };
  function update() {
    const index = Math.min(5, Math.floor(position / 18));
    const local = Math.min(1, (position - index * 18) / 18);
    if (chapter !== index) {
      chapter = index;
      const item = chapters[index];
      $('[data-scene-number]').textContent = String(index + 1).padStart(2, '0');
      $('[data-scene-kicker]').textContent = item.kicker;
      $('[data-scene-title]').innerHTML = item.title;
      $('[data-scene-description]').textContent = item.text;
      canvas.setAttribute('aria-label', `Escena ${index + 1}: ${item.name}. ${item.text}`);
      $('[data-cinema-status]').textContent = `Escena ${index + 1} de 6: ${item.name}. ${item.text}`;
      root.querySelectorAll('[data-scene-target]').forEach(b => {
        if (Number(b.dataset.sceneTarget) === index) b.setAttribute('aria-current', 'step');
        else b.removeAttribute('aria-current');
      });
      root.dataset.scene = String(index);
    }
    $('[data-cinema-time]').textContent = clock(position);
    seek.value = position;
    seek.setAttribute('aria-valuetext', `${clock(position)} de 1:48. Escena ${index + 1}: ${chapters[index].name}`);
    // A brief, soft dissolve hides camera cuts without flashes.
    const dissolve = position > .2 && position < 107.8 ? Math.max(0, 1 - Math.min(local, 1 - local) * 28) : 0;
    $('[data-scene-transition]').style.opacity = String(reduce.matches ? 0 : dissolve * .85);
    renderWorld?.(index, local, position);
  }
  function schedule() {
    if (!frame && playing && inView && !document.hidden) frame = requestAnimationFrame(tick);
  }
  function tick(now) {
    frame = 0;
    const delta = lastFrame ? Math.min((now - lastFrame) / 1000, 1) : 0;
    lastFrame = now;
    if (playing && inView && !document.hidden) {
      position = Math.min(duration, position + delta);
      if (now - lastPaint > 1000 / 30 || position === duration) { update(); lastPaint = now; }
      if (position >= duration) { setPlaying(false); $('[data-cinema-status]').textContent = 'El recorrido terminó. Podés repetirlo o explorar sus capítulos.'; }
      else schedule();
    }
  }
  function goTo(value, shouldPlay = false) {
    position = Math.max(0, Math.min(duration, value));
    lastFrame = 0;
    update();
    if (shouldPlay && !reduce.matches) setPlaying(true);
    else if (position === duration) setPlaying(false);
  }
  play.addEventListener('click', () => {
    if (position >= duration) goTo(0);
    setPlaying(!playing);
  });
  $('[data-cinema-restart]').addEventListener('click', () => { goTo(0); setPlaying(!reduce.matches); });
  seek.addEventListener('input', () => { goTo(Number(seek.value)); });
  root.querySelectorAll('[data-scene-target]').forEach(b => b.addEventListener('click', () => goTo(Number(b.dataset.sceneTarget) * 18 + .8, true)));
  document.querySelectorAll('[data-scene-jump]').forEach(b => b.addEventListener('click', () => {
    goTo(Number(b.dataset.sceneJump) * 18 + .8, true);
    root.scrollIntoView({ block: 'start', behavior: reduce.matches ? 'instant' : 'smooth' });
    play.focus({ preventScroll: true });
  }));
  const expand = $('[data-cinema-expand]');
  let previousOverflow = '';
  const theater = value => {
    if (value) { previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; }
    else document.body.style.overflow = previousOverflow;
    root.classList.toggle('cinema-theater', value);
    expand.setAttribute('aria-label', value ? 'Salir de pantalla completa' : 'Ver animación en pantalla completa');
    update();
  };
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && root.classList.contains('cinema-theater')) theater(false); });
  expand.addEventListener('click', async () => {
    try {
      if (root.classList.contains('cinema-theater')) theater(false);
      else if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.fullscreenEnabled) await root.requestFullscreen();
      else theater(true);
    } catch { theater(true); }
  });
  document.addEventListener('fullscreenchange', () => expand.setAttribute('aria-label', document.fullscreenElement ? 'Salir de pantalla completa' : 'Ver animación en pantalla completa'));
  document.addEventListener('visibilitychange', () => { lastFrame = 0; if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else schedule(); });
  const observer = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    lastFrame = 0;
    if (!inView) { cancelAnimationFrame(frame); frame = 0; } else schedule();
  }, { threshold: .05 });
  observer.observe(viewport);
  reduce.addEventListener('change', () => { if (reduce.matches) setPlaying(false); update(); });
  const fallback = () => {
    ready = false; setPlaying(false); play.disabled = true;
    canvas.hidden = true;
    $('[data-cinema-loading]').hidden = true;
    $('[data-cinema-fallback]').hidden = false;
    root.classList.remove('cinema-ready');
  };
  try {
    const THREE = await import('./vendor/three.module.min.js');
    renderWorld = await createWorld(THREE, canvas, viewport);
    ready = true; play.disabled = false;
    root.classList.add('cinema-ready');
    canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); fallback(); });
    const resize = new ResizeObserver(() => update()); resize.observe(viewport);
    update();
    setPlaying(!reduce.matches);
    addEventListener('pagehide', event => { cancelAnimationFrame(frame); frame = 0; if (!event.persisted) { observer.disconnect(); resize.disconnect(); renderWorld.dispose?.(); } });
    addEventListener('pageshow', () => { lastFrame = 0; schedule(); });
  } catch (error) {
    console.warn('El escenario 3D no está disponible.', error);
    fallback(); update();
  }
}

async function createWorld(T, canvas, viewport) {
  const textureLoader = new T.TextureLoader();
  const assetNames = ['militar','campesino','flechero','castro','castrofinal','atacante','caballo','arbol'];
  const assetList = await Promise.all(assetNames.map(name => textureLoader.loadAsync(new URL(`../images/escenas/${name}.webp`, import.meta.url).href)));
  const textures = Object.fromEntries(assetNames.map((name,i) => { assetList[i].colorSpace = T.SRGBColorSpace; return [name,assetList[i]]; }));
  const billboards = [];
  let renderer;
  try { renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' }); canvas.dataset.renderer = 'webgl'; }
  catch { renderer = createCanvasRenderer(T, canvas); canvas.dataset.renderer = 'canvas'; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 640 ? 1.35 : 1.8));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .95;
  const world = new T.Scene();
  world.background = new T.Color('#2c222b');
  world.fog = new T.FogExp2('#53393f', .016);
  const camera = new T.PerspectiveCamera(43, 1, .1, 220);
  const staticWorld = new T.Group(); world.add(staticWorld);
  const actorLayer = new T.Group(); world.add(actorLayer);
  const mat = (color, extra = {}) => new T.MeshStandardMaterial({ color, roughness: .95, flatShading: false, ...extra });
  const m = {
    earth: mat('#3c3036'), wall: mat('#9c8b80'), base: mat('#534047'), roof: mat('#412b32'), tile: mat('#694047'), wood: mat('#352a2a'), stone: mat('#51484b'),
    dark: mat('#242426'), cloth: mat('#514c48'), shirt: mat('#b4a08b'), skin: mat('#353031'), red: mat('#80473f'), leaf: mat('#443d3b'), rock: mat('#b19a80'), metal: mat('#3e3c3c'), grass: mat('#776353'),
  };
  const g = { box: new T.BoxGeometry(1, 1, 1), sphere: new T.IcosahedronGeometry(1, 1), head: new T.SphereGeometry(1, 10, 8), cyl: new T.CylinderGeometry(1, 1, 1, 7), taper: new T.CylinderGeometry(.75, 1, 1, 7) };
  function mesh(parent, geometry, material, pos, scale, rot) {
    const o = new T.Mesh(geometry, material); o.position.set(...pos); o.scale.set(...scale);
    if (rot) o.rotation.set(...rot); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o;
  }
  const box = (p,ma,pos,s,rot) => mesh(p,g.box,ma,pos,s,rot);
  const ell = (p,ma,pos,s) => mesh(p,g.sphere,ma,pos,s);
  const cylinder = (p,ma,pos,s,rot) => mesh(p,g.cyl,ma,pos,s,rot);
  function rod(p, a, b, radius, material) {
    const va = new T.Vector3(...a), vb = new T.Vector3(...b), direction = vb.clone().sub(va);
    const obj = cylinder(p, material, va.clone().add(vb).multiplyScalar(.5).toArray(), [radius,direction.length(),radius]);
    obj.quaternion.setFromUnitVectors(new T.Vector3(0,1,0), direction.normalize()); return obj;
  }
  let seed = 1856;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  world.add(new T.HemisphereLight('#c0a6a1', '#24232b', 1.4));
  const sun = new T.DirectionalLight('#e4a197', 2.6); sun.position.set(-25,36,-24); sun.castShadow = true;
  sun.shadow.mapSize.set(1024,1024); Object.assign(sun.shadow.camera,{left:-40,right:40,top:36,bottom:-36,far:110}); sun.shadow.normalBias = .08; sun.shadow.bias = -.0003; world.add(sun);
  const fill = new T.DirectionalLight('#8b8a9a', .8); fill.position.set(18,12,24); world.add(fill);
  // The backdrop is drawn in world space; the horizon changes as the camera travels.
  const sky = new T.Mesh(new T.SphereGeometry(180,24,12), new T.ShaderMaterial({ side:T.BackSide, depthWrite:false, uniforms:{top:{value:new T.Color('#24202d')},bottom:{value:new T.Color('#8c5559')}}, vertexShader:'varying vec3 v; void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform vec3 top;uniform vec3 bottom;varying vec3 v;void main(){float h=smoothstep(-.08,.55,normalize(v).y);gl_FragColor=vec4(mix(bottom,top,h),1.);}'}));
  world.add(sky);
  const disc = new T.Mesh(new T.CircleGeometry(9,64),new T.MeshBasicMaterial({color:'#9c676b',fog:false}));disc.position.set(-35,24,-90);world.add(disc);
  box(staticWorld,m.earth,[0,-.26,0],[300,.5,300]);
  // A low mountain line, dry trees, and long shadows establish the llanos.
  const ridgeGeometry = new T.PlaneGeometry(230,110,60,24);
  ridgeGeometry.rotateX(-Math.PI/2);
  const ridgeVertices = ridgeGeometry.attributes.position;
  for (let i=0;i<ridgeVertices.count;i++) {
    const x=ridgeVertices.getX(i),z=ridgeVertices.getZ(i);
    const height=14*Math.exp(-((x+20)**2/850+(z+5)**2/800))+7*Math.exp(-((x-45)**2/1200+z*z/650));
    ridgeVertices.setY(i,Math.max(-2,height+Math.sin(x*.07)*Math.cos(z*.09)*2-2));
  }
  ridgeGeometry.computeVertexNormals();
  const ridge = new T.Mesh(ridgeGeometry,new T.MeshStandardMaterial({color:'#4b3c46',roughness:1,flatShading:false}));ridge.position.z=-65;staticWorld.add(ridge);
  function silhouette(name,height=2.5) {
    const tex=textures[name],aspect=tex.image.width/tex.image.height;
    const group=new T.Group();
    const plane=new T.Mesh(new T.PlaneGeometry(height*aspect,height),new T.MeshBasicMaterial({map:tex,transparent:true,alphaTest:.035,depthWrite:false,side:T.DoubleSide,fog:true}));
    plane.position.y=height*.45;plane.userData.upright=true;group.add(plane);billboards.push(plane);
    group.userData={plane,baseY:0};
    return group;
  }
  function tree(x,z,size=1) {const tr=silhouette('arbol',10*size);tr.position.set(x,0,z);actorLayer.add(tr);}
  for(let i=0;i<23;i++){const x=(rand()-.5)*120,z=(rand()-.5)*100;if(Math.abs(x)>24||z< -20)tree(x,z,.7+rand()*.55);}
  for(let i=0;i<250;i++) {
    const x=(rand()-.5)*110,z=(rand()-.5)*90;if(Math.abs(x)<21&&Math.abs(z)<20)continue;
    const h=.2+rand()*.65;rod(staticWorld,[x,0,z],[x+.12,h,z+.1],.025,m.grass);
    if(i%3===0)ell(staticWorld,m.stone,[x,.08,z],[.25+rand()*.3,.12,.24]);
  }
  // The long adobe house, tiled gable roof and timber veranda follow the site's architecture.
  const house=new T.Group();staticWorld.add(house);
  box(house,m.base,[0,.18,0],[23,.36,14]);box(house,m.wall,[0,1.9,0],[18,3.4,8]);
  box(house,m.base,[0,.47,0],[18.05,.35,8.05]);
  for(const z of [-4.035,4.035]) for(const x of [-6,-2,2,6]) {
    box(house,m.wood,[x,1.65,z],[1.2,2.7,.06]);box(house,m.base,[x,3.03,z],[1.65,.16,.2]);
  }
  for(const z of [-6.35,6.35]) {
    for(let x=-10;x<=10;x+=2.5){box(house,m.wood,[x,1.8,z],[.15,3.25,.15]);box(house,m.wood,[x,3.28,z],[.33,.11,.33]);}
    box(house,m.wood,[0,3.32,z],[20.5,.18,.2]);
    box(house,m.base,[0,.08,z*1.16],[10,.16,1.2]);
  }
  for(const sign of [-1,1]) {
    box(house,m.roof,[0,4.15,sign*3.55],[21.6,.22,7.65],[sign*.26,0,0]);
    for(let x=-10.6;x<10.7;x+=.38) {
      const tile=cylinder(house,m.tile,[x,4.29,sign*3.55],[.075,7.66,.075],[Math.PI/2+sign*.26,0,0]);
      tile.castShadow=false;
    }
  }
  cylinder(house,m.roof,[0,5.17,0],[.17,21.8,.17],[0,0,Math.PI/2]);
  // Stone and timber enclosures; their positions are interpretive, never survey data.
  function stoneWall(a,b) {
    const length=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.ceil(length/.65);
    for(let row=0;row<3;row++)for(let i=0;i<n;i++){
      const q=(i+.5)/n;ell(staticWorld,m.stone,[a[0]+(b[0]-a[0])*q,row*.34+.23,a[1]+(b[1]-a[1])*q],[.45+rand()*.1,.25,.34+rand()*.1]);
    }
  }
  function fence(a,b) {
    const length=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.ceil(length/1.8);
    for(let i=0;i<=n;i++){const t=i/n;box(staticWorld,m.wood,[a[0]+(b[0]-a[0])*t,.7,a[1]+(b[1]-a[1])*t],[.16,1.4,.16],[0,0,(rand()-.5)*.1]);}
    for(const h of [.48,1.06])rod(staticWorld,[a[0],h,a[1]],[b[0],h,b[1]],.07,m.wood);
  }
  stoneWall([-17,-3],[-17,15]);stoneWall([-17,15],[-2,15]);
  fence([2,15],[18,15]);fence([18,15],[18,-3]);fence([18,-3],[11,-3]);
  // Photorealistic silhouettes occupy separate depths in the 3D scene.
  function person(material=m.dark,pose='aim',hat=true) {
    const key=pose==='throw'?'castro':pose==='bow'?'flechero':pose==='run'?'campesino':material===m.red?'atacante':material===m.shirt?'campesino':'militar';
    return silhouette(key,pose==='throw'?2.4:2.1);
  }
  const defenders=new T.Group();actorLayer.add(defenders);
  for(let i=0;i<12;i++) {
    const p=person(i%3===0?m.shirt:m.cloth,i%4===0?'bow':'aim',i%3!==0);
    p.position.set(-15+i*1.65,.02,13.5-(i%2)*.4);p.rotation.y=(i%3-.7)*.1;defenders.add(p);
  }
  for(let i=0;i<5;i++) {const p=person(m.cloth,'aim');p.position.set(-6+i*3,.36,5.8);actorLayer.add(p);}
  const invaders=new T.Group();world.add(invaders);
  for(let i=0;i<14;i++) {
    const p=person(i%3===0?m.red:m.dark,'aim');p.position.set(-12+(i%7)*4+(rand()-.5)*2,0,22+Math.floor(i/7)*5+rand()*2);p.rotation.y=Math.PI-.1;invaders.add(p);
  }
  const castro=person(m.cloth,'throw',false);castro.position.set(11.5,0,16);world.add(castro);
  const castroFinal=silhouette('castrofinal',2.4);castroFinal.position.copy(castro.position);world.add(castroFinal);
  const stone=ell(world,m.rock,[11.9,2,13.5],[.19,.16,.14]);
  const opponent=person(m.dark,'run');opponent.position.set(13.5,0,20);opponent.rotation.y=Math.PI;world.add(opponent);
  const flanking=new T.Group();world.add(flanking);
  for(let i=0;i<6;i++) {const p=person(i%2?m.shirt:m.cloth,'run',i%2===0);p.position.set((i%2)*1.4,0,-Math.floor(i/2)*2);flanking.add(p);}
  function horse() { return silhouette('caballo',2.25); }
  const herd=new T.Group();world.add(herd);
  for(let i=0;i<7;i++){const h=horse();h.position.set(-i*1.9,0,(i%3)*2);h.rotation.y=-.45;h.scale.setScalar(.8+(i%3)*.08);herd.add(h);}
  const smokeCanvas=document.createElement('canvas');smokeCanvas.width=256;smokeCanvas.height=128;
  const smokeContext=smokeCanvas.getContext('2d');
  for(let i=0;i<16;i++){const x=rand()*256,y=rand()*128,r=20+rand()*60;const grad=smokeContext.createRadialGradient(x,y,0,x,y,r);grad.addColorStop(0,'rgba(172,144,149,.16)');grad.addColorStop(1,'rgba(100,83,95,0)');smokeContext.fillStyle=grad;smokeContext.fillRect(0,0,256,128);}
  const smokeTexture=new T.CanvasTexture(smokeCanvas),smokeLayers=[];
  for(let i=0;i<6;i++){
    const fog=new T.Mesh(new T.PlaneGeometry(42,14),new T.MeshBasicMaterial({map:smokeTexture,transparent:true,opacity:.24,depthWrite:false,side:T.DoubleSide,fog:false}));
    fog.position.set((rand()-.5)*35,3+i*.25,-15+i*8);world.add(fog);billboards.push(fog);smokeLayers.push(fog);
  }
  const routePoints=[[9,.06,-7],[21,.06,-11],[29,.06,0],[25,.06,17],[13,.06,24]];
  const routeCurve=new T.CatmullRomCurve3(routePoints.map(p=>new T.Vector3(...p)));
  const route=new T.Line(new T.BufferGeometry().setFromPoints(routeCurve.getPoints(90)),new T.LineDashedMaterial({color:'#e4bc99',dashSize:.7,gapSize:.45,transparent:true,opacity:.7}));route.computeLineDistances();world.add(route);
  // Batch scenery by geometry and material so even a dense scene has few static draw calls.
  staticWorld.updateMatrixWorld(true);
  const batches=new Map();
  staticWorld.traverse(o=>{if(!o.isMesh)return;const key=o.geometry.uuid+o.material.uuid;if(!batches.has(key))batches.set(key,{geometry:o.geometry,material:o.material,matrices:[]});batches.get(key).matrices.push(o.matrixWorld.clone());});
  world.remove(staticWorld);
  batches.forEach(({geometry,material,matrices})=>{
    const batch=new T.InstancedMesh(geometry,material,matrices.length);matrices.forEach((matrix,i)=>batch.setMatrixAt(i,matrix));batch.castShadow=true;batch.receiveShadow=true;batch.computeBoundingSphere();world.add(batch);
  });
  // Fine dust is geometry, not a video or a repeating image pan.
  const count=150, dustPositions=new Float32Array(count*3);
  for(let i=0;i<count;i++){dustPositions[i*3]=(rand()-.5)*85;dustPositions[i*3+1]=.3+rand()*9;dustPositions[i*3+2]=(rand()-.5)*65;}
  const dustGeometry=new T.BufferGeometry();dustGeometry.setAttribute('position',new T.BufferAttribute(dustPositions,3));
  const dust=new T.Points(dustGeometry,new T.PointsMaterial({color:'#bea8a3',size:.045,transparent:true,opacity:.25,depthWrite:false}));world.add(dust);
  const paths=[
    [[-28,10,34],[-22,8,30],[-12,6.5,28],[0,6,27]],
    [[-18,4.3,22],[-11,3.5,21],[1,3.1,22],[9,3.6,22]],
    [[29,5.7,34],[25,4.5,29],[23,3.7,24],[20,3.4,22]],
    [[18,3.5,22],[17,3,21],[15,2.8,21],[13.5,2.8,22]],
    [[33,15,-21],[39,18,-9],[36,17,14],[25,13,32]],
    [[-20,5,28],[-13,7,33],[-3,11,40],[9,16,45]]
  ].map(points=>new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))));
  const targets=[[[0,1.5,0],[0,2,1]],[[0,1.3,13],[5,1.4,12]],[[11,1.2,16],[10,1.4,14]],[[11.8,1.65,16],[12,1.7,16.4]],[[13,1,0],[16,1.2,12]],[[0,1.5,16],[2,2,5]]];
  const aim=new T.Vector3(), cam=new T.Vector3();let width=0,height=0;
  const smooth = t => t*t*(3-2*t);
  function render(index,p,t) {
    const w=Math.max(1,viewport.clientWidth),h=Math.max(1,viewport.clientHeight);
    if(w!==width||h!==height){width=w;height=h;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
    const q=smooth(p);cam.copy(paths[index].getPoint(q));
    aim.fromArray(targets[index][0]).lerp(new T.Vector3(...targets[index][1]),q);
    if(camera.aspect<1){cam.sub(aim).multiplyScalar(index===3?1.4:1.55).add(aim);aim.y-=.25;}
    camera.position.copy(cam);camera.lookAt(aim);
    disc.lookAt(camera.position);
    invaders.visible=index>=2;castro.visible=index===3;castroFinal.visible=index===3;stone.visible=index===3&&p>=.35;opponent.visible=index===3;
    flanking.visible=index>=4;route.visible=index===4;herd.visible=index===5;
    invaders.position.z=index===5?q*12:index===2?-q*5: -5;
    invaders.children.forEach((person,i)=>{person.userData.plane.rotation.z=Math.sin(t*.4+i)*.008;});
    if(index===3) {
      const throwProgress=smooth(Math.min(1,Math.max(0,(p-.15)/.65)));
      opponent.position.y=Math.sin(p*Math.PI)*.12;
      castro.position.x=11.5+throwProgress*.18;castro.rotation.z=throwProgress*-.025;
      castroFinal.position.copy(castro.position);castroFinal.rotation.z=castro.rotation.z;
      const release=smooth(Math.min(1,Math.max(0,(p-.3)/.18)));castro.userData.plane.material.opacity=1-release;castroFinal.userData.plane.material.opacity=release;
      const flight=Math.min(1,Math.max(0,(p-.35)/.5));
      const right=new T.Vector3(1,0,0).applyQuaternion(camera.quaternion);
      stone.position.copy(castro.position).addScaledVector(right,-.6).add(new T.Vector3(0,2.2,0));
      stone.position.lerp(new T.Vector3(13.5,1.35,20),flight);stone.position.y+=Math.sin(flight*Math.PI)*1.1;
      stone.rotation.set(t*.5,t*.8,0);
    }
    if(index>=4){
      const pt=routeCurve.getPoint(index===5? .97:.1+q*.86);flanking.position.copy(pt);const tangent=routeCurve.getTangent(index===5?.97:.1+q*.86);flanking.rotation.y=Math.atan2(tangent.x,tangent.z);
      flanking.children.forEach((p,i)=>{p.position.y=Math.sin(t*1.5+i)*.035;});
    }
    if(index===5){
      herd.position.set(-10+q*30,0,22-q*9);herd.children.forEach((h,i)=>{h.position.y=.08+Math.sin(t*2.6+i)*.07;});
    }
    dust.rotation.y=t*.0015;dust.position.x=Math.sin(t*.04)*1.5;
    world.fog.density=index===2?.023:.016;
    world.updateMatrixWorld(true);billboards.forEach(plane=>{if(plane.userData.upright){const at=new T.Vector3();plane.getWorldPosition(at);plane.lookAt(camera.position.x,at.y,camera.position.z);}else plane.lookAt(camera.position);});
    smokeLayers.forEach((fog,i)=>{fog.position.x=Math.sin(t*.035+i)*7;});
    renderer.render(world,camera);
  }
  render.dispose=()=>{renderer.dispose();const geometries=new Set(),materials=new Set();world.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());};
  return render;
}
