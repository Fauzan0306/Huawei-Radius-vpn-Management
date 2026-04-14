<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { api } from "../lib/api";
import { formatDateTime, formatDuration } from "../lib/formatters";

const loading = ref(true);
const sessions = ref([]);
// The current UI still uses the app's operational timezone rather than browser locale.
const appTimezoneOffsetMinutes = -480;

function getAppDateInputValue(date = new Date()) {
  const shifted = new Date(date.getTime() - appTimezoneOffsetMinutes * 60 * 1000);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shifted.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

const filters = reactive({
  username: "",
  dateFrom: getAppDateInputValue(),
  dateTo: getAppDateInputValue(),
  activeOnly: false
});

const totalSessions = computed(() => sessions.value.length);
const activeSessions = computed(() => sessions.value.filter((session) => session.sessionStatus === "Active").length);
const closedSessions = computed(() => sessions.value.filter((session) => session.sessionStatus !== "Active").length);

function isConnected(session) {
  return session.sessionStatus === "Active";
}

const rowsPerPage = 10;
const currentPage = ref(1);
const totalPages = computed(() => Math.ceil(sessions.value.length / rowsPerPage));
const paginatedSessions = computed(() => {
  const start = (currentPage.value - 1) * rowsPerPage;
  return sessions.value.slice(start, start + rowsPerPage);
});

async function loadSessions() {
  loading.value = true;
  currentPage.value = 1;

  try {
    // Filters are serialized explicitly so the backend can stay stateless.
    const params = new URLSearchParams({
      username: filters.username,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      activeOnly: String(filters.activeOnly),
      timezoneOffsetMinutes: String(appTimezoneOffsetMinutes)
    });

    sessions.value = await api.get(`/api/sessions?${params.toString()}`);
  } finally {
    loading.value = false;
  }
}

async function cutSession(id, username) {
  if (!confirm(`Are you sure you want to forcibly disconnect ${username}?`)) return;
  try {
    await api.post(`/api/sessions/${id}/disconnect`);
    alert(`Disconnect command sent for ${username}.`);
    loadSessions();
  } catch (err) {
    alert("Failed to disconnect: " + err.message);
  }
}

function getUserInitials(username) {
  const cleaned = String(username || "")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim();

  if (!cleaned) {
    return "NA";
  }

  const parts = cleaned.split(/\s+/);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return cleaned.slice(0, 2).toUpperCase();
}

function avatarTone(index) {
  const tones = [
    "bg-slate-100 text-slate-600",
    "bg-primary/10 text-primary",
    "bg-blue-100 text-blue-600",
    "bg-emerald-100 text-emerald-700",
    "bg-orange-100 text-orange-700"
  ];

  return tones[index % tones.length];
}

function sessionStatusClass(status) {
  if (status === "Active") {
    return "bg-emerald-100 text-emerald-700";
  }

  return "bg-slate-100 text-slate-500";
}

function sessionDotClass(status) {
  if (status === "Active") {
    return "bg-emerald-500";
  }

  return "bg-slate-300";
}

function logoutLabel(session) {
  if (isConnected(session)) {
    return "Connected";
  }

  return formatDateTime(session.logoutTime);
}

function sessionStatusLabel(session) {
  return isConnected(session) ? "Connected" : "Disconnected";
}

onMounted(() => {
  document.title = "Session Logs - Kemenkes RSUP Makassar";
  loadSessions();
});
</script>

<template>
  <section class="mb-10">
      <h2 class="text-3xl font-extrabold tracking-tight text-slate-900">Session Logs</h2>
      <p class="mt-2 text-base text-slate-500">Monitor and manage historical VPN user connectivity records.</p>
  </section>

  <section class="mb-10 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div class="grid grid-cols-1 items-end gap-x-8 gap-y-6 px-4 py-6 sm:px-6 sm:py-8 md:grid-cols-2 xl:grid-cols-[1.3fr_1fr_1fr_auto] xl:gap-y-8 xl:px-10 xl:py-10">
        <div>
          <label class="mb-3 block text-xs font-bold uppercase tracking-widest text-slate-500">Username</label>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-xl text-slate-400">person_search</span>
            <input
              v-model="filters.username"
              type="text"
              class="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Enter user name..."
            />
          </div>
        </div>

        <div>
          <label class="mb-3 block text-xs font-bold uppercase tracking-widest text-slate-500">Date From</label>
          <input
            v-model="filters.dateFrom"
            type="date"
            class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label class="mb-3 block text-xs font-bold uppercase tracking-widest text-slate-500">Date To</label>
          <input
            v-model="filters.dateTo"
            type="date"
            class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div class="flex flex-col gap-4 md:col-span-2 xl:col-span-1 xl:flex-row xl:items-center xl:gap-6">
          <label class="group flex cursor-pointer items-center gap-3">
            <input
              v-model="filters.activeOnly"
              type="checkbox"
              class="size-5 rounded border-slate-300 text-primary transition-all focus:ring-primary/20"
            />
            <span class="text-xs font-bold uppercase tracking-widest text-slate-500 transition-colors group-hover:text-slate-700">Active only</span>
          </label>
          <button
            type="button"
            class="w-full rounded-xl bg-primary px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-teal-800 hover:scale-[1.01] active:scale-[0.98] xl:flex-1"
            @click="loadSessions"
          >
            Apply Filters
          </button>
        </div>
      </div>

      <div class="border-t border-slate-100 bg-slate-50/40 px-4 py-4 text-sm text-slate-500 sm:px-6 xl:px-10">
        <span class="font-medium text-slate-700">{{ totalSessions }}</span> sessions loaded,
        <span class="font-medium text-emerald-700">{{ activeSessions }}</span> connected,
        <span class="font-medium text-slate-700">{{ closedSessions }}</span> disconnected.
      </div>
  </section>

  <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div v-if="loading" class="py-16 text-center text-sm text-slate-500">Loading sessions...</div>

      <div v-else>
        <div class="space-y-4 p-4 sm:p-6 lg:hidden">
          <article
            v-for="(session, index) in paginatedSessions"
            :key="`${session.username}-${session.loginTime}-${session.logoutTime}`"
            class="rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
          >
            <div class="flex items-start gap-3">
              <div
                class="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-slate-50 text-sm font-bold ring-2 ring-slate-100/50"
                :class="avatarTone(index)"
              >
                {{ getUserInitials(session.username) }}
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-bold text-slate-900">{{ session.username }}</p>
                <p class="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  {{ session.gatewayName || session.nasIp || "VPN Session" }}
                </p>
              </div>
              <span class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold" :class="sessionStatusClass(session.sessionStatus)">
                <span class="size-2 rounded-full" :class="[sessionDotClass(session.sessionStatus), isConnected(session) ? 'animate-pulse' : '']"></span>
                {{ sessionStatusLabel(session).toUpperCase() }}
              </span>
            </div>

            <div v-if="false" class="mt-4">
              <button
                @click="cutSession(session.id, session.username)"
                class="flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-100"
              >
                <span class="material-symbols-outlined text-[16px]">block</span>
                Cut Session
              </button>
            </div>

            <dl class="mt-4 space-y-3">
              <div class="flex items-start justify-between gap-4">
                <dt class="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Login</dt>
                <dd class="text-right text-sm font-medium text-slate-700">{{ formatDateTime(session.loginTime) }}</dd>
              </div>
              <div class="flex items-start justify-between gap-4">
                <dt class="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Logout</dt>
                <dd class="text-right text-sm font-medium" :class="isConnected(session) ? 'italic text-primary' : 'text-slate-700'">
                  {{ logoutLabel(session) }}
                </dd>
              </div>
              <div class="flex items-start justify-between gap-4">
                <dt class="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Duration</dt>
                <dd class="text-sm font-bold text-slate-800">{{ formatDuration(session.sessionDuration) }}</dd>
              </div>
              <div class="flex items-start justify-between gap-4">
                <dt class="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Assigned IP</dt>
                <dd class="font-mono text-sm text-slate-600">{{ session.assignedIp || "-" }}</dd>
              </div>
            </dl>
          </article>

          <div v-if="sessions.length === 0" class="rounded-2xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            No session logs found for the selected filters.
          </div>
        </div>

        <div class="hidden lg:block lg:overflow-x-auto">
          <table class="w-full border-collapse text-left">
            <thead>
              <tr class="border-b border-slate-200 bg-slate-50/50">
                <th class="px-8 py-6 text-xs font-bold uppercase tracking-widest text-slate-400">Username</th>
                <th class="px-8 py-6 text-xs font-bold uppercase tracking-widest text-slate-400">Login Time</th>
                <th class="px-8 py-6 text-xs font-bold uppercase tracking-widest text-slate-400">Logout Time</th>
                <th class="px-8 py-6 text-xs font-bold uppercase tracking-widest text-slate-400">Duration</th>
                <th class="px-8 py-6 text-xs font-bold uppercase tracking-widest text-slate-400">Assigned IP</th>
                <th class="px-8 py-6 text-xs font-bold uppercase tracking-widest text-slate-400">Gateway / NAS</th>
                <th class="px-8 py-6 text-center text-xs font-bold uppercase tracking-widest text-slate-400">Status</th>
                <th v-if="false" class="px-8 py-6 text-center text-xs font-bold uppercase tracking-widest text-slate-400">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr
                v-for="(session, index) in paginatedSessions"
                :key="`${session.username}-${session.loginTime}-${session.logoutTime}`"
                class="transition-colors hover:bg-slate-50/80"
              >
                <td class="px-8 py-6">
                  <div class="flex items-center gap-4">
                    <div
                      class="flex size-12 items-center justify-center rounded-full border-2 border-slate-50 text-sm font-bold ring-2 ring-slate-100/50"
                      :class="avatarTone(index)"
                    >
                      {{ getUserInitials(session.username) }}
                    </div>
                    <div>
                      <p class="text-base font-bold text-slate-900">{{ session.username }}</p>
                      <p class="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {{ session.gatewayName || session.nasIp || "VPN Session" }}
                      </p>
                    </div>
                  </div>
                </td>
                <td class="px-8 py-6 text-sm font-medium text-slate-600">{{ formatDateTime(session.loginTime) }}</td>
                <td class="px-8 py-6 text-sm font-medium" :class="isConnected(session) ? 'font-bold italic text-primary' : 'text-slate-600'">
                  {{ logoutLabel(session) }}
                </td>
                <td class="px-8 py-6">
                  <span class="text-lg font-extrabold tracking-tight text-slate-800">{{ formatDuration(session.sessionDuration) }}</span>
                </td>
                <td class="px-8 py-6 text-sm font-medium text-slate-500">
                  <span class="font-mono">{{ session.assignedIp || "-" }}</span>
                </td>
                <td class="px-8 py-6 text-sm font-medium text-slate-600">{{ session.gatewayName || session.nasIp || "-" }}</td>
                <td class="px-8 py-6 text-center">
                  <span class="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-bold" :class="sessionStatusClass(session.sessionStatus)">
                    <span class="size-2 rounded-full" :class="[sessionDotClass(session.sessionStatus), isConnected(session) ? 'animate-pulse' : '']"></span>
                    {{ sessionStatusLabel(session).toUpperCase() }}
                  </span>
                </td>
                <td v-if="false" class="px-8 py-6 text-center">
                  <button
                    v-if="isConnected(session)"
                    @click="cutSession(session.id, session.username)"
                    title="Force Disconnect"
                    class="rounded-lg bg-red-50 text-red-600 p-2 transition hover:bg-red-100"
                  >
                    <span class="material-symbols-outlined text-[18px]">block</span>
                  </button>
                  <span v-else class="text-slate-300">-</span>
                </td>
              </tr>
              <tr v-if="sessions.length === 0">
                <td colspan="8" class="px-8 py-12 text-center text-sm text-slate-500">No session logs found for the selected filters.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="flex flex-col gap-4 border-t border-slate-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-10 lg:py-6">
        <p class="text-xs font-medium tracking-tight text-slate-500">
          <template v-if="sessions.length > 0">
            Showing <span class="font-bold text-slate-700">{{ (currentPage - 1) * rowsPerPage + 1 }}</span> to 
            <span class="font-bold text-slate-700">{{ Math.min(currentPage * rowsPerPage, sessions.length) }}</span> of 
            <span class="font-bold text-slate-700">{{ sessions.length }}</span> entries
          </template>
          <template v-else>
            No entries to show
          </template>
        </p>
        
        <div class="flex items-center gap-4 border-t border-transparent pt-0 sm:w-auto sm:justify-end">
          <div v-if="totalPages > 1" class="flex items-center gap-2">
            <button
              type="button"
              class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-40"
              :disabled="currentPage <= 1"
              @click="currentPage--"
            >
              <span class="material-symbols-outlined text-sm">chevron_left</span>
              Prev
            </button>
            <div class="flex select-none items-center px-1 font-mono text-xs font-bold text-slate-500">
              {{ currentPage }} / {{ totalPages }}
            </div>
            <button
              type="button"
              class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-40"
              :disabled="currentPage >= totalPages"
              @click="currentPage++"
            >
              Next
              <span class="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>
          
          <button
            type="button"
            class="ml-2 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50"
            @click="loadSessions"
          >
            <span class="material-symbols-outlined text-sm">refresh</span>
            Refresh List
          </button>
        </div>
      </div>
  </section>
</template>
