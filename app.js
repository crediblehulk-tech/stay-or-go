/* ============================================================================
   Stay or Go — Air Force separation & retirement financial planner
   Vanilla JS, no build step, runs entirely on-device.

   HOW TO UPDATE NUMBERS EACH YEAR:
   - VA_BASE / VA_ADD ......... VA disability comp (effective Dec 1; see VA.gov)
   - FED / FICA ............... federal brackets, standard deduction, FICA
   - STATES ................... approximate state income-tax rates + military-
                                retirement exemption flags
   All figures below are 2026 planning ESTIMATES and are intentionally simple.
============================================================================ */

"use strict";

/* ---------------------------------------------------------------------------
   SECTION 1 — DATA TABLES (edit these yearly)
--------------------------------------------------------------------------- */

// VA monthly disability compensation — veteran ALONE (2026 estimate, USD/mo).
const VA_BASE = {0:0,10:180,20:357,30:552,40:796,50:1133,60:1435,70:1808,80:2102,90:2362,100:3938};

// Incremental monthly add-ons for dependents, by rating (2026 estimate).
// Only apply at ratings >= 30%. Values approximate the VA dependent tables.
const VA_ADD = {
  spouse:   {30:60, 40:80, 50:100,60:121,70:141,80:161,90:182,100:202},
  childU18: {30:31, 40:41, 50:51, 60:62, 70:72, 80:82, 90:93, 100:106},
  child18:  {30:100,40:133,50:167,60:200,70:233,80:267,90:300,100:342}, // 18-23 in school
  parent:   {30:49, 40:65, 50:82, 60:98, 70:115,80:131,90:148,100:164}
};

// Federal income tax (2026 estimate). Std deduction + marginal brackets.
const FED = {
  std:      {single:15750, mfj:31500, hoh:23625},
  addlMed:  {single:200000, mfj:250000, hoh:200000}, // 0.9% extra Medicare threshold
  brackets: {
    single:[[0,.10],[11925,.12],[48475,.22],[103350,.24],[197300,.32],[250525,.35],[626350,.37]],
    mfj:   [[0,.10],[23850,.12],[96950,.22],[206700,.24],[394600,.32],[501050,.35],[751600,.37]],
    hoh:   [[0,.10],[17000,.12],[64850,.22],[103350,.24],[197300,.32],[250525,.35],[626350,.37]]
  }
};
const FICA = { ssRate:.062, ssWageBase:182000, medRate:.0145, addlMed:.009 };

// State income tax: approx flat-equivalent rate (%) + does the state tax
// military RETIREMENT pay? (true = taxes it; most states now exempt it).
const STATES = {
  AL:{n:"Alabama",r:5.0,milRetTax:false}, AK:{n:"Alaska",r:0,milRetTax:false},
  AZ:{n:"Arizona",r:2.5,milRetTax:false}, AR:{n:"Arkansas",r:4.4,milRetTax:false},
  CA:{n:"California",r:9.3,milRetTax:true}, CO:{n:"Colorado",r:4.4,milRetTax:false},
  CT:{n:"Connecticut",r:5.5,milRetTax:false}, DE:{n:"Delaware",r:6.6,milRetTax:false},
  DC:{n:"Washington DC",r:8.5,milRetTax:false}, FL:{n:"Florida",r:0,milRetTax:false},
  GA:{n:"Georgia",r:5.39,milRetTax:false}, HI:{n:"Hawaii",r:8.0,milRetTax:false},
  ID:{n:"Idaho",r:5.8,milRetTax:false}, IL:{n:"Illinois",r:4.95,milRetTax:false},
  IN:{n:"Indiana",r:3.0,milRetTax:false}, IA:{n:"Iowa",r:3.8,milRetTax:false},
  KS:{n:"Kansas",r:5.7,milRetTax:false}, KY:{n:"Kentucky",r:4.0,milRetTax:false},
  LA:{n:"Louisiana",r:4.25,milRetTax:false}, ME:{n:"Maine",r:7.15,milRetTax:false},
  MD:{n:"Maryland",r:7.5,milRetTax:false}, MA:{n:"Massachusetts",r:5.0,milRetTax:false},
  MI:{n:"Michigan",r:4.25,milRetTax:false}, MN:{n:"Minnesota",r:7.85,milRetTax:true},
  MS:{n:"Mississippi",r:4.7,milRetTax:false}, MO:{n:"Missouri",r:4.8,milRetTax:false},
  MT:{n:"Montana",r:5.9,milRetTax:true}, NE:{n:"Nebraska",r:5.2,milRetTax:false},
  NV:{n:"Nevada",r:0,milRetTax:false}, NH:{n:"New Hampshire",r:0,milRetTax:false},
  NJ:{n:"New Jersey",r:6.37,milRetTax:false}, NM:{n:"New Mexico",r:4.9,milRetTax:false},
  NY:{n:"New York",r:6.5,milRetTax:false}, NC:{n:"North Carolina",r:4.5,milRetTax:false},
  ND:{n:"North Dakota",r:2.5,milRetTax:false}, OH:{n:"Ohio",r:3.5,milRetTax:false},
  OK:{n:"Oklahoma",r:4.75,milRetTax:false}, OR:{n:"Oregon",r:8.75,milRetTax:true},
  PA:{n:"Pennsylvania",r:3.07,milRetTax:false}, RI:{n:"Rhode Island",r:4.75,milRetTax:false},
  SC:{n:"South Carolina",r:6.2,milRetTax:false}, SD:{n:"South Dakota",r:0,milRetTax:false},
  TN:{n:"Tennessee",r:0,milRetTax:false}, TX:{n:"Texas",r:0,milRetTax:false},
  UT:{n:"Utah",r:4.55,milRetTax:true}, VT:{n:"Vermont",r:7.0,milRetTax:true},
  VA:{n:"Virginia",r:5.75,milRetTax:false}, WA:{n:"Washington",r:0,milRetTax:false},
  WV:{n:"West Virginia",r:5.12,milRetTax:false}, WI:{n:"Wisconsin",r:5.3,milRetTax:false},
  WY:{n:"Wyoming",r:0,milRetTax:false}
};

const BOOK_STIPEND_YR = 1000; // Post-9/11 GI Bill annual books/supplies stipend
const SAFE_WITHDRAW = 0.04;   // "4% rule" annual draw on savings for stop-working path

/* ---------------------------------------------------------------------------
   SECTION 2 — DEFAULT (example) MEMBER
--------------------------------------------------------------------------- */

/* ---- Military pay (2026 ESTIMATE — auto-fills editable fields; confirm vs LES) ---- */
// Air Force grades incl. prior-enlisted officers (O-1E..O-3E).
const GRADES=["E-1","E-2","E-3","E-4","E-5","E-6","E-7","E-8","E-9",
  "O-1","O-1E","O-2","O-2E","O-3","O-3E","O-4","O-5","O-6","O-7","O-8","O-9","O-10"];
const AF_RANK={ "E-1":"Airman Basic","E-2":"Amn","E-3":"A1C","E-4":"SrA","E-5":"SSgt",
  "E-6":"TSgt","E-7":"MSgt","E-8":"SMSgt","E-9":"CMSgt",
  "O-1":"2d Lt","O-1E":"2d Lt (prior-E)","O-2":"1st Lt","O-2E":"1st Lt (prior-E)",
  "O-3":"Capt","O-3E":"Capt (prior-E)","O-4":"Maj","O-5":"Lt Col","O-6":"Col",
  "O-7":"Brig Gen","O-8":"Maj Gen","O-9":"Lt Gen","O-10":"Gen" };
// Years-of-service columns for the pay table.
const PAY_COLS=[0,2,3,4,6,8,10,12,14,16,18,20,22,24,26];
// Monthly basic pay by grade across PAY_COLS (2026 estimate).
const PAY={
  "E-1":[2319,2319,2319,2319,2319,2319,2319,2319,2319,2319,2319,2319,2319,2319,2319],
  "E-2":[2599,2599,2599,2599,2599,2599,2599,2599,2599,2599,2599,2599,2599,2599,2599],
  "E-3":[2733,2906,3081,3081,3081,3081,3081,3081,3081,3081,3081,3081,3081,3081,3081],
  "E-4":[3027,3182,3354,3523,3674,3674,3674,3674,3674,3674,3674,3674,3674,3674,3674],
  "E-5":[2814,3002,3148,3295,3527,3771,3968,3968,3968,3968,3968,3968,3968,3968,3968],
  "E-6":[3072,3382,3532,3677,3828,4168,4302,4560,4638,4695,4695,4695,4695,4695,4695],
  "E-7":[3555,3880,4029,4224,4378,4641,4789,5054,5273,5423,5583,5645,5853,5966,6389],
  "E-8":[5275,5275,5275,5275,5275,5275,5510,5656,5828,6011,6349,6525,6817,6977,7378],
  "E-9":[6254,6254,6254,6254,6254,6254,6254,6396,6576,6786,6997,7337,7623,7924,8388],
  "O-1":[3998,4161,5030,5030,5030,5030,5030,5030,5030,5030,5030,5030,5030,5030,5030],
  "O-1E":[5030,5030,5030,5030,5372,5570,5773,5974,6248,6248,6248,6248,6248,6248,6248],
  "O-2":[4608,5247,6043,6248,6376,6376,6376,6376,6376,6376,6376,6376,6376,6376,6376],
  "O-2E":[6248,6248,6248,6248,6376,6576,6918,7180,7377,7377,7377,7377,7377,7377,7377],
  "O-3":[5332,6044,6524,7113,7455,7828,8067,8466,8671,8671,8671,8671,8671,8671,8671],
  "O-3E":[7113,7113,7113,7113,7455,7828,8067,8466,8799,8989,8989,8989,8989,8989,8989],
  "O-4":[6064,7018,7485,7590,8025,8491,9071,9521,9836,10011,10113,10113,10113,10113,10113],
  "O-5":[7019,7909,8457,8559,8900,9104,9552,9885,10310,10960,11266,11569,11917,11917,11917],
  "O-6":[8430,9262,9869,9869,9903,10329,10385,10385,10976,11545,12130,12720,13051,13391,14047],
  "O-7":[11116,11630,11874,12063,12409,12747,13142,13536,13939,15170,16215,16215,16300,16300,16377],
  "O-8":[13382,13821,14114,14199,14564,15173,15318,15896,16061,16560,17286,17951,18398,18398,18398],
  "O-9":[18908,18908,18908,18908,18908,18908,18908,18908,18908,18908,18908,18908,18908,18908,18908],
  "O-10":[18908,18908,18908,18908,18908,18908,18908,18908,18908,18908,18908,18908,18908,18908,18908]
};
// National-average BAH WITH dependents by grade (2026 estimate, monthly). Without-deps ≈ x0.88.
const BAS_ENL=466, BAS_OFF=321; // 2026 estimate monthly

