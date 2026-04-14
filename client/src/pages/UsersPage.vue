<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import BulkImportModal from "../components/BulkImportModal.vue";
import ResetPasswordModal from "../components/ResetPasswordModal.vue";
import UserModal from "../components/UserModal.vue";
import { api } from "../lib/api";
import { formatDate } from "../lib/formatters";

const users = ref([]);
const search = ref("");
const loading = ref(true);
const modalOpen = ref(false);
const resetOpen = ref(false);
const bulkOpen = ref(false);
const modalMode = ref("create");
const selectedUser = ref(null);
const actionLoading = ref(false);
const activeTab = ref("all");
const feedback = reactive({
  type: "",
  message: ""
});

const totalUsers = computed(() => users.value.length);
const activeUsers = computed(() => users.value.filter((user) => user.status === "active").length);
const expiringUsers = computed(() => users.value.filter((user) => user.status === "expiring").length);
const expiredUsers = computed(() => users.value.filter((user) => user.status === "expired").length);

const statusTabs = computed(() => [
  { key: "all", label: "All Users", count: totalUsers.value },
  { key: "active", label: "Active Accounts", count: activeUsers.value },
  { key: "expiring", label: "Expiring Soon", count: expiringUsers.value },
  { key: "expired", label: "Expired Accounts", count: expiredUsers.value }
]);

const filteredUsers = computed(() => {
  if (activeTab.value === "all") {
    return users.value;
  }

  return users.value.filter((user) => user.status === activeTab.value);
});

const rowsPerPage = 10;
const currentPage = ref(1);

const totalPages = computed(() => Math.ceil(filteredUsers.value.length / rowsPerPage));

