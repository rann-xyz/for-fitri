import * as THREE from "three";

const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
const prefersReduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ----- year + progress -----
$("#year").textContent = new Date().getFullYear();
const progressBar = $("#progress-bar");
addEventListener("scroll", () => {
  const h = document.documentElement;
  const p = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
  progressBar.style.width = clamp(p,0,100) + "%";
}, {passive:true});

// ----- cursor -----
const glow = $("#cursor-glow"), dot = $("#cursor-dot");
let mx = innerWidth/2, my = innerHeight/2, gx = mx, gy = my, dx = mx, dy = my;
let cursorActive = false;
addEventListener("mousemove", e => { mx=e.clientX; my=e.clientY; cursorActive=true; glow.style.opacity="1"; dot.style.opacity="1"; }, {passive:true});
addEventListener("mouseleave", () => { glow.style.opacity="0"; dot.style.opacity="0"; });
(function tickCursor(){
  gx += (mx - gx) * 0.06; gy += (my - gy) * 0.06;
  dx += (mx - dx) * 0.18; dy += (my - dy) * 0.18;
  glow.style.transform = `translate(${gx}px,${gy}px) translate(-50%,-50%)`;
  dot.style.transform = `translate(${dx}px,${dy}px) translate(-50%,-50%)`;
  requestAnimationFrame(tickCursor);
})();

// ----- loader -----
const loader = $("#loader");
const loaderFill = $(".loader-line-fill");
const loaderPct = $(".loader-pct");
let loaderProgress = 0;
function setLoader(p){
  loaderProgress = clamp(p,0,100);
  loaderFill.style.width = loaderProgress + "%";
  loaderPct.textContent = Math.round(loaderProgress) + "%";
}
let loaderDone = false;
function hideLoader(){
  if(loaderDone) return; loaderDone = true;
  gsap.to(loader, {autoAlpha:0, duration:1.1, ease:"power3.inOut", onComplete:()=> loader.style.display="none"});
  // intro
  const tl = gsap.timeline();
  tl.from(".hero-title .line", {y:60, opacity:0, duration:1.1, ease:"power4.out"})
    .from(".hero-sub", {y:20, opacity:0, duration:.8, ease:"power3.out"}, "-=.6")
    .from("#enter-btn", {y:14, opacity:0, duration:.7}, "-=.4")
    .from(".hero-hint", {opacity:0, duration:.6}, "-=.3");
  initScrollAnimations();
}

// fake loading + wait for fonts/images
let p = 0;
const fake = setInterval(()=>{
  p += Math.random()*18 + 6;
  if(p >= 92) { clearInterval(fake); p = 92; }
  setLoader(p);
}, 180);

Promise.all([
  document.fonts ? document.fonts.ready : Promise.resolve(),
  new Promise(r => setTimeout(r, 900))
]).then(()=>{
  clearInterval(fake);
  let cur = loaderProgress;
  const to100 = setInterval(()=>{
    cur += 4;
    setLoader(cur);
    if(cur >= 100){
      clearInterval(to100);
      setTimeout(hideLoader, 350);
    }
  }, 40);
});

// safety: never stuck
setTimeout(()=>{ if(!loaderDone) { setLoader(100); hideLoader(); } }, 5000);

// ----- THREE helpers -----
function makeRenderer(canvas, alpha=true){
  const r = new THREE.WebGLRenderer({canvas, antialias:true, alpha});
  r.setPixelRatio(Math.min(devicePixelRatio, 2));
  const resize = () => {
    const w = canvas.clientWidth || canvas.offsetWidth || innerWidth;
    const h = canvas.clientHeight || canvas.offsetHeight || innerHeight;
    r.setSize(w, h, false);
  };
  resize();
  addEventListener("resize", resize);
  return {renderer:r, resize};
}

function heartShape(scale=1){
  const s = new THREE.Shape();
  s.moveTo(0, 0.6*scale);
  s.bezierCurveTo(0.5*scale, 1.1*scale, 1.2*scale, 0.6*scale, 0, -0.8*scale);
  s.bezierCurveTo(-1.2*scale, 0.6*scale, -0.5*scale, 1.1*scale, 0, 0.6*scale);
  return s;
}

