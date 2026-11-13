// JJ3D v4.11.69 — Export PNG + ZIP local : aucune donnée envoyée à un service externe.
const utf8 = new TextEncoder();
function safeName(value) { return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,74) || 'article'; }
function saveFile(blob, filename) { const uri=URL.createObjectURL(blob), a=document.createElement('a');a.href=uri;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(uri),15000); }
function makeQRCanvas(url){if(typeof QRCode!=='function')throw new Error('Librairie QR indisponible. Vérifie ta connexion et recharge JJ3D.');const holder=document.createElement('div');holder.style.cssText='position:fixed;left:-9999px;top:0;pointer-events:none';document.body.append(holder);try{new QRCode(holder,{text:url,width:320,height:320,correctLevel:QRCode.CorrectLevel.M});const canvas=holder.querySelector('canvas');if(!canvas)throw new Error('QR non généré');const result=document.createElement('canvas');result.width=result.height=320;result.getContext('2d').drawImage(canvas,0,0);return result;}finally{holder.remove();}}
function drawText(ctx,text,x,y,width,{font='bold 28px sans-serif',color='#172033',lineHeight=34,maxLines=2}={}){ctx.font=font;ctx.fillStyle=color;const words=String(text).split(/\s+/);const lines=[];let row='';for(const word of words){const candidate=row?row+' '+word:word;if(ctx.measureText(candidate).width>width&&row){lines.push(row);row=word;}else row=candidate;}if(row)lines.push(row);for(let i=0;i<Math.min(lines.length,maxLines);i++){let line=lines[i];if(i===maxLines-1&&lines.length>maxLines){while(line.length&&ctx.measureText(line+'…').width>width)line=line.slice(0,-1);line+='…';}ctx.fillText(line,x,y+i*lineHeight);}return y+Math.min(lines.length,maxLines)*lineHeight;}
async function pngFor(p,url){const canvas=document.createElement('canvas');canvas.width=620;canvas.height=760;const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,620,760);ctx.fillStyle='#24153f';ctx.fillRect(0,0,620,95);ctx.fillStyle='#ffffff';ctx.font='bold 42px sans-serif';ctx.fillText('JJ3D',36,62);ctx.font='22px sans-serif';ctx.fillText('FICHE PRODUIT',385,58);
 let y=140;y=drawText(ctx,p.name||'Article',36,y,548,{font:'bold 32px sans-serif',lineHeight:40,maxLines:2})+8;ctx.fillStyle='#50546b';ctx.font='22px sans-serif';ctx.fillText('ID stock : #'+String(p.shopId||p.id),36,y+8);y+=43;ctx.font='bold 29px sans-serif';ctx.fillStyle='#24153f';ctx.fillText(new Intl.NumberFormat('fr-CA',{style:'currency',currency:'CAD'}).format(Number(p.price)||0),36,y+10);y+=35;
 const qr=makeQRCanvas(url);ctx.drawImage(qr,150,Math.max(290,y+13),320,320);ctx.fillStyle='#50546b';ctx.font='20px sans-serif';ctx.textAlign='center';ctx.fillText('Scanne pour voir la fiche et les photos',310,705);ctx.textAlign='left';return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Création PNG impossible')),'image/png'));}
