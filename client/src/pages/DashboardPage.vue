<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import MetricCard from "../components/MetricCard.vue";
import { api } from "../lib/api";
import { formatDateTime } from "../lib/formatters";

const loading = ref(true);
const dashboard = reactive({
  totalUsers: 0,
  activeSessions: 0,
  expiredAccounts: 0,
  recentUsers: [],
  liveSessions: []
});

const metricCards = computed(() => [
  {
    label: "Total VPN Users",
    value: dashboard.totalUsers,
    icon: "group",
    iconTone: "blue",
    badge: "Current total",
    badgeTone: "teal"
  },
  {
    label: "Active VPN Sessions",
    value: dashboard.activeSessions,
    icon: "bolt",
    iconTone: "teal",
    badge: "Live now",
    badgeTone: "teal"
  },
  {
    label: "Expired Accounts",
    value: dashboard.expiredAccounts,
    icon: "error_outline",
    iconTone: "red",
    badge: "Needs review",
    badgeTone: "red"
  },
  {
    label: "Recently Created",
    value: dashboard.recentUsers.length,
    icon: "person_add",
    iconTone: "teal",
    badge: "Latest 5",
    badgeTone: "teal"
  }
]);

async function loadDashboard() {
  loading.value = true;

  try {
    // Load summary stats and the live-session preview together for a faster first paint.
    const [stats, liveSessions] = await Promise.all([
      api.get("/api/dashboard/stats"),
      api.get("/api/dashboard/active-sessions")
    ]);

    Object.assign(dashboard, stats, { liveSessions });
  } finally {
    loading.value = false;
  }
}