const paginatedUsers = computed(() => {
  const start = (currentPage.value - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  return filteredUsers.value.slice(start, end);
});

watch([search, activeTab], () => {
  currentPage.value = 1;
});

async function loadUsers() {
  loading.value = true;

  try {
    users.value = await api.get(`/api/users?search=${encodeURIComponent(search.value)}`);
  } finally {
    loading.value = false;
  }
}

function openCreateModal() {
  modalMode.value = "create";
  selectedUser.value = null;
  modalOpen.value = true;
}

function openEditModal(user) {
  modalMode.value = "edit";
  selectedUser.value = user;
  modalOpen.value = true;
}

function openResetModal(user) {
  selectedUser.value = user;
  resetOpen.value = true;
}

async function saveUser(payload) {
  actionLoading.value = true;
  feedback.message = "";

  try {
    // The same modal is reused for create and edit so the page keeps one save path.
    if (modalMode.value === "create") {
      await api.post("/api/users", payload);
      feedback.type = "success";
      feedback.message = "User created successfully.";
    } else {
      await api.patch(`/api/users/${selectedUser.value.username}`, payload);
      feedback.type = "success";
      feedback.message = "User updated successfully.";
    }

    modalOpen.value = false;
    await loadUsers();
  } catch (error) {
    feedback.type = "error";
    feedback.message = error.message;
  } finally {
    actionLoading.value = false;
  }
}

async function submitResetPassword(payload) {
  actionLoading.value = true;
  feedback.message = "";

  try {
    await api.post(`/api/users/${selectedUser.value.username}/reset-password`, payload);
    feedback.type = "success";
    feedback.message = "Password reset successfully.";
    resetOpen.value = false;
  } catch (error) {
    feedback.type = "error";
    feedback.message = error.message;
  } finally {
    actionLoading.value = false;
  }
}

async function deleteUser(username) {
  const confirmed = window.confirm(`Delete all radcheck and radreply rows for ${username}?`);

  if (!confirmed) {
    return;
  }

  actionLoading.value = true;
  feedback.message = "";

  try {
    await api.delete(`/api/users/${username}`);
    feedback.type = "success";
    feedback.message = "User deleted successfully.";
    await loadUsers();
  } catch (error) {
    feedback.type = "error";
    feedback.message = error.message;
  } finally {
    actionLoading.value = false;
  }
}

function badgeClass(status) {
  if (status === "expired") return "bg-slate-100 text-slate-600";
  if (status === "expiring") return "bg-orange-100 text-orange-700";
  return "bg-green-100 text-green-700";
}

function statusDotClass(status) {
  if (status === "expired") return "bg-slate-400";
  if (status === "expiring") return "bg-orange-500";
  return "bg-green-500";
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

function userAccent(index) {
  const accents = [
    "bg-slate-200 text-slate-600",
    "bg-blue-100 text-blue-600",
    "bg-primary/10 text-primary",
    "bg-orange-100 text-orange-700",
    "bg-emerald-100 text-emerald-700"
  ];

  return accents[index % accents.length];
}

onMounted(() => {
  document.title = "VPN User Management - Kemenkes RSUP Makassar";
  loadUsers();
});
</script>

<template>
  <section class="mb-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
      <article class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="mb-4 flex items-center justify-between">
          <span class="rounded-lg bg-primary/10 p-2 text-primary">
            <span class="material-symbols-outlined">group</span>
          </span>
          <span class="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-600">Directory</span>
        </div>
        <p class="text-sm font-medium text-slate-500">Total Users</p>
        <p class="mt-1 text-2xl font-bold text-slate-900">{{ totalUsers }}</p>
      </article>

      <article class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="mb-4 flex items-center justify-between">
          <span class="rounded-lg bg-blue-500/10 p-2 text-blue-600">
            <span class="material-symbols-outlined">bolt</span>
          </span>
          <span class="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-600">Healthy</span>
        </div>
        <p class="text-sm font-medium text-slate-500">Active Accounts</p>
        <p class="mt-1 text-2xl font-bold text-slate-900">{{ activeUsers }}</p>
      </article>

      <article class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="mb-4 flex items-center justify-between">
          <span class="rounded-lg bg-orange-500/10 p-2 text-orange-600">
            <span class="material-symbols-outlined">history_toggle_off</span>
          </span>
          <span class="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-700">Review</span>
        </div>
        <p class="text-sm font-medium text-slate-500">Expiring Soon</p>
        <p class="mt-1 text-2xl font-bold text-slate-900">{{ expiringUsers }}</p>
      </article>

      <article class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="mb-4 flex items-center justify-between">
          <span class="rounded-lg bg-slate-500/10 p-2 text-slate-600">
            <span class="material-symbols-outlined">pending_actions</span>
          </span>
          <span class="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-500">Audit</span>
        </div>
        <p class="text-sm font-medium text-slate-500">Expired Accounts</p>
        <p class="mt-1 text-2xl font-bold text-slate-900">{{ expiredUsers }}</p>
      </article>
    </section>

  <section>
      <div class="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 class="text-xl font-bold text-slate-900">VPN Access Management</h3>
          <p class="mt-1 text-sm text-slate-500">Audit and maintain hospital staff network permissions.</p>
        </div>

        <div class="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            class="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 sm:w-auto"
            @click="loadUsers"
          >
            <span class="material-symbols-outlined text-sm">refresh</span>
            Refresh
          </button>
          <button
            type="button"
            class="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-800 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-slate-700 shadow-lg sm:w-auto"
            @click="bulkOpen = true"
          >
            <span class="material-symbols-outlined text-sm">data_object</span>
            Bulk Import
          </button>
          <button
            type="button"
            class="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:opacity-90 sm:w-auto"
            @click="openCreateModal"
          >
            <span class="material-symbols-outlined text-sm">person_add</span>
            Create user
          </button>
        </div>
      </div>

      <div class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <form class="relative w-full lg:max-w-sm" @submit.prevent="loadUsers">
          <span class="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-slate-400">search</span>
          <input
            v-model="search"
            type="text"
            class="w-full rounded-lg border border-slate-200 bg-slate-100 py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10"
            placeholder="Search users by username..."
          />
        </form>

        <div class="grid grid-cols-2 gap-2 border-b border-slate-200 pb-2 sm:flex sm:flex-wrap sm:gap-0 sm:pb-1">
          <button
            v-for="tab in statusTabs"
            :key="tab.key"
            type="button"
            class="whitespace-nowrap rounded-lg px-3 py-3 text-sm transition-colors sm:rounded-none sm:px-5"
            :class="
              activeTab === tab.key
                ? 'bg-primary/10 font-bold text-primary sm:border-b-2 sm:border-primary sm:bg-transparent'
                : 'font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800 sm:hover:bg-transparent'
            "
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
            <span class="ml-2 text-xs text-slate-400">{{ tab.count }}</span>
          </button>
        </div>
      </div>

      <p
        v-if="feedback.message"
        class="mb-6 rounded-xl px-4 py-3 text-sm"
        :class="feedback.type === 'error' ? 'border border-rose-200 bg-rose-50 text-rose-700' : 'border border-emerald-200 bg-emerald-50 text-emerald-700'"
      >
        {{ feedback.message }}
      </p>

      <div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div v-if="loading" class="py-16 text-center text-sm text-slate-500">Loading users...</div>

        <div v-else>
          <div class="space-y-4 p-4 lg:hidden">
            <article
              v-for="(user, index) in paginatedUsers"
              :key="user.username"
              class="rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
            >
              <div class="flex items-start gap-3">
                <div class="flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold" :class="userAccent(index)">
                  {{ getUserInitials(user.username) }}
                </div>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-bold text-slate-900">{{ user.username }}</p>
                </div>
                <span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold" :class="badgeClass(user.status)">
                  <span class="size-1.5 rounded-full" :class="statusDotClass(user.status)"></span>
                  {{ user.statusLabel || user.status }}
                </span>
              </div>

              <dl class="mt-4 space-y-3">
                <div class="flex items-start justify-between gap-4">
                  <dt class="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Expiration</dt>
                  <dd class="text-right text-sm text-slate-700">{{ formatDate(user.expirationDate) }}</dd>
                </div>
                <div class="flex items-start justify-between gap-4">
                  <dt class="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Simultaneous</dt>
                  <dd class="text-sm text-slate-700">{{ user.simultaneousUse || "-" }}</dd>
                </div>
                <div class="flex items-start justify-between gap-4">
                  <dt class="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Filter-Id</dt>
                  <dd class="text-right text-sm text-slate-600">{{ user.filterId || "-" }}</dd>
                </div>
              </dl>

              <div class="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  class="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                  @click="openEditModal(user)"
                >
                  <span class="material-symbols-outlined text-base">edit_note</span>
                  Edit
                </button>
                <button
                  type="button"
                  class="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                  @click="openResetModal(user)"
                >
                  <span class="material-symbols-outlined text-base">lock_reset</span>
                  Reset
                </button>
                <button
                  type="button"
                  class="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-50"
                  @click="deleteUser(user.username)"
                >
                  <span class="material-symbols-outlined text-base">delete</span>
                  Delete
                </button>
              </div>
            </article>

            <div v-if="filteredUsers.length === 0" class="rounded-2xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              No VPN users found for the current filters.
            </div>
          </div>

          <div class="hidden lg:block lg:overflow-x-auto">
            <table class="min-w-full border-collapse text-left">
              <thead>
                <tr class="border-b border-slate-200 bg-slate-50">
                  <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Username</th>
                  <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Expiration Date</th>
                  <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Simultaneous-Use</th>
                  <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Filter-Id</th>
                  <th class="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                  <th class="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-for="(user, index) in paginatedUsers" :key="user.username" class="transition-colors hover:bg-slate-50">
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <div class="flex size-8 items-center justify-center rounded-full text-xs font-bold" :class="userAccent(index)">
                        {{ getUserInitials(user.username) }}
                      </div>
                      <div class="min-w-0">
                        <p class="text-sm font-semibold text-slate-900">{{ user.username }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4">
                    <p class="text-sm text-slate-700">{{ formatDate(user.expirationDate) }}</p>
                    <p class="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">
                      {{ user.expirationDate ? "Radius policy" : "No expiry set" }}
                    </p>
                  </td>
                  <td class="px-6 py-4">
                    <span class="text-sm text-slate-700">{{ user.simultaneousUse || "-" }}</span>
                  </td>
                  <td class="px-6 py-4">
                    <span class="text-sm text-slate-600">{{ user.filterId || "-" }}</span>
                  </td>
                  <td class="px-6 py-4">
                    <span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold" :class="badgeClass(user.status)">
                      <span class="size-1.5 rounded-full" :class="statusDotClass(user.status)"></span>
                      {{ user.statusLabel || user.status }}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-right">
                    <div class="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        class="p-2 text-slate-400 transition-colors hover:text-primary"
                        title="Edit User"
                        @click="openEditModal(user)"
                      >
                        <span class="material-symbols-outlined text-lg">edit_note</span>
                      </button>
                      <button
                        type="button"
                        class="p-2 text-slate-400 transition-colors hover:text-primary"
                        title="Reset Password"
                        @click="openResetModal(user)"
                      >
                        <span class="material-symbols-outlined text-lg">lock_reset</span>
                      </button>
                      <button
                        type="button"
                        class="p-2 text-slate-400 transition-colors hover:text-red-500"
                        title="Delete User"
                        @click="deleteUser(user.username)"
                      >
                        <span class="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
                <tr v-if="filteredUsers.length === 0">
                  <td colspan="6" class="px-6 py-10 text-center text-sm text-slate-500">No VPN users found for the current filters.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="flex flex-col gap-4 border-t border-slate-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-xs font-medium tracking-tight text-slate-500">
            <template v-if="filteredUsers.length > 0">
              Showing <span class="font-bold text-slate-700">{{ (currentPage - 1) * rowsPerPage + 1 }}</span> to 
              <span class="font-bold text-slate-700">{{ Math.min(currentPage * rowsPerPage, filteredUsers.length) }}</span> of 
              <span class="font-bold text-slate-700">{{ filteredUsers.length }}</span> entries
            </template>
            <template v-else>
              No entries to show
            </template>
          </p>
          
          <div v-if="totalPages > 1" class="flex items-center gap-2">
            <button
              type="button"
              class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm transition-all disabled:pointer-events-none disabled:opacity-40 hover:bg-slate-50 hover:text-slate-900"
              :disabled="currentPage <= 1"
              @click="currentPage--"
            >
              <span class="material-symbols-outlined text-sm">chevron_left</span>
              Prev
            </button>
            <div class="flex select-none items-center px-2 font-mono text-xs font-bold text-slate-500">
              {{ currentPage }} / {{ totalPages }}
            </div>
            <button
              type="button"
              class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm transition-all disabled:pointer-events-none disabled:opacity-40 hover:bg-slate-50 hover:text-slate-900"
              :disabled="currentPage >= totalPages"
              @click="currentPage++"
            >
              Next
              <span class="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

    <div class="mt-12 flex flex-wrap items-center justify-center gap-3 border-t border-slate-100 py-6 text-center sm:gap-4">
        <div class="flex items-center gap-2 opacity-50 grayscale">
          <span class="material-symbols-outlined text-slate-400">verified_user</span>
          <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400">HIPAA Compliant System</span>
        </div>
        <div class="size-1 rounded-full bg-slate-300"></div>
        <p class="text-[10px] font-medium uppercase tracking-widest text-slate-400">Authorized Access Only</p>
    </div>
  </section>

  <UserModal
    :open="modalOpen"
    :mode="modalMode"
    :user="selectedUser"
    :loading="actionLoading"
    @close="modalOpen = false"
    @submit="saveUser"
  />

  <ResetPasswordModal
    :open="resetOpen"
    :user="selectedUser"
    :loading="actionLoading"
    @close="resetOpen = false"
    @submit="submitResetPassword"
  />

  <BulkImportModal
    :open="bulkOpen"
    @close="bulkOpen = false"
    @complete="loadUsers"
  />
</template>
