import sys,re
from PIL import Image
PAL={'K':(36,20,28),'H':(246,212,128),'L':(255,244,196),'h':(214,160,80),'d':(160,104,48),
'S':(252,224,196),'s':(238,176,136),'P':(240,140,140),'E':(64,104,196),'e':(28,40,104),'i':(255,255,255),
'W':(250,248,236),'w':(200,196,220),'v':(144,144,176),'B':(68,112,208),'b':(40,72,152),
'O':(150,82,46),'o':(92,44,24)}
def load(path):
    frames={};name=None
    for line in open(path):
        line=line.rstrip('\n')
        if line.startswith('#'):
            parts=line[1:].split();name=parts[0];frames[name]=[];mir['m']= '!mirror' in parts;continue
        if name and line.strip():
            l=line.strip()
            if mir['m']: l=l+l[::-1]
            frames[name].append(l)
    return frames
mir={'m':False}
fr=load(sys.argv[1])
S=8;W=24;H=32
names=list(fr)
sheet=Image.new('RGB',((W+2)*S*len(names),(H+2)*S),(90,150,220))
for i,n in enumerate(names):
    rows=fr[n]
    if len(rows)!=H: print('BAD rows',n,len(rows))
    for y,r in enumerate(rows):
        if len(r)!=W: print('BAD width',n,y,len(r),r)
        for x,c in enumerate(r[:W]):
            if c=='.':continue
            if c not in PAL: print('BAD char',n,y,x,c);continue
            for dy in range(S):
                for dx in range(S):
                    sheet.putpixel(((i*(W+2)+1+x)*S+dx,(1+y)*S+dy),PAL[c])
sheet.save(sys.argv[2])
