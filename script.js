import * as THREE from "three";
const $ = s => document.querySelector(s);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

// year + progress
const y=document.getElementById("year"); if(y) y.textContent=new Date().getFullYear();
const bar=document.getElementById("progress-bar");
addEventListener("scroll",()=>{ const h=document.documentElement; const p=(h.scrollTop/(h.scrollHeight-h.clientHeight))*100; if(bar) bar.style.width=clamp(p,0,100)+"%" },{passive:true});

// loader
const loader=document.getElementById("loader");
const fill=document.querySelector("#loader .loader-line span");
let prog=0; const setP=v=>{ prog=clamp(v,0,100); if(fill) fill.style.width=prog+"%" };
let done=false;
function hide(){
  if(done) return; done=true;
  loader.classList.add("hide");
  setTimeout(()=> loader.style.display="none", 800);
  gsap.from(".hero-title",{y:18,opacity:0,duration:.9,ease:"power2.out"});
  gsap.from(".hero-sub",{y:10,opacity:0,duration:.7,delay:.15});
  gsap.from("#enter-btn",{y:8,opacity:0,duration:.6,delay:.25});
  initScroll();
}
let p=0; const fake=setInterval(()=>{ p+=8+Math.random()*10; if(p>=88){clearInterval(fake); p=88} setP(p)},160);
Promise.all([document.fonts?document.fonts.ready:Promise.resolve(), new Promise(r=>setTimeout(r,700))]).then(()=>{
  clearInterval(fake);
  let cur=prog; const id=setInterval(()=>{ cur+=5; setP(cur); if(cur>=100){clearInterval(id); setTimeout(hide,250)}},28);
});
setTimeout(()=>{ if(!done){ setP(100); hide()}},4000);

// THREE helper
function mk(canvas, alpha=true){
  const r=new THREE.WebGLRenderer({canvas, antialias:true, alpha});
  r.setPixelRatio(Math.min(devicePixelRatio,1.8));
  const rs=()=>{ const w=canvas.clientWidth||innerWidth, h=canvas.clientHeight||innerHeight; r.setSize(w,h,false); };
  rs(); addEventListener("resize",rs); return r;
}
function heartShape(s=1){
  const sh=new THREE.Shape();
  sh.moveTo(0,0.6*s); sh.bezierCurveTo(0.5*s,1.1*s,1.2*s,0.6*s,0,-0.8*s); sh.bezierCurveTo(-1.2*s,0.6*s,-0.5*s,1.1*s,0,0.6*s);
  return sh;
}

// hero 3D - single heart, subtle
(()=>{ const c=document.getElementById("hero-canvas"); if(!c||reduced) return;
  c.width=c.clientWidth*devicePixelRatio; c.height=c.clientHeight*devicePixelRatio;
  const r=mk(c,true); const scene=new THREE.Scene();
  const cam=new THREE.PerspectiveCamera(40, c.clientWidth/c.clientHeight, .1, 100); cam.position.set(0,.5,8);
  addEventListener("resize",()=>{ cam.aspect=c.clientWidth/c.clientHeight; cam.updateProjectionMatrix(); });
  scene.add(new THREE.AmbientLight(0xfff0f0,.7));
  const pl=new THREE.PointLight(0xff8fab,1.6,18); pl.position.set(1.5,1,3); scene.add(pl);
  const g=new THREE.ExtrudeGeometry(heartShape(1),{depth:.45,bevelEnabled:true,bevelThickness:.1,bevelSize:.07,bevelSegments:4,curveSegments:14});
  g.center();
  const m=new THREE.MeshPhysicalMaterial({color:0xc92a4a, emissive:0x8a1028, emissiveIntensity:.18, roughness:.38, clearcoat:.4, transparent:true, opacity:.96});
  const he=new THREE.Mesh(g,m); he.scale.set(1.15,1.15,1.15); he.rotation.set(.14,0,0); scene.add(he);
  let t=0; r.setAnimationLoop(()=>{ t+=.008; he.rotation.y+=.003; he.position.y=Math.sin(t)*.08; r.render(scene,cam); });
})();