// ----- hero 3D -----
(() => {
  const canvas = $("#hero-canvas");
  if(!canvas) return;
  canvas.width = canvas.offsetWidth * devicePixelRatio;
  canvas.height = canvas.offsetHeight * devicePixelRatio;
  const {renderer} = makeRenderer(canvas, true);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0a0610, 14, 26);

  const camera = new THREE.PerspectiveCamera(42, canvas.clientWidth/canvas.clientHeight, 0.1, 100);
  camera.position.set(0, 0.6, 9);
  const onResize = () => {
    camera.aspect = canvas.clientWidth/canvas.clientHeight;
    camera.updateProjectionMatrix();
  };
  addEventListener("resize", onResize);

  // lights
  scene.add(new THREE.AmbientLight(0xfff0f6, 0.55));
  const dl = new THREE.DirectionalLight(0xffffff, 1.15); dl.position.set(3,4,6); scene.add(dl);
  const pl1 = new THREE.PointLight(0xff4d7a, 2.2, 20); pl1.position.set(2,1.2,3); scene.add(pl1);
  const pl2 = new THREE.PointLight(0x8b5cf6, 1.6, 18); pl2.position.set(-2.5,-0.5,2.5); scene.add(pl2);
  const pl3 = new THREE.PointLight(0xff8c42, 1.1, 16); pl3.position.set(0,2.5,2); scene.add(pl3);

  // heart mesh (extruded + soft)
  const shape = heartShape(1);
  const geo = new THREE.ExtrudeGeometry(shape, {depth:0.55, bevelEnabled:true, bevelThickness:0.12, bevelSize:0.09, bevelSegments:6, curveSegments:18});
  geo.center();
  geo.computeVertexNormals();
  const mat = new THREE.MeshPhysicalMaterial({
    color:0xff2e63, emissive:0xff1a4d, emissiveIntensity:0.28,
    roughness:0.28, metalness:0.06, clearcoat:0.65, clearcoatRoughness:0.22,
    transparent:true, opacity:0.98
  });
  const heart = new THREE.Mesh(geo, mat);
  heart.scale.set(1.35,1.35,1.35);
  heart.position.set(0, 0.15, 0);
  heart.rotation.set(0.18, 0, 0);
  scene.add(heart);

  // glow sprite behind
  const glowTex = (()=>{const c=document.createElement("canvas");c.width=c.height=128;const g=c.getContext("2d");const rg=g.createRadialGradient(64,64,8,64,64,64);rg.addColorStop(0,"rgba(255,77,122,0.9)");rg.addColorStop(0.35,"rgba(255,77,122,0.35)");rg.addColorStop(1,"rgba(255,77,122,0)");g.fillStyle=rg;g.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);})();
  const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex, transparent:true, opacity:0.55, depthWrite:false}));
  glowSprite.scale.set(5.2,5.2,1); glowSprite.position.set(0,0.15,-0.9);
  scene.add(glowSprite);

  // particles
  const pCount = prefersReduced ? 160 : 520;
  const pGeo = new THREE.BufferGeometry();
  const pos = new Float32Array(pCount*3);
  const spd = new Float32Array(pCount);
  for(let i=0;i<pCount;i++){
    pos[i*3] = (Math.random()-0.5)*16;
    pos[i*3+1] = (Math.random()-0.5)*12;
    pos[i*3+2] = (Math.random()-0.5)*10 - 2;
    spd[i] = 0.2 + Math.random()*0.9;
  }
  pGeo.setAttribute("position", new THREE.BufferAttribute(pos,3));
  const pMat = new THREE.PointsMaterial({size:0.035, color:0xffb3c8, transparent:true, opacity:0.55, depthWrite:false, blending:THREE.AdditiveBlending});
  // circular points
  const dotCanvas = document.createElement("canvas"); dotCanvas.width=dotCanvas.height=32;
  const dg = dotCanvas.getContext("2d"); dg.fillStyle="#fff"; dg.beginPath(); dg.arc(16,16,10,0,Math.PI*2); dg.fill();
  pMat.map = new THREE.CanvasTexture(dotCanvas); pMat.alphaMap = pMat.map;
  pMat.sizeAttenuation = true;
  const points = new THREE.Points(pGeo, pMat);
  scene.add(points);

  let t=0;
  renderer.setAnimationLoop(()=>{
    t += 0.008;
    if(prefersReduced){
      renderer.render(scene,camera); return;
    }
    // mouse parallax
    const nx = (mx/innerWidth - 0.5);
    const ny = (my/innerHeight - 0.5);
    camera.position.x += (nx*0.9 - camera.position.x)*0.04;
    camera.position.y += (-ny*0.6 + 0.6 - camera.position.y)*0.04;
    camera.lookAt(0,0.15,0);

    heart.rotation.y += 0.004;
    heart.position.y = 0.15 + Math.sin(t*1.1)*0.12;
    heart.rotation.z = Math.sin(t*0.7)*0.06;
    glowSprite.position.y = heart.position.y;
    glowSprite.material.opacity = 0.5 + Math.sin(t*1.3)*0.08;

    const arr = pGeo.attributes.position;
    for(let i=0;i<pCount;i++){
      arr.array[i*3+1] += 0.002*spd[i];
      if(arr.array[i*3+1] > 6) { arr.array[i*3+1] = -6; arr.array[i*3] = (Math.random()-0.5)*16; }
      // subtle drift
      arr.array[i*3] += Math.sin(t + i)*0.001;
    }
    arr.needsUpdate = true;
    pMat.opacity = 0.5 + Math.sin(t*0.8)*0.07;

    renderer.render(scene,camera);
  });
})();

