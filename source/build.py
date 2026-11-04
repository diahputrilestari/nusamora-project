#!/usr/bin/env python3
"""Build wedding.html = base.html + modul src/*.js (urut nama file).
base.html memuat penanda /*@@NM_MODULES@@*/ tempat modul disisipkan. Tambah tema/event/environment: edit src/10-config.js (atau NM.registerTheme / koleksi db liveThemes)."""
import glob,sys,os
D=os.path.dirname(os.path.abspath(__file__))
base=open(D+'/base.html').read()
mods=sorted(f for f in glob.glob(D+'/src/[0-9]*.js'))
code=''.join(open(f).read().rstrip('\n')+'\n' for f in mods)
assert base.count('/*@@NM_MODULES@@*/')==1
out=base.replace('/*@@NM_MODULES@@*/',code)
dst=sys.argv[1] if len(sys.argv)>1 else D+'/wedding-built.html'
open(dst,'w').write(out);print('built',dst,len(out),'modules:',[os.path.basename(f) for f in mods])
