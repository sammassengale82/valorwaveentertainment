module.exports = function (eleventyConfig) {

  // Passthrough assets
  eleventyConfig.addPassthroughCopy("src/styles.css");
  eleventyConfig.addPassthroughCopy("src/logo.png");
  eleventyConfig.addPassthroughCopy("src/images");

  // Watch CSS for live reload
  eleventyConfig.addWatchTarget("src/styles.css");

  // Layouts & includes
  eleventyConfig.addLayoutAlias("base", "base.njk");

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