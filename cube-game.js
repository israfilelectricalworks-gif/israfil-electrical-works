import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
(() => {
  const canvas=document.getElementById('cubeGameCanvas'), status=document.getElementById('cubeGameStatus'), counter=document.getElementById('cubeMoveCount');
  if(!canvas||!status||!counter)return;
  const scene=new THREE.Scene(); scene.background=new THREE.Color('#08192d');
  const camera=new THREE.PerspectiveCamera(38,1,.1,100); camera.position.set(5.8,5.2,7.2); camera.lookAt(0,0,0);
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true}); renderer.setPixelRatio(Math.min(devicePixelRatio||1,2)); renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping;
  scene.add(new THREE.HemisphereLight(0xe7f4ff,0x24334a,2)); const key=new THREE.DirectionalLight(0xffffff,3); key.position.set(5,8,7); scene.add(key); const glow=new THREE.PointLight(0x268bff,30,18); glow.position.set(-5,1,4); scene.add(glow);
  const view=new THREE.Group(); scene.add(view); const puzzle=new THREE.Group(); view.add(puzzle); const spacing=1.025, cubies=[]; let moves=0,busy=false,pointer=null,start=null,rotStart=null;
  const cols={R:0xd93636,L:0xff8a22,U:0xf6f7fb,D:0xffd629,F:0x16a765,B:0x2879e8};
  const mats=Object.values(cols).map(color=>new THREE.MeshStandardMaterial({color,roughness:.32,metalness:.03}));
  const inner=new THREE.MeshStandardMaterial({color:0x171b23,roughness:.48});
  function build(){while(puzzle.children.length){const c=puzzle.children[0];puzzle.remove(c);if(c.geometry)c.geometry.dispose()}cubies.length=0;
    for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++){
      const m=[x===1?mats[0]:inner,x===-1?mats[1]:inner,y===1?mats[2]:inner,y===-1?mats[3]:inner,z===1?mats[4]:inner,z===-1?mats[5]:inner];
      const c=new THREE.Mesh(new THREE.BoxGeometry(.96,.96,.96),m);c.position.set(x*spacing,y*spacing,z*spacing);puzzle.add(c);cubies.push(c);
    }
  }
  function resize(){const r=canvas.getBoundingClientRect(),w=Math.max(1,r.width),h=Math.max(1,r.height);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}
  new ResizeObserver(resize).observe(canvas);resize(); function say(t){status.textContent=t} function count(){counter.textContent=moves}
  function snap(list){const q=Math.PI/2;for(const c of list){c.position.set(Math.round(c.position.x/spacing)*spacing,Math.round(c.position.y/spacing)*spacing,Math.round(c.position.z/spacing)*spacing);c.rotation.set(Math.round(c.rotation.x/q)*q,Math.round(c.rotation.y/q)*q,Math.round(c.rotation.z/q)*q);c.updateMatrix()}}
  function turn(face,reverse=false){if(busy)return Promise.resolve();const spec={R:['x',1,-Math.PI/2],L:['x',-1,Math.PI/2],U:['y',1,-Math.PI/2],D:['y',-1,Math.PI/2],F:['z',1,-Math.PI/2],B:['z',-1,Math.PI/2]}[face];if(!spec)return Promise.resolve();busy=true;const [axis,value,base]=spec,angle=base*(reverse?-1:1),list=cubies.filter(c=>Math.round(c.position[axis]/spacing)===value),pivot=new THREE.Group();puzzle.add(pivot);puzzle.updateMatrixWorld(true);list.forEach(c=>pivot.attach(c));const began=performance.now();
    return new Promise(resolve=>{function frame(now){const t=Math.min(1,(now-began)/210),ease=1-Math.pow(1-t,3);pivot.rotation[axis]=angle*ease;if(t<1)requestAnimationFrame(frame);else{pivot.rotation[axis]=angle;puzzle.updateMatrixWorld(true);list.forEach(c=>puzzle.attach(c));puzzle.remove(pivot);snap(list);moves++;count();busy=false;resolve()}}requestAnimationFrame(frame)})}
  function scramble(){const faces=['R','L','U','D','F','B'],arr=[];let last='';for(let i=0;i<20;i++){let f;do{f=faces[Math.floor(Math.random()*6)]}while(f===last);last=f;arr.push([f,Math.random()<.5])}return arr}
  document.querySelectorAll('[data-cube-move]').forEach(b=>b.addEventListener('click',async()=>{if(busy)return;const v=b.dataset.cubeMove;say('Turning '+v+'…');await turn(v[0],v.endsWith("'"));say('Ready to play')}));
  document.getElementById('cubeScramble').addEventListener('click',async()=>{if(busy)return;say('Scrambling cube…');for(const [f,r] of scramble())await turn(f,r);say('Scrambled — your turn!')});
  document.getElementById('cubeReset').addEventListener('click',()=>{if(busy)return;view.rotation.set(-.22,.45,0);moves=0;count();build();say('Cube reset')});
  document.getElementById('cubeShuffleView').addEventListener('click',()=>{if(busy)return;view.rotation.set((Math.random()-.5)*.8,Math.random()*Math.PI*2,(Math.random()-.5)*.4)});
  canvas.addEventListener('pointerdown',e=>{if(busy)return;pointer=e.pointerId;start={x:e.clientX,y:e.clientY};rotStart={x:view.rotation.x,y:view.rotation.y};canvas.setPointerCapture(e.pointerId)});
  canvas.addEventListener('pointermove',e=>{if(pointer!==e.pointerId||!start||busy)return;view.rotation.y=rotStart.y+(e.clientX-start.x)*.009;view.rotation.x=Math.max(-1.15,Math.min(1.15,rotStart.x+(e.clientY-start.y)*.009))});
  function end(e){if(pointer===e.pointerId){pointer=null;start=null}}canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);canvas.addEventListener('lostpointercapture',end);
  build();view.rotation.set(-.22,.45,0);say('Ready to play');function render(){requestAnimationFrame(render);renderer.render(scene,camera)}render();
})();
