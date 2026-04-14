<script setup>
import { ref, watch } from "vue";
import { api } from "../lib/api";

const props = defineProps({
  open: Boolean,
});

const emit = defineEmits(["close", "complete"]);

const rawText = ref("");
const processing = ref(false);
const results = ref(null);
const progress = ref({ total: 0, current: 0, success: 0, error: 0 });

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      rawText.value = "";
      processing.value = false;
      results.value = null;
      progress.value = { total: 0, current: 0, success: 0, error: 0 };
    }
  }
);

async function startImport() {
  if (!rawText.value.trim()) return;

  const lines = rawText.value.trim().split("\n");
  const parsedUsers = [];
  const errors = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("#")) continue;

    // Each non-comment line is treated like a small CSV row from an ops notepad.
    const parts = line.split(",").map((part) => part.trim());
    if (parts.length < 3) {
      errors.push({ line: i + 1, status: "error", error: "Format salah (Minimal 3 kolom: username, password, filterId)" });
      continue;
    }

    let [username, password, filterId, expirationDate, simultaneousUse] = parts;

    // Treat empty or explicit "null" values as optional blanks.
    if (expirationDate === "" || expirationDate?.toLowerCase() === "null") expirationDate = null;
    if (simultaneousUse === "" || simultaneousUse?.toLowerCase() === "null") simultaneousUse = null;

    if (!username) {
      errors.push({ line: i + 1, status: "error", error: "Username kosong" });
      continue;
    }

    if (!password) {
      errors.push({ line: i + 1, status: "error", error: "Password kosong" });
      continue;
    }

    if (filterId !== "VPN" && filterId !== "VPN_RADIUS") {
      errors.push({ line: i + 1, status: "error", error: `Filter-Id cacat: '${filterId}'. Harus VPN atau VPN_RADIUS` });
      continue;
    }

    parsedUsers.push({
      line: i + 1,
      payload: {
        username,
        password,
        filterId,
        expirationDate: expirationDate || null,
        simultaneousUse: simultaneousUse ? parseInt(simultaneousUse, 10) : null
      }
    });
  }

  if (parsedUsers.length === 0 && errors.length === 0) return;

  processing.value = true;
  progress.value = { total: parsedUsers.length, current: 0, success: 0, error: 0 };

  const finalResults = [...errors];

  // Requests are sent one by one so the operator can see exactly which row failed.
  for (const user of parsedUsers) {
    progress.value.current++;
    try {
      await api.post("/api/users", user.payload);
      progress.value.success++;
      finalResults.push({ line: user.line, username: user.payload.username, status: "success", message: "Created" });
    } catch (err) {
      progress.value.error++;
      finalResults.push({ line: user.line, username: user.payload.username, status: "error", error: err.message || "Gagal membuat user" });
    }
  }

  processing.value = false;
  results.value = finalResults.sort((a, b) => a.line - b.line);
}

function handleClose() {
  if (processing.value) return;

  const shouldRefresh = progress.value.success > 0;
  emit("close");

  if (shouldRefresh) {
    emit("complete");
  }
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4">
    <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]" @click="handleClose"></div>

    <div class="relative flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
      <div class="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:gap-4 sm:px-8 sm:py-6">
        <div class="flex gap-4">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:size-12">
            <span class="material-symbols-outlined text-2xl sm:text-3xl">group_add</span>
          </div>
          <div>
            <h3 class="text-lg font-bold text-slate-900 sm:text-xl">Bulk Import Users</h3>
            <p class="mt-0.5 text-sm text-slate-500">
              Paste CSV text formatted correctly to import multiple VPN users at once.
            </p>
          </div>
        </div>
        <button type="button" class="p-1 text-slate-400 transition-colors hover:text-slate-600" :disabled="processing" @click="handleClose">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="overflow-y-auto px-4 py-4 sm:p-8">
        <div v-if="!results && !processing">
          <div class="mb-6 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <div class="flex items-start gap-3">
              <span class="material-symbols-outlined text-blue-500 mt-0.5">info</span>
              <div>
                <p class="text-sm font-semibold text-blue-800">Format Aturan Teks (CSV)</p>
                <div class="mt-3 text-xs bg-white/60 p-4 rounded-xl border border-blue-100/70 space-y-4 text-blue-900">
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span class="text-blue-600 font-bold block mb-1.5 flex items-center gap-1.5"><span class="material-symbols-outlined text-[16px]">check_circle</span> Kolom Wajib</span>
                      <code class="font-mono bg-blue-50/80 px-2 py-1.5 rounded-lg text-blue-800 border border-blue-100/80 block w-fit font-bold shadow-sm">username, password, filterId</code>
                    </div>
                    <div>
                      <span class="text-blue-500 font-bold block mb-1.5 flex items-center gap-1.5"><span class="material-symbols-outlined text-[16px]">lightbulb</span> Kolom Opsional</span>
                      <code class="font-mono bg-blue-50/40 px-2 py-1.5 rounded-lg text-blue-600 border border-blue-100/50 block w-fit">expirationDate, simultaneousUse</code>
                    </div>
                  </div>
                  
                  <div class="pt-2 border-t border-blue-100/50">
                    <span class="text-blue-600 font-bold block mb-2 flex items-center gap-1.5"><span class="material-symbols-outlined text-[16px]">integration_instructions</span> Contoh Input (Copy-Paste)</span>
                    <pre class="font-mono bg-blue-900/5 text-blue-800 p-3 rounded-lg border border-blue-900/10 whitespace-pre-wrap break-words leading-relaxed">dr.budi, Rahasia123!, VPN, 2026-12-31
