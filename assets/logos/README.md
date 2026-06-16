# Company logos — CV page

The interactive CV (`cv.html`) loads employer logos from this folder.
Drop the files in with **exactly these names** and they appear automatically.
Until a file exists, the CV shows a clean letter-monogram fallback instead
(so nothing ever looks broken).

| File                  | Used for                                   |
|-----------------------|--------------------------------------------|
| `ypsomed.png`         | Ypsomed AG                                 |
| `thermoplan.png`      | Thermoplan AG (3 roles)                    |
| `vapporio.png`        | Vapporio GmbH                              |
| `picobrew.png`        | PicoBrew Inc. (2 roles)                    |

Tips:
- PNG with a transparent background looks best inside the rounded badge.
- Roughly square crops fill the 46×46 badge best; wide wordmarks render small.
- To use a different format (e.g. SVG), rename accordingly and update the
  `src` in `cv.html`, or just ask and it'll be wired up.