// BAH model: a representative E-5 (with dependents) monthly rate per ZIP3 region,
// scaled to any grade by BAH_GRADE_MULT. 2026 ESTIMATES — confirm on the official DoD
// BAH calculator; the BAH field always stays editable.
const NAT_E5_BAH=1900; // national fallback when the ZIP isn't in the table
const BAH_GRADE_MULT={ "E-1":.83,"E-2":.83,"E-3":.87,"E-4":.91,"E-5":1,"E-6":1.10,"E-7":1.18,"E-8":1.26,"E-9":1.33,
  "O-1":1.02,"O-1E":1.10,"O-2":1.13,"O-2E":1.18,"O-3":1.30,"O-3E":1.34,"O-4":1.45,"O-5":1.55,"O-6":1.62,
  "O-7":1.66,"O-8":1.68,"O-9":1.70,"O-10":1.72 };
// First 3 ZIP digits -> E-5-with-dependents monthly BAH (2026 estimate). Covers major
// metros and Air Force base areas; unknown ZIPs fall back to NAT_E5_BAH.
const BAH_ZIP3={
  "200":2700,"201":2700,"202":2700,"203":2700,"204":2700,"205":2700,"206":2500,"207":2500,"208":2500,"209":2500,
  "220":2550,"221":2550,"222":2600,"223":2600,"224":2300,"225":2000,"226":2000,
  "233":2000,"234":2000,"235":2000,"236":2100,"237":2000,"238":2000,
  "100":3200,"101":3200,"102":3200,"103":3300,"104":3300,"105":2600,"110":2900,"111":2900,"112":3000,"113":2900,"114":2900,
  "070":2600,"071":2500,"072":2500,"073":2500,"074":2400,"076":2500,"077":2700,"079":2600,
  "021":3300,"022":3300,"023":3100,"024":3100,"019":2600,"020":2600,
  "189":2000,"190":2100,"191":2100,"152":1700,
  "606":2200,"605":2100,"604":2000,"554":1900,"553":1900,"482":1700,"432":1700,"441":1700,"452":1600,"453":1700,"454":1700,
  "800":2200,"801":2200,"802":2300,"803":1900,"808":1900,"809":1900,
  "840":1800,"841":1900,"843":1700,"844":1800,
  "870":1700,"871":1700,"875":1600,"880":1300,"881":1300,"883":1300,
  "850":1800,"851":1800,"852":1900,"853":1900,"856":1800,"857":1800,
  "889":2000,"890":2000,"891":2000,"894":1500,"895":1500,
  "900":3200,"902":3200,"903":2900,"904":3100,"905":3000,"906":2900,"907":2900,"908":2900,"913":2900,"914":3000,"915":2800,"916":2700,"917":2600,"918":2600,
  "919":3100,"920":3500,"921":3500,"922":2300,"923":2400,"924":2300,"925":2300,"926":2900,"927":2900,"928":2900,
  "940":4400,"941":4500,"943":4200,"944":4000,"945":3300,"946":3500,"947":3500,"948":3500,"949":3700,"950":3400,"951":3200,
  "956":2200,"957":2300,"958":2200,"959":2300,"936":1600,"937":1600,"939":2000,
  "970":2100,"972":2200,"973":1900,"980":2800,"981":2900,"982":2500,"983":2300,"984":2300,"985":2200,"986":2100,"990":1700,"992":1700,
  "967":3200,"968":3300,"995":2100,"996":1900,"997":1900,"998":1800,"999":1800,
  "320":1600,"321":2200,"322":2000,"323":1700,"324":1800,"325":1900,"326":1700,"327":2100,"328":2200,"329":2300,
  "330":2500,"331":2600,"333":2400,"334":2400,"335":2300,"336":2400,"337":2100,"338":1900,"339":2200,"341":2400,
  "300":2000,"303":2000,"310":1500,"312":1900,"313":1700,"316":1500,"319":1500,
  "270":1600,"272":1700,"275":1600,"276":1600,"277":1700,"278":1500,"279":1600,"280":1700,"282":1700,"283":1600,
  "290":1500,"291":1500,"294":1600,"296":1700,
  "350":1600,"360":1500,"361":1500,"365":1600,"390":1500,"392":1600,"395":1600,"396":1500,
  "370":1800,"371":1800,"379":1700,"381":1800,"402":1700,"404":1600,"406":1500,
  "700":1900,"701":1800,"703":1700,"707":1600,"710":1500,"711":1500,"713":1600,
  "720":1500,"721":1600,"722":1600,"631":1700,"641":1700,"650":1500,"653":1500,"656":1500,
  "660":1700,"662":1700,"671":1500,"672":1500,"730":1600,"731":1600,"735":1500,"736":1500,"740":1600,
  "750":1900,"751":1700,"752":1900,"760":1800,"761":1800,"762":1700,"763":1400,"765":1600,"770":2200,"772":2000,"773":2000,"774":2000,"775":1900,
  "780":1900,"781":1900,"782":1900,"786":2000,"787":2000,"788":1300,"790":1500,"791":1500,"792":1400,"793":1400,"795":1400,"796":1400,"798":1500,"799":1500,
  "590":1500,"591":1600,"594":1500,"598":1500,"820":1700,"828":1700,"829":1600,
  "580":1600,"581":1500,"582":1500,"587":1600,"570":1500,"577":1700,"680":1700,"681":1700,"683":1500,
  "197":1900,"198":1900,"199":1900,"836":1600,"837":1500,"532":1900,"537":1800,"462":1700,"463":1700
};

function bracketIndex(yos){ let i=0; for(let k=0;k<PAY_COLS.length;k++){ if(num(yos)>=PAY_COLS[k]) i=k; else break; } return i; }
function basePayFor(grade,yos){ const row=PAY[grade]; return row?(row[bracketIndex(yos)]||row[row.length-1]):0; }
function basFor(grade){ return /^E/.test(grade)?BAS_ENL:BAS_OFF; }
function bahForZip(zip,grade,married){
  const z=String(zip||"").replace(/\D/g,"").slice(0,3);
  const e5=BAH_ZIP3[z]||NAT_E5_BAH;
  return Math.round(e5*(BAH_GRADE_MULT[grade]||1)*(married?1:0.88));
}

function defaultState(){
  return {
    profile:{name:"Example Member",grade:"E-7",system:"high3",yos:16,planYOS:20,
             high3Base:0,filing:"mfj",homeState:"TX"},
    pay:{base:5400,bah:2400,bas:465,special:0,healthcareGap:9000,zip:""},
    va:{rating:50,pt:false},
    family:{married:true,kidsU18:2,kids1823:0,parents:0,spouseIncome:3000,spouseOther:0},
    loc:{curName:"Current base",curCOL:100,destName:"Destination",destState:"TX",destCOL:100,expenses:0},
    savings:{tsp:120000,other:30000,spouseInvest:0},
    jobs:{expectedCivSalary:180000,reserveCivSalary:80000,reserveDrillMonthly:700},
    edu:{selfSchool:false,mha:0,expectedPostGrad:0,transfer:false,transferDeps:0}
  };
}

let STATE = loadState();

/* ---------------------------------------------------------------------------
   SECTION 3 — SMALL UTILITIES
--------------------------------------------------------------------------- */

const $  = (s,root=document)=>root.querySelector(s);
const $$ = (s,root=document)=>Array.from(root.querySelectorAll(s));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const num=v=>{const n=parseFloat(v);return isFinite(n)?n:0;};

function money(n){
  const r=Math.round(num(n));
  return (r<0?"-$":"$")+Math.abs(r).toLocaleString("en-US");
}
function money0(n){return money(n);}                 // whole dollars
function pct(n){return Math.round(n*100)+"%";}

function getPath(obj,path){return path.split(".").reduce((o,k)=>(o==null?o:o[k]),obj);}
function setPath(obj,path,val){
  const ks=path.split("."); let o=obj;
  for(let i=0;i<ks.length-1;i++) o=o[ks[i]];
  o[ks[ks.length-1]]=val;
}

function loadState(){
  try{
    const raw=localStorage.getItem("sog-state");
    if(raw){
      const def=defaultState(), parsed=JSON.parse(raw), out={};
      // Deep-merge one level so newly-added fields (e.g. profile.grade) fall back to defaults.
      for(const k in def){
        out[k] = (def[k] && typeof def[k]==="object" && !Array.isArray(def[k]))
          ? Object.assign({}, def[k], parsed[k]||{})
          : (parsed[k]!==undefined ? parsed[k] : def[k]);
      }
      return out;
    }
  }catch(e){}
  return defaultState();
}
function saveState(){
  try{
    localStorage.setItem("sog-state",JSON.stringify(STATE));
    const n=$("#saveNote"); if(n){n.hidden=false; clearTimeout(saveState._t); saveState._t=setTimeout(()=>n.hidden=true,1500);}
  }catch(e){}
}

/* ---------------------------------------------------------------------------
   SECTION 4 — TAX & INCOME MATH
--------------------------------------------------------------------------- */

// Federal income tax on a GROSS income (applies standard deduction).
function federalTax(gross,filing){
  const f=FED.brackets[filing]||FED.brackets.single;
  let taxable=Math.max(0,gross-(FED.std[filing]||FED.std.single));
  let tax=0;
  for(let i=0;i<f.length;i++){
    const lo=f[i][0], rate=f[i][1];
    const hi=(i+1<f.length)?f[i+1][0]:Infinity;
    if(taxable>lo) tax+=(Math.min(taxable,hi)-lo)*rate; else break;
  }
  return tax;
}

// FICA payroll tax on a wage base.
function ficaTax(wages,filing){
  const ss=FICA.ssRate*Math.min(wages,FICA.ssWageBase);
  const med=FICA.medRate*wages + FICA.addlMed*Math.max(0,wages-(FED.addlMed[filing]||200000));
  return ss+med;
}

