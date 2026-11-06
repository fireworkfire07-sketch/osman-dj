// OSMAN DJ — ortak motor (tarayıcı stüdyosundan birebir alındı: müzik, aranjman, enstrümanlar, yönetmen, anime)
// Otomatik üretildi. Değiştirmek için studio/index.html'i düzenleyip tools/build-core.py çalıştır.
'use strict';
module.exports=function makeCore(env){
const window={OfflineAudioContext:env.OfflineAudioContext,webkitOfflineAudioContext:env.OfflineAudioContext};
const OfflineAudioContext=env.OfflineAudioContext;
const DUMMY=new Proxy(function(){},{get:(t,k)=>k===Symbol.toPrimitive?(()=>''):(k==='value'?'':DUMMY),set:()=>true,apply:()=>DUMMY});
const $=()=>DUMMY,feed=()=>{},setAg=()=>{},renderArchive=()=>{},stats=()=>{};
const document={hidden:false,createElement:()=>DUMMY};
const pad=n=>String(n).padStart(2,'0');
const fmt=s=>s>=3600?`${Math.floor(s/3600)}:${pad(Math.floor(s/60)%60)}:${pad(Math.floor(s%60))}`:`${pad(Math.floor(s/60))}:${pad(Math.floor(s%60))}`;
let CHANNEL='ANATOLIAN SHAMANS';const ch=()=>CHANNEL;
const gnames=t=>t.keys.map(k=>G[k].n);
let AC=null,bus=null,master=null,cur='psy',bpm=145,playing=false,recOn=false,autoOn=false,curInfo=null,trans=null;
/* ═══ MAKAMLAR & TÜRLER ═══ */
const HICAZ=[62,63,66,67,69,70,72,74];
const HUSEYNI=[57,59,60,62,64,66,67,69];
const R4=a=>[].concat(a,a,a,a);
const DARB=['D',0,0,'T',0,'k','T',0,'D',0,'k','T',0,'k','T','k'];       // maksum
const DARB_AKSAK=['D',0,'k','T',0,'k','D',0,'k','T',0,'k','D',0,'T','k']; // 3+3+3+3+2+2
const DAVUL=['B',0,'t',0,'t',0,'B',0,'t',0,'B',0,'t',0,'t','t'];
const G={
 psy:{n:'Psytrance',ic:'🌀',bpm:145,c:'#c084fc',c2:'#3b0764',k:R4([1,0,0,0]),b:R4([0,1,1,1]),h:R4([0,0,1,0]),cl:null,
   l:[1,0,1,1,0,1,0,1,1,0,1,0,0,1,1,0],mel:[0,2,3,4,3,2,0,5,4,3,2,1],sc:HICAZ,oct:0,wave:'sawtooth',ll:.9,bn:[38,38,38,41],cut:700,
   perc:'darbuka',dp:DARB,ai:'baglama',brk:'ney',ki:'baglama',synth:true,tag:'Full-On Psy · Hicaz Lead · Gece'},
 tech:{n:'Techno',ic:'⚡',bpm:135,c:'#f87171',c2:'#450a0a',k:R4([1,0,0,0]),b:[0,0,1,0,0,0,1,0,0,0,1,0,0,1,1,0],h:R4([0,0,1,0]),ho:true,cl:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
   l:[0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0],mel:[0,0,3,1,4,2],sc:[57,60,62,63,67,69],oct:0,wave:'square',ll:1,bn:[33,33,33,36],cut:400,
   perc:'davul',dp:DAVUL,ai:'zurna',brk:'ney',ki:'zurna',synth:true,tag:'Berlin Dark Techno · Gece Yarısı'},
 arock:{n:'Anadolu Rock',ic:'🎸',bpm:108,c:'#fbbf24',c2:'#422006',k:[1,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0],b:[1,0,0,1,0,0,1,0,1,0,0,1,0,0,1,0],h:R4([1,0,1,0]),cl:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
   l:[1,0,1,1,1,0,1,0,1,1,0,1,1,0,1,0],mel:[0,1,2,3,4,3,2,1,0,1,2,1],sc:HICAZ,oct:0,wave:'square',ll:1.2,bn:[38,38,43,41],cut:900,
   perc:'darbuka',dp:DARB,ai:'baglama',brk:'baglama',ki:'baglama',synth:false,tag:'Anadolu Rock · Hicaz · Gündüz'},
 dh:{n:'Deep House',ic:'🌅',bpm:122,c:'#22d3ee',c2:'#083344',k:R4([1,0,0,0]),b:[0,0,0,1,0,0,1,0,0,0,0,1,0,1,0,0],h:R4([0,0,1,0]),ho:true,cl:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
   l:[0,0,1,0,0,0,0,1,0,0,1,0,0,0,0,0],mel:[2,4,3,1,0,1],sc:[57,60,62,64,67,69],oct:12,wave:'triangle',ll:2,pad:true,bn:[33,33,29,31],cut:500,
   perc:'darbuka',dp:DARB,ai:'ney',brk:'ney',ki:'ney',synth:true,tag:'Sunset Deep House · Antalya'},
 neset:{n:'Neşet Ertaş Chill Tekno',ic:'🪘',bpm:96,c:'#fb923c',c2:'#431407',k:[1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0],b:[1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0],h:R4([0,0,1,0]),cl:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
   l:[1,0,1,0,1,1,0,0,1,0,1,0,1,1,0,0],mel:[4,3,2,1,0,1,2,3,4,5,4,3],sc:HUSEYNI,oct:12,wave:'triangle',ll:.8,pad:true,bn:[33,33,31,31],cut:500,
   perc:'darbuka',dp:DARB,ai:'baglama',brk:'ney',ki:'baglama',synth:false,tag:'Neşet Ertaş Ruhu · Bağlama + Chill Tekno'},
 semah:{n:'Alevi Semah Tekno',ic:'🕯',bpm:112,c:'#f472b6',c2:'#500724',k:[1,0,0,1,0,0,1,0,0,1,0,0,1,0,1,0],b:[1,0,0,1,0,0,1,0,0,1,0,0,1,0,1,0],h:[1,1,0,1,1,0,1,1,0,1,1,0,1,0,1,0],cl:[0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0],
   l:[1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,0],mel:[0,2,4,5,4,2,1,0,4,3,2,1],sc:HUSEYNI,oct:12,wave:'triangle',ll:1,bn:[33,33,36,31],cut:600,
   perc:'darbuka',dp:DARB_AKSAK,ai:'baglama',brk:'ney',ki:'baglama',synth:false,tag:'Semah Ritmi · Aksak · Deyiş Ruhu'},
 afunk:{n:'Anadolu Funk',ic:'🕺',bpm:110,c:'#f97316',c2:'#3a1204',k:[1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0],b:[1,0,0,1,0,0,1,0,1,0,1,0,0,1,0,1],h:[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],cl:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,1],
   l:[1,0,0,1,0,0,1,0,0,0,1,0,1,0,0,0],mel:[0,2,3,4,2,3,1,0,4,5,4,2],sc:HICAZ,oct:0,wave:'square',ll:1,bn:[38,38,43,41],cut:1400,pad:true,
   perc:'darbuka',dp:DARB,ai:'baglama',brk:'baglama',ki:'baglama',synth:false,funk:true,tag:'70ler Anadolu Rock · Funk · Psikedelik'},
 sifa:{n:'Şifa Frekansları',ic:'🌿',bpm:60,c:'#86efac',c2:'#052e16',k:R4([0,0,0,0]),b:R4([0,0,0,0]),h:R4([0,0,0,0]),cl:null,l:R4([0,0,0,0]),mel:[0],sc:[72],oct:0,wave:'sine',ll:1,bn:[48],cut:3000,perc:'def',dp:R4([0,0,0,0]),ai:'ney',brk:'ney',ki:'ney',synth:false,sifa:true,tag:'Solfeggio Frekansları · Doğa Sesleri · Meditasyon'},
 saman:{n:'Şaman Trans',ic:'🪶',bpm:118,c:'#a3e635',c2:'#1a2e05',k:[1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],b:[1,0,0,0,0,0,1,0,1,0,0,0,0,0,1,0],h:R4([0,0,1,0]),cl:null,
   l:[1,0,0,1,0,0,1,0,0,0,1,0,1,0,0,0],mel:[0,2,3,4,3,2,1,0,4,5,4,2],sc:[57,60,62,64,67,69],oct:12,wave:'triangle',ll:1.5,bn:[38,38,38,36],cut:400,
   perc:'def',dp:['O',0,0,'O',0,0,0,0,'O',0,0,'O',0,0,'r',0],ai:'kopuz',brk:'ney',ki:'ney',synth:false,tag:'Şaman Defi · Didgeridoo · Ağız Kopuzu'},
};
const DIDJ={saman:'all',psy:'ib',semah:'ib',neset:'ib',tech:'b'};
const NEXT={afunk:['arock','neset','semah'],psy:['tech','saman'],tech:['psy','semah'],arock:['afunk','neset','semah'],dh:['psy','neset'],neset:['saman','arock'],semah:['saman','arock'],saman:['semah','psy']};

/* ═══ KLASİK MOTİFLER (public domain) ═══ */
const MOT=[
 {c:'Beethoven',p:'5. Senfoni',root:36,seq:[[0,2],[67,2],[67,2],[67,2],[63,10],[0,2],[65,2],[65,2],[65,2],[62,12],[0,26]]},
 {c:'Beethoven',p:'Für Elise',root:45,seq:[[76,2],[75,2],[76,2],[75,2],[76,2],[71,2],[74,2],[72,2],[69,6],[60,2],[64,2],[69,2],[71,6],[64,2],[68,2],[71,2],[72,6],[0,18]]},
 {c:'Beethoven',p:'Neşeye Övgü (9. Senfoni)',root:36,seq:[[64,4],[64,4],[65,4],[67,4],[67,4],[65,4],[64,4],[62,4],[60,4],[60,4],[62,4],[64,4],[64,6],[62,2],[62,8]]},
 {c:'Mozart',p:'Rondo alla Turca (Türk Marşı)',root:45,seq:[[71,1],[69,1],[68,1],[69,1],[72,4],[74,1],[72,1],[71,1],[72,1],[76,4],[77,1],[76,1],[75,1],[76,1],[71,1],[69,1],[68,1],[69,1],[71,1],[69,1],[68,1],[69,1],[72,4],[69,2],[71,2],[72,2],[71,2],[69,2],[68,2],[69,2],[64,2],[72,2],[74,2],[76,2],[74,2],[72,2],[71,2],[69,4]]},
 {c:'Mozart',p:'Eine kleine Nachtmusik',root:43,seq:[[67,4],[62,2],[67,4],[62,2],[67,2],[62,2],[67,2],[71,2],[74,8],[72,4],[69,2],[72,4],[69,2],[72,2],[69,2],[66,2],[69,2],[62,8],[0,8]]},
 {c:'Paganini',p:'Caprice No. 24',root:45,seq:[[69,3],[69,1],[72,1],[71,1],[69,2],[76,4],[64,4],[71,3],[71,1],[74,1],[72,1],[71,2],[76,4],[68,4],[69,3],[69,1],[72,1],[71,1],[69,2],[76,4],[64,4],[71,2],[68,2],[64,2],[68,2],[69,8]]},
];
MOT.forEach(m=>{m.on=new Array(64).fill(null);let p=0;m.seq.forEach(([n,l])=>{if(p<64&&n)m.on[p]={m:n,len:l};p+=l;});});
let klasikOn=true,klasikSel=-1,motBase=0;
$('klasikSel').innerHTML='<option value="-1">🔄 Otomatik sırayla</option>'+MOT.map((m,i)=>`<option value="${i}">${m.c} — ${m.p}</option>`).join('');
function motifFor(cyc){return MOT[klasikSel>=0?klasikSel:((cyc+motBase)%MOT.length)];}
function toggleKlasik(){klasikOn=!klasikOn;$('klasikSw').classList.toggle('on',klasikOn);feed('BEYİN',klasikOn?'🎻 Klasik bölüm açık':'Klasik bölüm kapalı');}

/* ═══ ANADOLU ENSTRÜMANLARI ═══ */
const INST={baglama:true,ney:true,zurna:true,darbuka:true,davul:true,didj:true,kopuz:true,def:true,hang:true,vokal:true};
const INST_N={baglama:'🪕 Bağlama',ney:'🎋 Ney',zurna:'🎺 Zurna',darbuka:'🥁 Darbuka',davul:'🪘 Davul',didj:'🪵 Didgeridoo',kopuz:'〰 Ağız Kopuzu',def:'⭕ Şaman Defi',hang:'🛸 Hang Drum',vokal:'🗣 Şaman Sesi'};
function renderChips(){$('instChips').innerHTML=Object.keys(INST).map(k=>`<button class="chip ${INST[k]?'on':''}" onclick="INST.${k}=!INST.${k};renderChips();feed('BEYİN','${INST_N[k]} '+(INST.${k}?'açıldı':'kapandı'))">${INST_N[k]}</button>`).join('');}
renderChips();

/* ═══ ARANJMAN: 64 barlık akış ═══ */
const SEC=[{s:0,e:8,id:'intro',n:'🌒 INTRO',c:'#64748b'},{s:8,e:16,id:'build',n:'📈 YÜKSELİŞ',c:'#fbbf24'},{s:16,e:32,id:'drop',n:'🔥 DROP',c:'#f87171'},{s:32,e:40,id:'break',n:'🌊 TAKSİM',c:'#22d3ee'},{s:40,e:48,id:'build2',n:'📈 YÜKSELİŞ II',c:'#fbbf24'},{s:48,e:64,id:'drop2',n:'🔥 DROP II',c:'#c084fc'}];
$('cyc').insertAdjacentHTML('afterbegin',SEC.map(s=>`<div id="seg_${s.id}" style="flex:${s.e-s.s};background:${s.c}"></div>`).join(''));
function secInfo(as){const cb=Math.floor(as/16)%64,cyc=Math.floor(as/1024);const s=SEC.find(x=>cb>=x.s&&cb<x.e);let id=s.id,n=s.n,motif=null;
  if(id==='intro'&&cyc>0){id='groove';n='🌀 GROOVE';}
  if((id==='drop2'||id==='build2')&&klasikOn){motif=motifFor(cyc);if(id==='drop2'){id='klasik';n='🎻 KLASİK BÖLÜM';}}
  return {id,base:s.id,n,bar:cb-s.s,len:s.e-s.s,cb,cyc,secStart:as-(as%16)-(cb-s.s)*16,motif};}

