/** JJ3D v4.11.54 — Firebase Cloud Functions v2, Cloud Firestore triggers.
 * Deploy with firebase deploy --only functions,firestore:rules.
 * Events are stored in workspaces/{ownerUid}/notifications and sent by FCM.
 */
'use strict';
const {onDocumentCreated,onDocumentUpdated,onDocumentDeleted}=require('firebase-functions/v2/firestore');
const {initializeApp}=require('firebase-admin/app');
const {getFirestore,FieldValue}=require('firebase-admin/firestore');
const {getMessaging}=require('firebase-admin/messaging');
const {createHash}=require('crypto');
initializeApp();const db=getFirestore();
const ident=(kind,id,state)=>`${kind}:${id}:${state}`;
const docId=key=>createHash('sha256').update(key).digest('hex');
const short=s=>String(s||'').slice(0,100);
const ownerNotifs=uid=>db.collection('workspaces').doc(uid).collection('notifications');
const ownerTokens=uid=>db.collection('workspaces').doc(uid).collection('pushTokens');
const eventLink=kind=>kind==='messages'?'messages.html':'#atelier-demandes';
async function publish(uid,kind,id,state,title,message){
 if(!uid||!id)return;const eventKey=ident(kind,id,state),ref=ownerNotifs(uid).doc(docId(eventKey));
 const written=await db.runTransaction(async t=>{const old=await t.get(ref);if(old.exists)return false;t.create(ref,{eventKey,title:short(title),message:short(message),link:eventLink(kind),at:FieldValue.serverTimestamp(),read:false,kind,recordId:id});return true});
 if(!written)return;
 const devices=await ownerTokens(uid).limit(200).get();if(devices.empty)return;
 const registrations=devices.docs.filter(x=>typeof x.data().token==='string'&&x.data().token.length>10);
 for(let i=0;i<registrations.length;i+=100){const batch=registrations.slice(i,i+100);try{
  const result=await getMessaging().sendEachForMulticast({tokens:batch.map(x=>x.data().token),data:{title:short(title),body:short(message),eventKey,link:eventLink(kind)},webpush:{headers:{Urgency:'high'}}});
  await Promise.all(result.responses.map(async(r,j)=>{if(!r.success&&['messaging/registration-token-not-registered','messaging/invalid-registration-token'].includes(r.error?.code))await batch[j].ref.delete()}));
 }catch(e){console.error('FCM JJ3D',e)}}
}
async function dismiss(uid,kind,id){const ref=ownerNotifs(uid);const snap=await ref.where('kind','==',kind).where('recordId','==',id).limit(100).get();if(snap.empty)return;const batch=db.batch();snap.docs.forEach(d=>batch.delete(d.ref));await batch.commit()}
function payload(kind,id,data){const subject=short(data?.item||data?.productName||data?.customer||data?.name||data?.senderEmail||id);const table={messages:['✉ Message Boutique','Nouveau message reçu'],requests:['📨 Demande Boutique','Nouvelle demande'],orders:['🛒 Commande Boutique','Nouvelle commande'],customRequests:['✨ Commande personnalisée','Nouvelle commande personnalisée']};const [title,desc]=table[kind]||['JJ3D','Nouvelle activité'];return {title,message:desc+' · '+subject}}
function created(kind){return onDocumentCreated({document:`boutiques/{ownerUid}/${kind}/{recordId}`,region:'northamerica-northeast1'},async e=>{const d=e.data?.data();if(!d)return;if(kind==='messages'&&d.read)return;const {title,message}=payload(kind,e.params.recordId,d);await publish(e.params.ownerUid,kind,e.params.recordId,'created',title,message)})}
exports.jj3dNewMessage=created('messages');exports.jj3dNewRequest=created('requests');exports.jj3dNewOrder=created('orders');exports.jj3dNewCustom=created('customRequests');
exports.jj3dCustomUpdate=onDocumentUpdated({document:'boutiques/{ownerUid}/customRequests/{recordId}',region:'northamerica-northeast1'},async e=>{const before=e.data.before.data(),after=e.data.after.data();if(!after)return;if(before?.status!==after.status&&['reviewed','awaiting_payment','payment_reported','paid'].includes(after.status)){const {title}=payload('customRequests',e.params.recordId,after);await publish(e.params.ownerUid,'customRequests',e.params.recordId,after.status,title,'Mise à jour de la commande · '+short(after.item||after.customer)+' ('+after.status+')')}});
exports.jj3dMessageRead=onDocumentUpdated({document:'boutiques/{ownerUid}/messages/{recordId}',region:'northamerica-northeast1'},async e=>{if(!e.data.before.data()?.read&&e.data.after.data()?.read)await dismiss(e.params.ownerUid,'messages',e.params.recordId)});
for(const kind of ['messages','requests','orders','customRequests']){
 exports['jj3dDeleted'+kind]=onDocumentDeleted({document:`boutiques/{ownerUid}/${kind}/{recordId}`,region:'northamerica-northeast1'},async e=>dismiss(e.params.ownerUid,kind,e.params.recordId));
}
