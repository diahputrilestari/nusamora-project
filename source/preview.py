import json,base64,io,math,sys
from PIL import Image
BG=Image.open('/mnt/user-data/outputs/undangan-raka-sinta/assets-latar/latar-live-guest.png').convert('RGBA')
BW,BH=BG.size; f=(BH/2)/math.tan(math.radians(24)); th=-0.0481
def proj(x,y,z):
    ry=y-9.35; rz=z-30.85
    cy=ry*math.cos(th)+rz*math.sin(th); cz=-ry*math.sin(th)+rz*math.cos(th)
    return BW/2+f*x/(-cz), BH/2-f*cy/(-cz), -cz
def img(uri):
    return Image.open(io.BytesIO(base64.b64decode(uri.split(',',1)[1]))).convert('RGBA')
MEJA=json.load(open('/home/claude/tb/meja.json')); KUL=json.load(open('/home/claude/kul.json')); DEC=json.load(open('/home/claude/assets.json')); GR=json.load(open('/home/claude/gr/groom.json'))
cache={}
def get(src,k):
    key=(id(src),k)
    if key not in cache: cache[key]=img(src[k][0])
    return cache[key]
items=[]
def put(im,x,y,z,w,h):  # w,h world units, bottom-center anchor
    sx,sy,d=proj(x,y,z); k=f/d
    pw,ph=max(1,int(w*k)),max(1,int(h*k)); r=im.resize((pw,ph),Image.LANCZOS)
    items.append((z,r,int(sx-pw/2),int(sy-ph)))
def put_w(im,x,y,z,w): put(im,x,y,z,w,w*im.height/im.width)
TS=1/300;TX=767;TY=930
TOFF={'kursi-belakang-kiri':-.12,'kursi-belakang-kanan':-.12,'meja-bundar':-.04,'lilin-kiri':0,'lilin-kanan':0,'gelas-kiri':.01,'gelas-kanan':.01,'lentera-kiri':.02,'lentera-kanan':.02,'rangkaian-bunga':.04,'kursi-depan-kiri':.12,'kursi-depan-kanan':.12}
def tableset(cx,cz):
    for k,o in TOFF.items():
        d=MEJA[k]; put_w(get(MEJA,k),cx+((d[3]+d[1]/2)-TX)*TS,(TY-(d[4]+d[2]))*TS,cz+o,d[1]*TS)
KS=1/205;KBX=1058;KBY=680
BUFZ={'gapura-kuliner':0,'lampu-gantung-1':.02,'lampu-gantung-2':.02,'stand-kue-1':.02,'stand-kue-2':.02,'tumpukan-piring':.02,'chafing-dish-1':.02,'chafing-dish-2':.02,'chafing-dish-3':.02,'mangkuk-buah':.02,'meja-prasmanan':.05}
def buffet(cx,cz):
    for k,o in BUFZ.items():
        d=KUL[k]; put_w(get(KUL,k),cx+((d[3]+d[1]/2)-KBX)*KS,(KBY-(d[4]+d[2]))*KS,cz+o,d[1]*KS)
def kul1(k,x,z): d=KUL[k]; put_w(get(KUL,k),x,0,z,d[1]*KS)
def deco(k,x,z,w): put_w(get(DEC,k),x,0,z,w)
def avatar(im,x,z,sc=1,w=1.45,h=2.6): put(im,x,0,z,w*sc,h*sc)
exec(open(sys.argv[1]).read())
items.sort(key=lambda t:t[0])
out=BG.copy()
for z,r,x,y in items: out.alpha_composite(r,(x,y)) if 0<=x and 0<=y else out.paste(r,(x,y),r)
out.convert('RGB').save(sys.argv[2])