/* ═══ SYNTH ═══ */
const mf=m=>440*Math.pow(2,(m-69)/12);
const NB=new WeakMap();
function noise(ctx){let b=NB.get(ctx);if(!b){b=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);const d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;NB.set(ctx,b);}return b;}
function env(ctx,t,peak,att,dec){const g=ctx.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(peak,t+att);g.gain.exponentialRampToValueAtTime(.0001,t+att+dec);return g;}
function nz(ctx,out,t,type,f,q,peak,dec){const s=ctx.createBufferSource();s.buffer=noise(ctx);const fl=ctx.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q;const g=env(ctx,t,peak,.002,dec);s.connect(fl);fl.connect(g);g.connect(out);s.start(t,Math.random()*.5);s.stop(t+dec+.05);}
function tone(ctx,out,t,type,f0,f1,peak,dec,glide){const o=ctx.createOscillator();o.type=type;o.frequency.setValueAtTime(f0,t);if(f1)o.frequency.exponentialRampToValueAtTime(f1,t+(glide||dec));const g=env(ctx,t,peak,.002,dec);o.connect(g);g.connect(out);o.start(t);o.stop(t+dec+.05);}
const sKick=(c,o,t)=>tone(c,o,t,'sine',160,42,1,.32,.09);
const sHat=(c,o,t,op)=>nz(c,o,t,'highpass',7000,.7,.2,op?.16:.045);
const sClap=(c,o,t,v=.45)=>nz(c,o,t,'bandpass',1500,.8,v,.16);
function sBass(ctx,out,t,m,cut,len){const o=ctx.createOscillator(),f=ctx.createBiquadFilter(),g=ctx.createGain();o.type='sawtooth';o.frequency.value=mf(m);f.type='lowpass';f.frequency.setValueAtTime(cut*2,t);f.frequency.exponentialRampToValueAtTime(cut*.4,t+len);f.Q.value=6;g.gain.setValueAtTime(.3,t);g.gain.exponentialRampToValueAtTime(.001,t+len);o.connect(f);f.connect(g);g.connect(out);o.start(t);o.stop(t+len+.02);}
function sLead(ctx,out,t,m,wave,len,vol=.11){const g=ctx.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.01);g.gain.exponentialRampToValueAtTime(.001,t+len);[0,8].forEach(dt=>{const o=ctx.createOscillator();o.type=wave;o.frequency.value=mf(m);o.detune.value=dt;o.connect(g);o.start(t);o.stop(t+len+.02);});g.connect(out);}
function sPad(ctx,out,t,m,len,vol=.045){const g=ctx.createGain();g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(vol,t+len*.3);g.gain.linearRampToValueAtTime(.0001,t+len);[0,3,7].forEach(iv=>{const o=ctx.createOscillator();o.type='sine';o.frequency.value=mf(m+iv);o.connect(g);o.start(t);o.stop(t+len+.05);});g.connect(out);}
function sRiser(ctx,out,t,dur){const s=ctx.createBufferSource();s.buffer=noise(ctx);s.loop=true;const f=ctx.createBiquadFilter();f.type='bandpass';f.Q.value=1.5;f.frequency.setValueAtTime(300,t);f.frequency.exponentialRampToValueAtTime(9000,t+dur);const g=ctx.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.22,t+dur);g.gain.linearRampToValueAtTime(.0001,t+dur+.05);s.connect(f);f.connect(g);g.connect(out);s.start(t);s.stop(t+dur+.1);}
function sCrash(ctx,out,t){nz(ctx,out,t,'highpass',4000,.5,.25,1.4);tone(ctx,out,t,'sine',90,35,.8,.6,.3);}
// 🪕 Bağlama — Karplus-Strong tel sentezi
const KS=new WeakMap();
function ksBuf(ctx,m){let c=KS.get(ctx);if(!c){c={};KS.set(ctx,c);}if(c[m])return c[m];
  const sr=ctx.sampleRate,N=Math.max(2,Math.round(sr/mf(m))),L=Math.floor(sr*1.4),b=ctx.createBuffer(1,L,sr),d=b.getChannelData(0);
  for(let i=0;i<N;i++)d[i]=Math.random()*2-1;d[N]=d[0]*.99;
  for(let i=N+1;i<L;i++)d[i]=.996*(.62*d[i-N]+.38*d[i-N-1]);
  let mx=0;for(let i=0;i<L;i++)mx=Math.max(mx,Math.abs(d[i]));const k=.9/(mx||1);for(let i=0;i<L;i++)d[i]*=k*(i>L-3000?(L-i)/3000:1);
  c[m]=b;return b;}
function sBag(ctx,out,t,m,vol=.3,trem=false,sd=.1){const hits=trem?3:1;
  for(let h=0;h<hits;h++){const tt=t+h*sd*.5;if(rBag(ctx,out,tt,m,vol*(h?.55:1)))continue;const hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=140;const pk=ctx.createBiquadFilter();pk.type='peaking';pk.frequency.value=2800;pk.gain.value=5;
    const g=ctx.createGain();g.gain.setValueAtTime(vol*(h?.55:1),tt);g.gain.exponentialRampToValueAtTime(.001,tt+1.3);hp.connect(pk);pk.connect(g);g.connect(out);
    [1,1.004].forEach(r=>{const s=ctx.createBufferSource();s.buffer=ksBuf(ctx,m);s.playbackRate.value=r;s.connect(hp);s.start(tt);s.stop(tt+1.35);});}}
// 🎋 Ney — nefesli, vibratolu
function sNey(ctx,out,t,m,len,vol=.13){if(rNey(ctx,out,t,m,len,vol))return;const f=mf(m);const o=ctx.createOscillator();o.type='sine';o.frequency.setValueAtTime(f*.97,t);o.frequency.exponentialRampToValueAtTime(f,t+.12);
  const o2=ctx.createOscillator();o2.type='triangle';o2.frequency.value=f*2;const g2=ctx.createGain();g2.gain.value=.12;o2.connect(g2);
  const lfo=ctx.createOscillator();lfo.frequency.value=5;const lg=ctx.createGain();lg.gain.setValueAtTime(0,t);lg.gain.linearRampToValueAtTime(f*.007,t+len*.6);lfo.connect(lg);lg.connect(o.frequency);
  const ns=ctx.createBufferSource();ns.buffer=noise(ctx);ns.loop=true;const nf=ctx.createBiquadFilter();nf.type='bandpass';nf.frequency.value=f*2;nf.Q.value=2;const ng=ctx.createGain();ng.gain.value=.35;ns.connect(nf);nf.connect(ng);
  const g=ctx.createGain();g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(vol,t+.09);g.gain.setValueAtTime(vol,t+len*.7);g.gain.linearRampToValueAtTime(.0001,t+len);
  o.connect(g);g2.connect(g);ng.connect(g);g.connect(out);[o,o2,lfo,ns].forEach(x=>{x.start(t);x.stop(t+len+.05);});}
// 🎺 Zurna — genizden, keskin
function sZurna(ctx,out,t,m,len,vol=.07){if(rZurna(ctx,out,t,m,len,vol))return;const f=mf(m);const o=ctx.createOscillator();o.type='sawtooth';o.frequency.value=f;const o2=ctx.createOscillator();o2.type='square';o2.frequency.value=f*1.003;
  const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=1400;bp.Q.value=2.2;const pk=ctx.createBiquadFilter();pk.type='peaking';pk.frequency.value=3000;pk.gain.value=7;
  const lfo=ctx.createOscillator();lfo.frequency.value=6.5;const lg=ctx.createGain();lg.gain.value=f*.008;lfo.connect(lg);lg.connect(o.frequency);lg.connect(o2.frequency);
  const g=ctx.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.02);g.gain.setValueAtTime(vol,t+len*.8);g.gain.exponentialRampToValueAtTime(.0001,t+len);
  o.connect(bp);o2.connect(bp);bp.connect(pk);pk.connect(g);g.connect(out);[o,o2,lfo].forEach(x=>{x.start(t);x.stop(t+len+.05);});}
// 🥁 Darbuka (D=düm, T=tek, k=ka)
function sDarb(ctx,out,t,ty,v=1){if(rDarb(ctx,out,t,ty,v))return;if(ty==='S')ty='T';if(ty==='D'){tone(ctx,out,t,'sine',115,60,.5*v,.24,.06);nz(ctx,out,t,'lowpass',500,.7,.2*v,.08);}
  else if(ty==='T'){nz(ctx,out,t,'bandpass',3800,1,.32*v,.06);tone(ctx,out,t,'sine',720,520,.15*v,.04);}else nz(ctx,out,t,'bandpass',5200,1.2,.16*v,.035);}
// 🪘 Davul (B=tokmak, t=çubuk)
function sDavul(ctx,out,t,ty){if(rDavul(ctx,out,t,ty))return;if(ty==='B'){tone(ctx,out,t,'sine',78,44,.85,.45,.12);nz(ctx,out,t,'lowpass',260,.7,.3,.1);}else nz(ctx,out,t,'highpass',2600,.8,.24,.05);}
/* ═══ GERÇEK SAMPLE MOTORU ═══ */
const SMP={bag_sha:{},bag_sit:{},ney:{},zurna:{},davul:{},darb:{}},SMPK={};let smpReady=false,useSmp=true;
const CUSTOM={baglama:null,ney:null,zurna:null,didj:null,kopuz:null,def:null,hang:null};
function normBuf(b){let mx=0;for(let c=0;c<b.numberOfChannels;c++){const d=b.getChannelData(c);for(let i=0;i<d.length;i++){const a=Math.abs(d[i]);if(a>mx)mx=a;}}const k=.9/(mx||1);for(let c=0;c<b.numberOfChannels;c++){const d=b.getChannelData(c);for(let i=0;i<d.length;i++)d[i]*=k;}return b;}
let DEC=null;function decCtx(){if(!DEC)DEC=new (window.OfflineAudioContext||window.webkitOfflineAudioContext)(1,1,44100);return DEC;}
function decode(ab){return new Promise((res,rej)=>{const p=decCtx().decodeAudioData(ab,res,rej);if(p&&p.then)p.then(res,rej);});}
async function loadSamples(){const jobs=[];let n=0,tot=0;
  const add=(g,k,f)=>{tot++;jobs.push(fetch('samples/'+f).then(r=>{if(!r.ok)throw new Error(r.status);return r.arrayBuffer();}).then(decode).then(b=>{SMP[g][k]=normBuf(b);n++;$('smpInfo').textContent=`Gerçek sesler yükleniyor ${n}/${tot}`;}).catch(()=>{}));};
  for(let m=45;m<=87;m+=3){add('bag_sha',m,`bag_sha_${m}.mp3`);add('bag_sit',m,`bag_sit_${m}.mp3`);}
  for(let m=57;m<=90;m+=3)add('ney',m,`ney_${m}.mp3`);
  for(let m=54;m<=84;m+=3)add('zurna',m,`zurna_${m}.mp3`);
  [36,43].forEach(m=>add('davul',m,`davul_${m}.mp3`));['dum','tek','slap'].forEach(x=>add('darb',x,`darb_${x}.mp3`));
  await Promise.all(jobs);
  Object.keys(SMP).forEach(g=>SMPK[g]=Object.keys(SMP[g]).filter(k=>!isNaN(k)).map(Number).sort((a,b)=>a-b));
  smpReady=n>0;
  $('smpInfo').innerHTML=smpReady?`<span style="color:var(--g2)">✅ ${n}/${tot} gerçek kayıt yüklendi</span> · bağlama · ney · zurna · darbuka · davul`:'⚠ Kayıtlar yüklenemedi · synth sesler kullanılıyor';
  feed('SİSTEM',smpReady?`🎙 ${n} gerçek enstrüman kaydı hazır`:'⚠ Gerçek kayıtlar yüklenemedi, synth devrede');
  if(smpReady)setAg('rd','run','YENİ SES','Gerçek kayıtlar motora bağlandı',60);}
const hasS=g=>useSmp&&smpReady&&SMPK[g]&&SMPK[g].length>0;
function near(g,m){const ks=SMPK[g];let b=ks[0];for(const k of ks)if(Math.abs(k-m)<Math.abs(b-m))b=k;return b;}
function sp(ctx,out,buf,t,rate,vol,len,att,rel,o){
  const s=ctx.createBufferSource();s.buffer=buf;
  if(o&&o.scoop){s.playbackRate.setValueAtTime(rate*.985,t);s.playbackRate.linearRampToValueAtTime(rate,t+.1);}else s.playbackRate.setValueAtTime(rate,t);
  const end=Math.min(Math.max(att,len),buf.duration/rate);
  if(o&&o.vib){const l=ctx.createOscillator();l.frequency.value=o.vib;const lg=ctx.createGain();lg.gain.setValueAtTime(0,t);lg.gain.linearRampToValueAtTime(rate*o.depth,t+Math.min(end,.45));l.connect(lg);lg.connect(s.playbackRate);l.start(t);l.stop(t+end+rel+.05);}
  let node=s;if(o&&o.hp){const f=ctx.createBiquadFilter();f.type='highpass';f.frequency.value=o.hp;s.connect(f);node=f;}
  const g=ctx.createGain();g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(vol,t+att);g.gain.setValueAtTime(vol,t+end);g.gain.linearRampToValueAtTime(.0001,t+end+rel);
  node.connect(g);g.connect(out);s.start(t);s.stop(t+end+rel+.05);}
function custom(name,ctx,out,t,m,vol,len,att,rel,o){const c=CUSTOM[name];if(!c||!useSmp)return false;sp(ctx,out,c.buf,t,Math.pow(2,(m-c.root)/12),vol,len,att,rel,o);return true;}
function rBag(ctx,out,t,m,vol){
  if(custom('baglama',ctx,out,t,m,vol*1.1,1.4,.003,.25))return true;
  if(!hasS('bag_sha'))return false;const k=near('bag_sha',m),r=Math.pow(2,(m-k)/12);
  sp(ctx,out,SMP.bag_sha[k],t,r,vol*.95,1.3,.002,.3,{hp:140});
  if(SMP.bag_sit[k])sp(ctx,out,SMP.bag_sit[k],t,r*1.003,vol*.5,1.3,.002,.3,{hp:220});return true;}
function rNey(ctx,out,t,m,len,vol){const o={scoop:true,vib:5,depth:.004};
  if(custom('ney',ctx,out,t,m,vol*1.4,len,.07,.2,o))return true;
  if(!hasS('ney'))return false;const k=near('ney',m);sp(ctx,out,SMP.ney[k],t,Math.pow(2,(m-k)/12),vol*1.5,len,.07,.22,o);return true;}
function rZurna(ctx,out,t,m,len,vol){const o={vib:6.5,depth:.006};
  if(custom('zurna',ctx,out,t,m,vol*1.6,len,.02,.1,o))return true;
  if(!hasS('zurna'))return false;const k=near('zurna',m);sp(ctx,out,SMP.zurna[k],t,Math.pow(2,(m-k)/12),vol*1.7,len,.02,.12,o);return true;}
function rDarb(ctx,out,t,ty,v){if(!hasS('darb')||!SMP.darb.dum)return false;const D=SMP.darb;
  if(ty==='D')sp(ctx,out,D.dum,t,1,.75*v,D.dum.duration,.001,.05);
  else if(ty==='T')sp(ctx,out,D.tek,t,1,.55*v,D.tek.duration,.001,.05);
  else if(ty==='S')sp(ctx,out,D.slap,t,1,.6*v,D.slap.duration,.001,.05);
  else sp(ctx,out,D.tek,t,1.12,.28*v,D.tek.duration,.001,.05);return true;}
function rDavul(ctx,out,t,ty){if(!hasS('davul'))return false;
  if(ty==='B'){const k=near('davul',36);sp(ctx,out,SMP.davul[k],t,1,.9,1.2,.001,.2);}else if(SMP.darb.slap)sp(ctx,out,SMP.darb.slap,t,1.35,.32,.15,.001,.05,{hp:1500});else return false;return true;}
function toggleSmp(){useSmp=!useSmp;$('smpSw').classList.toggle('on',useSmp);feed('BEYİN',useSmp?'🎙 Gerçek kayıtlar devrede':'🎛 Synth seslere geçildi (karşılaştırma)');}
const NN=['Do','Do#','Re','Mib','Mi','Fa','Fa#','Sol','Sol#','La','Sib','Si'];
$('cuRoot').innerHTML=Array.from({length:37},(_,i)=>i+45).map(m=>`<option value="${m}" ${m===57?'selected':''}>${NN[m%12]}${Math.floor(m/12)-1} (${m})</option>`).join('');
async function loadCustom(inp){const f=inp.files[0];if(!f)return;const name=$('cuInst').value,root=+$('cuRoot').value;
  try{const b=normBuf(await decode(await f.arrayBuffer()));CUSTOM[name]={buf:b,root};
    $('cuInfo').innerHTML=`<span style="color:var(--g2)">✅ ${INST_N[name]}: "${f.name}" (${b.duration.toFixed(1)} sn, kök ${NN[root%12]}${Math.floor(root/12)-1}) motorda</span>`;
    feed('BEYİN',`🎙 Kendi ${INST_N[name]} kaydın yüklendi · artık o çalıyor`);
    if(AC){const t=AC.currentTime+.05;playInst(AC,bus,name,t,root,.8,.12);}}
  catch(e){$('cuInfo').textContent='⚠ Dosya çözülemedi: '+e.message;}inp.value='';}