perawat.siti, Kucing456, VPN_RADIUS</pre>
                  </div>
                </div>
                <ul class="list-disc list-inside text-xs text-blue-700 mt-2 font-medium space-y-0.5">
                  <li>Parameter <b>username</b> dan <b>password</b> wajib diisi.</li>
                  <li>Parameter <b>filterId</b> wajib diisi dengan string pasti <b>VPN</b> atau <b>VPN_RADIUS</b>.</li>
                </ul>
              </div>
            </div>
          </div>

          <label class="flex flex-col gap-2">
            <span class="text-sm font-semibold text-slate-700">Tempel / Ketik teks kemari:</span>
            <textarea
              v-model="rawText"
              rows="8"
              class="w-full font-mono text-sm leading-relaxed rounded-xl border border-slate-200 bg-slate-50 p-4 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="# Tempel data dari Notepad..."
            ></textarea>
          </label>
        </div>

        <div v-else-if="processing" class="py-12 text-center">
          <div class="inline-flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 animate-pulse">
            <span class="material-symbols-outlined animate-spin text-3xl">sync</span>
          </div>
          <h4 class="text-lg font-bold text-slate-800">Sedang Memproses Import...</h4>
          <p class="mt-2 text-sm text-slate-500">Mendaftarkan user {{ progress.current }} dari total {{ progress.total }} baris valid.</p>
          
          <div class="mt-6 w-full max-w-sm mx-auto bg-slate-100 rounded-full h-3 overflow-hidden">
            <div class="bg-primary h-full transition-all duration-300" :style="{ width: `${(progress.current / progress.total) * 100}%` }"></div>
          </div>
        </div>

        <div v-else-if="results">
          <div class="mb-6 flex gap-4 p-4 rounded-xl" :class="progress.error === 0 ? 'bg-emerald-50 border border-emerald-100' : 'bg-orange-50 border border-orange-100'">
            <div class="flex size-10 shrink-0 items-center justify-center rounded-full text-white" :class="progress.error === 0 ? 'bg-emerald-500' : 'bg-orange-500'">
              <span class="material-symbols-outlined">{{ progress.error === 0 ? 'check_circle' : 'warning' }}</span>
            </div>
            <div>
              <h4 class="font-bold text-lg" :class="progress.error === 0 ? 'text-emerald-800' : 'text-orange-800'">Import Selesai!</h4>
              <p class="mt-1 text-sm font-medium" :class="progress.error === 0 ? 'text-emerald-700' : 'text-orange-700'">
                Berhasil: {{ progress.success }} &mdash; Gagal: {{ progress.error }}
              </p>
            </div>
          </div>

          <div class="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <div class="overflow-x-auto max-h-[400px]">
              <table class="min-w-full text-left text-sm border-collapse">
                <thead class="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th class="px-4 py-3 font-semibold text-slate-600 w-16 text-center">Baris</th>
                    <th class="px-4 py-3 font-semibold text-slate-600">Username</th>
                    <th class="px-4 py-3 font-semibold text-slate-600">Status</th>
                    <th class="px-4 py-3 font-semibold text-slate-600">Pesan / Log</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr v-for="(res, idx) in results" :key="idx" :class="res.status === 'error' ? 'bg-rose-50/40' : 'hover:bg-slate-50'">
                    <td class="px-4 py-3 font-mono text-xs text-center text-slate-400">{{ res.line }}</td>
                    <td class="px-4 py-3 font-semibold text-slate-800">{{ res.username || "-" }}</td>
                    <td class="px-4 py-3">
                      <span class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-bold" :class="res.status === 'error' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'">
                        {{ res.status === 'error' ? 'Gagal' : 'Sukses' }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-slate-600" :class="res.status === 'error' ? 'text-rose-600 font-medium' : ''">
                      {{ res.error || res.message }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div class="flex shrink-0 gap-3 border-t border-slate-100 bg-slate-50/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-8 sm:py-6">
        <button
          v-if="!processing && !results"
          type="button"
          class="w-full rounded-xl border border-slate-200 px-6 py-2.5 font-semibold text-slate-600 transition-colors hover:bg-white sm:w-auto"
          @click="handleClose"
        >
          Cancel
        </button>
        <button
          v-if="!processing && !results"
          type="button"
          class="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-8 py-2.5 font-semibold text-white shadow-lg shadow-primary/20 transition-all hover:opacity-90 disabled:opacity-50 sm:w-auto"
          :disabled="!rawText.trim()"
          @click="startImport"
        >
          <span class="material-symbols-outlined text-xl">play_circle</span>
          Process Import
        </button>
        <button
          v-if="results && !processing"
          type="button"
          class="w-full rounded-xl bg-slate-800 px-8 py-2.5 font-semibold text-white shadow-lg transition-all hover:bg-slate-700 sm:w-auto"
          @click="handleClose"
        >
          Tutup
        </button>
      </div>
    </div>
  </div>
</template>
