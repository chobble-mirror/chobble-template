const extractTags = (collection) => {
	const allTags = collection
		.filter((page) => page.url && !page.data?.no_index)
		.flatMap((page) => page.data?.tags || [])
		.filter((tag) => tag != null)
		.map((tag) => String(tag).trim())
		.filter((tag) => tag !== "");

	return [...new Set(allTags)].sort();
};

const configureTags = (eleventyConfig) => {
	eleventyConfig.addFilter("tags", extractTags);
};

module.exports = {
	extractTags,
	configureTags,
};