function stateRate(code){return (STATES[code]?STATES[code].r:0)/100;}
function stateTaxesMilRet(code){return STATES[code]?STATES[code].milRetTax:false;}

// State income tax (flat-rate approximation). isMilRet => may be exempt.
function stateTax(income,code,isMilRet){
  if(isMilRet && !stateTaxesMilRet(code)) return 0;
  return Math.max(0,income)*stateRate(code);
}

// Civilian net (take-home) from gross salary.
function netCivilian(gross,state,filing){
  if(gross<=0) return 0;
  return gross - federalTax(gross,filing) - ficaTax(gross,filing) - stateTax(gross,state,false);
}

// Invert: gross salary required to net a target (binary search; monotonic).
function grossForNet(targetNet,state,filing){
  if(targetNet<=0) return 0;
  let lo=0, hi=3000000;
  for(let i=0;i<64;i++){
    const mid=(lo+hi)/2;
    if(netCivilian(mid,state,filing)<targetNet) lo=mid; else hi=mid;
  }
  return hi;
}

/* ---------------------------------------------------------------------------
   SECTION 5 — VA & PENSION
--------------------------------------------------------------------------- */

function vaMonthly(s){
  const r=clamp(Math.round(num(s.va.rating)/10)*10,0,100);
  let amt=VA_BASE[r]||0;
  if(r>=30){
    if(s.family.married) amt+=VA_ADD.spouse[r]||0;
    amt+=(num(s.family.kidsU18))*(VA_ADD.childU18[r]||0);
    amt+=(num(s.family.kids1823))*(VA_ADD.child18[r]||0);
    amt+=(num(s.family.parents))*(VA_ADD.parent[r]||0);
  }
  return amt;
}

// Gross monthly pension (base pay only counts; only meaningful at >=20 yrs).
function pensionGrossMonthly(s){
  const sys=s.profile.system;
  if(sys==="separating") return 0;
  const yos=num(s.profile.planYOS);
  if(yos<20) return 0; // no pension before the 20-year cliff
  const mult=(sys==="brs"?0.02:0.025)*yos;
  const high3=num(s.profile.high3Base)>0?num(s.profile.high3Base):num(s.pay.base);
  return high3*mult;
}

// Combined retired-pay + VA, modeling the offset / CRDP rule.
// Returns {cashMonthly, taxFreeMonthly, taxableMonthly}.
function retiredIncome(s){
  const pension=pensionGrossMonthly(s);
  const va=vaMonthly(s);
  const rating=num(s.va.rating);
  if(pension<=0) return {cashMonthly:va,taxFreeMonthly:va,taxableMonthly:0,pension:0,va:va,crdp:false};
  if(rating>=50){
    // CRDP: keep full pension + full VA, VA portion tax-free
    return {cashMonthly:pension+va,taxFreeMonthly:va,taxableMonthly:pension,pension,va,crdp:true};
  }
  // VA waiver: waive pension up to VA amount; that portion becomes tax-free
  const waive=Math.min(pension,va);
  return {cashMonthly:pension-waive+va, taxFreeMonthly:va, taxableMonthly:pension-waive, pension, va, crdp:false};
}

// Net monthly of a retired-income object (taxes the taxable pension portion).
function retiredNetMonthly(s){
  const ri=retiredIncome(s);
  const taxableYr=ri.taxableMonthly*12;
  const fed=federalTax(taxableYr,s.profile.filing);
  const st=stateTax(taxableYr,s.loc.destState,true); // military retirement: maybe exempt
  const netTaxable=ri.taxableMonthly - (fed+st)/12;
  return netTaxable + ri.taxFreeMonthly;
}

/* ---------------------------------------------------------------------------
   SECTION 6 — THE SCENARIO ENGINE
--------------------------------------------------------------------------- */

function compute(s){
  const filing=s.profile.filing;
  const vaM=vaMonthly(s);
  const vaYr=vaM*12;

  // --- Current military "spendable" (take-home + tax-free allowances) ---
  const milTaxableYr=(num(s.pay.base)+num(s.pay.special))*12;
  const milFed=federalTax(milTaxableYr,filing);
  const milFica=ficaTax(milTaxableYr,filing);
  const milState=stateTax(milTaxableYr,s.profile.homeState,false);
  const milTakeHomeYr=milTaxableYr-milFed-milFica-milState;
  const allowancesYr=(num(s.pay.bah)+num(s.pay.bas))*12;
  const spendableYr=milTakeHomeYr+allowancesYr;        // money to live on, per year
  const spendableMo=spendableYr/12;

  const colRatio = num(s.loc.destCOL)/Math.max(1,num(s.loc.curCOL)); // dest vs current
  // Convert a destination-dollar amount into today's purchasing power
  const toPP = x => x * (num(s.loc.curCOL)/Math.max(1,num(s.loc.destCOL)));

  // --- Household streams: spouse employment (net) + other income + investments ---
  const spouseNetMo   = netCivilian(num(s.family.spouseIncome)*12, s.loc.destState, filing)/12;
  const spouseOtherMo = num(s.family.spouseOther);
  const spouseTotalMo = s.family.married ? spouseNetMo + spouseOtherMo : 0;
  const householdSavings = num(s.savings.tsp)+num(s.savings.other)+num(s.savings.spouseInvest);
  const hcGapMo = num(s.pay.healthcareGap)/12;

  // --- Lifestyle target = current HOUSEHOLD spendable (member mil pay + spouse) ---
  const targetMo = spendableMo + spouseTotalMo;
  const destTargetMo = num(s.loc.expenses)>0 ? num(s.loc.expenses) : targetMo*colRatio;

  // Combine a member's destination-$ monthly income with the (constant) spouse
  // contribution, then express the household total in today's purchasing power.
  const household = memberMo => toPP(memberMo + spouseTotalMo);

  // --- Required civilian salary so the MEMBER replaces their own military pay ---
  const requiredNetYr = Math.max(0, spendableMo*colRatio*12 + num(s.pay.healthcareGap) - vaYr);
  const requiredGross = grossForNet(requiredNetYr, s.loc.destState, filing);

  const ri = retiredIncome(s);
  const retiredNetMo = retiredNetMonthly(s);
  const willRetire = s.profile.system!=="separating" && num(s.profile.planYOS)>=20;

  // --- Retire-at-20 vs. a civilian paycheck (the "lost pension" tradeoff) ---
  const high3b = num(s.profile.high3Base)>0 ? num(s.profile.high3Base) : num(s.pay.base);
  const mult20 = (s.profile.system==="brs"?0.02:0.025)*20;
  const pension20Gross = high3b*mult20;                                   // monthly gross pension at 20 yrs
  const p20TaxYr = pension20Gross*12;
  const pension20Net = pension20Gross - (federalTax(p20TaxYr,filing)+stateTax(p20TaxYr,s.loc.destState,true))/12;
  const pensionSalaryEquiv = grossForNet(pension20Net*12, s.loc.destState, filing); // civilian salary netting the same
  const pensionLifetime30 = pension20Gross*12*30;                         // nominal 30-yr value (before COLA)
  const neverWorkMo = pension20Net + vaM + spouseTotalMo + householdSavings*SAFE_WITHDRAW/12;
  const tradeoff = {
    pension20Gross, pension20Net, pensionSalaryEquiv, pensionLifetime30,
    neverWorkMo, neverWorkMatch: neverWorkMo/Math.max(1,targetMo),
    neverWorkGapMo: Math.max(0, targetMo-neverWorkMo),
    expectedCiv: num(s.jobs.expectedCivSalary), crdp50: num(s.va.rating)>=50, system: s.profile.system
  };

  /* ---- Build the five scenarios. Each: monthly HOUSEHOLD purchasing-power net. ---- */
  const scn = [];

  // 1) STAY to 20 & retire
  {
    const ppMo = spendableMo + spouseTotalMo; // stays at current location & pay
    scn.push({
      id:"stay", short:"Stay to 20", name:"Stay to "+num(s.profile.planYOS)+" & retire",
      sub: willRetire ? "Keep current pay now, unlock a pension for life" : "Keep serving toward the 20-year cliff",
      ppMo, matchVs:targetMo,
      future: willRetire ? "Pension ≈ "+money(ri.pension)+"/mo for life"+(ri.crdp?" + full VA (CRDP)":"") : "No pension yet — "+(20-num(s.profile.planYOS)>0?(20-num(s.profile.planYOS))+" yrs to vesting":"vesting soon"),
      bullets:[
        willRetire ? ("Lifetime pension: "+money(ri.pension)+"/mo gross ("+(s.profile.system==="brs"?"BRS 2.0%":"High-3 2.5%")+" × "+num(s.profile.planYOS)+" yrs)") : "Pension is forfeited if you leave before 20 years",
        ri.crdp ? ("50%+ rating ⇒ CRDP: draw pension AND "+money(ri.va)+"/mo VA, both") : (vaM>0?("VA "+money(vaM)+"/mo begins at separation/retirement"):"No VA compensation entered"),
        spouseTotalMo>0?("Plus spouse "+money(spouseTotalMo)+"/mo — household keeps 100%"):"Tricare retiree health coverage continues",
        "Keeps full BAH/BAS tax advantage while serving"
      ],
      tag: willRetire?["good","Pension secured"]:["warn","Not yet vested"]
    });
  }

  // 2) SEPARATE -> civilian job (take the expected offer)
  {
    const jobNetMo = netCivilian(num(s.jobs.expectedCivSalary), s.loc.destState, filing)/12;
    const ppMo = household(jobNetMo + vaM - hcGapMo);
    scn.push({
      id:"civ", short:"Civilian job", name:"Separate → civilian job",
      sub:"Take the "+money(s.jobs.expectedCivSalary)+"/yr offer in "+s.loc.destName,
      ppMo, matchVs:targetMo,
      future:"Member needs ≈ "+money(requiredGross)+"/yr to fully match today",
      bullets:[
        "Offer nets ≈ "+money(jobNetMo)+"/mo after "+(STATES[s.loc.destState]?STATES[s.loc.destState].n:"")+" taxes",
        vaM>0?("+ "+money(vaM)+"/mo tax-free VA, − "+money(hcGapMo)+"/mo for healthcare"):("− "+money(hcGapMo)+"/mo to replace Tricare"),
        spouseTotalMo>0?("+ spouse "+money(spouseTotalMo)+"/mo"):"Single-income household",
        num(s.jobs.expectedCivSalary)>=requiredGross?"This salary meets your match target ✓":("Gap to full match: "+money(requiredGross-num(s.jobs.expectedCivSalary))+"/yr salary")
      ],
      tag: ppMo>=targetMo?["good","Matches lifestyle"]:["warn","Below target"]
    });
  }

  // 3) SEPARATE -> full-time school on the GI Bill (opt-in)
  {
    const optIn = !!s.edu.selfSchool;
    const memberMo = num(s.edu.mha) + (num(s.edu.mha)>0?BOOK_STIPEND_YR/12:0) + vaM;
    const ppMo = household(memberMo);
    const postGradNetMo = netCivilian(num(s.edu.expectedPostGrad), s.loc.destState, filing)/12;
    scn.push({
      id:"school", short:"School", name:"Separate → school (GI Bill)", optIn,
      sub: optIn ? ("Live on benefits while you retrain, then earn "+money(s.edu.expectedPostGrad)+"/yr")
                 : "Opt in under “Education benefits” to model this path",
      ppMo, matchVs:targetMo,
      future: optIn ? ("After degree ≈ "+money(household(postGradNetMo+vaM))+"/mo net")
                    : "Not counted until you opt in",
      bullets: optIn ? [
        "GI Bill housing (MHA): "+money(s.edu.mha)+"/mo, tax-free",
        "Tuition covered (in-state public); Yellow Ribbon for private",
        vaM>0?("+ "+money(vaM)+"/mo VA"):"No VA",
        spouseTotalMo>0?("+ spouse "+money(spouseTotalMo)+"/mo keeps the lights on"):"A 2–4 yr bridge — income dips, then jumps post-degree"
      ] : [
        "Check “Member plans to use the GI Bill for school” and enter your housing rate to model living on benefits while you retrain."
      ],
      tag: optIn ? (ppMo>=targetMo*0.85?["good","Sustainable bridge"]:["warn","Lean years"]) : ["warn","Opt-in"]
    });
  }

  // 4) SEPARATE -> Guard / Reserve + civilian job
  {
    const resJobNetMo = netCivilian(num(s.jobs.reserveCivSalary), s.loc.destState, filing)/12;
    const drillNetMo = num(s.jobs.reserveDrillMonthly)*0.85; // lightly taxed
    const ppMo = household(resJobNetMo + drillNetMo + vaM - Math.min(hcGapMo,250)); // TRS keeps health cheap
    scn.push({
      id:"reserve", short:"Reserve", name:"Separate → Guard/Reserve",
      sub:"Civilian job + part-time service",
      ppMo, matchVs:targetMo,
      future:"Reserve pension at age 60 (points-based)",
      bullets:[
        "Civilian "+money(s.jobs.reserveCivSalary)+"/yr nets ≈ "+money(resJobNetMo)+"/mo",
        "+ drill/AT ≈ "+money(drillNetMo)+"/mo"+(spouseTotalMo>0?(" + spouse "+money(spouseTotalMo)+"/mo"):""),
        "TRICARE Reserve Select keeps health costs low",
        "Builds a future ('gray area') reserve pension at 60"
      ],
      tag: ppMo>=targetMo?["good","Matches + future pension"]:["warn","Below target"]
    });
  }

  // 5) SEPARATE -> stop working entirely (live off VA / pension / savings + spouse)
  {
    const drawMo = householdSavings*SAFE_WITHDRAW/12;
    const passiveMo = (willRetire?retiredNetMo:vaM) + drawMo; // member-side passive (dest $)
    const incomeMo = passiveMo + spouseTotalMo;               // full household (dest $)
    const ppMo = toPP(incomeMo);
    const gapMo = Math.max(0, destTargetMo - incomeMo);
    const runwayYrs = gapMo>0 && householdSavings>0 ? householdSavings/(gapMo*12) : Infinity;
    scn.push({
      id:"stop", short:"Stop work", name:"Separate → stop working",
      sub:"Can the household afford NOT to work?",
      ppMo, matchVs:targetMo,
      future: gapMo<=0 ? "Self-sustaining — no earned income needed" :
              (isFinite(runwayYrs)? ("Savings cover the gap ≈ "+runwayYrs.toFixed(1)+" yrs"):"Savings can't cover the gap"),
      bullets:[
        willRetire?("Retired pay (net) "+money(retiredNetMo)+"/mo"):(vaM>0?("VA "+money(vaM)+"/mo tax-free"):"No VA / no pension — little passive income"),
        spouseTotalMo>0?("Spouse "+money(spouseTotalMo)+"/mo"):"No spouse income",
        "4% safe draw on "+money(householdSavings)+" savings ≈ "+money(drawMo)+"/mo",
        gapMo<=0?"Passive income already meets your target ✓":("Monthly gap to cover: "+money(gapMo))
      ],
      tag: gapMo<=0?["good","Financially independent"]:(isFinite(runwayYrs)&&runwayYrs>10?["warn","Long runway"]:["bad","Not sustainable"])
    });
  }

  // Match % for each + pick "best" (highest household match)
  scn.forEach(x=>{ x.match = x.ppMo / Math.max(1,targetMo); });
  const eligible = scn.filter(x=>x.optIn!==false); // opted-out paths can't be "recommended"
  let best = eligible.reduce((a,b)=> b.match>a.match+0.001 ? b : a, eligible[0]);

  return {
    filing, vaM, vaYr, spendableMo, spendableYr, targetMo, destTargetMo,
    requiredGross, requiredNetYr, ri, retiredNetMo, willRetire, tradeoff,
    colRatio, spouseNetMo, spouseTotalMo, householdSavings, scn, best, milTakeHomeYr, allowancesYr
  };
}

