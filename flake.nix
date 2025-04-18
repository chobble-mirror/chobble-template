{
  inputs = {
    nixpkgs.url = "nixpkgs";
  };

  outputs =
    { self, nixpkgs }:
    let
      systems = [
        "x86_64-linux"
        # "aarch64-linux"
      ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f system);

      makeDeps =
        pkgs: with pkgs; [
          biome # linting
          nodejs_23
        ];

      mkUtils =
        system:
        let
          pkgs = import nixpkgs { inherit system; };
          deps = makeDeps pkgs;
          nodeModules = pkgs.mkYarnModules {
            pname = "chobble-template-dependencies";
            version = "1.0.0";
            packageJSON = ./package.json;
            yarnLock = ./yarn.lock;
            yarnFlags = [
              "--frozen-lockfile"
            ];
          };

          mkScript =
            name:
            let
              base = pkgs.writeScriptBin name (builtins.readFile ./bin/${name});
              patched = base.overrideAttrs (old: {
                buildCommand = "${old.buildCommand}\n patchShebangs $out";
              });
            in
            pkgs.symlinkJoin {
              inherit name;
              paths = [ patched ] ++ deps;
              buildInputs = [ pkgs.makeWrapper ];
              postBuild = ''
                wrapProgram $out/bin/${name} --prefix PATH : $out/bin
              '';
            };

          scripts = builtins.attrNames (builtins.readDir ./bin);

          scriptPkgs = builtins.listToAttrs (
            map (name: {
              inherit name;
              value = mkScript name;
            }) scripts
          );

          site = pkgs.stdenv.mkDerivation {
            name = "chobble-template";
            src = ./.;
            buildInputs = deps ++ [ nodeModules ];

            buildPhase = ''
              mkdir -p $TMPDIR/build_dir
              cd $TMPDIR/build_dir

              cp -r $src/* .
              cp -r $src/.image-cache .
              chmod -R a+rwX .image-cache
              cp $src/.eleventy.js .

              ln -s ${nodeModules}/node_modules node_modules

              mkdir -p src/_data
              chmod -R +w src/_data

              ${scriptPkgs.build}/bin/build
            '';

            installPhase = ''
              mkdir -p $out
              mv $TMPDIR/build_dir/_site $out/
              mv $TMPDIR/build_dir/.image-cache $out/
            '';

            dontFixup = true;
          };
        in
        {
          inherit
            pkgs
            deps
            mkScript
            scripts
            scriptPkgs
            site
            nodeModules
            ;
        };
    in
    {
      packages = forAllSystems (
        system:
        let
          pkgsFor = mkUtils system;
        in
        (with pkgsFor; {
          inherit site nodeModules;
        })
        // pkgsFor.scriptPkgs
      );

      defaultPackage = forAllSystems (system: self.packages.${system}.site);
      devShells = forAllSystems (
        system:
        let
          pkgsFor = mkUtils system;
        in
        rec {
          default = dev;
          dev = pkgsFor.pkgs.mkShell {
            buildInputs = pkgsFor.deps ++ (builtins.attrValues pkgsFor.scriptPkgs);

            shellHook = ''
              rm -rf node_modules
              ln -s ${pkgsFor.nodeModules}/node_modules node_modules
              cat <<EOF

              Development environment ready!

              Available commands:
               - 'serve'      - Start development server
               - 'build'      - Build the site in the _site directory
               - 'dryrun'     - Perform a dry run build
               - 'test_flake' - Test building a site using flake.nix
               - 'lint'       - Lint all files in src using Biome

              EOF

              git pull
            '';
          };
        }
      );
    };
}