// ----- floating hearts DOM -----
(function heartsDOM(){
  const wrap = $("#hero-hearts");
  if(!wrap) return;
  function spawn(){
    const el = document.createElement("span");
    el.className = "heart-float";
    el.textContent = Math.random() > 0.35 ? "♥" : "♡";
    const left = Math.random()*100;
    const size = 12 + Math.random()*18;
    const dur = 7 + Math.random()*7;
    const dx = (Math.random()-0.5)*120;
    el.style.left = left + "%";
    el.style.bottom = "-20px";
    el.style.fontSize = size + "px";
    el.style.setProperty("--dx", dx+"px");
    el.style.animationDuration = dur + "s";
    el.style.opacity = String(0.35 + Math.random()*0.5);
    wrap.appendChild(el);
    setTimeout(()=> el.remove(), dur*1000 + 200);
  }
  let iv = setInterval(()=>{ if(!document.hidden) spawn(); }, prefersReduced ? 1600 : 520);
  // burst once hero visible
  setTimeout(()=>{ for(let i=0;i<6;i++) setTimeout(spawn, i*120)}, 1200);
  addEventListener("visibilitychange", ()=>{ if(document.hidden) clearInterval(iv); else iv=setInterval(spawn, prefersReduced?1600:520)});
})();

// ----- GSAP scroll -----
gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

function initScrollAnimations(){
  // timeline line fill
  const tlLine = document.querySelector(".tl-line span");
  if(tlLine){
    gsap.fromTo(tlLine, {height:"0%"}, {
      height:"100%", ease:"none",
      scrollTrigger:{trigger:".timeline", start:"top 78%", end:"bottom 55%", scrub:0.8}
    });
  }
  // cards
  gsap.utils.toArray(".tl-card").forEach((card,i)=>{
    gsap.from(card, {
      y: 34, opacity:0, duration:0.9, ease:"power3.out",
      scrollTrigger:{trigger:card, start:"top 86%", toggleActions:"play none none reverse"},
      delay: i*0.04
    });
  });
  // memories
  gsap.utils.toArray(".mem").forEach((el,i)=>{
    gsap.from(el, {
      y: 28, opacity:0, duration:0.8, ease:"power3.out",
      scrollTrigger:{trigger:el, start:"top 88%"},
      delay: (i%3)*0.05
    });
  });
  // why
  gsap.utils.toArray(".why-card").forEach((el,i)=>{
    gsap.from(el, {
      y: 24, opacity:0, duration:.75, ease:"power3.out",
      scrollTrigger:{trigger:el, start:"top 88%"},
      delay: (i%2)*0.06
    });
  });
  // video parallax
  gsap.to("#bg-video", {
    yPercent: -8, ease:"none",
    scrollTrigger:{trigger:"#video-sec", start:"top bottom", end:"bottom top", scrub:1}
  });
  // letter / surprise
  gsap.from("#envelope-wrap", {scale:.96, opacity:0, duration:.9, ease:"power3.out", scrollTrigger:{trigger:"#letter", start:"top 78%"}});
}

