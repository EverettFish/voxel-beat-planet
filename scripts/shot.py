#!/usr/bin/env python3
"""Headless screenshots for screenshot-driven QA (software WebGL, no GPU needed).

Usage: python3 shot.py <project-dir> <out-prefix> <width> <height> "<query1>" "<query2>" ...
Every query should end the render loop with freeze=N so the capture never times out, e.g.
  "shot&fakebeat&norot&t=20&ct=100&freeze=4&cam=372,1.22,0"      orbit view, climate pinned at 100 s
  "shot&fakebeat&norot&t=20&ct=50&freeze=5&focus=swing"          fly-to close-up of a landmark
  "gallery=train,swing&az=0.5&el=0.35&lights=1"                  kit turntable (no planet)
Needs: pip install playwright && playwright install chromium. Console errors are printed; any PAGEERROR is a failed build.
"""
import sys, time, threading, http.server, socketserver, functools
from playwright.sync_api import sync_playwright
# usage: shot.py <dir> <outprefix> <w> <h> query1 query2 ...   (queries should include freeze=N)
d, outp, w, h = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]); qs = sys.argv[5:]
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
socketserver.TCPServer.allow_reuse_address=True
srv = socketserver.ThreadingTCPServer(("127.0.0.1",0), functools.partial(Q, directory=d)); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"])
    for i,q in enumerate(qs):
        pg = b.new_page(viewport={"width":w,"height":h}); logs=[]
        pg.on("console", lambda m: logs.append(m.type+": "+m.text)); pg.on("pageerror", lambda e: logs.append("PAGEERROR: "+str(e)))
        pg.goto(f"http://127.0.0.1:{port}/index.html?{q}")
        t0=time.time()
        while time.time()-t0<150:
            if pg.title()=="FROZEN": break
            if any('PAGEERROR' in l for l in logs): break
            time.sleep(1)
        print(i, 'ready in %.0fs'%(time.time()-t0), pg.title())
        pg.screenshot(path=f"{outp}{i}.png", timeout=120000)
        for l in logs[:10]:
            if 'GPU stall' in l or 'GL Driver' in l or 'deprecated' in l: continue
            print('  ', l[:600])
        pg.close()
    b.close()
