import numpy as np, math, sys
from PIL import Image
im=Image.open('/mnt/user-data/outputs/undangan-raka-sinta/assets-latar/latar-live-guest.png').convert('RGBA')
PW=1672;CH=690;WR=42;THF=math.radians(80);KB=.6
fc=im.crop((0,0,PW,CH))
def topfade(c,f=.14):
    a=np.array(c);h=a.shape[0];n=int(h*f);a[:n,:,3]=(a[:n,:,3]*np.linspace(0,1,n)[:,None]).astype(np.uint8);return Image.fromarray(a)
fc=topfade(fc)
SW=420;WB=round(PW*(2*math.pi-THF)/THF*KB);half=math.ceil(WB/2)+round(170*KB);sw=int(SW*KB);hh=round(CH*KB)
def strip(sx,flip):
    s=im.crop((sx,0,sx+SW,CH)).resize((sw,hh));return s.transpose(Image.FLIP_LEFT_RIGHT) if flip else s
rc=Image.new('RGBA',(half,hh));lc=Image.new('RGBA',(half,hh))
i=0
while i*sw<half:
    rc.paste(strip(PW-SW,i%2==0),(int(i*sw),0));lc.paste(strip(0,i%2==0),(int(half-(i+1)*sw),0));i+=1
ov=2*half-WB;a=np.array(rc).astype(float)
ramp=np.ones(half);ramp[half-ov:]=np.linspace(1,0,ov);a[:,:,3]*=ramp[None,:];rc=Image.fromarray(a.astype(np.uint8))
bc=Image.new('RGBA',(WB,hh));bc.alpha_composite(lc,(WB-half,0));bc.alpha_composite(rc,(0,0));bc=topfade(bc)
F=np.array(fc.transpose(Image.FLIP_LEFT_RIGHT));B=np.array(bc.transpose(Image.FLIP_LEFT_RIGHT))
def render(yaw,dist=9,px=10,pz=12,W=960,H=540):
    py=2.4+dist*.22; cx=px+math.sin(yaw)*dist; cz=pz+math.cos(yaw)*dist; cy=py
    # lookAt (px,2.6,pz)
    fwd=np.array([px-cx,2.6-cy,pz-cz]);fwd/=np.linalg.norm(fwd);right=np.cross(fwd,[0,1,0]);right/=np.linalg.norm(right);up=np.cross(right,fwd)
    f=(H/2)/math.tan(math.radians(25))
    xs,ys=np.meshgrid(np.arange(W)-W/2+.5,np.arange(H)-H/2+.5)
    d=fwd[None,None,:]*f+right[None,None,:]*xs[...,None]-up[None,None,:]*ys[...,None]
    dx,dy,dz=d[...,0],d[...,1],d[...,2]
    A=dx*dx+dz*dz;Bq=2*(cx*dx+cz*dz);C=cx*cx+cz*cz-WR*WR
    t=(-Bq+np.sqrt(np.maximum(Bq*Bq-4*A*C,0)))/(2*A)
    hx=cx+dx*t;hy=cy+dy*t;hz=cz+dz*t
    th=np.arctan2(hx,hz)%(2*math.pi)
    arcH=WR*THF*CH/PW
    v=1-hy/arcH
    out=np.zeros((H,W,4),np.uint8);out[...,:3]=[200,170,230];out[...,3]=255
    fs=(math.pi-THF/2);u=((th-fs)%(2*math.pi))/THF
    inF=u<=1
    bs=math.pi+THF/2;ub=((th-bs)%(2*math.pi))/(2*math.pi-THF)
    def samp(tex,u,v,m):
        h,w=tex.shape[:2];xi=np.clip((u*w).astype(int),0,w-1);yi=np.clip((v*h).astype(int),0,h-1)
        s=tex[yi,xi].astype(float);return s
    sf=samp(F,np.where(inF,u,0),np.clip(v,0,1),inF);sb=samp(B,np.where(inF,0,ub),np.clip(v,0,1),~inF)
    s=np.where(inF[...,None],sf,sb);al=s[...,3:4]/255*((v>=0)&(v<=1))[...,None]
    col=out[...,:3]*(1-al)+s[...,:3]*al
    # ground
    gnd=hy<0
    col=np.where((hy<0)[...,None],np.array([236,213,226]),col)
    return Image.fromarray(col.astype(np.uint8))
tiles=[render(math.radians(y)) for y in (0,90,180,270)]
M=Image.new('RGB',(1920,1080))
for k,t in enumerate(tiles):M.paste(t,((k%2)*960,(k//2)*540))
M.save('pano_sim.png')
