// Live teamagenda (ICS) voor SC Stiens VR1 — genereert de agenda uit de gedeelde data in Supabase.
// Speelsters abonneren zich op /agenda.ics; agenda-apps (Apple/Outlook/Google) verversen periodiek.
const SUPA_URL = "https://dvaheqgjjksynlqvgjla.supabase.co";
const SUPA_KEY = "sb_publishable_IWI8mpvtljLfmZ99W8_xvA_XzMv64_I";

function esc(s){ return (s==null?"":String(s)).replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\n/g,"\\n"); }
function fold(line){ let out=""; while(line.length>73){ out+=line.slice(0,73)+"\r\n "; line=line.slice(73); } return out+line; }
function pad(n){ return String(n).padStart(2,"0"); }
function dtLocal(dateStr,timeStr,addMin){
  const p=dateStr.split("-").map(Number);
  const t=(timeStr||"00:00").split(":").map(Number);
  const d=new Date(p[0],p[1]-1,p[2],t[0]||0,t[1]||0,0);
  if(addMin) d.setMinutes(d.getMinutes()+addMin);
  return d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate())+"T"+pad(d.getHours())+pad(d.getMinutes())+"00";
}
function dtDate(dateStr){ return dateStr.replace(/-/g,""); }
function names(a){ return (a&&a.length)?a.join(", "):""; }

exports.handler = async () => {
  let data={};
  try{
    const r=await fetch(SUPA_URL+"/rest/v1/dashboard_state?id=eq.main&select=data",
      { headers:{ apikey:SUPA_KEY, Authorization:"Bearer "+SUPA_KEY } });
    const j=await r.json();
    data=(j && j[0] && j[0].data) || {};
  }catch(e){ data={}; }

  const fixtures=Array.isArray(data.fixtures)?data.fixtures:[];
  const trainings=Array.isArray(data.trainings)?data.trainings:[];
  const club=Array.isArray(data.clubDuties)?data.clubDuties:[];

  const nd=new Date();
  const now=nd.getUTCFullYear()+pad(nd.getUTCMonth()+1)+pad(nd.getUTCDate())+"T"+pad(nd.getUTCHours())+pad(nd.getUTCMinutes())+pad(nd.getUTCSeconds())+"Z";

  const L=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//SC Stiens VR1//Agenda//NL","CALSCALE:GREGORIAN",
           "METHOD:PUBLISH","X-WR-CALNAME:SC Stiens VR1","X-WR-TIMEZONE:Europe/Amsterdam","REFRESH-INTERVAL;VALUE=DURATION:PT2H","X-PUBLISHED-TTL:PT2H"];
  function ev(uid,summary,dateStr,timeStr,durMin,desc){
    L.push("BEGIN:VEVENT"); L.push("UID:"+uid); L.push("DTSTAMP:"+now);
    if(timeStr){ L.push("DTSTART:"+dtLocal(dateStr,timeStr,0)); L.push("DTEND:"+dtLocal(dateStr,timeStr,durMin||90)); }
    else { L.push("DTSTART;VALUE=DATE:"+dtDate(dateStr)); }
    L.push(fold("SUMMARY:"+esc(summary)));
    if(desc) L.push(fold("DESCRIPTION:"+esc(desc)));
    L.push("END:VEVENT");
  }

  fixtures.forEach((f,i)=>{ if(!f || !f.date) return;
    const tu = f.home===true?"Thuis" : f.home===false?"Uit" : "thuis/uit n.t.b.";
    const opp=((f.opponent||"").trim())||("Wedstrijd "+(i+1));
    const d=[];
    if(f.home===false && f.drive && f.drive.length) d.push("Rijden: "+names(f.drive));
    if(f.wash && f.wash.length) d.push("Wassen: "+names(f.wash));
    if(f.flag && f.flag.length) d.push("Vlaggen: "+names(f.flag));
    if(f.home===true && f.food && f.food.length) d.push("Eten: "+f.food.join(" & "));
    ev("m"+i+"-"+f.date+"@scstiens", "⚽ VR1 ("+tu+") — "+opp, f.date, f.time||"", 120, d.join("\n"));
  });

  trainings.forEach((t,i)=>{ if(!t || !t.date) return;
    let dur=90;
    if(t.time && t.end){ const a=t.time.split(":").map(Number), b=t.end.split(":").map(Number); const m=(b[0]*60+b[1])-(a[0]*60+a[1]); if(m>0)dur=m; }
    ev("t"+i+"-"+t.date+"@scstiens", "🏃 "+((t.title||"Training")), t.date, t.time||"", dur, "");
  });

  club.forEach((c,i)=>{ if(!c || !c.date) return;
    const d=[]; if(c.fluit && c.fluit.length) d.push("Fluiten: "+names(c.fluit)); if(c.coord && c.coord.length) d.push("Coördinatie: "+names(c.coord));
    ev("c"+i+"-"+c.date+"@scstiens", "🔔 Verenigingstaak jeugd", c.date, "", 0, d.join("\n"));
  });

  // Zomer-hardloopprogramma: markering bovenaan elke week (dag-item op de maandag), zelf in te plannen.
  const SUMMER=[
    {mon:"2026-06-22", t:"Zomertraining week 1 (22–28 juni)", d:"2 trainingen, kies je eigen dagen. Tr.1: duurloop 3×10 min (~7:00/km, rustig). Tr.2: duurloop 4×8 min (~6:30/km). Start met de dynamische warming-up; stuur je Strava na afloop."},
    {mon:"2026-06-29", t:"Zomertraining week 2 (29 juni–5 juli)", d:"2 trainingen. Tr.3: 2×10×100 m (~27 sec, snel). Tr.4: envelopjes + pyramide-loopjes (agility, zo explosief mogelijk)."},
    {mon:"2026-07-06", t:"Zomertraining week 3 (6–12 juli)", d:"2 trainingen. Tr.5: duurloop 3×12 min (~6:15/km). Tr.6: envelopjes + T-Run/Agility + pyramide (~5:00/km)."},
    {mon:"2026-07-13", t:"Zomertraining week 4 (13–19 juli)", d:"2 trainingen. Tr.7: duurloop 5×6 min (~6:00/km, stevig). Tr.8: 2×12×50 m sprint (maximaal)."},
    {mon:"2026-07-20", t:"Zomertraining week 5 (20–26 juli)", d:"2–3 trainingen. Tr.9: duurloop 6×5 min (~5:30/km). Tr.10: sprints 8×30/20/10 m. Extra: duurloop 2×12 min (~6:00/km)."},
    {mon:"2026-07-27", t:"Zomertraining week 6 (27–31 juli)", d:"2–3 trainingen. Tr.11: 12×1 min (~5:00/km). Tr.12: 2×8×100 m (~25 sec). Extra: fartlek 20 min (6× 1 min versnellen)."}
  ];
  SUMMER.forEach((s,i)=>{ ev("z"+i+"-"+s.mon+"@scstiens", "🏃 "+s.t, s.mon, "", 0, s.d); });

  L.push("END:VCALENDAR");
  return {
    statusCode:200,
    headers:{ "Content-Type":"text/calendar; charset=utf-8", "Cache-Control":"public, max-age=1800",
      "Content-Disposition":"inline; filename=scstiens.ics" },
    body: L.join("\r\n")
  };
};
