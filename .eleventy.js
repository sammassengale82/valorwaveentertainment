const { DateTime } = require("luxon");

module.exports = function (eleventyConfig) {

  // Restore date filter
  eleventyConfig.addFilter("date", (value, format = "LLLL d, yyyy") => {
    return DateTime.fromJSDate(value).toFormat(format);
  });

  // Passthrough copy
  eleventyConfig.addPassthroughCopy({ "src/admin": "admin" });
  eleventyConfig.addPassthroughCopy("images");
  eleventyConfig.addPassthroughCopy("src/styles.css");
  eleventyConfig.addPassthroughCopy("src/logo.png");

  // Layout alias
  eleventyConfig.addLayoutAlias("base", "base.njk");

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site"
    },
    templateFormats: ["njk", "md", "html"]
  };
};
