const Image = require("@11ty/eleventy-img");
const { JSDOM } = require("jsdom");
const fs = require("fs");
const sharp = require("sharp");

const U = {
	DEFAULT_OPTIONS: {
		formats: ["webp", "jpeg"],
		outputDir: ".image-cache",
		urlPath: "/img/",
		svgShortCircuit: true,
	},
	DEFAULT_WIDTHS: [240, 480, 900, 1300, "auto"],
	DEFAULT_SIZE: "auto",
	ASPECT_RATIO_ATTRIBUTE: "eleventy:aspectRatio",
	makeImagePromise: (imageOrPath, widths) => {
		return Image(imageOrPath, {
			...U.DEFAULT_OPTIONS,
			widths: widths,
		});
	},
	makeThumbnail: async (path) => {
		const thumbnails = await Image(path, {
			...U.DEFAULT_OPTIONS,
			widths: [32],
			formats: ["webp"],
		});
		const [thumbnail] = thumbnails.webp;
		const base64 = fs.readFileSync(thumbnail.outputPath).toString("base64");
		return `url('data:image/webp;base64,${base64}')`;
	},
	getAspectRatio: (aspectRatio, metadata) => {
		if (aspectRatio) return aspectRatio;
		var gcd = function gcd(a, b) {
			return b ? gcd(b, a % b) : a;
		};
		gcd = gcd(metadata.width, metadata.height);
		return `${metadata.width / gcd}/${metadata.height / gcd}`;
	},
	cropImage: async (aspectRatio, sharpImage, metadata) => {
		if (aspectRatio == null) return null;

		// aspectRatio is a string like "16/9"
		const dimensions = aspectRatio.split("/").map((s) => parseFloat(s));
		const aspectFraction = dimensions[0] / dimensions[1];
		const width = metadata.width;
		const height = Math.round(width / aspectFraction);

		return sharpImage.resize(width, height, { fit: "cover" }).toBuffer();
	},
	makeDiv: async (classes, thumbPromise, imageAspectRatio) => {
		const {
			window: { document },
		} = new JSDOM();

		const div = document.createElement("div");
		div.classList.add("image-wrapper");
		if (classes) div.classList.add(classes);

		div.style.setProperty("background-size", "cover");
		div.style.setProperty("background-image", await thumbPromise);
		div.style.setProperty("aspect-ratio", imageAspectRatio);

		return div;
	},
	getHtmlAttributes: (alt, sizes, loading, classes) => {
		const attributes = {
			alt: alt,
			sizes: sizes,
			loading: loading,
			decoding: "async",
		};
		return classes && classes.trim()
			? {
					...attributes,
					classes,
				}
			: attributes;
	},
	getWidths: (widths) => {
		if (typeof widths === "string") {
			widths = widths.split(",");
		}
		return widths || U.DEFAULT_WIDTHS;
	},
	getPath: (imageName) => {
		return imageName.toString().indexOf("/") == 0
			? `./src${imageName}`
			: `./src/images/${imageName}`;
	},
	getDefault: (value, defaultString) => {
		return value == null || value == "" ? defaultString : value;
	},
	makeImageHtml: async (imagePromise, alt, sizes, loading, classes) => {
		return Image.generateHTML(
			await imagePromise,
			U.getHtmlAttributes(
				alt,
				U.getDefault(sizes, U.DEFAULT_SIZE),
				U.getDefault(loading, "lazy"),
				classes,
			),
		);
	},
};

async function processAndWrapImage({
	logName,
	imageName,
	alt,
	classes,
	sizes = null,
	widths = null,
	returnElement = false,
	aspectRatio = null,
	loading = null,
}) {
	const path = U.getPath(imageName);
	const thumbPromise = U.makeThumbnail(path);
	const sharpImage = sharp(path);
	const metadata = await sharpImage.metadata();
	const imageAspectRatio = U.getAspectRatio(aspectRatio, metadata);
	const croppedImageOrNull = await U.cropImage(
		aspectRatio,
		sharpImage,
		metadata,
	);
	const imageOrPath = croppedImageOrNull || path;

	const imagePromise = U.makeImagePromise(imageOrPath, U.getWidths(widths));

	const div = await U.makeDiv(classes, thumbPromise, imageAspectRatio);
	div.innerHTML = await U.makeImageHtml(
		imagePromise,
		alt,
		sizes,
		loading,
		classes,
	);

	return returnElement ? div : div.outerHTML;
}

const fastglob = require("fast-glob");

const findImageFiles = (pattern = ["src/images/*.jpg"]) => {
	return fastglob.sync(pattern);
};

const createImagesCollection = (imageFiles) => {
	return imageFiles.map((i) => i.split("/")[2]).reverse();
};

const copyImageCache = () => {
	if (fs.existsSync(".image-cache/")) {
		fs.cpSync(".image-cache/", "_site/img/", { recursive: true });
	}
};

const createImageTransform = () => {
	return async (content, outputPath) => {
		if (!outputPath || !outputPath.endsWith(".html")) return content;
		return await transformImages(content);
	};
};

const configureImages = (eleventyConfig) => {
	const imageFiles = findImageFiles();

	// Add shortcode
	eleventyConfig.addAsyncShortcode("image", imageShortcode);

	// Add transform
	eleventyConfig.addTransform("processImages", createImageTransform());

	// Add collection
	eleventyConfig.addCollection("images", () =>
		createImagesCollection(imageFiles),
	);

	// Add after event for cache copying
	eleventyConfig.on("eleventy.after", copyImageCache);
};

const imageShortcode = async (
	imageName,
	alt,
	widths,
	classes = null,
	sizes = null,
	aspectRatio = null,
	loading = null,
) => {
	return await processAndWrapImage({
		logName: `imageShortcode: ${imageName}`,
		imageName,
		alt,
		classes,
		sizes,
		widths,
		aspectRatio,
		loading,
		returnElement: false,
	});
};

const transformImages = async (content) => {
	if (!content || !content.includes("<img")) return content;

	const {
		window: { document },
	} = new JSDOM(content);
	const images = document.querySelectorAll('img[src^="/images/"]');

	if (images.length === 0) return content;

	await Promise.all(
		Array.from(images).map(async (img) => {
			if (img.parentNode.classList.contains("image-wrapper")) return;

			const aspectRatio = img.getAttribute(U.ASPECT_RATIO_ATTRIBUTE);
			if (aspectRatio) {
				img.removeAttribute(U.ASPECT_RATIO_ATTRIBUTE);
			}

			const { parentNode } = img;
			parentNode.replaceChild(
				await processAndWrapImage({
					logName: `transformImages: ${img}`,
					imageName: img.getAttribute("src"),
					alt: img.getAttribute("alt"),
					classes: img.getAttribute("class"),
					sizes: img.getAttribute("sizes"),
					widths: img.getAttribute("widths"),
					aspectRatio: aspectRatio,
					loading: null,
					returnElement: true,
				}),
				img,
			);
		}),
	);

	// Fix invalid HTML where divs are the sole child of paragraph tags
	const paragraphs = Array.from(document.querySelectorAll("p"));
	const paragraphsToFix = paragraphs.filter(
		(p) => p.childNodes.length === 1 && p.firstChild.nodeName === "DIV",
	);

	paragraphsToFix.forEach((p) => {
		const { parentNode, firstChild } = p;
		parentNode.insertBefore(firstChild, p);
		parentNode.removeChild(p);
	});

	return new JSDOM(document.documentElement.outerHTML).serialize();
};

module.exports = {
	findImageFiles,
	createImagesCollection,
	copyImageCache,
	createImageTransform,
	configureImages,
	imageShortcode,
	transformImages,
};
