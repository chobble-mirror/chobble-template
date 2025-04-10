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
  const { getThumbnailData } = require("./src/_lib/thumbnails");

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

  eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
    formats: ["webp", "jpeg"],
    widths: [240, 480, 900, 1300, "auto"],
    svgShortCircuit: true,
    outputDir: ".image-cache",
    urlPath: "/img/",
    htmlOptions: {
      imgAttributes: {
        loading: "lazy",
        decoding: "async",
      },
      pictureAttributes: {},
    },
  });
  eleventyConfig.on("eleventy.after", () => {
    fs.cpSync(".image-cache/", "_site/img/", { recursive: true });
  });

  eleventyConfig.addCollection("images", (_) => {
    return images.map((i) => i.split("/")[2]).reverse();
  });

  eleventyConfig.addCollection("categories", (collectionApi) => {
    const categories = collectionApi.getFilteredByTag("category");

    if (!categories || categories.length == 0) return [];

    const categoryImages = {};
    categories.forEach((category) => {
      categoryImages[category.fileSlug] = [category.data.header_image, -1];
    });
    const products = collectionApi.getFilteredByTag("product");

    products.forEach((product) => {
      const order = product.data.order || 0;
      const productCategories = product.data.categories || [];
      const image = product.data.header_image;
      productCategories.forEach((category) => {
        if (
          image &&
          (!categoryImages[category] || categoryImages[category][1] < order)
        )
          categoryImages[category] = [image, order];
      });
    });

    return categories.map((category) => {
      category.data.header_image = categoryImages[category.fileSlug]?.[0];
      const thumbnailData = getThumbnailData(category.data.header_image);
      if (thumbnailData) {
        category.data.thumbnail_base64 = thumbnailData.base64;
        category.data.thumbnail_aspect_ratio = thumbnailData.aspect_ratio;
      }
      return category;
    });
  });

  eleventyConfig.addCollection("products", (collectionApi) => {
    let products = collectionApi.getFilteredByTag("product");

    products = products.map((product) => {
      const thumbnailData = getThumbnailData(product.data.header_image);
      if (thumbnailData) {
        product.data.thumbnail_base64 = thumbnailData.base64;
        product.data.thumbnail_aspect_ratio = thumbnailData.aspect_ratio;
      }
      return product;
    });

    return products.map((product) => {
      const gallery = product.data.gallery;
      if (gallery) {
        product.data.gallery = Object.entries(product.data.gallery).map(
          (image) => {
            const thumbnailData = getThumbnailData(image[1]);
            let imageObj = { data: {} };
            if (thumbnailData) {
              imageObj.data.thumbnail_base64 = thumbnailData.base64;
              imageObj.data.thumbnail_aspect_ratio = thumbnailData.aspect_ratio;
            }
            return Object.assign(imageObj, {
              alt: image[0],
              filename: image[1],
            });
          },
        );
      }
      return product;
    });
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