/* ---------------------------------------------------------------------------
   SECTION 7 — DECISION LOGIC (stay vs go) + REASONS
--------------------------------------------------------------------------- */

function decide(s,R){
  const yos=num(s.profile.planYOS), rating=num(s.va.rating);
  const nearCliff = s.profile.system!=="separating" && yos>=18 && yos<20;
  const reasons=[]; let verdict, path;

  if(nearCliff){
    verdict="Lean STAY"; path="stay";
    reasons.push("You're inside the 20-year cliff window — leaving now forfeits a lifetime pension worth "+money(pensionGrossMonthly({...s,profile:{...s.profile,planYOS:20}}))+"/mo. Two more years is usually worth it.");
  } else if(R.willRetire && rating>=50){
    verdict="STAY pays off — but going is viable"; path="stay";
    reasons.push("At 20+ years with a "+rating+"% rating you qualify for CRDP: you'd draw the full pension AND full VA ("+money(R.ri.va)+"/mo) at the same time. That combination is hard to replace with a salary.");
  } else if(R.best.id==="stop"){
    verdict="You may not need to work"; path="stop";
    reasons.push("Your passive income (VA"+(R.willRetire?" + pension":"")+(num(s.family.spouseIncome)>0?" + spouse":"")+" + savings) covers your target lifestyle.");
  } else if(R.best.id==="school"){
    verdict="GO — retrain first"; path="school";
    reasons.push("The GI Bill lets you cover housing while you build a higher-earning career path. Income dips for a couple years, then "+money(s.edu.expectedPostGrad)+"/yr.");
  } else if(R.best.id==="reserve"){
    verdict="GO — keep one foot in (Reserve)"; path="reserve";
    reasons.push("A civilian job plus the Guard/Reserve matches your lifestyle now and still builds a reserve pension for age 60.");
  } else if(num(s.jobs.expectedCivSalary)>=R.requiredGross){
    verdict="GO — the offer matches"; path="civ";
    reasons.push("Your "+money(s.jobs.expectedCivSalary)+"/yr offer clears the "+money(R.requiredGross)+"/yr you need to match today's lifestyle in "+s.loc.destName+".");
  } else if(s.profile.system==="separating"){
    verdict="Mind the gap before you go"; path="civ";
    reasons.push("To fully match today you'd need ≈ "+money(R.requiredGross)+"/yr in "+s.loc.destName+" — about "+money(R.requiredGross-num(s.jobs.expectedCivSalary))+"/yr above your current offer. Close it with salary, a cheaper locality, or VA.");
  } else {
    verdict="STAY is the safer financial bet"; path="stay";
    reasons.push("No civilian path here clearly beats keeping your pay and marching toward the pension.");
  }

  // Always-relevant context
  if(rating>=30 && s.family.married) reasons.push("Your VA rating includes dependent add-ons — "+money(R.vaM)+"/mo tax-free, which is worth roughly "+money(grossForNet(R.vaM*12,s.loc.destState,s.profile.filing))+"/yr of pre-tax salary.");
  if(num(s.loc.destCOL)<num(s.loc.curCOL)) reasons.push(s.loc.destName+" is cheaper than where you are ("+num(s.loc.destCOL)+" vs "+num(s.loc.curCOL)+" cost index), so a smaller salary stretches further there.");
  if(num(s.loc.destCOL)>num(s.loc.curCOL)) reasons.push(s.loc.destName+" costs more than your current area, so you'll need extra income just to break even.");
  if(s.profile.system==="brs") reasons.push("Under BRS your TSP (with the government match) is yours to keep even if you separate — portable retirement savings the legacy system doesn't give.");

  return {verdict, path, reasons};
}

/* ---------------------------------------------------------------------------
   SECTION 8 — RENDERING: SUMMARY, SCENARIOS, EDU, CHECKLIST
--------------------------------------------------------------------------- */

function matchColor(m){ return m>=1?"var(--good)": m>=0.85?"var(--gold)": m>=0.6?"var(--warn)":"var(--bad)"; }

