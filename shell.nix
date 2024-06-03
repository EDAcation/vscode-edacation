{ pkgs ? import <nixpkgs> {}}:

pkgs.mkShell {
  packages = with pkgs; [
    nodejs_20
    yarn
  ];

  shellHook = ''
    CACHE_DIR=".direnv"
    CACHE_PATH="$CACHE_DIR/npm_cache"

    hash () { sha256sum $1 | awk '{print $1}'; }
    
    cur_hash="$(hash package.json)-$(hash package-lock.json)"

    if [[ ! -f "$CACHE_PATH" || "$(cat $CACHE_PATH)" != $cur_hash ]]; then
      echo "Installing Node.js dependencies..."
      npm i

      cur_hash="$(hash package.json)-$(hash package-lock.json)"
      echo "$cur_hash" > $CACHE_PATH
    fi
  '';
}
