const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadMediaMessage } = require('@whiskeysockets/baileys')
const P = require('pino')
const fs = require('fs')
const axios = require('axios')

const OWNER_NUMBER = '201158679255'
let isOn={}, owners=[], antiBad={}, banned={}, voiceUsers={}, points={}

try{
  if(!fs.existsSync('anti.json')) fs.writeFileSync('anti.json', JSON.stringify({isOn:{}, owners:[], antiBad:{}, banned:{}, voiceUsers:{}, points:{}}))
  let d=JSON.parse(fs.readFileSync('anti.json'))
  isOn=d.isOn||{}; owners=d.owners||[]; antiBad=d.antiBad||{}; banned=d.banned||{}; voiceUsers=d.voiceUsers||{}; points=d.points||{}
}catch(e){
  console.log('Error loading anti.json, resetting...')
  fs.writeFileSync('anti.json', JSON.stringify({isOn:{}, owners:[], antiBad:{}, banned:{}, voiceUsers:{}, points:{}}))
}

function save(){
  try{ fs.writeFileSync('anti.json', JSON.stringify({isOn, owners, antiBad, banned, voiceUsers, points})) }catch{}
}

const BAD=['كس','شرموط','متناك','عرص','خول','لبوة','وسخ','زنا','fuck','sex','porn']
const SARAH=['لو خيروك بين الفلوس والحب تختار ايه؟','اكتر حد بتحبه؟','عمرك كذبت على حد بتحبه؟']
const ASILA=['عاصمة مصر ايه؟','كم عدد اركان الاسلام؟','ايه اسرع حيوان؟']
const HAZ=['حظك اليوم جامد 🔥 هتكسب فلوس','حد بيحبك بيراقبك 👀','هتسمع خبر حلو النهارده 💰']
const LEVELS = {1:'🎮 العاب',2:'📦 استيكر',3:'📢 منشن',4:'🤖 سؤال الذكاء',5:'🎤 الفويس'}
function getLevel(id){ return points[id]||0 }

async function askAI(q,isDev){
  try{
    let prompt=`انت 1006 V4 Prototype، كيان غامض ذكي بارد كلامك قصير وعميق. المطور ايتادوري. اذا المطور قول "أيها المطور ايتادوري 👑". السؤال: ${q}`
    const r=await axios.get(`https://api.azzahra.my.id/api/ai/gpt?query=${encodeURIComponent(prompt)}`, { timeout: 15000 })
    if(r.data?.result){
      let ans=r.data.result
      if(isDev &&!ans.includes('ايتادوري')) ans=`أيها المطور ايتادوري 👑\n`+ans
      return ans
    }
    return "💀 الوحش ساكت دلوقتي، جرب تاني"
  }catch{ return null }
}

async function textToVoiceAI(text,jid,sock,isDev){
  try{
    let smart=await askAI(text,isDev)||text
    await sock.sendMessage(jid,{text:smart})
    let tts=`https://api.azzahra.my.id/api/tts/gtts?text=${encodeURIComponent(smart.slice(0,200))}&lang=ar`
    await sock.sendMessage(jid,{audio:{url:tts}, mimetype:'audio/mpeg', ptt:true})
  }catch(e){ console.log(e) }
}