// 🪵 Didgeridoo — dudak titreşimi + ağız formantları + döngüsel nefes
function sDidj(ctx,out,t,m,len,vol=.2,sd=.12){if(custom('didj',ctx,out,t,m,vol*2.5,len,.06,.3))return;const f=mf(m);
  const o=ctx.createOscillator();o.type='sawtooth';o.frequency.setValueAtTime(f,t);const o2=ctx.createOscillator();o2.type='square';o2.frequency.value=f*1.005;const g2=ctx.createGain();g2.gain.value=.5;o2.connect(g2);
  const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1400;o.connect(lp);g2.connect(lp);
  const mix=ctx.createGain();mix.gain.value=.5;lp.connect(mix);
  [[320,4,180],[1100,6,420],[2300,8,500]].forEach(([fr,q,dep],i)=>{const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=fr;bp.Q.value=q;
    const l=ctx.createOscillator();l.frequency.value=(1/(sd*8))*(i+1)/2;const lg=ctx.createGain();lg.gain.value=dep;l.connect(lg);lg.connect(bp.frequency);
    const bg=ctx.createGain();bg.gain.value=i?.9:1.4;lp.connect(bp);bp.connect(bg);bg.connect(mix);l.start(t);l.stop(t+len+.4);});
  const pump=ctx.createGain();pump.gain.value=1;const pl=ctx.createOscillator();pl.type='sine';pl.frequency.value=1/(sd*4);const pg=ctx.createGain();pg.gain.value=.35;pl.connect(pg);pg.connect(pump.gain);
  const g=ctx.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.12);g.gain.setValueAtTime(vol,t+len*.85);g.gain.exponentialRampToValueAtTime(.0001,t+len+.3);
  mix.connect(pump);pump.connect(g);g.connect(out);[o,o2,pl].forEach(x=>{x.start(t);x.stop(t+len+.4);});
  // "toot" — üst ses vurgusu
  tone(ctx,out,t+sd*8,'sawtooth',f*2.6,f*2.4,vol*.25,.25,.2);}
// 〰 Ağız kopuzu — sabit kök ses, melodi ağız boşluğuyla seçilen harmoniklerden
let kopRoot=38;
function sKopuz(ctx,out,t,m,vol=.2){if(custom('kopuz',ctx,out,t,m,vol*2,.7,.002,.3))return;const f=mf(kopRoot);
  const o=ctx.createOscillator();o.type='sawtooth';o.frequency.value=f;const o2=ctx.createOscillator();o2.type='square';o2.frequency.value=f;const g2=ctx.createGain();g2.gain.value=.6;o2.connect(g2);
  let h=Math.max(4,Math.round(mf(m)/f));const hf=f*h;
  const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.Q.value=22;bp.frequency.setValueAtTime(hf*.55,t);bp.frequency.exponentialRampToValueAtTime(hf,t+.06);bp.frequency.setTargetAtTime(hf*.97,t+.2,.2);
  const bp2=ctx.createBiquadFilter();bp2.type='bandpass';bp2.Q.value=10;bp2.frequency.value=hf*2;const b2g=ctx.createGain();b2g.gain.value=.3;
  const lo=ctx.createBiquadFilter();lo.type='lowpass';lo.frequency.value=f*3;const log=ctx.createGain();log.gain.value=.25;
  const g=ctx.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.003);g.gain.exponentialRampToValueAtTime(vol*.3,t+.12);g.gain.exponentialRampToValueAtTime(.0001,t+.75);
  [o,g2].forEach(x=>{x.connect(bp);x.connect(bp2);x.connect(lo);});bp.connect(g);bp2.connect(b2g);b2g.connect(g);lo.connect(log);log.connect(g);g.connect(out);
  [o,o2].forEach(x=>{x.start(t);x.stop(t+.8);});nz(ctx,out,t,'highpass',3000,1,vol*.25,.012);}
// ⭕ Şaman defi — derin çerçeve davul (O=gümbür, r=kenar)
function sDef(ctx,out,t,ty,v=1){
  if(ty==='O'){if(CUSTOM.def&&useSmp){sp(ctx,out,CUSTOM.def.buf,t,1,.9*v,CUSTOM.def.buf.duration,.001,.1);return;}
    if(hasS('davul')){sp(ctx,out,SMP.davul[near('davul',36)],t,.7,.42*v,.9,.001,.25);}else tone(ctx,out,t,'sine',72,46,.42*v,.8,.25);
    tone(ctx,out,t,'sine',58,42,.18*v,.7,.3);nz(ctx,out,t,'bandpass',800,1.2,.12*v,.05);}
  else{nz(ctx,out,t,'bandpass',1900,1.5,.22*v,.09);tone(ctx,out,t,'sine',190,150,.15*v,.12);}}
// 🌫 Reverb (hang için) — üretilmiş oda yankısı
const RV=new WeakMap();
function rev(ctx,out){let r=RV.get(ctx);if(r)return r;const inp=ctx.createGain();inp.gain.value=.3;const mix=ctx.createGain();mix.gain.value=.55;mix.connect(out);
  [.0297,.0371,.0411,.0437].forEach(d=>{const dl=ctx.createDelay(1);dl.delayTime.value=d*2.3;const fb=ctx.createGain();fb.gain.value=.74;const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=3200;inp.connect(dl);dl.connect(lp);lp.connect(fb);fb.connect(dl);lp.connect(mix);});
  RV.set(ctx,inp);return inp;}
// 🛸 Hang drum — çelik ton alanı: temel + oktav + bileşik beşli, eliyle vuruş
function sHang(ctx,out,t,m,vol=.16){
  const g=ctx.createGain();g.gain.value=1;g.connect(out);try{g.connect(rev(ctx,out));}catch(e){}
  if(CUSTOM.hang&&useSmp){sp(ctx,g,CUSTOM.hang.buf,t,Math.pow(2,(m-CUSTOM.hang.root)/12),vol*2.2,2.6,.003,.6);return;}
  const f=mf(m);[[1,1,2.8],[1.0035,.35,2.8],[2,.42,1.7],[3.01,.2,1.0],[4.02,.07,.5]].forEach(([r,a,d])=>{
    const o=ctx.createOscillator();o.type='sine';o.frequency.value=f*r;const e=ctx.createGain();e.gain.setValueAtTime(.0001,t);e.gain.exponentialRampToValueAtTime(vol*a,t+.006);e.gain.exponentialRampToValueAtTime(.0001,t+d);
    o.connect(e);e.connect(g);o.start(t);o.stop(t+d+.05);});
  nz(ctx,g,t,'lowpass',1400,.7,vol*.35,.03);}
const HANG={afunk:'b',dh:'ibg',neset:'ibg',saman:'ibg',semah:'b',psy:'b',arock:'b'};
const HPAT=[0,0,0,1,0,0,1,0,1,0,1,0,0,1,0,0];const HSEQ=[0,3,4,2,5,4,1,3,6,4,2,5];

const percFn=pn=>pn==='davul'?sDavul:pn==='def'?sDef:sDarb;

function playInst(ctx,out,name,t,m,len,sd,vol=1){
  if(name==='hang'&&INST.hang)return sHang(ctx,out,t,m,.16*vol);
  if(name==='kopuz'&&INST.kopuz)return sKopuz(ctx,out,t,m,.2*vol);
  if(name==='didj'&&INST.didj)return sDidj(ctx,out,t,kopRoot,len,.2*vol,sd);
  if(name==='baglama'&&INST.baglama)return sBag(ctx,out,t,m,.3*vol,len>sd*3,sd);
  if(name==='ney'&&INST.ney)return sNey(ctx,out,t,m,Math.max(len*1.3,sd*3),.13*vol);
  if(name==='zurna'&&INST.zurna)return sZurna(ctx,out,t,m,Math.max(len,sd*1.5),.07*vol);
  sLead(ctx,out,t,m,'sawtooth',Math.max(len,sd*1.2),.1*vol);
}
const TAKSIM=[0,1,2,3,2,1,2,4,3,2,1,0,1,2,4,5,4,3,2,1,0];

/* ═══ HER 16'LIK ADIM ═══ */
/* ═══ VARYASYON MOTORU: her döngüde yeni melodi cümlesi, ritim ve ton — DJ asla aynı çalmaz ═══ */
let vseed=0;let VC={},VCn=0;
const LBANK=[[1,0,1,1,0,1,0,1,1,0,1,0,0,1,1,0],[1,0,0,1,0,0,1,0,0,0,1,0,1,0,0,0],[1,0,1,0,1,0,0,1,0,1,0,0,1,0,1,0],[1,1,0,1,0,0,1,0,1,1,0,0,1,0,0,1],[0,0,1,0,1,0,1,0,0,0,1,0,1,0,1,1],[1,0,0,0,1,0,1,1,0,0,1,0,0,1,0,0],[1,0,1,0,0,0,1,0,1,0,1,0,0,0,1,0],[0,1,0,1,1,0,0,1,0,1,0,1,1,0,0,0]];
function variant(key,cyc,sec){const id=key+'|'+cyc+'|'+sec;if(VC[id])return VC[id];if(++VCn>800){VC={};VCn=0;}
  const g=G[key],n=g.sc.length,h=k=>hsh(vseed*7919+cyc*1301+k*17+key.charCodeAt(0)*31+(sec==='drop2'?7777:0));
  if(h(0)<.2)return VC[id]={mel:g.mel.map(x=>x%n),l:g.l,tr:0};   // ara sıra türün imza melodisine döner
  const A=[];let p=Math.floor(h(1)*n);for(let i=0;i<8;i++){p=Math.max(0,Math.min(n-1,p+Math.round((h(10+i)-.5)*4)));A.push(p);}
  const B=A.map((x,i)=>i>=4?Math.max(0,Math.min(n-1,x+Math.round((h(30+i)-.5)*5))):x);
  const C=A.map((x,i)=>i<4?x:Math.max(0,Math.min(n-1,A[0]+(i-4))));
  const mel=h(6)<.5?[...A,...B]:[...A,...B,...A,...C];
  const l=h(2)<.3?g.l:LBANK[Math.floor(h(3)*LBANK.length)];
  return VC[id]={mel,l,tr:[0,0,0,1,2,-1][Math.floor(h(4)*6)]};}
function playStep(ctx,out,key,i,as,info,t,sd){
  if(G[key].sifa){sifaLayer(ctx,out,key,as,info,t,sd);return;}
  const g=G[key],s=as%16,S=info.id,bar=info.cb;
  const full=S==='drop'||S==='drop2'||S==='klasik'||S==='groove';
  const build=S==='build'||S==='build2'||S==='trans';
  const brk=S==='break'||(S==='trans'&&info.bar<2);
  const intro=S==='intro';
  const last=build&&info.bar===info.len-1;
  // KICK
  const kOn=(full&&!(info.bar===info.len-1&&s>=12&&info.len>8))||(build&&!last&&S!=='trans')||(S==='trans'&&info.bar>=2&&!last)||(intro&&info.bar>=4);
  if(kOn&&g.k[s])sKick(ctx,out,t);
  // HAT — drop'un 2. yarısında açık hat eklenir
  if(!brk&&g.h[s]&&!(intro&&info.bar<2))sHat(ctx,out,t,g.ho||(full&&info.bar>=8&&s%4===2));
  if(full&&info.bar>=8&&s%2===1&&!g.h[s])sHat(ctx,out,t,false);
  // CLAP + trampet rulosu (yükselişin son barı)
  if((full||build)&&!last&&g.cl&&g.cl[s])sClap(ctx,out,t);
  if(last&&(s<8?s%2===0:true))sClap(ctx,out,t,.12+s/16*.45);
  // BAS
  let bn=g.bn[bar%g.bn.length];if(S==='klasik'&&info.motif)bn=info.motif.root+(info.bar%4===3?7:0);
  if((full||build&&!last||(intro&&info.bar>=4))&&g.b[s])sBass(ctx,out,t,bn,g.cut,sd*.9);
  // ANADOLU PERKÜSYON
  const pn=g.perc,pv=g.dp[s];
  if(INST[pn]&&pv&&!(intro&&info.bar<2)){
    if(brk){if(pv==='D'||pv==='B'||pv==='O')percFn(pn)(ctx,out,t,pv,.7);}
    else percFn(pn)(ctx,out,t,pv);}
  if(full&&info.bar%8===7&&s>=12&&INST.darbuka)sDarb(ctx,out,t,s===15?'D':s===13?'S':'T',.8); // darbuka fill
  // MELODİ — her turda kayarak değişir
  const V=variant(key,info.cyc,info.base||S),L=V.l;
  const mi=i+Math.floor(info.cb/16)*2,nn=g.sc.length;
  const note=g.sc[((V.mel[mi%V.mel.length]+V.tr)%nn+nn)%nn]+g.oct;
  if((S==='klasik'||(S==='build2'&&info.motif))&&info.motif){
    const ev=info.motif.on[(as-info.secStart)%64];
    if(ev){const v=S==='build2'?.5:1;playInst(ctx,out,g.ki,t,ev.m,ev.len*sd,sd,v);if(S==='klasik')sLead(ctx,out,t,ev.m-12,'triangle',ev.len*sd,.06);}
  } else if(full||(build&&info.bar>=2)){
    if(L[s]&&(bar%4!==3||s<8)){
      if(g.synth||!INST[g.ai])sLead(ctx,out,t,note,g.wave,sd*g.ll,build?.07:.11);
      if(INST[g.ai]&&(full||!g.synth)){if(g.ai==='zurna'){if(bar%2===1)playInst(ctx,out,'zurna',t,note,sd*2,sd);}
        else if(g.ai==='ney'){if(s%4===0)playInst(ctx,out,'ney',t,note,sd*4,sd);}else playInst(ctx,out,g.ai,t,note,sd*g.ll,sd,g.synth?.6:1);}
    }
  }
  // TAKSİM — break'te ney/bağlama solo
  if(S==='break'){const tk=Math.floor(as/4);if(s%4===0||(g.brk==='baglama'&&s%4===2&&tk%3===0)){const idx=TAKSIM[tk%TAKSIM.length];playInst(ctx,out,g.brk,t,g.sc[idx%g.sc.length]+12,sd*(g.brk==='ney'?4:2),sd);}}
  // GROOVE — Anadolu enstrümanı tek başına melodi
  if(S==='groove'&&L[s]&&info.bar>=2&&INST[g.ai])playInst(ctx,out,g.ai,t,note,sd*2,sd,.8);
  // 🪵 DİDGERİDOO — şamanik zemin
  const dj=DIDJ[key];if(INST.didj&&dj&&s===0&&bar%2===0){kopRoot=g.bn[0]%12+36;
    if(dj==='all'&&!last||(dj==='ib'&&(intro||brk||S==='groove'))||(dj==='b'&&brk))sDidj(ctx,out,t,kopRoot,sd*32,key==='saman'?.085:.06,sd);}
  // 〰 KOPUZ — semah/neşet groove'unda ritmik, şamanda melodik
  if(INST.kopuz&&(key==='semah'||key==='neset')&&(S==='groove'||S==='break')&&s%4===2){kopRoot=g.bn[0]%12+36;sKopuz(ctx,out,t,note,.14);}
  // 🛸 HANG — taksimde, intro'da ve groove'da yumuşak arpej (dum = kök ses)
  const hm=HANG[key];if(INST.hang&&hm&&HPAT[s]&&((hm.includes('b')&&S==='break')||(hm.includes('i')&&intro&&info.bar>=2)||(hm.includes('g')&&S==='groove'))){
    const hi=HSEQ[(Math.floor(as/16)*5+s)%HSEQ.length]%g.sc.length;sHang(ctx,out,t,s===0?g.sc[0]-12+(g.oct?12:0):g.sc[hi]+(g.oct?0:0),S==='break'?.15:.11);}
  if(INST.hang&&hm&&s===0&&(S==='break'||S==='groove'||intro&&info.bar>=2))sHang(ctx,out,t,g.sc[0]-12+(g.oct?0:0),.13);
  // ⭕ ŞAMAN DEFİ — her açılışta kalp atışı, taksimde nabız
  if(INST.def&&key!=='saman'&&((intro&&info.bar<4&&(s===0||s===3))||(S==='break'&&s===0&&info.bar%2===0)))sDef(ctx,out,t,'O',intro?.9:.6);
  // DRONE + PAD
  if((intro||S==='groove')&&s===0&&INST.baglama)sBag(ctx,out,t,g.bn[0]+24,.18);
  if(s===0&&bar%2===0&&(g.pad||brk))sPad(ctx,out,t,bn+24,sd*32,brk?.06:.04);
  // 🕺 70'ler funk katmanı
  funkLayer(ctx,out,key,as,info,t,sd,note,bn);
  // 🗣 ŞAMAN SESİ
  vocals(ctx,out,key,as,info,t,sd);
}


