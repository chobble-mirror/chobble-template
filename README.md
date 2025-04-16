# The Chobble Template

**⚠️ Don't forget to change the Formspark and Botpoison info in `_site/data.json`!! ⚠️ or in your Forgejo repository's secrets**

**See this template in action at:**

- [example.chobble.com](https://example.chobble.com) (hosted on Neocities)
- [example-pgs.chobble.com](https://example-pgs.chobble.com) (hosted on [Pico.sh](https://pico.sh/pgs))
- [tradesperson-example.chobble.com](https://tradesperson-example.chobble.com) (example builder site)
- [example-bunny.chobble.com](https://example-bunny.chobble.com) (example builder site, hosted on Bunny.net)

**Want a website based on this template? Clone this repo, or hit me up at [Chobble.com](https://chobble.com).**

This should let you get started with the Eleventy static site builder on NixOS / Nix, really easily.

Featuring common business website features like:

- News
- Reviews
- Products
- Galleries
- A contact form using Formspark and Botpoison
- Heading images
- Customisable strings
- Responsive images with `srcset` and [base64 low quality placeholders](https://blog.chobble.com/blog/25-04-16-adding-base64-image-backgrounds-to-eleventy-img/)

And Nix'y features like:

- [direnv](https://direnv.net/) support via `flake.nix` - run `direnv allow`
- or run `nix develop` if you don't have direnv
- `nix-build` support using `flake-compat`
- `serve` shell script to run Eleventy and SASS locally
- `build` shell script to build the site into `_site`

And Eleventy features like:

- Canonical URLs
- A directory to store favicon cruft
- A `_data/site.json` metadata store
- A `collection.images` collection of the files in `src/images`