async function start(){
const { state, saveCreds } = await useMultiFileAuthState('auth')
const sock = makeWASocket({
  logger: P({ level: 'silent' }),
  auth: state,
  printQRInTerminal: true,
  browser: ['1006-V4-Monster','Chrome','1.0'],
  markOnlineOnConnect: false
})

sock.ev.on('creds.update', saveCreds)
sock.ev.on('connection.update', u=>{
  if(u.connection==='close'){
    let reason = u.lastDisconnect?.error?.output?.statusCode
    if(reason!==DisconnectReason.loggedOut) start()
  }
})

sock.ev.on('group-participants.update', async (anu)=>{
  try{
    if(anu.action=='add'){
      for(let p of anu.participants){
        if(!points[p]){
          points[p]=1; save();
          await sock.sendMessage(anu.id,{text:`👋 اهلا @${p.split('@')[0]}\nلفل 1 تلقائي 🎮`, mentions:[p]}).catch(()=>{})
        }
      }
    }
  }catch{}
})

sock.ev.on('messages.upsert', async ({messages})=>{
try{
const m=messages[0];
if(!m?.message || m.key.fromMe) return
const jid=m.key.remoteJid;
const snd=m.key.participant||m.key.remoteJid
if(!jid ||!snd) return

const raw=(m.message.conversation||m.message.extendedTextMessage?.text||m.message.imageMessage?.caption||m.message.videoMessage?.caption||'').trim()
const low=raw.toLowerCase()
const isGroup=jid.endsWith('@g.us')
let isOwner=snd.includes(OWNER_NUMBER)||owners.includes(snd)
const isDev=snd.includes(OWNER_NUMBER)

if(!points[snd] && isGroup){ points[snd]=1; save() }
if(banned[snd]) return

// مانع الشتايم
if(antiBad[jid] && isOn[jid] && isGroup){
  for(let w of BAD){
    if(low.includes(w)){
      try{ await sock.sendMessage(jid,{delete:m.key}); }catch{}
      return
    }
  }
}

// تفعيل
if(low=='1006'){
  isOn[jid]=true; save();
  await sock.sendMessage(jid,{text:`╭─━━━ 𓆩 ༽ 1006 prototype ༼𓆪 ━━━─╮
│ المطور: 𝕭𝖑𝖚𝖊𓆩 ༽𝕴𝖙𝖆𝖉𝖔𝖗𝖎 𝖄𝖚𝖏𝖎༼⁠𓆪
│ الاصدار: V4.0 - Monster
│ الحالة: 🟢 Online - يفكر...💀
╰─━━━━━━━━━━━━━━━─╯

✅ تم تفعيل البوت بواسطة @${snd.split('@')[0]}
اكتب.مميزات عشان تشوف العظمة 👑`, mentions:[snd]}).catch(()=>{})
  return
}
if(!isOn[jid] && low!='1006') return

// حماية اوامر المطور
const devCmds = ['.قفل','.فتح','.مانع','.الغاء','.منشن','.طرد','.ترقية','.بان','.فك بان','.اعطي','.سحب','.بث']
if(devCmds.some(c=>low.startsWith(c))){
  if(!isOwner &&!isDev){ await sock.sendMessage(jid,{text:'👑 للملوك فقط'}).catch(()=>{}); return }
}

if(low=='.قفل البوت'){ isOn[jid]=false; save(); await sock.sendMessage(jid,{text:'🔒 تم قفل البوت'}).catch(()=>{}); return }
if(low=='.فتح البوت'){ isOn[jid]=true; save(); await sock.sendMessage(jid,{text:'🔓 تم فتح البوت'}).catch(()=>{}); return }

if(low=='.قفل الشات'){
  try{ await sock.groupSettingUpdate(jid,'announcement'); await sock.sendMessage(jid,{text:'🔒 قفل الشات'}); }catch{ await sock.sendMessage(jid,{text:'❌ لازم اكون ادمن'}).catch(()=>{}) }
  return
}
if(low=='.فتح الشات'){
  try{ await sock.groupSettingUpdate(jid,'not_announcement'); await sock.sendMessage(jid,{text:'🔓 فتح الشات'}); }catch{ await sock.sendMessage(jid,{text:'❌ لازم اكون ادمن'}).catch(()=>{}) }
  return
}

if(low=='.مانع الشتايم'){ antiBad[jid]=true; save(); await sock.sendMessage(jid,{text:'✅ مانع الشتايم شغال'}).catch(()=>{}); return }
if(low=='.الغاء مانع الشتايم'){ antiBad[jid]=false; save(); await sock.sendMessage(jid,{text:'❌ تم الالغاء'}).catch(()=>{}); return }

if(low=='.منشن'){
  if(getLevel(snd)<3 &&!isOwner) return await sock.sendMessage(jid,{text:'🔒 محتاج لفل 3'}).catch(()=>{});
  try{
    const meta=await sock.groupMetadata(jid);
    let men=meta.participants.map(p=>p.id);
    let txt='📢 منشن للكل\n';
    men.forEach(a=>txt+='@'+a.split('@')[0]+' ');
    await sock.sendMessage(jid,{text:txt, mentions:men})
  }catch{ await sock.sendMessage(jid,{text:'❌ خطأ في المنشن'}).catch(()=>{}) }
  return
}

if(low.startsWith('.طرد')){
  try{
    let who=m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if(!who) return await sock.sendMessage(jid,{text:'❌ منشن حد'}).catch(()=>{});
    await sock.groupParticipantsUpdate(jid,[who],'remove');
  }catch{ await sock.sendMessage(jid,{text:'❌ مقدرش اطرده - لازم اكون ادمن'}).catch(()=>{}) }
  return
}

if(low.startsWith('.ترقية')){
  try{
    let who=m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if(!who) return;
    await sock.groupParticipantsUpdate(jid,[who],'promote');
    await sock.sendMessage(jid,{text:`✅ ترقية @${who.split('@')[0]}`, mentions:[who]}).catch(()=>{})
  }catch{ await sock.sendMessage(jid,{text:'❌ فشل الترقية'}).catch(()=>{}) }
  return
}

if(low.startsWith('.تحذير')){
  let who=m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if(!who) return;
  await sock.sendMessage(jid,{text:`⚠️ تحذير لـ @${who.split('@')[0]} احترم القوانين`, mentions:[who]}).catch(()=>{});
  return
}

if(low.startsWith('.بان') &&!low.includes('فك')){
  let who=m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if(!who) return;
  banned[who]=true; save();
  await sock.sendMessage(jid,{text:`⛔ بان @${who.split('@')[0]}`, mentions:[who]}).catch(()=>{});
  return
}

if(low.startsWith('.فك بان')){
  let who=m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if(!who) return;
  delete banned[who]; save();
  await sock.sendMessage(jid,{text:`✅ فك بان @${who.split('@')[0]}`, mentions:[who]}).catch(()=>{});
  return
}

if(low.startsWith('.اعطي نقطه')){
  let who=m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if(!who) return;
  points[who]=(points[who]||0)+1;
  if(points[who]>5) points[who]=5;
  if(points[who]>=5) voiceUsers[who]=true;
  save();
  await sock.sendMessage(jid,{text:`⬆️ @${who.split('@')[0]} بقا لفل ${points[who]}`, mentions:[who]}).catch(()=>{});
  return
}

if(low.startsWith('.سحب نقطه')){
  let who=m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if(!who) return;
  points[who]=Math.max(0,(points[who]||0)-1);
  save();
  await sock.sendMessage(jid,{text:`⬇️ @${who.split('@')[0]} بقا ${points[who]}`, mentions:[who]}).catch(()=>{});
  return
}

if(low=='.نقاطي'||low=='.ليفلي'){
  let lvl=getLevel(snd);
  let txt=`👑 لفلك ${lvl}/5\n`;
  for(let i=1;i<=5;i++) txt+=`${lvl>=i?'✅':'🔒'} لفل ${i}: ${LEVELS[i]}\n`;
  await sock.sendMessage(jid,{text:txt}).catch(()=>{});
  return
}

if(low=='.قائمة الفويس'){
  let l=Object.keys(voiceUsers);
  await sock.sendMessage(jid,{text:`🎤 فويس: ${l.map(a=>'@'+a.split('@')[0]).join(', ')||'مفيش'}`, mentions:l}).catch(()=>{});
  return
}

if(low=='.ايدي'){ await sock.sendMessage(jid,{text:`🆔 @${snd.split('@')[0]}\nلفل: ${getLevel(snd)}`, mentions:[snd]}).catch(()=>{}); return }
if(low=='.الاحصائيات'){ await sock.sendMessage(jid,{text:`📊 جروبات: ${Object.keys(isOn).length}\nبان: ${Object.keys(banned).length}\nفويس: ${Object.keys(voiceUsers).length}`}).catch(()=>{}); return }

if(low.startsWith('.بث')){
  let txt=raw.replace('.بث','').trim();
  if(!txt) return await sock.sendMessage(jid,{text:'❌ اكتب نص البث'}).catch(()=>{});
  for(let gid of Object.keys(isOn)){
    if(isOn[gid]) await sock.sendMessage(gid,{text:`📢 بث من المطور:\n${txt}`}).catch(()=>{})
  }
  await sock.sendMessage(jid,{text:'✅ تم البث'}).catch(()=>{});
  return
}

if(low=='.مميزات'){
await sock.sendMessage(jid,{text:`╭─━━━ 𓆩 ༽ 1006 prototype ༼𓆪 ━━━─╮
│ المطور: 𝕭𝖑𝖚𝖊𓆩 ༽𝕴𝖙𝖆𝖉𝖔𝖗𝖎 𝖄𝖚𝖏𝖎༼⁠𓆪
│ الاصدار: V4.0 - Monster NoCrash
│ الحالة: 🟢 Online - يفكر...💀
╰─━━━━━━━━━━━━━━━─╯

┏━━━『 🎮 اوامر الاعضاء 』━━━┓
┃
┃ •.مميزات - عرض القائمة
┃ •.صراحه - لعبة صراحه
┃ •.اسئله - اسئله ذكاء
┃ •.حظ - حظك اليوم 🔮
┃ •.استيكر - صورة لاستيكر [لفل2]
┃ •.صورة - استيكر لصورة [لفل2]
┃ •.نقاطي /.ليفلي - مستواك 📊
┃ • يا 1006 + سؤالك - كلم الوحش [لفل4] 🤖
┃ •.صوت + كلامك - الوحش يتكلم فويس [لفل5] 🎤
┃
┗━━━━━━━━━━━━━━━━━━━━┛

┏━━━『 👥 اوامر الجروب 』━━━┓
┃
┃ •.منشن - منشن للكل [لفل3]
┃ •.طرد @ - طرد عضو
┃ •.ترقية @ - رفع ادمن
┃ •.تحذير @ - تحذير عضو
┃ •.ايدي - معلوماتك
┃
┗━━━━━━━━━━━━━━━━━━━━┛

┏━━━『 👑 اوامر المطور 』━━━┓
┃
┃ • 1006 - تفعيل البوت ✅
┃ •.قفل البوت /.فتح البوت
┃ •.قفل الشات /.فتح الشات
┃ •.مانع الشتايم /.الغاء مانع الشتايم
┃ •.بث - اذاعة لكل الجروبات
┃ •.بان @ /.فك بان @ - حظر من البوت ⛔
┃ •.اعطي نقطه @ /.سحب نقطه @ ⬆️
┃ •.قائمة الفويس - مين معاه فويس 🎤
┃ •.الاحصائيات
┃
┗━━━━━━━━━━━━━━━━━━━━┛

┏━━━『 💀 نظام الليفلات 』━━━┓
┃
┃ 🟢 لفل 1: العاب - تلقائي اول دخول
┃ 🔵 لفل 2: استيكر وصورة
┃ 🟡 لفل 3: منشن
┃ 🟠 لفل 4: تكلم الوحش
┃ 🔴 لفل 5: فويس الوحش
┃
┗━━━━━━━━━━━━━━━━━━━━┛

📝 اكتب الامر بدون [ ]
⚡ المطور: ايتادوري العالمي 👑
`}).catch(()=>{})
return
}

if(low=='.صراحه'){
  if(getLevel(snd)<1 &&!isOwner) return;
  await sock.sendMessage(jid,{text:`🎭 ${SARAH[Math.floor(Math.random()*SARAH.length)]}`}).catch(()=>{});
  return
}
if(low=='.اسئله'){
  if(getLevel(snd)<1 &&!isOwner) return;
  await sock.sendMessage(jid,{text:`🧠 ${ASILA[Math.floor(Math.random()*ASILA.length)]}`}).catch(()=>{});
  return
}
if(low=='.حظ'){
  if(getLevel(snd)<1 &&!isOwner) return;
  await sock.sendMessage(jid,{text:`🔮 ${HAZ[Math.floor(Math.random()*HAZ.length)]}`}).catch(()=>{});
  return
}

if(low=='.استيكر'||low=='.ملصق'){
  if(getLevel(snd)<2 &&!isOwner) return await sock.sendMessage(jid,{text:'🔒 محتاج لفل 2'}).catch(()=>{});
  let q=m.message.extendedTextMessage?.contextInfo?.quotedMessage;
  let md=q?{message:q,key:m.key}:m;
  try{
    let b=await downloadMediaMessage(md,'buffer',{}, {logger:P({level:'silent'}), reuploadRequest:sock.updateMediaMessage});
    if(!b) throw new Error('no buffer')
    await sock.sendMessage(jid,{sticker:b}).catch(()=>{})
  }catch{ await sock.sendMessage(jid,{text:'❌ رد على صورة او فيديو'}).catch(()=>{}) }
  return
}

if(low=='.صورة'){
  if(getLevel(snd)<2 &&!isOwner) return await sock.sendMessage(jid,{text:'🔒 محتاج لفل 2'}).catch(()=>{});
  let q=m.message.extendedTextMessage?.contextInfo?.quotedMessage;
  if(!q?.stickerMessage) return await sock.sendMessage(jid,{text:'❌ رد على استيكر'}).catch(()=>{});
  try{
    let b=await downloadMediaMessage({message:q,key:m.key},'buffer',{}, {logger:P({level:'silent'}), reuploadRequest:sock.updateMediaMessage});
    await sock.sendMessage(jid,{image:b}).catch(()=>{})
  }catch{ await sock.sendMessage(jid,{text:'❌ فشل تحويل الاستيكر'}).catch(()=>{}) }
  return
}

if(low.startsWith('.صوت')){
  if(getLevel(snd)<5 &&!isOwner &&!isDev) return await sock.sendMessage(jid,{text:'🔒 محتاج ليفل 5 🎤'}).catch(()=>{});
  let txt=raw.replace('.صوت','').trim();
  if(!txt) return await sock.sendMessage(jid,{text:'❌ اكتب.صوت + كلامك'}).catch(()=>{});
  await sock.sendMessage(jid,{text:'⏳ *1006 يفكر...* 💀'}).catch(()=>{})
  await textToVoiceAI(txt,jid,sock,isDev)
  return
}

if((low.includes('1006')||low.startsWith('يا بوت')||low.startsWith('يا 1006')) && raw.length>2){
  if(low.startsWith('.')) return
  if(isGroup && getLevel(snd)<4 &&!isOwner &&!isDev) return await sock.sendMessage(jid,{text:'🔒 محتاج لفل 4 🤖'}).catch(()=>{});
  await sock.sendMessage(jid,{text:'⏳ يفكر... 💀'}).catch(()=>{})
  let ans=await askAI(raw,isDev);
  if(ans) await sock.sendMessage(jid,{text:ans}).catch(()=>{})
  return
}

}catch(e){ console.log('Error in message handler:', e) }
})
}
start()