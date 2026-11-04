from PIL import Image,ImageDraw,ImageFilter
import numpy as np,scipy.ndimage as nd,cv2,io,base64,json,os
SRC='/mnt/user-data/attachments/df1831fa-7187-550a-893c-252c16a1df1a/583ebcf7-image.png'
im=Image.open(SRC).convert('RGB');a=np.array(im);H,W=a.shape[:2];ai=a.astype(int)
mn=ai.min(2);mx=ai.max(2);sat=mx-mn
cand=mn>=238;lab,n=nd.label(cand);b=set(lab[0,:])|set(lab[-1,:])|set(lab[:,0])|set(lab[:,-1]);b.discard(0)
bg=np.isin(lab,list(b));fg=~bg
hsv=cv2.cvtColor(a,cv2.COLOR_RGB2HSV);gold=(hsv[...,0]>=10)&(hsv[...,0]<=27)&(hsv[...,1]>=95)
yy,xx=np.mgrid[0:H,0:W]
def poly(pts):
    m=Image.new('L',(W,H),0);ImageDraw.Draw(m).polygon(pts,fill=255);return np.array(m)>0
def rect(x0,y0,x1,y1):
    m=np.zeros((H,W),bool);m[y0:y1,x0:x1]=True;return m
# cloth silhouette (used for hole filling and floor protection)
ell=np.array(Image.new('L',(W,H),0));e=Image.new('L',(W,H),0);ImageDraw.Draw(e).ellipse((768-405,378-86,768+405,378+86),fill=255)
cloth=(np.array(e)>0)|poly([(365,378),(1171,378),(1168,830),(1100,866),(1000,886),(900,906),(770,926),(630,926),(500,896),(400,862),(378,832)])
# objects on the table
lanL=rect(585,226,668,380);lanR=rect(864,226,945,380);canL=rect(666,336,718,402);canR=rect(812,338,864,402)
glL=rect(500,230,562,312)|rect(520,308,546,346)|rect(502,338,560,368);glR=rect(961,230,1024,312)|rect(982,308,1004,346)|rect(966,336,1020,366)
objs_other=lanL|lanR|canL|canR|glL|glR
cp=fg&rect(530,0,990,382)&~objs_other&((yy<290)|(gold&rect(700,290,832,382)))
# chairs
lineL=268+0.3277*(xx-135);aboveL=(yy<lineL)
lineR=345-0.3277*(xx-1175);aboveR=(yy<lineR)
drapeL=poly([(372,296),(412,296),(412,350),(400,425),(380,425),(372,420)])
drapeR=poly([(1135,292),(1197,292),(1197,345),(1185,440),(1160,446),(1142,380),(1138,330)])
cushL=poly([(372,535),(430,533),(500,540),(548,556),(572,578),(578,610),(572,640),(540,655),(480,665),(420,668),(372,668)])
cushR=poly([(962,600),(972,572),(1000,552),(1060,540),(1176,535),(1180,700),(1100,672),(1020,655),(975,640),(962,625)])
sashR=poly([(1160,445),(1200,445),(1200,545),(1165,545)])
FL=fg&(((xx<=372)&(xx>=118)&(yy>=250)&~((xx>=228)&aboveL))|(((cushL)|(gold&(xx>372)&(xx<=620)&(yy>=520)))))
FR=fg&((((xx>=1172)&(yy>=250)&~((xx<=1312)&aboveR)))|cushR|(gold&(xx<1172)&(xx>=940)&(yy>=520))|sashR)
BL=fg&~FL&(xx>=226)&(xx<=482)&((yy<297)|((xx<=378)&aboveL)|drapeL)&(yy>=90)
BR=fg&~FR&(xx>=1058)&(xx<=1312)&(yy>=90)&(((xx<1172)&(yy<296))|((xx>=1172)&aboveR)|drapeR)
chairs=FL|FR|BL|BR
parts={'kursi-depan-kiri':FL,'kursi-depan-kanan':FR,'kursi-belakang-kiri':BL,'kursi-belakang-kanan':BR,
'lentera-kiri':fg&lanL,'lentera-kanan':fg&lanR,'lilin-kiri':fg&canL,'lilin-kanan':fg&canR,'gelas-kiri':fg&glL,'gelas-kanan':fg&glR,'rangkaian-bunga':cp}
taken=chairs|(fg&objs_other)|cp
# floor shadow removal on the remaining pixels
prot=nd.binary_dilation(cloth,iterations=7)|chairs|taken
floor=fg&~prot&(yy>=600)&(mn>=205)&(sat<=34)
floor2=fg&(yy>=800)&(mn>=205)&(sat<=36)&~nd.binary_dilation(cloth,iterations=5)
floor3=fg&(yy>=850)&(mn>=190)&(sat<=19)&~nd.binary_dilation(cloth,iterations=2)
floor4=fg&((xx<548)|(xx>1008)|(yy>=935))&(yy>=845)&(sat<=20)&(mn>=185)&(mn<229)&~gold
floor5=fg&((xx<548)|(xx>1008))&(yy>=858)&(mn<224)&(mn>=150)&(sat<=36)&~gold&((ai[...,0]-ai[...,2])<=36)
floorfull=nd.binary_dilation(floor5,iterations=2)&fg&~gold|nd.binary_dilation(floor4,iterations=1)&fg&~gold|nd.binary_dilation(floor3,iterations=2)&fg&~nd.binary_dilation(cloth,iterations=2)|(nd.binary_dilation(floor,iterations=1)&fg&~prot)|nd.binary_dilation(floor2,iterations=1)&fg&~nd.binary_dilation(cloth,iterations=5)
FL&=~floorfull;FR&=~floorfull;BL&=~floorfull;BR&=~floorfull;parts.update({'kursi-depan-kiri':FL,'kursi-depan-kanan':FR,'kursi-belakang-kiri':BL,'kursi-belakang-kanan':BR})
tableM=fg&~taken&~floorfull
# keep main component(s) only for table
l,nn=nd.label(nd.binary_dilation(tableM,iterations=2));ar=nd.sum(tableM,l,range(1,nn+1));keep=np.zeros_like(tableM)
for i,s in enumerate(ar):
    if s>=0.02*max(ar):keep|=(l==i+1)