// ----- 3D tilt -----
$$("[data-tilt]").forEach(card=>{
  if(prefersReduced || matchMedia("(pointer:coarse)").matches) return;
  let raf=0;
  card.addEventListener("mousemove", e=>{
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(()=>{
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left)/r.width - 0.5;
      const y = (e.clientY - r.top)/r.height - 0.5;
      card.style.transform = `perspective(900px) rotateY(${x*9}deg) rotateX(${-y*9}deg) translateY(-2px)`;
    });
  });
  card.addEventListener("mouseleave", ()=>{
    card.style.transform = "perspective(900px) rotateY(0) rotateX(0) translateY(0)";
  });
});

// ----- letter typing -----
const letterText = `Dear Fitri,

I don't know how to perfectly explain
what you mean to me.

But if I had to choose one person
to keep in my story,

I'd still choose you.`;
const typedEl = $("#typed-letter");
const envelopeBtn = $("#envelope");
const modal = $("#letter-modal");
const closeBtn = $("#letter-close");
let typedDone = false;

function typeLetter(){
  if(typedDone) return;
  typedDone = true;
  typedEl.textContent = "";
  let i=0;
  const speed = prefersReduced ? 6 : 18;
  (function step(){
    typedEl.textContent = letterText.slice(0, i++);
    // caret
    typedEl.style.borderRight = i < letterText.length ? "2px solid rgba(43,29,47,.25)" : "none";
    if(i <= letterText.length) setTimeout(step, letterText[i-1]==="\n" ? 160 : speed + Math.random()*30);
  })();
}

function openLetter(){
  envelopeBtn.classList.add("open");
  setTimeout(()=>{
    modal.classList.add("open");
    modal.setAttribute("aria-hidden","false");
    document.body.style.overflow="hidden";
    setTimeout(typeLetter, 420);
  }, 520);
}
function closeLetter(){
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden","true");
  document.body.style.overflow="";
}

envelopeBtn.addEventListener("click", openLetter);
closeBtn.addEventListener("click", closeLetter);
modal.querySelector(".letter-backdrop").addEventListener("click", closeLetter);
addEventListener("keydown", e=>{ if(e.key==="Escape" && modal.classList.contains("open")) closeLetter(); });

// ----- surprise -----
const surpriseSec = $("#surprise");
const surpriseBtn = $("#surprise-btn");
const surpriseCanvas = $("#surprise-canvas");
let surprised = false;

function surpriseHeartsExplosion(){
  const host = surpriseSec;
  const count = prefersReduced ? 18 : 90;
  for(let i=0;i<count;i++){
    const s = document.createElement("span");
    s.className = "heart-float";
    s.textContent = "♥";
    const size = 14 + Math.random()*26;
    const left = 50 + (Math.random()-0.5)*80;
    const bottom = 22 + Math.random()*18;
    const dx = (Math.random()-0.5)*420;
    const dur = 2.2 + Math.random()*2.2;
    const delay = Math.random()*0.35;
    s.style.left = left + "%";
    s.style.bottom = bottom + "%";
    s.style.fontSize = size + "px";
    s.style.color = `hsl(${350 + Math.random()*18} 100% ${65 + Math.random()*10}%)`;
    s.style.setProperty("--dx", dx+"px");
    s.style.animationDuration = dur + "s";
    s.style.animationDelay = delay + "s";
    host.appendChild(s);
    setTimeout(()=>s.remove(), (dur+delay)*1000+300);
  }
}