function renderSummary(s,R){
  const who=s.profile.name?s.profile.name+" — ":"";
  $("#summaryBody").innerHTML=`
    <div class="headline">
      <h3>${who}to keep today's lifestyle in ${s.loc.destName}</h3>
      <div class="big">${money(R.requiredGross)}<small> /yr civilian salary</small></div>
      <p class="muted" style="color:#cdd8ea;margin-top:6px">
        That's the pre-tax pay a civilian job needs so that — after ${STATES[s.loc.destState]?STATES[s.loc.destState].n:""} taxes,
        replacing Tricare, and crediting ${money(R.vaM)}/mo of VA — you net the same lifestyle you live on now.
      </p>
    </div>
    <div class="stat-row">
      <div class="stat"><div class="k">Today's spendable</div><div class="v">${money(R.spendableMo)}</div><div class="sub">/mo, incl. tax-free BAH/BAS</div></div>
      <div class="stat"><div class="k">VA (tax-free)</div><div class="v">${money(R.vaM)}</div><div class="sub">/mo at ${num(s.va.rating)}%${s.family.married&&num(s.va.rating)>=30?" w/ dependents":""}</div></div>
      <div class="stat"><div class="k">${R.willRetire?"Pension at retirement":"Pension status"}</div><div class="v">${R.willRetire?money(R.ri.pension):"—"}</div><div class="sub">${R.willRetire?(R.ri.crdp?"/mo + full VA (CRDP)":"/mo for life"):"Not vested until 20 yrs"}</div></div>
      <div class="stat"><div class="k">Best-matching path</div><div class="v" style="font-size:1.05rem">${R.best.name}</div><div class="sub">${pct(R.best.match)} of today's lifestyle</div></div>
    </div>
    ${R.willRetire&&num(s.va.rating)>=50?`<div class="callout gold"><strong>Big lever:</strong> staying to ${num(s.profile.planYOS)} with a ${num(s.va.rating)}% rating triggers <strong>CRDP</strong> — you collect the full ${money(R.ri.pension)}/mo pension <em>and</em> the full ${money(R.ri.va)}/mo VA at once. Replacing that with salary alone would take roughly ${money(grossForNet((R.ri.pension+R.ri.va)*12,s.loc.destState,s.profile.filing))}/yr.</div>`:""}
    <div class="callout"><strong>How to read this:</strong> the scenarios below convert every path to <em>today's purchasing power</em> in your current area, so a 100% match means "same lifestyle you have now."</div>
  `;
}

function renderTradeoff(s,R){
  const t=R.tradeoff;
  const leaving = t.system==="separating";
  const intro = leaving
    ? `By separating before 20 years you give up the pension you'd earn at 20. Here's what that walked-away retirement is worth — and the civilian salary it would take to replace it.`
    : `A 20-year pension is deferred pay you collect for life without working. Here's what it's worth, and the civilian salary it would take to match it.`;

  const a=t.pensionSalaryEquiv, b=t.expectedCiv;
  const maxV=Math.max(a,b,1)*1.15;
  const bar=(label,val,color,note)=>{
    const w=Math.max(3,val/maxV*100);
    return `<div class="cmp-row"><div class="cmp-label">${label}</div>
      <div class="cmp-track"><i style="width:${w}%;background:${color}"></i><span class="cmp-val">${money(val)}/yr</span></div>
      <div class="cmp-note">${note}</div></div>`;
  };
  const clears = b>=a, diff=Math.abs(b-a);

  $("#tradeoffBody").innerHTML=`
    <div class="headline tradeoff-head">
      <h3>Retire at 20 &amp; never work again — what it's worth</h3>
      <div class="big">${money(t.pension20Gross)}<small> /mo pension, for life</small></div>
      <p class="muted" style="color:#cdd8ea;margin-top:6px">${intro}</p>
    </div>

    <div class="stat-row">
      <div class="stat"><div class="k">Pension take-home</div><div class="v">${money(t.pension20Net)}</div><div class="sub">/mo after taxes</div></div>
      <div class="stat"><div class="k">Equals a salary of</div><div class="v">${money(t.pensionSalaryEquiv)}</div><div class="sub">/yr you'd work for</div></div>
      <div class="stat"><div class="k">30-year value</div><div class="v">${money(t.pensionLifetime30)}</div><div class="sub">before COLA raises</div></div>
      <div class="stat"><div class="k">Retire &amp; don't work</div><div class="v">${money(t.neverWorkMo)}</div><div class="sub">/mo household · ${pct(t.neverWorkMatch)} of lifestyle</div></div>
    </div>

    <div class="tradeoff-cards">
      <div class="to-card retire">
        <h4>🏝️ Retire at 20, never work again</h4>
        <div class="to-big">${money(t.neverWorkMo)}<small> /mo</small></div>
        <p>Pension ${money(t.pension20Net)}${R.vaM>0?(" + VA "+money(R.vaM)):""}${R.spouseTotalMo>0?(" + spouse "+money(R.spouseTotalMo)):""} + savings draw — for <strong>zero hours of work</strong>.</p>
        ${t.neverWorkGapMo<=0
          ? `<span class="tag good">Covers your lifestyle — financially free</span>`
          : `<span class="tag warn">${money(t.neverWorkGapMo)}/mo short of today's lifestyle</span>`}
      </div>
      <div class="to-card work">
        <h4>💼 Match it with a civilian job</h4>
        <div class="to-big">${money(t.pensionSalaryEquiv)}<small> /yr</small></div>
        <p>The salary a civilian must earn — <strong>every year, by working</strong> — just to take home what the pension pays for free.</p>
        ${clears
          ? `<span class="tag good">Your ${money(b)}/yr expectation clears it by ${money(diff)}</span>`
          : `<span class="tag bad">Your ${money(b)}/yr expectation is ${money(diff)} short</span>`}
      </div>
    </div>

    <div class="chart-block" style="margin-top:18px">
      <h3>What the pension is worth vs. your expected civilian pay</h3>
      ${bar("Pension is worth", a, "#1d4a86", "earned for NOT working")}
      ${bar("Your civilian target", b, "#2bb6a6", "earned by working full-time")}
    </div>

    ${t.crdp50
      ? `<div class="callout gold"><strong>And it beats a salary:</strong> with a 50%+ VA rating you keep the full pension <em>and</em> full VA (CRDP), it rises with inflation every year, and part of your income is tax-free — things a paycheck doesn't do.</div>`
      : `<div class="callout"><strong>Remember:</strong> the pension rises with inflation (COLA) every year and continues for life — a fixed salary does neither.</div>`}
  `;
}

function renderScenarios(s,R){
  $("#scenarioGrid").innerHTML = R.scn.map(x=>{
    if(x.optIn===false){
      return `<div class="scn optin">
        <h4>${x.name}</h4>
        <div class="scn-sub">${x.sub}</div>
        <div class="net" style="color:var(--muted);font-size:1.15rem">Not counted</div>
        <ul>${x.bullets.map(b=>`<li>${b}</li>`).join("")}</ul>
        <span class="tag warn">${x.tag[1]}</span>
      </div>`;
    }
    const m=clamp(x.match,0,1.3);
    const w=Math.min(100,m/1.3*100);
    const isBest = x.id===R.best.id;
    return `<div class="scn ${isBest?"best":""}">
      ${isBest?'<div class="ribbon">BEST MATCH</div>':''}
      <h4>${x.name}</h4>
      <div class="scn-sub">${x.sub}</div>
      <div class="net">${money(x.ppMo)}<small> /mo</small></div>
      <div class="match-bar"><i style="width:${w}%;background:${matchColor(x.match)}"></i></div>
      <div class="match-label" style="color:${matchColor(x.match)}">${pct(x.match)} of today's lifestyle</div>
      <div style="font-size:.78rem;color:var(--muted);margin-top:6px">${x.future}</div>
      <ul>${x.bullets.map(b=>`<li>${b}</li>`).join("")}</ul>
      <span class="tag ${x.tag[0]}">${x.tag[1]}</span>
    </div>`;
  }).join("");
}

function renderEducation(s,R){
  const items=[];
  if(s.edu.selfSchool && num(s.edu.mha)>0){
    const giBillYr = num(s.edu.mha)*12 + BOOK_STIPEND_YR;
    items.push({h:"Post-9/11 GI Bill (Chapter 33)", v:money(giBillYr)+"/yr while enrolled",
      p:"Full in-state public tuition plus a tax-free housing allowance ("+money(s.edu.mha)+"/mo here) and a books stipend. 36 months of benefits ≈ a 4-year degree."});
  } else {
    items.push({h:"Post-9/11 GI Bill (Chapter 33)", v:"Tuition + tax-free housing, ~36 months",
      p:"An earned benefit worth a full in-state degree plus a monthly housing allowance. Tick “Member plans to use the GI Bill for school” above to fold its income into the comparison."});
  }
  if(num(s.va.rating)>=10) items.push({h:"VR&E — Veteran Readiness & Employment (Chapter 31)", v:"Often more than the GI Bill",
    p:"With a service-connected rating you may qualify for VR&E, which pays tuition AND a monthly subsistence allowance — and it doesn't burn your GI Bill months. Usually the first thing to apply for."});
  if(s.edu.transfer && num(s.edu.transferDeps)>0) items.push({h:"Transfer GI Bill to "+num(s.edu.transferDeps)+" dependent(s)", v:"≈ "+money(num(s.edu.transferDeps)*85000)+" of avoided college cost",
    p:"You can move unused months to a spouse or kids — but the transfer must be requested WHILE you're still serving (with a service obligation). A child using it also draws the monthly housing allowance."});
  if(s.va.pt) items.push({h:"DEA / Chapter 35 (dependents)", v:"Monthly stipend to dependents",
    p:"Because you marked 100% Permanent & Total, your spouse and children can receive Survivors' & Dependents' Educational Assistance — a separate benefit from the transferred GI Bill."});
  if(s.family.married) items.push({h:"MyCAA (spouse, active-duty only)", v:"Up to $4,000",
    p:"While you're still active duty, your spouse can get up to $4,000 toward a license or credential in a portable career field. Use it before you separate."});
  items.push({h:"VA-backed home loan", v:"$0 down, no PMI",
    p:"Not education, but a major wealth lever at transition: buy at the destination with no down payment and no mortgage insurance."});

  $("#eduBody").innerHTML = items.map(i=>`<div class="edu-item"><h4>${i.h}</h4><div class="val">${i.v}</div><p>${i.p}</p></div>`).join("");
}

const CHECKLIST = [
  {g:"6–12 months out", items:[
    ["Attend TAP (Transition Assistance Program)","Mandatory workshops on benefits, résumé, VA claims. Start early."],
    ["Apply for SkillBridge","Intern with a civilian employer for up to your last 180 days while still drawing military pay."],
    ["Decide GI Bill transfer to dependents","Must be done WHILE serving — you cannot transfer after you separate."],
    ["Set your state of legal residence","Domicile drives whether your retirement pay is taxed. Plan before you move."]
  ]},
  {g:"3–6 months out", items:[
    ["File VA disability claim (BDD)","Benefits Delivery at Discharge: file 180–90 days before separation so compensation can start at day one."],
    ["Get medical records & nexus letters","Document every condition now; it's far harder once you're out."],
    ["Plan terminal leave / sell leave","Use or sell accrued leave; terminal leave can overlap a civilian start date."],
    ["Run the SBP decision (retirees)","Survivor Benefit Plan: an annuity for your spouse that costs a slice of the pension. A one-time, mostly irrevocable choice."]
  ]},
  {g:"Money & benefits", items:[
    ["Choose TSP rollover vs. leave-in-place","Compare fees and the BRS match you've vested before moving funds."],
    ["Convert SGLI → VGLI life insurance","You have a limited window to keep coverage without a medical exam."],
    ["Line up healthcare","Tricare retiree, CHCBP bridge coverage, VA health care, or a civilian/ACA plan — don't go uncovered."],
    ["File for unemployment (UCX) if needed","Ex-servicemembers may qualify between jobs."]
  ]},
  {g:"The move & the job", items:[
    ["Use your final/retirement PCS move","The government will move you one last time — know the entitlements."],
    ["Translate your résumé & keep clearance current","A current security clearance is worth real money; don't let it lapse."],
    ["Negotiate the offer against your match number","Aim at the salary the analysis says you need, not just any offer."]
  ]}
];

function renderChecklist(){
  let done={};
  try{done=JSON.parse(localStorage.getItem("sog-checklist")||"{}");}catch(e){}
  $("#checklistBody").innerHTML = CHECKLIST.map((grp,gi)=>`
    <div class="chk-group"><h4>${grp.g}</h4>
      ${grp.items.map((it,ii)=>{
        const key="c"+gi+"_"+ii;
        return `<label class="chk ${done[key]?"done":""}">
          <input type="checkbox" data-chk="${key}" ${done[key]?"checked":""} />
          <span class="chk-txt"><strong>${it[0]}</strong><span>${it[1]}</span></span>
        </label>`;
      }).join("")}
    </div>`).join("");
  $$("#checklistBody input[data-chk]").forEach(cb=>{
    cb.addEventListener("change",()=>{
      let d={}; try{d=JSON.parse(localStorage.getItem("sog-checklist")||"{}");}catch(e){}
      d[cb.dataset.chk]=cb.checked;
      localStorage.setItem("sog-checklist",JSON.stringify(d));
      cb.closest(".chk").classList.toggle("done",cb.checked);
    });
  });
}

/* ---------------------------------------------------------------------------
   SECTION 9 — SVG CHARTS + DECISION TREE
--------------------------------------------------------------------------- */

const PALETTE={stay:"#1d4a86",civ:"#2bb6a6",school:"#c8a24a",reserve:"#7a5cc4",stop:"#c0473d"};

// Darken/lighten a #rrggbb hex by pct (negative = darker). Used for gradients.
function shade(hex,pct){
  const n=parseInt(hex.slice(1),16);
  const r=(n>>16)&255,g=(n>>8)&255,b=n&255;
  const f=t=>Math.max(0,Math.min(255,Math.round(t+(pct/100)*255)));
  return "#"+((f(r)<<16)|(f(g)<<8)|f(b)).toString(16).padStart(6,"0");
}
function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}

// A center-anchored SVG label, wrapped to at most two lines under a bar.
function svgWrapped(label,cx,y){
  const words=String(label).split(" ");
  let lines=[label];
  if(words.length>1){ const mid=Math.ceil(words.length/2); lines=[words.slice(0,mid).join(" "),words.slice(mid).join(" ")]; }
  const tspans=lines.map((ln,i)=>`<tspan x="${cx.toFixed(1)}" dy="${i===0?0:13}">${esc(ln)}</tspan>`).join("");
  return `<text x="${cx.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-size="11" font-weight="600" fill="#54627a">${tspans}</text>`;
}

