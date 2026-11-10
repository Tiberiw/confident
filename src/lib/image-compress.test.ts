import { compressImage, dataUrlBytes, fitWithin } from "./image-compress";

describe("fitWithin", () => {
  it("shrinks landscape images to the max side", () =>
    expect(fitWithin(6000, 3000)).toEqual({ width: 1600, height: 800, scale: 1600 / 6000 }));
  it("shrinks portrait images by height", () =>
    expect(fitWithin(1000, 3000)).toEqual({ width: 533, height: 1600, scale: 1600 / 3000 }));
  it("never upscales", () => expect(fitWithin(800, 400)).toEqual({ width: 800, height: 400, scale: 1 }));
});

it("dataUrlBytes decodes the base64 length", () => {
  expect(dataUrlBytes("data:image/jpeg;base64,AAAA")).toBe(3);
});

describe("compressImage", () => {
  const img = { naturalWidth: 6000, naturalHeight: 3000 } as HTMLImageElement;
  const big = "data:image/jpeg;base64," + "A".repeat(1_000_000);
  const small = "data:image/jpeg;base64,AAAA";
  let drawImage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage } as never);
  });
  afterEach(() => vi.restoreAllMocks());

  it("lowers quality until the image fits", async () => {
    const toDataURL = vi
      .spyOn(HTMLCanvasElement.prototype, "toDataURL")
      .mockImplementation((_type?: string, q?: number) => ((q ?? 1) >= 0.65 ? big : small));
    const out = await compressImage(img);
    expect(out).toEqual({ dataUrl: small, width: 1600, height: 800, scale: 1600 / 6000 });
    expect(drawImage).toHaveBeenCalledWith(img, 0, 0, 1600, 800);
    expect(toDataURL).toHaveBeenLastCalledWith("image/jpeg", 0.55);
  });

  it("throws when the image can't be made small enough", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(big);
    await expect(compressImage(img)).rejects.toThrow("Image too large to store");
  });
});
