{ pkgs ? import <nixpkgs> {}}:

pkgs.mkShell {
  packages = with pkgs; [
    nodejs_20
    yarn
  ];

  shellHook = ''
    echo "Installing Node.js dependencies..."
    npm i
  '';
}
