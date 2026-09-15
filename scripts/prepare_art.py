"""Recreate Gatsby's original SVG artwork and Windows icon using stdlib only."""
from pathlib import Path
import struct
import zlib

OUTPUT = Path(__file__).resolve().parent.parent / "public"
LOGO = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="32" fill="#17141c"/>
  <circle cx="64" cy="60" r="43" fill="none" stroke="#d7b77c" stroke-opacity=".35"/>
  <path d="M28 42q18-5 36 6q18-11 36-6v47q-18-5-36 6q-18-11-36-6z" fill="#302323" stroke="#d7b77c" stroke-width="3" stroke-linejoin="round"/>
  <path d="M64 48v47M37 54l18 5M37 65l18 5M73 59l18-5M73 70l18-5" fill="none" stroke="#d7b77c" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M89 22v12M83 28h12" stroke="#8cbac7" stroke-width="2" stroke-linecap="round"/>
</svg>
'''
SCENE = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1400 1000">
  <defs>
    <linearGradient id="night" x2="1" y2="1"><stop stop-color="#17141c"/><stop offset="1" stop-color="#392c30"/></linearGradient>
    <radialGradient id="glow"><stop stop-color="#d7b77c" stop-opacity=".48"/><stop offset="1" stop-color="#d7b77c" stop-opacity="0"/></radialGradient>
    <linearGradient id="window" x2="0" y2="1"><stop stop-color="#d7b77c" stop-opacity=".7"/><stop offset="1" stop-color="#bd7f8f" stop-opacity=".12"/></linearGradient>
  </defs>
  <path fill="url(#night)" d="M0 0h1400v1000H0z"/>
  <ellipse cx="1040" cy="460" rx="510" ry="480" fill="url(#glow)"/>
  <g fill="url(#window)" stroke="#d7b77c" stroke-opacity=".32" stroke-width="3">
    <path d="M840 690V280a120 120 0 0 1 240 0v410z"/><path d="M1130 700V365a85 85 0 0 1 170 0v335z"/>
  </g>
  <g stroke="#17141c" stroke-width="12"><path d="M960 168v522M840 430h240M1215 280v420M1130 495h170"/></g>
  <path d="M0 790q730-90 1400-10v220H0z" fill="#17141c"/>
  <ellipse cx="987" cy="857" rx="278" ry="32" fill="#d7b77c" opacity=".09"/>
  <g stroke="#d7b77c" stroke-linejoin="round" stroke-width="3">
    <path d="M742 779q117-43 226 8q110-51 229-8l-20 99q-109-25-209 18q-97-43-208-18z" fill="#302323"/>
    <path d="M968 787v109M775 798q94-20 166 17M786 825q84-13 155 14M994 815q71-37 169-17M994 839q67-29 160-14" fill="none" opacity=".65"/>
  </g>
  <g fill="#d7b77c" opacity=".65"><circle cx="735" cy="197" r="3"/><circle cx="1180" cy="132" r="2"/><circle cx="1310" cy="219" r="3"/><circle cx="640" cy="332" r="2"/></g>
  <path d="M1135 186v24M1123 198h24" stroke="#8cbac7" stroke-opacity=".65" stroke-width="2"/>
</svg>
'''

def png(size):
    rows = bytearray()
    for y in range(size):
        rows.append(0)
        for x in range(size):
            px, py = (x + .5) * 128 / size, (y + .5) * 128 / size
            color = (23, 20, 28, 255)
            if 29 <= px <= 99 and 43 <= py <= 91:
                color = (48, 35, 35, 255)
                if px < 32 or px > 96 or py < 46 or py > 88 or abs(px - 64) < 1.7:
                    color = (215, 183, 124, 255)
                if (37 < px < 55 or 73 < px < 91) and (abs(py - 58) < 1.5 or abs(py - 70) < 1.5):
                    color = (215, 183, 124, 255)
            if (abs(px - 89) < 1.4 and 22 < py < 34) or (abs(py - 28) < 1.4 and 83 < px < 95):
                color = (140, 186, 199, 255)
            rows.extend(color)
    def chunk(kind, data):
        return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data))
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(rows)) + chunk(b'IEND', b'')

def main():
    OUTPUT.mkdir(exist_ok=True)
    (OUTPUT / 'gatsby-logo.svg').write_text(LOGO, encoding='utf-8')
    (OUTPUT / 'gatsby-scene.svg').write_text(SCENE, encoding='utf-8')
    sizes = [16, 32, 48, 64, 128, 256]
    images = [png(size) for size in sizes]
    entries, offset = [], 6 + 16 * len(sizes)
    for size, data in zip(sizes, images):
        entries.append(struct.pack('<BBBBHHII', size % 256, size % 256, 0, 0, 1, 32, len(data), offset))
        offset += len(data)
    (OUTPUT / 'gatsby.ico').write_bytes(struct.pack('<HHH', 0, 1, len(sizes)) + b''.join(entries) + b''.join(images))
    print('Prepared original Gatsby artwork and icon; no external files or packages required.')

if __name__ == '__main__':
    main()
