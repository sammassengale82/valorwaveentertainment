const fs = require("fs");
const matter = require("gray-matter");

module.exports = () => {
  const dir = "src/content/testimonials";
  const files = fs.readdirSync(dir);

  return files
    .filter(f => f.endsWith(".md"))
    .map(f => {
      const file = fs.readFileSync(`${dir}/${f}`, "utf8");
      const { data, content } = matter(file);
      return {
        name: data.name,
        quote: content.trim()
      };
    });
};