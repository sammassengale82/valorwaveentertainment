/* ------------------------------
   MARKDOWN LOADER
------------------------------ */

// Simple Markdown → HTML converter (lightweight)
function mdToHtml(md) {
  return md
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>")
    .replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/gim, "<em>$1</em>")
    .replace(/^\> (.*$)/gim, "<blockquote>$1</blockquote>")
    .replace(/\n$/gim, "<br>")
    .replace(/\n/g, "<br>");
}

// Load a markdown file into a section
async function loadSection(id, file) {
  try {
    const res = await fetch(`/content/${file}`);
    const text = await res.text();
    document.getElementById(id).innerHTML = mdToHtml(text);
  } catch (err) {
    console.error(`Failed to load ${file}`, err);
  }
}

/* ------------------------------
   LOAD ALL MAIN SECTIONS
------------------------------ */

loadSection("home", "home.md");
loadSection("services", "services.md");
loadSection("weddings", "weddings.md");
loadSection("meet-the-dj", "meet-the-dj.md");
loadSection("meaning", "meaning.md");
loadSection("service-area", "service-area.md");
loadSection("hero-discount", "hero-discount.md");
loadSection("submit-testimonial", "submit-testimonial.md");
loadSection("contact", "contact.md");

/* ------------------------------
   LOAD TESTIMONIALS
------------------------------ */

async function loadTestimonials() {
  try {
    const res = await fetch("/content/testimonials/");
    const html = await res.text();

    // Extract filenames from directory listing
    const matches = [...html.matchAll(/href="(.*?\.md)"/g)];
    const files = matches.map(m => m[1]);

    const track = document.getElementById("testimonial-track");

    for (const