function barChart(R){
  const data=R.scn.map(x=>({label:x.short||x.name,val:x.ppMo,id:x.id}));
  const W=720,H=320,pad={l:64,r:20,t:24,b:78};
  const maxV=Math.max(R.targetMo, ...data.map(d=>d.val))*1.14;
  const bw=(W-pad.l-pad.r)/data.length;
  const y=v=> H-pad.b-(v/maxV)*(H-pad.t-pad.b);
  const grads=Object.keys(PALETTE).map(k=>`<linearGradient id="bg_${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${PALETTE[k]}"/><stop offset="1" stop-color="${shade(PALETTE[k],-16)}"/></linearGradient>`).join("");
  const bars=data.map((d,i)=>{
    const x=pad.l+i*bw+bw*0.16, w=bw*0.68, yy=y(d.val), cx=x+w/2;
    return `<rect x="${x.toFixed(1)}" y="${yy.toFixed(1)}" width="${w.toFixed(1)}" height="${(H-pad.b-yy).toFixed(1)}" rx="6" fill="url(#bg_${d.id})"/>
      <text x="${cx.toFixed(1)}" y="${(yy-8).toFixed(1)}" text-anchor="middle" font-size="12.5" font-weight="800" fill="#16202e">${money(d.val)}</text>
      ${svgWrapped(d.label,cx,H-pad.b+18)}`;
  }).join("");
  const ty=y(R.targetMo);
  const target=`<line x1="${pad.l}" y1="${ty.toFixed(1)}" x2="${W-pad.r}" y2="${ty.toFixed(1)}" stroke="#16202e" stroke-dasharray="6 4" stroke-width="1.5"/>
    <text x="${W-pad.r}" y="${(ty-7).toFixed(1)}" text-anchor="end" font-size="11" font-weight="700" fill="#16202e">Today's lifestyle: ${money(R.targetMo)}/mo</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Monthly net income by path">
    <defs>${grads}</defs>
    <line x1="${pad.l}" y1="${H-pad.b}" x2="${W-pad.r}" y2="${H-pad.b}" stroke="#dde4ee"/>
    ${bars}${target}</svg>`;
}