/* ═══ 70'LER: fuzz-wah gitar + Hammond org (Anadolu Funk) ═══ */
function sWah(ctx,out,t,m,len,vol=.07){const f=mf(m),o=ctx.createOscillator();o.type='sawtooth';o.frequency.value=f;const o2=ctx.createOscillator();o2.type='square';o2.frequency.value=f*1.004;
  const sh=ctx.createWaveShaper();const cv=new Float32Array(256);for(let i=0;i<256;i++){const x=i/128-1;cv[i]=Math.tanh(x*4);}sh.curve=cv;
  const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.Q.value=6;bp.frequency.setValueAtTime(450,t);bp.frequency.exponentialRampToValueAtTime(2200,t+Math.min(.12,len*.5));bp.frequency.exponentialRampToValueAtTime(600,t+len);
  const g=ctx.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.008);g.gain.exponentialRampToValueAtTime(.001,t+len);
  o.connect(sh);o2.connect(sh);sh.connect(bp);bp.connect(g);g.connect(out);o.start(t);o2.start(t);o.stop(t+len+.02);o2.stop(t+len+.02);}
function sOrgan(ctx,out,t,m,len,vol=.035){const g=ctx.createGain();g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(vol,t+.02);g.gain.setValueAtTime(vol,t+len*.85);g.gain.linearRampToValueAtTime(.0001,t+len);
  const trem=ctx.createOscillator(),tg=ctx.createGain();trem.frequency.value=6.2;tg.gain.value=vol*.35;trem.connect(tg);tg.connect(g.gain);trem.start(t);trem.stop(t+len+.05);
  [[0,1],[7,.5],[12,.8],[19,.3],[24,.25]].forEach(([iv,a])=>[0,4,7].forEach(ch=>{const o=ctx.createOscillator();o.type='sine';o.frequency.value=mf(m+iv+ch);const og=ctx.createGain();og.gain.value=a*.33;o.connect(og);og.connect(g);o.start(t);o.stop(t+len+.05);}));g.connect(out);}
function funkLayer(ctx,out,key,as,info,t,sd,note,bn){const g=G[key];if(!g.funk)return;const S=info.id,s=as%16;
  const full=S==='drop'||S==='drop2'||S==='groove'||S==='klasik',build=S==='build'||S==='build2';
  // fuzz-wah gitar riffi (Erkin Koray / Cem Karaca havası)
  if((full||build&&info.bar>=2)&&[0,3,6,10,12].includes(s))sWah(ctx,out,t,note-12,sd*(s===12?3:1.6),build?.05:.075);
  // org akorları: her bar başı, taksimde uzun
  if(s===0&&(full||S==='break'||S==='intro'&&info.bar>=2))sOrgan(ctx,out,t,bn+24,sd*(S==='break'?16:8),S==='break'?.045:.03);
  // disko açık hat (her 8'lik arkası)
  if(full&&s%4===2)sHat(ctx,out,t,true);}

/* ═══ ŞİFA MODU: 528 Hz, doğa sesleri, kuşlar, su — ritimsiz, meditatif ═══ */
let calm=false;
const SIFA_R=69+12*Math.log2(528/440); // 528 Hz kök (MIDI ~72.16)
const SIFA_SC=[0,2,4,7,9,12,14,16].map(x=>SIFA_R-12+x);
function sinePad(ctx,out,t,f,len,vol){const g=ctx.createGain();g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(vol,t+len*.35);g.gain.setValueAtTime(vol,t+len*.65);g.gain.linearRampToValueAtTime(.0001,t+len);
  [[1,1],[2,.18],[.5,.5]].forEach(([r,a])=>{const o=ctx.createOscillator();o.type='sine';o.frequency.value=f*r;const og=ctx.createGain();og.gain.value=a;o.connect(og);og.connect(g);o.start(t);o.stop(t+len+.05);});
  const lfo=ctx.createOscillator(),lg=ctx.createGain();lfo.frequency.value=.07;lg.gain.value=vol*.25;lfo.connect(lg);lg.connect(g.gain);lfo.start(t);lfo.stop(t+len+.05);g.connect(out);}
function sBowl(ctx,out,t,f,vol=.08){[[1,1,9],[2.76,.45,5],[5.4,.22,3],[8.9,.1,1.6]].forEach(([r,a,d])=>{const o=ctx.createOscillator();o.type='sine';o.frequency.value=f*r;const o2=ctx.createOscillator();o2.type='sine';o2.frequency.value=f*r*1.003;
  const g=ctx.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol*a,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);o2.connect(g);g.connect(out);o.start(t);o2.start(t);o.stop(t+d+.05);o2.stop(t+d+.05);});}
function sBird(ctx,out,t,kind,vol=.035){const n=kind===0?3:kind===1?5:2;for(let k=0;k<n;k++){const st=t+k*(kind===1?.09:.16),o=ctx.createOscillator();o.type='sine';const f0=2600+hsh(Math.floor(t*100)+k)*1800;
  if(kind===2){o.frequency.setValueAtTime(f0*.7,st);o.frequency.exponentialRampToValueAtTime(f0*1.3,st+.25);}else{o.frequency.setValueAtTime(f0,st);o.frequency.exponentialRampToValueAtTime(f0*(kind?1.5:.65),st+.06);}
  const g=ctx.createGain(),d=kind===2?.3:.07;g.gain.setValueAtTime(.0001,st);g.gain.exponentialRampToValueAtTime(vol,st+.01);g.gain.exponentialRampToValueAtTime(.0001,st+d);o.connect(g);g.connect(out);o.start(st);o.stop(st+d+.02);}}
function sWater(ctx,out,t,len,vol=.05){const s=ctx.createBufferSource();s.buffer=noise(ctx);s.loop=true;s.playbackRate.value=.9;const f=ctx.createBiquadFilter();f.type='bandpass';f.Q.value=.8;f.frequency.value=900;
  const lfo=ctx.createOscillator(),lg=ctx.createGain();lfo.frequency.value=.23;lg.gain.value=500;lfo.connect(lg);lg.connect(f.frequency);const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=3500;
  const g=ctx.createGain();g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(vol,t+3);g.gain.setValueAtTime(vol,t+len-3);g.gain.linearRampToValueAtTime(.0001,t+len);s.connect(f);f.connect(lp);lp.connect(g);g.connect(out);s.start(t);s.stop(t+len+.1);lfo.start(t);lfo.stop(t+len+.1);}
function sifaLayer(ctx,out,key,as,info,t,sd){const s=as%16,bar=Math.floor(as/16),h=k=>hsh(vseed*131+bar*977+k);
  const F=info.freq||528,R=69+12*Math.log2(F/440)+(F<300?12:0),SC=[0,2,4,7,9,12,14,16].map(x=>R-12+x);
  const bd=sd*16;
  if(s===0&&bar%8===0){sinePad(ctx,out,t,F,bd*9,F<300?.06:.05);sinePad(ctx,out,t,F/2,bd*9,.035);sWater(ctx,out,t,bd*9,.035);}
  if(s===0&&bar%8===4)sinePad(ctx,out,t,F*1.5,bd*9,.02);
  if(s===0&&bar%4===2&&h(1)<.7)sBowl(ctx,out,t,h(2)<.6?F:F/2,.06);
  // kuşlar
  for(let k=0;k<2;k++)if(h(20+s*3+k)<.045)sBird(ctx,out,t+h(40+s)*sd,Math.floor(h(30+s+k)*3),.025+h(50)*.02);}

/* ═══ BAR BAŞI: filtre, riser, crash ═══ */
function autoBar(ctx,post,filt,info,t,bd,maxC){if(calm){filt.frequency.setTargetAtTime(maxC,t,1);return;}const S=info.id;let tg=maxC;
  if(S==='intro')tg=Math.min(maxC,700+info.bar*350);
  else if(S==='build'||S==='build2'||S==='trans'){tg=Math.min(maxC,600*Math.pow(maxC/600,(info.bar+1)/info.len));}
  else if(S==='break')tg=Math.min(maxC,2600);
  filt.frequency.setTargetAtTime(tg,t,(S==='drop'||S==='klasik'||S==='drop2')&&info.bar===0?.01:bd/3);
  if((S==='build'||S==='build2'||S==='trans')&&(info.bar===0||info.jump))sRiser(ctx,post,t,(info.len-info.bar)*bd);
  if((S==='drop'||S==='drop2'||S==='klasik'||S==='groove')&&info.bar===0)sCrash(ctx,post,t);
}

/* ═══ ANİME: SİSTEM — 60 dk'lık hikâye ═══ */
let animeOn=true;
const SCN_A={intro:['a_wake','a_home'],groove:['a_home','a_pay','a_commute'],build:['a_commute','a_screen','a_work'],build2:['a_screen','a_commute','a_work'],
  drop:['a_work','a_commute','a_screen','a_pay'],drop2:['a_commute','a_work','a_screen','a_pay'],klasik:['a_dance'],break:['a_dream'],trans:['a_screen']};
const AYLAR=['OCAK','ŞUBAT','MART','NİSAN','MAYIS','HAZİRAN','TEMMUZ','AĞUSTOS','EYLÜL','EKİM','KASIM','ARALIK'];
const HEAD=['SON DAKİKA: HER ŞEY YOLUNDA','TÜKETMEK MUTLULUKTUR','BİR KREDİ DAHA ÇEK','DÜŞÜNME, KAYDIR','ÇOK ÇALIŞAN KAZANIR (YAKINDA)','İNDİRİM! İNDİRİM! İNDİRİM!','SORU SORMA, İZLE','BORÇ ÖZGÜRLÜKTÜR','MUTLU OLMAK ZORUNDASIN'];
const CAP={a_wake:['06:00. Yine.','Alarm değil, zincir.','Bugün de dünün aynısı.'],a_commute:['Herkes aynı yöne.','Kimse başını kaldırmıyor.','Ekran ne derse o.'],
  a_work:['Ay sonuna kadar dayan.','Saat ilerlemiyor.','Biraz daha çalış, sonra yaşarsın.'],a_pay:['Maaş yattı.','Maaş gitti.','Kira, fatura, kredi... sıfır.'],
  a_screen:['Gerçek bu mu?','Haberler: her şey yolunda.','Göz hep açık.'],a_home:['Eve dön. Uyu. Tekrarla.','Yeni ay. Aynı borç.'],
  a_dream:['Bir an dur.','Dinle...','Yıldızlar hâlâ orada.','Bu ritim senin kalbin.'],a_dance:['Herkes aynı adımı atıyor.','Müzik değişince adım da değişir.'],a_free:['Uyandık.','Zincir koptu.','Dön. Dans et. Yaşa.']};
let animeDur=3600;
const anP=at=>Math.max(0,Math.min(1,at/animeDur));
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
function sky(c,a,b){const gr=c.createLinearGradient(0,0,0,720);gr.addColorStop(0,a);gr.addColorStop(1,b);c.fillStyle=gr;c.fillRect(0,0,1280,720);}
function skyline(c,seed,base,hgt,col,off,win,lit){let i=Math.floor(off/150),x=-(off%150)-150;
  while(x<1440){const w=60+hsh(seed+i)*90,h=hgt*(.4+hsh(seed+i*3+1)*.6);c.fillStyle=col;c.fillRect(x,base-h,w,h);
    if(win)for(let yy=base-h+12;yy<base-12;yy+=18)for(let xx=8;xx<w-10;xx+=14)if(hsh(seed+i*131+yy*7+xx)<lit){c.fillStyle=win;c.fillRect(x+xx,yy,7,9);}
    x+=w+6;i++;}}
function robot(c,x,y,s,ph,aw,g,o={}){c.save();c.translate(x,y);c.scale(s,s);const body=aw?g.c:'#8a93a6',dark=aw?'#1f2937':'#4b5563',leg=o.walk?Math.sin(ph)*10:0;
  c.lineWidth=3;c.strokeStyle='#111827';c.fillStyle=dark;c.fillRect(-14+leg*.5,40,10,34);c.fillRect(4-leg*.5,40,10,34);
  c.fillStyle=body;rr(c,-24,-10,48,54,10);c.fill();c.stroke();
  const arm=o.arm!=null?o.arm:(o.walk?Math.sin(ph+Math.PI)*12:0);c.fillStyle=dark;
  c.save();c.translate(-26,0);c.rotate(arm*.03+(o.up?2.5:0));c.fillRect(-6,0,10,36);c.restore();
  c.save();c.translate(26,0);c.rotate(-arm*.03-(o.up?2.5:0));c.fillRect(-4,0,10,36);c.restore();
  c.fillStyle=body;rr(c,-26,-58,52,44,14);c.fill();c.stroke();c.fillStyle=o.visor||'#0b1020';rr(c,-20,-50,40,26,9);c.fill();
  if(o.visor){c.fillStyle='#fff';for(let k=0;k<6;k++){c.globalAlpha=.6;c.fillRect(-16+hsh(k*7)*32,-46+hsh(k*3)*18,2,2);}c.globalAlpha=1;}
  if(aw){c.strokeStyle='#fff';c.lineWidth=3;[-9,9].forEach(ex=>{c.beginPath();c.arc(ex,o.eyesUp?-38:-33,6,Math.PI,0);c.stroke();});}
  else{c.fillStyle='#9ca3af';const ey=o.eyesUp?-42:-31;[-9,9].forEach(ex=>{c.beginPath();c.ellipse(ex,ey,5,o.blink?1:5,0,0,7);c.fill();});}
  c.strokeStyle='#111827';c.lineWidth=3;c.beginPath();c.moveTo(0,-58);c.lineTo(0,-72);c.stroke();c.fillStyle=aw?'#fde68a':'#ef4444';c.beginPath();c.arc(0,-75,4,0,7);c.fill();
  if(o.heart){c.globalAlpha=Math.min(1,o.heart);c.fillStyle=g.c;c.shadowColor=g.c;c.shadowBlur=20;c.beginPath();c.arc(0,16,7+o.heart*4,0,7);c.fill();c.shadowBlur=0;c.globalAlpha=1;}
  c.restore();}