async function cutSession(id, username) {
  if (!confirm(`Are you sure you want to forcibly disconnect ${username}?`)) return;
  try {
    await api.post(`/api/sessions/${id}/disconnect`);
    alert(`Disconnect command sent for ${username}.`);
    loadDashboard();
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

function recentUserAccent(index) {
  const accents = [
    "bg-primary/10 text-primary",
    "bg-blue-100 text-blue-600",
    "bg-accent-teal/10 text-accent-teal",
    "bg-slate-100 text-slate-600",
    "bg-amber-100 text-amber-700"
  ];

  return accents[index % accents.length];
}

onMounted(() => {
  document.title = "Kemenkes RSUP Makassar - VPN Admin Dashboard";
  loadDashboard();
});
</script>

<template>
  <section class="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        v-for="card in metricCards"
        :key="card.label"
        :label="card.label"
        :value="card.value"
        :icon="card.icon"
        :icon-tone="card.iconTone"
        :badge="card.badge"
        :badge-tone="card.badgeTone"
      />
    </section>

  <section class="mt-8 grid items-start grid-cols-1 gap-8 xl:grid-cols-3">
      <article class="flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm xl:col-span-2">
        <div class="flex flex-col gap-4 border-b border-slate-100 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="text-sm text-slate-500">Active sessions</p>
            <h3 class="mt-1 text-lg font-bold text-slate-900">Live VPN Connections</h3>
          </div>

          <div class="flex flex-wrap gap-3">
            <router-link
              to="/sessions"
              class="inline-flex items-center gap-1 text-sm font-bold text-primary transition-colors hover:text-teal-700"
            >
              View All
              <span class="material-symbols-outlined text-base">chevron_right</span>
            </router-link>
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              @click="loadDashboard"
            >
              <span class="material-symbols-outlined text-base">refresh</span>
              Refresh
            </button>
          </div>
        </div>

        <div v-if="loading" class="py-16 text-center text-sm text-slate-500">Loading dashboard...</div>

        <div v-else>
          <div class="space-y-4 p-4 sm:hidden">
            <article
              v-for="session in dashboard.liveSessions"
              :key="`${session.username}-${session.loginTime}`"
              class="rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-sm font-bold text-slate-900">{{ session.username }}</p>
                  <p class="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">Active session</p>
                </div>
                <span class="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700">Live</span>
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
                  <dt class="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Assigned IP</dt>
                  <dd class="font-mono text-sm text-accent-teal">{{ session.assignedIp || "-" }}</dd>
                </div>
                <div class="flex items-start justify-between gap-4">
                  <dt class="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Gateway</dt>
                  <dd class="text-right text-sm font-medium text-slate-700">{{ session.gatewayName || session.nasIp || "-" }}</dd>
                </div>
              </dl>
            </article>

            <div v-if="dashboard.liveSessions.length === 0" class="rounded-2xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              No active sessions found.
            </div>
          </div>

          <div class="hidden sm:block sm:overflow-x-auto">
            <table class="min-w-full text-left">
              <thead class="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th class="px-6 py-4">Username</th>
                  <th class="px-6 py-4">Login Time</th>
                  <th class="px-6 py-4">Assigned IP</th>
                  <th class="px-6 py-4">NAS / Gateway</th>
                  <th v-if="false" class="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr
                  v-for="session in dashboard.liveSessions"
                  :key="`${session.username}-${session.loginTime}`"
                  class="transition-colors hover:bg-slate-50"
                >
                  <td class="px-6 py-4 text-sm font-semibold text-slate-900">{{ session.username }}</td>
                  <td class="px-6 py-4 text-sm text-slate-500">{{ formatDateTime(session.loginTime) }}</td>
                  <td class="px-6 py-4 text-sm font-mono text-accent-teal">{{ session.assignedIp || "-" }}</td>
                  <td class="px-6 py-4">
                    <span class="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">
                      {{ session.gatewayName || session.nasIp || "-" }}
                    </span>
                  </td>
                  <td v-if="false" class="px-6 py-4 text-center">
                    <button
                      @click="cutSession(session.id, session.username)"
                      title="Force Disconnect (Cut)"
                      class="inline-flex items-center justify-center rounded-lg bg-red-50 text-red-600 px-3 py-1.5 text-xs font-bold transition hover:bg-red-100"
                    >
                      <span class="material-symbols-outlined text-[14px] mr-1">block</span> Cut
                    </button>
                  </td>
                </tr>
                <tr v-if="dashboard.liveSessions.length === 0">
                  <td colspan="4" class="px-6 py-10 text-center text-sm text-slate-500">
                    <span class="material-symbols-outlined mx-auto mb-2 block text-4xl text-slate-300">link_off</span>
                    No active sessions currently running.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="dashboard.activeSessions > 5" class="mt-auto border-t border-slate-100 bg-slate-50 p-4">
          <router-link to="/sessions" class="block w-full py-2 text-center text-sm font-bold text-primary transition-colors hover:text-teal-700">
            See {{ dashboard.activeSessions - 5 }} More Connections
          </router-link>
        </div>
      </article>

      <article class="flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div class="border-b border-slate-100 p-6">
          <p class="text-sm text-slate-500">Recent users</p>
          <h3 class="mt-1 text-lg font-bold text-slate-900">Latest VPN Accounts</h3>
        </div>

        <div class="flex-1 space-y-4 p-4 sm:space-y-6 sm:p-6">
          <div
            v-for="(user, index) in dashboard.recentUsers"
            :key="`${user.username}-${user.id}`"
            class="flex items-center gap-4"
          >
            <div class="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold" :class="recentUserAccent(index)">
              {{ getUserInitials(user.username) }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-bold text-slate-900">{{ user.username }}</p>
              <p class="text-xs text-slate-500">radcheck ID #{{ user.id }}</p>
            </div>
            <span class="material-symbols-outlined text-slate-300">more_vert</span>
          </div>
          <div v-if="!loading && dashboard.recentUsers.length === 0" class="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            No recent user records yet.
          </div>
        </div>

        <div class="mt-auto bg-slate-50 p-4">
          <router-link to="/users" class="block w-full py-2 text-center text-sm font-bold text-slate-600 transition-colors hover:text-primary">
            Manage All Accounts
          </router-link>
        </div>
      </article>
  </section>
</template>
