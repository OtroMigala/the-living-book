// Unit tests: every *.test.ts under src/ and tools/. `npm run coverage` measures how much of the
// pure core they reach (Q08 AC2): the code that runs without a page or a GPU (pagination, the turn
// gesture, addresses, the content model, the 3D math and the quality tiers). The DOM and WebGL
// code that calls it is tested in real browsers instead (e2e/).
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: [
        'src/pagination/paginate.ts',
        'src/reader/book.ts',
        'src/reader/gesture.ts',
        'src/content/*.ts',
        'src/three/contract.ts',
        'src/three/curl.ts',
        'src/three/homography.ts',
        'src/three/tiers.ts',
      ],
      exclude: ['**/*.test.ts'],
      // Every file, the fully covered ones too (the text reporter hides them by default).
      reporter: [['text', { skipFull: false }]],
    },
  },
});
