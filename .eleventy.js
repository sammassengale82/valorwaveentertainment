const { DateTime } = require("luxon");

module.exports = function (eleventyConfig) {

  // -----------------------------
  // DATE FILTER (REQUIRED)
  // -----------------------------
  eleventyConfig.addFilter("date", (value, format = "LLLL d, yyyy") => {
    return DateTime.fromJSDate(value).toFormat(format);
  });

  // -----------------------------
  // Passthrough assets
  // -----------------------------
  eleventyConfig.addPassthroughCopy("_headers");
  eleventyConfig.addPassthroughCopy("src/admin");
  eleventyConfig.addPassthroughCopy("src/admin/config.yml");
  eleventyConfig.addPassthroughCopy("src/styles.css");
  eleventyConfig.addPassthroughCopy("src/logo.png");
  eleventyConfig.addPassthroughCopy("src/images");

  // Watch CSS for live reload
  eleventyConfig.addWatchTarget("src/styles.css");

  // Layout alias
  eleventyConfig.addLayoutAlias("base", "base.njk");

  // -----------------------------
  // Directory structure
  // -----------------------------
  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site"
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    templateFormats: ["njk", "md", "html"]
  };
};
