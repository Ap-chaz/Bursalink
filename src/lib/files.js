export async function compress(file,max=1600,q=.7){if(!file.type.startsWith('image/'))return file
 const img=await createImageBitmap(file),r=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement('canvas')
 c.width=img.width*r;c.height=img.height*r;c.getContext('2d').drawImage(img,0,0,c.width,c.height)
 return new Promise(res=>c.toBlob(b=>res(new File([b],file.name,{type:'image/jpeg'})),'image/jpeg',q))}
