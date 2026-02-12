/* ------------------------------
   Valor Wave CMS - themes.css
   Theme variants: original, multicam, patriotic
   ------------------------------ */

/* BASE (Original) */

body.theme-original {
  --navy: #0a1a2f;
  --navy-light: #132b4a;
  --gold: #d4af37;
  --red: #b22222;
  --bg: #f4f6f8;
  --bg-alt: #e6e9ee;
}

/* ARMY MULTICAM */

body.theme-multicam {
  --navy: #2b3a2f;
  --navy-light: #1f2a22;
  --gold: #c2a35b;
  --red: #8b3a3a;
  --bg: #1a1f18;
  --bg-alt: #252c22;
}

/* Multicam texture effect (CSS only) */
body.theme-multicam .sidebar,
body.theme-multicam .topbar {
  background-image:
    radial-gradient(circle at 10% 20%, rgba(120,130,90,0.35) 0, transparent 55%),
    radial-gradient(circle at 80% 0%, rgba(70,80,50,0.35) 0, transparent 55%),
    radial-gradient(circle at 0% 80%, rgba(90,100,70,0.35) 0, transparent 55%),
    radial-gradient(circle at 80% 80%, rgba(50,60,40,0.35) 0, transparent 55%);
  background-color: var(--navy-light);
}

/* PATRIOTIC */

body.theme-patriotic {
  --navy: #0b1220;
  --navy-light: #111827;
  --gold: #fbbf24;
  --red: #b91c1c;
  --bg: #f3f4f6;
  --bg-alt: #e5e7eb;
}

/* Patriotic subtle flag band in topbar */

body.theme-patriotic .topbar {
  background-image:
    linear-gradient(
      to right,
      #1d4ed8 0%,
      #1d4ed8 20%,
      #ffffff 20%,
      #ffffff 40%,
      #b91c1c 40%,
      #b91c1c 60%,
      #1d4ed8 60%,
      #1d4ed8 100%
    );
  background-size: 200% 100%;
  animation: patriotic-wave 18s linear infinite;
}

@keyframes patriotic-wave {
  0% { background-position: 0% 0; }
  100% { background-position: -100% 0; }
}

/* Ensure text stays readable on animated topbar */

body.theme-patriotic .topbar .brand,
body.theme-patriotic .topbar .controls {
  position: relative;
  z-index: 1;
}

body.theme-patriotic .topbar::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0.45), rgba(0,0,0,0.7));
  z-index: 0;
}

/* Adjust sidebar for patriotic theme */

body.theme-patriotic .sidebar {
  background: #111827;
}

/* Dark mode + themes interplay */

body.dark.theme-multicam {
  --bg: #050806;
  --bg-alt: #11140f;
}

body.dark.theme-patriotic {
  --bg: #020617;
  --bg-alt: #020617;
}
