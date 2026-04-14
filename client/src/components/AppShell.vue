<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { api } from "../lib/api";

const route = useRoute();
const router = useRouter();
const mobileNavOpen = ref(false);
const adminProfile = ref({
  username: "",
  displayName: "",
  email: "",
});

const links = [
  { label: "Dashboard", to: "/", icon: "dashboard" },
  { label: "User Management", to: "/users", icon: "group" },
  { label: "Session Logs", to: "/sessions", icon: "history" },
];

const pageTitle = computed(() => {
  const match = links.find((item) => item.to === route.path);
  return match?.label || "VPN Management";
});

const formattedDate = computed(() =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date()),
);

function isActive(path) {
  return route.path === path;
}

const adminInitials = computed(() => {
  const source =
    adminProfile.value.displayName || adminProfile.value.username || "Admin";
  const parts = source.trim().split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
});

watch(
  () => route.path,
  () => {
    mobileNavOpen.value = false;
  },
);

async function logout() {
  await api.post("/api/auth/logout", {});
  router.push("/login");
}

async function loadAdminProfile() {
  try {
    // Shell-level profile loading keeps the sidebar identity in sync after refresh.
    adminProfile.value = await api.get("/api/auth/me");
  } catch (_error) {
    router.push("/login");
  }
}

onMounted(loadAdminProfile);
</script>

<template>
  <div class="min-h-screen bg-background-light text-slate-900 lg:flex">
    <div
      v-if="mobileNavOpen"
      class="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[1px] lg:hidden"
      @click="mobileNavOpen = false"
    ></div>

    <aside
      class="fixed inset-y-0 left-0 z-50 flex w-[84vw] max-w-72 shrink-0 flex-col bg-navy-sidebar text-white transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-72 lg:max-w-none lg:translate-x-0"
      :class="
        mobileNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      "
    >
      <div class="p-6">
        <div
          class="mb-8 flex items-center justify-between gap-3 lg:justify-start"
        >
          <div class="flex items-center gap-3">
            <div
              class="flex size-10 items-center justify-center rounded-lg bg-primary shadow-lg shadow-teal-900/50"
            >
              <span class="material-symbols-outlined text-white">lock</span>
            </div>
            <div>
              <h1
                class="text-sm font-bold uppercase leading-tight tracking-wider"
              >
                RSUP MAKASSAR
              </h1>
              <p class="text-[10px] font-medium text-slate-400">
                VPN User Management
              </p>
            </div>
          </div>
          <button
            type="button"
            class="rounded-lg p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
            @click="mobileNavOpen = false"
          >
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <nav class="flex flex-col gap-1">
          <router-link
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            class="flex min-w-fit items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors"
            :class="
              isActive(link.to)
                ? 'bg-primary text-white'
                : 'text-slate-400 hover:bg-white/10 hover:text-white'
            "
          >
            <span class="material-symbols-outlined text-[22px]">{{
              link.icon
            }}</span>
            {{ link.label }}
          </router-link>
        </nav>
      </div>

      <div class="mt-auto border-t border-white/10 p-6">
        <div class="mb-4 flex items-center gap-3">
          <div
            class="flex size-10 items-center justify-center rounded-full border border-white/20 bg-slate-700 text-sm font-bold text-white"
          >
            {{ adminInitials }}
          </div>
          <div>
            <p class="text-sm font-semibold">
              {{
                adminProfile.displayName ||
                adminProfile.username ||
                "Administrator"
              }}
            </p>
            <p class="text-xs text-slate-400">
              {{ adminProfile.email || adminProfile.username || "-" }}
            </p>
          </div>
        </div>

        <button
          type="button"
          class="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 py-2.5 text-sm font-bold text-white transition-all hover:bg-white/20"
          @click="logout"
        >
          <span class="material-symbols-outlined text-base">logout</span>
          Sign out
        </button>
      </div>
    </aside>

    <main class="min-w-0 flex-1 overflow-y-auto bg-slate-50 lg:min-h-screen">
      <header
        class="sticky top-0 z-30 border-b border-slate-200 bg-white px-4 py-4 sm:px-6 lg:px-8"
      >
        <div class="flex items-start justify-between gap-4 lg:items-center">
          <div class="flex min-w-0 items-center gap-3">
            <button
              type="button"
              class="inline-flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 lg:hidden"
              @click="mobileNavOpen = true"
            >
              <span class="material-symbols-outlined">menu</span>
            </button>
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h2
                  class="truncate text-lg font-bold text-slate-800 sm:text-xl"
                >
                  {{ pageTitle }}
                </h2>
                <span
                  class="hidden rounded bg-accent-teal/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-accent-teal sm:inline-flex"
                  >System Live</span
                >
              </div>
            </div>
          </div>

          <div class="flex shrink-0 items-center gap-2 sm:gap-3">
            <div class="relative">
              <span
                class="material-symbols-outlined cursor-default text-slate-400"
                >notifications</span
              >
              <span
                class="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-red-500"
              ></span>
            </div>
            <div class="h-8 w-px bg-slate-200"></div>
            <div class="text-right leading-tight">
              <p class="text-[11px] text-slate-400 sm:text-xs">Current Date</p>
              <p class="text-sm font-medium text-slate-700">
                {{ formattedDate }}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div class="p-4 sm:p-6 lg:p-8">
        <router-view />
      </div>
    </main>
  </div>
</template>
