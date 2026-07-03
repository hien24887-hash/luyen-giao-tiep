import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// Build config dùng riêng để đóng gói toàn bộ app thành 1 file HTML độc lập
// (inline hết JS/CSS) — phục vụ việc host lên Artifact hoặc chia sẻ file tĩnh.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: "dist-singlefile",
  },
});