function triggerSurprise(){
  if(surprised) return;
  surprised = true;
  surpriseSec.classList.add("surprised");
  surpriseHeartsExplosion();
  // flash
  gsap.fromTo(surpriseSec, {backgroundColor:"#050308"}, {backgroundColor:"#1a0e24", duration:.6, ease:"power2.out", yoyo:true, repeat:1});
  gsap.to("#surprise-canvas", {opacity:1, duration:.4});
  // reveal text
  setTimeout(()=> surpriseSec.classList.add("revealed"), 520);
  // second burst
  setTimeout(surpriseHeartsExplosion, 900);
  // subtle canvas glow
  if(surpriseCanvas){
    const ctx = surpriseCanvas.getContext("2d");
    const dpr = Math.min(devicePixelRatio,2);
    function resize(){ surpriseCanvas.width=surpriseCanvas.clientWidth*dpr; surpriseCanvas.height=surpriseCanvas.clientHeight*dpr; }
    resize();
    let t=0;
    (function loop(){
      if(!surprised) return;
      t+=0.015;
      ctx.clearRect(0,0,surpriseCanvas.width,surpriseCanvas.height);
      const cx = surpriseCanvas.width/2, cy = surpriseCanvas.height*0.45;
      const g = ctx.createRadialGradient(cx,cy,0,cx,cy,Math.max(surpriseCanvas.width,surpriseCanvas.height)*0.55);
      g.addColorStop(0, `hsla(${340+Math.sin(t)*8},100%,62%,${0.10+Math.sin(t*1.2)*0.02})`);
      g.addColorStop(0.5, `hsla(270,100%,68%,0.06)`);
      g.addColorStop(1, "transparent");
      ctx.fillStyle=g; ctx.fillRect(0,0,surpriseCanvas.width,surpriseCanvas.height);
      if(t < 8) requestAnimationFrame(loop);
    })();
  }
  surpriseBtn.textContent = "it's you ♥";
  surpriseBtn.disabled = true;
}
surpriseBtn.addEventListener("click", triggerSurprise);

// ----- final 3D -----
(() => {
  const canvas = $("#final-canvas");
  if(!canvas) return;
  canvas.width = canvas.offsetWidth * devicePixelRatio;
  canvas.height = canvas.offsetHeight * devicePixelRatio;
  const {renderer} = makeRenderer(canvas, true);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, canvas.clientWidth/canvas.clientHeight, 0.1, 100);
  camera.position.set(0,0.2,8);
  addEventListener("resize", ()=>{ camera.aspect=canvas.clientWidth/canvas.clientHeight; camera.updateProjectionMatrix(); });

  scene.add(new THREE.AmbientLight(0xfff0f0, 0.6));
  const pl = new THREE.PointLight(0xff4d7a, 2.0, 20); pl.position.set(1,1,4); scene.add(pl);
  const pl2 = new THREE.PointLight(0x8b5cf6, 1.2, 18); pl2.position.set(-2,-1,3); scene.add(pl2);

  const shape = heartShape(1);
  const geo = new THREE.ExtrudeGeometry(shape, {depth:0.5, bevelEnabled:true, bevelThickness:0.11, bevelSize:0.08, bevelSegments:5, curveSegments:16});
  geo.center();
  const mat = new THREE.MeshPhysicalMaterial({color:0xff2e63, emissive:0xff1a4d, emissiveIntensity:0.32, roughness:0.3, clearcoat:0.6, transparent:true, opacity:0.96});
  const heart = new THREE.Mesh(geo, mat);
  heart.scale.set(1.25,1.25,1.25);
  heart.position.y = 0.15;
  scene.add(heart);

  const pts = new THREE.Points(
    new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(new Float32Array(600).map((_,i)=> (i%3===0?(Math.random()-0.5)*14: i%3===1?(Math.random()-0.5)*9 : (Math.random()-0.5)*8)), 3)),
    new THREE.PointsMaterial({size:0.03, color:0xffb3d1, transparent:true, opacity:0.35, blending:THREE.AdditiveBlending, depthWrite:false})
  );
  scene.add(pts);

  let t=0;
  renderer.setAnimationLoop(()=>{
    t+=0.01;
    heart.rotation.y += 0.005;
    heart.position.y = 0.15 + Math.sin(t*0.9)*0.14;
    heart.rotation.z = Math.sin(t*0.6)*0.05;
    pts.rotation.y += 0.0007;
    renderer.render(scene,camera);
  });
})();

