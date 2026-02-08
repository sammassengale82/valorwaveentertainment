const yaml = require("js-yaml");
const fs = require("fs");
const path = require("path");

module.exports = () => {
  const filePath = path.join(__dirname, "../content/pages/home.md");
  const raw = fs.readFileSync(filePath, "utf8");

  // Extract frontmatter
  const match = raw.match(/---([\s\S]*?)---/);
  if (!match) return {};

  const data = yaml.load(match[1]);

  return {
    title: data.title,
    hero_kicker: data.hero_kicker,
    hero_tagline: data.hero_tagline,
    hero_subline: data.hero_subline,
    hero_button: data.hero_button,

    services_title: data.services_title,
    services_footer: data.services_footer,

    bio_title: data.bio_title,
    bio_name: data.bio_name,
    bio_image: data.bio_image,
    bio_text: data.bio_text,

    testimonials_title: data.testimonials_title,

    contact_title: data.contact_title,
    contact_form_action: data.contact_form_action,
    contact_button: data.contact_button
  };
};