function timelineChart(s,R){
  // Project 15 years of monthly net for each path.
  const yrs=15, W=720,H=320,pad={l:60,r:20,t:20,b:40};
  const planLeft=Math.max(0,num(s.profile.planYOS)-num(s.profile.yos)); // yrs until retirement
  const series={};
  const postGradNet=netCivilian(num(s.edu.expectedPostGrad),s.loc.destState,s.profile.filing)/12 + R.vaM;
  const toPP=x=>x*(num(s.loc.curCOL)/Math.max(1,num(s.loc.destCOL)));
  for(let t=0;t<=yrs;t++){
    // stay: current household until retirement, then retired pay + spouse
    push(series,"stay", t< planLeft ? R.targetMo : (R.retiredNetMo>0?R.retiredNetMo:R.vaM)+R.spouseTotalMo);
    // civ: steady
    push(series,"civ", R.scn.find(x=>x.id==="civ").ppMo);
    // school: MHA years (assume 3) then post-grad (household)
    push(series,"school", t<3 ? R.scn.find(x=>x.id==="school").ppMo : toPP(postGradNet + R.spouseTotalMo));
    // reserve: steady + small bump at 60 not modeled in 15y
    push(series,"reserve", R.scn.find(x=>x.id==="reserve").ppMo);
    // stop: steady passive
    push(series,"stop", R.scn.find(x=>x.id==="stop").ppMo);
  }
  const all=[].concat(...Object.values(series));
  const maxV=Math.max(R.targetMo,...all)*1.1;
  const x=t=> pad.l + t/yrs*(W-pad.l-pad.r);
  const y=v=> H-pad.b-(v/maxV)*(H-pad.t-pad.b);
  const line=(id)=> series[id].map((v,t)=>(t?"L":"M")+x(t).toFixed(1)+" "+y(v).toFixed(1)).join(" ");
  const paths=Object.keys(series).map(id=>`<path d="${line(id)}" fill="none" stroke="${PALETTE[id]}" stroke-width="2.4" stroke-linejoin="round"/>`).join("");
  const ty=y(R.targetMo);
  const gridY=[0,.25,.5,.75,1].map(f=>{const v=maxV*f;return `<line x1="${pad.l}" y1="${y(v)}" x2="${W-pad.r}" y2="${y(v)}" stroke="#eef1f6"/><text x="${pad.l-8}" y="${y(v)+4}" text-anchor="end" font-size="10" fill="#9aa6b5">${money(v)}</text>`;}).join("");
  const xlab=[0,5,10,15].map(t=>`<text x="${x(t)}" y="${H-pad.b+22}" text-anchor="middle" font-size="10" fill="#5d6b7e">Yr ${t}</text>`).join("");
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Projected monthly net income over 15 years">
    ${gridY}
    <line x1="${pad.l}" y1="${ty}" x2="${W-pad.r}" y2="${ty}" stroke="#16202e" stroke-dasharray="5 4"/>
    ${paths}${xlab}</svg>`;
}
function push(o,k,v){(o[k]=o[k]||[]).push(v);}

function legend(){
  const names={stay:"Stay to 20",civ:"Civilian job",school:"School (GI Bill)",reserve:"Guard/Reserve",stop:"Stop working"};
  return `<div class="legend">${Object.keys(names).map(k=>`<span><i style="background:${PALETTE[k]}"></i>${names[k]}</span>`).join("")}</div>`;
}

function renderCharts(s,R){
  $("#chartsBody").innerHTML=`
    <div class="chart-block">
      <h3>Monthly take-home by path (today's purchasing power)</h3>
      <div class="svgwrap">${barChart(R)}</div>
      ${legend()}
    </div>
    <div class="chart-block">
      <h3>Where the money goes over 15 years</h3>
      <div class="svgwrap">${timelineChart(s,R)}</div>
      ${legend()}
      <p class="muted" style="margin-top:8px">Note the shapes: school dips then jumps after the degree; staying holds steady then steps up when the pension starts.</p>
    </div>`;
}

const TREE_ROWS=[
  {path:"stay",    icon:"🎖️", title:"Stay & retire",     q:"At the 20-year cliff, or 20+ yrs with a 50%+ VA rating?"},
  {path:"stop",    icon:"🏝️", title:"Stop working",       q:"Can passive income (VA, pension, spouse, savings) cover costs?"},
  {path:"school",  icon:"🎓", title:"School on GI Bill",  q:"Worth retraining now for higher pay later?"},
  {path:"civ",     icon:"💼", title:"Civilian job",       q:"Does a civilian offer meet your match number?"},
  {path:"reserve", icon:"🛡️", title:"Guard / Reserve",    q:"Otherwise — keep one foot in for benefits + a 2nd pension?"}
];
let LAST={};

// Split a string into at most two balanced lines near the middle space.
function splitTwo(text){
  if(text.length<=30) return [text];
  const mid=Math.floor(text.length/2);
  const i=text.lastIndexOf(" ",mid), j=text.indexOf(" ",mid+1);
  const sp=(i>0 && (mid-i)<=(j<0?1e9:j-mid))?i:(j>0?j:i);
  return sp>0?[text.slice(0,sp),text.slice(sp+1)]:[text];
}
function svgTextBox(text,cx,cy,fill,fw,size){
  const lines=splitTwo(String(text)), lh=size+2;
  const start=cy-(lines.length-1)*lh/2+size*0.34;
  return `<text x="${cx}" y="${start.toFixed(1)}" text-anchor="middle" font-size="${size}" font-weight="${fw}" fill="${fill}">`+
    lines.map((ln,k)=>`<tspan x="${cx}" dy="${k===0?0:lh}">${esc(ln)}</tspan>`).join("")+`</text>`;
}

function buildTreeSVG(R,D){
  let activeIdx=TREE_ROWS.findIndex(r=>r.path===D.path); if(activeIdx<0) activeIdx=0;
  const W=760, rowH=58, pillW=398, pillX=22, cardW=262, cardX=474, cx=pillX+pillW/2;
  const startY=44, y0=124, gap=84, yOf=i=>y0+i*gap;
  const H=yOf(TREE_ROWS.length-1)+rowH/2+18;

  const grads=Object.keys(PALETTE).map(k=>`<linearGradient id="tg_${k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${PALETTE[k]}"/><stop offset="1" stop-color="${shade(PALETTE[k],-22)}"/></linearGradient>`).join("");
  const seg=(x1,y1,x2,y2,on)=>`<line x1="${x1}" y1="${y1.toFixed(1)}" x2="${x2}" y2="${y2.toFixed(1)}" stroke="${on?"#c8a24a":"#dde4ee"}" stroke-width="${on?3.5:2}" stroke-linecap="round"/>`;
  const arrow=(x1,y1,x2,y2,on)=>`<line x1="${x1}" y1="${y1.toFixed(1)}" x2="${x2}" y2="${y2.toFixed(1)}" stroke="${on?"#c8a24a":"#cdd6e3"}" stroke-width="${on?3.5:2}" marker-end="url(#${on?"tahg":"tah"})"/>`;
  const pill=(y,kind,text)=>{
    const st={visited:{f:"#eef2f8",s:"#cdd6e3",t:"#5d6b7e",fw:600,sw:1.4},
              active:{f:"#fff7e6",s:"#c8a24a",t:"#5b4a23",fw:700,sw:2.6},
              future:{f:"#ffffff",s:"#e6ebf2",t:"#aab4c2",fw:500,sw:1.4}}[kind];
    return `<g><rect x="${pillX}" y="${(y-rowH/2).toFixed(1)}" width="${pillW}" height="${rowH}" rx="14" fill="${st.f}" stroke="${st.s}" stroke-width="${st.sw}"/>${svgTextBox(text,cx,y,st.t,st.fw,12.5)}</g>`;
  };
  const card=(y,row,active)=>{
    const op=active?1:0.6;
    const halo=active?`<rect x="${cardX-5}" y="${(y-rowH/2-5).toFixed(1)}" width="${cardW+10}" height="${rowH+10}" rx="17" fill="none" stroke="#c8a24a" stroke-width="3"><animate attributeName="stroke-opacity" values="0.95;0.25;0.95" dur="1.8s" repeatCount="indefinite"/></rect>`:"";
    const badge=active?`<circle cx="${cardX+cardW-18}" cy="${(y-rowH/2+18).toFixed(1)}" r="11" fill="#c8a24a"/><text x="${cardX+cardW-18}" y="${(y-rowH/2+22).toFixed(1)}" text-anchor="middle" font-size="13" font-weight="800" fill="#fff">✓</text>`:"";
    return `<g class="tnode${active?" active":""}" data-path="${row.path}">
      ${halo}
      <rect class="tn-main" x="${cardX}" y="${(y-rowH/2).toFixed(1)}" width="${cardW}" height="${rowH}" rx="14" fill="url(#tg_${row.path})" opacity="${op}"/>
      <text x="${cardX+20}" y="${(y+7).toFixed(1)}" font-size="22" opacity="${op}">${row.icon}</text>
      <text x="${cardX+54}" y="${(y+5).toFixed(1)}" font-size="14.5" font-weight="800" fill="#fff" opacity="${op}">${esc(row.title)}</text>
      ${badge}</g>`;
  };

  const parts=[];
  parts.push(`<g><rect x="${cx-110}" y="${startY-19}" width="220" height="38" rx="19" fill="#0a1f3c"/><text x="${cx}" y="${startY+5}" text-anchor="middle" font-size="12.5" font-weight="700" fill="#fff">START — your situation</text></g>`);
  parts.push(seg(cx,startY+19,cx,yOf(0)-rowH/2,true));
  for(let i=0;i<TREE_ROWS.length-1;i++) parts.push(seg(cx,yOf(i)+rowH/2,cx,yOf(i+1)-rowH/2,i<activeIdx));
  TREE_ROWS.forEach((row,i)=>{
    const y=yOf(i), kind=i<activeIdx?"visited":i===activeIdx?"active":"future";
    parts.push(pill(y,kind,row.q));
    parts.push(arrow(pillX+pillW,y,cardX,y,i===activeIdx));
    parts.push(card(y,row,i===activeIdx));
  });
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Stay or go decision map">
    <defs>${grads}
      <marker id="tah" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#cdd6e3"/></marker>
      <marker id="tahg" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#c8a24a"/></marker>
    </defs>
    ${parts.join("\n")}
  </svg>`;
}

function renderTree(s,R,D){
  LAST={s,R,D};
  $("#treeBody").innerHTML=`
    <div class="callout gold" style="margin-bottom:14px"><strong>Verdict: ${esc(D.verdict)}.</strong> <span class="muted">Tap any outcome on the right to compare it.</span></div>
    <div class="svgwrap tree-flow">${buildTreeSVG(R,D)}</div>
    <div id="treeDetail" class="tree-detail"></div>
    <details class="transcript" style="margin-top:12px"><summary>Full reasoning behind the verdict</summary>
      <ul class="tree-reasons">${D.reasons.map(r=>`<li>${r}</li>`).join("")}</ul></details>`;
  $$("#treeBody .tnode").forEach(g=>g.addEventListener("click",()=>selectTreePath(g.dataset.path)));
  selectTreePath(D.path);
}

function selectTreePath(path){
  const R=LAST.R, D=LAST.D; if(!R) return;
  const sc=R.scn.find(x=>x.id===path); if(!sc) return;
  const isRec=path===D.path;
  $$("#treeBody .tnode").forEach(g=>g.classList.toggle("sel",g.dataset.path===path));
  $("#treeDetail").innerHTML=`
    <div class="td-head" style="border-color:${PALETTE[path]}">
      <div class="td-title">${esc(sc.name)} ${isRec?'<span class="td-rec">✓ Recommended</span>':''}</div>
      <div class="td-net">${money(sc.ppMo)}<small>/mo · ${pct(sc.match)} of today</small></div>
    </div>
    <div class="td-sub">${esc(sc.sub)} — <em>${esc(sc.future)}</em></div>
    <ul>${sc.bullets.map(b=>`<li>${b}</li>`).join("")}</ul>`;
}

/* ---------------------------------------------------------------------------
   SECTION 10 — NARRATION (Web Speech API)
--------------------------------------------------------------------------- */

// Make a string read naturally aloud: "$35" -> "35 dollars", "/mo" -> "a month",
// "50%" -> "50 percent". Catches dollar amounts coming from money()/verdict/reasons too.
function speakablize(text){
  return text
    .replace(/\$\s?([0-9][0-9,]*)(?:\.[0-9]+)?/g, (m,intp)=>{
      const digits=intp.replace(/,/g,"");
      return intp+(digits==="1"?" dollar":" dollars");
    })
    .replace(/\s*\/\s*mo\b/gi," a month")
    .replace(/\s*\/\s*yr\b/gi," a year")
    .replace(/(\d)\s?%/g,"$1 percent");
}

function narrationScript(s,R,D){
  const name=s.profile.name||"there";
  const t=R.tradeoff;
  const parts=[];
  parts.push(`Here's the transition picture for ${name}.`);
  parts.push(`Right now your military pay gives you about ${money(R.spendableMo)} a month to live on — and remember, your housing and food allowances in that number are tax-free, which is money a civilian salary has to work much harder to match.`);
  if(R.spouseTotalMo>0) parts.push(`Adding your spouse's income, the household lives on roughly ${money(R.targetMo)} a month, and that's the lifestyle every path is measured against.`);
  parts.push(`To keep that same lifestyle as a civilian in ${s.loc.destName}, you'd need roughly ${money(R.requiredGross)} a year in salary, after accounting for ${STATES[s.loc.destState]?STATES[s.loc.destState].n:"local"} taxes${R.vaM>0?` and crediting your ${money(R.vaM)} a month of tax-free VA compensation`:""}.`);
  if(R.willRetire){
    parts.push(`If you stay to ${num(s.profile.planYOS)} years and retire, you unlock a pension of about ${money(R.ri.pension)} a month for the rest of your life.`);
    if(R.ri.crdp) parts.push(`And because your rating is 50 percent or higher, you'd receive that full pension and your full VA compensation at the same time — that's a powerful combination that's very hard to replace with a paycheck.`);
  } else {
    parts.push(`Because you're separating before twenty years, you'd give up that pension — so it's worth seeing exactly what you're leaving on the table.`);
  }
  parts.push(`Here's a useful way to picture a twenty-year pension: it pays you like a ${money(t.pensionSalaryEquiv)} a year civilian salary — except you collect it for the rest of your life without working for it. To replace it with a paycheck, you'd have to earn that much every single year.`);
  if(t.neverWorkGapMo<=0) parts.push(`In fact, if you retire at twenty and never work again, your pension, benefits, and savings already cover your household's lifestyle.`);
  parts.push(`Looking across the five paths, the one that best matches your current quality of life is: ${R.best.name}, keeping about ${pct(R.best.match)} of today's lifestyle.`);
  parts.push(`The bottom line: ${D.verdict}. ${D.reasons[0]}`);
  parts.push(`Take a look at the bars and the fifteen-year timeline to see how each path plays out, and use the checklist so nothing falls through the cracks before you out-process. This is a planning estimate — confirm the specifics with a financial counselor before you decide.`);
  return speakablize(parts.join(" "));
}

let VOICES=[];
// Audio state machine: 'idle' | 'playing' | 'paused'. Chunked by sentence so
// each utterance is short (sidesteps Chrome's ~15s cutoff) and pause/resume/stop
// behave reliably.
let AUDIO={chunks:[],idx:0,state:"idle"};

// Prefer "Google US English", then any Google en-US, then any en-US, then en-*.
function pickDefaultVoiceIndex(){
  const tries=[
    v=>/google\s*us\s*english/i.test(v.name),
    v=>/google/i.test(v.name)&&/en[-_]us/i.test(v.lang),
    v=>/en[-_]us/i.test(v.lang),
    v=>/^en/i.test(v.lang)
  ];
  for(const t of tries){ const i=VOICES.findIndex(t); if(i>=0) return i; }
  return 0;
}
function loadVoices(){
  VOICES=window.speechSynthesis?speechSynthesis.getVoices():[];
  const sel=$("#voiceSelect"); if(!sel) return;
  if(!VOICES.length){ sel.innerHTML=`<option>Loading voices…</option>`; return; }
  const prev=sel.value;
  sel.innerHTML=VOICES.map((v,i)=>`<option value="${i}">${esc(v.name)} (${v.lang})</option>`).join("");
  // Keep a prior manual choice, otherwise default to Google US English.
  sel.value = (prev!=="" && VOICES[prev]) ? prev : String(pickDefaultVoiceIndex());
}
function audioUI(state){
  AUDIO.state=state;
  const play=$("#audioPlay"),pause=$("#audioPause"),stop=$("#audioStop");
  if(!play) return;
  play.textContent = state==="playing"?"▶ Playing…":state==="paused"?"▶ Resume":"▶ Play";
  play.disabled = state==="playing";
  pause.disabled = state!=="playing";
  stop.disabled  = state==="idle";
}
function speakNext(){
  if(AUDIO.state!=="playing") return;             // stopped/paused → don't continue
  if(AUDIO.idx>=AUDIO.chunks.length){ AUDIO.idx=0; audioUI("idle"); return; }
  const u=new SpeechSynthesisUtterance(AUDIO.chunks[AUDIO.idx]);
  const vi=parseInt(($("#voiceSelect")||{}).value,10);
  if(VOICES[vi]) u.voice=VOICES[vi];
  u.rate=parseFloat(($("#rateRange")||{}).value)||0.85;
  u.onend  =()=>{ if(AUDIO.state==="playing"){ AUDIO.idx++; speakNext(); } };
  u.onerror=()=>{ if(AUDIO.state==="playing"){ AUDIO.idx++; speakNext(); } };
  speechSynthesis.speak(u);
}
function setupAudio(){
  if(!("speechSynthesis" in window)){
    const c=$(".audio-controls"); if(c) c.innerHTML="<em>Your browser doesn't support built-in narration.</em>";
    return;
  }
  loadVoices();
  speechSynthesis.onvoiceschanged=loadVoices;
  $("#audioPlay").addEventListener("click",()=>{
    if(AUDIO.state==="paused"){ speechSynthesis.resume(); audioUI("playing"); return; }
    if(AUDIO.state==="playing") return;
    speechSynthesis.cancel();
    const text=($("#narrationText").textContent||"").trim();
    AUDIO.chunks = text.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) || (text?[text]:[]);
    AUDIO.idx=0;
    if(!AUDIO.chunks.length) return;
    audioUI("playing");
    speakNext();
  });
  $("#audioPause").addEventListener("click",()=>{
    if(AUDIO.state==="playing"){ speechSynthesis.pause(); audioUI("paused"); }
  });
  $("#audioStop").addEventListener("click",()=>{
    audioUI("idle"); AUDIO.idx=0; speechSynthesis.cancel();
  });
}

