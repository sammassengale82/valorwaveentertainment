const fs = require("fs");
const matter = require("gray-matter");

module.exports = () => {
  const file = fs.readFileSync("src/content/settings/site.md", "utf8");
  const { data } = matter(file);
  return data;
};