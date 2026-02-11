// /public/scripts.js

// Smooth scroll for in-page links
document.querySelectorAll('a.scroll').forEach(link => {
  link.addEventListener('click', e => {
    const href = link.getAttribute('href');
    if (href && href.startsWith('#')) {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }
  });
});

// Mobile menu
const menuButton = document.getElementById('menu-button');
const menuClose = document.getElementById('menu-close');
const mobileMenu = document.getElementById('mobile-menu');

if (menuButton && mobileMenu) {
  menuButton.addEventListener('click', () => {
    mobileMenu.classList.add('open');
  });
}
if (menuClose && mobileMenu) {
  menuClose.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
  });
}

// Back to top button
const backToTop = document.getElementById('back-to-top');
window.addEventListener('scroll', () => {
  if (window.scrollY > 300) {
    backToTop && backToTop.classList.add('show');
  } else {
    backToTop && backToTop.classList.remove('show');
  }
});
backToTop &&
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

// IntersectionObserver for fade-up sections
const observer = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.2 }
);

document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

// Simple frontmatter parser: returns { frontmatter, body }
function parseFrontmatter(text) {
  if (text.startsWith('---')) {
    const end = text.indexOf('---', 3);
    if (end !== -1) {
      const fmRaw = text.slice(3, end).trim();
      const body = text.slice(end + 3).trim();
      const frontmatter = {};
      fmRaw.split('\n').forEach(line => {
        const [key, ...rest] = line.split(':');
        if (!key) return;
        frontmatter[key.trim()] = rest.join(':').trim();
      });
      return { frontmatter, body };
    }
  }
  return { frontmatter: {}, body: text.trim() };
}

// Load markdown into a section by id
function loadSectionMarkdown(path, sectionId) {
  const el = document.getElementById(sectionId);
  if (!el) return;

  fetch(path)
    .then(r => r.text())
    .then(text => {
      const { frontmatter, body } = parseFrontmatter(text);

      // Visibility control
      if (
        typeof frontmatter.visible !== 'undefined' &&
        String(frontmatter.visible).toLowerCase() === 'false'
      ) {
        el.classList.add('hidden-section');
        return;
      }

      // Basic markdown to HTML (very minimal)
      const html = body
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/gim, '<em>$1</em>')
        .replace(/\n\n+/g, '</p><p>')
        .replace(/\n/g, '<br />');

      el.innerHTML = `<p>${html}</p>`;
    })
    .catch(() => {
      // Fail silently
    });
}

// Load core sections
loadSectionMarkdown('/content/home.md', 'home');
loadSectionMarkdown('/content/services.md', 'services');
loadSectionMarkdown('/content/weddings.md', 'weddings');
loadSectionMarkdown('/content/meet-the-dj.md', 'meet-the-dj');
loadSectionMarkdown('/content/meaning.md', 'meaning');
loadSectionMarkdown('/content/service-area.md', 'service-area');
loadSectionMarkdown('/content/hero-discount.md', 'hero-discount');
loadSectionMarkdown('/content/contact.md', 'contact');
loadSectionMarkdown('/content/why-us.md', 'why-us'); // new section

// CUSTOM SECTIONS (manually listed for now)
const customSectionsContainer = document.getElementById('custom-sections');
const customSectionFiles = [
  // Example:
  // { path: '/content/custom-sections/001-sample.md', order: 999 }
];

function loadCustomSections() {
  if (!customSectionsContainer) return;
  if (!customSectionFiles.length) return;

  const sorted = [...customSectionFiles].sort((a, b) => (a.order || 999) - (b.order || 999));

  sorted.forEach(item => {
    fetch(item.path)
      .then(r => r.text())
      .then(text => {
        const { frontmatter, body } = parseFrontmatter(text);

        if (
          typeof frontmatter.visible !== 'undefined' &&
          String(frontmatter.visible).toLowerCase() === 'false'
        ) {
          return;
        }

        const section = document.createElement('section');
        section.className = 'section fade-up';

        const title = frontmatter.title || '';
        const html = body
          .replace(/^### (.*$)/gim, '<h3>$1</h3>')
          .replace(/^## (.*$)/gim, '<h2>$1</h2>')
          .replace(/^# (.*$)/gim, '<h1>$1</h1>')
          .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/gim, '<em>$1</em>')
          .replace(/\n\n+/g, '</p><p>')
          .replace(/\n/g, '<br />');

        section.innerHTML = `
          ${title ? `<h2>${title}</h2>` : ''}
          <p>${html}</p>
        `;

        customSectionsContainer.appendChild(section);

        const divider = document.createElement('div');
        divider.className = 'divider divider-wave';
        customSectionsContainer.appendChild(divider);

        observer.observe(section);
      })
      .catch(() => {});
  });
}

loadCustomSections();

// TESTIMONIALS
const testimonialTrack = document.getElementById('testimonial-track');

// Manually list testimonial files (CMS-managed content)
const testimonialFiles = [
  '/content/testimonials/001-james-emily.md',
  '/content/testimonials/002-sarah-m.md',
  '/content/testimonials/003-pastor-david.md'
];

function loadTestimonials() {
  if (!testimonialTrack) return;

  testimonialFiles.forEach(path => {
    fetch(path)
      .then(r => r.text())
      .then(text => {
        const { frontmatter, body } = parseFrontmatter(text);

        // Approval filter
        if (
          typeof frontmatter.approved !== 'undefined' &&
          String(frontmatter.approved).toLowerCase() === 'false'
        ) {
          return;
        }

        const card = document.createElement('div');
        card.className = 'testimonial-card';

        const html = body
          .replace(/^### (.*$)/gim, '<h3>$1</h3>')
          .replace(/^## (.*$)/gim, '<h2>$1</h2>')
          .replace(/^# (.*$)/gim, '<h1>$1</h1>')
          .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/gim, '<em>$1</em>')
          .replace(/\n\n+/g, '</p><p>')
          .replace(/\n/g, '<br />');

        const name = frontmatter.name || '';

        card.innerHTML = `
          <p>${html}</p>
          ${name ? `<cite>— ${name}</cite>` : ''}
        `;

        testimonialTrack.appendChild(card);
      })
      .catch(() => {});
  });
}

loadTestimonials();

// LIGHTBOX
const lightboxOverlay = document.getElementById('lightbox-overlay');
const lightboxImage = document.getElementById('lightbox-image');

function attachLightbox() {
  const images = document.querySelectorAll('main img');
  images.forEach(img => {
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', () => {
      if (!lightboxOverlay || !lightboxImage) return;
      lightboxImage.src = img.src;
      lightboxOverlay.classList.add('show');
    });
  });
}

lightboxOverlay &&
  lightboxOverlay.addEventListener('click', () => {
    lightboxOverlay.classList.remove('show');
  });

window.addEventListener('load', attachLightbox);

// TESTIMONIAL FORM THANK-YOU POPUP (for testimonials.html)
(function setupTestimonialFormThankYou() {
  const form = document.getElementById('testimonial-form');
  const modal = document.getElementById('testimonial-thankyou');
  const closeBtn = document.getElementById('thankyou-close');

  if (!form || !modal) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    modal.classList.add('show');
  });

  closeBtn &&
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('show');
      window.location.href = '/';
    });
})();