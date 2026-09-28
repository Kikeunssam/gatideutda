// Render Korean glyphs using local browser fonts and embed high-resolution images.
export async function downloadWorksheet() {
  const [{ jsPDF }, { toPng }] = await Promise.all([
    import("jspdf"),
    import("html-to-image"),
  ]);
  await document.fonts.ready;
  const pages = Array.from(
    document.querySelectorAll<HTMLElement>("[data-pdf-page]"),
  );
  if (!pages.length)
    throw new Error("학습지를 준비하지 못했습니다. 다시 시도해주세요.");
  const QRCode = await import("qrcode");
  await Promise.all(
    pages
      .flatMap((page) =>
        Array.from(
          page.querySelectorAll<HTMLImageElement>("img[data-youtube-qr]"),
        ),
      )
      .map(async (image) => {
        image.src = await QRCode.toDataURL(image.dataset.youtubeQr!, {
          width: 344,
          margin: 4,
          errorCorrectionLevel: "M",
          color: { dark: "#000000", light: "#ffffff" },
        });
      }),
  );
  // Worksheet artwork is eager-loaded; wait for decoding before rasterizing it.
  await Promise.all(
    pages
      .flatMap((page) => Array.from(page.querySelectorAll("img")))
      .map((img) => img.decode()),
  );
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });
  let first = true;
  for (const page of pages) {
    const data = await toPng(page, {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      width: 794,
      height: page.scrollHeight,
      skipFonts: true,
    });
    const img = new Image();
    img.src = data;
    await img.decode();
    const source = document.createElement("canvas");
    source.width = img.width;
    source.height = img.height;
    const ctx = source.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const sliceHeight = Math.round((img.width * 297) / 210);
    let y = 0;
    while (y < img.height) {
      let end = Math.min(y + sliceHeight, img.height);
      // Search backwards for a blank horizontal row so long pages don't bisect text.
      if (end < img.height) {
        const scan = ctx.getImageData(0, end - 240, img.width, 240).data;
        for (let row = 239; row >= 0; row--) {
          let ink = false;
          for (let x = 70; x < img.width - 70; x++) {
            const i = (row * img.width + x) * 4;
            if (Math.min(scan[i], scan[i + 1], scan[i + 2]) < 225) {
              ink = true;
              break;
            }
          }
          if (!ink) {
            end = end - 240 + row;
            break;
          }
        }
      }
      if (!first) pdf.addPage();
      first = false;
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = end - y;
      canvas
        .getContext("2d")!
        .drawImage(
          source,
          0,
          y,
          img.width,
          canvas.height,
          0,
          0,
          img.width,
          canvas.height,
        );
      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        0,
        0,
        210,
        (canvas.height / img.width) * 210,
      );
      y = end;
    }
  }
  pdf.save("같이듣다-감상학습지.pdf");
}