// ----- loader canvas particles -----
(() => {
  const c = $("#loader-canvas");
  if(!c) return;
  const ctx = c.getContext("2d");
  const dpr = Math.min(devicePixelRatio,2);
  function rs(){ c.width=innerWidth*dpr; c.height=innerHeight*dpr; }
  rs(); addEventListener("resize", rs);
  const dots = Array.from({length: prefersReduced?22:54}, ()=>({
    x:Math.random()*c.width, y:Math.random()*c.height,
    vx:(Math.random()-0.5)*0.4*dpr, vy:(Math.random()-0.5)*0.4*dpr,
    r: 1.2 + Math.random()*1.8
  }));
  (function loop(){
    if(loaderDone && loader.style.display==="none") return;
    ctx.clearRect(0,0,c.width,c.height);
    ctx.fillStyle="rgba(255,180,200,0.55)";
    dots.forEach(d=>{
      d.x+=d.vx; d.y+=d.vy;
      if(d.x<0||d.x>c.width) d.vx*=-1;
      if(d.y<0||d.y>c.height) d.vy*=-1;
      ctx.beginPath(); ctx.arc(d.x,d.y,d.r*dpr,0,Math.PI*2); ctx.fill();
    });
    // connections
    ctx.strokeStyle="rgba(255,180,200,0.08)";
    ctx.lineWidth=1;
    for(let i=0;i<dots.length;i++) for(let j=i+1;j<dots.length;j++){
      const dx=dots[i].x-dots[j].x, dy=dots[i].y-dots[j].y;
      const dist=Math.hypot(dx,dy);
      if(dist < 140*dpr){ ctx.globalAlpha = (1 - dist/(140*dpr))*0.35; ctx.beginPath(); ctx.moveTo(dots[i].x,dots[i].y); ctx.lineTo(dots[j].x,dots[j].y); ctx.stroke(); }
    }
    ctx.globalAlpha=1;
    requestAnimationFrame(loop);
  })();
})();

// ----- nav actions -----
$("#enter-btn").addEventListener("click", ()=>{
  gsap.to(window, {duration:1.2, scrollTo:"#story", ease:"power3.inOut"});
});
$("#restart-btn").addEventListener("click", ()=>{
  surprised=false;
  surpriseSec.classList.remove("surprised","revealed");
  surpriseBtn.textContent="open the surprise";
  surpriseBtn.disabled=false;
  gsap.to(window, {duration:1.1, scrollTo:0, ease:"power3.inOut"});
});

// ----- tiny ambience toggle (no file needed — uses WebAudio) -----
let audioCtx, osc, gain, playing=false;
$("#music-btn").addEventListener("click", async ()=>{
  const btn = $("#music-btn");
  try{
    if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
    if(!playing){
      await audioCtx.resume();
      gain = audioCtx.createGain(); gain.gain.value=0; gain.connect(audioCtx.destination);
      osc = audioCtx.createOscillator(); osc.type="sine"; osc.frequency.value=110;
      const o2 = audioCtx.createOscillator(); o2.type="triangle"; o2.frequency.value=220;
      const g2 = audioCtx.createGain(); g2.gain.value=0;
      osc.connect(gain); o2.connect(g2); g2.connect(audioCtx.destination);
      osc.start(); o2.start();
      gain.gain.linearRampToValueAtTime(0.015, audioCtx.currentTime+1.2);
      g2.gain.linearRampToValueAtTime(0.008, audioCtx.currentTime+1.2);
      // store refs
      $("#music-btn")._o2=o2; $("#music-btn")._g2=g2;
      playing=true; btn.innerHTML="♪ <span>sound on</span>";
    } else {
      gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime+0.6);
      const g2=$("#music-btn")._g2; if(g2) g2.gain.linearRampToValueAtTime(0, audioCtx.currentTime+0.6);
      setTimeout(()=>{ try{osc.stop(); $("#music-btn")._o2.stop();}catch{} },700);
      playing=false; btn.innerHTML="♪ <span>sound off</span>";
    }
  }catch(e){ btn.innerHTML="♪ <span>unavailable</span>"; }
});

// ----- console easter -----
console.log("%cfor fitri ♥", "font-size:22px;color:#ff4d7a;font-weight:700", "\n— built by Agis");
