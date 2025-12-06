with import <nixpkgs> {};

mkShell {
  name = "fastapi-env";

  buildInputs = [
    python313
    python313Packages.uvicorn
    python313Packages.pandas
    python313Packages.fastapi
    python313Packages.pytest
    python313Packages.statsmodels
    python313Packages.httpx
  ];
}