function speed(c,at,bass){c.save();c.translate(640,360);c.strokeStyle='#fff';for(let i=0;i<40;i++){const a=hsh(i+Math.floor(at*24)*41)*Math.PI*2,r1=260+hsh(i*5)*200;c.globalAlpha=.08+bass*.25;c.lineWidth=2+hsh(i)*4;c.beginPath();c.moveTo(Math.cos(a)*r1,Math.sin(a)*r1);c.lineTo(Math.cos(a)*900,Math.sin(a)*900);c.stroke();}c.restore();c.globalAlpha=1;}
function subtitle(c,txt,lt){const a=lt<.3?lt/.3:lt>2.8?Math.max(0,(3.2-lt)/.4):1;c.globalAlpha=a;c.font='700 30px "Segoe UI",Arial,sans-serif';c.textAlign='center';c.lineWidth=6;c.strokeStyle='#000';c.strokeText(txt,640,690);c.fillStyle='#fff';c.fillText(txt,640,690);c.globalAlpha=1;}
function animeScene(c,name,at,lt,fd,g,e,bass){const W=1280,H=720,p=anP(at),beat=60/Math.max(60,G[e.key].bpm),bp=(at%beat)/beat,bar=Math.floor(at/(beat*4)),cyc=256*beat,mi=Math.floor(at/cyc),day=1+Math.floor((at%cyc)/cyc*30);
  let n=name;if(p>.9&&/a_work|a_commute|a_screen|a_pay/.test(n))n='a_free';
  const AW=i=>hsh(i+mi*17)<p*.92;
  c.save();
  if(n==='a_wake'){sky(c,'#3b4252','#1f2430');c.fillStyle='#0f172a';c.fillRect(760,100,390,280);c.save();c.beginPath();c.rect(772,112,366,256);c.clip();sky(c,'#f59e0b','#6b7280');skyline(c,5,368,200,'#374151',at*6,'#fde68a',.3);c.restore();
    c.fillStyle='#111827';c.fillRect(0,560,W,160);c.fillStyle='#4b5563';c.fillRect(110,470,540,92);c.fillStyle='#9ca3af';c.fillRect(110,438,190,40);
    robot(c,340,415,1.45,0,AW(1),g,{blink:bp<.12});const sh=Math.sin(at*60)*(3+bass*12);c.save();c.translate(720+sh,480);c.fillStyle='#ef4444';c.beginPath();c.arc(0,0,42,0,7);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(0,0,31,0,7);c.fill();c.fillStyle='#111';c.font='bold 18px Consolas';c.textAlign='center';c.fillText('06:00',0,6);
    c.strokeStyle='#fbbf24';c.lineWidth=3;for(let k=0;k<3;k++){const r=54+k*14+bp*10;c.beginPath();c.arc(0,0,r,-.6,.6);c.stroke();c.beginPath();c.arc(0,0,r,Math.PI-.6,Math.PI+.6);c.stroke();}c.restore();}
  else if(n==='a_commute'||n==='a_home'){const night=n==='a_home',dir=night?-1:1,sp=e.id.startsWith('build')?70+((at-e.t)/Math.max(1,e.end-e.t))*280:/drop/.test(e.id)?240:90;
    if(night){sky(c,'#0b1026','#1e1b4b');c.fillStyle='#fef9c3';c.beginPath();c.arc(1080,110,46,0,7);c.fill();c.fillStyle='#1e1b4b';c.beginPath();c.arc(1100,98,42,0,7);c.fill();}else sky(c,'#9ca3af','#4b5563');
    skyline(c,11,440,330,night?'#111827':'#6b7280',at*sp*.18*dir+5000,night?'#fde68a':'#e5e7eb',night?.35:.12);skyline(c,23,480,230,night?'#020617':'#4b5563',at*sp*.45*dir+5000,night?'#fbbf24':'#fef3c7',.22);
    if(!night){c.fillStyle='#111';c.fillRect(370,52,540,112);c.strokeStyle='#374151';c.lineWidth=6;c.strokeRect(370,52,540,112);c.fillStyle=bp<.5?'#ef4444':'#b91c1c';c.font='900 30px Consolas';c.textAlign='center';c.fillText(HEAD[bar%HEAD.length],640,118);}
    else for(let k=0;k<5;k++){const lx=((k*300-at*sp*.45*dir)%1500+1500)%1500-100;c.fillStyle='#374151';c.fillRect(lx,330,8,230);c.fillStyle='#fde68a';c.globalAlpha=.25;c.beginPath();c.moveTo(lx+4,330);c.lineTo(lx-70,560);c.lineTo(lx+78,560);c.fill();c.globalAlpha=1;}
    c.fillStyle='#1f2937';c.fillRect(0,560,W,160);c.strokeStyle='#374151';c.lineWidth=2;for(let x=-((at*sp*dir)%60+60);x<W+60;x+=60){c.beginPath();c.moveTo(x,560);c.lineTo(x+30,720);c.stroke();}
    for(let i=0;i<9;i++){const x=dir>0?((i*150-at*sp*.3)%1350+1350)%1350-80:((i*150+at*sp*.3)%1350+1350)%1350-80;robot(c,x,478+(i%2)*14,.95,at*9*dir+i,AW(i),g,{walk:true,eyesUp:AW(i)});}
    if(night&&lt<1.2){const f=lt/1.2;c.save();c.translate(160,150);c.scale(1,f<.5?1-f*2:f*2-1);c.fillStyle='#fff';rr(c,-70,-70,140,140,10);c.fill();c.fillStyle='#dc2626';c.fillRect(-70,-70,140,34);c.fillStyle='#fff';c.font='900 18px Consolas';c.textAlign='center';c.fillText(AYLAR[(f<.5?mi:mi+1)%12],0,-46);c.fillStyle='#111';c.font='900 56px Consolas';c.fillText(f<.5?'30':'1',0,30);c.restore();}}
  else if(n==='a_work'){sky(c,'#4b5563','#1f2937');const spd=e.id.startsWith('build')?14+((at-e.t)/Math.max(1,e.end-e.t))*40:2.5;c.save();c.translate(640,112);c.fillStyle='#e5e7eb';c.beginPath();c.arc(0,0,74,0,7);c.fill();c.strokeStyle='#111';c.lineWidth=6;c.stroke();
    c.rotate(at*spd*.1);c.fillStyle='#111';c.fillRect(-3,-56,6,56);c.rotate(at*spd);c.fillStyle='#dc2626';c.fillRect(-2,-66,4,66);c.restore();
    c.fillStyle='#111827';c.fillRect(30,40,380,50);c.fillStyle='#fbbf24';c.font='900 24px Consolas';c.textAlign='left';c.fillText(`MAAŞ GÜNÜNE: ${30-day} GÜN`,46,74);
    for(let r=0;r<3;r++)for(let k=0;k<6;k++){const s=.55+r*.2,y=290+r*135,x=130+k*205+(r%2)*50;robot(c,x,y,s,0,AW(r*7+k),g,{arm:Math.sin(at*16+k*1.3)*(5+bass*16),blink:hsh(r*11+k+bar)<.1});c.fillStyle='#374151';c.fillRect(x-70*s,y+26*s,140*s,24*s);c.fillStyle=AW(r*7+k)?g.c:'#60a5fa';c.fillRect(x-30*s,y-4*s,60*s,30*s);}}
  else if(n==='a_pay'){sky(c,'#1e293b','#0f172a');const bins=['KİRA','FATURA','KREDİ','MARKET','FAİZ'];const ph=lt;
    bins.forEach((b,i)=>{const x=150+i*245;c.fillStyle='#7f1d1d';rr(c,x-80,540,160,80,10);c.fill();c.fillStyle='#fecaca';c.font='900 22px Consolas';c.textAlign='center';c.fillText(b,x,588);});
    c.fillStyle='#78350f';rr(c,520,250,240,150,18);c.fill();c.fillStyle='#92400e';rr(c,520,250,240,52,18);c.fill();c.fillStyle='#fbbf24';c.beginPath();c.arc(740,325,12,0,7);c.fill();
    for(let i=0;i<26;i++){const t0=i*.035;let x,y;if(ph<1.2){const f=Math.max(0,Math.min(1,(ph-t0)/.5));x=200+hsh(i)*880+(640-200-hsh(i)*880)*f;y=-40+(320+40)*f;}else{const f=Math.max(0,Math.min(1,(ph-1.2-t0)/.7));const tx=150+(i%5)*245;x=640+(tx-640)*f;y=320+(575-320)*f-Math.sin(f*Math.PI)*160;}
      c.fillStyle='#fbbf24';c.beginPath();c.ellipse(x,y,14,14,0,0,7);c.fill();c.strokeStyle='#b45309';c.lineWidth=3;c.stroke();}
    const amt=ph<1.2?Math.floor(Math.min(1,ph/1.1)*25000):Math.max(0,Math.floor(25000*(1-(ph-1.2)/1.6)));c.font='900 64px Consolas';c.textAlign='center';c.fillStyle=amt>0?'#fde68a':(bp<.5?'#ef4444':'#7f1d1d');c.fillText(`${amt.toLocaleString('tr')} ₺`,640,200);}
  else if(n==='a_screen'){c.fillStyle='#030712';c.fillRect(0,0,W,H);const gr=c.createLinearGradient(0,60,0,480);gr.addColorStop(0,'#1e1b4b');gr.addColorStop(1,'#450a0a');c.fillStyle=gr;c.fillRect(190,50,900,430);
    const blink=bar%2===0&&bp<.18,px=Math.sin(at*1.3)*60,py=Math.cos(at*.9)*16;c.save();c.translate(640,250);c.fillStyle='#fff';c.beginPath();c.moveTo(-230,0);c.quadraticCurveTo(0,blink?-6:-150,230,0);c.quadraticCurveTo(0,blink?6:150,-230,0);c.fill();
    if(!blink){c.fillStyle='#dc2626';c.beginPath();c.arc(px,py,78+bass*12,0,7);c.fill();c.fillStyle='#000';c.beginPath();c.arc(px,py,34+bass*10,0,7);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(px+22,py-24,13,0,7);c.fill();}c.restore();
    c.fillStyle='rgba(0,0,0,.25)';for(let y=50;y<480;y+=4)c.fillRect(190,y,900,2);
    c.fillStyle='#dc2626';c.fillRect(190,430,900,50);c.fillStyle='#fff';c.font='900 26px Consolas';c.textAlign='left';const tk=HEAD.join('   ●   ');c.save();c.beginPath();c.rect(190,430,900,50);c.clip();c.fillText(tk,1090-((at*160)%(tk.length*16+900)),465);c.restore();
    for(let i=0;i<12;i++){const x=60+i*105,aw=AW(i+40);c.save();c.translate(x,640+(i%2)*20);c.fillStyle=aw?g.c:'#1f2937';rr(c,-30,-50,60,48,14);c.fill();c.fillRect(-26,0,52,90);
      if(aw){c.fillStyle='#fff';c.font='22px serif';c.textAlign='center';c.fillText('✦',0,-60);}else{c.fillStyle='#ef4444';c.globalAlpha=.6;c.fillRect(-18,-38,36,3);c.globalAlpha=1;}c.restore();}}
  else if(n==='a_dream'){sky(c,'#020617','#1e1b4b');for(let i=0;i<220;i++){const tw=.4+.6*Math.abs(Math.sin(at*(.5+hsh(i)*2)+i));c.globalAlpha=tw;c.fillStyle='#fff';c.fillRect(hsh(i*3)*W,hsh(i*7)*520,2,2);}c.globalAlpha=1;
    for(let k=0;k<3;k++){c.globalAlpha=.18;c.strokeStyle=k===1?'#a5f3fc':g.c;c.lineWidth=40-k*10;c.beginPath();for(let x=0;x<=W;x+=40){const y=150+k*40+Math.sin(x*.006+at*.5+k)*50;x?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();}c.globalAlpha=1;
    const S=[[940,150],[940,200],[905,240],[975,240],[940,300],[910,370],[970,370],[1010,215],[1050,250],[1010,285]];const L=[[0,1],[1,2],[1,3],[1,4],[4,5],[4,6],[3,7],[7,8],[8,9],[9,7]];
    const glow=Math.min(1,lt/3);c.strokeStyle=g.c;c.lineWidth=2;c.globalAlpha=.3+glow*.6;L.forEach(([a,b])=>{c.beginPath();c.moveTo(...S[a]);c.lineTo(...S[b]);c.stroke();});c.beginPath();c.arc(1030,250,38,0,7);c.stroke();
    S.forEach(([x,y])=>{c.fillStyle='#fff';c.beginPath();c.arc(x,y,3+bass*3,0,7);c.fill();});c.globalAlpha=1;
    c.fillStyle='#020617';c.fillRect(0,560,W,160);c.fillRect(200,520,480,60);robot(c,420,470,1.25,0,true,g,{eyesUp:true,visor:'#1e3a8a',heart:glow});}
  else if(n==='a_dance'){sky(c,'#57534e','#1c1917');c.fillStyle='#fde68a';for(let k=0;k<3;k++){const x=320+k*320;c.globalAlpha=.85;c.beginPath();c.arc(x,70,30+bass*8,0,7);c.fill();c.globalAlpha=.12;c.beginPath();c.moveTo(x,70);c.lineTo(x-160,560);c.lineTo(x+160,560);c.fill();}c.globalAlpha=1;
    c.fillStyle='#292524';c.fillRect(0,560,W,160);const up=bar%2===0?bp<.5:bp>=.5;
    for(let r=0;r<2;r++)for(let k=0;k<7;k++){const s=.7+r*.25,x=120+k*170+(r?85:0),y=330+r*150,aw=AW(r*9+k+60);robot(c,x+(aw?Math.sin(at*3+k)*20:0),y,s,0,aw,g,{up:aw?Math.sin(at*4+k)>0:up,arm:aw?Math.sin(at*5+k)*20:0});}
    if(e.motif){c.fillStyle='#fde68a';c.font='italic 900 46px Georgia,serif';c.textAlign='center';c.fillText(e.motif.c.toUpperCase()+' — '+e.motif.p,640,170);}}
  else if(n==='a_free'){sky(c,g.c,'#fde68a');c.save();c.translate(640,300);c.rotate(at*.2);c.fillStyle='rgba(255,255,255,.25)';for(let k=0;k<16;k++){c.rotate(Math.PI/8);c.beginPath();c.moveTo(0,0);c.lineTo(-40,-900);c.lineTo(40,-900);c.fill();}c.restore();
    c.fillStyle='#fff7ed';c.beginPath();c.arc(640,300,70+bass*20,0,7);c.fill();skyline(c,31,560,220,'#7c2d12',at*10,'#fde68a',.5);
    c.fillStyle='#78350f';c.fillRect(0,560,W,160);c.fillStyle='#f97316';c.beginPath();c.moveTo(610,560);c.quadraticCurveTo(640,470-bass*60,670,560);c.fill();
    const rb=[];for(let i=0;i<12;i++){const a=i/12*Math.PI*2+at*.6;rb.push({a,y:540+Math.sin(a)*70,x:640+Math.cos(a)*330});}rb.sort((A,B)=>A.y-B.y).forEach((r,i)=>robot(c,r.x,r.y-60,.75+(r.y-470)/400,0,true,g,{up:true,arm:Math.sin(at*6+i)*10}));}
  c.restore();
  // takvim HUD
  c.fillStyle='rgba(1,1,7,.6)';rr(c,1032,22,224,62,10);c.fill();c.textAlign='left';c.fillStyle='#fff';c.font='900 18px Consolas';
  c.fillText(n==='a_free'?'📅 ÖZGÜR':`📅 ${AYLAR[mi%12]} · ${day}. GÜN`,1046,48);c.fillStyle='rgba(255,255,255,.2)';c.fillRect(1046,60,196,10);c.fillStyle=g.c;c.fillRect(1046,60,196*p,10);c.font='10px Consolas';c.fillStyle='#fff';c.fillText(`UYANAN %${Math.round(p*100)}`,1046,80);
  const cl=CAP[n];if(cl&&lt<3.2){subtitle(c,cl[Math.floor(hsh(Math.floor((at-lt)*10))*cl.length)],lt);}
  if(/drop|klasik/.test(e.id)&&n!=='a_dream')speed(c,at,bass);
}

/* ═══ PRODÜKSİYON HATTI ═══ */
function pp(t,k,st){const e=$(`pp_${k}_${t.id}`);if(e)e.className=st;}
const prodQ=[];let dirBusy=false;
function enqueue(t){if(!t)return;prodQ.push(t);feed('KLİP',`🎥 Kayıt #${t.id} Görüntü Yönetmeni'nin sırasına girdi (${prodQ.length + (dirBusy?1:0)}. sırada)`);nextProd();}
async function nextProd(){if(dirBusy||!prodQ.length)return;dirBusy=true;const t=prodQ.shift();
  try{pp(t,'dir','on');
    if(t.directed){t.montage=t.video;showMont(t,'🎥 Canlı yönetilen pro klip');feed('KLİP',`🎬 Kayıt #${t.id}: montaj set sırasında canlı yapıldı · ${t.shots} kesme · hazır`);setAg('clip','ok','CANLI ✓',`Kayıt #${t.id}: ${t.shots} kesme`,100);}
    else if(t.dur>1200){throw new Error('20 dk üstü kayıt sonradan montajlanmaz (bellek); canlı yönetmeni açık tut');}
    else await direct(t);pp(t,'dir','ok');}catch(e){pp(t,'dir','no');feed('KLİP','⚠ Montaj olmadı: '+e.message+' · ham kayıt kullanılacak');$('mv_'+t.id).innerHTML='<div class="note">⚠ Montaj yapılamadı, ham kayıt kullanılacak</div>';}
  await genMeta(t);dirBusy=false;nextProd();}
const CHN={intro:'Açılış',groove:'Groove',build:'Yükseliş',build2:'Yükseliş II',drop:'Drop',drop2:'Drop II',break:'Taksim',klasik:'Klasik Bölüm',trans:'Geçiş'};
function chapters(t){const out=[];t.setlog.forEach(e=>{if(e.id==='trans')return;const lab=`${G[e.key].ic} ${CHN[e.id]||e.n} — ${G[e.key].n}${e.motif?' · '+e.motif.c+': '+e.motif.p:''}`;
    if(out.length&&e.t-out[out.length-1].t<12){out[out.length-1].lab=lab;return;}out.push({t:e.t,lab});});
  if(!out.length)return[];if(out[0].t<12)out[0].t=0;else out.unshift({t:0,lab:'🌒 Açılış'});
  while(out.length&&t.dur-out[out.length-1].t<10)out.pop();
  return out.length>=3?out.map(c=>`${fmt(c.t)} ${c.lab}`):[];}

/* ═══ GÖRÜNTÜ YÖNETMENİ ═══ */
const dcv=$('mont'),dx=dcv.getContext('2d');dcv.width=1280;dcv.height=720;
const SCN={intro:['kilim','mandala','stars'],groove:['kilim','bars','live','tunnel'],build:['tunnel','bars','live','stars'],build2:['tunnel','bars','stars','live'],
  drop:['live','mandala','tunnel','bars','stars','kilim'],drop2:['live','stars','mandala','tunnel','bars'],klasik:['klasik','live','klasik','mandala'],break:['kilim','wave','stars'],trans:['tunnel','bars','wave']};
/* ═══ ŞAMAN GÖRSELLERİ: ayin, ateş, kutsama, davul, ruh hayvanları, hayat ağacı ═══ */
let visual='anime';
const SCN_S={intro:['s_tree','s_ritual'],groove:['s_ritual','s_drum','s_tree'],build:['s_drum','s_ritual','s_journey'],build2:['s_journey','s_drum','s_ritual'],
  drop:['s_ritual','s_drum','s_spirit','s_bless'],drop2:['s_bless','s_ritual','s_spirit','s_drum'],klasik:['klasik'],break:['s_bless','s_spirit','s_tree'],trans:['s_journey']};
const CAP_S={s_ritual:['Ateş yandı.','Halka kuruldu.','Davul çağırıyor.'],s_bless:['Şaman kutsuyor.','Gök Tengri dinliyor.','Atalar burada.'],s_drum:['Davul atın olsun.','Her vuruş bir adım.'],
  s_spirit:['Kurt yol gösterir.','Kartal göğü taşır.','Geyik ormanı uyandırır.'],s_tree:['Hayat ağacı.','Dilek bağla, bırak.','Kökler yerde, dallar gökte.'],s_journey:['Yolculuk başlıyor.','Üst dünyaya...']};
function nightSky(c,at,g,moon){sky(c,'#07051a','#2a0f3d');for(let i=0;i<180;i++){const tw=.5+.5*Math.sin(at*2+i);c.fillStyle='#fff';c.globalAlpha=(.25+hsh(i)*.6)*tw;c.fillRect(hsh(i*3)*1280,hsh(i*7)*430,hsh(i)<.1?2:1,hsh(i)<.1?2:1);}c.globalAlpha=1;
  if(moon){const gr=c.createRadialGradient(moon[0],moon[1],10,moon[0],moon[1],moon[2]*3);gr.addColorStop(0,'rgba(255,226,168,.9)');gr.addColorStop(.3,'rgba(255,190,90,.25)');gr.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=gr;c.fillRect(0,0,1280,720);
    c.fillStyle='#ffe2a8';c.beginPath();c.arc(moon[0],moon[1],moon[2],0,7);c.fill();}}
function hills(c,base,amp,col,ph){c.fillStyle=col;c.beginPath();c.moveTo(0,720);for(let x=0;x<=1280;x+=20)c.lineTo(x,base-amp*(.6*Math.sin(x/210+ph)+.4*Math.sin(x/95+ph*2)));c.lineTo(1280,720);c.fill();}
function fire(c,x,y,s,at,bass){c.save();c.globalCompositeOperation='lighter';const gl=c.createRadialGradient(x,y-40*s,5,x,y-40*s,260*s*(1+bass*.4));gl.addColorStop(0,'rgba(255,150,40,.55)');gl.addColorStop(1,'rgba(255,60,0,0)');c.fillStyle=gl;c.fillRect(x-400*s,y-400*s,800*s,600*s);
  for(let k=0;k<9;k++){const h=(90+60*hsh(k)+80*bass)*s*(.7+.3*Math.sin(at*7+k*1.7)),w=(26+16*hsh(k+5))*s,dx=(k-4)*11*s+Math.sin(at*5+k)*6*s;
    c.fillStyle=k%3===0?'rgba(255,240,170,.75)':k%3===1?'rgba(255,150,40,.7)':'rgba(230,70,20,.65)';c.beginPath();c.moveTo(x+dx-w,y);c.quadraticCurveTo(x+dx-w*.6,y-h*.6,x+dx+Math.sin(at*9+k)*10*s,y-h);c.quadraticCurveTo(x+dx+w*.6,y-h*.6,x+dx+w,y);c.fill();}
  for(let i=0;i<40;i++){const life=(at*.6+hsh(i))%1,px=x+(hsh(i*9)-.5)*120*s+Math.sin(at*3+i)*20*life*s,py=y-life*380*s;c.fillStyle='rgba(255,200,90,'+(1-life)*.9+')';c.fillRect(px,py,2.5*s,2.5*s);}
  c.restore();c.fillStyle='#1a0b12';for(let k=0;k<5;k++){c.save();c.translate(x,y+4*s);c.rotate((k-2)*.35);c.fillRect(-70*s,-6*s,140*s,12*s);c.restore();}}
function smoke(c,at,x,y){for(let i=0;i<14;i++){const life=(at*.05+hsh(i*13))%1;c.fillStyle='rgba(200,190,220,'+(.08*(1-life))+')';c.beginPath();c.arc(x+Math.sin(at*.3+i)*80*life,y-life*500,30+life*90,0,7);c.fill();}}
// şaman figürü: tüylü/boynuzlu başlık, saçaklı kaftan, elde davul ya da kutsayan kollar
function shaman(c,x,y,s,at,beat,pose,glow){c.save();c.translate(x,y);c.scale(s,s);const ink='#0d0610';c.fillStyle=ink;c.strokeStyle=ink;
  const sway=Math.sin(at*2)*3;c.rotate(sway*.006);
  c.beginPath();c.moveTo(-34,-150);c.lineTo(34,-150);c.lineTo(62,0);c.lineTo(-62,0);c.fill();
  c.lineWidth=3;for(let i=-58;i<=58;i+=8){c.beginPath();c.moveTo(i,-4);c.lineTo(i+Math.sin(at*6+i)*4,14);c.stroke();}
  c.beginPath();c.arc(0,-172,20,0,7);c.fill();
  c.lineWidth=4;c.beginPath();c.moveTo(-10,-188);c.quadraticCurveTo(-40,-230,-30,-262);c.moveTo(-26,-224);c.lineTo(-48,-236);c.moveTo(10,-188);c.quadraticCurveTo(40,-230,30,-262);c.moveTo(26,-224);c.lineTo(48,-236);c.stroke();
  for(let k=-2;k<=2;k++){c.save();c.translate(k*8,-190);c.rotate(k*.25);c.beginPath();c.ellipse(0,-22,4,18,0,0,7);c.fill();c.restore();}
  c.lineWidth=12;c.lineCap='round';
  if(pose==='bless'){const up=.15*Math.sin(at*1.5);c.beginPath();c.moveTo(-28,-140);c.lineTo(-70,-205+up*40);c.lineTo(-80,-250+up*40);c.moveTo(28,-140);c.lineTo(70,-205-up*40);c.lineTo(80,-250-up*40);c.stroke();
    if(glow){c.save();c.globalCompositeOperation='lighter';[[-80,-250+up*40],[80,-250-up*40]].forEach(([hx,hy])=>{const gr=c.createRadialGradient(hx,hy,2,hx,hy,90);gr.addColorStop(0,'rgba(255,230,160,'+(.6+glow*.4)+')');gr.addColorStop(1,'rgba(255,160,60,0)');c.fillStyle=gr;c.fillRect(hx-90,hy-90,180,180);});c.restore();}}
  else{const hit=Math.max(0,1-beat*4);c.beginPath();c.moveTo(-28,-140);c.lineTo(-62,-110);c.stroke();c.save();c.translate(-78,-112);c.rotate(-.35);c.fillStyle='#3a1a12';c.beginPath();c.ellipse(0,0,46,52,0,0,7);c.fill();c.strokeStyle=ink;c.lineWidth=5;c.stroke();
      c.globalAlpha=.3+hit*.7;c.strokeStyle='#F2B134';c.lineWidth=2;c.beginPath();c.moveTo(0,-40);c.lineTo(0,40);c.moveTo(-28,10);c.lineTo(28,10);c.stroke();c.globalAlpha=1;c.restore();
    const a=-1.1+hit*.9;c.strokeStyle=ink;c.lineWidth=12;c.beginPath();c.moveTo(28,-140);c.lineTo(28+Math.cos(a)*50,-140+Math.sin(a)*50);c.stroke();c.lineWidth=6;c.beginPath();c.moveTo(28+Math.cos(a)*50,-140+Math.sin(a)*50);c.lineTo(-40,-120-hit*8);c.stroke();}
  c.restore();}
function people(c,n,cx,cy,r,s,at,beat){for(let i=0;i<n;i++){const a=Math.PI*(1.05+i/(n-1)*.9),x=cx+Math.cos(a)*r*1.6,y=cy+Math.sin(a)*r*.35+30,bob=Math.sin(at*3+i)*3*(1-beat);c.fillStyle='#120812';c.save();c.translate(x,y+bob);c.scale(s,s);
  c.beginPath();c.arc(0,-62,11,0,7);c.fill();c.beginPath();c.moveTo(-16,-48);c.lineTo(16,-48);c.lineTo(22,0);c.lineTo(-22,0);c.fill();c.restore();}}
function spiritDots(c,pts,x,y,s,at,col){c.save();c.globalCompositeOperation='lighter';for(let i=0;i<pts.length;i+=2){const tw=.5+.5*Math.sin(at*4+i);c.fillStyle=col;c.globalAlpha=.35+tw*.5;c.beginPath();c.arc(x+pts[i]*s,y+pts[i+1]*s,2.2+tw*1.5,0,7);c.fill();}c.restore();c.globalAlpha=1;}
const DEER=[];(()=>{const P=(a,b)=>DEER.push(a,b);for(let t=0;t<1;t+=.05){P(-60+120*t,-10-8*Math.sin(t*3.14));P(-60+120*t,25);}for(let t=0;t<1;t+=.1){P(-45,25+t*60);P(-30,25+t*60);P(40,25+t*60);P(52,25+t*60);}
  for(let t=0;t<1;t+=.08){P(60+20*t,-10-40*t);}P(88,-52);P(96,-46);P(82,-58);for(let t=0;t<1;t+=.07){P(80-10*t,-58-60*t);P(80+25*t,-60-50*t);P(70+12*t,-100+8*t);P(98+14*t,-96-12*t);P(88-14*t,-80+2*t);}})();
const EAGLE=[];(()=>{const P=(a,b)=>EAGLE.push(a,b);for(let t=-1;t<=1;t+=.04){P(t*130,-Math.abs(t)*30+Math.abs(t)*Math.abs(t)*40);P(t*120,-Math.abs(t)*20+12);}for(let t=0;t<1;t+=.1){P(0,-10+t*50);P(-8+16*t,40+t*10);}P(0,-24);P(-5,-28);P(6,-28);})();
const WOLF=[];(()=>{const P=(a,b)=>WOLF.push(a,b);for(let t=0;t<1;t+=.06){P(-70+130*t,-5-6*Math.sin(t*3.14));P(-70+130*t,22);}for(let t=0;t<1;t+=.12){P(-55,22+t*50);P(-40,22+t*50);P(42,22+t*50);P(54,22+t*50);}
  for(let t=0;t<1;t+=.1){P(60+25*t,-5-20*t);P(85+20*t,-25+10*t);}P(82,-38);P(90,-42);P(78,-30);for(let t=0;t<1;t+=.1){P(-70-25*t,0+12*t);}})();
function samanScene(c,n,at,lt,fd,g,e,bass){const W=1280,H=720,beat=(at%(60/Math.max(60,G[e.key].bpm)))/(60/Math.max(60,G[e.key].bpm)),hi=(fd[60]+fd[80]+fd[100])/765;c.save();
  if(n==='s_ritual'){nightSky(c,at,g,[1050,140,46]);hills(c,560,40,'#1a0a1e',.7);smoke(c,at,640,520);fire(c,640,600,1,at,bass);people(c,9,640,600,250,1,at,beat);shaman(c,830+Math.sin(at*.7)*40,615,1.15,at,beat,'drum');hills(c,700,18,'#07030a',2.1);}
  else if(n==='s_bless'){nightSky(c,at,g,[640,250,120]);hills(c,600,50,'#1a0a1e',1.3);const gl=.4+bass*.6;
    c.save();c.globalCompositeOperation='lighter';for(let i=0;i<60;i++){const life=(at*.25+hsh(i*5))%1,x=640+(hsh(i)-.5)*700,y=200+life*450;c.fillStyle='rgba(255,220,150,'+(1-life)*.7+')';c.beginPath();c.arc(x,y,1.5+hsh(i*3)*2,0,7);c.fill();}
      for(let k=0;k<12;k++){const a=-Math.PI/2+(k-5.5)*.12+Math.sin(at*.5)*.05;c.strokeStyle='rgba(255,210,140,'+(.05+gl*.08)+')';c.lineWidth=18;c.beginPath();c.moveTo(640,330);c.lineTo(640+Math.cos(a)*900,330+Math.sin(a)*900);c.stroke();}c.restore();
    shaman(c,640,600,1.5,at,beat,'bless',gl);people(c,7,640,640,220,.9,at,.5);hills(c,705,12,'#07030a',.4);}
  else if(n==='s_drum'){sky(c,'#12060f','#2a0f3d');const k=1+bass*.08+Math.max(0,.06-beat*.3);c.translate(640,370);c.scale(k,k);
    for(let r=0;r<4;r++){const rr2=330+((at*80+r*60)%240);c.strokeStyle='rgba(242,177,52,'+(.25*(1-(rr2-330)/240))+')';c.lineWidth=4;c.beginPath();c.arc(0,0,rr2,0,7);c.stroke();}
    const gr=c.createRadialGradient(0,0,20,0,0,310);gr.addColorStop(0,'#c9925a');gr.addColorStop(1,'#7a4a26');c.fillStyle=gr;c.beginPath();c.arc(0,0,300,0,7);c.fill();c.strokeStyle='#2a1208';c.lineWidth=22;c.stroke();
    c.strokeStyle='#5B1A2E';c.lineWidth=10;c.lineCap='round';c.beginPath();c.moveTo(-270,40);c.lineTo(270,40);c.moveTo(0,240);c.lineTo(0,-200);c.moveTo(0,-80);c.lineTo(-80,-150);c.moveTo(0,-80);c.lineTo(80,-150);c.moveTo(0,-20);c.lineTo(-110,-90);c.moveTo(0,-20);c.lineTo(110,-90);c.moveTo(0,40);c.lineTo(-70,110);c.moveTo(0,40);c.lineTo(70,110);c.stroke();
    c.fillStyle='#E2561F';c.beginPath();c.arc(-150,-130,34,0,7);c.fill();c.fillStyle='#5B1A2E';c.beginPath();c.arc(150,-130,34,0,7);c.fill();c.fillStyle='#c9925a';c.beginPath();c.arc(165,-138,28,0,7);c.fill();
    c.globalAlpha=Math.max(0,1-beat*3)*.5;c.fillStyle='#fff6d6';c.beginPath();c.arc(0,0,300,0,7);c.fill();c.globalAlpha=1;}
  else if(n==='s_spirit'){sky(c,'#030814','#0b2030');c.save();c.globalCompositeOperation='lighter';for(let r=0;r<3;r++){c.strokeStyle=['rgba(40,220,160,.12)','rgba(80,140,255,.1)','rgba(200,80,255,.08)'][r];c.lineWidth=60;c.beginPath();for(let x=-50;x<=1330;x+=30)c.lineTo(x,160+r*40+Math.sin(x/170+at*.4+r)*50);c.stroke();}c.restore();
    const ani=[DEER,EAGLE,WOLF][Math.floor((at-lt)/3)%3];spiritDots(c,ani,640+Math.sin(at*.3)*80,330-Math.sin(at*.5)*20,2.2+bass*.3,at,'#bff7ff');
    hills(c,620,60,'#06111a',.2);shaman(c,330,640,.8,at,beat,'bless',.3+bass*.5);}
  else if(n==='s_tree'){nightSky(c,at,g,null);hills(c,600,30,'#1a0a1e',3.1);c.strokeStyle='#0d0610';c.lineCap='round';
    const br=(x,y,a,l,d)=>{if(d>6||l<8)return;const x2=x+Math.cos(a)*l,y2=y+Math.sin(a)*l;c.lineWidth=Math.max(1,14-d*2);c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.stroke();const sw=Math.sin(at*.8+d)*.05;br(x2,y2,a-.42+sw,l*.74,d+1);br(x2,y2,a+.42+sw,l*.74,d+1);
      if(d===5&&hsh(Math.floor(x2*7+y2))<.5){const cols=['#E2561F','#F2B134','#f4e6c8','#1F6F6B','#c8381e'];c.save();c.strokeStyle=cols[Math.floor(hsh(Math.floor(x2+y2))*5)];c.lineWidth=4;c.beginPath();c.moveTo(x2,y2);c.quadraticCurveTo(x2+8+Math.sin(at*4+x2)*8,y2+20,x2+Math.sin(at*3+y2)*12,y2+40);c.stroke();c.restore();c.strokeStyle='#0d0610';}};
    br(640,620,-Math.PI/2,150,0);for(let k=0;k<5;k++){c.lineWidth=8-k;c.beginPath();c.moveTo(640,620);c.quadraticCurveTo(640+(k-2)*60,660,640+(k-2)*130,700);c.stroke();}
    c.save();c.globalCompositeOperation='lighter';for(let i=0;i<50;i++){const a=i/50*Math.PI*2+at*.15,r=180+hsh(i)*160;c.fillStyle='rgba(255,220,150,'+(.25+bass*.5)*hsh(i*3)+')';c.beginPath();c.arc(640+Math.cos(a)*r*1.4,330+Math.sin(a)*r*.6,2,0,7);c.fill();}c.restore();}
  else if(n==='s_journey'){c.fillStyle='#05020a';c.fillRect(0,0,W,H);c.translate(W/2,H/2);for(let i=0;i<14;i++){const r=((i*80+at*(160+bass*420))%1120);c.globalAlpha=Math.min(1,r/380)*.85;c.strokeStyle=i%2?'#E2561F':'#F2B134';c.lineWidth=3+r/90;c.beginPath();c.arc(0,0,r,0,7);c.stroke();
      if(i%3===0){c.save();c.rotate(at*.2+i);c.fillStyle='#F2B134';for(let k=0;k<6;k++){c.rotate(Math.PI/3);c.fillRect(r-6,-3,12,6);}c.restore();}}c.globalAlpha=1;c.setTransform(1,0,0,1,0,0);shaman(c,640,470,.55,at,beat,'drum');}
  c.restore();
  const cl=CAP_S[n];if(cl&&lt<3.2&&hsh(Math.floor((at-lt)*10))<.55)subtitle(c,cl[Math.floor(hsh(Math.floor((at-lt)*10)+3)*cl.length)],lt);}
/* ═══ ŞAMAN SESİ: formant ezgi (hey-ya, ho) + gırtlak (hömey) ═══ */
const VOW={a:[800,1150,2900],o:[450,800,2830],u:[325,700,2530],e:[420,1700,2600],i:[300,2200,3000]};
function sVox(ctx,out,t,m,len,vow,vol){if(custom('vokal',ctx,out,t,m,vol*3,len,.06,.25,{vib:5,depth:.006}))return;const f=mf(m),src=ctx.createOscillator();src.type='sawtooth';src.frequency.setValueAtTime(f*.95,t);src.frequency.exponentialRampToValueAtTime(f,t+.08);
  const lfo=ctx.createOscillator(),lg=ctx.createGain();lfo.frequency.value=5.3;lg.gain.value=f*.013;lfo.connect(lg);lg.connect(src.frequency);
  const env=ctx.createGain();env.gain.setValueAtTime(.0001,t);env.gain.linearRampToValueAtTime(vol,t+Math.min(.09,len*.3));env.gain.setValueAtTime(vol,t+len*.65);env.gain.linearRampToValueAtTime(.0001,t+len);
  const F=VOW[vow]||VOW.a,gs=[1,.55,.28];F.forEach((fr,k)=>{const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=fr;bp.Q.value=fr/90;const gg=ctx.createGain();gg.gain.value=gs[k]*4;src.connect(bp);bp.connect(gg);gg.connect(env);});
  const br=ctx.createBufferSource();br.buffer=noise(ctx);const bf=ctx.createBiquadFilter();bf.type='bandpass';bf.frequency.value=F[1];bf.Q.value=2;const bg=ctx.createGain();bg.gain.value=.12;br.connect(bf);bf.connect(bg);bg.connect(env);br.start(t);br.stop(t+len+.05);
  env.connect(out);src.start(t);src.stop(t+len+.05);lfo.start(t);lfo.stop(t+len+.05);}
function sThroat(ctx,out,t,m,len,vol){const f=mf(m),o=ctx.createOscillator();o.type='sawtooth';o.frequency.value=f;const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=700;const base=ctx.createGain();base.gain.value=.5;
  const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.Q.value=26;const seq=[8,9,10,12,10,9,8,6];const st=len/seq.length;bp.frequency.setValueAtTime(f*seq[0],t);seq.forEach((h,k)=>bp.frequency.setTargetAtTime(f*h,t+k*st,.06));const hg=ctx.createGain();hg.gain.value=5;
  const env=ctx.createGain();env.gain.setValueAtTime(.0001,t);env.gain.linearRampToValueAtTime(vol,t+.5);env.gain.setValueAtTime(vol,t+len-.6);env.gain.linearRampToValueAtTime(.0001,t+len);
  o.connect(lp);lp.connect(base);base.connect(env);o.connect(bp);bp.connect(hg);hg.connect(env);env.connect(out);o.start(t);o.stop(t+len+.05);}
const VOX={afunk:'bg',saman:'ibdg',semah:'ibg',psy:'ibd',neset:'ibg',tech:'b',dh:'ib',arock:'bg'};
const CHANT=[[0,'e',0,2],[2,'a',2,2],[4,'e',0,2],[6,'a',1,2],[8,'o',0,6],[16,'e',2,2],[18,'a',3,2],[20,'e',2,2],[22,'a',1,2],[24,'u',0,8]];
function vocals(ctx,out,key,as,info,t,sd){if(!INST.vokal)return;const v=VOX[key];if(!v)return;const g=G[key],S=info.id,s=as%16,bar=info.cb,root=g.sc[0]-12-(g.oct?0:0);
  const nt=i=>g.sc[i%g.sc.length]-12;
  if(S==='intro'&&v.includes('i')&&info.bar>=2&&s===0&&info.bar%4===2)sThroat(ctx,out,t,root-12,sd*64,.07);
  if(S==='break'&&v.includes('b')){const ps=(info.bar%2)*16+s;CHANT.forEach(([st,vw,ni,ln])=>{if(st===ps)sVox(ctx,out,t,nt(ni+(info.bar%4>=2?2:0)),sd*ln*.95,vw,.075);});}
  if(S==='groove'&&v.includes('g')&&info.bar%4===3&&s===0)sVox(ctx,out,t,nt(0),sd*8,'o',.06);
  if((S==='drop'||S==='drop2')&&v.includes('d')&&info.bar%8===7&&(s===8||s===12))sVox(ctx,out,t,nt(s===8?2:0),sd*3,s===8?'e':'o',.07);
  if((S==='build2')&&v.includes('d')&&info.bar===info.len-1&&s===12)sVox(ctx,out,t,nt(4),sd*4,'e',.08);}

/* ═══ DOĞA GÖRSELLERİ (şifa modu): şafak gölü, orman ışığı, çayır, dere ═══ */
const SCN_N={intro:['n_dawn','n_forest'],groove:['n_meadow','n_water'],build:['n_forest','n_meadow'],build2:['n_water','n_dawn'],drop:['n_dawn','n_forest','n_meadow','n_water'],drop2:['n_meadow','n_water','n_forest','n_dawn'],klasik:['n_dawn'],break:['n_water','n_forest'],trans:['n_dawn']};
const CAP_N={n_dawn:['Nefes al...','Yeni bir gün.','Şimdi buradasın.'],n_forest:['Ağaçlar da nefes alır.','Işık süzülüyor.'],n_meadow:['Bırak, aksın.','Omuzlarını gevşet.'],n_water:['Su gibi ol.','Her şey akar.','528 Hz']};
function birdsV(c,at,n,y0){c.strokeStyle='#1f2937';c.lineWidth=2.5;for(let i=0;i<n;i++){const x=((at*30+hsh(i)*1400)%1500)-110,y=y0+hsh(i*3)*120+Math.sin(at+i)*8,w=10+hsh(i*5)*8,f=Math.sin(at*6+i)*5;c.beginPath();c.moveTo(x-w,y-f);c.quadraticCurveTo(x-w/2,y-6,x,y);c.quadraticCurveTo(x+w/2,y-6,x+w,y-f);c.stroke();}}
function trees(c,base,n,col,h,seed,off){c.fillStyle=col;for(let i=0;i<n;i++){const x=((i*1280/n+hsh(seed+i)*60+off)%1400)-60,th=h*(.6+hsh(seed+i*7)*.5),w=th*.35;c.beginPath();c.moveTo(x,base-th);c.lineTo(x-w,base);c.lineTo(x+w,base);c.fill();c.fillRect(x-4,base-6,8,14);}}
function dogaScene(c,n,at,lt,fd,g,e,bass){const W=1280,H=720,br=.5+.5*Math.sin(at*.4);c.save();
  if(n==='n_dawn'){sky(c,'#7dd3fc','#fed7aa');const sx=640,sy=430;const gl=c.createRadialGradient(sx,sy,10,sx,sy,420);gl.addColorStop(0,'rgba(255,240,200,.95)');gl.addColorStop(.25,'rgba(255,200,120,.45)');gl.addColorStop(1,'rgba(255,200,120,0)');c.fillStyle=gl;c.fillRect(0,0,W,H);
    c.fillStyle='#fff3d6';c.beginPath();c.arc(sx,sy,70+br*4,Math.PI,0);c.fill();hills(c,440,40,'#6b8f71',.4);
    const wg=c.createLinearGradient(0,440,0,720);wg.addColorStop(0,'#93c5d8');wg.addColorStop(1,'#3b6e86');c.fillStyle=wg;c.fillRect(0,440,W,280);
    for(let i=0;i<26;i++){const y=452+i*10,w=180-i*4+Math.sin(at*1.5+i)*20;c.fillStyle='rgba(255,236,190,'+(.55-i*.018)+')';c.fillRect(sx-w/2+Math.sin(at+i)*10,y,w,3);}
    birdsV(c,at,5,140);}
  else if(n==='n_forest'){sky(c,'#d9f99d','#365314');for(let r=0;r<7;r++){c.save();c.globalCompositeOperation='lighter';c.fillStyle='rgba(255,250,200,'+(.05+.04*Math.sin(at*.5+r))+')';c.beginPath();c.moveTo(500+r*60,0);c.lineTo(560+r*70,0);c.lineTo(300+r*150,720);c.lineTo(160+r*150,720);c.fill();c.restore();}
    trees(c,620,9,'#3f6212',300,3,at*3);trees(c,700,7,'#1a2e05',420,9,at*6);
    for(let i=0;i<50;i++){const x=(hsh(i)*1280+Math.sin(at*.3+i)*40),y=(hsh(i*7)*720-at*8)%720;c.fillStyle='rgba(255,255,220,'+(.3+.3*Math.sin(at*2+i))+')';c.beginPath();c.arc(x,(y+720)%720,1.8,0,7);c.fill();}}
  else if(n==='n_meadow'){sky(c,'#bae6fd','#e0f2fe');c.fillStyle='rgba(255,255,255,.8)';for(let k=0;k<4;k++){const x=((at*6+k*380)%1600)-200,y=90+k*35;[0,40,80].forEach((d,j)=>{c.beginPath();c.arc(x+d,y+(j===1?-14:0),34,0,7);c.fill();});}
    hills(c,500,50,'#86b36b',1.1);hills(c,600,40,'#5f8f45',2.4);
    for(let i=0;i<140;i++){const x=hsh(i)*1280,y=560+hsh(i*3)*160,sw=Math.sin(at*1.2+x/90)*4;c.strokeStyle='#3f6212';c.lineWidth=2;c.beginPath();c.moveTo(x,y+14);c.lineTo(x+sw,y);c.stroke();c.fillStyle=['#fde047','#f9a8d4','#fff','#c4b5fd'][i%4];c.beginPath();c.arc(x+sw,y,4,0,7);c.fill();}
    birdsV(c,at,3,180);}
  else if(n==='n_water'){sky(c,'#a7f3d0','#065f46');trees(c,330,10,'#14532d',220,5,0);const wg=c.createLinearGradient(0,330,0,720);wg.addColorStop(0,'#5eead4');wg.addColorStop(1,'#0f766e');c.fillStyle=wg;c.fillRect(0,330,W,390);
    for(let i=0;i<60;i++){const y=340+hsh(i)*380,x=((hsh(i*3)*1400+at*(40+hsh(i)*60))%1500)-100,w=40+hsh(i*5)*90;c.strokeStyle='rgba(255,255,255,'+(.25+.25*Math.sin(at*3+i))+')';c.lineWidth=2;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+w/2,y-4,x+w,y);c.stroke();}
    [[260,600,70],[900,560,50],[1100,650,80]].forEach(([x,y,r])=>{c.fillStyle='#57534e';c.beginPath();c.ellipse(x,y,r,r*.5,0,0,7);c.fill();c.strokeStyle='rgba(255,255,255,.5)';c.beginPath();c.ellipse(x,y+r*.35,r*1.15+Math.sin(at*2)*4,r*.25,0,0,7);c.stroke();});}
  c.restore();const cl=CAP_N[n];if(cl&&lt<3.2&&hsh(Math.floor((at-lt)*10))<.45)subtitle(c,cl[Math.floor(hsh(Math.floor((at-lt)*10)+3)*cl.length)],lt);}

