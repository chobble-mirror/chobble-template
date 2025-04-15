const { getThumbnailData } = require("./thumbnails.js");
const Image = require("@11ty/eleventy-img");
const { JSDOM } = require("jsdom");

const DEFAULT_WIDTHS = [240, 480, 900, 1300, "auto"];
const DEFAULT_OPTIONS = {
  formats: ["webp", "jpeg"],
  outputDir: ".image-cache",
  urlPath: "/img/",
  svgShortCircuit: true,
};

async function processAndWrapImage(
  imageName,
  alt,
  classes,
  sizes = "100vw",
  widths = null,
  returnElement = false,
) {
  if (typeof widths === "string") {
    widths = widths.split(",");
  }

  const div = new JSDOM().window.document.createElement("div");
  div.classList.add("img-wrapper");
  if (classes) div.classList.add(...classes);

  const thumbnailData = getThumbnailData(imageName);
  div.style.setProperty("--img-thumbnail", `url('${thumbnailData.base64}')`);
  div.style.setProperty("--img-aspect-ratio", thumbnailData.aspect_ratio);

  const metadata = await Image(`src/images/${imageName}`, {
    ...DEFAULT_OPTIONS,
    widths: widths || DEFAULT_WIDTHS,
  });

  const imageAttributes = {
    alt,
    sizes,
    loading: "lazy",
    decoding: "async",
  };
  if (classes && classes.trim()) imageAttributes.class = classes;
  div.innerHTML = Image.generateHTML(metadata, imageAttributes);

  return returnElement ? div : div.outerHTML;
}

async function imageShortcode(
  imageName,
  alt,
  widths,
  classes = "",
  sizes = "100vw",
) {
  return await processAndWrapImage(
    imageName,
    alt,
    classes,
    sizes,
    widths,
    false,
  );
}

async function transformImages(content) {
  if (!content || !content.includes("<img")) return content;

  const dom = new JSDOM(content);
  const images = dom.window.document.querySelectorAll('img[src^="/images/"]');

  if (images.length === 0) return content;

  await Promise.all(
    Array.from(images).map(async (img) => {
      if (img.parentNode.classList.contains("img-wrapper")) return;
      img.parentNode.replaceChild(
        await processAndWrapImage(
          img.getAttribute("src").replace("/images/", ""),
          img.getAttribute("alt") || "",
          img.getAttribute("class") || "",
          img.getAttribute("sizes") || "100vw",
          img.getAttribute("widths") || "",
          true,
        ),
        img,
      );
    }),
  );

  return dom.serialize();
}

module.exports = {
  imageShortcode,
  transformImages,
};
