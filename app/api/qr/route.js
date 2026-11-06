import QRCode from 'qrcode';
export async function GET(request){
  const value=new URL(request.url).searchParams.get('url')||'';
  if(value.length>2000||!/^https?:\/\//.test(value))return new Response('',{status:400});
  return new Response(await QRCode.toBuffer(value,{width:256,margin:2}),{headers:{'Content-Type':'image/png','Cache-Control':'public, max-age=3600'}});
}