const filename=p=>`JJ3D-${safeName(p.shopId||p.id)}-${safeName(p.name)}.png`;
export async function downloadQrLabel(p,url){saveFile(await pngFor(p,url),filename(p));}
const crcTable=Uint32Array.from({length:256},(_,i)=>{let c=i;for(let j=0;j<8;j++)c=(c&1)?0xEDB88320^(c>>>1):c>>>1;return c>>>0;});
function crc32(data){let c=0xFFFFFFFF;for(const b of data)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0;}
function zipFiles(entries){const parts=[],central=[];let offset=0;const u16=(v)=>[v&255,(v>>>8)&255],u32=(v)=>[v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255];for(const {name,data} of entries){const n=utf8.encode(name),crc=crc32(data),size=data.length;const local=new Uint8Array([0x50,0x4b,0x03,0x04,...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(size),...u32(size),...u16(n.length),...u16(0)]);parts.push(local,n,data);central.push(new Uint8Array([0x50,0x4b,0x01,0x02,...u16(20),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(size),...u32(size),...u16(n.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(offset)]),n);offset+=local.length+n.length+size;}const centralSize=central.reduce((n,x)=>n+x.length,0);const end=new Uint8Array([0x50,0x4b,0x05,0x06,...u16(0),...u16(0),...u16(entries.length),...u16(entries.length),...u32(centralSize),...u32(offset),...u16(0)]);return new Blob([...parts,...central,end],{type:'application/zip'});}
export async function downloadQrLabelsZip(products,urlFor,progress){const rows=[];const used=new Set();for(let i=0;i<products.length;i++){const p=products[i],png=await pngFor(p,urlFor(p));let name=filename(p),iSuffix=1;while(used.has(name))name=filename(p).replace(/\.png$/,`-${iSuffix++}.png`);used.add(name);rows.push({name,data:new Uint8Array(await png.arrayBuffer())});progress?.(i+1,products.length);if(i%8===7)await new Promise(r=>setTimeout(r,0));}saveFile(zipFiles(rows),'JJ3D-QR-tous-les-produits.zip');}


// v4.11.69 — Catalogue A4 PDF directement depuis l'inventaire actuel; sans serveur ni ecriture Firebase.
export async function downloadQrCatalogPdf(products,urlFor,progress){
 const Pdf=window.jspdf?.jsPDF;
 if(!Pdf)throw new Error('Le module PDF ne s’est pas chargé. Vérifie ta connexion et recharge la page.');
 if(!products.length)throw new Error('Aucun produit à inclure dans le PDF.');
 const pdf=new Pdf({orientation:'portrait',unit:'mm',format:'a4',compress:true});
 const W=210,H=297,margin=12,header=18,footer=12,gap=7;
 const cellW=(W-2*margin-gap)/2;
 const cellH=(H-header-footer-2*margin-gap)/2;
 const cream='#faf8ff',purple='#24153f';
 const safe=(text,n=48)=>{const v=String(text??'').trim();return v.length>n?v.slice(0,n-1)+'…':v;};
 const title=()=>{pdf.setFillColor(36,21,63);pdf.rect(0,0,W,header,'F');pdf.setTextColor(255,255,255);pdf.setFont('helvetica','bold');pdf.setFontSize(16);pdf.text('JJ3D',margin,11.8);pdf.setFont('helvetica','normal');pdf.setFontSize(10);pdf.text('CATALOGUE QR - BOUTIQUE',W-margin,11.6,{align:'right'});};
 const pageFooter=(n,total)=>{pdf.setDrawColor(220,212,234);pdf.line(margin,H-footer,W-margin,H-footer);pdf.setTextColor(86,81,106);pdf.setFont('helvetica','normal');pdf.setFontSize(8);pdf.text('Scanne pour voir le produit et laisser un message dans JJ3D',margin,H-5);pdf.text(`${n} / ${total}`,W-margin,H-5,{align:'right'});};
 // Page de couverture : instructions d'utilisation pour le suivi de vente Boutique.
 title();pdf.setTextColor(36,21,63);pdf.setFontSize(23);pdf.setFont('helvetica','bold');pdf.text('Codes QR des produits',margin,43);
 pdf.setTextColor(65,58,81);pdf.setFontSize(12);pdf.setFont('helvetica','normal');
 pdf.text(`${products.length} articles / variantes | Document actualisé automatiquement`,margin,53);
 pdf.setFillColor(250,248,255);pdf.setDrawColor(216,206,234);pdf.roundedRect(margin,66,W-2*margin,92,3,3,'FD');
 pdf.setTextColor(36,21,63);pdf.setFont('helvetica','bold');pdf.setFontSize(15);pdf.text('Pour la Boutique',margin+9,82);
 pdf.setFont('helvetica','normal');pdf.setFontSize(11);pdf.setTextColor(61,57,75);
 ["1. Scanne le code QR de l'article avec ton téléphone.","2. Ouvre la fiche du produit dans JJ3D.","3. Écris un message, par exemple : Vendu.","4. Envoie le message pour informer l'atelier."].forEach((line,i)=>pdf.text(line,margin+9,97+i*13));
 pdf.setFontSize(10);pdf.setTextColor(90,85,106);
 pdf.text('Un compte Boutique autorisé et une connexion Internet sont nécessaires.',margin,177);
 pdf.text('Le PDF est une copie imprimable : pour ajouter des articles, télécharge-le à nouveau.',margin,185);
 pdf.setFont('helvetica','bold');pdf.setFontSize(11);pdf.setTextColor(36,21,63);
 pdf.text('JJ3D  |  Gestion des ventes et de la production',margin,206);
 pageFooter(1,1+Math.ceil(products.length/4));
 const totalPages=1+Math.ceil(products.length/4);
 for(let i=0;i<products.length;i++){
   const p=products[i];
   if(i%4===0){pdf.addPage();title();}
   const slot=i%4, col=slot%2,row=Math.floor(slot/2);
   const x=margin+col*(cellW+gap),y=header+margin+row*(cellH+gap);
   pdf.setDrawColor(222,216,231);pdf.setFillColor(255,255,255);pdf.roundedRect(x,y,cellW,cellH,3,3,'FD');
   // Use the same previously implemented and approved printable PNG card layout.
   const png=await pngFor(p,urlFor(p));
   const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Lecture image QR impossible'));reader.readAsDataURL(png);});
   const imageW=cellW-8,imageH=imageW*760/620;
   pdf.addImage(dataUrl,'PNG',x+4,y+4,imageW,imageH,undefined,'FAST');
   // Short visible caption is useful for cutting / searching IDs.
   pdf.setTextColor(82,77,101);pdf.setFontSize(7.5);pdf.setFont('helvetica','normal');
   pdf.text(`Article #${String(p.shopId||p.id).slice(0,34)}`,x+cellW/2,y+cellH-6,{align:'center'});
   progress?.(i+1,products.length);
   if((i+1)%4===0||i===products.length-1)pageFooter(2+Math.floor(i/4),totalPages);
   if(i%8===7)await new Promise(resolve=>setTimeout(resolve,0));
 }
 pdf.save('JJ3D-catalogue-QR-'+new Date().toISOString().slice(0,10)+'.pdf');
}