// GSAP scroll reveals
gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
function initScroll(){
  const line=document.querySelector(".tl-line span");
  if(line) gsap.fromTo(line,{height:"0%"},{height:"100%",ease:"none",scrollTrigger:{trigger:".timeline",start:"top 78%",end:"bottom 60%",scrub:.8}});
  gsap.utils.toArray(".tl-card").forEach(el=> gsap.from(el,{y:14,opacity:0,duration:.6,scrollTrigger:{trigger:el,start:"top 88%"}}));
  gsap.utils.toArray(".polaroid").forEach((el,i)=> gsap.from(el,{y:12,opacity:0,duration:.5,delay:(i%3)*.04,scrollTrigger:{trigger:el,start:"top 92%"}}));
  gsap.utils.toArray(".why-card").forEach(el=> gsap.from(el,{y:10,opacity:0,duration:.5,scrollTrigger:{trigger:el,start:"top 90%"}}));
  gsap.to("#bg-video",{yPercent:-6,ease:"none",scrollTrigger:{trigger:"#video-sec",start:"top bottom",end:"bottom top",scrub:1}});
}

// letter
const letterText=`Dear Fitri,

I don't know how to perfectly explain
what you mean to me.

But if I had to choose one person
to keep in my story,

I'd still choose you.`;
const typed=document.getElementById("typed-letter");
const env=document.getElementById("envelope");
const modal=document.getElementById("letter-modal");
const closeBtn=document.getElementById("letter-close");
let typedDone=false;
function typeIt(){
  if(typedDone||!typed) return; typedDone=true; typed.textContent=""; let i=0;
  (function s(){ typed.textContent=letterText.slice(0,++i); if(i<letterText.length) setTimeout(s, letterText[i-1]==="\n"?90:16+Math.random()*18); })();
}
function openLetter(){ env.classList.add("open"); setTimeout(()=>{ modal.classList.add("open"); modal.setAttribute("aria-hidden","false"); document.body.style.overflow="hidden"; setTimeout(typeIt,300)},420); }
function closeLetter(){ modal.classList.remove("open"); modal.setAttribute("aria-hidden","true"); document.body.style.overflow=""; }
if(env) env.addEventListener("click", openLetter);
if(closeBtn) closeBtn.addEventListener("click", closeLetter);
document.querySelector(".letter-backdrop")?.addEventListener("click", closeLetter);
addEventListener("keydown",e=>{ if(e.key==="Escape") closeLetter() });

// surprise
const sSec=document.getElementById("surprise"), sBtn=document.getElementById("surprise-btn");
let sur=false;
function confetti(){
  const c=document.getElementById("confetti-canvas"); if(!c) return;
  const ctx=c.getContext("2d"); const dpr=Math.min(devicePixelRatio,1.6);
  const rs=()=>{ c.width=c.clientWidth*dpr; c.height=c.clientHeight*dpr }; rs();
  const cols=["#c92a4a","#e8a0b0","#fff","#f0abfc"];
  const ps=Array.from({length:70},()=>({x:Math.random()*c.width,y:-20*dpr,vy:2+Math.random()*5, vx:(Math.random()-.5)*3, r:2+Math.random()*4, col:cols[Math.floor(Math.random()*cols.length)], rot:Math.random()*6}));
  let t=0; (function loop(){ t+=.016; ctx.clearRect(0,0,c.width,c.height); let alive=false;
    for(const p of ps){ p.y+=p.vy; p.x+=p.vx; p.vy+=.12; p.rot+=.12; if(p.y<c.height+20){ alive=true; ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot); ctx.fillStyle=p.col; ctx.globalAlpha=.9; ctx.fillRect(-p.r,-p.r,p.r*2,p.r); ctx.restore(); }}
    if(alive&&t<4) requestAnimationFrame(loop); else ctx.clearRect(0,0,c.width,c.height);
  })();
}
function flash(){ const f=document.querySelector(".surprise-flash"); if(!f) return; f.classList.add("on"); setTimeout(()=>f.classList.remove("on"),140); }
function goSurprise(){
  if(sur) return; sur=true; sSec.classList.add("surprised"); flash(); confetti();
  gsap.fromTo(sSec,{backgroundColor:"#0c080f"},{backgroundColor:"#1a1020",duration:.5,yoyo:true,repeat:1});
  setTimeout(()=> sSec.classList.add("revealed"), 420);
}
if(sBtn) sBtn.addEventListener("click", goSurprise);

