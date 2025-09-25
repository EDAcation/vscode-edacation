let
  unstable = import (fetchTarball "https://github.com/NixOS/nixpkgs/tarball/nixos-unstable") { };
in
{
  pkgs ? import <nixpkgs> { },
}:

pkgs.mkShell {
  packages = with pkgs; [
    nodejs_20
    yarn
    vsce
    unstable.bun
  ];

  shellHook = ''
    CACHE_DIR=".direnv"
    CACHE_PATH="$CACHE_DIR/npm_cache"

    hash () { sha256sum $1 | awk '{print $1}'; }

    cur_hash="$(hash package.json)-$(hash bun.lock)"

    if [[ ! -f "$CACHE_PATH" || "$(cat $CACHE_PATH)" != $cur_hash ]]; then
      echo "Installing Node.js dependencies..."
      bun i

      cur_hash="$(hash package.json)-$(hash bun.lock)"
      echo "$cur_hash" > $CACHE_PATH
    fi
  '';
}
