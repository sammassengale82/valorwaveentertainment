const { DateTime } = require("luxon");

module.exports = function (eleventyConfig) {

  // Add missing date filter
  eleventyConfig.addFilter("date", function(value, format = "MMMM d, yyyy") {
    return DateTime.fromJSDate(value).toFormat(format);
  });

  // Your passthrough copies
  eleventyConfig.addPassthroughCopy("images");
  eleventyConfig.addPassthroughCopy("logo.png");
  eleventyConfig.addPassthroughCopy("og-image.jpg");
  eleventyConfig.addPassthroughCopy("robots.txt");
  eleventyConfig.addPassthroughCopy("sitemap.xml");

  // Your blog collection
  eleventyConfig.addCollection("blog", function (collection) {
    return collection.getFilteredByGlob("src/content/blog/*.md");
  });

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site"
    },
    templateFormats: ["njk", "md", "html"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
};