// final 3D subtle
(()=>{ const c=document.getElementById("final-canvas"); if(!c||reduced) return;
  c.width=c.clientWidth*devicePixelRatio; c.height=c.clientHeight*devicePixelRatio;
  const r=mk(c,true); const scene=new THREE.Scene();
  const cam=new THREE.PerspectiveCamera(38,c.clientWidth/c.clientHeight,.1,100); cam.position.set(0,.2,7);
  const g=new THREE.ExtrudeGeometry(heartShape(1),{depth:.4,bevelEnabled:true,bevelThickness:.09,bevelSize:.06,bevelSegments:3,curveSegments:12});
  g.center(); const m=new THREE.MeshPhysicalMaterial({color:0xc92a4a, emissive:0x7a0f22, emissiveIntensity:.2, roughness:.4});
  const he=new THREE.Mesh(g,m); he.scale.set(1,1,1); scene.add(he);
  scene.add(new THREE.AmbientLight(0xfff0f0,.7)); const pl=new THREE.PointLight(0xff8fab,1.2,16); pl.position.set(1,1,3); scene.add(pl);
  let t=0; r.setAnimationLoop(()=>{ t+=.008; he.rotation.y+=.004; he.position.y=Math.sin(t)*.06; r.render(scene,cam); });
})();

// music - Begin Again (YouTube full fallback preview)
let yt=null, ytReady=false, ytOn=false;
const aud=document.getElementById("bg-audio"); const btn=document.getElementById("music-btn");
function ui(on){ if(btn) btn.classList.toggle("playing", on) }
window.onYouTubeIframeAPIReady=()=>{
  yt=new YT.Player("yt-player",{height:"1",width:"1",videoId:"cMPEd8m79Hw",playerVars:{playsinline:1,controls:0,loop:1,playlist:"cMPEd8m79Hw",modestbranding:1,rel:0},
    events:{onReady:()=> ytReady=true, onStateChange:e=>{ if(e.data===YT.PlayerState.PLAYING){ytOn=true; ui(true)} if(e.data===YT.PlayerState.PAUSED) {ytOn=false; ui(false)}}}});
};
if(btn){
  btn.addEventListener("click", async()=>{
    if(ytReady){ if(ytOn){ yt.pauseVideo(); ytOn=false; ui(false)} else { yt.setVolume(70); yt.playVideo(); if(aud) aud.pause(); ytOn=true; ui(true)} return; }
    if(!aud) return; try{ if(aud.paused){ await aud.play(); ui(true)} else { aud.pause(); ui(false)} }catch(e){}
  });
  let once=false; document.addEventListener("click",()=>{ if(once) return; once=true; if(ytReady&&!ytOn) { yt.setVolume(70); yt.playVideo(); } else if(aud&&aud.paused) aud.play().then(()=>ui(true)).catch(()=>{}); },{once:true});
}
aud?.addEventListener("ended",()=> ui(false));

// nav
document.getElementById("enter-btn")?.addEventListener("click",()=> gsap.to(window,{duration:1,scrollTo:"#story",ease:"power2.inOut"}));
document.getElementById("restart-btn")?.addEventListener("click",()=> gsap.to(window,{duration:.9,scrollTo:0}));
document.querySelector(".scroll-hint")?.addEventListener("click",e=> gsap.to(window,{duration:.9,scrollTo:e.currentTarget.dataset.scroll}));
console.log("%cfor fitri — still you.", "color:#e8a0b0");

// loader canvas subtle dots
(()=>{ const c=document.getElementById("loader-canvas"); if(!c||reduced) return;
  const ctx=c.getContext("2d"); const dpr=Math.min(devicePixelRatio,1.5);
  const rs=()=>{ c.width=innerWidth*dpr; c.height=innerHeight*dpr }; rs(); addEventListener("resize",rs);
  const ds=Array.from({length:28},()=>({x:Math.random()*c.width,y:Math.random()*c.height,vx:(Math.random()-.5)*.35*dpr,vy:(Math.random()-.5)*.35*dpr,r:1+Math.random()*1.4}));
  (function loop(){ if(c.style.display==="none"||document.getElementById("loader").classList.contains("hide")&&parseFloat(getComputedStyle(document.getElementById("loader")).opacity)<.1) return;
    ctx.clearRect(0,0,c.width,c.height); ctx.fillStyle="rgba(232,160,176,.45)";
    ds.forEach(d=>{ d.x+=d.vx; d.y+=d.vy; if(d.x<0||d.x>c.width) d.vx*=-1; if(d.y<0||d.y>c.height) d.vy*=-1; ctx.beginPath(); ctx.arc(d.x,d.y,d.r*dpr,0,6.28); ctx.fill(); });
    requestAnimationFrame(loop);
  })();
})();