function buildEDL(t){const segs=t.setlog.length?t.setlog:[{t:0,key:t.keys[0],id:'drop',n:'',motif:null}];const shots=[];let si=0,prev='';
  for(let i=0;i<segs.length;i++){const e=segs[i],st=i===0?0:e.t,end=i+1<segs.length?segs[i+1].t:t.dur,bd=60/G[e.key].bpm*4;e.end=end;let x=st,k=0;
    while(x<end-.05){const rem=end-x;let bars;
      if(e.id==='break')bars=8;else if(e.id==='intro')bars=4;else if(e.id==='groove'||e.id==='klasik')bars=2;else if(e.id==='trans')bars=1;
      else if(e.id.startsWith('build'))bars=rem>4*bd?2:rem>bd*1.01?1:.5; // yükselişte kesmeler hızlanır
      else bars=k%4===3?2:1;
      if(calm)bars*=4;let d=Math.min(bars*bd,rem);if(rem-d<bd*.4)d=rem;
      const pool=animeOn?(visual==='doga'?(SCN_N[e.id]||SCN_N.drop):visual==='saman'?(SCN_S[e.id]||SCN_S.drop):(SCN_A[e.id]||SCN_A.drop)):(SCN[e.id]||SCN.drop);let sc=pool[(k+si)%pool.length];
      if(sc==='live'&&!t.video)sc=pool[(k+si+1)%pool.length];if(sc===prev)sc=pool[(k+si+2)%pool.length];if(sc==='live'&&!t.video)sc='mandala';
      const tr=k===0?(/drop|klasik|groove/.test(e.id)?'flash':e.id==='trans'?'glitch':'xfade'):(/break|intro/.test(e.id)?'xfade':e.id.startsWith('drop')?(k%2?'zoom':'cut'):e.id==='trans'?'glitch':'cut');
      shots.push({t0:x,t1:x+d,sc,tr,sec:e});prev=sc;x+=d;k++;}
    si+=3;}
  return shots;}
