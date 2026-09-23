# San Antonio bicyclist crashes scrolly

This is the standalone static build for the San Antonio bicyclist-crash project. It is intentionally separate from the analysis repository and does not depend on a Google Doc, Gatsby service account or the pedestrian-map repo. It is a simple map scrolly: an overview, followed by nine zoomed-in repeat-crash stretches.

## Data contract

The `data/` directory is generated from the analysis repository's `build_bike_scrolly_assets.ipynb` notebook. The page only needs `stats.json`, `crashes.geojson` and `corridors.geojson`. The current expected audit is:

- 82 qualifying crashes;
- 83 bicyclists;
- 13 deaths;
- 70 suspected serious injuries;
- 80 mapped points, because two qualifying crashes lack coordinates; and
- nine exploratory candidate stretches.

## Run locally

Because browsers block `fetch()` from `file://` pages, serve the directory over HTTP:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

The build uses Leaflet and OpenStreetMap tiles from their public CDNs. The crash and corridor data are local files committed under `data/`.

## Update workflow

1. Run `build_bike_scrolly_assets.ipynb` from the analysis repo.
2. Copy the contents of `outputs/web_data/` into this repo's `data/` directory.
3. Open the local server and confirm that the overview shows 80 points and each corridor step filters to its own points.
4. Deploy this repository as a static site.