/* ---------------------------------------------------------------------------
   SECTION 11 — WIRING & INIT
--------------------------------------------------------------------------- */

function populateStates(){
  const opts=Object.keys(STATES).sort((a,b)=>STATES[a].n.localeCompare(STATES[b].n))
    .map(c=>`<option value="${c}">${STATES[c].n}${STATES[c].r===0?" (no income tax)":""}</option>`).join("");
  $$("[data-statelist]").forEach(sel=>sel.innerHTML=opts);
}

let ANALYZED=false, _liveT=null;
function liveRefresh(){ clearTimeout(_liveT); _liveT=setTimeout(()=>runAnalysis(false),90); }

function updateSliderOut(el){
  if(el.dataset.slider==="civ"){ const o=$("#civSalaryOut"); if(o) o.textContent=money(num(el.value))+" / yr"; }
  if(el.dataset.slider==="spouse"){ const o=$("#spouseIncomeOut"); if(o) o.textContent=money(num(el.value))+" / mo"; }
}
// Show/hide optional field groups based on their gating checkbox (data-gatekey -> data-gate).
function applyGates(){
  $$("[data-gatekey]").forEach(cb=>{
    $$(`[data-gate="${cb.dataset.gatekey}"]`).forEach(el=>{ el.style.display = cb.checked ? "" : "none"; });
  });
}

// Populate the grade dropdown (E-1..O-10, incl. prior-enlisted O-1E..O-3E).
function populateGrades(){
  const sel=$("#gradeSelect"); if(!sel) return;
  sel.innerHTML=GRADES.map(g=>`<option value="${g}">${g} — ${AF_RANK[g]||""}</option>`).join("");
}
// Auto-fill base pay, BAH, BAS from the chosen grade + years of service (editable after).
function applyGradeAutofill(){
  const g=STATE.profile.grade;
  if(!PAY[g]) return;
  STATE.pay.base = basePayFor(g, STATE.profile.yos);
  STATE.pay.bah  = bahForZip(STATE.pay.zip, g, !!STATE.family.married);
  STATE.pay.bas  = basFor(g);
  saveState(); setFormValues(); if(ANALYZED) liveRefresh();
}
// Years-of-service changed: refresh only base pay (BAH/BAS don't depend on YOS).
function applyBaseFromGrade(){
  const g=STATE.profile.grade;
  if(!PAY[g]) return;
  STATE.pay.base = basePayFor(g, STATE.profile.yos);
  saveState(); setFormValues(); if(ANALYZED) liveRefresh();
}
// ZIP code or dependent status changed: refresh only BAH (location-based). Updates just
// the BAH field (not full setFormValues) so typing in the ZIP box isn't interrupted.
function applyBahFromZip(){
  STATE.pay.bah = bahForZip(STATE.pay.zip, STATE.profile.grade, !!STATE.family.married);
  const bahEl=$('[data-path="pay.bah"]'); if(bahEl) bahEl.value=STATE.pay.bah;
  saveState(); if(ANALYZED) liveRefresh();
}
// Push STATE values into the form WITHOUT attaching listeners (safe to call repeatedly).
function setFormValues(){
  $$("[data-path]").forEach(el=>{
    const val=getPath(STATE,el.dataset.path);
    if(el.type==="checkbox") el.checked=!!val;
    else if(val!==undefined && val!==null) el.value=val;
    if(el.dataset.slider) updateSliderOut(el);
  });
  applyGates();
}
function bindInputs(){
  $$("[data-path]").forEach(el=>{
    el.addEventListener("input",()=>{
      let v;
      if(el.type==="checkbox") v=el.checked;
      else if(el.type==="number"||el.type==="range") v=num(el.value);
      else v=el.value;
      setPath(STATE,el.dataset.path,v);
      if(el.dataset.slider) updateSliderOut(el);
      saveState();
      if(ANALYZED) liveRefresh();   // once analyzed, every change updates results live
    });
  });
  setFormValues();
}

function runAnalysis(scroll){
  const R=compute(STATE);
  const D=decide(STATE,R);
  renderSummary(STATE,R);
  renderTradeoff(STATE,R);
  renderScenarios(STATE,R);
  renderTree(STATE,R,D);
  renderCharts(STATE,R);
  renderEducation(STATE,R);
  renderChecklist();
  $("#narrationText").textContent=narrationScript(STATE,R,D);
  $$(".result-card").forEach(c=>c.hidden=false);
  ANALYZED=true;
  if(scroll!==false) $("#summary").scrollIntoView({behavior:"smooth"});
}

function init(){
  populateStates();
  populateGrades();
  bindInputs();
  setupAudio();
  // Auto-fill base/BAH/BAS from grade, and base from years of service.
  const gradeSel=$("#gradeSelect"); if(gradeSel) gradeSel.addEventListener("change",applyGradeAutofill);
  const yosInput=$('[data-path="profile.yos"]'); if(yosInput) yosInput.addEventListener("change",applyBaseFromGrade);
  const zipInput=$('[data-path="pay.zip"]'); if(zipInput) zipInput.addEventListener("input",applyBahFromZip);
  const marriedCb=$('[data-path="family.married"]'); if(marriedCb) marriedCb.addEventListener("change",applyBahFromZip);
  $$("[data-gatekey]").forEach(cb=>cb.addEventListener("change",applyGates));
  $("#calcBtn").addEventListener("click",()=>runAnalysis(true));
  $("#printBtn").addEventListener("click",()=>window.print());
  $("#resetBtn").addEventListener("click",()=>{
    if(!confirm("Reset all fields back to the example?")) return;
    STATE=defaultState(); saveState();
    setFormValues();
    if(window.speechSynthesis) speechSynthesis.cancel();
    audioUI("idle");
    if(ANALYZED) runAnalysis(false);
  });

  // Register service worker for offline / installability
  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("sw.js").catch(()=>{});
  }
}

document.addEventListener("DOMContentLoaded",init);