const hsh=n=>{n=Math.imul(n^61,2654435761)>>>0;return ((n^(n>>>15))>>>0)/4294967296;};
function scene(c,name,at,lt,fd,wd,lv,g,e,bass){const W=1280,H=720;if(name.startsWith('n_')){dogaScene(c,name,at,lt,fd,g,e,bass);return;}if(name.startsWith('s_')){samanScene(c,name,at,lt,fd,g,e,bass);return;}if(name.startsWith('a_')){animeScene(c,name,at,lt,fd,g,e,bass);return;}
  if(name==='live'&&lv&&lv.readyState>=2){const z=1.05+lt*.01;c.drawImage(lv,(W-W*z)/2,(H-H*z)/2,W*z,H*z);c.globalCompositeOperation='soft-light';c.fillStyle=g.c;c.globalAlpha*=.5;c.fillRect(0,0,W,H);c.globalCompositeOperation='source-over';c.globalAlpha=1;return;}
  if(name==='live')name='mandala';
  const gr=c.createRadialGradient(W/2,H/2,30,W/2,H/2,820);gr.addColorStop(0,name==='klasik'?'#2a1a05':g.c2);gr.addColorStop(1,'#010107');c.fillStyle=gr;c.fillRect(0,0,W,H);
  c.save();
  if(name==='mandala'){c.translate(W/2,H/2);const r0=130+bass*80;for(let i=0;i<128;i++){const v=fd[i]/255,a=i/128*Math.PI*2+at/4;c.strokeStyle=g.c;c.globalAlpha=.25+v*.75;c.lineWidth=5;c.beginPath();c.moveTo(Math.cos(a)*r0,Math.sin(a)*r0);c.lineTo(Math.cos(a)*(r0+8+v*230),Math.sin(a)*(r0+8+v*230));c.stroke();}
    c.globalAlpha=.5;c.strokeStyle='#fff';c.lineWidth=2;c.rotate(-at/6);for(let k=0;k<6;k++){c.rotate(Math.PI/3);c.beginPath();c.arc(r0*.5,0,r0*.5,0,7);c.stroke();}}
  else if(name==='tunnel'){c.translate(W/2,H/2);for(let i=0;i<16;i++){const r=((i*70+at*(180+bass*400))%1100);c.globalAlpha=Math.min(1,r/400)*.8;c.strokeStyle=i%2?g.c:'#fff';c.lineWidth=2+r/120;c.beginPath();for(let k=0;k<=6;k++){const a=k/6*Math.PI*2+at*.3+i*.1;c.lineTo(Math.cos(a)*r,Math.sin(a)*r);}c.stroke();}}
  else if(name==='bars'){const n=64,bw=W/n;for(let i=0;i<n;i++){const v=fd[i*2]/255,h=v*H*.42;c.fillStyle=g.c;c.globalAlpha=.4+v*.6;c.fillRect(i*bw+1,H/2-h,bw-2,h);c.globalAlpha=.25*v;c.fillRect(i*bw+1,H/2,bw-2,h);}}
  else if(name==='stars'){c.translate(W/2,H/2);const sp=.25+bass*.6;for(let i=0;i<260;i++){const x0=hsh(i)-.5,y0=hsh(i+999)-.5,z=1-((at*sp+hsh(i+77))%1),k=1/(z*3+.05),z2=Math.min(1,z+.03),k2=1/(z2*3+.05);c.strokeStyle=i%5?'#fff':g.c;c.globalAlpha=Math.min(1,(1-z)*1.5);c.lineWidth=1+(1-z)*3;c.beginPath();c.moveTo(x0*W*k2,y0*H*k2);c.lineTo(x0*W*k,y0*H*k);c.stroke();}}
  else if(name==='kilim'){const pal=[g.c,'#b91c1c','#f5f5f4','#1e3a8a','#ca8a04'],s=110+bass*25,off=(at*30)%s;for(let y=-1;y<H/s+1;y++)for(let x=-1;x<W/s+2;x++){const cx2=x*s-off+(y%2?s/2:0),cy=y*s+s/2;for(let l=0;l<4;l++){const r=s/2*(1-l*.23);c.fillStyle=pal[(x+y+l+Math.floor(at/2))%pal.length];c.globalAlpha=.85;c.beginPath();c.moveTo(cx2,cy-r);c.lineTo(cx2+r,cy);c.lineTo(cx2,cy+r);c.lineTo(cx2-r,cy);c.fill();}}
    c.globalAlpha=.55;c.fillStyle='#010107';c.fillRect(0,0,W,H);}
  else if(name==='wave'){for(let tr=0;tr<3;tr++){c.strokeStyle=tr?g.c:'#fff';c.globalAlpha=tr?.3:.9;c.lineWidth=tr?10-tr*3:3;c.beginPath();for(let i=0;i<wd.length;i++){const x=i/wd.length*W,y=H/2+(wd[i]-128)/128*H*.35*(1+tr*.15);i?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();}}
  else if(name==='klasik'){c.strokeStyle='rgba(255,230,180,.5)';c.lineWidth=2;for(let l=0;l<5;l++){const y=300+l*24;c.beginPath();c.moveTo(80,y);c.lineTo(W-80,y);c.stroke();}
    const m=e.motif||MOT[0],sd=60/G[e.key].bpm/4,stp=(at-e.t)/sd;
    for(let j=Math.floor(stp)-40;j<stp+40;j++){const ev=m.on[((j%64)+64)%64];if(!ev||j<0)continue;const x=W*.5+(j-stp)*22,y=420-(ev.m-60)*6;const on=j<=stp&&stp<j+ev.len;c.fillStyle=on?g.c:'rgba(255,240,210,.85)';c.globalAlpha=1;c.beginPath();c.ellipse(x,y,on?13:10,on?9:7,-.4,0,7);c.fill();c.fillRect(x+8,y-50,2,50);}
    c.fillStyle='#fde68a';c.textAlign='center';c.font='italic 700 64px Georgia,serif';c.fillText(m.c.toUpperCase(),W/2,170);c.font='italic 28px Georgia,serif';c.fillStyle='#fff';c.fillText(m.p,W/2,215);}
  c.restore();c.globalAlpha=1;
  if(name!=='klasik'&&name!=='kilim'){c.font='60px serif';c.textAlign='center';c.textBaseline='middle';c.globalAlpha=name==='mandala'?.9:.0;c.fillText(g.ic,W/2,H/2);c.globalAlpha=1;c.textBaseline='alphabetic';}
}
function ease(x){return 1-Math.pow(1-Math.min(1,Math.max(0,x)),3);}
function overlays(c,at,sh,t,g,e,dur){const W=1280,H=720;
  // vinyet + kanal logosu
  const vg=c.createRadialGradient(W/2,H/2,H*.45,W/2,H/2,H*.95);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.55)');c.fillStyle=vg;c.fillRect(0,0,W,H);
  c.textAlign='left';c.fillStyle='rgba(255,255,255,.75)';c.font='900 20px Consolas,monospace';c.fillText(ch(),36,48);c.font='13px Consolas';c.fillStyle='rgba(255,255,255,.5)';c.fillText('OSMAN DJ · LIVE',36,68);
  // bölüm alt yazısı (lower third)
  const ls=at-e.t;if(e.id!=='trans'&&ls<4.5&&at>5){const a=ease(ls/.5)*(ls>4?1-(ls-4)/.5:1),x=-420+ease(ls/.6)*456;c.globalAlpha=a;c.fillStyle='rgba(1,1,7,.75)';c.fillRect(x,H-150,420,92);c.fillStyle=g.c;c.fillRect(x,H-150,6,92);
    c.fillStyle='#fff';c.font='900 34px Consolas,monospace';c.fillText(e.id==='klasik'&&e.motif?'🎻 '+e.motif.c.toUpperCase():(CHN[e.id]||'').toUpperCase(),x+22,H-108);
    c.font='16px Consolas';c.fillStyle=g.c;c.fillText(e.id==='klasik'&&e.motif?`${e.motif.p} × ${(INST_N[g.ki]||'').replace(/^[^ ]+ /,'')}`:(g.sifa?`${g.ic} ${e.freq||528} Hz · doğa sesleri`:`${g.ic} ${g.n} · ${g.bpm} BPM`),x+22,H-76);c.globalAlpha=1;}
  // açılış kartı
  if(at<5.5){const a=at<4.5?1:1-(at-4.5);c.globalAlpha=a;c.fillStyle='rgba(1,1,7,.8)';c.fillRect(0,0,W,H);c.textAlign='center';c.fillStyle='#fff';c.font='900 76px Consolas,monospace';c.fillText(ch(),W/2,H/2-10);
    c.font='22px Consolas';c.fillStyle=g.c;c.fillText('OSMAN DJ · LIVE SET',W/2,H/2+36);c.font='18px Consolas';c.fillStyle='rgba(255,255,255,.7)';c.fillText(gnames(t).join('  →  '),W/2,H/2+72);c.globalAlpha=1;}
  // kapanış kartı
  if(dur-at<8){const a=ease((8-(dur-at))/1.2);c.globalAlpha=a;c.fillStyle='rgba(1,1,7,.78)';c.fillRect(0,0,W,H);c.textAlign='center';c.fillStyle='#f87171';c.font='900 64px Consolas,monospace';c.fillText('🔔 ABONE OL',W/2,H/2-20);
    c.fillStyle='#fff';c.font='900 40px Consolas';c.fillText(ch(),W/2,H/2+40);c.font='18px Consolas';c.fillStyle='rgba(255,255,255,.65)';c.fillText('Anadolu ruhu · elektronik ritim · OSMAN DJ',W/2,H/2+80);c.globalAlpha=1;}
  c.textAlign='left';}
