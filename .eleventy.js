module.exports = async function (eleventyConfig) {
  const fastglob = await import("fast-glob");
  const fg = fastglob.default;
  const fs = await import("fs");
  const images = fg.sync(["src/images/*.jpg"]);
  const markdownIt = await import("markdown-it");
  const md = new markdownIt.default({ html: true });
  const nav = require("@11ty/eleventy-navigation");
  const navUtil = require("@11ty/eleventy-navigation/eleventy-navigation");
  const path = await import("path");
  const { feedPlugin } = require("@11ty/eleventy-plugin-rss");
  const { eleventyImageTransformPlugin } = await import("@11ty/eleventy-img");

  eleventyConfig.addWatchTarget("./src/**/*");
  eleventyConfig
    .addPassthroughCopy("src/assets")
    .addPassthroughCopy("src/images")
    .addPassthroughCopy({
      "src/assets/favicon/*": "/",
    });

  eleventyConfig.addPlugin(nav);

  eleventyConfig.addPlugin(feedPlugin, {
    type: "atom",
    outputPath: "/feed.xml",
    stylesheet: "/assets/pretty-atom-feed.xsl",
    templateData: {
      // eleventyNavigation: {
      //   key: "Feed",
      //   parent: "News",
      //   order: 4,
      // },
    },
    collection: {
      name: "news",
      limit: 20,
    },
    metadata: {
      language: "en",
      title: "example.com",
      subtitle: "",
      base: "https://example.com/",
      author: {
        name: "Example",
      },
    },
  });

  let imageOptions = {
    formats: ["webp", "jpeg", "svg"],
    widths: [240, 480, 900, 1300, "auto"],
    svgShortCircuit: true,
    outputDir: ".cache",
    urlPath: "/img/",
    htmlOptions: {
      imgAttributes: {
        loading: "lazy",
        decoding: "async",
      },
      pictureAttributes: {},
    },
  };

  eleventyConfig.on("eleventy.after", () => {
    fs.cpSync(".cache/", "_site/img/", { recursive: true });
  });

  eleventyConfig.addPlugin(eleventyImageTransformPlugin, imageOptions);

  eleventyConfig.addCollection("images", (collection) => {
    return images.map((i) => i.split("/")[2]).reverse();
  });

  eleventyConfig.addFilter("toNavigation", function (collection, activeKey) {
    return navUtil.toHtml.call(eleventyConfig, collection, {
      activeAnchorClass: "active",
      activeKey: activeKey,
    });
  });

  eleventyConfig.addFilter(
    "getProductsByCategory",
    function (products, categorySlug) {
      return products.filter((product) => {
        if (!product.data.categories) return false;
        return product.data.categories.includes(categorySlug);
      });
    },
  );

  eleventyConfig.addFilter(
    "getFeaturedCategories",
    (categories) => categories?.filter((c) => c.data.featured) || [],
  );

  eleventyConfig.addFilter("pageUrl", (collection, tag, slug) => {
    const result = collection.find(
      (item) => item.data.tags?.includes(tag) && item.fileSlug === slug,
    );
    if (!result) throw new Error(`Couldn't find URL for ${tag} / ${slug}`);
    return result.url;
  });

  eleventyConfig.addFilter("tags", (collection) => {
    const allTags = collection
      .filter((page) => page.url && !page.data.no_index)
      .flatMap((page) => page.data.tags || [])
      .filter((tag) => tag && tag.trim() !== "");
    return [...new Set(allTags)].sort();
  });

  eleventyConfig.addFilter("file_exists", (name) => {
    const snippetPath = path.join(process.cwd(), name);
    return fs.existsSync(snippetPath);
  });

  eleventyConfig.addShortcode("render_snippet", (name) => {
    const snippetPath = path.join(process.cwd(), "src/snippets", `${name}.md`);
    if (!fs.existsSync(snippetPath)) return "";
    const content = fs.readFileSync(snippetPath, "utf8");
    return md.render(content);
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      layouts: "_layouts",
      data: "_data",
    },
    templateFormats: ["liquid", "md", "njk", "html"],
    htmlTemplateEngine: "liquid",
    markdownTemplateEngine: "liquid",
  };
};