tableM=tableM&nd.binary_dilation(keep,iterations=2)
hole=nd.binary_dilation(taken,iterations=3)&cloth&~tableM
base=cv2.inpaint(a,(hole*255).astype('uint8'),7,cv2.INPAINT_TELEA)
tab=np.where(hole[...,None],base,a);tableM=tableM|hole
parts={'meja-bundar':tableM,**parts}
# transparent interior of glasses
out={};os.makedirs('/mnt/user-data/outputs/assets-meja',exist_ok=True)
for k,m in parts.items():
    m=m&nd.binary_dilation(m,iterations=0) if False else m
    er=nd.binary_erosion(m,iterations=1);edge=m&~er&(mn>=232)&(sat<=30);m=m&~edge
    if k not in('meja-bundar',):
        l,nn=nd.label(nd.binary_dilation(m,iterations=2));ar=nd.sum(m,l,range(1,nn+1));kp=np.zeros_like(m)
        for i,s in enumerate(ar):
            if s>=30:kp|=(l==i+1)
        m=m&nd.binary_dilation(kp,iterations=2)
    al=Image.fromarray((m*255).astype('uint8')).filter(ImageFilter.GaussianBlur(.6))
    alpha=np.array(al).astype(float)
    if k.startswith('gelas'):
        sm=(m&(mn>=236)&(sat<=22));alpha=np.where(sm,alpha*.35,alpha)
    src=tab if k=='meja-bundar' else a
    px=Image.fromarray(src).convert('RGBA');px.putalpha(Image.fromarray(alpha.astype('uint8')))
    bb=px.getchannel('A').point(lambda v:255 if v>20 else 0).getbbox();px=px.crop(bb)
    px.save(f'/mnt/user-data/outputs/assets-meja/{k}.png',optimize=True)
    bf=io.BytesIO();px.save(bf,'WEBP',quality=90,method=4)
    out[k]=['data:image/webp;base64,'+base64.b64encode(bf.getvalue()).decode(),px.width,px.height,bb[0],bb[1]]
    print(k,px.size,bb[:2],len(bf.getvalue()))
json.dump(out,open('/home/claude/tb/meja.json','w'))
M=Image.new('RGBA',(W,H),(70,40,80,255))
order=['kursi-belakang-kiri','kursi-belakang-kanan','meja-bundar','lilin-kiri','lilin-kanan','lentera-kiri','lentera-kanan','gelas-kiri','gelas-kanan','rangkaian-bunga','kursi-depan-kiri','kursi-depan-kanan']
for k in order:
    u,w,h,ox,oy=out[k];p=Image.open(f'/mnt/user-data/outputs/assets-meja/{k}.png');M.alpha_composite(p,(ox,oy))
M.save('/home/claude/tb/comp.png')
M2=Image.new('RGBA',(W,H),(70,40,80,255))
p=Image.open('/mnt/user-data/outputs/assets-meja/meja-bundar.png');u,w,h,ox,oy=out['meja-bundar'];M2.alpha_composite(p,(ox,oy));M2.save('/home/claude/tb/tableonly.png')
