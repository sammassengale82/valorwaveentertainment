<style>
    :root{
      --navy:#0F172A;
      --dark:#020617;
      --gold:#D4AF37;
      --white:#F8FAFC;
      --gray:#CBD5E1;
      --panel: rgba(2, 6, 23, 0.78);
      --border:#1E293B;
    }
    *{box-sizing:border-box;margin:0;padding:0;font-family:Arial,Helvetica,sans-serif}
    body{background:var(--navy);color:var(--white);line-height:1.6}
    a{color:var(--gold);text-decoration:none}

    /* HERO (isolated so nothing can bleed through) */
    header.hero{
      position:relative;
      overflow:hidden;
      isolation:isolate;
      min-height: 640px;
      padding: 42px 18px 72px;
      display:flex;
      align-items:center;
      justify-content:center;
      text-align:center;
      border-bottom:1px solid var(--border);
      background:none;
    }
    header.hero::before{
      content:"";
      position:absolute;
      inset:0;
      background:
        linear-gradient(to bottom, rgba(2,6,23,0.60), rgba(15,23,42,0.93)),
        url("images/hero-wedding.jpg");
      background-size:cover;
      background-position:center;
      z-index:0;
      transform: translateZ(0); /* helps some mobile browsers */
    }
    .hero-inner{
      position:relative;
      z-index:1;
      width:min(980px, 100%);
      padding: 26px 16px;
      border-radius: 16px;
      background: rgba(2,6,23,0.78);
      border: 1px solid rgba(30,41,59,0.55);
    }
    .hero-logo{
      display:block;
      margin: 0 auto 10px;
      width: min(520px, 92%);
      height:auto;
      max-height: 140px; /* prevents “out of place” stretching */
      object-fit: contain;
    }
    .kicker{margin-top:6px;font-size:28px;font-weight:800}
    .tagline{margin-top:10px;color:var(--gold);font-size:24px;font-family:Georgia,"Times New Roman",serif;font-style:italic}
    .subline{margin-top:10px;color:var(--gray);font-size:15px}
    .btn{
      display:inline-block;
      margin-top: 18px;
      padding: 14px 30px;
      background: var(--gold);
      color: var(--dark);
      font-weight: 900;
      border-radius: 10px;
      border:none;
      cursor:pointer;
      text-align:center;
    }

    section{max-width:1100px;margin:auto;padding:70px 18px}
    h2{text-align:center;margin-bottom:38px;font-size:34px;font-family:Georgia,"Times New Roman",serif}

    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px}
    .card{background:var(--panel);border:1px solid var(--border);border-radius:16px;overflow:hidden}
    .card img{
      width:100%;
      height: 220px;
      object-fit: cover;          /* real photos, no embedded text */
      object-position: center;
      display:block;
      background: rgba(2,6,23,0.55);
    }
    .card-body{text-align:center;padding:18px 16px 22px}
    .card-body h3{color:var(--gold);font-family:Georgia,"Times New Roman",serif;font-size:26px;margin-bottom:10px}
    .card-body p{color:var(--gray);font-size:14.5px}

    .service-area{max-width:920px;margin:0 auto;text-align:center;color:var(--gray);font-size:16px}

    .bio-wrap{
      max-width: 920px;
      margin: 0 auto;
      background: var(--panel);
      border:1px solid var(--border);
      border-radius:16px;
      padding: 26px 20px;
    }
    .bio-head{text-align:center;margin-bottom:16px}
    .bio-image{
      width: 150px;
      height: 150px;
      object-fit: cover;
      object-position: 50% 30%;
      border-radius: 16px;
      display:block;
      margin: 0 auto 12px;
      border: 1px solid rgba(212,175,55,0.35);
    }
    .bio-name{color:var(--gold);font-family:Georgia,"Times New Roman",serif;font-size:26px;text-align:center}
    .bio-wrap p{color:var(--gray);font-size:15.5px;margin:10px 0;line-height:1.75}

    form{
      max-width: 760px;
      margin: 0 auto;
      display:grid;
      gap: 12px;
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 22px;
    }
    input, textarea{
      width:100%;
      padding: 14px;
      border-radius: 12px;
      border: 1px solid #0b1220;
      background: rgba(248,250,252,0.95);
      font-size: 16px;
      color: #0b1220;
    }
    textarea{min-height:120px;resize:vertical}
    .form-actions{display:flex;justify-content:center;padding-top:6px}
    footer{padding:40px 18px;text-align:center;background:var(--dark);color:var(--gray);border-top:1px solid var(--border)}
    footer img{max-width:160px;display:block;margin:0 auto 14px}

    /* MOBILE */
    @media (max-width: 720px){
      header.hero{min-height: 600px;padding: 30px 14px 54px}
      .hero-inner{padding: 20px 14px}
      .kicker{font-size:22px}
      .tagline{font-size:20px}
      .subline{font-size:13.5px}
      section{padding: 52px 14px}
      h2{font-size:28px;margin-bottom:26px}
      .grid{grid-template-columns:1fr;gap:18px}
      .card img{height: 200px}
      .bio-wrap{padding: 20px 16px}
      .bio-image{width: 130px;height: 130px}
      .bio-name{font-size:22px}
      .form-actions{justify-content:stretch}
      .form-actions .btn{width:100%}
      .btn{width:100%}
    }
  
    .testimonial-form{
      max-width: 740px;
      margin: 0 auto;
    }
  
    @media (max-width: 640px){
      #calendar iframe{height:520px;}
    }
  
