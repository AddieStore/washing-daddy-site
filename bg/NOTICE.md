# Background removal files

Used by the customer app (car photos) and the washer app (selfies) through `cutout.js`.

| File | What it is | Licence |
|---|---|---|
| `cutout.js` | Washing Daddy's own code: prepares the photo, runs the model, applies the mask | Washing Daddy |
| `isnet-u8.onnx` | ISNet "general use" model from [DIS](https://github.com/xuebinqin/DIS) by Xuebin Qin et al., converted to ONNX (as published by [rembg](https://github.com/danielgatis/rembg/releases/tag/v0.0.0)), with only the `output_image` output kept and convolution weights stored as uint8 per channel | Apache-2.0, see `LICENSE-Apache-2.0.txt` |
| `ort.js`, `ort-wasm.js`, `ort-wasm.wasm` | [ONNX Runtime Web](https://github.com/microsoft/onnxruntime) 1.22.0 (`ort.wasm.bundle.min.mjs`, `ort-wasm-simd-threaded.mjs/.wasm`, renamed) | MIT, see `LICENSE-onnxruntime-MIT.txt` |

Changes to the model: the extra side outputs were removed and weights were quantised to uint8. Outputs match the original model to within 0.03 per pixel on our test photo.
