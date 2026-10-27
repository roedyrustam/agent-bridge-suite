# Agent Bridge Suite 🚀

> Monorepo suite yang menghubungkan **Antigravity** dan **Claude Code** melalui memori episodik jangka panjang (**BM25 Episodic Memory**) dan konsensus kecerdasan buatan multi-model (**Speculative Adversarial Consensus**).

## 📦 Isi Plugin

| Plugin | Deskripsi | Protokol | Fitur Utama |
| :--- | :--- | :--- | :--- |
| **`agent-memory-sync`** | Jembatan memori episodik lokal agar agen tidak amnesia antar-sesi dan lintas IDE (Antigravity ↔ Claude Code). | MCP v1.x + Local Storage | • BM25 semantic token ranking<br>• Project scope isolation (`global` + private scope)<br>• Telemetry recall tracking<br>• Export/Import (JSON & Markdown)<br>• Store stats & health metrics |
| **`speculative-twin`** | Engine konsensus peer-model adversarial. Mengaudit kode untuk mencegah blindspot, race conditions, type degradation, dan kebocoran rahasia. | MCP v1.x + Multi-Provider Adapter | • Multi-provider: Anthropic, Gemini, OpenAI-compatible<br>• Offline zero-token high-precision heuristic<br>• P0/P1/P2 adversarial severity audit<br>• Speculative archetypes (Immutable, Stream, In-Place)<br>• Consensus synthesis engine |

## 🛠️ Instalasi & Penggunaan

### 1. Antigravity App / CLI
Jalankan di root repositori:
```bash
agy plugin link ./plugins/agent-memory-sync
agy plugin link ./plugins/speculative-twin
```

### 2. Claude Code CLI
Tambahkan server MCP ke konfigurasi Claude Code:
```bash
claude mcp add agent-memory-sync node ./plugins/agent-memory-sync/dist/index.js
claude mcp add speculative-twin node ./plugins/speculative-twin/dist/index.js
```

### 3. Unified Terminal CLI (`agent-bridge`)
Anda juga dapat berinteraksi langsung melalui terminal tanpa membuka MCP client:
```bash
# Query memori dengan ranking BM25
pnpm agent-bridge memory recall "prisma connection pool"

# Cek telemetry & statistik memori
pnpm agent-bridge memory stats

# Jalankan adversarial review pada file kode
pnpm agent-bridge twin critique ./src/auth.ts --context="Strict auth check"

# Generate draf spekulatif 3 paradigma
pnpm agent-bridge twin speculate "Rate limiter with token bucket algorithm"
```

### 4. Environment Variables (Opsional untuk Speculative Twin)
Secara bawaan, `speculative-twin` dapat bekerja 100% offline menggunakan analisis heuristik statis berpresisi tinggi. Untuk mengaktifkan cross-model peer review melalui API remote, sediakan salah satu API key berikut:
- Anthropic: `export ANTHROPIC_API_KEY="sk-ant-..."` (opsional: `ANTHROPIC_MODEL`)
- Google Gemini: `export GEMINI_API_KEY="..."` (opsional: `GEMINI_MODEL`)
- OpenAI / Local LLM: `export OPENAI_API_KEY="..."`, `OPENAI_BASE_URL="..."`

---

## 🧰 MCP Tools Reference

### `agent-memory-sync`
- `memory_record`: Menyimpan keputusan arsitektur, gotchas/traps debugging, atau preferensi pengguna.
- `memory_recall`: Mencari memori relevan menggunakan ranking algoritma BM25 berdasarkan relevansi kata kunci, tag, dan frekuensi akses.
- `memory_list`: Menampilkan seluruh memori tersimpan dengan filter kategori atau project scope.
- `memory_stats`: Menampilkan statistik agregat, top tags, dan insight yang paling sering di-recall.
- `memory_export`: Mengekspor seluruh basis pengetahuan ke format Markdown atau JSON.
- `memory_import`: Mengimpor memori dari backup JSON dengan opsi `skip` atau `overwrite`.
- `memory_delete`: Menghapus entri memori usang berdasarkan ID.

### `speculative-twin`
- `twin_critique`: Melakukan audit adversarial kode untuk mendeteksi silent catch, kebocoran secret/token, SQL injection, loose `any`, sequential await, dan race condition.
- `twin_speculate`: Menghasilkan 3 arsitektur implementasi alternatif (Defensive Immutable, Concurrent Streaming, Zero-Alloc In-Place).
- `twin_synthesize`: Menggabungkan dua draf solusi menjadi solusi konsensus yang terfortifikasi.
- `twin_status`: Memeriksa provider aktif yang sedang digunakan engine (`anthropic`, `gemini`, `openai`, atau `local_heuristic`).

---

## 🧪 Pengujian & Build
Suite ini dilengkapi test runner Vitest:
```bash
# Build TypeScript
pnpm build

# Jalankan seluruh test suite (17 passing tests)
pnpm test
```