/* Social links */
.social-links{
  display:flex;
  align-items:center;
  gap:14px;
}
.social-links a{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  width:42px;
  height:42px;
  border-radius:999px;
  background: var(--panel);
  border:1px solid var(--border);
  transition: transform .2s ease, background .2s ease;
}
.social-links a:hover{
  background: var(--gold);
  transform: translateY(-2px);
}
.social-links svg{
  width:20px;
  height:20px;
  fill: var(--white);
}

/* Header bar */
.site-header{
  position:sticky;
  top:0;
  z-index:1000;
  background: rgba(2,6,23,.86);
  backdrop-filter: blur(10px);
  border-bottom:1px solid var(--border);
}
.header-inner{
  max-width: 1100px;
  margin: 0 auto;
  padding: 10px 16px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:14px;
}
.brand-mini{
  display:flex;
  align-items:center;
  gap:10px;
  text-decoration:none;
  color: var(--white);
}
.brand-mini img{
  width:38px;
  height:auto;
  display:block;
}
.brand-mini .brand-text{
  font-weight:800;
  letter-spacing:.3px;
}
.header-nav{
  display:flex;
  align-items:center;
  gap:14px;
  flex-wrap:wrap;
  justify-content:flex-end;
}
.header-nav a{
  color: var(--white);
  text-decoration:none;
  font-size:14px;
  opacity:.9;
}
.header-nav a:hover{opacity:1}
.header-cta{
  background: var(--gold);
  color:#000 !important;
  padding:10px 14px;
  border-radius:999px;
  font-weight:800;
}
@media (max-width: 760px){
  .brand-mini .brand-text{display:none;}
  .header-nav a.nav-link{display:none;}
}

/* Mobile quick nav (icons) */
.mobile-quicknav{
  display:none;
  gap:10px;
  align-items:center;
}
.mobile-quicknav a{
  width:40px;height:40px;
  border-radius:999px;
  border:1px solid var(--border);
  background: var(--panel);
  display:inline-flex;
  align-items:center;
  justify-content:center;
}
.mobile-quicknav svg{width:18px;height:18px;fill:var(--white);}
@media (max-width: 760px){
  .header-nav a.nav-link{display:none;}
  .mobile-quicknav{display:flex;}
}
/* Sticky social bar (mobile) */
.sticky-social{
  display:none;
  position:fixed;
  left:12px;
  right:12px;
  bottom:12px;
  z-index:1200;
  border:1px solid var(--border);
  background: rgba(2,6,23,.86);
  backdrop-filter: blur(10px);
  border-radius:18px;
  padding:10px 12px;
}
.sticky-social .inner{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
}
.sticky-social .inner a{
  flex:1;
  display:flex;
  align-items:center;
  justify-content:center;
  gap:8px;
  padding:10px 8px;
  border-radius:14px;
  border:1px solid var(--border);
  text-decoration:none;
  color:var(--white);
  background: var(--panel);
  font-weight:800;
  font-size:14px;
}
.sticky-social svg{width:18px;height:18px;fill:var(--white);}
@media (max-width: 760px){
  .sticky-social{display:block;}
  body{padding-bottom:88px;} /* avoid overlap */
}
</style>