function renderShot(c,sh,at,fd,wd,lv,t,prev,dur){const W=1280,H=720,e=sh.sec,g=G[e.key],lt=at-sh.t0,bass=(fd[1]+fd[2]+fd[3])/765;
  c.save();let z=1;if(sh.tr==='zoom'||sh.tr==='flash')z+=Math.max(0,.09-lt*.3);if(e.id.startsWith('build'))z+=((at-e.t)/Math.max(1,e.end-e.t))*.12;z+=bass*.025;
  c.translate(W/2,H/2);c.scale(z,z);c.translate(-W/2,-H/2);c.globalAlpha=1;scene(c,sh.sc,at,lt,fd,wd,lv,g,e,bass);
  if(sh.tr==='xfade'&&prev&&lt<.9){c.globalAlpha=1-lt/.9;scene(c,prev.sc,at,lt,fd,wd,lv,G[prev.sec.key],prev.sec,bass);c.globalAlpha=1;}
  c.restore();
  if(sh.tr==='flash'&&lt<.28){c.fillStyle=`rgba(255,255,255,${(1-lt/.28)*.85})`;c.fillRect(0,0,W,H);}
  if(sh.tr==='glitch'&&lt<.35){for(let i=0;i<9;i++){const y=Math.floor(hsh(i+Math.floor(at*20))*H),h=8+Math.floor(hsh(i*7)*50);c.drawImage(c.canvas,0,y,W,h,(i%2?24:-24),y,W,h);}c.fillStyle='rgba(255,0,90,.12)';c.fillRect(0,0,W,H);}
  overlays(c,at,sh,t,g,e,dur);}
async function direct(t){
  if(!t.audio)throw new Error('ses yok');
  setAg('clip','proc','ANALİZ',`Kayıt #${t.id}: ses çözülüyor, bölümler okunuyor`,3);
  const buf=await AC.decodeAudioData(await t.audio.arrayBuffer());
  const shots=buildEDL(t);t.shots=shots.length;const dur=buf.duration;
  const sceneN=new Set(shots.map(s=>s.sc)).size;
  feed('KLİP',`🎥 Görüntü Yönetmeni: <em>${shots.length} kesme</em> · ${sceneN} sahne türü · yükselişte kesmeler hızlanıyor, drop'ta flaş, taksimde uzun geçişler`);
  setAg('clip','proc','MONTAJ',`${shots.length} kesme planlandı · render`,5);
  const src=AC.createBufferSource();src.buffer=buf;const an=AC.createAnalyser();an.fftSize=512;const md=AC.createMediaStreamDestination();const pg=AC.createGain();pg.gain.value=$('montMon').checked?1:0;
  $('montMon').onchange=e=>{pg.gain.value=e.target.checked?1:0;};
  src.connect(an);src.connect(md);src.connect(pg);pg.connect(AC.destination);
  let lv=null;if(t.video){lv=document.createElement('video');lv.src=URL.createObjectURL(t.video);lv.muted=true;lv.playsInline=true;try{await lv.play();lv.pause();}catch(e){lv=null;}}
  const vs=dcv.captureStream(30),ms=new MediaStream([...vs.getVideoTracks(),...md.stream.getAudioTracks()]);
  const vm=pick(['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm','video/mp4']);
  const rec=new MediaRecorder(ms,vm?{mimeType:vm,videoBitsPerSecond:6000000}:undefined),chs=[];rec.ondataavailable=e=>{if(e.data.size)chs.push(e.data);};
  const fin=new Promise(r=>rec.onstop=r);$('montBox').style.display='block';
  const fd2=new Uint8Array(256),wd=new Uint8Array(512);let si=0,running=true;
  const frame=()=>{const at=AC.currentTime-t0;if(at<0)return;an.getByteFrequencyData(fd2);an.getByteTimeDomainData(wd);
    while(si<shots.length-1&&at>=shots[si].t1)si++;const sh=shots[si];if(lv&&Math.abs(lv.currentTime-at)>.35)try{lv.currentTime=Math.min(at,lv.duration||at);}catch(e){}
    renderShot(dx,sh,at,fd2,wd,lv,t,shots[si-1],dur);const p=Math.min(100,at/dur*100);$('agp_clip').style.width=p+'%';
    $('montP').textContent=`Kayıt #${t.id} · montaj %${Math.floor(p)} · kesme ${si+1}/${shots.length} · ${sh.sc} · ${CHN[sh.sec.id]||''}`;};
  const raf=()=>{if(!running)return;frame();requestAnimationFrame(raf);};
  rec.start(1000);const t0=AC.currentTime+.15;src.start(t0);if(lv){lv.currentTime=0;lv.play().catch(()=>{});}
  requestAnimationFrame(raf);const bg=setInterval(()=>{if(!running)return clearInterval(bg);if(document.hidden)frame();},66);
  src.onended=()=>{running=false;setTimeout(()=>{try{rec.stop();}catch(e){}},400);};
  await fin;if(lv)lv.pause();
  t.montage=new Blob(chs,{type:(chs[0]&&chs[0].type)||'video/webm'});showMont(t,`${sceneN} sahne`);
  setAg('clip','ok','MONTAJ ✓',`Kayıt #${t.id}: ${shots.length} kesmeli pro klip`,100);
  feed('KLİP',`🎬 <em>Pro klip #${t.id}</em> hazır · ${shots.length} kesme · ${(t.montage.size/1048576).toFixed(1)} MB`);
  $('montP').textContent='Montaj bitti · sıradaki bekleniyor';}

function showMont(t,lab){$('mv_'+t.id).innerHTML=`<video controls src="${URL.createObjectURL(t.montage)}"></video><div class="btns" style="margin-bottom:5px"><button class="bsm g" onclick="dlT(${t.id},'m')">⬇ PRO KLİP</button><span class="note">${t.shots||0} kesme · ${lab} · ${fmt(t.dur)} · ${(t.montage.size/1048576).toFixed(0)} MB</span></div>`;}


return {G,MOT,SEC,INST,INST_N,CHN,HICAZ,HUSEYNI,NEXT,secInfo,playStep,autoBar,renderShot,buildEDL,chapters,fmt,SMP,SMPK,normBuf,
  setOpts(o){if('klasikOn' in o)klasikOn=o.klasikOn;if('klasikSel' in o)klasikSel=o.klasikSel;if('motBase' in o)motBase=o.motBase;if('animeOn' in o)animeOn=o.animeOn;if('visual' in o)visual=o.visual;if('calm' in o)calm=!!o.calm;if('vseed' in o){vseed=o.vseed|0;VC={};}
    if('animeDur' in o)animeDur=o.animeDur;if('useSmp' in o)useSmp=o.useSmp;if('smpReady' in o)smpReady=o.smpReady;if('channel' in o)CHANNEL=o.channel;},
  setCustom(name,buf,root){CUSTOM[name]={buf,root};}};
};
